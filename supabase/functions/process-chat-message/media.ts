
import OpenAI from "https://esm.sh/openai@4.51.0";
import { getMediaBase64 } from './evolution-client.ts'

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

// ElevenLabs Config
const ELEVENLABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY")
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVEN_LABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM" // Default Rachel

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
        console.log(`Processing media ${mediaType} for message ${messageId}`)
        const media = await getMediaBase64(instanceName, apiKey, messageId, false, apiUrl)
        if (!media) return ""

        if (mediaType === 'audio') {
            const file = base64ToFile(media.base64, "audio.ogg", "audio/ogg")
            // Use Whisper (OpenAI) for transcription as requested
            const transcription = await openai.audio.transcriptions.create({
                file: file,
                model: "whisper-1",
            });
            console.log(`Transcription: ${transcription.text}`)
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
        console.error("Error processing media:", e)
        return ""
    }
}

import { createSupabaseAdminClient } from "./supabase-client.ts"

export async function generateAudio(text: string): Promise<string | null> {
    if (!ELEVENLABS_API_KEY) {
        console.error("Missing ELEVEN_LABS_API_KEY")
        return null
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`

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
            console.error("ElevenLabs Error:", await res.text())
            return null
        }

        const arrayBuffer = await res.arrayBuffer()

        // Upload to Supabase Storage
        const supabase = createSupabaseAdminClient()
        const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`

        // Convert ArrayBuffer to Uint8Array for upload
        const fileBody = new Uint8Array(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from('audiostemp')
            .upload(fileName, fileBody, {
                contentType: 'audio/mpeg',
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading audio to Storage:', uploadError)
            // Fallback to Base64 if storage fails (optional, but good for robustness)
            const base64 = btoa(String.fromCharCode(...fileBody))
            return `data:audio/mpeg;base64,${base64}`
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('audiostemp')
            .getPublicUrl(fileName)

        return publicUrl

    } catch (e) {
        console.error("Error generating audio:", e)
        return null
    }
}
