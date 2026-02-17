// Edge Function para generar embeddings con caching y retry con backoff exponencial
// Evita el error 429 de OpenAI rate limiting

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

// Circuit Breaker State
interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: number | null;
  successCount: number;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Abrir después de 5 fallos consecutivos
  timeout: 60000, // 60 segundos antes de intentar half-open
  halfOpenSuccessThreshold: 2, // Cerrar después de 2 éxitos en half-open
};

// Estado del circuit breaker (en memoria, se reinicia con cada invocación)
// En producción, esto debería estar en Redis o base de datos
let circuitBreaker: CircuitBreakerState = {
  state: "closed",
  failureCount: 0,
  lastFailureTime: null,
  successCount: 0,
};

// Función para verificar estado del circuit breaker desde la base de datos
async function getCircuitBreakerState(): Promise<CircuitBreakerState> {
  try {
    const { data, error } = await supabase
      .from("circuit_breaker_state")
      .select("*")
      .eq("service", "openai_embeddings")
      .single();

    if (error || !data) {
      // Si no existe, crear estado inicial
      return {
        state: "closed",
        failureCount: 0,
        lastFailureTime: null,
        successCount: 0,
      };
    }

    return {
      state: data.state as "closed" | "open" | "half-open",
      failureCount: data.failure_count || 0,
      lastFailureTime: data.last_failure_time ? new Date(data.last_failure_time).getTime() : null,
      successCount: data.success_count || 0,
    };
  } catch (error) {
    console.warn("Error obteniendo estado del circuit breaker:", error);
    return circuitBreaker; // Usar estado en memoria como fallback
  }
}

// Función para actualizar estado del circuit breaker
async function updateCircuitBreakerState(state: Partial<CircuitBreakerState>): Promise<void> {
  try {
    const currentState = await getCircuitBreakerState();
    const newState = { ...currentState, ...state };

    await supabase
      .from("circuit_breaker_state")
      .upsert({
        service: "openai_embeddings",
        state: newState.state,
        failure_count: newState.failureCount,
        last_failure_time: newState.lastFailureTime ? new Date(newState.lastFailureTime).toISOString() : null,
        success_count: newState.successCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "service",
      });

    circuitBreaker = newState;
  } catch (error) {
    console.warn("Error actualizando estado del circuit breaker:", error);
    // Actualizar estado en memoria como fallback
    circuitBreaker = { ...circuitBreaker, ...state };
  }
}

// Función para verificar si el circuit breaker permite la solicitud
async function canProceedWithRequest(): Promise<boolean> {
  const state = await getCircuitBreakerState();

  if (state.state === "closed") {
    return true;
  }

  if (state.state === "open") {
    // Verificar si ha pasado el timeout
    if (state.lastFailureTime && Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_CONFIG.timeout) {
      // Cambiar a half-open
      await updateCircuitBreakerState({ state: "half-open", successCount: 0 });
      return true;
    }
    return false; // Circuit está abierto, no permitir solicitudes
  }

  // Half-open: permitir solicitudes pero monitorear cuidadosamente
  return true;
}

// Función para registrar éxito
async function recordSuccess(): Promise<void> {
  const state = await getCircuitBreakerState();

  if (state.state === "half-open") {
    const newSuccessCount = state.successCount + 1;
    if (newSuccessCount >= CIRCUIT_BREAKER_CONFIG.halfOpenSuccessThreshold) {
      // Cerrar el circuit breaker
      await updateCircuitBreakerState({
        state: "closed",
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
      });
    } else {
      await updateCircuitBreakerState({ successCount: newSuccessCount });
    }
  } else if (state.state === "closed") {
    // Resetear contador de fallos en caso de éxito
    if (state.failureCount > 0) {
      await updateCircuitBreakerState({ failureCount: 0 });
    }
  }
}

// Función para registrar fallo
async function recordFailure(): Promise<void> {
  const state = await getCircuitBreakerState();
  const newFailureCount = state.failureCount + 1;

  if (newFailureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    // Abrir el circuit breaker
    await updateCircuitBreakerState({
      state: "open",
      failureCount: newFailureCount,
      lastFailureTime: Date.now(),
      successCount: 0,
    });
  } else {
    await updateCircuitBreakerState({
      failureCount: newFailureCount,
      lastFailureTime: Date.now(),
    });
  }
}

interface EmbeddingRequest {
  text: string;
  model?: string;
  user_id?: string; // Opcional, para tracking por negocio
}

interface EmbeddingResponse {
  embedding: number[] | null;
  model: string;
  from_cache: boolean;
  circuit_breaker_open?: boolean;
  fallback_recommended?: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Función para generar hash SHA256 del texto
async function generateTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Función para verificar rate limit antes de hacer la solicitud
async function checkRateLimit(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_embedding_rate_limit");
    if (error) {
      console.warn("Error verificando rate limit:", error.message);
      return true; // Si falla la verificación, permitir la solicitud
    }
    return data === true;
  } catch (error) {
    console.warn("Error en checkRateLimit:", error);
    return true; // Si falla, permitir la solicitud
  }
}

// Función para registrar una solicitud
async function recordRequest(success: boolean, errorType: string | null = null): Promise<void> {
  try {
    await supabase.rpc("record_embedding_request", {
      p_success: success,
      p_error_type: errorType,
    });
  } catch (error) {
    // No crítico, solo loguear
    console.warn("Error registrando solicitud:", error);
  }
}

