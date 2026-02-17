
export const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolutionapi-evolution-api.mcjhhb.easypanel.host";

export async function sendMessage(
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    text: string,
    apiUrl?: string
) {
    const baseUrl = apiUrl || EVOLUTION_API_URL
    const url = `${baseUrl}/message/sendText/${instanceName}`
    const body = {
        number: remoteJid,
        text: text
    }

    return await fetchEvolution(url, apiKey, body)
}

export async function sendMedia(
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    fileName?: string,
    apiUrl?: string
) {
    let endpoint = 'sendMedia';
    // Evolution API v2 might have different endpoints, but usually sendMedia handles all or specific ones like sendAudio
    // Based on n8n it uses specific operations. 
    // Let's stick to specific if possible, or generic media.
    // n8n "send-audio" uses /message/sendAudio ? No, it calls "send-audio" buffer operation.
    // But over HTTP it's usually /message/sendMedia or /message/sendAudio

    if (mediaType === 'audio') endpoint = 'sendWhatsAppAudio'; // Specific for voice notes often
    else if (mediaType === 'document') endpoint = 'sendMedia'; // PDF usually via sendMedia or sendDocument

    const baseUrl = apiUrl || EVOLUTION_API_URL
    const url = `${baseUrl}/message/${endpoint}/${instanceName}`

    const body: any = {
        number: remoteJid,
        mediatype: mediaType,
        mimetype: mediaType === 'audio' ? 'audio/mpeg' : (mediaType === 'document' ? 'application/pdf' : undefined),
        caption: caption,
        media: mediaUrl,
        fileName: fileName
    }

    if (mediaType === 'audio') {
        // Special handling for audio if needed
        // Sometimes "url" field is used instead of "media" depending on version
        // We assume standard body
    }

    return await fetchEvolution(url, apiKey, body)
}

async function fetchEvolution(url: string, apiKey: string, body: any) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const err = await res.text()
            console.error('Evolution API Error:', err)
            throw new Error(`Evolution API Error: ${err}`)
        }
        return await res.json()
    } catch (e) {
        console.error('Fetch Evolution Error:', e)
        return null
    }
}

export async function getMediaBase64(
    instanceName: string,
    apiKey: string,
    messageId: string,
    convertToMp4: boolean = false,
    apiUrl?: string
): Promise<{ base64: string, mimetype?: string } | null> {
    const baseUrl = apiUrl || EVOLUTION_API_URL
    const url = `${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`
    const body = {
        message: {
            key: {
                id: messageId
            }
        },
        convertToMp4
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            console.error('Error fetching media:', await res.text())
            return null
        }

        const data = await res.json()
        // Evolution returns { base64: "...", mimetype: "..." } or similar
        return {
            base64: data.base64,
            mimetype: data.mimetype
        }

    } catch (e) {
        console.error('Error in getMediaBase64:', e)
        return null
    }
}
