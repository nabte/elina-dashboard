import OpenAI from "https:
import { getMediaBase64 } from './evolution-client.ts'
const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
const ELEVENLABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY")
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVEN_LABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM" 
function base64ToFile(base64: string, filename: string, mimeType: string): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
}
export async function processMedia(
    instanceName: string,
    apiKey: string,
    messageId: string,
    mediaType: 'audio' | 'image',
    apiUrl?: string
): Promise<string> {
    try {
        const media = await getMediaBase64(instanceName, apiKey, messageId, false, apiUrl)
        if (!media) return ""
        if (mediaType === 'audio') {
            const file = base64ToFile(media.base64, "audio.ogg", "audio/ogg")
            const transcription = await openai.audio.transcriptions.create({
                file: file,
                model: "whisper-1",
            });
            return transcription.text
        }
        if (mediaType === 'image') {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Describe esta imagen detalladamente." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${media.mimetype || 'image/jpeg'};base64,${media.base64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            });
            return response.choices[0].message.content || ""
        }
        return ""
    } catch (e) {
        return ""
    }
}
import { createSupabaseAdminClient } from "./supabase-client.ts"
export async function generateAudio(text: string): Promise<string | null> {
    if (!ELEVENLABS_API_KEY) {
        return null
    }
    const url = `https:
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        })
        if (!res.ok) {
            return null
        }
        const arrayBuffer = await res.arrayBuffer()
        const supabase = createSupabaseAdminClient()
        const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
        const fileBody = new Uint8Array(arrayBuffer)
        const { error: uploadError } = await supabase.storage
            .from('audiostemp')
            .upload(fileName, fileBody, {
                contentType: 'audio/mpeg',
                upsert: false
            })
        if (uploadError) {
            const base64 = btoa(String.fromCharCode(...fileBody))
            return `data:audio/mpeg;base64,${base64}`
        }
        const { data: { publicUrl } } = supabase.storage
            .from('audiostemp')
            .getPublicUrl(fileName)
        return publicUrl
    } catch (e) {
        return null
    }
}