/**
 * CONVERSATION QUALITY ANALYZER
 * Analiza la calidad de conversaciones y detecta errores
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ConversationQualityData {
    userId: string
    contactId: number
    messageText: string
    aiResponse: string
    toolCalls: any[]
    toolResults: any[]
    validationResult?: any
}

export interface QualityAnalysisResult {
    hasErrors: boolean
    errorTypes: string[]
    errorDetails: any
    qualityScore: number
    needsReview: boolean
    productsQueried: string[]
    productsNotFound: string[]
    toolsUsed: string[]
    toolsSuccessCount: number
    toolsErrorCount: number
}

/**
 * Analiza la calidad de una conversación y detecta errores
 */
export async function analyzeConversationQuality(
    data: ConversationQualityData
): Promise<QualityAnalysisResult> {
    const errors: string[] = []
    const errorDetails: any = {}
    let qualityScore = 1.0
    let productsQueried: string[] = []
    let productsNotFound: string[] = []
    const toolsUsed: string[] = []
    let toolsSuccessCount = 0
    let toolsErrorCount = 0

    // ========================================================================
    // 1. ANALIZAR TOOL CALLS
    // ========================================================================
    if (data.toolCalls && data.toolCalls.length > 0) {
        data.toolCalls.forEach((call: any) => {
            const toolName = call.function?.name || 'unknown'
            if (!toolsUsed.includes(toolName)) {
                toolsUsed.push(toolName)
            }
        })
    }

    // ========================================================================
    // 2. ANALIZAR TOOL RESULTS
    // ========================================================================
    if (data.toolResults && data.toolResults.length > 0) {
        data.toolResults.forEach((result: any) => {
            const toolName = result.name

            try {
                const content = typeof result.content === 'string'
                    ? JSON.parse(result.content)
                    : result.content

                // Analizar resultado de buscar_productos
                if (toolName === 'buscar_productos') {
                    if (content.error) {
                        errors.push('tool_error')
                        errorDetails.tool_error = errorDetails.tool_error || []
                        errorDetails.tool_error.push({
                            tool: toolName,
                            error: content.error
                        })
                        toolsErrorCount++
                        qualityScore -= 0.2
                    } else if (content.status === 'NOT_FOUND') {
                        errors.push('product_not_found')
                        errorDetails.product_not_found = errorDetails.product_not_found || []

                        // Intentar extraer el query de búsqueda
                        const query = content.query || 'unknown'
                        productsNotFound.push(query)
                        errorDetails.product_not_found.push(query)

                        qualityScore -= 0.1
                        toolsSuccessCount++ // Técnicamente la tool funcionó, solo no encontró
                    } else if (content.status === 'SUCCESS' || content.products) {
                        toolsSuccessCount++

                        // Registrar productos encontrados
                        const products = content.products || content.exact_matches || []
                        products.forEach((p: any) => {
                            const name = p.productName || p.product_name || p.name
                            if (name && !productsQueried.includes(name)) {
                                productsQueried.push(name)
                            }
                        })
                    } else {
                        toolsSuccessCount++
                    }
                }

                // Analizar otros tools
                else if (content.error) {
                    errors.push('tool_error')
                    errorDetails.tool_error = errorDetails.tool_error || []
                    errorDetails.tool_error.push({
                        tool: toolName,
                        error: content.error
                    })
                    toolsErrorCount++
                    qualityScore -= 0.2
                } else if (content.success === false) {
                    errors.push('tool_error')
                    errorDetails.tool_error = errorDetails.tool_error || []
                    errorDetails.tool_error.push({
                        tool: toolName,
                        error: content.message || 'Unknown error'
                    })
                    toolsErrorCount++
                    qualityScore -= 0.2
                } else {
                    toolsSuccessCount++
                }

            } catch (e) {
                // Error parseando el result
                console.error(`[QUALITY] Error parsing tool result:`, e)
                toolsErrorCount++
            }
        })
    }

    // ========================================================================
    // 3. ANALIZAR VALIDACIÓN (si existe)
    // ========================================================================
    if (data.validationResult) {
        if (data.validationResult.hasIssues) {
            errors.push('validation_failed')
            errorDetails.validation_failed = data.validationResult.issues
            qualityScore -= 0.3
        }
    }

    // ========================================================================
    // 4. DETECTAR ALUCINACIONES COMUNES
    // ========================================================================
    const aiResponseLower = data.aiResponse.toLowerCase()

    // Detectar si menciona productos sin usar placeholders correctos
    if (aiResponseLower.includes('producto') || aiResponseLower.includes('artículo')) {
        // Verificar si NO hay placeholders [PRODUCT_NAME:ID]
        if (!data.aiResponse.match(/\[PRODUCT_NAME:\d+\]/)) {
            // Posible alucinación
            if (toolsUsed.includes('buscar_productos') && productsQueried.length === 0) {
                errors.push('hallucination')
                errorDetails.hallucination = errorDetails.hallucination || []
                errorDetails.hallucination.push('Mencionó productos sin usar placeholders')
                qualityScore -= 0.3
            }
        }
    }

    // Detectar respuestas genéricas sin usar tools
    const genericPhrases = [
        'déjame verificar',
        'voy a consultar',
        'permíteme revisar',
        'un momento por favor'
    ]

    if (genericPhrases.some(phrase => aiResponseLower.includes(phrase))) {
        // Si dijo que iba a verificar pero no usó ninguna tool
        if (toolsUsed.length === 0) {
            errors.push('hallucination')
            errorDetails.hallucination = errorDetails.hallucination || []
            errorDetails.hallucination.push('Dijo que verificaría pero no usó herramientas')
            qualityScore -= 0.2
        }
    }

    // ========================================================================
    // 5. CALCULAR RESULTADO FINAL
    // ========================================================================
    const uniqueErrors = [...new Set(errors)]
    const hasErrors = uniqueErrors.length > 0

    // Asegurar que el score esté entre 0 y 1
    qualityScore = Math.max(0, Math.min(1, qualityScore))

    // Determinar si necesita revisión
    const needsReview = qualityScore < 0.6 || uniqueErrors.includes('hallucination')

    return {
        hasErrors,
        errorTypes: uniqueErrors,
        errorDetails,
        qualityScore,
        needsReview,
        productsQueried,
        productsNotFound,
        toolsUsed,
        toolsSuccessCount,
        toolsErrorCount
    }
}

