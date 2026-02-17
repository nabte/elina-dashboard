/**
 * ELINA V5 - Main Orchestrator
 * 
 * Voy a usar supabase-ELINA
 * Confirmo: project_ref = mytvwfbijlgbihlegmfg
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdminClient } from './utils/supabase.ts'
import { corsHeaders } from './utils/cors.ts'
import { loadAccountConfig, validateAccountConfig } from './config/account-config.ts'
import { shouldIgnoreMessage } from './core/filters.ts'
import { detectIntent, isCriticalIntent } from './intent/detector.ts'
import { runConversationalAgent } from './agents/conversational.ts'
import { sendMessage, sendImage, sendAudio, sendVideo, sendDocument } from './utils/evolution.ts'
import {
    getProfileByInstance,
    ensureContact,
    loadConversationContext,
    saveChatHistory
} from './utils/context.ts'
import { validateSubscription } from './utils/subscription-validator.ts'
import { retrieveContext, formatContextForPrompt } from './utils/rag-system.ts'
import { processAILabels } from './utils/ai-labels.ts'
import { processSmartPromotions } from './utils/smart-promotions.ts'
import { processAudioMessage, isAudioMessage, extractAudioMessage } from './utils/audio-processor.ts'
import { processImageMessage, isImageMessage, extractImageMessage } from './utils/image-processor.ts'
import { processTextToSpeech, isTTSEnabled, getTTSVoice } from './utils/tts-processor.ts'
import { runAssistantMode } from './utils/assistant-mode.ts'

console.log('🚀 ELINA V5 - Edge Function Started')

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const startTime = performance.now()

    try {
        const supabase = createSupabaseAdminClient()

        // Handle GET request for available voices
        if (req.method === 'GET') {
            const { listVoices } = await import('./utils/tts-processor.ts')
            const voices = await listVoices()

            // Map to essential data for frontend
            const simplifiedVoices = voices.map((v: any) => ({
                id: v.voice_id,
                name: v.name,
                previewUrl: v.preview_url,
                category: v.category,
                labels: v.labels
            }))

            return new Response(JSON.stringify(simplifiedVoices), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }
        const payload = await req.json()

        // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🔔 [WEBHOOK] New message received')
        // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // ========================================================================
        // 1. EXTRACT BASIC DATA
        // ========================================================================
        const data = payload?.data
        if (!data) {
            console.error('❌ [ERROR] Invalid payload: missing data')
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            })
        }

        const { key, message, pushName } = data
        let remoteJid = key?.remoteJid

        // Handle. LID (Linked Devices)
        if (remoteJid?.includes('@lid')) {
            remoteJid = key?.remoteJidAlt || remoteJid
        }

        // Clean suffix
        remoteJid = remoteJid?.replace('@s.whatsapp.net', '')

        const messageId = key?.id
        const instanceName = payload?.instance
        const isSimulation = payload?.isSimulation === true

        // console.log(`📋 [INFO] Instance: ${instanceName}`)
        // console.log(`📋 [INFO] Remote JID: ${remoteJid}`)
        // console.log(`📋 [INFO] Message ID: ${messageId}`)
        // console.log(`📋 [INFO] Simulation: ${isSimulation}`)


        // Validate required fields
        if (!remoteJid || !messageId || !instanceName) {
            console.error('❌ [ERROR] Missing required fields')
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                headers: corsHeaders,
                status: 400
            })
        }

        // Ignore status broadcasts and own messages
        if (remoteJid === 'status@broadcast' || key?.fromMe) {
            console.log('⏭️ [INFO] Ignoring status broadcast or own message')
            return new Response(JSON.stringify({ ignored: true }), {
                headers: corsHeaders,
                status: 200
            })
        }

        // ========================================================================
        // 2. LOAD ACCOUNT CONFIGURATION
        // ========================================================================
        const profile = await getProfileByInstance(supabase, instanceName)
        const config = await loadAccountConfig(supabase, profile.id)

        // Validate configuration
        const validation = validateAccountConfig(config)

        // ========================================================================
        // 2.5 VALIDATE SUBSCRIPTION
        // ========================================================================
        const subscriptionStatus = await validateSubscription(supabase, profile.id)

        if (!subscriptionStatus.isValid) {
            console.log(`❌ [SUBSCRIPTION] Invalid subscription: ${subscriptionStatus.status}`)

            // Send notification to user about subscription issue
            if (subscriptionStatus.message) {
                await sendMessage(config, remoteJid, subscriptionStatus.message)
            }

            return new Response(JSON.stringify({
                success: false,
                reason: 'subscription_inactive',
                status: subscriptionStatus.status
            }), {
                headers: corsHeaders,
                status: 200
            })
        }

        if (!validation.valid) {
            return new Response(JSON.stringify({ error: 'Invalid account configuration', details: validation.errors }), {
                headers: corsHeaders,
                status: 500
            })
        }

        // ========================================================================
        // 3. ENSURE CONTACT EXISTS
        // ========================================================================
        const contact = await ensureContact(supabase, profile.id, remoteJid, pushName)

        // Placeholder for messageText and mediaContext, assuming they are populated elsewhere
        // or will be handled by a new media processing block.
        // This is to ensure syntactic correctness for subsequent blocks that use these variables.
        let messageText = message.conversation || message.extendedTextMessage?.text || '';
        let mediaContext = '';

        // Check for audio response trigger (Audio input OR explicit request)
        const isAudioInput = isAudioMessage(message)
        const explicitAudioRequest = /mándame (un )?audio|nota de voz|responde con audio/i.test(messageText)
        const shouldRespondWithAudio = isAudioInput || explicitAudioRequest

        if (shouldRespondWithAudio) {
            console.log(`🎤 [AUDIO_MODE] Audio response requested (Input: ${isAudioInput ? 'Audio' : 'Text request'})`)
        }

        if (!messageText) {
            return new Response(JSON.stringify({ ignored: true, reason: 'No text content' }), {
                headers: corsHeaders,
                status: 200
            })
        }

        console.log(`\n💬 [MESSAGE] Text: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`)

        // ========================================================================
        // 5.5 MESSAGE BUFFERING (Group rapid consecutive messages)
        // ========================================================================
        if (!isSimulation) {
            console.log(`\n⏳ [BUFFER] Checking for rapid consecutive messages...`)
            const { bufferMessage } = await import('./utils/message-buffer.ts')
            const bufferResult = await bufferMessage(profile.id, contact.id, messageText)

            if (bufferResult.shouldProcess) {
                messageText = bufferResult.combinedText
            }
        }

        // ========================================================================
        // 3.5 DUAL MODE CHECK (OWNER VS LEAD)
        // ========================================================================
        // Normalize phones for comparison (remove symbols, ensure same format)
        const normalizePhone = (p: string) => p?.replace(/\D/g, '') || ''
        const senderPhone = normalizePhone(remoteJid)
        const ownerPhone = normalizePhone(profile.contact_phone)

        if (ownerPhone && senderPhone.includes(ownerPhone)) {
            console.log(`👑 [MASTER_BOT] Owner detected (${ownerPhone}). Switching to ASSISTANT MODE.`)

            // 1. Load Intent & Context for Assistant
            const intent = await detectIntent(messageText || 'Hola', config, []) // Simple intent detection

            // 2. Load basic context
            const context = await loadConversationContext(supabase, config, contact, messageText || '', intent)

            // 3. Run Assistant Logic
            const assistantResponse: any = await runAssistantMode(supabase, config, messageText || '', intent, context)

            // 4. Execute Tools if any
            let finalText = assistantResponse.text

            if (assistantResponse.toolCalls && assistantResponse.toolCalls.length > 0) {
                console.log(`🔧 [ASSISTANT] Executing ${assistantResponse.toolCalls.length} tools...`)
                const { executeToolCalls } = await import('./utils/tool-executor.ts')

                const toolResults = await executeToolCalls(
                    supabase,
                    config,
                    contact.id,
                    assistantResponse.toolCalls,
                    context.conversationState
                )

                // Re-run assistant with tool results
                const nextResponse: any = await runAssistantMode(
                    supabase,
                    config,
                    JSON.stringify(toolResults), // Pass results as message
                    intent,
                    { ...context, toolResults }
                )
                finalText = nextResponse.text
            }

            // 5. Send Response
            await sendMessage(config, remoteJid, finalText)

            return new Response(JSON.stringify({ success: true, mode: 'assistant' }), {
                headers: corsHeaders,
                status: 200
            })
        }

        // ========================================================================
        // 4. CHECK FILTERS
        // ========================================================================
        const filterResult = await shouldIgnoreMessage(supabase, config, contact.id)
        if (filterResult.ignore) {
            console.log(`🚫 [FILTER] Message ignored: ${filterResult.reason}`)
            return new Response(JSON.stringify({
                ignored: true,
                reason: filterResult.reason
            }), {
                headers: corsHeaders,
                status: 200
            })
        }

        // ========================================================================
        // 6. CHECK AUTO RESPONSES
        // ========================================================================
        const { checkAutoResponses } = await import('./utils/automation.ts')
        const autoResponse = checkAutoResponses(messageText, config)

        if (autoResponse) {
            console.log(`✅ [AUTOMATION] Auto-response triggered: ${autoResponse.triggerText}`)

            // Handle Media Response
            if (autoResponse.mediaUrl) {
                console.log(`📎 [AUTOMATION] Sending media: ${autoResponse.mediaType} - ${autoResponse.mediaUrl}`)
                try {
                    switch (autoResponse.mediaType) {
                        case 'image':
                            await sendImage(config, remoteJid, autoResponse.mediaUrl, autoResponse.responseText)
                            break
                        case 'video':
                            await sendVideo(config, remoteJid, autoResponse.mediaUrl, autoResponse.responseText)
                            break
                        case 'document':
                            // Extract filename from URL or default
                            const fileName = autoResponse.mediaUrl.split('/').pop() || 'document.pdf'
                            await sendDocument(config, remoteJid, autoResponse.mediaUrl, fileName, autoResponse.responseText)
                            break
                        case 'audio':
                            await sendAudio(config, remoteJid, autoResponse.mediaUrl)
                            // If there is text, send it separately as audio usually doesn't have caption
                            if (autoResponse.responseText) {
                                await sendMessage(config, remoteJid, autoResponse.responseText)
                            }
                            break
                        default:
                            // Fallback to text + link if media type unknown or text-only
                            const textWithLink = `${autoResponse.responseText}\n\n${autoResponse.mediaUrl}`
                            await sendMessage(config, remoteJid, textWithLink)
                    }
                } catch (error) {
                    console.error(`❌ [AUTOMATION] Error sending media, falling back to text: ${error}`)
                    const textWithLink = `${autoResponse.responseText}\n\n(No se pudo cargar el archivo adjunto: ${autoResponse.mediaUrl})`
                    await sendMessage(config, remoteJid, textWithLink)
                }
            } else {
                // Text only
                await sendMessage(config, remoteJid, autoResponse.responseText)
            }

            // Save history
            await saveChatHistory(
                supabase,
                profile.id,
                contact.id,
                messageText,
                autoResponse.responseText,
                {
                    primary: 'auto_response' as any,
                    confidence: 1.0,
                    sentiment: { polarity: 'neutral', score: 0 },
                    entities: {}
                }
            )

            return new Response(JSON.stringify({
                success: true,
                intent: 'auto_response',
                response: autoResponse.responseText
            }), { headers: corsHeaders })
        }

        // ========================================================================
        // 6. DETECT INTENT
        // ========================================================================
        console.log(`\n🎯 [INTENT] Detecting intent...`)

        const conversationHistory = await loadConversationContext(
            supabase,
            config,
            contact,
            messageText,
            { primary: 'unknown' }
        ).then(ctx => ctx.recentMessages)

        const intent = await detectIntent(messageText, config, conversationHistory)

        console.log(`✅ [INTENT] Detected: ${intent.primary} (confidence: ${intent.confidence})`)

        // ========================================================================
        // 6.5 HANDLE CRITICAL INTENTS
        // ========================================================================
        if (isCriticalIntent(intent.primary)) {
            console.log(`🚨 [CRITICAL] Critical intent detected: ${intent.primary}`)

            try {
                // Call detect-critical-intent Edge Function
                const criticalResponse = await fetch(
                    `${Deno.env.get('SUPABASE_URL')}/functions/v1/detect-critical-intent`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message_content: messageText,
                            user_id: profile.id,
                            contact_id: contact.id
                        })
                    }
                )

                if (criticalResponse.ok) {
                    const criticalData = await criticalResponse.json()

                    if (criticalData.is_critical || criticalData.critical_detected) {
                        console.log(`🚨 [CRITICAL] Conversation paused, adding label and notifying owner`)

                        // 1. Add "ignorar" label to contact (matching n8n V4)
                        const currentLabels = contact.labels || []
                        if (!currentLabels.includes('ignorar')) {
                            await supabase.from('contacts').update({
                                labels: [...currentLabels, 'ignorar'],
                                razon_de_label_auto: criticalData.reason || `Intención crítica: ${criticalData.detection_type || intent.primary}`
                            }).eq('id', contact.id)
                            console.log(`✅ [CRITICAL] Label "ignorar" added to contact`)
                        }

                        // 2. Pause active followups (matching n8n V4)
                        await supabase.from('contacts').update({
                            followup_status: 'paused'
                        }).eq('id', contact.id).not('followup_status', 'is', null)

                        // 3. Notify owner (matching n8n V4)
                        if (profile.contact_phone) {
                            const notificationMessage = `🚨 ATENCIÓN REQUERIDA\n\nContacto: ${contact.full_name || contact.phone_number}\nTipo: ${criticalData.detection_type || intent.primary}\nConfianza: ${Math.round((criticalData.confidence || intent.confidence || 0) * 100)}%\n\nMensaje:\n${messageText}\n\nMotivo: ${criticalData.reason || 'Requiere atención humana'}`

                            try {
                                await sendMessage(config, profile.contact_phone, notificationMessage)
                                console.log(`✅ [CRITICAL] Notification sent to owner: ${profile.contact_phone}`)
                            } catch (notifError) {
                                console.error(`❌ [CRITICAL] Failed to send notification:`, notifError)
                            }
                        }

                        // 4. Send acknowledgment to customer
                        await sendMessage(
                            config,
                            remoteJid,
                            'Gracias por tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo pronto.'
                        )

                        return new Response(JSON.stringify({
                            success: true,
                            critical_detected: true,
                            paused: true,
                            label_added: true,
                            owner_notified: !!profile.contact_phone
                        }), { headers: corsHeaders })
                    }
                }
            } catch (error) {
                console.error(`❌ [CRITICAL] Error processing critical intent:`, error)
            }
        }

        // ========================================================================
        // 7. LOAD FULL CONTEXT + RAG
        // ========================================================================
        console.log(`\n📚 [CONTEXT] Loading conversation context...`)

        const context = await loadConversationContext(
            supabase,
            config,
            contact,
            messageText,
            intent
        )

        console.log(`✅ [CONTEXT] Context loaded`)
        console.log(`   - User preferences: ${context.userPreferences?.length || 0}`)

        // ========================================================================
        // 7.5 RAG: RETRIEVE SEMANTIC CONTEXT
        // ========================================================================
        console.log(`\n🧠 [RAG] Retrieving semantic context...`)

        const ragContext = await retrieveContext(
            supabase,
            profile.id,
            contact.id,
            messageText + (mediaContext ? ' ' + mediaContext : '')
        )

        const ragContextText = formatContextForPrompt(ragContext)
        console.log(`✅ [RAG] Semantic context retrieved`)

        // ========================================================================
        // 7.6 APPOINTMENT CONTEXT (if enabled)
        // ========================================================================
        let appointmentContext = ''

        const { getAppointmentSettings, getAvailableSlots, formatAppointmentContext, detectAppointmentIntent } =
            await import('./utils/appointment-manager.ts')

        const appointmentSettings = await getAppointmentSettings(supabase, profile.id)

        if (appointmentSettings?.is_enabled) {
            const hasAppointmentIntent = detectAppointmentIntent(messageText)

            if (hasAppointmentIntent) {
                console.log(`\n📅 [APPOINTMENT] Fetching available slots...`)
                const slots = await getAvailableSlots(profile.id, appointmentSettings.max_days_ahead || 7)
                appointmentContext = formatAppointmentContext(slots)
                console.log(`✅ [APPOINTMENT] ${slots.length} slots available`)
            }
        }

        // Agregar appointment context al contexto general
        if (appointmentContext) {
            context.appointmentContext = appointmentContext
        }


        // ========================================================================
        // 8. RUN CONVERSATIONAL AGENT & EXECUTE TOOL CALLS (ITERATIVE)
        // ========================================================================
        console.log(`\n🤖 [AGENT] Running conversational agent...`)

        let agentResponse = await runConversationalAgent(
            supabase,
            config,
            messageText,
            intent,
            context
        )

        const allToolResults: any[] = []
        let currentLoop = 0
        const MAX_TOOL_LOOPS = 3

        while (agentResponse.toolCalls && agentResponse.toolCalls.length > 0 && currentLoop < MAX_TOOL_LOOPS) {
            currentLoop++
            console.log(`\n🔧 [TOOLS] Loop ${currentLoop}: Agent requested ${agentResponse.toolCalls.length} tool call(s)`)

            const { executeToolCalls } = await import('./utils/tool-executor.ts')

            const toolResults = await executeToolCalls(
                supabase,
                config,
                contact.id,
                agentResponse.toolCalls,
                context.conversationState
            )

            // Store for formatting later
            allToolResults.push(...toolResults)

            console.log(`✅ [TOOLS] Loop ${currentLoop} executed, re-calling agent with results`)

            // Re-llamar al agente con los resultados (enviando los tool_calls y results de ESTE loop)
            const nextAgentResponse = await runConversationalAgent(
                supabase,
                config,
                messageText,
                intent,
                context,
                agentResponse.toolCalls,
                toolResults
            )

            // Update agent response for next iteration or final output
            agentResponse = nextAgentResponse
        }

        // ========================================================================
        // 8.6. FORMAT SERVICES IN CODE (if any services were found in tools)
        // ========================================================================
        const servicesFromTools = allToolResults
            .map((tr: any) => tr.services || [])
            .flat()

        if (servicesFromTools.length > 0) {
            console.log(`🎨 [FORMAT] Formatting ${servicesFromTools.length} services in code`)
            const formattedServices = servicesFromTools.map((s: any) =>
                `🛍️ *${s.product_name}* — $${s.price}\n🔹 ${s.description || 'Sin descripción'}`
            ).join('\n\n')

            agentResponse.text = (agentResponse.text || '') + '\n\n' + formattedServices
        }


        if (!agentResponse.text || agentResponse.text.trim() === '') {
            console.warn('⚠️ [AGENT] Empty response received. Using fallback.')
            agentResponse.text = 'Lo siento, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?'
        }

        console.log(`✅ [AGENT] Response generated (${agentResponse.text.length} chars, ${agentResponse.metadata.duration?.toFixed(0)}ms)`)

        // ========================================================================
        // 9. PROCESS PLACEHOLDERS & EXTRACT MEDIA
        // ========================================================================
        console.log(`\n🧩 [PLACEHOLDERS] Processing placeholders...`)

        const { processPlaceholders } = await import('./utils/placeholders.ts')

        const placeholderResult = await processPlaceholders(
            supabase,
            config.userId,
            agentResponse.text
        )

        let finalText = placeholderResult.finalText

        // Procesar placeholder de calendario de citas
        const { replaceAppointmentCalendarLink } = await import('./utils/placeholders.ts')
        finalText = replaceAppointmentCalendarLink(finalText, config.slug)

        // ========================================================================
        // 9.5 PROCESS SMART PROMOTIONS
        // ========================================================================
        console.log(`\n🎁 [PROMOTIONS] Processing smart promotions...`)

        const promotionResult = await processSmartPromotions(
            supabase,
            profile.id,
            contact.id,
            finalText
        )

        if (promotionResult.shouldInsert) {
            let promoText = promotionResult.modifiedResponse || finalText

            // Clean up promo text (remove surrounding quotes and bolding if any)
            promoText = promoText.replace(/^["']|["']$/g, '') // Remove start/end quotes
            promoText = promoText.replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bolding

            finalText = promoText
        } else {

        }

        // ========================================================================
        // 9.6 PROCESS AI LABELS
        // ========================================================================
        console.log(`\n🏷️ [AI_LABELS] Processing AI labels...`)

        // Build conversation context for AI labels
        const conversationContextText = context.recentMessages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n')

        const appliedLabels = await processAILabels(
            supabase,
            profile.id,
            contact.id,
            messageText,
            conversationContextText
        )

        if (appliedLabels.length > 0) {
            console.log(`✅ [AI_LABELS] Applied labels: ${appliedLabels.join(', ')}`)
        } else {

        }

        // ========================================================================
        // 10. EXTRACT MEDIA URLs & CALCULATE TOTALS (CÓDIGO HACE EL TRABAJO)
        // ========================================================================
        // ========================================================================
        // 10. EXTRACT MEDIA URLs & CALCULATE TOTALS
        // ========================================================================
        // console.log(`\n🖼️ [MEDIA] Extracting media URLs...`)

        // 1. Capture text triggers BEFORE stripping URLs for caption distribution
        let textForMediaDistribution = finalText

        const mediaToSend: Array<{ url: string, type: 'image' | 'video' }> = []

        // Add promotion images if available
        if (promotionResult.shouldInsert && promotionResult.imageUrls && promotionResult.imageUrls.length > 0) {
            // console.log(`   - Adding ${promotionResult.imageUrls.length} promotion image(s)`)
            promotionResult.imageUrls.forEach(url => {
                if (!mediaToSend.find(m => m.url === url)) {
                    mediaToSend.push({ url, type: 'image' })
                }
            })
        }

        // --- A. Extracción en ORDEN (Markdown primero, luego Raw) ---

        // 1. Detectar URLs de Markdown: ![alt](url)
        // Regex genérico para detectar cualquier imagen/video (como n8n V4)
        const markdownRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm))\)/gi
        const markdownMatches = [...finalText.matchAll(markdownRegex)]

        for (const match of markdownMatches) {
            const url = match[2]
            const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)

            if (!mediaToSend.find(m => m.url === url)) {
                mediaToSend.push({
                    url: url,
                    type: isVideo ? 'video' : 'image'
                })
            }
        }

        // 2. Detectar URLs puras (Raw)
        // Regex genérico para detectar URLs sueltas (como n8n V4)
        const mediaUrlRegex = /https?:\/\/[^\s\)]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)/gi
        let matches = finalText.match(mediaUrlRegex)

        if (matches) {
            for (const url of matches) {
                const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)

                if (!mediaToSend.find(m => m.url === url)) {
                    mediaToSend.push({
                        url: url,
                        type: isVideo ? 'video' : 'image'
                    })
                }
            }
        }

        // --- Limpieza de URLs y Markdown de Imagen (GLOBAL) ---

        // 1. Remover markdown de imagen COMPLETO
        finalText = finalText.replace(markdownRegex, '')

        // 2. Remover URLs sueltas globalmente
        finalText = finalText.replace(mediaUrlRegex, '')

        // --- B. Regla de Negocio: Máximo 3 media files ---
        const MAX_MEDIA = 3
        const finalMediaToSend = mediaToSend.slice(0, MAX_MEDIA)

        /*
        if (mediaToSend.length > MAX_MEDIA) {
             console.log(`   ⚠️ Limitando media: ${mediaToSend.length} -> ${MAX_MEDIA}`)
        }
        */


        // --- C. Cálculos de Subtotales y Totales (Lógica n8n V4) ---
        console.log(`\n🧮 [CALCS] Running n8n-style calculations...`)

        // Regex para detectar líneas de item y calcular subtotal
        // Ejemplo: "5 piezas Subtotal: $[subtotal_calculado]"
        const subtotalRegex = /(\d+)\s*piezas?\s*Subtotal:\s*\$\[subtotal_calculado\]/gi
        let totalAcumulado = 0

        finalText = finalText.replace(subtotalRegex, (match, qtyStr, offset) => {
            const qty = parseInt(qtyStr, 10)
            // Buscar el precio anterior más cercano en el texto
            const textBefore = finalText.substring(0, offset)
            const pricesFound = textBefore.match(/\$([\d,]+(?:\.\d{2})?)/g)

            if (pricesFound && pricesFound.length > 0) {
                const lastPriceStr = pricesFound[pricesFound.length - 1].replace(/[$,]/g, "")
                const price = parseFloat(lastPriceStr)

                if (!isNaN(price)) {
                    const subtotal = qty * price
                    totalAcumulado += subtotal
                    return `${qty} piezas Subtotal: $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
            }
            return match // Si no se encuentra precio, dejar igual
        })

        // Corregir formato de precios y moneda (User feedback: "pone $ y abajo el precio")
        finalText = finalText
            .replace(/\ba\s*\$\s*\n\s*(\d)/gi, '$$$1') // "a $ \n 100" -> "$100" (eliminar 'a' suspensiva)
            .replace(/\$\s*\n\s*(\d)/g, '$$$1') // Unir $ solitario con el número abajo
            .replace(/\$\s+(\d)/g, '$$$1')      // Unir $ con espacio y número
            .replace(/\$\$/g, '$')              // Corregir doble $$

        // Aplicar la misma limpieza a textForMediaDistribution
        textForMediaDistribution = textForMediaDistribution
            .replace(/\$\$\[TOTAL_CALCULADO\]/gi, "$" + totalAcumulado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })) // Fix potential double $
            .replace(/\$\[TOTAL_CALCULADO\]/gi, "$" + totalAcumulado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
            .replace(/\*\*([^*]+)\*\*/g, '*$1*')
            .replace(/\[\s*\]\(\s*\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\ba\s*\$\s*\n\s*(\d)/gi, '$$$1') // "a $ \n 100" -> "$100"
            .replace(/\$\s*\n\s*(\d)/g, '$$$1')
            .replace(/\$\s+(\d)/g, '$$$1')
            .replace(/\$\$/g, '$')
            .trim()

        // --- D. Formato de Texto (Limpieza) ---
        finalText = finalText
            // Convertir negritas de Markdown (**) a WhatsApp (*)
            .replace(/\*\*([^*]+)\*\*/g, '*$1*')
            // Eliminar corchetes vacíos si quedaron de links mal formados "[]()"
            .replace(/\[\s*\]\(\s*\)/g, '')
            // Eliminar espacios múltiples
            .replace(/\s{2,}/g, ' ')
            // Asegurar saltos de línea limpios (máximo 2)
            .replace(/\n{3,}/g, '\n\n')
            .trim()

        // ========================================================================
        // 10.5 GENERATE TTS (ALWAYS ENABLED)
        // ========================================================================
        // const ttsEnabled = await isTTSEnabled(supabase, profile.id) 
        const ttsEnabled = true // Variable "always active" per user request
        let audioSent = false

        if ((ttsEnabled || shouldRespondWithAudio) && finalText) {
            try {
                let textForAudio = finalText

                // CRITICAL: If audio response is forced (Audio Mode), SUMMARIZE textual content
                // to max 2 sentences (~5-8 seconds) to save credits and be natural.
                if (shouldRespondWithAudio) {
                    console.log(`🎙️ [AUDIO_SUMMARY] Summarizing text for audio response...`)
                    try {
                        const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: 'gpt-4o-mini',
                                messages: [
                                    {
                                        role: 'system',
                                        content: `Eres un asistente experto en síntesis de voz. 
Tu tarea es convertir el siguiente texto en un guion de audio MUY BREVE y natural.
Reglas:
1. Máximo 2 oraciones.
2. Duración aproximada de 5 a 8 segundos al hablarse.
3. Mantén el tono amigable y la información clave.
4. Elimina precios detallados, listas largas o URLs.
5. Si es una pregunta, resume la pregunta.
6. NO uses emojis ni markdown. Solo texto plano listo para hablar.`
                                    },
                                    {
                                        role: 'user',
                                        content: finalText
                                    }
                                ],
                                temperature: 0.5,
                                max_tokens: 100
                            })
                        })

                        if (summaryResponse.ok) {
                            const summaryData = await summaryResponse.json()
                            const summaryText = summaryData.choices[0]?.message?.content?.trim()
                            if (summaryText) {
                                textForAudio = summaryText
                                console.log(`✅ [AUDIO_SUMMARY] Summary generated: "${textForAudio}"`)
                            }
                        }
                    } catch (summaryError) {
                        console.error(`❌ [AUDIO_SUMMARY] Error summarizing text:`, summaryError)
                        // Fallback to original text (maybe truncated)
                    }
                }

                const voice = await getTTSVoice(supabase, profile.id)
                const ttsResult = await processTextToSpeech(
                    supabase,
                    textForAudio,
                    profile.id,
                    contact.id.toString(),
                    voice
                )

                // Send audio in addition to text
                await sendAudio(config, remoteJid, ttsResult.audioUrl)
                audioSent = true
                console.log(`✅ [TTS] Audio sent successfully: ${ttsResult.audioUrl}`)
            } catch (error) {
                console.error(`❌ [TTS] Error generating audio:`, error)
                // Continue with text message on error
            }
        }

        // ========================================================================
        // 11. SEND RESPONSE WITH MEDIA
        // ========================================================================
        console.log(`\n📤 [SEND] Sending response...`)

        if (finalMediaToSend.length > 0) {
            // Importar utilidades de formato
            const { distributeTextAcrossMedia, formatTextForWhatsApp } = await import('./utils/text-formatter.ts')

            // Distribuir texto entre las medias (usando el texto CON URLs)
            const mediaWithCaptions = distributeTextAcrossMedia(textForMediaDistribution || finalText, finalMediaToSend, 3)

            console.log(`   - Sending ${mediaWithCaptions.length} media message(s)`)

            // Enviar cada media con su caption correspondiente
            for (const item of mediaWithCaptions) {
                // Delay aleatorio antes de cada media (como n8n)
                const randomDelay = Math.floor(Math.random() * (2200 - 800 + 1)) + 800
                // console.log(`⏳ [SEND] Delay before media: ${randomDelay}ms`)
                await new Promise(r => setTimeout(r, randomDelay))

                if (item.type === 'video') {
                    const { sendVideo } = await import('./utils/evolution.ts')
                    await sendVideo(config, remoteJid, item.url, item.caption)
                } else {
                    await sendImage(config, remoteJid, item.url, item.caption)
                }
            }

        } else {
            // Send text ONLY if audio was NOT sent (Fallback mechanism)
            if (!audioSent) {
                console.log(`📝 [SEND] Sending text response (Audio sent: ${audioSent})...`)

                // Formatear texto antes de enviar
                const { formatTextForWhatsApp } = await import('./utils/text-formatter.ts')
                const formattedText = formatTextForWhatsApp(finalText)

                // Enviar solo texto formateado
                await sendMessage(config, remoteJid, formattedText, true)
            } else {
                console.log(`voice_note_sent (Text suppressed)`)
            }
        }

        // ========================================================================
        // 10.6 QUOTE GENERATION (if applicable)
        // ========================================================================
        if (placeholderResult.productIds.length > 0) {
            const { shouldGenerateQuote, generateAndSendQuote, detectQuoteIntent } =
                await import('./utils/quote-generator.ts')

            // Check if quotes are enabled for this profile
            const quotesEnabled = profile.quotes_enabled || false
            const isExplicitRequest = detectQuoteIntent(messageText)

            if (shouldGenerateQuote(finalText, placeholderResult.productIds, isExplicitRequest, quotesEnabled)) {
                console.log(`\n📄 [QUOTE] Generating quote...`)

                const { sendDocument } = await import('./utils/evolution.ts')

                const quoteResult = await generateAndSendQuote(
                    supabase,
                    {
                        userId: profile.id,
                        contactId: contact.id,
                        productIds: placeholderResult.productIds,
                        remoteJid
                    },
                    (jid: string, url: string, filename: string, caption?: string) =>
                        sendDocument(config, jid, url, filename, caption),
                    (jid: string, text: string) =>
                        sendMessage(config, jid, text, true),
                    true // notifyOwner
                )

                if (quoteResult.success) {
                    console.log(`✅ [QUOTE] Quote ${quoteResult.cached ? 'cached' : 'generated'} and sent`)
                    placeholderResult.shouldGenerateQuote = true
                } else {
                    console.error(`❌ [QUOTE] Failed to generate quote: ${quoteResult.error}`)
                }
            }
        }


        console.log(`✅ [SEND] Response sent successfully`)

        // ========================================================================
        // 11. SAVE TO HISTORY
        // ========================================================================
        console.log(`\n💾 [HISTORY] Saving to chat history...`)

        await saveChatHistory(
            supabase,
            profile.id,
            contact.id,
            messageText,
            finalText, // Guardamos el texto final
            intent
        )

        console.log(`✅ [HISTORY] Saved successfully`)

        // ========================================================================
        // 11.5 SAVE CONVERSATION STATE (for contextual references)
        // ========================================================================
        if (placeholderResult.productIds.length > 0) {
            console.log(`\n🧠 [STATE] Saving conversation state...`)

            const { saveConversationState, extractMentionedProducts } =
                await import('./utils/conversation-state.ts')

            const mentionedProducts = extractMentionedProducts(
                agentResponse.text, // Use the text property from AgentResponse
                placeholderResult.productsMap
            )

            if (mentionedProducts.length > 0) {
                await saveConversationState(supabase, contact.id.toString(), {
                    lastProductsMentioned: mentionedProducts,
                    lastIntent: intent.primary,
                    lastAgentResponse: finalText
                })
                console.log(`✅ [STATE] Saved ${mentionedProducts.length} mentioned products`)
            }
        }

        // ========================================================================
        // 12. FINAL METRICS
        // ========================================================================
        const totalDuration = performance.now() - startTime

        // console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`✅ [SUCCESS] Method processed successfully (${totalDuration.toFixed(0)}ms)`)
        // console.log(`⏱️  Total duration: ${totalDuration.toFixed(0)}ms`)
        // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        return new Response(JSON.stringify({
            success: true,
            intent: intent.primary,
            sentiment: intent.sentiment.polarity,
            duration: totalDuration,
            tokensUsed: agentResponse.metadata.tokensUsed,
            quoteGenerated: placeholderResult.shouldGenerateQuote,
            toolCalls: agentResponse.toolCalls,
            userId: profile.id, // <--- Verify which user is being used
            text: agentResponse.text, // <--- CRITICAL: Sending the AI response text
            message: agentResponse.text, // <--- Compatibility
            response: agentResponse.text // <--- Compatibility
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        // console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ [ERROR] Fatal error processing message')
        console.error(`   Message: ${error.message}`)
        console.error(`   Stack: ${error.stack}`)
        // console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
