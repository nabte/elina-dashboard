/**
 * SEND DAILY SUMMARY
 * Edge Function para enviar resumen diario del negocio
 *
 * Ejecutado por Supabase Cron Job
 * Analiza métricas del día y envía resumen por WhatsApp al admin
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DailyMetrics {
    totalConversations: number
    newContacts: number
    quotesGenerated: number
    quotesTotalAmount: number
    appointmentsCreated: number
    criticalSituations: number
    topProducts: { name: string; count: number }[]
}

serve(async (req) => {
    try {
        console.log('🌙 [DAILY_SUMMARY] Starting daily summary generation...')

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Leer parámetros del request (para modo manual)
        let isManual = false
        let manualUserId = null

        try {
            const body = await req.json()
            isManual = body?.manual === true
            manualUserId = body?.userId
        } catch {
            // Si no hay body, continuar en modo automático (cron)
        }

        console.log(`📋 [DAILY_SUMMARY] Mode: ${isManual ? 'Manual' : 'Automatic (Cron)'}`)

        // ========================================================================
        // 1. OBTENER USUARIOS CON RESUMEN DIARIO HABILITADO
        // ========================================================================
        const currentTime = new Date().toTimeString().slice(0, 5) // HH:MM
        const currentHour = new Date().getHours()

        console.log(`⏰ [DAILY_SUMMARY] Current time: ${currentTime} (hour: ${currentHour})`)

        let query = supabase
            .from('profiles')
            .select('id, full_name, contact_phone, daily_summary_time, evolution_api_key, evolution_api_url, evolution_instance_name')
            .eq('daily_summary_enabled', true)
            .not('contact_phone', 'is', null)

        // Si es manual, filtrar por el userId específico
        if (isManual && manualUserId) {
            query = query.eq('id', manualUserId)
        }

        const { data: users, error: usersError } = await query

        if (usersError || !users || users.length === 0) {
            console.log('ℹ️ [DAILY_SUMMARY] No users with daily summary enabled')
            return new Response(JSON.stringify({
                success: true,
                message: 'No users to process'
            }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }

        console.log(`📋 [DAILY_SUMMARY] Found ${users.length} user(s) with daily summary enabled`)

        const results = []

        // ========================================================================
        // 2. PROCESAR CADA USUARIO
        // ========================================================================
        for (const user of users) {
            try {
                // Verificar si es hora de enviar (solo en modo automático)
                if (!isManual) {
                    const summaryTime = user.daily_summary_time || '20:00:00'
                    const summaryHour = parseInt(summaryTime.split(':')[0])

                    // Solo enviar si la hora actual coincide con la configurada (±1 hora de margen)
                    if (Math.abs(currentHour - summaryHour) > 1) {
                        console.log(`⏭️ [DAILY_SUMMARY] Skipping user ${user.id} (scheduled for ${summaryTime}, current: ${currentTime})`)
                        continue
                    }
                }

                console.log(`📊 [DAILY_SUMMARY] Processing user: ${user.full_name}`)

                // Obtener métricas del día
                const metrics = await getDailyMetrics(supabase, user.id)

                // Generar resumen con IA
                const { summaryText, adviceText } = await generateSummary(user.full_name, metrics)

                // Guardar en histórico
                await saveDailySummary(supabase, user.id, metrics, summaryText, adviceText)

                // Enviar por WhatsApp
                const sent = await sendSummaryMessage(
                    user.contact_phone!,
                    summaryText,
                    adviceText,
                    user.evolution_api_key,
                    user.evolution_api_url,
                    user.evolution_instance_name
                )

                results.push({
                    userId: user.id,
                    userName: user.full_name,
                    sent,
                    metrics
                })

                console.log(`✅ [DAILY_SUMMARY] Summary sent to ${user.full_name}`)

            } catch (error) {
                console.error(`❌ [DAILY_SUMMARY] Error processing user ${user.id}:`, error)
                results.push({
                    userId: user.id,
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processed: results.length,
            results
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('❌ [DAILY_SUMMARY] Fatal error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})

/**
 * Obtiene las métricas del día para un usuario
 */
