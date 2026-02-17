/**
 * IMAGE HANDLER
 * Maneja la recolección y lectura de imágenes en flows
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
    CollectImageStep,
    ReadImageStep,
    FlowState,
    ImageValidationResult,
    VisionReadResult
} from './types.ts'

/**
 * Detecta si el mensaje del usuario contiene una imagen
 */
export function hasImageInMessage(message: any): boolean {
    // Evolution API format
    if (message.imageMessage) {
        return true
    }

    // Check for image URL in text
    if (message.conversation || message.extendedTextMessage?.text) {
        const text = message.conversation || message.extendedTextMessage?.text
        const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i
        return imageRegex.test(text)
    }

    return false
}

/**
 * Extrae URL(s) de imagen del mensaje
 */
export async function extractImageUrls(
    message: any,
    evolutionApiUrl: string,
    evolutionApiKey: string,
    messageId: string
): Promise<string[]> {
    const urls: string[] = []

    // Si es un imageMessage de Evolution API
    if (message.imageMessage) {
        try {
            // Descargar imagen desde Evolution API
            const mediaUrl = `${evolutionApiUrl}/message/media-base64/${messageId}`
            const response = await fetch(mediaUrl, {
                headers: {
                    'apikey': evolutionApiKey
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.base64) {
                    // TODO: Subir a Supabase Storage y retornar URL pública
                    // Por ahora retornamos la URL de Evolution (temporal)
                    urls.push(data.url || mediaUrl)
                }
            }
        } catch (error) {
            console.error('[ImageHandler] Error downloading image from Evolution:', error)
        }
    }

    // Buscar URLs en el texto
    const text = message.conversation || message.extendedTextMessage?.text || ''
    const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi
    const matches = text.match(imageRegex)
    if (matches) {
        urls.push(...matches)
    }

    return urls
}

/**
 * Valida una URL de imagen
 */
export async function validateImageUrl(url: string): Promise<ImageValidationResult> {
    try {
        const response = await fetch(url, { method: 'HEAD' })

        if (!response.ok) {
            return {
                valid: false,
                error: 'URL no accesible'
            }
        }

        const contentType = response.headers.get('content-type')
        if (!contentType?.startsWith('image/')) {
            return {
                valid: false,
                error: 'La URL no apunta a una imagen'
            }
        }

        const contentLength = response.headers.get('content-length')
        const sizeBytes = contentLength ? parseInt(contentLength) : undefined

        return {
            valid: true,
            url,
            metadata: {
                format: contentType,
                size_bytes: sizeBytes
            }
        }
    } catch (error) {
        return {
            valid: false,
            error: `Error validando imagen: ${error.message}`
        }
    }
}

/**
 * Ejecuta un CollectImageStep
 */
export async function executeCollectImageStep(
    step: CollectImageStep,
    state: FlowState,
    imageUrls: string[]
): Promise<{
    shouldPause: boolean
    message?: string
    error?: string
}> {
    const maxImages = step.max_images || 1
    const optional = step.optional || false

    // Si no hay imágenes y es opcional, continuar
    if (imageUrls.length === 0 && optional) {
        state.variables[step.variable] = []
        return {
            shouldPause: false
        }
    }

    // Si no hay imágenes y NO es opcional, pausar y pedir
    if (imageUrls.length === 0) {
        return {
            shouldPause: true,
            message: step.content
        }
    }

    // Validar número de imágenes
    if (imageUrls.length > maxImages) {
        return {
            shouldPause: true,
            message: `Por favor envía máximo ${maxImages} imagen${maxImages > 1 ? 'es' : ''}.`,
            error: 'too_many_images'
        }
    }

    // Validar cada URL
    const validatedUrls: string[] = []
    for (const url of imageUrls) {
        const validation = await validateImageUrl(url)
        if (validation.valid) {
            validatedUrls.push(url)
        }
    }

    if (validatedUrls.length === 0) {
        return {
            shouldPause: true,
            message: 'No se pudo validar ninguna imagen. Por favor intenta nuevamente.',
            error: 'validation_failed'
        }
    }

    // Guardar imágenes en el state
    state.variables[step.variable] = validatedUrls.length === 1 ? validatedUrls[0] : validatedUrls

    // Guardar metadata
    if (!state.metadata) state.metadata = {} as any
    if (!state.metadata.collected_images) state.metadata.collected_images = {}

    state.metadata.collected_images[step.variable] = {
        urls: validatedUrls,
        collected_at: new Date().toISOString()
    }

    // Si debe leer contenido, hacerlo ahora
    if (step.read_content) {
        try {
            const readResult = await readImageWithVision(validatedUrls[0])
            if (readResult.success && readResult.description) {
                state.metadata.collected_images[step.variable].read_content = readResult.description
            }
        } catch (error) {
            console.error('[ImageHandler] Error reading image content:', error)
        }
    }

    return {
        shouldPause: false,
        message: `✅ ${validatedUrls.length} imagen${validatedUrls.length > 1 ? 'es' : ''} recibida${validatedUrls.length > 1 ? 's' : ''}.`
    }
}

/**
 * Ejecuta un ReadImageStep usando Vision AI
 */
export async function executeReadImageStep(
    step: ReadImageStep,
    state: FlowState
): Promise<{
    success: boolean
    error?: string
}> {
    const imageUrl = state.variables[step.image_variable]

    if (!imageUrl) {
        return {
            success: false,
            error: `Variable ${step.image_variable} no contiene una URL de imagen`
        }
    }

    const prompt = step.prompt || 'Describe esta imagen en detalle.'

    try {
        const result = await readImageWithVision(
            imageUrl,
            prompt,
            step.extract_text,
            step.extract_json
        )

        if (!result.success) {
            return {
                success: false,
                error: result.error
            }
        }

        // Guardar resultado en la variable de salida
        if (step.extract_json && result.extracted_json) {
            state.variables[step.output_variable] = result.extracted_json
        } else if (step.extract_text && result.extracted_text) {
            state.variables[step.output_variable] = result.extracted_text
        } else {
            state.variables[step.output_variable] = result.description
        }

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: `Error leyendo imagen: ${error.message}`
        }
    }
}

