
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
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

    // Get User
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const reqData = await req.json()
    const { rawText, manual, question, answer } = reqData

    // HANDLE MANUAL SAVE
    if (manual) {
      if (!question || !answer) {
        return new Response(JSON.stringify({ error: 'Question and answer required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Check for custom type (faq vs knowledge)
      const type = reqData.type || 'faq';
      let prefix = 'faq_manual';
      if (type === 'knowledge') prefix = 'knowledge_manual';
      if (type === 'doc') prefix = 'knowledge_doc';
      if (type === 'chunk') prefix = 'knowledge_chunk';

      console.log(`Saving manual ${type} for user ${user.id}...`)

      const extracted_text = `Title: ${question}\nContent: ${answer}`
      const timestamp = Date.now()
      const safeQ = question.substring(0, 20).replace(/[^a-z0-9]/gi, '_')

      // 1. Insert into knowledge_files
      const { data: fileRecord, error: insertError } = await supabaseClient
        .from('knowledge_files')
        .insert({
          user_id: user.id,
          filename: `${prefix}_${timestamp}_${safeQ}.txt`,
          file_path: `virtual://${type}/${timestamp}/manual`,
          mime_type: 'text/plain',
          file_size: extracted_text.length,
          extracted_text,
          status: 'ready'
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 2. Generate Embedding (ONLY for chunks or generic knowledge/faqs, NOT for parent 'doc')
      // Actually, we want RAG on everything except 'doc' (the parent) to avoid doubling
      if (type !== 'doc') {
        try {
          console.log(`Generating embedding for ${type} file ${fileRecord.id}...`)
          const embeddingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embedding-with-cache`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ text: extracted_text }),
          })

          if (embeddingResponse.ok) {
            const { embedding } = await embeddingResponse.json()
            await supabaseClient
              .from('knowledge_embeddings')
              .insert({
                file_id: fileRecord.id,
                user_id: user.id,
                content: extracted_text,
                embedding: embedding,
                metadata: { type, manual: true }
              })
          }
        } catch (e) {
          console.error('Failed to generate manual embedding:', e)
          // We don't fail the whole request, but it's bad for RAG
        }
      }

      return new Response(JSON.stringify({ success: true, id: fileRecord.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // HANDLE AUTO GENERATION from rawText
    if (!rawText || rawText.length < 50) {
      return new Response(JSON.stringify({ error: 'Text too short (min 50 chars)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Generating FAQs for user ${user.id} (${rawText.length} chars)...`)

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing')

    const prompt = `
Extract 10-25 relevant question/answer pairs from the text below. 
Each pair must be concise.
Format as strict JSON array: [{"question": "...", "answer": "..."}]

Text:
${rawText}
`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://elina.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
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

    // Clean markdown
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()

    let faqs = []
    try {
      faqs = JSON.parse(jsonStr)
    } catch (e) {
      console.error('Failed to parse AI JSON:', jsonStr)
      throw new Error('Failed to parse AI response as JSON')
    }

    if (!Array.isArray(faqs)) throw new Error('AI response is not an array')

    // Insert into DB
    const timestamp = Date.now()
    const batchInsert = faqs.map((item, index) => {
      const extracted_text = `P: ${item.question}\nR: ${item.answer}`
      return {
        user_id: user.id,
        filename: `faq_${timestamp}_${index + 1}.txt`,
        file_path: `virtual://faq/${timestamp}/${index + 1}`,
        mime_type: 'text/plain',
        file_size: extracted_text.length,
        extracted_text,
        status: 'ready' // Mark as ready directly since we already have the text
      }
    })

    const { error: insertError } = await supabaseClient
      .from('knowledge_files')
      .insert(batchInsert)

    if (insertError) throw insertError

    return new Response(JSON.stringify({ count: batchInsert.length, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
