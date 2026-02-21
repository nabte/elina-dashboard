/**
 * ELINA V5 - Product Description Enhancer
 *
 * Mejora/embellece descripciones de productos para presentación al cliente
 */

import type { Product } from '../config/types.ts'

/**
 * Mejora la descripción de un producto usando el LLM
 * Solo mejora si la descripción es simple/corta
 */
export async function enhanceProductDescription(
    product: Product,
    openrouterKey: string
): Promise<string | null> {
    const originalDesc = product.description || ''

    // Si no hay descripción, retornar null
    if (!originalDesc || originalDesc.trim().length === 0) {
        return null
    }

    // Si la descripción ya es larga y detallada (>150 chars), no mejorar
    if (originalDesc.length > 150) {
        console.log(`   - Description already detailed (${originalDesc.length} chars), skipping enhancement`)
        return null
    }

    console.log(`   - Enhancing description for product ${product.id}`)

    try {
        const prompt = `Eres un experto en redacción de descripciones de productos para e-commerce.

PRODUCTO:
- Nombre: ${product.productName}
- Descripción actual: ${originalDesc}
${product.price ? `- Precio: $${product.price}` : ''}
${product.sku ? `- SKU: ${product.sku}` : ''}

TAREA:
Reescribe la descripción de este producto de forma más atractiva, profesional y persuasiva para un cliente.

REGLAS CRÍTICAS:
1. Máximo 2-3 oraciones (100-150 caracteres)
2. Resalta beneficios, no solo características
3. Usa lenguaje natural y cercano
4. NO inventes características que no están en la descripción original
5. NO agregues información falsa
6. Si la descripción original ya está bien, déjala igual o mejórala ligeramente
7. NO uses emojis
8. Escribe en español mexicano casual pero profesional

Responde SOLO con la descripción mejorada, sin explicaciones adicionales.`

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterKey}`,
                'HTTP-Referer': 'https://elina.ai',
                'X-Title': 'ELINA V5',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-haiku', // Modelo rápido y económico
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 200
            })
        })

        if (!response.ok) {
            console.error(`   - Error enhancing description: ${response.statusText}`)
            return null
        }

        const data = await response.json()
        const enhancedDesc = data.choices[0]?.message?.content?.trim()

        if (!enhancedDesc) {
            return null
        }

        console.log(`   ✅ Enhanced: "${originalDesc}" -> "${enhancedDesc}"`)
        return enhancedDesc

    } catch (error) {
        console.error(`   - Error enhancing description: ${error.message}`)
        return null
    }
}

/**
 * Formatea FAQs de un producto para incluir en el contexto
 */
export function formatProductFAQs(product: Product, faqData?: any): string {
    if (!faqData || !Array.isArray(faqData) || faqData.length === 0) {
        return ''
    }

    let formatted = `\n📋 **FAQs - ${product.productName}**:\n`

    faqData.forEach((item: any, index: number) => {
        if (item.question && item.answer) {
            formatted += `\nP${index + 1}: ${item.question}\n`
            formatted += `R: ${item.answer}\n`
        }
    })

    return formatted
}

/**
 * Obtiene la mejor descripción disponible para un producto
 * Prioridad: enhanced_description > description
 */
export function getBestDescription(product: any): string {
    // Si tiene enhanced_description, usarla
    if (product.enhanced_description && product.enhanced_description.trim().length > 0) {
        return product.enhanced_description
    }

    // Fallback a descripción normal
    return product.description || ''
}
