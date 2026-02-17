/**
 * TASK HANDLER
 * Maneja la creación de tareas/recordatorios en flows
 * Las tareas son diferentes a las citas (appointments)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CreateTaskStep, FlowState } from './types.ts'
import { TemplateRenderer } from './TemplateRenderer.ts'

/**
 * Ejecuta un CreateTaskStep
 */
export async function executeCreateTaskStep(
    step: CreateTaskStep,
    state: FlowState,
    supabase: SupabaseClient,
    userId: string,
    contactId: number
): Promise<{
    success: boolean
    taskId?: string
    error?: string
}> {
    try {
        // 1. Renderizar título y descripción con variables
        const renderer = new TemplateRenderer()
        const renderedTitle = renderer.render(step.task_title, state.variables)
        const renderedDescription = step.task_description
            ? renderer.render(step.task_description, state.variables)
            : undefined

        // 2. Calcular fecha de vencimiento
        let dueDate: string | undefined

        if (step.due_date_variable) {
            // Usar fecha de variable
            const varValue = state.variables[step.due_date_variable]
            if (varValue) {
                dueDate = new Date(varValue).toISOString()
            }
        } else if (step.due_date_offset_days !== undefined) {
            // Calcular desde hoy + offset
            const now = new Date()
            now.setDate(now.getDate() + step.due_date_offset_days)
            dueDate = now.toISOString()
        }

        // 3. Crear tarea en la base de datos
        const taskData = {
            user_id: userId,
            contact_id: contactId,
            title: renderedTitle,
            description: renderedDescription,
            due_date: dueDate,
            priority: step.priority || 'medium',
            status: 'pending',
            created_at: new Date().toISOString(),
            created_from_flow: true,
            flow_id: state.flow_id
        }

        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert(taskData)
            .select()
            .single()

        if (taskError || !task) {
            console.error('[TaskHandler] Error creating task:', taskError)
            return {
                success: false,
                error: `Error creando tarea: ${taskError?.message || 'Unknown error'}`
            }
        }

        console.log(`[TaskHandler] Task created: ${task.id}`)

        // 4. Guardar task_id en metadata
        if (!state.metadata) state.metadata = {} as any
        if (!state.metadata.created_tasks) state.metadata.created_tasks = []
        state.metadata.created_tasks.push(task.id)

        // 5. Notificar al usuario si se solicita
        if (step.notify_on_create) {
            try {
                await notifyTaskCreated(supabase, userId, task)
            } catch (error) {
                console.error('[TaskHandler] Error notifying task creation:', error)
            }
        }

        return {
            success: true,
            taskId: task.id
        }
    } catch (error) {
        console.error('[TaskHandler] Unexpected error:', error)
        return {
            success: false,
            error: `Error inesperado: ${error.message}`
        }
    }
}

/**
 * Notifica al usuario sobre la creación de una tarea
 */
async function notifyTaskCreated(
    supabase: SupabaseClient,
    userId: string,
    task: any
): Promise<void> {
    // TODO: Implementar notificación (email, WhatsApp, push notification, etc.)
    console.log(`[TaskHandler] Notification: Task "${task.title}" created for user ${userId}`)

    // Ejemplo: Crear notificación en la tabla de notificaciones
    try {
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'task_created',
            title: 'Nueva tarea creada',
            message: `Se creó la tarea: "${task.title}"`,
            data: { task_id: task.id },
            created_at: new Date().toISOString()
        })
    } catch (error) {
        console.error('[TaskHandler] Error creating notification record:', error)
    }
}

/**
 * Obtiene todas las tareas pendientes de un contacto
 */
export async function getContactPendingTasks(
    supabase: SupabaseClient,
    contactId: number
): Promise<any[]> {
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('contact_id', contactId)
            .in('status', ['pending', 'in_progress'])
            .order('due_date', { ascending: true })

        if (error) {
            console.error('[TaskHandler] Error fetching pending tasks:', error)
            return []
        }

        return tasks || []
    } catch (error) {
        console.error('[TaskHandler] Unexpected error fetching tasks:', error)
        return []
    }
}

/**
 * Marca una tarea como completada
 */
export async function completeTask(
    supabase: SupabaseClient,
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', taskId)

        if (error) {
            return {
                success: false,
                error: error.message
            }
        }

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error.message
        }
    }
}
