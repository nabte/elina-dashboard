export async function initAffiliatePanel() {
    const container = document.getElementById('affiliate-panel');
    if (!container) return;

    // Check permissions (redundant if checking before loading, but safe)
    const session = await window.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) return;

    // Load Stats
    loadAffiliateStats(userId, container);
    // Load Referrals List
    loadReferralsTable(userId, container);
    // Load Withdrawal History
    loadWithdrawalHistory(container);
    // Setup Withdrawal Button
    setupWithdrawalButton(container);
}

async function loadAffiliateStats(userId, container) {
    const { data: statsData, error } = await window.auth.sb.rpc('get_affiliate_stats', { affiliate_uuid: userId });

    if (error) {
        console.error("Error loading affiliate stats:", error);
        return;
    }

    const stats = statsData[0] || { total_referrals: 0, active_referrals: 0, monthly_commission: 0 };

    // Update UI elements - assumes they exist in the HTML structure we will inject
    const elements = {
        total: container.querySelector('#affiliate-total-referrals'),
        active: container.querySelector('#affiliate-active-referrals'),
        commission: container.querySelector('#affiliate-monthly-commission')
    };

    if (elements.total) elements.total.textContent = stats.total_referrals;
    if (elements.active) elements.active.textContent = stats.active_referrals;
    if (elements.commission) elements.commission.textContent = `$${stats.monthly_commission.toFixed(2)} MXN`;

    // Store commission for withdrawal validation
    container.dataset.availableCommission = stats.monthly_commission;
}

async function loadReferralsTable(userId, container) {
    const tbody = container.querySelector('#referrals-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">Cargando referidos...</td></tr>';

    const { data: referrals, error } = await window.auth.sb.rpc('get_affiliate_referrals', { affiliate_uuid: userId });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!referrals || referrals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">Aún no tienes referidos. ¡Comparte tu enlace!</td></tr>`;
        return;
    }

    tbody.innerHTML = referrals.map(ref => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-medium text-slate-700">${ref.email}</td>
            <td class="p-4 text-slate-500">${new Date(ref.created_at).toLocaleDateString()}</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs rounded-full ${ref.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
                    ${ref.status}
                </span>
            </td>
            <td class="p-4 text-sm text-slate-600">${ref.plan_id}</td>
        </tr>
    `).join('');
}

async function loadWithdrawalHistory(container) {
    const historyContainer = container.querySelector('#withdrawal-history-body');
    if (!historyContainer) return;

    historyContainer.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500 text-sm">Cargando historial...</td></tr>';

    const { data: withdrawals, error } = await window.auth.sb.rpc('get_my_withdrawals');

    if (error) {
        historyContainer.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-400 text-sm">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!withdrawals || withdrawals.length === 0) {
        historyContainer.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500 text-sm">No hay solicitudes de retiro.</td></tr>`;
        return;
    }

    const statusClasses = {
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-blue-100 text-blue-700',
        paid: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700'
    };

    historyContainer.innerHTML = withdrawals.map(w => `
        <tr class="border-b border-slate-100 last:border-0">
            <td class="p-3 text-sm text-slate-600">${new Date(w.created_at).toLocaleDateString()}</td>
            <td class="p-3 text-sm font-medium text-slate-800">$${parseFloat(w.amount).toFixed(2)}</td>
            <td class="p-3">
                <span class="px-2 py-0.5 text-xs rounded-full ${statusClasses[w.status] || 'bg-slate-100 text-slate-600'}">
                    ${w.status.toUpperCase()}
                </span>
            </td>
            <td class="p-3 text-xs text-slate-500">${w.notes || '-'}</td>
        </tr>
    `).join('');
}

function setupWithdrawalButton(container) {
    const btn = container.querySelector('#request-withdrawal-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const availableCommission = parseFloat(container.dataset.availableCommission || 0);

        if (availableCommission < 500) {
            window.showToast?.('Necesitas al menos $500 MXN de comisión acumulada para solicitar un retiro.', 'warning');
            return;
        }

        const amountStr = prompt(`Ingresa el monto a retirar (máximo $${availableCommission.toFixed(2)} MXN, mínimo $500 MXN):`);
        if (!amountStr) return;

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 500 || amount > availableCommission) {
            window.showToast?.('Monto inválido. Por favor ingresa un valor entre $500 y tu comisión disponible.', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Procesando...';

        try {
            const { data, error } = await window.auth.sb.rpc('create_withdrawal_request', { requested_amount: amount });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error);

            window.showToast?.('Solicitud de retiro creada exitosamente. Pronto nos pondremos en contacto.', 'success');
            loadWithdrawalHistory(container); // Refresh history
        } catch (e) {
            console.error("Error creating withdrawal request:", e);
            window.showToast?.(`Error: ${e.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Solicitar Retiro';
        }
    });
}

