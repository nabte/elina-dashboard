// superadmin.js - Lógica para el panel de Super Administrador

let superadminInitialized = false;
let cachedUsers = [];

document.addEventListener('auth:ready', async ({ detail }) => {
    if (!detail || !detail.session) {
        window.location.href = '/';
        return;
    }

    if (superadminInitialized) {
        return;
    }

    const { data, error } = await window.auth.sb.from('profiles').select('role').eq('id', detail.session.user.id).single();

    if (error || !data || data.role !== 'superadmin') {
        alert('Acceso denegado. No tienes permisos de superadministrador.');
        window.location.href = '/dashboard.html';
        return;
    }

    superadminInitialized = true;

    // Si es superadmin, inicializa el panel
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    initSuperAdminPanel();
});

function initSuperAdminPanel() {
    setupEventListeners();
    // Carga inicial
    loadUsers();
    loadPlans();
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}

function setupEventListeners() {
    // TABS NAVEGACIÓN
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // UI Update
            document.querySelectorAll('.nav-tab').forEach(t => {
                t.classList.remove('bg-cyan-600', 'text-white', 'shadow');
                t.classList.add('text-slate-400');
                t.classList.add('hover:bg-slate-700/50');
            });
            e.target.classList.add('bg-cyan-600', 'text-white', 'shadow');
            e.target.classList.remove('text-slate-400', 'hover:bg-slate-700/50');

            // Show Section
            document.querySelectorAll('.tab-content').forEach(section => section.classList.add('hidden'));
            const targetId = e.target.dataset.target;
            document.getElementById(targetId).classList.remove('hidden');

            // Load specific data if needed
            if (targetId === 'affiliates-section') {
                loadAffiliates();
            } else if (targetId === 'users-section') {
                loadUsers();
            } else if (targetId === 'withdrawals-section') {
                loadWithdrawals();
            } else if (targetId === 'ai-config-section') {
                loadAiConfig();
            }
        });
    });

    // AI Sub-tabs
    document.querySelectorAll('.ai-sub-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // UI Update
            document.querySelectorAll('.ai-sub-tab').forEach(t => {
                t.classList.remove('border-cyan-500', 'text-cyan-400');
                t.classList.add('border-transparent', 'text-slate-400');
            });
            e.target.classList.remove('border-transparent', 'text-slate-400');
            e.target.classList.add('border-cyan-500', 'text-cyan-400');

            // Show Section
            document.querySelectorAll('.ai-tab-content').forEach(section => section.classList.add('hidden'));
            const targetId = e.target.dataset.target;
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    // Sliders sync
    const syncSlider = (sliderId, inputId) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        if (slider && input) {
            slider.addEventListener('input', (e) => input.value = e.target.value);
            input.addEventListener('input', (e) => slider.value = e.target.value);
        }
    };
    syncSlider('ai-max-tokens-slider', 'ai-max-tokens');
    syncSlider('ai-temperature-slider', 'ai-temperature');

    // Delegación de eventos para los formularios de planes
    document.getElementById('plans-container').addEventListener('submit', (e) => {
        if (e.target.classList.contains('plan-form')) {
            e.preventDefault();
            handlePlanSave(e.target);
        }
    });

    // Botón de menú móvil
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
        const sidebar = document.getElementById('main-sidebar');
        sidebar?.classList.toggle('hidden');
    });

    // Búsqueda de usuarios
    document.getElementById('user-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('#users-table-body tr').forEach(row => {
            const email = row.dataset.email?.toLowerCase() || '';
            row.style.display = email.includes(searchTerm) ? '' : 'none';
        });
    });

    // --- DELEGACIÓN DE EVENTOS EN LA TABLA DE USUARIOS ---
    document.getElementById('users-table-body').addEventListener('click', async (e) => {
        // Change Plan
        const changePlanBtn = e.target.closest('.change-plan-btn');
        if (changePlanBtn) {
            openChangePlanModal(changePlanBtn.dataset.userId, changePlanBtn.dataset.userEmail, changePlanBtn.dataset.currentPlan);
            return;
        }

        // Impersonate
        const impersonateBtn = e.target.closest('.impersonate-btn');
        if (impersonateBtn) {
            e.stopPropagation();
            handleImpersonate(impersonateBtn.dataset.userId);
            return;
        }

        // Toggle Affiliate
        const toggleAffBtn = e.target.closest('.toggle-affiliate-btn');
        if (toggleAffBtn) {
            const userId = toggleAffBtn.dataset.userId;
            const currentStatus = toggleAffBtn.dataset.isAffiliate === 'true';
            await toggleAffiliateStatus(userId, !currentStatus);
            return;
        }

        // Assign Referrer
        const assignRefBtn = e.target.closest('.assign-referrer-btn');
        if (assignRefBtn) {
            openAssignReferrerModal(assignRefBtn.dataset.userId, assignRefBtn.dataset.userEmail, assignRefBtn.dataset.currentReferrer);
            return;
        }
    });

    // Acciones del modal Change Plan
    document.getElementById('cancel-change-plan-btn').addEventListener('click', () => {
        document.getElementById('change-plan-modal').classList.add('hidden');
    });
    document.getElementById('confirm-change-plan-btn').addEventListener('click', handlePlanChange);

    // Acciones del modal Assign Referrer
    document.getElementById('cancel-assign-referrer-btn').addEventListener('click', () => {
        document.getElementById('assign-referrer-modal').classList.add('hidden');
    });
    document.getElementById('confirm-assign-referrer-btn').addEventListener('click', handleAssignReferrerSave);

}

