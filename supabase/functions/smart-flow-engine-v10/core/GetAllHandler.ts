/**
 * GET ALL MODE HANDLER
 *
 * En lugar de hacer preguntas paso a paso, este handler:
 * 1. Analiza el mensaje del usuario con GPT-4
 * 2. Extrae TODOS los campos posibles de una sola respuesta
 * 3. Guarda las variables extraídas
 * 4. Genera una pregunta pidiendo solo lo que falta
 *
 * Ejemplo:
 * Usuario: "Quiero un tatuaje en mi brazo derecho de 3cm [envía imagen]"
 *
 * Extrae:
 * - ubicacion: "brazo derecho"
 * - tamaño: "3cm"
 * - imagenes_referencia: [URL]
 *
 * Pregunta: "Perfecto! Solo necesito saber: ¿qué estilo prefieres? (realismo, minimalista, etc.)"
 */

import { SmartFlow, FlowState, QuestionStep, CollectImageStep } from './types.ts';

export class GetAllHandler {
    private openrouterApiKey: string;

    constructor() {
        this.openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
    }

    /**
     * Extrae múltiples variables de un mensaje usando GPT-4
     */
    public async extractAllFields(
        userMessage: string,
        flow: SmartFlow,
        currentState: FlowState,
        messageImages?: string[]
    ): Promise<{
        extracted: Record<string, any>;
        missing_fields: string[];
        next_question?: string;
        completion_percentage: number;
    }> {
        console.log('[GetAllHandler] Analyzing message with GPT-4 for multi-field extraction');

        // 1. Identificar qué campos necesitamos recolectar del flow
        const fieldsToCollect = this.getFieldsToCollect(flow);
        console.log('[GetAllHandler] Fields to collect:', fieldsToCollect);

        // 2. Identificar qué campos ya tenemos
        const alreadyCollected = Object.keys(currentState.variables);
        console.log('[GetAllHandler] Already collected:', alreadyCollected);

        // 3. Campos que aún faltan
        const missingFields = fieldsToCollect.filter(f => !alreadyCollected.includes(f.variable));

        if (missingFields.length === 0) {
            console.log('[GetAllHandler] All fields collected!');
            return {
                extracted: {},
                missing_fields: [],
                completion_percentage: 100
            };
        }

        // 4. Usar GPT-4 para extraer campos del mensaje actual
        const extracted = await this.callGPT4ForExtraction(
            userMessage,
            missingFields,
            alreadyCollected.reduce((acc, key) => {
                acc[key] = currentState.variables[key];
                return acc;
            }, {} as Record<string, any>),
            messageImages
        );

        console.log('[GetAllHandler] GPT-4 extracted:', extracted);

        // 5. Actualizar lista de campos faltantes
        const stillMissing = missingFields.filter(f => !extracted[f.variable]);

        // 6. Calcular porcentaje de completitud
        const totalFields = fieldsToCollect.length;
        const collectedCount = totalFields - stillMissing.length;
        const completionPercentage = Math.round((collectedCount / totalFields) * 100);

        // 7. Generar pregunta inteligente para lo que falta (si aplica)
        let nextQuestion: string | undefined;
        if (stillMissing.length > 0) {
            nextQuestion = await this.generateSmartQuestion(stillMissing, extracted, flow);
        }

        return {
            extracted,
            missing_fields: stillMissing.map(f => f.variable),
            next_question: nextQuestion,
            completion_percentage: completionPercentage
        };
    }

    /**
     * Identifica qué campos necesita recolectar el flow
     */
    private getFieldsToCollect(flow: SmartFlow): Array<{ variable: string; description: string; type: string; validation?: any }> {
        const fields: Array<{ variable: string; description: string; type: string; validation?: any }> = [];

        // Usar configuración explícita si está disponible
        if (flow.get_all_config?.fields_to_collect) {
            return flow.get_all_config.fields_to_collect.map(v => ({
                variable: v,
                description: v.replace(/_/g, ' '),
                type: 'text'
            }));
        }

        // Si no, extraer de los steps tipo 'question' y 'collect_image'
        for (const step of flow.steps) {
            if (step.type === 'question') {
                const qStep = step as QuestionStep;
                fields.push({
                    variable: qStep.variable,
                    description: qStep.content,
                    type: qStep.validation?.type || 'text',
                    validation: qStep.validation
                });
            } else if (step.type === 'collect_image') {
                const iStep = step as CollectImageStep;
                fields.push({
                    variable: iStep.variable,
                    description: iStep.content,
                    type: 'image',
                    validation: { max_images: iStep.max_images }
                });
            }
        }

        return fields;
    }

