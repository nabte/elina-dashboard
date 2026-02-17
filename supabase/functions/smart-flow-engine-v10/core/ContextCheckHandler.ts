/**
 * Context Check Step Handler
 * 
 * Handles detection of previous quotes and intelligent user prompting
 */

import { ContextCheckStep } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function executeContextCheckStep(
    step: ContextCheckStep,
    flow: any,
    state: any,
    supabase: SupabaseClient,
    executeMessageStep: Function
): Promise<string | null> {
    console.log(`>>> [CONTEXT_CHECK] Checking for ${step.check_type}`);

    const contactId = state.metadata?.contact_id;
    if (!contactId) {
        console.warn('[CONTEXT_CHECK] No contact_id in metadata, skipping context check');
        return step.on_not_found || step.next_step || null;
    }

    const timeWindowHours = step.time_window_hours || 24;
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    const since = new Date(Date.now() - timeWindowMs).toISOString();

    // Search for recent completed flows of the same type
    const { data: recentFlows, error } = await supabase
        .from('flow_states')
        .select('*')
        .eq('contact_id', contactId)
        .eq('flow_id', flow.id)
        .eq('status', 'completed')
        .gte('last_updated', since)
        .order('last_updated', { ascending: false })
        .limit(3);

    if (error) {
        console.error('[CONTEXT_CHECK] Error querying flow_states:', error);
        return step.on_not_found || step.next_step || null;
    }

    if (!recentFlows || recentFlows.length === 0) {
        console.log('[CONTEXT_CHECK] No previous context found, continuing normally');
        return step.on_not_found || step.next_step || null;
    }

    // Found previous flows!
    console.log(`[CONTEXT_CHECK] Found ${recentFlows.length} previous flow(s)`);

    const lastFlow = recentFlows[0];
    const quoteSummary = lastFlow.metadata?.quote_summary;

    // Extract data for message template
    const previousQuantity = quoteSummary?.quantity || lastFlow.variables?.quantity || '?';
    const previousProduct = quoteSummary?.product || flow.name;
    const previousTotal = quoteSummary?.total || lastFlow.variables?.total_estimate || '?';

    // Store in variables for potential use
    state.variables['previous_quantity'] = previousQuantity;
    state.variables['previous_product'] = previousProduct;
    state.variables['previous_total'] = previousTotal;
    state.variables['previous_quotes'] = recentFlows.map((f: any) => ({
        quantity: f.metadata?.quote_summary?.quantity || f.variables?.quantity,
        total: f.metadata?.quote_summary?.total || f.variables?.total_estimate,
        timestamp: f.last_updated
    }));

    // Send question to user
    let message = step.ask_message || "Vi que ya hicimos una cotización antes. ¿Quieres una nueva o es la misma?";
    message = message
        .replace('{{previous_quantity}}', String(previousQuantity))
        .replace('{{quantity}}', String(previousQuantity))
        .replace('{{previous_product}}', previousProduct)
        .replace('{{product}}', previousProduct)
        .replace('{{previous_total}}', String(previousTotal))
        .replace('{{total}}', String(previousTotal));

    await executeMessageStep({
        id: step.id + '_ask',
        type: 'message',
        content: message,
        next_step: null
    });

    // Mark as waiting for user response
    state.status = 'paused';
    state.current_step_id = step.id;
    state.variables['_awaiting_context_response'] = true;
    state.variables['_context_check_step'] = step;

    console.log('[CONTEXT_CHECK] Paused, waiting for user response');
    return null; // Pause execution
}

/**
 * Handle user response to context check
 */
export function handleContextCheckResponse(
    userInput: string,
    step: ContextCheckStep
): string | null {
    const inputLower = userInput.toLowerCase().trim();

    // Check each defined response pattern
    for (const [pattern, nextStep] of Object.entries(step.responses)) {
        const patternLower = pattern.toLowerCase();

        // Check if user input contains the pattern
        if (inputLower.includes(patternLower)) {
            console.log(`[CONTEXT_CHECK] Matched response "${pattern}" -> ${nextStep}`);
            return nextStep;
        }
    }

    // No match found
    console.warn('[CONTEXT_CHECK] No matching response pattern found');
    return null;
}
