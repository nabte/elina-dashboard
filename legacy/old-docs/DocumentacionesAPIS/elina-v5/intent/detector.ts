/**
 * ELINA V5 - Intent Detection System
 * 
 * Sistema avanzado de detección de intenciones con análisis de sentimientos
 */

import type { AccountConfig, Intent, IntentDetectionResult, SentimentAnalysis, Message } from '../config/types.ts'
import { INTENT_CONFIDENCE_THRESHOLD } from '../config/constants.ts'

/**
 * Detecta la intención del mensaje del usuario
 */
export async function detectIntent(
    message: string,
    config: AccountConfig,
    conversationHistory: Message[] = []
): Promise<IntentDetectionResult> {
    console.log(`🎯 [INTENT] Detecting intent for message: "${message.substring(0, 50)}..."`)

    // 1. Detección basada en reglas (rápido)
    const ruleBasedIntent = detectIntentByRules(message, config)

    // 2. Si la confianza es alta, usar el resultado de reglas
    if (ruleBasedIntent.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
        console.log(`✅ [INTENT] Rule-based detection: ${ruleBasedIntent.primary} (${ruleBasedIntent.confidence})`)
        return ruleBasedIntent
    }

    // 3. Si no, usar LLM para mayor precisión (más lento)
    console.log(`🤖 [INTENT] Using LLM for intent detection (low confidence: ${ruleBasedIntent.confidence})`)
    return await detectIntentByLLM(message, config, conversationHistory)
}

/**
 * Detección de intención basada en reglas y patrones
 */
function detectIntentByRules(
    message: string,
    config: AccountConfig
): IntentDetectionResult {
    const lowerMessage = message.toLowerCase().trim()
    const sentiment = analyzeSentiment(message)

    // Saludos
    if (/^(hola|buenos días|buenas tardes|buenas noches|hey|qué tal|saludos|buen día)/i.test(message)) {
        return {
            primary: 'greeting' as Intent,
            confidence: 0.95,
            sentiment,
            entities: {}
        }
    }

    // Despedidas
    if (/^(adiós|hasta luego|nos vemos|chao|bye|gracias|ok gracias)/i.test(message)) {
        return {
            primary: 'farewell' as Intent,
            confidence: 0.9,
            sentiment,
            entities: {}
        }
    }

    // Quejas (CRÍTICO)
    if (/\b(queja|reclamo|molesto|enojado|mal servicio|pésimo|horrible|terrible|decepcionado|fraude|estafa)\b/i.test(lowerMessage)) {
        return {
            primary: 'complaint' as Intent,
            confidence: 0.95,
            sentiment: { polarity: 'negative', score: -0.8 },
            entities: {}
        }
    }

    // Urgencias (CRÍTICO)
    if (/\b(urgente|emergencia|ayuda|problema grave|necesito ya|inmediato)\b/i.test(lowerMessage)) {
        return {
            primary: 'urgent_issue' as Intent,
            confidence: 0.9,
            sentiment: { polarity: 'negative', score: -0.6 },
            entities: {}
        }
    }

    // Cancelaciones
    if (/\b(cancelar|anular|ya no quiero|mejor no|desistir)\b/i.test(lowerMessage)) {
        return {
            primary: 'cancellation' as Intent,
            confidence: 0.85,
            sentiment,
            entities: {}
        }
    }

    // Citas (solo si está habilitado)
    if (config.hasAppointments || config.appointmentsEnabled) {
        if (/\b(cita|agendar|reservar|turno|hora|consulta|appointment)\b/i.test(lowerMessage)) {
            return {
                primary: 'appointment_request' as Intent,
                confidence: 0.9,
                sentiment,
                entities: extractEntities(message)
            }
        }
    }

    // Cotizaciones
    if (config.quotesEnabled || config.hasQuotes) {
        if (/\b(cotización|presupuesto|precio total|cuánto sería todo|quote)\b/i.test(lowerMessage)) {
            return {
                primary: 'quote_request' as Intent,
                confidence: 0.85,
                sentiment,
                entities: extractEntities(message)
            }
        }
    }

    // Productos
    if (config.hasProducts) {
        if (/\b(producto|artículo|precio|costo|cuánto|disponible|stock|inventario|comprar|vend(es|en)|tien(es|en)|ofrec(es|en)|manej(as|an)|catálogo|qué si vend)\b/i.test(lowerMessage)) {
            return {
                primary: 'product_inquiry' as Intent,
                confidence: 0.8,
                sentiment,
                entities: extractEntities(message)
            }
        }
    }

    // Servicios
    if (config.hasServices) {
        if (/\b(servicio|ofreces|haces|realizas|cuánto cobras)\b/i.test(lowerMessage)) {
            return {
                primary: 'service_inquiry' as Intent,
                confidence: 0.8,
                sentiment,
                entities: extractEntities(message)
            }
        }
    }

    // Confirmaciones
    if (/^(sí|si|yes|ok|está bien|perfecto|de acuerdo|confirmo|acepto)\b/i.test(message)) {
        return {
            primary: 'confirmation' as Intent,
            confidence: 0.85,
            sentiment: { polarity: 'positive', score: 0.6 },
            entities: {}
        }
    }

    // Default: pregunta general
    return {
        primary: 'general_question' as Intent,
        confidence: 0.5,
        sentiment,
        entities: extractEntities(message)
    }
}

