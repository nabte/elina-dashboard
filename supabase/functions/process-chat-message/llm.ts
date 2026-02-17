
import OpenAI from "https://esm.sh/openai@4.51.0";
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { toolsDefinition, searchProducts, createAppointment } from './tools.ts'

// OpenAI Config (GPT-5-nano for cost optimization)
const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

// Helper function to check if current time is within business hours
function checkBusinessHours(now: Date, startHour?: string, endHour?: string, timezone?: string): boolean {
    if (!startHour || !endHour) return false // If no hours set, assume always open

    try {
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTime = currentHour * 60 + currentMinute

        const [startH, startM] = startHour.split(':').map(Number)
        const [endH, endM] = endHour.split(':').map(Number)

        const startTime = startH * 60 + startM
        const endTime = endH * 60 + endM

        // Check if current time is outside business hours
        return currentTime < startTime || currentTime > endTime
    } catch (e) {
        console.error('Error checking business hours:', e)
        return false // Default to open if error
    }
}

export async function runAgent(
    supabase: SupabaseClient,
    userId: string,
    history: any[], // chat_history rows
    currentMessage: string,
    ragContext: string,
    systemPromptBase: string,
    companyInfo: any, // from profile
    contactInfo: any, // from contact
    isDraftPrompt: boolean = false, // [NEW] Flag for sandbox mode
    edgeConfig: any = null // [NEW] Edge Config object
) {
    const now = new Date();
    const dateContext = `
FECHA/HORA ACTUAL: ${now.toLocaleString('es-MX', { timeZone: companyInfo.timezone || 'America/Mexico_City' })}
Día de la semana: ${now.toLocaleDateString('es-MX', { weekday: 'long' })}
`

    // 1.5 Analyze Sentiment for Tone Adjustment
    const { analyzeSentiment } = await import('./context.ts')
    const sentiment = analyzeSentiment(currentMessage)

    console.log(`+++ [SENTIMIENTO] Detectado: ${sentiment.sentiment} (confianza: ${sentiment.confidence})`)

    let toneAdjustment = ""
    if (sentiment.sentiment === 'urgent') {
        toneAdjustment = `
🚨 AJUSTE DE TONO (URGENTE/FRUSTRADO):
El usuario parece urgente o frustrado. Responde con:
- Empatía inmediata ("Entiendo tu urgencia...")
- Soluciones concretas y rápidas
- Evita explicaciones largas o tecnicismos
- Prioriza RESOLVER sobre vender
- Si no puedes resolver de inmediato, ofrece contacto humano directo
`
    } else if (sentiment.sentiment === 'positive') {
        toneAdjustment = `
😊 AJUSTE DE TONO (POSITIVO):
El usuario está contento. Mantén el tono positivo y amigable.
- Refleja su energía positiva
- Puedes ser más conversacional
`
    } else if (sentiment.sentiment === 'negative') {
        toneAdjustment = `
😔 AJUSTE DE TONO (NEGATIVO):
El usuario parece insatisfecho. Responde con:
- Empatía y comprensión
- Enfócate en solucionar su problema
- Evita ser demasiado "vendedor"
`
    }

    // 1. Build System Message
    // Use defaults from shared file if not overridden by logic
    const { DEFAULT_PLACEHOLDER_INSTRUCTIONS, DEFAULT_APPOINTMENT_RULES, DEFAULT_PERSONALITY_CONTEXT } = await import('../_shared/prompt-defaults.ts')

    let placeholderInstruction = DEFAULT_PLACEHOLDER_INSTRUCTIONS;

    if (!isDraftPrompt) {
        // We use the shared default but inject context if needed, or just use the default structure
        // The default rule assumes we have the context.
        // Let's use the DEFAULT_APPOINTMENT_RULES as base but we might need to inject the name/phone if the prompt expects it?
        // In the shared file I removed ${variable}, so it's safe to use directly.
        // But wait, the original logic had specific instructions about "YA TIENES el nombre...".
        // The shared default also has that text but static.

        placeholderInstruction += `\n${DEFAULT_APPOINTMENT_RULES}\n`
    } else {
        console.log("🧪 [SANDBOX] Omitiendo reglas agresivas de agendamiento.")
    }

    let personalityContext = "";
    if (!isDraftPrompt) {
        personalityContext = `
PERSONALIDAD Y TONO (CRÍTICO):
${companyInfo.company_description ? `- Refleja la personalidad de la empresa: ${companyInfo.company_description}` : '- Sé amigable, profesional y servicial'}
- SÉ HUMANA, CÁLIDA Y BREVE. Escribe como una persona real en WhatsApp, no como un bot corporativo.
- USA TEXTO CORTO. Nadie lee parrafadas en chat. Ve al grano pero con calidez.
- NO ENVÍES LISTAS LARGAS de servicios a menos que el usuario pregunte explícitamente "¿qué vendes?" o "¿qué servicios tienes?".
- Si saludan ("Hola"), responde el saludo y abre conversación ("¡Hola! ¿Cómo estás? Soy Elina de Brandcode, ¿en qué te puedo ayudar hoy?"). NO vendas de inmediato.
- Escucha primero, ofrece después.
`
    } else {
        console.log("🧪 [SANDBOX] Omitiendo personalidad por defecto para respetar Prompt Borrador.")
    }

    const companyContext = `
INFORMACIÓN DE LA EMPRESA:
${companyInfo.website ? '- Website: ' + companyInfo.website : ''}
${companyInfo.business_phone ? '- Teléfono: ' + companyInfo.business_phone : ''}
${companyInfo.business_address ? '- Dirección: ' + companyInfo.business_address : ''}
${companyInfo.work_start_hour ? `- Horario: ${companyInfo.work_start_hour} - ${companyInfo.work_end_hour}` : ''}
${companyInfo.company_description ? '- Descripción: ' + companyInfo.company_description : ''}

DATOS DEL USUARIO (YA CONOCIDOS - NO PREGUNTAR):
- Nombre: ${contactInfo.full_name || contactInfo.phone_number} (Usa este nombre para el registro)
- Teléfono: ${contactInfo.phone_number} (Usa este teléfono para el registro)

${personalityContext}
`

    // Check if we're outside business hours
    const isOutsideHours = checkBusinessHours(now, companyInfo.work_start_hour, companyInfo.work_end_hour, companyInfo.timezone)

    let businessHoursContext = ""
    if (isOutsideHours && companyInfo.work_start_hour && companyInfo.work_end_hour) {
        businessHoursContext = `
[IMPORTANTE - FUERA DE HORARIO]
Actualmente estamos FUERA del horario de atención (${companyInfo.work_start_hour} - ${companyInfo.work_end_hour}).
- Menciona amablemente que estamos fuera de horario
- Asegura al cliente que su mensaje fue recibido
- Indica que responderemos en cuanto abramos (${companyInfo.work_start_hour})
- Si es urgente, ofrece alternativas (dejar mensaje detallado, contacto de emergencia si existe)
- Puedes seguir ayudando con información general, pero menciona que para procesos que requieren confirmación humana deberá esperar al horario de atención
`
    }


    let bookingInstruction = ""
    // Ensure slug exists and is not the generic 'agendar'
    const validSlug = (companyInfo.slug && companyInfo.slug !== 'agendar') ? companyInfo.slug : null;

    if (validSlug) {
        const bookingLink = `https://elinaia.com.mx/${validSlug}`
        console.log(`+++ [LLM] Inyectando enlace de reserva: ${bookingLink}`)
        bookingInstruction = `
OPCIÓN DE RESERVA MANUAL (ÚNICO LINK VÁLIDO):
- Si el usuario prefiere agendar por su cuenta, ofrece ESTE enlace: ${bookingLink}
- PROHIBIDO usar el enlace genérico "/agendar". 
- Dile: "Si lo prefieres, también puedes agendar directamente aquí: ${bookingLink}"
- Si el usuario menciona que ya agendó en la web, confía en él y no insistas con horarios.
`
    } else {
        console.warn(`--- [LLM] No se detectó slug válido para el perfil. Omitiendo link manual.`)
        bookingInstruction = `
OPCIÓN DE RESERVA MANUAL:
- Si el proceso por chat se complica, dile al usuario que un asesor humano le contactará a la brevedad para ayudarle con su cita. NO inventes enlaces de reserva.
`
    }

    // --- SISTEMA ANTI-ALUCINACIÓN: INYECCIÓN CONDICIONAL DE INVENTARIO ---

    console.log("+++ [INVENTARIO] Evaluando si inyectar inventario...")

    let inventoryContext = ""

    // Import detection functions
    const { detectProductIntent, detectSimpleGreeting } = await import('./context.ts')

    // Only inject inventory if:
    // 1. User is asking about products/services
    // 2. Conversation history already contains product references
    // 3. NOT a simple greeting
    const isSimpleGreeting = detectSimpleGreeting(currentMessage)
    const hasProductIntent = detectProductIntent(currentMessage)
    const historyHasProducts = history.some(m =>
        m.message_type === 'assistant' && /\[PRODUCT_/i.test(m.content)
    )

    const shouldInjectInventory = (hasProductIntent || historyHasProducts) && !isSimpleGreeting

    if (shouldInjectInventory) {
        console.log("+++ [INVENTARIO] Inyectando inventario (intención detectada)")

        try {
            const { data: services } = await supabase
                .from('products')
                .select('id, product_name, price, description, media_url')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .limit(15)

            // 2. Obtener PRODUCTOS (para venta)
            const { data: products } = await supabase
                .from('products')
                .select('id, product_name, price, description, stock, media_url')
                .eq('user_id', userId)
                .eq('product_type', 'product')
                .gt('stock', 0) // Solo productos con stock disponible
                .limit(20)

            // 3. Construir contexto combinado
            if (services && services.length > 0) {
                console.log(`+++ [INVENTARIO] ${services.length} servicios encontrados`)
                inventoryContext += `
📋 SERVICIOS DISPONIBLES (para citas):
${services.map((s: any) => `- [${s.product_name}:${s.id}]${s.description ? ' - ' + s.description : ''}`).join('\n')}

💡 Para mencionar el precio de un servicio, usa: [PRODUCT_PRICE:ID]
   Ejemplo: "El [corte de pelo:9528] cuesta [PRODUCT_PRICE:9528]"
`
            }

            if (products && products.length > 0) {
                console.log(`+++ [INVENTARIO] ${products.length} productos encontrados`)
                inventoryContext += `
🛒 PRODUCTOS EN VENTA (con stock):
${products.map((p: any) => `- [${p.product_name}:${p.id}] (Stock: ${p.stock})${p.description ? ' - ' + p.description : ''}`).join('\n')}

💡 Para mencionar el precio de un producto, usa: [PRODUCT_PRICE:ID]
   Ejemplo: "El [Toner M477:5066] está en [PRODUCT_PRICE:5066]"
`
            }

            if (inventoryContext) {
                inventoryContext += `
⚠️ INSTRUCCIONES SOBRE INVENTARIO:
1. USA el formato [nombre:ID] cuando menciones estos productos/servicios
2. Para precios, usa [PRODUCT_PRICE:ID]
3. Si el usuario pregunta por algo que NO está en esta lista, usa la herramienta search_products
4. [IMPORTANTE] Solo menciona lo relevante para la conversación actual.
`
            }
        } catch (e) {
            console.error("!!! [ERROR] Error al obtener inventario:", e)
        }
    } else {
        console.log("--- [INVENTARIO] Omitido (saludo simple o sin intención de producto)")
    }

    const finalSystemPrompt = `${systemPromptBase}\n\n${dateContext}\n\n${toneAdjustment}\n\n${inventoryContext}\n\n${bookingInstruction}\n\n${companyContext}\n\n${businessHoursContext}\n\n${placeholderInstruction}\n\nCONTEXTO RECUPERADO:\n${ragContext}`

    // 2. Build Messages Array (Deduplicated History)
    const seenMsgs = new Set<string>();
    const deduplicatedHistory = history.filter(m => {
        const key = `${m.message_type}:${m.content.trim()}`;
        if (seenMsgs.has(key)) return false;
        seenMsgs.add(key);
        return true;
    });

    const messages: any[] = [
        { role: 'system', content: finalSystemPrompt },
        ...deduplicatedHistory.map(m => ({
            role: m.message_type === 'human' ? 'user' : 'assistant',
            content: m.content
        })),
        { role: 'user', content: currentMessage }
    ]

    // GPT-5-nano-2025-08-07 (80% cheaper, requires Responses API)
    const TARGET_MODEL = edgeConfig?.llm_model || "gpt-5-nano-2025-08-07";
    const MAX_TOKENS = edgeConfig?.max_tokens || 2000;
    const TEMPERATURE = edgeConfig?.temperature || 0.7;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

    console.log("Sending to LLM...", {
        historyLength: deduplicatedHistory.length,
        originalHistory: history.length,
        model: TARGET_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        inventoryInjected: inventoryContext.length > 0
    })

    // 3. Run Loop with Responses API
    let turns = 0
    let conversationMessages = [...messages];

    // Initial call to Responses API
    let responseData = await callResponsesAPI(TARGET_MODEL, OPENAI_API_KEY, conversationMessages, toolsDefinition, { temperature: TEMPERATURE, max_tokens: MAX_TOKENS });

    // Handle tool calls in a loop
    while (responseData.tool_calls && responseData.tool_calls.length > 0 && turns < 5) {
        turns++;

        // Add assistant message with tool calls
        conversationMessages.push({
            role: 'assistant',
            content: responseData.content || '',
            tool_calls: responseData.tool_calls
        });

        // Execute each tool
        for (const toolCall of responseData.tool_calls) {
            const fnName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`Executing Tool: ${fnName}`, args);

            let result = "";
            if (fnName === 'search_products') {
                result = await searchProducts(supabase, userId, args.query);
            } else if (fnName === 'create_appointment') {
                result = await createAppointment(
                    supabase,
                    userId,
                    { name: contactInfo.full_name, phone: contactInfo.phone_number, id: contactInfo.id },
                    args.start_time,
                    args.service_id,
                    args.notes || ""
                );
            } else {
                result = "Herramienta no encontrada.";
            }

            // Add tool result
            conversationMessages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: fnName,
                content: result
            });
        }

        // Call API again with tool results
        responseData = await callResponsesAPI(TARGET_MODEL, OPENAI_API_KEY, conversationMessages, toolsDefinition, { temperature: TEMPERATURE, max_tokens: MAX_TOKENS });
    }

    return responseData.content || "";
}


