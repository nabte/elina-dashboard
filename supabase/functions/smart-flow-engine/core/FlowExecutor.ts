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
                        next_step: null
                    } as any);

                    // Allow smart filling: key feature of this engine
                    // If the variable is already set (e.g. from initial parsing), skip waiting!
                    if (this.state.variables[step.variable]) {
                        console.log(`[FlowExecutor] Variable ${step.variable} already has value: ${this.state.variables[step.variable]}. Skipping wait.`);
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

    private async executeMessageStep(step: any) {
        // Render template with variables
        const renderedContent = step.content ? this.renderer.render(step.content, this.state.variables) : '';

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
}
