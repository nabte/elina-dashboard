/**
 * Post-procesamiento de respuestas del LLM
 * Replica la funcionalidad de n8n V4:
 * 1. Extrae IDs de productos de placeholders
 * 2. Obtiene datos reales de productos desde la DB
 * 3. Reemplaza placeholders con datos reales
 * 4. Detecta media URLs para envío posterior
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ProcessedResponse {
    text: string
    mediaUrls: string[]
    hasMedia: boolean
}

/**
 * Post-procesa la respuesta del LLM
 */
export async function postProcessResponse(
    llmOutput: string,
    userId: string,
    supabaseUrl: string,
    supabaseKey: string
): Promise<ProcessedResponse> {

    console.log('🔄 [POST-PROCESSOR] Starting post-processing...')
    console.log(`   - Original text length: ${llmOutput.length}`)

    // 1. Extraer IDs de placeholders usando regex de n8n V4
    // Detecta: [PRODUCT_NAME:7305], [105X:7305], etc.
    const placeholderRegex = /\[[^\]]*?(\d+)\]/g
    const matches = [...llmOutput.matchAll(placeholderRegex)]
    const productIds = [...new Set(matches.map(m => parseInt(m[1], 10)))].filter(id => !isNaN(id))

    console.log(`   - Found ${productIds.length} unique product IDs: ${productIds.join(', ')}`)

    if (productIds.length === 0) {
        console.log('   - No placeholders found, returning original text')
        return { text: llmOutput, mediaUrls: [], hasMedia: false }
    }

    // 2. Obtener productos reales de la DB
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`   - Fetching products from DB...`)
    const { data: products, error } = await supabase
        .rpc('get_products_by_ids', {
            p_user_id: userId,
            p_product_ids: productIds
        })

    if (error) {
        console.error('❌ [POST-PROCESSOR] Error fetching products:', error)
        return { text: llmOutput, mediaUrls: [], hasMedia: false }
    }

    if (!products || products.length === 0) {
        console.log('   - No products found in DB')
        return { text: llmOutput, mediaUrls: [], hasMedia: false }
    }

    console.log(`   - Retrieved ${products.length} products from DB`)

    // 3. Crear mapa de productos por ID
    const productMap: Record<string, any> = {}
    products.forEach((p: any) => {
        if (p && p.id) {
            productMap[String(p.id)] = p
            console.log(`   - Product ${p.id}: ${p.product_name} ($${p.price})`)
        }
    })

    let processedText = llmOutput
    const mediaUrls: string[] = []

    // 4. Reemplazar placeholders técnicos: [PRODUCT_FIELD:ID]
    const techRegex = /\[PRODUCT_(\w+):(\d+)\]/g
    let techReplacements = 0

    for (const match of [...processedText.matchAll(techRegex)]) {
        const [fullMatch, field, idStr] = match
        const product = productMap[idStr]

        if (product) {
            let replacement = fullMatch

            switch (field.toUpperCase()) {
                case 'NAME':
                    replacement = product.product_name
                    break
                case 'PRICE':
                    replacement = `$${Number(product.price).toFixed(2)}`
                    break
                case 'MEDIA':
                    if (product.media_url) {
                        mediaUrls.push(product.media_url)
                        replacement = '' // Remover del texto, se enviará como imagen
                    } else {
                        replacement = ''
                    }
                    break
                case 'STOCK':
                    const stock = product.stock
                    if (stock === -1) {
                        replacement = 'disponible'
                    } else if (stock === 0) {
                        replacement = 'agotado'
                    } else {
                        replacement = `${stock} disponibles`
                    }
                    break
                case 'DESC':
                    replacement = product.description || ''
                    break
                default:
                    console.warn(`   - Unknown placeholder field: ${field}`)
            }

            processedText = processedText.replace(fullMatch, replacement)
            techReplacements++
        }
    }

    console.log(`   - Replaced ${techReplacements} technical placeholders`)

    // 5. Limpiar placeholders sucios (ej: [105X:7305] → 665)
    // Esto maneja casos donde el LLM pone texto incorrecto antes del ID
    const messRegex = /\[([^\]]+):(\d+)\]/g
    let messReplacements = 0

    for (const match of [...processedText.matchAll(messRegex)]) {
        const [fullMatch, content, idStr] = match
        const product = productMap[idStr]
        if (product) {
            processedText = processedText.replace(fullMatch, product.product_name)
            messReplacements++
        }
    }

    console.log(`   - Cleaned ${messReplacements} messy placeholders`)

    // 6. Limpiar espacios extra y líneas vacías
    processedText = processedText
        .replace(/\s{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    // 7. Eliminar duplicados de media URLs
    const uniqueMediaUrls = [...new Set(mediaUrls)]

    console.log('✅ [POST-PROCESSOR] Post-processing complete')
    console.log(`   - Final text length: ${processedText.length}`)
    console.log(`   - Media URLs found: ${uniqueMediaUrls.length}`)

    return {
        text: processedText,
        mediaUrls: uniqueMediaUrls,
        hasMedia: uniqueMediaUrls.length > 0
    }
}
