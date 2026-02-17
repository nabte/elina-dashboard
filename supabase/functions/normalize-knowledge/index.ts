import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { rawText } = await req.json()

        // Auth check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No authorization header')

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        if (!rawText || rawText.length < 10) {
            return new Response(JSON.stringify({ error: 'Text too short' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        console.log(`Normalizing knowledge for user ${user.id} (${rawText.length} chars)...`)

        const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
        if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing')

        const prompt = `
You are a Knowledge Base Organizer for a Spanish-speaking business. Your goal is to restructure messy text into a clean, hierarchical Markdown document optimize for RAG (Retrieval Augmented Generation).

RULES:
1.  **Language**: OUTPUT MUST BE IN SPANISH (ESPAÑOL). Do not translate terms unless necessary, but ensure the structure and descriptions are in Spanish.
2.  **Structure**: Use H1 (#) for the main title (if any), H2 (##) for major sections, and H3 (###) for subsections.
3.  **Content**: Keep ALL original information. Do NOT summarize or delete details. Fix typos and grammar only.
4.  **Format**: Ensure clear separation between sections. Use bullet points for lists.
5.  **Transformation**: If the input is a list of Q&A, format them as "## Question\nAnswer". If it's policy text, group by topic.

INPUT TEXT:
${rawText}

OUTPUT:
(Clean Markdown in SPANISH only, no preamble)
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
                temperature: 0.1
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`OpenRouter Error: ${err}`)
        }

        const aiData = await response.json()
        const normalizedText = aiData.choices[0].message.content.trim()

        return new Response(JSON.stringify({ normalizedText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
