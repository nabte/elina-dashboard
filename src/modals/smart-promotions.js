(function () {
    let isInitialized = false;
    let currentEditingId = null;
    let cachedPromos = [];

    const selectors = {
        panel: 'smart-promotions',
        grid: 'smart-promos-grid',
        empty: 'smart-promos-empty',
        activeCount: 'smart-promos-active-count',
        scheduledCount: 'smart-promos-scheduled-count',
        todayCount: 'smart-promos-today-count',
        modal: 'smart-promo-modal',
        modalTitle: 'smart-promo-modal-title',
        form: 'smart-promo-form',
        title: 'smart-promo-title',
        description: 'smart-promo-description',
        benefits: 'smart-promo-benefits',
        cta: 'smart-promo-cta',
        images: 'smart-promo-images',
        autoInsert: 'smart-promo-auto',
        startAt: 'smart-promo-start',
        endAt: 'smart-promo-end',
        noSchedule: 'smart-promo-no-schedule',
        active: 'smart-promo-active',
        maxMentions: 'smart-promo-max-mentions',
        aiBtn: 'smart-promo-ai-btn',
        refreshBtn: 'smart-promos-refresh',
        newBtn: 'smart-promos-header-create-btn',
        emptyBtn: 'smart-promos-empty-create-btn',
    };

    document.addEventListener('panel:activated', async ({ detail }) => {
        if (detail.panelId === selectors.panel) {
            if (!isInitialized) {
                initSmartPromosPanel();
                isInitialized = true;
            }
            await loadSmartPromotions();
        }
    });

    function initSmartPromosPanel() {
        document.getElementById(selectors.refreshBtn)?.addEventListener('click', () => loadSmartPromotions());
        document.getElementById(selectors.newBtn)?.addEventListener('click', () => openPromoModal());
        document.getElementById(selectors.emptyBtn)?.addEventListener('click', () => openPromoModal());

        document.querySelectorAll('#smart-promo-modal [data-modal-close]')?.forEach(btn => {
            btn.addEventListener('click', () => closePromoModal());
        });

        document.getElementById(selectors.noSchedule)?.addEventListener('change', handleNoScheduleToggle);
        document.getElementById(selectors.aiBtn)?.addEventListener('click', handleAiEnhance);

        const form = document.getElementById(selectors.form);
        if (form) {
            form.addEventListener('submit', handlePromoSubmit);
        }

        const modal = document.getElementById(selectors.modal);
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target.dataset.modalClose !== undefined) {
                    closePromoModal();
                }
            });
        }

        document.getElementById(selectors.grid)?.addEventListener('click', handleCardActions);
    }

    async function loadSmartPromotions() {
        try {
            const { data, error } = await window.auth.sb
                .from('smart_promotions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Si el error es que la tabla no existe, mostrar mensaje más claro
                if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                    console.error('[smart-promotions] La tabla smart_promotions no existe. Ejecuta la migración SQL primero.');
                    window.showToast?.('La tabla de promociones no está configurada. Contacta al administrador.', 'error');
                    return;
                }
                throw error;
            }
            cachedPromos = data || [];
            renderPromotions();
        } catch (err) {
            console.error('[smart-promotions] Error al cargar promos:', err);
            const errorMsg = err.message || 'Error desconocido';
            window.showToast?.(`No se pudieron cargar las promos: ${errorMsg}`, 'error');
        }
    }

    function renderPromotions() {
        const grid = document.getElementById(selectors.grid);
        const emptyState = document.getElementById(selectors.empty);
        if (!grid || !emptyState) return;

        if (!cachedPromos.length) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            grid.innerHTML = cachedPromos.map(renderPromoCard).join('');
        }

        updateStats(); // Ahora es async, pero no esperamos para no bloquear el render
        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: grid || document });
        }
    }

    async function updateStats() {
        try {
            const session = window.auth.getSession();
            if (!session?.user?.id) {
                // Fallback a cálculo local si no hay sesión
                const now = new Date();
                const activeCount = cachedPromos.filter(isPromoActiveNow).length;
                const scheduledCount = cachedPromos.filter(promo => isPromoScheduled(promo, now)).length;
                const todayCount = cachedPromos.filter(promo => promo.last_triggered_at && isSameDay(promo.last_triggered_at, now)).length;

                document.getElementById(selectors.activeCount).textContent = activeCount;
                document.getElementById(selectors.scheduledCount).textContent = scheduledCount;
                document.getElementById(selectors.todayCount).textContent = todayCount;
                return;
            }

            // Usar la función SQL para obtener estadísticas precisas
            const { data, error } = await window.auth.sb
                .rpc('get_smart_promotions_stats', { p_user_id: session.user.id });

            if (error) {
                console.warn('[smart-promotions] Error al obtener estadísticas, usando cálculo local:', error);
                // Fallback a cálculo local si falla la función SQL
                const now = new Date();
                const activeCount = cachedPromos.filter(isPromoActiveNow).length;
                const scheduledCount = cachedPromos.filter(promo => isPromoScheduled(promo, now)).length;
                const todayCount = cachedPromos.filter(promo => promo.last_triggered_at && isSameDay(promo.last_triggered_at, now)).length;

                document.getElementById(selectors.activeCount).textContent = activeCount;
                document.getElementById(selectors.scheduledCount).textContent = scheduledCount;
                document.getElementById(selectors.todayCount).textContent = todayCount;
                return;
            }

            // Actualizar con datos de la base de datos
            if (data) {
                document.getElementById(selectors.activeCount).textContent = data.active_count || 0;
                document.getElementById(selectors.scheduledCount).textContent = data.scheduled_count || 0;
                document.getElementById(selectors.todayCount).textContent = data.today_count || 0;
            }
        } catch (err) {
            console.error('[smart-promotions] Error al actualizar estadísticas:', err);
            // Fallback a cálculo local en caso de error
            const now = new Date();
            const activeCount = cachedPromos.filter(isPromoActiveNow).length;
            const scheduledCount = cachedPromos.filter(promo => isPromoScheduled(promo, now)).length;
            const todayCount = cachedPromos.filter(promo => promo.last_triggered_at && isSameDay(promo.last_triggered_at, now)).length;

            document.getElementById(selectors.activeCount).textContent = activeCount;
            document.getElementById(selectors.scheduledCount).textContent = scheduledCount;
            document.getElementById(selectors.todayCount).textContent = todayCount;
        }
    }

    function renderPromoCard(promo) {
        const isActiveNow = isPromoActiveNow(promo);
        const scheduled = isPromoScheduled(promo);
        const statusLabel = isActiveNow ? 'Activa' : (scheduled ? 'Programada' : 'Inactiva');
        const statusColor = isActiveNow ? 'bg-green-100 text-green-700' : scheduled ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700';
        const labels = (promo.image_urls || []).slice(0, 3).map(url => `<span class="text-xs bg-slate-100 px-2 py-0.5 rounded-full truncate" title="${url}">Imagen</span>`).join('');

        return `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4" data-id="${promo.id}">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">${statusLabel}</span>
                        <h3 class="text-xl font-semibold mt-2 text-slate-900">${promo.title}</h3>
                        <p class="text-sm text-slate-600 mt-1">${promo.description || 'Sin descripción'}</p>
                    </div>
                    <div class="text-right text-xs text-slate-500 leading-5">
                        ${formatDateRange(promo)}
                        <div>Auto: ${promo.auto_insert ? 'Sí' : 'No'}</div>
                        <div>Menciones hoy máx.: ${promo.max_mentions_per_day || 3}</div>
                    </div>
                </div>
                ${promo.benefits ? `<div class="text-sm text-slate-500 border-l-4 border-slate-200 pl-3">${promo.benefits}</div>` : ''}
                ${labels ? `<div class="flex flex-wrap gap-2">${labels}</div>` : ''}
                <div class="flex flex-wrap gap-2 mt-2">
                    <button class="promo-action inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100" data-action="edit" data-id="${promo.id}">
                        <i data-lucide="edit-3" class="w-4 h-4"></i> Editar
                    </button>
                    <button class="promo-action inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100" data-action="clone" data-id="${promo.id}">
                        <i data-lucide="copy" class="w-4 h-4"></i> Duplicar
                    </button>
                    <button class="promo-action inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100" data-action="toggle" data-id="${promo.id}">
                        <i data-lucide="${promo.is_active ? 'pause' : 'play'}" class="w-4 h-4"></i> ${promo.is_active ? 'Pausar' : 'Activar'}
                    </button>
                    <button class="promo-action inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50" data-action="delete" data-id="${promo.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    function isPromoActiveNow(promo) {
        if (!promo.is_active) return false;
        if (promo.no_schedule) return true;
        const now = new Date();
        const startOk = !promo.start_at || new Date(promo.start_at) <= now;
        const endOk = !promo.end_at || new Date(promo.end_at) >= now;
        return startOk && endOk;
    }

    function isPromoScheduled(promo, referenceDate = new Date()) {
        if (promo.no_schedule || !promo.start_at) return false;
        return new Date(promo.start_at) > referenceDate;
    }

    function isSameDay(dateA, dateB) {
        const dA = new Date(dateA);
        return dA.getUTCFullYear() === dateB.getUTCFullYear()
            && dA.getUTCMonth() === dateB.getUTCMonth()
            && dA.getUTCDate() === dateB.getUTCDate();
    }

    function formatDateRange(promo) {
        if (promo.no_schedule) return '<span class="text-xs font-semibold text-blue-500">Sin horario definido</span>';
        if (!promo.start_at && !promo.end_at) return '<span class="text-xs text-slate-500">Sin fechas</span>';
        const options = { dateStyle: 'medium', timeStyle: 'short' };
        const start = promo.start_at ? new Date(promo.start_at).toLocaleString('es-MX', options) : 'Inmediato';
        const end = promo.end_at ? new Date(promo.end_at).toLocaleString('es-MX', options) : 'Sin fin';
        return `<div>${start} → ${end}</div>`;
    }

    // --- Product Linking Logic ---
    let cachedProducts = [];

    async function loadProducts() {
        if (cachedProducts.length > 0) return;
        try {
            const { data, error } = await window.auth.sb
                .from('products')
                .select('id, product_name, price, media_url, sku')
                .order('product_name');

            if (error) throw error;
            cachedProducts = data || [];
            renderProductSelectionList();

            // Setup search listener
            const searchInput = document.getElementById('smart-promo-product-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    filterProducts(searchTerm);
                });
            }
        } catch (err) {
            console.error('[smart-promotions] Error loading products:', err);
            window.showToast?.('No se pudieron cargar los productos.', 'error');
        }
    }

    function filterProducts(searchTerm) {
        const items = document.querySelectorAll('.product-item-row');
        let hasVisible = false;

        items.forEach(item => {
            const name = (item.dataset.name || '').toLowerCase();
            const sku = (item.dataset.sku || '').toLowerCase();
            const match = !searchTerm || name.includes(searchTerm) || sku.includes(searchTerm);

            if (match) {
                item.classList.remove('hidden');
                hasVisible = true;
            } else {
                item.classList.add('hidden');
            }
        });

        // Toggle empty search message if needed
        const noResultsMsg = document.getElementById('search-no-results');
        if (!hasVisible && searchTerm) {
            if (!noResultsMsg) {
                const msg = document.createElement('div');
                msg.id = 'search-no-results';
                msg.className = 'text-center py-4 text-slate-400 text-sm';
                msg.textContent = 'No se encontraron productos.';
                document.getElementById('product-list-container').appendChild(msg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    function renderProductSelectionList() {
        const container = document.getElementById('product-list-container');
        if (!container) return;

        if (cachedProducts.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-slate-400 text-sm">No hay productos disponibles.</div>';
            return;
        }

        container.innerHTML = cachedProducts.map(product => `
            <label class="product-item-row flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors group" 
                   data-name="${(product.product_name || '').replace(/"/g, '&quot;')}" 
                   data-sku="${(product.sku || '').replace(/"/g, '&quot;')}">
                <input type="checkbox" value="${product.id}" class="product-checkbox w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
                <div class="flex items-center gap-3 flex-1 overflow-hidden">
                    <div class="w-8 h-8 rounded-md bg-slate-200 flex-shrink-0 bg-cover bg-center border border-slate-200"
                         style="background-image: url('${product.media_url || 'https://via.placeholder.com/32'}')"></div>
                    <div class="truncate">
                        <div class="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">${product.product_name}</div>
                        <div class="text-xs text-slate-500">
                            ${product.sku ? `<span class="bg-slate-100 px-1 rounded text-[10px] font-bold mr-1">${product.sku}</span>` : ''}
                            $${product.price}
                        </div>
                    </div>
                </div>
            </label>
        `).join('');

        // Add listeners to update summary
        container.querySelectorAll('.product-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedProductsSummary);
        });
    }

    function updateSelectedProductsSummary() {
        const container = document.getElementById('selected-products-summary');
        const checkboxes = document.querySelectorAll('.product-checkbox:checked');

        if (!container) return;

        if (checkboxes.length === 0) {
            container.innerHTML = '<span class="text-xs text-slate-400 italic">Ningún producto seleccionado</span>';
            return;
        }

        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        const selectedProducts = cachedProducts.filter(p => selectedIds.includes(p.id));

        container.innerHTML = selectedProducts.map(p => `
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                ${p.product_name}
                <button type="button" class="ml-1 hover:text-blue-900" onclick="document.querySelector('.product-checkbox[value=\\'${p.id}\\']').click()">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </span>
        `).join('');

        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: container });
        }
    }
    // --- End Product Linking Logic ---

    async function openPromoModal(promo = null, isClone = false) {
        currentEditingId = promo && !isClone ? promo.id : null;

        // Reset search
        const searchInput = document.getElementById('smart-promo-product-search');
        if (searchInput) {
            searchInput.value = '';
            filterProducts(''); // Reset visibility
        }
        document.getElementById(selectors.modalTitle).textContent = promo && !isClone ? 'Editar Promo' : 'Nueva Promo';
        document.getElementById(selectors.title).value = promo ? `${promo.title}${isClone ? ' (copia)' : ''}` : '';
        document.getElementById(selectors.description).value = promo?.description || '';
        document.getElementById(selectors.benefits).value = promo?.benefits || '';
        document.getElementById(selectors.cta).value = promo?.call_to_action || '';
        document.getElementById(selectors.images).value = (promo?.image_urls || []).join(', ');
        document.getElementById(selectors.autoInsert).checked = promo?.auto_insert ?? true;
        document.getElementById(selectors.noSchedule).checked = promo?.no_schedule ?? false;
        document.getElementById(selectors.active).checked = promo?.is_active ?? true;
        document.getElementById(selectors.maxMentions).value = promo?.max_mentions_per_day ?? 3;
        document.getElementById(selectors.startAt).value = promo?.start_at ? toDatetimeLocal(promo.start_at) : '';
        document.getElementById(selectors.endAt).value = promo?.end_at ? toDatetimeLocal(promo.end_at) : '';
        handleNoScheduleToggle();

        // Renderizar imágenes existentes
        renderImageUrls((promo?.image_urls || []));

        // Load products and set selection
        await loadProducts();

        // Reset checkboxes first
        document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);

        // Set selected products
        const productIdsToSelect = promo?.product_ids || [];
        productIdsToSelect.forEach(id => {
            const cb = document.querySelector(`.product-checkbox[value="${id}"]`);
            if (cb) cb.checked = true;
        });
        updateSelectedProductsSummary();

        const modal = document.getElementById(selectors.modal);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function closePromoModal() {
        const modal = document.getElementById(selectors.modal);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        document.getElementById(selectors.form)?.reset();
        // Limpiar contenedor de imágenes
        const container = document.getElementById('smart-promo-images-container');
        if (container) {
            container.innerHTML = '';
        }
        // Limpiar selección de productos
        // Limpiar selección de productos e interfaz de búsqueda
        document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
        updateSelectedProductsSummary();

        const searchInput = document.getElementById('smart-promo-product-search');
        if (searchInput) {
            searchInput.value = '';
            filterProducts('');
        }

        currentEditingId = null;
    }

    function handleNoScheduleToggle() {
        const disabled = document.getElementById(selectors.noSchedule)?.checked;
        ['startAt', 'endAt'].forEach(key => {
            const input = document.getElementById(selectors[key]);
            if (input) {
                input.disabled = disabled;
                if (disabled) input.value = '';
            }
        });
    }

    async function handlePromoSubmit(event) {
        event.preventDefault();
        const payload = buildPayloadFromForm();

        // Validation: At least one product must be selected
        if (!payload.product_ids || payload.product_ids.length === 0) {
            window.showToast?.('Debes vincular al menos un producto a esta promoción.', 'warning');
            return;
        }

        try {
            // Agregar user_id si es una nueva promo
            if (!currentEditingId) {
                const session = window.auth.getSession();
                if (!session?.user?.id) {
                    throw new Error('No se pudo obtener el usuario actual');
                }
                payload.user_id = session.user.id;
            }

            if (currentEditingId) {
                const { error } = await window.auth.sb
                    .from('smart_promotions')
                    .update(payload)
                    .eq('id', currentEditingId);
                if (error) {
                    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                        throw new Error('La tabla smart_promotions no existe. Ejecuta la migración SQL primero.');
                    }
                    throw error;
                }
                window.showToast?.('Promo actualizada', 'success');
            } else {
                const { error } = await window.auth.sb
                    .from('smart_promotions')
                    .insert(payload);
                if (error) {
                    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                        throw new Error('La tabla smart_promotions no existe. Ejecuta la migración SQL primero.');
                    }
                    throw error;
                }
                window.showToast?.('Promo creada', 'success');
            }
            closePromoModal();
            await loadSmartPromotions();
        } catch (err) {
            console.error('[smart-promotions] Error guardando promo:', err);
            const errorMsg = err.message || 'Error desconocido';
            window.showToast?.(`No se pudo guardar la promo: ${errorMsg}`, 'error');
        }
    }

    function buildPayloadFromForm() {
        // Obtener URLs de imágenes desde el contenedor de imágenes
        const imageContainer = document.getElementById('smart-promo-images-container');
        let imageUrls = [];

        if (imageContainer) {
            // Obtener URLs de las imágenes renderizadas
            const imageElements = imageContainer.querySelectorAll('[data-image-url]');
            imageUrls = Array.from(imageElements).map(el => el.dataset.imageUrl).filter(Boolean);
        }

        // Si no hay imágenes en el contenedor, usar el campo de texto como fallback
        const textFieldUrls = document.getElementById(selectors.images).value.trim();
        if (textFieldUrls && imageUrls.length === 0) {
            imageUrls = textFieldUrls.split(',').map(url => url.trim()).filter(Boolean);
        } else if (textFieldUrls && imageUrls.length > 0) {
            // Combinar ambas fuentes, evitando duplicados
            const textUrls = textFieldUrls.split(',').map(url => url.trim()).filter(Boolean);
            imageUrls = [...new Set([...imageUrls, ...textUrls])];
        }

        // Get selected product IDs and ensure they are parsed as numbers (bigint/integer in DB)
        // Checkboxes values are strings, need to convert to numbers for bigint[] array
        const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
            .map(cb => {
                const val = parseInt(cb.value, 10);
                return isNaN(val) ? null : val;
            })
            .filter(val => val !== null);

        console.log('[smart-promotions] Payload product_ids:', selectedProducts);

        return {
            title: document.getElementById(selectors.title).value.trim(),
            description: document.getElementById(selectors.description).value.trim(),
            benefits: document.getElementById(selectors.benefits).value.trim() || null,
            call_to_action: document.getElementById(selectors.cta).value.trim() || null,
            image_urls: imageUrls,
            product_ids: selectedProducts, // Sending array of numbers
            auto_insert: document.getElementById(selectors.autoInsert).checked,
            no_schedule: document.getElementById(selectors.noSchedule).checked,
            is_active: document.getElementById(selectors.active).checked,
            start_at: document.getElementById(selectors.noSchedule).checked ? null : normalizeDateInput(document.getElementById(selectors.startAt).value),
            end_at: document.getElementById(selectors.noSchedule).checked ? null : normalizeDateInput(document.getElementById(selectors.endAt).value),
            max_mentions_per_day: parseInt(document.getElementById(selectors.maxMentions).value || '3', 10),
        };
    }

    function normalizeDateInput(value) {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
    }

    function toDatetimeLocal(value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        const pad = num => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function handleCardActions(event) {
        const actionBtn = event.target.closest('.promo-action');
        if (!actionBtn) return;
        const { action, id } = actionBtn.dataset;
        if (!action || !id) return;

        const promo = cachedPromos.find(p => p.id === id);
        if (!promo) return;

        switch (action) {
            case 'edit':
                openPromoModal(promo);
                break;
            case 'clone':
                openPromoModal(promo, true);
                break;
            case 'toggle':
                togglePromoStatus(promo);
                break;
            case 'delete':
                deletePromo(promo);
                break;
        }
    }

    async function togglePromoStatus(promo) {
        try {
            const { error } = await window.auth.sb
                .from('smart_promotions')
                .update({ is_active: !promo.is_active })
                .eq('id', promo.id);
            if (error) throw error;
            window.showToast?.(!promo.is_active ? 'Promo activada' : 'Promo pausada', 'success');
            await loadSmartPromotions();
        } catch (err) {
            console.error('[smart-promotions] Error al cambiar estado:', err);
            window.showToast?.('No se pudo actualizar el estado.', 'error');
        }
    }

    async function deletePromo(promo) {
        if (!confirm(`¿Eliminar la promo "${promo.title}"?`)) return;
        try {
            const { error } = await window.auth.sb
                .from('smart_promotions')
                .delete()
                .eq('id', promo.id);
            if (error) throw error;
            window.showToast?.('Promo eliminada', 'success');
            await loadSmartPromotions();
        } catch (err) {
            console.error('[smart-promotions] Error al eliminar:', err);
            window.showToast?.('No se pudo eliminar la promo.', 'error');
        }
    }

    function handleAiEnhance() {
        const description = document.getElementById(selectors.description).value.trim();
        const benefits = document.getElementById(selectors.benefits).value.trim();
        const title = document.getElementById(selectors.title).value.trim();
        const inputText = `${title}\n\n${description}\n\nBeneficios:\n${benefits}`;

        if (!window.appInstance?.openAiEnhanceModal) {
            window.showToast?.('La mejora con IA no está disponible en este momento.', 'info');
            return;
        }

        window.appInstance.openAiEnhanceModal(inputText, (newText) => {
            document.getElementById(selectors.description).value = newText;
        });
    }

    // ============================================
    // Funciones globales para subir imágenes a Bunny.net
    // ============================================

    /**
     * Función global para subir imágenes a Bunny.net usando la edge function smart-worker
     * @param {File} file - Archivo a subir
     * @param {string} folder - Carpeta de destino (default: 'smart-promotions')
     * @returns {Promise<string>} URL de la imagen en CDN
     */
    async function uploadImageToBunny(file, folder = 'smart-promotions') {
        if (!file) {
            throw new Error('No se proporcionó ningún archivo');
        }

        const session = window.auth.getSession();
        if (!session?.user?.id) {
            throw new Error('No se pudo obtener el usuario actual');
        }

        try {
            // Convertir el archivo a base64 (como hace designer-ai.js)
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    // Obtener solo la parte base64 (sin el prefijo data:image/...;base64,)
                    const base64String = reader.result;
                    const base64Data = base64String.includes(',')
                        ? base64String.split(',')[1]
                        : base64String;
                    resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Llamar a smart-worker (igual que designer-ai.js)
            const { data, error } = await window.auth.invokeFunction('smart-worker', {
                body: {
                    userId: session.user.id,
                    userEmail: session.user.email,
                    b64_json: base64,
                    subfolder: folder
                }
            });

            if (error) {
                throw new Error(error.message || 'Error al subir la imagen');
            }

            if (!data?.cdnUrl) {
                throw new Error('La función no devolvió una URL de CDN');
            }

            return data.cdnUrl;
        } catch (err) {
            console.error('[smart-promotions] Error al subir imagen:', err);
            throw err;
        }
    }

    // Exponer función globalmente
    window.uploadImageToBunny = uploadImageToBunny;

    /**
     * Renderiza las URLs de imágenes en el contenedor
     */
    function renderImageUrls(urls) {
        const container = document.getElementById('smart-promo-images-container');
        if (!container) return;

        container.innerHTML = '';

        urls.forEach((url, index) => {
            if (!url) return;
            const imageItem = createImageItem(url, index);
            container.insertAdjacentHTML('beforeend', imageItem);
        });

        // Agregar botón de subir si no hay muchas imágenes
        if (urls.length < 10) {
            const uploadBtn = document.createElement('div');
            uploadBtn.className = 'image-upload-slot border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors';
            uploadBtn.innerHTML = `
                <i data-lucide="upload" class="w-6 h-6 mx-auto mb-2 text-slate-400"></i>
                <p class="text-sm text-slate-500">Subir imagen</p>
                <input type="file" accept="image/*" class="hidden" id="smart-promo-image-input" />
            `;
            uploadBtn.addEventListener('click', () => {
                document.getElementById('smart-promo-image-input')?.click();
            });
            container.appendChild(uploadBtn);

            const input = document.getElementById('smart-promo-image-input');
            if (input) {
                input.addEventListener('change', handleImageUpload);
            }
        }

        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: container });
        }
    }

    /**
     * Crea un elemento de imagen para mostrar en el contenedor
     */
    function createImageItem(url, index) {
        return `
            <div class="relative group" data-image-url="${url}">
                <img src="${url}" alt="Imagen ${index + 1}" 
                     class="w-full h-32 object-cover rounded-lg border border-slate-200" />
                <button class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity remove-image-btn"
                        data-url="${url}">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }

    /**
     * Maneja la subida de imágenes
     */
    async function handleImageUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            window.showToast?.('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }

        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            window.showToast?.('La imagen es demasiado grande. Máximo 10MB', 'error');
            return;
        }

        const container = document.getElementById('smart-promo-images-container');
        if (!container) return;

        // Mostrar indicador de carga
        const loadingId = `loading-${Date.now()}`;
        container.insertAdjacentHTML('beforeend', `
            <div id="${loadingId}" class="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p class="text-sm text-slate-500 mt-2">Subiendo...</p>
            </div>
        `);

        try {
            const cdnUrl = await uploadImageToBunny(file, 'smart-promotions');

            // Remover indicador de carga
            document.getElementById(loadingId)?.remove();

            // Agregar imagen al contenedor
            const imageItem = createImageItem(cdnUrl, container.querySelectorAll('[data-image-url]').length);
            container.insertAdjacentHTML('beforeend', imageItem);

            // Agregar listener al botón de eliminar
            const removeBtn = container.querySelector(`[data-url="${cdnUrl}"]`);
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    const item = removeBtn.closest('[data-image-url]');
                    item?.remove();
                });
            }

            if (window.lucide?.createIcons) {
                window.lucide.createIcons({ root: container });
            }

            window.showToast?.('Imagen subida correctamente', 'success');
        } catch (err) {
            document.getElementById(loadingId)?.remove();
            console.error('[smart-promotions] Error al subir imagen:', err);
            window.showToast?.(`Error al subir imagen: ${err.message}`, 'error');
        }

        // Limpiar input
        event.target.value = '';
    }

    // Agregar listener para eliminar imágenes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.remove-image-btn')) {
            const btn = e.target.closest('.remove-image-btn');
            const item = btn.closest('[data-image-url]');
            item?.remove();
        }
    });
})();
