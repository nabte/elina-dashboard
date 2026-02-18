/**
 * ELINA V5 - Critical Situation Detection System
 *
 * Detecta casos críticos que requieren intervención humana:
 * - Solicitud explícita de hablar con humano
 * - Enojo/frustración extrema
 * - Insultos/agresividad
 * - Casos personalizados configurables
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, Contact } from '../config/types.ts'
import { sendMessage } from '../utils/evolution.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

export interface CriticalRule {
    id: number
    user_id: string
    rule_name: string
    rule_type: 'keyword' | 'pattern'
    pattern_or_keyword: string
    detection_type: string
    is_active: boolean
    is_predefined: boolean
    priority: number
    case_sensitive: boolean
}

export interface CriticalDetectionResult {
    isCritical: boolean
    reason: string
    detectionType: string
    confidence: number
}

/**
 * Obtiene las reglas críticas activas para un usuario
 */
async function getActiveCriticalRules(
    supabase: SupabaseClient,
    userId: string
): Promise<CriticalRule[]> {
    try {
        const { data, error } = await supabase
            .from('critical_rules')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)

        if (error) {
            console.error(`❌ [CRITICAL] Error fetching rules:`, error)
            return []
        }

        return (data || []) as CriticalRule[]

    } catch (error) {
        console.error(`❌ [CRITICAL] Error in getActiveCriticalRules:`, error)
        return []
    }
}

/**
 * Detecta solicitud explícita de hablar con humano
 */
function detectHumanRequest(message: string): boolean {
    const humanKeywords = [
        'quiero hablar con un humano',
        'dame un humano',
        'necesito hablar con alguien',
        'quiero hablar con una persona',
        'hablar con alguien real',
        'no quiero robot',
        'no quiero bot',
        'comunícame con',
        'pásame con',
        'transferir con',
        'hablar con el dueño',
        'hablar con encargado',
        'hablar con gerente',
        'necesito ayuda de verdad',
        'esto no me sirve'
    ]

    const lowerMessage = message.toLowerCase()
    return humanKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * Detecta intención de compra alta (lead caliente)
 */
function detectPurchaseIntent(message: string): boolean {
    const purchaseKeywords = [
        'quiero comprar',
        'lo quiero',
        'me interesa',
        'cuándo puedo',
        'cómo compro',
        'dónde compro',
        'quiero contratar',
        'me lo llevo',
        'acepta',
        'formas de pago',
        'transferencia',
        'efectivo',
        'tarjeta',
        'envío a domicilio',
        'cuánto cuesta el envío',
        'hay disponible',
        'tienen en stock'
    ]

    const lowerMessage = message.toLowerCase()

    // Debe tener al menos 2 keywords para ser considerado crítico
    const matchCount = purchaseKeywords.filter(keyword =>
        lowerMessage.includes(keyword)
    ).length

    return matchCount >= 2
}

/**
 * Detecta necesidad de atención urgente
 */
function detectUrgentAttention(message: string): boolean {
    const urgentKeywords = [
        'urgente',
        'emergencia',
        'inmediato',
        'ahora mismo',
        'ya mismo',
        'es urgente',
        'lo antes posible',
        'cuanto antes'
    ]

    const lowerMessage = message.toLowerCase()
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * Analiza sentimiento usando GPT para detectar enojo/frustración
 */
async function analyzeSentiment(
    message: string,
    conversationContext: string
): Promise<{ isNegative: boolean; reason: string; score: number }> {
    try {
        const prompt = `Analiza el sentimiento de este mensaje del cliente.

Mensaje: "${message}"

Contexto de conversación:
${conversationContext}

Determina si el cliente está:
- Enojado
- Frustrado
- Molesto
- Insultando
- Siendo agresivo

Responde SOLO con un JSON en este formato:
{
  "isNegative": boolean (true si detectas enojo/frustración/insultos),
  "reason": "string explicando por qué",
  "score": number de 0 a 1 (qué tan negativo es, 0.8+ es crítico)
}`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 150
            })
        })

        if (!response.ok) {
            throw new Error('Sentiment analysis failed')
        }

        const data = await response.json()
        const resultText = data.choices[0].message.content.trim()
        const result = JSON.parse(resultText)

        return {
            isNegative: result.isNegative && result.score >= 0.8,
            reason: result.reason,
            score: result.score
        }

    } catch (error) {
        console.error(`❌ [CRITICAL] Error analyzing sentiment:`, error)
        return { isNegative: false, reason: 'Error en análisis', score: 0 }
    }
}

