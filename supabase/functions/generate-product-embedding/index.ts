// Edge Function para generar embeddings de texto usando OpenAI
// Se usa para búsqueda semántica de productos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

interface EmbeddingRequest {
  query: string;
}

interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body: EmbeddingRequest = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return jsonResponse(
        { error: "El campo 'query' es requerido y debe ser un string no vacío" },
        400
      );
    }

    // Generar embedding usando OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.trim(),
    });

    const embedding = embeddingResponse.data[0]?.embedding;

    if (!embedding || embedding.length !== 1536) {
      throw new Error("OpenAI no devolvió un embedding válido");
    }

    const result: EmbeddingResponse = {
      embedding,
      model: "text-embedding-3-small",
    };

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("Error generando embedding:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Determinar código de estado
    const isAuthError = /api key|unauthorized|invalid_api_key/i.test(errorMessage);
    const status = isAuthError ? 401 : 500;

    return jsonResponse(
      { error: errorMessage },
      status
    );
  }
});

