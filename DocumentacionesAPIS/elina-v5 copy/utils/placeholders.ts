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
            case 'PRICE': return product.price.toFixed(2)
            case 'URL': return product.mediaUrl || ''
            case 'MEDIA': return product.mediaUrl || '' // Alias para URL de media
            case 'STOCK': return String(product.stock)
            case 'DESC': return product.description || ''
            default: return fullMatch
        }
    })

    // 4. Limpiar Placeholders "Sucios" (IA hallucination: [105X:7305])
    const messRegex = /\[([^\]]+):(\d+)\]/g
    finalText = finalText.replace(messRegex, (fullMatch, content, idStr) => {
        const product = productMap[idStr]
        if (!product) return fullMatch

        // CRITICAL FIX: Resolve [PRODUCT_MEDIA:ID] that might have been injected by CARD
        if (content === 'PRODUCT_MEDIA') {
            return product.mediaUrl || ''
        }

        if (content.startsWith('PRODUCT_') || content.startsWith('QUOTE_')) return fullMatch
        return product.productName
    })

    // ---------------------------------------------------------
    // NUEVO: CÁLCULOS MATEMÁTICOS DETERMINISTAS (ANTI-ALUCINACIÓN)
    // ---------------------------------------------------------

    let runningTotal = 0
    let hasCalculations = false

    // 1. Procesar Items de Cotización: [QUOTE_ITEM:ID:QTY]
    // Ejemplo: [QUOTE_ITEM:101:3] -> "3x Toner TN-1000 ($150.00) = $450.00"
    const quoteItemRegex = /\[QUOTE_ITEM:(\d+):(\d+)\]/g
    finalText = finalText.replace(quoteItemRegex, (match, idStr, qtyStr) => {
        const product = productMap[idStr]
        const quantity = parseInt(qtyStr, 10)

        if (!product || isNaN(quantity)) return match

        const subtotal = product.price * quantity
        runningTotal += subtotal
        hasCalculations = true

        // Formato de salida para la línea de item
        return `• ${quantity}x *${product.productName}* ($${product.price.toFixed(2)}) = *$${subtotal.toFixed(2)}*`
    })

    // 2. Procesar Total General: [QUOTE_TOTAL]
    // Ejemplo: [QUOTE_TOTAL] -> "💰 TOTAL: $450.00"
    if (hasCalculations) {
        finalText = finalText.replace(/\[QUOTE_TOTAL\]/g, () => {
            return `\n💰 *TOTAL A PAGAR: $${runningTotal.toFixed(2)}*`
        })
    }

    // Si la IA puso [QUOTE_TOTAL] pero no hubo items (error de uso), lo borramos o ponemos 0
    finalText = finalText.replace(/\[QUOTE_TOTAL\]/g, '')

    // ---------------------------------------------------------

    return {
        finalText,
        productIds,
        productsMap: productMap,
        shouldGenerateQuote: hasCalculations, // Si calculamos, implícitamente es una cotización
        quoteItems: [] // Ya no necesitamos esto explícito si el texto ya lo trae renderizado
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

/**
 * Reemplaza el placeholder [APPOINTMENT_CALENDAR_LINK] con la URL real del calendario
 */
export function replaceAppointmentCalendarLink(text: string, slug?: string): string {
    if (!slug) return text

    const calendarUrl = `https://elinaia.com.mx/${slug}`
    return text.replace(/\[APPOINTMENT_CALENDAR_LINK\]/g, calendarUrl)
}
