/**
 * AGENT.TS - Orquestador Principal del Agente Conversacional
 * 
 * Este archivo implementa el motor de IA conversacional de ELINA.
 * Es el corazón del sistema de ventas, asistencia y agendamiento.
 * 
 * Características:
 * - Memoria conversacional real (usa chat_history)
 * - Logging estructurado de cada paso
 * - Configuración dinámica multi-tenant
 * - Sistema de herramientas (tools) extensible
 * - Streaming de respuestas para velocidad
 */

import OpenAI from "https://esm.sh/openai@4.51.0"
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// TIPOS
// ============================================================================

export interface AgentConfig {
    userId: string
    contactId: string // Changed from number to string for flexibility
    sessionId: string

    // Configuración LLM
    model: string
    temperature: number
    maxTokens: number

    // System Prompts
    basePrompt: string
    personalityContext: string
    placeholderInstructions: string
    appointmentRules: string

    // Contexto
    companyInfo: any
    contactInfo: any
    ragContext: string
    businessCapabilities: any | null // Business type and capabilities

    // Herramientas habilitadas
    enabledTools: string[]
}

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    name?: string
    tool_call_id?: string
    tool_calls?: any[]
}

export interface AgentResponse {
    success: boolean
    output: string
    toolCalls: any[]
    error?: string
    metadata: {
        tokensUsed: number
        duration: number
        toolsExecuted: string[]
    }
}

// ============================================================================
// LOGGER
// ============================================================================

class AgentLogger {
    private supabase: SupabaseClient
    private userId: string
    private contactId: string
    private sessionId: string
    private logs: any[] = []

    constructor(supabase: SupabaseClient, userId: string, contactId: string, sessionId: string) {
        this.supabase = supabase
        this.userId = userId
        this.contactId = contactId
        this.sessionId = sessionId
    }

    private async log(level: 'debug' | 'info' | 'warn' | 'error', stepName: string, message: string, data?: any, durationMs?: number) {
        const logEntry = {
            user_id: this.userId,
            contact_id: this.contactId,
            session_id: this.sessionId,
            level,
            step_name: stepName,
            message,
            data: data || null,
            duration_ms: durationMs ? Math.round(durationMs) : null,
            metadata: {
                timestamp: new Date().toISOString()
            }
        }

        // Guardar en memoria para batch insert
        this.logs.push(logEntry)

        // También log a console para debugging en tiempo real
        const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level]
        console.log(`${emoji} [${stepName}] ${message}`, data ? JSON.stringify(data).slice(0, 200) : '')
    }

    debug(stepName: string, message: string, data?: any) {
        return this.log('debug', stepName, message, data)
    }

    info(stepName: string, message: string, data?: any, durationMs?: number) {
        return this.log('info', stepName, message, data, durationMs)
    }

    warn(stepName: string, message: string, data?: any) {
        return this.log('warn', stepName, message, data)
    }

    error(stepName: string, message: string, data?: any) {
        return this.log('error', stepName, message, data)
    }

    async flush() {
        if (this.logs.length === 0) return

        try {
            const { error } = await this.supabase
                .from('agent_execution_logs')
                .insert(this.logs)

            if (error) {
                console.error('❌ Error guardando logs:', error)
            } else {
                console.log(`✅ ${this.logs.length} logs guardados exitosamente`)
            }
        } catch (e) {
            console.error('❌ Excepción guardando logs:', e)
        }

        this.logs = []
    }
}

// ============================================================================
// CONVERSATIONAL MEMORY
// ============================================================================

