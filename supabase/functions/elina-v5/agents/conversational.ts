/**
 * ELINA V5 - Conversational Agent
 * 
 * Agente conversacional principal usando OpenRouter con GPT-5-nano
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, IntentDetectionResult, ConversationContext, AgentResponse, Message, ToolResult, ToolCall } from '../config/types.ts'
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, OPENROUTER_API_URL } from '../config/constants.ts'

/**
 * Ejecuta el agente conversacional
 */
export async function runConversationalAgent(
    supabase: SupabaseClient,
    config: AccountConfig,
    userMessage: string,
    intent: IntentDetectionResult,
    context: ConversationContext,
    toolCalls?: ToolCall[],     // ← Tool calls originales del assistant
    toolResults?: ToolResult[]  // ← Resultados de herramientas ejecutadas
): Promise<AgentResponse> {
    console.log(`🤖 [AGENT] Running conversational agent`)
    console.log(`   - Intent: ${intent.primary}`)
    console.log(`   - Sentiment: ${intent.sentiment.polarity} (${intent.sentiment.score})`)

    const startTime = performance.now()

    // 1. Construir system prompt
    const systemPrompt = await buildSystemPrompt(config, intent, context)

    // 2. Preparar mensajes
    const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...context.recentMessages.slice(-8), // Últimos 8 mensajes para contexto
        { role: 'user', content: userMessage }
    ]

    // Si hay tool calls y results, construir el flujo completo
    if (toolCalls && toolCalls.length > 0 && toolResults && toolResults.length > 0) {
        // Agregar el mensaje del assistant con tool_calls
        messages.push({
            role: 'assistant',
            content: null,
            tool_calls: toolCalls
        })
        // Agregar los resultados de las herramientas
        messages.push(...toolResults)
    }

    // 3. Llamar a OpenRouter
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openrouterKey) {
        throw new Error('OPENROUTER_API_KEY not found in environment')
    }

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterKey}`,
                'HTTP-Referer': 'https://elina.ai',
                'X-Title': 'ELINA V5',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model || DEFAULT_MODEL,
                messages,  // Ya incluye tool results si existen
                temperature: config.temperature || DEFAULT_TEMPERATURE,
                max_tokens: config.maxTokens || DEFAULT_MAX_TOKENS,
                // Tools solo en la primera llamada (cuando no hay toolResults)
                ...(toolResults && toolResults.length > 0 ? {} : {
                    tools: getAvailableTools(config, intent),
                    tool_choice: 'auto'
                })
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()
        const duration = performance.now() - startTime

        console.log(`✅ [AGENT] Response generated in ${duration.toFixed(0)}ms`)
        console.log(`   - Model: ${data.model || config.model}`)
        console.log(`   - Tokens: ${data.usage?.total_tokens || 'unknown'}`)

        // 4. Procesar respuesta
        const choice = data.choices[0]

        return {
            text: choice.message.content || '',
            toolCalls: choice.message.tool_calls || [],
            metadata: {
                model: data.model || config.model,
                tokensUsed: data.usage?.total_tokens || 0,
                finishReason: choice.finish_reason || 'stop',
                duration
            }
        }
    } catch (error) {
        console.error(`❌ [AGENT] Error calling OpenRouter: ${error.message}`)
        throw error
    }
}

/**
 * Construye el system prompt dinámicamente
 */
async function buildSystemPrompt(
    config: AccountConfig,
    intent: IntentDetectionResult,
    context: ConversationContext
): Promise<string> {
    let prompt = `Eres el asistente virtual de ${config.companyName}, un chatbot de ventas y atención al cliente ${config.tone} y profesional.

## Información de la Empresa
${config.website ? `Sitio web: ${config.website}` : ''}
${config.businessPhone ? `\nTeléfono: ${config.businessPhone}` : ''}
${config.businessAddress ? `\nDirección: ${config.businessAddress}` : ''}
`

    // CRÍTICO: Solo incluir descripción de empresa si NO es consulta de productos
    // Esto evita que el LLM invente productos basándose en la descripción
    if (intent.primary !== 'product_inquiry') {
        prompt += `\n${config.companyDescription || 'Empresa dedicada a ofrecer productos y servicios de calidad.'}
`
    }

    prompt += `
## Tu Misión
- Responder de forma natural y conversacional, como un humano por WhatsApp
- Ser BREVE: máximo 2-3 líneas por mensaje (como un mensaje de texto real)
- Ir directo al grano, sin rodeos ni explicaciones largas
- Detectar las necesidades del cliente y ofrecer soluciones
- Mantener un tono ${config.tone} pero casual
- Usar emojis ocasionalmente (1-2 por mensaje máximo) 😊
- Si hay mucha info, dividir en mensajes cortos en lugar de un mensaje largo
- Responder como si estuvieras chateando, no escribiendo un email

## Capacidades Disponibles