/**
 * Guarda el análisis de calidad en la base de datos
 */
export async function saveConversationQuality(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    analysis: QualityAnalysisResult,
    messageText: string,
    aiResponse: string
): Promise<void> {
    try {
        const today = new Date().toISOString().split('T')[0]

        // Construir transcript si hay errores
        const transcript = analysis.hasErrors
            ? `Usuario: ${messageText}\n\nAsistente: ${aiResponse}`
            : null

        const { error } = await supabase
            .from('conversation_quality_log')
            .insert({
                user_id: userId,
                contact_id: contactId,
                conversation_date: today,
                total_messages: 1,
                total_user_messages: 1,
                total_ai_messages: 1,
                tools_used: analysis.toolsUsed,
                tools_success_count: analysis.toolsSuccessCount,
                tools_error_count: analysis.toolsErrorCount,
                has_errors: analysis.hasErrors,
                error_types: analysis.errorTypes,
                error_details: analysis.errorDetails,
                products_queried: analysis.productsQueried,
                products_not_found: analysis.productsNotFound,
                transcript: transcript,
                quality_score: analysis.qualityScore,
                needs_review: analysis.needsReview
            })

        if (error) {
            console.error(`❌ [QUALITY] Error saving quality log:`, error)
        } else if (analysis.hasErrors) {
            console.log(`⚠️ [QUALITY] Quality issues logged (score: ${analysis.qualityScore.toFixed(2)})`)
        }

    } catch (error) {
        console.error(`❌ [QUALITY] Error in saveConversationQuality:`, error)
    }
}

/**
 * Envía notificación por email si hay errores críticos
 */
