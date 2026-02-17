import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { FlowState } from './types.ts';

/**
 * StateManager - Gestiona el ciclo de vida de estados de flows
 * 
 * Responsabilidades:
 * - Guardar/cargar estados desde la DB
 * - Detectar si es nueva solicitud vs continuación
 * - Limpiar datos transaccionales al completar
 * - Manejar expiración de estados
 */
export class StateManager {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Guarda el estado del flow en la base de datos
     */
    async saveState(userId: string, contactId: number, state: FlowState): Promise<void> {
        // Calcular expiración basada en tipo de flow
        const expiresAt = state.metadata?.is_transactional
            ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutos para transaccionales
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas para otros

        console.log(`[StateManager] Saving state for contact ${contactId}, flow ${state.flow_id}, status: ${state.status}`);

        try {
            // Primero, marcar como expirados los flows activos anteriores del mismo tipo
            await this.supabase.from('flow_states')
                .update({ status: 'expired' })
                .eq('contact_id', contactId)
                .eq('flow_id', state.flow_id)
                .in('status', ['active', 'paused']);

            // CRITICAL FIX: Si el estado es 'completed', eliminar estados completed previos
            // para evitar violación de constraint único (contact_id, flow_id, status)
            if (state.status === 'completed') {
                console.log(`[StateManager] Cleaning up existing completed states`);
                await this.supabase.from('flow_states')
                    .delete()
                    .eq('contact_id', contactId)
                    .eq('flow_id', state.flow_id)
                    .eq('status', 'completed');
            }

            // Insertar nuevo estado
            const { error } = await this.supabase.from('flow_states').insert({
                user_id: userId,
                contact_id: contactId,
                flow_id: state.flow_id,
                current_step_id: state.current_step_id,
                variables: state.variables,
                status: state.status,
                last_updated: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                history: state.history,
                metadata: state.metadata || {
                    is_transactional: false,
                    should_persist: false,
                    language: 'es'
                }
            });

            if (error) {
                console.error('[StateManager] Error saving state:', error);
                throw error;
            }

            console.log(`[StateManager] State saved successfully. Expires at: ${expiresAt.toISOString()}`);
        } catch (error) {
            console.error('[StateManager] Failed to save state:', error);
            throw error;
        }
    }

    /**
     * Carga el estado del flow desde la base de datos
     */
    async loadState(contactId: number, flowId: string): Promise<FlowState | null> {
        console.log(`[StateManager] Loading state for contact ${contactId}, flow ${flowId}`);

        const { data, error } = await this.supabase
            .from('flow_states')
            .select('*')
            .eq('contact_id', contactId)
            .eq('flow_id', flowId)
            .in('status', ['active', 'paused'])
            .order('last_updated', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[StateManager] Error loading state:', error);
            return null;
        }

        if (!data) {
            console.log('[StateManager] No active state found');
            return null;
        }

        // Verificar expiración
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            console.log('[StateManager] State expired, marking as expired');
            await this.expireState(data.id);
            return null;
        }

        console.log(`[StateManager] State loaded: step ${data.current_step_id}, status ${data.status}`);

