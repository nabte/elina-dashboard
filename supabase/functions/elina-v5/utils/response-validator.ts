/**
 * ELINA V5 - Response Validator
 *
 * Valida respuestas del LLM para evitar alucinaciones críticas
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ValidationResult {
    valid: boolean
    issues: string[]
    fallbackMessage?: string
}

/**
 * Valida que la respuesta del LLM no contenga alucinaciones
 */
export async function validateResponse(
    supabase: SupabaseClient,
    userId: string,
    text: string,
    toolResults: any[]
): Promise<ValidationResult> {
    const issues: string[] = []

    // 1. Verificar que no mencione precios sin haber usado buscar_productos
    const mentionsPrice = /\$\s*\d+/.test(text)
    const usedSearchTool = toolResults.some(t => t.name === 'buscar_productos')

    if (mentionsPrice && !usedSearchTool) {
        issues.push('Menciona precios sin consultar herramienta')
    }

    // 2. Verificar que no mencione productos que no están en toolResults
    if (usedSearchTool) {
        const productNames = toolResults
            .filter(t => t.name === 'buscar_productos')
            .flatMap(t => {
                try {
                    const content = JSON.parse(t.content)
                    return content.exact_matches?.map((p: any) => p.name.toLowerCase()) || []
                } catch {
                    return []
                }
            })

        // Buscar menciones de productos (palabras capitalizadas seguidas de números/letras)
        const productMentions = text.match(/(?:plan|producto|servicio)\s+[A-Z0-9][a-zA-Z0-9\s]*/gi) || []

        for (const mentioned of productMentions) {
            const cleanMentioned = mentioned.toLowerCase().replace(/^(plan|producto|servicio)\s+/i, '')
            const isFound = productNames.some(name =>
                name.includes(cleanMentioned) || cleanMentioned.includes(name)
            )

            if (!isFound && cleanMentioned.length > 2) {
                issues.push(`Menciona producto "${mentioned}" que no fue encontrado`)
            }
        }
    }

    // 3. Verificar que no mencione web/sitio si no existe en el perfil
    const mentionsWebsite = /(ve|visita|checa|revisa|consulta).*(web|sitio|página)/i.test(text) ||
                           /en\s+nuestra\s+(web|sitio|página)/i.test(text) ||
                           /nuestro\s+sitio/i.test(text)

    if (mentionsWebsite) {
        // Verificar si el perfil tiene website
        const { data: profile } = await supabase
            .from('profiles')
            .select('website')
            .eq('id', userId)
            .single()

        if (!profile?.website || profile.website.trim() === '') {
            issues.push('Menciona sitio web pero el perfil no tiene website configurado')
        }
    }

    // 4. Verificar que no mencione teléfono si no existe
    const mentionsPhone = /(llama|marca|teléfono|telefono|contacta por tel)/i.test(text)

    if (mentionsPhone) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_phone')
            .eq('id', userId)
            .single()

        if (!profile?.business_phone || profile.business_phone.trim() === '') {
            issues.push('Menciona teléfono pero el perfil no tiene business_phone configurado')
        }
    }

    return {
        valid: issues.length === 0,
        issues,
        fallbackMessage: issues.length > 0
            ? 'Disculpa, déjame verificar esa información. ¿Podrías ser más específico en lo que necesitas?'
            : undefined
    }
}
