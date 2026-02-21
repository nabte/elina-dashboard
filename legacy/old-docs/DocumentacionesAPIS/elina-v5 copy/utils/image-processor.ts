/**
 * Image Processor
 * Processes image messages using OpenAI Vision API and uploads to CDN
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!
const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE') || 'elina-media'
const BUNNY_CDN_URL = Deno.env.get('BUNNY_CDN_URL') || 'https://elina-media.b-cdn.net'
const GPT_MODEL = 'gpt-4o-mini'

export interface ImageProcessingResult {
    description: string
    cdnUrl: string
    originalUrl: string
}

/**
 * Downloads image from Evolution API
 * @param imageUrl URL of the image
 * @param evolutionApiKey Evolution API key
 * @returns Image file as Blob
 */
async function downloadImage(imageUrl: string, evolutionApiKey: string): Promise<Blob> {
    try {
        console.log(`📥 [IMAGE] Downloading image from: ${imageUrl}`)

        const response = await fetch(imageUrl, {
            headers: {
                'apikey': evolutionApiKey
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`)
        }

        const imageBlob = await response.blob()
        console.log(`✅ [IMAGE] Image downloaded: ${imageBlob.size} bytes`)

        return imageBlob

    } catch (error) {
        console.error(`❌ [IMAGE] Error downloading image:`, error)
        throw error
    }
}

/**
 * Analyzes image using OpenAI Vision API
 * @param imageUrl URL of the image (must be publicly accessible)
 * @returns Image description
 */
async function analyzeImageWithVision(imageUrl: string): Promise<string> {
    try {
        console.log(`👁️ [IMAGE] Analyzing image with Vision API...`)

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GPT_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Describe esta imagen en detalle. Si contiene texto, transcríbelo. Si es un producto, describe sus características. Sé conciso pero completo.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Vision API error: ${error}`)
        }

        const data = await response.json()
        const description = data.choices[0].message.content

        console.log(`✅ [IMAGE] Image analyzed: "${description.substring(0, 100)}..."`)

        return description

    } catch (error) {
        console.error(`❌ [IMAGE] Error analyzing image:`, error)
        throw error
    }
}

/**
 * Uploads image to Bunny CDN
 * @param imageBlob Image file as Blob
 * @param userId User ID for organizing files
 * @param contactId Contact ID for organizing files
 * @returns CDN URL of uploaded image
 */
async function uploadToCDN(
    imageBlob: Blob,
    userId: string,
    contactId: string
): Promise<string> {
    try {
        console.log(`☁️ [IMAGE] Uploading to Bunny CDN...`)

        // Generate unique filename
        const timestamp = Date.now()
        const filename = `${userId}/${contactId}/image_${timestamp}.jpg`
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`

        // Upload to Bunny
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'image/jpeg'
            },
            body: imageBlob
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Bunny CDN upload error: ${error}`)
        }

        const cdnUrl = `${BUNNY_CDN_URL}/${filename}`
        console.log(`✅ [IMAGE] Uploaded to CDN: ${cdnUrl}`)

        return cdnUrl

    } catch (error) {
        console.error(`❌ [IMAGE] Error uploading to CDN:`, error)
        throw error
    }
}

/**
 * Processes an image message
 * @param supabase Supabase client
 * @param imageMessage Image message object from Evolution API
 * @param evolutionApiKey Evolution API key
 * @param userId User ID
 * @param contactId Contact ID
 * @returns Image processing result
 */
export async function processImageMessage(
    supabase: SupabaseClient,
    imageMessage: any,
    evolutionApiKey: string,
    userId: string,
    contactId: string
): Promise<ImageProcessingResult> {
    try {
        console.log(`\n🖼️ [IMAGE] Processing image message...`)

        // Extract image URL from message
        const imageUrl = imageMessage.url || imageMessage.mediaUrl

        if (!imageUrl) {
            throw new Error('No image URL found in message')
        }

        // Download image
        const imageBlob = await downloadImage(imageUrl, evolutionApiKey)

        // Upload to CDN first (to get a stable URL for Vision API)
        const cdnUrl = await uploadToCDN(imageBlob, userId, contactId)

        // Analyze image with Vision API
        const description = await analyzeImageWithVision(cdnUrl)

        console.log(`✅ [IMAGE] Image processing complete`)

        return {
            description,
            cdnUrl,
            originalUrl: imageUrl
        }

    } catch (error) {
        console.error(`❌ [IMAGE] Error processing image message:`, error)
        throw error
    }
}

/**
 * Checks if a message is an image message
 * @param message Message object from Evolution API
 * @returns True if message is image
 */
export function isImageMessage(message: any): boolean {
    return message.imageMessage !== undefined || message.messageType === 'imageMessage'
}

/**
 * Extracts image message data from Evolution API message
 * @param message Message object from Evolution API
 * @returns Image message data or null
 */
export function extractImageMessage(message: any): any | null {
    if (message.imageMessage) {
        return message.imageMessage
    }

    if (message.messageType === 'imageMessage' && message.message) {
        return message.message
    }

    return null
}
