/**
 * ELINA V5 - Tool Executor
 * 
 * Ejecuta las llamadas a herramientas (tool calls) del LLM
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, ToolCall, ToolResult } from '../config/types.ts'
import { buscarProductos, agendarCita, consultarDisponibilidad } from './tools.ts'

/**
 * Ejecuta una lista de tool calls y devuelve los resultados
 */
export async function executeToolCalls(
    supabase: SupabaseClient,
    config: AccountConfig,
    contactId: number,
    toolCalls: ToolCall[],
    conversationState?: any  // ← Nuevo parámetro
): Promise<ToolResult[]> {
    console.log(`🔧 [TOOLS] Executing ${toolCalls.length} tool call(s)`)

    const results: ToolResult[] = []

    for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        console.log(`   - Calling: ${functionName}`, functionArgs)

        try {
            let result: any

            switch (functionName) {
                case 'buscar_productos':
                    const searchResult = await buscarProductos(
                        supabase,
                        config.userId,
                        functionArgs.query,
                        functionArgs.limit || 5
                    )

                    // Handle new structured response format
                    if (searchResult.status === 'ERROR' || searchResult.status === 'NOT_FOUND') {
                        result = {
                            status: searchResult.status,
                            message: searchResult.message,
                            products: []
                        }
                    } else {
                        // SUCCESS case - combine exact matches and alternatives
                        const allProducts = [
                            ...(searchResult.exact_matches || []),
                            ...(searchResult.suggested_alternatives || [])
                        ]

                        // Separate services for special formatting
                        const services = allProducts.filter(p => p.product_type === 'service')
                        const physicalProducts = allProducts.filter(p => p.product_type !== 'service')

                        result = {
                            status: searchResult.status,
                            message: searchResult.message,
                            exact_match_found: searchResult.exact_match_found,
                            has_alternatives: searchResult.has_alternatives,
                            products: allProducts,
                            services: services,  // Store for code-based formatting
                            physicalProducts: physicalProducts,
                            // Pass formatting hints to agent
                            formatting_hint: searchResult.exact_matches?.map(p => p.formatting_hint).join('\n') || ''
                        }
                    }
                    break

                    break

                case 'consultar_disponibilidad':
                    result = await consultarDisponibilidad(
                        supabase,
                        config.userId,
                        functionArgs.date,
                        config.slug // Pasar el slug para generar link
                    )
                    break

                case 'agendar_cita':
                    result = await agendarCita(
                        supabase,
                        config.userId,
                        contactId,
                        functionArgs.date,
                        functionArgs.time,
                        functionArgs.service_id,
                        functionArgs.notes,
                        conversationState  // ← Pasar el estado
                    )
                    break

                case 'consultar_mis_citas':
                    const { consultarMisCitas } = await import('./tools.ts')
                    result = await consultarMisCitas(
                        supabase,
                        config.userId,
                        contactId
                    )
                    break

                case 'modificar_cita':
                    const { modificarCita } = await import('./tools.ts')
                    result = await modificarCita(
                        supabase,
                        config.userId,
                        contactId,
                        functionArgs.appointment_id,
                        functionArgs.new_date,
                        functionArgs.new_time
                    )
                    break

                default:
                    console.warn(`⚠️ [TOOLS] Unknown tool: ${functionName}`)
                    result = { error: `Unknown tool: ${functionName}` }
            }

            results.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: functionName,
                content: JSON.stringify(result)
            })

            console.log(`   ✅ ${functionName} completed`)

        } catch (error) {
            console.error(`   ❌ Error executing ${functionName}:`, error)
            results.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: functionName,
                content: JSON.stringify({
                    error: error instanceof Error ? error.message : String(error)
                })
            })
        }
    }

    return results
}
