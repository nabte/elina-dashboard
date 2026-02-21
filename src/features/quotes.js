// quotes.js - Gestión de Cotizaciones
// Permite crear, editar, listar y descargar cotizaciones en PDF

(function () {
    let isInitialized = false;
    let quotesData = [];
    let currentEditingQuote = null;
    let allProducts = [];
    let allContacts = [];

    // Verificar si las cotizaciones están habilitadas
    async function checkQuotesEnabled() {
        try {
            const userId = await getUserId();
            if (!userId) return false;

            // Intentar obtener quotes_enabled, si la columna no existe retornar false
            try {
                const { data, error } = await window.auth.sb
                    .from('profiles')
                    .select('quotes_enabled')
                    .eq('id', userId)
                    .single();

                if (error) {
                    // Si el error es que la columna no existe (42703 o PGRST204), retornar false (valor por defecto)
                    if (error.code === '42703' || error.code === 'PGRST204') {
                        console.warn('[Quotes] quotes_enabled no existe, usando valor por defecto (false)');
                        return false;
                    }
                    console.error('[Quotes] Error al verificar quotes_enabled:', error);
                    return false;
                }

                return data?.quotes_enabled || false;
            } catch (err) {
                // Si hay un error de columna no existe, retornar false
                if (err.code === '42703' || err.code === 'PGRST204' || err.message?.includes('does not exist')) {
                    console.warn('[Quotes] quotes_enabled no disponible, usando valor por defecto');
                    return false;
                }
                throw err;
            }
        } catch (error) {
            console.error('[Quotes] Error al verificar quotes_enabled:', error);
            return false;
        }
    }


    // Cargar configuración de AI Quotes
    async function loadAiQuotesConfig() {
        console.log('[Quotes] Cargando configuración de IA Quotes...');
        const enabled = await checkQuotesEnabled();
        const toggle = document.getElementById('ai-quotes-toggle');
        if (toggle) {
            toggle.checked = enabled;
            console.log('[Quotes] Estado del toggle IA actualizado:', enabled);
        } else {
            console.warn('[Quotes] No se encontró el toggle ai-quotes-toggle - Puede que el DOM no esté listo');
        }
    }

    // Guardar configuración de AI Quotes
    async function toggleAiQuotes(enabled) {
        console.log('[Quotes] Actualizando configuración de IA Quotes:', enabled);
        const userId = await getUserId();
        if (!userId) {
            console.error('[Quotes] No se pudo obtener user_id para guardar config');
            return;
        }

        try {
            // Reutilizamos la columna quotes_enabled para controlar si la IA puede cotizar
            const { error } = await window.auth.sb
                .from('profiles')
                .update({ quotes_enabled: enabled })
                .eq('id', userId);

            if (error) throw error;

            if (window.showToast) window.showToast('Preferencia guardada', 'success');
        } catch (err) {
            const errorMsg = err.message || '';
            if (errorMsg.includes('does not exist') || err.code === '42703') {
                console.warn('[Quotes] La columna quotes_enabled no existe aún. Se ignorará el error.');
                return;
            }
            console.error('[Quotes] Error al guardar configuración de IA:', err);
            if (window.showToast) window.showToast('Error al guardar preferencia', 'error');
            // Revertir cambio visual
            const toggle = document.getElementById('ai-quotes-toggle');
            if (toggle) toggle.checked = !enabled;
        }
    }

    // Inicializar cuando se active el panel
    document.addEventListener('panel:activated', async ({ detail }) => {
        if (detail.panelId === 'quotes') {
            // Ya no bloqueamos la UI si quotes_enabled es false
            // El toggle "IA Cotiza" controla esa funcionalidad ahora

            if (!isInitialized) {
                // Verificar que window.auth esté disponible
                if (!window.auth || !window.auth.sb) {
                    console.warn('[Quotes] window.auth no está disponible aún, reintentando...');
                    setTimeout(() => {
                        if (window.auth && window.auth.sb) {
                            initQuotes();
                            isInitialized = true;
                        } else {
                            console.error('[Quotes] No se pudo inicializar: window.auth no disponible');
                        }
                    }, 500);
                    return;
                }
                initQuotes();
                isInitialized = true;
            } else {
                // Recargar datos si ya está inicializado
                loadQuotes();
                // Recargar estado del toggle también
                loadAiQuotesConfig();
            }
        }
    });

    // Inicializar módulo de cotizaciones
    async function initQuotes() {
        console.log('[Quotes] Inicializando módulo de cotizaciones...');
        try {
            await Promise.all([
                loadQuotes(),
                loadProducts(),
                loadContacts(),
                loadAiQuotesConfig()
            ]);
            setupEventListeners();
            console.log('[Quotes] Módulo inicializado correctamente');
        } catch (error) {
            console.error('[Quotes] Error al inicializar:', error);
        }
    }

    // Usar función global getUserId (definida en auth.js)
    async function getUserId() {
        if (typeof window.getUserId === 'function') {
            return await window.getUserId();
        }
        console.warn('[Quotes] window.getUserId no está disponible');
        return null;
    }

    // Cargar cotizaciones desde Supabase
    async function loadQuotes() {
        try {
            const userId = await getUserId();
            if (!userId) {
                console.error('[Quotes] No se pudo obtener user_id');
                return;
            }

            console.log('[Quotes] Cargando cotizaciones para user_id:', userId);

            // RLS filtra automáticamente por auth.uid(), pero mantenemos .eq() para claridad
            // Si hay problemas con RLS, podemos quitar el .eq() y dejar que RLS lo maneje
            const { data, error } = await window.auth.sb
                .from('quotes')
                .select(`
                *,
                contacts:contact_id (
                    id,
                    full_name,
                    phone_number
                )
            `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Quotes] Error en consulta:', error);
                throw error;
            }

            quotesData = data || [];
            console.log('[Quotes] Cotizaciones cargadas:', quotesData.length);
            if (quotesData.length > 0) {
                console.log('[Quotes] Primera cotización:', {
                    id: quotesData[0].id,
                    pdf_url: quotesData[0].pdf_url ? 'Sí' : 'No',
                    status: quotesData[0].status,
                    total: quotesData[0].total
                });
            } else {
                console.log('[Quotes] No hay cotizaciones en Supabase. Las cotizaciones antiguas pueden estar solo en Bunny.net.');
            }

            renderQuotesTable();
        } catch (error) {
            console.error('[Quotes] Error al cargar cotizaciones:', error);
            if (window.showToast) {
                window.showToast('Error al cargar cotizaciones: ' + (error.message || 'Error desconocido'), 'error');
            }
        }
    }

    // Cargar productos para el selector
    async function loadProducts() {
        try {
            const userId = await getUserId();
            if (!userId) return;

            const { data, error } = await window.auth.sb
                .from('products')
                .select('id, product_name, price, description, media_url, stock')
                .eq('user_id', userId)
                .order('product_name');

            if (error) throw error;
            allProducts = data || [];
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }

    // Cargar contactos para el selector
    async function loadContacts() {
        try {
            const userId = await getUserId();
            if (!userId) return;

            const { data, error } = await window.auth.sb
                .from('contacts')
                .select('id, full_name, phone_number')
                .eq('user_id', userId)
                .order('full_name');

            if (error) throw error;
            allContacts = data || [];
        } catch (error) {
            console.error('Error al cargar contactos:', error);
        }
    }

    // Renderizar tabla de cotizaciones
    function renderQuotesTable() {
        const tableBody = document.getElementById('quotes-table-body');
        if (!tableBody) {
            console.warn('[Quotes] No se encontró el elemento quotes-table-body');
            return;
        }

        console.log('[Quotes] Renderizando tabla con', quotesData.length, 'cotizaciones');

        if (quotesData.length === 0) {
            tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-slate-500">
                    No hay cotizaciones aún. Crea tu primera cotización haciendo clic en "Nueva Cotización".
                </td>
            </tr>
        `;
            return;
        }

        // Función auxiliar para escapar HTML
        const escapeHtml = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        tableBody.innerHTML = quotesData.map(quote => {
            const contact = quote.contacts || {};
            const statusColors = {
                draft: 'bg-slate-100 text-slate-700',
                sent: 'bg-blue-100 text-blue-700',
                accepted: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-700',
                expired: 'bg-orange-100 text-orange-700'
            };
            const statusLabels = {
                draft: 'Borrador',
                sent: 'Enviada',
                accepted: 'Aceptada',
                rejected: 'Rechazada',
                expired: 'Expirada'
            };

            const quoteId = escapeHtml(quote.id || '');
            const contactName = escapeHtml(contact.full_name || 'Sin nombre');
            const createdDate = quote.created_at ? new Date(quote.created_at).toLocaleDateString('es-ES') : 'N/A';
            const total = parseFloat(quote.total || 0).toFixed(2);
            const status = quote.status || 'draft';

            return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 font-mono text-sm">${quoteId}</td>
                <td class="px-4 py-3">${contactName}</td>
                <td class="px-4 py-3">${createdDate}</td>
                <td class="px-4 py-3 font-semibold">$${total}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status] || statusColors.draft}">
                        ${statusLabels[status] || 'Borrador'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <button onclick="viewQuote('${quoteId}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Ver">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button onclick="editQuote('${quoteId}')" class="p-2 text-green-600 hover:bg-green-50 rounded" title="Editar">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="downloadQuote('${quoteId}')" class="p-2 text-purple-600 hover:bg-purple-50 rounded" title="Descargar PDF">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </button>
                        <button onclick="sendQuoteWhatsApp('${quoteId}')" class="p-2 text-green-600 hover:bg-green-50 rounded" title="Enviar por WhatsApp">
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        // Inicializar iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Configurar event listeners
    function setupEventListeners() {
        console.log('[Quotes] Configurando event listeners...');

        const newQuoteBtn = document.getElementById('new-quote-btn');
        const createQuoteBtn = document.getElementById('create-quote-btn');
        const cancelQuoteBtn = document.getElementById('cancel-quote-btn');
        const cancelQuoteBtnBottom = document.getElementById('cancel-quote-btn-bottom');
        const saveQuoteBtn = document.getElementById('save-quote-btn');
        const quoteModal = document.getElementById('quote-modal');
        const quoteSearch = document.getElementById('quote-search');
        const quoteStatusFilter = document.getElementById('quote-status-filter');
        const quoteSettingsBtn = document.getElementById('quote-settings-btn');
        const aiQuotesToggle = document.getElementById('ai-quotes-toggle');

        if (aiQuotesToggle) {
            aiQuotesToggle.addEventListener('change', async (e) => {
                await toggleAiQuotes(e.target.checked);
            });
        }

        if (newQuoteBtn) {
            newQuoteBtn.addEventListener('click', () => {
                console.log('[Quotes] Botón Nueva Cotización clickeado');
                openQuoteModal();
            });
        } else {
            console.warn('[Quotes] No se encontró el botón new-quote-btn');
        }

        if (quoteSettingsBtn) {
            quoteSettingsBtn.addEventListener('click', () => {
                console.log('[Quotes] Botón Personalizar PDF clickeado');
                openQuoteSettingsModal();
            });
        } else {
            console.warn('[Quotes] No se encontró el botón quote-settings-btn');
        }

        if (createQuoteBtn) {
            createQuoteBtn.addEventListener('click', () => createQuote());
        }

        if (cancelQuoteBtn) {
            cancelQuoteBtn.addEventListener('click', () => closeQuoteModal());
        }

        if (cancelQuoteBtnBottom) {
            cancelQuoteBtnBottom.addEventListener('click', () => closeQuoteModal());
        }

        if (saveQuoteBtn) {
            saveQuoteBtn.addEventListener('click', () => saveQuote());
        }

        if (quoteModal) {
            quoteModal.addEventListener('click', (e) => {
                if (e.target.id === 'quote-modal') {
                    closeQuoteModal();
                }
            });
        }

        if (quoteSearch) {
            quoteSearch.addEventListener('input', filterQuotes);
        }

        if (quoteStatusFilter) {
            quoteStatusFilter.addEventListener('change', filterQuotes);
        }

        // Event listeners para configuración
        const closeQuoteSettingsBtn = document.getElementById('close-quote-settings-btn');
        const cancelQuoteSettingsBtn = document.getElementById('cancel-quote-settings-btn');
        const saveQuoteSettingsBtn = document.getElementById('save-quote-settings-btn');
        const quoteSettingsModal = document.getElementById('quote-settings-modal');
        const quoteLogoUrl = document.getElementById('quote-logo-url');

        if (closeQuoteSettingsBtn) {
            closeQuoteSettingsBtn.addEventListener('click', () => closeQuoteSettingsModal());
        }

        if (cancelQuoteSettingsBtn) {
            cancelQuoteSettingsBtn.addEventListener('click', () => closeQuoteSettingsModal());
        }

        if (saveQuoteSettingsBtn) {
            saveQuoteSettingsBtn.addEventListener('click', () => saveQuoteSettings());
        }

        if (quoteSettingsModal) {
            quoteSettingsModal.addEventListener('click', (e) => {
                if (e.target.id === 'quote-settings-modal') {
                    closeQuoteSettingsModal();
                }
            });
        }

        if (quoteLogoUrl) {
            quoteLogoUrl.addEventListener('input', () => {
                const preview = document.getElementById('quote-logo-preview');
                const previewImg = document.getElementById('quote-logo-preview-img');
                if (quoteLogoUrl.value) {
                    previewImg.src = quoteLogoUrl.value;
                    preview.classList.remove('hidden');
                } else {
                    preview.classList.add('hidden');
                }
            });
        }

        // Event listeners para actualizar totales cuando cambian descuento, IVA o checkbox
        const discountInput = document.getElementById('quote-discount');
        const taxInput = document.getElementById('quote-tax');
        const pricesIncludeTaxCheckbox = document.getElementById('quote-prices-include-tax');

        if (discountInput) {
            discountInput.addEventListener('input', updateQuoteTotals);
        }

        if (taxInput) {
            taxInput.addEventListener('input', updateQuoteTotals);
        }

        if (pricesIncludeTaxCheckbox) {
            pricesIncludeTaxCheckbox.addEventListener('change', updateQuoteTotals);
        }
    }

    // Abrir modal para nueva cotización
    async function openQuoteModal(quoteId = null) {
        console.log('[Quotes] Abriendo modal de cotización, quoteId:', quoteId);

        currentEditingQuote = quoteId ? quotesData.find(q => q.id === quoteId) : null;
        const modal = document.getElementById('quote-modal');

        if (!modal) {
            console.error('[Quotes] No se encontró el elemento quote-modal en el DOM');
            if (window.showToast) {
                window.showToast('Error: No se encontró el modal de cotización', 'error');
            }
            return;
        }

        console.log('[Quotes] Modal encontrado, removiendo clase hidden');
        const modalTitle = document.getElementById('quote-modal-title');
        const quoteItemsContainer = document.getElementById('quote-items-container');
        const quoteNotes = document.getElementById('quote-notes');
        const validUntilInput = document.getElementById('quote-valid-until');

        // Configurar título
        if (modalTitle) {
            modalTitle.textContent = currentEditingQuote ? 'Editar Cotización' : 'Nueva Cotización';
        }

        // Configurar buscador de contactos
        const contactSearch = document.getElementById('quote-contact-search');
        const contactIdInput = document.getElementById('quote-contact-id');
        const contactResults = document.getElementById('quote-contact-results');

        if (contactSearch && contactIdInput && contactResults) {
            if (allContacts.length === 0) {
                console.warn('[Quotes] No hay contactos cargados, recargando...');
                await loadContacts();
            }

            // Si es edición, establecer el contacto seleccionado
            if (currentEditingQuote && currentEditingQuote.contact_id) {
                const selectedContact = allContacts.find(c => c.id === currentEditingQuote.contact_id);
                if (selectedContact) {
                    contactSearch.value = selectedContact.full_name || selectedContact.phone_number || '';
                    contactIdInput.value = selectedContact.id;
                }
            } else {
                contactSearch.value = '';
                contactIdInput.value = '';
            }

            // Configurar búsqueda en tiempo real
            setupContactSearch(contactSearch, contactIdInput, contactResults);
            console.log('[Quotes] Buscador de contactos configurado:', allContacts.length);
        } else {
            console.warn('[Quotes] No se encontraron elementos del buscador de contactos');
        }

        // Verificar que los productos estén cargados
        if (allProducts.length === 0) {
            console.warn('[Quotes] No hay productos cargados, recargando...');
            await loadProducts();
        }
        console.log('[Quotes] Productos disponibles:', allProducts.length);

        // Si es edición, cargar datos
        if (currentEditingQuote) {
            if (quoteNotes) quoteNotes.value = currentEditingQuote.notes || '';
            if (validUntilInput && currentEditingQuote.valid_until) {
                validUntilInput.value = new Date(currentEditingQuote.valid_until).toISOString().split('T')[0];
            }
            const discountInput = document.getElementById('quote-discount');
            const taxInput = document.getElementById('quote-tax');
            const pricesIncludeTaxCheckbox = document.getElementById('quote-prices-include-tax');

            // Cargar descuento como porcentaje (si viene como monto, calcular porcentaje)
            if (discountInput && currentEditingQuote.discount !== undefined) {
                const subtotal = currentEditingQuote.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
                if (subtotal > 0 && currentEditingQuote.discount_percent !== undefined) {
                    discountInput.value = currentEditingQuote.discount_percent;
                } else if (subtotal > 0) {
                    // Convertir monto a porcentaje si viene como monto
                    discountInput.value = ((currentEditingQuote.discount / subtotal) * 100).toFixed(2);
                } else {
                    discountInput.value = 0;
                }
            }

            // Cargar IVA como porcentaje (por defecto 16%)
            if (taxInput) {
                taxInput.value = currentEditingQuote.tax_percent || currentEditingQuote.tax_percent || 16;
            }

            // Cargar checkbox de precios incluyen IVA
            if (pricesIncludeTaxCheckbox) {
                pricesIncludeTaxCheckbox.checked = currentEditingQuote.prices_include_tax || false;
            }
            renderQuoteItems(currentEditingQuote.items || []);

            // Actualizar totales después de cargar datos
            updateQuoteTotals();

            // Mostrar botón de guardar en lugar de crear
            const createBtn = document.getElementById('create-quote-btn');
            const saveBtn = document.getElementById('save-quote-btn');
            if (createBtn) createBtn.classList.add('hidden');
            if (saveBtn) saveBtn.classList.remove('hidden');
        } else {
            // Nueva cotización
            if (quoteItemsContainer) quoteItemsContainer.innerHTML = '<p class="text-slate-500 text-center py-4">No hay productos agregados</p>';
            if (quoteNotes) quoteNotes.value = '';
            if (validUntilInput) validUntilInput.value = '';
            const discountInput = document.getElementById('quote-discount');
            const taxInput = document.getElementById('quote-tax');
            const pricesIncludeTaxCheckbox = document.getElementById('quote-prices-include-tax');
            if (discountInput) discountInput.value = 0;
            if (taxInput) taxInput.value = 16; // IVA por defecto 16%
            if (pricesIncludeTaxCheckbox) pricesIncludeTaxCheckbox.checked = false;

            // Mostrar botón de crear
            const createBtn = document.getElementById('create-quote-btn');
            const saveBtn = document.getElementById('save-quote-btn');
            if (createBtn) createBtn.classList.remove('hidden');
            if (saveBtn) saveBtn.classList.add('hidden');
        }

        // Mover el modal al body si no está ahí (para evitar problemas con overflow)
        if (modal.parentElement !== document.body) {
            console.log('[Quotes] Moviendo modal al body');
            document.body.appendChild(modal);
        }

        // Remover clase hidden y asegurar que el modal sea visible
        modal.classList.remove('hidden');
        // Forzar visibilidad con !important para sobrescribir Tailwind CSS
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('z-index', '9999', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        document.body.style.overflow = 'hidden';

        console.log('[Quotes] Modal abierto, clases:', modal.className);
        const computedStyle = window.getComputedStyle(modal);
        console.log('[Quotes] Estilos aplicados:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            width: computedStyle.width,
            height: computedStyle.height,
            top: computedStyle.top,
            left: computedStyle.left,
            right: computedStyle.right,
            bottom: computedStyle.bottom
        });

        // Verificar si el modal está realmente visible en el viewport
        const rect = modal.getBoundingClientRect();
        console.log('[Quotes] Posición del modal:', {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
        });

        // Verificar elementos que puedan estar encima
        const elementsAtPoint = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        console.log('[Quotes] Elementos en el centro de la pantalla:', elementsAtPoint.slice(0, 5).map(el => ({
            tag: el.tagName,
            id: el.id,
            classes: el.className,
            zIndex: window.getComputedStyle(el).zIndex
        })));

        // Verificar que los elementos necesarios existan
        if (!quoteItemsContainer) {
            console.warn('[Quotes] No se encontró quote-items-container');
        }

        // Inicializar iconos de Lucide si están disponibles
        if (window.lucide) {
            setTimeout(() => {
                window.lucide.createIcons();
            }, 100);
        }
    }

    // Configurar búsqueda de contactos
    function setupContactSearch(searchInput, idInput, resultsContainer) {
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim().toLowerCase();

            if (query.length === 0) {
                resultsContainer.classList.add('hidden');
                idInput.value = '';
                return;
            }

            searchTimeout = setTimeout(() => {
                const filtered = allContacts.filter(contact => {
                    const name = (contact.full_name || '').toLowerCase();
                    const phone = (contact.phone_number || '').toLowerCase();
                    return name.includes(query) || phone.includes(query);
                }).slice(0, 10); // Limitar a 10 resultados

                if (filtered.length > 0) {
                    resultsContainer.innerHTML = filtered.map(contact => `
                        <div class="px-4 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-200 last:border-b-0" 
                             data-contact-id="${contact.id}"
                             onclick="selectContact(${contact.id}, '${escapeHtml(contact.full_name || contact.phone_number || '')}')">
                            <div class="font-medium">${escapeHtml(contact.full_name || 'Sin nombre')}</div>
                            ${contact.phone_number ? `<div class="text-sm text-slate-500">${escapeHtml(contact.phone_number)}</div>` : ''}
                        </div>
                    `).join('');
                    resultsContainer.classList.remove('hidden');
                } else {
                    resultsContainer.innerHTML = '<div class="px-4 py-2 text-slate-500 text-center">No se encontraron contactos</div>';
                    resultsContainer.classList.remove('hidden');
                }
            }, 200); // Debounce de 200ms
        });

        // Ocultar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });
    }

    // Seleccionar contacto
    window.selectContact = function (contactId, contactName) {
        const searchInput = document.getElementById('quote-contact-search');
        const idInput = document.getElementById('quote-contact-id');
        const resultsContainer = document.getElementById('quote-contact-results');

        if (searchInput && idInput && resultsContainer) {
            searchInput.value = contactName;
            idInput.value = contactId;
            resultsContainer.classList.add('hidden');
        }
    }

    // Función auxiliar para escapar HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cerrar modal
    function closeQuoteModal() {
        const modal = document.getElementById('quote-modal');
        if (modal) {
            // Remover estilos inline que puedan estar forzando visibilidad
            modal.style.removeProperty('display');
            modal.style.removeProperty('visibility');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('z-index');
            modal.style.removeProperty('position');
            // Agregar clase hidden
            modal.classList.add('hidden');
            // Restaurar overflow del body
            document.body.style.overflow = '';
        }
        currentEditingQuote = null;
    }

    // Renderizar items de cotización
    function renderQuoteItems(items) {
        const container = document.getElementById('quote-items-container');
        if (!container) return;

        container.innerHTML = items.map((item, index) => `
        <div class="quote-item bg-slate-50 p-4 rounded-lg border border-slate-200" data-index="${index}">
            <div class="grid grid-cols-12 gap-4 items-center">
                <div class="col-span-5">
                    <div class="relative">
                        <input type="text" 
                               class="quote-product-search w-full px-3 py-2 border border-slate-300 rounded-lg" 
                               placeholder="Buscar producto..."
                               data-item-index="${index}"
                               value="${item.product_id ? (allProducts.find(p => p.id === item.product_id)?.product_name || '') : ''}"
                               autocomplete="off">
                        <input type="hidden" class="quote-product-id" data-item-index="${index}" value="${item.product_id || ''}">
                        <div class="quote-product-results hidden absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto" data-item-index="${index}">
                            <!-- Los resultados se mostrarán aquí -->
                        </div>
                    </div>
                </div>
                <div class="col-span-2">
                    <input type="number" min="1" step="1" 
                           class="quote-quantity w-full px-3 py-2 border border-slate-300 rounded-lg"
                           value="${item.quantity || 1}"
                           onchange="updateQuoteItem(${index}, 'quantity', this.value)">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" step="0.01"
                           class="quote-price w-full px-3 py-2 border border-slate-300 rounded-lg"
                           value="${item.price || 0}"
                           onchange="updateQuoteItem(${index}, 'price', this.value)">
                </div>
                <div class="col-span-2 font-semibold text-right">
                    $${((item.quantity || 1) * (item.price || 0)).toFixed(2)}
                </div>
                <div class="col-span-1">
                    <button onclick="removeQuoteItem(${index})" 
                            class="p-2 text-red-600 hover:bg-red-50 rounded">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('') || '<p class="text-slate-500 text-center py-4">No hay productos agregados</p>';

        updateQuoteTotals();
        if (window.lucide) window.lucide.createIcons();

        // Configurar buscadores de productos para cada item
        setupProductSearchs();
    }

    // Configurar búsqueda de productos para todos los items
    function setupProductSearchs() {
        const productSearchs = document.querySelectorAll('.quote-product-search');
        productSearchs.forEach(searchInput => {
            const index = parseInt(searchInput.getAttribute('data-item-index'));
            const resultsContainer = document.querySelector(`.quote-product-results[data-item-index="${index}"]`);
            const idInput = document.querySelector(`.quote-product-id[data-item-index="${index}"]`);

            if (resultsContainer && idInput) {
                setupProductSearch(searchInput, idInput, resultsContainer, index);
            }
        });
    }

    // Configurar búsqueda de productos individual
    function setupProductSearch(searchInput, idInput, resultsContainer, itemIndex) {
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim().toLowerCase();

            if (query.length === 0) {
                resultsContainer.classList.add('hidden');
                idInput.value = '';
                // Limpiar precio y cantidad cuando se borra el producto
                updateQuoteItem(itemIndex, 'product_id', '');
                updateQuoteItem(itemIndex, 'price', '0');
                return;
            }

            searchTimeout = setTimeout(() => {
                const filtered = allProducts.filter(product => {
                    const name = (product.product_name || '').toLowerCase();
                    const sku = (product.sku || '').toLowerCase();
                    const description = (product.description || '').toLowerCase();
                    return name.includes(query) || sku.includes(query) || description.includes(query);
                }).slice(0, 10); // Limitar a 10 resultados

                if (filtered.length > 0) {
                    resultsContainer.innerHTML = filtered.map(product => `
                        <div class="px-4 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-200 last:border-b-0" 
                             onclick="selectProduct(${itemIndex}, ${product.id}, '${escapeHtml(product.product_name || '')}', ${parseFloat(product.price || 0)})">
                            <div class="font-medium">${escapeHtml(product.product_name || 'Sin nombre')}</div>
                            <div class="text-sm text-slate-500">
                                ${product.sku ? `SKU: ${escapeHtml(product.sku)} • ` : ''}
                                $${parseFloat(product.price || 0).toFixed(2)}
                            </div>
                        </div>
                    `).join('');
                    resultsContainer.classList.remove('hidden');
                } else {
                    resultsContainer.innerHTML = '<div class="px-4 py-2 text-slate-500 text-center">No se encontraron productos</div>';
                    resultsContainer.classList.remove('hidden');
                }
            }, 200); // Debounce de 200ms
        });

        // Ocultar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });
    }

    // Seleccionar producto
    window.selectProduct = function (itemIndex, productId, productName, productPrice) {
        const searchInput = document.querySelector(`.quote-product-search[data-item-index="${itemIndex}"]`);
        const idInput = document.querySelector(`.quote-product-id[data-item-index="${itemIndex}"]`);
        const resultsContainer = document.querySelector(`.quote-product-results[data-item-index="${itemIndex}"]`);

        if (searchInput && idInput && resultsContainer) {
            searchInput.value = productName;
            idInput.value = productId;
            resultsContainer.classList.add('hidden');

            // Actualizar el item con el producto seleccionado
            updateQuoteItem(itemIndex, 'product_id', productId);
            updateQuoteItem(itemIndex, 'price', productPrice);
        }
    }

    // Agregar producto a la cotización
    window.addQuoteItem = function () {
        const items = getCurrentQuoteItems();
        items.push({
            product_id: null,
            product_name: '',
            quantity: 1,
            price: 0,
            subtotal: 0
        });
        renderQuoteItems(items);
        updateQuoteTotals();
    };

    // Actualizar item de cotización
    window.updateQuoteItem = function (index, field, value) {
        const items = getCurrentQuoteItems();
        if (!items[index]) return;

        if (field === 'product_id') {
            const product = allProducts.find(p => p.id === parseInt(value));
            if (product) {
                items[index].product_id = product.id;
                items[index].product_name = product.product_name;
                items[index].price = parseFloat(product.price || 0);
                items[index].description = product.description;
                items[index].image_url = product.media_url;
            }
        } else if (field === 'quantity' || field === 'price') {
            items[index][field] = parseFloat(value) || 0;
        }

        items[index].subtotal = (items[index].quantity || 1) * (items[index].price || 0);
        renderQuoteItems(items);
        updateQuoteTotals();
    };

    // Eliminar item de cotización
    window.removeQuoteItem = function (index) {
        const items = getCurrentQuoteItems();
        items.splice(index, 1);
        renderQuoteItems(items);
        updateQuoteTotals();
    };

    // Obtener items actuales de la cotización
    function getCurrentQuoteItems() {
        const container = document.getElementById('quote-items-container');
        if (!container) return [];

        const items = [];
        container.querySelectorAll('.quote-item').forEach((itemEl, index) => {
            const productIdInput = itemEl.querySelector('.quote-product-id');
            const productSearchInput = itemEl.querySelector('.quote-product-search');
            const quantityInput = itemEl.querySelector('.quote-quantity');
            const priceInput = itemEl.querySelector('.quote-price');

            if (productIdInput && productIdInput.value) {
                const product = allProducts.find(p => p.id === parseInt(productIdInput.value));
                items.push({
                    product_id: parseInt(productIdInput.value),
                    product_name: product?.product_name || productSearchInput?.value || '',
                    quantity: parseFloat(quantityInput?.value || 1),
                    price: parseFloat(priceInput?.value || 0),
                    subtotal: (parseFloat(quantityInput?.value || 1)) * (parseFloat(priceInput?.value || 0)),
                    description: product?.description,
                    image_url: product?.media_url
                });
            }
        });

        return items;
    }

    // Actualizar totales de la cotización
    function updateQuoteTotals() {
        const items = getCurrentQuoteItems();
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Obtener descuento como porcentaje
        const discountPercent = parseFloat(document.getElementById('quote-discount')?.value || 0);
        const discountAmount = subtotal * (discountPercent / 100);

        // Obtener IVA como porcentaje (por defecto 16%)
        const taxPercent = parseFloat(document.getElementById('quote-tax')?.value || 16);
        const pricesIncludeTax = document.getElementById('quote-prices-include-tax')?.checked || false;

        // Calcular subtotal después de descuento
        const subtotalAfterDiscount = subtotal - discountAmount;

        // Calcular IVA según si los precios incluyen IVA o no
        let taxAmount = 0;
        if (pricesIncludeTax) {
            // Si los precios incluyen IVA, extraer el IVA del subtotal después de descuento
            // Precio con IVA = Precio sin IVA * (1 + IVA%)
            // Precio sin IVA = Precio con IVA / (1 + IVA%)
            // IVA = Precio con IVA - Precio sin IVA
            const subtotalWithoutTax = subtotalAfterDiscount / (1 + taxPercent / 100);
            taxAmount = subtotalAfterDiscount - subtotalWithoutTax;
        } else {
            // Si los precios NO incluyen IVA, agregar el IVA al subtotal después de descuento
            taxAmount = subtotalAfterDiscount * (taxPercent / 100);
        }

        const total = subtotalAfterDiscount + (pricesIncludeTax ? 0 : taxAmount);

        const subtotalEl = document.getElementById('quote-subtotal');
        const discountEl = document.getElementById('quote-discount-display');
        const taxEl = document.getElementById('quote-tax-display');
        const totalEl = document.getElementById('quote-total');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (discountEl) discountEl.textContent = `-$${discountAmount.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${taxAmount.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    // Crear nueva cotización
    async function createQuote() {
        // Protección contra doble clic
        const createBtn = document.getElementById('create-quote-btn');
        const saveBtn = document.getElementById('save-quote-btn');
        const activeBtn = currentEditingQuote ? saveBtn : createBtn;

        if (activeBtn && activeBtn.disabled) {
            console.log('[Quotes] Creación de cotización ya en proceso, ignorando clic duplicado');
            return;
        }

        try {
            // Deshabilitar botón para prevenir doble clic
            if (activeBtn) {
                activeBtn.disabled = true;
                const originalText = activeBtn.textContent;
                activeBtn.textContent = 'Creando...';

                // Restaurar botón después de un tiempo máximo (fallback)
                setTimeout(() => {
                    if (activeBtn.disabled) {
                        activeBtn.disabled = false;
                        activeBtn.textContent = originalText;
                    }
                }, 10000);
            }

            const contactIdInput = document.getElementById('quote-contact-id');
            const items = getCurrentQuoteItems();

            if (!contactIdInput || !contactIdInput.value) {
                window.showToast('Selecciona un contacto', 'error');
                if (activeBtn) {
                    activeBtn.disabled = false;
                    activeBtn.textContent = currentEditingQuote ? 'Guardar Cambios' : 'Crear Cotización';
                }
                return;
            }

            if (items.length === 0) {
                window.showToast('Agrega al menos un producto', 'error');
                if (activeBtn) {
                    activeBtn.disabled = false;
                    activeBtn.textContent = currentEditingQuote ? 'Guardar Cambios' : 'Crear Cotización';
                }
                return;
            }

            const userId = await getUserId();
            const userEmail = await window.getUserEmail();
            if (!userId) {
                window.showToast('Error: No se pudo obtener el ID de usuario', 'error');
                if (activeBtn) {
                    activeBtn.disabled = false;
                    activeBtn.textContent = currentEditingQuote ? 'Guardar Cambios' : 'Crear Cotización';
                }
                return;
            }

            // Calcular montos desde porcentajes
            const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
            const discountPercent = parseFloat(document.getElementById('quote-discount')?.value || 0);
            const taxPercent = parseFloat(document.getElementById('quote-tax')?.value || 16);
            const pricesIncludeTax = document.getElementById('quote-prices-include-tax')?.checked || false;
            const discountAmount = subtotal * (discountPercent / 100);
            const subtotalAfterDiscount = subtotal - discountAmount;

            let taxAmount = 0;
            if (pricesIncludeTax) {
                const subtotalWithoutTax = subtotalAfterDiscount / (1 + taxPercent / 100);
                taxAmount = subtotalAfterDiscount - subtotalWithoutTax;
            } else {
                taxAmount = subtotalAfterDiscount * (taxPercent / 100);
            }

            const total = subtotalAfterDiscount + (pricesIncludeTax ? 0 : taxAmount);

            const { data, error } = await window.auth.invokeFunction('create-quote', {
                body: {
                    user_id: userId,
                    user_email: userEmail,
                    contact_id: parseInt(contactIdInput.value),
                    items: items,
                    discount: discountAmount,
                    discount_percent: discountPercent,
                    tax: taxAmount,
                    tax_percent: taxPercent,
                    prices_include_tax: pricesIncludeTax,
                    subtotal: subtotal,
                    total: total,
                    valid_until: document.getElementById('quote-valid-until')?.value || null,
                    notes: document.getElementById('quote-notes')?.value || ''
                }
            });

            if (error) throw error;

            // Restaurar botón antes de cerrar modal
            if (activeBtn) {
                activeBtn.disabled = false;
                activeBtn.textContent = currentEditingQuote ? 'Guardar Cambios' : 'Crear Cotización';
            }

            window.showToast('Cotización creada exitosamente', 'success');

            // Cerrar modal primero
            closeQuoteModal();

            // Recargar lista de cotizaciones
            await loadQuotes();

            // Mostrar la cotización creada automáticamente (abrir PDF en nueva pestaña)
            if (data && data.quote && data.quote.id) {
                setTimeout(() => {
                    viewQuote(data.quote.id);
                }, 300);
            }
        } catch (error) {
            console.error('Error al crear cotización:', error);

            // Restaurar botón en caso de error
            if (activeBtn) {
                activeBtn.disabled = false;
                activeBtn.textContent = currentEditingQuote ? 'Guardar Cambios' : 'Crear Cotización';
            }

            window.showToast('Error al crear cotización: ' + (error.message || 'Error desconocido'), 'error');
        }
    }

    // Guardar cotización editada
    async function saveQuote() {
        // Protección contra doble clic
        const saveBtn = document.getElementById('save-quote-btn');
        if (saveBtn && saveBtn.disabled) {
            console.log('[Quotes] Guardado de cotización ya en proceso, ignorando clic duplicado');
            return;
        }

        if (!currentEditingQuote || !currentEditingQuote.id) {
            console.warn('[Quotes] No hay cotización en edición, creando nueva');
            createQuote();
            return;
        }

        const userId = await getUserId();
        if (!userId) {
            window.showToast('Error: No se pudo obtener el ID de usuario', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Cambios';
            }
            return;
        }

        const items = getCurrentQuoteItems();
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const discountPercent = parseFloat(document.getElementById('quote-discount')?.value || 0);
        const taxPercent = parseFloat(document.getElementById('quote-tax')?.value || 16);
        const pricesIncludeTax = document.getElementById('quote-prices-include-tax')?.checked || false;
        const discountAmount = subtotal * (discountPercent / 100);
        const subtotalAfterDiscount = subtotal - discountAmount;

        let taxAmount = 0;
        if (pricesIncludeTax) {
            const subtotalWithoutTax = subtotalAfterDiscount / (1 + taxPercent / 100);
            taxAmount = subtotalAfterDiscount - subtotalWithoutTax;
        } else {
            taxAmount = subtotalAfterDiscount * (taxPercent / 100);
        }

        const total = subtotalAfterDiscount + (pricesIncludeTax ? 0 : taxAmount);

        // Deshabilitar botón para prevenir doble clic
        if (saveBtn) {
            saveBtn.disabled = true;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Guardando...';

            // Restaurar botón después de un tiempo máximo (fallback)
            setTimeout(() => {
                if (saveBtn.disabled) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText;
                }
            }, 10000);
        }

        try {
            // Actualizar en BD
            const { error: updateError } = await window.auth.sb
                .from('quotes')
                .update({
                    items: items,
                    subtotal: subtotal,
                    discount: discountAmount,
                    discount_percent: discountPercent,
                    tax: taxAmount,
                    tax_percent: taxPercent,
                    prices_include_tax: pricesIncludeTax,
                    total: total,
                    notes: document.getElementById('quote-notes')?.value || '',
                    valid_until: document.getElementById('quote-valid-until')?.value || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentEditingQuote.id)
                .eq('user_id', userId);

            if (updateError) throw updateError;

            // Regenerar PDF
            const { data: pdfData, error: pdfError } = await window.auth.invokeFunction('generate-quote-pdf', {
                body: {
                    quote_id: currentEditingQuote.id,
                    user_id: userId,
                    contact_id: currentEditingQuote.contact_id,
                    items: items,
                    subtotal: subtotal,
                    discount: discountAmount,
                    discount_percent: discountPercent,
                    tax: taxAmount,
                    tax_percent: taxPercent,
                    prices_include_tax: pricesIncludeTax,
                    total: total,
                    valid_until: document.getElementById('quote-valid-until')?.value || null,
                    notes: document.getElementById('quote-notes')?.value || ''
                }
            });

            // Restaurar botón antes de continuar
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Cambios';
            }

            if (pdfError) {
                console.warn('Error al regenerar PDF:', pdfError);
            } else if (pdfData?.pdf_url) {
                // Actualizar URL del PDF
                await window.auth.sb
                    .from('quotes')
                    .update({ pdf_url: pdfData.pdf_url })
                    .eq('id', currentEditingQuote.id)
                    .eq('user_id', userId);
            }

            window.showToast('Cotización actualizada exitosamente', 'success');
            closeQuoteModal();
            loadQuotes();
        } catch (error) {
            console.error('Error al guardar cotización:', error);

            // Restaurar botón en caso de error
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Cambios';
            }

            window.showToast('Error al guardar cotización: ' + (error.message || 'Error desconocido'), 'error');
        }
    }

    // Ver cotización
    window.viewQuote = function (quoteId) {
        const quote = quotesData.find(q => q.id === quoteId);
        if (!quote || !quote.pdf_url) {
            window.showToast('No hay PDF disponible para esta cotización', 'error');
            return;
        }
        window.open(quote.pdf_url, '_blank');
    };

    // Editar cotización
    window.editQuote = function (quoteId) {
        openQuoteModal(quoteId);
    };

    // Descargar PDF de cotización
    window.downloadQuote = async function (quoteId) {
        const quote = quotesData.find(q => q.id === quoteId);
        if (!quote || !quote.pdf_url) {
            window.showToast('No hay PDF disponible para esta cotización', 'error');
            return;
        }

        try {
            // Descargar el archivo directamente sin abrir
            const response = await fetch(quote.pdf_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cotizacion-${quote.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al descargar PDF:', error);
            // Fallback: abrir en nueva pestaña
            window.open(quote.pdf_url, '_blank', 'noopener,noreferrer');
        }
    };

    // Enviar cotización por WhatsApp
    window.sendQuoteWhatsApp = async function (quoteId) {
        const quote = quotesData.find(q => q.id === quoteId);
        if (!quote || !quote.pdf_url) {
            window.showToast('No hay PDF disponible para esta cotización', 'error');
            return;
        }

        const contact = quote.contacts || {};
        const contactId = contact.id || quote.contact_id;

        // Si hay contacto asignado, abrir chat directamente
        if (contactId) {
            try {
                // Verificar si existe un chat con este contacto
                const userId = await getUserId();
                if (!userId) {
                    window.showToast('Error: No se pudo obtener el usuario', 'error');
                    return;
                }

                // Buscar si existe un chat con este contacto
                const { data: existingChat, error: chatError } = await window.auth.sb
                    .from('chat_history')
                    .select('contact_id')
                    .eq('contact_id', contactId)
                    .eq('user_id', userId)
                    .limit(1)
                    .maybeSingle();

                // Navegar al panel de chats y abrir el chat del contacto
                if (window.appInstance && window.appInstance.switchPanel) {
                    window.appInstance.switchPanel('chats', { contactId: contactId });
                    window.showToast('Abriendo chat con el contacto...', 'info');
                } else {
                    // Fallback: usar el método anterior
                    const chatsLink = document.querySelector('.nav-link[data-target="chats"]');
                    if (chatsLink) {
                        chatsLink.click();
                        setTimeout(() => {
                            // Intentar cargar el chat directamente si la función está disponible
                            if (window.loadChatForContact) {
                                window.loadChatForContact(contactId);
                            } else {
                                // Buscar el contacto en la lista
                                const chatSearch = document.getElementById('chat-search-input');
                                if (chatSearch && contact.phone_number) {
                                    chatSearch.value = contact.phone_number;
                                    chatSearch.dispatchEvent(new Event('input'));
                                }
                            }
                        }, 500);
                    }
                }
            } catch (error) {
                console.error('[Quotes] Error al abrir chat:', error);
                // Si falla, descargar el PDF directamente
                window.downloadQuote(quoteId);
            }
        } else {
            // Si no hay contacto asignado, descargar PDF directamente
            window.downloadQuote(quoteId);
            window.showToast('PDF descargado. No hay contacto asignado a esta cotización.', 'info');
        }
    };

    // Filtrar cotizaciones
    function filterQuotes() {
        const searchTerm = document.getElementById('quote-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('quote-status-filter')?.value || 'all';

        const filtered = quotesData.filter(quote => {
            const matchesSearch =
                quote.id.toLowerCase().includes(searchTerm) ||
                (quote.contacts?.full_name || '').toLowerCase().includes(searchTerm);

            const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Renderizar resultados filtrados
        const originalData = quotesData;
        quotesData = filtered;
        renderQuotesTable();
        quotesData = originalData; // Restaurar para futuros filtros
    }

    // Abrir modal de configuración
    function openQuoteSettingsModal() {
        console.log('[Quotes] Abriendo modal de configuración');

        const modal = document.getElementById('quote-settings-modal');
        if (!modal) {
            console.error('[Quotes] No se encontró el elemento quote-settings-modal en el DOM');
            if (window.showToast) {
                window.showToast('Error: No se encontró el modal de configuración', 'error');
            }
            return;
        }

        console.log('[Quotes] Modal de configuración encontrado, removiendo clase hidden');

        // Asegurar que los event listeners estén configurados
        const closeBtn = document.getElementById('close-quote-settings-btn');
        const cancelBtn = document.getElementById('cancel-quote-settings-btn');
        if (closeBtn && !closeBtn.dataset.listenerAttached) {
            closeBtn.addEventListener('click', () => closeQuoteSettingsModal());
            closeBtn.dataset.listenerAttached = 'true';
        }
        if (cancelBtn && !cancelBtn.dataset.listenerAttached) {
            cancelBtn.addEventListener('click', () => closeQuoteSettingsModal());
            cancelBtn.dataset.listenerAttached = 'true';
        }

        // Cargar configuración primero
        loadQuoteSettings();

        // Mover el modal al body si no está ahí (para evitar problemas con overflow)
        if (modal.parentElement !== document.body) {
            console.log('[Quotes] Moviendo modal de configuración al body');
            document.body.appendChild(modal);
        }

        // Remover clase hidden y asegurar que el modal sea visible
        modal.classList.remove('hidden');
        // Forzar visibilidad con !important para sobrescribir Tailwind CSS
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('z-index', '9999', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        document.body.style.overflow = 'hidden';

        console.log('[Quotes] Modal de configuración abierto, clases:', modal.className);
        const computedStyle = window.getComputedStyle(modal);
        console.log('[Quotes] Estilos aplicados:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            width: computedStyle.width,
            height: computedStyle.height
        });

        // Verificar si el modal está realmente visible en el viewport
        const rect = modal.getBoundingClientRect();
        console.log('[Quotes] Posición del modal de configuración:', {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
        });

        // Inicializar iconos de Lucide si están disponibles
        if (window.lucide) {
            setTimeout(() => {
                window.lucide.createIcons();
            }, 100);
        }
    }

    // Cerrar modal de configuración
    function closeQuoteSettingsModal() {
        const modal = document.getElementById('quote-settings-modal');
        if (modal) {
            // Remover estilos inline que se aplicaron al abrir
            modal.style.removeProperty('display');
            modal.style.removeProperty('visibility');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('z-index');
            modal.style.removeProperty('position');
            // Agregar clase hidden
            modal.classList.add('hidden');
            // Restaurar overflow del body
            document.body.style.overflow = '';
            console.log('[Quotes] Modal de configuración cerrado');
        }
    }

    // Cargar configuración de cotizaciones
    async function loadQuoteSettings() {
        try {
            const userId = await getUserId();
            if (!userId) return;

            // Usar función global setValue (definida en auth.js)
            const setValue = window.setValue || ((id, value, isCheckbox = false) => {
                const element = document.getElementById(id);
                if (!element) {
                    console.warn(`[Quotes] Elemento no encontrado: ${id}`);
                    return;
                }
                if (isCheckbox) {
                    element.checked = value;
                } else {
                    element.value = value || '';
                }
            });

            // 1. Cargar datos de profiles (settings generales)
            const { data: profileData, error: profileError } = await window.auth.sb
                .from('profiles')
                .select('organization_id, work_start_hour, work_end_hour, business_address, business_phone, contact_phone, website, branding_settings')
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('[Quotes] Error al cargar perfil:', profileError);
            }

            // 2. Cargar datos de organizations (nombre de empresa, dirección, teléfono, email)
            let organizationData = null;
            if (profileData && profileData.organization_id) {
                const { data: org, error: orgError } = await window.auth.sb
                    .from('organizations')
                    .select('name, address, phone, company_email, website')
                    .eq('id', profileData.organization_id)
                    .single();

                if (!orgError && org) {
                    organizationData = org;
                    console.log('[Quotes] Datos de organización cargados:', org);
                }
            }

            // 3. Cargar datos específicos de cotizaciones (si existen)
            const { data: quoteSettings, error: quoteError } = await window.auth.sb
                .from('quote_settings')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (quoteError && quoteError.code !== 'PGRST116') {
                console.error('[Quotes] Error al cargar configuración de cotizaciones:', quoteError);
            }

            // 4. Generar horarios de atención desde work_start_hour y work_end_hour
            let businessHours = '';
            if (profileData?.work_start_hour !== null && profileData?.work_end_hour !== null) {
                const startHour = String(profileData.work_start_hour).padStart(2, '0');
                const endHour = String(profileData.work_end_hour).padStart(2, '0');
                businessHours = `${startHour}:00 - ${endHour}:00`;
            }

            // 5. Obtener colores de branding_settings
            const brandingSettings = profileData?.branding_settings || {};
            const primaryColor = brandingSettings.colors?.[0] || '#000000';
            const secondaryColor = brandingSettings.colors?.[1] || '#666666';

            // 6. Combinar datos: primero de settings (profiles + organizations), luego de quote_settings (sobrescribe)
            const finalData = {
                // Nombre de empresa (de organizations)
                company_name: organizationData?.name || quoteSettings?.company_name || '',
                // Dirección (de organizations o profiles.business_address)
                company_address: organizationData?.address || profileData?.business_address || quoteSettings?.company_address || '',
                // Teléfono (de organizations o profiles.business_phone o profiles.contact_phone)
                company_phone: organizationData?.phone || profileData?.business_phone || profileData?.contact_phone || quoteSettings?.company_phone || '',
                // Email (de organizations)
                company_email: organizationData?.company_email || quoteSettings?.company_email || '',
                // Website (de profiles.website o organizations.website)
                company_website: profileData?.website || organizationData?.website || quoteSettings?.company_website || '',
                // Logo (de profiles.branding_settings.logo_url)
                company_logo_url: brandingSettings.logo_url || quoteSettings?.company_logo_url || '',
                // Horarios de atención (generados desde profiles.work_start_hour y work_end_hour)
                business_hours: businessHours || quoteSettings?.business_hours || '',
                // Datos específicos de cotizaciones (solo de quote_settings)
                company_type: quoteSettings?.company_type || 'business',
                tax_id: quoteSettings?.tax_id || '',
                footer_text: quoteSettings?.footer_text || '',
                show_logo: quoteSettings?.show_logo !== false,
                show_address: quoteSettings?.show_address !== false,
                show_phone: quoteSettings?.show_phone !== false,
                show_email: quoteSettings?.show_email !== false,
                show_website: quoteSettings?.show_website === true,
                show_tax_id: quoteSettings?.show_tax_id === true,
                show_business_hours: quoteSettings?.show_business_hours !== false,
                // Colores (de profiles.branding_settings.colors)
                primary_color: primaryColor || quoteSettings?.primary_color || '#000000',
                secondary_color: secondaryColor || quoteSettings?.secondary_color || '#666666'
            };

            console.log('[Quotes] Datos de configuración cargados:', { profileData, organizationData, quoteSettings, finalData });

            // 4. Aplicar valores al formulario
            setValue('quote-company-name', finalData.company_name);
            setValue('quote-company-type', finalData.company_type);
            setValue('quote-company-address', finalData.company_address);
            setValue('quote-company-phone', finalData.company_phone);
            setValue('quote-company-email', finalData.company_email);
            setValue('quote-company-website', finalData.company_website);
            setValue('quote-tax-id', finalData.tax_id);
            setValue('quote-business-hours', finalData.business_hours);
            setValue('quote-logo-url', finalData.company_logo_url);
            setValue('quote-footer-text', finalData.footer_text);
            setValue('quote-show-logo', finalData.show_logo, true);
            setValue('quote-show-address', finalData.show_address, true);
            setValue('quote-show-phone', finalData.show_phone, true);
            setValue('quote-show-email', finalData.show_email, true);
            setValue('quote-show-website', finalData.show_website, true);
            setValue('quote-show-tax-id', finalData.show_tax_id, true);
            setValue('quote-show-hours', finalData.show_business_hours, true);
            setValue('quote-primary-color', finalData.primary_color);
            setValue('quote-secondary-color', finalData.secondary_color);

            // Actualizar preview del logo
            if (finalData.company_logo_url) {
                const preview = document.getElementById('quote-logo-preview');
                const previewImg = document.getElementById('quote-logo-preview-img');
                if (preview && previewImg) {
                    previewImg.src = finalData.company_logo_url;
                    preview.classList.remove('hidden');
                }
            }
            console.log('[Quotes] Configuración aplicada correctamente');
        } catch (error) {
            console.error('[Quotes] Error al cargar configuración:', error);
        }
    }

    // Guardar configuración de cotizaciones
    async function saveQuoteSettings() {
        try {
            const userId = await getUserId();
            if (!userId) {
                window.showToast('Error: No se pudo obtener el ID de usuario', 'error');
                return;
            }

            const companyName = document.getElementById('quote-company-name').value;
            if (!companyName) {
                window.showToast('El nombre de la empresa es requerido', 'error');
                return;
            }

            // 1. Obtener organization_id del usuario
            const { data: profile, error: profileError } = await window.auth.sb
                .from('profiles')
                .select('organization_id')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('[Quotes] Error al obtener perfil:', profileError);
            }

            // 2. Actualizar datos generales en organizations (si existe organization_id)
            if (profile && profile.organization_id) {
                const orgUpdate = {
                    name: companyName,
                    address: document.getElementById('quote-company-address').value || null,
                    phone: document.getElementById('quote-company-phone').value || null,
                    company_email: document.getElementById('quote-company-email').value || null,
                    website: document.getElementById('quote-company-website').value || null,
                    logo_url: document.getElementById('quote-logo-url').value || null
                };

                const { error: orgError } = await window.auth.sb
                    .from('organizations')
                    .update(orgUpdate)
                    .eq('id', profile.organization_id);

                if (orgError) {
                    console.warn('[Quotes] Error al actualizar organización:', orgError);
                } else {
                    console.log('[Quotes] Datos de organización actualizados');
                }
            }

            // 3. Guardar solo campos específicos de cotizaciones en quote_settings
            const quoteSettings = {
                user_id: userId,
                // No guardamos datos generales aquí, solo específicos de cotizaciones
                company_type: document.getElementById('quote-company-type').value,
                tax_id: document.getElementById('quote-tax-id').value,
                business_hours: document.getElementById('quote-business-hours').value,
                footer_text: document.getElementById('quote-footer-text').value,
                show_logo: document.getElementById('quote-show-logo').checked,
                show_address: document.getElementById('quote-show-address').checked,
                show_phone: document.getElementById('quote-show-phone').checked,
                show_email: document.getElementById('quote-show-email').checked,
                show_website: document.getElementById('quote-show-website').checked,
                show_tax_id: document.getElementById('quote-show-tax-id').checked,
                show_business_hours: document.getElementById('quote-show-hours').checked,
                primary_color: document.getElementById('quote-primary-color').value,
                secondary_color: document.getElementById('quote-secondary-color').value
            };

            const { error } = await window.auth.sb
                .from('quote_settings')
                .upsert(quoteSettings, { onConflict: 'user_id' });

            if (error) throw error;

            window.showToast('Configuración guardada exitosamente', 'success');
            closeQuoteSettingsModal();
        } catch (error) {
            console.error('[Quotes] Error al guardar configuración:', error);
            window.showToast('Error al guardar configuración: ' + (error.message || 'Error desconocido'), 'error');
        }
    }

    // Event listeners para actualizar totales cuando cambian descuento, IVA o checkbox
    document.addEventListener('DOMContentLoaded', () => {
        const discountInput = document.getElementById('quote-discount');
        const taxInput = document.getElementById('quote-tax');
        const pricesIncludeTaxCheckbox = document.getElementById('quote-prices-include-tax');

        if (discountInput) {
            discountInput.addEventListener('input', updateQuoteTotals);
        }

        if (taxInput) {
            taxInput.addEventListener('input', updateQuoteTotals);
        }

        if (pricesIncludeTaxCheckbox) {
            pricesIncludeTaxCheckbox.addEventListener('change', updateQuoteTotals);
        }
    });
})();

