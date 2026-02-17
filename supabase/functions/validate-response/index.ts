// supabase/functions/validate-response/index.ts
// Edge Function proxy para validar respuestas con IA de forma segura

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userResponse, expectedResponseType, originalQuestion } = await req.json();

    if (!userResponse || !expectedResponseType || !originalQuestion) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterKey) {
      console.warn('[Validate Response] OPENROUTER_API_KEY not configured');
      return new Response(
        JSON.stringify({ valid: true, reason: 'Validation disabled (no API key)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const systemPrompt = `Eres un validador de respuestas en un sistema de flows automatizados.

Tu tarea es determinar si la respuesta del usuario es válida, o si está haciendo una pregunta fuera de contexto.

Contexto:
- Pregunta original: "${originalQuestion}"
- Tipo de respuesta esperada: "${expectedResponseType}"
- Respuesta del usuario: "${userResponse}"

Debes responder en JSON con este formato EXACTO:
{
  "valid": true/false,
  "isOutOfContext": true/false,
  "reason": "Explicación breve",
  "reformulatedQuestion": "Si es inválida, reformula la pregunta"
}

Reglas:
- **isOutOfContext = true** si el usuario hace una PREGUNTA o SOLICITUD NUEVA no relacionada con la pregunta actual
  Ejemplos: "puedes ayudarme con otra cosa?", "¿vendes X?", "¿cuánto cuesta Y?", "quiero cancelar", "no estoy interesado"

- **isOutOfContext = false, valid = false** si es una respuesta inválida/irrelevante a la pregunta
  Ejemplos: "no sé", "hola", "ok", "peras" (cuando se pide número), "mañana" (cuando se pide número)

- **isOutOfContext = false, valid = true** si es una respuesta válida del tipo esperado
  Ejemplos: "50" para número, "rojo" para color, "juan@email.com" para email

CRÍTICO: Detecta intención del usuario - ¿está respondiendo la pregunta O haciendo una nueva consulta?`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://elina.ai',
        'X-Title': 'ELINA V5 - Flow Validation',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Valida esta respuesta y devuelve JSON` }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Validate Response] OpenRouter error:', response.status, errorData);
      return new Response(
        JSON.stringify({ valid: true, reason: 'Validation service temporarily unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';

    // Extraer JSON del contenido
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Validate Response] No JSON found in response');
      return new Response(
        JSON.stringify({ valid: true, reason: 'Could not parse validation result' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const validation = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(validation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    console.error('validate-response error:', err);
    return new Response(
      JSON.stringify({ valid: true, reason: 'Validation error, accepting by default' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
