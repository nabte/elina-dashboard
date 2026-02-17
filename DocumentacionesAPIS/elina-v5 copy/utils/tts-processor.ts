/**
 * TTS Processor
 * Generates audio responses using OpenAI TTS API and uploads to CDN
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!
const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE') || 'elina-media'
const BUNNY_CDN_URL = Deno.env.get('BUNNY_CDN_URL') || 'https://elina-media.b-cdn.net'

export interface TTSResult {
    audioUrl: string
    duration?: number
}

/**
 * Generates audio from text using OpenAI TTS API
 * @param text Text to convert to speech
 * @param voice Voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns Audio file as Blob
 */
async function generateTTS(
    text: string,
    voice: string = 'nova'
): Promise<Blob> {
    try {
        console.log(`🗣️ [TTS] Generating audio with voice: ${voice}`)
        console.log(`   Text length: ${text.length} characters`)

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: voice,
                input: text,
                response_format: 'mp3'
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`TTS API error: ${error}`)
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
 * Uploads audio to Bunny CDN
 * @param audioBlob Audio file as Blob
 * @param userId User ID for organizing files
 * @param contactId Contact ID for organizing files
 * @returns CDN URL of uploaded audio
 */
async function uploadAudioToCDN(
    audioBlob: Blob,
    userId: string,
    contactId: string
): Promise<string> {
    try {
        console.log(`☁️ [TTS] Uploading audio to Bunny CDN...`)

        // Generate unique filename
        const timestamp = Date.now()
        const filename = `${userId}/${contactId}/tts_${timestamp}.mp3`
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`

        // Upload to Bunny
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg'
            },
            body: audioBlob
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Bunny CDN upload error: ${error}`)
        }

        const cdnUrl = `${BUNNY_CDN_URL}/${filename}`
        console.log(`✅ [TTS] Uploaded to CDN: ${cdnUrl}`)

        return cdnUrl

    } catch (error) {
        console.error(`❌ [TTS] Error uploading audio to CDN:`, error)
        throw error
    }
}

/**
 * Processes text to speech conversion
 * @param supabase Supabase client
 * @param text Text to convert to speech
 * @param userId User ID
 * @param contactId Contact ID
 * @param voice Optional voice selection
 * @returns TTS result with audio URL
 */
export async function processTextToSpeech(
    supabase: SupabaseClient,
    text: string,
    userId: string,
    contactId: string,
    voice?: string
): Promise<TTSResult> {
    try {
        console.log(`\n🎙️ [TTS] Processing text to speech...`)

        // Limit text length (TTS API has a 4096 character limit)
        const maxLength = 4000
        let processedText = text

        if (text.length > maxLength) {
            console.log(`⚠️ [TTS] Text too long (${text.length} chars), truncating to ${maxLength}`)
            processedText = text.substring(0, maxLength) + '...'
        }

        // Generate audio
        const audioBlob = await generateTTS(processedText, voice)

        // Upload to CDN
        const audioUrl = await uploadAudioToCDN(audioBlob, userId, contactId)

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
 * @param supabase Supabase client
 * @param userId User ID
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
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Voice name or default
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
            return 'nova' // Default voice
        }

        return profile.automation_settings.ttsVoice

    } catch (error) {
        console.error(`❌ [TTS] Error getting TTS voice:`, error)
        return 'nova'
    }
}
