// Appointment Tool for AI Agent
// Allows the AI to create appointments directly

export const appointmentTool = {
    type: 'function' as const,
    function: {
        name: 'create_appointment',
        description: 'Crea una cita para el cliente con el horario y servicio seleccionado. Usa esta herramienta cuando el cliente confirme un horario específico.',
        parameters: {
            type: 'object',
            properties: {
                service_id: {
                    type: 'number',
                    description: 'ID del servicio solicitado'
                },
                start_time: {
                    type: 'string',
                    description: 'Fecha y hora de inicio en formato ISO 8601 (ejemplo: 2026-02-15T10:00:00-06:00)'
                },
                notes: {
                    type: 'string',
                    description: 'Notas adicionales del cliente (opcional)'
                }
            },
            required: ['service_id', 'start_time']
        }
    }
}
