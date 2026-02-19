/**
 * ELINA V5 - Text Formatter
 *
 * Formatea texto para WhatsApp con estructura clara y saltos de línea apropiados
 * Distribuye contenido entre múltiples media items (basado en n8n V4)
 */

import type { Product } from '../config/types.ts'

/**
 * Formatea texto para que sea más legible en WhatsApp
 */
export function formatTextForWhatsApp(text: string): string {
    if (!text) return ''

    let formatted = text
        // Limpiar markdown residual
        .replace(/\*\*([^*]+)\*\*/g, '*$1*') // ** a *
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links [text](url) a text

        // Asegurar espacio después de puntos seguidos de letra
        .replace(/\.([A-ZÁÉÍÓÚÑ])/g, '. $1')

        // Asegurar salto de línea después de dos puntos si sigue lista
        .replace(/:(\s*)-/g, ':\n-')
        .replace(/:(\s*)\d+\./g, ':\n$1$2.')

        // Asegurar salto antes de viñetas si no lo hay
        .replace(/([^\n])\n?-\s/g, '$1\n- ')
        .replace(/([^\n])\n?•\s/g, '$1\n• ')

        // Asegurar salto antes de números de lista
        .replace(/([^\n])\n?(\d+)\.\s/g, '$1\n$2. ')

        // Limpiar espacios múltiples
        .replace(/[ \t]{2,}/g, ' ')

        // Normalizar saltos de línea (máximo 2 seguidos)
        .replace(/\n{3,}/g, '\n\n')

        // Limpiar espacios al inicio/fin de líneas
        .split('\n')
        .map(line => line.trim())
        .join('\n')

        .trim()

    return formatted
}

/**
 * Media con caption
 */
export interface MediaWithCaption {
    productId: number
    type: 'image' | 'video'
    url: string
    caption: string
}

/**
 * NUEVA VERSIÓN: Distribuye texto entre múltiples productos con media
 *
 * Lógica basada en n8n V4 pero adaptada para trabajar con:
 * - productMedia (lista garantizada de productos con media)
 * - Placeholders en el texto ([PRODUCT_NAME:ID], etc.)
 *
 * REGLA: Máximo 3 media
 * - Si hay 1-3 productos: cada uno con su sección de texto
 * - Si hay >3 productos: primeros 2 con su sección, el 3ro con su sección + todo lo demás
 */
export function distributeTextAcrossProductMedia(
    fullText: string,
    productMedia: Array<{ productId: number; url: string; type: 'image' | 'video' }>,
    productsMap: Record<string, Product>,
    maxMedia: number = 3
): MediaWithCaption[] {
    if (productMedia.length === 0) {
        return []
    }

    const results: MediaWithCaption[] = []
    const maxMediaCount = Math.min(productMedia.length, maxMedia)

    // ============================================================================
    // ESTRATEGIA: Dividir texto por secciones de productos
    // ============================================================================

    // Detectar todos los placeholders en el texto para identificar secciones
    const productSections = extractProductSections(fullText, productMedia, productsMap)

    console.log(`   - Detected ${productSections.length} product sections in text`)

    // ============================================================================
    // DISTRIBUCIÓN: Primeros 2 individuales, el 3ro con todo lo restante
    // ============================================================================

    for (let i = 0; i < maxMediaCount; i++) {
        const media = productMedia[i]
        let caption = ''

        if (i < maxMediaCount - 1) {
            // CASO 1: Primeros N-1 productos (ej: 1ro y 2do)
            // Usar solo la sección de este producto
            const section = productSections.find(s => s.productId === media.productId)
            caption = section ? section.text : ''

        } else {
            // CASO 2: ÚLTIMO producto enviado (ej: 3ro)
            // Incluir su sección + todas las secciones restantes de productos no enviados
            const remainingSections: string[] = []

            // Agregar sección del producto actual
            const currentSection = productSections.find(s => s.productId === media.productId)
            if (currentSection) {
                remainingSections.push(currentSection.text)
            }

            // Agregar secciones de todos los productos NO enviados (del 4to en adelante)
            for (let j = i + 1; j < productMedia.length; j++) {
                const remainingMedia = productMedia[j]
                const section = productSections.find(s => s.productId === remainingMedia.productId)
                if (section) {
                    remainingSections.push(section.text)
                }
            }

            // Combinar todas las secciones restantes
            caption = remainingSections.filter(s => s).join('\n\n')
        }

        results.push({
            productId: media.productId,
            type: media.type,
            url: media.url,
            caption: formatTextForWhatsApp(caption)
        })
    }

    return results
}

