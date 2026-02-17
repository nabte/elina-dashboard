import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { connect } from "https://deno.land/x/redis@v0.29.3/mod.ts"

// Types reused from context.ts (inline for self-containment or could import if shared mod)
interface Profile {
    id: string
    evolution_instance_name: string
    evolution_api_key: string
    // ... other fields
}

interface Contact {
    id: number
    full_name: string
    phone_number: string
    user_id: string
    labels?: string[]
}

interface WebhookBody {
    instance: string
    apikey: string
    data: {
        key: {
            remoteJid: string
            fromMe: boolean
            id: string
        }
        pushName: string
        messageType: string
        message: any
        messageTimestamp: number
    }
}

// REDIS CONNECTION
// User needs to set REDIS_URL env var: redis://user:password@host:port
const REDIS_URL = Deno.env.get('REDIS_URL')

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body: WebhookBody = await req.json()
        const { instance, data } = body

        // 1. Basic Validation
        if (data.key.fromMe) {
            return new Response(JSON.stringify({ status: 'ignore', reason: 'from_me' }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 2. Load Context (Parallel)
        const [profileRes, subRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('evolution_instance_name', instance).single(),
            // Subscription linked via user_id, but we don't have user_id yet until we get profile.
            // So actually sequentiality is required or optimized query.
            // Let's get profile first as it's the anchor.
        ])

        if (profileRes.error || !profileRes.data) {
            return new Response(JSON.stringify({ status: 'error', reason: 'profile_not_found' }), { status: 404 })
        }
        const profile = profileRes.data

        // Get Subscription
        const subRes2 = await supabase.from('subscriptions').select('*').eq('user_id', profile.id).single()
        const subscription = subRes2.data

        if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
            return new Response(JSON.stringify({ status: 'ignore', reason: 'subscription_inactive' }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 3. Contact Management
        const phoneNumber = data.key.remoteJid.replace('@s.whatsapp.net', '')
        let { data: contact } = await supabase.from('contacts').select('*').eq('user_id', profile.id).eq('phone_number', phoneNumber).maybeSingle()

        if (!contact) {
            const { data: newContact, error: createError } = await supabase.from('contacts').insert({
                user_id: profile.id,
                phone_number: phoneNumber,
                full_name: data.pushName || 'Usuario WhatsApp',
                labels: ['nuevo cliente'] // Default label
            }).select().single()

            if (createError) throw createError
            contact = newContact
        }

        // Check Ignored
        if (contact.labels && contact.labels.some((l: string) => l.toLowerCase() === 'ignorar')) {
            return new Response(JSON.stringify({ status: 'ignore', reason: 'contact_ignored' }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 4. Log Message to Chat History (ALWAYS Log first)
        // Determine Content Type and Content
        let contentType = 'text'
        let messageContent = ''

        if (data.messageType === 'audioMessage') {
            contentType = 'audio'
            messageContent = '[AUDIO]'
        } else if (data.messageType === 'imageMessage') {
            contentType = 'image'
            messageContent = data.message.imageMessage?.caption || '[IMAGE]'
        } else {
            contentType = 'text'
            messageContent = data.message.conversation || data.message.extendedTextMessage?.text || ""
        }

        await supabase.from('chat_history').insert({
            user_id: profile.id,
            contact_id: contact.id,
            message_type: 'human',
            content: messageContent,
            created_at: new Date().toISOString(),
            metadata: {
                original_type: data.messageType,
                wa_message_id: data.key.id
            }
        })

        // 5. CHECK APPOINTMENT REMINDER REPLY
        // Logic moved from n8n "HTTP Request2" (rpc/check_active_reminder)
        // If the user replaces to a reminder, we process it immediately and stop RAG flow.
        try {
            const { data: reminderData } = await supabase.rpc('check_active_reminder', {
                p_phone: phoneNumber
            })

            // If it is a reminder reply
            if (reminderData && reminderData.length > 0 && reminderData[0].is_reminder_reply === true) {

                // Call 'process-reminder-response' Function
                const { data: processResult, error: processError } = await supabase.functions.invoke('process-reminder-response', {
                    body: {
                        message: messageContent,
                        phone_number: phoneNumber,
                        user_id: profile.id
                    }
                })

                if (!processError && processResult && processResult.status === 'confirmed') {
                    // Return specific status so n8n can send the confirmation message
                    return new Response(JSON.stringify({
                        status: 'reminder_confirmed',
                        data: {
                            contact,
                            profile
                        }
                    }), { headers: { 'Content-Type': 'application/json' } })
                }

                // If treated but not confirmed (or other status), we might simply stop or proceed.
                // Assuming if it was a reminder reply context but didn't confirm, we still don't want RAG answering generic stuff?
                // Or maybe we treat it as "handled".
                return new Response(JSON.stringify({ status: 'ignore', reason: 'reminder_processed_no_confirm' }), { headers: { 'Content-Type': 'application/json' } })
            }
        } catch (err) {
            console.error('Error checking reminder:', err)
            // Continue flow if check fails
        }

        // 6. REDIS BUFFERING (ONLY FOR TEXT)
        // If it's audio or image, we SKIP buffering and proceed immediately so n8n can handle the files.
        if (contentType !== 'text') {
            return new Response(JSON.stringify({
                status: 'proceed',
                data: {
                    content_type: contentType, // 'audio', 'image'
                    text: messageContent,
                    contact,
                    profile,
                    subscription,
                    message: data.message, // Pass raw message for n8n media handling
                    key: data.key // Pass key for ID ref
                }
            }), { headers: { 'Content-Type': 'application/json' } })
        }

        // Logic: Key = buffer:{chat_id}, Value = List of JSON strings (messages)
        // We append current message. Wait 3s. Check if WE are the last ones.
        if (REDIS_URL) {
            try {
                // Very basic Redis connection parsing (assumes hostname:port)
                // For production, parse the full redis://URL properly
                const redisUrl = new URL(REDIS_URL);
                const redis = await connect({
                    hostname: redisUrl.hostname,
                    port: Number(redisUrl.port) || 6379,
                    password: redisUrl.password,
                    tls: false // Adjust based on provider
                });

                const bufferKey = `buffer:${contact.id}`
                const messagePayload = JSON.stringify({
                    text: messageContent,
                    timestamp: Date.now()
                })

                await redis.rpush(bufferKey, messagePayload)

                // Wait for buffering
                await new Promise(r => setTimeout(r, 2000)) // 2s wait

                // Check Buffer
                const length = await redis.llen(bufferKey)
                const allMessages = await redis.lrange(bufferKey, 0, -1)

                // Cleanup for 'Leader'
                // In a real distributed system, we need a better lock. 
                // Here, we grab everything and clear. If multiple executions run, the first one after the wait might grab it.
                // A simple "Leader" check: Is the last message timestamp === my timestamp?
                // This is "good enough" for low concurrency per-user.

                // For now, let's keep it simple: Read all, join text, delete key.
                // If empty, it means another execution took it.

                if (length === 0) {
                    redis.close()
                    return new Response(JSON.stringify({ status: 'ignore', reason: 'buffered_by_other' }), { headers: { 'Content-Type': 'application/json' } })
                }

                const parsedMessages = allMessages.map((m: string) => JSON.parse(m))
                const combinedText = parsedMessages.map((m: any) => m.text).join(' ')

                await redis.del(bufferKey)
                redis.close()

                return new Response(JSON.stringify({
                    status: 'proceed',
                    data: {
                        content_type: 'text',
                        text: combinedText,
                        contact,
                        profile,
                        subscription,
                        message: data.message,
                        key: data.key
                    }
                }), { headers: { 'Content-Type': 'application/json' } })

            } catch (e) {
                console.error("Redis Error", e)
                // Fallback: Proceed without buffering if Redis fails
            }
        }

        // Default Proceed (No Redis or One Message)
        return new Response(JSON.stringify({
            status: 'proceed',
            data: {
                content_type: contentType,
                text: messageContent,
                contact,
                profile,
                subscription,
                message: data.message,
                key: data.key
            }
        }), { headers: { 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
