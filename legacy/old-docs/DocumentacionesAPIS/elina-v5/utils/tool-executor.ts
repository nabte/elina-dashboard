/**
 * ELINA V5 - Tool Executor
 * 
 * Ejecuta las llamadas a herramientas (tool calls) del LLM
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, ToolCall, ToolResult } from '../config/types.ts'
import { buscarProductos, agendarCita, consultarDisponibilidad } from './tools.ts'
import { cacheProductsMentioned } from './product-cache.ts'

/**
 * Ejecuta una lista de tool calls y devuelve los resultados
 */
export async function executeToolCalls(
    supabase: SupabaseClient,
    config: AccountConfig,
    contactId: number,
    toolCalls: ToolCall[]
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
                    const products = await buscarProductos(
                        supabase,
                        config.userId,
                        functionArgs.query,
                        functionArgs.limit || 5
                    )

                    // 🔥 CACHEAR productos mencionados para follow-up questions
                    if (products.length > 0) {
                        // No await para no bloquear la respuesta
                        cacheProductsMentioned(supabase, config.userId, contactId, products)
                            .catch(err => console.error(`⚠️ [CACHE] Failed to cache products: ${err.message}`))
                    }

                    result = {
                        products: products.map(p => {
                            // Usar enhanced_description si existe, sino description normal
                            const bestDescription = p.enhanced_description || p.description

                            // Formatear FAQs si existen
                            let faqText = ''
                            if (p.faq && Array.isArray(p.faq) && p.faq.length > 0) {
                                faqText = '\nFAQs:\n' + p.faq.map((item: any, idx: number) =>
                                    `${idx + 1}. ${item.question}\n   → ${item.answer}`
                                ).join('\n')
                            }

                            return {
                                id: p.id,
                                name: p.product_name,
                                price: p.price,
                                stock: p.stock,
                                description: bestDescription,
                                media_url: p.media_url,
                                benefits: p.benefits || null,
                                usage_instructions: p.usage_instructions || null,
                                faqs: faqText || null
                            }
                        }),
                        count: products.length
                    }
                    break

                case 'consultar_disponibilidad':
                    result = await consultarDisponibilidad(
                        supabase,
                        config.userId,
                        functionArgs.date
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
                        functionArgs.notes
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
