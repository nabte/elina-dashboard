import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createSupabaseAdminClient } from "./supabase-client.ts"
import { corsHeaders } from "./cors.ts"
import { getProfileByInstance, ensureContact, getChatHistory, getSimulationHistory, getSubscription, hasIgnoreTag, getActivePromotion, formatPromotionText, getAppointmentSettings, getAvailableSlots, formatAppointmentContext, detectAppointmentIntent, detectCriticalIntent, detectProductIntent, detectSimpleGreeting, detectQuoteIntent, analyzeSentiment, type SentimentAnalysis, getUserPreferences, saveUserPreference, formatPreferencesContext, getEdgeConfig, getDefaultEdgeConfig, recordMetric, getMessageBuffer, pushMessageBuffer, uploadToBunnyCDN, getAvailableServices, checkPresetResponse, handleAppointmentIntent, getBusinessCapabilities, MessageIntent, detectMessageIntent, getTopProducts, getTopProductsByPopularity, formatProductListForCustomer, formatTopProductsContext, getRecentMessages, addRecentMessage, formatRecentMessagesContext, getConversationSummary, truncateContext } from "./context.ts"
import { getRagContext, detectObjections } from "./rag.ts"
import { runConversationalAgent, type AgentConfig } from "./agent.ts"
import { loadActivePersonality, mergePersonalityConfig, loadPersonalityExtensions } from "./personality-loader.ts"
import { extractTaskFromMessage } from "./llm.ts"
import { processPlaceholders, shouldGenerateQuote, createAndSendQuote } from "./logic.ts"
import { sendMessage, sendImage, sendVideo, sendAudio, getMediaUrl, EVOLUTION_API_URL } from "./evolution-client.ts"
import { processMedia, generateAudio } from "./media.ts"
import { checkWorkflowTriggers, processWorkflowMessage } from "./workflow-engine.ts"

