/**
 * ELINA V5 - Fetch with Retry Logic
 * 
 * Utilidad para hacer fetch con reintentos automáticos
 */

export interface RetryOptions {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
}

/**
 * Realiza un fetch con reintentos automáticos y backoff exponencial
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retryOptions: RetryOptions = {}
): Promise<Response> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2
    } = retryOptions

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 [RETRY] Attempt ${attempt + 1}/${maxRetries + 1} for ${url}`)

            const response = await fetch(url, options)

            // Si es exitoso, retornar
            if (response.ok) {
                if (attempt > 0) {
                    console.log(`✅ [RETRY] Succeeded on attempt ${attempt + 1}`)
                }
                return response
            }

            // Si es un error 4xx (cliente), no reintentar
            if (response.status >= 400 && response.status < 500) {
                console.warn(`⚠️ [RETRY] Client error ${response.status}, not retrying`)
                return response
            }

            // Si es un error 5xx (servidor), reintentar
            throw new Error(`Server error: ${response.status} ${response.statusText}`)

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            // Si es el último intento, lanzar el error
            if (attempt === maxRetries) {
                console.error(`❌ [RETRY] All ${maxRetries + 1} attempts failed`)
                throw lastError
            }

            // Calcular delay con backoff exponencial
            const delay = Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt),
                maxDelay
            )

            console.warn(`⚠️ [RETRY] Attempt ${attempt + 1} failed: ${lastError.message}`)
            console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`)

            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    // Esto nunca debería ejecutarse, pero TypeScript lo requiere
    throw lastError || new Error('Unknown error in fetchWithRetry')
}

/**
 * Wrapper específico para Evolution API
 */
export async function fetchEvolutionAPI(
    url: string,
    apiKey: string,
    body: any
): Promise<Response> {
    return fetchWithRetry(
        url,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify(body)
        },
        {
            maxRetries: 3,
            initialDelay: 500,
            maxDelay: 5000
        }
    )
}

/**
 * Wrapper específico para OpenRouter API
 */
export async function fetchOpenRouterAPI(
    apiKey: string,
    body: any
): Promise<Response> {
    return fetchWithRetry(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://elina.ai',
                'X-Title': 'ELINA V5',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        },
        {
            maxRetries: 2,
            initialDelay: 1000,
            maxDelay: 8000
        }
    )
}
