/**
 * ELINA V5 - Product Placeholders System
 * 
 * Maneja el reemplazo de placeholders de productos y generación de cotizaciones
 * Basado en la lógica original de n8n V4
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Product, QuoteItem, PlaceholderResult } from '../config/types.ts'

/**
 * Procesa el texto del agente para reemplazar placeholders y detectar cotizaciones
 */
export async function processPlaceholders(
    supabase: SupabaseClient,
    userId: string,
    text: string
): Promise<PlaceholderResult> {
    let finalText = text

    // 1. Extraer IDs de productos
    // Regex: Busca [CUALQUIER_COSA:NUMERO]
    const placeholderRegex = /\[[^\]]*?(\d+)\]/g
    const matches = [...text.matchAll(placeholderRegex)]
    const productIds = [...new Set(matches.map(m => parseInt(m[1], 10)))].filter(id => !isNaN(id))

    if (productIds.length === 0) {
        return {
            finalText,
            productIds: [],
            productsMap: {},
            shouldGenerateQuote: false,
            quoteItems: []
        }
    }

    // 2. Obtener productos de la DB
    const { data: products, error } = await supabase
        .rpc('get_products_by_ids', {
            p_user_id: userId,
            p_product_ids: productIds
        })

    if (error || !products) {
        console.error(`❌ [PLACEHOLDERS] Error fetching products: ${error?.message}`)
        return {
            finalText, // Devolver texto original si falla
            productIds,
            productsMap: {},
            shouldGenerateQuote: false,
            quoteItems: []
        }
    }

    // Crear mapa de productos para búsqueda rápida
    const productMap: Record<string, Product> = {}
    products.forEach((p: any) => {
        productMap[String(p.id)] = {
            id: p.id,
            productName: p.product_name,
            price: Number(p.price),
            stock: p.stock,
            description: p.description,
            mediaUrl: p.media_url,
            productType: p.product_type
        }
    })

    // 3. Reemplazar Placeholders Técnicos
    const techRegex = /\[PRODUCT_(\w+):(\d+)\]/g
    finalText = finalText.replace(techRegex, (fullMatch, field, idStr) => {
        const product = productMap[idStr]
        if (!product) return fullMatch

        switch (field.toUpperCase()) {
            case 'NAME': return product.productName
            case 'PRICE': return `$${product.price.toFixed(2)}`
            case 'URL': return product.mediaUrl || ''
            case 'MEDIA': return product.mediaUrl || '' // Alias para URL de media
            case 'STOCK': return String(product.stock)
            case 'DESC': return product.description || ''
            default: return fullMatch
        }
    })

    // 4. Limpiar Placeholders "Sucios" (IA hallucination: [105X:7305])
    // Reemplaza [CUALQUIER_TEXTO:ID] por el nombre real del producto
    const messRegex = /\[([^\]]+):(\d+)\]/g
    finalText = finalText.replace(messRegex, (fullMatch, content, idStr) => {
        const product = productMap[idStr]
        if (!product) return fullMatch

        // Si es un placeholder técnico ya procesado (o que parezca uno), ignorarlo
        if (content.startsWith('PRODUCT_')) return fullMatch

        return product.productName
    })

    // 5. Detectar necesidad de cotización
    const shouldGenerateQuote = detectQuoteNeed(text, productIds.length)

    // 6. Generar items de cotización si es necesario
    const quoteItems: QuoteItem[] = []
    if (shouldGenerateQuote) {
        // Extraer cantidades del texto (simple heuristic)
        // Busca patrones como "2 unidades de [PROD:123]" o "x3 [PROD:123]"
        // Esta es una simplificación, la lógica real puede ser más compleja
        productIds.forEach(id => {
            const product = productMap[String(id)]
            if (product) {
                quoteItems.push({
                    product_id: product.id,
                    product_name: product.productName,
                    quantity: 1, // Default a 1 por ahora
                    price: product.price,
                    subtotal: product.price
                })
            }
        })
    }

    // 7. Calcular totales (si está en el texto)
    // TODO: Implementar lógica de cálculo de totales si es necesario en el texto final

    return {
        finalText,
        productIds,
        productsMap: productMap,
        shouldGenerateQuote,
        quoteItems
    }
}

/**
 * Detecta si se debe generar una cotización basado en reglas
 */
function detectQuoteNeed(text: string, productCount: number): boolean {
    const lowerText = text.toLowerCase()

    // Keywords positivas
    const quoteKeywords = [
        'cotización', 'cotizacion', 'presupuesto',
        'generar pdf', 'enviar pdf', 'formalizar', 'documento'
    ]
    const hasKeyword = quoteKeywords.some(k => lowerText.includes(k))

    // Keywords negativas
    const negativeKeywords = [
        'no quiero', 'no necesito', 'solo ver',
        'consultar', 'solo pregunto'
    ]
    const hasNegative = negativeKeywords.some(k => lowerText.includes(k))

    if (hasNegative) return false

    // Regla 1: Muchos productos (>= 3) -> Asumir cotización
    if (productCount >= 3) return true

    // Regla 2: Petición explícita
    if (productCount > 0 && hasKeyword) return true

    return false
}