async function loadPlans() {
    const container = document.getElementById('plans-container');
    const { data: plans, error } = await window.auth.sb.from('plans').select('*');
    if (error) {
        container.innerHTML = '<p class="text-red-400">Error al cargar planes.</p>';
        return;
    }

    container.innerHTML = plans.map(plan => `
        <form class="plan-form bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4 shadow-md" data-plan-id="${plan.id}">
            <div class="flex justify-between items-center border-b border-slate-700 pb-4">
                <h3 class="text-xl font-bold text-cyan-400 flex items-center gap-2">
                    <i data-lucide="package" class="w-5 h-5"></i>
                    ${plan.name} <span class="text-xs text-slate-500 font-mono ml-2">(${plan.id})</span>
                </h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="space-y-1">
                    <label class="block text-xs font-medium text-slate-400 uppercase">Stripe Product ID</label>
                    <input type="text" value="${plan.stripe_product_id || ''}" class="stripe-product-id w-full bg-slate-900 border-slate-600 rounded p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none">
                </div>
                <div class="space-y-1">
                    <label class="block text-xs font-medium text-slate-400 uppercase">Límite Envíos</label>
                    <input type="number" value="${plan.bulk_sends_limit || 0}" class="limit-bulk-sends w-full bg-slate-900 border-slate-600 rounded p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none">
                </div>
                <div class="space-y-1">
                    <label class="block text-xs font-medium text-slate-400 uppercase">Mejoras IA</label>
                    <input type="number" value="${plan.ai_enhancements_limit || 0}" class="limit-ai-enhancements w-full bg-slate-900 border-slate-600 rounded p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none">
                </div>
                <div class="space-y-1">
                    <label class="block text-xs font-medium text-slate-400 uppercase">Imágenes IA</label>
                    <input type="number" value="${plan.image_generations_limit || 0}" class="limit-image-generations w-full bg-slate-900 border-slate-600 rounded p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none">
                </div>
                <div class="space-y-1">
                    <label class="block text-xs font-medium text-slate-400 uppercase">Videos IA</label>
                    <input type="number" value="${plan.video_generations_limit || 0}" class="limit-video-generations w-full bg-slate-900 border-slate-600 rounded p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none">
                </div>
                 <div class="space-y-1">
                    <label class="block text-xs font-medium text-slate-400 uppercase">Plantillas</label>
                    <input type="number" value="${plan.templates_limit || 0}" class="limit-templates w-full bg-slate-900 border-slate-600 rounded p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none">
                </div>
            </div>
            
            <div class="border-t border-slate-700 pt-4 flex justify-between items-center">
                <span class="text-xs text-slate-500">Configuración avanzada disponible en Supabase</span>
                <button type="submit" class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg shadow transition-colors text-sm">Guardar Cambios</button>
            </div>
        </form>
    `).join('');
    lucide.createIcons();
}

