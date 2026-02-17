/**
 * TTS Processor
 * Generates audio responses using ElevenLabs API and uploads to Supabase Storage
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const DEFAULT_VOICE_ID = '86V9x9hrQds83qf7zaGn' // Refined default voice ID

export interface TTSResult {
    audioUrl: string
    duration?: number
}

/**
 * Generates audio from text using ElevenLabs API
 * @param text Text to convert to speech
 * @param voiceId ElevenLabs Voice ID
 * @returns Audio file as Blob
 */
async function generateTTS(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
): Promise<Blob> {
    try {
        console.log(`🗣️ [TTS] Generating audio with EightLabs voice: ${voiceId}`)
        console.log(`   Text length: ${text.length} characters`)

        if (!ELEVENLABS_API_KEY) {
            throw new Error('ELEVENLABS_API_KEY is not configured')
        }

        const url = `${ELEVENLABS_API_URL}/${voiceId}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2', // Best for diverse languages including Spanish
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`ElevenLabs API error: ${response.status} - ${error}`)
        }

        const audioBlob = await response.blob()
        console.log(`✅ [TTS] Audio generated: ${audioBlob.size} bytes`)

        return audioBlob

    } catch (error) {
        console.error(`❌ [TTS] Error generating audio:`, error)
        throw error
    }
}

/**
 * Uploads audio to Supabase Storage
 * @param supabase Supabase client
 * @param audioBlob Audio file as Blob
 * @param userId User ID for organizing files
 * @param contactId Contact ID for organizing files
 * @returns Public URL of uploaded audio
 */
async function uploadAudioToStorage(
    supabase: SupabaseClient,
    audioBlob: Blob,
    userId: string,
    contactId: string
): Promise<string> {
    try {
        console.log(`☁️ [TTS] Uploading audio to Supabase Storage (audiostemp)...`)

        const timestamp = Date.now()
        // Path: userId/contactId/tts_timestamp.mp3
        const filePath = `${userId}/${contactId}/tts_${timestamp}.mp3`

        const { data, error } = await supabase
            .storage
            .from('audiostemp')
            .upload(filePath, audioBlob, {
                contentType: 'audio/mpeg',
                upsert: false
            })

        if (error) {
            throw new Error(`Storage upload error: ${error.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('audiostemp')
            .getPublicUrl(filePath)

        console.log(`✅ [TTS] Uploaded to Storage: ${publicUrl}`)

        return publicUrl

    } catch (error) {
        console.error(`❌ [TTS] Error uploading audio to Storage:`, error)
        throw error
    }
}

/**
 * Processes text to speech conversion
 * @param supabase Supabase client
 * @param text Text to convert to speech
 * @param userId User ID
 * @param contactId Contact ID
 * @param voiceId Optional voice ID override
 * @returns TTS result with audio URL
 */
export async function processTextToSpeech(
    supabase: SupabaseClient,
    text: string,
    userId: string,
    contactId: string,
    voiceId?: string
): Promise<TTSResult> {
    try {
        console.log(`\n🎙️ [TTS] Processing text to speech...`)

        // ElevenLabs handling text limits differently, but let's be safe
        const maxLength = 2500 // ElevenLabs decent limit per request
        let processedText = text

        if (text.length > maxLength) {
            console.log(`⚠️ [TTS] Text too long (${text.length} chars), truncating to ${maxLength}`)
            processedText = text.substring(0, maxLength) + '...'
        }

        // Generate audio
        const audioBlob = await generateTTS(processedText, voiceId)

        // Upload to Storage
        const audioUrl = await uploadAudioToStorage(supabase, audioBlob, userId, contactId)

        console.log(`✅ [TTS] Text to speech processing complete`)

        return {
            audioUrl
        }

    } catch (error) {
        console.error(`❌ [TTS] Error processing text to speech:`, error)
        throw error
    }
}

/**
 * Checks if TTS is enabled for a user
 * @returns True if TTS is enabled
 */
export async function isTTSEnabled(
    supabase: SupabaseClient,
    userId: string
): Promise<boolean> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('automation_settings')
            .eq('id', userId)
            .single()

        if (!profile?.automation_settings) {
            return false
        }

        return profile.automation_settings.ttsEnabled === true

    } catch (error) {
        console.error(`❌ [TTS] Error checking TTS status:`, error)
        return false
    }
}

/**
 * Gets TTS voice preference for a user
 * @returns Voice ID or default
 */
export async function getTTSVoice(
    supabase: SupabaseClient,
    userId: string
): Promise<string> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('automation_settings')
            .eq('id', userId)
            .single()

        if (!profile?.automation_settings?.ttsVoice) {
            return DEFAULT_VOICE_ID
        }

        return profile.automation_settings.ttsVoice
    } catch (error) {
        console.error(`❌ [TTS] Error getting TTS voice:`, error)
        return DEFAULT_VOICE_ID
    }
}

/**
 * Lists available voices from ElevenLabs
 * @returns List of voices with preview URLs
 */
export async function listVoices(): Promise<any[]> {
    try {
        console.log(`🎙️ [TTS] Listing available voices from ElevenLabs...`)

        if (!ELEVENLABS_API_KEY) {
            throw new Error('ELEVENLABS_API_KEY is not configured')
        }

        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY
            }
        })

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`)
        }

        const data = await response.json()
        return data.voices || []

    } catch (error) {
        console.error(`❌ [TTS] Error listing voices:`, error)
        return []
    }
}