        return {
            flow_id: data.flow_id,
            current_step_id: data.current_step_id,
            variables: data.variables || {},
            status: data.status,
            last_updated: data.last_updated,
            history: data.history || [],
            knowledge_base: [],
            metadata: data.metadata || {
                is_transactional: false,
                should_persist: false,
                language: 'es'
            }
        };
    }

    /**
     * Limpia datos transaccionales pero preserva contexto relevante
     */
    async cleanupTransactionalData(contactId: number, flowId: string): Promise<void> {
        console.log(`[StateManager] Cleaning up transactional data for contact ${contactId}, flow ${flowId}`);

        const state = await this.loadState(contactId, flowId);

        if (!state || !state.metadata?.is_transactional) {
            console.log('[StateManager] No transactional state to clean');
            return;
        }

        // Extraer solo datos relevantes para memoria a largo plazo
        const persistentData: Record<string, any> = {};

        // Guardar interés en producto (sin cantidades ni precios)
        if (state.variables.product_name) {
            persistentData.product_interest = state.variables.product_name;
        }
        if (state.variables.product_category) {
            persistentData.category_interest = state.variables.product_category;
        }

        persistentData.last_interaction = new Date().toISOString();

        // Guardar en user_preferences si hay datos relevantes
        if (Object.keys(persistentData).length > 1) { // Más que solo last_interaction
            console.log('[StateManager] Saving persistent preferences:', persistentData);

            // Intentar guardar en user_preferences (puede no existir la tabla)
            try {
                await this.supabase.from('user_preferences').upsert({
                    contact_id: contactId,
                    preferences: persistentData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'contact_id'
                });
            } catch (error) {
                console.warn('[StateManager] Could not save to user_preferences (table may not exist):', error);
            }
        }

        // Marcar flow como completado y limpiar variables transaccionales
        await this.supabase.from('flow_states')
            .update({
                status: 'expired',
                variables: {} // Limpiar todas las variables transaccionales
            })
            .eq('contact_id', contactId)
            .eq('flow_id', flowId)
            .in('status', ['active', 'paused', 'completed']);

        console.log(`[StateManager] ✅ Transactional data cleaned for contact ${contactId}`);
    }

    /**
     * Expira un estado
     */
    private async expireState(stateId: string): Promise<void> {
        await this.supabase.from('flow_states')
            .update({ status: 'expired' })
            .eq('id', stateId);
    }

    /**
     * Detecta si es una nueva solicitud o continuación
     * 
     * Criterios:
     * 1. No hay estado activo -> Nueva solicitud
     * 2. Estado completado/expirado -> Nueva solicitud
     * 3. Palabras clave de "nueva solicitud" -> Nueva solicitud
     * 4. Más de 30 minutos desde última actualización -> Nueva solicitud
     * 5. De lo contrario -> Continuación
     */
    async isNewRequest(contactId: number, flowId: string, inputText: string): Promise<boolean> {
        const state = await this.loadState(contactId, flowId);

        // Si no hay estado activo, es nueva solicitud
        if (!state) {
            console.log('[StateManager] No active state -> NEW REQUEST');
            return true;
        }

        // Si el estado está completado o expirado, es nueva solicitud
        if (['completed', 'expired'].includes(state.status)) {
            console.log(`[StateManager] State is ${state.status} -> NEW REQUEST`);
            return true;
        }

        // Si el mensaje contiene palabras clave de "nueva solicitud"
        const newRequestKeywords = [
            'otro', 'otra', 'nueva', 'nuevo', 'diferente',
            'ahora quiero', 'mejor', 'en lugar de', 'cambiar',
            'distinto', 'distinta'
        ];

        const inputLower = inputText.toLowerCase();
        const hasNewRequestKeyword = newRequestKeywords.some(kw =>
            inputLower.includes(kw)
        );

        if (hasNewRequestKeyword) {
            console.log('[StateManager] New request keyword detected -> NEW REQUEST');
            return true;
        }

        // Si han pasado más de 30 minutos desde la última actualización
        const lastUpdate = new Date(state.last_updated);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

        if (minutesSinceUpdate > 30) {
            console.log(`[StateManager] ${minutesSinceUpdate.toFixed(1)} minutes since last update -> NEW REQUEST`);
            return true;
        }

        console.log(`[StateManager] Continuing existing flow (last update: ${minutesSinceUpdate.toFixed(1)} min ago)`);
        return false;
    }

    /**
     * Limpia estados expirados (para ejecutar periódicamente)
     */
    async cleanupExpiredStates(): Promise<number> {
        const { data, error } = await this.supabase
            .from('flow_states')
            .update({ status: 'expired' })
            .lt('expires_at', new Date().toISOString())
            .neq('status', 'expired')
            .select('id');

        if (error) {
            console.error('[StateManager] Error cleaning expired states:', error);
            return 0;
        }

        const count = data?.length || 0;
        if (count > 0) {
            console.log(`[StateManager] Cleaned ${count} expired states`);
        }

        return count;
    }
}