async function getDailyMetrics(
    supabase: any,
    userId: string
): Promise<DailyMetrics> {
    const today = new Date().toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00Z`
    const todayEnd = `${today}T23:59:59Z`

    // 1. Total de conversaciones (contactos únicos que enviaron mensajes)
    const { data: conversations } = await supabase
        .from('chat_history')
        .select('contact_id', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('message_type', 'user')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

    const uniqueContacts = new Set(conversations?.map((c: any) => c.contact_id) || [])
    const totalConversations = uniqueContacts.size

    // 2. Nuevos contactos creados hoy
    const { count: newContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

    // 3. Cotizaciones generadas hoy
    const { data: quotes } = await supabase
        .from('quotes')
        .select('id, total')
        .eq('user_id', userId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

    const quotesGenerated = quotes?.length || 0
    const quotesTotalAmount = quotes?.reduce((sum: number, q: any) => sum + (q.total || 0), 0) || 0

    // 4. Citas agendadas hoy
    const { count: appointmentsCreated } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

    // 5. Situaciones críticas (contactos con etiqueta "ignorar" agregada hoy)
    const { data: criticalContacts } = await supabase
        .from('contacts')
        .select('labels')
        .eq('user_id', userId)
        .contains('labels', ['ignorar'])
        .gte('updated_at', todayStart)
        .lte('updated_at', todayEnd)

    const criticalSituations = criticalContacts?.length || 0

    // 6. Productos más consultados (analizar tool calls de buscar_productos)
    const { data: productSearches } = await supabase
        .from('chat_history')
        .select('tool_results')
        .eq('user_id', userId)
        .eq('message_type', 'assistant')
        .not('tool_results', 'is', null)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

    // Contar productos por nombre
    const productCounts: { [key: string]: number } = {}

    productSearches?.forEach((msg: any) => {
        if (!msg.tool_results) return

        try {
            const toolResults = typeof msg.tool_results === 'string'
                ? JSON.parse(msg.tool_results)
                : msg.tool_results

            if (Array.isArray(toolResults)) {
                toolResults.forEach((result: any) => {
                    if (result.name === 'buscar_productos') {
                        const content = typeof result.content === 'string'
                            ? JSON.parse(result.content)
                            : result.content

                        const products = content.products || content.exact_matches || []
                        products.forEach((product: any) => {
                            const name = product.productName || product.product_name || product.name
                            if (name) {
                                productCounts[name] = (productCounts[name] || 0) + 1
                            }
                        })
                    }
                })
            }
        } catch (e) {
            // Ignorar errores de parsing
        }
    })

    // Top 3 productos más consultados
    const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))

    return {
        totalConversations,
        newContacts: newContacts || 0,
        quotesGenerated,
        quotesTotalAmount,
        appointmentsCreated: appointmentsCreated || 0,
        criticalSituations,
        topProducts
    }
}

/**
 * Genera el resumen y consejo usando GPT
 */
async function generateSummary(
    businessName: string,
    metrics: DailyMetrics
): Promise<{ summaryText: string; adviceText: string }> {
    const today = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // Detectar si no hay actividad
    const hasActivity = metrics.totalConversations > 0 ||
                       metrics.newContacts > 0 ||
                       metrics.quotesGenerated > 0 ||
                       metrics.appointmentsCreated > 0

    // Si no hay actividad, retornar mensaje hardcodeado
    if (!hasActivity) {
        return {
            summaryText: `📊 *Resumen del ${today}*\n\nNada que reportar hoy. No hubo conversaciones ni actividad registrada.`,
            adviceText: 'Considera revisar tus promociones o enviar un mensaje de seguimiento a tus clientes habituales.'
        }
    }

    const prompt = `Eres un asistente ejecutivo que genera resúmenes diarios concisos para dueños de negocio.

Negocio: ${businessName}
Fecha: ${today}

Métricas del día:
- Conversaciones atendidas: ${metrics.totalConversations}
- Nuevos contactos: ${metrics.newContacts}
- Cotizaciones generadas: ${metrics.quotesGenerated} (Total: $${metrics.quotesTotalAmount.toFixed(2)} MXN)
- Citas agendadas: ${metrics.appointmentsCreated}
- Situaciones críticas: ${metrics.criticalSituations}
- Productos más consultados: ${metrics.topProducts.map(p => `${p.name} (${p.count}x)`).join(', ') || 'Ninguno'}

Genera:
1. Un resumen profesional pero amigable (máximo 150 palabras)
2. Un consejo breve y accionable basado en las métricas (máximo 50 palabras)

Formato de respuesta JSON:
{
  "summary": "texto del resumen aquí",
  "advice": "texto del consejo aquí"
}

Reglas:
- Tono: Profesional pero cercano, como un asistente personal
- Usa emojis moderadamente (máximo 3-4)
- Si alguna métrica está en 0, no la menciones negativamente
- Destaca logros positivos
- El consejo debe ser específico y accionable`

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 300
            })
        })

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        const result = JSON.parse(data.choices[0].message.content.trim())

        return {
            summaryText: result.summary,
            adviceText: result.advice
        }

    } catch (error) {
        console.error('❌ [DAILY_SUMMARY] Error generating summary:', error)

        // Fallback a resumen simple
        return {
            summaryText: `Resumen del ${today}:\n\n📊 Atendiste ${metrics.totalConversations} conversación${metrics.totalConversations !== 1 ? 'es' : ''} hoy${metrics.quotesGenerated > 0 ? `, generaste ${metrics.quotesGenerated} cotización${metrics.quotesGenerated !== 1 ? 'es' : ''}` : ''}${metrics.appointmentsCreated > 0 ? ` y agendaste ${metrics.appointmentsCreated} cita${metrics.appointmentsCreated !== 1 ? 's' : ''}` : ''}.`,
            adviceText: 'Sigue así, cada interacción es una oportunidad de crecimiento.'
        }
    }
}

/**
 * Guarda el resumen en la base de datos
 */
async function saveDailySummary(
    supabase: any,
    userId: string,
    metrics: DailyMetrics,
    summaryText: string,
    adviceText: string
): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    await supabase
        .from('daily_summaries')
        .upsert({
            user_id: userId,
            summary_date: today,
            total_conversations: metrics.totalConversations,
            new_contacts: metrics.newContacts,
            quotes_generated: metrics.quotesGenerated,
            quotes_total_amount: metrics.quotesTotalAmount,
            appointments_created: metrics.appointmentsCreated,
            critical_situations: metrics.criticalSituations,
            top_products: metrics.topProducts,
            summary_text: summaryText,
            advice_text: adviceText
        }, {
            onConflict: 'user_id,summary_date'
        })
}

/**
 * Envía el resumen por WhatsApp usando Evolution API
 */
async function sendSummaryMessage(
    phoneNumber: string,
    summaryText: string,
    adviceText: string,
    apiKey: string,
    apiUrl: string,
    instanceName: string
): Promise<boolean> {
    try {
        const today = new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        })

        const message = `🌙 *Resumen Diario - ${today}*

${summaryText}

💡 *Consejo:*
${adviceText}

✨ ¡Sigue así!

_💬 Recuerda contestar estos mensajes para mantener tu servicio activo._`

        const url = `${apiUrl}/message/sendText/${instanceName}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                number: phoneNumber.replace(/\D/g, ''),
                text: message,
                options: {
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false
                }
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Evolution API error: ${response.status} - ${error}`)
        }

        // Actualizar estado de envío
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await supabase
            .from('daily_summaries')
            .update({
                sent_at: new Date().toISOString(),
                sent_to: phoneNumber,
                delivery_status: 'sent'
            })
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('summary_date', new Date().toISOString().split('T')[0])

        return true

    } catch (error) {
        console.error('❌ [DAILY_SUMMARY] Error sending message:', error)
        return false
    }
}
