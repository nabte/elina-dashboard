import OpenAI from "https:
import { SupabaseClient } from 'https:
import { toolsDefinition, searchProducts, createAppointment } from './tools.ts'
const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY")!,
});
function checkBusinessHours(now: Date, startHour?: string, endHour?: string, timezone?: string): boolean {
    if (!startHour || !endHour) return false 
    try {
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTime = currentHour * 60 + currentMinute
        const [startH, startM] = startHour.split(':').map(Number)
        const [endH, endM] = endHour.split(':').map(Number)
        const startTime = startH * 60 + startM
        const endTime = endH * 60 + endM
        return currentTime < startTime || currentTime > endTime
    } catch (e) {
        return false 
    }
}
export async function runAgent(
    supabase: SupabaseClient,
    userId: string,
    history: any[], 
    currentMessage: string,
    ragContext: string,
    systemPromptBase: string,
    companyInfo: any, 
    contactInfo: any, 
    isDraftPrompt: boolean = false, 
    edgeConfig: any = null 
) {
    const now = new Date();
    const dateContext = `
FECHA/HORA ACTUAL: ${now.toLocaleString('es-MX', { timeZone: companyInfo.timezone || 'America/Mexico_City' })}
Día de la semana: ${now.toLocaleDateString('es-MX', { weekday: 'long' })}
`
    const { analyzeSentiment } = await import('./context.ts')
    const sentiment = analyzeSentiment(currentMessage)
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
    const { DEFAULT_PLACEHOLDER_INSTRUCTIONS, DEFAULT_APPOINTMENT_RULES, DEFAULT_PERSONALITY_CONTEXT } = await import('../_shared/prompt-defaults.ts')
    let placeholderInstruction = DEFAULT_PLACEHOLDER_INSTRUCTIONS;
    if (!isDraftPrompt) {
        placeholderInstruction += `\n${DEFAULT_APPOINTMENT_RULES}\n`
    } else {
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
    const validSlug = (companyInfo.slug && companyInfo.slug !== 'agendar') ? companyInfo.slug : null;
    if (validSlug) {
        const bookingLink = `https:
        bookingInstruction = `
OPCIÓN DE RESERVA MANUAL (ÚNICO LINK VÁLIDO):
- Si el usuario prefiere agendar por su cuenta, ofrece ESTE enlace: ${bookingLink}
- PROHIBIDO usar el enlace genérico "/agendar". 
- Dile: "Si lo prefieres, también puedes agendar directamente aquí: ${bookingLink}"
- Si el usuario menciona que ya agendó en la web, confía en él y no insistas con horarios.
`
    } else {
        bookingInstruction = `
OPCIÓN DE RESERVA MANUAL:
- Si el proceso por chat se complica, dile al usuario que un asesor humano le contactará a la brevedad para ayudarle con su cita. NO inventes enlaces de reserva.
`
    }
    let inventoryContext = ""
    const { detectProductIntent, detectSimpleGreeting } = await import('./context.ts')
    const isSimpleGreeting = detectSimpleGreeting(currentMessage)
    const hasProductIntent = detectProductIntent(currentMessage)
    const historyHasProducts = history.some(m =>
        m.message_type === 'assistant' && /\[PRODUCT_/i.test(m.content)
    )
    const shouldInjectInventory = (hasProductIntent || historyHasProducts) && !isSimpleGreeting
    if (shouldInjectInventory) {
        try {
            const { data: services } = await supabase
                .from('products')
                .select('id, product_name, price, description, media_url')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .limit(15)
            const { data: products } = await supabase
                .from('products')
                .select('id, product_name, price, description, stock, media_url')
                .eq('user_id', userId)
                .eq('product_type', 'product')
                .gt('stock', 0) 
                .limit(20)
            if (services && services.length > 0) {
                inventoryContext += `
📋 SERVICIOS DISPONIBLES (para citas):
${services.map((s: any) => `- [${s.product_name}:${s.id}]${s.description ? ' - ' + s.description : ''}`).join('\n')}
💡 Para mencionar el precio de un servicio, usa: [PRODUCT_PRICE:ID]
   Ejemplo: "El [corte de pelo:9528] cuesta [PRODUCT_PRICE:9528]"
`
            }
            if (products && products.length > 0) {
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
            }
    } else {
        }
    const finalSystemPrompt = `${systemPromptBase}\n\n${dateContext}\n\n${toneAdjustment}\n\n${inventoryContext}\n\n${bookingInstruction}\n\n${companyContext}\n\n${businessHoursContext}\n\n${placeholderInstruction}\n\nCONTEXTO RECUPERADO:\n${ragContext}`
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
    const TARGET_MODEL = edgeConfig?.llm_model || "gpt-5-nano-2025-08-07";
    const MAX_TOKENS = edgeConfig?.max_tokens || 2000;
    const TEMPERATURE = edgeConfig?.temperature || 0.7;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
    let turns = 0
    let conversationMessages = [...messages];
    let responseData = await callResponsesAPI(TARGET_MODEL, OPENAI_API_KEY, conversationMessages, toolsDefinition, { temperature: TEMPERATURE, max_tokens: MAX_TOKENS });
    while (responseData.tool_calls && responseData.tool_calls.length > 0 && turns < 5) {
        turns++;
        conversationMessages.push({
            role: 'assistant',
            content: responseData.content || '',
            tool_calls: responseData.tool_calls
        });
        for (const toolCall of responseData.tool_calls) {
            const fnName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
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
            conversationMessages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: fnName,
                content: result
            });
        }
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
        return null;
    }
}
async function callResponsesAPI(model: string, apiKey: string, messages: any[], tools: any[], options: any = {}) {
    const body: any = {
        model: model,
        messages: messages,
        tools: tools,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
    };
    const response = await fetch("https:
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API failed: ${response.status} - ${error}`);
    }
    const data = await response.json();
    const message = data.choices?.[0]?.message;
    return {
        content: message?.content || "",
        tool_calls: message?.tool_calls || null
    };
}