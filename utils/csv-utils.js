// utils/csv-utils.js - Utilidades centralizadas para manejo de CSV

/**
 * Escapa valores para formato CSV
 * @param {string} value - Valor a escapar
 * @returns {string} Valor escapado
 */
export function escapeCsvValue(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Divide texto CSV en líneas, respetando comillas
 * @param {string} csvText - Texto CSV completo
 * @returns {Array<string>} Array de líneas
 */
export function splitCsvLines(csvText) {
    const lines = [];
    let currentLine = '';
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentLine += '"';
                i++; // Skip next quote
            } else {
                insideQuotes = !insideQuotes;
            }
            currentLine += char;
        } else if (char === '\n' && !insideQuotes) {
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
            currentLine = '';
        } else if (char === '\r' && nextChar === '\n' && !insideQuotes) {
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
            currentLine = '';
            i++; // Skip \n
        } else {
            currentLine += char;
        }
    }

    if (currentLine.trim()) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Convierte un archivo a texto CSV
 * @param {File} file - Archivo a convertir
 * @returns {Promise<string>} Texto CSV
 */
export async function convertFileToCsvText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Parsea una fila CSV en columnas
 * @param {string} row - Fila CSV
 * @returns {Array<string>} Array de columnas
 */
export function parseCsvRow(row) {
    const columns = [];
    let currentColumn = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentColumn += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            columns.push(currentColumn.trim());
            currentColumn = '';
        } else {
            currentColumn += char;
        }
    }

    columns.push(currentColumn.trim());
    return columns;
}

/**
 * Mapea automáticamente headers CSV a definiciones de campos
 * @param {Array<string>} headers - Headers del CSV
 * @param {Array<Object>} fieldDefinitions - Definiciones de campos esperados
 * @returns {Object} Mapeo de índices
 */
export function autoMapHeaders(headers, fieldDefinitions) {
    const mapping = {};

    fieldDefinitions.forEach(field => {
        const aliases = field.aliases || [field.name];
        const headerIndex = guessHeaderIndex(headers, aliases);
        if (headerIndex !== -1) {
            mapping[field.name] = headerIndex;
        }
    });

    return mapping;
}

/**
 * Intenta adivinar el índice de un header basado en aliases
 * @param {Array<string>} headers - Headers disponibles
 * @param {Array<string>} aliases - Posibles nombres del campo
 * @returns {number} Índice encontrado o -1
 */
function guessHeaderIndex(headers, aliases = []) {
    for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase().trim();
        const index = headers.findIndex(h =>
            h.toLowerCase().trim() === normalizedAlias ||
            h.toLowerCase().includes(normalizedAlias) ||
            normalizedAlias.includes(h.toLowerCase().trim())
        );
        if (index !== -1) return index;
    }
    return -1;
}

/**
 * Obtiene el valor de una columna por índice
 * @param {Array<string>} columns - Columnas de la fila
 * @param {number} index - Índice de la columna
 * @returns {string} Valor de la columna o cadena vacía
 */
export function getColumnValue(columns, index) {
    return (columns[index] || '').trim();
}

/**
 * Valida y normaliza un archivo CSV
 * @param {File} file - Archivo a validar
 * @returns {Promise<Object>} Objeto con headers, rows y errores
 */
export async function validateCsvFile(file) {
    const errors = [];

    // Validar tipo de archivo
    if (!file.name.endsWith('.csv')) {
        errors.push('El archivo debe tener extensión .csv');
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        errors.push('El archivo no debe superar 5MB');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    try {
        const csvText = await convertFileToCsvText(file);
        const lines = splitCsvLines(csvText);

        if (lines.length < 2) {
            errors.push('El archivo debe contener al menos una fila de headers y una fila de datos');
            return { valid: false, errors };
        }

        const headers = parseCsvRow(lines[0]);
        const rows = lines.slice(1).map(line => parseCsvRow(line));

        return {
            valid: true,
            headers,
            rows,
            totalRows: rows.length
        };
    } catch (error) {
        errors.push(`Error al procesar el archivo: ${error.message}`);
        return { valid: false, errors };
    }
}
