// products.js - Módulo para el panel de Productos

(function () {
    let isInitialized = false;
    let allProductsData = []; // Caché para los productos del usuario
    let currentSearchTerm = ''; // Termino actual del buscador
    let currentLabelFilter = ''; // Filtro actual de etiqueta
    let currentStatusFilter = ''; // Filtro actual de estado
    let allLabelsData = []; // Caché de etiquetas disponibles
    let pricingTiers = []; // Estado local para los rangos de precios

    // --- INICIO: CORRECCIÓN DE INICIALIZACIÓN DEFINITIVA ---
    function tryInitialize() {
        // Inicializar SOLO si hay una sesión activa.
        // Si no hay sesión, esperamos al evento auth:ready
        if (window.auth && window.auth.session) {
            if (!isInitialized) {
                initProductsPanel();
                isInitialized = true;
            }
        } else {
            // Si no hay sesión, no hacemos nada. auth.js disparará auth:ready cuando esté listo.
            // console.log('[products.js] Esperando sesión para inicializar...');
        }
    }

    // Escuchar cuando la autenticación esté lista
    document.addEventListener('auth:ready', () => {
        // console.log('[products.js] Auth ready received, initializing...');
        if (!isInitialized) {
            initProductsPanel();
            isInitialized = true;
        }
    });

    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'products' && !isInitialized && window.auth && window.auth.session) {
            initProductsPanel();
            isInitialized = true; // Marcar como inicializado
        }
    });

    // Inicializar al cargar también, por si acaso (pero validando sesión dentro de tryInitialize)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInitialize);
    } else {
        tryInitialize();
    }

    function initProductsPanel() {
        //         console.log('Inicializando panel de Productos...');
        isInitialized = true;
        setupEventListeners();
        // Solo cargar datos si hay usuario autenticado
        if (window.auth && window.auth.session) {
            loadLabels();
            loadAndRenderProducts();
        }
    }
    // --- FIN: CORRECCIÓN DE INICIALIZACIÓN DEFINITIVA ---

    // Exponer funciones globalmente temprano para evitar race conditions
    window.optimizeAllProducts = function () {
        console.log('[products.js] optimizeAllProducts called');
        if (typeof showOptimizeConfirmation === 'function') {
            showOptimizeConfirmation();
        } else {
            console.error('[products.js] showOptimizeConfirmation not defined');
        }
    };


    // Función para validar si una URL es una URL de media válida
    function isValidMediaUrl(url) {
        if (!url || typeof url !== 'string') return false;

        const trimmedUrl = url.trim();
        if (!trimmedUrl) return false;

        // Extensiones válidas de imagen y video
        const validExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', // Imágenes
            '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv' // Videos
        ];

        // Convertir a minúsculas para comparación
        const lowerUrl = trimmedUrl.toLowerCase();

        // Verificar si termina en alguna extensión válida
        return validExtensions.some(ext => lowerUrl.endsWith(ext));
    }

    function setupEventListeners() {
        document.getElementById('download-template-btn')?.addEventListener('click', downloadTemplate);
        document.getElementById('export-products-btn')?.addEventListener('click', exportProductsToCSV);
        const csvInput = document.getElementById('import-csv-input');
        console.log('[Products Init] CSV Input encontrado:', !!csvInput);
        csvInput?.addEventListener('change', handleCsvImport);

        // Listeners para el nuevo modal
        document.getElementById('add-product-btn')?.addEventListener('click', openNewProductModal);
        document.getElementById('cancel-product-btn')?.addEventListener('click', closeProductModal);
        document.getElementById('product-form')?.addEventListener('submit', handleSaveProduct);
        document.getElementById('product-form')?.addEventListener('submit', handleSaveProduct);
        document.getElementById('product-description-ai-enhance-btn')?.addEventListener('click', handleProductDescriptionAiEnhance);

        // --- CORRECCIÓN: Agregar listener para Optimizar Todo ---
        const bulkOptimizeBtn = document.getElementById('bulk-optimize-btn');
        if (bulkOptimizeBtn) {
            console.log('[products.js] Listener agregado a bulk-optimize-btn');
            // Remove previous and add new to avoid duplication
            bulkOptimizeBtn.onclick = (e) => {
                e.preventDefault();
                console.log('[products.js] Click en bulk-optimize-btn');
                showOptimizeConfirmation();
            };
        } else {
            console.warn('[products.js] bulk-optimize-btn no encontrado al inicializar');
        }


        // Listener para mostrar/ocultar campo de duración y stock según tipo de producto
        const productTypeRadios = document.querySelectorAll('input[name="product-type"]');
        productTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const durationContainer = document.getElementById('product-service-duration-container');
                const durationInput = document.getElementById('product-service-duration');
                const stockContainer = document.getElementById('product-stock-container');

                if (e.target.value === 'service') {
                    durationContainer?.classList.remove('hidden');
                    durationInput?.setAttribute('required', 'required');
                    // Establecer 60 minutos por defecto si el campo está vacío
                    if (!durationInput?.value) {
                        durationInput.value = '60';
                    }
                    stockContainer?.classList.add('hidden');
                } else {
                    durationContainer?.classList.add('hidden');
                    durationInput?.removeAttribute('required');
                    durationInput.value = '';
                    stockContainer?.classList.remove('hidden');
                }
            });
        });

        // Listeners para la tabla (editar y borrar)
        document.getElementById('products-table-body')?.addEventListener('click', (e) => {
            if (e.target.closest('.edit-product-btn')) openEditProductModal(e.target.closest('.edit-product-btn').dataset.id);
            if (e.target.closest('.delete-product-btn')) handleDeleteProduct(e.target.closest('.delete-product-btn').dataset.id);
        });
        document.querySelectorAll('[data-role="products-search"]').forEach(input => {
            input.addEventListener('input', handleProductsSearch);
        });

        // Listeners para filtros y acciones masivas
        document.getElementById('product-label-filter')?.addEventListener('change', handleLabelFilterChange);
        document.getElementById('product-status-filter')?.addEventListener('change', handleStatusFilterChange);
        document.getElementById('deactivate-all-visible-btn')?.addEventListener('click', () => handleBulkStatusChange(false));
        document.getElementById('activate-all-visible-btn')?.addEventListener('click', () => handleBulkStatusChange(true));

        // Listener para vista previa de imagen al seleccionar archivo
        document.getElementById('product-media-file')?.addEventListener('change', handleImagePreview);

        // Listener para Galería (Subida inmediata)
        document.getElementById('product-gallery-input')?.addEventListener('change', handleGalleryUpload);

        // Listener para contador de palabras en descripción
        document.getElementById('product-description')?.addEventListener('input', updateWordCount);

        // Listener para toggle de métricas de calidad
        document.getElementById('toggle-quality-metrics')?.addEventListener('click', toggleQualityMetrics);

        // --- LISTENERS PARA PRECIOS ESCALONADOS ---
        document.getElementById('enable-tiered-pricing')?.addEventListener('change', (e) => {
            updateTieredPricingVisibility(e.target.checked);
        });

        document.getElementById('add-tier-btn')?.addEventListener('click', () => {
            addPricingTier();
        });

        document.getElementById('pricing-tiers-body')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-tier-btn');
            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index);
                removePricingTier(index);
            }
        });

        // Listener para actualizar el array pricingTiers cuando cambian los inputs
        document.getElementById('pricing-tiers-body')?.addEventListener('input', (e) => {
            if (e.target.matches('input')) {
                const row = e.target.closest('tr');
                const index = parseInt(row.dataset.index);
                const field = e.target.dataset.field; // 'min', 'max', 'price'

                if (pricingTiers[index]) {
                    const value = e.target.value;
                    if (field === 'price') {
                        pricingTiers[index].unit_price = value;
                    } else {
                        pricingTiers[index][field] = value;
                    }
                }
            }
        });
    }

    function toggleQualityMetrics() {
        const content = document.getElementById('quality-metrics-content');
        const chevron = document.getElementById('quality-metrics-chevron');

        if (content && chevron) {
            content.classList.toggle('hidden');
            chevron.classList.toggle('rotate-180');
        }
    }

    function calculateQualityMetrics(products) {
        // Verificar que los elementos existen (solo en la página standalone de productos)
        const avgWordsEl = document.getElementById('avg-words-count');
        if (!avgWordsEl) {
            // Los elementos no existen, probablemente estamos en dashboard.html
            return;
        }

        if (!Array.isArray(products) || products.length === 0) {
            // Reset metrics
            const avgWordsCount = document.getElementById('avg-words-count');
            const goodDescCount = document.getElementById('good-descriptions-count');
            const goodDescPercent = document.getElementById('good-descriptions-percent');
            const shortDescCount = document.getElementById('short-descriptions-count');
            const shortDescPercent = document.getElementById('short-descriptions-percent');
            const noDescCount = document.getElementById('no-description-count');
            const noDescPercent = document.getElementById('no-description-percent');

            if (avgWordsCount) avgWordsCount.textContent = '0';
            if (goodDescCount) goodDescCount.textContent = '0';
            if (goodDescPercent) goodDescPercent.textContent = '0%';
            if (shortDescCount) shortDescCount.textContent = '0';
            if (shortDescPercent) shortDescPercent.textContent = '0%';
            if (noDescCount) noDescCount.textContent = '0';
            if (noDescPercent) noDescPercent.textContent = '0%';

            const goodBar = document.getElementById('quality-bar-good');
            const shortBar = document.getElementById('quality-bar-short');
            const noneBar = document.getElementById('quality-bar-none');

            if (goodBar) goodBar.style.width = '0%';
            if (shortBar) shortBar.style.width = '0%';
            if (noneBar) noneBar.style.width = '0%';
            return;
        }

        let totalWords = 0;
        let goodCount = 0;  // 15-30 palabras
        let shortCount = 0; // 1-14 palabras
        let noneCount = 0;  // 0 palabras o null

        products.forEach(product => {
            const description = product.description || '';
            const words = description.trim().split(/\s+/).filter(w => w.length > 0);
            const wordCount = words.length;

            totalWords += wordCount;

            if (wordCount === 0) {
                noneCount++;
            } else if (wordCount < 15) {
                shortCount++;
            } else if (wordCount <= 30) {
                goodCount++;
            } else {
                // Más de 30 palabras también cuenta como "bueno"
                goodCount++;
            }
        });

        const total = products.length;
        const avgWords = Math.round(totalWords / total);
        const goodPercent = Math.round((goodCount / total) * 100);
        const shortPercent = Math.round((shortCount / total) * 100);
        const nonePercent = Math.round((noneCount / total) * 100);

        // Actualizar números (con optional chaining por seguridad)
        const avgWordsCount = document.getElementById('avg-words-count');
        const goodDescCount = document.getElementById('good-descriptions-count');
        const goodDescPercent = document.getElementById('good-descriptions-percent');
        const shortDescCount = document.getElementById('short-descriptions-count');
        const shortDescPercent = document.getElementById('short-descriptions-percent');
        const noDescCount = document.getElementById('no-description-count');
        const noDescPercent = document.getElementById('no-description-percent');

        if (avgWordsCount) avgWordsCount.textContent = avgWords.toString();
        if (goodDescCount) goodDescCount.textContent = goodCount.toString();
        if (goodDescPercent) goodDescPercent.textContent = `${goodPercent}%`;
        if (shortDescCount) shortDescCount.textContent = shortCount.toString();
        if (shortDescPercent) shortDescPercent.textContent = `${shortPercent}%`;
        if (noDescCount) noDescCount.textContent = noneCount.toString();
        if (noDescPercent) noDescPercent.textContent = `${nonePercent}%`;

        // Actualizar barra de progreso
        const goodBar = document.getElementById('quality-bar-good');
        const shortBar = document.getElementById('quality-bar-short');
        const noneBar = document.getElementById('quality-bar-none');
        const goodBarText = document.getElementById('quality-bar-good-text');
        const shortBarText = document.getElementById('quality-bar-short-text');
        const noneBarText = document.getElementById('quality-bar-none-text');

        if (goodBar && shortBar && noneBar) {
            goodBar.style.width = `${goodPercent}%`;
            shortBar.style.width = `${shortPercent}%`;
            noneBar.style.width = `${nonePercent}%`;

            // Mostrar porcentaje solo si es mayor a 10%
            if (goodBarText) goodBarText.textContent = goodPercent >= 10 ? `${goodPercent}%` : '';
            if (shortBarText) shortBarText.textContent = shortPercent >= 10 ? `${shortPercent}%` : '';
            if (noneBarText) noneBarText.textContent = nonePercent >= 10 ? `${nonePercent}%` : '';
        }
    }

    function updateWordCount(event) {
        const text = event.target.value || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;
        const wordCountEl = document.getElementById('product-description-word-count');

        if (wordCountEl) {
            wordCountEl.textContent = `${wordCount} palabra${wordCount !== 1 ? 's' : ''}`;

            // Cambiar color según cantidad de palabras
            if (wordCount < 10) {
                wordCountEl.className = 'text-xs text-red-500 font-semibold';
            } else if (wordCount < 15) {
                wordCountEl.className = 'text-xs text-orange-500 font-semibold';
            } else if (wordCount <= 30) {
                wordCountEl.className = 'text-xs text-green-600 font-semibold';
            } else {
                wordCountEl.className = 'text-xs text-blue-600';
            }
        }
    }

    function handleImagePreview(event) {
        const file = event.target.files?.[0];
        const imagePreview = document.getElementById('product-image-preview');

        if (!imagePreview) return;

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else if (!file) {
            // Si se cancela la selección, ocultar la vista previa
            imagePreview.classList.add('hidden');
            imagePreview.src = '';
        }
    }

    async function handleDeleteProduct(productId) {
        if (!productId) return;
        const confirmed = await window.appModal?.confirm('¿Eliminar este producto de forma permanente?', 'Confirmar eliminación') || false;
        if (!confirmed) {
            return;
        }

        try {
            const { error } = await window.auth.sb
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            allProductsData = allProductsData.filter(p => p.id !== productId);
            renderProductsTable();
            loadAndRenderProducts();
        } catch (error) {
            console.error('Error al eliminar el producto:', error);
            const message = error?.message || 'No se pudo eliminar el producto.';
            window.showToast?.(`Error: ${message}`, 'error');
        }
    }

    async function loadAndRenderProducts() {
        const loader = document.getElementById('products-loader');
        const tbody = document.getElementById('products-table-body');
        if (!loader || !tbody) return;

        loader.textContent = 'Cargando productos...';
        loader.style.display = 'block';
        tbody.innerHTML = '';

        try {
            const { data, error } = await window.auth.sb
                .from('products')
                .select('*')
                .order('product_name');

            if (error) throw error;
            allProductsData = Array.isArray(data) ? data : [];
            await loadLabels(); // Cargar etiquetas después de cargar productos
            calculateQualityMetrics(allProductsData); // Calcular métricas de calidad
            renderProductsTable();
        } catch (e) {
            console.error('Error al cargar productos:', e);
            loader.textContent = 'No se pudieron cargar los productos. Intenta nuevamente.';
            loader.style.display = 'block';
            if (window.showToast) {
                window.showToast('No se pudieron cargar los productos. Intenta nuevamente.', 'error');
            }
            updateProductsCount(allProductsData.length, allProductsData.length);
        }
    }

    function renderProductsTable() {
        const loader = document.getElementById('products-loader');
        const tbody = document.getElementById('products-table-body');
        if (!loader || !tbody) return;

        const totalCount = allProductsData.length;
        const filteredProducts = filterProducts(allProductsData, currentSearchTerm, currentLabelFilter, currentStatusFilter);

        if (totalCount === 0) {
            tbody.innerHTML = '';
            loader.textContent = 'No tienes productos. Importa un archivo CSV para empezar.';
            loader.style.display = 'block';
            updateProductsCount(0, 0);
            return;
        }

        if (filteredProducts.length === 0) {
            tbody.innerHTML = '';
            loader.textContent = currentSearchTerm
                ? 'No se encontraron productos que coincidan con la b\u00fasqueda.'
                : 'No tienes productos. Importa un archivo CSV para empezar.';
            loader.style.display = 'block';
            updateProductsCount(0, totalCount);
            return;
        }

        loader.style.display = 'none';
        tbody.innerHTML = filteredProducts.map(product => {
            const isActive = product.is_active !== false; // Por defecto true si no existe
            const statusBadge = isActive
                ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Activo</span>'
                : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Inactivo</span>';
            const labelsDisplay = (product.labels && Array.isArray(product.labels) && product.labels.length > 0)
                ? product.labels.map(label => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mr-1">${escapeHtml(label)}</span>`).join('')
                : '<span class="text-slate-400 text-xs">Sin etiquetas</span>';
            return `
            <tr class="${!isActive ? 'opacity-60' : ''}">
                <td class="p-4 font-medium">${escapeHtml(product.product_name)}</td>
                <td class="p-4 text-slate-600">${escapeHtml(product.sku || '-')}</td>
                <td class="p-4 text-slate-600">${formatPrice(product.price)}</td>
                <td class="p-4 text-slate-600">${formatStock(product.stock)}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4">${labelsDisplay}</td>
                <td class="p-4">${product.media_url ? `<a href="${escapeHtml(product.media_url)}" target="_blank" class="text-blue-500 hover:underline">Ver Media</a>` : '-'}</td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <button class="edit-product-btn p-2 hover:bg-slate-200 rounded-md" data-id="${product.id}" title="Editar"><i data-lucide="edit" class="w-4 h-4 text-slate-600 pointer-events-none"></i></button>
                        <button class="delete-product-btn p-2 hover:bg-red-100 rounded-md" data-id="${product.id}" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4 text-red-500 pointer-events-none"></i></button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        updateProductsCount(filteredProducts.length, totalCount);
        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }
    }

    function handleProductsSearch(event) {
        currentSearchTerm = event.target.value || '';
        syncSearchInputs(event.target);
        if (!allProductsData.length) return;
        renderProductsTable();
    }

    function syncSearchInputs(sourceInput) {
        document.querySelectorAll('[data-role="products-search"]').forEach(input => {
            if (input !== sourceInput) {
                input.value = currentSearchTerm;
            }
        });
    }

    function filterProducts(products, term, labelFilter, statusFilter) {
        if (!Array.isArray(products)) return [];
        let filtered = products;

        // Filtro por búsqueda
        const normalizedTerm = (term || '').toString().trim().toLowerCase();
        if (normalizedTerm) {
            filtered = filtered.filter(product => {
                const nameMatch = (product.product_name || '').toLowerCase().includes(normalizedTerm);
                const skuMatch = (product.sku || '').toLowerCase().includes(normalizedTerm);
                const descMatch = (product.description || '').toLowerCase().includes(normalizedTerm);
                let priceMatch = false;

                if (product.price !== null && product.price !== undefined && product.price !== '') {
                    const numericPrice = Number(product.price);
                    const rawPrice = String(product.price).toLowerCase();
                    const fixedPrice = Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : '';
                    const localePrice = Number.isFinite(numericPrice)
                        ? numericPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).toLowerCase()
                        : '';

                    priceMatch =
                        rawPrice.includes(normalizedTerm) ||
                        fixedPrice.toLowerCase().includes(normalizedTerm) ||
                        fixedPrice.replace('.', ',').includes(normalizedTerm) ||
                        localePrice.includes(normalizedTerm);
                }

                return nameMatch || skuMatch || descMatch || priceMatch;
            });
        }

        // Filtro por etiqueta
        if (labelFilter && labelFilter.trim() !== '') {
            filtered = filtered.filter(product => {
                const labels = product.labels || [];
                return Array.isArray(labels) && labels.some(label =>
                    label && label.toString().toLowerCase() === labelFilter.toLowerCase()
                );
            });
        }

        // Filtro por estado
        if (statusFilter && statusFilter !== '') {
            const targetStatus = statusFilter === 'true';
            filtered = filtered.filter(product => {
                const isActive = product.is_active !== false; // Por defecto true
                return isActive === targetStatus;
            });
        }

        return filtered;
    }

    function formatPrice(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '$0.00';
        }
        return '$' + numeric.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatStock(value) {
        if (value === -1) {
            return 'Infinita';
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '0';
        }
        return numeric.toLocaleString('es-MX');
    }



    function exportProductsToCSV() {
        if (allProductsData.length === 0) {
            window.showToast?.('No hay productos para exportar.', 'info');
            return;
        }

        const headers = "product_name,description,price,media_url,stock,sku";
        const rows = allProductsData.map(p => {
            const description = window.escapeCsvValue(p.description || ''); // Usar la función global
            return [p.product_name, description, p.price, p.media_url, p.stock, p.sku].join(',');
        });

        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`; // <-- CORRECCIÓN: headers ya es string
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "mis_productos.csv");
        link.click();
    }

    function downloadTemplate() {
        const headers = ['nombre_producto', 'descripcion', 'precio', 'media_url', 'stock', 'sku'];
        const rows = [
            ['Suero hidratante', 'Suero facial con ácido hialurónico para uso diario.', '349.90', 'https://ejemplo.com/imagenes/suero.jpg', '120', 'SKU-SERUM-01'],
            ['Crema corporal', 'Crema nutritiva de rápida absorción.', '189.50', '', '-1', 'SKU-CREMA-02'],
        ];

        const csvLines = [
            headers.join(','),
            ...rows.map(cols => cols.map(window.escapeCsvValue).join(','))
        ];

        const csvContent = `data:text/csv;charset=utf-8,${csvLines.join('\n')}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'plantilla_productos.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function handleCsvImport(event) {
        console.log('[CSV Import] Evento disparado', event);
        const file = event.target.files[0]; // <-- CORRECCIÓN: Usar event.target.files[0]
        console.log('[CSV Import] Archivo seleccionado:', file?.name);
        if (!file) {
            console.log('[CSV Import] No se seleccionó archivo');
            return;
        }

        const skippedRows = [];
        const processedRows = [];
        let mapping = null;
        let finalPayload = [];

        try {
            console.log('[CSV Import] Convirtiendo archivo a texto CSV...');
            const csvText = await window.convertFileToCsvText(file);
            console.log('[CSV Import] CSV Text length:', csvText?.length);

            const rawLines = window.splitCsvLines(csvText);
            console.log('[CSV Import] Líneas encontradas:', rawLines?.length);

            if (!rawLines.length) {
                window.showToast?.('El archivo de productos está vacío.', 'info');
                return;
            }

            const headers = window.parseCsvRow(rawLines[0]).map(h => h.trim());
            console.log('[CSV Import] Headers detectados:', headers);

            if (!headers.length) {
                window.showToast?.('No se pudieron detectar las columnas del archivo.', 'error');
                return;
            }

            console.log('[CSV Import] Abriendo modal de mapeo de columnas...');
            mapping = await window.openColumnMappingModal(fieldDefinitions, headers);
            console.log('[CSV Import] Mapping resultado:', mapping);

            if (!mapping) {
                console.log('[CSV Import] El usuario canceló el mapeo');
                // El usuario canceló el flujo
                return;
            }

            const dataRows = rawLines.slice(1);

            const productsToUpsert = [];
            const uniqueRows = new Map(); // Para manejar duplicados por SKU

            for (const row of dataRows) {
                const columns = window.parseCsvRow(row).map(col => col?.trim() ?? ''); // Usar la función global
                const rawSku = window.getColumnValue(columns, mapping.sku);
                if (!rawSku) continue;

                uniqueRows.set(rawSku, columns);
            }

            for (const [, columns] of uniqueRows) {
                const rawName = window.getColumnValue(columns, mapping.product_name);
                const rawSku = window.getColumnValue(columns, mapping.sku);
                if (!rawName || !rawSku) continue;

                const productPayload = {
                    product_name: rawName,
                    sku: rawSku,
                    _fieldsFromFile: new Set(['product_name', 'sku']) // Marcar campos que vienen del archivo
                };

                // Descripción: agregar si el campo está mapeado (incluso si está vacío)
                if (mapping.description !== undefined && mapping.description !== null) {
                    const rawDescription = window.getColumnValue(columns, mapping.description);
                    if (rawDescription) {
                        productPayload.description = rawDescription.replace(/^"|"$/g, '').replace(/""/g, '"');
                    } else {
                        productPayload.description = null; // Campo vacío en archivo
                    }
                    productPayload._fieldsFromFile.add('description');
                }

                // Precio: agregar si el campo está mapeado
                if (mapping.price !== undefined && mapping.price !== null) {
                    const rawPrice = window.getColumnValue(columns, mapping.price);
                    if (rawPrice) {
                        const normalizedPrice = normalizeDecimal(rawPrice);
                        const priceValue = Number(normalizedPrice);
                        if (Number.isFinite(priceValue)) {
                            productPayload.price = priceValue;
                            productPayload._fieldsFromFile.add('price');
                        }
                    }
                    // Si rawPrice está vacío, no agregamos price al payload (preservar existente)
                }

                // Media URL: agregar si el campo está mapeado
                // Solo actualizar si es una URL válida (termina en extensión de imagen/video)
                if (mapping.media_url !== undefined && mapping.media_url !== null) {
                    const rawMediaUrl = window.getColumnValue(columns, mapping.media_url);
                    if (rawMediaUrl && isValidMediaUrl(rawMediaUrl)) {
                        // Solo agregar si es una URL válida
                        productPayload.media_url = rawMediaUrl;
                        productPayload._fieldsFromFile.add('media_url');
                    }
                    // Si está vacío o no es válido, no agregar al payload (preservar existente)
                }

                // Stock: agregar si el campo está mapeado
                if (mapping.stock !== undefined && mapping.stock !== null) {
                    const rawStock = window.getColumnValue(columns, mapping.stock);
                    if (rawStock) {
                        const normalizedStock = rawStock.replace(/[^\d-]/g, '');
                        const stockValue = parseInt(normalizedStock, 10);
                        if (!Number.isNaN(stockValue)) {
                            productPayload.stock = stockValue === -1 ? -1 : stockValue;
                            productPayload._fieldsFromFile.add('stock');
                        }
                    }
                    // Si rawStock está vacío, no agregamos stock al payload (preservar existente)
                }

                productsToUpsert.push(productPayload);
            }

            if (productsToUpsert.length === 0) {
                window.showToast?.('El archivo CSV est\u00e1 vac\u00edo o no tiene el formato correcto.', 'info');
                return;
            }

            try {
                const impersonatedUser = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
                const targetUserId = impersonatedUser ? impersonatedUser.id : window.auth.getSession()?.user?.id;
                if (!targetUserId) {
                    throw new Error('No se pudo determinar el usuario destino para la importación.');
                }

                const activeAppId = await resolveActiveAppId().catch(() => null);

                // Verificar que el app_id existe en la tabla apps antes de usarlo
                let validAppId = null;
                if (activeAppId) {
                    try {
                        const { data: appExists, error: appCheckError } = await window.auth.sb
                            .from('apps')
                            .select('id')
                            .eq('id', activeAppId)
                            .maybeSingle();

                        if (!appCheckError && appExists) {
                            validAppId = activeAppId;
                        } else {
                            console.log('[products-import] Aviso diagnóstico: el app_id detectado no se encontró en la tabla apps (se usará el existente si aplica):', activeAppId);
                        }
                    } catch (err) {
                        console.warn('[products-import] Error al verificar app_id:', err);
                    }
                }

                // Obtener SKUs de los productos a importar
                const skusToImport = productsToUpsert.map(p => p.sku).filter(Boolean);

                // Obtener productos existentes para preservar datos que no vienen en el archivo
                const { data: existingProducts, error: existingError } = await window.auth.sb
                    .from('products')
                    .select('sku, product_name, description, price, media_url, stock, app_id')
                    .eq('user_id', targetUserId)
                    .in('sku', skusToImport);

                if (existingError) {
                    console.warn('[products-import] Error al obtener productos existentes:', existingError);
                }

                // Crear mapa de productos existentes por SKU
                const existingProductsMap = new Map();
                (existingProducts || []).forEach(product => {
                    existingProductsMap.set(product.sku, product);
                });

                // Combinar datos existentes con nuevos datos del archivo
                const payload = productsToUpsert.map(product => {
                    const existingProduct = existingProductsMap.get(product.sku);
                    const fieldsFromFile = product._fieldsFromFile || new Set();

                    // Empezar con los datos existentes si el producto ya existe
                    const base = existingProduct ? {
                        product_name: existingProduct.product_name,
                        description: existingProduct.description,
                        price: existingProduct.price,
                        media_url: existingProduct.media_url,
                        stock: existingProduct.stock,
                        app_id: existingProduct.app_id
                    } : {};

                    // Sobrescribir solo con los datos que vienen en el archivo
                    // Si el campo está en _fieldsFromFile, actualizar (incluso si está vacío/null)
                    // Si no está en _fieldsFromFile, preservar el existente

                    if (fieldsFromFile.has('product_name')) {
                        base.product_name = product.product_name;
                    }

                    if (fieldsFromFile.has('description')) {
                        // Si viene del archivo, actualizar (puede ser null si estaba vacío)
                        base.description = product.description !== undefined ? product.description : null;
                    }

                    if (fieldsFromFile.has('price')) {
                        base.price = product.price;
                    }

                    if (fieldsFromFile.has('media_url')) {
                        // Si viene del archivo, solo actualizar si es una URL válida
                        // Si el archivo tiene null, vacío o URL inválida, preservar el existente
                        const fileMediaUrl = product.media_url;
                        if (fileMediaUrl && isValidMediaUrl(fileMediaUrl)) {
                            // URL válida del archivo, actualizar
                            base.media_url = fileMediaUrl;
                        } else if (existingProduct?.media_url && isValidMediaUrl(existingProduct.media_url)) {
                            // Archivo tiene valor inválido/vacío, preservar el existente si es válido
                            base.media_url = existingProduct.media_url;
                        } else {
                            // Ninguno es válido, usar null
                            base.media_url = null;
                        }
                    }

                    if (fieldsFromFile.has('stock')) {
                        base.stock = product.stock;
                    }

                    // Agregar campos obligatorios
                    base.sku = product.sku;
                    base.user_id = targetUserId;

                    // Solo incluir app_id si es válido (existe en la tabla apps)
                    // Si el producto existente ya tenía app_id, preservarlo
                    if (validAppId) {
                        base.app_id = validAppId;
                    } else if (existingProduct?.app_id) {
                        // Preservar el app_id existente si no hay uno nuevo válido
                        base.app_id = existingProduct.app_id;
                    }

                    return base;
                });

                const { error } = await window.auth.sb.from('products').upsert(payload, { onConflict: 'user_id,sku' }); // onConflict necesita user_id
                if (error) throw error;

                window.showToast?.(`${payload.length} productos importados/actualizados con éxito.`, 'success');
                loadAndRenderProducts();
            } catch (e) {
                console.error('Error al importar CSV:', e);
                window.showToast?.(`Error al importar: ${e.message}`, 'error');
            }
        } catch (error) {
            console.error('Error general en la importación:', error);
            window.showToast?.(`Error general en la importación: ${error.message}`, 'error');
        } finally {
            event.target.value = ''; // Resetear el input para poder subir el mismo archivo de nuevo
        }
    }

    function updateProductsCount(visibleCount, totalCount = visibleCount) {
        const visibleNumber = Number(visibleCount);
        const totalNumber = Number(totalCount);

        const safeVisible = Number.isFinite(visibleNumber) ? Math.max(0, Math.trunc(visibleNumber)) : 0;
        const safeTotal = Number.isFinite(totalNumber) ? Math.max(0, Math.trunc(totalNumber)) : 0;

        const visibleLabel = safeVisible === 1 ? 'producto' : 'productos';
        const formattedVisible = safeVisible.toLocaleString('es-MX');
        const formattedTotal = safeTotal.toLocaleString('es-MX');

        const listCountEl = document.getElementById('products-count');
        if (listCountEl) {
            listCountEl.textContent = safeVisible === safeTotal
                ? `${formattedVisible} ${visibleLabel}`
                : `${formattedVisible} ${visibleLabel} (de ${formattedTotal})`;
        }

        const overviewCountEl = document.getElementById('products-count-overview');
        if (overviewCountEl) {
            overviewCountEl.textContent = formattedTotal;
        }
    }



    function extractActiveAppId() {
        const teamInfo = window.appInstance?.teamInfo;
        return teamInfo?.active_app_id
            || teamInfo?.app_id
            || teamInfo?.default_app_id
            || teamInfo?.apps?.[0]?.id
            || teamInfo?.team_id
            || null;
    }

    async function resolveActiveAppId() {
        const direct = extractActiveAppId();
        if (direct) return direct;

        if (window.appInstance?.loadTeamInfo) {
            try {
                await window.appInstance.loadTeamInfo();
            } catch (err) {
                console.warn('[products-import] No se pudo refrescar teamInfo:', err);
            }
            const loaded = extractActiveAppId();
            if (loaded) return loaded;
        }

        return localStorage.getItem('active_app_id') || null;
    }

    function normalizeDecimal(value) {
        if (!value) return value;
        const cleaned = value.replace(/[^\d.,-]/g, '').trim();
        if (!cleaned) return cleaned;

        const hasComma = cleaned.includes(',');
        const hasDot = cleaned.includes('.');

        if (hasComma && hasDot) {
            // Determinamos cuál es el separador decimal basado en la última aparición
            if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
                return cleaned.replace(/,/g, '');
            } else {
                return cleaned.replace(/\./g, '').replace(',', '.');
            }
        }

        if (hasComma) {
            return cleaned.replace(',', '.');
        }

        return cleaned;
    }

    const fieldDefinitions = [ // <-- CORRECCIÓN: Mover fieldDefinitions fuera de la función
        { field: 'product_name', label: 'Nombre del producto', required: true, aliases: ['product_name', 'nombre', 'name', 'titulo', 'title'] },
        { field: 'description', label: 'Descripción', required: false, aliases: ['description', 'descripcion', 'detalle', 'detalle_producto'] },
        { field: 'price', label: 'Precio', required: false, aliases: ['price', 'precio', 'pricing', 'costo', 'valor'] },
        { field: 'media_url', label: 'URL de imagen o media', required: false, aliases: ['media_url', 'imagen', 'url_imagen', 'link', 'link_media'] },
        { field: 'stock', label: 'Disponibilidad (stock)', required: false, aliases: ['stock', 'inventario', 'cantidad', 'existencias'] },
        { field: 'sku', label: 'SKU', required: true, aliases: ['sku', 'codigo', 'referencia', 'id_producto'] },
    ];
    // --- FIN: Definiciones de mapeo ---

    // --- LÓGICA DEL MODAL PARA NUEVO PRODUCTO (RESTAURADA) ---

    function openProductModal(product) {
        const modal = document.getElementById('new-product-modal');
        const form = document.getElementById('product-form');
        if (!modal || !form) return;

        form.reset(); // Limpia el formulario antes de mostrarlo
        document.getElementById('product-id').value = product?.id || ''; // ID del producto para saber si es edición
        document.getElementById('product-modal-title').textContent = product ? 'Editar Producto' : 'Añadir Nuevo Producto';

        // Resetear tiered pricing
        pricingTiers = [];
        document.getElementById('enable-tiered-pricing').checked = false;
        updateTieredPricingVisibility(false);
        renderPricingTiers();

        // Resetear tipo de producto a "physical" por defecto
        const physicalRadio = document.getElementById('product-type-physical');
        const serviceRadio = document.getElementById('product-type-service');
        const durationContainer = document.getElementById('product-service-duration-container');
        const durationInput = document.getElementById('product-service-duration');
        const stockContainer = document.getElementById('product-stock-container');

        if (physicalRadio) physicalRadio.checked = true;
        if (serviceRadio) serviceRadio.checked = false;
        if (durationContainer) durationContainer.classList.add('hidden');
        if (stockContainer) stockContainer.classList.remove('hidden');
        if (durationInput) {
            durationInput.removeAttribute('required');
            durationInput.value = '';
        }

        if (product) {
            document.getElementById('product-name').value = product.product_name || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-sku').value = product.sku || '';
            document.getElementById('product-price').value = product.price || 0;
            document.getElementById('product-labels').value = (product.labels || []).join(', ');
            document.getElementById('product-infinite-stock').checked = product.stock === -1;

            document.getElementById('product-infinite-stock').checked = product.stock === -1;

            // Cargar configuración de precios escalonados - NUEVO: desde pricing_tiers (JSONB)
            if (product.pricing_tiers && Array.isArray(product.pricing_tiers) && product.pricing_tiers.length > 0) {
                console.log('[Products] Cargando pricing_tiers:', product.pricing_tiers);
                document.getElementById('enable-tiered-pricing').checked = true;
                updateTieredPricingVisibility(true);

                // Convertir de formato BD a formato UI
                pricingTiers = product.pricing_tiers.map(t => ({
                    min: t.min_quantity,
                    max: t.max_quantity,
                    unit_price: t.price
                }));
                renderPricingTiers();
            } else if (product.pricing_config && product.pricing_config.model === 'tiered') {
                // BACKWARD COMPATIBILITY: si tiene pricing_config antiguo, cargar desde ahí
                console.log('[Products] Cargando desde pricing_config (formato antiguo)');
                document.getElementById('enable-tiered-pricing').checked = true;
                updateTieredPricingVisibility(true);

                if (Array.isArray(product.pricing_config.tiers)) {
                    pricingTiers = product.pricing_config.tiers.map(t => ({
                        min: t.min,
                        max: t.max,
                        unit_price: t.unit_price
                    }));
                    renderPricingTiers();
                }
            } else {
                document.getElementById('enable-tiered-pricing').checked = false;
                updateTieredPricingVisibility(false);
            }

            // Knowledge Fields are now consolidated into description, no separate fields to load

            // Cargar tipo de producto y duración
            const productType = product.product_type || 'physical';
            if (productType === 'service') {
                if (serviceRadio) serviceRadio.checked = true;
                if (physicalRadio) physicalRadio.checked = false;
                if (durationContainer) durationContainer.classList.remove('hidden');
                if (stockContainer) stockContainer.classList.add('hidden');
                if (durationInput) {
                    durationInput.setAttribute('required', 'required');
                    // Establecer 60 minutos por defecto si no tiene duración
                    durationInput.value = product.service_duration_minutes || '60';
                }
                // Cargar estado de is_bookable (por defecto true si no está definido)
                const isBookableCheckbox = document.getElementById('product-is-bookable');
                if (isBookableCheckbox) {
                    isBookableCheckbox.checked = product.is_bookable !== false; // true por defecto
                }
            } else {
                if (physicalRadio) physicalRadio.checked = true;
                if (serviceRadio) serviceRadio.checked = false;
                if (durationContainer) durationContainer.classList.add('hidden');
                if (stockContainer) stockContainer.classList.remove('hidden');
                if (durationInput) {
                    durationInput.removeAttribute('required');
                    durationInput.value = '';
                }
            }

            const stockInput = document.getElementById('product-stock');
            if (stockInput) {
                stockInput.value = product.stock === -1 ? 0 : (product.stock || 0);
                stockInput.disabled = product.stock === -1;
            }

            // Mostrar imagen existente
            const imagePreview = document.getElementById('product-image-preview');
            const imagePlaceholder = document.getElementById('image-placeholder');
            if (imagePreview && product.media_url) {
                imagePreview.src = product.media_url;
                imagePreview.classList.remove('hidden');
                if (imagePlaceholder) imagePlaceholder.classList.add('hidden');
            } else if (imagePreview) {
                imagePreview.classList.add('hidden');
                if (imagePlaceholder) imagePlaceholder.classList.remove('hidden');
            }
        } else {
            // Asegurarse de que la vista previa de la imagen esté oculta para productos nuevos
            const imagePreview = document.getElementById('product-image-preview');
            const imagePlaceholder = document.getElementById('image-placeholder');
            if (imagePreview) {
                imagePreview.classList.add('hidden');
                imagePreview.src = '';
                if (imagePlaceholder) imagePlaceholder.classList.remove('hidden');
            }
            // Limpiar el input de archivo
            const mediaFileInput = document.getElementById('product-media-file');
            if (mediaFileInput) {
                mediaFileInput.value = '';
            }
            // Habilitar el input de stock para productos nuevos
            const stockInput = document.getElementById('product-stock');
            if (stockInput) stockInput.disabled = false;
        }

        // --- Gallery & FAQ Population ---
        const galleryPreview = document.getElementById('product-gallery-preview');
        if (galleryPreview) {
            galleryPreview.innerHTML = '';
            if (product && product.gallery && Array.isArray(product.gallery)) {
                product.gallery.forEach(url => addGalleryItemPreview(url));
            }
        }

        const faqContainer = document.getElementById('product-faq-container');
        const faqEmptyState = document.getElementById('faq-empty-state');
        if (faqContainer) {
            faqContainer.innerHTML = '';
            const faqs = (product && product.faq && Array.isArray(product.faq)) ? product.faq : [];
            if (faqs.length > 0) {
                faqs.forEach(item => addFaqItem(item.question, item.answer, item.media_url));
                if (faqEmptyState) faqEmptyState.classList.add('hidden');
            } else {
                if (faqEmptyState) faqEmptyState.classList.remove('hidden');
            }
        }

        // Inicializar contador de palabras
        const descriptionInput = document.getElementById('product-description');
        if (descriptionInput) {
            updateWordCount({ target: descriptionInput });
        }

        modal.classList.remove('hidden');

        // Refresh icons for the entire modal
        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }
    }

    function closeProductModal() {
        document.getElementById('new-product-modal').classList.add('hidden');
    }

    function openNewProductModal() {
        // Force clear the ID to ensure we are in CREATE mode
        const idInput = document.getElementById('product-id');
        if (idInput) {
            idInput.value = '';
            console.log('[products.js] openNewProductModal: ID cleared for new product');
        }
        openProductModal(null);
    }

    function openEditProductModal(productId) {
        const product = allProductsData.find(p => p.id == productId);
        if (product) openProductModal(product);
    }

    function handleProductDescriptionAiEnhance() {
        const descriptionInput = document.getElementById('product-description');
        if (!descriptionInput) return;

        const currentDescription = descriptionInput.value.trim();
        const productName = document.getElementById('product-name')?.value.trim() || '';

        // Combinar nombre y descripción para mejorar
        const inputText = productName
            ? `Producto: ${productName}\n\nDescripción actual:\n${currentDescription || 'Sin descripción'}`
            : currentDescription || 'Sin descripción';

        if (!window.appInstance?.openAiEnhanceModal) {
            window.showToast?.('La mejora con IA no está disponible en este momento.', 'info');
            return;
        }

        window.appInstance.openAiEnhanceModal(inputText, (newText) => {
            descriptionInput.value = newText;
        });
    }

    // Helper para comprimir imágenes - AHORA USANDO EL GLOBAL DE appInstance
    async function compressImage(file, options = {}) {
        if (window.appInstance?.compressImage) {
            return await window.appInstance.compressImage(file, options);
        }
        console.warn("window.appInstance.compressImage no disponible, usando fallback básico.");
        return file; // Fallback
    }

    async function handleGalleryUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const container = document.getElementById('product-gallery-preview');
        if (!container) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 1. Crear ID temporal para el loader
            const tempId = 'gallery-loading-' + Date.now() + '-' + i;

            // 2. Mostrar loader inmediatamente
            const loaderDiv = document.createElement('div');
            loaderDiv.id = tempId;
            loaderDiv.className = 'relative flex items-center justify-center aspect-square bg-slate-50 rounded-xl border border-slate-200 border-dashed';
            loaderDiv.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <i data-lucide="loader-2" class="w-5 h-5 text-blue-500 animate-spin"></i>
                    <span class="text-[8px] font-bold text-slate-400 uppercase">Subiendo...</span>
                </div>
            `;
            container.appendChild(loaderDiv);
            if (typeof lucide?.createIcons === 'function') lucide.createIcons();

            // 3. Subir en segundo plano
            (async () => {
                try {
                    let fileToUpload = file;
                    if (file.type.startsWith('image/')) {
                        try {
                            fileToUpload = await compressImage(file);
                        } catch (err) { console.error("Error optimizando imagen de galería", err); }
                    }

                    const url = await window.appInstance.uploadAsset(fileToUpload, 'products');

                    if (url) {
                        // Reemplazar loader con la imagen real
                        const finalDiv = createGalleryItemElement(url);
                        loaderDiv.replaceWith(finalDiv);
                    } else {
                        throw new Error("No se obtuvo URL de subida");
                    }
                } catch (error) {
                    console.error("Error subiendo imagen de galería:", error);
                    loaderDiv.innerHTML = `
                        <div class="flex flex-col items-center gap-1 text-red-500 p-2 text-center">
                            <i data-lucide="alert-circle" class="w-4 h-4"></i>
                            <span class="text-[7px] font-bold uppercase">Error</span>
                        </div>
                    `;
                    setTimeout(() => loaderDiv.remove(), 3000);
                }
                if (typeof lucide?.createIcons === 'function') lucide.createIcons();
            })();
        }

        // Limpiar input para permitir subir las mismas fotos si se desea
        e.target.value = '';
    }

    function createGalleryItemElement(url) {
        const div = document.createElement('div');
        div.className = 'relative group aspect-square bg-white rounded-xl overflow-hidden border border-slate-300 shadow-sm transition-all hover:shadow-md';
        div.innerHTML = `
            <img src="${url}" class="w-full h-full object-cover">
            <button type="button" class="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg remove-gallery-item">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        `;
        div.querySelector('.remove-gallery-item').onclick = () => div.remove();
        return div;
    }

    function addGalleryItemPreview(url) {
        const container = document.getElementById('product-gallery-preview');
        if (!container) return;
        const div = createGalleryItemElement(url);
        container.appendChild(div);
        if (typeof lucide?.createIcons === 'function') lucide.createIcons();
    }

    async function handleSaveProduct(e) {
        e.preventDefault();
        const button = document.getElementById('save-new-product-btn');
        button.disabled = true;
        button.textContent = 'Guardando...';

        try {
            let finalMediaUrl = null;
            const mediaFile = document.getElementById('product-media-file').files[0];
            let fileToUpload = mediaFile;

            // --- INICIO: Validaciones y Optimización ---
            if (mediaFile) {
                // Permitir imágenes y videos
                const ALLOWED_TYPES = [
                    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                    'video/mp4', 'video/webm', 'video/quicktime' // .mov
                ];

                // Validación laxa de tipo
                if (!mediaFile.type.startsWith('image/') && !mediaFile.type.startsWith('video/')) {
                    throw new Error("Formato de archivo no válido. Se permiten imágenes y videos.")
                }

                // Optimizar imagen si es necesario
                if (mediaFile.type.startsWith('image/')) {
                    try {
                        window.showToast?.('Optimizando imagen...', 'info');
                        fileToUpload = await compressImage(mediaFile);
                        console.log(`Imagen optimizada: ${(mediaFile.size / 1024 / 1024).toFixed(2)}MB -> ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
                    } catch (optErr) {
                        console.error("Error optimizando imagen:", optErr);
                        // Fallback a original si falla
                    }
                }
            }
            // --- FIN: Validaciones y Optimización ---

            // 1. Si hay un archivo, subirlo usando el método centralizado
            if (fileToUpload) {
                finalMediaUrl = await window.appInstance.uploadAsset(fileToUpload, 'products');
                if (!finalMediaUrl) {
                    throw new Error("La subida del archivo al servidor final falló. Revisa la consola para más detalles.");
                }
            }

            // --- Process Gallery ---
            const gallery = [];
            // Todas las imágenes actuales en el preview (ya subidas)
            document.querySelectorAll('#product-gallery-preview img').forEach(img => {
                gallery.push(img.src);
            });

            // --- Process FAQ ---
            const faq = [];
            document.querySelectorAll('.product-faq-item').forEach(item => {
                const q = item.querySelector('.faq-question').value.trim();
                const a = item.querySelector('.faq-answer').value.trim();
                const m = item.querySelector('.faq-media-url')?.value || null;
                if (q && a) faq.push({ question: q, answer: a, media_url: m });
            });

            // 2. Preparar los datos del producto para guardar en la base de datos
            const isInfiniteStock = document.getElementById('product-infinite-stock').checked;
            const productId = document.getElementById('product-id').value;

            // CORRECCIÓN PARA SUPLANTACIÓN:
            // Obtenemos el ID del usuario actual o del suplantado para asegurar que la RLS de inserción funcione.
            const impersonatedUser = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
            const targetUserId = impersonatedUser?.id || window.auth.getSession()?.user?.id;

            // Procesar etiquetas: convertir string separado por comas a array
            const labelsInput = document.getElementById('product-labels')?.value.trim() || '';
            const labelsArray = labelsInput
                ? labelsInput.split(',').map(label => label.trim()).filter(label => label.length > 0)
                : [];

            // Obtener tipo de producto
            const productTypeRadio = document.querySelector('input[name="product-type"]:checked');
            const productType = productTypeRadio?.value || 'physical';

            // Validar que servicios tengan duración
            if (productType === 'service') {
                const durationInput = document.getElementById('product-service-duration');
                const duration = parseInt(durationInput?.value);
                if (!duration || duration < 15) {
                    throw new Error('Los servicios deben tener una duración mínima de 15 minutos');
                }
                if (duration % 15 !== 0) {
                    throw new Error('La duración debe ser un múltiplo de 15 minutos');
                }
            }

            const productData = {
                product_name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                sku: document.getElementById('product-sku').value,
                price: parseFloat(document.getElementById('product-price').value),
                stock: isInfiniteStock ? -1 : parseInt(document.getElementById('product-stock').value),
                labels: labelsArray,
                product_type: productType,
                product_type: productType,
                gallery: gallery,
                faq: faq,
                // benefits, usage_instructions removed as requested
            };

            // Procesar precios escalonados
            const isTieredPricingEnabled = document.getElementById('enable-tiered-pricing').checked;

            if (isTieredPricingEnabled) {
                // Validar tiers - NUEVO FORMATO para columna pricing_tiers (JSONB)
                const validTiers = pricingTiers.map(t => ({
                    min_quantity: parseInt(t.min),
                    max_quantity: t.max ? parseInt(t.max) : null,
                    price: parseFloat(t.unit_price)
                })).filter(t => !isNaN(t.min_quantity) && !isNaN(t.price)); // Max puede ser null (infinito)

                if (validTiers.length > 0) {
                    // Guardar DIRECTAMENTE en pricing_tiers como JSONB array
                    productData.pricing_tiers = validTiers;
                    console.log('[Products] Guardando pricing_tiers:', validTiers);
                } else {
                    // Si no hay tiers válidos, dejar null
                    productData.pricing_tiers = null;
                }
            } else {
                // Si no está activado, dejar null
                productData.pricing_tiers = null;
            }

            // Agregar duración solo para servicios
            if (productType === 'service') {
                productData.service_duration_minutes = parseInt(document.getElementById('product-service-duration').value);
                // Agregar estado de disponibilidad para reservas
                const isBookableCheckbox = document.getElementById('product-is-bookable');
                productData.is_bookable = isBookableCheckbox ? isBookableCheckbox.checked : true;
            } else {
                // Asegurar que productos físicos no tengan duración
                productData.service_duration_minutes = null;
                // Los productos físicos no se pueden reservar
                productData.is_bookable = false;
            }

            // Añadimos el user_id solo si estamos creando un producto nuevo, para satisfacer la política RLS.
            if (!productId) {
                productData.user_id = targetUserId;
            }

            // Solo actualiza la URL si se subiÃ³ un nuevo archivo
            if (finalMediaUrl) {
                productData.media_url = finalMediaUrl;
            }

            // 3. Guardar o actualizar el producto en la tabla 'products'
            const query = productId
                ? window.auth.sb.from('products').update(productData).eq('id', productId)
                : window.auth.sb.from('products').insert(productData);

            const { error } = await query;
            if (error) throw error;

            window.showToast?.(`¡Producto ${productId ? 'actualizado' : 'guardado'} con éxito!`, 'success');
            closeProductModal();
            loadAndRenderProducts(); // Recargar la tabla

        } catch (error) {
            console.error('Error al guardar el producto:', error);
            window.showToast?.(`Error: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Guardar Producto';
        }
    }

    async function optimizeSingleProduct() {
        const nameInput = document.getElementById('product-name');
        const descInput = document.getElementById('product-description');
        const optimizeBtn = event?.currentTarget || document.querySelector('[onclick="optimizeSingleProduct()"]');

        if (!nameInput.value.trim()) {
            window.showToast?.('Por favor, ingresa el nombre del producto primero.', 'error');
            return;
        }

        const originalBtnContent = optimizeBtn.innerHTML;
        optimizeBtn.disabled = true;
        optimizeBtn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Optimizando...';
        if (typeof lucide?.createIcons === 'function') lucide.createIcons();

        try {
            const { data, error } = await window.auth.sb.functions.invoke('optimize-product', {
                body: {
                    product_name: nameInput.value,
                    current_description: descInput.value
                }
            });

            if (error) throw error;

            if (data) {
                // Actualizar descripción
                if (data.description) {
                    descInput.value = data.description;
                    // Trigger input event to update word count if necessary
                    descInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // Agregar FAQs al contenedor si existen
                if (data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) {
                    console.log('[optimizeSingleProduct] FAQs recibidas:', data.faqs);
                    const faqContainer = document.getElementById('product-faq-container');
                    console.log('[optimizeSingleProduct] FAQ Container encontrado:', !!faqContainer);

                    if (faqContainer) {
                        // Limpiar el contenedor antes de agregar las nuevas FAQs
                        faqContainer.innerHTML = '';

                        // Agregar cada FAQ
                        data.faqs.forEach((faq, index) => {
                            console.log(`[optimizeSingleProduct] Agregando FAQ ${index + 1}:`, faq);
                            if (faq.question && faq.answer) {
                                addFaqItem(faq.question, faq.answer, '');
                            }
                        });

                        // Ocultar el empty state si existe
                        const faqEmptyState = document.getElementById('faq-empty-state');
                        if (faqEmptyState) {
                            faqEmptyState.classList.add('hidden');
                        }

                        console.log('[optimizeSingleProduct] FAQs agregadas. Total en container:', faqContainer.children.length);

                        // Refrescar iconos
                        if (typeof lucide?.createIcons === 'function') {
                            lucide.createIcons();
                        }
                    }
                } else {
                    console.log('[optimizeSingleProduct] No se recibieron FAQs en la respuesta');
                }

                window.showToast?.('Descripción y FAQs optimizadas con éxito.', 'success');
            }
        } catch (error) {
            console.error('Error optimizing single product:', error);
            window.showToast?.('Error al optimizar: ' + error.message, 'error');
        } finally {
            optimizeBtn.disabled = false;
            optimizeBtn.innerHTML = originalBtnContent;
            if (typeof lucide?.createIcons === 'function') lucide.createIcons();
        }
    }

    function showOptimizeConfirmation() {
        console.log('[products.js] showOptimizeConfirmation iniciado');
        let modal = document.getElementById('optimize-confirm-modal');

        if (!modal) {
            console.error('[products.js] ERROR: Modal no encontrado por ID. Buscando por selector...');
            modal = document.querySelector('[id="optimize-confirm-modal"]');
        }

        if (!modal) {
            console.error('[products.js] ERROR CRÍTICO: El modal de optimización no existe en el DOM.');
            window.showToast?.('Error: Modal de optimización no encontrado', 'error');
            return;
        }

        // Mover al final del body para asegurar visibilidad máxima
        if (modal.parentElement !== document.body) {
            console.log('[products.js] Moviendo modal al final del body');
            document.body.appendChild(modal);
        }

        console.log('[products.js] Forzando visibilidad extrema del modal (width anterior logueado como 0)');

        const forceStyle = (el, prop, val) => el.style.setProperty(prop, val, 'important');

        // Reset display first to allow re-calculation
        forceStyle(modal, 'display', 'flex');
        forceStyle(modal, 'position', 'fixed');
        forceStyle(modal, 'top', '0px');
        forceStyle(modal, 'left', '0px');
        forceStyle(modal, 'right', '0px');
        forceStyle(modal, 'bottom', '0px');
        forceStyle(modal, 'width', '100vw');
        forceStyle(modal, 'height', '100vh');
        forceStyle(modal, 'background-color', 'rgba(0,0,0,0.8)');
        forceStyle(modal, 'z-index', '2147483647');
        forceStyle(modal, 'visibility', 'visible');
        forceStyle(modal, 'opacity', '1');
        forceStyle(modal, 'pointer-events', 'auto');

        // También forzar el contenido interno
        const inner = modal.querySelector('div');
        if (inner) {
            forceStyle(inner, 'display', 'block');
            forceStyle(inner, 'visibility', 'visible');
            forceStyle(inner, 'opacity', '1');
            forceStyle(inner, 'transform', 'none');
            forceStyle(inner, 'margin', 'auto'); // Asegurar centrado si flex falla
        }

        // Forzar reflow
        void modal.offsetHeight;

        console.log('[products.js] Modal state FINAL:', {
            width: modal.offsetWidth,
            height: modal.offsetHeight,
            visible: window.getComputedStyle(modal).visibility,
            display: window.getComputedStyle(modal).display,
            parent: modal.parentElement.tagName,
            htmlLength: modal.innerHTML.length
        });

        // Refrescar iconos
        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }

        const emptyBtn = document.getElementById('optimize-empty-btn');
        const allBtn = document.getElementById('optimize-all-btn');
        const closeBtn = document.getElementById('close-optimize-modal-btn');

        const closeModal = () => {
            console.log('[products.js] Cerrando modal de optimización');
            modal.style.setProperty('display', 'none', 'important');
        };

        if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); closeModal(); };

        if (emptyBtn) {
            emptyBtn.onclick = async (e) => {
                e.preventDefault();
                console.log('[products.js] Click en Optimizar Vacíos');
                closeModal();
                await runBulkOptimization(true);
            };
        }

        if (allBtn) {
            allBtn.onclick = async (e) => {
                e.preventDefault();
                console.log('[products.js] Click en Optimizar Todos');
                closeModal();
                await runBulkOptimization(false);
            };
        }
    }


    async function runBulkOptimization(onlyEmpty = false) {
        const btn = document.getElementById('bulk-optimize-btn');
        const originalBtnContent = btn ? btn.innerHTML : '';

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Procesando...';
        }

        try {
            // Get all products directly from DB to ensure fresh data
            let { data: products, error } = await window.auth.sb
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!products || products.length === 0) {
                window.showToast?.('No hay productos para optimizar.', 'info');
                return;
            }

            // Filter if onlyEmpty is requested
            if (onlyEmpty) {
                products = products.filter(p => !p.description || p.description.trim().length < 10);
                if (products.length === 0) {
                    window.showToast?.('No se encontraron productos sin descripción.', 'info');
                    return;
                }
            }

            let successCount = 0;
            const total = products.length;

            window.showToast?.(`Iniciando optimización de ${total} productos...`, 'info');

            for (let i = 0; i < total; i++) {
                const product = products[i];

                // Update UI progress via button text and re-create icons to show spinner
                if (btn) {
                    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Procesando ${i + 1}/${total}...`;
                    if (typeof lucide?.createIcons === 'function') lucide.createIcons();
                }

                // Show a more visible working indicator in breadcrumbs or toast if silent
                if (i % 3 === 0) {
                    window.showToast?.(`Trabajando: Optimizando "${product.product_name}"...`, 'info');
                }

                try {
                    const { data: aiData, error: aiError } = await window.auth.sb.functions.invoke('optimize-product', {
                        body: {
                            product_name: product.product_name,
                            current_description: product.description // Send current description as context
                        }
                    });

                    if (aiError) throw aiError;

                    if (aiData && aiData.description) {
                        // Preparar los datos de actualización
                        const updateData = {
                            description: aiData.description,
                            // Clear old fields to avoid confusion
                            benefits: null,
                            usage_instructions: null
                        };

                        // Agregar FAQs si existen en la respuesta de IA
                        if (aiData.faqs && Array.isArray(aiData.faqs) && aiData.faqs.length > 0) {
                            updateData.faq = aiData.faqs;
                        } else {
                            updateData.faq = null;
                        }

                        // Update product in DB with new description and FAQs
                        const { error: updateError } = await window.auth.sb
                            .from('products')
                            .update(updateData)
                            .eq('id', product.id);

                        if (updateError) throw updateError;
                        successCount++;
                    }

                } catch (prodError) {
                    console.error(`Error optimizing product ${product.product_name}:`, prodError);
                    // Continue to next product
                }
            }

            window.showToast?.(`Optimización completada. ${successCount} de ${total} productos actualizados.`, 'success');
            loadAndRenderProducts(); // Refresh UI

        } catch (error) {
            console.error('Error in bulk optimization:', error);
            window.showToast?.('Error al optimizar productos: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
                if (typeof lucide?.createIcons === 'function') {
                    lucide.createIcons();
                }
            }
        }
    }

    // Expose to window
    window.optimizeAllProducts = showOptimizeConfirmation;
    window.runBulkOptimization = runBulkOptimization;
    window.optimizeSingleProduct = optimizeSingleProduct;
    window.openNewProductModal = openNewProductModal;
    window.openEditProductModal = openEditProductModal;

    // Funciones para filtros y acciones masivas
    function handleLabelFilterChange(event) {
        currentLabelFilter = event.target.value || '';
        renderProductsTable();
    }

    function handleStatusFilterChange(event) {
        currentStatusFilter = event.target.value || '';
        renderProductsTable();
    }

    async function loadLabels() {
        try {
            // Obtener todas las etiquetas únicas de los productos
            const labelsSet = new Set();
            allProductsData.forEach(product => {
                if (product.labels && Array.isArray(product.labels)) {
                    product.labels.forEach(label => {
                        if (label && label.trim()) {
                            labelsSet.add(label.trim());
                        }
                    });
                }
            });

            allLabelsData = Array.from(labelsSet).sort();
            updateLabelFilterSelect();
        } catch (error) {
            console.error('Error al cargar etiquetas:', error);
        }
    }

    function updateLabelFilterSelect() {
        const select = document.getElementById('product-label-filter');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Todas las etiquetas</option>';

        allLabelsData.forEach(label => {
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }

    async function handleBulkStatusChange(shouldActivate) {
        const button = shouldActivate
            ? document.getElementById('activate-all-visible-btn')
            : document.getElementById('deactivate-all-visible-btn');

        if (!button) return;

        const userId = window.auth.getSession()?.user?.id;
        if (!userId) {
            window.showToast?.('No se pudo determinar el usuario actual.', 'error');
            return;
        }

        // Obtener filtros actuales
        const labelFilter = currentLabelFilter && currentLabelFilter.trim() !== ''
            ? [currentLabelFilter]
            : null;
        const searchTerm = currentSearchTerm && currentSearchTerm.trim() !== ''
            ? currentSearchTerm.trim()
            : null;

        // Para activar: solo productos inactivos
        // Para desactivar: solo productos activos
        // Si hay un filtro de estado manual, respetarlo, pero si no, usar la lógica automática
        let currentStatusFilterValue = null;
        if (currentStatusFilter && currentStatusFilter !== '') {
            // Si hay un filtro manual, usarlo
            currentStatusFilterValue = currentStatusFilter === 'true';
        } else {
            // Si no hay filtro manual, usar lógica automática:
            // - Para activar: solo productos inactivos (false)
            // - Para desactivar: solo productos activos (true)
            currentStatusFilterValue = shouldActivate ? false : true;
        }

        const action = shouldActivate ? 'activar' : 'desactivar';
        const confirmed = await window.appModal?.confirm(
            `¿${action.charAt(0).toUpperCase() + action.slice(1)} todos los productos visibles según los filtros actuales?`,
            'Confirmar acción masiva'
        ) || false;
        if (!confirmed) {
            return;
        }

        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = shouldActivate ? '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i><span>Activando...</span>' : '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i><span>Desactivando...</span>';
        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }

        try {
            const { data, error } = await window.auth.sb.rpc('bulk_update_products_status', {
                p_user_id: userId,
                p_is_active: shouldActivate,
                p_label_filter: labelFilter,
                p_search_term: searchTerm,
                p_current_status_filter: currentStatusFilterValue
            });

            if (error) throw error;

            const updatedCount = data?.[0]?.updated_count || 0;

            // Recargar productos
            await loadAndRenderProducts();
            await loadLabels(); // Recargar etiquetas por si cambiaron

            if (updatedCount === 0) {
                window.showToast?.(
                    `No se encontraron productos para ${action} con los filtros actuales.`,
                    'info'
                );
            } else {
                window.showToast?.(
                    `Se ${shouldActivate ? 'activaron' : 'desactivaron'} ${updatedCount} producto(s) exitosamente.`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error al actualizar estado de productos:', error);
            window.showToast?.(
                `Error al ${action} productos: ${error.message || 'Error desconocido'}`,
                'error'
            );
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
            if (typeof lucide?.createIcons === 'function') {
                lucide.createIcons();
            }
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- FUNCIONES DE PRECIOS ESCALONADOS ---

    function updateTieredPricingVisibility(isVisible) {
        const container = document.getElementById('tiered-pricing-container');
        if (isVisible) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    function addPricingTier() {
        // Sugerir valores basados en el último rango
        let newMin = 1;
        if (pricingTiers.length > 0) {
            const lastTier = pricingTiers[pricingTiers.length - 1];
            if (lastTier.max) {
                newMin = parseInt(lastTier.max) + 1;
            } else {
                // Si el último no tiene max (infinito), no tiene sentido agregar otro rango mayor lógica estándar
                // Pero permitimos editar.
                newMin = parseInt(lastTier.min) + 10;
            }
        }

        pricingTiers.push({ min: newMin, max: '', unit_price: '' });
        renderPricingTiers();
    }

    function removePricingTier(index) {
        pricingTiers.splice(index, 1);
        renderPricingTiers();
    }

    function renderPricingTiers() {
        const tbody = document.getElementById('pricing-tiers-body');
        const emptyState = document.getElementById('tiers-empty-state');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (pricingTiers.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            pricingTiers.forEach((tier, index) => {
                const tr = document.createElement('tr');
                tr.dataset.index = index;
                tr.className = "group hover:bg-slate-50";

                tr.innerHTML = `
                    <td class="p-2">
                        <input type="number" data-field="min" value="${tier.min || ''}" class="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" placeholder="Ej. 1" min="1">
                    </td>
                    <td class="p-2">
                        <input type="number" data-field="max" value="${tier.max || ''}" class="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" placeholder="Ej. 10 (vacío = ∞)" min="1">
                    </td>
                    <td class="p-2">
                         <div class="relative">
                            <span class="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                            <input type="number" data-field="price" step="0.01" value="${tier.unit_price || tier.price || ''}" class="w-full text-xs pl-5 p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" placeholder="0.00">
                        </div>
                    </td>
                    <td class="p-2 text-center">
                        <button type="button" class="delete-tier-btn text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors" data-index="${index}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            if (typeof lucide?.createIcons === 'function') {
                lucide.createIcons();
            }
        }
    }

    // --- HELPER FUNCTIONS FOR GALLERY & FAQ ---

    // addGalleryItemPreview se movió arriba para coherencia

    async function handleFaqMediaUpload(e, faqItem) {
        const file = e.target.files[0];
        if (!file) return;

        const previewContainer = faqItem.querySelector('.faq-media-preview');
        const urlInput = faqItem.querySelector('.faq-media-url');
        const uploadBtn = faqItem.querySelector('.faq-media-upload-btn');

        // Mostrar indicación de carga
        const originalBtnHtml = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>';
        if (typeof lucide?.createIcons === 'function') lucide.createIcons();

        try {
            let fileToUpload = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (err) { console.error("Error optimizando media de FAQ", err); }
            }

            const url = await window.appInstance.uploadAsset(fileToUpload, 'products');

            if (url) {
                urlInput.value = url;
                renderFaqMediaPreview(previewContainer, url);
            }
        } catch (error) {
            console.error("Error subiendo media de FAQ:", error);
            window.showToast?.("Error al subir el archivo de la FAQ", "error");
        } finally {
            uploadBtn.innerHTML = originalBtnHtml;
            uploadBtn.disabled = false;
            if (typeof lucide?.createIcons === 'function') lucide.createIcons();
        }
    }

    function renderFaqMediaPreview(container, url) {
        if (!url) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        const isVideo = url.match(/\.(mp4|webm|mov|ogg)$/i);

        container.innerHTML = `
            <div class="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                ${isVideo
                ? `<video src="${url}" class="w-full h-full object-cover"></video>`
                : `<img src="${url}" class="w-full h-full object-cover">`
            }
                <button type="button" class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md hover:bg-red-600 transition-all remove-faq-media">
                    <i data-lucide="x" class="w-2.5 h-2.5"></i>
                </button>
            </div>
        `;

        container.querySelector('.remove-faq-media').onclick = () => {
            const faqItem = container.closest('.product-faq-item');
            if (faqItem) {
                faqItem.querySelector('.faq-media-url').value = '';
                renderFaqMediaPreview(container, null);
            }
        };

        if (typeof lucide?.createIcons === 'function') lucide.createIcons();
    }

    function addFaqItem(question = '', answer = '', mediaUrl = '') {
        console.log('[addFaqItem] Llamada con:', { question, answer, mediaUrl });
        const container = document.getElementById('product-faq-container');
        const emptyState = document.getElementById('faq-empty-state');
        console.log('[addFaqItem] Container encontrado:', !!container);
        if (!container) {
            console.error('[addFaqItem] ERROR: Container no encontrado!');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        const div = document.createElement('div');
        div.className = 'product-faq-item bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group transition-all hover:border-slate-300 hover:shadow-sm';
        div.innerHTML = `
            <button type="button" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors remove-faq-item">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div class="space-y-4 pr-8">
                <div>
                    <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Pregunta</label>
                    <input type="text" class="faq-question w-full text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-2.5 px-3 placeholder-slate-300" placeholder="¿Cómo funciona?" value="${escapeHtml(question)}">
                </div>
                <div>
                    <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Respuesta</label>
                    <textarea class="faq-answer w-full text-sm text-slate-600 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-2.5 px-3 resize-none placeholder-slate-300" rows="3" placeholder="Describe la respuesta...">${escapeHtml(answer)}</textarea>
                </div>
                
                <div class="flex items-center gap-4">
                    <input type="hidden" class="faq-media-url" value="${mediaUrl}">
                    <div class="faq-media-preview ${mediaUrl ? '' : 'hidden'}"></div>
                    
                    <button type="button" class="faq-media-upload-btn flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all shadow-sm">
                        <i data-lucide="image" class="w-4 h-4"></i>
                        <span class="text-[9px] font-bold uppercase">${mediaUrl ? 'CAMBIAR MEDIA' : 'VINCULAR MEDIA'}</span>
                    </button>
                    <input type="file" class="faq-media-input hidden" accept="image/*,video/*">
                </div>
            </div>
        `;

        // Listeners
        const fileInput = div.querySelector('.faq-media-input');
        const uploadBtn = div.querySelector('.faq-media-upload-btn');
        const previewContainer = div.querySelector('.faq-media-preview');

        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => handleFaqMediaUpload(e, div);

        if (mediaUrl) {
            renderFaqMediaPreview(previewContainer, mediaUrl);
        }

        // Add event listener for remove
        div.querySelector('.remove-faq-item').onclick = () => {
            div.remove();
            if (container.children.length === 0 && emptyState) {
                emptyState.classList.remove('hidden');
            }
        };
        container.appendChild(div);
        console.log('[addFaqItem] FAQ agregada al container. Total FAQs:', container.children.length);

        if (typeof lucide?.createIcons === 'function') lucide.createIcons();
    }

    // Initialize global listeners for dynamic buttons
    document.addEventListener('click', function (e) {
        if (e.target && e.target.closest('#add-faq-btn')) {
            addFaqItem();
        }
    });

    // Make helpers global
    window.addGalleryItemPreview = addGalleryItemPreview;
    window.addFaqItem = addFaqItem;



})();
