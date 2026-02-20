/**
 * Componente de conexión WhatsApp Venom para usuarios
 * Se integra en la página de settings
 */

class WhatsAppVenomManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.user = null;
        this.instance = null;
        this.pollingInterval = null;
        this.isConnecting = false;
    }

    async init(user) {
        this.user = user;
        await this.checkStatus();
        this.render();
    }

    async checkStatus() {
        try {
            const { data, error } = await window.auth.invokeFunction('manage-venom-instance', {
                body: {
                    action: 'status',
                    user_id: this.user.id
                }
            });

            if (!error && data) {
                this.instance = data.instance;
                return data.status;
            }

            return 'disconnected';
        } catch (error) {
            console.error('[Venom] Error checking status:', error);
            return 'disconnected';
        }
    }

    async connect() {
        if (this.isConnecting) return;

        this.isConnecting = true;
        this.render('loading');

        try {
            const { data, error } = await window.auth.invokeFunction('manage-venom-instance', {
                body: {
                    action: 'get-qr',
                    user_id: this.user.id
                }
            });

            if (error) {
                throw new Error(error.message || 'Error al generar QR');
            }

            if (data.qr) {
                this.instance = data.instance;
                this.render('qr', data.qr);
                this.startPolling();
            }

        } catch (error) {
            console.error('[Venom] Error connecting:', error);
            alert(`Error: ${error.message}`);
            this.isConnecting = false;
            this.render('disconnected');
        }
    }

    async disconnect() {
        if (!confirm('¿Desconectar WhatsApp Venom?')) return;

        try {
            await window.auth.invokeFunction('manage-venom-instance', {
                body: {
                    action: 'logout',
                    user_id: this.user.id
                }
            });

            this.stopPolling();
            this.instance = null;
            this.render('disconnected');

        } catch (error) {
            console.error('[Venom] Error disconnecting:', error);
            alert(`Error al desconectar: ${error.message}`);
        }
    }

    startPolling() {
        this.stopPolling();

        this.pollingInterval = setInterval(async () => {
            const status = await this.checkStatus();

            if (status === 'connected') {
                this.stopPolling();
                this.isConnecting = false;
                this.render('connected');
            }
        }, 3000); // Poll cada 3 segundos
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    render(state = null, qrBase64 = null) {
        if (!this.container) return;

        const currentState = state || (this.instance?.status === 'connected' ? 'connected' : 'disconnected');

        const templates = {
            disconnected: `
                <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                                <i data-lucide="smartphone" class="w-6 h-6 text-slate-400"></i>
                            </div>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-white mb-2">WhatsApp Venom</h3>
                            <p class="text-sm text-slate-400 mb-4">
                                Canal alternativo de WhatsApp con mayor estabilidad. Conecta tu número para empezar.
                            </p>
                            <button onclick="venomManager.connect()"
                                    class="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-6 rounded-lg shadow transition-colors">
                                <i data-lucide="qr-code" class="inline w-4 h-4 mr-2"></i>
                                Conectar WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            `,
            loading: `
                <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div class="flex flex-col items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
                        <p class="text-slate-300 text-sm">Generando código QR...</p>
                    </div>
                </div>
            `,
            qr: `
                <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div class="text-center">
                        <h3 class="text-lg font-semibold text-white mb-4">Escanea el código QR</h3>
                        <div class="bg-white p-4 rounded-lg inline-block mb-4">
                            <img id="venom-qr-image" src="data:image/png;base64,${qrBase64}"
                                 class="w-64 h-64" alt="QR Code">
                        </div>
                        <div class="space-y-3 text-sm text-slate-400">
                            <p>1. Abre WhatsApp en tu teléfono</p>
                            <p>2. Ve a Configuración > Dispositivos vinculados</p>
                            <p>3. Escanea este código QR</p>
                        </div>
                        <div class="mt-6 flex items-center justify-center gap-2">
                            <div class="animate-pulse flex items-center gap-2">
                                <div class="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                <span class="text-cyan-400 text-sm">Esperando conexión...</span>
                            </div>
                        </div>
                        <button onclick="venomManager.stopPolling(); venomManager.render('disconnected')"
                                class="mt-4 text-sm text-slate-400 hover:text-slate-300">
                            Cancelar
                        </button>
                    </div>
                </div>
            `,
            connected: `
                <div class="bg-slate-800 rounded-xl border border-green-500/30 p-6">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                <i data-lucide="check-circle" class="w-6 h-6 text-green-400"></i>
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-lg font-semibold text-white">WhatsApp Venom Conectado</h3>
                                <span class="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                                    ACTIVO
                                </span>
                            </div>
                            <p class="text-sm text-slate-400 mb-3">
                                ${this.instance?.phone_number ? `Número: ${this.instance.phone_number}` : 'Tu WhatsApp está conectado y listo para usar'}
                            </p>
                            <div class="flex gap-3">
                                <button onclick="venomManager.disconnect()"
                                        class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                                    Desconectar
                                </button>
                                <button onclick="venomManager.checkStatus().then(() => venomManager.render())"
                                        class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                                    <i data-lucide="refresh-cw" class="inline w-3 h-3 mr-1"></i>
                                    Actualizar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };

        this.container.innerHTML = templates[currentState] || templates.disconnected;

        // Reinicializar iconos Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    destroy() {
        this.stopPolling();
    }
}

// Exportar globalmente para uso en HTML
if (typeof window !== 'undefined') {
    window.WhatsAppVenomManager = WhatsAppVenomManager;
}
