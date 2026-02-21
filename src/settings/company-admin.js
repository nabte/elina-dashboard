(function () {
    let teamInfo = null;
    let currentUserId = null;
    let availableLabels = [];
    let notificationsFeatureAvailable = true;

    // Intentar inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // También escuchar el evento auth:ready
    document.addEventListener('auth:ready', async ({ detail }) => {
        if (!detail || !detail.session) {
            window.location.href = '/';
            return;
        }

        currentUserId = detail.session.user.id;

        await loadTeamInfo();
        if (teamInfo?.role !== 'admin' && teamInfo?.user_role !== 'admin') {
            window.location.href = '/dashboard.html';
            return;
        }

        await initAdminPanel();
    });

    async function init() {
        // Esperar a que auth esté disponible
        if (!window.auth) {
            setTimeout(init, 100);
            return;
        }

        // Obtener sesión actual
        const { data: { session } } = await window.auth.sb.auth.getSession();
        if (!session) {
            window.location.href = '/';
            return;
        }

        currentUserId = session.user.id;

        // Mostrar loading
        showLoading();

        try {
            await loadTeamInfo();
            if (teamInfo?.role !== 'admin' && teamInfo?.user_role !== 'admin') {
                window.location.href = '/dashboard.html';
                return;
            }

            await initAdminPanel();
            hideLoading();
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            hideLoading();
            showError('Error al cargar el panel. Por favor recarga la página.');
        }
    }

    function showLoading() {
        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p class="text-slate-600">Cargando panel de administrador...</p>
                    </div>
                </div>
            `;
        }
    }

    function hideLoading() {
        // El contenido original ya está en el HTML
    }

    function showError(message) {
        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                        <h2 class="text-red-800 font-bold mb-2">Error</h2>
                        <p class="text-red-600 mb-4">${message}</p>
                        <button onclick="window.location.reload()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                            Recargar Página
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async function loadTeamInfo() {
        const { data, error } = await window.auth.sb.rpc('get_user_team_info');
        if (error) {
            console.error('Error fetching team info:', error);
            return;
        }
        teamInfo = data;
        // Normalizar role para compatibilidad
        if (teamInfo && !teamInfo.role && teamInfo.user_role) {
            teamInfo.role = teamInfo.user_role;
        }
    }

    async function initAdminPanel() {
        await Promise.all([
            loadTeamMembers(),
            loadNotificationSettings(),
        ]);
        setupEventListeners();
    }

    function setupEventListeners() {
        document.getElementById('logout-btn')?.addEventListener('click', () => window.auth.handleLogout());
        document.getElementById('invite-form')?.addEventListener('submit', handleInviteSubmit);
        document.getElementById('create-user-form')?.addEventListener('submit', handleCreateUserSubmit);
        document.getElementById('team-members-list')?.addEventListener('change', handleMemberControlsChange);
        document.getElementById('notifications-form')?.addEventListener('submit', handleNotificationSave);
    }

    async function loadAdminLabels() {
        const ownerId = getLabelOwnerId();
        if (!ownerId) {
            availableLabels = [];
            return;
        }

        const { data, error } = await window.auth.sb
            .from('labels')
            .select('name')
            .eq('user_id', ownerId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading labels:', error);
            availableLabels = [];
            return;
        }

        availableLabels = (data || [])
            .map((label) => label.name)
            .filter(Boolean);
    }

    function getLabelOwnerId() {
        return teamInfo?.owner_id || teamInfo?.user_id || currentUserId;
    }

    async function loadTeamMembers() {
        if (!teamInfo?.team_id) return;
        await loadAdminLabels();

        const { data: members, error } = await window.auth.sb
            .from('team_members')
            .select('user_id, role, permissions, profiles:user_id(full_name, email)')
            .eq('team_id', teamInfo.team_id);

        if (error) {
            console.error('Error loading team members:', error);
            return;
        }

        const membersList = document.getElementById('team-members-list');
        membersList.innerHTML = members.map(createMemberItem).join('') ||
            '<p class="text-sm text-slate-500">Aún no has invitado vendedores.</p>';
    }

    function createMemberItem(member) {
        const isAdvisor = member.role === 'advisor';
        return `
            <div class="bg-slate-50 p-4 rounded-lg border space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <p class="font-semibold">${member.profiles?.full_name || member.profiles?.email}</p>
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${member.role}</span>
                    </div>
                </div>
                ${isAdvisor ? `
                    <div class="space-y-4">
                        ${createPermissionToggles(member)}
                        ${renderLabelRestrictions(member)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function createPermissionToggles(member) {
        const panels = {
            'chats': 'Chats',
            'follow-ups': 'Seguimientos',
            'kanban': 'Kanban',
            'contacts': 'Contactos',
        };

        const toggles = Object.entries(panels).map(([panelId, panelName]) => {
            const isChecked = member.permissions?.[panelId] || false;
            return `
                <label class="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                    <input type="checkbox" class="permission-toggle form-checkbox h-4 w-4 rounded text-blue-600" data-member-id="${member.user_id}" data-panel-id="${panelId}" ${isChecked ? 'checked' : ''}>
                    <span class="text-sm text-slate-700">${panelName}</span>
                </label>
            `;
        }).join('');

        return `
            <div>
                <p class="text-xs font-semibold text-slate-500 uppercase mb-2">Paneles que puede usar</p>
                <div class="flex flex-wrap gap-3">
                    ${toggles}
                </div>
            </div>
        `;
    }

    function renderLabelRestrictions(member) {
        const labelFilters = member.permissions?.label_filters || {};
        const contactsScope = Array.isArray(labelFilters.contacts) ? labelFilters.contacts : [];
        const chatsScope = Array.isArray(labelFilters.chats) ? labelFilters.chats : [];

        return `
            <div>
                <p class="text-xs font-semibold text-slate-500 uppercase mb-2">Etiquetas permitidas</p>
                <div class="grid gap-4 md:grid-cols-2">
                    ${renderLabelSelect(member, 'contacts', 'Contactos y Kanban', contactsScope)}
                    ${renderLabelSelect(member, 'chats', 'Chats', chatsScope)}
                </div>
            </div>
        `;
    }

    function renderLabelSelect(member, scope, label, selectedValues) {
        const optionSet = new Set([...(availableLabels || []), ...(selectedValues || [])]);
        if (!optionSet.size) {
            return `
                <div class="text-sm text-slate-500 bg-white rounded-lg border border-dashed border-slate-200 p-3">
                    Crea etiquetas desde Contactos para limitar lo que tus vendedores pueden ver.
                </div>
            `;
        }

        const options = Array.from(optionSet)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
            .map((name) => `<option value="${name}" ${selectedValues?.includes(name) ? 'selected' : ''}>${name}</option>`)
            .join('');

        return `
            <label class="flex flex-col gap-2">
                <span class="text-sm font-medium text-slate-600">${label}</span>
                <select multiple size="5" class="label-filter-select border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-member-id="${member.user_id}" data-scope="${scope}">
                    ${options}
                </select>
                <span class="text-xs text-slate-400">Solo verá contactos/chats con estas etiquetas.</span>
            </label>
        `;
    }

    async function handleMemberControlsChange(event) {
        const target = event.target;
        if (target.classList.contains('permission-toggle')) {
            await handlePermissionToggle(target);
        } else if (target.classList.contains('label-filter-select')) {
            await handleLabelFilterChange(target);
        }
    }

    async function handlePermissionToggle(toggle) {
        const memberId = toggle.dataset.memberId;
        const panelId = toggle.dataset.panelId;
        const isEnabled = toggle.checked;

        const success = await updateMemberPermissions(memberId, (permissions) => {
            permissions[panelId] = isEnabled;
        });

        if (!success) {
            toggle.checked = !isEnabled;
        }
    }

    async function handleLabelFilterChange(selectEl) {
        const memberId = selectEl.dataset.memberId;
        const scope = selectEl.dataset.scope;
        const selectedValues = Array.from(selectEl.selectedOptions).map((opt) => opt.value).filter(Boolean);

        const success = await updateMemberPermissions(memberId, (permissions) => {
            permissions.label_filters[scope] = selectedValues;
        });

        if (!success) {
            await loadTeamMembers();
        }
    }

    async function updateMemberPermissions(memberId, mutateFn) {
        const { data, error } = await window.auth.sb
            .from('team_members')
            .select('permissions')
            .eq('user_id', memberId)
            .eq('team_id', teamInfo.team_id)
            .single();

        if (error) {
            console.error('Error fetching member permissions:', error);
            return false;
        }

        const normalized = normalizePermissions(data.permissions);
        mutateFn(normalized);

        const { error: updateError } = await window.auth.sb
            .from('team_members')
            .update({ permissions: normalized })
            .eq('user_id', memberId)
            .eq('team_id', teamInfo.team_id);

        if (updateError) {
            console.error('Error updating permissions:', updateError);
            return false;
        }

        return true;
    }

    function normalizePermissions(raw) {
        const base = raw && typeof raw === 'object' ? { ...raw } : {};
        const labelFilters = base.label_filters && typeof base.label_filters === 'object'
            ? { ...base.label_filters }
            : {};

        if (!Array.isArray(labelFilters.contacts)) labelFilters.contacts = [];
        if (!Array.isArray(labelFilters.chats)) labelFilters.chats = [];

        base.label_filters = labelFilters;
        return base;
    }

    async function handleCreateUserSubmit(event) {
        event.preventDefault();
        const nameInput = document.getElementById('create-user-name');
        const emailInput = document.getElementById('create-user-email');
        const passwordInput = document.getElementById('create-user-password');
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim() || null;

        if (!name || !email) {
            window.showToast?.('Por favor completa todos los campos requeridos.', 'error');
            return;
        }

        const submitButton = event.submitter || event.target.querySelector('button[type="submit"]');
        const originalText = submitButton?.textContent;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Creando...';
        }

        try {
            // Crear usuario usando Supabase Auth Admin API a través de Edge Function
            const { data: createUserData, error: createError } = await window.auth.invokeFunction('create-user', {
                body: {
                    email: email,
                    password: password || undefined, // Si no hay password, se genera uno
                    user_metadata: {
                        full_name: name,
                        role: 'advisor'
                    }
                }
            });

            if (createError) {
                throw new Error(createError.message || 'La función de crear usuario no está disponible. Por favor usa la opción de "Invitar por Correo".');
            }

            const newUserId = createUserData?.user?.id;
            if (!newUserId) {
                throw new Error('No se pudo obtener el ID del usuario creado');
            }

            // Configurar etiqueta y permisos usando la función SQL
            const { error: setupError } = await window.auth.sb.rpc('setup_advisor_user', {
                p_team_id: teamInfo.team_id,
                p_user_id: newUserId,
                p_full_name: name
            });

            if (setupError) throw setupError;

            let passwordMessage = '';
            if (password) {
                passwordMessage = 'La contraseña fue establecida.';
            } else if (createUserData?.password) {
                passwordMessage = `Contraseña generada: ${createUserData.password}. ¡Guárdala en un lugar seguro!`;
            } else {
                passwordMessage = 'Se generó una contraseña automática.';
            }

            window.showToast?.(
                `Usuario ${name} creado exitosamente. ${passwordMessage}`,
                'success'
            );
            
            // Si se generó una contraseña, mostrarla en un alert también
            if (createUserData?.password && !password) {
                setTimeout(() => {
                    alert(`Contraseña generada para ${email}:\n\n${createUserData.password}\n\n¡Guárdala en un lugar seguro!`);
                }, 500);
            }
            
            // Limpiar formulario
            nameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            
            // Recargar lista de miembros
            await loadTeamMembers();
        } catch (err) {
            console.error('Error creating user:', err);
            const errorMessage = err.message || 'No se pudo crear el usuario.';
            window.showToast?.(errorMessage, 'error') ?? alert(errorMessage);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText || 'Crear Usuario';
            }
        }
    }

    async function handleInviteSubmit(event) {
        event.preventDefault();
        const emailInput = document.getElementById('invite-email');
        const email = emailInput.value.trim();
        if (!email) return;

        const inviteButton = event.submitter || event.target.querySelector('button[type="submit"]');
        const originalText = inviteButton?.textContent;
        if (inviteButton) {
            inviteButton.disabled = true;
            inviteButton.textContent = 'Enviando...';
        }

        try {
            const { error } = await window.auth.invokeFunction('invite-team-member', {
                body: { teamId: teamInfo.team_id, inviteeEmail: email, role: 'advisor' },
            });

            if (error) throw error;
            window.showToast?.(`Invitación enviada a ${email}.`, 'success') ?? alert(`Invitación enviada a ${email}.`);
            emailInput.value = '';
        } catch (err) {
            console.error('Error inviting member:', err);
            window.showToast?.('No se pudo enviar la invitación.', 'error') ?? alert('No se pudo enviar la invitación.');
        } finally {
            if (inviteButton) {
                inviteButton.disabled = false;
                inviteButton.textContent = originalText || 'Enviar Invitación';
            }
        }
    }

    async function loadNotificationSettings() {
        const phoneInput = document.getElementById('notification-phone');
        const emailInput = document.getElementById('notification-email');
        const labelsInput = document.getElementById('notification-labels');
        if (!phoneInput || !emailInput || !labelsInput || !currentUserId) return;

        try {
            const { data, error } = await window.auth.sb
                .from('escalation_settings')
                .select('notify_phone, notify_email, alert_labels')
                .eq('user_id', currentUserId)
                .single();

            if (error) {
                if (error.code === 'PGRST205') {
                    notificationsFeatureAvailable = false;
                    setNotificationFormDisabled(true, 'Activa la migración de alertas (tabla escalation_settings) para configurar este módulo.');
                    return;
                }
                if (error.code !== 'PGRST116') throw error;
            }

            phoneInput.value = data?.notify_phone ?? '';
            emailInput.value = data?.notify_email ?? '';
            labelsInput.value = Array.isArray(data?.alert_labels) ? data.alert_labels.join(',') : '';
            setNotificationFormDisabled(false);
        } catch (err) {
            console.error('Error loading alert settings:', err);
            setNotificationFormDisabled(false, 'No pudimos cargar tus alertas. Intenta más tarde.');
        }
    }

    async function handleNotificationSave(event) {
        event.preventDefault();
        if (!notificationsFeatureAvailable) return;

        const form = event.target;
        const phone = document.getElementById('notification-phone')?.value.trim() || null;
        const email = document.getElementById('notification-email')?.value.trim() || null;
        const labelsRaw = document.getElementById('notification-labels')?.value ?? '';
        const labels = parseLabelList(labelsRaw);

        const button = event.submitter || form.querySelector('button[type="submit"]');
        const originalText = button?.textContent;
        if (button) {
            button.disabled = true;
            button.textContent = 'Guardando...';
        }

        try {
            const { error } = await window.auth.sb.from('escalation_settings').upsert({
                user_id: currentUserId,
                notify_phone: phone,
                notify_email: email,
                alert_labels: labels,
            });

            if (error) throw error;
            window.showToast?.('Alertas actualizadas', 'success') ?? alert('Alertas actualizadas');
        } catch (err) {
            console.error('Error saving alert settings:', err);
            window.showToast?.('No pudimos guardar tus alertas.', 'error') ?? alert('No pudimos guardar tus alertas.');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText || 'Guardar alertas';
            }
        }
    }

    function setNotificationFormDisabled(disabled, message = '') {
        const form = document.getElementById('notifications-form');
        const helper = document.getElementById('notifications-helper');
        if (!form) return;

        const controls = form.querySelectorAll('input, button, select, textarea');
        controls.forEach((control) => {
            control.disabled = disabled;
        });
        form.classList.toggle('opacity-60', disabled);
        form.classList.toggle('pointer-events-none', disabled);

        if (helper) {
            helper.textContent = message;
            helper.classList.toggle('hidden', !message);
        }
    }

    function parseLabelList(value) {
        if (!value) return [];
        return value.split(',').map((label) => label.trim()).filter(Boolean);
    }
})();