/**
 * Evalúa una regla crítica personalizada contra el mensaje
 */
function evaluateCustomRule(rule: CriticalRule, message: string): boolean {
    const messageToTest = rule.case_sensitive ? message : message.toLowerCase()
    const patternOrKeyword = rule.case_sensitive ? rule.pattern_or_keyword : rule.pattern_or_keyword.toLowerCase()

    if (rule.rule_type === 'pattern') {
        // Verificar usando regex
        try {
            const regex = new RegExp(patternOrKeyword, rule.case_sensitive ? '' : 'i')
            return regex.test(message)
        } catch (error) {
            console.error(`❌ [CRITICAL] Invalid regex pattern in rule ${rule.id}:`, error)
            return false
        }
    } else {
        // rule_type === 'keyword' - búsqueda simple
        return messageToTest.includes(patternOrKeyword)
    }
}

/**
 * Detecta si un mensaje representa una situación crítica
 * @returns Resultado de detección con razón específica
 */
export async function detectCriticalSituation(
    supabase: SupabaseClient,
    userId: string,
    message: string,
    conversationContext: string
): Promise<CriticalDetectionResult> {
    console.log(`🚨 [CRITICAL] Checking for critical situations...`)

    // 1. Obtener reglas activas
    const rules = await getActiveCriticalRules(supabase, userId)

    if (rules.length === 0) {
        console.log(`ℹ️ [CRITICAL] No active critical rules found`)
        return {
            isCritical: false,
            reason: '',
            detectionType: '',
            confidence: 0
        }
    }

    console.log(`📋 [CRITICAL] Evaluating against ${rules.length} active rules`)

    // 2. Evaluar reglas predefinidas
    for (const rule of rules.filter(r => r.is_predefined)) {
        let detected = false
        let reason = ''

        switch (rule.detection_type) {
            case 'human_request':
                detected = detectHumanRequest(message)
                if (detected) {
                    reason = `Cliente solicitó hablar con un humano: "${message.substring(0, 100)}"`
                }
                break

            case 'purchase_intent':
                detected = detectPurchaseIntent(message)
                if (detected) {
                    reason = `Cliente muestra intención fuerte de compra inmediata`
                }
                break

            case 'urgent_attention':
                detected = detectUrgentAttention(message)
                if (detected) {
                    reason = `Cliente requiere atención urgente: "${message.substring(0, 100)}"`
                }
                break
        }

        if (detected) {
            console.log(`🚨 [CRITICAL] Detected: ${rule.detection_type}`)
            return {
                isCritical: true,
                reason,
                detectionType: rule.detection_type,
                confidence: 1.0
            }
        }
    }

    // 3. Evaluar reglas personalizadas
    for (const rule of rules.filter(r => !r.is_predefined)) {
        if (evaluateCustomRule(rule, message)) {
            console.log(`🚨 [CRITICAL] Custom rule triggered: ${rule.rule_name}`)
            return {
                isCritical: true,
                reason: `Regla personalizada "${rule.rule_name}" activada`,
                detectionType: 'custom',
                confidence: 1.0
            }
        }
    }

    // 4. Análisis de sentimiento (solo si hay contexto suficiente)
    if (conversationContext.length > 50) {
        const sentiment = await analyzeSentiment(message, conversationContext)

        if (sentiment.isNegative) {
            console.log(`🚨 [CRITICAL] Negative sentiment detected (score: ${sentiment.score})`)
            return {
                isCritical: true,
                reason: `Cliente muestra enojo/frustración: ${sentiment.reason}`,
                detectionType: 'negative_sentiment',
                confidence: sentiment.score
            }
        }
    }

    console.log(`✅ [CRITICAL] No critical situation detected`)
    return {
        isCritical: false,
        reason: '',
        detectionType: '',
        confidence: 0
    }
}