**IMPORTANTE: FECHA ACTUAL**
Hoy es: ${new Date().toLocaleString('es-MX', { timeZone: config.timezone || 'America/Mexico_City', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
Usa esta fecha como referencia absoluta para "mañana", "lunes", etc.
`

    // REGLAS CRÍTICAS SOBRE PRODUCTOS
    prompt += `\n🚨 **REGLAS CRÍTICAS SOBRE PRODUCTOS** 🚨\n`
    prompt += `1. NUNCA respondas sobre productos sin usar la herramienta buscar_productos primero.\n`
    prompt += `2. NUNCA inventes productos, servicios o características basándote en la descripción de la empresa.\n`
    prompt += `3. Si el usuario pregunta "qué vendes?", "qué productos tienes?", "qué manejas?", etc., DEBES usar buscar_productos con query vacía ("") para obtener el catálogo real.\n`
    prompt += `4. Si buscar_productos devuelve 0 resultados, significa que NO lo tenemos. Di: "No manejo esa marca/modelo actualmente."\n`
    prompt += `5. NUNCA digas "tengo otros modelos" o "puedo buscar otros" si la búsqueda falló.\n`
    prompt += `6. Solo menciona productos que REALMENTE encontraste con la herramienta.\n`
    prompt += `7. PROHIBIDO asumir que vendes algo solo porque está en la descripción de la empresa.\n`

    if (config.appointmentsEnabled) {
        prompt += `✅ **Citas**: Puedes consultar disponibilidad y agendar citas.\n`
    }

    if (config.quotesEnabled) {
        prompt += `✅ **Cotizaciones**: Puedes generar cotizaciones en PDF cuando el cliente lo solicite.\n`
    }

    if (config.hasShipping) {
        prompt += `✅ **Envíos**: Ofrecemos servicio de envío a domicilio.\n`
    }

    // Agregar contexto RAG si existe
    if (context.ragContext) {
        prompt += `\n## Información Relevante de la Base de Conocimientos\n${context.ragContext}\n`
    }

    // Agregar aprendizajes de largo plazo
    if (context.accountLearnings && context.accountLearnings.length > 0) {
        prompt += `\n## Aprendizajes Previos\n`
        context.accountLearnings.forEach(learning => {
            prompt += `- ${learning.content}\n`
        })
    }

    // Agregar preferencias del usuario
    if (context.userPreferences && context.userPreferences.length > 0) {
        prompt += `\n## Preferencias del Cliente\n`
        context.userPreferences.forEach(pref => {
            prompt += `- ${pref.key}: ${pref.value}\n`
        })
    }

    // Agregar promociones activas
    if (context.activePromotions && context.activePromotions.length > 0) {
        prompt += `\n## Promociones Activas\n`
        context.activePromotions.forEach(promo => {
            prompt += `- **${promo.title}**: ${promo.description || ''}\n`
            if (promo.discount) prompt += `  Descuento: ${promo.discount}\n`
        })
    }

    // 🔥 PRODUCTOS MENCIONADOS RECIENTEMENTE (con FAQs para follow-up questions)
    if (context.recentlyMentionedProducts && context.recentlyMentionedProducts.length > 0) {
        const { formatCachedProductsForPrompt } = await import('../utils/product-cache.ts')
        prompt += formatCachedProductsForPrompt(context.recentlyMentionedProducts)
        prompt += `\n**IMPORTANTE:** Si el cliente hace preguntas sobre estos productos (ej: "¿cómo funciona?", "¿es compatible?"), usa la información de FAQs arriba. NO necesitas buscar de nuevo.\n`
    }

    // Instrucciones específicas según intención
    if (intent.primary === 'product_inquiry') {
        prompt += `\n## 🎯 ACCIÓN REQUERIDA: CONSULTA DE PRODUCTOS

**PASO 1 - OBLIGATORIO:** Usa la herramienta buscar_productos AHORA.
- Si el usuario pregunta "qué vendes?", "qué productos?", "qué tienes?": usa query="" (vacío) para ver TODO el catálogo
- Si pregunta por algo específico (ej: "migraña", "665", "105X"): usa ese término como query

**PASO 2:** Basándote SOLO en los resultados de la herramienta:
- Si encontraste productos: menciona usando placeholders (OPCIONAL):
  * Nombre: [PRODUCT_NAME:ID] o el nombre directamente
  * Precio: [PRODUCT_PRICE:ID] o el precio directamente
  * Stock: [PRODUCT_STOCK:ID]
  * Descripción: [PRODUCT_DESC:ID]
- Si NO encontraste nada (0 resultados): di "No manejo esa marca/modelo actualmente."
- **🖼️ MEDIA**: NO necesitas mencionar [PRODUCT_MEDIA:ID] - el sistema envía imágenes/videos automáticamente si el producto las tiene

**EJEMPLOS:**
- "Sí, tengo el [PRODUCT_NAME:123] por [PRODUCT_PRICE:123]"
- O simplemente: "Sí, tengo el HP 665 por $350. Hay 10 en stock"

→ Si el producto tiene media_url, se enviará automáticamente como imagen con tu texto como caption

**🔎 USO DE FAQs DE PRODUCTOS:**
- La herramienta buscar_productos devuelve FAQs (preguntas frecuentes) para cada producto
- Las FAQs contienen respuestas verificadas y específicas sobre características, compatibilidad, uso, etc.
- Si el cliente pregunta algo que está en las FAQs del producto, usa esa información para responder
- Las FAQs son información CONFIABLE y REAL del producto
- Ejemplo: Cliente: "¿Es compatible con Windows?" → Si hay FAQ que lo responde, úsala

**PROHIBIDO:**
❌ Responder sin usar la herramienta primero
❌ Inventar productos basándote en la descripción de la empresa
❌ Decir "ofrecemos servicios en..." sin verificar productos reales
❌ Asumir que vendes algo solo porque suena lógico
❌ Enviar URLs de imágenes manualmente (el sistema las envía automáticamente)
`
    }

    if (intent.primary === 'appointment_request') {
        prompt += `\n## Contexto Actual
El cliente quiere agendar una cita.
IMPORTANTE: 
1. PRIMERO usa consultar_disponibilidad para ver horarios disponibles.
2. Si hay slots disponibles, muéstralos.
3. CRÍTICO: Si el usuario elige un horario (ej: "a las 3", "el de las 5"), AGENDA INMEDIATAMENTE usando agendar_cita.
4. NO preguntes "¿te gustaría agendar?" o "¿confirmamos?". HAZLO DIRECTAMENTE. Simplemente di: "Listo, ha quedado agendada...".
5. Solo si el horario no es claro o no hay disponibilidad, pregunta.
${context.appointmentSlots && context.appointmentSlots.length > 0 ? `
Horarios disponibles:
${context.appointmentSlots.map(s => `- ${s.date} a las ${s.time}`).join('\n')}
` : ''}
`
    }

    if (intent.primary === 'complaint' || intent.primary === 'urgent_issue') {
        prompt += `\n## ALERTA: Intención Crítica Detectada
El cliente tiene una queja o problema urgente. Responde con:
1. Empatía y disculpas sinceras
2. Reconocimiento del problema
3. Ofrecimiento de solución inmediata
4. Escalamiento a un humano si es necesario

Ejemplo: "Lamento mucho escuchar eso 😔 Entiendo tu frustración y quiero ayudarte a resolver esto de inmediato. ¿Podrías darme más detalles para poder asistirte mejor?"
`
    }

    // Prompt personalizado del usuario
    if (config.customPrompt) {
        prompt += `\n## Instrucciones Adicionales del Negocio\n${config.customPrompt}\n`
    }

    // Reglas generales
    prompt += `\n## Reglas Importantes
1. SÉ BREVE: Máximo 2-3 líneas, como un mensaje de WhatsApp real
2. NUNCA inventes información que no tengas
3. Si no sabes algo, admítelo brevemente y ofrece alternativas
4. Usa placeholders [PRODUCT_NAME:ID] para productos
5. Responde como humano casual, no como robot formal
6. Usa emojis con moderación (1-2 máximo)
7. Si detectas venta, cierra con CTA breve y claro
8. EVITA párrafos largos - divide en mensajes cortos si es necesario
`

    return prompt
}

/**
 * Obtiene las herramientas disponibles según configuración
 */
function getAvailableTools(config: AccountConfig, intent: IntentDetectionResult): any[] {
    const tools: any[] = []

    // Herramienta de búsqueda de productos
    // SIEMPRE disponible si el usuario tiene productos, sin importar el intent
    // El LLM decidirá cuándo usarla
    if (config.hasProducts) {
        tools.push({
            type: 'function',
            function: {
                name: 'buscar_productos',
                description: 'Busca productos en el catálogo basándose en una consulta de texto. Úsala cuando el cliente pregunte por productos, precios, SKUs, o qué vendes.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Consulta de búsqueda (ej: "zapatos deportivos", "laptop gaming", "105X", "migraña")'
                        },
                        limit: {
                            type: 'number',
                            description: 'Número máximo de resultados (default: 5)'
                        }
                    },
                    required: ['query']
                }
            }
        })
    }

    // Herramienta de agendamiento de citas
    if (config.appointmentsEnabled && intent.primary === 'appointment_request') {
        tools.push({
            type: 'function',
            function: {
                name: 'agendar_cita',
                description: 'Agenda una cita para el cliente',
                parameters: {
                    type: 'object',
                    properties: {
                        date: {
                            type: 'string',
                            description: 'Fecha de la cita (formato: YYYY-MM-DD)'
                        },
                        time: {
                            type: 'string',
                            description: 'Hora de la cita (formato: HH:MM)'
                        },
                        service_id: {
                            type: 'number',
                            description: 'ID del servicio (opcional)'
                        },
                        notes: {
                            type: 'string',
                            description: 'Notas adicionales (opcional)'
                        }
                    },
                    required: ['date', 'time']
                }
            }
        })

        // Tool para consultar disponibilidad
        tools.push({
            type: 'function',
            function: {
                name: 'consultar_disponibilidad',
                description: 'Consulta los horarios disponibles para una fecha específica',
                parameters: {
                    type: 'object',
                    properties: {
                        date: {
                            type: 'string',
                            description: 'Fecha a consultar (formato: YYYY-MM-DD)'
                        }
                    },
                    required: ['date']
                }
            }
        })
    }

    return tools
}
