// Edge Function para búsqueda híbrida de productos
// Combina Full-Text Search (PostgreSQL) + Semantic Search (Embeddings)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  user_id: string;
  query: string;
  limit?: number;
  min_fulltext_score?: number;
  strict_mode?: boolean;
  min_score?: number;
}

interface ProductResult {
  id: number;
  product_name: string | null;
  sku: string | null;
  price: number | null;
  stock: number | null;
  description: string | null;
  media_url: string | null;
  search_method: "fulltext" | "semantic" | "hybrid";
  relevance_score: number;
  match_type?: "exact" | "partial" | "low_confidence";
  confidence_score?: number;
  matched_fields?: string[];
}

interface ValidationResult {
  match_type: "exact" | "partial" | "low_confidence";
  confidence_score: number;
  matched_fields: string[];
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

// Función para extraer códigos de modelos del query
// Busca patrones como: M477fdw, 414A, HP123, 56f0z00, etc.
function extractCodes(query: string): string[] {
  const codes: string[] = [];
  const normalizedQuery = query.toUpperCase().trim();

  // Patrones comunes de códigos:
  // 1. Letras seguidas de números y letras: M477fdw, 56F4000
  // 2. Números seguidos de letras: 414A, 56F0Z00
  // 3. Códigos con guiones: HP-123
  const patterns = [
    /[A-Z]{1,3}[0-9]+[A-Z]*[0-9]*/g,  // M477fdw, 56F4000
    /[0-9]+[A-Z]+[0-9]*/g,              // 414A, 56F0Z00
    /[A-Z]+-[0-9]+/g,                   // HP-123
  ];

  for (const pattern of patterns) {
    const matches = normalizedQuery.match(pattern);
    if (matches) {
      codes.push(...matches.map(m => m.trim()));
    }
  }

  // Eliminar duplicados y códigos muy cortos (menos de 3 caracteres)
  return [...new Set(codes)].filter(code => code.length >= 3);
}

// Función para normalizar códigos (remover espacios, guiones, convertir a mayúsculas)
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[\s\-_]/g, '');
}

// Función para calcular similitud entre dos códigos (0-1)
function codeSimilarity(code1: string, code2: string): number {
  const norm1 = normalizeCode(code1);
  const norm2 = normalizeCode(code2);

  // Coincidencia exacta
  if (norm1 === norm2) return 1.0;

  // Una contiene a la otra (coincidencia parcial fuerte)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return shorter / longer;
  }

  // Calcular similitud por caracteres comunes
  let commonChars = 0;
  const minLen = Math.min(norm1.length, norm2.length);
  const maxLen = Math.max(norm1.length, norm2.length);

  for (let i = 0; i < minLen; i++) {
    if (norm1[i] === norm2[i]) {
      commonChars++;
    }
  }

  // Si hay al menos 3 caracteres comunes, calcular similitud
  if (commonChars >= 3) {
    return commonChars / maxLen;
  }

  return 0;
}

