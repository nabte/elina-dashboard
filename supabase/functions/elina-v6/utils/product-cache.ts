/**
 * ELINA V5 - Product Cache Manager
 *
 * Gestiona el cache de productos mencionados en conversaciones
 * para mantener FAQs y contexto disponible en follow-up questions
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { ProductWithFAQs } from '../config/types.ts'

/**
 * Cachea productos mencionados en una conversación
 */
export async function cacheProductsMentioned(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    products: any[] // Productos retornados por buscar_productos
): Promise<void> {
    if (!products || products.length === 0) {
        return
    }

    console.log(`💾 [CACHE] Caching ${products.length} mentioned products for contact ${contactId}`)

    try {
        // Preparar datos para insertar
        const cacheRecords = products.map(p => ({
            user_id: userId,
            contact_id: contactId,
            product_id: p.id,
            product_snapshot: {
                id: p.id,
                product_name: p.product_name,
                price: p.price,
                description: p.description,
                enhanced_description: p.enhanced_description,
                media_url: p.media_url,
                faq: p.faq,
                benefits: p.benefits,
                usage_instructions: p.usage_instructions
            },
            mentioned_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString()
        }))

        // Upsert: Si ya existe (user_id + contact_id + product_id), actualizar last_accessed_at
        const { error } = await supabase
            .from('conversation_product_cache')
            .upsert(cacheRecords, {
                onConflict: 'user_id,contact_id,product_id',
                ignoreDuplicates: false
            })

        if (error) {
            console.error(`❌ [CACHE] Error caching products: ${error.message}`)
            // No lanzar error, esto no debe bloquear la conversación
        } else {
            console.log(`✅ [CACHE] Products cached successfully`)
        }

    } catch (error) {
        console.error(`❌ [CACHE] Exception caching products: ${error.message}`)
        // No lanzar error
    }
}

/**
 * Obtiene productos mencionados recientemente en una conversación
 */
export async function getRecentlyMentionedProducts(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    limit: number = 5
): Promise<ProductWithFAQs[]> {
    console.log(`📦 [CACHE] Fetching recently mentioned products for contact ${contactId}`)

    try {
        const { data, error } = await supabase
            .from('conversation_product_cache')
            .select('product_snapshot, mentioned_at, last_accessed_at')
            .eq('user_id', userId)
            .eq('contact_id', contactId)
            .order('last_accessed_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error(`❌ [CACHE] Error fetching cached products: ${error.message}`)
            return []
        }

        if (!data || data.length === 0) {
            console.log(`   - No cached products found`)
            return []
        }

        // Mapear snapshots a ProductWithFAQs
        const products: ProductWithFAQs[] = data.map((record: any) => {
            const snapshot = record.product_snapshot

            return {
                id: snapshot.id,
                productName: snapshot.product_name,
                price: parseFloat(snapshot.price) || 0,
                description: snapshot.description,
                enhanced_description: snapshot.enhanced_description,
                faq: snapshot.faq,
                benefits: snapshot.benefits,
                usage_instructions: snapshot.usage_instructions,
                mentionedAt: new Date(record.mentioned_at)
            }
        })

        console.log(`✅ [CACHE] Found ${products.length} cached products`)
        return products

    } catch (error) {
        console.error(`❌ [CACHE] Exception fetching cached products: ${error.message}`)
        return []
    }
}

/**
 * Formatea productos cacheados para incluir en el prompt del sistema
 */
export function formatCachedProductsForPrompt(products: ProductWithFAQs[]): string {
    if (!products || products.length === 0) {
        return ''
    }

    let formatted = `\n## 📦 Productos Mencionados Recientemente en esta Conversación\n`
    formatted += `(Úsalos para responder preguntas de seguimiento sin necesidad de buscar de nuevo)\n\n`

    for (const product of products) {
        formatted += `### ${product.productName} (ID: ${product.id})\n`
        formatted += `- Precio: $${product.price}\n`

        // Usar enhanced_description si existe
        const desc = product.enhanced_description || product.description
        if (desc) {
            formatted += `- Descripción: ${desc}\n`
        }

        // Incluir benefits si existen
        if (product.benefits) {
            formatted += `- Beneficios: ${product.benefits}\n`
        }

        // Incluir FAQs si existen
        if (product.faq && Array.isArray(product.faq) && product.faq.length > 0) {
            formatted += `- FAQs:\n`
            product.faq.forEach((item, idx) => {
                formatted += `  ${idx + 1}. ${item.question}\n`
                formatted += `     → ${item.answer}\n`
            })
        }

        formatted += `\n`
    }

    return formatted
}

/**
 * Limpia cache antiguo (llamar periódicamente o en cron job)
 */
export async function cleanupOldCache(supabase: SupabaseClient): Promise<number> {
    console.log(`🧹 [CACHE] Cleaning up old product cache`)

    try {
        const { error } = await supabase.rpc('cleanup_old_product_cache')

        if (error) {
            console.error(`❌ [CACHE] Error cleaning up cache: ${error.message}`)
            return 0
        }

        console.log(`✅ [CACHE] Old cache cleaned up successfully`)
        return 1

    } catch (error) {
        console.error(`❌ [CACHE] Exception cleaning up cache: ${error.message}`)
        return 0
    }
}
