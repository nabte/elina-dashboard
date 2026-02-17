import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const payload = await req.json()
        const { output: textoOriginal, user_id: userId, contact_id: contactId } = payload

        if (!textoOriginal) {
            return new Response(JSON.stringify({ error: "Missing output text" }), { status: 400 })
        }

        // --- 1. Extraer IDs de Placeholders ---
        const placeholderRegex = /\[[^\]]*?(\d+)\]/g
        const matches = [...textoOriginal.matchAll(placeholderRegex)]
        const productIds = [...new Set(matches.map(m => parseInt(m[1], 10)))].filter(id => !isNaN(id))

        let textoFinal = textoOriginal
        let productsData: any[] = []

        if (productIds.length > 0) {
            // --- 2. Obtener Productos por IDs ---
            const { data, error: rpcError } = await supabaseClient.rpc('get_products_by_ids', {
                p_user_id: userId,
                p_product_ids: productIds
            })

            if (rpcError) {
                console.error("Error calling get_products_by_ids:", rpcError)
            } else {
                productsData = data || []
            }

            const productMap: Record<string, any> = {}
            productsData.forEach(p => {
                if (p && p.id) productMap[String(p.id)] = p
            })

            // --- 3. Reemplazar Placeholders Técnicos ---
            const techRegex = /\[PRODUCT_(\w+):(\d+)\]/g
            for (const match of textoFinal.matchAll(techRegex)) {
                const [fullMatch, field, idStr] = match
                const product = productMap[idStr]
                if (product) {
                    let replacement = fullMatch
                    switch (field.toUpperCase()) {
                        case "NAME": replacement = product.product_name; break;
                        case "PRICE": replacement = Number(product.price).toFixed(2); break;
                        case "URL": replacement = product.media_url || ""; break;
                        case "STOCK": replacement = String(product.stock); break;
                        case "DESC": replacement = product.description || ""; break;
                    }
                    textoFinal = textoFinal.replace(fullMatch, replacement)
                }
            }

            // --- 4. Limpiar Placeholders sucios ([Nombre:ID]) ---
            const messRegex = /\[([^\]]+):(\d+)\]/g
            for (const match of textoFinal.matchAll(messRegex)) {
                const [fullMatch, content, idStr] = match
                const product = productMap[idStr]
                if (product) {
                    textoFinal = textoFinal.replace(fullMatch, product.product_name)
                }
            }

            // --- 5. CÁLCULO DE SUBTOTALES Y TOTAL ---
            const subtotalRegex = /(\d+)\s*piezas?\s*Subtotal:\s*\$\[subtotal_calculado\]/gi
            let totalAcumulado = 0

            textoFinal = textoFinal.replace(subtotalRegex, (match, qtyStr, offset) => {
                const qty = parseInt(qtyStr, 10)
                const textBefore = textoFinal.substring(0, offset)
                const pricesFound = textBefore.match(/\$([\d,]+(?:\.\d{2})?)/g)
                if (pricesFound) {
                    const lastPriceStr = pricesFound[pricesFound.length - 1].replace(/[$,]/g, "")
                    const price = parseFloat(lastPriceStr)
                    const subtotal = qty * price
                    totalAcumulado += subtotal
                    return `${qty} piezas Subtotal: $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
                return match
            })

            textoFinal = textoFinal.replace(/\$\[TOTAL_CALCULADO\]/gi, "$" + totalAcumulado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        }

        // --- 6. Detección de Multimedia y Split ---
        const mediaRegex = /https?:\/\/[^\s"'<>]+?\.(?:png|jpg|jpeg|gif|webp|mp4|mov|avi)/gi
        const mediaMatches = [...textoFinal.matchAll(mediaRegex)]
        const mediaEntries = mediaMatches.map(m => m[0])

        const imgRegex = /\.(?:png|jpg|jpeg|gif|webp)$/i
        const vidRegex = /\.(?:mp4|mov|avi)$/i

        const firstImg = mediaEntries.find(url => imgRegex.test(url))
        const firstVid = mediaEntries.find(url => vidRegex.test(url))

        // --- 7. Decisión de Cotización ---
        const textLower = textoFinal.toLowerCase()
        const cierreKeywords = /(?:cotización|cotizacion|presupuesto|generar pdf|enviar pdf|formalizar|documento|precio final)/i
        const negativeKeywords = /(?:no quiero|no necesito|solo ver|consultar)/i
        const esPeticionExplicita = cierreKeywords.test(textLower) && !negativeKeywords.test(textLower)

        let shouldGenerateQuote = false
        if (productIds.length >= 3) {
            shouldGenerateQuote = true
        } else if (productIds.length > 0 && esPeticionExplicita) {
            shouldGenerateQuote = true
        }

        // --- 8. Armado de Quote Items ---
        const quoteItems = productsData.filter(p => productIds.includes(p.id)).map(p => {
            // Intentar extraer qty del texto (lógica simplificada)
            const qtyMatch = textoFinal.match(new RegExp(`(\\d+)\\s*(?:unidades?|piezas?|x)\\s*.*?${p.product_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
            const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1
            return {
                product_id: p.id,
                product_name: p.product_name,
                quantity: qty,
                price: Number(p.price) || 0,
                subtotal: (Number(p.price) || 0) * qty
            }
        })

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    output: textoFinal,
                    should_generate_quote: shouldGenerateQuote,
                    quote_items: quoteItems,
                    product_ids: productIds,
                    media: {
                        all: mediaEntries,
                        first_image: firstImg || "",
                        first_video: firstVid || "",
                        tipo_prioritario: firstVid ? 'video' : (firstImg ? 'image' : 'text')
                    },
                    // Para retrocompatibilidad con Definir destinatario1
                    "mensaje texto ": textoFinal,
                    url_imagen: firstImg || "",
                    urlVideo: firstVid || ""
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Function Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
