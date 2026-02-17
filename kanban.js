// kanban.js - Módulo para el panel Kanban

(function () {
    let isInitialized = false;
    let allLabels = [];
    let teamMembers = []; // Caché para los miembros del equipo
    let allContacts = [];
    let currentKanbanView = '_individual_';
    let realtimeChannel = null; // Para gestionar la suscripción
    function getAdvisorLabelFilters(scope) {
        const teamInfo = window.appInstance?.teamInfo;
        if (teamInfo?.user_role !== 'advisor') return null;
        const filters = teamInfo?.permissions?.label_filters || teamInfo?.permissions?.labelFilters;
        const scoped = filters?.[scope];
        if (!Array.isArray(scoped) || scoped.length === 0) return null;
        return scoped.filter(Boolean);
    }


    function extractMembersFromTeamInfo(teamInfo) {
        if (!teamInfo) return [];
        const possibleArrays = [
            teamInfo.members,
            teamInfo.team_members,
            teamInfo.teamMembers,
            teamInfo.member_list,
        ].filter(Array.isArray);

        if (!possibleArrays.length) return [];

        const normalizedMembers = [];
        for (const arr of possibleArrays) {
            arr.forEach(member => {
                const userId = member?.user_id || member?.id || member?.member_id || member?.userId;
                if (!userId) return;
                normalizedMembers.push({
                    user_id: userId,
                    profiles: member.profiles || {
                        full_name: member.full_name || member.name || null,
                        email: member.email || null,
                    },
                });
            });
            if (normalizedMembers.length) break;
        }
        return normalizedMembers;
    }

    async function initKanbanPanel() {
        if (isInitialized) return;
        console.log('Inicializando panel Kanban...');
        isInitialized = true;

        await loadInitialData();
        setupEventListeners();
        populateControls();
    }

    // --- INICIO: CORRECCIÓN DE INICIALIZACIÓN DEFINITIVA (v2) ---
    // Se consolida toda la lógica en un único listener para evitar ejecuciones múltiples.
    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'kanban') {
            // Inicializar el panel solo la primera vez que se activa
            if (!isInitialized) {
                initKanbanPanel();
            }
            subscribeToChanges();
        } else {
            unsubscribeFromChanges();
        }
    });

    async function loadInitialData() {
        const loader = document.getElementById('kanban-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            // --- INICIO: CORRECCIÓN para obtener datos de forma más segura ---
            const session = window.auth.getSession();
            if (!session) throw new Error("No hay sesión activa.");
            const userId = session.user.id;
            const teamInfo = await window.appInstance.loadTeamInfo(); // Aseguramos tener la info más reciente
            // --- FIN: CORRECCIÓN ---

            const labelsPromise = window.auth.sb.from('labels').select('*').eq('user_id', userId);
            const contactsPromise = window.auth.sb.from('contacts').select('id, full_name, phone_number, labels, razon_de_label_auto, assigned_to_id');
            const [labelsRes, contactsRes] = await Promise.all([labelsPromise, contactsPromise]);
            if (labelsRes.error) throw labelsRes.error;
            if (contactsRes.error) throw contactsRes.error;

            allLabels = labelsRes.data;
            allContacts = contactsRes.data;

            teamMembers = [];

            const isTeamAdmin = teamInfo?.user_role === 'admin';
            if (isTeamAdmin) {
                let memberRows = extractMembersFromTeamInfo(teamInfo);

                if (memberRows.length) {
                    const memberIds = memberRows.map(m => m.user_id).filter(Boolean);
                    if (memberIds.length) {
                        const { data: profilesData, error: profilesError } = await window.auth.sb
                            .from('profiles')
                            .select('id, full_name, email')
                            .in('id', memberIds);

                        if (profilesError) {
                            console.warn('Error al obtener perfiles de miembros del equipo:', profilesError);
                            teamMembers = memberRows.map(member => ({
                                ...member,
                                profiles: null,
                            }));
                        } else {
                            const profileMap = Object.fromEntries((profilesData || []).map(profile => [profile.id, profile]));
                            teamMembers = memberRows.map(member => ({
                                ...member,
                                profiles: profileMap[member.user_id] || null,
                            }));
                        }
                    } else {
                        teamMembers = memberRows.map(member => ({ ...member, profiles: null }));
                    }
                } else {
                    console.warn('No se obtuvo información de miembros del equipo desde teamInfo. La asignación de asesores podría no estar disponible.');
                }
            }

        } catch (e) {
            console.error('Error al cargar datos para Kanban:', e);
            if (loader) loader.textContent = 'Error al cargar datos.';
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    function setupEventListeners() {
        const boardContainer = document.getElementById('kanban');
        if (!boardContainer) return;

        // Usar delegación de eventos para los controles
        boardContainer.addEventListener('click', (e) => {
            if (e.target.id === 'kanban-individual-btn') {
                setActiveControl(e.target);
                currentKanbanView = '_individual_';
                renderBoard(currentKanbanView); // Renderiza etiquetas sin funnel
            }
        });

        boardContainer.addEventListener('change', (e) => { // Escucha cambios en el contenedor
            if (e.target.id === 'kanban-funnel-select') {
                setActiveControl(e.target);
                currentKanbanView = e.target.value || '_individual_';
                renderBoard(currentKanbanView);
            }
        });


        // Listener para abrir el modal de información del contacto
        document.getElementById('kanban-board')?.addEventListener('click', (e) => {
            const infoIcon = e.target.closest('[data-lucide="info"]');
            if (infoIcon) {
                openContactInfoModal(infoIcon.closest('.kanban-card').dataset.contactId);
            }
        });

        // Listener para asignar un contacto a un asesor
        document.getElementById('kanban-board')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('assign-advisor-select')) {
                handleAssignAdvisor(e.target.dataset.contactId, e.target.value);
            }
        });

        // --- INICIO: CORRECCIÓN - Lógica de tooltips movida aquí ---
        document.getElementById('kanban-board')?.addEventListener('mouseover', (e) => {
            setupKanbanTooltips(e);
        });
    }

    function setActiveControl(activeElement) {
        // Iterar sobre los elementos que pueden ser controles (botones o selects)
        document.querySelectorAll('#kanban-controls .kanban-control-item').forEach(el => {
            el.classList.remove('bg-blue-600', 'text-white', 'border-blue-500', 'ring-2', 'ring-blue-200', 'ring-blue-300');
            el.classList.add('border-slate-300', 'bg-white', 'text-slate-700', 'shadow-sm');
        });

        const controlWrapper = activeElement.closest('.kanban-control-item');
        if (!controlWrapper) return;

        controlWrapper.classList.remove('border-slate-300');
        controlWrapper.classList.add('border-blue-500', 'ring-2', 'ring-blue-300');

        if (controlWrapper.tagName === 'BUTTON') {
            controlWrapper.classList.add('bg-blue-600', 'text-white');
            controlWrapper.classList.remove('bg-white', 'text-slate-700');
        } else {
            controlWrapper.classList.add('ring-blue-300');
        }
    }

    function populateControls() {
        const funnelNames = [...new Set(allLabels.map(l => l.funnel_name).filter(Boolean))].sort();
        const hasIndividualLabels = allLabels.some(l => !l.funnel_name);

        // Limpiar solo los controles de vista, no la cabecera
        const controlsContainer = document.getElementById('kanban-controls');
        if (!controlsContainer) return;
        controlsContainer.innerHTML = '';

        // Botón para Etiquetas Individuales (siempre visible si hay etiquetas)
        if (hasIndividualLabels) {
            controlsContainer.innerHTML += `
                <div>
                    <h4 class="text-xs text-slate-400 uppercase font-bold mb-1 ml-1">Vista</h4>
                    <button id="kanban-individual-btn" class="kanban-control-item font-semibold py-2 px-4 rounded-lg text-sm border-2 border-slate-300 bg-white text-slate-700 hover:border-blue-400 transition-colors shadow-sm">Etiquetas Individuales</button>
                </div>
            `;
        }

        // Selector para Funnels (solo si existen)
        if (funnelNames.length > 0) {
            controlsContainer.innerHTML += `
                <div>
                    <h4 class="text-xs text-slate-400 uppercase font-bold mb-1 ml-1">Funnels</h4>
                    <div class="kanban-control-item custom-select-wrapper rounded-lg border-2 border-slate-300 bg-white text-slate-700 shadow-sm transition-colors">
                        <select id="kanban-funnel-select" class="custom-select form-input text-sm font-semibold py-2 bg-transparent focus:outline-none">
                            <option value="" disabled>-- Seleccionar Funnel --</option>
                            ${funnelNames.map(name => `<option value="${name}">${name}</option>`).join('')}
                        </select>
                        <i data-lucide="chevron-down" class="select-icon w-5 h-5 text-slate-500"></i>
                    </div>
                </div>
            `;
        }

        if (controlsContainer.innerHTML === '') {
            document.getElementById('kanban-board').innerHTML = '<div class="w-full text-center p-8"><p class="text-slate-500">Crea etiquetas o un funnel en "Etiquetas IA" para empezar a visualizar tus contactos.</p></div>';
            return;
        }

        // Por defecto, activar y mostrar "Etiquetas Individuales" si existe
        const individualBtn = document.getElementById('kanban-individual-btn');
        if (individualBtn) {
            setActiveControl(individualBtn);
            currentKanbanView = '_individual_';
            renderBoard(currentKanbanView);
        } else { // Si no, mostrar el primer funnel
            const funnelSelect = document.getElementById('kanban-funnel-select');
            if (funnelSelect) {
                setActiveControl(funnelSelect);
                currentKanbanView = funnelSelect.value || '_individual_';
                renderBoard(funnelSelect.value);
            }
        }

        // Listener para el botón de volver (se añade aquí para asegurar que exista)
        document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
            window.appInstance.switchPanel('dashboard');
        });
    }

    function renderBoard(funnelName) {
        const board = document.getElementById('kanban-board');
        if (!board) return;

        const viewName = (typeof funnelName === 'string' && funnelName.length) ? funnelName : '_individual_';
        currentKanbanView = viewName;

        const teamInfo = window.appInstance?.teamInfo;
        const userRole = teamInfo?.user_role;
        const userName = teamInfo?.profiles?.full_name;

        let contactsToRender = allContacts;
        let advisorLabelScope = null;
        if (userRole === 'advisor') {
            advisorLabelScope = getAdvisorLabelFilters('contacts');
            if (advisorLabelScope) {
                contactsToRender = allContacts.filter(c => (c.labels || []).some(label => advisorLabelScope.includes(label)));
            } else if (userName) {
                contactsToRender = allContacts.filter(c => (c.labels || []).includes(userName));
            }
        }

        // --- INICIO: CORRECCIÓN para verificar plan Business y rol de admin ---
        const userPlan = window.appInstance?.userPlan; // Acceder al plan ya cargado
        const canAssignAdvisors = window.appInstance?.teamInfo?.user_role === 'admin' && userPlan?.plans?.features?.multi_user;
        // --- FIN: CORRECCIÓN ---

        let labelsToRender;

        if (viewName === '_individual_') {
            // Si se seleccionan etiquetas individuales, filtramos las que no tienen funnel_name
            labelsToRender = allLabels.filter(l => !l.funnel_name).sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // Si se selecciona un funnel, filtramos por nombre y ordenamos por 'funnel_order'
            labelsToRender = allLabels
                .filter(l => l.funnel_name === viewName)
                .sort((a, b) => (a.funnel_order || 0) - (b.funnel_order || 0));
        }

        if (advisorLabelScope) {
            labelsToRender = labelsToRender.filter(label => advisorLabelScope.includes(label.name));
        }

        if (labelsToRender.length === 0) {
            board.innerHTML = '<p class="text-slate-500 p-4">No hay etiquetas para mostrar en esta vista.</p>';
            return;
        }

        board.innerHTML = labelsToRender.map(label => {
            const labelColor = getLabelColor(label.color);
            // Ordenar contactos por cantidad de etiquetas: más etiquetas primero
            const contactsInColumn = contactsToRender
                .filter(c => (c.labels || []).includes(label.name))
                .sort((a, b) => {
                    const aLabelsCount = (a.labels || []).length;
                    const bLabelsCount = (b.labels || []).length;
                    return bLabelsCount - aLabelsCount; // Más etiquetas primero
                });
            
            // Calcular altura máxima para scroll: si hay más de 10 contactos, limitar altura
            const hasManyContacts = contactsInColumn.length > 10;
            const maxHeightClass = hasManyContacts ? 'max-h-[600px]' : '';
            
            return `
                <div class="kanban-column w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 flex-shrink-0 p-2">
                    <div class="bg-slate-100 rounded-lg shadow-sm flex flex-col h-full">
                    <h3 class="font-bold text-slate-800 p-3 border-b-4 flex-shrink-0" style="border-color: ${labelColor};">${label.name} <span class="text-sm font-normal text-slate-500">${contactsInColumn.length}</span></h3>
                    <div class="kanban-cards p-3 space-y-3 flex-grow overflow-y-auto ${maxHeightClass}" data-label-id="${label.id}" style="${hasManyContacts ? 'max-height: 600px;' : ''}">
                        ${contactsInColumn.map(contact => `
                            <div class="kanban-card bg-white p-3 rounded-md shadow-sm" data-contact-id="${contact.id}">
                                <div class="flex justify-between items-start relative">
                                    <p class="font-semibold text-sm">${contact.full_name || 'Sin nombre'}</p>
                                    ${contact.razon_de_label_auto ? `                                        
                                        <i data-lucide="info" class="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-600 z-20 group"></i>
                                        <div class="kanban-tooltip w-64 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            ${contact.razon_de_label_auto}
                                            <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-800"></div>
                                        </div>                                        
                                    ` : `<i data-lucide="info" class="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-600 z-20"></i>`}
                                </div>
                                <p class="text-xs text-slate-500">${contact.phone_number}</p>
                                ${canAssignAdvisors ? `
                                    <div class="mt-2 pt-2 border-t border-slate-100">
                                        <div class="custom-select-wrapper">
                                            <select class="assign-advisor-select custom-select form-input text-xs py-1" data-contact-id="${contact.id}">
                                                <option value="">Sin asignar</option>
                                                ${teamMembers.map(member => {
                                                    const memberProfile = member.profiles;
                                                    return `<option value="${member.user_id}" ${contact.assigned_to_id === member.user_id ? 'selected' : ''}>
                                                        ${memberProfile?.full_name || memberProfile?.email || 'Asesor sin nombre'}
                                                    </option>`;
                                                }).join('')}
                                            </select>
                                            <i data-lucide="user-check" class="select-icon w-3 h-3 text-slate-400"></i>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('') || '<p class="text-xs text-slate-400 p-2">Sin contactos</p>'}
                    </div></div>
                </div>
            `;
        }).join('');
        if (window.Sortable) initSortable(); // <-- CORRECCIÓN: Llamar solo si Sortable está disponible
    }

    function initSortable() {
        // --- INICIO: CORRECCIÓN DEFINITIVA DEL BUCLE DE ERRORES ---
        // 1. Asegurarse de que el panel Kanban exista antes de hacer nada.
        const board = document.getElementById('kanban-board');
        if (!board) return;

        // 2. Buscar las columnas solo DENTRO del panel Kanban.
        const columns = board.querySelectorAll('.kanban-cards');
        if (columns.length > 0 && columns[0].sortable) { // Evitar reinicializar
            columns.forEach(c => c.sortable.destroy());
        }
        columns.forEach(column => {
            column.sortable = new Sortable(column, {
                group: 'kanban', // Permite mover tarjetas entre columnas
                animation: 150,
                onEnd: handleCardMove, // Función que se ejecuta al soltar una tarjeta
                onMove: (evt) => {
                    // Lógica mejorada para impedir el movimiento
                    const contactId = evt.dragged.dataset.contactId;
                    const newLabelId = evt.to.dataset.labelId;
                    const contact = allContacts.find(c => c.id == contactId);
                    const newLabel = allLabels.find(l => l.id == newLabelId);

                    if (!contact || !newLabel) return false; // No mover si no hay datos

                    // Devuelve 'false' (impide el movimiento) si el contacto ya tiene la etiqueta de destino.
                    return !(contact.labels || []).includes(newLabel.name);
                },
                // Añade una clase visual mientras se arrastra
                ghostClass: "bg-blue-100",
                // Y otra al elemento que se arrastra
                dragClass: "opacity-50"
            });
        });
        // --- FIN: CORRECCIÓN DEFINITIVA DEL BUCLE DE ERRORES ---
    }

    async function handleCardMove(evt) {
        const contactId = evt.item.dataset.contactId;
        const newLabelId = evt.to.dataset.labelId;
        const oldLabelId = evt.from.dataset.labelId;

        if (newLabelId === oldLabelId) return; // No hacer nada si se mueve en la misma columna

        const newLabel = allLabels.find(l => l.id == newLabelId);
        const oldLabel = allLabels.find(l => l.id == oldLabelId);

        if (!newLabel || !oldLabel) return;

        try {
            // Obtener las etiquetas actuales del contacto
            const contact = allContacts.find(c => c.id == contactId);
            if (!contact) throw new Error('Contacto no encontrado en la caché.');

            // Actualizar etiquetas: eliminar solo la etiqueta de la columna de origen y agregar la de destino
            // Mantiene todas las demás etiquetas, permitiendo que el contacto aparezca en múltiples columnas
            const currentLabels = new Set(contact.labels || []);
            currentLabels.delete(oldLabel.name); // Eliminar solo la etiqueta de la columna de origen
            currentLabels.add(newLabel.name); // Agregar la etiqueta de la columna de destino
            const updatedLabels = Array.from(currentLabels);

            const { error } = await window.auth.sb.from('contacts').update({ labels: updatedLabels }).eq('id', contactId);
            if (error) throw error;

            window.showToast(`Contacto movido a "${newLabel.name}"`, 'success');
            // Recargar datos y renderizar para reflejar el cambio y los contadores
            // Ya no es necesario recargar todo, Realtime lo hará. Solo actualizamos la caché local y re-renderizamos.
            contact.labels = updatedLabels;

            renderBoard(currentKanbanView);
        } catch (e) {
            console.error('Error al mover la tarjeta:', e);
            window.showToast('Error al actualizar el contacto.', 'error');
            // Opcional: revertir el movimiento en la UI si falla la DB
            evt.from.appendChild(evt.item);
        }
    }

    async function handleAssignAdvisor(contactId, advisorId) {
        const newAssignedId = advisorId || null; // Convertir string vacío a null para la DB
        try {
            const { error } = await window.auth.sb
                .from('contacts')
                .update({ assigned_to_id: newAssignedId })
                .eq('id', contactId);

            if (error) throw error;

            window.showToast('Contacto asignado correctamente.', 'success');
        } catch (e) {
            console.error('Error al asignar el contacto:', e);
            window.showToast('No se pudo asignar el contacto.', 'error');
        }
    }

    async function handleAssignAdvisor(contactId, advisorId) {
        const newAssignedId = advisorId || null; // Convertir string vacío a null para la DB
        try {
            const { error } = await window.auth.sb
                .from('contacts')
                .update({ assigned_to_id: newAssignedId })
                .eq('id', contactId);

            if (error) throw error;

            window.showToast('Contacto asignado correctamente.', 'success');
        } catch (e) {
            console.error('Error al asignar el contacto:', e);
            window.showToast('No se pudo asignar el contacto.', 'error');
        }
    }

    // --- LÓGICA DEL MODAL DE INFORMACIÓN ---

    function openContactInfoModal(contactId) {
        const contact = allContacts.find(c => c.id == contactId);
        if (!contact) return;

        const modal = document.getElementById('contact-info-modal');
        const modalBody = document.getElementById('contact-info-modal-body');
        if (!modal || !modalBody) return;

        // Rellenar el cuerpo del modal
        modalBody.innerHTML = `
            <div>
                <p class="text-lg font-bold">${contact.full_name || 'Sin nombre'}</p>
                <p class="text-sm text-slate-500">${contact.phone_number}</p>
            </div>
            <div class="border-t pt-4">
                <h5 class="font-semibold mb-2">Etiquetas</h5>
                <div class="flex flex-wrap gap-2">
                    ${(contact.labels || []).filter(l => l !== 'ignorar').map(labelName => {
                        const labelData = allLabels.find(l => l.name === labelName);
                        const bgColor = labelData ? getLabelColor(labelData.color) : '#A0AEC0';
                        const textColor = getTextColorForBg(bgColor);
                        return `<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full" style="background-color: ${bgColor}; color: ${textColor};">${labelName}</span>`;
                    }).join('') || '<span class="text-xs text-slate-400">Sin etiquetas</span>'}
                </div>
            </div>
            <div class="border-t pt-4">
                <h5 class="font-semibold mb-2">Información de IA</h5>
                <div class="flex flex-wrap gap-2">
                    ${contact.razon_de_label_auto ? `
                        <p class="text-sm bg-blue-50 p-3 rounded-md text-slate-700">${contact.razon_de_label_auto}</p>
                    ` : `
                        <p class="text-xs text-slate-400">No hay información de IA para este contacto.</p>
                    ` }
                </div>
            </div>
        `;

        // Configurar los botones del pie de página
        document.getElementById('contact-info-modal-labels-btn').onclick = () => {
            closeContactInfoModal(); // <-- AÑADIDO: Cierra el modal actual primero
            window.contacts.openLabelsModalForSingleContact(contactId);
        };
        document.getElementById('contact-info-modal-chat-btn').onclick = () => {
            // --- CORRECCIÓN: Navegar al panel de chats y abrir la conversación directamente ---
            // Cierra el modal actual
            closeContactInfoModal();
            // Cambia al panel de chats
            window.appInstance.switchPanel('chats', { contactId: contact.id });
            // El código anterior esperaba que el elemento existiera en el DOM, lo cual es frágil.
            // Ahora, pasamos el contactId directamente al cambiar de panel.
            // El módulo de chats deberá ser capaz de manejar este parámetro.
            /* CÓDIGO ANTERIOR (ELIMINADO)
            setTimeout(() => {
                const contactItem = document.querySelector(`.contact-item[data-contact-id="${contactId}"]`);
                if (contactItem) contactItem.click();
            }, 200);
            */
        };

        modal.classList.remove('hidden');
        document.getElementById('close-contact-info-modal-btn').onclick = closeContactInfoModal;
        lucide.createIcons(); // CORRECCIÓN: Renderizar iconos del modal
    }

    // --- INICIO: CORRECCIÓN - Lógica de tooltips ---
    function setupKanbanTooltips(e) {
        const card = e.target.closest('.kanban-card');
        if (!card) return;

        const tooltip = card.querySelector('.kanban-tooltip');
        if (!tooltip) return;

        const board = document.getElementById('kanban-board');
        if (!board) return;

        const cardRect = card.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        const tooltipHeight = tooltip.offsetHeight;

        // Posición relativa al 'kanban-board' para evitar que se salga
        const topRelativeToBoard = cardRect.top - boardRect.top;

        // Decidir si mostrar arriba o abajo
        if (topRelativeToBoard > tooltipHeight + 10) { // Hay espacio arriba
            tooltip.style.bottom = '100%';
            tooltip.style.top = 'auto';
        } else { // No hay espacio arriba, mostrar abajo
            tooltip.style.top = '100%';
            tooltip.style.bottom = 'auto';
        }
    }
    // --- FIN: CORRECCIÓN ---

    function closeContactInfoModal() {
        document.getElementById('contact-info-modal').classList.add('hidden');
    }

    // --- FUNCIONES DE UTILIDAD (COPIADAS DE contacts.js) ---
    const colorPalette = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
        '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
        '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#FFFFFF' 
    ];

    function getLabelColor(colorValue) {
        if (typeof colorValue === 'string' && colorValue.startsWith('#')) {
            return colorValue;
        }
        const index = parseInt(colorValue, 10);
        if (!isNaN(index) && index >= 0 && index < colorPalette.length) {
            return colorPalette[index];
        }
        return '#A0AEC0'; // Un gris neutral por defecto
    }

    function getTextColorForBg(bgColor) {
        if (!bgColor || !bgColor.startsWith('#')) return '#1e293b';
        const color = bgColor.substring(1, 7);
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luma > 0.5 ? '#1e293b' : '#ffffff';
    }

    function subscribeToChanges() {
        // Evitar múltiples suscripciones
        if (realtimeChannel) return;

        const userId = window.auth.getSession()?.user?.id;
        if (!userId) return;

        realtimeChannel = window.auth.sb
            .channel('public:contacts')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'contacts', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const updatedContact = payload.new;

                    // Actualizar el contacto en nuestra caché local
                    const index = allContacts.findIndex(c => c.id === updatedContact.id);
                    if (index !== -1) {
                        allContacts[index] = { ...allContacts[index], ...updatedContact };
                    } else {
                        allContacts.push(updatedContact); // Si es un contacto nuevo en el scope
                    }

                    // Volver a renderizar el tablero con los datos actualizados
                    renderBoard(currentKanbanView);
                    window.showToast('El tablero se ha actualizado automáticamente.', 'info');
                }
            )
            .subscribe();
    }

    function unsubscribeFromChanges() {
        if (realtimeChannel) {
            window.auth.sb.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
    }
})();
