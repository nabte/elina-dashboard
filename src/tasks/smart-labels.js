// smart-labels.js - MÃ³dulo para el panel de Etiquetas Inteligentes

(function () {
    // --- INICIO: Funciones de utilidad para colores (copiadas de contacts.js) ---
    const colorPalette = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
        '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
        '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#FFFFFF'
    ];

    function getLabelColor(colorValue) {
        if (typeof colorValue === 'string' && colorValue.startsWith('#')) return colorValue;
        const index = parseInt(colorValue, 10);
        if (!isNaN(index) && index >= 0 && index < colorPalette.length) return colorPalette[index];
        return '#A0AEC0'; // Gris por defecto
    }

    function getTextColorForBg(bgColor) {
        if (!bgColor || !bgColor.startsWith('#')) return '#1e293b';
        const color = bgColor.substring(1, 7);
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance > 0.65 ? '#1e293b' : '#ffffff';
    }
    // --- FIN: Funciones de utilidad para colores ---

    let isInitialized = false;
    let allLabels = [];
    let globalListenersBound = false;
    let modalListenersBound = false;
    let modalObserver = null;


    // --- INICIO: CORRECCIÃ“N DE INICIALIZACIÃ“N DEFINITIVA ---
    // Escuchamos 'panel:activated' para asegurar la inicializaciÃ³n incluso si el HTML ya estÃ¡ presente.
    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'smart-labels' && !isInitialized) {
            initSmartLabelsPanel();
        }
    });
    // --- FIN: CORRECCIÃ“N DE INICIALIZACIÃ“N DEFINITIVA ---

    function initSmartLabelsPanel() {
        //         console.log('Inicializando panel de Etiquetas Inteligentes...');
        bindGlobalListeners();
        waitForModalAndBind();
        loadAndRenderLabels();
        isInitialized = true;
    }

    function bindGlobalListeners() {
        if (globalListenersBound) return;
        document.addEventListener('click', handleGlobalClick);
        globalListenersBound = true;
    }

    function waitForModalAndBind() {
        if (bindModalEvents()) {
            return;
        }
        if (modalObserver) return;
        modalObserver = new MutationObserver(() => {
            if (bindModalEvents()) {
                modalObserver.disconnect();
                modalObserver = null;
            }
        });
        modalObserver.observe(document.body, { childList: true, subtree: true });
    }

    function bindModalEvents() {
        if (modalListenersBound) return true;
        const modal = document.getElementById('smart-label-modal');
        if (!modal) return false;

        modal.querySelector('#cancel-smart-label-btn')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-smart-label-btn-footer')?.addEventListener('click', closeModal);
        modal.querySelector('#smart-label-form')?.addEventListener('submit', handleSave);
        modal.querySelector('#delete-smart-label-btn')?.addEventListener('click', handleDelete);

        const automatedCheckbox = document.getElementById('smart-label-is-automated');
        automatedCheckbox?.addEventListener('change', handleAutomationToggle);

        const aiEnhanceBtn = document.getElementById('smart-label-ai-enhance-btn');
        aiEnhanceBtn?.addEventListener('click', handleAiEnhanceClick);

        const selectEl = document.getElementById('smart-label-select');
        selectEl?.addEventListener('change', handleSelectChange);

        const funnelToggle = document.getElementById('smart-label-enable-funnel');
        funnelToggle?.addEventListener('change', (event) => toggleFunnelFields(event.target.checked));

        modalListenersBound = true;
        return true;
    }

    function handleGlobalClick(event) {
        const addBtn = event.target.closest('#add-smart-label-btn');
        if (addBtn) {
            event.preventDefault();
            openModal(null);
            return;
        }

        const editBtn = event.target.closest('.edit-smart-label-btn');
        if (editBtn) {
            event.preventDefault();
            const labelId = editBtn.dataset.id;
            const label = allLabels.find(l => l.id?.toString() === labelId);
            if (label) {
                openModal(label);
            }
        }
    }

    function handleAutomationToggle(event) {
        document.getElementById('ai-fields-container')?.classList.toggle('hidden', !event.target.checked);
    }

    function handleAiEnhanceClick(event) {
        event.preventDefault();
        const textarea = document.getElementById('smart-label-prompt');
        if (textarea?.value) {
            window.appInstance.openAiEnhanceModal(textarea.value, (newText) => textarea.value = newText);
        }
    }

    function handleSelectChange(event) {
        const selectEl = event?.target;
        if (!selectEl) return;
        const isNew = selectEl.value === '_new_';
        document.getElementById('new-label-fields-container')?.classList.toggle('hidden', !isNew);
        const nameInput = document.getElementById('smart-label-name');
        if (nameInput) nameInput.required = isNew;
    }

    async function loadAndRenderLabels() {
        const loader = document.getElementById('smart-labels-loader');
        const content = document.getElementById('smart-labels-content');

        if (loader) loader.classList.remove('hidden');
        if (content) content.classList.add('hidden');

        if (!loader || !content) {
            console.warn('Smart Labels components not found in DOM, skipping render.');
            return;
        }

        try {
            const { data, error } = await window.auth.sb
                .from('labels')
                .select('*');

            if (error) throw error;

            // CORRECCIÓN: Fusionar etiquetas duplicadas por nombre, priorizando las que tienen configuración.
            const labelMap = new Map();
            for (const label of (data || [])) {
                // Si el nombre es nulo o vacío, lo ignoramos.
                if (!label.name) continue;

                const existing = labelMap.get(label.name);
                // Si no existe una etiqueta con ese nombre, o si la actual es "mÃ¡s inteligente"
                // (tiene prompt/funnel) que la ya guardada, la reemplazamos.
                if (!existing || (!existing.prompt && label.prompt) || (!existing.funnel_name && label.funnel_name)) {
                    labelMap.set(label.name, label);
                }
            }
            allLabels = Array.from(labelMap.values());

            renderFunnels();
            renderIndividualLabels();
            updateFunnelsDatalist(); // <-- Actualizar el datalist

            loader.classList.add('hidden');
            content.classList.remove('hidden');

        } catch (e) {
            console.error('Error al cargar etiquetas:', e);
            loader.textContent = 'Error al cargar las etiquetas.';
        }
    }

    function renderFunnels() {
        const container = document.getElementById('funnels-container');
        const funnels = allLabels.reduce((acc, label) => {
            if (label.funnel_name) {
                if (!acc[label.funnel_name]) {
                    acc[label.funnel_name] = [];
                }
                acc[label.funnel_name].push(label);
            }
            return acc;
        }, {});

        if (Object.keys(funnels).length === 0) {
            container.innerHTML = '<p class="text-slate-500">No se han configurado funnels de etiquetas.</p>';
            return;
        }

        container.innerHTML = Object.entries(funnels).map(([funnelName, labels]) => {
            labels.sort((a, b) => (a.funnel_order || 0) - (b.funnel_order || 0));
            return `
                <div class="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 mb-8 relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-indigo-100/50"></div>
                    
                    <div class="flex items-center justify-between mb-8 relative z-10">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <i data-lucide="filter" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h4 class="text-xl font-black text-slate-800 tracking-tight">${funnelName}</h4>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${labels.length} Etapas en el Flujo</p>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
                        ${labels.map((label, index) => `
                            ${renderLabelCard(label, index + 1)}
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    function renderIndividualLabels() {
        const container = document.getElementById('individual-labels-container');
        const individualLabels = allLabels.filter(label => !label.funnel_name);

        if (individualLabels.length === 0) {
            container.innerHTML = `
                <div class="bg-slate-50/50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                    <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <i data-lucide="tag" class="w-8 h-8"></i>
                    </div>
                    <p class="text-slate-500 font-bold">No hay etiquetas individuales configuradas.</p>
                    <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Haga clic en el botón superior para agregar una nueva.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                ${individualLabels.map(label => renderLabelCard(label)).join('')}
            </div>
        `;
        lucide.createIcons();
    }

    function updateFunnelsDatalist() {
        const datalist = document.getElementById('funnel-names-list');
        if (!datalist) return;

        const funnelNames = new Set(
            allLabels.map(label => label.funnel_name).filter(Boolean)
        );

        datalist.innerHTML = Array.from(funnelNames)
            .map(name => `<option value="${name}"></option>`).join('');
    }

    function renderLabelCard(label, order) {
        const isAutomated = !!label.is_automated;
        const labelColor = getLabelColor(label.color);
        const textColor = getTextColorForBg(labelColor);
        const ignoredLabels = window.appInstance?.teamInfo?.ignored_labels || [];
        const isIgnored = ignoredLabels.includes(label.name);

        return `
            <div class="bg-white rounded-[2.5rem] p-8 shadow-[0_15px_50px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] hover:border-blue-200 transition-all duration-500 group/card relative flex flex-col h-full min-w-0">
                ${order ? `
                    <div class="absolute -top-4 -left-4 w-11 h-11 rounded-2xl bg-slate-900 text-white text-base font-black flex items-center justify-center border-4 border-white shadow-2xl z-20 transform -rotate-6 group-hover/card:rotate-0 transition-transform">
                        ${order}
                    </div>
                ` : ''}

                <div class="flex flex-col gap-6 flex-grow">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-wrap items-center gap-2">
                             <span class="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${isAutomated ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}">
                                ${isAutomated ? 'IA Inteligente' : 'Manual'}
                            </span>
                            ${isIgnored ? `
                                <span class="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
                                    Ignorado por IA
                                </span>
                            ` : ''}
                        </div>

                        <div class="px-5 py-3.5 rounded-[1.25rem] shadow-md flex items-center gap-4 w-fit max-w-full overflow-hidden transition-all group-hover/card:scale-[1.03] group-hover/card:shadow-lg" 
                             style="background-color: ${labelColor}; color: ${textColor}">
                            <i data-lucide="tag" class="w-5 h-5 flex-shrink-0 opacity-90"></i>
                            <span class="text-sm font-black tracking-tight truncate uppercase">${label.name}</span>
                        </div>
                    </div>

                    <div class="space-y-4 flex-grow">
                        <div class="flex items-center gap-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-1">
                            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span>Instrucción IA</span>
                        </div>
                        <div class="text-[13px] text-slate-600 leading-relaxed min-h-[6rem] bg-slate-50/70 p-6 rounded-[1.5rem] border border-slate-100/50 overflow-y-auto scrollbar-thin group-hover/card:bg-white group-hover/card:border-blue-100 transition-colors">
                            ${label.prompt ? label.prompt : '<span class="text-slate-300 italic font-medium">Define cómo la IA reconocerá esta etiqueta analizando el comportamiento del cliente en el chat...</span>'}
                        </div>
                    </div>
                </div>

                <div class="pt-8 mt-auto flex items-center justify-between border-t border-slate-100/60">
                    <button class="edit-smart-label-btn text-[12px] font-black text-slate-500 hover:text-blue-600 flex items-center gap-3 transition-all p-2.5 -ml-2.5 rounded-2xl hover:bg-blue-50 group/btn" data-id="${label.id}">
                        <div class="w-9 h-9 rounded-xl bg-slate-100 group-hover/btn:bg-blue-100 flex items-center justify-center transition-colors shadow-sm">
                            <i data-lucide="settings-2" class="w-4 h-4 group-hover/btn:text-blue-600"></i>
                        </div>
                        <span class="uppercase tracking-widest">Configurar</span>
                    </button>
                    
                    <div class="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover/card:bg-blue-600 group-hover/card:text-white group-hover/card:border-blue-600 transition-all duration-500">
                        <i data-lucide="arrow-right" class="w-5 h-5 transform group-hover/card:translate-x-1 transition-transform"></i>
                    </div>
                </div>
            </div>
        `;
    }

    async function openModal(labelToEdit, attempt = 0) {
        const modal = document.getElementById('smart-label-modal');
        const form = document.getElementById('smart-label-form');
        if (!modal || !form) {
            if (attempt < 10) {
                setTimeout(() => openModal(labelToEdit, attempt + 1), 50);
            } else {
                console.warn('El modal de automatizaciones IA no está disponible después de varios intentos.');
            }
            return;
        }

        if (!modalListenersBound) {
            bindModalEvents();
        }

        form.reset();

        document.getElementById('ai-fields-container').classList.add('hidden');
        document.getElementById('new-label-fields-container').classList.add('hidden');
        document.getElementById('smart-label-name').required = false;

        const selectContainer = document.getElementById('label-selector-container');
        const selectEl = document.getElementById('smart-label-select');
        const funnelToggle = document.getElementById('smart-label-enable-funnel');
        const automationToggle = document.getElementById('smart-label-is-automated');
        const notifyToggle = document.getElementById('smart-label-notify');

        if (!selectEl || !selectContainer) {
            console.warn('No se encontró el selector de etiquetas para automatizaciones.');
            if (attempt < 10) {
                setTimeout(() => openModal(labelToEdit, attempt + 1), 50);
            }
            return;
        }

        if (labelToEdit) {
            selectContainer.classList.remove('hidden');
            document.getElementById('new-label-fields-container').classList.add('hidden');
            document.getElementById('smart-label-name').required = false;

            document.getElementById('smart-label-modal-title').textContent = 'Editar automatización';
            document.getElementById('smart-label-id').value = labelToEdit.id;

            const { data: availableLabels, error } = await window.auth.sb.from('labels')
                .select('id, name')
                .or(`prompt.is.null,id.eq.${labelToEdit.id}`);

            if (error) {
                console.error('Error cargando etiquetas disponibles:', error);
                selectEl.innerHTML = '<option>Error al cargar</option>';
            } else {
                const uniqueAvailableLabels = (availableLabels || []).reduce((acc, current) => {
                    if (!acc.some(item => item.name === current.name)) {
                        acc.push(current);
                    }
                    return acc;
                }, []);
                selectEl.innerHTML = uniqueAvailableLabels.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
                selectEl.value = labelToEdit.id;
            }

            document.getElementById('smart-label-prompt').value = labelToEdit.prompt || '';
            if (automationToggle) {
                automationToggle.checked = !!labelToEdit.is_automated;
                handleAutomationToggle({ target: automationToggle });
            }
            if (notifyToggle) {
                notifyToggle.checked = !!labelToEdit.notify_on_assign;
            }

            if (funnelToggle) {
                funnelToggle.checked = !!labelToEdit.funnel_name;
                document.getElementById('smart-label-funnel-name').value = labelToEdit.funnel_name || '';
                document.getElementById('smart-label-funnel-order').value = labelToEdit.funnel_order ?? '';
                toggleFunnelFields(funnelToggle.checked);
            }
        } else {
            selectContainer.classList.remove('hidden');
            document.getElementById('smart-label-modal-title').textContent = 'Nueva automatización de etiqueta';
            document.getElementById('smart-label-id').value = '';

            const { data: nonSmartLabels, error } = await window.auth.sb.from('labels')
                .select('id, name')
                .is('prompt', null);

            if (error) {
                console.error('Error cargando etiquetas no automatizadas:', error);
                selectEl.innerHTML = '<option>Error al cargar</option>';
            } else {
                const uniqueNonSmartLabels = (nonSmartLabels || []).reduce((acc, current) => {
                    if (!acc.some(item => item.name === current.name)) {
                        acc.push(current);
                    }
                    return acc;
                }, []);
                selectEl.innerHTML = '<option value="" disabled selected>Selecciona una etiqueta...</option>' +
                    uniqueNonSmartLabels.map(l => `<option value="${l.id}">${l.name}</option>`).join('') +
                    '<option value="_new_" class="font-bold text-blue-600">Crear nueva etiqueta...</option>';
            }

            if (funnelToggle) {
                funnelToggle.checked = false;
                document.getElementById('smart-label-funnel-name').value = '';
                document.getElementById('smart-label-funnel-order').value = '';
                toggleFunnelFields(false);
            }
            if (automationToggle) {
                automationToggle.checked = false;
                handleAutomationToggle({ target: automationToggle });
            }
            if (notifyToggle) {
                notifyToggle.checked = false;
            }
        }

        handleSelectChange({ target: selectEl });

        const ignoreToggle = document.getElementById('smart-label-ignore-in-chats');
        if (ignoreToggle) {
            const teamInfo = window.appInstance?.teamInfo;
            const ignoredLabels = teamInfo?.ignored_labels || [];
            const targetLabelName = labelToEdit?.name || selectEl.selectedOptions?.[0]?.textContent?.trim() || '';
            ignoreToggle.checked = !!targetLabelName && ignoredLabels.includes(targetLabelName);
        }

        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    function closeModal() {
        document.getElementById('smart-label-modal').classList.add('hidden');
    }

    function toggleFunnelFields(isEnabled) {
        const container = document.getElementById('funnel-fields-container');
        const nameInput = document.getElementById('smart-label-funnel-name');
        const orderInput = document.getElementById('smart-label-funnel-order');
        if (!container || !nameInput || !orderInput) return;

        container.classList.toggle('hidden', !isEnabled);
        nameInput.disabled = !isEnabled;
        nameInput.required = isEnabled;
        orderInput.disabled = !isEnabled;
    }

    async function ensureIgnoreLabelExists(userId) {
        if (!userId) return;
        try {
            // Buscar etiqueta "ignorar" case-insensitive
            const { data, error } = await window.auth.sb
                .from('labels')
                .select('id, name')
                .eq('user_id', userId)
                .limit(100); // Obtener todas las etiquetas del usuario para buscar case-insensitive

            if (error) throw error;

            const ignoreLabel = Array.isArray(data)
                ? data.find(l => l.name && l.name.toLowerCase().trim() === 'ignorar')
                : null;

            if (!ignoreLabel) {
                // Normalizar a Title Case: "Ignorar"
                await window.auth.sb.from('labels').insert({
                    user_id: userId,
                    name: 'Ignorar', // Title Case
                    color: '#64748B',
                    is_automated: false,
                    notify_on_assign: false
                });
            }
        } catch (error) {
            console.error('No se pudo asegurar la etiqueta "ignorar":', error);
            throw error;
        }
    }

    async function updateIgnoredLabelsForTeam(labelName, shouldIgnore) {
        const teamInfo = window.appInstance?.teamInfo;
        if (!teamInfo || !labelName) return;

        let ignoredLabels = Array.isArray(teamInfo.ignored_labels) ? [...teamInfo.ignored_labels] : [];
        const isIgnored = ignoredLabels.includes(labelName);
        if (shouldIgnore && !isIgnored) {
            ignoredLabels.push(labelName);
        } else if (!shouldIgnore && isIgnored) {
            ignoredLabels = ignoredLabels.filter(l => l !== labelName);
        } else {
            return; // No hay cambios
        }

        const { error } = await window.auth.sb
            .from('teams')
            .update({ ignored_labels: ignoredLabels })
            .eq('id', teamInfo.team_id);
        if (error) throw error;
        window.appInstance.teamInfo = { ...teamInfo, ignored_labels };
    }

    async function handleSave(e) {
        e.preventDefault();
        const button = document.querySelector('#smart-label-modal button[type="submit"]');
        if (button) {
            button.disabled = true;
            button.textContent = 'Guardando...';
        }

        let labelId = document.getElementById('smart-label-id').value;
        const selectEl = document.getElementById('smart-label-select');
        const funnelToggle = document.getElementById('smart-label-enable-funnel');
        const funnelEnabled = !!funnelToggle?.checked;
        const funnelOrderValue = document.getElementById('smart-label-funnel-order').value;
        const funnelNameValue = document.getElementById('smart-label-funnel-name').value.trim();
        const assignIgnoreLabel = !!document.getElementById('smart-label-ignore-in-chats')?.checked;
        const userId = window.auth.getSession()?.user?.id;
        const labelNameForIgnore = document.getElementById('smart-label-name').value.trim() || selectEl?.selectedOptions?.[0]?.textContent?.trim() || '';

        try {
            const parsedOrder = funnelOrderValue ? parseInt(funnelOrderValue, 10) : null;
            const labelData = {
                is_automated: document.getElementById('smart-label-is-automated').checked,
                prompt: document.getElementById('smart-label-prompt').value,
                funnel_name: funnelEnabled && funnelNameValue ? funnelNameValue : null,
                funnel_order: funnelEnabled && Number.isFinite(parsedOrder) ? parsedOrder : null,
                notify_on_assign: document.getElementById('smart-label-notify').checked
            };

            if (assignIgnoreLabel && userId) {
                await ensureIgnoreLabelExists(userId);
            }

            if (labelId) {
                const newSelectedLabelId = document.getElementById('smart-label-select').value;

                if (labelId !== newSelectedLabelId) {
                    await window.auth.sb.from('labels').update({ prompt: null, is_automated: false, funnel_name: null, funnel_order: null, notify_on_assign: false }).eq('id', labelId);
                    const { error } = await window.auth.sb.from('labels').update(labelData).eq('id', newSelectedLabelId);
                    if (error) throw error;
                    labelId = newSelectedLabelId;
                } else {
                    const { error } = await window.auth.sb.from('labels').update(labelData).eq('id', labelId);
                    if (error) throw error;
                }

            } else {
                const selectedValue = document.getElementById('smart-label-select').value;

                if (selectedValue === '_new_') {
                    const rawName = document.getElementById('smart-label-name').value.trim();
                    // Normalizar nombre: primera letra mayúscula, resto minúsculas
                    const newName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                    const newColor = document.getElementById('smart-label-color').value;

                    // Verificar si ya existe una etiqueta con este nombre normalizado
                    const { data: existingLabels } = await window.auth.sb
                        .from('labels')
                        .select('id, name')
                        .eq('user_id', userId);

                    const existing = existingLabels?.find(
                        l => l.name.toLowerCase().trim() === newName.toLowerCase().trim()
                    );

                    if (existing) {
                        throw new Error(`La etiqueta "${existing.name}" ya existe.`);
                    }

                    const { error } = await window.auth.sb.from('labels').insert({
                        ...labelData,
                        user_id: userId,
                        name: newName,
                        color: newColor
                    });
                    if (error) throw error;
                } else {
                    const { error } = await window.auth.sb.from('labels').update(labelData).eq('id', selectedValue);
                    if (error) throw error;
                }
            }

            await updateIgnoredLabelsForTeam(labelNameForIgnore, assignIgnoreLabel);
            window.showToast('Automatizaci\u00f3n guardada con \u00e9xito.', 'success');
            closeModal();
            loadAndRenderLabels();

        } catch (e) {
            console.error('Error al guardar la automatizaci\u00f3n:', e);
            window.showToast(`Error: ${e.message}`, 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Guardar automatizaci\u00f3n';
            }
        }
    }

    async function handleDelete() {
        const id = document.getElementById('smart-label-id').value;
        if (!id || !confirm('¿Estás seguro de que quieres eliminar esta etiqueta permanentemente? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const { error } = await window.auth.sb.from('labels').delete().eq('id', id);
            if (error) throw error;

            window.showToast('Etiqueta eliminada.', 'info');
            closeModal();
            loadAndRenderLabels();
        } catch (e) {
            console.error('Error al eliminar la etiqueta:', e);
            window.showToast(`Error al eliminar: ${e.message}`, 'error');
        }
    }

})();