async function handlePlanSave(form) {
    const planId = form.dataset.planId;
    const updatedPlan = {
        stripe_product_id: form.querySelector('.stripe-product-id').value.trim() || null,
        bulk_sends_limit: parseInt(form.querySelector('.limit-bulk-sends').value) || 0,
        ai_enhancements_limit: parseInt(form.querySelector('.limit-ai-enhancements').value) || 0,
        image_generations_limit: parseInt(form.querySelector('.limit-image-generations').value) || 0,
        video_generations_limit: parseInt(form.querySelector('.limit-video-generations').value) || 0,
        templates_limit: parseInt(form.querySelector('.limit-templates').value) || 0,
        // Mantener features simples o expandir según necesidad
        features: {
            follow_ups: true, // Default
            designer_ai: true,
            video_ai: true,
            multi_user: planId === 'business'
        }
    };

    const { error } = await window.auth.sb.from('plans').update(updatedPlan).eq('id', planId);

    if (error) {
        alert(`Error al guardar el plan ${planId}: ${error.message}`);
    } else {
        alert(`Plan ${planId} actualizado con éxito.`);
    }
}

async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    const loader = document.getElementById('users-loader');

    // Llamar a RPC segura
    const { data: users, error } = await window.auth.sb.rpc('get_all_admin_users');
    if (error) {
        console.error('Error al cargar usuarios:', error);
        if (loader) loader.querySelector('td').textContent = `Error al cargar usuarios: ${error.message}`;
        return;
    }

    if (loader) loader.style.display = 'none';
    cachedUsers = users ?? [];

    tbody.innerHTML = cachedUsers.map(user => {
        const subscription = { plan_id: user.plan_id || 'free_trial', status: user.status || 'inactive' };

        // Determinar status badge
        let statusBadgeClass = 'bg-slate-700 text-slate-400';
        if (subscription.status === 'active') statusBadgeClass = 'bg-green-500/20 text-green-400 border border-green-500/30';
        if (subscription.status === 'trialing') statusBadgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';

        // Affiliate toggle
        const isAffiliate = user.is_affiliate === true;
        const switchClass = isAffiliate
            ? 'bg-purple-600 justify-end'
            : 'bg-slate-600 justify-start';

        // Referrer (usamos referred_by UUID si está disponible, si RPC no devuelve email, mostrar solo ID truncado o buscarlo)
        const referrerDisplay = user.referred_by ? `${user.referred_by.substring(0, 6)}...` : '-';

        return `
            <tr data-email="${user.email}" class="hover:bg-slate-800/50 transition-colors group">
                <td class="p-4 border-b border-slate-700">
                    <div class="flex items-center gap-3">
                        <div class="bg-gradient-to-br from-cyan-600 to-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                            ${user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-white">${user.email}</div>
                            <div class="text-xs text-slate-500 font-mono tracking-tighter">${user.id.substring(0, 8)}...</div>
                        </div>
                    </div>
                </td>
                <td class="p-4 border-b border-slate-700">
                    <span class="font-bold text-slate-200">${subscription.plan_id.toUpperCase()}</span>
                </td>
                <td class="p-4 border-b border-slate-700">
                    <span class="px-2.5 py-1 text-xs rounded-full font-medium ${statusBadgeClass} uppercase tracking-wider">
                        ${subscription.status}
                    </span>
                </td>
                <td class="p-4 border-b border-slate-700 text-center">
                    <button class="toggle-affiliate-btn relative w-12 h-6 rounded-full transition-colors duration-200 flex items-center p-1 ${switchClass}"
                            data-user-id="${user.id}" data-is-affiliate="${isAffiliate}">
                        <div class="w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200"></div>
                        <span class="sr-only">${isAffiliate ? 'Desactivar Afiliado' : 'Activar Afiliado'}</span>
                    </button>
                    <span class="block text-[10px] mt-1 text-slate-400 font-medium">${isAffiliate ? 'ACTIVO' : 'NO'}</span>
                </td>
                <td class="p-4 border-b border-slate-700 text-sm text-slate-400">
                    <div class="flex items-center gap-2 group/edit">
                        <span>${referrerDisplay}</span>
                        <button class="assign-referrer-btn text-slate-500 hover:text-cyan-400 opacity-100 transition-opacity" 
                                title="Asignar Referido"
                                data-user-id="${user.id}" data-user-email="${user.email}" data-current-referrer="${user.referred_by || ''}">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </td>
                <td class="p-4 border-b border-slate-700 text-right">
                    <div class="flex justify-end gap-2">
                        <button class="change-plan-btn bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded hover:bg-slate-600 transition-colors border border-slate-600 hover:border-slate-500"
                                data-user-id="${user.id}"
                                data-user-email="${user.email}"
                                data-current-plan="${subscription.plan_id}">
                            Plan
                        </button>
                        <button class="impersonate-btn bg-amber-600/10 text-amber-500 text-xs font-bold py-1.5 px-3 rounded hover:bg-amber-600 hover:text-white transition-all border border-amber-600/20 hover:border-amber-600"
                                data-user-id="${user.id}"
                                title="Iniciar sesión como este usuario">
                            <i data-lucide="log-in" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
    return cachedUsers;
}

async function openChangePlanModal(userId, userEmail, currentPlan) {
    document.getElementById('modal-user-id').value = userId;
    document.getElementById('modal-user-email').textContent = userEmail;

    // Cargar dinámicamente los planes
    const planSelect = document.getElementById('modal-plan-select');
    const { data: plans, error } = await window.auth.sb.from('plans').select('id, name');
    if (error) {
        console.error("Error cargando planes para el modal:", error);
        planSelect.innerHTML = `<option value="">Error al cargar</option>`;
    } else {
        planSelect.innerHTML = plans.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
    planSelect.value = currentPlan;

    document.getElementById('modal-override-payment').checked = false;
    document.getElementById('change-plan-modal').classList.remove('hidden');
}

async function handlePlanChange() {
    const userId = document.getElementById('modal-user-id').value;
    const newPlanId = document.getElementById('modal-plan-select').value;
    const isManualOverride = document.getElementById('modal-override-payment').checked;

    if (!isManualOverride) {
        alert('Funcionalidad de pago con Stripe aún no implementada. Marca la casilla "Forzar cambio" para asignar el plan manualmente.');
        return;
    }

    const button = document.getElementById('confirm-change-plan-btn');
    button.disabled = true;
    button.textContent = 'Guardando...';

    try {
        if (newPlanId === 'business') {
            const { error } = await window.auth.sb.rpc('create_business_team_for_user', { p_user_id: userId });
            if (error) throw new Error(`Error al crear el equipo y asignar el plan: ${error.message}`);
        } else {
            let newStatus = 'active';
            let trialEnds = new Date().toISOString();
            if (newPlanId === 'free_trial') {
                newStatus = 'trialing';
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 7);
                trialEnds = trialEndDate.toISOString();
            }

            const { error } = await window.auth.sb
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    plan_id: newPlanId,
                    status: newStatus,
                    trial_ends_at: trialEnds,
                    stripe_subscription_id: null
                }, { onConflict: 'user_id' });

            if (error) throw error;
        }

        alert('Plan del usuario actualizado con éxito.');
        document.getElementById('change-plan-modal').classList.add('hidden');
        loadUsers();

    } catch (e) {
        alert(`Error al cambiar el plan: ${e.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Cambio';
    }
}

async function handleImpersonate(userId) {
    if (!userId || !confirm(`¿Estás seguro de que quieres iniciar sesión como este usuario? Tu sesión actual de superadmin se guardará.`)) {
        return;
    }

    try {
        const { data: { session: currentSession }, error: sessionError } = await window.auth.sb.auth.getSession();
        if (sessionError) throw sessionError;
        if (!currentSession?.access_token || !currentSession?.refresh_token) {
            throw new Error('No se pudo recuperar la sesión del superadmin.');
        }

        localStorage.setItem('superadmin_session_tokens', JSON.stringify({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token
        }));

        const { data, error } = await window.auth.invokeFunction('impersonate-user', { body: { userId } });
        if (error) throw error;
        if (!data?.session?.access_token || !data?.session?.refresh_token) {
            throw new Error('La función de suplantación no devolvió credenciales válidas.');
        }

        await window.auth.sb.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });

        localStorage.setItem('impersonated_user_info', JSON.stringify({
            id: data.targetUserId,
            email: data.targetUserEmail
        }));

        window.location.href = '/dashboard.html';
    } catch (e) {
        alert(`Error al suplantar usuario: ${e.message}`);
    }
}