/**
 * Extrae secciones de texto correspondientes a cada producto
 *
 * Busca bloques de texto que contienen placeholders de cada producto
 * Ejemplo:
 *   "Tenemos el [PRODUCT_NAME:123] por [PRODUCT_PRICE:123]..." -> sección de producto 123
 */
interface ProductSection {
    productId: number
    text: string
    startIndex: number
    endIndex: number
}

function extractProductSections(
    text: string,
    productMedia: Array<{ productId: number; url: string; type: 'image' | 'video' }>,
    productsMap: Record<string, Product>
): ProductSection[] {
    const sections: ProductSection[] = []

    // Regex para detectar cualquier placeholder de producto: [ALGO:ID]
    const placeholderRegex = /\[([^\]]+):(\d+)\]/g

    // Crear un mapa de posiciones de placeholders por producto
    const productPositions = new Map<number, number[]>()

    let match
    while ((match = placeholderRegex.exec(text)) !== null) {
        const productId = parseInt(match[2], 10)
        if (!productPositions.has(productId)) {
            productPositions.set(productId, [])
        }
        productPositions.get(productId)!.push(match.index)
    }

    // Si no hay placeholders, dividir el texto equitativamente
    if (productPositions.size === 0) {
        console.log(`   ⚠️ No placeholders found, dividing text equally`)
        return divideTextEqually(text, productMedia)
    }

    // Para cada producto con media, extraer su sección de texto
    for (let i = 0; i < productMedia.length; i++) {
        const media = productMedia[i]
        const positions = productPositions.get(media.productId)

        if (!positions || positions.length === 0) {
            // Este producto no tiene placeholders en el texto, asignar texto vacío
            sections.push({
                productId: media.productId,
                text: '',
                startIndex: 0,
                endIndex: 0
            })
            continue
        }

        // Definir los límites de la sección:
        // - Inicio: primera aparición del placeholder de este producto
        // - Fin: primera aparición del siguiente producto (o final del texto)

        const startIndex = Math.min(...positions)
        let endIndex = text.length

        // Buscar el inicio del siguiente producto
        if (i < productMedia.length - 1) {
            const nextProductId = productMedia[i + 1].productId
            const nextPositions = productPositions.get(nextProductId)
            if (nextPositions && nextPositions.length > 0) {
                endIndex = Math.min(...nextPositions)
            }
        }

        // Extraer el texto de esta sección
        const sectionText = text.substring(startIndex, endIndex).trim()

        sections.push({
            productId: media.productId,
            text: sectionText,
            startIndex,
            endIndex
        })
    }

    return sections
}

/**
 * Fallback: Divide el texto equitativamente si no hay placeholders
 */
function divideTextEqually(
    text: string,
    productMedia: Array<{ productId: number; url: string; type: 'image' | 'video' }>
): ProductSection[] {
    const sections: ProductSection[] = []
    const paragraphs = text.split('\n\n').filter(p => p.trim())

    if (paragraphs.length === 0) {
        // Si no hay párrafos, dar todo el texto al primer producto
        return [{
            productId: productMedia[0].productId,
            text: text,
            startIndex: 0,
            endIndex: text.length
        }]
    }

    // Dividir párrafos entre productos
    const parasPerProduct = Math.ceil(paragraphs.length / productMedia.length)

    for (let i = 0; i < productMedia.length; i++) {
        const start = i * parasPerProduct
        const end = Math.min(start + parasPerProduct, paragraphs.length)
        const sectionParas = paragraphs.slice(start, end)

        sections.push({
            productId: productMedia[i].productId,
            text: sectionParas.join('\n\n'),
            startIndex: 0, // No importa en este caso
            endIndex: 0
        })
    }

    return sections
}
