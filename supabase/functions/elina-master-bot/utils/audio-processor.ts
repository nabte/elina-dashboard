/**
 * Audio Processor
 * Processes audio messages using OpenAI Whisper API for transcription
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

export interface AudioProcessingResult {
    transcription: string
    duration?: number
    language?: string
}

/**
 * Fetches audio base64 from Evolution API
 * @param messageId Message ID
 * @param instanceName Instance name
 * @param serverUrl Evolution API URL
 * @param apiKey Evolution API Key
 * @returns Base64 string of the audio
 */
async function fetchAudioBase64(
    messageId: string,
    instanceName: string,
    serverUrl: string,
    apiKey: string
): Promise<string> {
    try {
        console.log(`📥 [AUDIO] Fetching base64 for message: ${messageId}`)

        const response = await fetch(`${serverUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                message: {
                    key: {
                        id: messageId
                    }
                },
                convertToMp4: false
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch audio base64: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.base64) {
            throw new Error('No base64 data returned from Evolution API')
        }

        return data.base64

    } catch (error) {
        console.error(`❌ [AUDIO] Error fetching base64:`, error)
        throw error
    }
}

/**
 * Converts Base64 string to Blob
 * @param base64 Base64 string
 * @param mimeType Mime type (default: audio/ogg)
 * @returns Blob
 */
function base64ToBlob(base64: string, mimeType: string = 'audio/ogg'): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
}

/**
 * Transcribes audio using OpenAI Whisper API
 * @param audioBlob Audio file as Blob
 * @param language Optional language code (e.g., 'es', 'en')
 * @returns Transcription result
 */
async function transcribeAudio(
    audioBlob: Blob,
    language?: string
): Promise<AudioProcessingResult> {
    try {
        console.log(`🎤 [AUDIO] Transcribing audio with Whisper...`)

        // Create form data
        const formData = new FormData()
        formData.append('file', audioBlob, 'audio.ogg')
        formData.append('model', 'whisper-1')

        if (language) {
            formData.append('language', language)
        }

        // Call Whisper API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Whisper API error: ${error}`)
        }

        const data = await response.json()

        console.log(`✅ [AUDIO] Transcription complete: "${data.text.substring(0, 100)}..."`)

        return {
            transcription: data.text,
            language: data.language,
            duration: data.duration
        }

    } catch (error) {
        console.error(`❌ [AUDIO] Error transcribing audio:`, error)
        throw error
    }
}

/**
 * Processes an audio message
 * @param supabase Supabase client
 * @param audioMessage Audio message object from Evolution API
 * @param evolutionApiKey Evolution API key
 * @param language Optional language code
 * @returns Transcription result
 */
export async function processAudioMessage(
    supabase: SupabaseClient,
    audioMessage: any,
    evolutionApiKey: string,
    instanceName: string,
    serverUrl: string,
    messageId: string,
    language: string = 'es'
): Promise<AudioProcessingResult> {
    try {
        console.log(`\n🎵 [AUDIO] Processing audio message...`)

        // Fetch audio as base64 using Evolution API (handles encryption)
        const base64Audio = await fetchAudioBase64(
            messageId,
            instanceName,
            serverUrl,
            evolutionApiKey
        )

        // Convert to Blob
        const audioBlob = base64ToBlob(base64Audio)

        // Transcribe audio
        const result = await transcribeAudio(audioBlob, language)

        console.log(`✅ [AUDIO] Audio processing complete`)
        return result

    } catch (error) {
        console.error(`❌ [AUDIO] Error processing audio message:`, error)
        throw error
    }
}

/**
 * Checks if a message is an audio message
 * @param message Message object from Evolution API
 * @returns True if message is audio
 */
export function isAudioMessage(message: any): boolean {
    return message.audioMessage !== undefined || message.messageType === 'audioMessage'
}

/**
 * Extracts audio message data from Evolution API message
 * @param message Message object from Evolution API
 * @returns Audio message data or null
 */
export function extractAudioMessage(message: any): any | null {
    if (message.audioMessage) {
        return message.audioMessage
    }

    if (message.messageType === 'audioMessage' && message.message) {
        return message.message
    }

    return null
}