    /**
     * Llama a GPT-4 para extraer campos del mensaje
     */
    private async callGPT4ForExtraction(
        userMessage: string,
        missingFields: Array<{ variable: string; description: string; type: string; validation?: any }>,
        alreadyCollected: Record<string, any>,
        messageImages?: string[]
    ): Promise<Record<string, any>> {
        const prompt = `Eres un asistente que extrae información de mensajes de clientes para completar formularios.

**CAMPOS YA RECOLECTADOS:**
${Object.keys(alreadyCollected).length > 0 ? JSON.stringify(alreadyCollected, null, 2) : 'Ninguno aún'}

**CAMPOS QUE AÚN FALTAN:**
${missingFields.map(f => `- ${f.variable}: ${f.description} (tipo: ${f.type})`).join('\n')}

**MENSAJE DEL CLIENTE:**
"${userMessage}"

${messageImages && messageImages.length > 0 ? `**IMÁGENES ENVIADAS:** ${messageImages.length} imagen(es)` : ''}

**INSTRUCCIONES:**
1. Analiza el mensaje del cliente
2. Extrae SOLO los campos que el cliente mencionó (de la lista de campos faltantes)
3. NO inventes información que no esté en el mensaje
4. Si el cliente envió imágenes, guarda las URLs en el campo correspondiente (si hay un campo de tipo 'image')
5. Devuelve un JSON con los campos extraídos

**FORMATO DE RESPUESTA (JSON):**
{
  "campo_variable": "valor_extraído",
  "otro_campo": "otro_valor"
}

**IMPORTANTE:**
- Solo incluye campos que el cliente REALMENTE mencionó
- Si no mencionó algo, NO lo incluyas en el JSON
- Valores deben ser strings o arrays (para imágenes)
- Para números, conviértelos a string

Responde SOLO con el JSON, sin texto adicional.`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openrouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://myapp.com',
                    'X-Title': 'Smart Flow Engine'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'Eres un extractor de datos experto. Respondes solo con JSON válido.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                console.error('[GetAllHandler] OpenRouter error:', await response.text());
                return {};
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '{}';

            // Parsear JSON de la respuesta
            let extracted: Record<string, any> = {};
            try {
                // Limpiar markdown code blocks si existen
                const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                extracted = JSON.parse(cleanedContent);
            } catch (e) {
                console.error('[GetAllHandler] Failed to parse GPT-4 response:', content);
                return {};
            }

            // Si hay imágenes, agregarlas al campo correspondiente
            if (messageImages && messageImages.length > 0) {
                const imageField = missingFields.find(f => f.type === 'image');
                if (imageField && !extracted[imageField.variable]) {
                    extracted[imageField.variable] = messageImages;
                }
            }

            return extracted;
        } catch (error) {
            console.error('[GetAllHandler] Error calling GPT-4:', error);
            return {};
        }
    }

    /**
     * Genera una pregunta inteligente pidiendo solo lo que falta
     */
    private async generateSmartQuestion(
        missingFields: Array<{ variable: string; description: string; type: string }>,
        alreadyExtracted: Record<string, any>,
        flow: SmartFlow
    ): Promise<string> {
        // Si solo falta un campo, usar la descripción original del step
        if (missingFields.length === 1) {
            const field = missingFields[0];
            const step = flow.steps.find(s =>
                (s.type === 'question' || s.type === 'collect_image') &&
                (s as any).variable === field.variable
            );

            if (step) {
                return (step as any).content;
            }
        }

        // Si faltan múltiples campos, generar pregunta compuesta
        const prompt = `Genera una pregunta natural y amigable en español que pida los siguientes datos al cliente:

${missingFields.map(f => `- ${f.description}`).join('\n')}

**CONTEXTO:**
Ya recolectamos: ${Object.keys(alreadyExtracted).join(', ') || 'nada aún'}

**INSTRUCCIONES:**
1. Pregunta debe ser natural y conversacional
2. Puede pedir varios datos en una sola pregunta si son relacionados
3. Ser específica y clara
4. Máximo 2-3 líneas
5. Sin emojis excesivos (máximo 1-2)

Responde SOLO con la pregunta, sin texto adicional.`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openrouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://myapp.com',
                    'X-Title': 'Smart Flow Engine'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'Eres un asistente conversacional amigable que genera preguntas naturales.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                console.error('[GetAllHandler] OpenRouter error generating question:', await response.text());
                // Fallback: usar las descripciones directamente
                return `Necesito que me proporciones: ${missingFields.map(f => f.description.toLowerCase()).join(', ')}.`;
            }

            const data = await response.json();
            const question = data.choices[0]?.message?.content?.trim() || '';

            return question || `Perfecto! Solo necesito algunos datos más: ${missingFields.map(f => f.description.toLowerCase()).join(', ')}.`;
        } catch (error) {
            console.error('[GetAllHandler] Error generating question:', error);
            return `Necesito que me proporciones: ${missingFields.map(f => f.description.toLowerCase()).join(', ')}.`;
        }
    }
}
