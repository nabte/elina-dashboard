/**
 * ELINA V5 - Text Formatter
 * 
 * Formatea texto para WhatsApp con estructura clara y saltos de línea apropiados
 */

/**
 * Formatea texto para que sea más legible en WhatsApp
 * - Asegura saltos de línea apropiados
 * - Estructura listas y párrafos
 * - Limpia espacios excesivos
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
 * Distribuye texto entre múltiples items de media (como n8n)
 * Retorna array de objetos con media_url y caption
 */
export interface MediaWithCaption {
    type: 'image' | 'video'
    url: string
    caption: string
}

export function distributeTextAcrossMedia(
    fullText: string,
    mediaUrls: Array<{ type: 'image' | 'video', url: string }>,
    maxMedia: number = 3
): MediaWithCaption[] {
    if (mediaUrls.length === 0) {
        return []
    }

    // ============================================================================
    // EXACT n8n V4 LOGIC: Extract URLs from text with regex, not from list
    // ============================================================================

    // 1. Find ALL URLs in the text using regex (like n8n V4)
    const mediaRegex = /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|mp4)/gi
    const matches = [...fullText.matchAll(mediaRegex)]

    // If no URLs found in text, return empty
    if (matches.length === 0) {
        return []
    }

    // 2. Limit to max 3 media
    const maxMediaCount = Math.min(matches.length, maxMedia)
    const results: MediaWithCaption[] = []
    let lastIndex = 0

    // 3. For each URL found in text:
    for (let i = 0; i < maxMediaCount; i++) {
        const match = matches[i]
        const url = match[0]
        const isVideo = url.toLowerCase().endsWith('.mp4')

        // Get text BEFORE this URL
        let textBefore = fullText.substring(lastIndex, match.index)
            .replace(/Imagen:\s*$/i, "")  // Remove "Imagen:" label
            .replace(/Video:\s*$/i, "")   // Remove "Video:" label
            .trim()

        // CRITICAL: If this is the LAST media we're sending (e.g., 3rd)
        if (i === maxMediaCount - 1) {
            // Get ALL remaining text after this URL
            let restOfText = fullText.substring(match.index + url.length)

            // CLEAN IT: Remove any remaining URLs and labels
            restOfText = restOfText
                .replace(mediaRegex, "")           // Remove all URLs
                .replace(/Imagen:\s*/gi, "")       // Remove "Imagen:" labels
                .replace(/Video:\s*/gi, "")        // Remove "Video:" labels
                .replace(/\n{3,}/g, "\n\n")        // Clean extra newlines
                .trim()

            // APPEND remaining text to this caption
            if (restOfText) {
                textBefore = (textBefore + "\n\n" + restOfText).trim()
            }
        }

        results.push({
            type: isVideo ? 'video' : 'image',
            url: url,
            caption: formatTextForWhatsApp(textBefore)
        })

        lastIndex = match.index + url.length
    }

    return results
}

