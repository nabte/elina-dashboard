import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { chunkMarkdownBySections } from '../_shared/smart-chunker.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { markdownText, docTitle } = await req.json()

        if (!markdownText || markdownText.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'markdownText is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        console.log(`[Smart Chunk] Processing document: "${docTitle || 'Untitled'}" (${markdownText.length} chars)`)

        // Apply smart chunking with overlap
        const chunks = chunkMarkdownBySections(markdownText, {
            maxTokens: 500,
            overlapPercentage: 20,
            minChunkSize: 100,
            respectSentences: true
        })

        console.log(`[Smart Chunk] Generated ${chunks.length} chunks`)

        // Format for frontend consumption
        const formattedChunks = chunks.map((chunk, i) => ({
            index: i,
            content: chunk.content,
            tokens: chunk.metadata.tokens,
            hasOverlap: chunk.metadata.hasOverlap
        }))

        return new Response(JSON.stringify({
            success: true,
            chunks: formattedChunks,
            totalChunks: chunks.length,
            summary: {
                totalTokens: chunks.reduce((sum, c) => sum + c.metadata.tokens, 0),
                avgTokensPerChunk: Math.round(chunks.reduce((sum, c) => sum + c.metadata.tokens, 0) / chunks.length),
                chunksWithOverlap: chunks.filter(c => c.metadata.hasOverlap).length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('[Smart Chunk] Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
