/**
 * Cliente Venom para envío de mensajes
 * Reemplaza Evolution API client
 */

interface VenomMessage {
    sessionId: string;
    to: string;
    message: string | { path: string; caption?: string; filename?: string };
    type: 'text' | 'image' | 'video';
    format?: 'url' | 'base64';
}

const VENOM_SERVICE_URL = Deno.env.get('VENOM_SERVICE_URL') || '';
const VENOM_API_KEY = Deno.env.get('VENOM_API_KEY') || '';

export async function sendMessage(
    sessionId: string,
    remoteJid: string,
    text: string
): Promise<void> {
    console.log(`📤 [VENOM] Sending text to ${remoteJid}`);

    const payload: VenomMessage = {
        sessionId,
        to: remoteJid.replace('@s.whatsapp.net', ''),
        message: text,
        type: 'text'
    };

    const response = await fetch(`${VENOM_SERVICE_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': VENOM_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Venom error: ${response.status} - ${errorText}`);
    }

    console.log(`✅ [VENOM] Message sent successfully`);
}

export async function sendImage(
    sessionId: string,
    remoteJid: string,
    imageUrl: string,
    caption?: string,
    format: 'url' | 'base64' = 'url'
): Promise<void> {
    console.log(`📤 [VENOM] Sending image to ${remoteJid}`);

    const payload: VenomMessage = {
        sessionId,
        to: remoteJid.replace('@s.whatsapp.net', ''),
        message: {
            path: imageUrl,
            caption: caption || ' ', // Espacio en lugar de string vacío (requerido por validator)
            filename: 'image.jpg'
        },
        type: 'image',
        format
    };

    const response = await fetch(`${VENOM_SERVICE_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': VENOM_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Venom error: ${response.status} - ${errorText}`);
    }

    console.log(`✅ [VENOM] Image sent successfully`);
}

export async function sendVideo(
    sessionId: string,
    remoteJid: string,
    videoUrl: string,
    caption?: string,
    format: 'url' | 'base64' = 'url'
): Promise<void> {
    console.log(`📤 [VENOM] Sending video to ${remoteJid}`);

    const payload: VenomMessage = {
        sessionId,
        to: remoteJid.replace('@s.whatsapp.net', ''),
        message: {
            path: videoUrl,
            caption: caption || ' ', // Espacio en lugar de string vacío
            filename: 'video.mp4'
        },
        type: 'video',
        format
    };

    const response = await fetch(`${VENOM_SERVICE_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': VENOM_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Venom error: ${response.status} - ${errorText}`);
    }

    console.log(`✅ [VENOM] Video sent successfully`);
}
