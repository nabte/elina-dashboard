import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { FlowExecutor } from './core/FlowExecutor.ts'
import { SmartFlow, FlowState } from './core/types.ts'
import { SmartFiller } from './core/SmartFiller.ts'
import { StateManager } from './core/StateManager.ts'

Deno.serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    try {
        const body = await req.json();
        console.log(`[SmartFlowEngine] Request received. Raw payload:`, JSON.stringify(body, null, 2));

        let { flow_id, input_text, conversation_id, user_properties, instance } = body;

        // Evolution API Adaptation
        if (!input_text && body.data?.message) {
            const data = body.data;
            input_text = data.message.conversation || data.message.extendedTextMessage?.text || data.message.imageMessage?.caption || '';
            console.log(`[SmartFlowEngine] Evolution API detected. Extracted input_text: "${input_text}"`);
        }

        if (!conversation_id && body.data?.key?.remoteJid) {
            conversation_id = body.data.key.remoteJid.replace('@s.whatsapp.net', '');
            console.log(`[SmartFlowEngine] Evolution API detected. Extracted conversation_id: "${conversation_id}"`);
        }

        if (!instance && body.instance) {
            instance = body.instance;
        }

        console.log(`[SmartFlowEngine] Final trigger context - FlowID: ${flow_id}, InputText: ${input_text}, ConvID: ${conversation_id}`);

        // 2. Initialize Supabase Client (Use Service Role Key to bypass RLS for system operations)
        // CRITICAL FIX: Removed Authorization header forwarding to avoid overwriting Service Role Key
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2.1 Message Deduplication (prevent duplicate execution from webhook)
        const messageId = body.data?.key?.id;
        if (messageId) {
            // Check if we already processed this message
            const { data: existing } = await supabaseClient
                .from('processed_messages')
                .select('id')
                .eq('message_id', messageId)
                .maybeSingle();

            if (existing) {
                console.log(`[SmartFlowEngine] Message ${messageId} already processed, skipping`);
                return new Response(JSON.stringify({ status: 'already_processed' }), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    status: 200
                });
            }

            // Mark as processed
            await supabaseClient
                .from('processed_messages')
                .insert({ message_id: messageId, processed_at: new Date().toISOString() });

            console.log(`[SmartFlowEngine] Message ${messageId} marked as processed`);
        }

        // 2.5 Profile Lookup for Evolution API Credentials
        let evolutionApiUrl = null;
        let evolutionApiKey = null;

        if (instance) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('evolution_api_url, evolution_api_key')
                .eq('evolution_instance_name', instance)
                .maybeSingle();

            if (profile) {
                evolutionApiUrl = profile.evolution_api_url;
                evolutionApiKey = profile.evolution_api_key;
                console.log(`[SmartFlowEngine] Found profile credentials for instance: ${instance}`);
            }
        }

        // 2.6 Extract user_id and contact_id
        let user_id = user_properties?.user_id || body.user_id;
        let contact_id = user_properties?.contact_id || body.contact_id;

        // CRITICAL FIX: Find contact by phone (conversation_id) if missing
        if (!contact_id && conversation_id) {
            console.log(`[SmartFlowEngine] Searching contact for phone: ${conversation_id}`);
            // Search specifically in contacts table
            const { data: contacts, error: contactError } = await supabaseClient
                .from('contacts')
                .select('id, user_id')
                .ilike('phone_number', `%${conversation_id}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (contacts && contacts.length > 0) {
                const contact = contacts[0];
                contact_id = contact.id;
                user_id = contact.user_id || user_id;
                console.log(`[SmartFlowEngine] Found contact ID: ${contact_id}, User ID: ${user_id}`);
            } else {
                console.warn(`[SmartFlowEngine] Contact NOT found for phone ${conversation_id}. State will likely fail to save.`);
                if (contactError) console.error("Error searching contact:", contactError);
            }
        }

        if (!user_id || !contact_id) {
            console.warn('[SmartFlowEngine] Missing user_id or contact_id for state management but proceeding with flow matching');
        }

        // 3. Check for Active Flow State FIRST (before keyword matching)
        const stateManager = new StateManager(supabaseClient);
        let targetFlowId: string | null = flow_id;

        // If no explicit flow_id provided, check if contact has an active flow
        if (!targetFlowId && contact_id) {
            const { data: activeStates } = await supabaseClient
                .from('flow_states')
                .select('flow_id')
                .eq('contact_id', contact_id)
                .in('status', ['active', 'paused'])
                .order('last_updated', { ascending: false })
                .limit(1);

            if (activeStates && activeStates.length > 0) {
                targetFlowId = activeStates[0].flow_id;
                console.log(`[SmartFlowEngine] Found active flow ${targetFlowId} for contact ${contact_id}`);
            }
        }

        // 4. Load Flow Definition from DB
        let flowDefinition: SmartFlow;
        let query = supabaseClient.from('auto_responses').select('*').eq('is_flow', true).eq('is_active', true);

        if (targetFlowId) {
            // We have a specific flow ID (from param or active state)
            if (!isNaN(Number(targetFlowId))) {
                query = query.eq('id', targetFlowId);
            } else {
                query = query.textSearch('trigger_text', targetFlowId);
            }
        } else if (input_text) {
            // No active flow, do keyword matching to find new flow
            const { data: allFlows, error: fetchError } = await supabaseClient
                .from('auto_responses')
                .select('id, trigger_text, match_type')
                .eq('is_flow', true)
                .eq('is_active', true);

            if (fetchError || !allFlows) {
                console.error("Error fetching flows for local matching:", fetchError);
                query = query.eq('id', -1);
            } else {
                const matchedFlow = allFlows.find((flow: any) => {
                    if (!flow.trigger_text) return false;
                    const keywords = flow.trigger_text.split(',').map((k: string) => k.trim().toLowerCase());
                    const inputLower = input_text.toLowerCase();
                    return keywords.some((k: string) => inputLower.includes(k));
                });

                if (matchedFlow) {
                    query = query.eq('id', matchedFlow.id);
                } else {
                    query = query.eq('id', -1);
                }
            }
        } else {
            return new Response(JSON.stringify({ message: 'No context provided for flow lookup' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                status: 200
            });
        }

        const { data: flowData, error: flowError } = await query.maybeSingle();

        if (flowError) {
            console.error(`[SmartFlowEngine] Database error:`, flowError);
            throw new Error(`Database error looking up flow: ${flowError.message}`);
        }

        if (!flowData) {
            console.log(`[SmartFlowEngine] No matching flow found for: ${flow_id || input_text}`);
            return new Response(JSON.stringify({ message: 'No matching flow found' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                status: 200
            });
        }

        console.log(`[SmartFlowEngine] Loaded flow: ${flowData.trigger_text} (ID: ${flowData.id})`);

        flowDefinition = {
            id: flowData.id.toString(),
            name: flowData.trigger_text,
            trigger_keywords: [flowData.trigger_text],
            steps: Array.isArray(flowData.flow_data)
                ? flowData.flow_data
                : (flowData.flow_data?.steps || []),
            variables: {}
        };

        // 5. Smart Slot Filling
        const extractedVars = SmartFiller.extract(input_text || '', flowDefinition.trigger_keywords);
        const initialVariables = { ...user_properties, ...extractedVars };

        // 6. Determine if New Request or Continuation
        const isNewRequest = user_id && contact_id
            ? await stateManager.isNewRequest(contact_id, flowDefinition.id, input_text || '')
            : true;

        let state: FlowState;

        if (isNewRequest) {
            console.log('[SmartFlowEngine] 🆕 NEW REQUEST - Creating fresh state');
            state = {
                flow_id: flowDefinition.id,
                current_step_id: flowDefinition.steps[0]?.id || '',
                variables: initialVariables,
                status: 'active',
                last_updated: new Date().toISOString(),
                history: [],
                metadata: {
                    is_transactional: true,
                    should_persist: false,
                    language: 'es',
                    conversation_id: conversation_id,
                    contact_id: contact_id
                }
            };
        } else {
            console.log('[SmartFlowEngine] 🔄 CONTINUING - Loading existing state');
            const existingState = await stateManager.loadState(contact_id, flowDefinition.id);

            if (existingState) {
                state = existingState;

                // Check if we're waiting for a context_check response
                if (state.variables['_awaiting_context_response']) {
                    console.log('[SmartFlowEngine] 📋 Processing context_check response');
                    const { handleContextCheckResponse } = await import('./core/ContextCheckHandler.ts');
                    const contextStep = state.variables['_context_check_step'];

                    if (contextStep) {
                        const nextStepId = handleContextCheckResponse(input_text || '', contextStep);
                        if (nextStepId) {
                            state.current_step_id = nextStepId;
                            state.status = 'active';
                            delete state.variables['_awaiting_context_response'];
                            delete state.variables['_context_check_step'];
                            console.log(`[SmartFlowEngine] Context response matched, continuing to: ${nextStepId}`);
                        } else {
                            console.warn('[SmartFlowEngine] Context response not understood, staying on same step');
                        }
                    }
                }
                // Check if we're paused on a question step waiting for user input
                else if (state.status === 'paused') {
                    const currentStep = flowDefinition.steps.find(s => s.id === state.current_step_id);

                    if (currentStep && currentStep.type === 'question') {
                        const variableName = (currentStep as any).variable;
                        const expectedType = (currentStep as any).validation_type || 'text';

                        if (variableName && input_text) {
                            // PHASE 2A: Validate response with LLM
                            const { ResponseValidator } = await import('./core/ResponseValidator.ts');
                            const validator = new ResponseValidator(Deno.env.get('OPENROUTER_API_KEY') || '');

                            console.log(`[SmartFlowEngine] Validating response for ${variableName} (expected: ${expectedType})`);

                            const validation = await validator.validateResponse(
                                currentStep.content,
                                input_text,
                                expectedType
                            );

                            // Handle out-of-context questions
                            if (validation.isOutOfContext) {
                                console.log('[SmartFlowEngine] ⚠️ User asked out-of-context question, pausing flow');

                                // Save paused state
                                await stateManager.saveState(user_id, contact_id, state);

                                // Return special code for router to redirect to elina-v5
                                return new Response(JSON.stringify({
                                    status: 'OUT_OF_CONTEXT',
                                    flow_paused: true,
                                    flow_id: flowDefinition.id,
                                    paused_at_step: state.current_step_id,
                                    reason: validation.reason,
                                    user_question: input_text
                                }), {
                                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                                    status: 200
                                });
                            }

                            // Handle invalid responses
                            if (!validation.isValid) {
                                console.log('[SmartFlowEngine] ❌ Invalid response, sending clarification');

                                const clarificationMessage = `No entendí tu respuesta. ${currentStep.content}`;

                                // Send clarification via Evolution API
                                if (evolutionApiUrl && evolutionApiKey) {
                                    try {
                                        await fetch(`${evolutionApiUrl}/message/sendText/${instance}`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'apikey': evolutionApiKey
                                            },
                                            body: JSON.stringify({
                                                number: conversation_id,
                                                text: clarificationMessage
                                            })
                                        });
                                    } catch (error) {
                                        console.error('[SmartFlowEngine] Error sending clarification:', error);
                                    }
                                }

                                return new Response(JSON.stringify({
                                    status: 'CLARIFICATION_SENT',
                                    flow_paused: true,
                                    reason: validation.reason
                                }), {
                                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                                    status: 200
                                });
                            }

                            // Valid response - capture and continue
                            state.variables[variableName] = validation.extractedValue;
                            console.log(`[SmartFlowEngine] ✅ Captured validated response: ${variableName} = ${validation.extractedValue}`);

                            // Reactivate the flow to continue
                            state.status = 'active';
                        } else {
                            console.warn(`[SmartFlowEngine] Question step missing variable name or no input provided`);
                        }
                    } else {
                        // Generic continuation (merge any extracted variables)
                        state.variables = { ...state.variables, ...initialVariables };
                        console.log(`[SmartFlowEngine] Continuing from step: ${state.current_step_id}`);
                    }
                } else {
                    // Generic continuation (merge any extracted variables)
                    state.variables = { ...state.variables, ...initialVariables };
                    console.log(`[SmartFlowEngine] Continuing from step: ${state.current_step_id}`);
                }
            } else {
                console.warn('[SmartFlowEngine] Could not load existing state, creating new');
                state = {
                    flow_id: flowDefinition.id,
                    current_step_id: flowDefinition.steps[0]?.id || '',
                    variables: initialVariables,
                    status: 'active',
                    last_updated: new Date().toISOString(),
                    history: [],
                    metadata: {
                        is_transactional: true,
                        should_persist: false,
                        language: 'es',
                        conversation_id: conversation_id,
                        contact_id: contact_id
                    }
                };
            }
        }

        if (!state.metadata) state.metadata = {} as any;
        state.metadata.contact_id = contact_id;

        // 6. Execute Flow
        const executor = new FlowExecutor(flowDefinition, state, supabaseClient);
        const finalState = await executor.run();
        const outputMessages = executor.collectedMessages;

        // NEW: Send Messages via Evolution API
        if (evolutionApiUrl && evolutionApiKey && instance && conversation_id && outputMessages.length > 0) {
            console.log(`[SmartFlowEngine] Sending ${outputMessages.length} messages via Evolution API`);

            for (const msg of outputMessages) {
                try {
                    if (msg.type === 'text' && msg.content) {
                        const payload = {
                            number: conversation_id,
                            text: msg.content,
                            delay: 1200,
                            linkPreview: true
                        };
                        const url = `${evolutionApiUrl}/message/sendText/${instance}`;
                        const res = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
                            body: JSON.stringify(payload)
                        });
                        if (!res.ok) console.error(`[SmartFlowEngine] Failed to send text: ${await res.text()}`);
                    }
                    else if ((msg.type === 'image' || msg.type === 'media') && (msg.media_url || msg.content)) {
                        const mediaUrl = msg.media_url || msg.content;
                        if (mediaUrl.startsWith('http')) {
                            const payload = {
                                number: conversation_id,
                                mediaUrl: mediaUrl,
                                caption: msg.caption || '',
                                delay: 1500,
                                mediaType: 'image'
                            };
                            const url = `${evolutionApiUrl}/message/sendMedia/${instance}`;
                            const res = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
                                body: JSON.stringify(payload)
                            });
                            if (!res.ok) console.error(`[SmartFlowEngine] Failed to send media: ${await res.text()}`);
                        }
                    }
                } catch (sendErr) {
                    console.error('[SmartFlowEngine] Error sending to Evolution API:', sendErr);
                }
            }
        }

        // 6.5 Save State
        if (user_id && contact_id) {
            if (finalState.status === 'completed' && finalState.metadata?.is_transactional) {
                if (!finalState.metadata.quote_summary) {
                    finalState.metadata.quote_summary = {
                        product: finalState.variables['product_name'] || flowDefinition.name,
                        quantity: finalState.variables['quantity'] || finalState.variables['cantidad'] || 0,
                        total: finalState.variables['total_estimate'] || finalState.variables['quote_amount'] || 0,
                        timestamp: new Date().toISOString()
                    };
                }
            }
            await stateManager.saveState(user_id, contact_id, finalState);
            if (finalState.status === 'completed' && finalState.metadata?.is_transactional) {
                await stateManager.cleanupTransactionalData(contact_id, flowDefinition.id);
            }
        }

        // 7. Return Result
        return new Response(JSON.stringify({
            ...finalState,
            output_messages: outputMessages,
            messages_sent: outputMessages.length,
            is_new_request: isNewRequest
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })

    } catch (error) {
        console.error('[SmartFlowEngine] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
    }
})
