
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

      const extracted_text = `P: ${question}\nR: ${answer}`
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

    // REUSABLE EMBEDDING GENERATOR
    const generateEmbeddingForFile = async (file: any, type: string, source: string) => {
      try {
        console.log(`Generating embedding for ${type} file ${file.id}...`)
        const embeddingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embedding-with-cache`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user ? (req.headers.get('Authorization') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            // We need to pass a valid key. The incoming request has user auth.
            // But generate-embedding-with-cache checks for service role usually or just valid user. 
            // Let's use service_role for internal calls to be safe if we can, or just forward auth.
            // Better to use service role key for internal backend-to-backend calls if available in env.
            // Actually, matching the existing code pattern: 
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ text: file.extracted_text }),
        });

        if (embeddingResponse.ok) {
          const { embedding } = await embeddingResponse.json();
          await supabaseClient.from('knowledge_embeddings').insert({
            file_id: file.id,
            user_id: user.id,
            content: file.extracted_text,
            embedding: embedding,
            metadata: { type, source }
          });
        } else {
          console.error(`Failed embedding API call for ${file.id}: ${await embeddingResponse.text()}`);
        }
      } catch (err) {
        console.error(`Failed embedding for file ${file.id}`, err);
      }
    };

    // HANDLE BATCH CHUNKS (RAG Optimization)
    if (reqData.type === 'batch_chunks') {
      const { chunks, docTitle } = reqData;

      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return new Response(JSON.stringify({ error: 'No chunks provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      console.log(`Processing batch of ${chunks.length} chunks for doc: ${docTitle}...`);

      // 1. Bulk Insert into knowledge_files
      const timestamp = Date.now();
      const filesToInsert = chunks.map((chunk, index) => ({
        user_id: user.id,
        filename: `${docTitle}_part${index + 1}_${timestamp}.txt`,
        file_path: `virtual://knowledge/${docTitle}/${timestamp}/${index + 1}`,
        mime_type: 'text/plain',
        file_size: chunk.length,
        extracted_text: chunk,
        status: 'ready'
      }));

      const { data: insertedFiles, error: insertError } = await supabaseClient
        .from('knowledge_files')
        .insert(filesToInsert)
        .select();

      if (insertError) throw insertError;

      // 2. Generate Embeddings
      await Promise.all(insertedFiles.map(f => generateEmbeddingForFile(f, 'chunk', docTitle)));

      return new Response(JSON.stringify({ success: true, count: insertedFiles.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // HANDLE BULK UPDATE
    if (reqData.type === 'bulk_update') {
      const { updates } = reqData; // Expecting array of { id, question, answer }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return new Response(JSON.stringify({ error: 'No updates provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      console.log(`Processing bulk update for ${updates.length} FAQs for user ${user.id}...`);

      const results = [];
      for (const update of updates) {
        const { id, question, answer } = update;
        if (!id || !question || !answer) continue;

        const extracted_text = `P: ${question}\nR: ${answer}`;

        // 1. Update text in knowledge_files
        const { error: updateError } = await supabaseClient
          .from('knowledge_files')
          .update({
            extracted_text,
            status: 'ready' // Ensure it's marked as ready
          })
          .eq('id', id)
          .eq('user_id', user.id); // Security check

        if (updateError) {
          console.error(`Error updating FAQ ${id}:`, updateError);
          results.push({ id, success: false, error: updateError.message });
          continue;
        }

        // 2. Delete old embeddings
        await supabaseClient
          .from('knowledge_embeddings')
          .delete()
          .eq('file_id', id);

        // 3. Generate new embedding
        // We reuse the extracted_text which now has the new Q&A
        // We pass 'faq_updated' as type or just 'faq' to keep it consistent
        await generateEmbeddingForFile({ id, extracted_text }, 'faq', 'bulk_update');

        results.push({ id, success: true });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // HANDLE CSV IMPORT
    if (reqData.type === 'csv_import') {
      const { faqs } = reqData; // Expecting array of { question, answer }

      if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
        return new Response(JSON.stringify({ error: 'No FAQs provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      console.log(`Importing ${faqs.length} FAQs from CSV for user ${user.id}...`);

      const timestamp = Date.now();
      const filesToInsert = faqs.map((item, index) => {
        const extracted_text = `P: ${item.question}\nR: ${item.answer}`;
        // Simple sanitization for filename
        const safeQ = (item.question || 'faq').substring(0, 15).replace(/[^a-z0-9]/gi, '_');
        return {
          user_id: user.id,
          filename: `faq_import_${index}_${safeQ}_${timestamp}.txt`,
          file_path: `virtual://faq/import/${timestamp}/${index}`,
          mime_type: 'text/plain',
          file_size: extracted_text.length,
          extracted_text,
          status: 'ready'
        };
      });

      const { data: insertedFiles, error: insertError } = await supabaseClient
        .from('knowledge_files')
        .insert(filesToInsert)
        .select();

      if (insertError) throw insertError;

      // Generate Embeddings
      await Promise.all(insertedFiles.map(f => generateEmbeddingForFile(f, 'faq', 'csv_import')));

      return new Response(JSON.stringify({ success: true, count: insertedFiles.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
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
Analyze the text below and extract 10-25 question/answer pairs.

CRITICAL INSTRUCTIONS:
1. The output MUST be in SPANISH (Español).
2. If the input text is in English or another language, TRANSLATE the extracted FAQs to Spanish.
3. Format specifically as a JSON array: [{"question": "...", "answer": "..."}]
4. Keep answers concise and helpful.

Text to analyze:
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
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that extracts FAQs. You MUST ALWAYS output the questions and answers in SPANISH (Español), even if the input is in English.'
          },
          { role: 'user', content: prompt }
        ],
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

    const { data: insertedFiles, error: insertError } = await supabaseClient
      .from('knowledge_files')
      .insert(batchInsert)
      .select()

    if (insertError) throw insertError

    // FIX: Generate embeddings for auto-generated FAQs
    console.log(`Generating embeddings for ${insertedFiles.length} auto-generated FAQs...`);
    await Promise.all(insertedFiles.map(f => generateEmbeddingForFile(f, 'faq', 'auto_generated')));

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
