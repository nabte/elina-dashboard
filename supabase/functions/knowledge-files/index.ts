
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get user from JWT
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const url = new URL(req.url)
        const { pathname, searchParams } = url
        const method = req.method

        console.log(`[knowledge-files] Request: ${method} ${pathname}`)

        // Routes regex matching
        const isCollection = pathname.match(/\/knowledge-files\/?$/)
        const isItem = pathname.match(/\/knowledge-files\/([^/]+)$/)

        // GET /knowledge-files - List all files for user
        if (method === 'GET' && isCollection) {
            const { data: files, error } = await supabaseClient
                .from('knowledge_files')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            return new Response(JSON.stringify({ files }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // GET /knowledge-files/:id - Get specific file details
        if (method === 'GET' && isItem) {
            const fileId = isItem[1]

            const { data: file, error } = await supabaseClient
                .from('knowledge_files')
                .select('*')
                .eq('id', fileId)
                .eq('user_id', user.id)
                .single()

            if (error) throw error

            return new Response(JSON.stringify({ file }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // POST /knowledge-files/generate-faqs - Generate FAQs from raw text
        // Relaxed matching: check if it ends with /generate-faqs
        if (method === 'POST' && pathname.endsWith('/generate-faqs')) {
            const { rawText } = await req.json()

            if (!rawText || rawText.length < 50) {
                return new Response(JSON.stringify({ error: 'Text too short (min 50 chars)' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                })
            }

            console.log(`🤖 Generating FAQs from text (${rawText.length} chars)...`)

            // Call LLM (OpenRouter) to extract FAQs
            const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
            if (!OPENROUTER_API_KEY) {
                throw new Error('OPENROUTER_API_KEY not configured')
            }

            const prompt = `
            Actúa como un experto en conocimiento y atención al cliente.
            Tu tarea es analizar el siguiente texto de un negocio y extraer las Preguntas Frecuentes (FAQs) más importantes.
            
            TEXTO DEL NEGOCIO:
            "${rawText}"

            INSTRUCCIONES:
            1. Genera entre 10 y 25 pares de Pregunta/Respuesta relevantes.
            2. Las preguntas deben ser como las haría un cliente real.
            3. Las respuestas deben ser claras, directas y útiles.
            4. Si el texto menciona horarios, ubicación, precios o servicios clave, asegúrate de crear una FAQ para cada uno.
            5. Retorna SOLO un JSON con este formato exacto, sin markdown ni texto extra:
            [
                { "question": "¿Cuál es el horario?", "answer": "Abrimos de lunes a viernes de 9am a 6pm." },
                ...
            ]
            `

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001', // Rápido y bueno para esto
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            })

            if (!response.ok) {
                const err = await response.text()
                throw new Error(`OpenRouter Error: ${err}`)
            }

            const aiData = await response.json()
            const content = aiData.choices[0].message.content.trim()

            // Clean markdown code blocks if present
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()

            let faqs = []
            try {
                faqs = JSON.parse(jsonStr)
            } catch (e) {
                console.error('Failed to parse AI JSON:', jsonStr)
                throw new Error('Failed to generate valid FAQs structure')
            }

            if (!Array.isArray(faqs) || faqs.length === 0) {
                throw new Error('No FAQs generated')
            }

            console.log(`✅ Generated ${faqs.length} FAQs. Saving to database...`)

            const savedFaqs = []

            // Save each FAQ as a virtual file
            for (let i = 0; i < faqs.length; i++) {
                const faq = faqs[i]
                const faqText = `P: ${faq.question}\nR: ${faq.answer}`
                const timestamp = Date.now()

                // Create DB record
                const { data: fileRecord, error: dbError } = await supabaseClient
                    .from('knowledge_files')
                    .insert({
                        user_id: user.id,
                        filename: `faq_${i + 1}_${faq.question.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.txt`,
                        file_path: `virtual://faq/${timestamp}/${i}`, // Virtual path
                        mime_type: 'text/plain',
                        file_size: faqText.length,
                        extracted_text: faqText, // Store text directly
                        status: 'processing',
                    })
                    .select()
                    .single()

                if (dbError) {
                    console.error('Error saving FAQ:', dbError)
                    continue
                }

                // Generate embedding immediately using existing function
                // We don't await this to speed up response, but in Edge logic it's safer to await loop if not too long
                // Given it's 10-25 small texts, we can await to ensure completion or just fire it.
                // Let's await to be safe since we are in a loop
                await processTextAsync(supabaseClient, fileRecord.id, faqText, user.id)

                savedFaqs.push({
                    id: fileRecord.id,
                    question: faq.question,
                    answer: faq.answer
                })
            }

            return new Response(JSON.stringify({
                success: true,
                count: savedFaqs.length,
                faqs: savedFaqs
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // POST /knowledge-files - Upload new file
        if (method === 'POST' && isCollection) {
            const formData = await req.formData()
            const file = formData.get('file') as File

            if (!file) {
                return new Response(JSON.stringify({ error: 'No file provided' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                })
            }

            // Check plan limits
            const { data: orgData } = await supabaseClient
                .from('organizations')
                .select('subscription_plan')
                .eq('user_id', user.id)
                .single()

            const plan = orgData?.subscription_plan || 'free'

            // Count existing files
            const { count: fileCount } = await supabaseClient
                .from('knowledge_files')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            // Plan limits
            const limits = {
                free: { maxFiles: 5, maxFileSize: 10 * 1024 * 1024 }, // 10MB
                pro: { maxFiles: 50, maxFileSize: 100 * 1024 * 1024 }, // 100MB
                enterprise: { maxFiles: 999999, maxFileSize: 500 * 1024 * 1024 } // 500MB
            }

            const userLimit = limits[plan as keyof typeof limits] || limits.free

            // Check file count limit
            if (fileCount !== null && fileCount >= userLimit.maxFiles) {
                return new Response(JSON.stringify({
                    error: `Plan ${plan} limit reached. Maximum ${userLimit.maxFiles} files allowed. Upgrade to upload more.`,
                    upgrade_required: true
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 403,
                })
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
            if (!allowedTypes.includes(file.type)) {
                return new Response(JSON.stringify({ error: 'Invalid file type. Only PDF, DOCX, and TXT are allowed.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                })
            }

            // Validate file size based on plan
            if (file.size > userLimit.maxFileSize) {
                const sizeMB = Math.round(userLimit.maxFileSize / 1024 / 1024)
                return new Response(JSON.stringify({
                    error: `File too large for ${plan} plan. Maximum size is ${sizeMB}MB. Upgrade for larger files.`,
                    upgrade_required: true
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 403,
                })
            }

            // Upload to Bunny.net CDN instead of Supabase Storage
            const BUNNY_STORAGE_ZONE_NAME = Deno.env.get('BUNNY_STORAGE_ZONE_NAME') || 'elina-storage'
            const BUNNY_STORAGE_REGION_HOST = Deno.env.get('BUNNY_STORAGE_REGION_HOST') || 'storage.bunnycdn.com'
            const fileName = `knowledge/${user.id}/${Date.now()}_${file.name}`
            const bunnyUrl = `https://${BUNNY_STORAGE_REGION_HOST}/${BUNNY_STORAGE_ZONE_NAME}/${fileName}`

            const bunnyUpload = await fetch(bunnyUrl, {
                method: 'PUT',
                headers: {
                    'AccessKey': Deno.env.get('BUNNY_STORAGE_ACCESS_KEY') || Deno.env.get('BUNNY_STORAGE_API_KEY') || '',
                    'Content-Type': file.type,
                },
                body: await file.arrayBuffer()
            })

            if (!bunnyUpload.ok) {
                const errorText = await bunnyUpload.text()
                throw new Error(`Bunny upload failed: ${bunnyUpload.statusText} - ${errorText}`)
            }

            // CDN URL for public access
            const BUNNY_PULL_ZONE_HOSTNAME = Deno.env.get('BUNNY_PULL_ZONE_HOSTNAME') || 'elina-cdn.b-cdn.net'
            const cdnUrl = `https://${BUNNY_PULL_ZONE_HOSTNAME}/${fileName}`

            // Create database record
            const { data: fileRecord, error: dbError } = await supabaseClient
                .from('knowledge_files')
                .insert({
                    user_id: user.id,
                    filename: file.name,
                    file_path: cdnUrl, // Store CDN URL instead of storage path
                    mime_type: file.type,
                    file_size: file.size,
                    status: 'pending',
                })
                .select()
                .single()

            if (dbError) throw dbError

            // Trigger processing asynchronously (pass file buffer directly)
            processFileAsync(supabaseClient, fileRecord.id, cdnUrl, file.type, await file.arrayBuffer(), user.id)

            return new Response(JSON.stringify({ file: fileRecord }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 201,
            })
        }

        // PUT /knowledge-files/:id - Update content (Edit functionality)
        if (method === 'PUT' && isItem) {
            const fileId = isItem[1]
            const { content } = await req.json()

            if (!content) {
                return new Response(JSON.stringify({ error: 'No content provided' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                })
            }

            // Verify ownership
            const { data: file, error: fetchError } = await supabaseClient
                .from('knowledge_files')
                .select('*')
                .eq('id', fileId)
                .eq('user_id', user.id)
                .single()

            if (fetchError || !file) {
                return new Response(JSON.stringify({ error: 'File not found or unauthorized' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                })
            }

            // 1. Update extracted_text in DB
            // 2. Set status to processing
            const { error: updateError } = await supabaseClient
                .from('knowledge_files')
                .update({
                    extracted_text: content,
                    status: 'processing',
                    error_message: null
                })
                .eq('id', fileId)

            if (updateError) throw updateError

            // 3. Delete old embeddings
            await supabaseClient
                .from('knowledge_embeddings')
                .delete()
                .eq('file_id', fileId)

            // 4. Trigger re-processing (embedding generation only)
            // We pass null for buffer since we already have the text
            processTextAsync(supabaseClient, fileId, content, user.id)

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // DELETE /knowledge-files/:id - Delete file
        if (method === 'DELETE' && isItem) {
            const fileId = isItem[1]

            // Get file info
            const { data: file, error: fetchError } = await supabaseClient
                .from('knowledge_files')
                .select('file_path')
                .eq('id', fileId)
                .eq('user_id', user.id)
                .single()

            if (fetchError) throw fetchError

            // Delete from Bunny.net CDN
            // Extract filename from CDN URL
            // Assuming URL structure: https://[hostname]/knowledge/[user_id]/[timestamp]_[filename]
            try {
                const urlObj = new URL(file.file_path)
                const path = urlObj.pathname // /knowledge/...

                const BUNNY_STORAGE_ZONE_NAME = Deno.env.get('BUNNY_STORAGE_ZONE_NAME') || 'elina-storage'
                const BUNNY_STORAGE_REGION_HOST = Deno.env.get('BUNNY_STORAGE_REGION_HOST') || 'storage.bunnycdn.com'

                // Remove leading slash for bunny api
                const bunnyPath = path.substring(1)
                const bunnyDeleteUrl = `https://${BUNNY_STORAGE_REGION_HOST}/${BUNNY_STORAGE_ZONE_NAME}/${bunnyPath}`

                const bunnyDelete = await fetch(bunnyDeleteUrl, {
                    method: 'DELETE',
                    headers: {
                        'AccessKey': Deno.env.get('BUNNY_STORAGE_ACCESS_KEY') || Deno.env.get('BUNNY_STORAGE_API_KEY') || ''
                    }
                })

                if (!bunnyDelete.ok) {
                    console.error('Bunny deletion error:', bunnyDelete.statusText)
                }
            } catch (e) {
                console.error('Error parsing file path for deletion:', e)
            }

            // Delete embeddings
            await supabaseClient
                .from('knowledge_embeddings')
                .delete()
                .eq('file_id', fileId)

            // Delete database record
            const { error: deleteError } = await supabaseClient
                .from('knowledge_files')
                .delete()
                .eq('id', fileId)
                .eq('user_id', user.id)

            if (deleteError) throw deleteError

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify({ error: 'Not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// Async function to process file (extract text and generate embeddings)
async function processFileAsync(supabaseClient: any, fileId: string, cdnUrl: string, fileType: string, fileBuffer: ArrayBuffer, userId: string) {
    try {
        console.log(`[Processing] Starting for file: ${fileId} (${fileType})`)

        // Update status to processing
        await supabaseClient
            .from('knowledge_files')
            .update({ status: 'processing', error_message: null })
            .eq('id', fileId)

        // Convert ArrayBuffer to Blob
        const fileBlob = new Blob([fileBuffer], { type: fileType })

        let extractedText = ''

        try {
            // Extract text based on file type
            if (fileType === 'text/plain') {
                extractedText = await fileBlob.text()
            } else if (fileType === 'application/pdf') {
                extractedText = await extractTextFromPDF(fileBlob)
            } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                extractedText = await extractTextFromDOCX(fileBlob)
            }
        } catch (extractError) {
            console.error(`[Processing] Extraction error for ${fileId}:`, extractError)
            throw new Error(`Failed to extract text: ${extractError.message}`)
        }

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the file.')
        }

        // Save extracted text
        await supabaseClient
            .from('knowledge_files')
            .update({ extracted_text: extractedText })
            .eq('id', fileId)

        // Continue with embedding generation
        await processTextAsync(supabaseClient, fileId, extractedText, userId)

    } catch (error) {
        console.error(`[Processing] Critical error for ${fileId}:`, error)
        await supabaseClient
            .from('knowledge_files')
            .update({
                status: 'error',
                error_message: error.message || 'Unknown processing error'
            })
            .eq('id', fileId)
    }
}

// Separate function for processing text (used by PUT and POST)
async function processTextAsync(supabaseClient: any, fileId: string, text: string, userId: string) {
    try {
        // Split text into chunks (max 1000 chars per chunk)
        const chunks = splitTextIntoChunks(text, 1000)
        console.log(`[Processing] Generated ${chunks.length} chunks for ${fileId}`)

        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]

            // Call generate-embedding-with-cache function
            const embeddingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embedding-with-cache`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ text: chunk }),
            })

            if (!embeddingResponse.ok) {
                const errText = await embeddingResponse.text()
                throw new Error(`Embedding generation failed: ${embeddingResponse.statusText} - ${errText}`)
            }

            const { embedding } = await embeddingResponse.json()

            // Save embedding
            const { error: insertError } = await supabaseClient
                .from('knowledge_embeddings')
                .insert({
                    file_id: fileId,
                    user_id: userId,
                    content: chunk,
                    embedding: embedding,
                    metadata: { chunk_index: i, total_chunks: chunks.length },
                })

            if (insertError) throw insertError
        }

        // Update status to ready
        await supabaseClient
            .from('knowledge_files')
            .update({ status: 'ready', error_message: null })
            .eq('id', fileId)

        console.log(`[Processing] Completed successfully for ${fileId}`)

    } catch (error) {
        console.error(`[Processing] Embedding error for ${fileId}:`, error)
        await supabaseClient
            .from('knowledge_files')
            .update({
                status: 'error',
                error_message: `Embedding generation failed: ${error.message}`
            })
            .eq('id', fileId)
    }
}

// Helper function to extract text from PDF
async function extractTextFromPDF(blob: Blob): Promise<string> {
    try {
        // Import PDF.js library dynamically
        const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174')
        // Set worker (required for some environments, though edge usually needs pure JS)
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }

        const arrayBuffer = await blob.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: any) => item.str).join(' ')
            fullText += pageText + '\n'
        }

        return fullText.trim()
    } catch (e) {
        console.error('[Extract PDF] Error:', e)
        throw new Error(`PDF extraction failed: ${e.message}`)
    }
}

// Helper function to extract text from DOCX
async function extractTextFromDOCX(blob: Blob): Promise<string> {
    try {
        // Import mammoth library
        const mammoth = await import('https://esm.sh/mammoth@1.6.0')

        const arrayBuffer = await blob.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })

        if (result.messages && result.messages.length > 0) {
            console.warn('[Extract DOCX] Warnings:', result.messages)
        }

        return result.value
    } catch (e) {
        console.error('[Extract DOCX] Error:', e)
        throw new Error(`DOCX extraction failed: ${e.message}`)
    }
}

// Helper function to split text into chunks (Improved)
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    // Return empty array for empty text
    if (!text || text.trim().length === 0) return []

    // 1. Split by newlines first (paragraphs)
    const paragraphs = text.split(/\n+/)
    const chunks: string[] = []
    let currentChunk = ''

    for (const paragraph of paragraphs) {
        // If paragraph fits in current chunk, add it
        if ((currentChunk + '\n' + paragraph).length <= maxChunkSize) {
            currentChunk += (currentChunk ? '\n' : '') + paragraph
        } else {
            // Push current chunk if not empty
            if (currentChunk) {
                chunks.push(currentChunk.trim())
                currentChunk = ''
            }

            // If paragraph itself is too large, split by sentences
            if (paragraph.length > maxChunkSize) {
                // Split by sentence delimiters but KEEP them
                // Match (.!?) followed by space or end of string
                const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [paragraph]

                for (const sentence of sentences) {
                    if ((currentChunk + ' ' + sentence).length <= maxChunkSize) {
                        currentChunk += (currentChunk ? ' ' : '') + sentence.trim()
                    } else {
                        if (currentChunk) chunks.push(currentChunk.trim())
                        currentChunk = sentence.trim()
                    }
                }
            } else {
                currentChunk = paragraph
            }
        }
    }

    if (currentChunk) chunks.push(currentChunk.trim())

    return chunks
}