// Función para validar precisión de un producto contra el query
function validateProductPrecision(
  product: any,
  query: string,
  queryCodes: string[]
): ValidationResult {
  const matchedFields: string[] = [];
  let maxConfidence = 0;

  // Buscar coincidencias en diferentes campos
  const fields = [
    { name: 'sku', value: product.sku },
    { name: 'product_name', value: product.product_name },
    { name: 'description', value: product.description },
  ];

  // Si hay códigos en el query, buscar coincidencias exactas o parciales
  if (queryCodes.length > 0) {
    for (const queryCode of queryCodes) {
      for (const field of fields) {
        if (!field.value) continue;

        const fieldValue = String(field.value).toUpperCase();
        const normalizedField = normalizeCode(fieldValue);
        const normalizedQuery = normalizeCode(queryCode);

        // Coincidencia exacta
        if (normalizedField === normalizedQuery || fieldValue.includes(normalizedQuery)) {
          matchedFields.push(field.name);
          maxConfidence = Math.max(maxConfidence, 1.0);
        } else {
          // Calcular similitud
          const similarity = codeSimilarity(queryCode, fieldValue);
          if (similarity > 0.5) {
            matchedFields.push(field.name);
            maxConfidence = Math.max(maxConfidence, similarity);
          }
        }
      }
    }
  }

  // Si no hay códigos o no hay coincidencias, usar el relevance_score
  if (maxConfidence === 0) {
    maxConfidence = product.relevance_score || product.similarity_score || 0;
  }

  // Determinar match_type basado en confidence
  let matchType: "exact" | "partial" | "low_confidence";
  if (maxConfidence >= 0.9) {
    matchType = "exact";
  } else if (maxConfidence >= 0.5) {
    matchType = "partial";
  } else {
    matchType = "low_confidence";
  }

  return {
    match_type: matchType,
    confidence_score: maxConfidence,
    matched_fields: [...new Set(matchedFields)],
  };
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
    const body: SearchRequest = await req.json();
    const { user_id, query, limit = 10, min_fulltext_score = 0.1, strict_mode, min_score } = body;

    if (!user_id || !query) {
      return jsonResponse(
        { error: "Los campos 'user_id' y 'query' son requeridos" },
        400
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Obtener configuración del perfil del usuario si no se proporcionó
    let userStrictMode = strict_mode;
    let userMinScore = min_score;

    if (userStrictMode === undefined || userMinScore === undefined) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("product_search_strict_mode, product_search_min_score")
        .eq("id", user_id)
        .single();

      if (!profileError && profile) {
        if (userStrictMode === undefined) {
          userStrictMode = profile.product_search_strict_mode ?? false;
        }
        if (userMinScore === undefined) {
          userMinScore = profile.product_search_min_score ?? 0.05; // Reducido de 0.3 a 0.05
        }
      } else {
        // Valores por defecto si no hay perfil
        userStrictMode = userStrictMode ?? false;
        userMinScore = userMinScore ?? 0.05; // Reducido de 0.3 a 0.05 para búsquedas más flexibles
      }
    }

    // Extraer códigos del query original
    const queryCodes = extractCodes(query);

    // Paso 1: Intentar búsqueda Full-Text primero
    const { data: fulltextResults, error: fulltextError } = await supabase.rpc(
      "search_products_fulltext",
      {
        p_user_id: user_id,
        p_query: query,
        p_limit: limit,
      }
    );

    if (fulltextError) {
      console.error("Error en búsqueda full-text:", fulltextError);
      // Continuar con semantic search si falla full-text
    }

    const results: ProductResult[] = [];
    let bestScore = 0;

    // Procesar resultados de full-text
    if (fulltextResults && fulltextResults.length > 0) {
      for (const product of fulltextResults) {
        const score = product.relevance_score || 0;
        if (score > bestScore) {
          bestScore = score;
        }
        results.push({
          id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          price: product.price,
          stock: product.stock,
          description: product.description,
          media_url: product.media_url,
          search_method: "fulltext",
          relevance_score: score,
        });
      }
    }

    // Paso 2: Si no hay resultados o el mejor score es bajo, usar semantic search
    const needsSemanticSearch =
      results.length === 0 || bestScore < min_fulltext_score;

    if (needsSemanticSearch) {
      try {
        // Usar generate-embedding-with-cache para aprovechar cache compartido por negocio
        const cacheResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/generate-embedding-with-cache`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
              "apikey": SUPABASE_SERVICE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: query.trim(),
              model: "text-embedding-3-small",
              user_id: user_id, // Para tracking por negocio
            }),
          }
        );

        if (!cacheResponse.ok) {
          const errorData = await cacheResponse.json().catch(() => ({}));
          throw new Error(`Error obteniendo embedding: ${cacheResponse.status} ${errorData.error || cacheResponse.statusText}`);
        }

        const cacheData = await cacheResponse.json();
        const queryEmbedding = cacheData.embedding;

        if (queryEmbedding && queryEmbedding.length === 1536) {
          // Buscar productos usando semantic search
          // Supabase espera el array directamente, pero necesitamos convertirlo a formato vector
          // Usamos una query SQL directa en lugar de RPC para pasar el vector correctamente
          const { data: semanticResults, error: semanticError } = await supabase
            .rpc("search_products_semantic", {
              p_user_id: user_id,
              p_query_embedding: queryEmbedding as any, // Supabase debería serializar esto correctamente
              p_limit: limit,
            });

          if (semanticError) {
            console.error("Error en búsqueda semántica:", semanticError);
          } else if (semanticResults && semanticResults.length > 0) {
            // Agregar resultados semánticos (evitando duplicados)
            const existingIds = new Set(results.map((r) => r.id));

            for (const product of semanticResults) {
              if (!existingIds.has(product.id)) {
                results.push({
                  id: product.id,
                  product_name: product.product_name,
                  sku: product.sku,
                  price: product.price,
                  stock: product.stock,
                  description: product.description,
                  media_url: product.media_url,
                  search_method: "semantic",
                  relevance_score: product.similarity_score || 0,
                });
              }
            }

            // Si había resultados de full-text, marcar como híbrido
            if (results.length > 0 && fulltextResults && fulltextResults.length > 0) {
              results.forEach((r) => {
                if (r.search_method === "fulltext") {
                  r.search_method = "hybrid";
                }
              });
            }
          }
        }
      } catch (embeddingError) {
        console.error("Error generando embedding:", embeddingError);
        // Continuar con solo resultados de full-text si hay
      }
    }

    // Validar precisión de cada resultado
    const validatedResults: ProductResult[] = [];
    for (const product of results) {
      const validation = validateProductPrecision(product, query, queryCodes);

      // Si strict_mode está activado, solo aceptar exact matches
      if (userStrictMode && validation.match_type !== "exact") {
        continue;
      }

      // Filtrar por min_score
      if (validation.confidence_score < userMinScore) {
        continue;
      }

      validatedResults.push({
        ...product,
        match_type: validation.match_type,
        confidence_score: validation.confidence_score,
        matched_fields: validation.matched_fields,
      });
    }

    // Ordenar por confidence_score primero, luego por relevance_score
    validatedResults.sort((a, b) => {
      const confDiff = (b.confidence_score || 0) - (a.confidence_score || 0);
      if (Math.abs(confDiff) > 0.01) return confDiff;
      return b.relevance_score - a.relevance_score;
    });

    // Limitar resultados
    const finalResults = validatedResults.slice(0, limit);

    return jsonResponse(
      {
        products: finalResults,
        total: finalResults.length,
        search_method: finalResults.length > 0 ? finalResults[0].search_method : "none",
        query_codes: queryCodes,
        strict_mode: userStrictMode,
        min_score: userMinScore,
      },
      200
    );
  } catch (error) {
    console.error("Error inesperado:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});

