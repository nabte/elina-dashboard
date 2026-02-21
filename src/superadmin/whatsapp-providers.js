/**
 * SuperAdmin WhatsApp Providers Manager
 * Gestiona asignación de proveedores (Evolution/Venom) por usuario
 */

class WhatsAppProvidersManager {
    constructor() {
        this.users = [];
    }

    async init() {
        await this.loadUsers();
        this.render();
    }

    async loadUsers() {
        try {
            const { data, error } = await window.supabase
                .from('superadmin_users_whatsapp')
                .select('*')
                .order('full_name');

            if (error) throw error;
            this.users = data || [];
        } catch (error) {
            console.error('[Providers Manager]', error);
            window.showToast(`Error: ${error.message}`, 'error');
        }
    }

    render() {
        const container = document.getElementById('whatsapp-providers-container');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="text-xl font-bold text-white">
                            <i data-lucide="zap" class="inline w-5 h-5 mr-2"></i>
                            Proveedores WhatsApp
                        </h2>
                        <p class="text-sm text-slate-400 mt-1">
                            Asigna Evolution o Venom a cada usuario
                        </p>
                    </div>
                    <button onclick="whatsappProvidersManager.refresh()"
                            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                        <i data-lucide="refresh-cw" class="inline w-4 h-4 mr-2"></i>
                        Actualizar
                    </button>
                </div>

                ${this.renderTable()}
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    renderTable() {
        if (this.users.length === 0) {
            return `
                <div class="text-center py-12 text-slate-400">
                    <i data-lucide="users" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No hay usuarios</p>
                </div>
            `;
        }

        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-slate-700">
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Usuario</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Proveedor</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">URL Proveedor</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Instancia/Sesión</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Estado</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.users.map(u => this.renderRow(u)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRow(user) {
        const providerColors = {
            evolution: 'bg-blue-500/20 text-blue-400',
            venom: 'bg-purple-500/20 text-purple-400'
        };

        const statusColors = {
            connected: 'bg-green-500/20 text-green-400',
            connecting: 'bg-yellow-500/20 text-yellow-400',
            disconnected: 'bg-slate-600/20 text-slate-400'
        };

        const instance = user.whatsapp_provider === 'evolution'
            ? user.evolution_instance
            : user.venom_session;

        const status = user.whatsapp_provider === 'venom'
            ? user.venom_status
            : 'N/A';

        return `
            <tr class="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td class="py-3 px-4">
                    <div class="text-sm font-medium text-white">${user.full_name || 'N/A'}</div>
                    <div class="text-xs text-slate-400">${user.email}</div>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded ${providerColors[user.whatsapp_provider] || providerColors.evolution}">
                        ${user.whatsapp_provider?.toUpperCase() || 'EVOLUTION'}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-xs text-slate-400 truncate max-w-[200px] block" title="${user.whatsapp_provider_url || 'Default'}">
                        ${this.truncateUrl(user.whatsapp_provider_url || 'Default')}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <code class="text-xs bg-slate-900 px-2 py-1 rounded text-cyan-400">
                        ${instance || 'N/A'}
                    </code>
                </td>
                <td class="py-3 px-4">
                    ${status !== 'N/A' ? `
                        <span class="px-2 py-1 text-xs font-medium rounded ${statusColors[status] || statusColors.disconnected}">
                            ${status?.toUpperCase() || 'N/A'}
                        </span>
                    ` : `<span class="text-xs text-slate-500">Evolution</span>`}
                </td>
                <td class="py-3 px-4">
                    <button onclick="whatsappProvidersManager.edit('${user.id}')"
                            class="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
                            title="Configurar Proveedor">
                        <i data-lucide="settings" class="w-4 h-4 text-blue-400"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    async edit(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Modal HTML
        const modalHtml = `
            <div id="provider-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="if(event.target.id==='provider-modal') this.remove()">
                <div class="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
                    <h3 class="text-lg font-bold text-white mb-4">
                        Configurar Proveedor WhatsApp
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">
                                Usuario
                            </label>
                            <div class="text-white font-medium">${user.full_name}</div>
                            <div class="text-xs text-slate-400">${user.email}</div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">
                                Proveedor
                            </label>
                            <select id="provider-select" class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none">
                                <option value="evolution" ${user.whatsapp_provider === 'evolution' ? 'selected' : ''}>Evolution API</option>
                                <option value="venom" ${user.whatsapp_provider === 'venom' ? 'selected' : ''}>Venom Bot</option>
                            </select>
                        </div>

                        <div id="provider-url-container" ${user.whatsapp_provider !== 'evolution' ? 'style="display:none"' : ''}>
                            <label class="block text-sm font-medium text-slate-300 mb-2">
                                URL del Proveedor Evolution (opcional)
                            </label>
                            <input
                                type="url"
                                id="provider-url"
                                placeholder="https://mi-evolution.ejemplo.com"
                                value="${user.whatsapp_provider_url || ''}"
                                class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none">
                            <p class="text-xs text-slate-400 mt-1">
                                Dejar vacío para usar el servidor Evolution por defecto
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button onclick="document.getElementById('provider-modal').remove()"
                                class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button onclick="whatsappProvidersManager.saveProvider('${userId}')"
                                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Event listener para mostrar/ocultar URL según proveedor
        document.getElementById('provider-select').addEventListener('change', (e) => {
            const urlContainer = document.getElementById('provider-url-container');
            if (e.target.value === 'evolution') {
                urlContainer.style.display = 'block';
            } else {
                urlContainer.style.display = 'none';
            }
        });

        if (window.lucide) window.lucide.createIcons();
    }

    async saveProvider(userId) {
        const provider = document.getElementById('provider-select').value;
        const providerUrl = document.getElementById('provider-url').value.trim() || null;

        try {
            const { data, error } = await window.supabase.rpc('superadmin_set_whatsapp_provider', {
                p_user_id: userId,
                p_provider: provider,
                p_provider_url: providerUrl
            });

            if (error) throw error;

            window.showToast('Proveedor actualizado correctamente', 'success');
            document.getElementById('provider-modal').remove();
            await this.refresh();

        } catch (error) {
            console.error('[Save Provider]', error);
            window.showToast(`Error: ${error.message}`, 'error');
        }
    }

    async refresh() {
        await this.loadUsers();
        this.render();
    }

    truncateUrl(url) {
        if (!url || url === 'Default') return url;
        return url.length > 40 ? url.substring(0, 40) + '...' : url;
    }
}

if (typeof window !== 'undefined') {
    window.WhatsAppProvidersManager = WhatsAppProvidersManager;
}
