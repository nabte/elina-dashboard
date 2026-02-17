
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const toolsDefinition = [
    {
        type: 'function',
        function: {
            name: 'search_products',
            description: 'Buscar productos en el inventario por nombre, código, SKU o descripción. Úsala siempre que el usuario pregunte por precios, stock o información de un producto.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Término de búsqueda (nombre, modelo, sku, etc). Ej: "toner m477", "impresora canon"',
                    },
                },
                required: ['query'],
            },
        },
    },
]

export async function searchProducts(
    supabase: SupabaseClient,
    userId: string,
    query: string
) {
    // Call the existing search-products-hybrid function
    // We use the public URL or internal invoke

    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-products-hybrid`

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                query: query,
                limit: 5 // Return top 5
            }),
        })

        if (!response.ok) {
            console.error('Error invoking search-products-hybrid:', await response.text())
            return "Error buscando productos."
        }

        const data = await response.json()
        // Format for LLM to save tokens
        if (!data.products || data.products.length === 0) {
            return "No se encontraron productos con ese término."
        }

        return JSON.stringify(data.products.map((p: any) => ({
            id: p.id,
            name: p.product_name,
            price: p.price,
            stock: p.stock,
            description: p.description,
            url: p.media_url,
            score: p.relevance_score // Optional, maybe helpful for LLM to know confidence
        })))

    } catch (err) {
        console.error('Exception in searchProducts:', err)
        return "Error al conectar con la base de datos de productos."
    }
}
