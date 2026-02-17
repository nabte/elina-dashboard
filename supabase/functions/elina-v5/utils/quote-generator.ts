// Quote Generation System for ELINA V5
// Handles automatic quote generation and PDF delivery

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface QuoteGeneratorConfig {
    userId: string
    contactId: number
    productIds: number[]
    remoteJid: string
}

export interface QuoteResult {
    success: boolean
    quoteId?: number
    pdfUrl?: string
    cached?: boolean
    error?: string
}

/**
 * Determines if a quote should be generated based on context
 */
export function shouldGenerateQuote(
    aiResponse: string,
    productIds: number[],
    isExplicitRequest: boolean,
    quotesEnabled: boolean
): boolean {
    // Validar que quotes esté habilitado
    if (!quotesEnabled) {
        console.log('⚠️ [QUOTE] Quotes disabled for this profile')
        return false
    }

    // Validar cantidad de productos
    if (productIds.length >= 3) {
        console.log(`✅ [QUOTE] Auto-generating quote (${productIds.length} products)`)
        return true
    }

    if (isExplicitRequest && productIds.length >= 1) {
        console.log(`✅ [QUOTE] Explicit request with ${productIds.length} product(s)`)
        return true
    }

    console.log(`⚠️ [QUOTE] Not enough products (${productIds.length})`)
    return false
}

/**
 * Generates and sends a quote PDF to the customer
 * Includes intelligent caching to avoid duplicates
 */
export async function generateAndSendQuote(
    supabase: SupabaseClient,
    config: QuoteGeneratorConfig,
    sendDocument: (remoteJid: string, url: string, filename: string, caption?: string) => Promise<void>,
    sendMessage: (remoteJid: string, text: string) => Promise<void>,
    notifyOwner: boolean = true
): Promise<QuoteResult> {
    try {
        console.log(`\n📄 [QUOTE] Generating quote for contact ${config.contactId}`)
        console.log(`📦 [QUOTE] Products: ${config.productIds.join(', ')}`)

        // ========================================================================
        // 1. CHECK FOR RECENT CACHED QUOTE (last 24 hours)
        // ========================================================================
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: recentQuote, error: cacheError } = await supabase
            .from('quotes')
            .select('id, pdf_url, total, created_at')
            .eq('contact_id', config.contactId)
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (recentQuote && recentQuote.pdf_url) {
            console.log(`♻️ [QUOTE] Using cached quote #${recentQuote.id} (created ${new Date(recentQuote.created_at).toLocaleString()})`)

            await sendDocument(
                config.remoteJid,
                recentQuote.pdf_url,
                'Cotización.pdf',
                '📄 Aquí está tu cotización actualizada'
            )

            return {
                success: true,
                quoteId: recentQuote.id,
                pdfUrl: recentQuote.pdf_url,
                cached: true
            }
        }

        // ========================================================================
        // 2. CREATE NEW QUOTE VIA EDGE FUNCTION
        // ========================================================================
        console.log(`🆕 [QUOTE] Creating new quote...`)

        const createQuoteUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-quote`
        const response = await fetch(createQuoteUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: config.userId,
                contact_id: config.contactId,
                product_ids: config.productIds
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ [QUOTE] Creation failed: ${errorText}`)
            throw new Error(`Quote creation failed: ${errorText}`)
        }

        const data = await response.json()
        const { quote } = data

        if (!quote || !quote.pdf_url) {
            throw new Error('Quote created but no PDF URL returned')
        }

        console.log(`✅ [QUOTE] Quote #${quote.id} created successfully`)
        console.log(`💰 [QUOTE] Total: $${quote.total || 'N/A'}`)

        // ========================================================================
        // 3. SEND PDF TO CUSTOMER
        // ========================================================================
        await sendDocument(
            config.remoteJid,
            quote.pdf_url,
            'Cotización.pdf',
            '📄 Aquí está tu cotización'
        )

        console.log(`✅ [QUOTE] PDF sent to customer`)

        // ========================================================================
        // 4. NOTIFY OWNER (OPTIONAL)
        // ========================================================================
        if (notifyOwner) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('contact_phone, organization_name')
                    .eq('id', config.userId)
                    .single()

                if (profile?.contact_phone) {
                    const { data: contact } = await supabase
                        .from('contacts')
                        .select('full_name, phone_number')
                        .eq('id', config.contactId)
                        .single()

                    const notificationMsg =
                        `📄 *Nueva Cotización Generada*\n\n` +
                        `Cliente: ${contact?.full_name || contact?.phone_number}\n` +
                        `Productos: ${config.productIds.length}\n` +
                        `Total: $${quote.total || 'N/A'}\n` +
                        `ID: #${quote.id}`

                    await sendMessage(profile.contact_phone + '@s.whatsapp.net', notificationMsg)
                    console.log(`✅ [QUOTE] Owner notified`)
                }
            } catch (notifyError) {
                console.error(`⚠️ [QUOTE] Failed to notify owner:`, notifyError)
                // No fallar si la notificación falla
            }
        }

        return {
            success: true,
            quoteId: quote.id,
            pdfUrl: quote.pdf_url,
            cached: false
        }

    } catch (error) {
        console.error(`❌ [QUOTE] Error generating quote:`, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Detects if the message contains an explicit quote request
 */
export function detectQuoteIntent(text: string): boolean {
    const quoteKeywords = /(?:cotización|cotizacion|presupuesto|pdf|factura|quote)/i
    return quoteKeywords.test(text)
}