console.log("Process Chat Message Function Started v2.0 (Master Orchestrator)")

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const start = performance.now()
    try {
        const supabase = createSupabaseAdminClient()
        const payload = await req.json()

        console.log(">>> [PROCESO INICIO] Webhook recibido.", { timestamp: new Date().toISOString() })

        // 2. Extract Basic Info
        const data = payload?.data
        if (!data) {
            console.error("!!! [ERROR] Payload inválido: 'data' no existe.")
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const { key, message, pushName } = data
        let remoteJid = key?.remoteJid

        // Manejo especial para LID (Linked Devices)
        if (remoteJid && remoteJid.includes("@lid")) {
            remoteJid = key?.remoteJidAlt || remoteJid;
        }

        // Limpiar sufijo
        remoteJid = remoteJid?.replace("@s.whatsapp.net", "");

        const messageId = key?.id
        const instanceName = payload?.instance
        const apiKey = payload?.apikey || payload?.instance_apikey

        // Extract simulation mode parameters
        const isSimulation = payload?.isSimulation === true
        const draftPrompt = payload?.draft_prompt || null
        const simulationSessionId = payload?.session_id || `sim_${Date.now()}`

        if (isSimulation) {
            console.log(`🧪 [SIMULACIÓN] Modo simulación activado. Session: ${simulationSessionId}`)
            if (draftPrompt) {
                console.log(`🧪 [SIMULACIÓN] Usando draft prompt (${draftPrompt.length} chars)`)
            }
        }

        console.log(`--- [INFO] Datos extraídos: Instance=${instanceName}, Jid=${remoteJid}, MsgId=${messageId}`)

        if (!remoteJid || !messageId || !instanceName) {
            console.error('!!! [ERROR] Faltan campos clave (remoteJid, messageId, instanceName)')
            return new Response(JSON.stringify({ error: 'Missing key fields' }), { status: 400 })
        }

        if (remoteJid === 'status@broadcast' || key?.fromMe) {
            console.log("--- [INFO] Ignorando mensaje (status@broadcast o fromMe).")
            return new Response(JSON.stringify({ message: 'Ignored status update or own message' }), { status: 200 })
        }

        // Check Redis buffer for duplicates (Early lock)
        const buffer = await getMessageBuffer(remoteJid)
        if (buffer.includes(messageId)) {
            console.log('--- [REDIS] Mensaje duplicado detectado al inicio, ignorando')
            return new Response(JSON.stringify({ message: 'Duplicate message already in progress' }), { status: 200 })
        }

        // Add to buffer immediately to block concurrent retries
        await pushMessageBuffer(remoteJid, messageId)

        // 3. Get Profile
        let profile = null;

        if (isSimulation && payload.user_id) {
            console.log(`... [SIMULACIÓN] Buscando perfil por ID: ${payload.user_id}`)
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.user_id)
                .single()

            if (error || !userProfile) {
                console.error(`!!! [ERROR] Perfil no encontrado para usuario simulado: ${payload.user_id}`, error)
                return new Response(JSON.stringify({ error: 'Profile not found for simulation user' }), { status: 404, headers: corsHeaders })
            }
            profile = userProfile;
        } else {
            console.log(`... [PASO 1] Buscando perfil para instancia: ${instanceName}`)
            profile = await getProfileByInstance(supabase, instanceName)
        }

        if (!profile) {
            console.error(`!!! [ERROR] Perfil no encontrado para instancia: ${instanceName}`)
            return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: corsHeaders })
        }
        console.log(`+++ [EXITO] Perfil encontrado: ${profile.id}. URL Evolution: ${profile.evolution_api_url}`)

        // Use API Key from profile if not in payload (safer)
        const evolutionApiKey = profile.evolution_api_key

        if (!evolutionApiKey) {
            console.error(`!!! [ERROR CRÍTICO] La intancia ${instanceName} no tiene 'evolution_api_key' configurada en la tabla profiles.`)
            // We could return error, but let's continue processing to at least save history, just warn for now.
            // Actually user requested strict usage. Let's error specific actions if needed.
        } else {
            console.log(`+++ [SEGURIDAD] Usando Evolution API Key desde base de datos (termina en ...${evolutionApiKey.slice(-4)})`)
        }

        // 4. Ensure Contact (skip in simulation mode - use virtual contact)
        let contact: any;

        if (isSimulation) {
            console.log(`🧪 [SIMULACIÓN] Usando contacto virtual (no se crea en BD)`)
            // Create a virtual contact object for simulation
            contact = {
                id: `sim_contact_${profile.id}`,
                user_id: profile.id,
                phone_number: remoteJid,
                full_name: pushName || 'Usuario Simulado',
                labels: [],
                created_at: new Date().toISOString(),
                last_interaction_at: new Date().toISOString()
            }
        } else {
            console.log(`... [PASO 2] Buscando/Creando contacto: ${pushName || remoteJid}`)
            contact = await ensureContact(supabase, remoteJid, pushName, profile.id)
            if (!contact) {
                console.error('!!! [ERROR] Falló la creación/obtención del contacto')
                return new Response(JSON.stringify({ error: 'Contact error' }), { status: 500 })
            }
            console.log(`+++ [EXITO] Contacto ID: ${contact.id}`)
        }

        // Record metric: message_received (skip in simulation)
        if (!isSimulation) {
            await recordMetric(supabase, profile.id, contact.id, 'message_received', {
                message_id: messageId,
                remote_jid: remoteJid
            })
        }

        // 4.1. Check if contact has "ignorar" tag (skip in simulation mode)
        if (!isSimulation && hasIgnoreTag(contact)) {
            console.log("--- [INFO] Contacto tiene etiqueta 'ignorar'. Mensaje ignorado.")
            return new Response(JSON.stringify({ message: 'Contact ignored' }), { status: 200 })
        }

        // 4.2. Validate subscription (skip in simulation mode)
        if (!isSimulation) {
            console.log(`... [VALIDACIÓN] Verificando suscripción activa...`)

            const rawText = message?.conversation || message?.extendedTextMessage?.text || "";
            if (rawText !== 'TEST_PING') {
                const subscription = await getSubscription(supabase, profile.id)

                // Check if subscription is active or in trial period (simple check)
                const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

                if (!subscription || !isActive) {
                    console.error(`!!! [ERROR] Suscripción inactiva para user_id: ${profile.id}. Status: ${subscription?.status}`)
                    return new Response(JSON.stringify({ error: 'Subscription inactive' }), { status: 403 })
                }
                console.log(`+++ [EXITO] Suscripción activa/trial: ${subscription.plan_id}`)
            } else {
                console.log(">>> [TEST] Bypassing subscription check for TEST_PING")
            }
        } else {
            console.log("🧪 [SIMULACIÓN] Omitiendo validación de suscripción")
        }

        // 5. Process Content & Media
        let text = ""
        let originalType: "text" | "audio" | "image" | "video" | "document" = "text"

        // Evolution API logic for content extraction
        if (message?.conversation) {
            text = message.conversation
        } else if (message?.extendedTextMessage?.text) {
            text = message.extendedTextMessage.text
        } else if (message?.imageMessage) {
            originalType = "image"
            console.log("... [MEDIA] Imagen detectada. Procesando con Visión...")
            // Process Image
            text = await processMedia(instanceName, evolutionApiKey, messageId, 'image', profile.evolution_api_url)
            console.log(`+++ [MEDIA] Imagen descrita: "${text.substring(0, 50)}..."`)
            if (!text) text = " [Imagen enviada] " // Fallback if vision fails
        } else if (message?.audioMessage) {
            originalType = "audio"
            console.log("... [MEDIA] Audio detectado. Transcribiendo con Whisper...")
            // Process Audio
            text = await processMedia(instanceName, evolutionApiKey, messageId, 'audio', profile.evolution_api_url)
            console.log(`+++ [MEDIA] Audio transcrito: "${text}"`)
            if (!text) text = " [Audio enviado] " // Fallback
        } else if (message?.videoMessage) {
            originalType = "video"
            console.log("... [MEDIA] Video detectado (no soportado para análisis)")
            text = " [Video enviado] "
        } else if (message?.documentMessage) {
            originalType = "document"
            console.log("!!! [MEDIA] Documento detectado (tipo no soportado)")
            await sendMessage(instanceName, evolutionApiKey, remoteJid, "⚠️ Lo siento, actualmente no puedo procesar documentos PDF, Word u otros archivos. Por favor, envía tu mensaje como texto o imagen.", profile.evolution_api_url, { delay: 1500, linkPreview: false })
            return new Response(JSON.stringify({ message: 'Unsupported file type: document' }), { status: 200 })
        } else {
            // Other unsupported types
            console.log("!!! [MEDIA] Tipo de mensaje no soportado")
            await sendMessage(instanceName, evolutionApiKey, remoteJid, "⚠️ Lo siento, no puedo procesar este tipo de mensaje. Por favor, envía texto, imagen o audio.", profile.evolution_api_url, { delay: 1500, linkPreview: false })
            return new Response(JSON.stringify({ message: 'Unsupported message type' }), { status: 200 })
        }

        if (!text || text.trim().length === 0) {
            console.warn("--- [WARN] No hay contenido textual para procesar.")
            return new Response(JSON.stringify({ message: 'No textual content to process' }), { status: 200 })
        }

        // 4.0 Ignore simple thank yous to avoid AI cost/spam
        const textClean = text.toLowerCase().trim().replace(/[.,!¡¿?]/g, '');
        const simpleThanks = ['gracias', 'muchas gracias', 'ok gracias', 'listo gracias', 'mil gracias', 'perfecto gracias', 'gracias elina', 'ty', 'thx'];
        if (simpleThanks.includes(textClean)) {
            console.log("--- [INFO] Mensaje es un agradecimiento simple. Ignorando respuesta IA.");
            // Update last interaction so follow-ups don't trigger immediately
            await supabase.from('contacts').update({ last_interaction_at: new Date().toISOString() }).eq('id', contact.id)
            return new Response(JSON.stringify({
                success: true,
                processed: true,
                message: 'Thank you ignored',
                data: { output: '' }
            }), { status: 200, headers: corsHeaders })
        }

        // 4.1 Check Appointment Settings EARLY (Crucial for critical intent logic)
        console.log(`... [PASO 2] Verificando configuración de citas...`)
        const appointmentSettings = await getAppointmentSettings(supabase, profile.id)
        const hasAppointmentIntent = detectAppointmentIntent(text)

        // 4.2 Force Critical Intent if Appointment Requested but Disabled
        if (hasAppointmentIntent && (!appointmentSettings || !appointmentSettings.is_enabled)) {
            console.error(`!!! [CRÍTICO] Usuario pide cita pero el sistema está desactivado. FORZANDO HANDOVER.`)

            // Force critical response structure
            const criticalResponse = {
                is_critical: true,
                detection_type: 'appointment_request_manual',
                confidence: 1.0,
                detected_content: text,
                reason: 'User requested appointment but system is disabled'
            }

            // Execute critical logic (notifications, tagging)
            // Add "ignorar" label to contact
            const currentLabels = contact.labels || []
            if (!currentLabels.includes('ignorar')) {
                await supabase.from('contacts').update({
                    labels: [...currentLabels, 'ignorar'],
                    razon_de_label_auto: criticalResponse.reason
                }).eq('id', contact.id)
                console.log(`+++ [CRÍTICO] Etiqueta "ignorar" agregada al contacto`)
            }

            // Pause active followups
            await supabase.from('contacts').update({
                followup_status: 'paused'
            }).eq('id', contact.id).not('followup_status', 'is', null)

            // Notification
            if (profile.contact_phone) {
                const notificationMessage = `🚨 ATENCIÓN REQUERIDA (CITAS)\n\nContacto: ${contact.full_name || contact.phone_number}\nMotivo: El usuario quiere agendar pero tu sistema de citas está DESACTIVADO.\n\nMensaje:\n${text}`
                try {
                    await sendMessage('ElinaHead', evolutionApiKey, profile.contact_phone, notificationMessage, profile.evolution_api_url, { delay: 1500, linkPreview: false })
                    console.log(`+++ [CRÍTICO] Notificación enviada a ${profile.contact_phone}`)
                } catch (err) {
                    console.error(`!!! [ERROR] No se pudo enviar notificación:`, err)
                }
            }

            return new Response(JSON.stringify({
                message: 'Critical intent forced (Appointment Disabled)',
                is_critical: true,
                detection_type: criticalResponse.detection_type
            }), { status: 200 })
        }

        // 5.0 Handle Appointment Confirmation/Cancellation (Native)
        console.log(`... [CITAS] Verificando intención de cita (Confirmar/Cancelar)...`)
        const appointmentIntent = await handleAppointmentIntent(supabase, text, contact.id, profile.id)

        if (appointmentIntent) {
            console.log(`+++ [CITAS] Intención detectada: ${appointmentIntent.type}`)

            let responseText = ""
            if (appointmentIntent.type === 'confirmation') {
                responseText = "¡Perfecto! Tu cita ha sido confirmada. 📝\n\nNos vemos pronto. Si necesitas cambiar algo, avísame."
            } else if (appointmentIntent.type === 'cancellation') {
                responseText = "Entendido, he cancelado tu cita. 🗑️\n\n¿Te gustaría ver horarios disponibles para reagendar?"
            }

            if (responseText) {
                // Save interactions
                await supabase.from('chat_history').insert({ user_id: profile.id, contact_id: contact.id, message_type: 'human', content: text, created_at: new Date().toISOString() })
                await supabase.from('chat_history').insert({ user_id: profile.id, contact_id: contact.id, message_type: 'ai', content: responseText, created_at: new Date().toISOString() })

                return new Response(JSON.stringify({
                    success: true,
                    processed: true,
                    data: {
                        user_id: profile.id,
                        contact_id: contact.id,
                        message_processed: text,
                        original_type: originalType,
                        is_critical: false,
                        generated_response: responseText,
                        output: responseText,
                        media_type: 'text',
                        media_url: '',
                        quote_generated: false,
                        product_ids: []
                    }
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
            }
        }

        // 5.1. Detect Critical Intent (Normal flow)
        console.log(`... [CRÍTICO] Analizando intención crítica (General)...`)
        const criticalResponse = await detectCriticalIntent(contact.id, profile.id, text)

        if (criticalResponse?.is_critical) {
            console.error(`!!! [CRÍTICO] Intención crítica detectada: ${criticalResponse.detection_type || 'desconocido'}`)

            // Add "ignorar" label to contact
            const currentLabels = contact.labels || []
            if (!currentLabels.includes('ignorar')) {
                await supabase.from('contacts').update({
                    labels: [...currentLabels, 'ignorar'],
                    razon_de_label_auto: criticalResponse.reason || `Intención crítica: ${criticalResponse.detection_type}`
                }).eq('id', contact.id)
                console.log(`+++ [CRÍTICO] Etiqueta "ignorar" agregada al contacto`)
            }

            // Pause active followups if applicable
            await supabase.from('contacts').update({
                followup_status: 'paused'
            }).eq('id', contact.id).not('followup_status', 'is', null)

            // Send notification to owner if contact_phone exists
            if (profile.contact_phone) {
                const notificationMessage = `🚨 ATENCIÓN REQUERIDA\n\nContacto: ${contact.full_name || contact.phone_number}\nTipo: ${criticalResponse.detection_type || 'Crítico'}\nConfianza: ${Math.round((criticalResponse.confidence || 0) * 100)}%\n\nMensaje:\n${criticalResponse.detected_content || text}\n\nMotivo: ${criticalResponse.reason || 'Requiere atención humana'}`

                try {
                    await sendMessage('ElinaHead', evolutionApiKey, profile.contact_phone, notificationMessage, profile.evolution_api_url, { delay: 1500, linkPreview: false })
                    console.log(`+++ [CRÍTICO] Notificación enviada a ${profile.contact_phone}`)
                } catch (err) {
                    console.error(`!!! [ERROR] No se pudo enviar notificación:`, err)
                }
            }

            return new Response(JSON.stringify({
                message: 'Critical intent detected, contact tagged and owner notified',
                is_critical: true,
                detection_type: criticalResponse.detection_type
            }), { status: 200 })
        }
        console.log(`+++ [CRÍTICO] No se detectó intención crítica`)

        // 5.2. Check Preset Responses (BEFORE AI)
        console.log(`... [PRESET] Verificando respuestas programadas...`)
        const presetResponse = await checkPresetResponse(supabase, profile.id, text)

        if (presetResponse) {
            console.log(`+++ [PRESET] Respuesta automática detectada: "${presetResponse.trigger_text}" (${presetResponse.match_type})`)

            // Save user message
            await supabase.from('chat_history').insert({
                user_id: profile.id,
                contact_id: contact.id,
                message_type: 'human',
                content: text,
                created_at: new Date().toISOString()
            })

            // Save preset response to history
            await supabase.from('chat_history').insert({
                user_id: profile.id,
                contact_id: contact.id,
                message_type: 'ai',
                content: presetResponse.response_text,
                created_at: new Date().toISOString()
            })

            // Record metric
            await recordMetric(supabase, profile.id, contact.id, 'preset_response_sent', {
                trigger: presetResponse.trigger_text,
                match_type: presetResponse.match_type
            })

            // Pause active followups (user responded)
            const { data: contactData } = await supabase
                .from('contacts')
                .select('followup_status')
                .eq('id', contact.id)
                .single()

            if (contactData?.followup_status === 'active') {
                await supabase.from('contacts').update({
                    followup_status: 'paused',
                    last_interaction_at: new Date().toISOString()
                }).eq('id', contact.id).eq('followup_status', 'active')

                console.log(`+++ [FOLLOWUP] Seguimiento pausado para contacto ${contact.id}`)
            }

            // Return preset response for n8n to send
            return new Response(JSON.stringify({
                success: true,
                processed: true,
                preset_response: true,
                data: {
                    user_id: profile.id,
                    contact_id: contact.id,
                    message_processed: text,
                    original_type: originalType,
                    is_critical: false,
                    generated_response: presetResponse.response_text,
                    output: presetResponse.response_text,
                    media_type: presetResponse.media_type || 'text',
                    media_url: presetResponse.media_url || '',
                    quote_generated: false,
                    product_ids: []
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }
        console.log(`+++ [PRESET] No se encontró respuesta programada`)

        // 5.2.5 SMART FLOW ENGINE (Overrides LLM if flow matches)
        console.log(`... [SMART FLOW] Verificando motor de flujos inteligentes...`)
        console.log(`... [SMART FLOW INPUT] text="${text}", contact=${contact.id}`)
        try {
            const { data: smartFlowData, error: smartFlowError } = await supabase.functions.invoke('smart-flow-engine', {
                body: {
                    input_text: text,
                    conversation_id: contact.id.toString(),
                    user_properties: {
                        contact_name: contact.full_name,
                        contact_phone: contact.phone_number
                    }
                }
            })

            if (smartFlowError) {
                console.error('Error invoking smart-flow-engine:', smartFlowError)
            } else if (smartFlowData && smartFlowData.output_messages && smartFlowData.output_messages.length > 0) {
                console.log(`+++ [SMART FLOW] Flujo detectado y ejecutado. Enviando ${smartFlowData.output_messages.length} mensajes.`)

                for (const msg of smartFlowData.output_messages) {
                    if (msg.type === 'text') {
                        await sendMessage(instanceName, evolutionApiKey, remoteJid, msg.content)
                    } else if (msg.type === 'image') {
                        // sendMedia param order: instance, apikey, remoteJid, mediaUrl, type, caption, fileName
                        await sendMedia(instanceName, evolutionApiKey, remoteJid, msg.url, 'image', msg.caption || '', 'image.jpg')
                    }
                    // Add small delay between messages
                    await new Promise(r => setTimeout(r, 500))
                }

                // Save to history
                await supabase.from('chat_history').insert({
                    user_id: profile.id,
                    contact_id: contact.id,
                    message_type: 'human',
                    content: text,
                    created_at: new Date().toISOString()
                })

                await supabase.from('chat_history').insert({
                    user_id: profile.id,
                    contact_id: contact.id,
                    message_type: 'ai',
                    content: `[SMART FLOW] ${smartFlowData.flow_id} executed`,
                    created_at: new Date().toISOString()
                })

                return new Response(JSON.stringify({
                    success: true,
                    processed: true,
                    smart_flow_handled: true,
                    data: smartFlowData
                }), { status: 200, headers: corsHeaders })
            } else {
                console.log(`... [SMART FLOW] Sin coincidencia (Status: ${smartFlowData?.message || 'ok'})`)
            }

        } catch (e) {
            console.error('Exception calling smart-flow-engine:', e)
        }

        // 5.3. CUSTOM WORKFLOW ENGINE (Legacy/fallback)
        console.log(`... [WORKFLOW] Verificando flujos personalizados...`)

        // A. Check if user is already in a workflow
        const { data: conversationState, error: stateError } = await supabase
            .from('conversation_states')
            .select('*')
            .eq('contact_id', contact.id)
            .eq('user_id', profile.id) // Ensure correct tenant
            .single()

        let workflowRes = null;

        // If 'conversation_states' doesn't exist, create it (lazy init)
        let stateId = conversationState?.id;
        if (!conversationState && !stateError) { // if null but no error? or error is PGRST116
            const { data: newState } = await supabase.from('conversation_states').insert({
                contact_id: contact.id,
                user_id: profile.id,
                metadata: {}
            }).select().single();
            stateId = newState.id;
        } else if (stateError && stateError.code === 'PGRST116') {
            const { data: newState } = await supabase.from('conversation_states').insert({
                contact_id: contact.id,
                user_id: profile.id,
                metadata: {}
            }).select().single();
            stateId = newState.id;
        }

        if (stateId) {
            // Check Active Workflow
            if (conversationState?.metadata?.active_workflow_state) {
                workflowRes = await processWorkflowMessage(supabase, contact, profile, text, originalType, null, conversationState) // mediaUrl null for now, need extraction if image
            }
            // Check triggers if Not Active
            else {
                const triggerRes = await checkWorkflowTriggers(supabase, contact, profile, text, stateId)
                if (triggerRes.triggered) {
                    workflowRes = { processed: true, response: triggerRes.response }
                }
            }
        }

        if (workflowRes && workflowRes.processed) {
            console.log(`+++ [WORKFLOW] Mensaje manejado por flujo personalizado.`)

            if (workflowRes.response) {
                await sendMessage(instanceName, evolutionApiKey, remoteJid, workflowRes.response);

                // Save history
                await supabase.from('chat_history').insert({ user_id: profile.id, contact_id: contact.id, message_type: 'human', content: text, created_at: new Date().toISOString() })
                await supabase.from('chat_history').insert({ user_id: profile.id, contact_id: contact.id, message_type: 'ai', content: workflowRes.response, created_at: new Date().toISOString() })
            }

            return new Response(JSON.stringify({
                success: true,
                processed: true,
                workflow_handled: true,
                message: 'Handled by custom workflow'
            }), { status: 200, headers: corsHeaders })
        }

        console.log(`>>> [PROCESAMIENTO] Mensaje Final ("${text.substring(0, 50)}...") de ${contact.full_name}`)

        // 6. Context & RAG (Parallel)
        console.log("... [PASO 3] Obteniendo Historial, RAG y Promoción activa...")

        // Fetch history based on mode
        const historyPromise = isSimulation
            ? getSimulationHistory(supabase, profile.id, simulationSessionId)
            : getChatHistory(supabase, profile.id, contact.id)

        const [history, ragContext, activePromo, detectedObjections] = await Promise.all([
            historyPromise,
            getRagContext(supabase, profile.id, contact.id.toString(), text),
            getActivePromotion(supabase, profile.id),
            detectObjections(supabase, profile.id, text)
        ])
        console.log(`+++ [CONTEXTO] Historial con ${history.length} mensajes (Simulación: ${isSimulation}). RAG Contexto: ${ragContext ? 'SÍ' : 'NO'}. Promoción activa: ${activePromo ? 'SÍ' : 'NO'}`)

        // Log detected objections
        if (detectedObjections.length > 0) {
            console.log(`+++ [OBJECIONES] ${detectedObjections.length} objeciones detectadas:`)
            detectedObjections.forEach(obj => {
                console.log(`    - "${obj.objection}" (confianza: ${(obj.confidence * 100).toFixed(1)}%)`)
            })
        }

        // 6.2. Handle Appointments (Settings already fetched above)
        let servicesContext = ""
        let appointmentContext = ""
        let slotsData: any[] = [] // Define in outer scope

        if (appointmentSettings?.is_enabled) {
            // Always get services so the agent knows what can be booked
            const services = await getAvailableServices(supabase, profile.id)
            if (services.length > 0) {
                servicesContext = `CATÁLOGO DE SERVICIOS (Usa el ID solo para herramientas):\n${services.map((s: any) => `- SERVICIO: ${s.name} | ID: ${s.id}${s.description ? ' | DESC: ' + s.description : ''}`).join('\n')}\n`
                console.log(`+++ [CITAS] ${services.length} servicios cargados`)
            }

            // Only get slots if there's clear intent to book
            if (hasAppointmentIntent) {
                console.log(`... [CITAS] Intent detectado, buscando slots...`)
                slotsData = await getAvailableSlots(profile.id) // Assign to var
                if (slotsData && slotsData.length > 0) {
                    appointmentContext = formatAppointmentContext(slotsData)
                    console.log(`+++ [CITAS] ${slotsData.length} días de slots cargados`)
                }
            }
        }

        // 6.3. Construct Final RAG Context with Objections
        let finalRagContext = servicesContext + appointmentContext + (ragContext ? '\n\n' + ragContext : "")

        // Add detected objections to context
        if (detectedObjections.length > 0) {
            const objectionsContext = `\n\n[OBJECIONES DETECTADAS]\nEl mensaje del cliente parece contener una objeción. Aquí están las posibles objeciones y cómo manejarlas:\n\n${detectedObjections.map((obj, idx) =>
                `${idx + 1}. Objeción: "${obj.objection}" (Confianza: ${(obj.confidence * 100).toFixed(0)}%)\n   Respuesta sugerida: ${obj.response}\n   IMPORTANTE: Usa esta respuesta como GUÍA, no la copies exactamente. Adapta el tono y personaliza según el contexto.`
            ).join('\n\n')}`

            finalRagContext += objectionsContext
            console.log(`+++ [OBJECIONES] Contexto de objeciones agregado al RAG`)
        }

        if (activePromo) {
            const promoText = formatPromotionText(activePromo)
            finalRagContext += `\n\n[PROMOCIÓN ACTIVA]:\n${promoText}`
            console.log(`+++ [PROMO] Promoción inyectada: "${activePromo.title}"`)
        }

        // 7. Save User Message (use simulation_history in simulation mode)
        if (isSimulation) {
            await supabase.from('simulation_history').insert({
                user_id: profile.id,
                session_id: simulationSessionId,
                role: 'user',
                content: text,
                draft_prompt_used: draftPrompt,
                created_at: new Date().toISOString()
            })
            console.log(`🧪 [SIMULACIÓN] Mensaje guardado en simulation_history`)
        } else {
            await supabase.from('chat_history').insert({
                user_id: profile.id,
                contact_id: contact.id,
                message_type: 'human',
                content: text,
                created_at: new Date().toISOString()
            })
        }

        // 7.1. Check if this is first message
        // 7.1. Check if this is first message
        const isFirstMessage = history.length === 0
        let systemPrompt = profile.prompt_content || "Eres ELINA, una asistente virtual útil."

        // Use draft prompt in simulation mode
        if (isSimulation && draftPrompt) {
            systemPrompt = draftPrompt
            console.log(`🧪 [SIMULACIÓN] Usando draft prompt en lugar del prompt oficial`)
        }

        if (isFirstMessage) {
            systemPrompt += `\n\n[IMPORTANTE - PRIMER CONTACTO]:
            - Dale una bienvenida MUY CÁLIDA, BREVE y HUMANA.
            - Preséntate como Elina.
            - Pregunta cómo puedes ayudarle, pero NO intentes vender nada todavía. Solo abre la conversación.
            - NO LISTES SERVICIOS AHORA.`
            console.log(`+++ [PRIMER MENSAJE] Detectado primer contacto, agregando contexto de bienvenida`)

            // Record metric (skip in simulation mode)
            if (!isSimulation) {
                await recordMetric(supabase, profile.id, contact.id, 'first_message', {
                    contact_name: contact.full_name,
                    contact_phone: contact.phone_number
                })
            }
        }

        // 7.2 Personal Assistant Context Injection
        if (profile.contact_phone && remoteJid === profile.contact_phone) {
            console.log("... [ASISTENTE] Detectado mensaje del dueño/admin.")

            const { data: userStats } = await supabase
                .from('profiles')
                .select('credits, cash_balance')
                .eq('id', profile.id)
                .single()

            const assistantContext = `\n
[MODO ASISTENTE PERSONAL]
Estás hablando con tu JEFE/DUEÑO de la cuenta (${contact.full_name}).
Datos operativos actuales:
- Créditos IA: ${userStats?.credits || 0}
- Saldo: $${userStats?.cash_balance || 0}

Instrucciones especiales:
- Si pide "resumen", dáselo conciso.
- Tienes permiso total para gestionar la cuenta.
`
            systemPrompt += assistantContext

            // Detect "Recuerda" command
            const textLower = text.toLowerCase()
            if (textLower.startsWith('elina recuerda') || textLower.startsWith('recordar') || textLower.startsWith('recuérdame')) {
                console.log("... [ASISTENTE] Comando 'Recordar' detectado.")
                const extraction = await extractTaskFromMessage(text)

                if (extraction && extraction.title) {
                    // Create task
                    const { data: task, error: taskError } = await supabase
                        .from('personal_tasks')
                        .insert({
                            user_id: profile.id,
                            title: extraction.title,
                            description: extraction.description,
                            due_date: extraction.due_date,
                            reminder_days_before: extraction.reminder_days,
                            reminder_hours_before: extraction.reminder_hours,
                            status: 'pending'
                        })
                        .select()
                        .single()

                    if (!taskError) {
                        const confirmMsg = `✅ Listo. Te recordaré "${extraction.title}" para el ${new Date(extraction.due_date).toLocaleString('es-MX', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}.`

                        await supabase.from('chat_history').insert({ user_id: profile.id, contact_id: contact.id, message_type: 'human', content: text, created_at: new Date().toISOString() })
                        await supabase.from('chat_history').insert({ user_id: profile.id, contact_id: contact.id, message_type: 'ai', content: confirmMsg, created_at: new Date().toISOString() })

                        return new Response(JSON.stringify({
                            success: true,
                            processed: true,
                            data: {
                                user_id: profile.id,
                                contact_id: contact.id,
                                message_processed: text,
                                original_type: originalType,
                                is_critical: false,
                                generated_response: confirmMsg,
                                output: confirmMsg,
                                media_type: 'text',
                                product_ids: []
                            }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
                    }
                }
            }
        }

        // =================================================================================
        // [MODO CONTEXTO] Salida anticipada para n8n
        // Si el usuario solo quiere enriquecer el contexto para procesarlo en n8n
        // =================================================================================
        if (payload?.return_context_only === true) {
            console.log(">>> [MODO CONTEXTO] Retornando datos a n8n sin ejecutar LLM/Envío.")
            return new Response(JSON.stringify({
                success: true,
                mode: 'context_only',
                data: {
                    contact,
                    profile,
                    history,
                    rag_context: finalRagContext, // Incluye RAG + Promos + Citas
                    system_prompt: systemPrompt,
                    is_critical: false,
                    active_promo: activePromo,
                    appointment_settings: appointmentSettings?.is_enabled ? appointmentSettings : null,
                    text_processed: text,
                    original_type: originalType
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Fetch Edge Config
        const edgeConfig = await getEdgeConfig(supabase, profile.id);

        // Override System Prompt if defined in Edge Config (and not in simulation draft mode)
        if (!isSimulation && edgeConfig.base_prompt) {
            systemPrompt = edgeConfig.base_prompt;
            console.log("+++ [CONFIG] Usando base_prompt personalizado desde Edge Config");
        }

        // 8. Run Conversational Agent (NEW ARCHITECTURE)
        console.log("... [PASO 4] Ejecutando Agente Conversacional (OpenAI + Memory)...")

        // Load Business Capabilities (NEW - Fase 1)
        const capabilities = await getBusinessCapabilities(supabase, profile.id)
        if (capabilities) {
            console.log(`+++ [CAPABILITIES] Tipo: ${capabilities.primary_business_type}, Productos: ${capabilities.product_count}, Servicios: ${capabilities.service_count}`)
        }

        // Detect Message Intent (NEW - Fase 2)
        const intent = detectMessageIntent(text, capabilities)
        console.log(`+++ [INTENT] Detectado: ${intent}`)

        // Load Memory (NEW - Fase 3)
        const recentMessages = await getRecentMessages(supabase, contact.id.toString(), 10)
        const summary = await getConversationSummary(supabase, contact.id.toString())

        console.log(`+++ [MEMORY] Mensajes recientes: ${recentMessages.length}, Resumen: ${summary ? 'Sí' : 'No'}`)

        // Build memory context
        let memoryContext = ""
        if (summary) {
            memoryContext += `\n**📚 RESUMEN DE CONVERSACIONES PREVIAS:**\n${summary}\n`
        }
        memoryContext += formatRecentMessagesContext(recentMessages)

        // Conditional Context Injection (NEW - Fase 2)
        // Only inject relevant context based on intent and capabilities
        if (intent === MessageIntent.PRODUCT_INQUIRY && capabilities?.has_physical_products) {
            console.log('+++ [CONTEXT] Inyectando top productos (intent: PRODUCT_INQUIRY)')
            const topProducts = await getTopProducts(supabase, profile.id, 10)
            finalRagContext += formatTopProductsContext(topProducts)
        }

        if (intent === MessageIntent.APPOINTMENT_REQUEST && capabilities?.has_appointments) {
            console.log('+++ [CONTEXT] Inyectando slots de citas (intent: APPOINTMENT_REQUEST)')
            // Appointment context already added above if hasAppointmentIntent
            // This is just for logging consistency
        }

        // 8.5 Load active personality (if any)
        console.log('... [PERSONALITY] Verificando personalidad activa...')
        const activePersonality = await loadActivePersonality(supabase, profile.id)

        // Prepare base agent configuration
        let agentConfig: AgentConfig = {
            userId: profile.id,
            contactId: contact.id.toString(), // Convert to string
            sessionId: messageId, // Use message ID as session ID

            // LLM Configuration (from edge_function_config)
            model: edgeConfig.llm_model || 'gpt-4o-mini',
            temperature: edgeConfig.temperature ?? 0.7,
            maxTokens: edgeConfig.max_tokens || 1000,

            // System Prompts (from edge_function_config or defaults)
            basePrompt: systemPrompt,
            personalityContext: edgeConfig.personality_context || '',
            placeholderInstructions: edgeConfig.placeholder_instructions || '',
            appointmentRules: edgeConfig.appointment_rules || '',

            // Context
            companyInfo: profile,
            contactInfo: contact,
            ragContext: memoryContext + finalRagContext, // Memoria + RAG + Condicional
            businessCapabilities: capabilities, // NEW - Fase 1


            // Enabled tools
            enabledTools: ['buscar_productos', 'consultar_historial', 'agendar_cita']
        }

        // Apply personality configuration if active
        if (activePersonality) {
            agentConfig = mergePersonalityConfig(agentConfig, activePersonality, systemPrompt) as AgentConfig
        }

        const agentResponse = await runConversationalAgent(supabase, agentConfig, text)

        // Save to memory (NEW - Fase 3) - DB Based
        // const recentMessages = await getRecentMessages(supabase, contact.id.toString(), 10)
        // const summary = await getConversationSummary(supabase, contact.id.toString())

        if (!agentResponse.success) {
            console.error(`!!! [ERROR AGENTE] ${agentResponse.error}`)
            throw new Error(`Agent failed: ${agentResponse.error}`)
        }

        const aiResponseRaw = agentResponse.output
        console.log(`+++ [AGENTE] Respuesta generada (${agentResponse.metadata.tokensUsed} tokens, ${agentResponse.metadata.duration.toFixed(0)}ms)`)
        console.log(`+++ [AGENTE] Herramientas ejecutadas: ${agentResponse.metadata.toolsExecuted.join(', ') || 'ninguna'}`)
        console.log(`+++ [AGENTE] Preview: "${aiResponseRaw.substring(0, 100)}..."`)


        // 9. Logic (Placeholders)
        console.log("... [PASO 5] Procesando placeholders...")
        let { finalText: aiResponseProcessed, productIds, productsMap } = await processPlaceholders(aiResponseRaw, supabase, profile.id)
        if (productIds.length > 0) console.log(`+++ [PLACEHOLDERS] IDs encontrados: ${productIds.join(', ')}`)

        // 9.5. POST-PROCESAMIENTO: Auto-sugerir productos si no hay promos
        console.log("... [POST-PROCESS] Verificando si necesita sugerencias de productos...")
        const mentionsNoPromo = /no (tengo|hay|tenemos) (promos|promociones|ofertas|descuentos)/i.test(aiResponseProcessed)
        const mentionsProducts = /(producto|disponible|tenemos|ofrezco|mira estos)/i.test(aiResponseProcessed)

        if (mentionsNoPromo && !mentionsProducts) {
            console.log("... [AUTO-PRODUCTOS] Detectado 'no hay promos' sin alternativa, inyectando top productos...")

            // Buscar productos más populares (mencionados en conversaciones)
            const topProducts = await getTopProductsByPopularity(supabase, profile.id, 3)

            if (topProducts.length > 0) {
                const productList = formatProductListForCustomer(topProducts)

                aiResponseProcessed += `\n\nPero mira estos productos que sí tengo disponibles y que a otros clientes les han encantado:\n\n${productList}\n\n¿Cuál te interesa?`

                console.log(`+++ [AUTO-PRODUCTOS] Inyectados ${topProducts.length} productos populares`)
            } else {
                // Fallback: usar top productos por stock si no hay menciones
                console.log("... [AUTO-PRODUCTOS] No hay productos mencionados, usando top por stock...")
                const topByStock = await getTopProducts(supabase, profile.id, 3)

                if (topByStock.length > 0) {
                    const productList = formatProductListForCustomer(topByStock)
                    aiResponseProcessed += `\n\nPero mira estos productos que sí tengo disponibles:\n\n${productList}\n\n¿Cuál te interesa?`
                    console.log(`+++ [AUTO-PRODUCTOS] Inyectados ${topByStock.length} productos (fallback por stock)`)
                }
            }
        }

        // 10. Detect and Send Media (Images/Videos)
        console.log(`... [PASO 6] Detectando media en respuesta...`)

        let finalResponseType = 'text'
        let finalMediaUrl = ''
        let finalOutputText = aiResponseProcessed

        // Check for image marker: url_imagen:https://...
        const imageMatch = aiResponseProcessed.match(/url_imagen:\s*(https?:\/\/[^\s]+)/i)
        if (imageMatch) {
            const imageUrl = imageMatch[1]
            const textWithoutImage = aiResponseProcessed.replace(/url_imagen:\s*https?:\/\/[^\s]+/gi, '').trim()
            console.log(`+++ [IMAGEN] Detectada imagen: ${imageUrl}`)

            finalResponseType = 'image'
            finalMediaUrl = imageUrl
            finalOutputText = textWithoutImage // Output clean text for n8n

            // Record history (but n8n will send)
            if (isSimulation) {
                await supabase.from('simulation_history').insert({
                    user_id: profile.id,
                    session_id: simulationSessionId,
                    role: 'assistant',
                    content: textWithoutImage,
                    media_urls: [imageUrl],
                    draft_prompt_used: draftPrompt,
                    created_at: new Date().toISOString()
                })
                console.log(`🧪 [SIMULACIÓN] Respuesta con imagen guardada en simulation_history`)
            } else {
                await supabase.from('chat_history').insert({
                    user_id: profile.id,
                    contact_id: contact.id,
                    message_type: 'ai',
                    content: textWithoutImage,
                    created_at: new Date().toISOString()
                })
            }

        } else {
            // Check for video marker: urlVideo:https://...
            const videoMatch = aiResponseProcessed.match(/urlVideo:\s*(https?:\/\/[^\s]+)/i)
            if (videoMatch) {
                const videoUrl = videoMatch[1]
                const textWithoutVideo = aiResponseProcessed.replace(/urlVideo:\s*https?:\/\/[^\s]+/gi, '').trim()
                console.log(`+++ [VIDEO] Detectado video: ${videoUrl}`)

                finalResponseType = 'video'
                finalMediaUrl = videoUrl
                finalOutputText = textWithoutVideo

                if (isSimulation) {
                    await supabase.from('simulation_history').insert({
                        user_id: profile.id,
                        session_id: simulationSessionId,
                        role: 'assistant',
                        content: textWithoutVideo,
                        media_urls: [videoUrl],
                        draft_prompt_used: draftPrompt,
                        created_at: new Date().toISOString()
                    })
                    console.log(`🧪 [SIMULACIÓN] Respuesta con video guardada en simulation_history`)
                } else {
                    await supabase.from('chat_history').insert({
                        user_id: profile.id,
                        contact_id: contact.id,
                        message_type: 'ai',
                        content: aiResponseProcessed,
                        created_at: new Date().toISOString()
                    })
                }

            } else {
                // No media detected, send as normal text or audio
                console.log(`... [PASO 7] Preparando respuesta para n8n (Tipo origen: ${originalType})...`)

                // If input was audio, prepare audio response
                if (originalType === 'audio') {
                    console.log("... [AUDIO] Generando audio de respuesta (ElevenLabs)...")
                    const audioDataUrl = await generateAudio(aiResponseProcessed)
                    if (audioDataUrl) {
                        console.log("+++ [AUDIO] Audio generado.")
                        finalResponseType = 'audio'
                        finalMediaUrl = audioDataUrl
                        finalOutputText = aiResponseProcessed
                    } else {
                        console.error("!!! [ERROR] Falló generación audio. Retornando solo texto.")
                        finalResponseType = 'text'
                        finalOutputText = aiResponseProcessed
                    }
                } else {
                    // Normal text
                    finalResponseType = 'text'
                    finalOutputText = aiResponseProcessed
                }

                // --- SAFETY CHECK: Ensure text is not empty ---
                if (!finalOutputText || finalOutputText.trim().length === 0) {
                    console.warn("!!! [ADVERTENCIA] Respuesta vacía de AI (tokens agotados o error). Usando fallback.")
                    finalOutputText = "Lo siento, estoy teniendo dificultades para procesar tu mensaje completo. ¿Podrías intentar de nuevo?"
                }

                // --- SEND MESSAGE VIA EVOLUTION API (REAL MODE ONLY) ---
                if (!isSimulation && !payload?.return_context_only) {
                    console.log(`... [EVOLUTION] Enviando respuesta (${finalResponseType})...`)
                    try {
                        if (finalResponseType === 'text') {
                            await sendMessage(instanceName, evolutionApiKey, remoteJid, finalOutputText, profile.evolution_api_url)
                        } else if (finalResponseType === 'image') {
                            await sendImage(instanceName, evolutionApiKey, remoteJid, finalMediaUrl, finalOutputText, profile.evolution_api_url)
                        } else if (finalResponseType === 'video') {
                            await sendVideo(instanceName, evolutionApiKey, remoteJid, finalMediaUrl, finalOutputText, profile.evolution_api_url)
                        } else if (finalResponseType === 'audio') {
                            await sendAudio(instanceName, evolutionApiKey, remoteJid, finalMediaUrl, profile.evolution_api_url)
                        }
                        console.log(`+++ [EVOLUTION] Mensaje enviado exitosamente.`)
                    } catch (sendError) {
                        console.error("!!! [ERROR] Falló el envío a Evolution:", sendError)
                        // Don't throw, just log. We still want to save history.
                    }
                } else if (isSimulation) {
                    console.log(`🧪 [SIMULACIÓN] Omitiendo envío a Evolution API (Solo retorno JSON)`)
                }

                // Save AI Message (async, non-blocking)
                const asyncSaves = []

                if (isSimulation) {
                    asyncSaves.push(
                        supabase.from('simulation_history').insert({
                            user_id: profile.id,
                            session_id: simulationSessionId,
                            role: 'assistant',
                            content: finalOutputText,
                            media_urls: finalMediaUrl ? [finalMediaUrl] : [],
                            draft_prompt_used: draftPrompt,
                            created_at: new Date().toISOString()
                        })
                    )
                    console.log(`🧪 [SIMULACIÓN] Respuesta guardada en simulation_history`)
                } else {
                    asyncSaves.push(
                        supabase.from('chat_history').insert({
                            user_id: profile.id,
                            contact_id: contact.id,
                            message_type: 'ai',
                            content: finalOutputText,
                            created_at: new Date().toISOString()
                        }),
                        recordMetric(supabase, profile.id, contact.id, 'message_sent', {
                            message_length: finalOutputText.length,
                            original_type: originalType
                        })
                    )
                }

                // Fire-and-forget (executes in background)
                Promise.all(asyncSaves).catch(err => console.error('[ASYNC] Error guardando:', err))

                // Trigger auto-tags analysis (async, non-blocking)
                const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
                const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

                if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                    // Fire and forget - don't await
                    fetch(`${SUPABASE_URL}/functions/v1/apply-auto-tags`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: profile.id,
                            contact_id: contact.id
                        })
                    }).catch(err => console.error('[AUTO-TAGS] Error calling function:', err))

                    console.log('+++ [AUTO-TAGS] Análisis disparado en background')
                }
            }
        }

        // 11. Pause active followups (user responded)
        console.log(`... [FOLLOWUP] Verificando seguimientos activos...`)
        const { data: contactData } = await supabase
            .from('contacts')
            .select('followup_status')
            .eq('id', contact.id)
            .single()

        if (contactData?.followup_status === 'active') {
            await supabase.from('contacts').update({
                followup_status: 'paused',
                last_interaction_at: new Date().toISOString()
            }).eq('id', contact.id).eq('followup_status', 'active')

            console.log(`+++ [FOLLOWUP] Seguimiento pausado para contacto ${contact.id}`)
        }

        // 12. Quote Logic
        const textLower = text.toLowerCase()
        const cierreKeywords = /(?:cotización|cotizacion|presupuesto|generar pdf|enviar pdf|formalizar|documento|precio final)/i
        const negativeKeywords = /(?:no quiero|no necesito|solo ver|consultar)/i

        const isExplicitRequest = cierreKeywords.test(textLower) && !negativeKeywords.test(textLower)

        if (!isSimulation && shouldGenerateQuote(aiResponseProcessed, productIds, isExplicitRequest)) {
            console.log("... [COTIZACION] Detectada necesidad de cotización. Generando PDF...")
            // We keep this running here as it might be complex to move fully to n8n instantly without new nodes
            await createAndSendQuote(
                supabase,
                instanceName,
                evolutionApiKey,
                remoteJid,
                profile.id,
                contact.id,
                productIds,
                productsMap,
                text
            )
            console.log("+++ [COTIZACION] Proceso de cotización finalizado.")
        } else if (isSimulation && shouldGenerateQuote(aiResponseProcessed, productIds, isExplicitRequest)) {
            console.log("🧪 [SIMULACIÓN] Omitiendo generación de PDF de cotización")
        }

        const duration = performance.now() - start
        console.log(`>>> [FIN] Proceso completado exitosamente en ${duration.toFixed(0)}ms`)

        return new Response(JSON.stringify({
            success: true,
            processed: true,
            data: {
                user_id: profile.id,
                contact_id: contact.id,
                message_processed: text,
                original_type: originalType,
                is_critical: false,
                has_appointment_intent: hasAppointmentIntent,
                generated_response: finalOutputText,
                output: finalOutputText, // For n8n compatibility
                media_type: finalResponseType,
                media_url: finalMediaUrl,
                quote_generated: false,
                product_ids: productIds, // Return product IDs found
                // New fields for N8N as requested
                appointment_data: {
                    slots: (appointmentSettings?.is_enabled && hasAppointmentIntent) ? slotsData : [], // Return slots if we fetched them
                    booking_link: (profile.slug && profile.slug !== 'agendar') ? `https://elinaia.com.mx/${profile.slug}` : null
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('!!! [ERROR FATAL] Excepción en process-chat-message:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
