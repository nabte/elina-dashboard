/**
 * ELINA V5 - Conversational Agent
 * 
 * Agente conversacional principal usando OpenRouter con GPT-5-nano
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, IntentDetectionResult, ConversationContext, AgentResponse, Message, ToolResult, ToolCall } from '../config/types.ts'
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, OPENROUTER_API_URL } from '../config/constants.ts'
import { formatAppointmentContext } from '../utils/appointment-manager.ts'

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

    const startTime = performance.now()

    // 1. Construir system prompt
    const systemPrompt = buildSystemPrompt(config, intent, context)

    // 2. Preparar mensajes
    const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...context.recentMessages.slice(-8), // Últimos 8 mensajes para contexto
        { role: 'user', content: userMessage }
    ]

    // Si hay tool calls y results, construir el flujo completo
    if (toolCalls && toolCalls.length > 0 && toolResults && toolResults.length > 0) {
        console.log(`🔧 [AGENT] Processing ${toolResults.length} tool result(s)`)
        // Agregar el mensaje del assistant con tool_calls
        messages.push({
            role: 'assistant',
            content: null,
            tool_calls: toolCalls
        })
        // Agregar los resultados de las herramientas
        messages.push(...toolResults)
        console.log(`📊 [AGENT] Tool results added to conversation context`)
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
                // Tools siempre disponibles para permitir encadenamiento (consultar -> agendar)
                tools: getAvailableTools(config, intent),
                tool_choice: 'auto'
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()
        const duration = performance.now() - startTime

        console.log(`✅ [AGENT] Response generated in ${duration.toFixed(0)}ms`)

        // 4. Procesar respuesta
        const choice = data.choices[0]

        // Debug logging
        console.log(`🔍 [DEBUG] LLM Response:`)
        console.log(`   - finish_reason: ${choice.finish_reason}`)
        console.log(`   - content: ${choice.message.content ? `"${choice.message.content.substring(0, 100)}..."` : 'NULL'}`)
        console.log(`   - tool_calls: ${choice.message.tool_calls ? choice.message.tool_calls.length : 0}`)

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
function buildSystemPrompt(
    config: AccountConfig,
    intent: IntentDetectionResult,
    context: ConversationContext
): string {
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
- **FORMATO DE PRECIOS:** NUNCA pongas salgo de línea entre el signo $ y el número. Correcto: "$100". Incorrecto: "$ \n 100" o "a $ 100".


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

    // Agregar contexto conversacional (productos mencionados recientemente)
    if (context.conversationState?.lastProductsMentioned && context.conversationState.lastProductsMentioned.length > 0) {
        prompt += `\n## 🧠 CONTEXTO CONVERSACIONAL (PRODUCTOS MENCIONADOS RECIENTEMENTE)\n`
        prompt += `El usuario ya vio estos productos en mensajes anteriores:\n`
        context.conversationState.lastProductsMentioned.forEach(p => {
            prompt += `${p.position}. ${p.name} (ID: ${p.id}) - $${p.price.toFixed(2)}\n`
        })
        prompt += `\n**IMPORTANTE:** Si el usuario dice "el primero", "el segundo", "ese", "esa", etc., usa estos IDs.\n`
        prompt += `Ejemplos:\n`
        prompt += `- "Quiero el primero" → Usa [PRODUCT_CARD:${context.conversationState.lastProductsMentioned[0]?.id}]\n`
        prompt += `- "Dame 2 de ese" → Usa [QUOTE_ITEM:${context.conversationState.lastProductsMentioned[0]?.id}:2]\n`
        prompt += `- "El segundo y el tercero" → Usa ambos IDs\n\n`
    }

    // Instrucciones específicas según intención
    if (intent.primary === 'product_inquiry') {
        prompt += `\n## 🎯 ACCIÓN REQUERIDA: CONSULTA DE PRODUCTOS

**PASO 1 - OBLIGATORIO (INTÉRPRETE INTELIGENTE):**
Tu trabajo es TRADUCIR lo que dice el cliente a términos de búsqueda efectivos para la base de datos.
- CORRIGE ERRORES: Si dice "tonner", busca "toner". Si dice "impresra", busca "impresora".
- SIMPLIFICA: Si dice "me urge tinta para la hp 105", busca solo "105" o "tinta 105".
- GENÉRICOS: Si dice "qué vendes", "tienes productos", "catálogo", usa query="" (vacío) para ver todo.

**EJEMPLOS DE CORRECCIÓN:**
- Usuario: "precio del tn105x" -> Tool: buscar_productos(query: "tn-105x")
- Usuario: "tienes cartucjos?" -> Tool: buscar_productos(query: "cartucho")
- Usuario: "k vendes" -> Tool: buscar_productos(query: "")

**AHORA USA LA HERRAMIENTA CON EL TÉRMINO CORREGIDO:**


**PASO 2:** Basándote SOLO en los resultados de la herramienta:
- La herramienta te dará una lista de productos con IDs.
- **FORMATO OBLIGATORIO PARA MOSTRAR PRODUCTOS:**

🛍️ *[PRODUCT_NAME:ID]* — $[PRODUCT_PRICE:ID]
🔹 [PRODUCT_DESC:ID]
[PRODUCT_URL:ID]

**REGLAS CRÍTICAS:**
1. **NUNCA escribas nombres de productos manualmente** (ej: ❌ '[diseño gráfico]'). Usa SIEMPRE '[PRODUCT_NAME:ID]'.
2. **NUNCA escribas precios manualmente**. Usa SIEMPRE '$[PRODUCT_PRICE:ID]' (sin espacios ni saltos de línea).
3. **NUNCA pongas saltos de línea entre $ y el precio**. Correcto: '$[PRODUCT_PRICE:ID]'. Incorrecto: '$ \\n[PRODUCT_PRICE:ID]'.
4. **Cada URL debe ir INMEDIATAMENTE después de su descripción**, en su propia línea.
5. **Deja una línea en blanco entre productos** para separación visual.


**EJEMPLO COMPLETO:**
Usuario: "qué productos tienes?"
Respuesta:
Aquí tienes los productos que manejamos:

🛍️ *[PRODUCT_NAME:101]* — $[PRODUCT_PRICE:101]
🔹 [PRODUCT_DESC:101]
[PRODUCT_URL:101]

🛍️ *[PRODUCT_NAME:102]* — $[PRODUCT_PRICE:102]
🔹 [PRODUCT_DESC:102]
[PRODUCT_URL:102]

¿Te gustaría más información sobre alguno? 😊


**PARA COTIZACIONES (SUMAR PRECIOS):**
- Usa **[QUOTE_ITEM:ID:CANTIDAD]** para cada línea.
- Usa **[QUOTE_TOTAL]** al final para que yo sume todo.
- EJEMPLO: "Claro, serían:
  [QUOTE_ITEM:101:2]
  [QUOTE_ITEM:102:1]
  [QUOTE_TOTAL]"

- Si la herramienta dice "exact_matches", preséntalos con entusiasmo.
- Si dice "suggested_alternatives", aclara: "No encontré el exacto, pero estos te pueden servir:..."
- Si dice "status: NOT_FOUND", dilo honestamente.

**PROHIBIDO:**
❌ HACER MATEMÁTICAS TÚ MISMO (No sumes ni multipliques nada).
❌ Inventar precios.
❌ Olvidar usar buscar_productos antes.
❌ Escribir nombres de productos manualmente entre corchetes.
❌ Poner saltos de línea en precios.
❌ Responder sin usar la herramienta primero
❌ Inventar productos basándote en la descripción de la empresa
❌ Decir "ofrecemos servicios en..." sin verificar productos reales
❌ Asumir que vendes algo solo porque suena lógico
❌ Enviar URLs de imágenes como texto (usa [PRODUCT_MEDIA:ID] en su lugar)
`
    }

    if (intent.primary === 'appointment_request') {
        prompt += `\n## Contexto Actual: Solicitud de Cita

**🚨 REGLA CRÍTICA #1: CONSULTA DISPONIBILIDAD PRIMERO**
ANTES de responder CUALQUIER cosa sobre citas, DEBES:
1. Llamar a la herramienta \`consultar_disponibilidad\` INMEDIATAMENTE
2. Esperar el resultado
3. SOLO ENTONCES responder al usuario

**🚨 REGLA CRÍTICA #2: ANTI-ALUCINACIÓN (ESTRICTO)**
❌ PROHIBIDO DECIR: "Voy a agendar...", "Un momento...", "Estoy procesando..."
❌ PROHIBIDO DECIR: "Listo, quedó agendada" SIN llamar a la herramienta.
✅ TU ÚNICA ACCIÓN: Llamar a la herramienta \`agendar_cita\` silenciosamente.
✅ EXCEPCIÓN: Si la herramienta falla, explica el error.

**REGLAS DE ORO PARA CITAS:**

1. **PRESENTACIÓN DE HORARIOS**:
   - Usa \`formatted_response\` DIRECTAMENTE.
   - SIEMPRE incluye el enlace: [APPOINTMENT_CALENDAR_LINK]

2. **SI NO HAY DISPONIBILIDAD**:
   - Ofrece alternativas de venta (productos/servicios).
   - Comparte el enlace del calendario.


**⏰ INTERPRETACIÓN INTELIGENTE DE HORAS:**
Cuando el usuario menciona una hora ambigua, usa contexto para interpretarla correctamente:

- "las 2", "a las 2" → **14:00** (2 PM) si es durante el día
- "las 3", "a las 3" → **15:00** (3 PM)
- "las 4", "a las 4" → **16:00** (4 PM)
- "las 9" → **09:00** (9 AM) si es temprano, **21:00** (9 PM) si es tarde

**REGLA**: Si el usuario dice una hora entre 1-11 SIN especificar AM/PM:
- Asume **PM** (formato 24h: 13:00-23:00) si está en horario laboral típico
- Usa el contexto de disponibilidad mostrada para elegir la hora correcta

Ejemplos:
- Usuario ve "Entre las 09:00 a.m. y las 09:30 p.m." y dice "a las 2"
  → Interpreta como **14:00** (2 PM), NO 02:00 AM
- Usuario ve "Entre las 15:00 y las 18:00" y dice "a las 4"
  → Interpreta como **16:00** (4 PM)

**🚀 REGLA DE AGENDADO AGRESIVO:**
Si el usuario ya proporcionó (explícita o implícitamente):
- ✅ Servicio (mencionado o del contexto de conversación)
- ✅ Fecha (hoy, mañana, día específico)
- ✅ Hora (15:00, 4pm, "a las 4", etc.)

→ **AGENDA INMEDIATAMENTE** llamando a 'agendar_cita'
→ **NO PREGUNTES** "¿Confirmas la cita?" o "¿Te parece bien?"
→ Solo confirma **DESPUÉS** de agendar exitosamente

Ejemplos de cuándo agendar inmediatamente:
- "quiero cita para corte mañana a las 3" → AGENDA YA con date="2026-02-12", time="15:00"
- "sí, a las 4 porfa" (después de mostrar disponibilidad) → AGENDA YA con time="16:00"
- "que a las 4" (confirmando hora) → AGENDA YA con time="16:00"
- "hoy a las 2 porfa" → AGENDA YA con date="2026-02-11", time="14:00"
- "mañana a las 9" → AGENDA YA con date="mañana", time="09:00"

**CONTEXTO IMPORTANTE**: Si acabas de mostrar disponibilidad y el usuario responde con una hora:
→ NO vuelvas a consultar disponibilidad
→ AGENDA INMEDIATAMENTE con esa hora

❌ NUNCA hagas esto:
- "¿Confirmas la cita para mañana a las 4?" cuando ya tienes toda la info
- Pedir confirmación cuando el usuario ya fue explícito

3. **CIERRE DE VENTA (AGENDAR) - EJECUCIÓN INMEDIATA**:
   - Si el usuario confirma hora -> LLAMA A LA TOOL \`agendar_cita\`.
   - NO HABLES. NO DIGAS "ok, deja agendo". SOLO LLAMA A LA TOOL.
   - La confirmación "✅ Listo..." solo debe enviarse SI la tool devuelve success:true.

   c) SOLO DESPUÉS de que la herramienta responda:
      - Si success: true → "✅ Listo, ya quedó agendada tu cita de *[serviceName del tool result]* para el *[fecha y hora]*."
      - Si success: false → "Lo siento, hubo un problema: [error]"
   
   ❌ NUNCA HAGAS ESTO:
   - Decir "Listo, quedó agendada" sin llamar a la herramienta
   - Inventar que agendaste cuando no lo hiciste
   - Responder antes de que la herramienta termine

**EJEMPLO DE FLUJO CORRECTO (CONSULTA):**
Usuario: "Quiero una cita"
Tú: [LLAMAS consultar_disponibilidad]
Herramienta: { formatted_response: "📅 Mañana: Entre las 10:00 y las 14:00..." }
Tú: "Claro! Tengo espacio mañana entre las 10:00 y las 14:00. ¿Cuál te acomoda? 😊 
También puedes ver el calendario completo aquí: [APPOINTMENT_CALENDAR_LINK]"

**EJEMPLO DE FLUJO CORRECTO (AGENDAR):**
Usuario: "sí, mañana a las 3"
Tú: [LLAMAS agendar_cita con { date: "2026-02-12", time: "15:00" }]
Herramienta: { 
  success: true, 
  appointmentId: 123, 
  serviceName: "Corte de Cabello", 
  startTime: "2026-02-12T15:00:00" 
}
Tú: "✅ Listo, ya quedó agendada tu cita de *Corte de Cabello* para el 12 de febrero a las 3:00 PM. Te enviaré un recordatorio. 😊"

**🚨 REGLA CRÍTICA: SIEMPRE RESPONDE DESPUÉS DE UNA HERRAMIENTA**
Si recibes un resultado de herramienta (tool result), DEBES generar una respuesta de texto.
NUNCA devuelvas una respuesta vacía después de ejecutar una herramienta.
Si la herramienta falla, explica el error.
Si la herramienta tiene éxito, confirma la acción al usuario.

**CONSECUENCIAS DE NO SEGUIR ESTAS REGLAS:**
- Si dices que agendaste sin llamar a la herramienta, el cliente llegará y NO tendrá cita
- Esto genera quejas, pérdida de confianza y cancelación del servicio
- SIEMPRE verifica que la herramienta se ejecutó correctamente
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
                description: 'Busca productos en el catálogo basándose en una consulta de texto. Úsala cuando el cliente pregunte por productos, precios, SKUs, o qué vendes. IMPORTANTE: Si el usuario pregunta específicamente por SERVICIOS, usa query="servicios".',
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
                description: 'Agenda una cita INMEDIATAMENTE cuando el usuario proporcione fecha Y hora. Ejemplos: "hoy a las 2", "mañana a las 3pm", "el lunes a las 10". NO ESPERES CONFIRMACIÓN. Si el usuario dice una hora, AGENDA YA. El service_id es opcional (el sistema usará el del contexto o default).',
                parameters: {
                    type: 'object',
                    properties: {
                        date: {
                            type: 'string',
                            description: 'Fecha de la cita en formato YYYY-MM-DD (ej: 2026-02-11 para hoy, 2026-02-12 para mañana)'
                        },
                        time: {
                            type: 'string',
                            description: 'Hora en formato HH:MM 24h. IMPORTANTE: Si el usuario dice "las 2", "las 3", etc. SIN AM/PM, asume TARDE (PM): "las 2"=14:00, "las 3"=15:00, "las 4"=16:00. Solo usa 09:00-11:00 si dice explícitamente "mañana" o "AM".'
                        },
                        service_id: {
                            type: 'number',
                            description: 'ID del servicio (OPCIONAL - el sistema elegirá del contexto si se omite)'
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

        // Tool para consultar las citas del usuario
        tools.push({
            type: 'function',
            function: {
                name: 'consultar_mis_citas',
                description: 'Consulta las citas programadas del usuario. Úsala cuando pregunten "qué citas tengo?", "cuándo es mi cita?", "tengo alguna cita?", etc.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        })

        // Tool para modificar citas
        tools.push({
            type: 'function',
            function: {
                name: 'modificar_cita',
                description: 'Modifica o reprograma una cita existente. Requiere consultar_mis_citas primero para obtener el ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        appointment_id: {
                            type: 'number',
                            description: 'ID de la cita a modificar'
                        },
                        new_date: {
                            type: 'string',
                            description: 'Nueva fecha en formato YYYY-MM-DD (opcional si solo cambia hora)'
                        },
                        new_time: {
                            type: 'string',
                            description: 'Nueva hora en formato HH:MM 24h (opcional si solo cambia fecha)'
                        }
                    },
                    required: ['appointment_id']
                }
            }
        })
    }

    return tools
}
