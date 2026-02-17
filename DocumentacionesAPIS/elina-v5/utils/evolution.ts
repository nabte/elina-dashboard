/**
 * ELINA V5 - Evolution API Client
 * 
 * Cliente para interactuar con Evolution API (WhatsApp)
 */

import type { AccountConfig } from '../config/types.ts'

/**
 * Envía un mensaje de texto
 */
export async function sendMessage(
    config: AccountConfig,
    remoteJid: string,
    text: string,
    delay: boolean = true
): Promise<void> {
    console.log(`📤 [EVOLUTION] Sending message to ${remoteJid}`)

    // Simular delay de escritura si está habilitado
    if (delay) {
        await simulateTypingDelay(text.length)
    }

    const url = `${config.evolutionApiUrl}/message/sendText/${config.instanceName}`

    const payload = {
        number: remoteJid,
        text: text
    }

    console.log(`📤 [EVOLUTION] URL: ${url}`)
    console.log(`📤 [EVOLUTION] Payload:`, JSON.stringify(payload, null, 2))

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolutionApiKey
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Evolution API error: ${response.status} - ${errorText}`)
        }

        console.log(`✅ [EVOLUTION] Message sent successfully`)
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error sending message: ${error.message}`)
        throw error
    }
}

/**
 * Envía una imagen
 */
export async function sendImage(
    config: AccountConfig,
    remoteJid: string,
    imageUrl: string,
    caption?: string
): Promise<void> {
    console.log(`📤 [EVOLUTION] Sending image to ${remoteJid}`)

    const url = `${config.evolutionApiUrl}/message/sendMedia/${config.instanceName}`

    // Limpiar número (remover @s.whatsapp.net si existe)
    const cleanNumber = remoteJid.replace('@s.whatsapp.net', '')

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolutionApiKey
            },
            body: JSON.stringify({
                number: cleanNumber,
                mediatype: 'image',
                media: imageUrl,
                caption: caption || ''
            })
        })

        if (!response.ok) {
            throw new Error(`Evolution API error: ${response.status}`)
        }

        console.log(`✅ [EVOLUTION] Image sent successfully`)
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error sending image: ${error.message}`)
        throw error
    }
}

/**
 * Envía un audio
 */
export async function sendAudio(
    config: AccountConfig,
    remoteJid: string,
    audioUrl: string
): Promise<void> {
    console.log(`📤 [EVOLUTION] Sending audio to ${remoteJid}`)

    const url = `${config.evolutionApiUrl}/message/sendMedia/${config.instanceName}`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolutionApiKey
            },
            body: JSON.stringify({
                number: remoteJid,
                mediatype: 'audio',
                media: audioUrl
            })
        })

        if (!response.ok) {
            throw new Error(`Evolution API error: ${response.status}`)
        }

        console.log(`✅ [EVOLUTION] Audio sent successfully`)
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error sending audio: ${error.message}`)
        throw error
    }
}

/**
 * Envía un video
 */
export async function sendVideo(
    config: AccountConfig,
    remoteJid: string,
    videoUrl: string,
    caption?: string
): Promise<void> {
    console.log(`📤 [EVOLUTION] Sending video to ${remoteJid}`)

    const url = `${config.evolutionApiUrl}/message/sendMedia/${config.instanceName}`

    // Limpiar número (remover @s.whatsapp.net si existe)
    const cleanNumber = remoteJid.replace('@s.whatsapp.net', '')

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolutionApiKey
            },
            body: JSON.stringify({
                number: cleanNumber,
                mediatype: 'video',
                media: videoUrl,
                caption: caption || ''
            })
        })

        if (!response.ok) {
            throw new Error(`Evolution API error: ${response.status}`)
        }

        console.log(`✅ [EVOLUTION] Video sent successfully`)
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error sending video: ${error.message}`)
        throw error
    }
}

function simulateTypingDelay(textLength: number): Promise<void> {
    // Delay entre 800ms y 2000ms basado en longitud del texto
    // ~40 caracteres por segundo (más lento que antes para parecer más humano)
    const baseDelay = 800 // Mínimo 800ms
    const variableDelay = Math.min(textLength * 25, 1200) // Máximo 1200ms adicionales
    const delay = baseDelay + variableDelay // Total: 800-2000ms

    console.log(`⏳ [EVOLUTION] Simulating typing delay: ${delay}ms`)
    return new Promise(resolve => setTimeout(resolve, delay))
}
