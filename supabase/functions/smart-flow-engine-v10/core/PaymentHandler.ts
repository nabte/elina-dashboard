/**
 * PAYMENT HANDLER
 * Maneja el envío de información de pago con placeholders seguros
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SendPaymentInfoStep, FlowState } from './types.ts'
import { TemplateRenderer } from './TemplateRenderer.ts'

/**
 * Ejecuta un SendPaymentInfoStep
 */
export async function executeSendPaymentInfoStep(
    step: SendPaymentInfoStep,
    state: FlowState,
    supabase: SupabaseClient,
    userId: string
): Promise<{
    success: boolean
    message?: string
    imageUrl?: string
    error?: string
}> {
    try {
        // 1. Cargar datos de pago del perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('payment_info')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            return {
                success: false,
                error: 'No se pudo cargar información de pago del perfil'
            }
        }

        const paymentInfo = profile.payment_info || {}

        // 2. Crear objeto de variables con datos de pago
        const paymentVars = {
            ...state.variables, // Variables existentes del flow
            // Datos de pago seguros desde BD
            bank_name: paymentInfo.bank_name || '[No configurado]',
            bank_account: paymentInfo.bank_account || '[No configurado]',
            account_holder: paymentInfo.account_holder || '[No configurado]',
            clabe: paymentInfo.clabe || '[No configurado]',
            card_number: paymentInfo.card_last4
                ? `**** **** **** ${paymentInfo.card_last4}`
                : '[No configurado]',
            paypal_email: paymentInfo.paypal_email || '[No configurado]',
            // Metadatos adicionales
            payment_method: step.payment_method || 'transfer',
            business_name: paymentInfo.business_name || profile.business_name || '[Negocio]'
        }

        // 3. Renderizar template con placeholders
        const renderer = new TemplateRenderer()
        const renderedMessage = renderer.render(step.message_template, paymentVars)

        // 4. Obtener URL de imagen si se solicita
        let imageUrl: string | undefined

        if (step.include_image) {
            if (step.image_url_variable) {
                imageUrl = state.variables[step.image_url_variable]
            } else if (paymentInfo.qr_code_url) {
                imageUrl = paymentInfo.qr_code_url
            }
        }

        return {
            success: true,
            message: renderedMessage,
            imageUrl
        }
    } catch (error) {
        console.error('[PaymentHandler] Error:', error)
        return {
            success: false,
            error: `Error procesando información de pago: ${error.message}`
        }
    }
}

/**
 * Valida que el perfil del usuario tenga configurada información de pago
 */
export async function validatePaymentInfoConfigured(
    supabase: SupabaseClient,
    userId: string
): Promise<{
    valid: boolean
    missingFields?: string[]
}> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('payment_info')
            .eq('id', userId)
            .single()

        if (!profile || !profile.payment_info) {
            return {
                valid: false,
                missingFields: ['payment_info (completamente vacío)']
            }
        }

        const paymentInfo = profile.payment_info
        const requiredFields = ['bank_name', 'bank_account', 'account_holder']
        const missing = requiredFields.filter(field => !paymentInfo[field])

        if (missing.length > 0) {
            return {
                valid: false,
                missingFields: missing
            }
        }

        return { valid: true }
    } catch (error) {
        return {
            valid: false,
            missingFields: ['Error al validar: ' + error.message]
        }
    }
}
