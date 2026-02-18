/**
 * ROUTER WEBHOOK
 *
 * Edge Function que recibe webhooks de Evolution API y decide:
 * 1. Si hay flow activo → smart-flow-engine-v10
 * 2. Si hay palabra clave match → smart-flow-engine-v10
 * 3. Si no match → elina-v5 (conversación libre)
 *
 * Este router reemplaza el webhook directo y centraliza la lógica de decisión
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    const startTime = performance.now()

    try {
        const payload = await req.json()
        const eventType = payload?.event
        console.log(`\n[Router] 📨 Webhook received: ${eventType}`)

        // ========================================================================
        // HANDLE CONNECTION_UPDATE EVENTS (Session management)
        // ========================================================================
        if (eventType === 'connection.update' || eventType === 'CONNECTION_UPDATE') {
            const instanceName = payload?.instance
            const connectionState = payload?.data?.state || payload?.state

            console.log(`[Router] 🔌 Connection update for ${instanceName}: ${connectionState}`)

            if (!instanceName) {
                return new Response(JSON.stringify({ error: 'Missing instance name' }), {
                    headers: CORS_HEADERS,
                    status: 400
                })
            }

            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Update connection status in database
            const isConnected = connectionState === 'open'

            // Get profile to extract user_id for API key
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, evolution_api_key')
                .eq('evolution_instance_name', instanceName)
                .single()

            if (!profile) {
                console.error(`[Router] ❌ Profile not found for instance: ${instanceName}`)
                return new Response(JSON.stringify({ error: 'Profile not found' }), {
                    headers: CORS_HEADERS,
                    status: 404
                })
            }

            // Prepare update data
            const updateData: any = {
                whatsapp_connected: isConnected,
                updated_at: new Date().toISOString()
            }

            // ✅ Si está conectado y no hay API key, guardarla ahora
            if (isConnected && !profile.evolution_api_key) {
                console.log(`[Router] 🔑 Saving evolution_api_key for ${instanceName}`)
                updateData.evolution_api_key = profile.id // user_id es la API key
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('evolution_instance_name', instanceName)

            if (error) {
                console.error(`[Router] ❌ Error updating connection status:`, error)
            } else {
                console.log(`[Router] ✅ Updated whatsapp_connected to ${isConnected} for ${instanceName}`)
            }

            return new Response(JSON.stringify({
                success: true,
                instance: instanceName,
                connected: isConnected
            }), {
                headers: CORS_HEADERS,
                status: 200
            })
        }

        // ========================================================================
        // 1. EXTRACT BASIC DATA (For message events)
        // ========================================================================
        const data = payload?.data
        if (!data) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                headers: CORS_HEADERS,
                status: 400
            })
        }

        const { key, message, pushName } = data
        let remoteJid = key?.remoteJid

        // Handle LID (Linked Devices)
        if (remoteJid?.includes('@lid')) {
            remoteJid = key?.remoteJidAlt || remoteJid
        }

        // Clean suffix
        remoteJid = remoteJid?.replace('@s.whatsapp.net', '')

        const messageId = key?.id
        const instanceName = payload?.instance

        console.log(`[Router] Instance: ${instanceName}, RemoteJid: ${remoteJid}`)

        // Validate required fields
        if (!remoteJid || !messageId || !instanceName) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                headers: CORS_HEADERS,
                status: 400
            })
        }

        // Ignore status broadcasts and own messages
        if (remoteJid === 'status@broadcast' || key?.fromMe) {
            return new Response(JSON.stringify({ ignored: true, reason: 'status or own message' }), {
                headers: CORS_HEADERS,
                status: 200
            })
        }

        // ========================================================================
        // 2. INITIALIZE SUPABASE
        // ========================================================================
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ========================================================================
        // 3. GET CONTACT & PROFILE
        // ========================================================================
        // Get profile by instance name
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, evolution_instance_name')
            .eq('evolution_instance_name', instanceName)
            .maybeSingle()

        if (!profile) {
            console.warn(`[Router] No profile found for instance: ${instanceName}`)
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
                headers: CORS_HEADERS,
                status: 404
            })
        }

        const userId = profile.id

        // Get or create contact
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, user_id')
            .eq('user_id', userId)
            .ilike('phone_number', `%${remoteJid}%`)
            .order('created_at', { ascending: false })
            .limit(1)

        let contactId: number | null = null
        if (contacts && contacts.length > 0) {
            contactId = contacts[0].id
        } else {
            // Create contact if doesn't exist
            const { data: newContact } = await supabase
                .from('contacts')
                .insert({
                    user_id: userId,
                    phone_number: remoteJid,
                    full_name: pushName || remoteJid
                })
                .select('id')
                .single()

            if (newContact) {
                contactId = newContact.id
            }
        }

        if (!contactId) {
            console.error(`[Router] Could not get/create contact for ${remoteJid}`)
            return new Response(JSON.stringify({ error: 'Contact not found' }), {
                headers: CORS_HEADERS,
                status: 500
            })
        }

        // ========================================================================
        // 4. EXTRACT MESSAGE TEXT
        // ========================================================================
        let messageText = message.conversation ||
            message.extendedTextMessage?.text ||
            message.imageMessage?.caption ||
            ''

        if (!messageText) {
            return new Response(JSON.stringify({ ignored: true, reason: 'No text content' }), {
                headers: CORS_HEADERS,
                status: 200
            })
        }

        console.log(`[Router] Message: "${messageText.substring(0, 100)}..."`)

        // ========================================================================
        // 5. DECISION LOGIC: SMART-FLOW vs ELINA-V5
        // ========================================================================

        // PRIORITY 1: Check if contact has an ACTIVE flow
        const { data: activeFlows } = await supabase
            .from('flow_states')
            .select('flow_id, status')
            .eq('contact_id', contactId)
            .in('status', ['active', 'paused'])
            .order('last_updated', { ascending: false })
            .limit(1)

        if (activeFlows && activeFlows.length > 0) {
            const activeFlow = activeFlows[0]
            console.log(`[Router] ✅ Active flow found: ${activeFlow.flow_id} (${activeFlow.status})`)
            console.log(`[Router] → Routing to: SMART-FLOW-ENGINE-V10`)

            return await routeToSmartFlow(payload, activeFlow.flow_id)
        }

        // PRIORITY 2: Check if message matches any flow trigger keywords
        const { data: flows } = await supabase
            .from('auto_responses')
            .select('id, trigger_text')
            .eq('user_id', userId)
            .eq('is_flow', true)
            .eq('is_active', true)

        if (flows && flows.length > 0) {
            const messageLower = messageText.toLowerCase()

            for (const flow of flows) {
                if (!flow.trigger_text) continue

                const keywords = flow.trigger_text.split(',').map((k: string) => k.trim().toLowerCase())
                const hasMatch = keywords.some((keyword: string) => messageLower.includes(keyword))

                if (hasMatch) {
                    console.log(`[Router] ✅ Keyword match found: "${flow.trigger_text}"`)
                    console.log(`[Router] → Routing to: SMART-FLOW-ENGINE-V10`)

                    return await routeToSmartFlow(payload, flow.id.toString())
                }
            }
        }

        // PRIORITY 3: No match → Route to ELINA-V5 (conversación libre con IA)
        console.log(`[Router] ℹ️ No flow match`)
        console.log(`[Router] → Routing to: ELINA-V5 (AI Conversation)`)

        return await routeToElinaV5(payload)

    } catch (error) {
        console.error(`[Router] ❌ Error:`, error)
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            headers: CORS_HEADERS,
            status: 500
        })
    }
})

/**
 * Route to Smart Flow Engine V10
 */
