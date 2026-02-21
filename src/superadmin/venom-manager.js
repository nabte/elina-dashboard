/**
 * SuperAdmin Venom Manager
 * Panel de gestión de instancias Venom WhatsApp
 */

class SuperAdminVenomManager {
    constructor() {
        this.instances = [];
    }

    async init() {
        await this.loadInstances();
        this.render();
        this.attachEvents();
    }

    async loadInstances() {
        try {
            const { data, error } = await window.auth.invokeFunction(
                'manage-venom-instance',
                {
                    body: {
                        action: 'list-all',
                        user_id: window.currentUser.id
                    }
                }
            );

            if (error) throw new Error(error.message);
            this.instances = data.instances || [];
        } catch (error) {
            console.error('[Venom Manager]', error);
            window.showToast(`Error: ${error.message}`, 'error');
        }
    }

    render() {
        const container = document.getElementById('venom-instances-container');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white">
                        <i data-lucide="smartphone" class="inline w-5 h-5 mr-2"></i>
                        Instancias Venom WhatsApp (${this.instances.length})
                    </h2>
                    <button onclick="venomManager.refresh()"
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
        if (this.instances.length === 0) {
            return `
                <div class="text-center py-12 text-slate-400">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No hay instancias Venom creadas</p>
                </div>
            `;
        }

        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-slate-700">
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Usuario</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Session ID</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Teléfono</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Estado</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Webhook</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Formato</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-slate-400">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.instances.map(i => this.renderRow(i)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRow(instance) {
        const statusColors = {
            connected: 'bg-green-500/20 text-green-400',
            connecting: 'bg-yellow-500/20 text-yellow-400',
            qr_ready: 'bg-blue-500/20 text-blue-400',
            disconnected: 'bg-slate-600/20 text-slate-400',
            error: 'bg-red-500/20 text-red-400'
        };

        return `
            <tr class="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td class="py-3 px-4">
                    <div class="text-sm font-medium text-white">${instance.full_name || 'N/A'}</div>
                    <div class="text-xs text-slate-400">${instance.email}</div>
                </td>
                <td class="py-3 px-4">
                    <code class="text-xs bg-slate-900 px-2 py-1 rounded text-cyan-400">
                        ${instance.session_id}
                    </code>
                </td>
                <td class="py-3 px-4 text-sm text-slate-300">
                    ${instance.phone_number || '-'}
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded ${statusColors[instance.status] || statusColors.disconnected}">
                        ${instance.status.toUpperCase()}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-xs text-slate-400 truncate max-w-[150px] block"
                          title="${instance.webhook_url}">
                        ${this.truncateUrl(instance.webhook_url)}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded ${
                        instance.image_format === 'base64'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                    }">
                        ${instance.image_format || 'url'}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex gap-2">
                        <button onclick="venomManager.edit('${instance.id}')"
                                class="p-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                title="Editar">
                            <i data-lucide="settings" class="w-4 h-4 text-slate-300"></i>
                        </button>
                        <button onclick="venomManager.delete('${instance.id}')"
                                class="p-2 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                                title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4 text-red-400"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async edit(instanceId) {
        const instance = this.instances.find(i => i.id === instanceId);
        if (!instance) return;

        const webhookUrl = prompt('Webhook URL:', instance.webhook_url);
        if (!webhookUrl) return;

        const imageFormat = confirm('¿Usar Base64 para imágenes?\n\nOK = Base64 (compatible)\nCancelar = URL (rápido)')
            ? 'base64'
            : 'url';

        try {
            const { error } = await window.auth.invokeFunction(
                'manage-venom-instance',
                {
                    body: {
                        action: 'update-config',
                        user_id: window.currentUser.id,
                        instance_id: instanceId,
                        webhook_url: webhookUrl,
                        image_format: imageFormat
                    }
                }
            );

            if (error) throw new Error(error.message);

            window.showToast('Configuración actualizada', 'success');
            await this.refresh();
        } catch (error) {
            window.showToast(`Error: ${error.message}`, 'error');
        }
    }

    async delete(instanceId) {
        if (!confirm('¿Eliminar esta instancia?\n\nEsta acción no se puede deshacer.')) return;

        try {
            const { error } = await window.auth.invokeFunction(
                'manage-venom-instance',
                {
                    body: {
                        action: 'delete-by-id',
                        user_id: window.currentUser.id,
                        instance_id: instanceId
                    }
                }
            );

            if (error) throw new Error(error.message);

            window.showToast('Instancia eliminada', 'success');
            await this.refresh();
        } catch (error) {
            window.showToast(`Error: ${error.message}`, 'error');
        }
    }

    async refresh() {
        await this.loadInstances();
        this.render();
    }

    truncateUrl(url) {
        if (!url) return 'N/A';
        return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }

    attachEvents() {
        // Eventos globales si es necesario
    }
}

if (typeof window !== 'undefined') {
    window.SuperAdminVenomManager = SuperAdminVenomManager;
}