// --- FUNCIONES DE AFILIADOS ---

async function loadAffiliates() {
    const tbody = document.getElementById('affiliates-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-slate-400">Calculando métricas...</td></tr>';

    const { data: affiliates, error } = await window.auth.sb
        .from('profiles')
        .select('id, email')
        .eq('is_affiliate', true);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 bg-red-500/10 rounded">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!affiliates || affiliates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-500">No exiten afiliados activos.</td></tr>`;
        return;
    }

    const statsPromises = affiliates.map(async (aff) => {
        const { data: stats, error: statsError } = await window.auth.sb.rpc('get_affiliate_stats', { affiliate_uuid: aff.id });
        return {
            ...aff,
            stats: (stats && stats[0]) ? stats[0] : { total_referrals: 0, active_referrals: 0, monthly_commission: 0 },
            error: statsError
        };
    });

    const results = await Promise.all(statsPromises);

    tbody.innerHTML = results.map(item => `
        <tr class="hover:bg-slate-800/50 transition-colors">
            <td class="p-4 border-b border-slate-700 font-medium text-white">${item.email}</td>
            <td class="p-4 border-b border-slate-700 text-center text-lg">${item.stats.total_referrals}</td>
            <td class="p-4 border-b border-slate-700 text-center text-lg font-bold text-green-400">${item.stats.active_referrals}</td>
            <td class="p-4 border-b border-slate-700 text-right font-mono text-cyan-300 font-bold">$${item.stats.monthly_commission.toFixed(2)} MXN</td>
            <td class="p-4 border-b border-slate-700 text-right">
                <button class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded shadow transition-colors" onclick="alert('Detalle de referidos pendiente de implementación UI')">
                    Ver Referidos
                </button>
            </td>
        </tr>
    `).join('');
}

async function toggleAffiliateStatus(userId, newStatus) {
    console.log(`[SuperAdmin] Intentando cambiar estado de afiliado para ${userId} a ${newStatus}`);
    const button = document.querySelector(`.toggle-affiliate-btn[data-user-id="${userId}"]`);
    let oldClass = '';
    let oldIndicatorClass = '';

    if (button) {
        // Optimistic update
        const indicator = button.querySelector('div');
        const textLabel = button.nextElementSibling;

        button.disabled = true; // Prevenir clics múltiples

        if (newStatus) {
            button.classList.remove('bg-slate-600', 'justify-start');
            button.classList.add('bg-purple-600', 'justify-end');
            if (textLabel) textLabel.textContent = 'ACTIVO';
        } else {
            button.classList.remove('bg-purple-600', 'justify-end');
            button.classList.add('bg-slate-600', 'justify-start');
            if (textLabel) textLabel.textContent = 'NO';
        }
        button.dataset.isAffiliate = newStatus;
    }

    try {
        const { error, data } = await window.auth.sb.from('profiles').update({ is_affiliate: newStatus }).eq('id', userId).select();

        if (error) {
            throw error;
        }

        console.log('[SuperAdmin] Actualización exitosa:', data);

        if (data && data.length === 0) {
            console.warn('[SuperAdmin] No se actualizó ninguna fila. ¿El ID es correcto?');
            alert("No se encontró el perfil del usuario para actualizar.");
            loadUsers();
        } else {
            // En background actualizamos para asegurar consistencia si se desactivó
            if (!newStatus) loadAffiliates();
        }
    } catch (error) {
        console.error('[SuperAdmin] Error al actualizar afiliado:', error);
        alert("Error al actualizar estado de afiliado: " + error.message);
        loadUsers(); // Revert on error
    } finally {
        if (button) button.disabled = false;
    }
}

async function openAssignReferrerModal(userId, userEmail, currentReferrerId) {
    document.getElementById('assign-referrer-user-id').value = userId;
    document.getElementById('assign-referrer-user-email').textContent = userEmail;

    // Cargar lista de afiliados
    const select = document.getElementById('modal-referrer-select');
    select.innerHTML = '<option>Cargando...</option>';

    const { data: affiliates, error } = await window.auth.sb.from('profiles').select('id, email').eq('is_affiliate', true);

    if (error) {
        select.innerHTML = '<option value="">Error al cargar</option>';
        return;
    }

    let options = '<option value="">-- Sin Afiliado --</option>';
    if (affiliates) {
        affiliates.forEach(aff => {
            const isSelected = aff.id === currentReferrerId;
            options += `<option value="${aff.id}" ${isSelected ? 'selected' : ''}>${aff.email}</option>`;
        });
    }
    select.innerHTML = options;

    document.getElementById('assign-referrer-modal').classList.remove('hidden');
}

async function handleAssignReferrerSave() {
    const userId = document.getElementById('assign-referrer-user-id').value;
    const referrerId = document.getElementById('modal-referrer-select').value || null;

    const button = document.getElementById('confirm-assign-referrer-btn');
    button.disabled = true;
    button.innerText = "Guardando...";

    const { error } = await window.auth.sb.from('profiles').update({ referred_by: referrerId }).eq('id', userId);

    if (error) {
        alert("Error al asignar referido: " + error.message);
    } else {
        document.getElementById('assign-referrer-modal').classList.add('hidden');
        loadUsers();
    }
    button.disabled = false;
    button.innerText = "Guardar";
}

// --- GESTIÓN DE RETIROS ---
async function loadWithdrawals() {
    const tbody = document.getElementById('withdrawals-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-400">Cargando solicitudes...</td></tr>`;

    const { data: withdrawals, error } = await window.auth.sb.rpc('get_admin_withdrawals');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-red-400">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!withdrawals || withdrawals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-500">No hay solicitudes de retiro.</td></tr>`;
        return;
    }

    const statusClasses = {
        pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        approved: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        paid: 'bg-green-500/20 text-green-400 border border-green-500/30',
        rejected: 'bg-red-500/20 text-red-400 border border-red-500/30'
    };

    tbody.innerHTML = withdrawals.map(w => `
        <tr class="hover:bg-slate-700/30">
            <td class="p-4">
                <div class="font-medium text-slate-100">${w.affiliate_email}</div>
            </td>
            <td class="p-4 text-right font-bold text-lg text-emerald-400">$${parseFloat(w.amount).toFixed(2)}</td>
            <td class="p-4 text-center">
                <span class="px-2.5 py-1 text-xs rounded-full font-semibold uppercase tracking-wider ${statusClasses[w.status] || ''}">
                    ${w.status}
                </span>
            </td>
            <td class="p-4 text-slate-400">${new Date(w.created_at).toLocaleDateString()}</td>
            <td class="p-4 text-center">
                ${w.status === 'pending' ? `
                    <button class="approve-withdrawal-btn bg-green-600/20 text-green-400 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-green-600/40 transition mr-1"
                            data-request-id="${w.id}">
                        <i data-lucide="check" class="w-3 h-3 inline mr-1"></i> Aprobar
                    </button>
                    <button class="reject-withdrawal-btn bg-red-600/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-600/40 transition"
                            data-request-id="${w.id}">
                        <i data-lucide="x" class="w-3 h-3 inline mr-1"></i> Rechazar
                    </button>
                ` : `<span class="text-xs text-slate-500">${w.notes || '-'}</span>`}
            </td>
        </tr>
    `).join('');

    window.lucide?.createIcons();

    // Add event listeners to action buttons
    tbody.querySelectorAll('.approve-withdrawal-btn').forEach(btn => {
        btn.addEventListener('click', () => processWithdrawal(btn.dataset.requestId, 'paid'));
    });
    tbody.querySelectorAll('.reject-withdrawal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const reason = prompt('Motivo del rechazo (opcional):');
            processWithdrawal(btn.dataset.requestId, 'rejected', reason);
        });
    });
}

async function processWithdrawal(requestId, newStatus, notes = null) {
    const { data, error } = await window.auth.sb.rpc('process_withdrawal', {
        request_id: requestId,
        new_status: newStatus,
        admin_notes: notes
    });

    if (error) {
        alert('Error al procesar retiro: ' + error.message);
        return;
    }

    if (data && !data.success) {
        alert('Error: ' + data.error);
        return;
    }

    alert(`Retiro ${newStatus === 'paid' ? 'aprobado y marcado como pagado' : 'rechazado'} exitosamente.`);
    loadWithdrawals();
}

// --- CONFIGURACIÓN IA (EDGE FUNCTIONS) ---

async function loadAiConfig() {
    const loader = document.getElementById('ai-loader');
    const content = document.getElementById('ai-config-content');

    if (loader) loader.classList.remove('hidden');
    if (content) content.classList.add('hidden');

    try {
        const { data, error } = await window.auth.invokeFunction('get-edge-config', { method: 'GET' });

        if (error) throw error;

        populateAiForm(data);
        if (content) content.classList.remove('hidden');
    } catch (e) {
        console.error('Error loading AI config:', e);
        // alert('Error al cargar configuración de IA: ' + e.message); // Opcional: silenciar si es primera carga
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

function populateAiForm(config) {
    if (!config) return;

    // Prompts
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('ai-base-prompt', config.base_prompt);
    setVal('ai-personality-context', config.personality_context);
    setVal('ai-placeholder-instructions', config.placeholder_instructions);
    setVal('ai-appointment-rules', config.appointment_rules);

    // Flow
    const setCheck = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = val !== false; // Default true unless explicitly false
    };

    setCheck('ai-enable-appointment', config.enable_appointment_detection);
    setCheck('ai-enable-critical', config.enable_critical_detection);
    setCheck('ai-enable-product', config.enable_product_detection);
    setCheck('ai-enable-quote', config.enable_quote_detection);
    setCheck('ai-enable-sentiment', config.enable_sentiment_analysis);

    // Preferences default false unless true
    const elPref = document.getElementById('ai-enable-preferences');
    if (elPref) elPref.checked = config.enable_user_preferences === true;

    // Params
    setVal('ai-llm-model', config.llm_model || 'gpt-5-nano-2025-08-07');
    setVal('ai-max-tokens', config.max_tokens || 2000);
    setVal('ai-max-tokens-slider', config.max_tokens || 2000);
    setVal('ai-temperature', config.temperature || 0.7);
    setVal('ai-temperature-slider', config.temperature || 0.7);
    setVal('ai-inventory-mode', config.inventory_injection_mode || 'conditional');
}

async function saveAiConfig() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getCheck = (id) => document.getElementById(id)?.checked || false;

    const updates = {
        // Prompts
        base_prompt: getVal('ai-base-prompt'),
        personality_context: getVal('ai-personality-context'),
        placeholder_instructions: getVal('ai-placeholder-instructions'),
        appointment_rules: getVal('ai-appointment-rules'),

        // Flow
        enable_appointment_detection: getCheck('ai-enable-appointment'),
        enable_critical_detection: getCheck('ai-enable-critical'),
        enable_product_detection: getCheck('ai-enable-product'),
        enable_quote_detection: getCheck('ai-enable-quote'),
        enable_sentiment_analysis: getCheck('ai-enable-sentiment'),
        enable_user_preferences: getCheck('ai-enable-preferences'),

        // Params
        llm_model: getVal('ai-llm-model'),
        max_tokens: parseInt(getVal('ai-max-tokens')),
        temperature: parseFloat(getVal('ai-temperature')),
        inventory_injection_mode: getVal('ai-inventory-mode')
    };

    const btn = document.querySelector('button[onclick="saveAiConfig()"]');
    const originalText = btn ? btn.innerHTML : 'Guardar';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 inline mr-1 animate-spin"></i> Guardando...';
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        const { data, error } = await window.auth.invokeFunction('update-edge-config', {
            body: updates,
            method: 'POST'
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error || 'Error desconocido al guardar');

        alert('Configuración guardada correctamente');
        loadAiConfig(); // Reload to ensure sync
    } catch (e) {
        console.error('Error saving AI config:', e);
        alert('Error al guardar configuración: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

async function restoreAiDefaults() {
    if (!confirm('¿Estás seguro de que quieres restaurar los valores por defecto? Esto eliminará todos los prompts personalizados.')) {
        return;
    }

    const updates = {
        base_prompt: null,
        personality_context: null,
        placeholder_instructions: null,
        appointment_rules: null
    };

    const btn = document.querySelector('button[onclick="restoreAiDefaults()"]');
    if (btn) btn.disabled = true;

    try {
        const { data, error } = await window.auth.invokeFunction('update-edge-config', {
            body: updates,
            method: 'POST'
        });

        if (error) throw error;

        alert('Configuración restaurada a valores por defecto');
        loadAiConfig();
    } catch (e) {
        alert('Error al restaurar defaults: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Global scope
window.saveAiConfig = saveAiConfig;
window.restoreAiDefaults = restoreAiDefaults;

