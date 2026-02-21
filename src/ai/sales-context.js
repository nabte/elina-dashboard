(function () {
    let isInitialized = false;
    let featureAvailable = true;
    let currentRecord = null;

    document.addEventListener('panel:activated', async ({ detail }) => {
        if (detail.panelId === 'sales-context') {
            if (!isInitialized) {
                initSalesContextPanel();
                isInitialized = true;
            }
            // Force reload to ensure fresh data
            await loadSalesContext();
        }
    });

    // Expose functions globally for debugging and external use
    window.addCustomObjection = addCustomObjection;
    window.handleSalesContextSave = handleSave;

    // Expose functions globally for debugging and external use
    window.addCustomObjection = addCustomObjection;
    window.handleSalesContextSave = handleSave;

    function initSalesContextPanel() {
        const form = document.getElementById('sales-context-form');
        form?.addEventListener('submit', handleSave);
        form?.addEventListener('input', updatePreview);

        document.getElementById('sales-context-clear')?.addEventListener('click', () => {
            // Logic to clear the form
            form?.reset();
            const activeInput = document.getElementById('sales-context-active');
            if (activeInput) activeInput.checked = true;
            loadDefaultObjections();
            updatePreview();
        });

        // Botón explícito para restaurar defaults (Solicitud de usuario)
        const restoreDefaultsBtn = document.createElement('button');
        restoreDefaultsBtn.type = 'button';
        restoreDefaultsBtn.innerHTML = '<i data-lucide="rotate-ccw" class="w-4 h-4"></i> Restaurar Predeterminados';
        restoreDefaultsBtn.className = 'text-xs text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1 mt-2';
        restoreDefaultsBtn.addEventListener('click', () => {
            if (confirm('¿Seguro que quieres restaurar las objeciones predeterminadas? Se borrarán las actuales.')) {
                loadDefaultObjections();
                updatePreview();
                window.showToast('Objeciones restauradas', 'success');
            }
        });

        // Insertar después del botón de limpiar si existe
        const clearBtn = document.getElementById('sales-context-clear');
        if (clearBtn && clearBtn.parentNode) {
            clearBtn.parentNode.appendChild(restoreDefaultsBtn);
        }

        // Agregar objeción personalizada
        document.getElementById('add-objection-btn')?.addEventListener('click', () => {
            addCustomObjection();
        });

        // Delegación de eventos para botones de eliminar objeción (ELIMINADO: Se maneja individualmente en createObjectionCard)
        // document.addEventListener('click', (e) => { ... });

        // Botón para cargar plantilla predeterminada
        document.getElementById('sales-context-load-defaults')?.addEventListener('click', loadDefaultTemplate);

        // Botón para agregar crítico personalizado
        document.getElementById('add-critical-rule-btn')?.addEventListener('click', addCustomCriticalRule);

        // Delegación de eventos para botones de críticos
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-critical-rule-btn')) {
                handleDeleteCriticalRule(e.target.closest('.delete-critical-rule-btn'));
            }
            if (e.target.closest('.toggle-critical-rule')) {
                handleToggleCriticalRule(e.target.closest('.toggle-critical-rule'));
            }
        });

        updatePreview();

        // Inicializar toggles
        setupToggle('sales-context-active-switch');
        setupToggle('sales-context-auto-generate-switch');
    }

    function setupToggle(id) {
        const toggle = document.getElementById(id);
        if (!toggle) return;

        // Estado inicial basado en data-active
        const isActive = toggle.getAttribute('data-active') === 'true';
        updateToggleVisuals(toggle, isActive);

        toggle.addEventListener('click', () => {
            const currentState = toggle.getAttribute('data-active') === 'true';
            const newState = !currentState;
            toggle.setAttribute('data-active', newState);
            updateToggleVisuals(toggle, newState);
        });
    }

    function updateToggleVisuals(toggle, isActive) {
        const track = toggle.querySelector('.switch-track');
        const thumb = toggle.querySelector('.switch-thumb');

        if (!track || !thumb) return;

        if (isActive) {
            track.classList.remove('bg-slate-200');
            track.classList.add('bg-blue-600');

            thumb.classList.add('translate-x-full');
        } else {
            track.classList.add('bg-slate-200');
            track.classList.remove('bg-blue-600');

            thumb.classList.remove('translate-x-full');
        }
    }
    function loadDefaultTemplate() {
        loadDefaultObjections();
        updatePreview();
        window.showToast?.('Objeciones comunes cargadas. Puedes editarlas o generar respuestas automáticas con el botón 🤖.', 'success');
    }

    async function generateResponseForObjection(card, objectionText) {
        const generateBtn = card.querySelector('.generate-response-btn');
        const originalIcon = generateBtn.innerHTML;
        const displayDiv = card.querySelector('.objection-display');
        const editDiv = card.querySelector('.objection-edit');
        const responseText = card.querySelector('.response-text');
        const responseInput = card.querySelector('.response-input');
        const editBtn = card.querySelector('.edit-objection-btn');
        const saveBtn = card.querySelector('.save-objection-btn');

        // Asegurarse de que la tarjeta esté en modo visualización (no edición)
        if (displayDiv && editDiv) {
            displayDiv.classList.remove('hidden');
            editDiv.classList.add('hidden');
            if (editBtn) editBtn.classList.remove('hidden');
            if (saveBtn) saveBtn.classList.add('hidden');
        }

        try {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>';
            if (window.lucide?.createIcons) {
                window.lucide.createIcons({ root: card });
            }

            // Obtener datos de la empresa
            const userId = getUserId();
            if (!userId) throw new Error('No se pudo obtener el usuario');

            const [promptResult, profileResult] = await Promise.all([
                window.auth.sb
                    .from('prompts')
                    .select('prompt_content')
                    .eq('user_id', userId)
                    .single(),
                window.auth.sb
                    .from('profiles')
                    .select('company_description, website, social_media')
                    .eq('id', userId)
                    .single()
            ]);

            const masterPrompt = promptResult.data?.prompt_content || '';
            const companyDescription = profileResult.data?.company_description || '';
            const website = profileResult.data?.website || '';
            const socialMedia = profileResult.data?.social_media || {};

            if (!masterPrompt && !companyDescription) {
                window.showToast?.('Necesitas configurar tu prompt general o la descripción de tu empresa en Configuración', 'warning');
                return;
            }

            // Construir contexto para la IA
            let context = `Objeción del cliente: "${objectionText}"\n\n`;

            if (masterPrompt) {
                context += `Prompt general de la empresa:\n${masterPrompt}\n\n`;
            }

            if (companyDescription) {
                context += `Información de la empresa:\n${companyDescription}\n\n`;
            }

            if (website) {
                context += `Sitio web: ${website}\n`;
            }

            if (socialMedia.instagram || socialMedia.facebook) {
                context += `Redes sociales: `;
                if (socialMedia.instagram) context += `Instagram: ${socialMedia.instagram} `;
                if (socialMedia.facebook) context += `Facebook: ${socialMedia.facebook}`;
                context += '\n\n';
            }

            context += `Tarea: Genera una respuesta profesional y personalizada para esta objeción, usando la información de la empresa. La respuesta debe ser concisa (2-3 oraciones) y explicar cómo debe responder la IA cuando detecte esta objeción.`;

            // Llamar a la Edge Function de OpenAI
            const { data, error } = await window.auth.sb.functions.invoke('openai-proxy', {
                body: {
                    prompt: context,
                    systemInstruction: 'Eres un asistente experto en ventas. Genera respuestas concisas y profesionales para objeciones comunes, basándote en la información de la empresa proporcionada. La respuesta debe ser de 2-3 oraciones máximo.',
                    model: 'gpt-4o-mini'
                }
            });

            if (error) throw error;

            const generatedResponse = data?.content?.trim() || '';

            if (!generatedResponse) {
                throw new Error('No se pudo generar la respuesta');
            }

            // Actualizar la respuesta en la tarjeta (solo en modo visualización)
            if (responseText) {
                responseText.textContent = generatedResponse;
            }
            // También actualizar el input por si el usuario quiere editar después
            if (responseInput) {
                responseInput.value = generatedResponse;
            }

            // Asegurarse de que sigue en modo visualización
            if (displayDiv && editDiv) {
                displayDiv.classList.remove('hidden');
                editDiv.classList.add('hidden');
            }

            updatePreview();
            window.showToast?.('Respuesta generada correctamente. Puedes editarla haciendo clic en el ícono de lápiz.', 'success');

        } catch (error) {
            console.error('[sales-context] Error al generar respuesta:', error);
            window.showToast?.('Error al generar la respuesta: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalIcon;
            if (window.lucide?.createIcons) {
                window.lucide.createIcons({ root: card });
            }
        }
    }

    const getUserId = () => window.auth.getSession()?.user?.id;

    const buildPayloadFromForm = () => {
        // Leer estado de los toggles custom
        const activeSwitch = document.getElementById('sales-context-active-switch');
        const autoGenSwitch = document.getElementById('sales-context-auto-generate-switch');

        const isActive = activeSwitch ? activeSwitch.getAttribute('data-active') === 'true' : true;
        const autoGenerate = autoGenSwitch ? autoGenSwitch.getAttribute('data-active') === 'true' : true;

        // Obtener objeciones detectadas (de las tarjetas)
        const objectionsCards = document.querySelectorAll('#objections-list .objection-card');
        const objections = Array.from(objectionsCards).map(card => {
            // Verificar si la tarjeta está en modo edición
            const editDiv = card.querySelector('.objection-edit');
            const isEditing = editDiv && !editDiv.classList.contains('hidden');

            let objectionText, responseText;

            if (isEditing) {
                // Si está en edición, tomar valores de los inputs
                objectionText = card.querySelector('.objection-input')?.value?.trim() || '';
                responseText = card.querySelector('.response-input')?.value?.trim() || '';
            } else {
                // Si no, tomar valores del texto display
                objectionText = card.querySelector('.objection-text')?.textContent?.trim() || '';
                responseText = card.querySelector('.response-text')?.textContent?.trim() || '';
            }

            return { objection: objectionText, response: responseText };
        }).filter(obj => obj.objection && obj.response);

        return {
            title: 'Contexto de Ventas', // Título fijo ya que solo hay un contexto
            is_active: isActive,
            auto_generate_responses: autoGenerate,
            prompt: {
                detected_objections: objections.length > 0 ? objections : null,
                // Nota: Las promociones están en smart_promotions, no aquí
                // Los productos ya están en la tabla products
                // El prompt general está en la tabla prompts
            },
        };
    };

    function updatePreview() {
        // Función eliminada - ya no se muestra vista previa JSON
    }

    function setFormDisabled(disabled) {
        const form = document.getElementById('sales-context-form');
        if (!form) return;
        form.querySelectorAll('input, textarea, button[type="submit"], button[type="button"]').forEach((el) => {
            el.disabled = disabled;
        });
        if (!disabled) {
            document.getElementById('sales-context-clear')?.removeAttribute('disabled');
        }
    }

    function formatDate(value) {
        if (!value) return 'Sin guardar';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Sin guardar';
        return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    }

    // Make globally accessible for other modules if needed, or just keep internal
    window.loadDefaultObjections = loadDefaultObjections;

    function loadDefaultObjections() {
        const container = document.getElementById('sales-context-detected-objections');
        if (!container) return;

        const defaultObjections = [
            { objection: '"Es muy caro"', response: 'Preguntar si el precio es el único problema o si hay dudas técnicas' },
            { objection: '"Déjame pensarlo"', response: 'Preguntar qué duda específica tiene para poder ayudarlo' },
            { objection: '"Lo consultaré con mi socio/esposa"', response: 'Ofrecer un resumen corto de 3 puntos para compartir' }
        ];

        loadObjections(defaultObjections);
    }

    function loadObjections(objections) {
        const container = document.getElementById('sales-context-detected-objections');
        if (!container) return;

        const objectionsToLoad = objections && Array.isArray(objections) && objections.length > 0
            ? objections
            : [
                { objection: '"Es muy caro"', response: 'Preguntar si el precio es el único problema o si hay dudas técnicas' },
                { objection: '"Déjame pensarlo"', response: 'Preguntar qué duda específica tiene para poder ayudarlo' },
                { objection: '"Lo consultaré con mi socio/esposa"', response: 'Ofrecer un resumen corto de 3 puntos para compartir' }
            ];

        // Limpiar y reconstruir el contenedor
        const buttonHTML = container.querySelector('#add-objection-btn')?.outerHTML || '';
        container.innerHTML = '';

        // Agregar texto informativo
        const infoText = document.createElement('p');
        infoText.className = 'text-sm text-slate-600 mb-3';
        infoText.innerHTML = '<i data-lucide="info" class="w-4 h-4 inline mr-2"></i>La IA detectará automáticamente estas objeciones. Puedes editarlas haciendo clic en el ícono de lápiz ✏️.';
        container.appendChild(infoText);

        // Contenedor de objeciones
        const objectionsContainer = document.createElement('div');
        objectionsContainer.id = 'objections-list';
        objectionsContainer.className = 'space-y-2';
        container.appendChild(objectionsContainer);

        // Agregar objeciones
        objectionsToLoad.forEach((obj, index) => {
            const card = createObjectionCard(obj.objection, obj.response, index);
            objectionsContainer.appendChild(card);
        });

        // Agregar botón de agregar siempre usando DOM para asegurar listener
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.id = 'add-objection-btn';
        addBtn.className = 'mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2';
        addBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Agregar objeción personalizada';
        addBtn.addEventListener('click', addCustomObjection);
        container.appendChild(addBtn);

        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: container });
        }
    }

    function createObjectionCard(objection, response, index) {
        const card = document.createElement('div');
        card.className = 'flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200 objection-card';
        card.dataset.index = index;

        const isEditing = false;

        card.innerHTML = `
            <div class="flex-1">
                <div class="objection-display">
                    <p class="text-sm font-semibold text-slate-700 objection-text">${objection}</p>
                    <p class="text-xs text-slate-500 mt-1 response-text">${response}</p>
                </div>
                <div class="objection-edit hidden">
                    <input type="text" class="objection-input w-full text-sm font-semibold text-slate-700 border border-slate-300 rounded px-2 py-1 mb-2" value="${objection}" placeholder="Objeción (ej: 'Es muy caro')">
                    <textarea class="response-input w-full text-xs text-slate-500 border border-slate-300 rounded px-2 py-1" rows="2" placeholder="Cómo debe responder la IA">${response}</textarea>
                </div>
            </div>
            <div class="flex gap-1">
                <button type="button" class="text-purple-500 hover:text-purple-700 generate-response-btn" title="Generar respuesta para mi empresa">
                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                </button>
                <button type="button" class="text-blue-500 hover:text-blue-700 edit-objection-btn" title="Editar">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button type="button" class="text-green-500 hover:text-green-700 save-objection-btn hidden" title="Guardar">
                    <i data-lucide="check" class="w-4 h-4"></i>
                </button>
                <button type="button" class="text-slate-500 hover:text-slate-700 cancel-objection-btn hidden" title="Cancelar edición">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
                <button type="button" class="text-red-500 hover:text-red-700 remove-objection-btn" title="Eliminar">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        // Event listeners
        const generateBtn = card.querySelector('.generate-response-btn');
        const editBtn = card.querySelector('.edit-objection-btn');
        const saveBtn = card.querySelector('.save-objection-btn');
        const cancelBtn = card.querySelector('.cancel-objection-btn');
        const removeBtn = card.querySelector('.remove-objection-btn');
        const displayDiv = card.querySelector('.objection-display');
        const editDiv = card.querySelector('.objection-edit');
        const objectionInput = card.querySelector('.objection-input');
        const responseInput = card.querySelector('.response-input');

        generateBtn.addEventListener('click', async () => {
            // Obtener el texto actual de la objeción de la tarjeta
            const currentObjection = card.querySelector('.objection-text')?.textContent?.trim() || objection;
            await generateResponseForObjection(card, currentObjection);
        });

        editBtn.addEventListener('click', () => {
            displayDiv.classList.add('hidden');
            editDiv.classList.remove('hidden');
            editBtn.classList.add('hidden');
            saveBtn.classList.remove('hidden');
            cancelBtn.classList.remove('hidden');
            removeBtn.classList.add('hidden'); // Ocultar borrar para evitar clics accidentales
            objectionInput.focus();
        });

        cancelBtn.addEventListener('click', () => {
            // Revertir cambios
            objectionInput.value = card.querySelector('.objection-text').textContent;
            responseInput.value = card.querySelector('.response-text').textContent;

            displayDiv.classList.remove('hidden');
            editDiv.classList.add('hidden');
            editBtn.classList.remove('hidden');
            saveBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            removeBtn.classList.remove('hidden');
        });

        saveBtn.addEventListener('click', () => {
            const newObjection = objectionInput.value.trim();
            const newResponse = responseInput.value.trim();

            if (!newObjection || !newResponse) {
                window.showToast?.('La objeción y la respuesta no pueden estar vacías', 'error');
                return;
            }

            // Actualizar el contenido
            card.querySelector('.objection-text').textContent = newObjection;
            card.querySelector('.response-text').textContent = newResponse;

            displayDiv.classList.remove('hidden');
            editDiv.classList.add('hidden');
            editBtn.classList.remove('hidden');
            saveBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            removeBtn.classList.remove('hidden');

            updatePreview();
            if (window.lucide?.createIcons) {
                window.lucide.createIcons({ root: card });
            }
        });

        removeBtn.addEventListener('click', async () => {
            let confirmed = false;

            if (window.appModal && window.appModal.confirm) {
                confirmed = await window.appModal.confirm('¿Eliminar esta objeción?', 'Eliminar Objeción');
            } else {
                confirmed = window.confirm('¿Eliminar esta objeción?');
            }

            if (confirmed) {
                card.remove();
                updatePreview();
            }
        });

        // Guardar con Enter en los inputs
        [objectionInput, responseInput].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    saveBtn.click();
                }
            });
        });

        return card;
    }

    function addCustomObjection() {
        const container = document.getElementById('sales-context-detected-objections');
        if (!container) return;

        // Validar entradas si existen (dependiendo de tu HTML, puede que uses un modal o inputs en línea)
        // En este diseño parece que se crea una tarjeta vacía para editar directamente.

        let objectionsContainer = document.getElementById('objections-list');

        if (!objectionsContainer) {
            objectionsContainer = document.createElement('div');
            objectionsContainer.id = 'objections-list';
            objectionsContainer.className = 'space-y-2';
            const button = container.querySelector('#add-objection-btn');
            container.insertBefore(objectionsContainer, button || container.lastElementChild);
        }

        // Crear una nueva objeción vacía que el usuario puede editar
        const card = createObjectionCard('Nueva objeción', 'Escribe cómo debe responder la IA...', Date.now());
        objectionsContainer.appendChild(card);

        // Automáticamente entrar en modo edición
        const editBtn = card.querySelector('.edit-objection-btn');
        if (editBtn) {
            editBtn.click();
            // Intentar hacer foco en el primer input
            setTimeout(() => {
                const firstInput = card.querySelector('input, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        }

        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: container });
        }

        updatePreview();
        // Feedback visual
        window.showToast?.('Nueva objeción agregada. Edítala y guarda.', 'success');
    }

    const isMissingRelationError = (error, relationName) => {
        if (!error || error.code !== 'PGRST205') return false;
        if (!relationName) return true;
        const message = (error.message || '').toLowerCase();
        return message.includes(relationName.toLowerCase());
    };

    const shouldFallbackToLegacyPrompts = (error) => {
        if (!error) return false;
        if (isMissingRelationError(error)) return true;
        const message = (error.message || '').toLowerCase();
        return message.includes('is_active') || message.includes('column');
    };

    function disableFeatureWithMessage(message) {
        featureAvailable = false;
        setFormDisabled(true);
        // Campo de última actualización eliminado
        console.warn('[sales-context]', message);
        window.showToast?.(message, 'warning');
    }

    async function fetchActiveRecord(userId) {
        if (!featureAvailable) return null;
        const supabase = window.auth.sb;
        const columns = 'id,user_id,title,prompt,is_active,updated_at';

        const selectLatest = () => supabase
            .from('sales_prompts')
            .select(columns)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1);

        let { data, error } = await selectLatest();

        if (error && shouldFallbackToLegacyPrompts(error)) {
            ({ data, error } = await supabase
                .from('sales_prompts_active')
                .select('id,user_id,title,prompt,updated_at')
                .eq('user_id', userId)
                .limit(1));
        }

        if (error && isMissingRelationError(error, 'sales_prompts_active')) {
            disableFeatureWithMessage('El contexto comercial requiere la migración que crea sales_prompts.');
            return null;
        }

        if (error) throw error;
        return data?.[0] ?? null;
    }

    async function loadSalesContext() {
        const userId = getUserId();
        if (!userId) return;
        if (!featureAvailable) return;

        setFormDisabled(true);
        try {
            currentRecord = await fetchActiveRecord(userId);
            const activeSwitch = document.getElementById('sales-context-active-switch');
            const autoGenSwitch = document.getElementById('sales-context-auto-generate-switch');

            if (!currentRecord) {
                if (activeSwitch) {
                    activeSwitch.setAttribute('data-active', 'true');
                    updateToggleVisuals(activeSwitch, true);
                }
                if (autoGenSwitch) {
                    autoGenSwitch.setAttribute('data-active', 'true');
                    updateToggleVisuals(autoGenSwitch, true);
                }
                // Cargar objeciones por defecto
                loadDefaultObjections();
            } else {
                const isActive = currentRecord.is_active ?? true;
                const isAuto = currentRecord.auto_generate_responses ?? true;

                if (activeSwitch) {
                    activeSwitch.setAttribute('data-active', isActive);
                    updateToggleVisuals(activeSwitch, isActive);
                }
                if (autoGenSwitch) {
                    autoGenSwitch.setAttribute('data-active', isAuto);
                    updateToggleVisuals(autoGenSwitch, isAuto);
                }
                // Cargar objeciones guardadas o por defecto si no hay guardadas
                const savedObjections = currentRecord.prompt?.detected_objections;
                if (savedObjections && Array.isArray(savedObjections) && savedObjections.length > 0) {
                    loadObjections(savedObjections);
                } else {
                    loadDefaultObjections(); // Always load defaults if no custom ones
                }
            }

            // Cargar críticos
            await loadCriticalRules(userId);
        } catch (error) {
            console.error('[sales-context] No se pudo cargar el contexto:', error);
            window.showToast?.('No pudimos cargar tu contexto comercial.', 'error');
        } finally {
            if (featureAvailable) setFormDisabled(false);
            updatePreview();
        }
    }

    async function handleSave(event) {
        if (event) event.preventDefault();

        console.log('[SalesContext] Starting save process...');

        if (!featureAvailable) {
            console.warn('[SalesContext] Feature not available, aborting save.');
            return;
        }

        const userId = getUserId();
        if (!userId) {
            window.showToast?.('Inicia sesión nuevamente para guardar tu contexto.', 'error');
            return;
        }

        const saveBtn = document.getElementById('sales-context-save-btn');
        const originalBtnText = saveBtn ? saveBtn.textContent : '';

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
        }

        try {
            const payload = buildPayloadFromForm();
            console.log('[SalesContext] Payload built:', payload);

            // Validar payload
            if (!payload.prompt || payload.prompt.trim().length === 0) {
                throw new Error('El prompt principal no puede estar vacío.');
            }

            setFormDisabled(true);

            // 1. Deactivate previous prompts
            const { error: deactivateError } = await window.auth.sb
                .from('sales_prompts')
                .update({ is_active: false })
                .eq('user_id', userId);

            if (deactivateError) {
                if (isMissingRelationError(deactivateError, 'sales_prompts')) {
                    disableFeatureWithMessage('El contexto comercial requiere la tabla sales_prompts.');
                    return;
                }
                throw deactivateError;
            }

            // 2. Adjust payload for insertion (remove id if present, ensure active)
            const insertData = { ...payload };
            delete insertData.id;
            insertData.is_active = true;
            insertData.user_id = userId;

            // Ensure critical rules and objections are correctly structure
            // (buildPayloadFromForm should handle this, but double check in implementation)

            // 3. Insert new active prompt
            const { data, error } = await window.auth.sb
                .from('sales_prompts')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;

            console.log('[SalesContext] Save successful:', data);
            currentRecord = data;

            window.showToast?.('Contexto comercial guardado exitosamente.', 'success');

        } catch (error) {
            console.error('[SalesContext] Error saving context:', error);
            window.showToast?.(`Error al guardar: ${error.message || 'Intenta nuevamente'}`, 'error');
        } finally {
            if (featureAvailable) setFormDisabled(false);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalBtnText || 'Guardar Cambios';
            }
            updatePreview();
        }
    }

    // ============================================

    // ============================================
    // Funciones para Mensajes Críticos
    // ============================================

    async function loadCriticalRules(userId) {
        try {
            const { data: rules, error } = await window.auth.sb
                .from('critical_rules')
                .select('*')
                .eq('user_id', userId)
                .order('is_predefined', { ascending: false })
                .order('priority', { ascending: true });

            if (error) {
                console.error('[sales-context] Error al cargar críticos:', error);
                return;
            }

            const predefinedRules = (rules || []).filter(r => r.is_predefined);
            const customRules = (rules || []).filter(r => !r.is_predefined);

            renderPredefinedCriticalRules(predefinedRules);
            renderCustomCriticalRules(customRules);
        } catch (error) {
            console.error('[sales-context] Error al cargar críticos:', error);
        }
    }

    function renderPredefinedCriticalRules(rules) {
        const container = document.getElementById('predefined-critical-rules');
        if (!container) return;

        const defaultRules = [
            {
                rule_name: 'Solicitud de Humano',
                detection_type: 'human_request',
                is_active: true
            },
            {
                rule_name: 'Intención de Compra',
                detection_type: 'purchase_intent',
                is_active: true
            },
            {
                rule_name: 'Atención Urgente',
                detection_type: 'urgent_attention',
                is_active: true
            }
        ];

        container.innerHTML = defaultRules.map(rule => {
            const savedRule = rules.find(r => r.detection_type === rule.detection_type);
            const isActive = savedRule ? savedRule.is_active : rule.is_active;
            const ruleId = savedRule ? savedRule.id : null;

            return `
                <div class="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200" data-rule-id="${ruleId || ''}" data-detection-type="${rule.detection_type}">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" class="toggle-critical-rule h-4 w-4 rounded text-blue-600" ${isActive ? 'checked' : ''} data-rule-id="${ruleId || ''}" data-detection-type="${rule.detection_type}">
                        <div>
                            <p class="text-sm font-semibold text-slate-700">${rule.rule_name}</p>
                            <p class="text-xs text-slate-500">Detecta cuando un cliente ${rule.detection_type === 'human_request' ? 'quiere hablar con un humano' : rule.detection_type === 'purchase_intent' ? 'muestra intención de compra' : 'requiere atención urgente'}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderCustomCriticalRules(rules) {
        const container = document.getElementById('custom-critical-rules');
        if (!container) return;

        if (!rules || rules.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No has agregado críticos personalizados aún.</p>';
            return;
        }

        container.innerHTML = rules.map(rule => createCriticalRuleCard(rule)).join('');

        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: container });
        }
    }

    function createCriticalRuleCard(rule) {
        const ruleTypeLabel = rule.rule_type === 'pattern' ? 'Patrón (regex)' : 'Palabra clave';
        return `
            <div class="bg-white p-3 rounded-lg border border-slate-200 critical-rule-card" data-rule-id="${rule.id}">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <input type="checkbox" class="toggle-critical-rule h-4 w-4 rounded text-blue-600" ${rule.is_active ? 'checked' : ''} data-rule-id="${rule.id}">
                            <p class="text-sm font-semibold text-slate-700">${rule.rule_name}</p>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">${ruleTypeLabel}</span>
                        </div>
                        <p class="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded mt-1">${rule.pattern_or_keyword}</p>
                        <p class="text-xs text-slate-500 mt-1">Tipo: ${rule.detection_type}</p>
                    </div>
                    <button type="button" class="delete-critical-rule-btn text-red-500 hover:text-red-700" data-rule-id="${rule.id}" title="Eliminar">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }

    async function handleToggleCriticalRule(checkbox) {
        const ruleId = checkbox.dataset.ruleId;
        const detectionType = checkbox.dataset.detectionType;
        const isActive = checkbox.checked;

        const userId = getUserId();
        if (!userId) return;

        try {
            if (ruleId) {
                // Actualizar regla existente
                const { error } = await window.auth.sb
                    .from('critical_rules')
                    .update({ is_active: isActive })
                    .eq('id', ruleId)
                    .eq('user_id', userId);

                if (error) throw error;
            } else if (detectionType) {
                // Es una regla predefinida que aún no existe en la BD
                // Inicializar reglas por defecto primero
                const { error: initError } = await window.auth.sb.rpc('initialize_default_critical_rules', {
                    p_user_id: userId
                });

                if (initError) throw initError;

                // Luego actualizar
                const { error: updateError } = await window.auth.sb
                    .from('critical_rules')
                    .update({ is_active: isActive })
                    .eq('user_id', userId)
                    .eq('detection_type', detectionType)
                    .eq('is_predefined', true);

                if (updateError) throw updateError;
            }

            window.showToast?.('Configuración de crítico actualizada', 'success');
        } catch (error) {
            console.error('[sales-context] Error al actualizar crítico:', error);
            window.showToast?.('No se pudo actualizar el crítico', 'error');
            checkbox.checked = !isActive; // Revertir
        }
    }

    async function handleDeleteCriticalRule(button) {
        const ruleId = button.dataset.ruleId;
        if (!ruleId) return;

        const confirmed = await window.appModal?.confirm('¿Eliminar este crítico personalizado?', 'Eliminar Crítico');
        if (!confirmed) return;

        const userId = getUserId();
        if (!userId) return;

        try {
            const { error } = await window.auth.sb
                .from('critical_rules')
                .delete()
                .eq('id', ruleId)
                .eq('user_id', userId)
                .eq('is_predefined', false); // Solo permitir eliminar personalizados

            if (error) throw error;

            button.closest('.critical-rule-card')?.remove();
            window.showToast?.('Crítico eliminado', 'success');

            // Si no quedan críticos personalizados, mostrar mensaje
            const container = document.getElementById('custom-critical-rules');
            if (container && container.querySelectorAll('.critical-rule-card').length === 0) {
                container.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No has agregado críticos personalizados aún.</p>';
            }
        } catch (error) {
            console.error('[sales-context] Error al eliminar crítico:', error);
            window.showToast?.('No se pudo eliminar el crítico', 'error');
        }
    }

    function openCriticalRuleModal() {
        const modal = document.getElementById('critical-rule-ai-modal');
        if (!modal || !modal.classList) return;

        // Resetear el modal
        resetCriticalRuleModal();

        // Mostrar el modal
        modal.classList.remove('hidden');

        // Configurar listeners
        setupCriticalRuleModalListeners();

        // Renderizar iconos
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    function closeCriticalRuleModal() {
        const modal = document.getElementById('critical-rule-ai-modal');
        if (modal && modal.classList) {
            modal.classList.add('hidden');
        }
        resetCriticalRuleModal();
    }

    function resetCriticalRuleModal() {
        const nameInput = document.getElementById('critical-rule-name-input');
        const descriptionInput = document.getElementById('critical-rule-description-input');
        const patternInput = document.getElementById('critical-rule-pattern-input');
        const resultContainer = document.getElementById('ai-pattern-result-container');
        const saveBtn = document.getElementById('save-critical-rule-ai');
        const explanationEl = document.getElementById('ai-pattern-explanation');
        const generatedPatternEl = document.getElementById('ai-generated-pattern');

        if (nameInput) nameInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (patternInput) patternInput.value = '';
        if (resultContainer && resultContainer.classList) resultContainer.classList.add('hidden');
        if (saveBtn) saveBtn.disabled = true;
        if (explanationEl) explanationEl.textContent = '';
        if (generatedPatternEl) generatedPatternEl.textContent = '';
    }

    function setupCriticalRuleModalListeners() {
        const closeBtn = document.getElementById('close-critical-rule-ai-modal');
        const cancelBtn = document.getElementById('cancel-critical-rule-ai');
        const optimizeBtn = document.getElementById('optimize-pattern-ai-btn');
        const saveBtn = document.getElementById('save-critical-rule-ai');
        const patternInput = document.getElementById('critical-rule-pattern-input');
        const nameInput = document.getElementById('critical-rule-name-input');

        if (closeBtn) {
            closeBtn.onclick = closeCriticalRuleModal;
        }

        if (cancelBtn) {
            cancelBtn.onclick = closeCriticalRuleModal;
        }

        if (optimizeBtn) {
            optimizeBtn.onclick = handleOptimizePattern;
        }

        if (saveBtn) {
            saveBtn.onclick = handleSaveCriticalRule;
        }

        // Habilitar botón guardar cuando hay nombre y patrón
        const checkCanSave = () => {
            const name = nameInput?.value?.trim() || '';
            const pattern = patternInput?.value?.trim() || '';
            const canSave = name.length > 0 && pattern.length > 0;
            if (saveBtn) {
                saveBtn.disabled = !canSave;
                // Cambiar estilo visual cuando está habilitado
                if (canSave) {
                    saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    saveBtn.classList.add('hover:bg-green-700');
                } else {
                    saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    saveBtn.classList.remove('hover:bg-green-700');
                }
            }
        };

        // Verificar estado inicial
        checkCanSave();

        if (nameInput) {
            nameInput.addEventListener('input', checkCanSave);
        }
        if (patternInput) {
            patternInput.addEventListener('input', checkCanSave);
        }
    }

    async function handleOptimizePattern() {
        const descriptionInput = document.getElementById('critical-rule-description-input');
        const nameInput = document.getElementById('critical-rule-name-input');
        const optimizeBtn = document.getElementById('optimize-pattern-ai-btn');
        const resultContainer = document.getElementById('ai-pattern-result-container');
        const explanationEl = document.getElementById('ai-pattern-explanation');
        const generatedPatternEl = document.getElementById('ai-generated-pattern');
        const patternInput = document.getElementById('critical-rule-pattern-input');
        const saveBtn = document.getElementById('save-critical-rule-ai');

        if (!descriptionInput || !descriptionInput.value.trim()) {
            window.showToast?.('Por favor describe qué quieres detectar antes de optimizar con IA.', 'warning');
            return;
        }

        const userId = getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el usuario actual.', 'error');
            return;
        }

        // Deshabilitar botón y mostrar loading
        if (optimizeBtn) {
            optimizeBtn.disabled = true;
            optimizeBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
        }

        try {
            // Obtener contexto del negocio
            const [promptResult, profileResult, settingsResult] = await Promise.all([
                window.auth.sb
                    .from('prompts')
                    .select('prompt_content')
                    .eq('user_id', userId)
                    .single(),
                window.auth.sb
                    .from('profiles')
                    .select('company_description, website, social_media')
                    .eq('id', userId)
                    .single(),
                window.auth.sb
                    .from('settings')
                    .select('*')
                    .eq('user_id', userId)
                    .single()
            ]);

            const masterPrompt = promptResult.data?.prompt_content || '';
            const companyDescription = profileResult.data?.company_description || '';
            const website = profileResult.data?.website || '';
            const socialMedia = profileResult.data?.social_media || {};
            const settings = settingsResult.data || {};

            const ruleName = nameInput?.value?.trim() || 'Regla personalizada';
            const description = descriptionInput.value.trim();

            // Construir contexto para la IA
            let context = `Necesito crear una expresión regular para detectar mensajes críticos en conversaciones de WhatsApp.\n\n`;
            context += `Nombre de la regla: "${ruleName}"\n\n`;
            context += `Descripción de lo que quiero detectar: "${description}"\n\n`;

            if (masterPrompt) {
                context += `Contexto del negocio (prompt general):\n${masterPrompt}\n\n`;
            }

            if (companyDescription) {
                context += `Descripción de la empresa:\n${companyDescription}\n\n`;
            }

            if (website) {
                context += `Sitio web: ${website}\n`;
            }

            if (settings.product_catalog || settings.service_catalog) {
                context += `Catálogo de productos/servicios: ${JSON.stringify(settings.product_catalog || settings.service_catalog || {})}\n\n`;
            }

            context += `\nTarea: Genera una expresión regular (regex) en JavaScript que detecte mensajes relacionados con: "${description}". `;
            context += `La expresión regular debe ser flexible para capturar variaciones naturales del lenguaje (con y sin acentos, diferentes formas de escribir, etc.). `;
            context += `Debe ser case-insensitive y capturar variaciones comunes en español mexicano.\n\n`;
            context += `Responde SOLO con la expresión regular, sin explicaciones adicionales. Ejemplo de formato: (palabra1|palabra2).*(palabra3|palabra4)`;

            const systemInstruction = `Eres un experto en expresiones regulares y procesamiento de lenguaje natural en español mexicano. 
Genera expresiones regulares optimizadas para detectar patrones en conversaciones de WhatsApp.
Las expresiones deben:
- Ser flexibles para capturar variaciones naturales del lenguaje
- Incluir variaciones con y sin acentos
- Ser case-insensitive
- Capturar diferentes formas de escribir palabras comunes
- Usar grupos de captura y alternativas (|) cuando sea apropiado
- Incluir .* para permitir palabras intermedias cuando sea necesario

Responde SOLO con la expresión regular, sin código adicional, sin explicaciones, sin markdown, sin backticks.`;

            // Llamar a la Edge Function de OpenAI
            const { data, error } = await window.auth.sb.functions.invoke('openai-proxy', {
                body: {
                    prompt: context,
                    systemInstruction: systemInstruction,
                    model: 'gpt-4o-mini'
                }
            });

            if (error) throw error;

            const generatedPattern = data?.content?.trim() || '';

            // Limpiar el patrón (quitar backticks, markdown, etc.)
            const cleanPattern = generatedPattern
                .replace(/```[a-z]*\n?/g, '')
                .replace(/```/g, '')
                .replace(/^regex[:=]\s*/i, '')
                .trim();

            if (!cleanPattern) {
                throw new Error('No se pudo generar el patrón');
            }

            // Mostrar resultado
            if (resultContainer && resultContainer.classList) resultContainer.classList.remove('hidden');
            if (explanationEl) {
                explanationEl.textContent = `Basándome en tu descripción "${description}", la IA generó este patrón para detectar mensajes relacionados:`;
            }
            if (generatedPatternEl) generatedPatternEl.textContent = cleanPattern;
            if (patternInput) {
                patternInput.value = cleanPattern;
                // Disparar evento 'input' para que los listeners de checkCanSave se ejecuten
                patternInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Verificar explícitamente el estado del botón guardar después de generar el patrón
            if (saveBtn && nameInput) {
                const hasName = nameInput.value?.trim().length > 0;
                const hasPattern = cleanPattern.length > 0;
                const canSave = hasName && hasPattern;

                saveBtn.disabled = !canSave;
                if (canSave) {
                    saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    saveBtn.classList.add('hover:bg-green-700');
                } else {
                    saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    saveBtn.classList.remove('hover:bg-green-700');
                }

                // Si no hay nombre, sugerir al usuario que lo ingrese
                if (!hasName && hasPattern) {
                    window.showToast?.('Patrón generado. Por favor ingresa un nombre para el crítico.', 'info');
                }
            }

            window.showToast?.('Patrón generado por IA correctamente. Puedes editarlo si lo necesitas.', 'success');

        } catch (error) {
            console.error('[sales-context] Error al generar patrón con IA:', error);
            window.showToast?.('Error al generar patrón con IA: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            if (optimizeBtn) {
                optimizeBtn.disabled = false;
                optimizeBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i><span>Optimizar por IA</span>';
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons({ root: optimizeBtn });
                }
            }
        }
    }

    async function handleSaveCriticalRule() {
        const userId = getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el usuario actual.', 'error');
            return;
        }

        const nameInput = document.getElementById('critical-rule-name-input');
        const patternInput = document.getElementById('critical-rule-pattern-input');
        const saveBtn = document.getElementById('save-critical-rule-ai');

        const ruleName = nameInput?.value?.trim();
        const patternOrKeyword = patternInput?.value?.trim();

        if (!ruleName || ruleName.length === 0) {
            window.showToast?.('Por favor ingresa un nombre para el crítico.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
            return;
        }

        if (!patternOrKeyword || patternOrKeyword.length === 0) {
            window.showToast?.('Por favor genera o ingresa un patrón antes de guardar.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
            return;
        }

        // Siempre usar 'custom' como tipo de detección por defecto
        const detectionTypeValue = 'custom';

        // Deshabilitar botón
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
        }

        try {
            // Validar que el patrón sea una expresión regular válida
            try {
                new RegExp(patternOrKeyword, 'i');
            } catch (regexError) {
                const errorMsg = 'El patrón ingresado no es una expresión regular válida. Por favor corrígelo.';
                window.showToast?.(errorMsg, 'error');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Guardar';
                }
                return;
            }

            // Guardar en la base de datos
            const { data, error } = await window.auth.sb
                .from('critical_rules')
                .insert({
                    user_id: userId,
                    rule_name: ruleName,
                    rule_type: 'pattern', // Siempre usamos pattern ya que la IA genera expresiones regulares
                    pattern_or_keyword: patternOrKeyword,
                    detection_type: detectionTypeValue,
                    is_active: true,
                    is_predefined: false,
                    priority: 100
                });

            if (error) throw error;

            // Recargar críticos
            await loadCriticalRules(userId);
            window.showToast?.('✅ Crítico guardado exitosamente', 'success');

            // Cerrar modal
            closeCriticalRuleModal();
        } catch (error) {
            console.error('[sales-context] Error al guardar crítico:', error);
            const errorMessage = error.message || 'Error desconocido';
            window.showToast?.('❌ Error al guardar: ' + errorMessage, 'error');

            // Restaurar botón en caso de error
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        } finally {
            // Solo restaurar si no se guardó exitosamente (el modal se cerró)
            const modal = document.getElementById('critical-rule-ai-modal');
            if (modal && !modal.classList.contains('hidden') && saveBtn) {
                // El modal sigue abierto, verificar si el botón debe estar habilitado
                const nameInput = document.getElementById('critical-rule-name-input');
                const patternInput = document.getElementById('critical-rule-pattern-input');
                const hasName = nameInput?.value?.trim().length > 0;
                const hasPattern = patternInput?.value?.trim().length > 0;
                saveBtn.disabled = !(hasName && hasPattern);
                saveBtn.textContent = 'Guardar';
            }
        }
    }

    async function addCustomCriticalRule() {
        openCriticalRuleModal();
    }
})();
