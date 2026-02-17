
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { user_text, ai_text, contact_id, user_id, user_message_type = 'human' } = await req.json()

        console.log(`[save-interaction] Saving interaction for contact: ${contact_id} | UserType: ${user_message_type} | AI Content: ${ai_text ? 'YES' : 'NO'}`)

        // 1. Prepare Inserts (Human & AI)
        const messagesToInsert = []

        // Human Message
        if (user_text) {
            messagesToInsert.push({
                contact_id,
                user_id,
                content: user_text,
                message_type: user_message_type,
                created_at: new Date().toISOString()
            })
        }

        // AI Message
        if (ai_text) {
            messagesToInsert.push({
                contact_id,
                user_id,
                content: ai_text,
                message_type: 'ai', // Strictly 'ai' as per DB constraint
                created_at: new Date().toISOString()
            })
        }

        if (messagesToInsert.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No messages to save" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Insert into DB (Initial Save without embedding)
        const { data: insertedMessages, error: insertError } = await supabaseClient
            .from('chat_history')
            .insert(messagesToInsert)
            .select()

        if (insertError) throw insertError

        // 3. Generate Embeddings & Update (Background-ish logic in same request)
        // We do this serially or parallel, but we need to wait to update rows.

        // Call OpenAI for embeddings
        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            console.warn("OPENAI_API_KEY not set. Skipping embeddings.")
            return new Response(JSON.stringify({ success: true, data: insertedMessages, warning: "No Embeddings" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const updates = insertedMessages.map(async (msg) => {
            if (!msg.content) return

            try {
                const rawResponse = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openAiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        input: msg.content.replace(/\n/g, ' '),
                        model: 'text-embedding-3-small'
                    })
                })

                if (!rawResponse.ok) {
                    console.error(`OpenAI Error for msg ${msg.id}: ${rawResponse.statusText}`)
                    return
                }

                const json = await rawResponse.json()
                const embedding = json.data[0].embedding

                // Update row with embedding
                await supabaseClient
                    .from('chat_history')
                    .update({ embedding })
                    .eq('id', msg.id)

            } catch (e) {
                console.error(`Embedding Fail for msg ${msg.id}`, e)
            }
        })

        await Promise.all(updates)

        return new Response(JSON.stringify({ success: true, count: insertedMessages.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