export async function extractTaskFromMessage(text: string): Promise<{
    title: string,
    description: string,
    due_date: string,
    reminder_days: number,
    reminder_hours: number
} | null> {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
    const now = new Date();

    const systemPrompt = `
Eres un asistente experto en extracción de tareas.
Tu objetivo es analizar un mensaje del usuario y extraer una tarea estructurada.
FECHA ACTUAL: ${now.toISOString()} (${now.toLocaleDateString('es-MX', { weekday: 'long' })})

Extrae:
- title: Título corto de la tarea
- description: Detalles adicionales (si hay)
- due_date: Fecha y hora de vencimiento formato ISO 8601 (Ej: 2024-05-20T10:00:00). Si no dice hora, asume 09:00 AM del día mencionado.
- reminder_days: Días antes para recordar (default 1)
- reminder_hours: Horas antes para recordar (default 2)

Si no hay fecha explícita, asume "mañana a las 9 AM".
Responde SOLO con el JSON válido. Sin markdown.
`
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
    ];

    try {
        const responseData = await callResponsesAPI("gpt-4o-mini", OPENAI_API_KEY, messages, [])
        const content = responseData.content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(content);
    } catch (e) {
        console.error("Task extraction failed:", e);
        return null;
    }
}

// Helper function to call Responses API
async function callResponsesAPI(model: string, apiKey: string, messages: any[], tools: any[], options: any = {}) {
    const body: any = {
        model: model,
        messages: messages,
        tools: tools,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("API Error:", error);
        throw new Error(`API failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract content and tool_calls from standard Chat Completions format
    const message = data.choices?.[0]?.message;
    return {
        content: message?.content || "",
        tool_calls: message?.tool_calls || null
    };
}
