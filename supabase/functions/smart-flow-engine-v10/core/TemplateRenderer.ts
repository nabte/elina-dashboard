import { FlowState } from './types.ts';

/**
 * TemplateRenderer - Reemplaza variables {{variable}} en mensajes
 */
export class TemplateRenderer {
    /**
     * Renderiza un template reemplazando {{variable}} con valores reales
     */
    render(template: string, variables: Record<string, any>): string {
        if (!template) return '';

        let result = template;

        // Reemplazar {{variable}} con valores
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(regex, this.formatValue(value));
        }

        return result;
    }

    /**
     * Formatea un valor según su tipo
     */
    private formatValue(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }

        // Números: formatear con separadores de miles
        if (typeof value === 'number') {
            return value.toLocaleString('es-MX', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        }

        // Fechas: formatear en español
        if (value instanceof Date) {
            return value.toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        }

        // Strings y otros: convertir a string
        return String(value);
    }
}
