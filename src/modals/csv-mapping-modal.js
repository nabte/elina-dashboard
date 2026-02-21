// csv-mapping-modal.js
// Módulo para manejar el mapeo de columnas CSV a campos del sistema
// Incluye utilidades CSV expuestas en window para compatibilidad con products.js

(function () {
    // --- Utilidades CSV (Globales) ---

    window.escapeCsvValue = function (value) {
        if (value == null) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    window.splitCsvLines = function (csvText) {
        const lines = [];
        let currentLine = '';
        let insideQuotes = false;
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    currentLine += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
                currentLine += char;
            } else if (char === '\n' && !insideQuotes) {
                if (currentLine.trim()) lines.push(currentLine);
                currentLine = '';
            } else if (char === '\r' && nextChar === '\n' && !insideQuotes) {
                if (currentLine.trim()) lines.push(currentLine);
                currentLine = '';
                i++;
            } else {
                currentLine += char;
            }
        }
        if (currentLine.trim()) lines.push(currentLine);
        return lines;
    };

    window.convertFileToCsvText = async function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file, 'UTF-8');
        });
    };

    window.parseCsvRow = function (row) {
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
    };

    window.getColumnValue = function (columns, index) {
        if (index === undefined || index === null || index < 0) return '';
        return (columns[index] || '').trim();
    };


    // --- Estilos y Modal ---

    // Estilos para el modal dinámico
    const modalStyles = `
        <style>
            #csv-mapping-modal {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            #csv-mapping-modal.visible {
                display: flex;
                opacity: 1;
                pointer-events: auto;
            }
            .mapping-modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: scale(0.95);
                transition: transform 0.3s ease;
            }
            #csv-mapping-modal.visible .mapping-modal-content {
                transform: scale(1);
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', modalStyles);

    // Template del modal
    const modalTemplate = `
        <div id="csv-mapping-modal">
            <div class="mapping-modal-content">
                <div class="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">Mapeo de Columnas</h3>
                        <p class="text-sm text-slate-500 mt-1">Asocia las columnas de tu archivo con los campos de Elina.</p>
                    </div>
                    <button id="close-mapping-modal" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="p-6 overflow-y-auto flex-1 bg-white">
                    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800 flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <div>
                            <p class="font-bold">Tips de Importación:</p>
                            <ul class="list-disc list-inside mt-1 space-y-1 opacity-90">
                                <li>Revisamos tu archivo e intentamos emparejar las columnas automáticamente.</li>
                                <li>Los campos marcados con <strong>*</strong> son obligatorios.</li>
                                <li>Si no deseas importar una columna, selecciona "Ignorar esta columna".</li>
                            </ul>
                        </div>
                    </div>

                    <div class="border rounded-lg overflow-hidden border-slate-200">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th class="p-4 border-b border-r border-slate-200 w-1/2">Campo en Elina</th>
                                    <th class="p-4 border-b border-slate-200 w-1/2">Columna en tu archivo</th>
                                </tr>
                            </thead>
                            <tbody id="mapping-table-body" class="divide-y divide-slate-100">
                                <!-- Filas generadas dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button id="cancel-mapping-btn" class="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 transition-colors">
                        Cancelar
                    </button>
                    <button id="confirm-mapping-btn" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2">
                        <span>Importar Datos</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inyectar el modal en el DOM si no existe
    if (!document.getElementById('csv-mapping-modal')) {
        document.body.insertAdjacentHTML('beforeend', modalTemplate);
    }

    /**
     * Abre el modal de mapeo de columnas
     * @param {Array} fieldDefinitions - Definición de campos del sistema { field, label, required, aliases }
     * @param {Array} csvHeaders - Cabeceras detectadas en el CSV
     * @returns {Promise<Object|null>} - Objeto de mapeo { field: csvHeaderIndex } o null si cancela
     */
    window.openColumnMappingModal = function (fieldDefinitions, csvHeaders) {
        return new Promise((resolve) => {
            const modal = document.getElementById('csv-mapping-modal');
            if (!modal) {
                // Intentar reinyección de emergencia
                document.body.insertAdjacentHTML('beforeend', modalTemplate);
                return window.openColumnMappingModal(fieldDefinitions, csvHeaders).then(resolve);
            }

            const tbody = document.getElementById('mapping-table-body');
            const closeBtn = document.getElementById('close-mapping-modal');
            const cancelBtn = document.getElementById('cancel-mapping-btn');
            const confirmBtn = document.getElementById('confirm-mapping-btn');

            // Limpiar tabla anterior
            tbody.innerHTML = '';

            const ignoreOption = `<option value="">-- Ignorar esta columna --</option>`;

            // Crear una fila por cada campo definido
            fieldDefinitions.forEach(def => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';

                // Buscar mejor coincidencia automática (por índice)
                let selectedIndex = -1;
                if (def.aliases && Array.isArray(def.aliases)) {
                    // Normalizar aliases y headers para comparar
                    const normalizedAliases = def.aliases.map(a => a.toLowerCase().trim());

                    // Buscar coincidencia exacta o parcial
                    selectedIndex = csvHeaders.findIndex(h => {
                        const normalizedHeader = h.toLowerCase().trim().replace(/_/g, ' ').replace(/-/g, ' ');
                        return normalizedAliases.some(alias => {
                            const normalizedAlias = alias.replace(/_/g, ' ').replace(/-/g, ' ');
                            return normalizedHeader === normalizedAlias || normalizedHeader.includes(normalizedAlias);
                        });
                    });
                }

                // Construir el select con la opción preseleccionada (usando índice como valor)
                const options = `
                    ${ignoreOption}
                    ${csvHeaders.map((header, index) =>
                    `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${escapeHtml(header)} (${index === selectedIndex ? 'Auto-detectado' : ''})</option>`
                ).join('')}
                `;

                tr.innerHTML = `
                    <td class="p-4 align-middle">
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-700 text-sm flex items-center gap-1">
                                ${def.label}
                                ${def.required ? '<span class="text-red-500" title="Campo obligatorio">*</span>' : ''}
                            </span>
                            <span class="text-xs text-slate-400 font-mono mt-0.5">${def.field}</span>
                        </div>
                    </td>
                    <td class="p-4 align-middle border-l border-slate-100">
                        <div class="relative">
                            <select class="mapping-select w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 appearance-none" data-field="${def.field}" ${def.required ? 'required' : ''}>
                                ${options}
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Mostrar modal
            modal.classList.add('visible');

            // Handlers de cierre
            const closeModal = () => {
                modal.classList.remove('visible');
                // Remover listeners para evitar duplicados si se reabre (simple cleanup)
                closeBtn.onclick = null;
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
            };

            const handleCancel = () => {
                closeModal();
                resolve(null);
            };

            const handleConfirm = () => {
                const mapping = {};
                let missingRequired = false;
                const selects = tbody.querySelectorAll('select.mapping-select');

                selects.forEach(select => {
                    const field = select.dataset.field;
                    const value = select.value; // Store the index as string
                    const isRequired = select.hasAttribute('required');

                    if (isRequired && value === '') {
                        select.classList.add('border-red-500', 'ring-1', 'ring-red-500');
                        missingRequired = true;

                        // Remover clase de error al cambiar
                        select.addEventListener('change', function () {
                            if (this.value) this.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
                        }, { once: true });
                    } else {
                        if (value !== '') {
                            mapping[field] = parseInt(value, 10); // Convert to integer index
                        }
                    }
                });

                if (missingRequired) {
                    // Podríamos mostrar un toast aquí si window.showToast existe
                    if (window.showToast) window.showToast('Por favor asigna todos los campos obligatorios.', 'error');
                    else alert('Por favor asigna todos los campos obligatorios.');
                    return;
                }

                closeModal();
                resolve(mapping); // Devuelve objeto con índices { sku: 0, price: 2, ... }
            };

            // Asignar listeners
            closeBtn.onclick = handleCancel;
            cancelBtn.onclick = handleCancel;
            confirmBtn.onclick = handleConfirm;
        });
    };

    // Helper para escapar HTML simples
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

})();
