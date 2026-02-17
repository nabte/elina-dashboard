import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { product_name, current_description } = await req.json()

        if (!product_name) {
            throw new Error('Product name is required')
        }

        console.log(`🚀 Optimizing product: ${product_name}`)

        const systemPrompt = `Eres un redactor experto en e-commerce y copywriter. Genera una descripción de producto Y FAQs separadas.

    ⚠️ REGLA CRÍTICA: LAS FAQs DEBEN IR EN EL ARRAY "faqs", NUNCA EN LA DESCRIPCIÓN.

    ESTRUCTURA Y FORMATO:
    1. DESCRIPCIÓN (campo "description"):
       - INTRODUCCIÓN: Un párrafo profesional y persuasivo que destaque el valor del producto.
       - BENEFICIOS: Una lista de 3-4 puntos con el símbolo "•".
       - MODO DE USO: Una instrucción breve de cómo aprovechar el producto.
       - ⚠️ NO INCLUYAS ninguna sección de "Preguntas Frecuentes" o "FAQs" aquí. La descripción termina después del modo de uso.

    2. PREGUNTAS FRECUENTES (campo "faqs" como array):
       - Genera 2-3 preguntas y respuestas breves.
       - Cada FAQ debe tener "question" y "answer" separados.
       - Las FAQs van ÚNICAMENTE en el array, no en la descripción.

    REGLAS EXPLÍCITAS:
    - NO USES NEGRITAS (**). Usa texto plano.
    - SEPARACIÓN: Deja una línea en blanco entre cada sección de la descripción (Introducción, Beneficios, Uso).
    - IDIOMA: Responde estrictamente en el mismo idioma que el nombre del producto (prioridad Español).
    - LONGITUD: Descripción aprox. 80-100 palabras (sin FAQs). Cada FAQ: pregunta + respuesta breves.

    EJEMPLO DE RESPUESTA CORRECTA:
    {
      "description": "Introducción del producto...\n\n• Beneficio 1\n• Beneficio 2\n\nModo de uso: instrucciones...",
      "faqs": [
        {"question": "¿Cuánto tiempo dura?", "answer": "Aproximadamente 30 días."},
        {"question": "¿Cómo se usa?", "answer": "Aplicar directamente sobre la superficie."}
      ]
    }

    ⚠️ NUNCA INCLUYAS TEXTO COMO "Preguntas Frecuentes:" EN LA DESCRIPCIÓN.

    No incluyas markdown JSON envolviendo la respuesta.`

        const userPrompt = `Producto: ${product_name}
    Contexto actual: ${current_description || 'No hay descripción.'}

    Genera:
    1. Una descripción optimizada que contenga SOLO: introducción + beneficios + modo de uso. NO INCLUYAS ninguna sección de FAQs en la descripción.
    2. Un array de 2-3 FAQs separadas con question y answer.

    Responde con el formato JSON exacto especificado.`

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://elina.app',
                'X-Title': 'Elina V5'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini', // Using correct model name
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter API Error:', error)
            throw new Error(`OpenRouter API Error: ${error}`)
        }

        const data = await response.json()
        const aiContent = data.choices[0].message.content
        console.log('🤖 AI Response Raw:', aiContent)
        let parsedContent

        try {
            parsedContent = JSON.parse(aiContent)
            console.log('✅ Parsed Content:', JSON.stringify(parsedContent, null, 2))
        } catch (e) {
            console.error('JSON Parse Error:', e)
            // Fallback attempt
            const jsonBlock = aiContent.match(/```json\n([\s\S]*?)\n```/)
            if (jsonBlock) {
                parsedContent = JSON.parse(jsonBlock[1])
                console.log('✅ Parsed Content (from block):', JSON.stringify(parsedContent, null, 2))
            } else {
                console.error('❌ Failed to parse AI response:', aiContent)
                throw new Error('Failed to parse AI response')
            }
        }

        // Validar que tenga la estructura esperada
        if (!parsedContent.description) {
            console.error('❌ Missing description in response')
        }
        if (!parsedContent.faqs || !Array.isArray(parsedContent.faqs)) {
            console.error('⚠️ FAQs missing or not an array:', parsedContent.faqs)
        }

        return new Response(JSON.stringify(parsedContent), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        console.error('Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