/**
 * Detección de intención usando LLM (más preciso pero más lento)
 */
async function detectIntentByLLM(
    message: string,
    config: AccountConfig,
    conversationHistory: Message[]
): Promise<IntentDetectionResult> {
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openrouterKey) {
        console.warn(`⚠️ [INTENT] OPENROUTER_API_KEY not found, falling back to rule-based`)
        return detectIntentByRules(message, config)
    }

    const prompt = `Analiza el siguiente mensaje y determina la intención principal del usuario.

Mensaje: "${message}"

Contexto de negocio:
- Tipo: ${config.businessType}
- Tiene productos: ${config.hasProducts}
- Tiene servicios: ${config.hasServices}
- Tiene citas: ${config.appointmentsEnabled}
- Tiene cotizaciones: ${config.quotesEnabled}

Responde SOLO con un JSON en este formato:
{
  "intent": "greeting|farewell|product_inquiry|service_inquiry|appointment_request|quote_request|complaint|urgent_issue|cancellation|confirmation|general_question|unknown",
  "confidence": 0.0-1.0,
  "sentiment": "positive|neutral|negative",
  "entities": {
    "products": ["producto1", "producto2"],
    "dates": ["2026-02-10"],
    "prices": [100, 200]
  }
}`

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterKey}`,
                'HTTP-Referer': 'https://elina.ai',
                'X-Title': 'ELINA V5 Intent Detection',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini', // Más barato para detección de intención
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 200
            })
        })

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content

        // Extraer JSON de la respuesta
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('No JSON found in LLM response')
        }

        const result = JSON.parse(jsonMatch[0])

        return {
            primary: result.intent as Intent,
            confidence: result.confidence || 0.7,
            sentiment: {
                polarity: result.sentiment || 'neutral',
                score: result.sentiment === 'positive' ? 0.6 : result.sentiment === 'negative' ? -0.6 : 0
            },
            entities: result.entities || {}
        }
    } catch (error) {
        console.error(`❌ [INTENT] LLM detection failed: ${error.message}`)
        return detectIntentByRules(message, config)
    }
}

/**
 * Analiza el sentimiento del mensaje
 */
export function analyzeSentiment(message: string): SentimentAnalysis {
    const lowerMessage = message.toLowerCase()

    // Palabras positivas
    const positiveWords = ['excelente', 'genial', 'perfecto', 'gracias', 'bueno', 'bien', 'feliz', 'contento', 'encantado', 'maravilloso']
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length

    // Palabras negativas
    const negativeWords = ['mal', 'pésimo', 'horrible', 'terrible', 'molesto', 'enojado', 'decepcionado', 'problema', 'queja', 'reclamo']
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length

    // Calcular polaridad
    if (positiveCount > negativeCount) {
        return {
            polarity: 'positive',
            score: Math.min(0.8, 0.3 + (positiveCount * 0.2))
        }
    } else if (negativeCount > positiveCount) {
        return {
            polarity: 'negative',
            score: Math.max(-0.8, -0.3 - (negativeCount * 0.2))
        }
    }

    return {
        polarity: 'neutral',
        score: 0
    }
}

/**
 * Extrae entidades del mensaje (productos, fechas, precios, etc.)
 */
function extractEntities(message: string): {
    products?: string[]
    services?: string[]
    dates?: string[]
    prices?: number[]
    phoneNumbers?: string[]
} {
    const entities: any = {}

    // Extraer precios (ej: $100, 100 pesos, $1,000.00)
    const priceRegex = /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:pesos|mxn|usd|dólares))?/gi
    const prices = message.match(priceRegex)
    if (prices) {
        entities.prices = prices.map(p => parseFloat(p.replace(/[$,]/g, '')))
    }

    // Extraer fechas (ej: 10/02/2026, 10 de febrero, mañana)
    const dateKeywords = ['mañana', 'hoy', 'pasado mañana', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    const foundDates = dateKeywords.filter(keyword => message.toLowerCase().includes(keyword))
    if (foundDates.length > 0) {
        entities.dates = foundDates
    }

    // Extraer números de teléfono (ej: 5512345678, +52 55 1234 5678)
    const phoneRegex = /(?:\+?52\s?)?(?:\d{2,3}\s?)?\d{4}\s?\d{4}/g
    const phones = message.match(phoneRegex)
    if (phones) {
        entities.phoneNumbers = phones
    }

    return entities
}

/**
 * Verifica si la intención es crítica y requiere atención humana
 */
export function isCriticalIntent(intent: Intent): boolean {
    const criticalIntents: Intent[] = [
        'complaint' as Intent,
        'urgent_issue' as Intent,
        'cancellation' as Intent,
        'refund_request' as Intent
    ]

    return criticalIntents.includes(intent)
}
