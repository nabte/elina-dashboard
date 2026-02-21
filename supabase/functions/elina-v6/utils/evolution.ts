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
    enableDelay: boolean = true
): Promise<void> {
    console.log(`📤 [EVOLUTION] Sending message to ${remoteJid}`)

    const url = `${config.evolutionApiUrl}/message/sendText/${config.instanceName}`

    // Calcular delay aleatorio entre 1000-2000ms
    const delayMs = enableDelay ? Math.floor(Math.random() * 1000) + 1000 : 0

    const payload = {
        number: remoteJid,
        text: text,
        ...(enableDelay && { delay: delayMs })
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

    // Extraer extensión de la URL para mimetype
    const extension = imageUrl.split('.').pop()?.toLowerCase() || 'jpg'
    const mimetypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    const mimetype = mimetypes[extension] || 'image/jpeg'

    // Delay aleatorio entre 1000-2000ms
    const delayMs = Math.floor(Math.random() * 1000) + 1000

    // Try to fetch image and convert to base64 if URL fails
    let mediaToSend = imageUrl
    let useBase64 = false

    try {
        // First attempt: send URL directly
        const payload = {
            number: cleanNumber,
            mediatype: 'image',
            mimetype: mimetype,
            caption: caption || '',
            media: imageUrl,
            fileName: `image.${extension}`,
            delay: delayMs
        }

        console.log(`📤 [EVOLUTION] Attempting URL send first...`)

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
            console.warn(`⚠️ [EVOLUTION] URL send failed, trying base64 fallback...`)

            // Fallback: Download image and convert to base64
            try {
                console.log(`📥 [EVOLUTION] Downloading image from: ${imageUrl}`)
                const imageResponse = await fetch(imageUrl)

                if (!imageResponse.ok) {
                    throw new Error(`Failed to download image: ${imageResponse.status}`)
                }

                const imageBlob = await imageResponse.blob()
                const arrayBuffer = await imageBlob.arrayBuffer()
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
                const base64Data = `data:${mimetype};base64,${base64}`

                console.log(`🔄 [EVOLUTION] Image converted to base64, retrying send...`)

                // Retry with base64
                const base64Payload = {
                    number: cleanNumber,
                    mediatype: 'image',
                    mimetype: mimetype,
                    caption: caption || '',
                    media: base64Data,
                    fileName: `image.${extension}`,
                    delay: delayMs
                }

                const retryResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': config.evolutionApiKey
                    },
                    body: JSON.stringify(base64Payload)
                })

                if (!retryResponse.ok) {
                    const retryErrorText = await retryResponse.text()
                    throw new Error(`Evolution API error (base64): ${retryResponse.status} - ${retryErrorText}`)
                }

                console.log(`✅ [EVOLUTION] Image sent successfully (base64 fallback)`)
                return
            } catch (base64Error) {
                console.error(`❌ [EVOLUTION] Base64 fallback also failed: ${base64Error.message}`)
                throw new Error(`Both URL and base64 methods failed. Original error: ${errorText}`)
            }
        }

        console.log(`✅ [EVOLUTION] Image sent successfully (URL)`)
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

    // Extraer extensión para mimetype
    const extension = videoUrl.split('.').pop()?.toLowerCase() || 'mp4'
    const mimetypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm'
    }
    const mimetype = mimetypes[extension] || 'video/mp4'

    // Delay aleatorio entre 1000-2000ms
    const delayMs = Math.floor(Math.random() * 1000) + 1000

    const payload = {
        number: cleanNumber,
        mediatype: 'video',
        mimetype: mimetype,
        caption: caption || '',
        media: videoUrl,
        fileName: `video.${extension}`,
        delay: delayMs
    }

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

        console.log(`✅ [EVOLUTION] Video sent successfully`)
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error sending video: ${error.message}`)
        throw error
    }
}