async function routeToSmartFlow(payload: any, flowId?: string): Promise<Response> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/smart-flow-engine-v10`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...payload,
                flow_id: flowId // Pass flow_id if we know it
            })
        })

        const data = await response.json()

        // Check if flow returned OUT_OF_CONTEXT status
        if (data.status === 'OUT_OF_CONTEXT') {
            console.log(`[Router] 🔀 Flow paused due to out-of-context question`)
            console.log(`[Router] → Redirecting to: ELINA-V5`)

            // Redirect to Elina-v5 for the out-of-context question
            return await routeToElinaV5(payload)
        }

        return new Response(JSON.stringify({
            routed_to: 'smart-flow-engine-v10',
            flow_id: flowId,
            result: data
        }), {
            headers: CORS_HEADERS,
            status: response.status
        })
    } catch (error) {
        console.error(`[Router] Error calling smart-flow-engine-v10:`, error)
        throw error
    }
}

/**
 * Route to Elina V5 (AI Conversational Agent)
 */
async function routeToElinaV5(payload: any): Promise<Response> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/elina-v5`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        return new Response(JSON.stringify({
            routed_to: 'elina-v5',
            result: data
        }), {
            headers: CORS_HEADERS,
            status: response.status
        })
    } catch (error) {
        console.error(`[Router] Error calling elina-v5:`, error)
        throw error
    }
}
