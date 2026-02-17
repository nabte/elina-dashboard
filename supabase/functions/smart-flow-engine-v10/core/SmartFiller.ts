export class SmartFiller {

    public static extract(text: string, contextKeywords: string[]): Record<string, any> {
        const extracted: Record<string, any> = {};
        const lowerText = text.toLowerCase();

        // 1. Extract Quantity (Enhanced)
        // Matches: "100 piezas", "50 pz", "10 llaveros", "unidades: 20", "cantidad 500"
        const quantityMatch = lowerText.match(/(\d+)\s*(piezas|pz|unidades|llaveros|unidad|pzas?)|(cantidad|pedido)[:\s]*(\d+)/);
        if (quantityMatch) {
            // Group 1 or Group 4
            const num = quantityMatch[1] || quantityMatch[4];
            if (num) extracted['quantity'] = parseInt(num, 10);
        }

        // 2. Extract Dimensions (Key feature for 3D printing)
        // Matches: "5x5", "5x5cm", "10mm", "10x20 mm", "5 x 5"
        const dimMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?|(\d+(?:[.,]\d+)?)\s*(cm|mm|m)/);
        if (dimMatch) {
            extracted['dimensions'] = dimMatch[0].trim();
        }

        // 3. Extract Colors (Basic palette for now)
        const colors = ['rojo', 'azul', 'verde', 'negro', 'blanco', 'gris', 'amarillo', 'naranja', 'rosa', 'morado', 'dorado', 'plateado'];
        const foundColor = colors.find(c => lowerText.includes(c));
        if (foundColor) {
            extracted['color'] = foundColor;
        }

        // 4. Extract Yes/No for design
        if (lowerText.includes('tengo diseño') || lowerText.includes('con logo') || lowerText.includes('mi logo') || lowerText.includes('ya tengo el archivo')) {
            extracted['has_design'] = 'si';
        } else if (lowerText.includes('sin diseño') || lowerText.includes('no tengo diseño') || lowerText.includes('necesito diseño')) {
            extracted['has_design'] = 'no';
        }

        // 5. Extract Date/Urgency keywords
        if (lowerText.includes('urgente') || lowerText.includes('para mañana') || lowerText.includes('lo antes posible')) {
            extracted['urgency'] = 'high';
        }

        console.log(`[SmartFiller] Extracted from "${text}":`, extracted);
        return extracted;
    }
}
