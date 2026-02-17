import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AIFlowAgent } from './core/AIFlowAgent.ts'
import { FlowConfig, IncomingMessage, FlowConversationState } from './core/ai-types.ts'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    try {
        const body = await req.json();
        console.log(`[SmartFlowEngine] Request received`);

        let { flow_id, input_text, conversation_id, user_properties, instance } = body;

        // Evolution API Adaptation
        if (!input_text && body.data?.message) {
            const data = body.data;
            input_text = data.message.conversation || data.message.extendedTextMessage?.text || data.message.imageMessage?.caption || '';
            console.log(`[SmartFlowEngine] Extracted input_text: "${input_text}"`);
        }
        if (!conversation_id && body.data?.key?.remoteJid) {
            conversation_id = body.data.key.remoteJid.replace('@s.whatsapp.net', '');
        }
        if (!instance && body.instance) {
            instance = body.instance;
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
        if (!openaiApiKey) {
            console.error('[SmartFlowEngine] OPENAI_API_KEY not configured');
            return new Response(JSON.stringify({ error: 'AI service not configured' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500
            });
        }

        // Get profile and credentials
        let profileId = null;
        let evolutionApiUrl = null;
        let evolutionApiKey = null;
        let userProfile = null;

        if (instance) {
            console.log(`[SmartFlowEngine] Looking for profile: "${instance}"`);
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('id, evolution_api_url, evolution_api_key, full_name, company_description')
                .eq('evolution_instance_name', instance)
                .maybeSingle();

            if (profileError) console.error(`[SmartFlowEngine] Error finding profile:`, profileError);
            if (profile) {
                profileId = profile.id;
                evolutionApiUrl = profile.evolution_api_url;
                evolutionApiKey = profile.evolution_api_key;
                userProfile = profile;
                console.log(`[SmartFlowEngine] Found profile: ${profile.full_name}`);
            } else {
                console.log(`[SmartFlowEngine] No profile found for instance: "${instance}"`);
                return new Response(JSON.stringify({ message: 'No profile found' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200
                });
            }
        }

        // Find matching flow
        let query = supabaseClient.from('auto_responses').select('*').eq('is_flow', true).eq('is_active', true);

        if (profileId) {
            query = query.eq('user_id', profileId);
        }

        if (flow_id) {
            if (!isNaN(Number(flow_id))) query = query.eq('id', flow_id);
        } else if (input_text) {
            console.log(`[SmartFlowEngine] Searching for flow matching: "${input_text}"`);

            let fetchQuery = supabaseClient.from('auto_responses').select('id, trigger_text, user_id').eq('is_flow', true).eq('is_active', true);
            if (profileId) fetchQuery = fetchQuery.eq('user_id', profileId);

            const { data: allFlows, error: fetchError } = await fetchQuery;

            if (fetchError) {
                console.error(`[SmartFlowEngine] Error fetching flows:`, fetchError);
                query = query.eq('id', -1);
            } else {
                console.log(`[SmartFlowEngine] Found ${allFlows?.length || 0} active flows`);
                const matchedFlow = allFlows?.find((f: any) => {
                    const keywords = f.trigger_text?.toLowerCase().split(',').map((k: string) => k.trim());
                    const match = keywords?.some((k: string) => input_text.toLowerCase().includes(k));
                    if (match) console.log(`[SmartFlowEngine] Match found! Flow ID: ${f.id}`);
                    return match;
                });

                if (matchedFlow) query = query.eq('id', matchedFlow.id);
                else {
                    console.log(`[SmartFlowEngine] No match found for: "${input_text}"`);
                    return new Response(JSON.stringify({ message: 'No matching flow' }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 200
                    });
                }
            }
        }

        const { data: flowData, error: flowError } = await query.maybeSingle();
        if (flowError || !flowData) {
            return new Response(JSON.stringify({ message: 'No matching flow found' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        }

        console.log(`[SmartFlowEngine] Initializing AI flow: ${flowData.trigger_text}`);

        // Convert old flow_data to new FlowConfig format
        const flowConfig: FlowConfig = {
            id: flowData.id.toString(),
            trigger_keywords: flowData.trigger_text.split(',').map((k: string) => k.trim()),
            collection_requirements: flowData.flow_data?.collection_requirements || [],
            product_matching: flowData.flow_data?.product_matching,
            pricing_strategy: flowData.flow_data?.pricing_strategy,
            response_style: flowData.flow_data?.response_style || { tone: 'friendly', use_emojis: true, language: 'es-MX' }
        };

        // Load existing conversation state if any
        const { data: existingState } = await supabaseClient
            .from('flow_conversations')
            .select('*')
            .eq('flow_id', flowData.id)
            .eq('conversation_id', conversation_id)
            .maybeSingle();

        // Prepare incoming message
        const incomingMessage: IncomingMessage = {
            text: input_text,
            image_url: body.data?.message?.imageMessage?.url,
            message_type: body.data?.message?.imageMessage ? 'image' : 'text',
            timestamp: new Date().toISOString()
        };

        // Initialize AI agent
        const agent = new AIFlowAgent(supabaseClient, openaiApiKey);

        // Detect if this is the initial trigger (no existing state)
        const isInitialTrigger = !existingState;

        // Process message with AI
        const response = await agent.processMessage({
            flowConfig,
            conversationState: existingState ? {
                ...existingState,
                flow_id: existingState.flow_id.toString(),
                conversation_id: existingState.conversation_id
            } : null,
            incomingMessage,
            userProfile,
            isInitialTrigger
        });

        // Update conversation_id in state
        response.updated_state.conversation_id = conversation_id;

        // Send messages via Evolution API
        if (evolutionApiUrl && evolutionApiKey && instance && conversation_id && response.messages.length > 0) {
            console.log(`[SmartFlowEngine] Sending ${response.messages.length} AI-generated messages`);
            for (const msg of response.messages) {
                if (msg.type === 'text') {
                    const payload = {
                        number: conversation_id,
                        text: msg.content,
                        delay: 1200,
                        linkPreview: true
                    };
                    try {
                        const url = `${evolutionApiUrl}/message/sendText/${instance}`;
                        const sendResponse = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': evolutionApiKey
                            },
                            body: JSON.stringify(payload)
                        });
                        console.log(`[SmartFlowEngine] Sent message. Status: ${sendResponse.status}`);
                        if (!sendResponse.ok) {
                            const errorText = await sendResponse.text();
                            console.error(`[SmartFlowEngine] Evolution API Error: ${errorText}`);
                        }
                    } catch (sendError) {
                        console.error(`[SmartFlowEngine] Error sending to Evolution API:`, sendError);
                    }
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            flow_id: flowData.id,
            messages_sent: response.messages.length,
            status: response.updated_state.status,
            quote_generated: response.quote_generated,
            debug: { instance, profileId }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('[SmartFlowEngine] Global Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
