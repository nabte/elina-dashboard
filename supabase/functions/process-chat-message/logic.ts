
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendMessage, sendMedia } from './evolution-client.ts'

export interface ProcessedTextResult {
    finalText: string
    productIds: number[]
    productsMap: Map<number, any>
}

export async function processPlaceholders(
    text: string,
    supabase: SupabaseClient,
    userId: string
): Promise<ProcessedTextResult> {
    const placeholderRegex = /\[[^\]]*?(\d+)\]/g
    const matches = [...text.matchAll(placeholderRegex)]

    const productIds = [...new Set(matches.map(m => parseInt(m[1], 10)))].filter(id => !isNaN(id))

    if (productIds.length === 0) {
        return { finalText: text, productIds: [], productsMap: new Map() }
    }

    console.log(`+++ [PLACEHOLDERS] IDs detectados: ${productIds.join(', ')}`)

    // Fetch products with STRICT validation
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('user_id', userId)

    if (error) {
        console.error('!!! [ERROR] Fallo al obtener productos:', error)
        return { finalText: text, productIds: [], productsMap: new Map() }
    }

    const productMap = new Map<number, any>()
    const validIds = new Set<number>()

    if (products) {
        products.forEach(p => {
            productMap.set(p.id, p)
            validIds.add(p.id)
        })
    }

    // Identify INVALID IDs (IDs that don't exist in DB)
    const invalidIds = productIds.filter(id => !validIds.has(id))

    if (invalidIds.length > 0) {
        console.warn(`!!! [VALIDACIÓN] IDs INVÁLIDOS detectados (no existen en BD): ${invalidIds.join(', ')}`)
        console.warn(`    Estos IDs serán ELIMINADOS del texto final`)
    }

    console.log(`+++ [PLACEHOLDERS] IDs válidos: ${Array.from(validIds).join(', ')}`)

    let finalText = text

    // 1. Replace specific fields [PRODUCT_FIELD:ID] - ONLY for valid IDs
    const specificRegex = /\[PRODUCT_(\w+):(\d+)\]/g
    for (const match of finalText.matchAll(specificRegex)) {
        const [fullMatch, field, idStr] = match
        const id = parseInt(idStr)
        const product = productMap.get(id)

        if (product) {
            let replacement = fullMatch
            switch (field.toUpperCase()) {
                case "NAME": replacement = product.product_name; break;
                case "PRICE":
                    const pVal = Number(product.price);
                    replacement = (pVal === 0 || isNaN(pVal)) ? "A consultar" : "$" + pVal.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                    break;
                case "URL": replacement = product.media_url || ""; break;
                case "STOCK": replacement = String(product.stock); break;
                case "DESC": replacement = product.description || ""; break;
            }
            finalText = finalText.replace(fullMatch, replacement)
        } else {
            // INVALID ID - Remove entire placeholder
            console.warn(`!!! [VALIDACIÓN] Eliminando placeholder inválido: ${fullMatch}`)
            finalText = finalText.replace(fullMatch, '')
        }
    }

    // 2. Clean dirty placeholders (e.g. [Some Name:123]) -> Product Name (ONLY valid IDs)
    const messRegex = /\[([^\]]+):(\d+)\]/g
    for (const match of finalText.matchAll(messRegex)) {
        const [fullMatch, content, idStr] = match
        const id = parseInt(idStr)
        const product = productMap.get(id)

        if (product) {
            finalText = finalText.replace(fullMatch, product.product_name)
        } else {
            // INVALID ID - Remove entire placeholder
            console.warn(`!!! [VALIDACIÓN] Eliminando placeholder inválido: ${fullMatch}`)
            finalText = finalText.replace(fullMatch, '')
        }
    }

    // 3. Calculate Subtotals and Total
    finalText = calculateSubtotals(finalText, productMap)

    // 4. FINAL CLEANUP: Remove any leaked IDs or weird colon patterns (Safety Net)
    // First, handle literal [ANYTHING:ID] or [ANYTHING:id]
    finalText = finalText.replace(/\[[^\]]*?[:\s](?:ID|id)\]/gi, '');

    // Matches patterns like ":8878", " 8878", ": 8878" where ID is 4+ digits
    finalText = finalText.replace(/[:\s]+\d{4,}/g, ' ')

    // Clean up trailing artifacts like " - " or " : " at the end of lines
    finalText = finalText.split('\n').map(line => {
        let l = line.trim();
        // Remove trailing dashes, colons or vertical bars left by the cleanup
        l = l.replace(/\s*[:\-\|]\s*$/g, '');
        // Remove IDs that might be at the end of a word like "Corte:9528"
        l = l.replace(/:?\d{4,}/g, '');
        return l;
    }).join('\n');

    // Final double check for any remaining [Name:ID] format (digits or text)
    finalText = finalText.replace(/\[([^\]]+):[^\]]+\]/g, '$1')

    // Remove any remaining empty brackets [ ]
    finalText = finalText.replace(/\[\s*\]/g, '')

    // Remove double spaces
    finalText = finalText.replace(/ {2,}/g, ' ')

    // [SAFETY] Deduplicate sequential repetitive paragraphs (fixes Gemini repetition bug)
    finalText = deduplicateRepetitiveText(finalText)

    return { finalText: finalText.trim(), productIds, productsMap: productMap }
}

