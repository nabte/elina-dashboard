// chats.js - Módulo para el panel de Chats

(function () {
    let isInitialized = false;
    let currentContactId = null;
    let currentContact = null;
    let allUserLabels = []; // Caché para todas las etiquetas del usuario
    let allRecentContacts = []; // Caché de contactos recientes para búsqueda
    let allContactsForSearch = []; // Caché de todos los contactos para búsqueda en nuevo chat
    let allContactsForChatSearch = []; // Caché de todos los contactos para búsqueda en el buscador de chats
    let allRecentGroups = []; // Caché de grupos recientes para búsqueda
    let currentViewMode = 'contacts'; // 'contacts' o 'groups'
    let currentGroupId = null; // ID del grupo actual si estamos en modo grupos
    let currentGroup = null; // Datos del grupo actual

    function getAdvisorLabelFilters(scope) {
        const teamInfo = window.appInstance?.teamInfo;
        if (teamInfo?.user_role !== 'advisor') return null;
        const filters = teamInfo?.permissions?.label_filters || teamInfo?.permissions?.labelFilters;
        const scoped = filters?.[scope];
        if (!Array.isArray(scoped) || scoped.length === 0) return null;
        return scoped.filter(Boolean);
    }
    let chatRealtimeChannel = null; // Para la suscripción en tiempo real
    let isTypingRef = { current: false }; // Para controlar si el usuario está escribiendo
    let typingTimeoutRef = { current: null }; // Para el temporizador de "dejó de escribir"
    let typingUsersState = []; // Para no depender del estado de React en callbacks
    let pendingEchoMessages = []; // Mensajes enviados localmente pendientes de confirmación
    let lastRenderedDateKey = null; // Divide mensajes por día mostrado
    let attachedFile = null; // Para la imagen adjunta

    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'chats') {
            if (!isInitialized) {
                initChatsPanel();
            }
            // --- CORRECCIÓN: Abrir un chat específico si se pasa como opción ---
            if (detail.options?.contactId) {
                // Esperar un poco para asegurar que la lista de contactos esté cargada
                setTimeout(() => loadChatForContact(detail.options.contactId), 200);
            }
        } else {
            // Desuscribirse al salir del panel para ahorrar recursos
            unsubscribeFromChatChanges();
        }
    });

    async function initChatsPanel() {
        //         console.log('Inicializando panel de Chats...');
        isInitialized = true;
        setupEventListeners();
        if (window.lucide?.createIcons) {
            lucide.createIcons();
        }
        const userId = window.auth.getSession()?.user?.id;
        allUserLabels = await window.auth.sb.from('labels').select('*').eq('user_id', userId).then(res => res.data || []);

        // Cargar todos los contactos para búsqueda
        await loadAllContactsForSearch();

        // Cargar contactos por defecto
        await loadContactsList();

        // Abrir el chat más reciente por defecto
        const firstContactItem = document.querySelector('#chat-contacts-list .contact-item, #chat-contacts-list .group-item');
        if (firstContactItem) {
            firstContactItem.click();
        }
    }

    function setupEventListeners() {
        // Listener para la lista de contactos/grupos
        document.getElementById('chat-contacts-list')?.addEventListener('click', (e) => {
            const contactItem = e.target.closest('.contact-item');
            const groupItem = e.target.closest('.group-item');

            if (contactItem) {
                // Marcar item como activo
                document.querySelectorAll('.contact-item, .group-item').forEach(item => {
                    if (item && item.classList) item.classList.remove('bg-slate-200');
                });
                if (contactItem && contactItem.classList) contactItem.classList.add('bg-slate-200');

                const contactId = contactItem.dataset.contactId;
                const contactName = contactItem.dataset.contactName;
                const contactPhone = contactItem.dataset.contactPhone;
                currentViewMode = 'contacts';
                loadChatForContact(contactId);
            } else if (groupItem) {
                // Marcar item como activo
                document.querySelectorAll('.contact-item, .group-item').forEach(item => {
                    if (item && item.classList) item.classList.remove('bg-slate-200');
                });
                if (groupItem && groupItem.classList) groupItem.classList.add('bg-slate-200');

                const groupId = groupItem.dataset.groupId;
                const groupName = groupItem.dataset.groupName;
                currentViewMode = 'groups';
                loadChatForGroup(groupId);
            }
        });

        // Listeners para toggle entre contactos y grupos
        document.getElementById('toggle-contacts-btn')?.addEventListener('click', () => switchToContactsView());
        document.getElementById('toggle-groups-btn')?.addEventListener('click', () => switchToGroupsView());

        // Listener para sincronizar grupos
        document.getElementById('sync-groups-btn')?.addEventListener('click', syncGroups);

        // Listener para el formulario de envío de mensajes
        document.getElementById('chat-input-form')?.addEventListener('submit', handleSendMessage);

        const messageInput = document.getElementById('chat-message-input');
        messageInput?.addEventListener('input', handleTyping); // Detectar cuando se escribe
        messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
            }
        });

        // Listeners para el panel de información del contacto
        document.getElementById('chat-contact-info-toggle')?.addEventListener('click', () => toggleContactInfoPanel());
        document.getElementById('info-ignore-ia-toggle-switch')?.addEventListener('click', handleIgnoreIaToggle);
        document.getElementById('info-group-ai-toggle')?.addEventListener('change', handleGroupAiToggle);
        document.getElementById('info-manage-labels-btn')?.addEventListener('click', openLabelsModalForChat);

        // Listener para la búsqueda de chats
        document.getElementById('chat-search-input')?.addEventListener('input', handleSearch);

        // Listener para reanudar conversación
        document.getElementById('resume-conversation-btn')?.addEventListener('click', resumeConversation);

        const infoPanel = document.getElementById('chat-contact-info-panel');
        const overlay = document.getElementById('chat-info-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => toggleContactInfoPanel(false)); // Forzar cierre
        }

        // --- INICIO: CORRECCIÓN para cerrar el panel de info en móvil ---
        const backToChatsBtn = document.getElementById('back-to-chats-btn');
        if (backToChatsBtn) {
            backToChatsBtn.addEventListener('click', () => toggleContactInfoPanel(false));
        }

        // --- INICIO: Lógica para adjuntar archivos ---
        document.getElementById('chat-attach-file-btn')?.addEventListener('click', () => {
            document.getElementById('chat-file-input')?.click();
        });

        document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });

        document.getElementById('chat-remove-image-btn')?.addEventListener('click', removeAttachedFile);

        // Lógica de Drag and Drop
        const chatView = document.getElementById('chat-view-main');
        if (chatView && chatView.classList) {
            chatView.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (chatView && chatView.classList) chatView.classList.add('bg-blue-50'); // Feedback visual
            });
            messageInput.addEventListener('paste', handlePaste); // Adjuntar el listener de pegar al input de mensaje
            chatView.addEventListener('paste', handlePaste);
            chatView.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (chatView && chatView.classList) chatView.classList.remove('bg-blue-50');
            });
            chatView.addEventListener('drop', handleFileDrop);
        }
        // --- FIN: Lógica para adjuntar archivos ---

        // Listener para el botón de nuevo chat
        document.getElementById('new-chat-btn')?.addEventListener('click', openNewChatModal);

        // Listeners del modal de nuevo chat
        document.getElementById('close-new-chat-modal')?.addEventListener('click', closeNewChatModal);
        document.getElementById('cancel-new-chat')?.addEventListener('click', closeNewChatModal);
        document.getElementById('confirm-new-chat')?.addEventListener('click', handleNewChatConfirm);

        // Listener para cambiar entre opciones
        document.querySelectorAll('input[name="chat-option"]').forEach(radio => {
            radio.addEventListener('change', handleChatOptionChange);
        });

        // Listener para búsqueda de contactos
        const contactSearchInput = document.getElementById('existing-contact-search');
        if (contactSearchInput) {
            contactSearchInput.addEventListener('input', handleContactSearch);
            contactSearchInput.addEventListener('focus', handleContactSearch);
            contactSearchInput.addEventListener('blur', (e) => {
                // Cerrar resultados después de un pequeño delay para permitir clicks
                setTimeout(() => {
                    const results = document.getElementById('existing-contact-results');
                    if (results) results.classList.add('hidden');
                }, 200);
            });
        }
    }

    function toggleContactInfoPanel(forceClose = null) {
        const infoPanel = document.getElementById('chat-contact-info-panel');
        const chatView = document.getElementById('chat-view-main');
        const overlay = document.getElementById('chat-info-overlay');

        if (!infoPanel || !infoPanel.classList) return;

        const isOpen = forceClose === null ? !infoPanel.classList.contains('open') : !forceClose;

        infoPanel.classList.toggle('hidden', !isOpen);
        infoPanel.classList.toggle('open', isOpen);
        if (overlay && overlay.classList) overlay.classList.toggle('hidden', !isOpen);
    }

    async function loadContactsList() {
        const listEl = document.getElementById('chat-contacts-list');
        const contactsLoader = document.getElementById('contacts-list-loader');
        const groupsLoader = document.getElementById('groups-list-loader');
        if (!listEl || !contactsLoader) return;

        if (contactsLoader && contactsLoader.classList) contactsLoader.classList.remove('hidden');
        if (groupsLoader && groupsLoader.classList) groupsLoader.classList.add('hidden');
        if (contactsLoader) contactsLoader.textContent = 'Cargando conversaciones...';
        listEl.innerHTML = '';

        try {
            const { data, error } = await window.auth.sb.rpc('get_recent_contacts')
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            const teamInfo = window.appInstance?.teamInfo;
            const userRole = teamInfo?.user_role;
            const userName = teamInfo?.profiles?.full_name;
            const allowAllChats = teamInfo?.allow_all_chats_visibility;

            let contactsToRender = data;
            if (userRole === 'advisor') {
                const labelScope = getAdvisorLabelFilters('chats');
                if (labelScope) {
                    contactsToRender = data.filter(c => (c.labels || []).some(label => labelScope.includes(label)));
                } else if (userName && !allowAllChats) {
                    contactsToRender = data.filter(c => (c.labels || []).includes(userName));
                }
            }

            allRecentContacts = contactsToRender; // Guardar en caché los contactos filtrados

            // Si hay un término de búsqueda activo, actualizar la búsqueda
            const searchInput = document.getElementById('chat-search-input');
            if (searchInput && searchInput.value.trim()) {
                handleSearch({ target: searchInput });
            }

            if (contactsToRender.length === 0) {
                if (contactsLoader) contactsLoader.textContent = 'No hay conversaciones recientes.';
            } else {
                if (contactsLoader && contactsLoader.classList) contactsLoader.classList.add('hidden');
                listEl.innerHTML = contactsToRender.map(contact => /*html*/`
                    <div class="contact-item p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors"
                         data-contact-id="${contact.contact_id}" 
                         data-contact-name="${contact.full_name}"
                         data-contact-phone="${contact.phone_number}">
                        <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                            ${(contact.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <p class="font-bold truncate">${contact.full_name || contact.phone_number}</p>
                            <p class="text-sm text-slate-500 truncate">${(contact.last_message_content || '').substring(0, 40)}...</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error("Error al cargar lista de contactos para chat:", e);
            contactsLoader.textContent = 'Error al cargar contactos.';
        }
    }

    // Funciones para toggle entre contactos y grupos
    function switchToContactsView() {
        currentViewMode = 'contacts';
        currentGroupId = null;
        currentGroup = null;

        // Actualizar UI del toggle
        const contactsBtn = document.getElementById('toggle-contacts-btn');
        const groupsBtn = document.getElementById('toggle-groups-btn');
        const syncBtn = document.getElementById('sync-groups-btn');
        if (contactsBtn && contactsBtn.classList) {
            contactsBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            contactsBtn.classList.remove('text-slate-600', 'hover:bg-slate-50');
        }
        if (groupsBtn && groupsBtn.classList) {
            groupsBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            groupsBtn.classList.add('text-slate-600', 'hover:bg-slate-50');
        }

        // Ocultar botón de sincronización en vista de contactos
        if (syncBtn && syncBtn.classList) {
            syncBtn.classList.add('hidden');
        }

        // Actualizar placeholder de búsqueda
        const searchInput = document.getElementById('chat-search-input');
        if (searchInput) {
            searchInput.placeholder = 'Buscar contacto...';
        }

        // Cargar lista de contactos
        loadContactsList();
    }

    function switchToGroupsView() {
        currentViewMode = 'groups';
        currentContactId = null;
        currentContact = null;

        // Actualizar UI del toggle
        const contactsBtn = document.getElementById('toggle-contacts-btn');
        const groupsBtn = document.getElementById('toggle-groups-btn');
        const syncBtn = document.getElementById('sync-groups-btn');
        if (groupsBtn && groupsBtn.classList) {
            groupsBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            groupsBtn.classList.remove('text-slate-600', 'hover:bg-slate-50');
        }
        if (contactsBtn && contactsBtn.classList) {
            contactsBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            contactsBtn.classList.add('text-slate-600', 'hover:bg-slate-50');
        }

        // Mostrar botón de sincronización en vista de grupos
        if (syncBtn && syncBtn.classList) {
            syncBtn.classList.remove('hidden');
        }

        // Actualizar placeholder de búsqueda
        const searchInput = document.getElementById('chat-search-input');
        if (searchInput) {
            searchInput.placeholder = 'Buscar grupo...';
        }

        // Cargar lista de grupos
        loadGroupsList();
    }

    async function loadGroupsList() {
        const listEl = document.getElementById('chat-contacts-list');
        const contactsLoader = document.getElementById('contacts-list-loader');
        const groupsLoader = document.getElementById('groups-list-loader');
        if (!listEl || !groupsLoader) return;

        if (contactsLoader && contactsLoader.classList) contactsLoader.classList.add('hidden');
        if (groupsLoader && groupsLoader.classList) groupsLoader.classList.remove('hidden');
        if (groupsLoader) groupsLoader.textContent = 'Cargando grupos...';
        listEl.innerHTML = '';

        try {
            const { data, error } = await window.auth.sb.rpc('get_recent_groups');

            if (error) throw error;

            allRecentGroups = data || [];

            if (groupsLoader && groupsLoader.classList) groupsLoader.classList.add('hidden');

            const teamInfo = window.appInstance?.teamInfo;
            let teamChatHtml = '';
            if (teamInfo && teamInfo.team_id) {
                teamChatHtml = `
                    <div class="group-item p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors border-l-4 border-blue-500 bg-blue-50/30"
                            data-group-id="INTERNAL_TEAM_CHAT" 
                            data-group-name="Chat Interno de Equipo">
                        <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                            <i data-lucide="message-square" class="w-5 h-5"></i>
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <p class="font-bold truncate flex items-center gap-2">
                                Chat Interno de Equipo
                                <span class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase font-black">Empresa</span>
                            </p>
                            <p class="text-sm text-slate-500 truncate">Habla con tu equipo de trabajo</p>
                        </div>
                    </div>
                `;
            }

            const whatsappGroupsHtml = allRecentGroups.map(group => /*html*/`
                <div class="group-item p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors"
                        data-group-id="${group.group_id}" 
                        data-group-name="${group.group_name}">
                    <div class="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        <i data-lucide="users" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <p class="font-bold truncate">${group.group_name || 'Grupo sin nombre'}</p>
                        <p class="text-sm text-slate-500 truncate">
                            ${group.participant_count || 0} participantes
                            ${group.last_message_content ? ' • ' + group.last_message_content.substring(0, 30) + '...' : ''}
                        </p>
                    </div>
                </div>
            `).join('');

            if (!teamChatHtml && allRecentGroups.length === 0) {
                listEl.innerHTML = '';
                if (groupsLoader) {
                    groupsLoader.textContent = 'No hay grupos disponibles.';
                    groupsLoader.classList.remove('hidden');
                }
            } else {
                listEl.innerHTML = teamChatHtml + whatsappGroupsHtml;
            }
            // Renderizar iconos de Lucide
            if (window.lucide?.createIcons) {
                lucide.createIcons({ root: listEl });
            }
        } catch (e) {
            console.error("Error al cargar lista de grupos:", e);
            groupsLoader.textContent = 'Error al cargar grupos.';
        }
    }

    async function syncGroups() {
        const syncBtn = document.getElementById('sync-groups-btn');
        const syncText = document.getElementById('sync-groups-text');
        const syncIcon = syncBtn?.querySelector('i[data-lucide="refresh-cw"]');

        if (!syncBtn) {
            console.error('Botón de sincronización no encontrado');
            return;
        }

        // Deshabilitar botón y mostrar estado de carga
        syncBtn.disabled = true;
        if (syncText) syncText.textContent = 'Sincronizando...';
        if (syncIcon && window.lucide) {
            syncIcon.classList.add('animate-spin');
        }

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) {
                throw new Error('Usuario no autenticado');
            }

            console.log('Iniciando sincronización de grupos para usuario:', userId);

            // NOTA: El workflow de n8n espera body.user_id, así que enviamos el body envuelto
            // TODO: Corregir el workflow para que acceda directamente a user_id sin el wrapper 'body'
            const requestBody = { body: { user_id: userId } };
            console.log('Enviando request a n8n:', requestBody);

            // Llamar al webhook de n8n
            const response = await fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Respuesta de n8n:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || 'Error desconocido' };
                }
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Resultado de sincronización:', result);

            // Mostrar mensaje de éxito
            window.showToast?.('Grupos sincronizados correctamente', 'success');

            // Recargar la lista de grupos después de un breve delay
            setTimeout(() => {
                loadGroupsList();
            }, 1000);

        } catch (error) {
            console.error('Error al sincronizar grupos:', error);
            console.error('Stack trace:', error.stack);
            window.showToast?.(`Error al sincronizar: ${error.message}`, 'error');
        } finally {
            // Restaurar botón
            syncBtn.disabled = false;
            if (syncText) syncText.textContent = 'Sincronizar Grupos';
            if (syncIcon && window.lucide) {
                syncIcon.classList.remove('animate-spin');
            }
        }
    }

    async function loadChatForContact(contactId) {
        currentContactId = contactId;
        lastRenderedDateKey = null;
        unsubscribeFromChatChanges(); // Dejar de escuchar el chat anterior

        // --- CORRECCIÓN: Obtener siempre los datos completos del contacto desde la DB ---
        const { data: contactData, error: contactError } = await window.auth.sb.from('contacts').select('*').eq('id', contactId).single();
        if (contactError) {
            console.error("Error buscando contacto:", contactError);
            return;
        }
        // Formato compatible con el de la RPC para mantener consistencia
        currentContact = {
            contact_id: contactData.id,
            ...contactData
        };

        const chatHistoryEl = document.getElementById('chat-history');
        const chatHeaderEl = document.getElementById('chat-header-name');
        const chatViewPlaceholder = document.getElementById('chat-view-placeholder');
        const chatViewMain = document.getElementById('chat-view-main');

        if (!chatHistoryEl || !chatHeaderEl || !chatViewPlaceholder || !chatViewMain) return;

        // Mostrar la vista de chat y ocultar el placeholder
        if (chatViewPlaceholder && chatViewPlaceholder.classList) chatViewPlaceholder.classList.add('hidden');
        if (chatViewMain && chatViewMain.classList) {
            chatViewMain.classList.remove('hidden');
            chatViewMain.classList.add('flex');
        }
        if (window.lucide?.createIcons) {
            lucide.createIcons({ root: chatViewMain });
        }

        chatHeaderEl.textContent = currentContact.full_name || currentContact.phone_number;
        chatHistoryEl.innerHTML = '<p class="text-center text-slate-400">Cargando mensajes...</p>';

        try {
            const { data, error } = await window.auth.sb
                .from('chat_history')
                .select('message_type, content, created_at')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                chatHistoryEl.innerHTML = '<p class="text-center text-slate-400">Inicia la conversación.</p>';
            } else { // CORRECCIÓN: El mensaje del humano (incoming) va a la izquierda
                chatHistoryEl.innerHTML = ''; // Limpiar antes de añadir
                data.forEach(msg => appendMessageToChat(msg, true)); // Usar la función append para consistencia
                // Scroll hasta el final
                setTimeout(() => chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight, 0);
            }

            if (window.lucide?.createIcons) {
                lucide.createIcons({ root: chatHistoryEl });
            }

            // Cargar datos en el panel de información y suscribirse a cambios
            renderContactInfoPanel();
            subscribeToChatChanges(); // Suscribirse a mensajes nuevos para este chat
            checkConversationState(contactId); // Verificar estado de pausa
            subscribeToConversationState(contactId); // Suscribirse a cambios de estado
        } catch (e) {
            console.error("Error al cargar historial de chat:", e);
            chatHistoryEl.innerHTML = '<p class="text-center text-red-500">Error al cargar mensajes.</p>';
        }
    }

    async function loadChatForGroup(groupId) {
        currentGroupId = groupId;
        currentContactId = null;
        lastRenderedDateKey = null;
        unsubscribeFromChatChanges(); // Dejar de escuchar el chat anterior

        const chatHistoryEl = document.getElementById('chat-history');
        const chatHeaderEl = document.getElementById('chat-header-name');
        const chatGroupInfo = document.getElementById('chat-group-info');
        const chatViewPlaceholder = document.getElementById('chat-view-placeholder');
        const chatViewMain = document.getElementById('chat-view-main');
        const groupInfoEl = document.getElementById('chat-group-info');

        if (!chatHistoryEl || !chatHeaderEl || !chatViewPlaceholder || !chatViewMain) return;

        // Mostrar la vista de chat y ocultar el placeholder
        if (chatViewPlaceholder && chatViewPlaceholder.classList) chatViewPlaceholder.classList.add('hidden');
        if (chatViewMain && chatViewMain.classList) {
            chatViewMain.classList.remove('hidden');
            chatViewMain.classList.add('flex');
        }
        if (window.lucide?.createIcons) {
            lucide.createIcons({ root: chatViewMain });
        }

        if (groupId === 'INTERNAL_TEAM_CHAT') {
            const teamInfo = window.appInstance?.teamInfo;
            if (!teamInfo?.team_id) {
                chatHistoryEl.innerHTML = '<p class="text-center text-red-500">No perteneces a ningún equipo.</p>';
                return;
            }

            currentGroup = {
                group_name: 'Chat Interno de Equipo',
                participant_count: 'Equipo',
                is_internal: true,
                team_id: teamInfo.team_id
            };

            chatHeaderEl.textContent = currentGroup.group_name;
            if (groupInfoEl) {
                groupInfoEl.textContent = 'Mensajería interna de la empresa';
                if (groupInfoEl.classList) groupInfoEl.classList.remove('hidden');
            }
            chatHistoryEl.innerHTML = '<p class="text-center text-slate-400">Cargando mensajes internos...</p>';

            try {
                const { data, error } = await window.auth.sb
                    .from('internal_messages')
                    .select('*, profiles(full_name)')
                    .eq('team_id', teamInfo.team_id)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data.length === 0) {
                    chatHistoryEl.innerHTML = '<p class="text-center text-slate-400">No hay mensajes. ¡Sé el primero en saludar!</p>';
                } else {
                    chatHistoryEl.innerHTML = '';
                    data.forEach(msg => appendInternalMessageToChat(msg, true));
                    setTimeout(() => chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight, 0);
                }

                subscribeToInternalChatChanges(teamInfo.team_id);
                renderGroupInfoPanel(); // Actualizar panel de info para modo interno
            } catch (e) {
                console.error("Error al cargar chat interno:", e);
                chatHistoryEl.innerHTML = '<p class="text-center text-red-500">Error al cargar mensajes internos.</p>';
            }
            return;
        }

        // Obtener datos completos del grupo desde la DB
        const { data: groupData, error: groupError } = await window.auth.sb
            .from('whatsapp_groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (groupError) {
            console.error("Error buscando grupo:", groupError);
            return;
        }

        currentGroup = groupData;

        chatHeaderEl.textContent = currentGroup.group_name || 'Grupo sin nombre';
        // Mostrar información del grupo si el elemento existe
        if (groupInfoEl) {
            groupInfoEl.textContent = `${currentGroup.participant_count || 0} participantes`;
            if (groupInfoEl.classList) groupInfoEl.classList.remove('hidden');
        }
        chatHistoryEl.innerHTML = '<p class="text-center text-slate-400">Cargando mensajes...</p>';

        try {
            const { data, error } = await window.auth.sb
                .from('group_chat_history')
                .select('message_type, content, sender_name, sender_jid, created_at')
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                chatHistoryEl.innerHTML = '<p class="text-center text-slate-400">No hay mensajes en este grupo.</p>';
            } else {
                chatHistoryEl.innerHTML = '';
                data.forEach(msg => appendGroupMessageToChat(msg, true));
                setTimeout(() => chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight, 0);
            }

            if (window.lucide?.createIcons) {
                lucide.createIcons({ root: chatHistoryEl });
            }

            // Suscribirse a cambios en tiempo real del grupo
            subscribeToGroupChatChanges();

            // Renderizar panel de información del grupo
            renderGroupInfoPanel();
        } catch (e) {
            console.error("Error al cargar historial de grupo:", e);
            chatHistoryEl.innerHTML = '<p class="text-center text-red-500">Error al cargar mensajes del grupo.</p>';
        }
    }

    function renderGroupInfoPanel() {
        if (!currentGroup) return;

        // Actualizar nombre y teléfono (reutilizar elementos del panel de contacto)
        const nameEl = document.getElementById('info-contact-name');
        const phoneEl = document.getElementById('info-contact-phone');
        const labelsContainer = document.getElementById('info-contact-labels');
        const manageLabelsContainer = document.getElementById('info-manage-labels-container');
        const razonContainer = document.getElementById('info-contact-razon-ia');
        const chatFilesContainer = document.getElementById('info-chat-files');

        if (nameEl) {
            nameEl.textContent = currentGroup.group_name || 'Grupo sin nombre';
        }

        if (phoneEl) {
            phoneEl.textContent = currentGroup.is_internal ? 'Miembros de la empresa' : `${currentGroup.participant_count || 0} participantes`;
        }

        // Ocultar elementos que no aplican para grupos
        if (labelsContainer) {
            labelsContainer.innerHTML = '<span class="text-xs text-slate-400">Las etiquetas no están disponibles para grupos</span>';
        }

        if (manageLabelsContainer) {
            manageLabelsContainer.innerHTML = '';
        }

        if (razonContainer) {
            razonContainer.innerHTML = '';
            if (razonContainer.classList) razonContainer.classList.add('hidden');
        }

        if (chatFilesContainer) {
            chatFilesContainer.innerHTML = '';
        }

        // Mostrar/ocultar toggle según si es grupo o contacto
        const ignoreToggle = document.getElementById('info-ignore-ia-toggle-switch');
        const groupAiToggle = document.getElementById('info-group-ai-toggle');

        if (ignoreToggle && ignoreToggle.parentElement) {
            ignoreToggle.parentElement.style.display = 'none';
        }

        // Crear o mostrar toggle de IA para grupos
        if (!groupAiToggle) {
            // Crear el toggle si no existe
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'mt-4 pt-4 border-t';
            toggleContainer.innerHTML = `
                <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        id="info-group-ai-toggle" 
                        class="sr-only peer"
                        ${currentGroup.ai_enabled !== false ? 'checked' : ''}
                    >
                    <div class="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span class="ml-3 text-sm font-medium text-slate-700">IA Habilitada</span>
                </label>
                <p class="text-xs text-slate-500 mt-1">
                    Permite que la IA responda automáticamente a mensajes de este grupo
                </p>
            `;

            // Insertar después del toggle de contacto (si existe) o al final del panel
            const panel = document.getElementById('chat-contact-info-panel');
            if (panel) {
                const existingToggle = panel.querySelector('.mt-4.pt-4.border-t');
                if (existingToggle && existingToggle.nextSibling) {
                    panel.insertBefore(toggleContainer, existingToggle.nextSibling);
                } else {
                    panel.appendChild(toggleContainer);
                }

                // Agregar listener
                document.getElementById('info-group-ai-toggle')?.addEventListener('change', handleGroupAiToggle);
            }
        } else {
            // Actualizar estado del toggle existente
            groupAiToggle.checked = currentGroup.ai_enabled !== false;
            if (groupAiToggle.parentElement && groupAiToggle.parentElement.parentElement) {
                groupAiToggle.parentElement.parentElement.style.display = 'block';
            }
        }
    }

    async function handleGroupAiToggle(e) {
        const toggle = e.target;
        if (!currentGroupId || !currentGroup) return;

        const aiEnabled = toggle.checked;

        try {
            const { error } = await window.auth.sb
                .from('whatsapp_groups')
                .update({ ai_enabled: aiEnabled })
                .eq('id', currentGroupId);

            if (error) throw error;

            // Actualizar caché local
            currentGroup.ai_enabled = aiEnabled;

            // Mostrar mensaje de confirmación
            window.showToast?.(
                aiEnabled
                    ? 'IA habilitada para este grupo'
                    : 'IA deshabilitada para este grupo',
                'success'
            );
        } catch (error) {
            console.error('Error al actualizar ai_enabled:', error);
            toggle.checked = !aiEnabled; // Revertir cambio
            window.showToast?.('Error al actualizar configuración', 'error');
        }
    }

    // Verificar estado de pausa de la conversación
    async function checkConversationState(contactId) {
        if (!contactId) return;

        // Validar que contactId sea un número válido
        const contactIdNum = typeof contactId === 'string' ? parseInt(contactId, 10) : contactId;
        if (!contactIdNum || isNaN(contactIdNum)) {
            console.warn('checkConversationState: contactId inválido:', contactId);
            return;
        }

        try {
            const { data: state, error } = await window.auth.sb
                .from('conversation_states')
                .select('*')
                .eq('contact_id', contactIdNum)
                .maybeSingle(); // Usar maybeSingle() en lugar de single() para evitar errores 406

            // maybeSingle() devuelve null si no hay resultados, no un error
            if (error) {
                // Solo loguear errores que no sean "no rows found"
                if (error.code !== 'PGRST116' && error.code !== '42P01') { // 42P01 = tabla no existe
                    console.error('Error al verificar estado de conversación:', error);
                }
                return;
            }

            if (state?.is_paused) {
                showPausedBanner(state);
            } else {
                hidePausedBanner();
            }
        } catch (e) {
            // Ignorar errores 406 (Not Acceptable) que pueden ocurrir por problemas de formato
            if (e?.status !== 406 && e?.statusCode !== 406) {
                console.error('Error al verificar estado de pausa:', e);
            }
        }
    }

    // Mostrar banner de pausa
    function showPausedBanner(state) {
        const banner = document.getElementById('conversation-paused-banner');
        const reasonText = document.getElementById('pause-reason-text');
        const messageInput = document.getElementById('chat-message-input');
        const sendButton = document.getElementById('chat-send-btn');

        if (!banner || !banner.classList) return;

        banner.classList.remove('hidden');

        // Traducir razón de pausa a texto legible
        const reasonMap = {
            'human_request': 'Solicitud de atención humana',
            'purchase_intent': 'Intención de compra detectada',
            'urgent_attention': 'Atención urgente requerida',
            'sensitive_label': 'Etiqueta sensible asignada',
            'custom_keyword': 'Palabra clave crítica detectada'
        };

        const reasonLabel = reasonMap[state.pause_reason] || state.pause_reason || 'Requiere atención';
        if (reasonText) {
            reasonText.textContent = `(${reasonLabel})`;
        }

        // Deshabilitar input y botón de envío
        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'Conversación pausada - Requiere atención humana';
        }
        if (sendButton) {
            sendButton.disabled = true;
        }

        if (window.lucide?.createIcons) {
            lucide.createIcons({ root: banner });
        }
    }

    // Ocultar banner de pausa
    function hidePausedBanner() {
        const banner = document.getElementById('conversation-paused-banner');
        const messageInput = document.getElementById('chat-message-input');
        const sendButton = document.getElementById('chat-send-btn');

        if (banner && banner.classList) {
            banner.classList.add('hidden');
        }

        // Habilitar input y botón de envío
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = 'Escribe un mensaje...';
        }
        if (sendButton) {
            sendButton.disabled = false;
        }
    }

    // Suscribirse a cambios en el estado de conversación
    let conversationStateChannel = null;
    function subscribeToConversationState(contactId) {
        if (!contactId) return;

        // Desuscribirse del canal anterior si existe
        if (conversationStateChannel) {
            window.auth.sb.removeChannel(conversationStateChannel);
            conversationStateChannel = null;
        }

        conversationStateChannel = window.auth.sb
            .channel(`conversation-state-${contactId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversation_states',
                filter: `contact_id=eq.${contactId}`
            }, (payload) => {
                console.log('Estado de conversación actualizado:', payload);
                if (payload.new?.is_paused) {
                    showPausedBanner(payload.new);
                } else {
                    hidePausedBanner();
                }
            })
            .subscribe();
    }

    // Reanudar conversación
    async function resumeConversation() {
        if (!currentContactId) return;

        const button = document.getElementById('resume-conversation-btn');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<div class="animate-spin rounded-full h-4 h-4 border-b-2 border-white"></div>';
        }

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) throw new Error('Usuario no autenticado');

            const { data, error } = await window.auth.sb.rpc('resume_conversation', {
                p_contact_id: currentContactId,
                p_resumed_by: userId
            });

            if (error) throw error;

            window.showToast?.('Conversación reanudada. La IA puede responder nuevamente.', 'success');
            hidePausedBanner();
        } catch (e) {
            console.error('Error al reanudar conversación:', e);
            window.showToast?.('Error al reanudar la conversación: ' + e.message, 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Reanudar';
                if (window.lucide?.createIcons) {
                    lucide.createIcons({ root: button });
                }
            }
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault();
        const form = e.target.closest('form');
        if (!form) return;
        const input = document.getElementById('chat-message-input');
        let message = input.value.trim();

        // No hacer nada si no hay mensaje Y no hay archivo adjunto
        if (!message && !attachedFile) return;

        // Si estamos en modo grupos, usar lógica diferente
        if (currentViewMode === 'groups' && currentGroupId) {
            return handleSendGroupMessage(e, message, attachedFile);
        }

        if (!currentContactId) return;

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        const originalButtonHtml = button.innerHTML;
        let contentToSave = message; // Declarar aquí para que sea accesible en todo el scope
        input.value = '';

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!currentContact) throw new Error("Contacto no encontrado");

            // --- CORRECCIÓN: Guardar el mensaje en la DB y enviarlo en paralelo ---
            // --- INICIO: Lógica de subida de archivo ---
            let fileUrl = null;
            if (attachedFile) {
                button.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>';
                fileUrl = await window.appInstance.uploadAsset(attachedFile, 'chat-files');
                if (!fileUrl) throw new Error("No se pudo subir el archivo.");
                // Si solo se envía una imagen/video sin texto, usamos un placeholder.
                if (!message) message = attachedFile.type.startsWith('video/') ? 'Video adjunto' : 'Imagen adjunta';
            }
            // Restaurar el botón después de la subida, si hubo spinner
            if (attachedFile) button.innerHTML = originalButtonHtml;
            // --- FIN: Lógica de subida de archivo ---

            contentToSave = fileUrl ? `${message} ${fileUrl}` : message;

            const webhookUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send';
            const sendResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    contact_id: currentContactId,
                    contact_name: currentContact.full_name,
                    phone_number: currentContact.phone_number,
                    message: message,
                    // El fileUrl ya se envía a n8n en el campo media_url
                    media_url: fileUrl // <-- AÑADIDO: Enviar la URL del archivo
                })
            });

            if (!sendResponse.ok) {
                const errorPayload = await safeReadJson(sendResponse);
                const messageDetail = errorPayload?.message || await sendResponse.text();
                throw new Error(messageDetail || "El servidor no pudo enviar el mensaje.");
            }

            const { data: savedMessages, error: saveError } = await window.auth.sb.from('chat_history')
                .insert({
                    user_id: userId,
                    contact_id: currentContactId,
                    message_type: 'ai', // Los mensajes enviados desde la app son de la 'ia' o agente
                    content: contentToSave,
                })
                .select()
                .limit(1);

            if (saveError) throw new Error(`Error guardando el mensaje: ${saveError.message}`);
            const savedMessage = Array.isArray(savedMessages) ? savedMessages[0] : savedMessages;

            appendMessageToChat({
                ...(savedMessage || {}),
                message_type: 'ai',
                content: contentToSave, // Mostrar el mismo contenido que se guardó en Supabase
                created_at: savedMessage?.created_at || new Date().toISOString(),
                _localEcho: true
            });
            pendingEchoMessages.push({ content: message, expiresAt: Date.now() + 5000 });

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            window.showToast(`Error al enviar mensaje: ${error.message}`, 'error');
            input.value = message; // Devolver el mensaje al input si falla
        } finally {
            button.disabled = false;
            button.innerHTML = originalButtonHtml;
            removeAttachedFile(); // Asegurarse de limpiar el archivo adjunto
        }
    }

    async function handleSendGroupMessage(e, message, attachedFile) {
        e.preventDefault();
        const form = e.target.closest('form');
        if (!form) return;
        const input = document.getElementById('chat-message-input');
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        const originalButtonHtml = button.innerHTML;
        let contentToSave = message;
        input.value = '';

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!currentGroup) throw new Error("Grupo no encontrado");

            // Subir archivo si hay
            let fileUrl = null;
            if (attachedFile) {
                button.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>';
                fileUrl = await window.appInstance.uploadAsset(attachedFile, 'chat-files');
                if (!fileUrl) throw new Error("No se pudo subir el archivo.");
                if (!message) message = attachedFile.type.startsWith('video/') ? 'Video adjunto' : 'Imagen adjunta';
            }

            contentToSave = fileUrl ? `${message} ${fileUrl}` : message;

            if (currentGroupId === 'INTERNAL_TEAM_CHAT') {
                const teamInfo = window.appInstance?.teamInfo;
                if (!teamInfo?.team_id) throw new Error("No se encontró ID de equipo.");

                const { data: savedMessage, error: saveError } = await window.auth.sb
                    .from('internal_messages')
                    .insert({
                        team_id: teamInfo.team_id,
                        sender_id: userId,
                        content: contentToSave
                    })
                    .select('*, profiles(full_name)')
                    .single();

                if (saveError) throw saveError;

                appendInternalMessageToChat(savedMessage);
                return;
            }

            // Enviar mensaje al grupo vía Evolution API
            const profile = await window.auth.sb.from('profiles').select('evolution_instance_name, evolution_api_key').eq('id', userId).single();
            if (!profile.data) throw new Error("No se pudo obtener la configuración de Evolution API");

            const webhookUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group';
            const sendResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    group_id: currentGroupId,
                    group_jid: currentGroup.group_jid,
                    message: message,
                    media_url: fileUrl
                })
            });

            if (!sendResponse.ok) {
                const errorPayload = await safeReadJson(sendResponse);
                const messageDetail = errorPayload?.message || await sendResponse.text();
                throw new Error(messageDetail || "El servidor no pudo enviar el mensaje.");
            }

            // Guardar mensaje en la base de datos
            const { data: savedMessages, error: saveError } = await window.auth.sb.from('group_chat_history')
                .insert({
                    user_id: userId,
                    group_id: currentGroupId,
                    message_type: 'ai',
                    content: contentToSave,
                    sender_jid: null, // Se puede obtener del perfil si es necesario
                    sender_name: window.appInstance?.user?.user_metadata?.full_name || 'Tú',
                    is_from_me: true
                })
                .select()
                .limit(1);

            if (saveError) throw new Error(`Error guardando el mensaje: ${saveError.message}`);
            const savedMessage = Array.isArray(savedMessages) ? savedMessages[0] : savedMessages;

            appendGroupMessageToChat({
                ...(savedMessage || {}),
                message_type: 'ai',
                content: contentToSave,
                created_at: savedMessage?.created_at || new Date().toISOString(),
            });

        } catch (error) {
            console.error("Error al enviar mensaje al grupo:", error);
            window.showToast(`Error al enviar mensaje: ${error.message}`, 'error');
            input.value = message;
        } finally {
            button.disabled = false;
            button.innerHTML = originalButtonHtml;
            removeAttachedFile();
        }
    }

    async function safeReadJson(response) {
        try {
            return await response.json();
        } catch (err) {
            return null;
        }
    }

    // --- LÓGICA DE TIEMPO REAL Y PANEL DE INFO ---

    function handleTyping() {
        if (!chatRealtimeChannel) return;

        // Si no estaba escribiendo, notificar que empezó
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            chatRealtimeChannel.track({ is_typing: true });
        }

        // Reiniciar el temporizador para "dejó de escribir"
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            chatRealtimeChannel.track({ is_typing: false });
            typingTimeoutRef.current = null;
        }, 2000); // 2 segundos de inactividad
    }

    function subscribeToChatChanges() {
        if (chatRealtimeChannel || !currentContactId) return;

        //         console.log(`Suscribiéndose a mensajes para el contacto ${currentContactId}`);
        chatRealtimeChannel = window.auth.sb
            .channel(`chat-${currentContactId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_history', filter: `contact_id=eq.${currentContactId}` },
                (payload) => {
                    console.log('Nuevo mensaje recibido:', payload.new);
                    appendMessageToChat(payload.new);
                }
            )
            .on('presence', { event: 'sync' }, () => {
                if (!chatRealtimeChannel) return;
                const presenceState = chatRealtimeChannel.presenceState();

                const typing = [];
                for (const id in presenceState) {
                    const userPresence = presenceState[id][0]; // Tomamos la primera presencia del usuario
                    if (userPresence.is_typing) {
                        typing.push(userPresence.name);
                    }
                }
                typingUsersState = typing;
                renderTypingIndicator();
            })
            .subscribe();

        // Enviar estado inicial al unirse al canal
        chatRealtimeChannel.track({ is_typing: false, name: window.appInstance?.user?.user_metadata?.full_name || 'Agente' });
    }

    function subscribeToGroupChatChanges() {
        if (chatRealtimeChannel || !currentGroupId) return;

        //         console.log(`Suscribiéndose a mensajes para el grupo ${currentGroupId}`);
        chatRealtimeChannel = window.auth.sb
            .channel(`group-chat-${currentGroupId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'group_chat_history', filter: `group_id=eq.${currentGroupId}` },
                (payload) => {
                    console.log('Nuevo mensaje de grupo recibido:', payload.new);
                    appendGroupMessageToChat(payload.new);
                }
            )
            .subscribe();
    }

    function subscribeToInternalChatChanges(teamId) {
        if (chatRealtimeChannel || !teamId) return;

        //         console.log(`Suscribiéndose a mensajes internos para el equipo ${teamId}`);
        chatRealtimeChannel = window.auth.sb
            .channel(`internal-chat-${teamId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `team_id=eq.${teamId}` },
                async (payload) => {
                    console.log('Nuevo mensaje interno recibido:', payload.new);
                    // Obtener el nombre del remitente
                    const { data: profile } = await window.auth.sb
                        .from('profiles')
                        .select('full_name')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const messageWithProfile = {
                        ...payload.new,
                        profiles: profile
                    };
                    appendInternalMessageToChat(messageWithProfile);
                }
            )
            .subscribe();
    }

    function appendInternalMessageToChat(msg) {
        const chatHistoryEl = document.getElementById('chat-history');
        if (!chatHistoryEl) return;

        // Si el mensaje ya existe en el DOM (eco local), no duplicar
        if (chatHistoryEl.querySelector(`[data-message-id="${msg.id}"]`)) return;

        const placeholder = chatHistoryEl.querySelector('p');
        if (placeholder && (placeholder.textContent.includes('No hay mensajes') || placeholder.textContent.includes('Inicia la conversación'))) {
            placeholder.remove();
        }

        ensureDateDivider(msg.created_at);

        const currentUserId = window.auth.getSession()?.user?.id;
        const isFromMe = msg.sender_id === currentUserId;
        const senderName = msg.profiles?.full_name || 'Alguien del equipo';

        // Colores deterministas
        const colors = [
            'text-blue-600', 'text-purple-600', 'text-pink-600',
            'text-indigo-600', 'text-teal-600', 'text-orange-600',
            'text-rose-600', 'text-emerald-600'
        ];
        const colorIndex = msg.sender_id ? msg.sender_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0;
        const nameColorClass = colors[colorIndex];

        const newBubble = `
        <div class="chat-bubble ${isFromMe ? 'self-end bg-blue-100' : 'self-start bg-white'} rounded-lg p-3 max-w-lg lg:max-w-xl shadow-sm space-y-2 break-words" data-message-id="${msg.id}">
            ${!isFromMe ? `<p class="text-[10px] font-bold uppercase tracking-wider ${nameColorClass} mb-0.5">${senderName}</p>` : ''}
            ${(() => {
                const messageContent = typeof msg?.content === 'string' ? msg.content : '';
                const imageUrlMatch = messageContent.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|avif|bmp|svg))/i);
                if (imageUrlMatch) {
                    const imageUrl = imageUrlMatch[0];
                    const cleanText = messageContent.replace(imageUrl, '').trim();
                    return `
                        <a href="${imageUrl}" target="_blank">
                            <img src="${imageUrl}" class="rounded-lg max-w-xs cursor-pointer" alt="Imagen">
                        </a>
                        ${cleanText ? `<p class="text-slate-800 text-sm mt-2">${cleanText}</p>` : ''}
                    `;
                }
                return `<p class="text-slate-800">${messageContent.trim() || '[Sin contenido]'}</p>`;
            })()}
            <p class="text-[9px] text-slate-400 text-right mt-1">${new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>`;
        chatHistoryEl.insertAdjacentHTML('beforeend', newBubble);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    function unsubscribeFromChatChanges() {
        if (chatRealtimeChannel) {
            //             console.log('Desuscribiéndose del chat actual.');
            window.auth.sb.removeChannel(chatRealtimeChannel);
            chatRealtimeChannel = null;
        }
        if (conversationStateChannel) {
            window.auth.sb.removeChannel(conversationStateChannel);
            conversationStateChannel = null;
        }
    }

    function renderTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (!indicator) return;

        if (typingUsersState.length > 0) {
            indicator.textContent = `${typingUsersState.join(', ')} está(n) escribiendo...`;
        } else {
            indicator.textContent = '';
        }
    }

    function appendMessageToChat(msg, isInitialLoad = false) {
        const chatHistoryEl = document.getElementById('chat-history');
        if (!chatHistoryEl) return;

        const now = Date.now();
        const messageContent = typeof msg?.content === 'string' ? msg.content : '';
        pendingEchoMessages = pendingEchoMessages.filter(entry => entry.expiresAt > now);

        if (msg.message_type !== 'human') {
            if (!isInitialLoad) {
                const matchIndex = pendingEchoMessages.findIndex(entry => entry.content === messageContent && entry.expiresAt > now);
                if (matchIndex !== -1) {
                    pendingEchoMessages.splice(matchIndex, 1);
                    if (!msg._localEcho) {
                        return;
                    }
                }
            }
        }

        // Si está el mensaje de "inicia la conversación", lo quitamos
        const placeholder = chatHistoryEl.querySelector('p');
        if (placeholder && placeholder.textContent.includes('Inicia la conversación')) {
            placeholder.remove();
        }

        ensureDateDivider(msg.created_at);

        const isHuman = msg.message_type === 'human'; // CORRECCIÓN: El webhook guarda los mensajes del cliente como 'human'
        const newBubble = `
        <div class="chat-bubble ${isHuman ? 'self-start bg-white' : 'self-end bg-blue-100'} rounded-lg p-3 max-w-lg lg:max-w-xl shadow-sm space-y-2 break-words">
            ${(() => {
                // CORRECCIÓN: Mejorar la detección y renderizado de imágenes
                const imageUrlMatch = messageContent.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|avif|bmp|svg))/i);
                if (imageUrlMatch) {
                    const imageUrl = imageUrlMatch[0];
                    // Limpiar el texto para quitar la URL y palabras clave
                    const cleanText = messageContent
                        .replace(imageUrl, '')
                        .replace(/Imagen:|Media:|Imagen adjunta|Archivo adjunto/ig, '')
                        .trim();

                    return `
                        <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="block group relative">
                            <img src="${imageUrl}" class="rounded-lg max-w-xs cursor-pointer" alt="Imagen adjunta" loading="lazy">
                        </a>
                        ${cleanText ? `<p class="text-slate-800 text-sm break-words mt-2">${cleanText.replace(/:$/, '')}</p>` : ''}
                    `;
                }
                const fallbackText = messageContent.trim() || '[Mensaje sin contenido]';
                return `<p class="text-slate-800">${fallbackText}</p>`;
            })()}
            <p class="text-xs text-slate-400 text-right mt-1">${new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>`;
        chatHistoryEl.insertAdjacentHTML('beforeend', newBubble);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    function appendGroupMessageToChat(msg, isInitialLoad = false) {
        const chatHistoryEl = document.getElementById('chat-history');
        if (!chatHistoryEl) return;

        // Si está el mensaje de "no hay mensajes", lo quitamos
        const placeholder = chatHistoryEl.querySelector('p');
        if (placeholder && placeholder.textContent.includes('No hay mensajes')) {
            placeholder.remove();
        }

        ensureDateDivider(msg.created_at);

        const isHuman = msg.message_type === 'human';
        const senderName = msg.sender_name || 'Usuario';
        const newBubble = `
        <div class="chat-bubble ${isHuman ? 'self-start bg-white' : 'self-end bg-blue-100'} rounded-lg p-3 max-w-lg lg:max-w-xl shadow-sm space-y-2 break-words">
            ${isHuman ? `<p class="text-xs font-semibold text-blue-600 mb-1">${senderName}</p>` : ''}
            ${(() => {
                const messageContent = typeof msg?.content === 'string' ? msg.content : '';
                const imageUrlMatch = messageContent.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|avif|bmp|svg))/i);
                if (imageUrlMatch) {
                    const imageUrl = imageUrlMatch[0];
                    const cleanText = messageContent
                        .replace(imageUrl, '')
                        .replace(/Imagen:|Media:|Imagen adjunta|Archivo adjunto/ig, '')
                        .trim();

                    return `
                        <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="block group relative">
                            <img src="${imageUrl}" class="rounded-lg max-w-xs cursor-pointer" alt="Imagen adjunta" loading="lazy">
                        </a>
                        ${cleanText ? `<p class="text-slate-800 text-sm break-words mt-2">${cleanText.replace(/:$/, '')}</p>` : ''}
                    `;
                }
                const fallbackText = messageContent.trim() || '[Mensaje sin contenido]';
                return `<p class="text-slate-800">${fallbackText}</p>`;
            })()}
            <p class="text-xs text-slate-400 text-right mt-1">${new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>`;
        chatHistoryEl.insertAdjacentHTML('beforeend', newBubble);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    function ensureDateDivider(isoDate) {
        const chatHistoryEl = document.getElementById('chat-history');
        if (!chatHistoryEl || !isoDate) return;

        const messageDate = new Date(isoDate);
        const dateKey = `${messageDate.getFullYear()}-${String(messageDate.getMonth() + 1).padStart(2, '0')}-${String(messageDate.getDate()).padStart(2, '0')}`;
        if (lastRenderedDateKey === dateKey) return;

        lastRenderedDateKey = dateKey;
        const label = messageDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
        chatHistoryEl.insertAdjacentHTML('beforeend', `
            <div class="my-4 flex justify-center">
                <span class="text-xs text-slate-400 bg-white/90 px-3 py-1 rounded-full shadow-sm">${label}</span>
            </div>
        `);
    }

    function renderContactInfoPanel() {
        if (!currentContact) return;

        // Ocultar toggle de grupos si estamos en modo contactos
        const groupAiToggle = document.getElementById('info-group-ai-toggle');
        if (groupAiToggle && groupAiToggle.parentElement && groupAiToggle.parentElement.parentElement) {
            groupAiToggle.parentElement.parentElement.style.display = 'none';
        }

        // Mostrar toggle de contacto
        const ignoreToggle = document.getElementById('info-ignore-ia-toggle-switch');
        if (ignoreToggle && ignoreToggle.parentElement) {
            ignoreToggle.parentElement.style.display = 'block';
        }

        // --- INICIO: Lógica para la galería de imágenes del chat ---
        const chatFilesContainer = document.getElementById('info-chat-files');
        if (chatFilesContainer) {
            // CORRECCIÓN: Obtener el historial de chat del contacto actual desde la caché `allRecentContacts`
            // y extraer todas las URLs de imágenes.
            const imageMessages = (
                allRecentContacts.find(c => c.contact_id == currentContactId)?.chat_history || []
            )
                .map(h => {
                    const content = typeof h?.content === 'string' ? h.content : '';
                    const match = content.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|avif|bmp|svg))/i);
                    return match ? match[0] : null;
                })
                .filter(Boolean);

            if (imageMessages.length > 0) {
                chatFilesContainer.innerHTML = `
                    <h5 class="font-semibold mb-2">Archivos del Chat</h5>
                    <div class="grid grid-cols-3 gap-2">
                        ${imageMessages.map(url => `<a href="${url}" target="_blank" class="aspect-square bg-slate-200 rounded-md overflow-hidden"><img src="${url}" class="w-full h-full object-cover"></a>`).join('')}
                    </div>`;
            } else {
                chatFilesContainer.innerHTML = ''; // Limpiar si no hay imágenes
            }
        }
        // --- FIN: Lógica para la galería de imágenes del chat ---    

        document.getElementById('info-contact-name').textContent = currentContact.full_name || 'Sin nombre';
        document.getElementById('info-contact-phone').textContent = currentContact.phone_number;

        // Función auxiliar para normalizar nombres de etiquetas (case-insensitive)
        const normalizeLabelName = (name) => {
            if (!name) return '';
            return name.trim().toLowerCase();
        };

        // Reutilizar ignoreToggle ya declarado arriba (línea 1329)
        if (ignoreToggle) {
            // Actualizar el data-contact-id
            ignoreToggle.setAttribute('data-contact-id', currentContact.contact_id || currentContact.id || '');
            // Verificar si tiene la etiqueta "ignorar" (case-insensitive)
            const hasIgnoreLabel = (currentContact.labels || []).some(label =>
                normalizeLabelName(label) === 'ignorar'
            );
            ignoreToggle.dataset.ignored = hasIgnoreLabel ? 'true' : 'false';
            const switchDiv = ignoreToggle.querySelector('div');
            if (switchDiv) {
                if (hasIgnoreLabel) {
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

        const teamInfo = window.appInstance?.teamInfo;
        const ignoredLabels = teamInfo?.ignored_labels || [];

        const labelsContainer = document.getElementById('info-contact-labels');
        const contactLabels = currentContact.labels || [];
        labelsContainer.innerHTML = contactLabels
            .filter(labelName => labelName !== 'ignorar' && !ignoredLabels.includes(labelName))
            .map(labelName => { // Reutilizamos la lógica de colores
                const labelData = allUserLabels.find(l => l.name === labelName);
                const bgColor = getLabelColor(labelData?.color);
                const textColor = getTextColorForBg(bgColor);
                return `<span class="text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full" style="background-color: ${bgColor}; color: ${textColor};">${labelName}</span>`;
            })
            .join('') || '<span class="text-xs text-slate-400">Sin etiquetas</span>';

        // Añadir la razón de la IA al panel de información
        const razonContainer = document.getElementById('info-contact-razon-ia');
        if (razonContainer) {
            if (currentContact?.razon_de_label_auto) {
                razonContainer.innerHTML = `<h5 class="font-semibold mb-2">Razón de la IA</h5><p class="text-sm bg-blue-50 p-3 rounded-md text-slate-700">${currentContact.razon_de_label_auto}</p>`;
                if (razonContainer.classList) razonContainer.classList.remove('hidden');
            } else {
                if (razonContainer.classList) razonContainer.classList.add('hidden');
            }
        } else {
            console.warn("Elemento 'info-contact-razon-ia' no encontrado en el DOM.");
        }

        // --- CORRECCIÓN: Cambiar el botón de texto por un icono y asegurar la renderización de iconos ---
        const manageLabelsContainer = document.getElementById('info-manage-labels-container');
        if (manageLabelsContainer) {
            manageLabelsContainer.innerHTML = `<button id="info-manage-labels-btn" class="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 font-semibold hover:underline mt-3"><i data-lucide="edit" class="w-4 h-4"></i> Gestionar etiquetas</button>`;
            document.getElementById('info-manage-labels-btn').addEventListener('click', openLabelsModalForChat);
            lucide.createIcons({ root: manageLabelsContainer }); // Renderizar el icono del botón
        }
    }

    // --- FUNCIONES DE UTILIDAD PARA COLORES (Reutilizadas) ---
    const colorPalette = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

    function getLabelColor(colorValue) {
        if (typeof colorValue === 'string' && colorValue.startsWith('#')) return colorValue;
        const index = parseInt(colorValue, 10);
        return (!isNaN(index) && index >= 0 && index < colorPalette.length) ? colorPalette[index] : '#A0AEC0';
    }

    function getTextColorForBg(bgColor) {
        if (!bgColor || !bgColor.startsWith('#')) return '#1e293b';
        const luma = (0.299 * parseInt(bgColor.substring(1, 3), 16) + 0.587 * parseInt(bgColor.substring(3, 5), 16) + 0.114 * parseInt(bgColor.substring(5, 7), 16)) / 255;
        return luma > 0.5 ? '#1e293b' : '#ffffff';
    }

    // Función auxiliar para normalizar nombres de etiquetas (case-insensitive)
    function normalizeLabelName(name) {
        if (!name) return '';
        return name.trim().toLowerCase();
    }

    // Función para obtener el nombre canónico de la etiqueta "ignorar"
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

    async function handleIgnoreIaToggle(e) {
        const switchElement = e.target.closest('#info-ignore-ia-toggle-switch') || e.target;
        if (!currentContact || !switchElement) return;
        const isCurrentlyIgnored = switchElement.dataset.ignored === 'true';
        const shouldIgnore = !isCurrentlyIgnored;

        const userId = window.auth.getSession()?.user?.id;
        const currentLabels = new Set(currentContact.labels || []);

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
            const { error } = await window.auth.sb.from('contacts').update({ labels: finalLabels }).eq('id', currentContact.contact_id);
            if (error) throw error;
            currentContact.labels = finalLabels; // Actualizar caché local del contacto

            // Recargar datos del contacto desde la DB para asegurar sincronización
            const { data: updatedContact, error: reloadError } = await window.auth.sb
                .from('contacts')
                .select('*')
                .eq('id', currentContact.contact_id)
                .single();

            if (!reloadError && updatedContact) {
                currentContact = {
                    contact_id: updatedContact.id,
                    ...updatedContact
                };
                // Actualizar el switch con el valor correcto
                const hasIgnoreLabel = (updatedContact.labels || []).some(label =>
                    normalizeLabelName(label) === 'ignorar'
                );
                switchElement.dataset.ignored = hasIgnoreLabel ? 'true' : 'false';
                const switchDiv = switchElement.querySelector('div');
                if (switchDiv) {
                    if (hasIgnoreLabel) {
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

    function openLabelsModalForChat() {
        if (!currentContact) return;
        // Reutilizamos la función del módulo de contactos
        window.contacts.openLabelsModalForSingleContact(currentContact.contact_id);
    }

    async function loadAllContactsForSearch() {
        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) return;

            // Obtener todos los contactos del usuario
            const { data, error } = await window.auth.sb
                .from('contacts')
                .select('id, full_name, phone_number')
                .eq('user_id', userId);

            if (error) throw error;

            allContactsForChatSearch = (data || []).map(contact => ({
                id: contact.id,
                full_name: contact.full_name,
                phone_number: contact.phone_number
            }));
        } catch (error) {
            console.error('Error al cargar contactos para búsqueda:', error);
            allContactsForChatSearch = [];
        }
    }

    function handleSearch(e) {
        const searchTerm = e.target.value.trim().toLowerCase();
        const listEl = document.getElementById('chat-contacts-list');
        if (!listEl) return;

        if (!searchTerm) {
            // Si no hay término de búsqueda, mostrar solo los contactos recientes
            listEl.querySelectorAll('.contact-item').forEach(item => {
                item.style.display = 'flex';
            });
            // Ocultar resultados de búsqueda si existen
            const searchResults = document.getElementById('chat-search-results');
            if (searchResults) {
                searchResults.remove();
            }
            return;
        }

        // Ocultar contactos recientes
        listEl.querySelectorAll('.contact-item').forEach(item => {
            item.style.display = 'none';
        });

        // Buscar en contactos recientes (chats existentes)
        const filteredRecentContacts = allRecentContacts.filter(c =>
            (c.full_name || '').toLowerCase().includes(searchTerm) ||
            (c.phone_number || '').includes(searchTerm)
        );

        // Buscar en todos los contactos (incluyendo los que no tienen chat)
        const filteredAllContacts = allContactsForChatSearch.filter(c => {
            const nameMatch = (c.full_name || '').toLowerCase().includes(searchTerm);
            const phoneMatch = (c.phone_number || '').includes(searchTerm);
            return nameMatch || phoneMatch;
        });

        // Crear un Set de IDs de contactos que ya tienen chat
        const recentContactIds = new Set(filteredRecentContacts.map(c => c.contact_id));

        // Separar contactos con chat y sin chat
        const contactsWithChat = filteredAllContacts.filter(c => recentContactIds.has(c.id));
        const contactsWithoutChat = filteredAllContacts.filter(c => !recentContactIds.has(c.id));

        // Eliminar resultados anteriores si existen
        const existingResults = document.getElementById('chat-search-results');
        if (existingResults) {
            existingResults.remove();
        }

        // Crear contenedor de resultados de búsqueda
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'chat-search-results';
        resultsContainer.className = 'p-2 space-y-2';

        // Agregar contactos con chat existente
        filteredRecentContacts.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'contact-item p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors';
            item.setAttribute('data-contact-id', contact.contact_id);
            item.setAttribute('data-contact-name', contact.full_name || '');
            item.setAttribute('data-contact-phone', contact.phone_number || '');

            const displayName = contact.full_name || contact.phone_number || 'Sin nombre';
            item.innerHTML = `
                <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    ${displayName.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 overflow-hidden">
                    <p class="font-bold truncate">${escapeHtml(displayName)}</p>
                    <p class="text-sm text-slate-500 truncate">${escapeHtml(contact.phone_number || '')}</p>
                </div>
            `;

            item.addEventListener('click', () => {
                loadChatForContact(contact.contact_id);
            });

            resultsContainer.appendChild(item);
        });

        // Agregar contactos sin chat (con opción de iniciar chat)
        contactsWithoutChat.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'contact-item p-3 flex items-center gap-3 cursor-pointer hover:bg-blue-50 rounded-lg transition-colors border border-blue-200';
            item.setAttribute('data-contact-id', contact.id);
            item.setAttribute('data-contact-name', contact.full_name || '');
            item.setAttribute('data-contact-phone', contact.phone_number || '');

            const displayName = contact.full_name || contact.phone_number || 'Sin nombre';
            item.innerHTML = `
                <div class="w-10 h-10 bg-slate-400 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    ${displayName.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 overflow-hidden">
                    <p class="font-bold truncate">${escapeHtml(displayName)}</p>
                    <p class="text-sm text-slate-500 truncate">${escapeHtml(contact.phone_number || '')}</p>
                </div>
                <span class="text-xs text-blue-600 font-semibold">Nuevo</span>
            `;

            item.addEventListener('click', async () => {
                // Iniciar chat con este contacto
                await loadChatForContact(contact.id);
                // Recargar lista para que aparezca en recientes
                await loadContactsList();
            });

            resultsContainer.appendChild(item);
        });

        // Si no hay resultados
        if (filteredRecentContacts.length === 0 && contactsWithoutChat.length === 0) {
            resultsContainer.innerHTML = `
                <div class="p-4 text-center text-slate-500">
                    <p>No se encontraron contactos</p>
                </div>
            `;
        }

        // Insertar resultados al inicio de la lista
        listEl.insertBefore(resultsContainer, listEl.firstChild);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- INICIO: Funciones para manejar archivos adjuntos ---
    function handlePaste(e) {
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault(); // Evitar que se pegue la ruta/nombre del archivo en el input
                handleFileSelect(file);
            }
        }
    }

    function handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const chatView = document.getElementById('chat-view-main');
        if (chatView && chatView.classList) chatView.classList.remove('bg-blue-50');

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }

    function handleFileSelect(file) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            window.showToast('Solo se pueden adjuntar imágenes o videos.', 'error');
            return;
        }
        attachedFile = file;
        const previewContainer = document.getElementById('chat-image-preview-container');
        const previewImg = document.getElementById('chat-image-preview');
        let previewVid = document.getElementById('chat-video-preview-custom');

        if (file.type.startsWith('image/')) {
            if (previewVid) previewVid.classList.add('hidden');
            if (previewImg) {
                previewImg.src = URL.createObjectURL(file);
                previewImg.classList.remove('hidden');
            }
        } else {
            // Es video
            if (previewImg) previewImg.classList.add('hidden');
            if (!previewVid) {
                previewVid = document.createElement('video');
                previewVid.id = 'chat-video-preview-custom';
                previewVid.className = 'max-h-32 rounded-lg';
                previewVid.controls = true;
                // Insertar antes del botón de cerrar o al final
                if (previewContainer) {
                    const closeBtn = document.getElementById('chat-remove-image-btn');
                    previewContainer.insertBefore(previewVid, closeBtn || null);
                }
            }
            previewVid.src = URL.createObjectURL(file);
            previewVid.classList.remove('hidden');
        }

        if (previewContainer && previewContainer.classList) previewContainer.classList.remove('hidden');
    }

    function removeAttachedFile() {
        attachedFile = null;
        const fileInput = document.getElementById('chat-file-input');
        if (fileInput) fileInput.value = '';
        const previewContainer = document.getElementById('chat-image-preview-container');
        if (previewContainer && previewContainer.classList) previewContainer.classList.add('hidden');
        const previewImg = document.getElementById('chat-image-preview');
        if (previewImg) {
            previewImg.src = '';
            previewImg.classList.remove('hidden'); // Restaurar para la próxima
        }
        const previewVid = document.getElementById('chat-video-preview-custom');
        if (previewVid) {
            previewVid.src = '';
            previewVid.classList.add('hidden');
        }
        // Limpiar URL object si existiera para evitar leaks (opcional pero buena práctica)
    }
    // --- FIN: Funciones para manejar archivos adjuntos ---

    // --- INICIO: Funciones para iniciar chat nuevo ---
    async function openNewChatModal() {
        const modal = document.getElementById('new-chat-modal');
        if (!modal || !modal.classList) return;

        modal.classList.remove('hidden');
        resetNewChatModal();
        await loadContactsForSelector();

        // Configurar listeners para las opciones de radio
        document.querySelectorAll('input[name="chat-option"]').forEach(radio => {
            radio.removeEventListener('change', handleChatOptionChange);
            radio.addEventListener('change', handleChatOptionChange);
        });

        lucide.createIcons();
    }

    function closeNewChatModal() {
        const modal = document.getElementById('new-chat-modal');
        if (modal && modal.classList) {
            modal.classList.add('hidden');
        }
        resetNewChatModal();
    }

    function resetNewChatModal() {
        const existingSelect = document.getElementById('existing-contact-select');
        const existingSearch = document.getElementById('existing-contact-search');
        const existingResults = document.getElementById('existing-contact-results');
        const newPhoneInput = document.getElementById('new-contact-phone');
        const newNameInput = document.getElementById('new-contact-name');
        const existingOption = document.querySelector('input[name="chat-option"][value="existing"]');

        if (existingSelect) existingSelect.value = '';
        if (existingSearch) existingSearch.value = '';
        if (existingResults) {
            if (existingResults.classList) existingResults.classList.add('hidden');
            existingResults.innerHTML = '';
        }
        if (newPhoneInput) newPhoneInput.value = '';
        if (newNameInput) newNameInput.value = '';
        if (existingOption) existingOption.checked = true;

        handleChatOptionChange();
    }

    function handleChatOptionChange() {
        const selectedOption = document.querySelector('input[name="chat-option"]:checked')?.value;
        const existingContainer = document.getElementById('existing-contact-container');
        const newContainer = document.getElementById('new-contact-container');

        if (selectedOption === 'new') {
            if (existingContainer && existingContainer.classList) existingContainer.classList.add('hidden');
            if (newContainer && newContainer.classList) newContainer.classList.remove('hidden');
        } else {
            if (existingContainer && existingContainer.classList) existingContainer.classList.remove('hidden');
            if (newContainer && newContainer.classList) newContainer.classList.add('hidden');
        }
    }

    async function loadContactsForSelector() {
        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) return;

            // Obtener todos los contactos del usuario
            const { data, error } = await window.auth.sb
                .from('contacts')
                .select('id, full_name, phone_number')
                .eq('user_id', userId)
                .order('full_name', { ascending: true });

            if (error) throw error;

            // Guardar contactos en caché para búsqueda
            allContactsForSearch = data || [];

            // Si hay un término de búsqueda, mostrar resultados
            const searchInput = document.getElementById('existing-contact-search');
            if (searchInput && searchInput.value.trim()) {
                handleContactSearch();
            }
        } catch (error) {
            console.error('Error al cargar contactos:', error);
        }
    }

    function handleContactSearch() {
        const searchInput = document.getElementById('existing-contact-search');
        const resultsContainer = document.getElementById('existing-contact-results');
        const hiddenSelect = document.getElementById('existing-contact-select');

        if (!searchInput || !resultsContainer || !hiddenSelect) return;

        const searchTerm = searchInput.value.trim().toLowerCase();

        if (!searchTerm) {
            if (resultsContainer && resultsContainer.classList) resultsContainer.classList.add('hidden');
            if (resultsContainer) resultsContainer.innerHTML = '';
            if (hiddenSelect) hiddenSelect.value = '';
            return;
        }

        // Filtrar contactos por nombre o número
        const filteredContacts = allContactsForSearch.filter(contact => {
            const name = (contact.full_name || '').toLowerCase();
            const phone = (contact.phone_number || '').toLowerCase();
            return name.includes(searchTerm) || phone.includes(searchTerm);
        });

        // Limpiar resultados anteriores
        resultsContainer.innerHTML = '';

        if (filteredContacts.length === 0) {
            if (resultsContainer) resultsContainer.innerHTML = '<div class="p-3 text-sm text-slate-500 text-center">No se encontraron contactos</div>';
            if (resultsContainer && resultsContainer.classList) resultsContainer.classList.remove('hidden');
            if (hiddenSelect) hiddenSelect.value = '';
            return;
        }

        // Mostrar resultados
        filteredContacts.forEach(contact => {
            const displayName = contact.full_name || contact.phone_number || 'Sin nombre';
            const item = document.createElement('div');
            item.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0';
            item.innerHTML = `
                <div class="font-medium text-slate-800">${escapeHtml(displayName)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(contact.phone_number)}</div>
            `;
            item.addEventListener('click', () => {
                if (hiddenSelect) hiddenSelect.value = contact.id;
                if (searchInput) searchInput.value = displayName;
                if (resultsContainer && resultsContainer.classList) resultsContainer.classList.add('hidden');
            });
            resultsContainer.appendChild(item);
        });

        if (resultsContainer && resultsContainer.classList) resultsContainer.classList.remove('hidden');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function handleNewChatConfirm() {
        const selectedOption = document.querySelector('input[name="chat-option"]:checked')?.value;
        let contactId = null;

        if (selectedOption === 'existing') {
            // Contacto existente
            const hiddenSelect = document.getElementById('existing-contact-select');
            contactId = hiddenSelect?.value;

            if (!contactId) {
                window.showToast?.('Por favor busca y selecciona un contacto.', 'error');
                return;
            }
        } else {
            // Contacto nuevo
            const phoneInput = document.getElementById('new-contact-phone');
            const nameInput = document.getElementById('new-contact-name');
            const phone = phoneInput?.value?.trim();
            const name = nameInput?.value?.trim();

            if (!phone) {
                window.showToast?.('Por favor ingresa un número de teléfono.', 'error');
                return;
            }

            try {
                // Normalizar el número
                const normalizedPhone = window.cleanPhone ? window.cleanPhone(phone) : phone;
                if (!normalizedPhone) {
                    window.showToast?.('Número de teléfono inválido. Debe tener al menos 10 dígitos.', 'error');
                    return;
                }

                const userId = window.auth.getSession()?.user?.id;
                if (!userId) {
                    throw new Error('No se pudo determinar el usuario actual.');
                }

                // Verificar si el contacto ya existe
                const { data: existingContact, error: checkError } = await window.auth.sb
                    .from('contacts')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('phone_number', normalizedPhone)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') {
                    throw checkError;
                }

                if (existingContact) {
                    // El contacto ya existe, usar su ID
                    contactId = existingContact.id;
                } else {
                    // Crear nuevo contacto
                    const { data: newContact, error: createError } = await window.auth.sb
                        .from('contacts')
                        .insert({
                            user_id: userId,
                            phone_number: normalizedPhone,
                            full_name: name || null
                        })
                        .select('id')
                        .single();

                    if (createError) throw createError;
                    contactId = newContact.id;
                }
            } catch (error) {
                console.error('Error al crear/buscar contacto:', error);
                window.showToast?.('Error al procesar el contacto. Intenta nuevamente.', 'error');
                return;
            }
        }

        // Cerrar el modal
        closeNewChatModal();

        // Cargar el chat del contacto
        if (contactId) {
            await loadChatForContact(contactId);
            // Recargar la lista de contactos para que aparezca el nuevo
            await loadContactsList();
        }
    }
    // --- FIN: Funciones para iniciar chat nuevo ---
})();

