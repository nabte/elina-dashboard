/**
 * ResponseValidator - Valida respuestas de usuarios usando LLM
 * 
 * Detecta si una respuesta es válida para la pregunta esperada,
 * extrae el valor, y determina si es una pregunta fuera de contexto.
 */

export class ResponseValidator {
    private openrouterKey: string;

    constructor(openrouterKey: string) {
        this.openrouterKey = openrouterKey;
    }

    /**
     * Valida una respuesta del usuario
     */
    async validateResponse(
        question: string,
        userResponse: string,
        expectedType: 'number' | 'text' | 'date' | 'email' | 'phone'
    ): Promise<{
        isValid: boolean;
        extractedValue: any;
        isOutOfContext: boolean;
        reason?: string;
    }> {
        const prompt = `Eres un validador de respuestas en un sistema de flujos conversacionales.

Pregunta al usuario: "${question}"
Respuesta del usuario: "${userResponse}"
Tipo de dato esperado: ${expectedType}

Analiza la respuesta y determina:

1. **isValid**: ¿Es una respuesta válida a la pregunta?
   - Para 'number': ¿Contiene un número? (ej: "50", "cincuenta", "50 piezas")
   - Para 'text': ¿Es texto relevante a la pregunta?
   - Para 'date': ¿Es una fecha? (ej: "mañana", "15 de febrero", "2026-02-15")
   - Para 'email': ¿Es un email válido?
   - Para 'phone': ¿Es un teléfono válido?

2. **extractedValue**: Si es válida, extrae el valor limpio
   - Para 'number': Extrae solo el número (50, no "50 piezas")
   - Para 'text': El texto completo
   - Para 'date': Formato ISO si es posible
   - Para 'email': Email limpio
   - Para 'phone': Teléfono limpio

3. **isOutOfContext**: ¿Es una pregunta nueva/diferente en lugar de una respuesta?
   - true si el usuario pregunta algo no relacionado (ej: "vendes peras?" cuando se pregunta cantidad)
   - false si es una respuesta (válida o inválida)

4. **reason**: Breve explicación si NO es válida o si es fuera de contexto

Responde SOLO con JSON válido:
{
  "isValid": boolean,
  "extractedValue": any,
  "isOutOfContext": boolean,
  "reason": "string"
}`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openrouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://elina.ai',
                    'X-Title': 'Smart Flow Engine'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.1, // Baja temperatura para consistencia
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ResponseValidator] OpenRouter error:', errorText);
                throw new Error(`OpenRouter API error: ${response.status}`);
            }

            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);

            console.log(`[ResponseValidator] Validation result:`, result);

            return result;
        } catch (error) {
            console.error('[ResponseValidator] Error validating response:', error);
            // Fallback: asumir que es válida para no bloquear el flujo
            return {
                isValid: true,
                extractedValue: userResponse,
                isOutOfContext: false,
                reason: 'Validation error, assuming valid'
            };
        }
    }
}
