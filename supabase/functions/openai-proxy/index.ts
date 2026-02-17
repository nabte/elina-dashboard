import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4.51.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-impersonated-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
// --- INICIO: Configuración de Bunny.net ---
const BUNNY_STORAGE_ZONE = 'elina-files'; // El nombre de tu Storage Zone en Bunny.net
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY'); // Tu clave de API de Bunny.net (la de la Storage Zone)
// --- FIN: Configuración de Bunny.net ---
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
// Tamaños permitidos para gpt-image-1 (y DALL-E 3 que son compatibles)
const ALLOWED_SIZES = new Set([
  '1024x1024',
  '1792x1024',
  '1024x1792'
]);
serve(async (req)=>{
  // Manejar preflight CORS con status code explícito
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    // Validar que el body sea un JSON válido
    const body = await req.json();
    const { type, prompt, text, systemInstruction, size, userId, referenceUrls, model } = body;
    
    // Log de la petición entrante para depuración
    console.log('Incoming request:', JSON.stringify({
      type,
      size,
      hasPrompt: !!prompt,
      hasText: !!text,
      hasSystemInstruction: !!systemInstruction,
      userId: !!userId,
      hasReferences: !!referenceUrls?.length
    }));
    
    // Soporte para formato alternativo (sales-context): prompt + systemInstruction sin type
    // Este formato NO requiere userId ni validaciones de límites
    if (!type && prompt && systemInstruction) {
      console.log('Procesando petición en formato sales-context (sin type, sin userId)');
      
      // Validar que OpenAI API Key esté disponible
      if (!Deno.env.get('OPENAI_API_KEY')) {
        throw new Error('OPENAI_API_KEY no está configurada en Supabase.');
      }
      
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemInstruction
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500 // Aumentado de 200 a 500 para respuestas más completas
      });
      
      const content = completion.choices?.[0]?.message?.content ?? '';
      console.log('Respuesta generada:', content.substring(0, 100) + '...');
      
      return new Response(JSON.stringify({
        content: content
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Validaciones robustas para formato estándar (requiere userId)
    if (!userId) throw new Error('El ID de usuario es requerido para usar esta función.');
    if (type !== 'text' && type !== 'image') throw new Error('Tipo de petición no válido. Debe ser "text" o "image".');
    // Verificar acceso de cuenta primero
    const { data: accessCheck, error: accessError } = await supabaseAdmin.rpc('check_account_access', {
      p_user_id: userId
    });
    if (accessError) throw new Error(`Error al verificar acceso: ${accessError.message}`);
    if (accessCheck && accessCheck.blocked) {
      throw new Error(accessCheck.reason || 'Tu cuenta está bloqueada. Por favor, contacta con soporte.');
    }

    // Verificar límites de uso (usando función existente)
    const { data: usageData, error: usageError } = await supabaseAdmin.rpc('get_user_usage_and_limits', {
      user_id_param: userId
    });
    if (usageError) throw new Error(`Error al verificar límites: ${usageError.message}`);
    if (!usageData) throw new Error('No tienes un plan activo. Por favor, suscríbete para usar esta función.');
    
    // Lógica para generación de TEXTO
    if (type === 'text') {
      if (usageData.ai_enhancements_used >= usageData.ai_enhancements_limit) throw new Error('Has alcanzado tu límite mensual de mejoras con IA.');
      if (!prompt || !text) throw new Error('Faltan campos: prompt y text son requeridos para type="text".');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7
      });
      
      // Usar increment_text_usage que ya verifica bloqueo y límites
      const { data: incrementResult, error: incrementError } = await supabaseAdmin.rpc('increment_text_usage', {
        p_user_id: userId
      });
      if (incrementError || !incrementResult?.success) {
        throw new Error(incrementResult?.message || incrementError?.message || 'Error al incrementar el contador de uso.');
      }
      return new Response(JSON.stringify({
        result: completion.choices?.[0]?.message?.content ?? ''
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Lógica para generación de IMAGEN
    if (type === 'image') {
      if (usageData.image_generations_used >= usageData.image_generations_limit) throw new Error('Has alcanzado tu límite mensual de generación de imágenes.');
      if (!prompt) throw new Error('Falta el campo "prompt" para generar una imagen.');
      // Validar el tamaño y usar uno por defecto si es inválido
      const finalSize = ALLOWED_SIZES.has(size) ? size : '1024x1024';
      console.log(`Using size: ${finalSize} (original was ${size})`);
      const imageResponse = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: finalSize,
        quality: 'auto',
        // El parámetro 'response_format' no es compatible con gpt-image-1, devuelve una URL por defecto.
        user: userId
      });
      // Log para depuración: muestra la respuesta completa de OpenAI
      console.log('OpenAI response:', JSON.stringify(imageResponse.data, null, 2));
      // --- INICIO: CORRECCIÓN CORS - Llamada a smart-worker ---
      // En lugar de devolver la URL de OpenAI, la pasamos a smart-worker para que la procese.
      const imageUrl = imageResponse.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("OpenAI no devolvió una URL de imagen válida.");
      }
      const { data: workerData, error: workerError } = await supabaseAdmin.functions.invoke('smart-worker', {
        body: {
          userId: userId,
          sourceUrl: imageUrl,
          subfolder: 'designer-ai' // Guardar en una subcarpeta específica
        }
      });
      if (workerError) throw new Error(`Error al llamar a smart-worker para procesar la imagen: ${workerError.message}`);
      // --- FIN: CORRECCIÓN CORS ---
      // Usar increment_image_usage que ya verifica bloqueo y límites
      const { data: incrementResult, error: incrementError } = await supabaseAdmin.rpc('increment_image_usage', {
        p_user_id: userId
      });
      if (incrementError || !incrementResult?.success) {
        throw new Error(incrementResult?.message || incrementError?.message || 'Error al incrementar el contador de uso.');
      }
      return new Response(JSON.stringify({
        cdnUrl: workerData.cdnUrl
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Si llega aquí, es un error de lógica, pero lo manejamos por si acaso.
    throw new Error('Tipo de petición no manejado.');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    // Log completo para depuración en Supabase
    console.error('Error en openai-proxy:', error.message, error.stack);
    // Determinar el código de estado HTTP correcto
    const isAuthError = /api key|unauthorized|invalid_api_key/i.test(error.message);
    const isLimitError = /limit/i.test(error.message);
    const status = isAuthError ? 401 : isLimitError ? 429 : 400;
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