async function loadConversationHistory(
    supabase: SupabaseClient,
    contactId: string,
    logger: AgentLogger,
    maxMessages: number = 20
): Promise<AgentMessage[]> {
    const start = performance.now()

    logger.debug('load_history', 'Cargando historial de conversación', { contactId, maxMessages })

    const { data: history, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(maxMessages)

    if (error) {
        logger.error('load_history', 'Error cargando historial', { error })
        return []
    }

    // Convertir a formato OpenAI (más reciente primero, luego reverse)
    const messages: AgentMessage[] = (history || [])
        .reverse()
        .flatMap(row => {
            const msgs: AgentMessage[] = []

            if (row.user_text) {
                msgs.push({
                    role: 'user',
                    content: row.user_text
                })
            }

            if (row.ai_text) {
                msgs.push({
                    role: 'assistant',
                    content: row.ai_text
                })
            }

            return msgs
        })

    const duration = performance.now() - start
    logger.info('load_history', `Historial cargado: ${messages.length} mensajes`, { count: messages.length }, duration)

    return messages
}

// ============================================================================
// TOOLS SYSTEM
// ============================================================================

interface Tool {
    name: string
    description: string
    parameters: any
    execute: (args: any, context: any) => Promise<any>
}

const AVAILABLE_TOOLS: Record<string, Tool> = {
    buscar_productos: {
        name: 'buscar_productos',
        description: 'Busca productos en el inventario del negocio. Usa esta herramienta cuando el usuario pregunte por productos, precios, disponibilidad o características.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Término de búsqueda (nombre, código, categoría)'
                }
            },
            required: ['query']
        },
        execute: async (args, context) => {
            const { searchProducts } = await import('./tools.ts')
            return await searchProducts(context.supabase, context.userId, args.query)
        }
    },

    consultar_historial: {
        name: 'consultar_historial',
        description: 'Consulta el historial de conversaciones previas con este cliente. Útil cuando el usuario hace referencia a conversaciones anteriores.',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Número de mensajes a consultar (default: 10)'
                }
            }
        },
        execute: async (args, context) => {
            const limit = args.limit || 10
            const { data } = await context.supabase
                .from('chat_history')
                .select('user_text, ai_text, created_at')
                .eq('contact_id', context.contactId)
                .order('created_at', { ascending: false })
                .limit(limit)

            return data || []
        }
    },

    agendar_cita: {
        name: 'agendar_cita',
        description: 'Agenda una cita para el cliente. Requiere fecha, hora y servicio.',
        parameters: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'Fecha en formato YYYY-MM-DD'
                },
                time: {
                    type: 'string',
                    description: 'Hora en formato HH:MM'
                },
                service: {
                    type: 'string',
                    description: 'Nombre del servicio'
                }
            },
            required: ['date', 'time', 'service']
        },
        execute: async (args, context) => {
            const { createAppointment } = await import('./tools.ts')
            return await createAppointment(
                context.supabase,
                context.userId,
                context.contactId,
                args.date,
                args.time,
                args.service
            )
        }
    }
}

function getToolDefinitions(enabledTools: string[]): any[] {
    return enabledTools
        .filter(name => AVAILABLE_TOOLS[name])
        .map(name => {
            const tool = AVAILABLE_TOOLS[name]
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            }
        })
}

// ============================================================================
// MAIN AGENT ORCHESTRATOR
// ============================================================================

