/**
 * QUOTE HANDLER
 * Maneja la creación de cotizaciones en flows
 * Integra con el sistema de cotizaciones de Elina-v5
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CreateQuoteStep, FlowState } from './types.ts'

/**
 * Detecta productos mencionados en el texto usando el mismo sistema de Elina-v5
 */
export async function detectProductsFromText(
    supabase: SupabaseClient,
    userId: string,
    text: string
): Promise<string[]> {
    try {
        // Obtener todos los productos del usuario
        const { data: products, error } = await supabase
            .from('products')
            .select('id, product_name, description')
            .eq('user_id', userId)
            .eq('is_active', true)

        if (error || !products || products.length === 0) {
            console.warn('[QuoteHandler] No products found for user:', userId)
            return []
        }

        // Buscar menciones de productos en el texto
        const textLower = text.toLowerCase()
        const detectedProductIds: string[] = []

        for (const product of products) {
            const productNameLower = product.product_name.toLowerCase()
            const descriptionLower = (product.description || '').toLowerCase()

            // Buscar por nombre exacto o palabras clave
            if (
                textLower.includes(productNameLower) ||
                (descriptionLower && textLower.includes(descriptionLower))
            ) {
                detectedProductIds.push(product.id)
            }
        }

        console.log(`[QuoteHandler] Detected ${detectedProductIds.length} products from text`)
        return detectedProductIds
    } catch (error) {
        console.error('[QuoteHandler] Error detecting products:', error)
        return []
    }
}

/**
 * Ejecuta un CreateQuoteStep
 */
export async function executeCreateQuoteStep(
    step: CreateQuoteStep,
    state: FlowState,
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    evolutionConfig: {
        apiUrl: string
        apiKey: string
        instanceName: string
    },
    remoteJid: string
): Promise<{
    success: boolean
    quoteId?: string
    pdfUrl?: string
    error?: string
}> {
    try {
        // 1. Determinar qué productos incluir
        let productIds: string[] = []

        switch (step.products) {
            case 'auto_detect':
                // Detectar productos del contexto completo
                const fullContext = Object.values(state.variables).join(' ')
                productIds = await detectProductsFromText(supabase, userId, fullContext)
                break

            case 'from_variable':
                if (!step.product_ids_variable) {
                    return {
                        success: false,
                        error: 'product_ids_variable no especificado'
                    }
                }
                const varValue = state.variables[step.product_ids_variable]
                productIds = Array.isArray(varValue) ? varValue : [varValue]
                break

            case 'manual':
                productIds = step.manual_product_ids || []
                break
        }

        if (productIds.length === 0) {
            return {
                success: false,
                error: 'No se encontraron productos para la cotización'
            }
        }

        // 2. Obtener cantidad si está especificada
        const quantity = step.quantity_variable
            ? parseInt(state.variables[step.quantity_variable] || '1')
            : 1

        // 3. Crear cotización en la base de datos
        const quoteData = {
            user_id: userId,
            contact_id: contactId,
            product_ids: productIds,
            quantity,
            status: 'draft',
            created_at: new Date().toISOString()
        }

        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .insert(quoteData)
            .select()
            .single()

        if (quoteError || !quote) {
            console.error('[QuoteHandler] Error creating quote:', quoteError)
            return {
                success: false,
                error: `Error creando cotización: ${quoteError?.message || 'Unknown error'}`
            }
        }

        console.log(`[QuoteHandler] Quote created: ${quote.id}`)

        // Guardar quote_id en el state
        const outputVar = step.output_variable || 'quote_id'
        state.variables[outputVar] = quote.id

        // Agregar a metadata
        if (!state.metadata) state.metadata = {} as any
        if (!state.metadata.created_quotes) state.metadata.created_quotes = []
        state.metadata.created_quotes.push(quote.id)

        // 4. Generar PDF si se solicita
        let pdfUrl: string | undefined

        if (step.generate_pdf !== false) {
            try {
                // Llamar a la función de generación de PDF (reutilizar de Elina-v5)
                const { generateAndSendQuote } = await import('./utils/quote-generator-adapter.ts')

                const result = await generateAndSendQuote(
                    supabase,
                    {
                        userId,
                        contactId,
                        productIds,
                        remoteJid
                    },
                    evolutionConfig,
                    step.send_to_customer !== false, // Send to customer por defecto
                    step.notify_admin === true // Notificar admin si se especifica
                )

                if (result.success) {
                    pdfUrl = result.pdfUrl
                    console.log(`[QuoteHandler] PDF generated: ${pdfUrl}`)
                } else {
                    console.warn('[QuoteHandler] PDF generation failed:', result.error)
                }
            } catch (error) {
                console.error('[QuoteHandler] Error generating PDF:', error)
            }
        }

        return {
            success: true,
            quoteId: quote.id,
            pdfUrl
        }
    } catch (error) {
        console.error('[QuoteHandler] Unexpected error:', error)
        return {
            success: false,
            error: `Error inesperado: ${error.message}`
        }
    }
}

/**
 * Adapter para reutilizar la función de generación de PDF de Elina-v5
 * TODO: Implementar cuando se integre con Elina-v5
 */
export async function generateQuotePDF(
    supabase: SupabaseClient,
    quoteId: string,
    userId: string,
    contactId: number
): Promise<{
    success: boolean
    pdfUrl?: string
    error?: string
}> {
    // Placeholder: aquí se llamará a la función real de Elina-v5
    console.log('[QuoteHandler] Generating PDF for quote:', quoteId)

    try {
        // TODO: Implementar integración con quote-generator de Elina-v5
        return {
            success: true,
            pdfUrl: `https://placeholder.com/quote-${quoteId}.pdf`
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        }
    }
}
