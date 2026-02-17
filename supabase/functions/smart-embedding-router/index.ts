// Edge Function inteligente que decide si necesita embedding y lo procesa en paralelo
// Optimiza la latencia detectando intenciones y procesando en paralelo

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.51.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface SmartEmbeddingRequest {
  text: string;
  model?: string;
  skip_rag?: boolean; // Si true, solo genera embedding sin buscar en RAG
  parallel?: boolean; // Si true, retorna inmediatamente y procesa en background
}

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  from_cache: boolean;
  needs_rag?: boolean; // Indica si el mensaje probablemente necesita RAG
  intent_type?: string; // Tipo de intención: conversational, product_query, information_query, needs_rag
  skip_embedding?: boolean; // Indica que se saltó la generación intencionalmente
  rate_limit_error?: boolean; // Indica que hubo error de rate limit
  fallback_recommended?: boolean; // Recomienda usar full-text search
  processing?: boolean; // Indica que se está procesando en background
}

// Palabras clave que indican que NO necesita RAG (conversación simple)
const CONVERSATIONAL_KEYWORDS = [
  "hola", "hi", "hello", "gracias", "thanks", "ok", "okay", "sí", "si", "no",
  "adiós", "bye", "chau", "buenos días", "buenas tardes", "buenas noches",
  "cómo estás", "qué tal", "bien", "mal", "perfecto", "genial"
];

// Palabras clave que indican que SÍ necesita RAG (preguntas sobre productos/información)
const RAG_KEYWORDS = [
  "precio", "costo", "cuánto", "producto", "disponible", "stock", "tiene",
  "busco", "necesito", "quiero", "información", "detalles", "características",
  "modelo", "marca", "compatible", "toner", "tinta", "impresora"
];

// Cache de clasificaciones de intención (en memoria, se reinicia con cada invocación)
// En producción, esto podría estar en Redis o base de datos
const intentCache = new Map<string, { intent: string; cached_at: number }>();
const INTENT_CACHE_TTL = 3600000; // 1 hora en ms

// Función para detectar intención usando modelo ligero de OpenAI con fallback
async function detectIntentWithLLM(text: string): Promise<string> {
  try {
    // Verificar cache primero
    const cacheKey = text.trim().toLowerCase();
    const cached = intentCache.get(cacheKey);
    if (cached && Date.now() - cached.cached_at < INTENT_CACHE_TTL) {
      return cached.intent;
    }

    // Usar modelo ligero para clasificación rápida
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Clasifica el mensaje en una de estas categorías: 'conversational' (saludos, agradecimientos), 'product_query' (preguntas sobre productos, precios, disponibilidad), 'information_query' (preguntas que requieren contexto del historial), 'needs_rag' (cualquier pregunta que necesite contexto). Responde SOLO con una palabra: conversational, product_query, information_query, o needs_rag."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });

    const intent = completion.choices[0]?.message?.content?.trim().toLowerCase() || "needs_rag";
    
    // Cachear resultado
    intentCache.set(cacheKey, { intent, cached_at: Date.now() });
    
    return intent;
  } catch (error) {
    console.warn("Error en detección LLM, usando fallback keywords:", error);
    return detectIntentWithKeywords(text);
  }
}

// Función de fallback usando keywords
function detectIntentWithKeywords(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Si es muy corto (< 10 caracteres), probablemente es conversacional
  if (text.trim().length < 10) {
    return "conversational";
  }
  
  // Si contiene palabras conversacionales y NO contiene palabras RAG
  const hasConversational = CONVERSATIONAL_KEYWORDS.some(kw => lowerText.includes(kw));
  const hasRAG = RAG_KEYWORDS.some(kw => lowerText.includes(kw));
  
  if (hasRAG) {
    return "product_query"; // Definitivamente necesita RAG
  }
  
  if (hasConversational && !hasRAG) {
    return "conversational"; // Probablemente conversacional
  }
  
  // Si tiene signos de interrogación y es largo, probablemente necesita RAG
  if (text.includes("?") && text.length > 15) {
    return "information_query";
  }
  
  // Por defecto, asumir que necesita RAG
  return "needs_rag";
}

// Función para detectar si el mensaje necesita RAG (mejorada)
async function needsRAG(text: string): Promise<boolean> {
  // Primero intentar con LLM (rápido con cache)
  const intent = await detectIntentWithLLM(text);
  
  // Solo necesita RAG si NO es conversacional
  return intent !== "conversational";
}

// Función para obtener tipo de intención detallado
async function getIntentType(text: string): Promise<string> {
  return await detectIntentWithLLM(text);
}

// Función para generar hash SHA256 del texto
async function generateTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Función para obtener embedding del cache
async function getCachedEmbedding(textHash: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.rpc("get_embedding_from_cache", {
      p_text_hash: textHash,
    });
    
    if (!error && data && data.length > 0) {
      return Array.from(data[0].embedding);
    }
    return null;
  } catch (error) {
    console.warn("Error obteniendo cache:", error);
    return null;
  }
}