export async function runConversationalAgent(
    supabase: SupabaseClient,
    config: AgentConfig,
    currentMessage: string
): Promise<AgentResponse> {
    const startTime = performance.now()
    const logger = new AgentLogger(supabase, config.userId, config.contactId, config.sessionId)

    logger.info('agent_start', 'Iniciando agente conversacional', {
        model: config.model,
        temperature: config.temperature,
        enabledTools: config.enabledTools
    })

    try {
        // 1. Cargar historial conversacional
        const history = await loadConversationHistory(supabase, config.contactId, logger)

        // 2. Construir system prompt
        const systemPrompt = buildSystemPrompt(config, logger)

        // 3. Preparar mensajes para OpenAI
        const messages: AgentMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: currentMessage }
        ]

        logger.debug('messages_prepared', 'Mensajes preparados para OpenAI', {
            totalMessages: messages.length,
            historySize: history.length
        })

        // 4. Configurar herramientas
        const tools = getToolDefinitions(config.enabledTools)

        // 5. Llamar a OpenAI
        const openai = new OpenAI({
            apiKey: Deno.env.get("OPENAI_API_KEY")!
        })

        logger.info('openai_call', 'Llamando a OpenAI', {
            model: config.model,
            toolsCount: tools.length
        })

        const callStart = performance.now()

        // Handle parameter differences between models (GPT-4 vs GPT-5/o1)
        const isNewModel = config.model.includes('gpt-5') || config.model.includes('o1') || config.model.includes('o3');
        const completionParams: any = {
            model: config.model,
            messages: messages as any,
            temperature: config.temperature,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined
        };

        if (isNewModel) {
            completionParams.max_completion_tokens = config.maxTokens;
            completionParams.temperature = 1; // Reasoning models only support temp=1
        } else {
            completionParams.max_tokens = config.maxTokens;
            // Keep configured temperature for older models
        }

        const response = await openai.chat.completions.create(completionParams)

        const callDuration = performance.now() - callStart
        logger.info('openai_response', 'Respuesta recibida de OpenAI', {
            tokensUsed: response.usage?.total_tokens,
            finishReason: response.choices[0]?.finish_reason
        }, callDuration)

        const choice = response.choices[0]
        const message = choice.message

        // 6. Procesar tool calls si existen
        const toolsExecuted: string[] = []
        let finalOutput = message.content || ''

        if (message.tool_calls && message.tool_calls.length > 0) {
            logger.info('tools_detected', `Detectadas ${message.tool_calls.length} llamadas a herramientas`)

            for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function.name
                const toolArgs = JSON.parse(toolCall.function.arguments)

                logger.info('tool_execute', `Ejecutando herramienta: ${toolName}`, { args: toolArgs })

                const tool = AVAILABLE_TOOLS[toolName]
                if (tool) {
                    const toolStart = performance.now()
                    try {
                        const result = await tool.execute(toolArgs, {
                            supabase,
                            userId: config.userId,
                            contactId: config.contactId
                        })

                        const toolDuration = performance.now() - toolStart
                        logger.info('tool_success', `Herramienta ${toolName} ejecutada`, { result }, toolDuration)
                        toolsExecuted.push(toolName)

                        // Aquí podrías hacer una segunda llamada a OpenAI con el resultado
                        // Por ahora, simplificamos retornando el mensaje original
                    } catch (error) {
                        logger.error('tool_error', `Error ejecutando ${toolName}`, { error })
                    }
                }
            }
        }

        // 7. Guardar logs
        await logger.flush()

        const totalDuration = performance.now() - startTime

        return {
            success: true,
            output: finalOutput,
            toolCalls: message.tool_calls || [],
            metadata: {
                tokensUsed: response.usage?.total_tokens || 0,
                duration: totalDuration,
                toolsExecuted
            }
        }

    } catch (error) {
        logger.error('agent_error', 'Error en agente conversacional', { error })
        await logger.flush()

        return {
            success: false,
            output: '',
            toolCalls: [],
            error: String(error),
            metadata: {
                tokensUsed: 0,
                duration: performance.now() - startTime,
                toolsExecuted: []
            }
        }
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function buildSystemPrompt(config: AgentConfig, logger: AgentLogger): string {
    logger.debug('build_prompt', 'Construyendo system prompt')

    const now = new Date()
    const dateContext = `
FECHA/HORA ACTUAL: ${now.toLocaleString('es-MX', { timeZone: config.companyInfo.timezone || 'America/Mexico_City' })}
Día de la semana: ${now.toLocaleDateString('es-MX', { weekday: 'long' })}
`

    const companyContext = `
**INFORMACIÓN DE LA EMPRESA:**
- Sitio Web: ${config.companyInfo.website || 'No disponible'}
- Instagram: ${config.companyInfo.social_media?.instagram || 'No disponible'}
- Horario: ${config.companyInfo.work_start_hour || '09:00'} - ${config.companyInfo.work_end_hour || '18:00'}
- Dirección: ${config.companyInfo.business_address || 'No disponible'}
- Teléfono: ${config.companyInfo.business_phone || 'No disponible'}
- **DESCRIPCIÓN DEL NEGOCIO (LO QUE VENDES):** ${config.companyInfo.company_description || 'Negocio general'}
`

    const contactContext = `
**INFORMACIÓN DEL CLIENTE:**
- Nombre: ${config.contactInfo.full_name || 'Cliente'}
- Teléfono: ${config.contactInfo.phone_number || 'No disponible'}
`

    // Build capabilities context (NEW)
    const capabilitiesContext = buildCapabilitiesContextInternal(config.businessCapabilities)

    return `${config.basePrompt}

${config.personalityContext}

${dateContext}

${companyContext}

${contactContext}
${capabilitiesContext}

**CONTEXTO DINÁMICO (Citas y Promociones):**
${config.ragContext}

${config.placeholderInstructions}

${config.appointmentRules}
`.trim()
}

// Helper function to build capabilities context (internal to agent.ts)
function buildCapabilitiesContextInternal(capabilities: any | null): string {
    if (!capabilities) {
        return "\n**TU NEGOCIO:** Tipo no detectado. Usa herramientas para buscar productos/servicios.\n"
    }

    let context = "\n**🏢 TU NEGOCIO Y CAPACIDADES:**\n"

    // Productos Físicos
    if (capabilities.has_physical_products) {
        context += `- ✅ VENDES PRODUCTOS FÍSICOS (${capabilities.product_count} productos en inventario)\n`
        context += "  → Cuando pregunten por productos, DEBES usar la herramienta 'search_products'\n"
        context += "  → NUNCA inventes precios o disponibilidad\n"
    } else {
        context += "- ❌ NO VENDES PRODUCTOS FÍSICOS\n"
        context += "  → Si preguntan por productos, explica que te enfocas en servicios/citas\n"
    }

    // Servicios
    if (capabilities.has_services) {
        context += `- ✅ OFRECES SERVICIOS (${capabilities.service_count} servicios disponibles)\n`
        context += "  → Menciónalos cuando sea relevante\n"
    }

    // Citas
    if (capabilities.has_appointments) {
        context += "- ✅ PUEDES AGENDAR CITAS\n"
        context += "  → Ofrécelas SOLO si el usuario lo solicita explícitamente\n"
        context += "  → NO insistas en citas si el usuario pregunta por productos\n"
    } else {
        context += "- ❌ NO AGENDAS CITAS\n"
        context += "  → Si preguntan, explica que no manejas agenda\n"
    }

    // Tipo de Negocio
    const typeLabels: Record<string, string> = {
        'ecommerce': 'E-commerce (Venta de Productos)',
        'services_only': 'Servicios Profesionales',
        'appointments': 'Negocio Basado en Citas',
        'hybrid': 'Híbrido (Productos + Servicios)'
    }

    context += `\n**TIPO DE NEGOCIO:** ${typeLabels[capabilities.primary_business_type] || 'Híbrido'}\n`

    return context
}
