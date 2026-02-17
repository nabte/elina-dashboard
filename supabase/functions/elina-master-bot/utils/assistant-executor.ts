
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccountConfig } from '../config/types.ts'
import { IntentResult } from '../intent/detector.ts'

export async function runAssistantMode(
    supabase: SupabaseClient,
    config: AccountConfig,
    message: string,
    intent: IntentResult,
    context: any
): Promise<Response> {
    console.log(`🎩 [ASSISTANT_MODE] Processing message from Owner: ${config.contactPhone}`)

    // 1. Define Tools for Assistant
    const tools = [
        {
            type: 'function',
            function: {
                name: 'create_task',
                description: 'Crea una tarea personal o recordatorio para el dueño del negocio.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título o descripción de la tarea' },
                        due_date: { type: 'string', description: 'Fecha y hora de vencimiento en formato ISO (YYYY-MM-DDTHH:mm:ss)' },
                        reminder_days: { type: 'number', description: 'Días antes para recordar (default: 1)' },
                        reminder_hours: { type: 'number', description: 'Horas antes para recordar (default: 2)' }
                    },
                    required: ['title', 'due_date']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_agenda',
                description: 'Obtiene las citas y tareas pendientes para hoy o una fecha específica.',
                parameters: {
                    type: 'object',
                    properties: {
                        date: { type: 'string', description: 'Fecha a consultar (YYYY-MM-DD). Default: hoy.' }
                    }
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'query_business_data',
                description: 'Busca información sobre el negocio en la base de datos de conocimiento (RAG).',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'La pregunta o consulta sobre el negocio.' }
                    },
                    required: ['query']
                }
            }
        }
    ]

    // 2. Prepare Conversation History
    const history = context.recentMessages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
    }))

    // 3. System Prompt
    const systemPrompt = `Eres Elina, la Asistente Personal Ejecutiva del dueño del negocio.
    
    TUS OBJETIVOS PROPIOS:
    1. Gestionar la agenda y tareas del dueño.
    2. Responder consultas sobre el estado del negocio usando RAG.
    3. Ser proactiva recordando pendientes.

    INFORMACIÓN ACTUAL:
    - Fecha/Hora: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
    - Usuario: ${context.contact?.full_name || 'Jefe'}

    ESTILO:
    - Profesional, eficiente y directo.
    - Confirmas acciones brevemente ("Listo, tarea agendada").
    - Si te piden algo fuera de tu alcance, acláralo.

    IMPORTANTE:
    - Si el usuario dice "recuérdame X para Y", usa 'create_task'.
    - Si pregunta "¿qué tengo hoy?", usa 'get_agenda'.
    - Si pregunta sobre política de precios o servicios, usa 'query_business_data'.
    `

    // 4. Call LLM
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Use powerful model for assistant
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history,
                    { role: 'user', content: message }
                ],
                tools: tools,
                tool_choice: 'auto',
                temperature: 0.3
            })
        })

        const data = await response.json()
        const choice = data.choices[0]
        const messageResponse = choice.message

        // 5. Build Response Object (compatible with Elina V5 return format)
        let finalResponse = {
            text: messageResponse.content || '',
            toolCalls: messageResponse.tool_calls || [],
            metadata: {
                model: 'gpt-4o',
                tokensUsed: data.usage?.total_tokens
            }
        }

        return finalResponse

    } catch (error) {
        console.error('❌ [ASSISTANT_MODE] LLM Error:', error)
        throw error
    }
}