/**
 * Lee una imagen usando GPT-4 Vision
 */
async function readImageWithVision(
    imageUrl: string,
    prompt: string = 'Describe esta imagen en detalle.',
    extractText: boolean = false,
    extractJson: boolean = false
): Promise<VisionReadResult> {
    try {
        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
            return {
                success: false,
                error: 'OpenAI API Key no configurada'
            }
        }

        // Construir prompt según lo que se necesita
        let finalPrompt = prompt

        if (extractText) {
            finalPrompt += '\n\nExtrae TODO el texto visible en la imagen. Devuelve solo el texto extraído, sin comentarios adicionales.'
        }

        if (extractJson) {
            finalPrompt += '\n\nDevuelve los datos en formato JSON válido.'
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o', // GPT-4 Turbo with Vision
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: finalPrompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            return {
                success: false,
                error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`
            }
        }

        const data = await response.json()
        const content = data.choices[0]?.message?.content

        if (!content) {
            return {
                success: false,
                error: 'No se recibió respuesta de Vision AI'
            }
        }

        const result: VisionReadResult = {
            success: true,
            description: content,
            model_used: 'gpt-4o'
        }

        // Si se pidió extraer texto, guardarlo
        if (extractText) {
            result.extracted_text = content
        }

        // Si se pidió JSON, intentar parsearlo
        if (extractJson) {
            try {
                // Intentar extraer JSON del contenido
                const jsonMatch = content.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    result.extracted_json = JSON.parse(jsonMatch[0])
                } else {
                    result.extracted_json = { raw: content }
                }
            } catch (e) {
                console.warn('[ImageHandler] Could not parse JSON from Vision response')
                result.extracted_json = { raw: content }
            }
        }

        return result
    } catch (error) {
        return {
            success: false,
            error: `Error llamando a Vision AI: ${error.message}`
        }
    }
}