// Función para generar embedding con retry optimizado
async function generateEmbeddingWithRetry(
  text: string,
  model: string = "text-embedding-3-small",
  maxRetries: number = 3 // Reducido a 3 intentos para ser más rápido
): Promise<number[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const embeddingResponse = await openai.embeddings.create({
        model,
        input: text.trim(),
      });

      const embedding = embeddingResponse.data[0]?.embedding;

      if (!embedding || embedding.length === 0) {
        throw new Error("OpenAI no devolvió un embedding válido");
      }

      // Registrar éxito de forma asíncrona (no bloquea)
      recordRequest(true, null).catch(err => console.warn("Error registrando éxito:", err));
      return embedding;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Registrar fallo de forma asíncrona
      const errorType = errorMessage.includes("429") ? "rate_limit" :
        errorMessage.includes("quota") ? "quota_exceeded" :
          "other";
      recordRequest(false, errorType).catch(err => console.warn("Error registrando fallo:", err));

      // Si es error 429 o quota, esperar con backoff más corto
      if (errorMessage.includes("429") || errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
        // Backoff optimizado: 1s, 3s, 5s (mucho más rápido)
        const waitTimes = [1000, 3000, 5000];
        const waitTime = waitTimes[Math.min(attempt, waitTimes.length - 1)];
        console.log(`Error 429/Quota. Esperando ${waitTime}ms antes de reintentar (intento ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Si es otro error, lanzarlo inmediatamente
      throw lastError;
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  throw new Error(`No se pudo generar embedding después de ${maxRetries} intentos: ${lastError?.message}`);
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body: EmbeddingRequest = await req.json();
    const { text, model = "text-embedding-3-small", user_id } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return jsonResponse(
        { error: "El campo 'text' es requerido y debe ser un string no vacío" },
        400
      );
    }

    // Normalizar texto (eliminar espacios extra, normalizar a minúsculas para el hash)
    const normalizedText = text.trim();
    const textHash = await generateTextHash(normalizedText);

    // Paso 1: Verificar si el embedding ya existe en cache
    const { data: cachedData, error: cacheError } = await supabase.rpc(
      "get_embedding_from_cache",
      { p_text_hash: textHash }
    );

    let embedding = cachedData[0].embedding;
    if (typeof embedding === 'string') {
      try {
        embedding = JSON.parse(embedding);
      } catch (e) {
        console.error("Error parsing cached embedding:", e);
      }
    }

    console.log(`Embedding encontrado en cache para hash: ${textHash.substring(0, 16)}...`);
    return jsonResponse({
      embedding: embedding,
      model: cachedData[0].model,
      from_cache: true,
    } as EmbeddingResponse);

    // Paso 2: Verificar circuit breaker
    const circuitBreakerAllows = await canProceedWithRequest();
    if (!circuitBreakerAllows) {
      console.log("Circuit breaker está ABIERTO. Usando fallback (retornar null para usar full-text search).");
      return jsonResponse({
        embedding: null,
        model,
        from_cache: false,
        circuit_breaker_open: true,
        fallback_recommended: true,
      });
    }

    // Paso 3: Si no está en cache, verificar rate limit rápidamente y generar embedding
    // Verificación rápida y no bloqueante - si falla, permitir intento de todas formas
    const canProceed = await Promise.race([
      checkRateLimit(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 100)) // Timeout de 100ms
    ]).catch(() => true); // Si hay error, permitir intento

    if (!canProceed) {
      console.log("Rate limit alcanzado. Retornando error inmediatamente...");
      return jsonResponse(
        {
          error: "Rate limit alcanzado. Por favor espera un momento antes de intentar de nuevo.",
          retry_after: 10
        },
        429
      );
    }

    console.log(`Generando nuevo embedding para texto: ${normalizedText.substring(0, 50)}...`);
    let embedding: number[];
    try {
      embedding = await generateEmbeddingWithRetry(normalizedText, model);
      // Registrar éxito en circuit breaker
      await recordSuccess();
    } catch (error) {
      // Registrar fallo en circuit breaker
      await recordFailure();
      throw error; // Re-lanzar el error para que se maneje más abajo
    }

    // Paso 3: Guardar en cache de forma asíncrona (no bloquea la respuesta)
    // No esperamos a que termine para responder más rápido
    supabase
      .from("embedding_cache")
      .insert({
        text_hash: textHash,
        text_content: normalizedText,
        embedding: embedding,
        model,
        user_id: user_id || null, // Tracking opcional por negocio
      })
      .then(({ error: insertError }) => {
        if (insertError) {
          console.warn(`Error guardando en cache (no crítico): ${insertError.message}`);
        } else {
          console.log(`Embedding guardado en cache con hash: ${textHash.substring(0, 16)}...`);
        }
      })
      .catch(err => console.warn("Error asíncrono guardando cache:", err));

    return jsonResponse({
      embedding,
      model,
      from_cache: false,
    } as EmbeddingResponse);
  } catch (error) {
    console.error("Error generando embedding:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    // Determinar código de estado
    const isAuthError = /api key|unauthorized|invalid_api_key/i.test(errorMessage);
    const isRateLimit = /429|rate limit/i.test(errorMessage);
    const status = isAuthError ? 401 : isRateLimit ? 429 : 500;

    return jsonResponse(
      { error: errorMessage },
      status
    );
  }
});