// Función para generar embedding con retry optimizado
async function generateEmbedding(
  text: string,
  model: string = "text-embedding-3-small"
): Promise<number[]> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model,
      input: text.trim(),
    });

    const embedding = embeddingResponse.data[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error("OpenAI no devolvió un embedding válido");
    }

    return embedding;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Si es error 429 o quota, lanzar error específico para que se maneje arriba
    if (errorMessage.includes("429") || errorMessage.includes("rate limit") || 
        errorMessage.includes("quota") || errorMessage.includes("insufficient_quota")) {
      const quotaError = new Error("Rate limit o quota excedido. Usar fallback full-text.");
      (quotaError as any).isRateLimit = true;
      throw quotaError;
    }
    
    throw error;
  }
}

// Función para guardar en cache de forma asíncrona
function saveToCacheAsync(
  textHash: string,
  text: string,
  embedding: number[],
  model: string
): void {
  supabase
    .from("embedding_cache")
    .insert({
      text_hash: textHash,
      text_content: text,
      embedding: embedding,
      model,
    })
    .then(({ error }) => {
      if (error) {
        console.warn("Error guardando cache:", error.message);
      }
    })
    .catch(err => console.warn("Error asíncrono guardando cache:", err));
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
    const body: SmartEmbeddingRequest = await req.json();
    const { text, model = "text-embedding-3-small", skip_rag = false, parallel = false } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return jsonResponse(
        { error: "El campo 'text' es requerido y debe ser un string no vacío" },
        400
      );
    }

    const normalizedText = text.trim();
    const textHash = await generateTextHash(normalizedText);
    
    // Detectar intención y si necesita RAG (a menos que se especifique skip_rag)
    let intent_type = "needs_rag";
    let needs_rag = true;
    
    try {
      intent_type = skip_rag ? "skip_rag" : await getIntentType(normalizedText);
      needs_rag = skip_rag ? false : await needsRAG(normalizedText);
    } catch (error) {
      // Si falla la detección de intención (por ejemplo, error 429), usar fallback
      console.warn("Error en detección de intención, usando fallback:", error);
      intent_type = detectIntentWithKeywords(normalizedText);
      needs_rag = intent_type !== "conversational";
    }
    
    // Si NO necesita RAG, retornar inmediatamente sin generar embedding
    if (!needs_rag) {
      console.log(`Mensaje conversacional detectado (${intent_type}), saltando generación de embedding: ${normalizedText.substring(0, 30)}...`);
      return jsonResponse({
        embedding: [],
        model,
        from_cache: false,
        needs_rag: false,
        intent_type,
        skip_embedding: true, // Indica que se saltó intencionalmente
      } as EmbeddingResponse);
    }
    
    // Paso 1: Intentar obtener del cache primero (rápido)
    const cachedEmbedding = await getCachedEmbedding(textHash);
    
    if (cachedEmbedding) {
      console.log(`Embedding encontrado en cache para: ${normalizedText.substring(0, 30)}...`);
      return jsonResponse({
        embedding: cachedEmbedding,
        model,
        from_cache: true,
        needs_rag,
        intent_type,
      } as EmbeddingResponse);
    }

    // Paso 2: Si no está en cache y es modo paralelo, retornar inmediatamente
    // y procesar en background
    if (parallel) {
      // Retornar respuesta inmediata (embedding vacío o null)
      // El cliente puede decidir si esperar o continuar sin embedding
      generateEmbedding(normalizedText, model)
        .then((embedding) => {
          saveToCacheAsync(textHash, normalizedText, embedding, model);
        })
        .catch(err => console.error("Error generando embedding en background:", err));
      
      return jsonResponse({
        embedding: [],
        model,
        from_cache: false,
        needs_rag,
        intent_type,
        processing: true, // Indica que se está procesando en background
      });
    }

    // Paso 3: Generar embedding normalmente (solo si necesita RAG)
    try {
      console.log(`Generando embedding para: ${normalizedText.substring(0, 30)}...`);
      const embedding = await generateEmbedding(normalizedText, model);

      // Paso 4: Guardar en cache de forma asíncrona (no bloquea)
      saveToCacheAsync(textHash, normalizedText, embedding, model);

      return jsonResponse({
        embedding,
        model,
        from_cache: false,
        needs_rag,
        intent_type,
      } as EmbeddingResponse);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Si es error 429 o quota, retornar embedding vacío para que use fallback full-text
      if (errorMessage.includes("429") || errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
        console.warn(`Error 429/Quota al generar embedding. Retornando embedding vacío para usar fallback full-text: ${normalizedText.substring(0, 30)}...`);
        return jsonResponse({
          embedding: [],
          model,
          from_cache: false,
          needs_rag: true, // Aún necesita RAG, pero sin embedding
          intent_type,
          rate_limit_error: true, // Indica que hubo error de rate limit
          fallback_recommended: true, // Recomienda usar full-text search
        } as EmbeddingResponse);
      }
      
      // Si es otro error, lanzarlo
      throw error;
    }
  } catch (error) {
    console.error("Error en smart-embedding-router:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    const isRateLimit = /429|rate limit/i.test(errorMessage);
    const status = isRateLimit ? 429 : 500;

    return jsonResponse({ error: errorMessage }, status);
  }
});

