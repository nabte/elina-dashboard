export const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https:
function getHumanizedDelay(): number {
    return Math.floor(Math.random() * (2500 - 800 + 1)) + 800
}
export async function sendMessage(
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    text: string,
    apiUrl?: string,
    options?: { delay?: number, linkPreview?: boolean }
) {
    const baseUrl = apiUrl || EVOLUTION_API_URL
    const url = `${baseUrl}/message/sendText/${instanceName}`
    const body = {
        number: remoteJid,
        text: text,
        delay: options?.delay || getHumanizedDelay(), 
        linkPreview: options?.linkPreview !== false
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
    if (mediaType === 'audio') endpoint = 'sendWhatsAppAudio'; 
    else if (mediaType === 'document') endpoint = 'sendMedia'; 
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
            throw new Error(`Evolution API Error: ${err}`)
        }
        return await res.json()
    } catch (e) {
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
            return null
        }
        const data = await res.json()
        return {
            base64: data.base64,
            mimetype: data.mimetype
        }
    } catch (e) {
        return null
    }
}
export async function getMediaUrl(
    instanceName: string,
    apiKey: string,
    messageId: string,
    apiUrl?: string
): Promise<string | null> {
    const media = await getMediaBase64(instanceName, apiKey, messageId, false, apiUrl);
    if (!media || !media.base64) return null;
    return `data:${media.mimetype};base64,${media.base64}`;
}
export async function sendImage(
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    imageUrl: string,
    caption?: string,
    apiUrl?: string
) {
    return await sendMedia(instanceName, apiKey, remoteJid, imageUrl, 'image', caption, undefined, apiUrl)
}
export async function sendVideo(
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    videoUrl: string,
    caption?: string,
    apiUrl?: string
) {
    return await sendMedia(instanceName, apiKey, remoteJid, videoUrl, 'video', caption, undefined, apiUrl)
}
export async function sendAudio(
    instanceName: string,
    apiKey: string,
    remoteJid: string,
    audioUrl: string,
    apiUrl?: string
) {
    return await sendMedia(instanceName, apiKey, remoteJid, audioUrl, 'audio', undefined, undefined, apiUrl)
}