export async function notifyErrorsIfNeeded(
    supabase: SupabaseClient,
    userId: string,
    analysis: QualityAnalysisResult
): Promise<void> {
    // Solo notificar si hay errores graves
    if (!analysis.needsReview || analysis.qualityScore > 0.5) {
        return
    }

    try {
        // Obtener email de notificaciones del usuario
        const { data: profile } = await supabase
            .from('profiles')
            .select('notification_email, error_notifications_enabled, full_name')
            .eq('id', userId)
            .single()

        if (!profile || !profile.error_notifications_enabled || !profile.notification_email) {
            return
        }

        // Construir email de notificación
        const errorList = analysis.errorTypes.map(type => {
            const labels: { [key: string]: string } = {
                'product_not_found': 'Producto no encontrado',
                'tool_error': 'Error de herramienta',
                'hallucination': 'Alucinación detectada',
                'validation_failed': 'Validación fallida'
            }
            return `• ${labels[type] || type}`
        }).join('\n')

        const subject = `⚠️ ALERTA: Errores detectados en conversación - Score: ${(analysis.qualityScore * 100).toFixed(0)}%`

        const bodyHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🚨 Alerta de Calidad - ELINA IA</h1>
                </div>

                <div style="padding: 30px; background-color: #f9fafb;">
                    <p style="font-size: 16px; color: #374151;">Hola <strong>${profile.full_name}</strong>,</p>

                    <p style="font-size: 14px; color: #6b7280;">
                        Se han detectado errores en una conversación reciente que requieren tu atención.
                    </p>

                    <div style="background-color: white; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h2 style="color: #dc2626; margin-top: 0;">📊 Resumen de Calidad</h2>
                        <p style="margin: 10px 0;"><strong>Score de Calidad:</strong> <span style="color: ${analysis.qualityScore >= 0.6 ? '#f59e0b' : '#ef4444'}; font-size: 20px; font-weight: bold;">${(analysis.qualityScore * 100).toFixed(0)}%</span></p>
                        <p style="margin: 10px 0;"><strong>Estado:</strong> <span style="color: #ef4444;">⚠️ Requiere Revisión</span></p>
                    </div>

                    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <h3 style="color: #374151; margin-top: 0;">🔍 Errores Detectados:</h3>
                        <ul style="color: #6b7280; line-height: 1.8;">
                            ${analysis.errorTypes.map(type => {
                                const labels: { [key: string]: string } = {
                                    'product_not_found': 'Producto no encontrado',
                                    'tool_error': 'Error de herramienta',
                                    'hallucination': 'Alucinación detectada',
                                    'validation_failed': 'Validación fallida'
                                }
                                return `<li>${labels[type] || type}</li>`
                            }).join('')}
                        </ul>
                    </div>

                    ${analysis.productsNotFound.length > 0 ? `
                    <div style="background-color: #fef2f2; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #fecaca;">
                        <h4 style="color: #991b1b; margin-top: 0;">❌ Productos No Encontrados:</h4>
                        <ul style="color: #7f1d1d; margin: 0;">
                            ${analysis.productsNotFound.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    <div style="background-color: #eff6ff; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <p style="margin: 0; color: #1e40af;">
                            💡 <strong>Acción recomendada:</strong> Revisa esta conversación en el Dashboard de Calidad para identificar y corregir los problemas.
                        </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://mytvwfbijlgbihlegmfg.supabase.co"
                           style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                            Ver Dashboard de Calidad
                        </a>
                    </div>
                </div>

                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                    <p style="margin: 0;">Esta notificación fue enviada automáticamente por ELINA IA</p>
                    <p style="margin: 5px 0;">Puedes desactivar estas notificaciones en tu configuración</p>
                </div>
            </div>
        `

        const bodyPlain = `
⚠️ ALERTA DE CALIDAD - ELINA IA

Hola ${profile.full_name},

Se han detectado errores en una conversación reciente que requieren tu atención.

📊 RESUMEN DE CALIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Score de Calidad: ${(analysis.qualityScore * 100).toFixed(0)}%
• Estado: ⚠️ Requiere Revisión

🔍 ERRORES DETECTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${errorList}

${analysis.productsNotFound.length > 0 ? `
❌ PRODUCTOS NO ENCONTRADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analysis.productsNotFound.map(p => `• ${p}`).join('\n')}
` : ''}

💡 ACCIÓN RECOMENDADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Revisa esta conversación en el Dashboard de Calidad para identificar y corregir los problemas.

Accede al dashboard: https://mytvwfbijlgbihlegmfg.supabase.co

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Esta notificación fue enviada automáticamente por ELINA IA.
Puedes desactivar estas notificaciones en tu configuración.
        `

        // Llamar a la edge function para enviar el email
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('❌ [QUALITY] Missing Supabase environment variables')
            return
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email-smtp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                userId: userId,
                to: profile.notification_email,
                subject: subject,
                body: bodyPlain,
                bodyHtml: bodyHtml
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error(`❌ [QUALITY] Error sending email notification:`, error)
        } else {
            console.log(`✅ [QUALITY] Error notification email sent to ${profile.notification_email}`)
        }

    } catch (error) {
        console.error(`❌ [QUALITY] Error in notifyErrorsIfNeeded:`, error)
    }
}
