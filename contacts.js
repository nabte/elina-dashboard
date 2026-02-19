// contacts.js - Módulo para el panel de contactos (Refactorizado)

(function () {
    let isInitialized = false;
    let isSyncing = false;
    let allContactsData = []; // Caché de los contactos cargados
    let allLabelsData = []; // Caché de las etiquetas del usuario
    let selectedContactIds = new Set();
    let currentSort = { column: 'created_at', direction: 'desc' };
    let currentPage = 1;
    let contactsPerPage = 50; // Mostrar 50 contactos por página (configurable)
    let totalContacts = 0;
    let contactsRealtimeChannel = null;
    let realtimeDebounceTimer = null; // <-- AÑADIDO: Temporizador para debouncing
    let syncStatusIntervalId = null;
    let labelFilterSelect = null;
    let exportMenuElement = null;
    let exportMenuOutsideHandler = null;
    let exportMenuEscapeHandler = null;
    let exportMenuScrollHandler = null;
    let isModalInitialized = false;

    const logImport = (...args) => console.info('[contacts-import]', ...args);

    function getAdvisorLabelFilters(scope) {
        const teamInfo = window.appInstance?.teamInfo;
        if (teamInfo?.user_role !== 'advisor') return null;
        const filters = teamInfo?.permissions?.label_filters || teamInfo?.permissions?.labelFilters;
        const scoped = filters?.[scope];
        if (!Array.isArray(scoped) || scoped.length === 0) return null;
        return scoped.filter(Boolean);
    }

    const normalizeLabelName = (label) => {
        if (label === undefined || label === null) return '';
        return String(label).trim().toLowerCase();
    };

    function labelsAreEqual(a, b) {
        return normalizeLabelName(a) === normalizeLabelName(b);
    }

    function hasLabel(labels, targetLabel) {
        const target = normalizeLabelName(targetLabel);
        if (!target) return false;
        return (labels || []).some((label) => normalizeLabelName(label) === target);
    }

    function filterOutLabel(labels, labelToRemove) {
        const target = normalizeLabelName(labelToRemove);
        if (!target) return labels || [];
        return (labels || []).filter((label) => normalizeLabelName(label) !== target);
    }

    function stripLabelFromSet(labelsSet, labelToRemove) {
        const target = normalizeLabelName(labelToRemove);
        if (!target || !labelsSet) return;
        for (const label of Array.from(labelsSet)) {
            if (normalizeLabelName(label) === target) {
                labelsSet.delete(label);
            }
        }
    }

    function getSelectedLabelFilterValues() {
        const select = document.getElementById('contact-label-filter');
        if (!select) return [];
        return Array.from(select.selectedOptions || []).map((option) => option.value);
    }

    function findLabelDataByName(labelName, userId) {
        const normalized = normalizeLabelName(labelName);
        if (!normalized) return null;
        const exactUserMatch = allLabelsData.find(
            (label) =>
                normalizeLabelName(label?.name) === normalized &&
                (!label?.user_id || !userId || label.user_id === userId)
        );
        if (exactUserMatch) return exactUserMatch;
        return (
            allLabelsData.find((label) => normalizeLabelName(label?.name) === normalized) ||
            null
        );
    }


    document.addEventListener('panel:activated', ({ detail }) => {
        // Se inicializa solo la primera vez que el panel de contactos se activa.
        if (detail.panelId === 'contacts') {
            if (!isInitialized) {
                initContactsPanel();
            }
            // Suscribirse a cambios cada vez que el panel se activa
            subscribeToContactChanges();
        } else {
            // Desuscribirse al salir para ahorrar recursos
            unsubscribeFromContactChanges();
        }
    });

    function initContactsPanel() {
        //         console.log('Inicializando panel de contactos...');
        isInitialized = true;
        setupSyncButton();
        setupModal();
        setupFilter();
        setupSorting();
        setupImportExportButtons();
        setupLabelFilter(); // <-- AÑADIDO
        setupGlobalIgnoreButtons();
        setupBulkActionsControls();
        setupMoreActionsMenu();
        loadInitialData(); // Carga los datos después de configurar los listeners

        // Escuchar cambios en el perfil para actualizar el estado del botón de sincronización
        document.addEventListener('profile:updated', checkSyncPrerequisites);
    }

    async function loadInitialData() {
        await ensureBaseLabels(); // Asegura que las etiquetas base existan
        await loadAndRender();
        await checkSyncPrerequisites(); // Mover la verificación aquí para que se ejecute después de la carga
    }

    // ========= FUNCIONES DE DATOS =========
    async function fetchContacts(page = 1) {
        const userId = window.auth.getSession()?.user?.id;
        if (!userId) throw new Error('No se pudo obtener el ID del usuario.');

        currentPage = page;
        const searchTerm = document.getElementById('contact-search-input')?.value.trim() || '';
        const selectedLabels = Array.from(document.getElementById('contact-label-filter')?.selectedOptions || []).map(opt => opt.value).filter(Boolean);
        const restrictedLabels = getAdvisorLabelFilters('contacts');

        // **OPTIMIZACIÓN**: Si hay filtro de etiquetas, usar función SQL optimizada (case-insensitive)
        // Esto es más eficiente para miles de contactos
        if (selectedLabels.length > 0 && selectedLabels[0] !== '') {
            try {
                const { data, error } = await window.auth.sb.rpc('get_filtered_contacts', {
                    p_user_id: userId,
                    p_label_filter: selectedLabels.length > 0 ? selectedLabels : null,
                    p_search_term: searchTerm || null,
                    p_sort_column: currentSort.column,
                    p_sort_direction: currentSort.direction,
                    p_page_number: contactsPerPage === 0 ? 1 : page,
                    p_page_size: contactsPerPage === 0 ? 100000 : contactsPerPage,
                    p_restricted_labels: restrictedLabels || null
                });

                if (error) throw error;

                const result = data?.[0];
                if (result) {
                    totalContacts = result.total_count || 0;
                    return result.contacts || [];
                }

                totalContacts = 0;
                return [];
            } catch (rpcError) {
                console.error('[contacts] Error en get_filtered_contacts, usando método alternativo:', rpcError);
                // Si falla la función RPC, continuar con el método normal
            }
        }

        // **MÉTODO NORMAL**: Sin filtro de etiquetas o si falla la función RPC
        let query = window.auth.sb
            .from('contacts')
            .select('id, full_name, phone_number, created_at, labels, razon_de_label_auto', { count: 'exact' })
            .eq('user_id', userId);

        // Filtro por búsqueda
        if (searchTerm) {
            query = query.or(`full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`);
        }

        // Filtro por etiquetas restringidas (para advisors)
        if (restrictedLabels) {
            query = query.overlaps('labels', restrictedLabels);
        }

        query = query.order(currentSort.column, { ascending: currentSort.direction === 'asc', nullsFirst: false });

        // Si contactsPerPage === 0, cargar todos (sin range)
        if (contactsPerPage > 0) {
            const from = (currentPage - 1) * contactsPerPage;
            const to = from + contactsPerPage - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(`No se pudieron cargar contactos: ${error.message}`);

        totalContacts = count || 0;
        return data || [];
    }

    function createFilteredContactsQuery(columns = 'id, labels', selectOptions = undefined) {
        const userId = window.auth.getSession()?.user?.id;
        if (!userId) throw new Error('No se pudo obtener el ID del usuario.');

        const searchTerm = document.getElementById('contact-search-input')?.value.toLowerCase().trim() || '';
        const selectedLabels = getSelectedLabelFilterValues();

        const base = window.auth.sb.from('contacts');
        const selector = selectOptions === undefined
            ? base.select(columns)
            : base.select(columns, selectOptions);

        let query = selector.eq('user_id', userId);

        // Filtro de etiquetas se aplica después en el cliente (case-insensitive)
        // No aplicamos aquí porque el filtro 'cs' es case-sensitive
        if (selectedLabels.length > 0 && selectedLabels[0] !== '') {
            // Intentar con el valor exacto primero (puede funcionar si las etiquetas coinciden)
            query = query.filter('labels', 'cs', `{${selectedLabels.join(',')}}`);
        }

        if (searchTerm) {
            query = query.or(`full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`);
        }

        const restrictedLabels = getAdvisorLabelFilters('contacts');
        if (restrictedLabels) {
            query = query.overlaps('labels', restrictedLabels);
        }

        return query;
    }

    async function fetchAllUserLabels() {
        const { data, error } = await window.auth.sb.from('labels').select('*');
        if (error) throw new Error(`No se pudieron cargar las etiquetas: ${error.message}`);
        return data;
    }

    async function ensureBaseLabels() {
        const baseLabels = ['Nuevo cliente', 'Interesado', 'No responde'];
        const userId = window.auth.getSession()?.user?.id;
        if (!userId) return;

        try {
            const { data: existingLabels, error } = await window.auth.sb.from('labels').select('name').eq('user_id', userId);
            if (error) throw error;

            // Verificar usando normalización (case-insensitive)
            const existingLabelNamesNormalized = new Set(
                existingLabels.map(l => normalizeLabelName(l.name))
            );

            const labelsToCreate = baseLabels
                .filter(l => !existingLabelNamesNormalized.has(normalizeLabelName(l)))
                .map(name => ({ name, user_id: userId, color: '#848484' }));

            if (labelsToCreate.length > 0) {
                await window.auth.sb.from('labels').insert(labelsToCreate);
            }
        } catch (e) {
            console.error("Error al asegurar etiquetas base:", e);
        }
    }

    // ========= LÓGICA DE RENDERIZADO =========
    async function loadAndRender() {
        const loader = document.getElementById('contacts-loader');
        const tbody = document.getElementById('contacts-table-body');
        if (!tbody || !loader) return;

        loader.style.display = 'block';
        loader.textContent = 'Cargando contactos y etiquetas...';
        tbody.innerHTML = '';

        try {
            // Carga la primera página de contactos y todas las etiquetas en paralelo
            [allContactsData, allLabelsData] = await Promise.all([fetchContacts(1), fetchAllUserLabels()]);
            logImport('loadAndRender resolved', { contacts: allContactsData.length, labels: allLabelsData.length });
            renderLabelFilterOptions();
            updateContactsCountBadge(totalContacts);

            if (!allContactsData.length) {
                const searchTerm = document.getElementById('contact-search-input')?.value.trim();
                loader.textContent = searchTerm ? 'No se encontraron contactos con ese término.' : 'Aún no tienes contactos. ¡Sincroniza para empezar!';
                renderTableRows([]);
                renderPaginationControls();
                return;
            }

            loader.style.display = 'none';
            renderTableRows(allContactsData);
            renderPaginationControls();

            setupTableInteractions(); // Configurar interacciones después de renderizar
            lucide.createIcons(); // Re-renderizar iconos para los nuevos de ordenamiento

        } catch (e) {
            console.error(e);
            loader.textContent = 'Error al cargar contactos. Revisa la consola.';
        }
    }

    function renderPaginationControls() {
        const paginationContainer = document.getElementById('contacts-pagination');
        if (!paginationContainer) return;

        const totalPages = contactsPerPage === 0 ? 1 : Math.ceil(totalContacts / contactsPerPage);
        const from = contactsPerPage === 0 ? 1 : (currentPage - 1) * contactsPerPage + 1;
        const to = contactsPerPage === 0 ? totalContacts : Math.min(currentPage * contactsPerPage, totalContacts);

        const pageSizeOptions = [50, 100, 500, 0]; // 0 = todos
        const pageSizeLabels = { 50: '50', 100: '100', 500: '500', 0: 'Todos' };

        paginationContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-sm text-slate-600">Mostrando ${from}-${to} de ${totalContacts}</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-400">Mostrar:</span>
                    <div class="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                        ${pageSizeOptions.map(size => `
                            <button data-page-size="${size}" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                contactsPerPage === size
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }">${pageSizeLabels[size]}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
            ${totalPages > 1 ? `
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">Pág. ${currentPage}/${totalPages}</span>
                <button id="prev-page-btn" class="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                <button id="next-page-btn" class="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            </div>` : ''}
        `;

        // Page size buttons
        paginationContainer.querySelectorAll('[data-page-size]').forEach(btn => {
            btn.addEventListener('click', () => {
                const newSize = parseInt(btn.dataset.pageSize);
                if (newSize === contactsPerPage) return;
                contactsPerPage = newSize;
                currentPage = 1;
                updatePage(1);
            });
        });

        document.getElementById('prev-page-btn')?.addEventListener('click', () => updatePage(currentPage - 1));
        document.getElementById('next-page-btn')?.addEventListener('click', () => updatePage(currentPage + 1));
        lucide.createIcons();
    }



    function updateContactsCountBadge(count) {
        const badge = document.getElementById('contacts-count-badge');
        if (!badge) return;
        if (typeof count !== 'number') {
            badge.classList.add('hidden');
            return;
        }
        badge.textContent = count.toLocaleString('es-MX');
        badge.classList.toggle('hidden', count <= 0);
    }

    function setupImportExportButtons() {
        const exportBtn = document.getElementById('export-contacts-btn');
        const importBtn = document.getElementById('import-contacts-btn');
        const importInput = document.getElementById('import-contacts-input');

        if (exportBtn) {
            exportBtn.addEventListener('click', (event) => {
                event.preventDefault();
                toggleExportMenu(exportBtn);
            });
        }

        if (importBtn && importInput) {
            importBtn.addEventListener('click', (event) => {
                event.preventDefault();
                importInput.click();
            });
            importInput.addEventListener('change', handleCsvImport);
        }

        // Botón para importar números con etiqueta
        const importNumbersLabelBtn = document.getElementById('import-numbers-label-btn');
        if (importNumbersLabelBtn) {
            importNumbersLabelBtn.addEventListener('click', (event) => {
                event.preventDefault();
                openImportNumbersLabelModal();
            });
        }

    }

    function toggleExportMenu(trigger) {
        if (exportMenuElement) {
            closeExportMenu();
        } else {
            openExportMenu(trigger);
        }
    }

    function openExportMenu(trigger) {
        closeExportMenu();

        const rect = trigger.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.id = 'contacts-export-menu';
        menu.className = 'absolute bg-white border border-slate-200 rounded-xl shadow-xl w-56 py-2 z-[260]';
        menu.innerHTML = `
            <button type="button" data-format="csv" class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                <i data-lucide="file-text" class="w-4 h-4 text-slate-500"></i>
                <span>Exportar como CSV</span>
            </button>
            <button type="button" data-format="xlsx" class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                <i data-lucide="table" class="w-4 h-4 text-slate-500"></i>
                <span>Exportar como Excel (.xlsx)</span>
            </button>
        `;
        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 8;
        const maxLeft = window.scrollX + window.innerWidth - menuRect.width - 16;
        let left = rect.left + window.scrollX;
        if (left > maxLeft) {
            left = Math.max(window.scrollX + 16, maxLeft);
        }
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;

        exportMenuElement = menu;

        menu.querySelectorAll('button[data-format]').forEach(btn => {
            btn.addEventListener('click', async () => {
                await handleExportContacts(btn.dataset.format);
            });
        });

        exportMenuOutsideHandler = (event) => {
            if (!menu.contains(event.target) && event.target !== trigger) {
                closeExportMenu();
            }
        };
        exportMenuEscapeHandler = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeExportMenu();
            }
        };
        exportMenuScrollHandler = () => closeExportMenu();

        document.addEventListener('mousedown', exportMenuOutsideHandler);
        document.addEventListener('keydown', exportMenuEscapeHandler);
        window.addEventListener('resize', exportMenuScrollHandler);
        window.addEventListener('scroll', exportMenuScrollHandler, true);

        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: menu });
        }
    }

    function closeExportMenu() {
        if (exportMenuElement?.parentElement) {
            exportMenuElement.parentElement.removeChild(exportMenuElement);
        }
        exportMenuElement = null;

        if (exportMenuOutsideHandler) {
            document.removeEventListener('mousedown', exportMenuOutsideHandler);
            exportMenuOutsideHandler = null;
        }
        if (exportMenuEscapeHandler) {
            document.removeEventListener('keydown', exportMenuEscapeHandler);
            exportMenuEscapeHandler = null;
        }
        if (exportMenuScrollHandler) {
            window.removeEventListener('resize', exportMenuScrollHandler);
            window.removeEventListener('scroll', exportMenuScrollHandler, true);
            exportMenuScrollHandler = null;
        }
    }

    async function handleExportContacts(format = 'csv') {
        const exportBtn = document.getElementById('export-contacts-btn');
        closeExportMenu();

        const session = window.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
            window.showToast?.('No se pudo obtener tu sesión. Intenta recargar.', 'error');
            return;
        }

        try {
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.classList.add('opacity-60', 'cursor-wait');
            }

            const { data, error } = await window.auth.sb
                .from('contacts')
                .select('full_name, phone_number, labels, razon_de_label_auto, created_at, assigned_to_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const rows = buildContactsExportRows(data || []);

            if (!rows.length) {
                window.showToast?.('No tienes contactos para exportar.', 'info');
                return;
            }

            if (format === 'xlsx') {
                exportContactsAsXlsx(rows);
            } else {
                exportContactsAsCsv(rows);
            }

            window.showToast?.('Exportación generada correctamente.', 'success');
        } catch (err) {
            console.error('Error al exportar contactos:', err);
            window.showToast?.(`No se pudo exportar: ${err.message}`, 'error');
        } finally {
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-60', 'cursor-wait');
            }
        }
    }

    function buildContactsExportRows(contacts) {
        return contacts.map(contact => ({
            Nombre: contact.full_name || '',
            Telefono: contact.phone_number || '',
            Etiquetas: Array.isArray(contact.labels) ? contact.labels.join(', ') : '',
            'Motivo IA': contact.razon_de_label_auto || '',
            'Asignado a': contact.assigned_to_id || '',
            'Creado el': contact.created_at ? new Date(contact.created_at).toLocaleString('es-MX') : ''
        }));
    }

    function exportContactsAsCsv(rows) {
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(','))
        ];
        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        triggerFileDownload(blob, `contactos_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    function exportContactsAsXlsx(rows) {
        if (typeof XLSX === 'undefined') {
            window.showToast?.('No se encontró la librería XLSX. Se generará un CSV.', 'info');
            exportContactsAsCsv(rows);
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contactos');
        const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerFileDownload(blob, `contactos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    function triggerFileDownload(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function renderLabelFilterOptions() {
        if (!labelFilterSelect) return;
        const session = window.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const previousSelection = Array.from(labelFilterSelect.selectedOptions || []).map(opt => opt.value);
        const userLabels = allLabelsData
            .filter(label => label?.user_id === userId)
            .map(label => label.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        const uniqueLabels = Array.from(new Set(userLabels));
        const optionsHtml = [
            '<option value="">Todas las etiquetas</option>',
            ...uniqueLabels.map(name => `<option value="${name}">${name}</option>`)
        ].join('');

        labelFilterSelect.innerHTML = optionsHtml;
        previousSelection.forEach(value => {
            const option = Array.from(labelFilterSelect.options).find(opt => opt.value === value);
            if (option) option.selected = true;
        });
        if (!previousSelection.length) {
            labelFilterSelect.value = '';
        }

        const wrapper = labelFilterSelect.parentElement;
        if (wrapper) {
            wrapper.classList.add('relative');
            if (!wrapper.querySelector('.contact-label-filter-icon')) {
                const icon = document.createElement('i');
                icon.dataset.lucide = 'chevron-down';
                icon.className = 'contact-label-filter-icon absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none';
                wrapper.appendChild(icon);
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons({ root: wrapper });
                }
            }
        }
    }

    function renderTableRows(contacts) {
        const tbody = document.getElementById('contacts-table-body');
        if (!tbody) return;
        const userId = window.auth.getSession()?.user?.id;

        tbody.innerHTML = contacts.map(c => {
            const labelsHtml = (() => {
                const visibleLabels = filterOutLabel(c.labels, 'ignorar');
                if (!visibleLabels.length) {
                    return '<span class="text-slate-300 font-medium text-xs">Sin etiquetas</span>';
                }
                return `
                    <div class="flex flex-wrap gap-1.5">
                        ${visibleLabels.map(labelName => {
                    const labelData = findLabelDataByName(labelName, userId);
                    const bgColor = labelData ? getLabelColor(labelData.color) : '#848484';
                    const textColor = getTextColorForBg(bgColor);
                    const displayName = (labelData?.name || labelName || '').trim() || labelName;
                    return `<span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm border border-white/10" style="background-color: ${bgColor}; color: ${textColor};">
                                ${displayName}
                            </span>`;
                }).join('')}
                    </div>
                `;
            })();
            const isIgnored = hasLabel(c.labels, 'ignorar');

            return `
                <tr data-id="${c.id}" class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4 text-center">
                        <input type="checkbox" class="contact-checkbox w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" data-id="${c.id}">
                    </td>
                    <td class="px-6 py-4">
                        <div class="contact-name-editable flex items-center gap-3" data-contact-id="${c.id}" data-original-name="${c.full_name || ''}">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-xs shadow-sm">
                                ${(c.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div class="flex flex-col">
                                <span class="contact-name-display cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors text-sm">${c.full_name || 'Sin nombre'}</span>
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Prospecto</span>
                            </div>
                            <i data-lucide="edit-2" class="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"></i>
                            <input type="text" class="contact-name-input hidden bg-white border-2 border-blue-400 rounded-xl px-3 py-1 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 outline-none" value="${c.full_name || ''}" data-contact-id="${c.id}">
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                            <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span>${c.phone_number || '-'}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        ${labelsHtml}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <div class="inline-flex items-center">
                            <div class="relative inline-flex items-center cursor-pointer ignore-ia-toggle-switch" data-contact-id="${c.id}" data-ignored="${isIgnored}">
                                <div class="relative w-10 h-5 ${isIgnored ? 'bg-blue-600' : 'bg-slate-200'} rounded-full transition-colors after:absolute after:top-1 ${isIgnored ? 'after:left-[22px]' : 'after:left-[4px]'} after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        ${c.razon_de_label_auto ? `
                            <div class="relative group inline-block">
                                <div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors cursor-help">
                                    <i data-lucide="brain-circuit" class="w-4 h-4"></i>
                                </div>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-bold rounded-2xl p-4 shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[110] border border-white/10 scale-95 group-hover:scale-100 origin-bottom">
                                    <div class="flex items-center gap-2 mb-2 text-purple-300">
                                        <i data-lucide="sparkles" class="w-3 h-3"></i>
                                        <span class="uppercase tracking-widest text-[9px]">Análisis de la IA</span>
                                    </div>
                                    ${c.razon_de_label_auto}
                                    <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95"></div>
                                </div>
                            </div>
                        ` : '<span class="text-slate-200">-</span>'}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <button class="edit-contact-btn w-8 h-8 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 text-slate-400 hover:text-blue-600 transition-all active:scale-90" data-id="${c.id}" title="Gestionar Etiquetas">
                            <i data-lucide="settings-2" class="w-4 h-4 mx-auto"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ========= LÓGICA DE INTERACCIÓN DE LA TABLA =========
    function setupTableInteractions() {
        const tbody = document.getElementById('contacts-table-body');

        const selectAllCheckbox = document.getElementById('select-all-contacts');
        if (!tbody || !selectAllCheckbox) return;

        // Event listener combinado para todos los clicks en la tabla
        tbody.addEventListener('click', (e) => {
            // Edición de nombres
            const nameDisplay = e.target.closest('.contact-name-display');
            const editIcon = e.target.closest('[data-lucide="edit-2"]');

            if (nameDisplay || editIcon) {
                e.stopPropagation();
                const editableDiv = (nameDisplay || editIcon)?.closest('.contact-name-editable');
                if (editableDiv) {
                    const display = editableDiv.querySelector('.contact-name-display');
                    const input = editableDiv.querySelector('.contact-name-input');
                    if (display && input) {
                        display.classList.add('hidden');
                        input.classList.remove('hidden');
                        input.focus();
                        input.select();
                    }
                }
                return;
            }

            // Botones de editar etiquetas
            if (e.target.classList.contains('edit-contact-btn') || e.target.closest('.edit-contact-btn')) {
                const btn = e.target.closest('.edit-contact-btn') || e.target;
                const contactId = btn.dataset.id;
                selectedContactIds.clear();
                selectedContactIds.add(contactId);
                openLabelsModal();
                return;
            }

            // Checkboxes de contactos
            if (e.target.classList.contains('contact-checkbox')) {
                const contactId = e.target.dataset.id;
                if (e.target.checked) {
                    selectedContactIds.add(contactId);
                } else {
                    selectedContactIds.delete(contactId);
                }
                updateBulkActionsBar();
                return;
            }

            // Toggle de ignorar IA
            const switchElement = e.target.closest('.ignore-ia-toggle-switch');
            if (switchElement) {
                handleIgnoreIaToggle(switchElement);
                return;
            }
        });

        // Event listeners para edición de nombres
        tbody.addEventListener('blur', (e) => {
            const input = e.target.closest('.contact-name-input');
            if (input && document.activeElement !== input) {
                handleNameEdit(input);
            }
        }, true);

        tbody.addEventListener('keydown', (e) => {
            const input = e.target.closest('.contact-name-input');
            if (input) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNameEdit(input);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelNameEdit(input);
                }
            }
        }, true);

        // Checkbox "Seleccionar todo"
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = tbody.querySelectorAll('.contact-checkbox');
            selectedContactIds.clear();
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) {
                    selectedContactIds.add(cb.dataset.id);
                }
            });
            updateBulkActionsBar();
        });
    }

    function updateBulkActionsBar() {
        const bar = document.getElementById('bulk-actions-bar');
        const countSpan = document.getElementById('selected-count');
        const ignoreBtn = document.getElementById('bulk-ignore-selected-btn');
        const unignoreBtn = document.getElementById('bulk-unignore-selected-btn');
        if (selectedContactIds.size > 0) {
            bar.classList.remove('hidden');
            countSpan.textContent = `${selectedContactIds.size} seleccionado(s)`;
            if (ignoreBtn) ignoreBtn.disabled = false;
            if (unignoreBtn) unignoreBtn.disabled = false;
        } else {
            bar.classList.add('hidden');
            if (ignoreBtn) ignoreBtn.disabled = true;
            if (unignoreBtn) unignoreBtn.disabled = true;
        }
    }

    async function getCanonicalIgnoreLabelName(userId) {
        if (!userId) return 'Ignorar'; // Default a Title Case

        try {
            // Buscar etiqueta "ignorar" case-insensitive en la tabla labels
            const { data, error } = await window.auth.sb
                .from('labels')
                .select('name')
                .eq('user_id', userId)
                .limit(100);

            if (error) throw error;

            const ignoreLabel = Array.isArray(data)
                ? data.find(l => l.name && normalizeLabelName(l.name) === 'ignorar')
                : null;

            // Si existe, usar su nombre canónico; si no, usar "Ignorar" (Title Case)
            return ignoreLabel?.name || 'Ignorar';
        } catch (e) {
            console.error("Error al obtener nombre canónico de 'ignorar':", e);
            return 'Ignorar'; // Default a Title Case
        }
    }

    async function handleIgnoreIaToggle(switchElement) {
        const contactId = switchElement.dataset.contactId;
        const isCurrentlyIgnored = switchElement.dataset.ignored === 'true';
        const shouldIgnore = !isCurrentlyIgnored;
        const contact = allContactsData.find(c => c.id == contactId);
        if (!contact) return;

        const userId = window.auth.getSession()?.user?.id;
        const currentLabels = new Set(contact.labels || []);

        // Quitar cualquier variación de "ignorar" (case-insensitive)
        const labelsArray = Array.from(currentLabels);
        currentLabels.clear();
        labelsArray.forEach(label => {
            if (normalizeLabelName(label) !== 'ignorar') {
                currentLabels.add(label);
            }
        });

        if (shouldIgnore) {
            // Obtener el nombre canónico de la etiqueta "ignorar"
            const canonicalIgnoreName = await getCanonicalIgnoreLabelName(userId);
            currentLabels.add(canonicalIgnoreName);
        }

        const finalLabels = Array.from(currentLabels);

        try {
            const { error } = await window.auth.sb.from('contacts').update({ labels: finalLabels }).eq('id', contactId);
            if (error) throw error;
            contact.labels = finalLabels; // Actualizar el caché local

            // Actualizar el estado visual del switch
            switchElement.dataset.ignored = shouldIgnore ? 'true' : 'false';
            const switchDiv = switchElement.querySelector('div');
            if (switchDiv) {
                if (shouldIgnore) {
                    switchDiv.classList.add('bg-blue-600');
                    switchDiv.classList.remove('bg-slate-200');
                    switchDiv.classList.remove('after:left-[2px]');
                    switchDiv.classList.add('after:left-[22px]');
                } else {
                    switchDiv.classList.remove('bg-blue-600');
                    switchDiv.classList.add('bg-slate-200');
                    switchDiv.classList.remove('after:left-[22px]');
                    switchDiv.classList.add('after:left-[2px]');
                }
            }
        } catch (e) {
            console.error("Error al actualizar la etiqueta 'ignorar':", e);
            // Revertir el cambio en la UI si falla
            switchElement.dataset.ignored = isCurrentlyIgnored ? 'true' : 'false';
            const switchDiv = switchElement.querySelector('div');
            if (switchDiv) {
                if (isCurrentlyIgnored) {
                    switchDiv.classList.add('bg-blue-600');
                    switchDiv.classList.remove('bg-slate-200');
                    switchDiv.classList.remove('after:left-[2px]');
                    switchDiv.classList.add('after:left-[22px]');
                } else {
                    switchDiv.classList.remove('bg-blue-600');
                    switchDiv.classList.add('bg-slate-200');
                    switchDiv.classList.remove('after:left-[22px]');
                    switchDiv.classList.add('after:left-[2px]');
                }
            }
        }
    }

    function setupBulkActionsControls() {
        const ignoreBtn = document.getElementById('bulk-ignore-selected-btn');
        const unignoreBtn = document.getElementById('bulk-unignore-selected-btn');
        if (ignoreBtn) {
            ignoreBtn.disabled = true;
            ignoreBtn.addEventListener('click', () => handleBulkIgnore(true));
        }
        if (unignoreBtn) {
            unignoreBtn.disabled = true;
            unignoreBtn.addEventListener('click', () => handleBulkIgnore(false));
        }
    }

    async function handleBulkIgnore(shouldIgnore) {
        if (!selectedContactIds.size) {
            window.showToast?.('Selecciona al menos un contacto.', 'info');
            return;
        }

        const button = shouldIgnore
            ? document.getElementById('bulk-ignore-selected-btn')
            : document.getElementById('bulk-unignore-selected-btn');
        if (button) button.disabled = true;

        const ids = Array.from(selectedContactIds);
        let updatedContacts = 0;
        const userId = window.auth.getSession()?.user?.id;

        // Obtener el nombre canónico de la etiqueta "ignorar" una sola vez
        const canonicalIgnoreName = await getCanonicalIgnoreLabelName(userId);

        try {
            for (const contactId of ids) {
                const contact = allContactsData.find(c => c.id == contactId);
                if (!contact) continue;

                const labelsSet = new Set(contact.labels || []);
                const hasIgnoreLabel = Array.from(labelsSet).some((label) => labelsAreEqual(label, 'ignorar'));
                if (shouldIgnore && hasIgnoreLabel) {
                    updatedContacts += 1;
                    continue;
                }
                if (!shouldIgnore && !hasIgnoreLabel) {
                    updatedContacts += 1;
                    continue;
                }

                // Quitar cualquier variación de "ignorar" (case-insensitive)
                const labelsArray = Array.from(labelsSet);
                labelsSet.clear();
                labelsArray.forEach(label => {
                    if (normalizeLabelName(label) !== 'ignorar') {
                        labelsSet.add(label);
                    }
                });

                if (shouldIgnore) {
                    // Usar el nombre canónico de la etiqueta "ignorar"
                    labelsSet.add(canonicalIgnoreName);
                }

                const finalLabels = Array.from(labelsSet);
                const { error } = await window.auth.sb.from('contacts')
                    .update({ labels: finalLabels })
                    .eq('id', contactId);
                if (error) throw error;

                contact.labels = finalLabels;
                updatedContacts += 1;
            }

            await updatePage(currentPage);
            selectedContactIds.clear();
            updateBulkActionsBar();
            window.showToast?.(
                shouldIgnore
                    ? 'Se marcó la etiqueta ignorar en los contactos seleccionados.'
                    : 'Se quitó la etiqueta ignorar de los contactos seleccionados.',
                'success',
            );
        } catch (e) {
            console.error('Error al aplicar la acción masiva de ignorar:', e);
            window.showToast?.('No se pudo actualizar la etiqueta ignorar en todos los contactos seleccionados.', 'error');
        } finally {
            if (button) button.disabled = false;
        }
    }

    function setupGlobalIgnoreButtons() {
        const ignoreBtn = document.getElementById('ignore-all-visible-btn');
        const unignoreBtn = document.getElementById('unignore-all-visible-btn');
        ignoreBtn?.addEventListener('click', () => handleGlobalIgnore(true));
        unignoreBtn?.addEventListener('click', () => handleGlobalIgnore(false));
    }

    function setBulkScopeButtonLoading(button, isLoading, loadingText) {
        if (!button) return;
        const labelSpan = button.querySelector('span');
        if (!labelSpan) return;
        if (isLoading) {
            if (!button.dataset.originalLabel) {
                button.dataset.originalLabel = labelSpan.textContent || '';
            }
            labelSpan.textContent = loadingText;
            button.disabled = true;
            button.classList.add('opacity-60', 'pointer-events-none');
        } else {
            labelSpan.textContent = button.dataset.originalLabel || labelSpan.textContent;
            delete button.dataset.originalLabel;
            button.disabled = false;
            button.classList.remove('opacity-60', 'pointer-events-none');
        }
    }

    function describeBulkScope(selectedValues) {
        const scopedLabels = selectedValues.filter((value) => value && value.trim().length > 0);
        const searchTerm = document.getElementById('contact-search-input')?.value.trim();
        const parts = [];
        if (scopedLabels.length) {
            parts.push(`etiqueta${scopedLabels.length > 1 ? 's' : ''}: ${scopedLabels.join(', ')}`);
        }
        if (searchTerm) {
            parts.push(`búsqueda "${searchTerm}"`);
        }
        if (!parts.length) return '(todos los contactos)';
        return `(${parts.join(' · ')})`;
    }

    async function handleGlobalIgnore(shouldIgnore) {
        const button = shouldIgnore
            ? document.getElementById('ignore-all-visible-btn')
            : document.getElementById('unignore-all-visible-btn');
        if (!button) return;

        const userId = window.auth.getSession()?.user?.id;
        if (!userId) {
            window.showToast?.('No se pudo determinar el usuario actual.', 'error');
            return;
        }

        const selectedValues = getSelectedLabelFilterValues();
        const scopeDescription = describeBulkScope(selectedValues);
        setBulkScopeButtonLoading(button, true, shouldIgnore ? 'Desactivando...' : 'Activando...');

        try {
            // Preparar filtros
            // IMPORTANTE: Los botones trabajan con la etiqueta "ignorar" específicamente
            // - Desactivar = agregar "ignorar" a los contactos visibles
            // - Activar = quitar "ignorar" de los contactos visibles

            let labelFilter = selectedValues.length > 0 && selectedValues[0] !== ''
                ? selectedValues
                : null;

            // Si estamos activando (quitar "ignorar"):
            // Necesitamos contactos que tengan "Ignorar" (Title Case) Y que coincidan con el filtro aplicado (si hay uno)
            // Si hay filtro (ej: "humano"), buscar contactos con "humano" Y "Ignorar"
            // Si NO hay filtro, buscar solo contactos con "Ignorar"
            if (!shouldIgnore) {
                // Obtener el nombre canónico de la etiqueta "ignorar" (debería ser "Ignorar")
                const canonicalIgnoreName = await getCanonicalIgnoreLabelName(userId);

                // Cuando activamos, necesitamos asegurarnos de que solo procesamos contactos que tienen "Ignorar"
                // Si hay un filtro aplicado, la SQL buscará contactos con ese filtro Y "Ignorar"
                // Si no hay filtro, agregamos "Ignorar" al filtro para buscar solo esos contactos
                if (!labelFilter || labelFilter.length === 0) {
                    labelFilter = [canonicalIgnoreName]; // Usar el nombre canónico "Ignorar"
                }
                // Si hay filtro (ej: "humano"), lo mantenemos y la SQL buscará contactos con "humano" Y "Ignorar"
            }
            // Si estamos desactivando (agregar "ignorar"), mantenemos el filtro aplicado
            // La función SQL agregará "ignorar" solo a los contactos que no la tienen

            const searchTerm = document.getElementById('contact-search-input')?.value.trim() || null;

            console.log('[contacts] Bulk ignore:', {
                action: shouldIgnore ? 'DESACTIVAR (agregar ignorar)' : 'ACTIVAR (quitar ignorar)',
                labelFilter,
                searchTerm
            });

            // Llamar a la función SQL para actualización masiva
            const { data, error } = await window.auth.sb.rpc('bulk_update_ignore_label', {
                p_user_id: userId,
                p_should_ignore: shouldIgnore,
                p_label_filter: labelFilter,
                p_search_term: searchTerm
            });

            if (error) {
                console.error('[contacts] Error en bulk_update_ignore_label:', error);
                throw error;
            }

            const updatedCount = data?.[0]?.updated_count || 0;
            console.log('[contacts] Resultado:', { updatedCount, data });

            await updatePage(currentPage);

            if (updatedCount === 0) {
                if (shouldIgnore) {
                    // Desactivar: agregar "ignorar"
                    window.showToast?.(
                        `No se encontraron contactos para desactivar. Los contactos ${scopeDescription} ya tienen la etiqueta "ignorar".`,
                        'info'
                    );
                } else {
                    // Activar: quitar "ignorar"
                    window.showToast?.(
                        `No se encontraron contactos para activar. Los contactos ${scopeDescription} no tienen la etiqueta "ignorar".`,
                        'info'
                    );
                }
                return;
            }

            const verb = shouldIgnore ? 'desactivamos' : 'reactivamos';
            window.showToast?.(
                `Listo: ${verb} la IA en ${updatedCount} contacto(s) ${scopeDescription}.`,
                'success'
            );
        } catch (error) {
            console.error('[contacts] Acción global ignorar:', error);
            window.showToast?.('No pudimos aplicar la acción a todos los contactos.', 'error');
        } finally {
            setBulkScopeButtonLoading(button, false);
        }
    }

    // ========= LÓGICA DEL FILTRO DE BÚSQUEDA =========
    function setupFilter() {
        const searchInput = document.getElementById('contact-search-input');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updatePage(1); // Al buscar, siempre volvemos a la página 1
            }, 300); // Espera 300ms después de que el usuario deja de escribir
        });
    }
    function setupLabelFilter() {
        labelFilterSelect = document.getElementById('contact-label-filter');
        if (!labelFilterSelect) return;

        if (labelFilterSelect.dataset.initialized === 'true') {
            renderLabelFilterOptions();
            return;
        }

        labelFilterSelect.dataset.initialized = 'true';
        labelFilterSelect.addEventListener('change', () => {
            updatePage(1);
        });

        renderLabelFilterOptions();
    }

    // ========= LÓGICA DE ORDENAMIENTO DE LA TABLA =========
    function setupSorting() {
        const headers = document.querySelectorAll('#contacts thead th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;

                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }

                updatePage(1); // Al cambiar el orden, volvemos a la página 1
                updateSortIndicators();
            });
        });
    }

    async function updatePage(newPage) {
        const loader = document.getElementById('contacts-loader');
        loader.style.display = 'block';
        try {
            const contacts = await fetchContacts(newPage);
            allContactsData = contacts; // <-- CORRECCIÓN: Actualizar la caché con los contactos de la página actual
            renderTableRows(contacts);
            renderPaginationControls();
            updateContactsCountBadge(totalContacts);
            logImport('page updated', { page: newPage, pageCount: contacts.length, total: totalContacts });
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        } catch (e) {
            console.error("Error al cambiar de página:", e);
        } finally {
            loader.style.display = 'none';
        }
    }

    function updateSortIndicators() {
        document.querySelectorAll('#contacts thead th[data-sort]').forEach(header => {
            const indicator = header.querySelector('.sort-indicator');
            if (header.dataset.sort === currentSort.column) {
                indicator.innerHTML = currentSort.direction === 'asc' ? '<i data-lucide="arrow-up" class="w-4 h-4"></i>' : '<i data-lucide="arrow-down" class="w-4 h-4"></i>';
            } else {
                indicator.innerHTML = '<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>';
            }
        });
        lucide.createIcons();
    }

    // ========= LÓGICA DEL MODAL DE ETIQUETAS =========
    function setupModal() {
        if (isModalInitialized) return;
        const modal = document.getElementById('edit-labels-modal');
        if (!modal) return;

        const cancelBtn = document.getElementById('cancel-labels-btn');
        const bulkEditBtn = document.getElementById('bulk-edit-labels-btn');
        const newLabelForm = document.getElementById('new-label-form');
        const saveBtn = document.getElementById('save-labels-btn');

        if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        if (bulkEditBtn) bulkEditBtn.addEventListener('click', openLabelsModal);
        if (newLabelForm) newLabelForm.addEventListener('submit', handleCreateLabel);
        if (saveBtn) saveBtn.addEventListener('click', handleSaveChanges);

        isModalInitialized = true;
    }

    // Paleta de colores para traducir los índices de color de Evolution/WhatsApp
    const colorPalette = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
        '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
        '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#FFFFFF'
    ];

    function getLabelColor(colorValue) {
        // Si el valor ya es un código hexadecimal válido, lo devuelve directamente.
        if (typeof colorValue === 'string' && colorValue.startsWith('#')) {
            return colorValue;
        }
        // Si es un número (o un string numérico), lo usa como índice para obtener el color de la paleta.
        const index = parseInt(colorValue, 10);
        if (!isNaN(index) && index >= 0 && index < colorPalette.length) {
            return colorPalette[index];
        }
        // Si no es un formato válido, devuelve un color gris por defecto.
        return '#848484'; // Un gris neutral
    }

    function getTextColorForBg(bgColor) {
        if (!bgColor || !bgColor.startsWith('#')) return '#1e293b';

        const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

        // Calculate luminance using the standard relative luminance formula
        // L = 0.2126 * R + 0.7152 * G + 0.0722 * B
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        // Using a lower threshold for better readability on vibrant colors
        return (luminance > 0.65) ? '#1e293b' : '#ffffff';
    }

    // ========= LÓGICA DEL MENÚ DE ACCIONES (DROP-DOWN) =========
    function setupMoreActionsMenu() {
        const menuBtn = document.getElementById('more-actions-contacts-btn');
        const menu = document.getElementById('more-actions-contacts-menu');

        if (!menuBtn || !menu) return;

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menu.classList.contains('hidden');

            // Cerrar otros menús si los hubiera
            document.querySelectorAll('[id$="-menu"]').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });

            menu.classList.toggle('hidden');
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // Cerrar al presionar Esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.add('hidden');
            }
        });
    }


    async function openLabelsModal() {
        if (!isModalInitialized) setupModal();
        const modal = document.getElementById('edit-labels-modal');
        const labelsListDiv = document.getElementById('labels-list');
        modal.classList.remove('hidden');
        labelsListDiv.innerHTML = '<div class="text-center text-slate-500">Cargando etiquetas...</div>';

        try {
            const userId = window.auth.getSession()?.user?.id;
            const { data, error } = await window.auth.sb.from('labels').select('*').eq('user_id', userId);
            if (error) throw error;
            allLabelsData = data; // Actualizamos el caché de etiquetas del usuario

            // FIX: Agrupar etiquetas por nombre para evitar duplicados en la UI
            const uniqueLabels = allLabelsData.reduce((acc, current) => { // Usamos el caché actualizado
                if (!acc.some(item => item.name === current.name)) { // Evita duplicados visuales
                    acc.push(current);
                }
                return acc;
            }, []);
            // Ordenar alfabéticamente
            uniqueLabels.sort((a, b) => a.name.localeCompare(b.name)); // CORRECCIÓN: Ordenar por nombre

            // Determinar qué etiquetas están activas para el primer contacto seleccionado
            const firstContact = selectedContactIds.size > 0 ? allContactsData.find(c => c.id == [...selectedContactIds][0]) : {};
            const contactLabels = new Set((firstContact?.labels || []).map(normalizeLabelName));

            labelsListDiv.innerHTML = uniqueLabels.map(label => `
                <div class="flex items-center justify-between p-2 rounded-md hover:bg-slate-100">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" class="label-checkbox form-checkbox rounded" data-label-name="${label.name}" ${contactLabels.has(normalizeLabelName(label.name)) ? 'checked' : ''}>
                        <span class="w-4 h-4 rounded-full" style="background-color: ${getLabelColor(label.color)};"></span>
                        <span>${label.name}</span>
                    </label>
                    <button class="edit-label-properties-btn p-1.5 rounded-md hover:bg-slate-200" data-label-id="${label.id}" title="Editar propiedades de la etiqueta">
                        <i data-lucide="edit" class="w-4 h-4 pointer-events-none edit-label-icon"></i>
                    </button>
                </div>
            `).join('');

        } catch (e) {
            console.error('Error al cargar etiquetas:', e);
            labelsListDiv.innerHTML = '<div class="text-center text-red-500">Error al cargar etiquetas.</div>';
        }
    }

    // Listener para el nuevo botón de editar propiedades de etiqueta
    document.getElementById('labels-list')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-label-properties-btn');
        if (editBtn) {
            document.getElementById('edit-labels-modal').classList.add('hidden'); // <-- AÑADIDO: Cierra el modal actual
            // Navega al panel de Etiquetas IA y abre el modal de edición
            window.appInstance.switchPanel('smart-labels');
            setTimeout(() => document.querySelector(`.edit-smart-label-btn[data-id="${editBtn.dataset.labelId}"]`)?.click(), 200);
        }
    });

    async function handleCreateLabel(e) {
        e.preventDefault();
        const nameInput = document.getElementById('new-label-name');
        const colorInput = document.getElementById('new-label-color');
        const rawName = nameInput.value.trim();
        const userId = window.auth.getSession()?.user?.id;
        if (!rawName || !userId) return;

        try {
            // Normalizar nombre: primera letra mayúscula, resto minúsculas
            const normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

            // Verificar si ya existe una etiqueta con este nombre normalizado
            const existingLabel = allLabelsData.find(
                label => label.user_id === userId &&
                    normalizeLabelName(label.name) === normalizeLabelName(normalizedName)
            );

            if (existingLabel) {
                // Si existe, usar la existente
                window.showToast?.('Esta etiqueta ya existe (puede tener diferente capitalización).', 'info');
                nameInput.value = '';
                openLabelsModal();
                return;
            }

            const { data, error } = await window.auth.sb.from('labels').insert({
                name: normalizedName,
                color: colorInput.value,
                user_id: userId
            }).select();
            if (error) throw error;
            logImport('label creada vía formulario', data);

            if (Array.isArray(data) && data.length) {
                const createdLabel = data[0];
                allLabelsData = allLabelsData.filter(label => label.id !== createdLabel.id);
                allLabelsData.push(createdLabel);
                renderLabelFilterOptions();
            }

            nameInput.value = '';
            openLabelsModal(); // Recarga el modal para mostrar la nueva etiqueta
        } catch (e) {
            console.error('Error al crear etiqueta:', e.message);
            alert(`No se pudo crear la etiqueta. Error: ${e.message}\n\nRevisa si la columna 'evolution_label_id' en Supabase permite valores nulos.`);
        }
    }

    async function handleSaveChanges() {
        const button = document.getElementById('save-labels-btn');
        button.disabled = true;
        button.textContent = 'Guardando...';
        try {
            const newLabelName = document.getElementById('new-label-name').value.trim();
            const newLabelColor = document.getElementById('new-label-color').value;
            const userId = window.auth.getSession()?.user?.id;
            let newLabelNameToAdd = null;

            // 1. Si hay una nueva etiqueta, la creamos primero.
            if (newLabelName && userId) {
                // Normalizar nombre: primera letra mayúscula, resto minúsculas
                const normalizedNewLabelName = newLabelName.trim().charAt(0).toUpperCase() + newLabelName.trim().slice(1).toLowerCase();

                // Verificar si ya existe
                const existing = allLabelsData.find(
                    label => label.user_id === userId &&
                        normalizeLabelName(label.name) === normalizeLabelName(normalizedNewLabelName)
                );

                if (existing) {
                    newLabelNameToAdd = existing.name; // Usar la existente
                } else {
                    const { data: newLabel, error } = await window.auth.sb.from('labels')
                        .insert({ name: normalizedNewLabelName, color: newLabelColor, user_id: userId })
                        .select()
                        .single();
                    if (error) throw new Error(`Error al crear la nueva etiqueta: ${error.message}`);
                    newLabelNameToAdd = newLabel.name;
                    allLabelsData.push(newLabel); // Actualizar caché
                }

                // Añadimos la nueva etiqueta a la lista de etiquetas a agregar.
                allLabelsData.push(newLabel); // Actualizar caché local de etiquetas
                renderLabelFilterOptions();
                document.getElementById('new-label-name').value = ''; // Limpiar input
            }

            // 2. Obtener las etiquetas seleccionadas y deseleccionadas en el modal
            const labelsToAdd = new Set();
            document.querySelectorAll('#labels-list .label-checkbox:checked').forEach(cb => labelsToAdd.add(cb.dataset.labelName));
            if (newLabelName) labelsToAdd.add(newLabelName); // Añadir la nueva etiqueta creada

            const labelsToRemove = new Set();
            document.querySelectorAll('.label-checkbox:not(:checked)').forEach(cb => labelsToRemove.add(cb.dataset.labelName));

            // 3. Preparar las actualizaciones para cada contacto
            const updates = [];
            for (const contactId of selectedContactIds) {
                const contact = allContactsData.find(c => c.id == contactId);
                if (!contact) continue;

                let finalLabelsSet = new Set(contact.labels || []);
                labelsToAdd.forEach(label => finalLabelsSet.add(label));
                labelsToRemove.forEach(label => finalLabelsSet.delete(label));

                const finalLabelsArray = Array.from(finalLabelsSet);
                updates.push(
                    window.auth.sb.from('contacts').update({ labels: finalLabelsArray }).eq('id', contactId)
                );
            } // CORRECCIÓN: La llave estaba mal ubicada
            // --- FIN: LÃ³gica mejorada ---

            await Promise.all(updates);
            window.showToast?.('Etiquetas guardadas correctamente.', 'success');
            document.getElementById('edit-labels-modal').classList.add('hidden');

            // Tareas post-guardado (notificaciones, etc.) se ejecutan después de confirmar el guardado.
            // Esto evita que un fallo en una notificación impida que se guarden las etiquetas.
            triggerPostSaveActions(labelsToAdd, selectedContactIds);

            // Recarga la tabla para mostrar los cambios
            await updatePage(currentPage);

            selectedContactIds.clear();
            updateBulkActionsBar();
        } catch (e) {
            console.error('Error al guardar cambios:', e);
            window.showToast?.(`No se pudieron guardar los cambios: ${e.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Guardar Cambios';
        }
    }

    async function triggerPostSaveActions(addedLabels, contactIds) {
        const userId = window.auth.getSession()?.user?.id;
        if (!userId || addedLabels.size === 0 || contactIds.size === 0) return;

        try {
            // 1. Disparar seguimientos automáticos
            const { data: activeFollowups } = await window.auth.sb.from('followups')
                .select('target_label')
                .eq('user_id', userId)
                .eq('is_active', true);
            const followupLabels = new Set((activeFollowups || []).map(f => f.target_label));

            for (const label of addedLabels) {
                if (followupLabels.has(label)) {
                    for (const contactId of contactIds) {
                        fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/start-followup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contact_id: contactId, user_id: userId, target_label: label })
                        }).catch(err => console.error(`Error al activar seguimiento para ${contactId}:`, err));
                    }
                }
            }

            // 2. Enviar notificaciones si es necesario
            const labelsThatNotify = allLabelsData.filter(l => l.notify_on_assign && addedLabels.has(l.name));
            for (const label of labelsThatNotify) {
                for (const contactId of contactIds) {
                    const contact = allContactsData.find(c => c.id == contactId);
                    if (!contact) continue;
                    fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/notificarlabel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: userId, contact_name: contact.full_name || 'Sin nombre', contact_phone: contact.phone_number, assigned_label: label.name })
                    }).catch(err => console.error(`Error al enviar notificación para ${contactId}:`, err));
                }
            }
        } catch (error) {
            console.error("Error en las acciones post-guardado:", error);
        }
    }

    function escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (/[",\n]/.test(stringValue)) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
    }

    async function convertFileToCsvText(file) {
        const lowerName = (file.name || '').toLowerCase();

        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
            if (typeof XLSX === 'undefined') {
                throw new Error('No se pudo cargar el lector de hojas de cálculo (XLSX). Recarga la página e intenta nuevamente.');
            }

            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            if (!workbook.SheetNames.length) {
                throw new Error('El archivo de Excel no contiene hojas válidas.');
            }

            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            return XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n' });
        }

        return await file.text();
    }

    async function ensureLabelsConfigured(labelNames, userId) {
        if (!labelNames || !labelNames.length || !userId) return;

        // 1. Normalizar nombres a Title Case y eliminar duplicados case-insensitive
        const uniqueMap = new Map();
        for (const rawName of labelNames) {
            const trimmed = rawName?.trim();
            if (!trimmed) continue;
            // Normalizar a Title Case (primera mayúscula, resto minúsculas)
            const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            const key = normalized.toLowerCase();
            if (!uniqueMap.has(key)) uniqueMap.set(key, normalized);
        }
        const normalizedNames = Array.from(uniqueMap.values());
        if (!normalizedNames.length) return;
        logImport('verificando etiquetas detectadas', normalizedNames);

        // 2. Obtener nombres canónicos usando función SQL (evita duplicados case-insensitive)
        const canonicalNames = await Promise.all(
            normalizedNames.map(async (name) => {
                try {
                    const { data, error } = await window.auth.sb.rpc('get_canonical_label_name', {
                        p_user_id: userId,
                        p_label_name: name
                    });
                    if (error) throw error;
                    // Si existe, usar el nombre canónico; si no, usar el normalizado
                    return data || name;
                } catch (e) {
                    console.warn(`Error al obtener nombre canónico para "${name}":`, e);
                    return name; // Fallback al nombre normalizado
                }
            })
        );

        // 3. Cargar todas las etiquetas del usuario si no están en caché
        if (!allLabelsData.length) {
            try {
                allLabelsData = await fetchAllUserLabels();
            } catch (error) {
                console.error('No se pudo cargar la lista de etiquetas:', error);
                throw new Error('No se pudo cargar la lista de etiquetas actuales.');
            }
        }

        // 4. Mapear nombres canónicos a etiquetas existentes
        const existingByName = new Map(
            allLabelsData
                .filter(label => label.user_id === userId)
                .map(label => [label.name.toLowerCase(), label])
        );

        // 5. Preparar configuraciones de etiquetas (usar nombres canónicos)
        const labelConfigs = canonicalNames.map(canonicalName => {
            const existing = existingByName.get(canonicalName.toLowerCase());
            return {
                name: canonicalName, // Usar nombre canónico
                color: existing?.color || getRandomColor(),
                isNew: !existing
            };
        });

        if (!labelConfigs.length) return;

        logImport('colores de etiquetas asignados automáticamente', labelConfigs);

        // 6. Filtrar solo las que necesitan ser creadas o actualizadas
        const labelsPayload = labelConfigs
            .filter(cfg => {
                const existing = existingByName.get(cfg.name.toLowerCase());
                if (!existing) return true; // Nueva etiqueta
                // Actualizar solo si el color cambió
                return (existing.color || '').toLowerCase() !== cfg.color.toLowerCase();
            })
            .map(cfg => ({
                user_id: userId,
                name: cfg.name, // Ya está en Title Case y es canónico
                color: cfg.color
            }));

        if (!labelsPayload.length) {
            // Solo actualizar colores en caché si es necesario
            labelConfigs.forEach(cfg => {
                const key = cfg.name.toLowerCase();
                const existing = existingByName.get(key);
                if (existing) existing.color = cfg.color;
            });
            return;
        }

        // 7. Upsert etiquetas (el trigger SQL normalizará y evitará duplicados)
        const { data, error } = await window.auth.sb
            .from('labels')
            .upsert(labelsPayload, { onConflict: 'user_id,name' })
            .select();

        if (error) {
            // Si falla por duplicado case-insensitive, intentar obtener nombres canónicos y re-upsert
            console.warn('Error en upsert inicial, intentando con nombres canónicos:', error);
            // El trigger SQL debería manejar esto, pero si falla, intentamos de nuevo
            throw error;
        }

        logImport('etiquetas upsert', { requested: labelsPayload.length, persisted: data?.length ?? 0 });

        // 8. Actualizar caché local
        const persistedByName = new Map((data || []).map(item => [item.name.toLowerCase(), item]));

        labelConfigs.forEach(cfg => {
            const key = cfg.name.toLowerCase();
            const persisted = persistedByName.get(key);
            let existing = allLabelsData.find(l => l.user_id === userId && l.name.toLowerCase() === key);

            if (existing) {
                existing.color = cfg.color;
                existing.name = persisted?.name || existing.name;
                if (persisted?.id) existing.id = persisted.id;
            } else if (persisted) {
                allLabelsData.push({
                    id: persisted.id,
                    user_id: userId,
                    name: persisted.name,
                    color: persisted.color || cfg.color
                });
            }

            existingByName.set(key, {
                id: persisted?.id || existing?.id || null,
                user_id: userId,
                name: persisted?.name || existing?.name || cfg.name,
                color: cfg.color
            });
        });

        renderLabelFilterOptions();
    }
    async function openLabelColorModal(labelConfigs) {
        if (!labelConfigs.length) return [];

        const modal = document.getElementById('new-labels-modal');
        const tbody = document.getElementById('new-labels-table-body');
        const errorEl = document.getElementById('new-labels-error');
        const confirmBtn = document.getElementById('confirm-new-labels-btn');
        const cancelBtn = document.getElementById('cancel-new-labels-btn');
        const closeBtn = document.getElementById('close-new-labels-btn');

        if (!modal || !tbody || !errorEl || !confirmBtn || !cancelBtn || !closeBtn) {
            return labelConfigs;
        }

        return await new Promise(resolve => {
            let resolved = false;

            const cleanup = () => {
                modal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
                modal.removeEventListener('click', handleBackdrop);
                document.removeEventListener('keydown', handleKeydown);
                tbody.innerHTML = '';
                errorEl.textContent = '';
                errorEl.classList.add('hidden');
            };

            const finish = value => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(value);
            };

            const handleConfirm = () => {
                const rows = Array.from(tbody.querySelectorAll('tr'));
                const result = rows.map(row => {
                    const name = row.dataset.labelName;
                    const colorInput = row.querySelector('input[type="color"]');
                    const color = (colorInput?.value || '#2563eb').toLowerCase();
                    const isNew = row.dataset.isNew === 'true';
                    return { name, color, isNew };
                });

                if (result.some(item => !item.name)) {
                    errorEl.textContent = 'Cada etiqueta debe tener un nombre válido.';
                    errorEl.classList.remove('hidden');
                    return;
                }

                finish(result);
            };

            const handleCancel = () => finish(null);

            const handleBackdrop = event => {
                if (event.target === modal) finish(null);
            };

            const handleKeydown = event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    finish(null);
                }
            };

            tbody.innerHTML = labelConfigs.map(cfg => `
                <tr data-label-name="${cfg.name}" data-is-new="${cfg.isNew ? 'true' : 'false'}">
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-slate-800">${cfg.name}</span>
                            ${cfg.isNew ? '<span class="text-xs bg-green-100 text-green-700 font-semibold py-0.5 px-2 rounded-full">Nueva</span>' : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <input type="color" value="${cfg.color || getRandomColor()}" class="h-10 w-16 border border-slate-300 rounded">
                    </td>
                </tr>
            `).join('');

            document.body.classList.add('overflow-hidden');
            modal.classList.remove('hidden');
            errorEl.textContent = '';
            errorEl.classList.add('hidden');

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
            modal.addEventListener('click', handleBackdrop);
            document.addEventListener('keydown', handleKeydown);
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: modal });
            }
        });
    }

    function getRandomColor() {
        const randomChannel = () => Math.floor(180 + Math.random() * 60);
        const r = randomChannel().toString(16).padStart(2, '0');
        const g = randomChannel().toString(16).padStart(2, '0');
        const b = randomChannel().toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    async function handleCsvImport(event) {
        const input = event.target;
        const file = input?.files?.[0];
        if (!file) return;

        closeExportMenu();

        const skippedRows = [];
        const processedRows = [];
        let mapping = null;
        let finalPayload = [];

        try {
            let activeAppId = await resolveActiveAppId().catch(() => null);

            // Validar que el app_id existe en la tabla apps antes de usarlo
            if (activeAppId) {
                try {
                    const { data: appExists, error: appError } = await window.auth.sb
                        .from('apps')
                        .select('id')
                        .eq('id', activeAppId)
                        .single();

                    if (appError || !appExists) {
                        console.warn('[contacts-import] app_id no válido, se omitirá:', activeAppId);
                        activeAppId = null;
                    }
                } catch (err) {
                    console.warn('[contacts-import] Error al validar app_id:', err);
                    activeAppId = null;
                }
            }

            const csvText = await convertFileToCsvText(file);
            const rawLines = csvText
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0);
            logImport('archivo leído', { name: file.name, lineCount: rawLines.length });

            if (!rawLines.length) {
                window.showToast?.('El archivo de contactos está vacío.', 'info');
                return;
            }

            const headers = parseCsvRow(rawLines[0]).map(h => h.trim());
            mapping = await mapContactsCsvColumns(headers);
            logImport('mapeo de columnas', { headers, mapping });
            if (!mapping) {
                window.showToast?.('Importación cancelada.', 'info');
                return;
            }

            const dataRows = rawLines.slice(1);
            const impersonatedUser = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
            const targetUserId = impersonatedUser ? impersonatedUser.id : window.auth.getSession()?.user?.id;
            logImport('targetUserId detectado', targetUserId);
            if (!targetUserId) {
                throw new Error('No se pudo determinar el usuario destino para la importación.');
            }

            // --- INICIO: REFACTORIZACION COMPLETA DE LA LOGICA DE IMPORTACION ---
            const { data: existingContacts, error: existingError } = await window.auth.sb
                .from('contacts')
                .select('id, phone_number, labels, full_name, followup_status, current_followup_id, followup_step_sent, last_followup_sent_at, chatwoot_contact_id, assigned_to_id, razon_de_label_auto, created_at')
                .eq('user_id', targetUserId);
            if (existingError) throw existingError;

            const existingContactsMap = new Map();
            (existingContacts || []).forEach(contact => {
                const normalized = cleanPhone(contact.phone_number);
                if (normalized) {
                    // Asegurar que labels siempre sea un array
                    if (!Array.isArray(contact.labels)) {
                        contact.labels = contact.labels ? [contact.labels] : [];
                    }
                    existingContactsMap.set(normalized, contact);
                }
            });

            const contactsToUpsert = new Map();
            const labelsDetected = new Set();

            dataRows.forEach((row, rowIndex) => {
                const rowNumber = rowIndex + 2;
                const columns = parseCsvRow(row);
                const rawPhone = getColumnValue(columns, mapping.phone_number)?.trim();

                if (!rawPhone) {
                    skippedRows.push({ rowNumber, reason: 'Sin telefono', rawPhone });
                    return;
                }

                const normalizedPhone = cleanPhone(rawPhone);
                if (!normalizedPhone) {
                    skippedRows.push({ rowNumber, reason: 'Telefono invalido', rawPhone });
                    return;
                }

                const existingContact = existingContactsMap.get(normalizedPhone);
                logImport('fila procesada', { rowNumber, normalizedPhone, existing: Boolean(existingContact) });
                const payload = {
                    user_id: targetUserId,
                    phone_number: normalizedPhone,
                };

                // Solo agregar app_id si es válido
                if (activeAppId) {
                    payload.app_id = activeAppId;
                }

                const incomingName = getColumnValue(columns, mapping.full_name)?.trim();
                // Si hay un nombre existente y el nuevo es inválido, preservar el existente
                if (existingContact?.full_name && !isInvalidName(existingContact.full_name)) {
                    // Si el nombre entrante es inválido, usar el existente
                    if (isInvalidName(incomingName)) {
                        payload.full_name = existingContact.full_name;
                    } else if (incomingName) {
                        // Si hay nombre entrante válido, usarlo
                        payload.full_name = incomingName;
                    } else {
                        // Si no hay nombre entrante, preservar el existente
                        payload.full_name = existingContact.full_name;
                    }
                } else if (incomingName && !isInvalidName(incomingName)) {
                    // Solo usar el nombre entrante si es válido
                    payload.full_name = incomingName;
                }

                // SIEMPRE hacer merge de etiquetas - nunca reemplazar
                const existingLabels = new Set();

                // Agregar todas las etiquetas existentes (asegurar que es array)
                if (existingContact?.labels) {
                    const existingArray = Array.isArray(existingContact.labels)
                        ? existingContact.labels
                        : [existingContact.labels];
                    existingArray
                        .filter(Boolean)
                        .map(label => String(label).trim())
                        .filter(label => label.length > 0)
                        .forEach(label => existingLabels.add(label));
                }

                // Agregar etiquetas del CSV
                const labelsFromCsv = splitLabels(getColumnValue(columns, mapping.labels));
                if (labelsFromCsv) {
                    labelsFromCsv
                        .map(label => String(label).trim())
                        .filter(label => label && label.length > 0 && label.toLowerCase() !== 'ignorar')
                        .forEach(label => existingLabels.add(label));
                }

                // SIEMPRE incluir las etiquetas combinadas (aunque esté vacío, para preservar el merge)
                const mergedLabels = Array.from(existingLabels).filter(Boolean);
                // Incluir labels siempre, incluso si está vacío, para que el upsert preserve el merge
                payload.labels = mergedLabels.length > 0 ? mergedLabels : (existingContact?.labels || []);
                (mergedLabels.length ? mergedLabels : []).forEach(label => {
                    if (label.toLowerCase() !== 'ignorar') {
                        labelsDetected.add(label);
                    }
                });

                contactsToUpsert.set(normalizedPhone, sanitizeContactPayload(payload));
                processedRows.push({
                    rowNumber,
                    phone: normalizedPhone,
                    fullName: payload.full_name || '',
                    labels: mergedLabels.join(', ')
                });
            });

            logImport('contactsToUpsert size', contactsToUpsert.size);

            if (labelsDetected.size > 0) {
                await ensureLabelsConfigured(Array.from(labelsDetected), targetUserId);
            }

            finalPayload = Array.from(contactsToUpsert.values());
            logImport('payload preparado', {
                totalRows: dataRows.length,
                payloadCount: finalPayload.length,
                skipped: skippedRows.length,
                sample: finalPayload.slice(0, 3),
                phones: finalPayload.map(item => item.phone_number)
            });
            window.lastContactImport = {
                stage: 'beforeUpsert',
                totalRows: dataRows.length,
                processedRows,
                skippedRows,
                mapping,
                finalPayload,
                targetUserId
            };
            if (!finalPayload.length) {
                window.lastContactImport = {
                    totalRows: dataRows.length,
                    processedRows,
                    skippedRows,
                    finalPayload
                };

                if (skippedRows.length) {
                    console.warn('Importacion de contactos sin filas validas.', { skippedRows, headers, mapping });
                    if (typeof console.table === 'function') {
                        console.table(skippedRows);
                    }
                }

                window.showToast?.(skippedRows.length > 0 ? `No se detectaron contactos válidos. ${skippedRows.length} filas omitidas.` : 'El archivo no contiene contactos para importar.', 'warning');
                return;
            }

            const { data: upsertedRows, error } = await window.auth.sb
                .from('contacts')
                .upsert(finalPayload, { onConflict: 'user_id,phone_number' })
                .select('id, phone_number, user_id');

            if (error) throw error;
            logImport('upsert completado', { insertedOrUpdated: upsertedRows?.length ?? 0, sample: upsertedRows?.slice?.(0, 3) });

            window.lastContactImport = {
                stage: 'afterUpsert',
                totalRows: dataRows.length,
                processedRows,
                skippedRows,
                finalPayload,
                upserted: upsertedRows,
                targetUserId
            };

            if (typeof console.table === 'function' && processedRows.length) {
                console.table(processedRows);
            }

            if (skippedRows.length) {
                console.warn('Filas omitidas durante la importacion.', skippedRows);
                if (typeof console.table === 'function') {
                    console.table(skippedRows);
                }
                window.showToast?.(`${skippedRows.length} filas se omitieron. Revisa la consola para detalles.`, 'info');
            }

            console.info('Resumen de la importacion de contactos', {
                totalRows: dataRows.length,
                enviados: finalPayload.length,
                omitidos: skippedRows.length,
                vistaPrevia: processedRows.slice(0, 10)
            });

            const successMessage = `${finalPayload.length} contactos importados/actualizados con exito.`;
            window.showToast?.(successMessage, 'success');
            await loadAndRender();
            // --- FIN: REFACTORIZACION ---
        } catch (error) {
            logImport('error durante importación', error);
            if (error?.message === 'IMPORTACION_CANCELADA') {
                return;
            }

            const errorDetails = error?.details || error?.hint || '';
            const baseMessage = error?.message ? `Error al importar: ${error.message}` : 'Error desconocido al importar contactos.';
            const extendedMessage = errorDetails ? `${baseMessage} (${errorDetails})` : baseMessage;

            console.error('Error al importar contactos:', {
                error,
                finalPayload,
                skippedRows,
                processedRows,
                mapping
            });
            window.lastContactImport = {
                stage: 'error',
                error,
                finalPayload,
                skippedRows,
                processedRows,
                mapping
            };

            window.showToast?.(extendedMessage, 'error');
        } finally {
            if (input) input.value = '';
        }
    }


    function parseCsvRow(row) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"' && (i === 0 || row[i - 1] !== '"')) {
                if (inQuotes && row[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    async function mapContactsCsvColumns(headers) {
        const fieldDefinitions = [
            { field: 'phone_number', label: 'Teléfono', required: true, aliases: ['phone_number', 'telefono', 'teléfono', 'tel', 'phone', 'mobile', 'celular', 'whatsapp'] },
            { field: 'full_name', label: 'Nombre', required: false, aliases: ['full_name', 'nombre', 'name', 'contacto'] },
            { field: 'labels', label: 'Etiquetas', required: false, aliases: ['labels', 'etiquetas', 'tags'] },
        ];

        if (typeof window.openColumnMappingModal === 'function') {
            return await window.openColumnMappingModal(fieldDefinitions, headers);
        }

        return autoMapHeaders(headers, fieldDefinitions);
    }

    function autoMapHeaders(headers, fieldDefinitions) {
        const mapping = {};
        const usedIndexes = new Set();
        const lowerHeaders = headers.map(h => h.toLowerCase());

        for (const def of fieldDefinitions) {
            let index = -1;
            for (const alias of def.aliases || []) {
                const idx = lowerHeaders.indexOf(alias.toLowerCase());
                if (idx !== -1 && !usedIndexes.has(idx)) {
                    index = idx;
                    break;
                }
            }

            if (index === -1) {
                index = headers.findIndex((_, idx) => !usedIndexes.has(idx));
            }

            if (index === -1) {
                if (def.required) return null;
                continue;
            }

            mapping[def.field] = index;
            usedIndexes.add(index);
        }

        return mapping;
    }

    function getColumnValue(columns, index) {
        if (typeof index !== 'number' || index < 0 || index >= columns.length) return '';
        return columns[index];
    }

    function splitLabels(rawValue) {
        if (!rawValue) return null;

        const trimmed = rawValue.trim();
        if (!trimmed) return null;

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                const fromJson = parsed.map(item => String(item ?? '').trim()).filter(Boolean);
                if (fromJson.length) return fromJson;
            }
        } catch (_) {
            // not JSON; continue
        }

        const normalized = trimmed
            .replace(/^\[(.*)\]$/, '$1')
            .replace(/\r?\n/g, ',');

        const labels = normalized
            .split(/[;,|]/)
            .map(label => label.trim())
            .filter(Boolean);

        return labels.length ? labels : null;
    }


    function cleanPhone(value) {
        if (!value) return '';
        const digits = String(value).replace(/\D+/g, '');
        if (digits.length < 10) return '';
        const nationalNumber = digits.slice(-10);
        return '+521' + nationalNumber;
    }

    function sanitizeContactPayload(payload) {
        const cleaned = {};
        Object.entries(payload || {}).forEach(([key, value]) => {
            if (value === undefined) return;
            if (Array.isArray(value) && value.length === 0 && key === 'labels') return;
            cleaned[key] = value;
        });
        return cleaned;
    }

    // Función para verificar si un nombre es "sin-nombre" o similar
    function isInvalidName(name) {
        if (!name) return true;
        const normalized = name.trim().toLowerCase();
        const invalidNames = ['sin nombre', 'sin-nombre', 'sin_nombre', 'sinnombre', 'n/a', 'na', 'none', 'null', ''];
        return invalidNames.includes(normalized);
    }

    // Función para manejar la edición de nombre
    async function handleNameEdit(input) {
        const contactId = input.dataset.contactId;
        const newName = input.value.trim();
        const editableDiv = input.closest('.contact-name-editable');
        const display = editableDiv?.querySelector('.contact-name-display');
        const originalName = editableDiv?.dataset.originalName || '';

        if (!contactId) return;

        // Si el nuevo nombre está vacío o es inválido, restaurar el original
        if (isInvalidName(newName)) {
            input.value = originalName || '';
            cancelNameEdit(input);
            window.showToast?.('El nombre no puede estar vacío o ser "sin nombre".', 'warning');
            return;
        }

        try {
            const { error } = await window.auth.sb
                .from('contacts')
                .update({ full_name: newName })
                .eq('id', contactId);

            if (error) throw error;

            // Actualizar en la UI
            if (display) {
                display.textContent = newName;
                editableDiv.dataset.originalName = newName;
            }

            // Actualizar en el caché local
            const contact = allContactsData.find(c => c.id === contactId);
            if (contact) {
                contact.full_name = newName;
            }

            input.classList.add('hidden');
            display?.classList.remove('hidden');

            window.showToast?.('Nombre actualizado correctamente.', 'success');
        } catch (error) {
            console.error('Error al actualizar nombre:', error);
            window.showToast?.(`Error al actualizar nombre: ${error.message}`, 'error');
            cancelNameEdit(input);
        }
    }

    // Función para cancelar la edición
    function cancelNameEdit(input) {
        const editableDiv = input.closest('.contact-name-editable');
        const display = editableDiv?.querySelector('.contact-name-display');
        const originalName = editableDiv?.dataset.originalName || '';

        input.value = originalName;
        input.classList.add('hidden');
        display?.classList.remove('hidden');
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
                console.warn('[contacts-import] No se pudo refrescar teamInfo:', err);
            }
            const loaded = extractActiveAppId();
            if (loaded) return loaded;
        }

        const stored = localStorage.getItem('active_app_id');
        return stored || null;
    }

    async function checkSyncPrerequisites() {
        const btn = document.getElementById('sync-contacts-btn');
        const statusContainer = document.getElementById('contacts-status-container');
        if (!btn || !statusContainer) return;

        btn.disabled = true;

        try {
            const session = window.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) return;

            const { data, error } = await window.auth.sb
                .from('profiles')
                .select('whatsapp_connected, sync_status')
                .eq('id', userId)
                .single();

            if (error) throw error;
            const whatsappConnected = data?.whatsapp_connected;
            const syncStatus = data?.sync_status;

            if (!whatsappConnected) {
                statusContainer.innerHTML = `
                    <div class="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-r-lg">
                        <h4 class="font-bold">Acción requerida</h4>
                        <p class="text-sm mt-1">Debes conectar tu WhatsApp en el panel de <strong>Dashboard</strong> antes de poder sincronizar tus contactos.</p>
                    </div>`;
                btn.disabled = true;
                btn.innerHTML = 'Sincronizar Contactos y Etiquetas';
                return;
            }

            if (syncStatus === 'processing') {
                statusContainer.innerHTML = `
                    <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg animate-pulse">
                        <p class="text-sm font-medium">Hay una sincronización en progreso. La tabla se actualizará automáticamente al finalizar.</p>
                    </div>`;
                btn.disabled = true;
                pollSyncStatus();
            } else {
                statusContainer.innerHTML = '';
                btn.disabled = false;
                btn.innerHTML = 'Sincronizar Contactos y Etiquetas';
            }
        } catch (e) {
            console.error('Error al verificar pre-requisitos de sincronización:', e);
            btn.disabled = false;
            btn.innerHTML = 'Sincronizar Contactos y Etiquetas';
        }
    }

    function setupSyncButton() {
        const btn = document.getElementById('sync-contacts-btn');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            if (isSyncing) return;

            const user = window.auth.getSession()?.user;
            if (!user) {
                alert('Error: No se encontró sesión de usuario.');
                return;
            }

            isSyncing = true;
            btn.disabled = true;
            btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>`;

            try {
                // Usar Edge Function en lugar de n8n (más eficiente)
                const { data, error } = await window.auth.invokeFunction('sync-contacts', {
                    body: { user_id: user.id }
                });

                if (error) throw new Error(error.message || 'Error al iniciar la sincronización.');

                const statusContainer = document.getElementById('contacts-status-container');
                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg">
                            <h4 class="font-bold">Sincronización en progreso...</h4>
                            <p class="text-sm mt-1">Esto puede tardar varios minutos dependiendo de la cantidad de contactos. Te avisaremos cuando esté listo. Puedes seguir usando la aplicación.</p>
                        </div>`;
                }

                pollSyncStatus();
            } catch (e) {
                console.error('Error al iniciar la sincronización:', e);
                alert('Error al iniciar la sincronización.');
                btn.disabled = false;
                btn.innerHTML = 'Sincronizar Contactos y Etiquetas';
            } finally {
                isSyncing = false;
            }
        });
    }

    function pollSyncStatus() {
        const session = window.auth.getSession();
        const userId = session?.user?.id;
        if (!userId || syncStatusIntervalId) return;

        syncStatusIntervalId = setInterval(async () => {
            try {
                const { data, error } = await window.auth.sb
                    .from('profiles')
                    .select('sync_status')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                const syncStatus = data?.sync_status;

                if (syncStatus !== 'processing') {
                    clearInterval(syncStatusIntervalId);
                    syncStatusIntervalId = null;
                    const statusContainer = document.getElementById('contacts-status-container');
                    if (statusContainer) statusContainer.innerHTML = '';
                    const syncBtn = document.getElementById('sync-contacts-btn');
                    if (syncBtn) {
                        syncBtn.disabled = false;
                        syncBtn.innerHTML = 'Sincronizar Contactos y Etiquetas';
                    }

                    if (syncStatus === 'completed') {
                        window.showToast?.('Sincronización completada. La tabla se ha actualizado.', 'success');
                        // El realtime listener actualizará la tabla.
                    }
                }
            } catch (e) {
                console.error('Error durante el seguimiento de la sincronización:', e);
                clearInterval(syncStatusIntervalId);
                syncStatusIntervalId = null;
                const syncBtn = document.getElementById('sync-contacts-btn');
                if (syncBtn) {
                    syncBtn.disabled = false;
                    syncBtn.innerHTML = 'Sincronizar Contactos y Etiquetas';
                }
            }
        }, 10000);
    }

    function subscribeToContactChanges() {
        if (contactsRealtimeChannel) return;

        const userId = window.auth.getSession()?.user?.id;
        if (!userId) return;

        //         console.log('Suscribiéndose a cambios en la tabla de Contactos...');
        contactsRealtimeChannel = window.auth.sb
            .channel('public:contacts:contacts-table')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${userId}` },
                (payload) => {
                    console.log('Cambio recibido en Contactos:', payload);
                    clearTimeout(realtimeDebounceTimer);
                    realtimeDebounceTimer = setTimeout(() => {
                        window.showToast?.('La lista de contactos se ha actualizado.', 'info');
                        loadAndRender();
                    }, 2000);
                }
            )
            .subscribe();
    }

    function unsubscribeFromContactChanges() {
        if (contactsRealtimeChannel) {
            //             console.log('Desuscribiéndose de los cambios de Contactos.');
            try {
                window.auth.sb.removeChannel(contactsRealtimeChannel);
            } catch (e) {
                console.error('Error al desuscribir del canal de contactos:', e);
            }
            contactsRealtimeChannel = null;
        }
        closeExportMenu();
    }

    // ===== FUNCIONES DE VERIFICACIÓN DE CONTACTOS =====

    let verifyContactsState = {
        file: null,
        fileType: null,
        selectedSheet: null,
        workbook: null,
        headers: [],
        data: [],
        mapping: null,
        listName: null
    };

    function openVerifyContactsModal() {
        const modal = document.getElementById('verify-contacts-file-modal');
        if (!modal) {
            window.showToast?.('Error: No se encontró el modal de verificación.', 'error');
            return;
        }

        // Resetear estado
        verifyContactsState = {
            file: null,
            fileType: null,
            selectedSheet: null,
            workbook: null,
            headers: [],
            data: [],
            mapping: null,
            listName: null
        };

        const fileInput = document.getElementById('verify-contacts-file-input');
        if (fileInput) fileInput.value = '';

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        // Event listeners
        const closeBtn = document.getElementById('close-verify-file-modal-btn');
        const cancelBtn = document.getElementById('cancel-verify-file-btn');
        const confirmBtn = document.getElementById('confirm-verify-file-btn');
        const fileInputEl = document.getElementById('verify-contacts-file-input');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;

        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                try {
                    if (!fileInputEl?.files?.[0]) {
                        showVerifyError('verify-file-error', 'Por favor selecciona un archivo.');
                        return;
                    }

                    const file = fileInputEl.files[0];

                    // Validar que el archivo existe y es válido
                    if (!file || file.size === 0) {
                        showVerifyError('verify-file-error', 'El archivo seleccionado está vacío o no es válido.');
                        return;
                    }

                    await handleVerifyFileSelect(file);
                } catch (error) {
                    console.error('Error al seleccionar archivo:', error);
                    showVerifyError('verify-file-error', `Error: ${error.message || 'No se pudo leer el archivo. Asegúrate de que el archivo no esté corrupto.'}`);
                }
            };
        }

        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }
    }

    async function handleVerifyFileSelect(file) {
        try {
            const errorEl = document.getElementById('verify-file-error');
            if (errorEl) errorEl.classList.add('hidden');

            // Validar tamaño del archivo (máximo 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                showVerifyError('verify-file-error', `El archivo es muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo es 50MB.`);
                return;
            }

            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!['csv', 'xlsx', 'xls'].includes(extension)) {
                showVerifyError('verify-file-error', 'Formato no soportado. Usa CSV, XLSX o XLS.');
                return;
            }

            // Mostrar indicador de carga
            const confirmBtn = document.getElementById('confirm-verify-file-btn');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<span class="animate-spin">⏳</span> Cargando...';
            }

            verifyContactsState.file = file;
            verifyContactsState.fileType = extension;

            if (extension === 'csv') {
                // Para CSV, procesar directamente
                await processVerifyFile();
            } else {
                // Para XLSX/XLS, mostrar selector de hoja
                await showSheetSelector(file);
            }

            // Restaurar botón
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Continuar';
            }
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            const errorMsg = error.message || 'Error desconocido al procesar el archivo.';
            showVerifyError('verify-file-error', `Error: ${errorMsg}`);

            // Restaurar botón en caso de error
            const confirmBtn = document.getElementById('confirm-verify-file-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Continuar';
            }
        }
    }

    async function showSheetSelector(file) {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('No se pudo cargar el lector de hojas de cálculo (XLSX). Recarga la página.');
            }

            // Mostrar indicador de carga
            window.showToast?.('Leyendo archivo Excel, por favor espera...', 'info');

            // Leer solo los nombres de las hojas primero (más rápido)
            const arrayBuffer = await file.arrayBuffer();

            // Usar opciones para leer más rápido (solo nombres de hojas)
            const workbook = XLSX.read(arrayBuffer, {
                type: 'array',
                sheetStubs: true, // Solo leer estructura, no todos los datos
                cellDates: false,
                cellNF: false,
                cellStyles: false
            });

            verifyContactsState.workbook = workbook;

            const sheetNames = workbook.SheetNames;
            if (sheetNames.length === 0) {
                throw new Error('El archivo Excel no contiene hojas válidas.');
            }

            // Cerrar modal de archivo
            const fileModal = document.getElementById('verify-contacts-file-modal');
            if (fileModal) fileModal.classList.add('hidden');

            // Abrir modal de selección de hoja
            const sheetModal = document.getElementById('verify-contacts-sheet-modal');
            if (!sheetModal) {
                throw new Error('No se encontró el modal de selección de hoja.');
            }

            const select = document.getElementById('verify-sheet-select');
            if (select) {
                select.innerHTML = '';
                sheetNames.forEach((name, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = name;
                    select.appendChild(option);
                });
            }

            sheetModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');

            // Event listeners
            const closeBtn = document.getElementById('close-verify-sheet-modal-btn');
            const cancelBtn = document.getElementById('cancel-verify-sheet-btn');
            const confirmBtn = document.getElementById('confirm-verify-sheet-btn');

            const closeModal = () => {
                sheetModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
                openVerifyContactsModal(); // Volver al modal anterior
            };

            if (closeBtn) closeBtn.onclick = closeModal;
            if (cancelBtn) cancelBtn.onclick = closeModal;

            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const selectedIndex = parseInt(select?.value);
                    if (isNaN(selectedIndex)) {
                        showVerifyError('verify-sheet-error', 'Por favor selecciona una hoja.');
                        return;
                    }
                    verifyContactsState.selectedSheet = selectedIndex;
                    sheetModal.classList.add('hidden');
                    processVerifyFile();
                };
            }

            if (typeof lucide?.createIcons === 'function') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Error al leer archivo Excel:', error);
            let errorMessage = 'Error al leer el archivo Excel.';

            if (error.message) {
                errorMessage = error.message;
            } else if (error.name === 'QuotaExceededError' || error.name === 'RangeError') {
                errorMessage = 'El archivo es demasiado grande para procesar en el navegador. Intenta dividirlo en archivos más pequeños.';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'Error al leer el archivo. Asegúrate de que el archivo no esté abierto en otro programa y vuelve a intentarlo.';
            }

            showVerifyError('verify-file-error', errorMessage);
            window.showToast?.(errorMessage, 'error');

            // Restaurar botón
            const confirmBtn = document.getElementById('confirm-verify-file-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Continuar';
            }
        }
    }

    async function processVerifyFile() {
        try {
            // Mostrar indicador de progreso
            window.showToast?.('Procesando archivo, esto puede tardar unos momentos...', 'info');

            let csvText = '';

            if (verifyContactsState.fileType === 'csv') {
                csvText = await verifyContactsState.file.text();
            } else {
                // XLSX/XLS - Leer la hoja completa ahora
                window.showToast?.('Leyendo datos de la hoja seleccionada...', 'info');

                // Si el workbook no tiene los datos completos, leerlos ahora
                if (!verifyContactsState.workbook || !verifyContactsState.workbook.Sheets) {
                    const arrayBuffer = await verifyContactsState.file.arrayBuffer();
                    verifyContactsState.workbook = XLSX.read(arrayBuffer, {
                        type: 'array',
                        cellDates: false,
                        cellNF: false,
                        cellStyles: false
                    });
                }

                const workbook = verifyContactsState.workbook;
                const sheetIndex = verifyContactsState.selectedSheet ?? 0;
                const sheetName = workbook.SheetNames[sheetIndex];
                const worksheet = workbook.Sheets[sheetName];

                // Convertir a CSV con opciones optimizadas
                csvText = XLSX.utils.sheet_to_csv(worksheet, {
                    FS: ',',
                    RS: '\n',
                    blankrows: false // Omitir filas vacías
                });
            }

            window.showToast?.('Analizando estructura del archivo...', 'info');

            const rawLines = csvText
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (!rawLines.length) {
                throw new Error('El archivo está vacío.');
            }

            // Limitar a las primeras 100,000 filas para evitar problemas de memoria
            const maxRows = 100000;
            const limitedLines = rawLines.length > maxRows
                ? rawLines.slice(0, maxRows + 1) // +1 para incluir el header
                : rawLines;

            if (rawLines.length > maxRows) {
                window.showToast?.(`El archivo tiene ${rawLines.length} filas. Se procesarán las primeras ${maxRows} filas.`, 'warning');
            }

            const headers = parseCsvRow(limitedLines[0]).map(h => h.trim());
            const dataRows = limitedLines.slice(1).map(row => parseCsvRow(row));

            verifyContactsState.headers = headers;
            verifyContactsState.data = dataRows;

            window.showToast?.('Archivo procesado correctamente.', 'success');

            // Mostrar modal de mapeo
            await showVerifyMappingModal();
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            let errorMsg = 'Error desconocido al procesar el archivo.';

            if (error.message) {
                errorMsg = error.message;
            } else if (error.name === 'QuotaExceededError' || error.name === 'RangeError') {
                errorMsg = 'El archivo es demasiado grande. Intenta dividirlo en archivos más pequeños (máximo 100,000 filas).';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMsg = 'Error al leer el archivo. Asegúrate de que el archivo no esté abierto en otro programa.';
            }

            showVerifyError('verify-file-error', `Error: ${errorMsg}`);
            window.showToast?.(`Error: ${errorMsg}`, 'error');

            // Cerrar modales si hay error
            const fileModal = document.getElementById('verify-contacts-file-modal');
            const sheetModal = document.getElementById('verify-contacts-sheet-modal');
            if (fileModal) fileModal.classList.add('hidden');
            if (sheetModal) sheetModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }

    async function showVerifyMappingModal() {
        const modal = document.getElementById('verify-contacts-mapping-modal');
        if (!modal) {
            throw new Error('No se encontró el modal de mapeo.');
        }

        // Cerrar modales anteriores
        const fileModal = document.getElementById('verify-contacts-file-modal');
        const sheetModal = document.getElementById('verify-contacts-sheet-modal');
        if (fileModal) fileModal.classList.add('hidden');
        if (sheetModal) sheetModal.classList.add('hidden');

        // Mostrar previsualización
        const previewHeaders = document.getElementById('verify-preview-headers');
        const previewBody = document.getElementById('verify-preview-body');

        if (previewHeaders && previewBody) {
            previewHeaders.innerHTML = '';
            previewBody.innerHTML = '';

            // Headers
            verifyContactsState.headers.forEach(header => {
                const th = document.createElement('th');
                th.className = 'px-3 py-2 text-left font-semibold text-slate-700';
                th.textContent = header;
                previewHeaders.appendChild(th);
            });

            // Primeras 10 filas
            const previewRows = verifyContactsState.data.slice(0, 10);
            previewRows.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(cell => {
                    const td = document.createElement('td');
                    td.className = 'px-3 py-2 text-slate-600';
                    td.textContent = cell || '';
                    tr.appendChild(td);
                });
                previewBody.appendChild(tr);
            });
        }

        // Configurar mapeo de columnas
        const fieldDefinitions = [
            { field: 'phone_number', label: 'Teléfono', required: true, aliases: ['phone_number', 'telefono', 'teléfono', 'tel', 'phone', 'mobile', 'celular', 'whatsapp', 'numero', 'número'] },
            { field: 'full_name', label: 'Nombre', required: false, aliases: ['full_name', 'nombre', 'name', 'contacto'] },
            { field: 'labels', label: 'Etiquetas', required: false, aliases: ['labels', 'etiquetas', 'tags'] },
        ];

        const mappingTableBody = document.getElementById('verify-column-mapping-table-body');
        if (mappingTableBody) {
            mappingTableBody.innerHTML = '';
            const selects = [];

            fieldDefinitions.forEach(def => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-4 py-3">
                        <div class="flex flex-col">
                            <span class="font-medium text-slate-700">${def.label}</span>
                            <span class="mt-1 text-xs ${def.required ? 'text-red-500 font-semibold' : 'text-slate-400'}">${def.required ? 'Obligatorio' : 'Opcional'}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <select class="verify-column-select w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-field="${def.field}" data-required="${def.required}">
                            <option value="">${def.required ? 'Selecciona una columna' : 'Dejar sin asignar'}</option>
                        </select>
                    </td>
                `;
                const select = row.querySelector('select');
                selects.push(select);

                verifyContactsState.headers.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = String(index);
                    option.textContent = header;
                    select.appendChild(option);
                });

                // Auto-seleccionar si hay coincidencia
                const lowerHeaders = verifyContactsState.headers.map(h => h.toLowerCase());
                for (const alias of def.aliases || []) {
                    const idx = lowerHeaders.indexOf(alias.toLowerCase());
                    if (idx !== -1) {
                        select.value = String(idx);
                        break;
                    }
                }

                mappingTableBody.appendChild(row);
            });

            // Actualizar disponibilidad de opciones
            const updateAvailability = () => {
                const selectedValues = new Set(selects.map(s => s.value).filter(Boolean));
                selects.forEach(select => {
                    Array.from(select.options).forEach(option => {
                        if (!option.value) return;
                        option.disabled = select.value !== option.value && selectedValues.has(option.value);
                    });
                });
            };

            selects.forEach(select => {
                select.addEventListener('change', updateAvailability);
            });
            updateAvailability();
        }

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        // Event listeners
        const closeBtn = document.getElementById('close-verify-mapping-modal-btn');
        const cancelBtn = document.getElementById('cancel-verify-mapping-btn');
        const confirmBtn = document.getElementById('confirm-verify-mapping-btn');
        const listNameInput = document.getElementById('verify-list-name-input');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;

        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                // Validar nombre de lista
                const listName = listNameInput?.value?.trim();
                if (!listName) {
                    showVerifyError('verify-mapping-error', 'Por favor ingresa un nombre para la lista/etiqueta.');
                    return;
                }

                // Validar mapeo
                const mapping = {};
                const selects = document.querySelectorAll('.verify-column-select');
                let hasError = false;

                selects.forEach(select => {
                    const field = select.dataset.field;
                    const required = select.dataset.required === 'true';
                    const value = select.value;

                    if (!value && required) {
                        select.classList.add('border-red-500');
                        hasError = true;
                    } else {
                        select.classList.remove('border-red-500');
                        if (value) {
                            mapping[field] = Number(value);
                        }
                    }
                });

                if (hasError) {
                    showVerifyError('verify-mapping-error', 'Por favor completa todos los campos obligatorios.');
                    return;
                }

                verifyContactsState.mapping = mapping;
                verifyContactsState.listName = listName;

                closeModal();
                await handleContactVerification();
            };
        }

        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }
    }

    function showVerifyError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    }

    async function handleContactVerification() {
        try {
            window.showToast?.('Procesando archivo y extrayendo números...', 'info');

            // Extraer números según mapeo
            const numbers = [];
            const contactData = [];

            verifyContactsState.data.forEach((row, index) => {
                const phoneIndex = verifyContactsState.mapping.phone_number;
                if (phoneIndex === undefined || phoneIndex === null) return;

                const rawPhone = row[phoneIndex]?.trim();
                if (!rawPhone) return;

                const normalizedPhone = cleanPhone(rawPhone);
                if (!normalizedPhone) return;

                const contact = {
                    phone: normalizedPhone,
                    rowIndex: index + 2 // +2 porque empieza en fila 2 (después del header)
                };

                // Agregar nombre si está mapeado
                const nameIndex = verifyContactsState.mapping.full_name;
                if (nameIndex !== undefined && nameIndex !== null) {
                    contact.name = row[nameIndex]?.trim() || '';
                }

                // Agregar etiquetas si están mapeadas
                const labelsIndex = verifyContactsState.mapping.labels;
                if (labelsIndex !== undefined && labelsIndex !== null) {
                    const rawLabels = row[labelsIndex]?.trim();
                    if (rawLabels) {
                        contact.labels = splitLabels(rawLabels) || [];
                    }
                }

                numbers.push(normalizedPhone);
                contactData.push(contact);
            });

            if (numbers.length === 0) {
                window.showToast?.('No se encontraron números válidos en el archivo.', 'warning');
                return;
            }

            window.showToast?.(`Verificando ${numbers.length} números con WhatsApp...`, 'info');

            // Enviar a n8n para verificación
            const session = window.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) {
                throw new Error('No se pudo obtener la sesión del usuario.');
            }

            const webhookUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/verificar-contactos';
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numbers: numbers,
                    userId: userId,
                    listName: verifyContactsState.listName,
                    contactData: contactData
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor: ${errorText || response.statusText}`);
            }

            const result = await response.json();

            if (!result.verifiedNumbers || result.verifiedNumbers.length === 0) {
                window.showToast?.(`Ninguno de los ${result.totalProcessed || numbers.length} números verificados tiene WhatsApp.`, 'warning');
                return;
            }

            // Importar contactos verificados
            await importVerifiedContacts(result, verifyContactsState.listName);

        } catch (error) {
            console.error('Error en verificación de contactos:', error);
            window.showToast?.(`Error: ${error.message}`, 'error');
        }
    }

    async function importVerifiedContacts(result, listName) {
        try {
            window.showToast?.('Importando contactos verificados...', 'info');

            const session = window.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) {
                throw new Error('No se pudo obtener la sesión del usuario.');
            }

            let activeAppId = await resolveActiveAppId().catch(() => null);

            // Validar que el app_id existe en la tabla apps antes de usarlo
            if (activeAppId) {
                try {
                    const { data: appExists, error: appError } = await window.auth.sb
                        .from('apps')
                        .select('id')
                        .eq('id', activeAppId)
                        .single();

                    if (appError || !appExists) {
                        console.warn('[contacts-verify] app_id no válido, se omitirá:', activeAppId);
                        activeAppId = null;
                    }
                } catch (err) {
                    console.warn('[contacts-verify] Error al validar app_id:', err);
                    activeAppId = null;
                }
            }

            const verifiedNumbers = result.verifiedNumbers || [];
            const contactDataMap = new Map();

            // Crear mapa de datos de contactos por número
            if (result.contactData) {
                result.contactData.forEach(contact => {
                    contactDataMap.set(contact.phone, contact);
                });
            }

            // Obtener contactos existentes
            const { data: existingContacts, error: existingError } = await window.auth.sb
                .from('contacts')
                .select('id, phone_number, labels, full_name')
                .eq('user_id', userId);

            if (existingError) throw existingError;

            const existingContactsMap = new Map();
            (existingContacts || []).forEach(contact => {
                const normalized = cleanPhone(contact.phone_number);
                if (normalized) {
                    // Asegurar que labels siempre sea un array
                    if (!Array.isArray(contact.labels)) {
                        contact.labels = contact.labels ? [contact.labels] : [];
                    }
                    existingContactsMap.set(normalized, contact);
                }
            });

            // Preparar contactos para importar
            const contactsToUpsert = [];
            const labelsToEnsure = new Set([listName]);

            verifiedNumbers.forEach(verifiedNumber => {
                const existingContact = existingContactsMap.get(verifiedNumber);
                const contactInfo = contactDataMap.get(verifiedNumber) || {};

                const payload = {
                    user_id: userId,
                    phone_number: verifiedNumber,
                };

                // Solo agregar app_id si es válido
                if (activeAppId) {
                    payload.app_id = activeAppId;
                }

                // Nombre - Preservar nombre existente si el nuevo es inválido
                const incomingName = contactInfo.name?.trim();
                if (existingContact?.full_name && !isInvalidName(existingContact.full_name)) {
                    // Si hay nombre existente válido y el nuevo es inválido, preservar el existente
                    if (isInvalidName(incomingName)) {
                        payload.full_name = existingContact.full_name;
                    } else if (incomingName) {
                        // Si hay nombre entrante válido, usarlo
                        payload.full_name = incomingName;
                    } else {
                        // Si no hay nombre entrante, preservar el existente
                        payload.full_name = existingContact.full_name;
                    }
                } else if (incomingName && !isInvalidName(incomingName)) {
                    // Solo usar el nombre entrante si es válido
                    payload.full_name = incomingName;
                }

                // SIEMPRE hacer merge de etiquetas - nunca reemplazar
                const existingLabels = new Set();

                // Agregar todas las etiquetas existentes (asegurar que es array)
                if (existingContact?.labels) {
                    const existingArray = Array.isArray(existingContact.labels)
                        ? existingContact.labels
                        : [existingContact.labels];
                    existingArray
                        .filter(Boolean)
                        .map(label => String(label).trim())
                        .filter(label => label.length > 0)
                        .forEach(label => existingLabels.add(label));
                }

                // Agregar etiqueta de la lista
                if (listName && listName.trim()) {
                    existingLabels.add(listName.trim());
                }

                // Agregar etiquetas del archivo si existen
                if (contactInfo.labels) {
                    const labelsArray = Array.isArray(contactInfo.labels)
                        ? contactInfo.labels
                        : [contactInfo.labels];
                    labelsArray
                        .map(label => String(label).trim())
                        .filter(label => label && label.length > 0 && label.toLowerCase() !== 'ignorar')
                        .forEach(label => {
                            existingLabels.add(label);
                            labelsToEnsure.add(label);
                        });
                }

                // SIEMPRE incluir las etiquetas combinadas
                const mergedLabels = Array.from(existingLabels).filter(Boolean);
                // Incluir labels siempre para preservar el merge
                payload.labels = mergedLabels.length > 0 ? mergedLabels : (existingContact?.labels || []);

                contactsToUpsert.push(sanitizeContactPayload(payload));
            });

            if (contactsToUpsert.length === 0) {
                window.showToast?.('No hay contactos para importar.', 'warning');
                return;
            }

            // Asegurar que las etiquetas existan
            if (labelsToEnsure.size > 0) {
                await ensureLabelsConfigured(Array.from(labelsToEnsure), userId);
            }

            // Importar contactos en lotes para evitar problemas con muchos contactos
            const batchSize = 100;
            let totalUpserted = 0;
            let errors = [];

            for (let i = 0; i < contactsToUpsert.length; i += batchSize) {
                const batch = contactsToUpsert.slice(i, i + batchSize);

                try {
                    const { data: upsertedRows, error: upsertError } = await window.auth.sb
                        .from('contacts')
                        .upsert(batch, { onConflict: 'user_id,phone_number' })
                        .select('id, phone_number, user_id');

                    if (upsertError) {
                        console.error(`[contacts-verify] Error en lote ${Math.floor(i / batchSize) + 1}:`, upsertError);
                        errors.push({ batch: Math.floor(i / batchSize) + 1, error: upsertError });
                    } else {
                        totalUpserted += (upsertedRows?.length || 0);
                    }
                } catch (err) {
                    console.error(`[contacts-verify] Error al procesar lote ${Math.floor(i / batchSize) + 1}:`, err);
                    errors.push({ batch: Math.floor(i / batchSize) + 1, error: err });
                }
            }

            if (errors.length > 0 && totalUpserted === 0) {
                throw new Error(`Error al importar contactos: ${errors[0].error.message || 'Error desconocido'}`);
            }

            const upsertedRows = { length: totalUpserted };

            const successMessage = `${upsertedRows?.length || 0} contactos verificados importados con la etiqueta "${listName}".`;
            window.showToast?.(successMessage, 'success');

            // Recargar lista de contactos
            await loadAndRender();

        } catch (error) {
            console.error('Error al importar contactos verificados:', error);
            window.showToast?.(`Error al importar: ${error.message}`, 'error');
        }
    }

    // ===== FIN FUNCIONES DE VERIFICACIÓN =====

    window.contacts = {
        openLabelsModalForSingleContact: (contactId) => {
            if (!contactId) return;
            selectedContactIds.clear();
            selectedContactIds.add(contactId);
            openLabelsModal();
        },
        logLastImport: () => {
            console.info('[contacts-import] lastContactImport snapshot:', window.lastContactImport);
            return window.lastContactImport;
        },
        async verifySupabaseAccess(limit = 5) {
            try {
                const session = window.auth.getSession();
                const userId = session?.user?.id;
                if (!userId) {
                    console.warn('[contacts-import] verifySupabaseAccess: no active session');
                    return null;
                }

                const { data, error } = await window.auth.sb
                    .from('contacts')
                    .select('id, user_id, phone_number, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                console.info('[contacts-import] verifySupabaseAccess result:', data);
                return data;
            } catch (err) {
                console.error('[contacts-import] verifySupabaseAccess error:', err);
                return null;
            }
        },
        async debugInsertTestContact() {
            try {
                const session = window.auth.getSession();
                const userId = session?.user?.id;
                if (!userId) {
                    console.warn('[contacts-import] debugInsertTestContact: no active session');
                    return null;
                }

                const timestamp = Date.now();
                const phone = `+521000${String(timestamp).slice(-6)}`;
                const payload = {
                    user_id: userId,
                    phone_number: phone,
                    full_name: `Debug Contact ${timestamp}`,
                    labels: ['debug'],
                    followup_status: 'idle',
                    followup_step_sent: -1,
                    created_at: new Date().toISOString(),
                    razon_de_label_auto: null,
                    assigned_to_id: null,
                    current_followup_id: null,
                    last_followup_sent_at: null,
                    chatwoot_contact_id: null
                };

                const { data, error } = await window.auth.sb
                    .from('contacts')
                    .insert([payload])
                    .select('id, phone_number, created_at');

                if (error) throw error;
                console.info('[contacts-import] debugInsertTestContact result:', data);
                return data;
            } catch (err) {
                console.error('[contacts-import] debugInsertTestContact error:', err);
                throw err;
            }
        }
    };

    // ========== FUNCIONALIDAD PARA IMPORTAR NÚMEROS CON ETIQUETA ==========
    let numbersFileData = null;

    async function openImportNumbersLabelModal() {
        const modal = document.getElementById('import-numbers-label-modal');
        if (!modal || !modal.classList) return;

        modal.classList.remove('hidden');
        resetImportNumbersModal();
        await loadExistingLabels();
        setupImportNumbersModalListeners();
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    function closeImportNumbersModal() {
        const modal = document.getElementById('import-numbers-label-modal');
        if (modal && modal.classList) {
            modal.classList.add('hidden');
        }
        resetImportNumbersModal();
    }

    function resetImportNumbersModal() {
        numbersFileData = null;
        const fileInput = document.getElementById('numbers-file-input');
        const filePreview = document.getElementById('numbers-file-preview');
        const labelInput = document.getElementById('label-name-input');
        const labelSelect = document.getElementById('label-select');
        const newLabelContainer = document.getElementById('new-label-input-container');
        const progressDiv = document.getElementById('import-numbers-progress');
        const resultsDiv = document.getElementById('import-numbers-results');
        const confirmBtn = document.getElementById('confirm-import-numbers');

        if (fileInput) fileInput.value = '';
        if (filePreview && filePreview.classList) filePreview.classList.add('hidden');
        if (labelInput) labelInput.value = '';
        if (labelSelect) labelSelect.value = '';
        if (newLabelContainer && newLabelContainer.classList) newLabelContainer.classList.add('hidden');
        if (progressDiv && progressDiv.classList) progressDiv.classList.add('hidden');
        if (resultsDiv && resultsDiv.classList) resultsDiv.classList.add('hidden');
        if (confirmBtn) confirmBtn.disabled = false;
    }

    async function loadExistingLabels() {
        const labelSelect = document.getElementById('label-select');
        if (!labelSelect) return;

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) return;

            const { data, error } = await window.auth.sb
                .from('labels')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            // Limpiar opciones existentes (excepto las primeras dos)
            while (labelSelect.children.length > 2) {
                labelSelect.removeChild(labelSelect.lastChild);
            }

            // Agrupar etiquetas por nombre para evitar duplicados
            const uniqueLabels = (data || []).reduce((acc, current) => {
                if (!acc.some(item => item.name === current.name)) {
                    acc.push(current);
                }
                return acc;
            }, []);

            // Ordenar alfabéticamente
            uniqueLabels.sort((a, b) => a.name.localeCompare(b.name));

            // Agregar etiquetas al selector
            uniqueLabels.forEach(label => {
                const option = document.createElement('option');
                option.value = label.name;
                option.textContent = label.name;
                labelSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar etiquetas:', error);
        }
    }

    function setupImportNumbersModalListeners() {
        const dropZone = document.getElementById('numbers-file-drop-zone');
        const fileInput = document.getElementById('numbers-file-input');
        const removeFileBtn = document.getElementById('remove-numbers-file');
        const closeBtn = document.getElementById('close-import-numbers-modal');
        const cancelBtn = document.getElementById('cancel-import-numbers');
        const confirmBtn = document.getElementById('confirm-import-numbers');
        const labelSelect = document.getElementById('label-select');
        const newLabelContainer = document.getElementById('new-label-input-container');
        const labelInput = document.getElementById('label-name-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-blue-500', 'bg-blue-50');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
                if (e.dataTransfer.files.length) {
                    handleNumbersFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    handleNumbersFileSelect(e.target.files[0]);
                }
            });
        }

        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                numbersFileData = null;
                const fileInput = document.getElementById('numbers-file-input');
                const filePreview = document.getElementById('numbers-file-preview');
                if (fileInput) fileInput.value = '';
                if (filePreview && filePreview.classList) filePreview.classList.add('hidden');
            });
        }

        // Listener para el selector de etiquetas
        if (labelSelect && newLabelContainer && labelInput) {
            labelSelect.addEventListener('change', (e) => {
                const selectedValue = e.target.value;
                if (selectedValue === '__new__') {
                    // Mostrar input para nueva etiqueta
                    if (newLabelContainer && newLabelContainer.classList) {
                        newLabelContainer.classList.remove('hidden');
                    }
                    if (labelInput) {
                        labelInput.required = true;
                        labelInput.value = '';
                    }
                } else if (selectedValue) {
                    // Ocultar input y usar la etiqueta seleccionada
                    if (newLabelContainer && newLabelContainer.classList) {
                        newLabelContainer.classList.add('hidden');
                    }
                    if (labelInput) {
                        labelInput.required = false;
                        labelInput.value = '';
                    }
                } else {
                    // Nada seleccionado
                    if (newLabelContainer && newLabelContainer.classList) {
                        newLabelContainer.classList.add('hidden');
                    }
                    if (labelInput) {
                        labelInput.required = false;
                        labelInput.value = '';
                    }
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeImportNumbersModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeImportNumbersModal);
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleImportNumbersConfirm);
        }
    }

    async function handleNumbersFileSelect(file) {
        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let numbers = [];
            let rawLines = [];

            // Si es CSV o XLSX/XLS, usar la función de conversión existente
            if (['csv', 'xlsx', 'xls'].includes(fileExtension)) {
                // Convertir a CSV usando la función existente
                const csvText = await convertFileToCsvText(file);
                const lines = csvText
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                rawLines = lines;

                // Extraer números de todas las celdas (puede haber múltiples columnas)
                for (const line of lines) {
                    // Dividir por comas (formato CSV)
                    const cells = line.split(',').map(cell => cell.trim());

                    for (const cell of cells) {
                        // Extraer solo dígitos de cada celda
                        const digits = cell.replace(/\D/g, '');
                        if (digits.length >= 10) { // Mínimo 10 dígitos
                            numbers.push(digits);
                        }
                    }
                }
            } else {
                // Para archivos TXT, leer como texto plano
                const text = await file.text();
                const lines = text
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                rawLines = lines;

                // Extraer números de cada línea (puede tener espacios, guiones, etc.)
                numbers = lines
                    .map(line => {
                        // Extraer solo dígitos
                        const digits = line.replace(/\D/g, '');
                        return digits;
                    })
                    .filter(digits => digits.length >= 10); // Mínimo 10 dígitos
            }

            // Eliminar duplicados
            const uniqueNumbers = [...new Set(numbers)];

            numbersFileData = {
                file: file,
                numbers: uniqueNumbers,
                rawLines: rawLines
            };

            const filePreview = document.getElementById('numbers-file-preview');
            const fileName = document.getElementById('numbers-file-name');
            const numbersCount = document.getElementById('numbers-count');

            if (filePreview && filePreview.classList) filePreview.classList.remove('hidden');
            if (fileName) fileName.textContent = file.name;
            if (numbersCount) {
                numbersCount.textContent = `${uniqueNumbers.length} números únicos detectados`;
            }

            window.showToast?.(`Se detectaron ${uniqueNumbers.length} números válidos en el archivo.`, 'success');
        } catch (error) {
            console.error('Error al leer archivo:', error);
            window.showToast?.('Error al leer el archivo. Asegúrate de que sea un archivo válido (TXT, CSV, XLSX, XLS).', 'error');
        }
    }

    async function handleImportNumbersConfirm() {
        const labelSelect = document.getElementById('label-select');
        const labelNameInput = document.getElementById('label-name-input');

        let labelName = '';

        // Obtener el valor del selector o del input según corresponda
        if (labelSelect && labelSelect.value) {
            if (labelSelect.value === '__new__') {
                // Usar el valor del input para nueva etiqueta
                labelName = labelNameInput?.value?.trim() || '';
            } else {
                // Usar la etiqueta seleccionada
                labelName = labelSelect.value.trim();
            }
        } else {
            // Fallback: intentar usar el input si existe
            labelName = labelNameInput?.value?.trim() || '';
        }

        if (!labelName) {
            window.showToast?.('Por favor selecciona una etiqueta existente o crea una nueva.', 'error');
            return;
        }

        if (!numbersFileData || !numbersFileData.numbers || numbersFileData.numbers.length === 0) {
            window.showToast?.('Por favor selecciona un archivo con números válidos.', 'error');
            return;
        }

        const confirmBtn = document.getElementById('confirm-import-numbers');
        const progressDiv = document.getElementById('import-numbers-progress');
        const resultsDiv = document.getElementById('import-numbers-results');

        if (confirmBtn) confirmBtn.disabled = true;

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) {
                throw new Error('No se pudo determinar el usuario actual.');
            }

            // Mostrar progreso
            if (progressDiv && progressDiv.classList) progressDiv.classList.remove('hidden');
            updateImportProgress(0, 'Preparando importación...');

            // Asegurar que la etiqueta existe
            await ensureLabelsConfigured([labelName], userId);
            updateImportProgress(10, 'Etiqueta configurada');

            // Obtener contactos existentes CON TODAS SUS ETIQUETAS Y NOMBRES
            // IMPORTANTE: Necesitamos obtener las etiquetas y nombres completos para preservarlos
            updateImportProgress(20, 'Buscando contactos existentes...');
            const { data: existingContacts, error: existingError } = await window.auth.sb
                .from('contacts')
                .select('id, phone_number, labels, full_name')
                .eq('user_id', userId);

            if (existingError) throw existingError;

            const existingContactsMap = new Map();
            (existingContacts || []).forEach(contact => {
                const normalized = cleanPhone(contact.phone_number);
                if (normalized) {
                    // CRÍTICO: Preservar todas las etiquetas existentes como array
                    if (!Array.isArray(contact.labels)) {
                        contact.labels = contact.labels ? [contact.labels] : [];
                    }
                    // Crear una copia del array para evitar mutaciones
                    contact.labels = [...contact.labels];
                    existingContactsMap.set(normalized, contact);
                }
            });

            updateImportProgress(30, 'Procesando números...');

            // Procesar números
            const contactsToUpsert = [];
            const contactsToUpdate = [];
            let skippedCount = 0;
            const totalNumbers = numbersFileData.numbers.length;

            for (let i = 0; i < numbersFileData.numbers.length; i++) {
                const rawNumber = numbersFileData.numbers[i];
                const normalizedPhone = cleanPhone(rawNumber);

                if (!normalizedPhone) {
                    skippedCount++;
                    continue;
                }

                const existingContact = existingContactsMap.get(normalizedPhone);

                // CRÍTICO: SIEMPRE preservar todas las etiquetas existentes
                // Usamos un Set para evitar duplicados pero preservar todas las etiquetas
                const mergedLabelsSet = new Set();

                // PASO 1: Agregar TODAS las etiquetas existentes del contacto
                if (existingContact?.labels) {
                    const existingArray = Array.isArray(existingContact.labels)
                        ? existingContact.labels
                        : [existingContact.labels];

                    // Agregar cada etiqueta existente al Set (normalizada)
                    existingArray
                        .filter(Boolean) // Filtrar null/undefined
                        .map(label => String(label).trim()) // Convertir a string y limpiar
                        .filter(label => label.length > 0) // Filtrar vacíos
                        .forEach(label => {
                            // Agregar la etiqueta original preservando su formato
                            mergedLabelsSet.add(label);
                        });
                }

                // PASO 2: Agregar la nueva etiqueta (sin borrar las anteriores)
                // Si la etiqueta ya existe, no se duplicará gracias al Set
                mergedLabelsSet.add(labelName);

                // Convertir Set a Array manteniendo todas las etiquetas
                const mergedLabels = Array.from(mergedLabelsSet);

                if (existingContact) {
                    // ACTUALIZAR contacto existente: MERGE de etiquetas (nunca reemplazar)
                    // Verificación de seguridad: asegurar que tenemos al menos las etiquetas originales
                    const originalLabelsCount = existingContact.labels ? existingContact.labels.length : 0;
                    const mergedLabelsCount = mergedLabels.length;

                    // La cantidad de etiquetas debe ser >= a las originales (solo puede aumentar)
                    if (mergedLabelsCount < originalLabelsCount) {
                        console.warn(`[import-numbers] Advertencia: Se detectó pérdida de etiquetas para ${normalizedPhone}. Originales: ${originalLabelsCount}, Merge: ${mergedLabelsCount}`);
                        // En caso de error, usar las originales + la nueva
                        const safeLabels = new Set([...existingContact.labels, labelName]);
                        contactsToUpdate.push({
                            id: existingContact.id,
                            labels: Array.from(safeLabels),
                            originalLabels: existingContact.labels // Guardar para debugging
                        });
                    } else {
                        contactsToUpdate.push({
                            id: existingContact.id,
                            labels: mergedLabels
                        });
                    }
                } else {
                    // Preparar contacto nuevo (pero usaremos upsert para evitar duplicados)
                    // IMPORTANTE: No incluimos full_name aquí para que el upsert preserve el nombre existente
                    // Si el contacto ya existe en la BD, el upsert NO actualizará el nombre (solo agregará la etiqueta)
                    contactsToUpsert.push({
                        user_id: userId,
                        phone_number: normalizedPhone,
                        // NO incluimos full_name: null para preservar el nombre existente si el contacto ya existe
                        labels: [labelName], // Solo la nueva etiqueta para contactos nuevos
                        followup_status: 'idle',
                        followup_step_sent: -1
                    });
                }

                // Actualizar progreso (30% a 85% para el procesamiento)
                const progress = 30 + ((i + 1) / totalNumbers) * 55;
                const processedCount = i + 1;
                const remainingCount = totalNumbers - processedCount;
                updateImportProgress(
                    progress,
                    `Procesando números: ${processedCount} de ${totalNumbers} (${remainingCount} restantes)...`
                );
            }

            // OPTIMIZACIÓN: Actualizar progreso antes de guardar
            const totalToSave = contactsToUpsert.length + contactsToUpdate.length;
            updateImportProgress(85, `Guardando ${totalToSave} contactos...`);

            // Insertar/actualizar contactos nuevos en batch usando upsert para evitar duplicados
            if (contactsToUpsert.length > 0) {
                updateImportProgress(87, `Insertando ${contactsToUpsert.length} contactos nuevos...`);

                // Dividir en lotes para evitar problemas con muchos contactos
                const batchSize = 100;
                const totalBatches = Math.ceil(contactsToUpsert.length / batchSize);

                for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                    const start = batchIndex * batchSize;
                    const end = Math.min(start + batchSize, contactsToUpsert.length);
                    const batch = contactsToUpsert.slice(start, end);

                    // Calcular progreso del batch (87% a 92%)
                    const batchProgress = 87 + ((batchIndex + 1) / totalBatches) * 5;
                    updateImportProgress(
                        batchProgress,
                        `Insertando lote ${batchIndex + 1} de ${totalBatches} (${end} de ${contactsToUpsert.length} contactos)...`
                    );

                    // ANTES del upsert: Obtener contactos existentes del batch para preservar nombres y hacer merge de etiquetas
                    const batchPhones = batch.map(c => c.phone_number);
                    const { data: batchExisting, error: batchFetchError } = await window.auth.sb
                        .from('contacts')
                        .select('id, phone_number, labels, full_name')
                        .eq('user_id', userId)
                        .in('phone_number', batchPhones);

                    const batchExistingMap = new Map();
                    if (batchExisting && !batchFetchError) {
                        batchExisting.forEach(c => {
                            batchExistingMap.set(c.phone_number, c);
                        });
                    }

                    // Preparar batch con merge de etiquetas y preservación de nombres
                    const batchToUpsert = batch.map(contact => {
                        const existing = batchExistingMap.get(contact.phone_number);
                        if (existing) {
                            // Contacto existe: hacer merge de etiquetas y preservar nombre
                            const existingLabels = Array.isArray(existing.labels) ? existing.labels : [];
                            const mergedLabels = [...new Set([...existingLabels, labelName])];
                            return {
                                ...contact,
                                labels: mergedLabels,
                                full_name: existing.full_name || contact.full_name || null // Preservar nombre existente
                            };
                        }
                        // Contacto nuevo: usar los datos del batch
                        return contact;
                    });

                    // Usar upsert con onConflict para manejar contactos que puedan existir
                    // ignoreDuplicates: false significa que si existe, actualizará
                    const { data: upsertedData, error: upsertError } = await window.auth.sb
                        .from('contacts')
                        .upsert(batchToUpsert, {
                            onConflict: 'user_id,phone_number',
                            ignoreDuplicates: false
                        })
                        .select('id, phone_number, labels, full_name');

                    if (upsertError) {
                        console.error('[import-numbers] Error en upsert:', upsertError);
                        throw new Error(`Error al guardar contactos: ${upsertError.message}`);
                    }
                }
            }

            // OPTIMIZACIÓN: Actualizar contactos existentes en batch usando upsert
            // En lugar de actualizar uno por uno, usamos upsert que es mucho más rápido
            if (contactsToUpdate.length > 0) {
                updateImportProgress(92, `Actualizando ${contactsToUpdate.length} contactos existentes...`);

                // Dividir en lotes de 100 para evitar timeouts
                const batchSize = 100;
                const totalBatches = Math.ceil(contactsToUpdate.length / batchSize);

                for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                    const start = batchIndex * batchSize;
                    const end = Math.min(start + batchSize, contactsToUpdate.length);
                    const batch = contactsToUpdate.slice(start, end);

                    // Calcular progreso del batch (92% a 98%)
                    const batchProgress = 92 + ((batchIndex + 1) / totalBatches) * 6;
                    updateImportProgress(
                        batchProgress,
                        `Actualizando lote ${batchIndex + 1} de ${totalBatches} (${end} de ${contactsToUpdate.length} contactos)...`
                    );

                    // Actualizar cada contacto del batch en paralelo
                    const updatePromises = batch.map(contact => {
                        const labelsToSave = contact.labels || [];
                        return window.auth.sb
                            .from('contacts')
                            .update({ labels: labelsToSave })
                            .eq('id', contact.id);
                    });

                    const results = await Promise.all(updatePromises);

                    // Verificar errores
                    for (let i = 0; i < results.length; i++) {
                        const { error } = results[i];
                        if (error) {
                            console.error(`[import-numbers] Error al actualizar contacto ${batch[i].id}:`, error);
                            throw new Error(`Error al actualizar contacto: ${error.message}`);
                        }
                    }
                }
            }

            updateImportProgress(100, '¡Importación completada!');

            // Mostrar resultados
            if (resultsDiv && resultsDiv.classList) {
                resultsDiv.classList.remove('hidden');
                const resultNew = document.getElementById('result-new-contacts');
                const resultUpdated = document.getElementById('result-updated-contacts');
                const resultSkipped = document.getElementById('result-skipped-contacts');

                if (resultNew) resultNew.textContent = `• Contactos nuevos: ${contactsToUpsert.length}`;
                if (resultUpdated) resultUpdated.textContent = `• Contactos actualizados: ${contactsToUpdate.length}`;
                if (resultSkipped) resultSkipped.textContent = `• Números omitidos: ${skippedCount}`;
            }

            window.showToast?.(
                `Importación completada: ${contactsToUpsert.length} nuevos, ${contactsToUpdate.length} actualizados.`,
                'success'
            );

            // Cerrar el modal después de mostrar resultados
            setTimeout(() => {
                closeImportNumbersModal();
                // Recargar contactos después de cerrar el modal
                if (typeof loadAndRender === 'function') {
                    loadAndRender();
                }
            }, 2000);

        } catch (error) {
            console.error('Error al importar números:', error);
            window.showToast?.(`Error al importar números: ${error.message}`, 'error');
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    function updateImportProgress(percent, message) {
        const progressBar = document.getElementById('import-progress-bar');
        const progressPercent = document.getElementById('import-progress-percent');
        const progressText = document.getElementById('import-progress-text');

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        if (progressText) progressText.textContent = message;
    }
    // ========== FIN: FUNCIONALIDAD PARA IMPORTAR NÚMEROS CON ETIQUETA ==========
})();
