import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function: analyze-training-examples
 *
 * Analiza los ejemplos de entrenamiento (buenos y malos) del usuario
 * y genera sugerencias para mejorar el prompt
 *
 * POST /functions/v1/analyze-training-examples
 * Body: {
 *   include_draft?: boolean  // Si true, usa draft_prompt en lugar de oficial
 * }
 *
 * Returns: {
 *   success: true,
 *   analysis: {
 *     good_patterns: string[],
 *     bad_patterns: string[],
 *     suggestions: string[],
 *     improved_prompt: string
 *   },
 *   stats: {
 *     total_good: number,
 *     total_bad: number
 *   }
 * }
 */

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request
        const body = await req.json().catch(() => ({}))
        const includeDraft = body.include_draft || false

        // Get auth token from request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Create Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        )

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // 1. Obtener ejemplos buenos
        const { data: goodExamples, error: goodError } = await supabase
            .from('training_examples')
            .select('user_message, ai_response, notes')
            .eq('user_id', user.id)
            .eq('is_good_example', true)
            .order('created_at', { ascending: false })
            .limit(20)

        if (goodError) {
            console.error('[analyze-training-examples] Error fetching good examples:', goodError)
            throw goodError
        }

        // 2. Obtener ejemplos malos
        const { data: badExamples, error: badError } = await supabase
            .from('training_examples')
            .select('user_message, ai_response, notes')
            .eq('user_id', user.id)
            .eq('is_good_example', false)
            .order('created_at', { ascending: false })
            .limit(20)

        if (badError) {
            console.error('[analyze-training-examples] Error fetching bad examples:', badError)
            throw badError
        }

        // Validar que haya ejemplos suficientes
        if (!goodExamples?.length && !badExamples?.length) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'No hay ejemplos de entrenamiento disponibles. Guarda algunos ejemplos primero usando 👍 o 👎 en el simulador.'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        // 3. Obtener prompt actual
        let currentPrompt = ''
        if (includeDraft) {
            // Buscar draft_prompt en la sesión más reciente
            const { data: session } = await supabase
                .from('simulation_sessions')
                .select('draft_prompt')
                .eq('user_id', user.id)
                .not('draft_prompt', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            currentPrompt = session?.draft_prompt || ''
        }

        if (!currentPrompt) {
            // Buscar prompt oficial más reciente
            const { data: promptVersion } = await supabase
                .from('prompt_versions')
                .select('prompt_content')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            currentPrompt = promptVersion?.prompt_content || ''
        }

        if (!currentPrompt) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'No hay prompt guardado para analizar. Publica un prompt primero.'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        // 4. Construir prompt de análisis para GPT
        const analysisPrompt = buildAnalysisPrompt(currentPrompt, goodExamples, badExamples)

        // 5. Llamar a OpenAI para analizar
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            throw new Error('OpenAI API key not configured')
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en optimización de prompts para asistentes de IA. Tu trabajo es analizar ejemplos de conversaciones y sugerir mejoras específicas y accionables.\n\n🔒 RESTRICCIÓN CRÍTICA DEL SISTEMA: El prompt del usuario tiene un límite DURO de 2,500 caracteres. Al sugerir cambios, SIEMPRE considera este límite. Si el prompt está cerca del límite, prioriza eliminar contenido redundante antes que agregar nuevo contenido. Sé conciso y quirúrgico en tus sugerencias.'
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        })

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text()
            console.error('[analyze-training-examples] OpenAI error:', errorText)
            throw new Error('Error calling OpenAI API')
        }

        const openaiData = await openaiResponse.json()
        const analysisText = openaiData.choices[0]?.message?.content || ''

        // 6. Parsear respuesta de OpenAI
        const analysis = parseAnalysisResponse(analysisText)

        console.log(`✅ [analyze-training-examples] Analysis completed for user ${user.id}`)
        console.log(`   Good examples: ${goodExamples?.length || 0}, Bad examples: ${badExamples?.length || 0}`)

        return new Response(
            JSON.stringify({
                success: true,
                analysis: analysis,
                stats: {
                    total_good: goodExamples?.length || 0,
                    total_bad: badExamples?.length || 0
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[analyze-training-examples] Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})

/**
 * Construye el prompt para que GPT analice los ejemplos
 */
function buildAnalysisPrompt(
    currentPrompt: string,
    goodExamples: any[],
    badExamples: any[]
): string {
    let prompt = `Analiza el siguiente prompt de IA y los ejemplos de conversaciones para generar recomendaciones de mejora.

**PROMPT ACTUAL:**
\`\`\`
${currentPrompt}
\`\`\`

`

    if (goodExamples && goodExamples.length > 0) {
        prompt += `**EJEMPLOS BUENOS (respuestas que SÍ queremos emular):**\n`
        goodExamples.forEach((ex, i) => {
            prompt += `\nEjemplo ${i + 1}:\n`
            prompt += `Usuario: ${ex.user_message}\n`
            prompt += `IA: ${ex.ai_response}\n`
            if (ex.notes) prompt += `Notas: ${ex.notes}\n`
        })
        prompt += '\n'
    }

    if (badExamples && badExamples.length > 0) {
        prompt += `**EJEMPLOS MALOS (respuestas que NO queremos):**\n`
        badExamples.forEach((ex, i) => {
            prompt += `\nEjemplo ${i + 1}:\n`
            prompt += `Usuario: ${ex.user_message}\n`
            prompt += `IA: ${ex.ai_response}\n`
            if (ex.notes) prompt += `Notas: ${ex.notes}\n`
        })
        prompt += '\n'
    }

    const currentLength = currentPrompt.length

    prompt += `**INFORMACIÓN DEL PROMPT DEL USUARIO:**
- Longitud actual: ${currentLength} caracteres
- 🔒 Límite máximo para el prompt de usuario: 2,500 caracteres
- Espacio disponible: ${2500 - currentLength} caracteres

**TAREA:**

Por favor, analiza estos ejemplos y proporciona:

1. **PATRONES POSITIVOS**: Identifica 3-5 características comunes en las respuestas buenas (tono, estructura, longitud, uso de emojis, etc.)

2. **PATRONES NEGATIVOS**: Identifica 3-5 problemas recurrentes en las respuestas malas (verbosidad, falta de claridad, tono inadecuado, etc.)

3. **SUGERENCIAS DE MEJORA**: Proporciona 5-7 sugerencias específicas y accionables para mejorar el prompt. Cada sugerencia debe ser concreta y explicar el "por qué".

4. **CAMBIOS SUGERIDOS**: En lugar de reescribir todo el prompt, identifica SECCIONES ESPECÍFICAS que necesitan mejora y proporciona SOLO los cambios puntuales. Por ejemplo:
   - "AGREGAR al final de la sección X: [texto nuevo]"
   - "MODIFICAR la línea que dice 'Y' por: [nuevo texto]"
   - "ELIMINAR la parte donde dice: [texto a eliminar]"

**IMPORTANTE**:
- NO reescribas el prompt completo
- Identifica SOLO las partes que necesitan cambio
- Sé quirúrgico y específico
- Mantén todo lo que ya funciona bien
- 🔒 CRÍTICO: El prompt del usuario tiene límite de 2,500 caracteres. Si está cerca del límite, prioriza ELIMINAR contenido redundante antes de agregar nuevo contenido
- Si sugieres agregar texto, asegúrate de que el total no exceda 2,500 caracteres

**FORMATO DE RESPUESTA:**
Usa el siguiente formato EXACTO para facilitar el parsing:

## PATRONES POSITIVOS
- [patrón 1]
- [patrón 2]
...

## PATRONES NEGATIVOS
- [patrón 1]
- [patrón 2]
...

## SUGERENCIAS
1. [sugerencia específica con explicación]
2. [sugerencia específica con explicación]
...

## CAMBIOS SUGERIDOS
### AGREGAR
- **Dónde**: [ubicación específica en el prompt]
- **Texto**: [texto exacto a agregar]

### MODIFICAR
- **Original**: [texto actual que necesita cambio]
- **Nuevo**: [texto mejorado]

### ELIMINAR (si aplica)
- **Texto a eliminar**: [texto específico]

Sé específico y directo. Enfócate en cambios quirúrgicos que no rompan lo que ya funciona.`

    return prompt
}

/**
 * Parsea la respuesta de OpenAI en formato estructurado
 */
function parseAnalysisResponse(text: string): {
    good_patterns: string[],
    bad_patterns: string[],
    suggestions: string[],
    suggested_changes: {
        add: Array<{ where: string, text: string }>,
        modify: Array<{ original: string, new: string }>,
        remove: Array<{ text: string }>
    }
} {
    const result = {
        good_patterns: [] as string[],
        bad_patterns: [] as string[],
        suggestions: [] as string[],
        suggested_changes: {
            add: [] as Array<{ where: string, text: string }>,
            modify: [] as Array<{ original: string, new: string }>,
            remove: [] as Array<{ text: string }>
        }
    }

    // Extraer patrones positivos
    const goodPatternsMatch = text.match(/## PATRONES POSITIVOS\s*([\s\S]*?)(?=##|$)/i)
    if (goodPatternsMatch) {
        result.good_patterns = goodPatternsMatch[1]
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(1).trim())
    }

    // Extraer patrones negativos
    const badPatternsMatch = text.match(/## PATRONES NEGATIVOS\s*([\s\S]*?)(?=##|$)/i)
    if (badPatternsMatch) {
        result.bad_patterns = badPatternsMatch[1]
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(1).trim())
    }

    // Extraer sugerencias
    const suggestionsMatch = text.match(/## SUGERENCIAS\s*([\s\S]*?)(?=##|$)/i)
    if (suggestionsMatch) {
        result.suggestions = suggestionsMatch[1]
            .split('\n')
            .filter(line => /^\d+\./.test(line.trim()))
            .map(line => line.trim().replace(/^\d+\.\s*/, ''))
    }

    // Extraer cambios sugeridos
    const changesMatch = text.match(/## CAMBIOS SUGERIDOS\s*([\s\S]*?)$/i)
    if (changesMatch) {
        const changesText = changesMatch[1]

        // Extraer AGREGAR
        const addMatch = changesText.match(/### AGREGAR\s*([\s\S]*?)(?=###|$)/i)
        if (addMatch) {
            const addLines = addMatch[1].split('\n').filter(l => l.trim())
            let currentAdd: any = {}

            addLines.forEach(line => {
                const whereMatch = line.match(/\*\*Dónde\*\*:\s*(.+)/i)
                const textMatch = line.match(/\*\*Texto\*\*:\s*(.+)/i)

                if (whereMatch) {
                    if (currentAdd.where || currentAdd.text) {
                        result.suggested_changes.add.push(currentAdd)
                    }
                    currentAdd = { where: whereMatch[1].trim(), text: '' }
                } else if (textMatch) {
                    currentAdd.text = textMatch[1].trim()
                }
            })

            if (currentAdd.where || currentAdd.text) {
                result.suggested_changes.add.push(currentAdd)
            }
        }

        // Extraer MODIFICAR
        const modifyMatch = changesText.match(/### MODIFICAR\s*([\s\S]*?)(?=###|$)/i)
        if (modifyMatch) {
            const modifyLines = modifyMatch[1].split('\n').filter(l => l.trim())
            let currentModify: any = {}

            modifyLines.forEach(line => {
                const originalMatch = line.match(/\*\*Original\*\*:\s*(.+)/i)
                const newMatch = line.match(/\*\*Nuevo\*\*:\s*(.+)/i)

                if (originalMatch) {
                    if (currentModify.original || currentModify.new) {
                        result.suggested_changes.modify.push(currentModify)
                    }
                    currentModify = { original: originalMatch[1].trim(), new: '' }
                } else if (newMatch) {
                    currentModify.new = newMatch[1].trim()
                }
            })

            if (currentModify.original || currentModify.new) {
                result.suggested_changes.modify.push(currentModify)
            }
        }

        // Extraer ELIMINAR
        const removeMatch = changesText.match(/### ELIMINAR.*?\s*([\s\S]*?)(?=###|$)/i)
        if (removeMatch) {
            const removeLines = removeMatch[1].split('\n').filter(l => l.trim())
            removeLines.forEach(line => {
                const textMatch = line.match(/\*\*Texto a eliminar\*\*:\s*(.+)/i)
                if (textMatch) {
                    result.suggested_changes.remove.push({ text: textMatch[1].trim() })
                }
            })
        }
    }

    return result
}
