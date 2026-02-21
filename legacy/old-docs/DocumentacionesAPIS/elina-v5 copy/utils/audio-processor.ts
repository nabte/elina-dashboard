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
 * Downloads audio file from Evolution API
 * @param audioUrl URL of the audio file
 * @param evolutionApiKey Evolution API key
 * @returns Audio file as Blob
 */
async function downloadAudio(audioUrl: string, evolutionApiKey: string): Promise<Blob> {
    try {
        console.log(`📥 [AUDIO] Downloading audio from: ${audioUrl}`)

        const response = await fetch(audioUrl, {
            headers: {
                'apikey': evolutionApiKey
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`)
        }

        const audioBlob = await response.blob()
        console.log(`✅ [AUDIO] Audio downloaded: ${audioBlob.size} bytes`)

        return audioBlob

    } catch (error) {
        console.error(`❌ [AUDIO] Error downloading audio:`, error)
        throw error
    }
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
    language: string = 'es'
): Promise<AudioProcessingResult> {
    try {
        console.log(`\n🎵 [AUDIO] Processing audio message...`)

        // Extract audio URL from message
        const audioUrl = audioMessage.url || audioMessage.mediaUrl

        if (!audioUrl) {
            throw new Error('No audio URL found in message')
        }

        // Download audio
        const audioBlob = await downloadAudio(audioUrl, evolutionApiKey)

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
