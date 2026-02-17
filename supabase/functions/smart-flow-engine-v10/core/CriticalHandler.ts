/**
 * CRITICAL HANDLER
 * Maneja la activación de modo crítico (requiere atención humana)
 * Integra con el sistema de críticos de Elina-v5
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TriggerCriticalStep, FlowState } from './types.ts'

/**
 * Ejecuta un TriggerCriticalStep
 */
export async function executeTriggerCriticalStep(
    step: TriggerCriticalStep,
    state: FlowState,
    supabase: SupabaseClient,
    contactId: number,
    userId: string,
    evolutionConfig: {
        apiUrl: string
        apiKey: string
        instanceName: string
    },
    remoteJid: string,
    messageText: string
): Promise<{
    success: boolean
    flowPaused: boolean
    labelAdded: boolean
    adminNotified: boolean
    error?: string
}> {
    try {
        // 1. Pausar el flow si se solicita (default: true)
        const shouldPause = step.pause_flow !== false

        if (shouldPause) {
            state.status = 'paused'
        }

        // 2. Agregar label al contacto (default: 'ignorar')
        const labelToAdd = step.add_label || 'ignorar'
        let labelAdded = false

        try {
            const { data: contact } = await supabase
                .from('contacts')
                .select('labels, razon_de_label_auto')
                .eq('id', contactId)
                .single()

            if (contact) {
                const currentLabels = contact.labels || []
                if (!currentLabels.includes(labelToAdd)) {
                    await supabase
                        .from('contacts')
                        .update({
                            labels: [...currentLabels, labelToAdd],
                            razon_de_label_auto: step.reason
                        })
                        .eq('id', contactId)

                    labelAdded = true
                    console.log(`[CriticalHandler] Label "${labelToAdd}" added to contact ${contactId}`)
                }
            }
        } catch (error) {
            console.error('[CriticalHandler] Error adding label:', error)
        }

        // 3. Pausar followups activos (como en Elina-v5)
        try {
            await supabase
                .from('contacts')
                .update({ followup_status: 'paused' })
                .eq('id', contactId)
                .not('followup_status', 'is', null)
        } catch (error) {
            console.error('[CriticalHandler] Error pausing followups:', error)
        }

        // 4. Notificar al administrador
        let adminNotified = false

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('contact_phone, full_name')
                .eq('id', userId)
                .single()

            if (profile && profile.contact_phone) {
                const { data: contactData } = await supabase
                    .from('contacts')
                    .select('full_name, phone_number')
                    .eq('id', contactId)
                    .single()

                const contactName = contactData?.full_name || contactData?.phone_number || remoteJid
                const ownerName = profile.full_name || 'Admin'

                const notificationMessage =
                    step.notification_message ||
                    `🚨 *ATENCIÓN REQUERIDA*\n\n*Contacto:* ${contactName}\n*Tipo:* ${step.reason}\n*Flow:* ${state.flow_id}\n\n*Mensaje del cliente:*\n${messageText}\n\n_Flow pausado automáticamente. Responde manualmente._`

                // Enviar notificación via Evolution API
                await sendEvolutionMessage(
                    evolutionConfig,
                    profile.contact_phone,
                    notificationMessage
                )

                adminNotified = true
                console.log(`[CriticalHandler] Admin notified: ${profile.contact_phone}`)
            }
        } catch (error) {
            console.error('[CriticalHandler] Error notifying admin:', error)
        }

        // 5. Enviar respuesta automática al cliente
        const autoResponse =
            step.auto_response ||
            'Gracias por tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo pronto.'

        try {
            await sendEvolutionMessage(evolutionConfig, remoteJid, autoResponse)
        } catch (error) {
            console.error('[CriticalHandler] Error sending auto-response:', error)
        }

        // 6. Guardar metadata del crítico
        if (!state.metadata) state.metadata = {} as any
        state.metadata.critical_triggered = {
            triggered_at: new Date().toISOString(),
            reason: step.reason,
            step_id: step.id
        }

        return {
            success: true,
            flowPaused: shouldPause,
            labelAdded,
            adminNotified
        }
    } catch (error) {
        console.error('[CriticalHandler] Unexpected error:', error)
        return {
            success: false,
            flowPaused: false,
            labelAdded: false,
            adminNotified: false,
            error: error.message
        }
    }
}

/**
 * Helper para enviar mensajes via Evolution API
 */
async function sendEvolutionMessage(
    config: {
        apiUrl: string
        apiKey: string
        instanceName: string
    },
    remoteJid: string,
    message: string
): Promise<void> {
    const url = `${config.apiUrl}/message/sendText/${config.instanceName}`

    const payload = {
        number: remoteJid.replace('@s.whatsapp.net', ''),
        text: message,
        delay: 1000
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': config.apiKey
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status}`)
    }
}
