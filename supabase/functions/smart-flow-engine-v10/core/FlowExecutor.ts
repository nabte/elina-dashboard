import { AnyFlowStep, FlowState, SmartFlow } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TemplateRenderer } from './TemplateRenderer.ts';

export class FlowExecutor {
    private flow: SmartFlow;
    private state: FlowState;
    private supabase: SupabaseClient;
    private renderer: TemplateRenderer;
    public collectedMessages: any[] = [];

    constructor(flow: SmartFlow, state: FlowState, supabase: SupabaseClient) {
        this.flow = flow;
        this.state = state;
        this.supabase = supabase;
        this.renderer = new TemplateRenderer();
    }

    public async run(): Promise<FlowState> {
        console.log(`[FlowExecutor] Running flow ${this.flow.id} from step ${this.state.current_step_id}`);

        let currentStepId = this.state.current_step_id;
        let keepRunning = true;

        while (keepRunning) {
            const step = this.flow.steps.find((s) => s.id === currentStepId);

            if (!step) {
                console.error(`[FlowExecutor] Step ${currentStepId} not found. Ending flow.`);
                this.state.status = 'failed';
                keepRunning = false;
                break;
            }

            console.log(`[FlowExecutor] Executing step: ${step.id} (${step.type})`);

            // Add to history
            this.state.history.push(step.id);

            switch (step.type) {
                case 'message':
                    await this.executeMessageStep(step);
                    currentStepId = step.next_step || '';
                    break;

                case 'action':
                    await this.executeActionStep(step);
                    currentStepId = step.next_step || '';
                    break;

                case 'condition':
                    const next = await this.executeConditionStep(step);
                    currentStepId = next;
                    break;

                case 'question':
                    // Questions imply waiting for an answer, so we pause here unless we have a "smart filler" value ready (future)
                    await this.executeMessageStep({
                        id: step.id,
                        type: 'message',
                        content: step.content,
                        ai_mode: step.ai_mode, // Pasar ai_mode al mensaje
                        next_step: null
                    } as any);

                    // Allow smart filling: key feature of this engine
                    // If the variable is already set (e.g. from initial parsing), skip waiting!
                    if (this.state.variables[step.variable]) {
                        const userResponse = this.state.variables[step.variable];

                        // Auto-generar validation_prompt si no existe (para steps antiguos)
                        if (!step.validation_prompt || step.validation_prompt.trim() === '') {
                            const validationType = (step as any).validation_type || 'text';
                            switch (validationType) {
                                case 'number':
                                    step.validation_prompt = 'Un número válido. Si la respuesta no es un número, reformula la pregunta explicando que necesitas un número.';
                                    break;
                                case 'email':
                                    step.validation_prompt = 'Un email válido con formato correcto (usuario@dominio.com). Si no es un email válido, reformula la pregunta explicando el formato correcto.';
                                    break;
                                case 'phone':
                                    step.validation_prompt = 'Un número de teléfono válido con 10 dígitos (puede incluir lada). Si no es un teléfono válido, reformula la pregunta explicando el formato esperado.';
                                    break;
                                case 'text':
                                default:
                                    step.validation_prompt = `Una respuesta útil y relevante a la pregunta "${step.content}". Si la respuesta es incoherente, irrelevante, o claramente no responde lo que se pregunta, reformula la pregunta de forma amable.`;
                                    break;
                            }
                        }

                        // SIEMPRE validar con IA si hay validation_prompt
                        if (step.validation_prompt && step.validation_prompt.trim() !== '') {
                            console.log(`[FlowExecutor] Validating response with AI for ${step.variable}: ${userResponse}`);

                            const validation = await this.validateResponseWithAI(
                                userResponse,
                                step.validation_prompt,
                                step.content
                            );

                            if (!validation.valid) {
                                // Respuesta inválida, reformular pregunta y volver a pausar
                                console.log(`[FlowExecutor] Invalid response: ${validation.reason}`);

                                // Enviar pregunta reformulada
                                await this.executeMessageStep({
                                    id: step.id + '_reformulated',
                                    type: 'message',
                                    content: validation.reformulatedQuestion || step.content,
                                    ai_mode: true, // Siempre usar IA para reformulaciones
                                    next_step: null
                                } as any);

                                // Limpiar la respuesta inválida y volver a pausar
                                delete this.state.variables[step.variable];
                                this.state.status = 'paused';
                                this.state.current_step_id = step.id;
                                keepRunning = false;
                                break;
                            }

                            console.log(`[FlowExecutor] Response validated successfully`);
                        }

                        console.log(`[FlowExecutor] Variable ${step.variable} already has value: ${userResponse}. Skipping wait.`);
                        currentStepId = step.next_step || '';
                    } else {
                        console.log(`[FlowExecutor] Waiting for user input for variable: ${step.variable}`);
                        this.state.status = 'paused';
                        this.state.current_step_id = step.id; // Stay on this step to process input next time
                        keepRunning = false; // Stop the loop
                    }
                    break;

                case 'wait_for_input':
                    console.log(`[FlowExecutor] Pausing for generic input.`);
                    this.state.status = 'paused';
                    this.state.current_step_id = step.id;
                    keepRunning = false;
                    break;

                case 'context_check':
                    // Import handler dynamically
                    const { executeContextCheckStep } = await import('./ContextCheckHandler.ts');
                    const nextStepFromContext = await executeContextCheckStep(
                        step,
                        this.flow,
                        this.state,
                        this.supabase,
                        this.executeMessageStep.bind(this)
                    );
                    currentStepId = nextStepFromContext || step.next_step || '';

                    // If paused, stop execution
                    if (this.state.status === 'paused') {
                        keepRunning = false;
                    }
                    break;

                // ============================================================================
                // NEW STEP TYPES
                // ============================================================================

                case 'collect_image':
                    await this.executeCollectImageStep(step as any);
                    currentStepId = step.next_step || '';
                    if (this.state.status === 'paused') {
                        keepRunning = false;
                    }
                    break;

                case 'read_image':
                    await this.executeReadImageStep(step as any);
                    currentStepId = step.next_step || '';
                    break;

                case 'create_quote':
                    await this.executeCreateQuoteStep(step as any);
                    currentStepId = step.next_step || '';
                    break;

                case 'send_payment_info':
                    await this.executeSendPaymentInfoStep(step as any);
                    currentStepId = step.next_step || '';
                    break;

                case 'trigger_critical':
                    await this.executeTriggerCriticalStep(step as any);
                    currentStepId = step.next_step || '';
                    if (this.state.status === 'paused') {
                        keepRunning = false;
                    }
                    break;

                case 'create_task':
                    await this.executeCreateTaskStep(step as any);
                    currentStepId = step.next_step || '';
                    break;

                default:
                    console.warn(`[FlowExecutor] Unknown step type: ${step.type}`);
                    keepRunning = false;
                    break;
            }

            if (keepRunning) {
                if (!currentStepId) {
                    console.log(`[FlowExecutor] Flow completed (no next step).`);
                    this.state.status = 'completed';
                    keepRunning = false;
                } else {
                    this.state.current_step_id = currentStepId;
                }
            }
        }

        this.state.last_updated = new Date().toISOString();
        return this.state;
    }

