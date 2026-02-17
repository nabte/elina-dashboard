import { serve } from "https:
import { createSupabaseAdminClient } from "./supabase-client.ts"
import { corsHeaders } from "./cors.ts"
import { getProfileByInstance, ensureContact, getChatHistory, getSimulationHistory, getSubscription, hasIgnoreTag, getActivePromotion, formatPromotionText, getAppointmentSettings, getAvailableSlots, formatAppointmentContext, detectAppointmentIntent, detectCriticalIntent, detectProductIntent, detectSimpleGreeting, detectQuoteIntent, analyzeSentiment, type SentimentAnalysis, getUserPreferences, saveUserPreference, formatPreferencesContext, getEdgeConfig, getDefaultEdgeConfig, recordMetric, getMessageBuffer, pushMessageBuffer, uploadToBunnyCDN, getAvailableServices, checkPresetResponse, handleAppointmentIntent, getBusinessCapabilities, MessageIntent, detectMessageIntent, getTopProducts, formatTopProductsContext, getRecentMessages, addRecentMessage, formatRecentMessagesContext, getConversationSummary, truncateContext } from "./context.ts"
import { getRagContext, detectObjections } from "./rag.ts"
import { runConversationalAgent, type AgentConfig } from "./agent.ts"
import { extractTaskFromMessage } from "./llm.ts"
import { processPlaceholders, shouldGenerateQuote, createAndSendQuote } from "./logic.ts"
import { sendMessage, sendImage, sendVideo, sendAudio, getMediaUrl, EVOLUTION_API_URL } from "./evolution-client.ts"
import { processMedia, generateAudio } from "./media.ts"
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    const start = performance.now()
    try {
        const supabase = createSupabaseAdminClient()
        const payload = await req.json()
        const data = payload?.data
        if (!data) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
        const { key, message, pushName } = data
        let remoteJid = key?.remoteJid
        if (remoteJid && remoteJid.includes("@lid")) {
            remoteJid = key?.remoteJidAlt || remoteJid;
        }
        remoteJid = remoteJid?.replace("@s.whatsapp.net", "");
        const messageId = key?.id
        const instanceName = payload?.instance
        const apiKey = payload?.apikey || payload?.instance_apikey
        const isSimulation = payload?.isSimulation === true
        const draftPrompt = payload?.draft_prompt || null
        const simulationSessionId = payload?.session_id || `sim_${Date.now()}`
        if (isSimulation) {
            if (draftPrompt) {
                }
        }
        if (!remoteJid || !messageId || !instanceName) {
            return new Response(JSON.stringify({ error: 'Missing key fields' }), { status: 400 })
        }
        if (remoteJid === 'status@broadcast' || key?.fromMe) {
            return new Response(JSON.stringify({ message: 'Ignored status update or own message' }), { status: 200 })
        }
        const buffer = await getMessageBuffer(remoteJid)
        if (buffer.includes(messageId)) {
            return new Response(JSON.stringify({ message: 'Duplicate message already in progress' }), { status: 200 })
        }
        await pushMessageBuffer(remoteJid, messageId)
        let profile = null;
        if (isSimulation && payload.user_id) {
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.user_id)
                .single()
            if (error || !userProfile) {
                return new Response(JSON.stringify({ error: 'Profile not found for simulation user' }), { status: 404, headers: corsHeaders })
            }
            profile = userProfile;
        } else {
            profile = await getProfileByInstance(supabase, instanceName)
        }
        if (!profile) {
            return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: corsHeaders })
        }
        const evolutionApiKey = profile.evolution_api_key
        if (!evolutionApiKey) {
            } else {
            }
        const contact = await ensureContact(supabase, profile.id, remoteJid, pushName)
        if (!contact) {
            return new Response(JSON.stringify({ error: 'Contact error' }), { status: 500 })
        }
        await recordMetric(supabase, profile.id, contact.id, 'message_received', {
            message_id: messageId,
            remote_jid: remoteJid
        })
        if (!isSimulation && hasIgnoreTag(contact)) {
            return new Response(JSON.stringify({ message: 'Contact ignored' }), { status: 200 })
        }
        if (!isSimulation) {
            const rawText = message?.conversation || message?.extendedTextMessage?.text || "";
            if (rawText !== 'TEST_PING') {
                const subscription = await getSubscription(supabase, profile.id)
                const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
                if (!subscription || !isActive) {
                    return new Response(JSON.stringify({ error: 'Subscription inactive' }), { status: 403 })
                }
                } else {
                }
        } else {
            }
        let text = ""
        let originalType = "text"
        if (message?.conversation) {
            text = message.conversation
        } else if (message?.extendedTextMessage?.text) {
            text = message.extendedTextMessage.text
        } else if (message?.imageMessage) {
            originalType = "image"
            text = await processMedia(instanceName, evolutionApiKey, messageId, 'image', profile.evolution_api_url)
            if (!text) text = " [Imagen enviada] " 
        } else if (message?.audioMessage) {
            originalType = "audio"
            text = await processMedia(instanceName, evolutionApiKey, messageId, 'audio', profile.evolution_api_url)
            if (!text) text = " [Audio enviado] " 
        } else if (message?.videoMessage) {
            originalType = "video"
            text = " [Video enviado] "
        } else if (message?.documentMessage) {
            originalType = "document"
            await sendMessage(instanceName, evolutionApiKey, remoteJid, "⚠️ Lo siento, actualmente no puedo procesar documentos PDF, Word u otros archivos. Por favor, envía tu mensaje como texto o imagen.", profile.evolution_api_url, { delay: 1500, linkPreview: false })
            return new Response(JSON.stringify({ message: 'Unsupported file type: document' }), { status: 200 })
        } else {
            await sendMessage(instanceName, evolutionApiKey, remoteJid, "⚠️ Lo siento, no puedo procesar este tipo de mensaje. Por favor, envía texto, imagen o audio.", profile.evolution_api_url, { delay: 1500, linkPreview: false })
            return new Response(JSON.stringify({ message: 'Unsupported message type' }), { status: 200 })
        }
        if (!text || text.trim().length === 0) {
            return new Response(JSON.stringify({ message: 'No textual content to process' }), { status: 200 })
        }
        const appointmentSettings = await getAppointmentSettings(supabase, profile.id)
        const hasAppointmentIntent = detectAppointmentIntent(text)
        if (hasAppointmentIntent && (!appointmentSettings || !appointmentSettings.is_enabled)) {
            const criticalResponse = {
                is_critical: true,
                detection_type: 'appointment_request_manual',
                confidence: 1.0,
                detected_content: text,
                reason: 'User requested appointment but system is disabled'
            }
            const currentLabels = contact.labels || []
            if (!currentLabels.includes('ignorar')) {
                await supabase.from('contacts').update({
                    labels: [...currentLabels, 'ignorar'],
                    razon_de_label_auto: criticalResponse.reason
                }).eq('id', contact.id)
                }
            await supabase.from('contacts').update({
                followup_status: 'paused'
            }).eq('id', contact.id).not('followup_status', 'is', null)
            if (profile.contact_phone) {
                const notificationMessage = `🚨 ATENCIÓN REQUERIDA (CITAS)\n\nContacto: ${contact.full_name || contact.phone_number}\nMotivo: El usuario quiere agendar pero tu sistema de citas está DESACTIVADO.\n\nMensaje:\n${text}`
                try {
                    await sendMessage('ElinaHead', evolutionApiKey, profile.contact_phone, notificationMessage, profile.evolution_api_url, { delay: 1500, linkPreview: false })
                    } catch (err) {
                    }
            }
            return new Response(JSON.stringify({
                message: 'Critical intent forced (Appointment Disabled)',
                is_critical: true,
                detection_type: criticalResponse.detection_type
            }), { status: 200 })
        }
        const appointmentIntent = await handleAppointmentIntent(supabase, text, contact.id, profile.id)
        if (appointmentIntent) {
            let responseText = ""
            if (appointmentIntent.type === 'confirmation') {
                responseText = "¡Perfecto! Tu cita ha sido confirmada. 📝\n\nNos vemos pronto. Si necesitas cambiar algo, avísame."
            } else if (appointmentIntent.type === 'cancellation') {
                responseText = "Entendido, he cancelado tu cita. 🗑️\n\n¿Te gustaría ver horarios disponibles para reagendar?"
            }
            if (responseText) {
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
        const criticalResponse = await detectCriticalIntent(contact.id, profile.id, text)
        if (criticalResponse?.is_critical) {
            const currentLabels = contact.labels || []
            if (!currentLabels.includes('ignorar')) {
                await supabase.from('contacts').update({
                    labels: [...currentLabels, 'ignorar'],
                    razon_de_label_auto: criticalResponse.reason || `Intención crítica: ${criticalResponse.detection_type}`
                }).eq('id', contact.id)
                }
            await supabase.from('contacts').update({
                followup_status: 'paused'
            }).eq('id', contact.id).not('followup_status', 'is', null)
            if (profile.contact_phone) {
                const notificationMessage = `🚨 ATENCIÓN REQUERIDA\n\nContacto: ${contact.full_name || contact.phone_number}\nTipo: ${criticalResponse.detection_type || 'Crítico'}\nConfianza: ${Math.round((criticalResponse.confidence || 0) * 100)}%\n\nMensaje:\n${criticalResponse.detected_content || text}\n\nMotivo: ${criticalResponse.reason || 'Requiere atención humana'}`
                try {
                    await sendMessage('ElinaHead', evolutionApiKey, profile.contact_phone, notificationMessage, profile.evolution_api_url, { delay: 1500, linkPreview: false })
                    } catch (err) {
                    }
            }
            return new Response(JSON.stringify({
                message: 'Critical intent detected, contact tagged and owner notified',
                is_critical: true,
                detection_type: criticalResponse.detection_type
            }), { status: 200 })
        }
        const presetResponse = await checkPresetResponse(supabase, profile.id, text)
        if (presetResponse) {
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
                content: presetResponse.response_text,
                created_at: new Date().toISOString()
            })
            await recordMetric(supabase, profile.id, contact.id, 'preset_response_sent', {
                trigger: presetResponse.trigger_text,
                match_type: presetResponse.match_type
            })
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
                }
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
        const historyPromise = isSimulation
            ? getSimulationHistory(supabase, profile.id, simulationSessionId)
            : getChatHistory(supabase, profile.id, contact.id)
        const [history, ragContext, activePromo, detectedObjections] = await Promise.all([
            historyPromise,
            getRagContext(supabase, profile.id, contact.id.toString(), text),
            getActivePromotion(supabase, profile.id),
            detectObjections(supabase, profile.id, text)
        ])
        if (detectedObjections.length > 0) {
            detectedObjections.forEach(obj => {
                })
        }
        let servicesContext = ""
        let appointmentContext = ""
        let slotsData: any[] = [] 
        if (appointmentSettings?.is_enabled) {
            const services = await getAvailableServices(supabase, profile.id)
            if (services.length > 0) {
                servicesContext = `CATÁLOGO DE SERVICIOS (Usa el ID solo para herramientas):\n${services.map((s: any) => `- SERVICIO: ${s.name} | ID: ${s.id}${s.description ? ' | DESC: ' + s.description : ''}`).join('\n')}\n`
                }
            if (hasAppointmentIntent) {
                slotsData = await getAvailableSlots(profile.id) 
                if (slotsData && slotsData.length > 0) {
                    appointmentContext = formatAppointmentContext(slotsData)
                    }
            }
        }
        let finalRagContext = servicesContext + appointmentContext + (ragContext ? '\n\n' + ragContext : "")
        if (detectedObjections.length > 0) {
            const objectionsContext = `\n\n[OBJECIONES DETECTADAS]\nEl mensaje del cliente parece contener una objeción. Aquí están las posibles objeciones y cómo manejarlas:\n\n${detectedObjections.map((obj, idx) =>
                `${idx + 1}. Objeción: "${obj.objection}" (Confianza: ${(obj.confidence * 100).toFixed(0)}%)\n   Respuesta sugerida: ${obj.response}\n   IMPORTANTE: Usa esta respuesta como GUÍA, no la copies exactamente. Adapta el tono y personaliza según el contexto.`
            ).join('\n\n')}`
            finalRagContext += objectionsContext
            }
        if (activePromo) {
            const promoText = formatPromotionText(activePromo)
            finalRagContext += `\n\n[PROMOCIÓN ACTIVA]:\n${promoText}`
            }
        if (isSimulation) {
            await supabase.from('simulation_history').insert({
                user_id: profile.id,
                session_id: simulationSessionId,
                role: 'user',
                content: text,
                draft_prompt_used: draftPrompt,
                created_at: new Date().toISOString()
            })
            } else {
            await supabase.from('chat_history').insert({
                user_id: profile.id,
                contact_id: contact.id,
                message_type: 'human',
                content: text,
                created_at: new Date().toISOString()
            })
        }
        const isFirstMessage = history.length === 0
        let systemPrompt = profile.prompt_content || "Eres ELINA, una asistente virtual útil."
        if (isSimulation && draftPrompt) {
            systemPrompt = draftPrompt
            }
        if (isFirstMessage) {
            systemPrompt += `\n\n[IMPORTANTE - PRIMER CONTACTO]:
            - Dale una bienvenida MUY CÁLIDA, BREVE y HUMANA.
            - Preséntate como Elina.
            - Pregunta cómo puedes ayudarle, pero NO intentes vender nada todavía. Solo abre la conversación.
            - NO LISTES SERVICIOS AHORA.`
            if (!isSimulation) {
                await recordMetric(supabase, profile.id, contact.id, 'first_message', {
                    contact_name: contact.full_name,
                    contact_phone: contact.phone_number
                })
            }
        }
        if (profile.contact_phone && remoteJid === profile.contact_phone) {
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
            const textLower = text.toLowerCase()
            if (textLower.startsWith('elina recuerda') || textLower.startsWith('recordar') || textLower.startsWith('recuérdame')) {
                const extraction = await extractTaskFromMessage(text)
                if (extraction && extraction.title) {
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
        if (payload?.return_context_only === true) {
            return new Response(JSON.stringify({
                success: true,
                mode: 'context_only',
                data: {
                    contact,
                    profile,
                    history,
                    rag_context: finalRagContext, 
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
        const edgeConfig = await getEdgeConfig(supabase, profile.id);
        if (!isSimulation && edgeConfig.base_prompt) {
            systemPrompt = edgeConfig.base_prompt;
        }
        const capabilities = await getBusinessCapabilities(supabase, profile.id)
        if (capabilities) {
            }
        const intent = detectMessageIntent(text, capabilities)
        const recentMessages = await getRecentMessages(supabase, contact.id.toString(), 10)
        const summary = await getConversationSummary(supabase, contact.id.toString())
        let memoryContext = ""
        if (summary) {
            memoryContext += `\n**📚 RESUMEN DE CONVERSACIONES PREVIAS:**\n${summary}\n`
        }
        memoryContext += formatRecentMessagesContext(recentMessages)
        if (intent === MessageIntent.PRODUCT_INQUIRY && capabilities?.has_physical_products) {
            const topProducts = await getTopProducts(supabase, profile.id, 10)
            finalRagContext += formatTopProductsContext(topProducts)
        }
        if (intent === MessageIntent.APPOINTMENT_REQUEST && capabilities?.has_appointments) {
            }
        const agentConfig: AgentConfig = {
            userId: profile.id,
            contactId: contact.id.toString(), 
            sessionId: messageId, 
            model: edgeConfig.llm_model || 'gpt-4o-mini',
            temperature: edgeConfig.temperature ?? 0.7,
            maxTokens: edgeConfig.max_tokens || 1000,
            basePrompt: systemPrompt,
            personalityContext: edgeConfig.personality_context || '',
            placeholderInstructions: edgeConfig.placeholder_instructions || '',
            appointmentRules: edgeConfig.appointment_rules || '',
            companyInfo: profile,
            contactInfo: contact,
            ragContext: memoryContext + finalRagContext, 
            businessCapabilities: capabilities, 
            enabledTools: ['buscar_productos', 'consultar_historial', 'agendar_cita']
        }
        const agentResponse = await runConversationalAgent(supabase, agentConfig, text)
        if (!agentResponse.success) {
            throw new Error(`Agent failed: ${agentResponse.error}`)
        }
        const aiResponseRaw = agentResponse.output
        const { finalText: aiResponseProcessed, productIds, productsMap } = await processPlaceholders(aiResponseRaw, supabase, profile.id)
        if (productIds.length > 0) let finalResponseType = 'text'
        let finalMediaUrl = ''
        let finalOutputText = aiResponseProcessed
        // Check for image marker: url_imagen:https://...
        const imageMatch = aiResponseProcessed.match(/url_imagen:\s*(https?:\/\/[^\s]+)/i)
        if (imageMatch) {
            const imageUrl = imageMatch[1]
            const textWithoutImage = aiResponseProcessed.replace(/url_imagen:\s*https?:\/\/[^\s]+/gi, '').trim()
            finalResponseType = 'image'
            finalMediaUrl = imageUrl
            finalOutputText = textWithoutImage 
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
                if (originalType === 'audio') {
                    const audioDataUrl = await generateAudio(aiResponseProcessed)
                    if (audioDataUrl) {
                        finalResponseType = 'audio'
                        finalMediaUrl = audioDataUrl
                        finalOutputText = aiResponseProcessed
                    } else {
                        finalResponseType = 'text'
                        finalOutputText = aiResponseProcessed
                    }
                } else {
                    finalResponseType = 'text'
                    finalOutputText = aiResponseProcessed
                }
                if (!finalOutputText || finalOutputText.trim().length === 0) {
                    finalOutputText = "Lo siento, estoy teniendo dificultades para procesar tu mensaje completo. ¿Podrías intentar de nuevo?"
                }
                if (!isSimulation && !payload?.return_context_only) {
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
                        } catch (sendError) {
                        }
                } else if (isSimulation) {
                    }
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
                Promise.all(asyncSaves).catch(err => )
                const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
                const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
                if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
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
                    }).catch(err => )
                    }
            }
        }
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
            }
        const textLower = text.toLowerCase()
        const cierreKeywords = /(?:cotización|cotizacion|presupuesto|generar pdf|enviar pdf|formalizar|documento|precio final)/i
        const negativeKeywords = /(?:no quiero|no necesito|solo ver|consultar)/i
        const isExplicitRequest = cierreKeywords.test(textLower) && !negativeKeywords.test(textLower)
        if (!isSimulation && shouldGenerateQuote(aiResponseProcessed, productIds, isExplicitRequest)) {
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
            } else if (isSimulation && shouldGenerateQuote(aiResponseProcessed, productIds, isExplicitRequest)) {
            }
        const duration = performance.now() - start
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
                output: finalOutputText, 
                media_type: finalResponseType,
                media_url: finalMediaUrl,
                quote_generated: false,
                product_ids: productIds, 
                appointment_data: {
                    slots: (appointmentSettings?.is_enabled && hasAppointmentIntent) ? slotsData : [], 
                    booking_link: (profile.slug && profile.slug !== 'agendar') ? `https:
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})