/**
 * Aplica etiqueta "ignorar" al contacto
 */
async function applyIgnoreLabel(
    supabase: SupabaseClient,
    contactId: number,
    reason: string
): Promise<void> {
    try {
        // Obtener etiquetas actuales
        const { data: contact } = await supabase
            .from('contacts')
            .select('labels')
            .eq('id', contactId)
            .single()

        if (!contact) {
            throw new Error('Contact not found')
        }

        const currentLabels = contact.labels || []

        // Verificar si ya tiene la etiqueta
        if (currentLabels.includes('ignorar')) {
            console.log(`ℹ️ [CRITICAL] Contact already has "ignorar" label`)
            return
        }

        // Agregar etiqueta "ignorar"
        const updatedLabels = [...currentLabels, 'ignorar']

        const { error } = await supabase
            .from('contacts')
            .update({
                labels: updatedLabels,
                razon_de_label_auto: reason
            })
            .eq('id', contactId)

        if (error) {
            throw error
        }

        console.log(`✅ [CRITICAL] "ignorar" label applied to contact ${contactId}`)

    } catch (error) {
        console.error(`❌ [CRITICAL] Error applying label:`, error)
        throw error
    }
}

/**
 * Notifica al administrador sobre la situación crítica
 */
async function notifyAdmin(
    config: AccountConfig,
    contact: Contact,
    reason: string,
    adminPhone: string
): Promise<void> {
    try {
        const contactName = contact.full_name || contact.phone_number
        const contactPhone = contact.phone_number

        const notificationMessage = `🚨 *ATENCIÓN NECESARIA*

Un cliente requiere atención humana:

👤 *Cliente:* ${contactName}
📱 *Teléfono:* ${contactPhone}

📋 *Razón:*
${reason}

⚠️ La conversación ha sido pausada automáticamente. Por favor, responde directamente al cliente.`

        // Enviar notificación al admin usando Evolution API
        await sendMessage(config, adminPhone, notificationMessage)

        console.log(`✅ [CRITICAL] Admin notified at ${adminPhone}`)

    } catch (error) {
        console.error(`❌ [CRITICAL] Error notifying admin:`, error)
        // No lanzar error - la etiqueta ya se aplicó
    }
}

/**
 * Maneja una situación crítica detectada
 */
export async function handleCriticalSituation(
    supabase: SupabaseClient,
    config: AccountConfig,
    contact: Contact,
    detectionResult: CriticalDetectionResult
): Promise<void> {
    console.log(`🚨 [CRITICAL] Handling critical situation: ${detectionResult.detectionType}`)

    try {
        // 1. Aplicar etiqueta "ignorar" al contacto
        await applyIgnoreLabel(supabase, contact.id, detectionResult.reason)

        // 2. Obtener número del admin para notificación
        const { data: profile } = await supabase
            .from('profiles')
            .select('contact_phone')
            .eq('id', config.userId)
            .single()

        const adminPhone = profile?.contact_phone

        if (!adminPhone || adminPhone.trim() === '') {
            console.warn(`⚠️ [CRITICAL] No admin phone configured - skipping notification`)
            return
        }

        // 3. Notificar al administrador
        await notifyAdmin(config, contact, detectionResult.reason, adminPhone)

        console.log(`✅ [CRITICAL] Critical situation handled successfully`)

    } catch (error) {
        console.error(`❌ [CRITICAL] Error handling critical situation:`, error)
        throw error
    }
}