    /**
     * Reformula un mensaje usando IA (OpenRouter) para hacerlo más natural y adaptado al contexto
     */
    private async reformulateWithAI(content: string, context: any = {}): Promise<string> {
        try {
            console.log(`[AI Mode] Reformulating message with AI...`);

            const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
            if (!openrouterKey) {
                console.warn(`[AI Mode] OPENROUTER_API_KEY not found, using original message`);
                return content;
            }

            // Construir contexto de la conversación
            const contextText = Object.entries(this.state.variables)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

            // Prompt para reformular
            const systemPrompt = `Eres un asistente que reformula mensajes de flows automatizados para hacerlos más naturales y humanos.

Tu tarea:
1. Reformula el mensaje manteniendo el mismo significado
2. Hazlo más conversacional y natural
3. Adapta el tono al contexto de la conversación
4. Mantén las variables en formato {{variable}} SIN cambiarlas
5. NO agregues información nueva, solo reformula

Contexto actual:
${contextText || 'Sin contexto previo'}

Flow: ${this.flow.name}`;

            const userPrompt = `Reformula este mensaje para que suene más natural y humano:

"${content}"

Reglas CRÍTICAS:
- Mantén las variables {{variable}} exactamente igual, NO LAS CAMBIES
- No cambies el significado del mensaje
- Hazlo conversacional y amigable
- Responde SOLO con el mensaje reformulado, sin explicaciones ni comillas`;

            // Llamar a OpenRouter (igual que elina-v5)
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openrouterKey}`,
                    'HTTP-Referer': 'https://elina.ai',
                    'X-Title': 'ELINA V5 - Flow AI Mode',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini', // Rápido y económico
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                })
            });

            if (!response.ok) {
                console.warn(`[AI Mode] Error calling OpenRouter API (${response.status}), using original message`);
                return content;
            }

            const result = await response.json();
            const reformulated = result.choices?.[0]?.message?.content || content;

            console.log(`[AI Mode] Original: "${content}"`);
            console.log(`[AI Mode] Reformulated: "${reformulated}"`);

            return reformulated.trim();
        } catch (error) {
            console.error(`[AI Mode] Error reformulating:`, error);
            return content; // Fallback al mensaje original
        }
    }

    /**
     * Valida una respuesta del usuario usando IA
     */
    private async validateResponseWithAI(
        userResponse: string,
        expectedResponseType: string,
        originalQuestion: string
    ): Promise<{ valid: boolean; reason?: string; reformulatedQuestion?: string }> {
        try {
            console.log(`[AI Validation] Validating response: "${userResponse}"`);

            const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
            if (!openrouterKey) {
                console.warn(`[AI Validation] OPENROUTER_API_KEY not found, accepting response by default`);
                return { valid: true };
            }

            const systemPrompt = `Eres un validador de respuestas en un sistema de flows automatizados.

Tu tarea es determinar si la respuesta del usuario es válida y útil según lo que se esperaba.

Contexto:
- Pregunta original: "${originalQuestion}"
- Tipo de respuesta esperada: "${expectedResponseType}"
- Respuesta del usuario: "${userResponse}"

Debes responder en JSON con este formato EXACTO:
{
  "valid": true/false,
  "reason": "Explicación breve de por qué es válida o inválida",
  "reformulatedQuestion": "Si es inválida, reformula la pregunta de manera más clara y natural"
}

Reglas:
- Una respuesta es VÁLIDA si es útil, relevante y del tipo esperado
- Una respuesta es INVÁLIDA si es vaga ("no sé", "hola", "ok"), irrelevante, o no del tipo esperado
- Si es inválida, reformula la pregunta para ser más clara y motivar una respuesta útil
- La pregunta reformulada debe mantener el mismo objetivo pero ser más natural y guiar mejor al usuario`;

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
                console.warn(`[AI Validation] Error calling OpenRouter (${response.status}), accepting response by default`);
                return { valid: true };
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{}';

            // Extraer JSON del contenido
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn(`[AI Validation] No JSON found in response, accepting by default`);
                return { valid: true };
            }

            const validation = JSON.parse(jsonMatch[0]);

            console.log(`[AI Validation] Result:`, validation);

            return validation;
        } catch (error) {
            console.error(`[AI Validation] Error:`, error);
            return { valid: true }; // Fallback: aceptar respuesta en caso de error
        }
    }

    private async executeMessageStep(step: any) {
        // Render template with variables
        let renderedContent = step.content ? this.renderer.render(step.content, this.state.variables) : '';

        // Si ai_mode está activado, reformular con IA
        if (step.ai_mode === true && renderedContent) {
            renderedContent = await this.reformulateWithAI(renderedContent, {
                step_type: 'message',
                step_id: step.id
            });
        }

        console.log(`>>> [BOT MESSAGE]: ${renderedContent}`);

        if (renderedContent) {
            this.collectedMessages.push({
                type: 'text',
                content: renderedContent,
                key: { id: Date.now().toString() }
            });
        }

        if (step.media_url) {
            console.log(`>>> [BOT MEDIA]: ${step.media_url}`);
            this.collectedMessages.push({
                type: 'image',
                url: step.media_url,
                caption: step.content || '',
                key: { id: Date.now().toString() }
            });
        }

        // Support for Manual Multiple Images (Legacy)
        if (step.media_urls && Array.isArray(step.media_urls)) {
            for (const url of step.media_urls) {
                console.log(`>>> [BOT MEDIA GALLERY]: ${url}`);
                this.collectedMessages.push({
                    type: 'image',
                    url: url,
                    caption: '',
                    key: { id: Date.now().toString() }
                });
            }
        }

        // Support for Dynamic Media (Product Gallery) - NEW
        if (step.dynamic_media_source === 'product_gallery') {
            const gallery = this.state.variables['product_gallery'];
            if (gallery && Array.isArray(gallery)) {
                console.log(`>>> [BOT DYNAMIC GALLERY] Sending ${gallery.length} images from product...`);
                for (const url of gallery) {
                    console.log(`>>> [BOT MEDIA GALLERY]: ${url}`);
                    this.collectedMessages.push({
                        type: 'image',
                        url: url,
                        caption: '',
                        key: { id: Date.now().toString() }
                    });
                }
            }
        }

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private async executeActionStep(step: any) {
        console.log(`>>> [ACTION]: ${step.action_type}`, step.payload);

        if (step.action_type === 'calculate_quote') {
            await this.handleCalculateQuote(step);
        } else if (step.action_type === 'calculate_date') {
            this.handleCalculateDate(step);
        } else if (step.action_type === 'calculate_custom') {
            this.handleCalculateCustom(step);
        } else if (step.action_type === 'notify_admin') {
            await this.handleNotifyAdmin(step);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private async handleNotifyAdmin(step: any) {
        const message = step.payload?.message || 'Alerta Crítica';
        const details = step.payload?.details || '';

        console.warn(`🚨 [ADMIN_ALERT] ${message}`);
        console.warn(`   Details: ${details}`);
    }

    private handleCalculateDate(step: any) {
        const days = step.payload.days || 0;
        const targetVar = step.payload.output_var || 'target_date';

        const date = new Date();
        date.setDate(date.getDate() + days);

        // Format: "Martes 18 de Febrero"
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        const formatted = date.toLocaleDateString('es-ES', options);

        this.state.variables[targetVar] = formatted;
        console.log(`>>> [ACTION RESULT]: ${targetVar} = ${formatted}`);
    }

    private handleCalculateCustom(step: any) {
        // Generic custom calculation engine
        // payload: { rules: [...], input_var: 'quantity', output_var: 'unit_price', operation: 'multiply' | 'assignment' }

        const inputVar = step.payload.input_var || 'quantity';
        const inputValue = this.state.variables[inputVar] || 0;
        const rules = step.payload.rules || [];
        const outputVar = step.payload.output_var || 'custom_result';

        let factor = 0; // Price or Factor or Fixed Value

        // 1. Find matching rule
        if (rules.length > 0) {
            for (const rule of rules) {
                // Check Max condition
                if (rule.max !== undefined && inputValue > rule.max) continue;
                // Check Min condition
                if (rule.min !== undefined && inputValue < rule.min) continue;

                // Match found!
                factor = rule.price;
                if (rule.value !== undefined) factor = rule.value;
                break;
            }
        } else {
            // If no rules, assume direct value in payload (e.g. for fixed assignment)
            if (step.payload.value !== undefined) factor = step.payload.value;
        }

        // 2. Perform Operation
        if (step.payload.operation === 'multiply') {
            // e.g., Total = Quantity * UnitPrice
            // or DownPayment = Total * 0.5
            const result = factor * inputValue;
            this.state.variables[outputVar] = result;
            // Optional: if it was a price calc, we might want unit price too, but let's keep it generic
            if (outputVar === 'total_price') {
                this.state.variables['unit_price'] = factor;
            }
            console.log(`>>> [ACTION RESULT]: ${outputVar}=${result} (Factor: ${factor})`);
        } else if (step.payload.operation === 'assignment') {
            // Direct assignment (Fixed Value)
            this.state.variables[outputVar] = factor;
            console.log(`>>> [ACTION RESULT]: ${outputVar}=${factor}`);
        } else {
            // Default Fallback
            this.state.variables[outputVar] = factor;
            console.log(`>>> [ACTION RESULT]: ${outputVar}=${factor}`);
        }
    }

    private async handleCalculateQuote(step: any) {
        const quantity = this.state.variables['quantity'] || this.state.variables['cantidad'] || 1;
        let productId = step.payload.product_id;
        const autoDetect = step.payload.auto_detect_product;

        console.log(`[Quote] Calculating quote. Qty: ${quantity}, ProductID: ${productId}, AutoDetect: ${autoDetect}`);

        // Auto-detect Logic (if product_id is "auto" or missing)
        if ((!productId || productId === 'auto') && autoDetect !== false) {
            const query = this.flow.name; // Use flow trigger as search query
            console.log(`[Quote] Auto-detecting product for query: "${query}"`);

            try {
                const { data, error } = await this.supabase
                    .from('products')
                    .select('id, name, price')
                    .textSearch('name', query)
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    productId = data.id; // Now it's a number
                    console.log(`[Quote] Auto-detected product: ${data.name} (ID: ${data.id})`);
                } else {
                    console.warn(`[Quote] No product found for query: "${query}"`);
                }
            } catch (e) {
                console.error('[Quote] Error in auto-detect:', e);
            }
        } else if (productId && typeof productId === 'string' && productId !== 'auto') {
            // Convert string ID to number
            productId = parseInt(productId, 10);
        }

        let finalPrice = 0;

        if (productId) {
            // Fetch product from Supabase
            const { data: product, error } = await this.supabase
                .from('products')
                .select('price, gallery, faq, pricing_config')
                .eq('id', productId)
                .single();

            if (error) {
                console.error('[Quote] Error fetching product:', error);
            } else if (product) {
                // Store Gallery & FAQ
                if (product.gallery) {
                    this.state.variables['product_gallery'] = product.gallery;
                    console.log(`[Quote] Gallery loaded: ${product.gallery.length} images`);
                }

                if (step.payload.enable_faq && product.faq) {
                    if (!this.state.knowledge_base) this.state.knowledge_base = [];
                    this.state.knowledge_base.push(product.faq);
                    console.log(`[Quote] Knowledge Base updated with Product FAQs`);
                }

                // Logic for Tiered Pricing
                if (product.pricing_config?.model === 'tiered' && Array.isArray(product.pricing_config.tiers)) {
                    // Find matching tier
                    const tier = product.pricing_config.tiers.find((t: any) =>
                        quantity >= t.min && (!t.max || quantity <= t.max)
                    );
                    if (tier) {
                        finalPrice = parseFloat(tier.unit_price) * quantity;
                        console.log(`[Quote] Matched tier: ${tier.unit_price}/unit`);
                    } else {
                        // Fallback to base price if no tier matches (shouldn't happen if configured well)
                        finalPrice = (product.price || 0) * quantity;
                    }
                } else {
                    // Simple pricing
                    finalPrice = (product.price || 0) * quantity;
                }
            }
        } else {
            // Fallback if no product ID (e.g. for testing)
            console.warn('[Quote] No product_id provided (and auto-detect failed). Using mock calculation.');
            finalPrice = 1500;
        }

        this.state.variables['total_estimate'] = finalPrice;
        this.state.variables['quote_amount'] = finalPrice; // Legacy support
        console.log(`>>> [ACTION RESULT]: total_estimate = ${finalPrice}`);
    }

    private async executeConditionStep(step: any): Promise<string> {
        const val = this.state.variables[step.variable];
        console.log(`>>> [CONDITION]: Checking ${step.variable} (${val})`);

        for (const rule of step.rules) {
            if (rule.operator === 'equals' && val === rule.value) return rule.next_step;
            if (rule.operator === 'contains' && String(val).includes(String(rule.value))) return rule.next_step;
            // ... other operators
        }
        return step.default_next_step;
    }

    // ============================================================================
    // NEW STEP EXECUTORS
    // ============================================================================

    private async executeCollectImageStep(step: any) {
        const { executeCollectImageStep, hasImageInMessage, extractImageUrls } = await import('./ImageHandler.ts');

        // NOTE: This assumes we have access to the message and Evolution API credentials
        // These will need to be passed from the main index.ts
        // For now, we'll check if images are already in state.variables

        const imageUrls: string[] = []

        // Check if we already have images in variables (from previous processing)
        if (step.variable && this.state.variables[step.variable]) {
            const existing = this.state.variables[step.variable]
            if (Array.isArray(existing)) {
                imageUrls.push(...existing)
            } else if (typeof existing === 'string') {
                imageUrls.push(existing)
            }
        }

        const result = await executeCollectImageStep(step, this.state, imageUrls)

        if (result.message) {
            await this.executeMessageStep({
                id: step.id + '_response',
                type: 'message',
                content: result.message,
                ai_mode: step.ai_mode, // Pasar ai_mode para reformular si es necesario
                next_step: null
            } as any)
        }

        if (result.shouldPause) {
            this.state.status = 'paused'
        }
    }

    private async executeReadImageStep(step: any) {
        const { executeReadImageStep } = await import('./ImageHandler.ts');
        const result = await executeReadImageStep(step, this.state)

        if (!result.success) {
            console.error(`[FlowExecutor] Error reading image: ${result.error}`)
        }
    }

    private async executeCreateQuoteStep(step: any) {
        // NOTE: This requires userId, contactId, and Evolution API config
        // These should be passed as constructor params or method params
        console.warn('[FlowExecutor] create_quote step requires integration with main index.ts for full functionality')

        // Placeholder: Mark as needing manual integration
        this.state.variables['_quote_pending'] = true
        this.state.variables['_quote_step_id'] = step.id
    }

    private async executeSendPaymentInfoStep(step: any) {
        const { executeSendPaymentInfoStep } = await import('./PaymentHandler.ts');

        // NOTE: Requires userId
        console.warn('[FlowExecutor] send_payment_info step requires userId from context')

        // Placeholder for now
        const result = {
            success: true,
            message: 'Información de pago pendiente de configuración',
            imageUrl: undefined
        }

        if (result.message) {
            await this.executeMessageStep({
                id: step.id + '_payment',
                type: 'message',
                content: result.message,
                media_url: result.imageUrl,
                ai_mode: step.ai_mode, // Pasar ai_mode
                next_step: null
            } as any)
        }
    }

    private async executeTriggerCriticalStep(step: any) {
        console.log(`[FlowExecutor] 🚨 CRITICAL triggered: ${step.reason}`)

        // Mark flow as paused
        if (step.pause_flow !== false) {
            this.state.status = 'paused'
        }

        // Store critical metadata
        if (!this.state.metadata) this.state.metadata = {} as any
        this.state.metadata.critical_triggered = {
            triggered_at: new Date().toISOString(),
            reason: step.reason,
            step_id: step.id
        }

        // Send auto-response
        const autoResponse = step.auto_response ||
            'Gracias por tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo pronto.'

        await this.executeMessageStep({
            id: step.id + '_response',
            type: 'message',
            content: autoResponse,
            ai_mode: true, // Los mensajes de trigger_critical siempre adaptados por IA
            next_step: null
        } as any)
    }

    private async executeCreateTaskStep(step: any) {
        const { executeCreateTaskStep } = await import('./TaskHandler.ts');

        // NOTE: Requires userId and contactId
        console.warn('[FlowExecutor] create_task step requires userId and contactId from context')

        // Mark task creation as pending
        if (!this.state.metadata) this.state.metadata = {} as any
        if (!this.state.metadata.created_tasks) this.state.metadata.created_tasks = []

        // Placeholder task ID
        const taskId = `task_${Date.now()}`
        this.state.metadata.created_tasks.push(taskId)

        console.log(`[FlowExecutor] Task created (placeholder): ${taskId}`)
    }
}
