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
import { sendMessage, sendImage, sendAudio } from './utils/evolution.ts'
import {
    getProfileByInstance,
    ensureContact,
    loadConversationContext,
    saveChatHistory
} from './utils/context.ts'

console.log('🚀 ELINA V5 - Edge Function Started')

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const startTime = performance.now()

    try {
        const supabase = createSupabaseAdminClient()
        const payload = await req.json()

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🔔 [WEBHOOK] New message received')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

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

        // Handle LID (Linked Devices)
        if (remoteJid?.includes('@lid')) {
            remoteJid = key?.remoteJidAlt || remoteJid
        }

        // Clean suffix
        remoteJid = remoteJid?.replace('@s.whatsapp.net', '')

        const messageId = key?.id
        const instanceName = payload?.instance
        const isSimulation = payload?.isSimulation === true

        console.log(`📋 [INFO] Instance: ${instanceName}`)
        console.log(`📋 [INFO] Remote JID: ${remoteJid}`)
        console.log(`📋 [INFO] Message ID: ${messageId}`)
        console.log(`📋 [INFO] Simulation: ${isSimulation}`)

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
        console.log(`\n📋 [CONFIG] Loading account configuration...`)

        const profile = await getProfileByInstance(supabase, instanceName)
        const config = await loadAccountConfig(supabase, profile.id)

        // Validate configuration
        const validation = validateAccountConfig(config)
        if (!validation.valid) {
            console.error(`❌ [CONFIG] Invalid configuration: ${validation.errors.join(', ')}`)
            return new Response(JSON.stringify({ error: 'Invalid account configuration', details: validation.errors }), {
                headers: corsHeaders,
                status: 500
            })
        }

        console.log(`✅ [CONFIG] Configuration loaded for: ${config.companyName}`)

        // ========================================================================
        // 3. ENSURE CONTACT EXISTS
        // ========================================================================
        console.log(`\n👤 [CONTACT] Ensuring contact exists...`)

        const contact = await ensureContact(supabase, profile.id, remoteJid, pushName)
        console.log(`✅ [CONTACT] Contact ID: ${contact.id}`)

        // ========================================================================
        // 4. CHECK FILTERS
        // ========================================================================
        console.log(`\n🔍 [FILTER] Checking filters...`)

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

        console.log(`✅ [FILTER] Message should be processed`)

        // ========================================================================
        // 5. EXTRACT MESSAGE TEXT
        // ========================================================================
        let messageText = message.conversation ||
            message.extendedTextMessage?.text ||
            ''

        if (!messageText) {
            console.log('⏭️ [INFO] No text message found (media only or unsupported type)')
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
                console.log(`✅ [BUFFER] Processing ${bufferResult.combinedText.split('\n').length} combined messages`)
            }
        }

        // ========================================================================
        // 6. CHECK AUTO RESPONSES
        // ========================================================================
        console.log(`\n🤖 [AUTOMATION] Checking auto-responses...`)
        const { checkAutoResponses } = await import('./utils/automation.ts')
        const autoResponse = checkAutoResponses(messageText, config)

        if (autoResponse) {
            console.log(`✅ [AUTOMATION] Auto-response triggered: ${autoResponse.triggerText}`)
            await sendMessage(config, remoteJid, autoResponse.responseText)

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

        console.log(`✅ [INTENT] Detected: ${intent.primary}`)
        console.log(`   - Confidence: ${intent.confidence}`)
        console.log(`   - Sentiment: ${intent.sentiment.polarity} (${intent.sentiment.score})`)

        // Handle critical intents
        if (isCriticalIntent(intent.primary)) {
            console.log(`🚨 [CRITICAL] Critical intent detected: ${intent.primary}`)
            // TODO: Notify account owner
        }

        // ========================================================================
        // 7. LOAD FULL CONTEXT
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
        console.log(`   - Recent messages: ${context.recentMessages.length}`)
        console.log(`   - Account learnings: ${context.accountLearnings?.length || 0}`)
        console.log(`   - User preferences: ${context.userPreferences?.length || 0}`)

        // ========================================================================
        // 8. RUN CONVERSATIONAL AGENT
        // ========================================================================
        console.log(`\n🤖 [AGENT] Running conversational agent...`)

        const agentResponse = await runConversationalAgent(
            supabase,
            config,
            messageText,
            intent,
            context
        )

        // ========================================================================
        // 8.5. EXECUTE TOOL CALLS (if any)
        // ========================================================================
        if (agentResponse.toolCalls && agentResponse.toolCalls.length > 0) {
            console.log(`\n🔧 [TOOLS] Agent requested ${agentResponse.toolCalls.length} tool call(s)`)

            const { executeToolCalls } = await import('./utils/tool-executor.ts')

            const toolResults = await executeToolCalls(
                supabase,
                config,
                contact.id,
                agentResponse.toolCalls
            )

            console.log(`✅ [TOOLS] Tool calls executed, re-calling agent with results`)

            // Re-llamar al agente con los resultados de las herramientas
            const finalAgentResponse = await runConversationalAgent(
                supabase,
                config,
                messageText,
                intent,
                context,
                agentResponse.toolCalls,  // ← Pasar tool_calls originales
                toolResults               // ← Pasar resultados
            )

            // Usar la respuesta final
            agentResponse.text = finalAgentResponse.text
            agentResponse.metadata = finalAgentResponse.metadata
        }

        if (!agentResponse.text || agentResponse.text.trim() === '') {
            console.warn('⚠️ [AGENT] Empty response received. Using fallback.')
            agentResponse.text = 'Lo siento, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?'
        }

        console.log(`✅ [AGENT] Response generated`)
        console.log(`   - Length: ${agentResponse.text.length} chars`)
        console.log(`   - Tokens used: ${agentResponse.metadata.tokensUsed}`)
        console.log(`   - Duration: ${agentResponse.metadata.duration?.toFixed(0)}ms`)

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

        // ========================================================================
        // 10. EXTRACT MEDIA URLs & CALCULATE TOTALS (CÓDIGO HACE EL TRABAJO)
        // ========================================================================
        console.log(`\n🖼️ [MEDIA] Extracting media URLs from processed text...`)

        const mediaToSend: Array<{ url: string, type: 'image' | 'video' }> = []

        // --- A. Extracción en ORDEN (Markdown primero, luego Raw) ---

        // 1. Detectar URLs de Markdown: ![alt](url)
        // Regex para detectar URLs de Bunny CDN dentro de markdown
        const markdownRegex = /!\[([^\]]*)\]\((https:\/\/creativersezone\.b-cdn\.net\/[^\)]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm))\)/gi
        const markdownMatches = [...finalText.matchAll(markdownRegex)]

        for (const match of markdownMatches) {
            const url = match[2]
            const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)

            // Solo agregar si no está ya en la lista
            if (!mediaToSend.find(m => m.url === url)) {
                mediaToSend.push({
                    url: url,
                    type: isVideo ? 'video' : 'image'
                })
            }
        }

        // 2. Detectar URLs puras (Raw)
        // Regex para detectar URLs de Bunny CDN sueltas
        const mediaUrlRegex = /https:\/\/creativersezone\.b-cdn\.net\/[^\s\)]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)/gi
        let matches = finalText.match(mediaUrlRegex)

        if (matches) {
            for (const url of matches) {
                const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)

                // Solo agregar si no está ya en la lista (evitar duplicados si el markdown ya lo capturó, aunque el markdown se removerá abajo, es mejor prevenir)
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

        if (mediaToSend.length > MAX_MEDIA) {
            console.log(`   ⚠️ Limitando media: ${mediaToSend.length} encontrados -> enviando ${MAX_MEDIA}`)
        }

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

        // Reemplazar placeholder de Total General
        finalText = finalText.replace(/\$\[TOTAL_CALCULADO\]/gi, "$" + totalAcumulado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

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

        console.log(`   - Found ${mediaToSend.length} media URL(s)`)
        console.log(`   - Sending ${finalMediaToSend.length} media file(s)`)
        console.log(`   - Cleaned text length: ${finalText.length}`)

        // ========================================================================
        // 11. SEND RESPONSE WITH MEDIA
        // ========================================================================
        console.log(`\n📤 [SEND] Sending response...`)

        if (finalMediaToSend.length > 0) {
            // Enviar cada media como mensaje separado
            console.log(`   - Sending ${finalMediaToSend.length} media message(s)`)

            for (const media of finalMediaToSend) {
                if (media.type === 'video') {
                    const { sendVideo } = await import('./utils/evolution.ts')
                    await sendVideo(config, remoteJid, media.url, '') // Sin caption
                } else {
                    await sendImage(config, remoteJid, media.url, '') // Sin caption
                }
                // Pequeño delay entre medias para asegurar orden
                await new Promise(r => setTimeout(r, 600))
            }

            // Finalmente enviar el texto formateado y limpio
            if (finalText.length > 0) {
                await sendMessage(config, remoteJid, finalText, true)
            }

        } else {
            // Enviar solo texto
            await sendMessage(config, remoteJid, finalText, true)
        }

        // Si se requiere cotización PDF
        if (placeholderResult.shouldGenerateQuote) {
            console.log(`📄 [QUOTE] Generating quote PDF...`)
            // TODO: Implementar generación real de PDF
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
        // 12. FINAL METRICS
        // ========================================================================
        const totalDuration = performance.now() - startTime

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`✅ [SUCCESS] Message processed successfully`)
        console.log(`⏱️  Total duration: ${totalDuration.toFixed(0)}ms`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

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
        console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ [ERROR] Fatal error processing message')
        console.error(`   Message: ${error.message}`)
        console.error(`   Stack: ${error.stack}`)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
