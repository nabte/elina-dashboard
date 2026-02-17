import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Message Router - Orquestador inteligente de mensajes
 * 
 * Decide si un mensaje debe ir a:
 * - smart-flow-engine-v10 (si tiene flow activo o matchea trigger)
 * - elina-v5 (todo lo demás)
 */

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
            }
        });
    }

    try {
        const body = await req.json();
        console.log('[Router] Incoming message:', JSON.stringify(body, null, 2));

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Extract conversation data
        const conversation_id = body.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const input_text = body.data?.message?.conversation ||
            body.data?.message?.extendedTextMessage?.text ||
            body.data?.message?.imageMessage?.caption || '';

        console.log(`[Router] ConvID: ${conversation_id}, Text: "${input_text}"`);

        if (!conversation_id) {
            console.warn('[Router] No conversation ID found');
            return new Response(JSON.stringify({ error: 'No conversation ID' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // 1. Find contact
        const { data: contact } = await supabase
            .from('contacts')
            .select('id, user_id')
            .ilike('phone_number', `%${conversation_id}%`)
            .maybeSingle();

        if (!contact) {
            console.log('[Router] Contact not found, sending to elina-v5');
            return await forwardToElina(body);
        }

        console.log(`[Router] Contact found: ${contact.id}`);

        // 2. Check for active flow
        const { data: activeFlow } = await supabase
            .from('flow_states')
            .select('flow_id, status, current_step_id')
            .eq('contact_id', contact.id)
            .in('status', ['active', 'paused'])
            .order('last_updated', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (activeFlow) {
            console.log(`[Router] ✅ Active flow found (${activeFlow.flow_id}), sending to smart-flow-engine`);
            return await forwardToSmartFlow(body, supabase);
        }

        // 3. Check if message matches flow trigger
        const { data: flows } = await supabase
            .from('auto_responses')
            .select('id, trigger_text, name')
            .eq('is_flow', true)
            .eq('is_active', true)
            .eq('user_id', contact.user_id);

        if (flows && flows.length > 0) {
            const matchedFlow = flows.find(flow => {
                const keywords = flow.trigger_text.split(',').map(k => k.trim().toLowerCase());
                return keywords.some(k => input_text.toLowerCase().includes(k));
            });

            if (matchedFlow) {
                console.log(`[Router] ✅ Flow trigger matched (${matchedFlow.name}), sending to smart-flow-engine`);
                return await forwardToSmartFlow(body, supabase);
            }
        }

        // 4. No flow match - send to elina-v5
        console.log('[Router] ❌ No flow match, sending to elina-v5');
        return await forwardToElina(body);

    } catch (error) {
        console.error('[Router] Error:', error);
        return new Response(JSON.stringify({
            error: 'Router error',
            details: error instanceof Error ? error.message : String(error)
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});

/**
 * Forward message to smart-flow-engine-v10
 */
async function forwardToSmartFlow(body: any, supabase: any) {
    try {
        const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/smart-flow-engine-v10`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
                },
                body: JSON.stringify(body)
            }
        );

        const result = await response.json();
        console.log('[Router] Smart-flow response:', result);

        // Handle OUT_OF_CONTEXT response
        if (result.status === 'OUT_OF_CONTEXT') {
            console.log('[Router] ⚠️ Smart-flow returned OUT_OF_CONTEXT, redirecting to elina-v5');

            // Forward to elina-v5 to handle the out-of-context question
            return await forwardToElina(body);
        }

        // Return smart-flow response
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
            status: response.status
        });

    } catch (error) {
        console.error('[Router] Error forwarding to smart-flow:', error);
        // Fallback to elina-v5 on error
        return await forwardToElina(body);
    }
}

/**
 * Forward message to elina-v5
 */
async function forwardToElina(body: any) {
    try {
        const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/elina-v5`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
                },
                body: JSON.stringify(body)
            }
        );

        const result = await response.text();
        console.log('[Router] Elina-v5 response received');

        return new Response(result, {
            headers: { 'Content-Type': 'application/json' },
            status: response.status
        });

    } catch (error) {
        console.error('[Router] Error forwarding to elina-v5:', error);
        return new Response(JSON.stringify({
            error: 'Failed to forward to elina-v5',
            details: error instanceof Error ? error.message : String(error)
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
