// Edge Function para RAG con fallback inteligente
// Usa búsqueda vectorial si está disponible, sino full-text search

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RAGRequest {
  query_text: string;
  user_id: string;
  contact_id: string;
  query_embedding?: number[]; // Opcional: si no está, usa solo full-text
  match_count?: number;
  similarity_threshold?: number;
  include_simulations?: boolean; // Incluir conversaciones de simulación (default: true)
}

interface RAGResult {
  id: number;
  content: string;
  message_type: string;
  similarity_score: number;
  search_method: string;
  source_type?: string; // 'training_example' o 'chat_history'
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body: RAGRequest = await req.json();
    const {
      query_text,
      user_id,
      contact_id,
      query_embedding,
      match_count = 5,
      similarity_threshold = 0.45, // Updated from 0.7 for better recall
      include_simulations = true, // Por defecto incluir simulaciones para aprendizaje
    } = body;

    if (!query_text || !user_id || !contact_id) {
      return jsonResponse(
        { error: "query_text, user_id y contact_id son requeridos" },
        400
      );
    }

    // Intentar usar la función mejorada con training_examples primero
    // Si no existe, fallback a la función original
    try {
      // Si hay embedding válido (array no vacío con 1536 elementos), usar función mejorada
      if (query_embedding && Array.isArray(query_embedding) && query_embedding.length === 1536) {
        const { data, error } = await supabase.rpc("get_rag_with_training_examples", {
          p_query_text: query_text,
          p_user_id: user_id,
          p_contact_id: contact_id,
          p_query_embedding: query_embedding,
          p_match_count: match_count,
          p_similarity_threshold: similarity_threshold,
          p_include_simulations: include_simulations,
        });

        if (!error && data) {
          return jsonResponse(data || []);
        }

        // Si falla, intentar con función original como fallback
        console.warn("get_rag_with_training_examples no disponible, usando get_rag_with_fallback:", error);
      }

      // Fallback a función original
      if (query_embedding && Array.isArray(query_embedding) && query_embedding.length === 1536) {
        const { data, error } = await supabase.rpc("get_rag_with_fallback", {
          p_query_text: query_text,
          p_user_id: user_id,
          p_contact_id: contact_id,
          p_query_embedding: query_embedding,
          p_match_count: match_count,
          p_similarity_threshold: similarity_threshold,
        });

        if (error) {
          console.error("Error en get_rag_with_fallback:", error);
          // Fallback a full-text only
          const { data: fallbackData, error: fallbackError } = await supabase.rpc(
            "get_rag_fulltext_only",
            {
              p_query_text: query_text,
              p_user_id: user_id,
              p_contact_id: contact_id,
              p_match_count: match_count,
            }
          );

          if (fallbackError) {
            throw new Error(`Error en fallback: ${fallbackError.message}`);
          }

          return jsonResponse(fallbackData || []);
        }

        return jsonResponse(data || []);
      } else {
        // Si no hay embedding, usar solo full-text
        const { data, error } = await supabase.rpc("get_rag_fulltext_only", {
          p_query_text: query_text,
          p_user_id: user_id,
          p_contact_id: contact_id,
          p_match_count: match_count,
        });

        if (error) {
          throw new Error(`Error en full-text search: ${error.message}`);
        }

        return jsonResponse(data || []);
      }
    } catch (error) {
      console.error("Error en rag-with-fallback:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error en rag-with-fallback:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});