function deduplicateRepetitiveText(text: string): string {
    const paragraphs = text.split('\n\n');
    const uniqueParagraphs: string[] = [];

    for (const p of paragraphs) {
        const trimmed = p.trim();
        if (trimmed === "") continue;

        // If this paragraph is identical or a substring of the previous one (and long enough), skip it
        if (uniqueParagraphs.length > 0) {
            const prev = uniqueParagraphs[uniqueParagraphs.length - 1];
            if (trimmed === prev || (trimmed.length > 50 && prev.includes(trimmed))) {
                console.log(`--- [CLEANUP] Detectada repetición de párrafo, omitiendo.`);
                continue;
            }
        }
        uniqueParagraphs.push(trimmed);
    }

    return uniqueParagraphs.join('\n\n');
}

function calculateSubtotals(text: string, productsMap: Map<number, any>): string {
    const subtotalRegex = /(\d+)\s*piezas?\s*Subtotal:\s*\$\[subtotal_calculado\]/gi;
    let totalAcumulado = 0;

    let result = text.replace(subtotalRegex, (match, qtyStr, offset) => {
        const qty = parseInt(qtyStr, 10);
        const textBefore = text.substring(0, offset);
        const pricesFound = textBefore.match(/\$([\d,]+(?:\.\d{2})?)/g);

        if (pricesFound) {
            const lastPriceStr = pricesFound[pricesFound.length - 1].replace(/[$,]/g, "");
            const price = parseFloat(lastPriceStr);
            const subtotal = qty * price;
            totalAcumulado += subtotal;
            return `${qty} piezas Subtotal: $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return match;
    });

    result = result.replace(/\$\[TOTAL_CALCULADO\]/gi, "$" + totalAcumulado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    return result;
}

function extractQuantity(text: string, productId: number, productName: string): number {
    const lowerText = text.toLowerCase();
    const patterns = [
        /x\s*(\d+)/gi,
        /(\d+)\s*(?:unidades?|piezas?)/gi
    ];

    for (const pattern of patterns) {
        const matches = [...lowerText.matchAll(pattern)];
        if (matches.length > 0) {
            return parseInt(matches[0][1], 10) || 1;
        }
    }
    return 1;
}

export function shouldGenerateQuote(
    text: string,
    productIds: number[],
    isExplicitRequest: boolean
): boolean {
    const lowerText = text.toLowerCase();

    // Palabras negativas que cancelan la cotización
    const negativeKeywords = /(?:no quiero|no necesito|solo ver|consultar|conocer|información|info|cuáles|qué productos|que vendes|que tienes)/i;

    if (negativeKeywords.test(lowerText)) {
        console.log("--- [COTIZACIÓN] Bloqueada por palabras negativas/consulta general")
        return false;
    }

    // REGLA ÚNICA Y ESTRICTA: Solicitud EXPLÍCITA de cotización
    // Ya no usamos "3+ productos" automáticamente porque causaba spam en consultas de catálogo.
    if (productIds.length > 0 && isExplicitRequest) {
        console.log("+++ [COTIZACIÓN] Aprobada: Solicitud explícita con productos")
        return true;
    }

    console.log("--- [COTIZACIÓN] Bloqueada: No se detectó solicitud explícita ('cotización', 'presupuesto')")
    return false;
}

export async function createAndSendQuote(
    supabase: SupabaseClient,
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    userId: string,
    contactId: number,
    productIds: number[],
    productsMap: Map<number, any>,
    messageText: string // [NEW] Added text for extraction
) {
    // 1. Prepare Items with quantity extraction
    const items = productIds.map(id => {
        const p = productsMap.get(id)
        if (!p) return null
        const quantity = extractQuantity(messageText, id, p.product_name);
        return {
            product_id: p.id,
            product_name: p.product_name,
            quantity: quantity,
            price: p.price,
            subtotal: p.price * quantity
        }
    }).filter(i => i !== null)

    if (items.length === 0) return

    // 2. Call create-quote
    const createQuoteUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-quote`

    try {
        const res = await fetch(createQuoteUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                contact_id: contactId,
                items: items,
                valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            })
        })

        if (!res.ok) {
            console.error("Failed to create quote:", await res.text())
            await sendMessage(instanceName, apiKey, remoteJid, "Hubo un error generando tu cotización PDF.")
            return
        }

        const data = await res.json()
        const pdfUrl = data.quote.pdf_url

        if (pdfUrl) {
            await sendMessage(instanceName, apiKey, remoteJid, "Aquí tienes tu cotización formal:")
            // Send PDF
            await sendMedia(instanceName, apiKey, remoteJid, pdfUrl, 'document', 'Cotización.pdf', 'Cotización.pdf')
        }

    } catch (e) {
        console.error("Error generating quote:", e)
    }
}
