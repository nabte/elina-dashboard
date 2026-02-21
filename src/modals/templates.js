// templates.js - Módulo para el panel de Plantillas

(function () {

    // --- ESTADO DEL MÓDULO ---
    const baseTemplates = [
        { name: 'Saludo y Presentación', content: '¡Hola %nombre%! 👋\nSoy de [Nombre de tu negocio] y quería saludarte.\nEstamos ayudando a [clientes/negocios/personas] como tú con [beneficio principal].\n¿Te interesa que te cuente un poco más?' },
        { name: 'Promoción Exclusiva', content: '¡Hola %nombre%! 🎉\nTenemos una promoción especial esta semana:\n👉 [Nombre del producto/servicio] con un descuento exclusivo.\n\n¿Quieres que te mande la información completa? 🚀' },
        { name: 'Recordatorio Amistoso', content: '¡Hola %nombre%!\nSolo para recordarte sobre [tema pendiente].\nSi necesitas algo, no dudes en avisarme. ¡Estoy para ayudarte!' }
    ];
    let customTemplates = [];
    let isInitialized = false;
    let currentTemplateIdForAI = null;

    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'templates') {
            if (!isInitialized) {
                initTemplatesPanel();
                isInitialized = true;
            }
        }
    });

    async function initTemplatesPanel() {
        console.log('Panel de Plantillas activado.');
        renderBaseTemplates();
        await loadCustomTemplates();
        renderCustomTemplates();
        setupEventListeners();
    }

    function renderBaseTemplates() {
        const container = document.getElementById('base-templates-container');
        container.innerHTML = baseTemplates.map(t => `
            <div class="bg-white p-4 rounded-lg shadow">
                <h4 class="font-bold text-slate-800">${t.name}</h4>
                <p class="text-sm text-slate-600 mt-2 h-20 overflow-hidden">${t.content}</p>
                <div class="text-right mt-4">
                    <button class="apply-template-btn text-sm bg-blue-500 text-white py-1 px-3 rounded-md" data-content="${t.content}">Usar</button>
                </div>
            </div>
        `).join('');
    }

    async function loadCustomTemplates() {
        try {
            const { data, error } = await window.auth.sb.from('message_templates').select('*');
            if (error) throw error;
            customTemplates = data;
        } catch (e) {
            console.error('Error al cargar plantillas personalizadas:', e);
        }
    }

    function renderCustomTemplates() {
        const container = document.getElementById('custom-templates-container');
        if (customTemplates.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-center">Aún no has creado plantillas.</p>';
            return;
        }
        container.innerHTML = customTemplates.map(t => `
            <div class="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-slate-800">${t.name}</h4>
                    <p class="text-sm text-slate-600 mt-1">${t.content}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="ai-enhance-btn text-sm bg-purple-100 text-purple-700 py-1 px-3 rounded-md" data-template-id="${t.id}"><i data-lucide="sparkles" class="w-4 h-4 inline-block pointer-events-none"></i> Mejorar</button>
                    <button class="apply-template-btn text-sm bg-blue-500 text-white py-1 px-3 rounded-md" data-content="${t.content}">Usar</button>
                    <button class="delete-template-btn text-sm bg-red-100 text-red-700 p-2 rounded-md" data-template-id="${t.id}"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    }

    function setupEventListeners() {
        document.getElementById('add-template-btn')?.addEventListener('click', handleAddTemplate);
        document.body.addEventListener('click', (e) => {
            const applyBtn = e.target.closest('.apply-template-btn');
            const deleteBtn = e.target.closest('.delete-template-btn');
            const enhanceBtn = e.target.closest('.ai-enhance-btn');

            if (applyBtn) {
                handleApplyTemplate(e.target.dataset.content);
            }
            if (deleteBtn) {
                handleDeleteTemplate(e.target.dataset.templateId);
            }
            if (enhanceBtn) {
                openAiModal(e.target.dataset.templateId);
            }
        });

        document.getElementById('cancel-new-template-btn')?.addEventListener('click', hideNewTemplateForm);
        document.getElementById('new-template-form')?.addEventListener('submit', handleSaveNewTemplate);
    }

    async function handleAddTemplate() {
        if (customTemplates.length >= 5) {
            alert('Has alcanzado el límite de 5 plantillas personalizadas.');
            return;
        }
        showNewTemplateForm();
    }

    function showNewTemplateForm() {
        document.getElementById('new-template-form-container').classList.remove('hidden');
        document.getElementById('add-template-btn').classList.add('hidden');

        const textarea = document.getElementById('new-template-content');
        const form = document.getElementById('new-template-form');

        // Limpiar botones antiguos para evitar duplicados
        form.querySelector('.template-actions')?.remove();

        // Añadir botones de acción (IA y %nombre%)
        textarea.insertAdjacentHTML('afterend', `
            <div class="template-actions flex items-center justify-between mt-2">
                <button type="button" class="personalize-name-btn text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-md"><i data-lucide="user-plus" class="w-4 h-4 inline-block mr-1"></i>Insertar Nombre</button>
                <button type="button" class="ai-enhance-btn text-xs bg-purple-100 text-purple-700 font-semibold py-1 px-2 rounded-md hover:bg-purple-200 flex items-center gap-1"><i data-lucide="sparkles" class="w-3 h-3"></i> Mejorar con IA</button>
            </div>
        `);

        form.querySelector('.ai-enhance-btn').addEventListener('click', () => window.appInstance.openAiEnhanceModal(textarea.value, (newText) => { textarea.value = newText; }));
        form.querySelector('.personalize-name-btn').addEventListener('click', () => insertPlaceholder(textarea));
        lucide.createIcons({ root: form.querySelector('.template-actions') }); // CORRECCIÓN: Renderizar iconos para los nuevos botones

        document.getElementById('new-template-name').value = '';
        document.getElementById('new-template-content').value = '';
    }

    function hideNewTemplateForm() {
        document.getElementById('new-template-form-container').classList.add('hidden');
        document.getElementById('add-template-btn').classList.remove('hidden');
        // Limpiar el formulario y sus botones de acción
        const form = document.getElementById('new-template-form');
        form.reset();
        form.querySelector('.template-actions')?.remove();
    }

    async function handleSaveNewTemplate(e) {
        e.preventDefault();
        const name = document.getElementById('new-template-name').value.trim();
        const content = document.getElementById('new-template-content').value.trim();
        if (!name || !content) return;

        try {
            const { error } = await window.auth.sb.from('message_templates').insert({
                user_id: window.auth.getSession().user.id,
                name,
                content
            });
            if (error) throw error;
            hideNewTemplateForm();
            await loadCustomTemplates(); // Recarga solo las plantillas personalizadas
            renderCustomTemplates();
        } catch (e) {
            console.error('Error al crear plantilla:', e);
            alert('No se pudo crear la plantilla.');
        }
    }

    async function handleDeleteTemplate(templateId) {
        if (!confirm('¿Estás seguro de que quieres borrar esta plantilla?')) return;
        try {
            const { error } = await window.auth.sb.from('message_templates').delete().eq('id', templateId);
            if (error) throw error;
            await loadCustomTemplates();
            renderCustomTemplates();
        } catch (e) {
            console.error('Error al borrar plantilla:', e);
            alert('No se pudo borrar la plantilla.');
        }
    }

    function handleApplyTemplate(content) {
        // Navega al panel de envío masivo usando el sistema de grupos
        if (window.appInstance && typeof window.appInstance.switchPanel === 'function') {
            window.appInstance.switchPanel('bulk-sending', { groupId: 'campaigns' });

            // Espera un momento para que el panel se cargue e inicialice
            setTimeout(() => {
                const messageTextarea = document.getElementById('bulk-message');
                if (messageTextarea) {
                    messageTextarea.value = content;
                    messageTextarea.focus();
                    window.showToast('Plantilla aplicada con éxito.', 'success');
                } else {
                    console.warn('No se encontró el campo de mensaje masivo.');
                }
            }, 300); // Aumentado ligeramente para asegurar carga de panel remoto
        } else {
            console.error('Instancia de dashboard no encontrada.');
        }
    }

    function insertPlaceholder(textarea) {
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const placeholder = '%nombre%';
        textarea.value = text.substring(0, start) + placeholder + text.substring(end);
        textarea.focus();
        textarea.selectionEnd = start + placeholder.length;
    }
    // --- LÓGICA DEL MODAL DE IA ---

    function openAiModal(templateId) {
        const template = customTemplates.find(t => t.id == templateId);
        if (!template) return;

        // Reutilizamos la función global de app.js
        window.appInstance.openAiEnhanceModal(template.content, (newText) => {
            // Cuando el usuario aplica el cambio, actualizamos la plantilla
            handleApplyAi(template.id, newText);
        });
    }

    async function handleApplyAi(templateId, newContent) {
        await window.auth.sb.from('message_templates').update({ content: newContent }).eq('id', templateId);
        window.appInstance.closeAiModal();
        await loadCustomTemplates();
        renderCustomTemplates();
    }

})();