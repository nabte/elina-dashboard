// follow-ups.js - Módulo para el panel de Seguimientos Automáticos

(function () {
    let isInitialized = false;
    let allFollowUps = [];
    let allUserLabels = [];
    const DEFAULT_DELAY_HOURS = 24; // Constante para el retraso por defecto

    // --- INICIO: CORRECCIÓN DE INICIALIZACIÓN DEFINITIVA ---
    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'follow-ups' && !isInitialized) {
            initFollowUpsPanel();
            isInitialized = true; // Marcar como inicializado
        }
    });

    async function initFollowUpsPanel() {
        console.log('Inicializando panel de Seguimientos...');
        isInitialized = true;
        await loadInitialData();
        setupEventListeners();
    }
    // --- FIN: CORRECCIÓN DE INICIALIZACIÓN DEFINITIVA ---

    async function loadInitialData() {
        const listContainer = document.getElementById('followups-list');
        if (!listContainer) return;
        listContainer.innerHTML = '<div id="followups-loader" class="text-center text-slate-500 p-8">Cargando secuencias...</div>';
        const loader = listContainer.querySelector('#followups-loader');

        try {
            const userId = window.auth.getSession()?.user?.id;
            const [followUpsRes, labelsRes] = await Promise.all([ // CORRECCIÓN: Cargar datos en paralelo
                window.auth.sb.from('followups').select('*').eq('user_id', userId),
                window.auth.sb.from('labels').select('name').eq('user_id', userId)
            ]);

            if (followUpsRes.error) throw followUpsRes.error;
            if (labelsRes.error) throw labelsRes.error;

            allFollowUps = followUpsRes.data;
            allUserLabels = labelsRes.data.map(l => l.name).sort();

            renderFollowUps(); // <-- CORRECCIÓN: Llamar a renderizar DESPUÉS de cargar los datos.

        } catch (e) {
            console.error('Error al cargar datos de seguimientos:', e);
            if (loader) loader.textContent = 'Error al cargar datos.';
        } finally {
            // El loader se elimina/oculta dentro de renderFollowUps
        }
    }

    function setupEventListeners() {
        // Los IDs ahora existen porque están en dashboard.html
        document.getElementById('add-sequence-btn')?.addEventListener('click', () => openModal(null));
        document.getElementById('cancel-sequence-btn')?.addEventListener('click', closeModal);
        document.getElementById('sequence-form')?.addEventListener('submit', handleSave);
        document.getElementById('delete-sequence-btn')?.addEventListener('click', handleDelete);
        document.getElementById('add-message-btn')?.addEventListener('click', () => addStepToModal());

        document.getElementById('follow-ups-container')?.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.toggle-follow-up-switch');
            if (toggleBtn) {
                handleToggleActive(toggleBtn);
            }

            const editBtn = e.target.closest('.edit-follow-up-btn');
            if (editBtn) {
                const followUpId = editBtn.dataset.id;
                const followUp = allFollowUps.find(f => f.id == followUpId);
                if (followUp) openModal(followUp);
            }
        });

        document.getElementById('messages-container')?.addEventListener('click', (e) => {
            if (e.target.closest('.remove-step-btn')) {
                e.target.closest('.message-step').remove();
                updateStepNumbers();
            }
            // Listener para el botón de subir archivo de cada paso
            if (e.target.classList.contains('upload-file-btn')) {
                e.target.previousElementSibling.click();
            }
        });
    }

    function renderFollowUps() {
        const listContainer = document.getElementById('followups-list');
        if (!listContainer) return;

        const loader = listContainer.querySelector('#followups-loader');
        if (loader) loader.classList.add('hidden');

        if (allFollowUps.length === 0) {
            listContainer.innerHTML = '<p class="text-slate-500 text-center p-8">No has creado ninguna secuencia de seguimiento.</p>';
            return;
        }

        listContainer.innerHTML = allFollowUps.map(f => `
            <div class="bg-white p-6 rounded-xl shadow-md">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="text-lg font-bold text-slate-900">${`Secuencia para "${f.target_label}"`}</h4>
                        <p class="text-sm text-slate-500">Se activa con la etiqueta: <span class="font-semibold text-blue-600">${f.target_label}</span></p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="relative inline-flex items-center cursor-pointer toggle-follow-up-switch" data-id="${f.id}" data-active="${f.is_active}">
                            <div class="w-11 h-6 rounded-full ${f.is_active ? 'bg-green-600' : 'bg-slate-200'} after:absolute after:top-0.5 ${f.is_active ? 'after:left-[22px]' : 'after:left-[2px]'} after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all" title="${f.is_active ? 'Secuencia Activa' : 'Secuencia Inactiva'}"></div>
                        </div>
                        <button class="edit-follow-up-btn text-blue-600 hover:underline font-semibold flex items-center gap-1 ml-3" data-id="${f.id}">
                            <i data-lucide="edit-2" class="w-4 h-4"></i> Editar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        lucide.createIcons(); // CORRECCIÓN: Renderizar iconos después de insertar HTML
    }

    function openModal(followUp) {
        const modal = document.getElementById('sequence-modal');
        document.getElementById('sequence-form').reset();
        document.getElementById('sequence-modal-title').textContent = followUp ? 'Editar Secuencia' : 'Crear Nueva Secuencia';
        document.getElementById('sequence-id').value = followUp?.id || '';

        const labelSelect = document.getElementById('sequence-target-label');
        labelSelect.innerHTML = '<option value="">-- Selecciona una etiqueta --</option>' + allUserLabels.map(name => `<option value="${name}">${name}</option>`).join('');
        if (followUp) labelSelect.value = followUp.target_label;

        document.getElementById('sequence-is-active').checked = followUp ? followUp.is_active : true;

        const stepsContainer = document.getElementById('messages-container');
        stepsContainer.innerHTML = '';
        if (followUp?.messages?.length > 0) {
            // Los datos vienen como strings JSON, hay que parsearlos
            const messages = typeof followUp.messages === 'string' ? JSON.parse(followUp.messages) : followUp.messages;
            const timings = Array.isArray(followUp.timings) ? followUp.timings : (typeof followUp.timings === 'string' ? JSON.parse(followUp.timings) : []);
            const file_urls = Array.isArray(followUp.file_urls) ? followUp.file_urls : (typeof followUp.file_urls === 'string' ? JSON.parse(followUp.file_urls) : []);

            messages.forEach((msg, index) => { // <-- CORRECCIÓN: Usar la constante
                addStepToModal({
                    message: msg,
                    delay: timings[index]?.delay ?? DEFAULT_DELAY_HOURS,
                    fileUrl: file_urls?.[index] ?? ''
                });
            });
        } else {
            addStepToModal(); // Añadir un paso en blanco por defecto
        }

        document.getElementById('delete-sequence-btn').classList.toggle('hidden', !followUp);
        modal.classList.remove('hidden');
        lucide.createIcons(); // CORRECCIÓN: Renderizar iconos del modal
    }

    function closeModal() {
        document.getElementById('sequence-modal').classList.add('hidden');
    }

    function addStepToModal(stepData = { message: '', delay: DEFAULT_DELAY_HOURS, fileUrl: '' }) { // <-- CORRECCIÓN: Usar la constante
        const messagesContainer = document.getElementById('messages-container');
        const addMessageBtn = document.getElementById('add-message-btn');

        // --- CORRECCIÓN: Limitar a 3 mensajes ---
        if (messagesContainer.querySelectorAll('.message-step').length >= 3) {
            window.showToast('Puedes añadir un máximo de 3 mensajes por secuencia.', 'info');
            return;
        }

        const template = document.getElementById('message-step-template');
        const clone = template.content.cloneNode(true);
        clone.querySelector('.step-message').value = stepData.message;
        clone.querySelector('.step-delay').value = stepData.delay ?? DEFAULT_DELAY_HOURS; // <-- CORRECCIÓN: Usar la constante

        const fileDisplay = clone.querySelector('.file-name-display');
        const imagePreview = clone.querySelector('.step-image-preview');
        if (stepData.fileUrl) {
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(stepData.fileUrl)) {
                imagePreview.src = stepData.fileUrl;
                imagePreview.classList.remove('hidden');
            }
            fileDisplay.textContent = stepData.fileUrl.split('/').pop();
            fileDisplay.dataset.existingUrl = stepData.fileUrl; // Guardar la URL existente
        }
        clone.querySelector('.step-file-input').addEventListener('change', (e) => {
            fileDisplay.textContent = e.target.files[0] ? e.target.files[0].name : 'Ningún archivo seleccionado';
            fileDisplay.dataset.existingUrl = ''; // Limpiar URL existente si se selecciona un nuevo archivo
        });

        messagesContainer.appendChild(clone);
        updateStepNumbers();

        // Ocultar el botón si se alcanzó el límite
        if (messagesContainer.querySelectorAll('.message-step').length >= 3) {
            addMessageBtn.classList.add('hidden');
        } else {
            addMessageBtn.classList.remove('hidden');
        }

        lucide.createIcons();
    }

    function updateStepNumbers() {
        document.querySelectorAll('.message-step').forEach((step, index) => {
            step.querySelector('.step-number').textContent = index + 1;
        });
        // Asegurarse de que el botón de añadir esté visible si hay menos de 3 pasos
        const addMessageBtn = document.getElementById('add-message-btn');
        if (document.querySelectorAll('.message-step').length < 3) {
            addMessageBtn.classList.remove('hidden');
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        const button = document.getElementById('save-sequence-btn');
        button.disabled = true;
        button.textContent = 'Guardando...';

        const id = document.getElementById('sequence-id').value;
        const steps = Array.from(document.querySelectorAll('.message-step'));

        // Procesar la subida de archivos de cada paso
        const fileUploadPromises = steps.map(async (step) => {
            const fileInput = step.querySelector('.step-file-input');
            const fileDisplay = step.querySelector('.file-name-display');

            if (fileInput.files[0]) { // Si hay un archivo nuevo
                return await window.appInstance.uploadAsset(fileInput.files[0], 'follow-ups');
            } else if (fileDisplay.dataset.existingUrl) { // Si no hay archivo nuevo pero había uno existente
                return fileDisplay.dataset.existingUrl;
            }
            return null; // Si no hay archivo
        });

        const resolvedFileUrls = await Promise.all(fileUploadPromises);

        const sequenceData = {
            user_id: window.auth.getSession()?.user?.id,
            target_label: document.getElementById('sequence-target-label').value,
            is_active: document.getElementById('sequence-is-active').checked,
            messages: steps.map(s => s.querySelector('.step-message').value),
            timings: steps.map(s => ({ delay: parseInt(s.querySelector('.step-delay').value) || DEFAULT_DELAY_HOURS })), // <-- CORRECCIÓN: Usar la constante
            file_urls: resolvedFileUrls,
            follow_up_count: steps.length
        };

        try {
            const query = id
                ? window.auth.sb.from('followups').update(sequenceData).eq('id', id).select().single()
                : window.auth.sb.from('followups').insert(sequenceData).select().single();

            const { data: savedFollowUp, error: saveError } = await query;
            if (saveError) throw saveError;

            // --- INICIO: Lógica para reintegrar contactos existentes ---
            // Si la secuencia está activa, busca todos los contactos con la etiqueta y los (re)inicia en la secuencia.
            if (sequenceData.is_active && sequenceData.target_label) {
                console.log(`Reintegrando contactos con la etiqueta: ${sequenceData.target_label}`);
                const { error: rpcError } = await window.auth.sb.rpc('reassign_followup_to_contacts_with_label', {
                    p_user_id: sequenceData.user_id,
                    p_target_label: sequenceData.target_label,
                    p_followup_id: savedFollowUp.id
                });
                if (rpcError) {
                    console.error("Error al reintegrar contactos:", rpcError);
                    window.showToast('Secuencia guardada, pero hubo un error al reintegrar los contactos existentes.', 'warning');
                }
            }
            // --- FIN: Lógica para reintegrar contactos ---
            window.showToast('Secuencia guardada con éxito.', 'success');
            closeModal();
            await loadInitialData();
            renderFollowUps();

        } catch (e) {
            console.error('Error al guardar la secuencia:', e);
            window.showToast(`Error: ${e.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Guardar Secuencia';
        }
    }

    async function handleDelete() {
        const id = document.getElementById('sequence-id').value;
        if (!id || !confirm('¿Estás seguro de que quieres eliminar esta secuencia?')) return;

        try {
            const { error } = await window.auth.sb.from('followups').delete().eq('id', id);
            if (error) throw error;
            window.showToast('Secuencia eliminada.', 'info');
            closeModal();
            await loadInitialData();
            renderFollowUps();
        } catch (e) {
            console.error('Error al eliminar:', e);
            window.showToast(`Error: ${e.message}`, 'error');
        }
    }

    async function handleToggleActive(toggle) {
        const id = toggle.dataset.id;
        const currentActive = toggle.dataset.active === 'true';
        const newActive = !currentActive;

        toggle.style.opacity = '0.5'; // Feedback visual de carga
        toggle.style.pointerEvents = 'none';

        try {
            const { error } = await window.auth.sb.from('followups').update({ is_active: newActive }).eq('id', id);
            if (error) throw error;

            // Actualizar estado local
            const followUp = allFollowUps.find(f => f.id == id);
            if (followUp) followUp.is_active = newActive;

            // Actualizar UI del switch manualmente para evitar re-renderizado total
            toggle.dataset.active = newActive;
            const innerDiv = toggle.querySelector('div');
            if (innerDiv) {
                innerDiv.className = `w-11 h-6 rounded-full ${newActive ? 'bg-green-600' : 'bg-slate-200'} after:absolute after:top-0.5 ${newActive ? 'after:left-[22px]' : 'after:left-[2px]'} after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all`;
            }
        } catch (e) {
            console.error('Error al cambiar estado:', e);
            window.showToast('No se pudo actualizar el estado de la secuencia.', 'error');
        } finally {
            toggle.style.opacity = '1';
            toggle.style.pointerEvents = 'auto';
        }
    }
})();
