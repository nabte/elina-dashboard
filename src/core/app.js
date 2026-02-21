// app.js - Lógica principal del Dashboard - v2026-02-17-001

// CORRECCIÓN: Se importan todos los módulos necesarios para que el compilador (Vite) los reconozca.
import './auth.js'; // auth.js debe estar primero
import '../modals/csv-mapping-modal.js'; // Ensure CSV modal and helpers are loaded early
import '../features/bulk-sending.js';
import '../features/chats.js';
import '../features/contacts.js';
import '../modals/smart-promotions.js';
import '../ai/sales-context.js';
import '../ai/designer-ai.js';
import '../tasks/follow-ups.js';
import '../features/kanban.js';
import '../features/products.js';
import '../features/quotes.js';
import '../settings/settings.js';
import '../tasks/smart-labels.js';
import '../modals/templates.js';
import '../ai/video-ai.js';
import '../features/appointments.js';
import '../ai/auto-responses.js';
import '../ai/prompt-training.js';
import '../tasks/personal-tasks.js';
import { initPlansModal } from '../modals/plans-modal.js';
import '../settings/knowledge-files-functions.js';
import { initAffiliatePanel } from '../affiliate/affiliate-panel.js';
import { initSupportChat } from '../affiliate/support-chat.js';


// --- INICIO: CORRECCIÓN DE ESTILO GLOBAL ---
// Inyecta una regla CSS para asegurar que los paneles inactivos no ocupen espacio.
// Esto soluciona el problema del espacio en blanco causado por paneles con display:flex.
const style = document.createElement('style');
style.textContent = `.content-panel:not(.active) { display: none !important; }`;
document.head.appendChild(style);
// --- FIN: CORRECCIÓN DE ESTILO GLOBAL ---

document.addEventListener('DOMContentLoaded', () => {
    // El script auth.js ahora se encarga de la inicialización del cliente de Supabase
    // y de escuchar los cambios de autenticación.
    // Simplemente esperamos a que 'auth:ready' nos avise que podemos empezar.
    const initializeDashboard = (session) => {
        if (session && !window.appInstance) {
            window.appInstance = new DashboardApp(session);
            window.app = window.appInstance; // Exponer también como window.app para facilitar acceso
            window.appInstance.init();
            initSupportChat(); // Inicializar chat de soporte


            // Exponer switchPanel globalmente para uso en otros módulos
            window.switchPanel = (targetId, options) => window.appInstance.switchPanel(targetId, options);
        }
    };

    // Escucha el evento 'auth:ready' que dispara auth.js.
    // Este es el método más seguro para sincronizar.
    document.addEventListener('auth:ready', ({ detail }) => initializeDashboard(detail.session));

    // Exponer función de visibilidad de citas globalmente
    window.updateAppointmentsMenuVisibility = (isEnabled) => {
        const menuItem = document.getElementById('appointments-menu-item');
        if (menuItem) {
            if (isEnabled) {
                menuItem.classList.remove('hidden');
            } else {
                menuItem.classList.add('hidden');
            }
        }
    };
});

// (Función de utilidad CSV eliminada - Se maneja en csv-mapping-modal.js)


class DashboardApp {
    constructor(session) {
        this.session = session;
        this.switchPanel = this.switchPanel.bind(this); // Asegurar que switchPanel esté vinculado
        this.user = session.user;
        this.teamInfo = null; // Para almacenar la info del equipo del usuario
        this.connectionMethod = 'qr'; // Método de conexión por defecto (qr o pairing)
        this.config = {
            N8N_URL: 'https://n8n-n8n.mcjhhb.easypanel.host', // Reemplazar con tu URL de n8n
            YOUTUBE_PLAYLIST_ID: 'PLfA32SmdFbHBdOXaPc_tdg28Kl2CFAXnz',
            CHATWOOT_BASE_URL: 'https://chat.elinaia.com.mx'
        };
        // Vincula los métodos para que 'this' funcione correctamente en los event listeners
        this.handlePromptSave = this.handlePromptSave.bind(this);
        this.checkWhatsappConnection = this.checkWhatsappConnection.bind(this);
        this.selectConnectionMethod = this.selectConnectionMethod.bind(this);
        this.openChatwoot = this.openChatwoot.bind(this);
        this.openAiEnhanceModal = this.openAiEnhanceModal.bind(this);
        this.openPromptHistory = this.openPromptHistory.bind(this);
        this.closePromptHistory = this.closePromptHistory.bind(this);
    }

    init() {

        // CORRECCIÓN: Llamar a lucide.createIcons() aquí, una vez que el DOM está listo y los scripts cargados.
        lucide.createIcons();

        // Procesar parámetro de invitación en la URL
        this.processInvitationFromURL();

        // Modal de bienvenida para nuevos usuarios
        if (!localStorage.getItem('welcome_popup_shown')) {
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal) {
                welcomeModal.classList.remove('hidden');
                document.getElementById('close-welcome-modal').addEventListener('click', () => {
                    welcomeModal.classList.add('hidden');
                    localStorage.setItem('welcome_popup_shown', 'true');
                });
            }
        }

        this.setupEventListeners();
        this.loadInitialData();

        // Recupera y muestra el último panel activo, o 'dashboard' por defecto
        this.checkImpersonation(); // <-- AÑADIDO: Verificar si estamos en modo suplantación
        const lastPanel = localStorage.getItem('activePanelId') || 'dashboard'; // CORRECCIÓN: No se necesita 'options' aquí
        this.switchPanel(lastPanel);
        this.listenForProfileChanges();
        this.wizard = new Wizard(this); // Inicializar el Wizard aquí

        // --- INICIO: Restaurar estado del sidebar ---
        this.setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true');
        // --- FIN: Restaurar estado del sidebar ---

        // Verificar estado de appointment_settings y actualizar menú
        this.checkAppointmentsEnabled();

        // Inicializar modal de planes
        initPlansModal();

        // Inicializar lógica del sidebar móvil
        this.initMobileSidebar();

        // --- INICIO: Manejo de Hash para navegación directa ---
        const handleHash = () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                console.log(`[App] Navegando por hash a: ${hash}`);
                this.switchPanel(hash);
            }
        };
        window.addEventListener('hashchange', handleHash);
        // Ejecutar al inicio si hay hash
        if (window.location.hash) handleHash();
        // --- FIN: Manejo de Hash ---
    }

    initMobileSidebar() {
        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        const mainSidebar = document.getElementById('main-sidebar');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');

        if (mobileToggle && mainSidebar) {
            mobileToggle.addEventListener('click', () => {
                mainSidebar.classList.add('open');
            });
        }

        if (closeSidebarBtn && mainSidebar) {
            closeSidebarBtn.addEventListener('click', () => {
                mainSidebar.classList.remove('open');
            });
        }

        // Close sidebar on link click (mobile)
        if (1024 > window.innerWidth) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    if (mainSidebar) mainSidebar.classList.remove('open');
                });
            });
        }
    }

    async checkAppointmentsEnabled() {
        try {
            const userId = await window.getUserId();
            if (!userId) return;

            const { data: settings, error } = await window.auth.sb
                .from('appointment_settings')
                .select('is_enabled')
                .eq('user_id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('[App] Error al verificar estado de citas:', error);
                return;
            }

            // Si no existe la configuración o está deshabilitada, ocultamos el menú
            const isEnabled = settings ? settings.is_enabled : false;

            const menuItem = document.getElementById('appointments-menu-item');
            if (menuItem) {
                if (isEnabled) menuItem.classList.remove('hidden');
                else menuItem.classList.add('hidden');
            }

            // Mostrar/Ocultar card en el Dashboard
            const dashboardCard = document.getElementById('booking-link-card');
            if (dashboardCard) {
                if (isEnabled) {
                    dashboardCard.classList.remove('hidden');
                    this.renderDashboardBookingLink();
                } else {
                    dashboardCard.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('[App] Error al verificar estado de citas:', error);
        }
    }

    async renderDashboardBookingLink() {
        const linkInput = document.getElementById('dashboard-booking-link');
        const openLinkBtn = document.getElementById('open-dashboard-link-btn');
        const copyBtn = document.getElementById('copy-dashboard-link-btn');

        if (!linkInput) return;

        try {
            // Usar window.getUserId() para asegurar consistencia (especialmente en suplantación)
            const userId = await window.getUserId();
            if (!userId) return;

            const { data: profile } = await window.auth.sb
                .from('profiles')
                .select('slug, id')
                .eq('id', userId)
                .single();

            if (profile) {
                // Generar URL absoluta
                const linkSuffix = profile.slug || `booking.html?s=${profile.id}`;
                const baseUrl = window.location.origin.replace(/\/$/, '');
                const link = `${baseUrl}/${linkSuffix}`;

                if (linkInput) linkInput.value = link;
                if (openLinkBtn) openLinkBtn.setAttribute('href', link);

                if (copyBtn) {
                    copyBtn.onclick = (e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(link);
                        window.showToast?.('Link copiado', 'success');

                        const icon = copyBtn.querySelector('i');
                        if (icon) {
                            const original = icon.getAttribute('data-lucide');
                            icon.setAttribute('data-lucide', 'check');
                            lucide.createIcons({ nodes: [icon] });
                            setTimeout(() => {
                                icon.setAttribute('data-lucide', original);
                                lucide.createIcons({ nodes: [icon] });
                            }, 2000);
                        }
                    };
                }
            }
        } catch (e) {
            console.error('Error rendering dashboard booking link', e);
        }
    }

    setupEventListeners() {
        // NO VERIFICAR AUTOMÁTICAMENTE - Solo mostrar placeholder inicial
        document.addEventListener('auth:ready', () => {
            console.log('[WhatsApp] window.auth disponible, mostrando placeholder inicial');
            this.renderWhatsappConnection('initial');
            // this.checkConnectionStatus(); // DESHABILITADO - Solo verificar manualmente
        });

        // Verificar estado cuando el usuario regresa al tab (solo si cache expiró)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.user) {
                const CACHE_KEY = 'whatsapp_connection_status';
                const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 horas

                try {
                    const cachedData = localStorage.getItem(CACHE_KEY);
                    if (cachedData) {
                        const { timestamp } = JSON.parse(cachedData);
                        const cacheAge = Date.now() - timestamp;

                        // Solo verificar si el cache expiró
                        if (cacheAge >= CACHE_DURATION) {
                            console.log('[WhatsApp] 👁️ Usuario regresó al tab y cache expiró, verificando estado...');
                            this.checkConnectionStatus();
                        }
                    }
                } catch (e) {
                    console.warn('[WhatsApp] Error checking cache on visibility change:', e);
                }
            }
        });

        // Navegación principal
        document.querySelectorAll('.nav-link[data-target]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(link.dataset.target);
            });
        });

        // Event listeners para grupos (cuando se hace clic en el título del grupo)
        document.querySelectorAll('.nav-link[data-group]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const groupId = link.dataset.group;
                const defaultTab = link.dataset.groupDefault || this.getDefaultTabForGroup(groupId);
                if (defaultTab) {
                    this.switchPanel(defaultTab, { groupId, tabId: defaultTab });
                }
            });
        });

        // Event listeners para pestañas de grupos
        document.querySelectorAll('.group-tab[data-target]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = tab.dataset.target;
                const groupId = tab.closest('[data-group-container]')?.dataset.groupContainer;
                if (targetId && groupId) {
                    this.switchPanel(targetId, { groupId, tabId: tab.dataset.tab });
                }
            });
        });

        // Botón de logout
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            auth.handleLogout();
        });

        // Formulario de Prompt
        document.getElementById('prompt-form')?.addEventListener('submit', this.handlePromptSave);

        // Botón de mejora de IA en el prompt principal
        document.getElementById('main-prompt-ai-enhance-btn')?.addEventListener('click', () => {
            const textarea = document.getElementById('ai-master-prompt');
            if (textarea.value) {
                // Usar contexto 'behavior_prompt' para prompts de comportamiento del asistente
                this.openAiEnhanceModal(textarea.value, (newText) => {
                    textarea.value = newText;
                }, 'behavior_prompt');
            }
        });
        document.getElementById('remake-prompt-btn')?.addEventListener('click', () => {
            this.wizard.start(true); // true para saltar al paso de Q&A
        });

        // Botón de historial de versiones
        document.getElementById('view-history-btn')?.addEventListener('click', this.openPromptHistory);
        document.getElementById('close-history-modal-btn')?.addEventListener('click', this.closePromptHistory);

        // Botón de QR de WhatsApp
        document.getElementById('request-qr-btn')?.addEventListener('click', this.checkWhatsappConnection);

        // Botones de método de conexión
        document.getElementById('method-qr-btn')?.addEventListener('click', () => this.selectConnectionMethod('qr'));
        document.getElementById('method-pairing-btn')?.addEventListener('click', () => this.selectConnectionMethod('pairing'));

        // Botón de desconectar WhatsApp
        document.getElementById('disconnect-whatsapp-btn')?.addEventListener('click', this.disconnectWhatsApp.bind(this));

        // Inicializar intl-tel-input para el campo de WhatsApp
        const whatsappPhoneInput = document.getElementById('whatsapp-phone-input');
        if (whatsappPhoneInput && typeof window.intlTelInput !== 'undefined') {
            this.whatsappIti = window.intlTelInput(whatsappPhoneInput, {
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                initialCountry: "mx",
                separateDialCode: true,
                preferredCountries: ["mx", "co", "ar", "cl", "pe", "es", "us"],
                autoPlaceholder: "aggressive"
            });
            console.log('[WhatsApp] intl-tel-input inicializado');

            // Pre-llenar el número de WhatsApp guardado
            this.loadSavedWhatsAppNumber();

            // Ocultar mensaje de error cuando el usuario empieza a escribir
            whatsappPhoneInput.addEventListener('input', () => {
                const phoneErrorMessage = document.getElementById('phone-error-message');
                if (phoneErrorMessage) {
                    phoneErrorMessage.classList.add('hidden');
                    whatsappPhoneInput.classList.remove('border-red-500', 'border-2');
                }
            });

            // También ocultar error cuando cambia el país
            whatsappPhoneInput.addEventListener('countrychange', () => {
                const phoneErrorMessage = document.getElementById('phone-error-message');
                if (phoneErrorMessage) {
                    phoneErrorMessage.classList.add('hidden');
                    whatsappPhoneInput.classList.remove('border-red-500', 'border-2');
                }
            });
        }

        // Enlace a Chatwoot
        document.getElementById('chatwoot-link')?.addEventListener('click', this.openChatwoot);

        // Botón de menú móvil
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            const sidebar = document.getElementById('main-sidebar');
            sidebar?.classList.add('open'); // CORRECCIÓN: Siempre abre, no alterna
        });

        // --- INICIO: Listener para el modal de ayuda del prompt ---
        document.getElementById('prompt-help-btn')?.addEventListener('click', () => document.getElementById('prompt-help-modal')?.classList.remove('hidden'));
        document.getElementById('close-prompt-help-btn')?.addEventListener('click', () => document.getElementById('prompt-help-modal')?.classList.add('hidden'));

        // --- INICIO: Listeners para el nuevo Wizard ---
        document.getElementById('dashboard-wizard-btn')?.addEventListener('click', () => this.wizard.start());

        // --- CORRECCIÓN: Añadir listener para el nuevo botón de cerrar ---
        document.getElementById('close-sidebar-btn')?.addEventListener('click', () => {
            const sidebar = document.getElementById('main-sidebar');
            sidebar?.classList.remove('open');
        });

        document.getElementById('open-tutorials-btn')?.addEventListener('click', () => this.openTutorialsModal());
        // Carrusel de YouTube
        this.setupYoutubeCarousel();

        // --- CORRECCIÓN: Centralizar todos los listeners del modal de IA aquí ---
        document.getElementById('cancel-ai-btn')?.addEventListener('click', () => this.closeAiModal());
        document.getElementById('generate-ai-btn')?.addEventListener('click', () => this.handleGenerateAi());
        // --- INICIO: CORRECCIÓN para que el botón de regenerar funcione ---
        // El botón de regenerar debe llamar a la misma función que el de generar.
        const regenerateBtn = document.getElementById('regenerate-ai-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => this.handleGenerateAi(true)); // true para indicar que es una regeneración
        }
        // --- FIN: CORRECCIÓN ---
        document.getElementById('regenerate-ai-btn')?.addEventListener('click', () => this.handleGenerateAi());
        document.getElementById('apply-ai-btn')?.addEventListener('click', () => this.handleApplyAi());
        document.getElementById('toggle-sidebar-collapse-btn')?.addEventListener('click', () => this.toggleSidebarCollapsed());

        // --- INICIO: Listeners para el modal de pricing ---
        document.getElementById('cancel-pricing-modal-btn')?.addEventListener('click', () => this.closePricingModal());

        // Listener für die Pricing-Modal-Buttons (usando delegación de eventos)
        const pricingModal = document.getElementById('pricing-modal');
        if (pricingModal) {
            pricingModal.addEventListener('click', (e) => {
                const upgradeBtn = e.target.closest('.upgrade-btn');
                if (upgradeBtn) {
                    e.preventDefault();
                    const planId = upgradeBtn.dataset.plan;
                    if (planId) {
                        this.handleUpgradeClick(planId);
                    }
                }
            });
        }
        // --- FIN: Listeners para el modal de pricing ---

        // --- Listeners para Configuración Rápida de Citas (Nuevo) ---
        document.getElementById('close-appointments-config-modal-btn')?.addEventListener('click', () => {
            document.getElementById('appointments-quick-config-modal')?.classList.add('hidden');
        });
        document.getElementById('cancel-appointments-config-btn')?.addEventListener('click', () => {
            document.getElementById('appointments-quick-config-modal')?.classList.add('hidden');
        });
        document.getElementById('save-appointments-config-btn')?.addEventListener('click', () => this.handleSaveAppointmentsConfig());

        document.getElementById('open-full-settings-btn')?.addEventListener('click', () => {
            document.getElementById('appointments-quick-config-modal')?.classList.add('hidden');
            // Si existe un panel de configuración, cambiar a él
            if (document.getElementById('settings')) {
                this.switchPanel('settings');
            } else {
                // Fallback si no hay panel settings explícito
                window.showToast('Abriendo configuración completa...', 'info');
            }
        });

        document.getElementById('open-products-btn')?.addEventListener('click', () => {
            document.getElementById('appointments-quick-config-modal')?.classList.add('hidden');
            this.switchPanel('products');
        });

        document.getElementById('refresh-hours-btn')?.addEventListener('click', () => {
            // Aquí iría la lógica para recargar horas si fuera dinámico
            window.showToast('Horarios actualizados', 'success');
        });

    }

    checkImpersonation() {
        const impersonatedUserInfo = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
        const superadminSessionData = localStorage.getItem('superadmin_session_tokens');

        if (!impersonatedUserInfo) {
            document.body.style.paddingTop = '0';
            return;
        }
        if (!superadminSessionData) {
            localStorage.removeItem('impersonated_user_info');
            document.body.style.paddingTop = '0';
            return;
        }

        if (document.getElementById('impersonation-bar')) {
            return; // Evita duplicados
        }

        if (impersonatedUserInfo) {
            const impersonationBar = document.createElement('div');
            impersonationBar.id = 'impersonation-bar';
            impersonationBar.className = 'fixed top-0 left-0 w-full bg-amber-500 text-black font-bold text-xs p-1 text-center z-[200] flex justify-center items-center gap-2';
            impersonationBar.innerHTML = `
                <span>Estás viendo como <strong>${impersonatedUserInfo.email}</strong>.</span>
                <button id="stop-impersonating-btn" class="bg-slate-800 text-white py-0.5 px-2 rounded hover:bg-slate-700 text-xs">Volver a Super Admin</button>
            `;
            document.body.prepend(impersonationBar);
            document.body.style.paddingTop = '0'; // No empujar el contenido

            document.getElementById('stop-impersonating-btn').addEventListener('click', async () => {
                try {
                    // Restaurar la sesión original del superadmin
                    const originalSession = JSON.parse(localStorage.getItem('superadmin_session_tokens') || 'null');
                    if (!originalSession?.access_token || !originalSession?.refresh_token) {
                        throw new Error('Sesión original inválida. Por favor, inicia sesión nuevamente.');
                    }
                    await window.auth.sb.auth.setSession(originalSession);

                    // Limpiar la información de suplantación y recargar
                    localStorage.removeItem('impersonated_user_info');
                    localStorage.removeItem('superadmin_session_tokens');

                    document.body.style.paddingTop = '0'; // Resetear el padding
                    window.location.reload(); // Recargar para limpiar el estado de suplantación
                } catch (e) {
                    console.error("Error al detener la suplantación:", e);
                    alert("No se pudo volver a la sesión de superadmin. Por favor, cierra sesión y vuelve a entrar.");
                }
            });
        }
    }

    loadInitialData() {
        this.fetchUserProfile();
        this.fetchMasterPrompt();
        this.loadDashboardMetrics(); // Cargar y renderizar métricas del dashboard
        this.loadFunnelMetrics();

        // Cargar datos de suscripción y equipo en paralelo
        Promise.all([
            this.loadUserSubscription(),
            this.loadTeamInfo()
        ]).then(([userPlan, teamInfo]) => {
            this.renderUserPlanBadge(userPlan);
            this.renderUpgradeButtons(userPlan);
            // --- INICIO: CORRECCIÓN - Desacoplar applyFeatureRestrictions ---
            // Ahora, en lugar de llamar a la función directamente, escuchamos el evento
            // 'panel:activated' para aplicar las restricciones solo cuando un panel se muestra.
            document.addEventListener('panel:activated', () => this.applyFeatureRestrictions(userPlan, teamInfo));
            // --- FIN: CORRECCIÓN ---
        });

        // NO VERIFICAR AUTOMÁTICAMENTE - Solo mostrar placeholder
        // this.checkConnectionStatus(); // DESHABILITADO
    }

    openTutorialsModal() { // CORRECCIÓN: Mover la función dentro de la clase
        // Esta función podría abrir un modal más grande con la playlist de YouTube.
        // Por ahora, simplemente simula un clic en el enlace del dashboard anterior.
        const videoUrl = "https://www.youtube.com/embed/videoseries?list=PLDs44uukbe3FIDa9CttQLh8N-Nfdpo_hG&autoplay=1";
        const viewer = document.getElementById('image-viewer-modal');
        const content = document.getElementById('image-viewer-content');
        // CORRECCIÓN: Usar innerHTML para no reemplazar el contenedor y su botón de cierre.
        content.innerHTML = `<iframe class="w-full h-full" src="${videoUrl}" title="Tutoriales ELINA IA" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        viewer.classList.remove('hidden');
    }

    // --- Lógica para colapsar/expandir el sidebar ---
    toggleSidebarCollapsed() {
        const sidebar = document.getElementById('main-sidebar');
        if (!sidebar) return;

        const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
        this.setSidebarCollapsed(isCollapsed);
        localStorage.setItem('sidebarCollapsed', isCollapsed); // Guardar preferencia
    }

    setSidebarCollapsed(collapsed) {
        const sidebar = document.getElementById('main-sidebar');
        const mainContent = document.getElementById('main-content-area');
        const toggleBtn = document.getElementById('toggle-sidebar-collapse-btn');
        if (!sidebar || !mainContent || !toggleBtn) return;

        if (collapsed) {
            sidebar.classList.add('sidebar-collapsed');
            toggleBtn.classList.add('collapsed');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            toggleBtn.classList.remove('collapsed');
        }
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.setAttribute('data-lucide', collapsed ? 'chevron-right' : 'chevron-left');
        lucide.createIcons({ nodes: [icon] });
    }

    async switchPanel(targetId, options = {}) { // CORRECCIÓN: Lógica para modo pantalla completa de Kanban
        const sidebar = document.getElementById('main-sidebar');
        const mainContent = document.getElementById('main-content-area');
        const toggleBtn = document.getElementById('toggle-sidebar-collapse-btn');

        // Cargar contenido dinámico si es necesario antes de activar el panel
        await this.loadPanelContent(targetId);

        const panel = document.getElementById(targetId);
        if (!panel) {
            console.error(`[Dashboard] Panel con ID '${targetId}' no encontrado en el DOM.`);
            return;
        }

        // console.log(`[Dashboard] Cambiando a panel: ${targetId}`);

        // Ocultar todos los paneles
        document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));

        // Obtener información del grupo y pestaña si existe
        const activeLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        const groupId = options.groupId || activeLink?.dataset.group;
        const tabId = options.tabId || activeLink?.dataset.tab;

        // --- INICIO: Integración del Panel de Afiliados ---
        if (targetId === 'affiliate-panel') {
            await initAffiliatePanel();
        }
        // --- FIN: Integración del Panel de Afiliados ---

        // Configuración de grupos
        const groupConfig = {
            'campaigns': {
                tabs: [
                    { id: 'bulk-sending', label: 'Envío Masivo', default: true },
                    { id: 'follow-ups', label: 'Seguimientos' },
                    { id: 'auto-responses', label: 'Respuestas Programadas' },
                    { id: 'templates', label: 'Plantillas' }
                ]
            },
            'clients': {
                tabs: [
                    { id: 'contacts', label: 'Contactos', default: true },
                    { id: 'kanban', label: 'Kanban' },
                    { id: 'quotes', label: 'Cotizaciones' }
                ]
            },
            'ai-behavior': {
                tabs: [
                    { id: 'prompt-training', label: 'Entrenamiento Prompt', default: true },
                    { id: 'ai-memory', label: 'Asistente IA' },
                    { id: 'ai-flows', label: 'Flujos Personalizados' },
                    { id: 'smart-promotions', label: 'Promos Inteligentes' },
                    { id: 'sales-context', label: 'Contexto de Ventas' },
                    { id: 'personalities', label: 'Personalidades' }
                ]
            },
            'marketing': {
                tabs: [
                    { id: 'designer-ai', label: 'Diseñador Gráfico IA', default: true },
                    { id: 'video-ai', label: 'Video IA' },
                    { id: 'community-manager', label: 'Community Manager' }
                ]
            }
        };

        // Si pertenece a un grupo, crear pestañas dinámicamente
        if (groupId && groupConfig[groupId] && panel) {
            this.createGroupTabs(groupId, groupConfig[groupId], tabId || targetId, panel);
        }

        if (panel) {
            if (targetId === 'kanban') {
                // MODO PANTALLA COMPLETA PARA KANBAN
                sidebar.classList.add('hidden');
                toggleBtn.style.display = 'none';
            } else {
                // MODO NORMAL PARA OTROS PANELES
                sidebar.classList.remove('hidden');
                toggleBtn.style.display = '';
            }

            // El layout flex se encarga del posicionamiento automáticamente
            panel.classList.add('active');

            // Guarda el panel activo en localStorage
            localStorage.setItem('activePanelId', targetId);
            if (groupId) localStorage.setItem(`activeGroup_${groupId}`, tabId || targetId);

            // Disparar evento de activación
            document.dispatchEvent(new CustomEvent('panel:activated', { detail: { panelId: targetId, options, groupId, tabId } }));

            // Cerrar el menú lateral en móvil
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }

        // Actualizar estilos de navegación
        const activeClasses = ['bg-green-500', 'text-white'];
        document.querySelectorAll('.nav-link[data-target]').forEach(l => l.classList.remove(...activeClasses));
        document.querySelectorAll('.nav-link[data-group]').forEach(l => l.classList.remove(...activeClasses));

        // Si es un grupo, destacar el link del grupo en el menú
        if (groupId) {
            const groupLink = document.querySelector(`.nav-link[data-group="${groupId}"]`);
            if (groupLink) {
                groupLink.classList.add(...activeClasses);
            }
        } else if (activeLink) {
            activeLink.classList.add(...activeClasses);
        }

        // Actualizar pestañas activas si hay grupo
        if (groupId && panel) {
            const tabsContainer = panel.querySelector('.group-tabs-container');
            if (tabsContainer) {
                tabsContainer.querySelectorAll('.group-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.tab === (tabId || targetId)) {
                        tab.classList.add('active');
                    }
                });
            }
        }
    }

    getDefaultTabForGroup(groupId) {
        const defaults = {
            'campaigns': 'bulk-sending',
            'clients': 'contacts',
            'ai-behavior': 'prompt-training',
            'marketing': 'designer-ai'
        };
        return defaults[groupId] || null;
    }

    createGroupTabs(groupId, config, activeTabId, panel) {
        // Eliminar pestañas anteriores si existen
        const existingTabs = panel.querySelector('.group-tabs-container');
        if (existingTabs) existingTabs.remove();

        // Crear contenedor de pestañas
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'group-tabs-container mb-6';

        const tabsDiv = document.createElement('div');
        tabsDiv.className = 'group-tabs';

        // Crear botones de pestañas
        config.tabs.forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = `group-tab ${tab.id === activeTabId ? 'active' : ''}`;
            tabBtn.textContent = tab.label;
            tabBtn.dataset.tab = tab.id;
            tabBtn.dataset.target = tab.id;
            tabBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(tab.id, { groupId, tabId: tab.id });
            });
            tabsDiv.appendChild(tabBtn);
        });

        tabsContainer.appendChild(tabsDiv);

        // Insertar pestañas al inicio del panel
        panel.insertBefore(tabsContainer, panel.firstChild);
    }

    async loadPanelContent(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Si el panel ya tiene contenido (no está vacío) y no tiene data-force-load, no cargamos nada
        const isActuallyEmpty = panel.innerHTML.trim().length === 0 || panel.dataset.placeholder === 'true';

        const panelFiles = {
            'settings': 'settings.html',
            // 'appointments': 'appointments.html', // Ya integrado en dashboard.html
            'designer-ai': 'designer-ai.html',
            'video-ai': 'video-ai.html',
            'products': 'products.html',
            'chats': 'chats.html',
            'kanban': 'kanban.html',
            'bulk-sending': 'bulk-sending.html',
            'templates': 'templates.html',
            'smart-labels': 'smart-labels.html'
        };

        const fileName = panelFiles[panelId];
        if (!fileName) return;

        if (isActuallyEmpty || panel.dataset.forceLoad === 'true') {
            try {
                // console.log(`[Dashboard] Cargando contenido para ${panelId} desde ${fileName}...`);
                const response = await fetch(fileName);
                if (response.ok) {
                    const html = await response.text();
                    panel.innerHTML = html;
                    panel.dataset.placeholder = 'false';
                    panel.dataset.forceLoad = 'false';

                    if (window.lucide) {
                        window.lucide.createIcons({
                            attrs: { class: 'lucide-icon' },
                            nameAttr: 'data-lucide'
                        });
                    }
                    document.dispatchEvent(new CustomEvent('panel:loaded', { detail: { panelId } }));
                }
            } catch (error) {
                console.error(`[Dashboard] Error al cargar ${fileName}:`, error);
            }
        }
    }


    listenForProfileChanges() {
        const channel = auth.sb.channel(`profile-changes:${this.user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${this.user.id}` },
                (payload) => {
                    const { whatsapp_connected, sync_status } = payload.new;
                    document.dispatchEvent(new CustomEvent('profile:updated', { detail: { whatsapp_connected, sync_status } }));
                }
            )
            .subscribe();
    }

    async loadUserSubscription() {
        try {
            // Verificar acceso de cuenta primero (si la función existe)
            let accessCheck = null;
            try {
                const { data, error: accessError } = await auth.sb.rpc('check_account_access', {
                    p_user_id: this.user.id
                });
                if (accessError && accessError.code !== 'PGRST202') {
                    // Solo loguear errores que no sean "función no encontrada"
                    console.error("Error al verificar acceso de cuenta:", accessError);
                } else if (!accessError) {
                    accessCheck = data;
                }
            } catch (e) {
                // Si la función no existe, continuar sin verificación
                if (e.code !== 'PGRST202') {
                    console.error("Error al verificar acceso de cuenta:", e);
                }
            }

            if (accessCheck && accessCheck.blocked) {
                // Mostrar mensaje de bloqueo
                window.showToast(accessCheck.reason || 'Tu cuenta está bloqueada. Por favor, contacta con soporte.', 'error');
                // Retornar información de bloqueo
                return {
                    blocked: true,
                    reason: accessCheck.reason,
                    status: accessCheck.status,
                    plan_id: accessCheck.plan_id
                };
            }

            const { data: subscription, error: subError } = await auth.sb
                .from('subscriptions')
                .select('status, plan_id, plans:plan_id(*)')
                .eq('user_id', this.user.id)
                .limit(1)
                .single();

            if (subError && subError.code !== 'PGRST116') throw subError;

            if (subscription && subscription.plan_id === 'free_trial' && subscription.status === 'trialing') {
                const { data: profile } = await auth.sb.from('profiles').select('stripe_customer_id').eq('id', this.user.id).single();
                if (profile && profile.stripe_customer_id) {
                    const { data: stripeSub, error: functionError } = await window.auth.invokeFunction('get-stripe-subscription', { body: { customerId: profile.stripe_customer_id } });
                    if (functionError) throw functionError;
                    if (stripeSub && stripeSub.planId) {
                        subscription.plan_id = stripeSub.planId;
                        subscription.plans.name = stripeSub.planName;
                        subscription.plans.features = stripeSub.features;
                    }
                }
            }

            // Verificar bloqueo de cuenta
            try {
                const { data: accessCheck, error: accessError } = await auth.sb.rpc('check_account_access', { p_user_id: this.user.id });
                if (!accessError && accessCheck && accessCheck.blocked) {
                    subscription.blocked = true;
                    subscription.blockedReason = accessCheck.reason;
                    // Mostrar notificación de bloqueo
                    window.showToast(accessCheck.reason || 'Tu cuenta está bloqueada. Por favor, contacta con soporte.', 'error');
                }
            } catch (e) {
                // Si la función no existe aún, no hacer nada
                if (e.code !== 'PGRST202') {
                    console.warn('Error al verificar acceso de cuenta:', e);
                }
            }

            return subscription;
        } catch (e) {
            console.error("Error al cargar la suscripción del usuario:", e);
            return null;
        }
    }

    async loadTeamInfo() {
        try {
            const { data, error } = await auth.sb.rpc('get_user_team_info_with_permissions', { p_user_id: this.user.id });
            if (error) throw error;

            if (data && data.length > 0) {
                this.teamInfo = data[0];
            }
            return this.teamInfo;
        } catch (e) {
            console.error("Error al cargar la información del equipo:", e);
            return null;
        }
    }

    async processInvitationFromURL() {
        try {
            // Obtener parámetro invitation de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const invitationId = urlParams.get('invitation');

            if (!invitationId) {
                return; // No hay invitación en la URL
            }

            console.log('[App] Procesando invitación desde URL:', invitationId);

            // Verificar que la invitación existe y está pendiente
            const { data: invitation, error: inviteError } = await auth.sb
                .from('team_invitations')
                .select('id, team_id, email, role, status, expires_at')
                .eq('id', invitationId)
                .eq('status', 'pending')
                .single();

            if (inviteError || !invitation) {
                console.warn('[App] Invitación no encontrada o ya procesada:', inviteError);
                // Limpiar parámetro de la URL
                urlParams.delete('invitation');
                window.history.replaceState({}, '', `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);
                return;
            }

            // Verificar que no haya expirado
            if (new Date(invitation.expires_at) < new Date()) {
                console.warn('[App] Invitación expirada');
                window.showToast?.('Esta invitación ha expirado. Contacta al administrador para una nueva invitación.', 'error');
                urlParams.delete('invitation');
                window.history.replaceState({}, '', `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);
                return;
            }

            // Verificar que el email del usuario coincida con el de la invitación
            const userEmail = this.user.email;
            if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
                console.warn('[App] Email del usuario no coincide con la invitación');
                window.showToast?.('El correo de esta invitación no coincide con tu cuenta. Por favor, inicia sesión con el correo correcto.', 'error');
                urlParams.delete('invitation');
                window.history.replaceState({}, '', `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);
                return;
            }

            // Verificar si el usuario ya es miembro del equipo
            const { data: existingMember } = await auth.sb
                .from('team_members')
                .select('*')
                .eq('team_id', invitation.team_id)
                .eq('user_id', this.user.id)
                .single();

            if (existingMember) {
                // Ya es miembro, solo marcar invitación como aceptada
                console.log('[App] Usuario ya es miembro del equipo, marcando invitación como aceptada');
                await auth.sb
                    .from('team_invitations')
                    .update({
                        status: 'accepted',
                        accepted_at: new Date().toISOString()
                    })
                    .eq('id', invitationId);

                window.showToast?.('¡Bienvenido al equipo! Ya eres miembro.', 'success');
            } else {
                // Agregar usuario al equipo
                console.log('[App] Agregando usuario al equipo');
                const { error: addError } = await auth.sb
                    .from('team_members')
                    .insert({
                        team_id: invitation.team_id,
                        user_id: this.user.id,
                        role: invitation.role,
                        permissions: invitation.role === 'advisor' ? {
                            'chats': true,
                            'follow-ups': true,
                            'kanban': true,
                            'contacts': false,
                            'label_filters': {}
                        } : {}
                    });

                if (addError) {
                    console.error('[App] Error al agregar usuario al equipo:', addError);
                    window.showToast?.('Error al procesar la invitación. Por favor, contacta al administrador.', 'error');
                    return;
                }

                // Marcar invitación como aceptada
                await auth.sb
                    .from('team_invitations')
                    .update({
                        status: 'accepted',
                        accepted_at: new Date().toISOString()
                    })
                    .eq('id', invitationId);

                // Recargar información del equipo
                await this.loadTeamInfo();

                window.showToast?.('¡Bienvenido al equipo! Has sido agregado exitosamente.', 'success');
            }

            // Limpiar parámetro de la URL
            urlParams.delete('invitation');
            window.history.replaceState({}, '', `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);

        } catch (e) {
            console.error('[App] Error al procesar invitación:', e);
            window.showToast?.('Error al procesar la invitación. Por favor, contacta al administrador.', 'error');
        }
    }

    async loadUserUsage() {
        // --- CORRECCIÓN: La función ahora devuelve el uso en lugar de asignarlo a window ---
        try { // CORRECCIÓN: La función ahora devuelve el uso en lugar de asignarlo a window
            const { data, error } = await window.auth.sb
                .from('profiles')
                .select('ai_enhancements_used, image_generations_used, bulk_sends_used')
                .eq('id', this.user.id)
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error al cargar el uso del usuario:", e);
            return { ai_enhancements_used: 0, image_generations_used: 0, bulk_sends_used: 0 };
        }
    }

    async renderUsageAndLimits() {
        // CORRECCIÓN: Reescribir la función para ser robusta y no depender de variables globales
        const [userPlan, userUsage] = await Promise.all([this.loadUserSubscription(), this.loadUserUsage()]);

        if (userPlan) { // teamInfo ya está cargado en this.teamInfo
            this.renderUserPlanBadge(userPlan);
            this.renderUpgradeButtons(userPlan);
            this.applyFeatureRestrictions(userPlan, this.teamInfo);
        } else {
            // CORRECCIÓN: Si no hay suscripción, asignar plan gratuito por defecto
            console.warn('El usuario no tiene una suscripción registrada.');
        }

        const imageGenLimit = userPlan?.plans?.image_generations_limit || 0;
        const imageGenUsed = userUsage?.image_generations_used || 0;
        // --- CORRECCIÓN: Usar un evento para desacoplar la actualización ---
        // --- INICIO: Log para verificar datos de uso ---
        console.log('[Uso Verificado]', { imageGenerations: { used: imageGenUsed, limit: imageGenLimit } });
        // --- FIN: Log para verificar datos de uso ---

        // En lugar de buscar el elemento, disparamos un evento con los datos.
        // Otros módulos (como designer-ai.js) escucharán este evento y se actualizarán.
        document.dispatchEvent(new CustomEvent('usage:updated', {
            detail: {
                imageGenerations: {
                    remaining: imageGenLimit - imageGenUsed, // <-- CORRECCIÓN: Enviar los usos restantes
                    limit: imageGenLimit
                }
            }
        }));
    }

    renderUserPlanBadge(userPlan) {
        const badgeEl = document.getElementById('user-plan-badge');
        if (!badgeEl || !userPlan) return;

        const planId = userPlan.plan_id || 'unknown';
        // Usamos el nombre del plan desde la DB si existe, si no, formateamos el ID.
        const planName = userPlan.plans?.name || planId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        let bgColor = 'bg-slate-200';
        let textColor = 'text-slate-700';

        switch (planId) {
            case 'free_trial': bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; break;
            case 'starter': bgColor = 'bg-green-100'; textColor = 'text-green-800'; break;
            case 'grow': bgColor = 'bg-purple-100'; textColor = 'text-purple-800'; break;
            case 'business': bgColor = 'bg-slate-200'; textColor = 'text-slate-800'; break;
        }
        badgeEl.textContent = planName;
        badgeEl.className = `inline-block text-xs font-bold px-2 py-0.5 rounded-md mt-1.5 ${bgColor} ${textColor}`;
    }

    applyFeatureRestrictions(userPlan, teamInfo) {
        if (!userPlan || !userPlan.plans) return;

        const features = userPlan.plans.features || {};
        const userRole = teamInfo?.user_role;

        // Restricción de Seguimientos (solo si el panel está activo)
        const followUpsPanel = document.getElementById('follow-ups');
        // La lógica se ejecuta solo si el panel está activo y tiene contenido.
        if (followUpsPanel?.classList.contains('active') && followUpsPanel.querySelector('#follow-ups-container')) {
            const followUpsContainer = followUpsPanel.querySelector('#follow-ups-container');
            const followUpsAccessDenied = followUpsPanel.querySelector('#follow-ups-access-denied');
            if (features.follow_ups) {
                if (followUpsContainer) followUpsContainer.classList.remove('hidden');
                if (followUpsAccessDenied) followUpsAccessDenied.classList.add('hidden');
            } else {
                if (followUpsContainer) followUpsContainer.classList.add('hidden');
                if (followUpsAccessDenied) followUpsAccessDenied.classList.remove('hidden');
                document.getElementById('upgrade-to-grow-from-followups').onclick = () => this.handleUpgradeClick('grow');
            }
        }

        // Restricción de Diseñador Gráfico IA (solo si el panel está activo)
        const designerPanel = document.getElementById('designer-ai');
        // La lógica se ejecuta solo si el panel está activo y tiene contenido.
        if (designerPanel?.classList.contains('active') && designerPanel.querySelector('#designer-ai-access-denied')) {
            const designerContainer = designerPanel.querySelector('.grid');
            const designerAccessDenied = designerPanel.querySelector('#designer-ai-access-denied');
            const isAllowed = features.designer_ai;
            if (designerContainer) designerContainer.classList.toggle('hidden', !isAllowed);
            if (designerAccessDenied) designerAccessDenied.classList.toggle('hidden', isAllowed);
            if (!isAllowed) document.getElementById('upgrade-to-grow-from-designer').onclick = () => this.handleUpgradeClick('grow');
        }

        // --- INICIO: Lógica de permisos por rol ---
        // Si el usuario es un 'advisor', ocultamos los paneles que no tiene permitidos.
        if (userRole === 'advisor') {
            const userPermissions = teamInfo?.permissions || {};

            document.querySelectorAll('.nav-link[data-target]').forEach(link => {
                const panelId = link.dataset.target;
                if (panelId !== 'dashboard' && !userPermissions[panelId]) {
                    link.parentElement.style.display = 'none';
                }
            });
        }
    }

    renderUpgradeButtons(userPlan) {
        const upgradeSection = document.getElementById('upgrade-plan-section');
        if (!upgradeSection || !userPlan) return; // CORRECCIÓN: Asegurarse de que el plan exista
        const starterToGrowBtn = document.getElementById('upgrade-grow-btn');
        const collapsedBtn = document.getElementById('upgrade-collapsed-btn');
        const trialBtn = document.getElementById('upgrade-trial-btn');
        // Ocultar todo por defecto
        if (starterToGrowBtn) starterToGrowBtn.classList.add('hidden');
        if (trialBtn) trialBtn.classList.add('hidden');
        if (upgradeSection) upgradeSection.classList.add('hidden');
        if (collapsedBtn) {
            collapsedBtn.classList.add('hidden');
        }

        const currentPlanId = userPlan.plan_id;

        if (currentPlanId === 'free_trial') {
            trialBtn.classList.remove('hidden');
            upgradeSection.classList.remove('hidden');
            trialBtn.onclick = () => this.openPricingModal();
            collapsedBtn.onclick = () => this.openPricingModal();
        } else if (currentPlanId === 'starter') {
            starterToGrowBtn.classList.remove('hidden');
            upgradeSection.classList.remove('hidden');
            starterToGrowBtn.onclick = () => this.handleUpgradeClick('grow');
            collapsedBtn.onclick = () => this.handleUpgradeClick('grow');
        }
        // Si es 'grow' o superior, la sección permanecerá oculta.
    }

    openPricingModal() {
        const pricingModal = document.getElementById('pricing-modal');
        if (pricingModal) {
            pricingModal.classList.remove('hidden');
        }
    }

    closePricingModal() {
        const pricingModal = document.getElementById('pricing-modal');
        if (pricingModal) {
            pricingModal.classList.add('hidden');
        }
    }

    async handleUpgradeClick(targetPlanId) {
        const button = document.querySelector(`.upgrade-btn[data-plan="${targetPlanId}"]`) || document.getElementById(`upgrade-${targetPlanId}-btn`);
        if (!button) return; // Si no encuentra el botón, no hace nada
        // CORRECCIÓN: Asegurarse de que el modal de precios se cierre
        // --- CORRECCIÓN: Asegurarse de que el modal de precios se cierre ---
        const pricingModal = document.getElementById('pricing-modal');
        if (pricingModal) {
            pricingModal.classList.add('hidden');
        }
        // --- FIN CORRECCIÓN ---

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Redirigiendo a pago...';

        try {
            const { data, error } = await window.auth.invokeFunction('create-checkout-session', {
                body: {
                    planId: targetPlanId,
                    userId: this.user.id
                }
            });

            if (error) throw new Error(error.message);
            window.location.href = data.url; // Redirige al usuario a la página de pago de Stripe

        } catch (e) { // <-- CORRECCIÓN: Añadido el bloque catch que faltaba
            console.error('Error al iniciar el proceso de pago:', e);
            window.showToast('No se pudo iniciar el proceso de pago. Por favor, intenta de nuevo.', 'error');
            button.disabled = false;
            button.textContent = originalText;
        } // <-- CORRECCIÓN: Cierre del bloque catch
    }

    // --- Métodos de API y Lógica de Componentes ---

    async fetchUserProfile() {
        const nameEl = document.getElementById('user-business-name');
        const avatarEl = document.getElementById('user-avatar');
        try {
            const { data, error } = await window.auth.sb
                .from('profiles')
                .select('full_name, role, urlfoto, branding_settings')
                .eq('id', this.user.id)
                .single();
            if (error) throw error;

            const fallbackName = this.teamInfo?.team_name || data.full_name || 'Mi negocio';
            const displayName = fallbackName;
            if (nameEl) nameEl.textContent = displayName;

            if (avatarEl) {
                // Prioridad: 1) Logo de branding, 2) Foto de WhatsApp, 3) Avatar generado
                const brandingLogo = data.branding_settings?.logo_url;
                const whatsappPhoto = (data.urlfoto || '').trim();
                const defaultAvatar = `https://ui-avatars.com/api/?background=0A3B66&color=fff&name=${encodeURIComponent(displayName)}`;

                avatarEl.src = brandingLogo || whatsappPhoto || defaultAvatar;
                avatarEl.alt = `Logo de ${displayName}`;
            }

            if (data.role === 'superadmin') {
                document.getElementById('superadmin-link')?.classList.remove('hidden');
                document.getElementById('mobile-superadmin-link')?.classList.remove('hidden');
                document.getElementById('quality-dashboard-link')?.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error al cargar el perfil del usuario:', error);
            if (nameEl) nameEl.textContent = 'Mi negocio';
            if (avatarEl) avatarEl.src = 'https://ui-avatars.com/api/?background=0A3B66&color=fff&name=Elina';
        }
    }

    async fetchMasterPrompt() { // Este método ya existe, solo nos aseguramos de que esté bien
        try { // Este método ya existe, solo nos aseguramos de que esté bien
            const { data, error } = await auth.sb
                .from('prompts')
                .select('prompt_content')
                .eq('user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignora el error "no rows found"

            document.getElementById('ai-master-prompt').value = data?.prompt_content || '';

            // Actualizar indicador de versión
            await this.updatePromptVersionIndicator();
        } catch (error) {
            console.error('Error al cargar el prompt:', error);
            document.getElementById('ai-master-prompt').value = 'No se pudo cargar el prompt.';
        }
    }

    async handlePromptSave(e) {
        e.preventDefault(); // Este método ya existe, solo nos aseguramos de que esté bien // CORRECCIÓN: El evento puede no venir de un formulario, buscar el botón de forma más robusta.
        // CORRECCIÓN: El evento puede no venir de un formulario, buscar el botón de forma más robusta.
        const form = document.getElementById('prompt-form');
        if (!form) return;
        const button = form.querySelector('button[type="submit"]');
        const promptText = document.getElementById('ai-master-prompt').value;
        if (!button) return;

        button.disabled = true;
        button.textContent = 'Guardando...';

        try {
            // Obtener prompt anterior para comparar
            const { data: oldPrompt } = await auth.sb
                .from('prompts')
                .select('prompt_content')
                .eq('user_id', this.user.id)
                .single();

            const hasChanged = !oldPrompt || oldPrompt.prompt_content !== promptText;

            // Guardar en tabla prompts (comportamiento original)
            const { error: promptError } = await auth.sb
                .from('prompts')
                .upsert({ user_id: this.user.id, prompt_content: promptText }, { onConflict: 'user_id' });

            if (promptError) throw promptError;

            // Si el prompt cambió O si no hay versiones aún, crear nueva versión
            let shouldCreateVersion = hasChanged;
            if (!shouldCreateVersion) {
                const { count, error: countErr } = await auth.sb
                    .from('prompt_versions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', this.user.id);

                if (count === 0 && !countErr) shouldCreateVersion = true;
            }

            if (shouldCreateVersion) {
                try {
                    const changeReason = document.getElementById('prompt-change-reason')?.value?.trim() || (hasChanged ? 'Cambio manual' : 'Versión inicial');

                    const { error: rpcErr } = await auth.sb.rpc('create_prompt_version', {
                        p_user_id: this.user.id,
                        p_prompt_content: promptText,
                        p_change_reason: changeReason
                    });

                    if (rpcErr) console.warn('Error RPC al crear versión:', rpcErr);
                } catch (versionErr) {
                    console.warn('Error al crear versión del prompt:', versionErr);
                }
            }



            window.showToast('Prompt guardado con éxito.', 'success');

            // Actualizar indicador de versión si existe
            this.updatePromptVersionIndicator();
        } catch (error) {
            console.error('Error al guardar el prompt:', error);
            window.showToast('Error al guardar el prompt. Revisa la consola.', 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Guardar';
        }
    }

    async updatePromptVersionIndicator() {
        try {
            // Obtener versión actual del prompt
            const { data: versionData, error } = await auth.sb
                .rpc('get_current_prompt_version', { p_user_id: this.user.id });

            if (error) {
                // Si la función no existe aún, no mostrar error
                if (error.code !== '42883') { // 42883 = function does not exist
                    console.warn('No se pudo obtener versión del prompt:', error);
                }
                return;
            }

            // Actualizar indicador en dashboard si existe
            const versionIndicator = document.getElementById('prompt-version-indicator');
            if (versionIndicator && versionData && versionData.length > 0) {
                const version = versionData[0];
                versionIndicator.textContent = `v${version.version_number}`;
                versionIndicator.title = `Versión ${version.version_number} - ${new Date(version.created_at).toLocaleDateString()}`;
            }
        } catch (err) {
            console.warn('Error al actualizar indicador de versión:', err);
        }
    }

    async handleSaveAppointmentsConfig() {
        // Implementación básica para guardar la configuración rápida
        const modal = document.getElementById('appointments-quick-config-modal');
        const bufferTime = document.getElementById('quick-config-buffer-time')?.value;
        const maxPerDay = document.getElementById('quick-config-max-per-day')?.value;
        const defaultDuration = document.getElementById('quick-config-default-duration')?.value;
        const timezone = document.getElementById('quick-config-timezone')?.value;

        try {
            const updates = {
                user_id: this.user.id,
                buffer_time_minutes: bufferTime ? parseInt(bufferTime) : 0,
                default_duration_minutes: defaultDuration ? parseInt(defaultDuration) : 60,
                timezone: timezone || 'America/Mexico_City',
                // max_per_day podría requerir una columna específica o configuración JSON
            };

            const { error } = await window.auth.sb
                .from('appointment_settings')
                .upsert(updates, { onConflict: 'user_id' });

            if (error) throw error;

            window.showToast('Configuración de citas guardada.', 'success');
            modal.classList.add('hidden');

            // Recargar configuración local si es necesario
            // this.loadAppointmentSettings(); 

        } catch (e) {
            console.error('Error guardando configuración de citas:', e);
            window.showToast('Error al guardar configuración.', 'error');
        }
    }

    /**
     * Sube un archivo a un almacenamiento temporal, lo transfiere a la CDN (Bunny.net)
     * a través de una Edge Function y devuelve la URL final de la CDN.
     * @param {File} file - El archivo a subir.
     * @param {string} folder - La carpeta de destino dentro del bucket del usuario (ej. 'logos', 'follow-ups').
     * @param {Function} onProgress - Callback opcional para reportar progreso (0-100).
     * @returns {Promise<string|null>} La URL pública de la CDN o null si falla.
     */
    /**
     * Sube un archivo a un almacenamiento temporal, lo transfiere a la CDN (Bunny.net)
     * a través de una Edge Function y devuelve la URL final de la CDN.
     * @param {File} file - El archivo a subir.
     * @param {string} folder - La carpeta de destino dentro del bucket del usuario (ej. 'logos', 'follow-ups').
     * @param {Function} onProgress - Callback opcional para reportar progreso (0-100).
     * @returns {Promise<string|null>} La URL pública de la CDN o null si falla.
     */
    async uploadAsset(file, folder, onProgress) { // CORRECCIÓN: Usar window.auth.sb para la instancia de Supabase
        if (!file) return null;

        // --- OPTIMIZACIÓN DE IMÁGENES ---
        // Si es una imagen, la comprimimos antes de subirla para ahorrar ancho de banda y almacenamiento
        if (file.type.startsWith('image/')) {
            try {
                if (onProgress) onProgress(5); // Indicar inicio de proceso
                console.log('[Upload] Optimizando imagen...', file.name);
                file = await this.compressImage(file);
                console.log('[Upload] Imagen optimizada.', { size: file.size, type: file.type });
            } catch (e) {
                console.warn('[Upload] Falló la compresión de imagen, se usará el original:', e);
            }
        }

        const userId = await window.getUserId();
        const userEmail = await window.getUserEmail();

        // Preservar la extensión original del archivo (o usar .webp si fue optimizado)
        const originalName = file.name;
        const lastDotIndex = originalName.lastIndexOf('.');
        let extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';
        const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;

        // Si el archivo ahora es image/webp (por la compresión), aseguramos la extensión correcta
        if (file.type === 'image/webp' && extension !== '.webp') {
            extension = '.webp';
        }

        // Crear nombre seguro pero preservando la extensión
        const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_') + extension;
        const tempPath = `temp-uploads/${userId}/${folder}/${Date.now()}-${safeName}`;

        try {
            // Reportar progreso inicial
            if (onProgress) onProgress(10);

            // 1. Subir a una carpeta temporal en Supabase Storage
            const { error: uploadError } = await window.auth.sb.storage.from('campaign_files').upload(tempPath, file, {
                onUploadProgress: (progress) => {
                    // El progreso de Supabase va de 0 a 100, lo mapeamos a 10-60% del total
                    if (onProgress) {
                        const mappedProgress = 10 + (progress.loaded / progress.total) * 50;
                        onProgress(Math.min(mappedProgress, 60));
                    }
                }
            }); // CORRECCIÓN: Usar window.auth.sb
            if (uploadError) throw new Error(`Error en subida temporal: ${uploadError.message}`);

            if (onProgress) onProgress(60);

            // 2. Obtener la URL pública del archivo temporal
            const { data: urlData } = window.auth.sb.storage.from('campaign_files').getPublicUrl(tempPath); // CORRECCIÓN: Usar window.auth.sb

            if (onProgress) onProgress(70);

            // 3. Llamar a la Edge Function 'smart-worker' para mover el archivo a Bunny.net
            // Pasamos el nombre del archivo para preservar la extensión
            const { data: bunnyData, error: functionError } = await window.auth.invokeFunction('smart-worker', { // CORRECCIÓN: Usar el helper window.auth.invokeFunction
                body: {
                    sourceUrl: urlData.publicUrl,
                    userId,
                    userEmail, // Pasar el email para usarlo en la ruta de Bunny
                    fileName: safeName, // Pasar el nombre del archivo con extensión correcta
                    folder: folder
                }
            });
            if (functionError) throw new Error(`Error al mover a CDN: ${functionError.message}`);

            if (onProgress) onProgress(90);

            // 4. (Opcional pero recomendado) Borrar el archivo temporal de Supabase (CORRECCIÓN: Usar window.auth.sb)
            const { error: removeError } = await window.auth.sb.storage.from('campaign_files').remove([tempPath]); // CORRECCIÓN: Usar window.auth.sb
            if (removeError) {
                // No detenemos el flujo, pero sí es bueno saber si falló la limpieza.
                console.warn(`[Limpieza] No se pudo borrar el archivo temporal ${tempPath}:`, removeError.message);
            }

            if (onProgress) onProgress(100);

            return bunnyData.cdnUrl; // Devuelve la URL final de Bunny.net
        } catch (error) {
            console.error('Falló el proceso completo de subida de asset:', error);
            // Si algo falla, no se borra el archivo temporal para poder investigarlo.
            throw error; // Relanzar el error para que el llamador lo maneje
        }
    }

    // Helper para comprimir imágenes (Método de clase)
    async compressImage(file, { quality = 0.8, maxWidth = 1920, maxHeight = 1920 } = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                let width = img.width;
                let height = img.height;

                // Calcular nuevas dimensiones manteniendo aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas to Blob conversion failed'));
                        return;
                    }
                    // Crear un nuevo File con la imagen comprimida
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    console.log(`[Compress] Original: ${(file.size / 1024).toFixed(2)}KB, Optimizado: ${(newFile.size / 1024).toFixed(2)}KB`);
                    resolve(newFile);
                }, 'image/webp', quality);
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(objectUrl);
                reject(err);
            };
        });
    }

    async loadDashboardMetrics() {
        try {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const { data, error } = await auth.sb
                .from('daily_stats')
                .select('stat_date, ai_responses_count, time_saved_seconds')
                .eq('user_id', this.user.id)
                .gte('stat_date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('stat_date', { ascending: true });

            if (error) throw error; // Lanzar error si la consulta falla

            this.renderMetricsCharts(data);
            // this.renderMoneySaved(); // Función desactivada en petición anterior.

        } catch (e) {
            console.error("Error al cargar métricas del dashboard:", e);
        }
    }

    renderMetricsCharts(stats) {
        const labels = stats.map(s => new Date(s.stat_date + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
        const responsesData = stats.map(s => s.ai_responses_count);
        const timeData = stats.map(s => Math.round(s.time_saved_seconds / 60)); // en minutos

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } },
            plugins: { legend: { display: false } },
        };

        // Gráfico de Respuestas (CORRECCIÓN: 'datasets' debe ser un array)
        const responsesCtx = document.getElementById('responses-chart')?.getContext('2d');
        if (responsesCtx) {
            new Chart(responsesCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{ // <-- CORRECCIÓN: 'datasets' debe ser un array
                        label: 'Mensajes Respondidos',
                        data: responsesData,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: chartOptions
            });
        }

        // Gráfico de Tiempo Ahorrado (CORRECCIÓN: 'datasets' debe ser un array)
        const timeCtx = document.getElementById('time-saved-chart')?.getContext('2d');
        if (timeCtx) {
            new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{ // <-- CORRECCIÓN: 'datasets' debe ser un array
                        label: 'Minutos Ahorrados',
                        data: timeData,
                        borderColor: 'rgb(139, 92, 246)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: chartOptions
            });
        }
    }

    async loadFunnelMetrics() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // 1. Conversaciones Atendidas (contactos únicos con mensajes de IA)
            const { data: conversations, error: convError } = await auth.sb
                .from('chat_history')
                .select('contact_id')
                .eq('user_id', this.user.id)
                .eq('message_type', 'assistant')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (convError) throw convError;

            const uniqueContacts = new Set(conversations.map(c => c.contact_id));
            const conversationsCount = uniqueContacts.size;

            // 2. Cotizaciones Generadas
            const { data: quotes, error: quotesError } = await auth.sb
                .from('quotes')
                .select('id')
                .eq('user_id', this.user.id)
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (quotesError) throw quotesError;
            const quotesCount = quotes?.length || 0;

            // 3. Tiempo Ahorrado Total (en minutos)
            const { data: stats, error: statsError } = await auth.sb
                .from('daily_stats')
                .select('time_saved_seconds')
                .eq('user_id', this.user.id)
                .gte('stat_date', thirtyDaysAgo.toISOString().split('T')[0]);

            if (statsError) throw statsError;

            const totalTimeSaved = stats.reduce((acc, s) => acc + (s.time_saved_seconds || 0), 0);
            const timeSavedMinutes = Math.round(totalTimeSaved / 60);

            // 4. Tasa de Automatización (% de mensajes respondidos por IA)
            const { data: allMessages, error: msgError } = await auth.sb
                .from('chat_history')
                .select('message_type')
                .eq('user_id', this.user.id)
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (msgError) throw msgError;

            const totalMessages = allMessages.length;
            const aiMessages = allMessages.filter(m => m.message_type === 'assistant').length;
            const automationRate = totalMessages > 0 ? ((aiMessages / totalMessages) * 100).toFixed(0) : 0;

            // Actualizar UI con verificaciones de seguridad
            const conversationsStat = document.getElementById('funnel-conversations-stat');
            const quotesStat = document.getElementById('funnel-quotes-stat');
            const timeSavedStat = document.getElementById('funnel-time-saved-stat');
            const automationStat = document.getElementById('funnel-automation-stat');

            if (conversationsStat) conversationsStat.textContent = conversationsCount;
            if (quotesStat) quotesStat.textContent = quotesCount;
            if (timeSavedStat) timeSavedStat.innerHTML = `${timeSavedMinutes}<span class="text-sm">min</span>`;
            if (automationStat) automationStat.textContent = `${automationRate}%`;

        } catch (e) {
            console.error("Error al cargar métricas del embudo:", e);
        }
    }

    async loadSavedWhatsAppNumber() {
        try {
            if (!this.user?.id || !this.whatsappIti) return;

            console.log('[WhatsApp] 📱 Cargando número guardado...');

            const { data, error } = await window.auth.sb
                .from('profiles')
                .select('contact_phone')
                .eq('id', this.user.id)
                .single();

            if (error) {
                console.warn('[WhatsApp] Error al cargar número guardado:', error);
                return;
            }

            if (data?.contact_phone) {
                console.log('[WhatsApp] ✅ Pre-llenando número:', data.contact_phone);
                this.whatsappIti.setNumber('+' + data.contact_phone);
            }
        } catch (error) {
            console.error('[WhatsApp] Error al cargar número guardado:', error);
        }
    }

    async checkConnectionStatus() {
        console.log('[WhatsApp] 🔍 Verificando estado de conexión...');

        // Verificar que window.auth esté disponible
        if (!window.auth) {
            console.log('[WhatsApp] ⚠️ window.auth no disponible aún, mostrando estado inicial');
            this.renderWhatsappConnection('initial');
            return;
        }

        // Verificar cache en localStorage (2 horas de duración)
        const CACHE_KEY = 'whatsapp_connection_status';
        const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            console.log(`[WhatsApp] 💾 Cache localStorage:`, cachedData ? 'Existe' : 'No existe');

            if (cachedData) {
                const { status, timestamp } = JSON.parse(cachedData);
                const now = Date.now();
                const cacheAge = now - timestamp;

                const ageMinutes = Math.round(cacheAge / 1000 / 60);
                const ageHours = (ageMinutes / 60).toFixed(1);

                console.log(`[WhatsApp] 📅 Cache: status="${status}", edad=${ageMinutes}min (${ageHours}h)`);

                // Si el cache tiene menos de 2 horas, usarlo
                if (cacheAge < CACHE_DURATION) {
                    console.log(`[WhatsApp] ✅ USANDO CACHE (< 2h): ${status}`);
                    this.renderWhatsappConnection(status === 'connected' ? 'connected' : 'initial');
                    return;
                }

                console.log('[WhatsApp] ⏰ Cache expirado (>2h), consultando estado actual...');
            } else {
                console.log('[WhatsApp] ℹ️ No hay cache, consultando estado actual...');
            }
        } catch (e) {
            console.warn('[WhatsApp] ⚠️ Error al leer cache:', e);
        }

        // Si no hay cache válido, consultar el estado actual
        try {
            console.log(`[WhatsApp] 📞 Llamando a manage-venom-instance con user_id: ${this.user.id}`);

            const { data, error } = await window.auth.invokeFunction('manage-venom-instance', {
                body: {
                    action: 'status',
                    user_id: this.user.id
                }
            });

            console.log(`[WhatsApp] 📦 Respuesta completa:`, { data, error });

            if (error) {
                console.warn('[WhatsApp] ❌ Error al consultar estado:', error);
                this.renderWhatsappConnection('initial');
                return;
            }

            const status = data?.status || 'disconnected';
            console.log(`[WhatsApp] ✅ Estado recibido: ${status}`);
            console.log(`[WhatsApp] 📋 Datos de instancia:`, data?.instance);

            // Guardar en cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                status: status,
                timestamp: Date.now()
            }));

            // Renderizar basado en el estado
            if (status === 'connected') {
                this.renderWhatsappConnection('connected', data.instance);
            } else if (status === 'connecting') {
                this.renderWhatsappConnection('loading');
            } else {
                this.renderWhatsappConnection('initial');
            }

        } catch (error) {
            console.error('[WhatsApp] Error fatal al verificar estado:', error);
            this.renderWhatsappConnection('initial');
        }
    }

    selectConnectionMethod(method) {
        this.connectionMethod = method;

        // Actualizar UI de botones (solo si los elementos existen)
        const qrBtn = document.getElementById('method-qr-btn');
        const pairingBtn = document.getElementById('method-pairing-btn');
        const phoneContainer = document.getElementById('phone-input-container');
        const hintText = document.getElementById('connection-hint');

        // Verificar que los elementos existan antes de modificarlos
        if (!qrBtn || !pairingBtn || !phoneContainer || !hintText) {
            console.log('[WhatsApp Connection] Elementos no encontrados, esperando a que se cargue el panel');
            return;
        }

        // Siempre mostrar el input de teléfono (ambos métodos lo necesitan)
        phoneContainer.classList.remove('hidden');

        if (method === 'qr') {
            qrBtn.className = 'flex-1 py-2 px-3 bg-purple-50 text-purple-700 border-2 border-purple-300 font-semibold rounded-lg hover:bg-purple-100 transition';
            pairingBtn.className = 'flex-1 py-2 px-3 bg-slate-50 text-slate-700 border-2 border-slate-300 font-semibold rounded-lg hover:bg-slate-100 transition';
            hintText.textContent = 'Ingresa tu número y escanea el QR desde WhatsApp > Dispositivos Vinculados';
        } else {
            qrBtn.className = 'flex-1 py-2 px-3 bg-slate-50 text-slate-700 border-2 border-slate-300 font-semibold rounded-lg hover:bg-slate-100 transition';
            pairingBtn.className = 'flex-1 py-2 px-3 bg-purple-50 text-purple-700 border-2 border-purple-300 font-semibold rounded-lg hover:bg-purple-100 transition';
            hintText.textContent = 'Ingresa tu número y el código en WhatsApp > Dispositivos Vinculados > Vincular con número';
        }
    }

    // === POLLING PARA DETECTAR CONEXIÓN ===
    startConnectionPolling() {
        // Detener polling previo si existe
        this.stopConnectionPolling();

        console.log('[WhatsApp Polling] 🔄 Iniciando polling de conexión...');

        let attempts = 0;
        const MAX_ATTEMPTS = 40; // 40 intentos x 3 segundos = 2 minutos

        this.connectionPollingInterval = setInterval(async () => {
            attempts++;
            console.log(`[WhatsApp Polling] Intento ${attempts}/${MAX_ATTEMPTS}`);

            try {
                const { data, error } = await window.auth.invokeFunction('manage-venom-instance', {
                    body: {
                        action: 'status',
                        user_id: this.user.id
                    }
                });

                if (error) {
                    console.warn('[WhatsApp Polling] Error al verificar estado:', error);
                    return;
                }

                const status = data?.status || 'disconnected';
                console.log(`[WhatsApp Polling] Estado: ${status}`);

                // Si se conectó, detener polling y actualizar UI
                if (status === 'connected') {
                    console.log('[WhatsApp Polling] 🎉 ¡CONECTADO! Deteniendo polling...');
                    this.stopConnectionPolling();

                    // Actualizar UI
                    this.renderWhatsappConnection('connected', data.instance);

                    // Limpiar cache para forzar próxima verificación
                    localStorage.removeItem('whatsapp_connection_status');

                    // Guardar nuevo estado en cache
                    localStorage.setItem('whatsapp_connection_status', JSON.stringify({
                        status: 'connected',
                        timestamp: Date.now()
                    }));

                    // Mostrar toast de éxito
                    window.showToast('¡WhatsApp conectado exitosamente!', 'success');
                }

                // Si se alcanzó el máximo de intentos, detener polling
                if (attempts >= MAX_ATTEMPTS) {
                    console.log('[WhatsApp Polling] ⏱️ Timeout alcanzado. Deteniendo polling...');
                    this.stopConnectionPolling();
                    window.showToast('El código ha expirado. Por favor genera uno nuevo.', 'info');
                }

            } catch (error) {
                console.error('[WhatsApp Polling] Error:', error);
            }
        }, 3000); // Verificar cada 3 segundos
    }

    stopConnectionPolling() {
        if (this.connectionPollingInterval) {
            console.log('[WhatsApp Polling] 🛑 Deteniendo polling');
            clearInterval(this.connectionPollingInterval);
            this.connectionPollingInterval = null;
        }
    }

    async checkWhatsappConnection() {
        this.renderWhatsappConnection('loading');

        // Venom solo soporta QR (no pairing code)
        const action = 'get-qr';

        // Número de teléfono es OPCIONAL para Venom
        let phone = null;

        // Obtener referencias al input (puede estar oculto)
        const phoneInput = document.getElementById('whatsapp-phone-input');

        // Intentar obtener número solo si el input está visible y tiene valor
        if (this.whatsappIti && phoneInput && phoneInput.offsetParent !== null) {
            // Input visible y con intl-tel-input inicializado
            if (this.whatsappIti.isValidNumber()) {
                // Obtener número en formato E.164 y quitar el +
                phone = this.whatsappIti.getNumber().replace('+', '');

                // Corrección para México (agregar "1" para celulares)
                if (phone.startsWith('52') && phone.length === 12) {
                    phone = '521' + phone.substring(2);
                    console.log('[WhatsApp] Número mexicano corregido:', phone);
                } else {
                    console.log('[WhatsApp] Número extraído:', phone);
                }
            }
        }

        console.log('[WhatsApp] Conectando con número:', phone || 'sin número (opcional)');

        try {
            // Llamar a nuestra edge function en lugar de n8n
            const { data, error } = await window.auth.invokeFunction('manage-venom-instance', {
                body: {
                    action: action,
                    user_id: this.user.id,
                    phone: phone
                }
            });

            // Limpiar cache para que el próximo check obtenga el estado actualizado
            localStorage.removeItem('whatsapp_connection_status');

            // Verificar si hay error en la respuesta
            if (error || data?.error || data?.status === 404) {
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('❌ ERROR AL CONECTAR WHATSAPP');
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('Error:', error || data);
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                throw new Error(error?.message || data?.error || 'Error al generar código');
            }

            console.log('✅ Respuesta exitosa:', data);
            console.log('📦 RESPUESTA COMPLETA (stringified):', JSON.stringify(data, null, 2));
            console.log('🔍 MÉTODO DETECTADO:', method, '| this.connectionMethod:', this.connectionMethod);
            console.log('📋 data.pairingCode:', data.pairingCode);
            console.log('📋 data.code:', data.code);
            console.log('📋 data.base64:', data.base64 ? `Existe (${data.base64.substring(0, 50)}...)` : 'undefined');
            console.log('📋 data.qrcode:', data.qrcode);
            console.log('📋 data.qrcode?.base64:', data.qrcode?.base64 ? `Existe (${data.qrcode.base64.substring(0, 50)}...)` : 'undefined');

            // VERIFICAR SI YA ESTÁ CONECTADO
            if (data?.instance?.state === 'open') {
                console.log('🎉 WhatsApp ya está conectado!');
                localStorage.removeItem('whatsapp_connection_status');
                this.renderWhatsappConnection('connected');
                return;
            }

            // Manejar respuesta según el método
            console.log('⚡ Entrando a if, method === "qr"?', method === 'qr');
            if (method === 'qr') {
                // Para QR, mostrar la imagen
                if (data.qrcode && data.qrcode.base64) {
                    console.log('📸 Mostrando QR desde data.qrcode.base64');
                    this.renderWhatsappConnection('qr', data.qrcode.base64);
                    // POLLING DESHABILITADO - Solo verificar manualmente con botón
                    // this.startConnectionPolling();
                } else if (data.base64) {
                    console.log('📸 Mostrando QR desde data.base64');
                    this.renderWhatsappConnection('qr', data.base64);
                    // POLLING DESHABILITADO - Solo verificar manualmente con botón
                    // this.startConnectionPolling();
                } else {
                    console.error('❌ No se encontró ni data.qrcode.base64 ni data.base64');
                    console.error('📦 Respuesta recibida:', JSON.stringify(data, null, 2));

                    // Mostrar error más descriptivo
                    const errorMsg = `No se pudo generar el código QR. La API devolvió: ${JSON.stringify(data)}`;
                    this.renderWhatsappConnection('error', null, errorMsg);

                    // Mostrar alerta al usuario con instrucciones
                    alert('⚠️ Error al generar código QR\n\n' +
                          'La API de Evolution no devolvió un código QR válido.\n\n' +
                          'Posibles causas:\n' +
                          '1. La URL de Evolution API no está configurada correctamente\n' +
                          '2. La API de Evolution está caída o no responde\n' +
                          '3. Hay un problema con las credenciales de la API\n\n' +
                          'Por favor, verifica los logs de Supabase para más detalles.');
                }
            } else {
                // Para Pairing Code, mostrar el código
                const pairingCode = data.pairingCode || data.code;

                // Validar que sea un código válido (8 caracteres alfanuméricos, NO base64 largo)
                const isValidCode = pairingCode && pairingCode.length === 8 && /^[A-Z0-9]{8}$/i.test(pairingCode);

                if (isValidCode) {
                    console.log('🎯 [PAIRING] Código válido detectado:', pairingCode);

                    // FORZAR ACTUALIZACIÓN DIRECTA DEL DOM (bypass de cualquier cache)
                    const container = document.getElementById('whatsapp-connection-container');
                    if (container) {
                        const formattedCode = `${pairingCode.substring(0, 4)}-${pairingCode.substring(4)}`;

                        container.innerHTML = `
                            <div class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                                <div class="text-5xl font-black text-purple-700 tracking-wider mb-3 font-mono whitespace-nowrap">
                                    ${formattedCode}
                                </div>
                                <p class="font-bold text-slate-800">Código de Emparejamiento</p>
                                <p class="text-sm text-slate-600 mt-2">Ingresa este código en WhatsApp</p>
                            </div>
                        `;
                        console.log('✅ DOM ACTUALIZADO DIRECTAMENTE con código:', formattedCode);
                    } else {
                        console.error('❌ Container no encontrado: whatsapp-connection-container');
                    }
                    // POLLING DESHABILITADO - Solo verificar manualmente con botón
                    // this.startConnectionPolling();
                } else {
                    console.error('❌ Código inválido o no encontrado. Recibido:', pairingCode?.substring(0, 50));
                    this.renderWhatsappConnection('error', null, 'No se pudo generar el código de emparejamiento');
                }
            }
        } catch (error) {
            console.error("[WhatsApp Connection] Error:", error);
            this.renderWhatsappConnection('error', null, error.message || 'Error al conectar');
        }
    }

    async disconnectWhatsApp() {
        console.log('[WhatsApp] 🔴 Iniciando desconexión...');

        if (!confirm('¿Estás seguro de que deseas desconectar WhatsApp? Tendrás que volver a escanear el código QR o ingresar el código PIN.')) {
            console.log('[WhatsApp] ❌ Desconexión cancelada por el usuario');
            return;
        }

        // Detener polling si está activo
        this.stopConnectionPolling();

        this.renderWhatsappConnection('loading');

        try {
            console.log('[WhatsApp] 📞 Llamando a logout...');
            const { data, error } = await window.auth.invokeFunction('manage-venom-instance', {
                body: {
                    action: 'logout',
                    user_id: this.user.id
                }
            });

            console.log('[WhatsApp] 📦 Respuesta de logout:', { data, error });

            if (error || data?.error) {
                throw new Error(error?.message || data?.error || 'Error al desconectar');
            }

            // Limpiar cache de conexión
            localStorage.removeItem('whatsapp_connection_status');
            console.log('[WhatsApp] ✅ Desconectado exitosamente');
            this.renderWhatsappConnection('initial');
            window.showToast('WhatsApp desconectado correctamente', 'success');
        } catch (error) {
            console.error("[WhatsApp] ❌ Error al desconectar:", error);
            this.renderWhatsappConnection('error', null, error.message || 'Error al desconectar');
            window.showToast('Error al desconectar WhatsApp', 'error');
        }
    }

    openChatwoot(e) {
        e.preventDefault(); // Prevenir la navegación por defecto del enlace
        // Por ahora, abre la URL base. La lógica de SSO se puede añadir aquí después.
        window.open(`${this.config.CHATWOOT_BASE_URL}/app/login`, '_blank');
    }

    setupYoutubeCarousel() {
        const player = document.getElementById('yt-player');
        const items = document.querySelectorAll('#yt-carousel [data-vid]');
        const playlistId = this.config.YOUTUBE_PLAYLIST_ID;

        items.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const videoId = el.dataset.vid;
                if (videoId && player) {
                    player.src = `https://www.youtube.com/embed/${videoId}?list=${playlistId}&rel=0&autoplay=1`;
                }
            });
        });
    }

    // --- Métodos de Renderizado (CORRECCIÓN: Se restaura la lógica de renderizado) ---

    renderWhatsappConnection(status, qrCodeBase64 = null, extraData = null) {
        const container = document.getElementById('whatsapp-connection-container');
        const connectButton = document.getElementById('request-qr-btn');
        const disconnectButton = document.getElementById('disconnect-whatsapp-btn');
        const methodSelector = document.getElementById('connection-method-selector');
        const phoneContainer = document.getElementById('phone-input-container');
        let html = '';

        switch (status) {
            case 'connected':
                html = `
                    <div class="flex flex-col items-center justify-center h-48 text-green-600">
                        <i data-lucide="check-circle" class="w-16 h-16"></i>
                        <p class="font-bold mt-2">¡Conectado!</p>
                        <p class="text-sm text-slate-500">Tu sesión de WhatsApp está activa.</p>
                    </div>`;
                if (connectButton) connectButton.style.display = 'none';
                if (disconnectButton) disconnectButton.style.display = 'block';
                if (methodSelector) methodSelector.style.display = 'none';
                if (phoneContainer) phoneContainer.style.display = 'none';
                break;
            case 'loading':
                html = `
                    <div class="flex justify-center items-center h-48">
                        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900"></div>
                    </div>`;
                if (connectButton) connectButton.style.display = 'block';
                if (disconnectButton) disconnectButton.style.display = 'none';
                break;
            case 'qr':
                // Si el QR ya incluye el prefijo data:image, no agregarlo de nuevo
                const qrSrc = qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`;
                html = `<img src="${qrSrc}" alt="Escanea para conectar WhatsApp" class="mx-auto max-w-xs rounded-lg shadow-lg">`;
                if (connectButton) connectButton.style.display = 'block';
                if (disconnectButton) disconnectButton.style.display = 'none';
                break;
            case 'pairing':
                // Formatear código como XXXX-XXXX
                const formattedCode = extraData && extraData.length === 8
                    ? `${extraData.substring(0, 4)}-${extraData.substring(4)}`
                    : extraData;
                console.log('[PAIRING RENDER] Código original:', extraData, 'Formateado:', formattedCode);

                html = `
                    <div class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                        <div class="text-6xl font-black text-purple-700 tracking-widest mb-4 font-mono">
                            ${formattedCode}
                        </div>
                        <p class="font-bold text-slate-800">Código de Emparejamiento</p>
                        <p class="text-sm text-slate-600 mt-2 text-center">
                            Ingresa este código en WhatsApp > Dispositivos Vinculados > Vincular con número de teléfono
                        </p>
                    </div>`;
                if (connectButton) connectButton.style.display = 'block';
                if (disconnectButton) disconnectButton.style.display = 'none';
                break;
            case 'error':
                html = `
                    <div class="flex flex-col items-center justify-center h-48 text-red-500">
                         <i data-lucide="alert-triangle" class="w-16 h-16"></i>
                         <p class="font-bold mt-2">Error</p>
                         <p class="text-sm text-slate-500">${extraData || 'No se pudo conectar. Intenta de nuevo.'}</p>
                    </div>`;
                if (connectButton) connectButton.style.display = 'block';
                if (disconnectButton) disconnectButton.style.display = 'none';
                if (methodSelector) methodSelector.style.display = 'none';
                break;
            case 'initial':
            default:
                html = `
                    <div class="flex flex-col items-center justify-center h-48 text-slate-400">
                         <i data-lucide="qr-code" class="w-16 h-16"></i>
                         <p class="font-bold mt-2">Solicita el QR para vincular</p>
                    </div>`;
                if (connectButton) connectButton.style.display = 'block';
                if (disconnectButton) disconnectButton.style.display = 'none';
                if (methodSelector) methodSelector.style.display = 'none';
                break;
        }
        container.innerHTML = html;
        lucide.createIcons();
    }

    // --- LÓGICA GLOBAL DEL MODAL DE IA ---
    async openAiEnhanceModal(originalText, onApplyCallback, context = 'default') {
        const modal = document.getElementById('ai-enhance-modal');
        if (!modal) return;
        const generateBtn = document.getElementById('generate-ai-btn');
        // CORRECCIÓN: Cargar plan y uso directamente, sin depender de variables globales
        try {
            this.aiModalContext = context;

            // --- CORRECCIÓN: Cargar plan y uso directamente, sin depender de variables globales ---
            const [userPlan, userUsage] = await Promise.all([
                this.loadUserSubscription(),
                this.loadUserUsage()
            ]);
            // CORRECCIÓN: Cargar plan y uso directamente, sin depender de variables globales
            if (!userPlan) throw new Error("No se pudo cargar la información del plan.");

            const aiLimit = userPlan.plans?.ai_enhancements_limit || 0;
            const aiUsed = userUsage?.ai_enhancements_used || 0;
            const usesLeft = aiLimit - aiUsed;

            document.getElementById('ai-uses-left').textContent = `${usesLeft}/${aiLimit}`;
            generateBtn.disabled = usesLeft <= 0;

            if (usesLeft <= 0) {
                window.showToast('Has alcanzado tu límite de mejoras con IA este mes.', 'info');
            }

            this.aiModalCallback = onApplyCallback;
            document.getElementById('ai-original-text').value = originalText;
            document.getElementById('ai-prompt-input').value = '';
            document.getElementById('ai-result-container').innerHTML = '';
            document.getElementById('ai-result-container').classList.add('hidden');
            generateBtn.classList.remove('hidden');
            document.getElementById('apply-ai-btn').classList.add('hidden');
            document.getElementById('regenerate-ai-btn').classList.add('hidden');

            modal.classList.remove('hidden');

        } catch (error) {
            window.showToast(error.message, 'error');
            return;
        }
    }

    closeAiModal() {
        document.getElementById('ai-enhance-modal').classList.add('hidden');
        this.aiModalCallback = null;
    }

    async handleGenerateAi(isRegenerating = false) {
        const button = isRegenerating ? document.getElementById('regenerate-ai-btn') : document.getElementById('generate-ai-btn');
        const mainGenerateBtn = document.getElementById('generate-ai-btn');
        button.disabled = true;
        button.textContent = 'Generando...';
        // CORRECCIÓN: Usar la Edge Function
        const originalText = document.getElementById('ai-original-text').value;

        const userPrompt = document.getElementById('ai-prompt-input').value;
        let systemPrompt;

        if (this.aiModalContext === 'designer') {
            systemPrompt = `Eres un asistente de diseño experto. Mejora la siguiente descripción para un prompt de generación de imágenes. Sé creativo y visual.
            - NO uses placeholders como '%nombre%'.
            - Devuelve ÚNICAMENTE la descripción mejorada.
            ${userPrompt ? `Considera esta instrucción adicional del usuario: '${userPrompt}'.` : ''}`;
        } else if (this.aiModalContext === 'behavior_prompt') {
            // Contexto específico para prompts de comportamiento del asistente
            systemPrompt = `Eres un experto en optimización de prompts de comportamiento para asistentes de IA conversacionales.

Tu tarea es MEJORAR el prompt de comportamiento proporcionado, NO reemplazarlo completamente.

**REGLAS CRÍTICAS:**
1. DEBES mantener TODA la estructura original del prompt (secciones, formato, ejemplos, etc.)
2. DEBES conservar TODO el contenido existente (identidad, reglas, procesos, ejemplos)
3. SOLO debes hacer mejoras incrementales basadas en las instrucciones del usuario
4. NO elimines secciones, ejemplos o información importante
5. NO cambies el formato o estructura a menos que el usuario lo solicite explícitamente
6. Si el usuario pide algo específico, incorpóralo sin eliminar el resto del contenido
7. Mantén la misma extensión y nivel de detalle del prompt original
8. Conserva todos los ejemplos (FEW-SHOT_LEARNING) y casos de uso

**INSTRUCCIONES DEL USUARIO:**
${userPrompt ? `El usuario quiere: "${userPrompt}"` : 'Mejora general del prompt manteniendo todo el contenido.'}

**PROMPT ORIGINAL A MEJORAR:**
[El prompt completo se enviará a continuación]

**IMPORTANTE:** 
- Devuelve el prompt COMPLETO mejorado, no solo las partes que cambiaste
- Mantén todas las secciones: CORE_IDENTITY, KNOWLEDGE_BASE, RULES, PROCESS, OUTPUT_FORMAT, FEW-SHOT_LEARNING
- Si agregas algo nuevo, intégralo en la sección correspondiente sin eliminar lo existente
- Si el prompt original tiene 1000 palabras, el mejorado debe tener al menos 900-1100 palabras
- Si el usuario solo pide un cambio pequeño, haz ese cambio específico pero mantén TODO lo demás intacto
- NUNCA devuelvas solo un resumen o versión corta del prompt original
- El resultado debe ser un prompt completo y funcional, no un resumen`;
        } else { // Contexto por defecto para marketing, plantillas, etc.
            systemPrompt = `Eres un asistente de marketing experto en WhatsApp. Reescribe el siguiente texto para que sea más efectivo y profesional, manteniendo el tono y la intención original.
            - El único placeholder permitido es '%nombre%'. Mantenlo exactamente como está. NO inventes otros placeholders como '%empresa%'.
            - NO añadas saludos, despedidas, ni firmes con "[Tu Nombre]", etc. Devuelve ÚNICamente el texto mejorado.
            ${userPrompt ? `Considera esta instrucción adicional del usuario: '${userPrompt}'.` : ''}`;
        }

        try { // CORRECCIÓN: Usar la Edge Function
            // Verificar acceso de cuenta primero (si la función existe)
            let accessCheck = null;
            try {
                const { data, error: accessError } = await window.auth.sb.rpc('check_account_access', { p_user_id: this.user.id });
                if (accessError && accessError.code !== 'PGRST202') {
                    throw new Error('Error al verificar el acceso de tu cuenta.');
                } else if (!accessError) {
                    accessCheck = data;
                }
            } catch (e) {
                if (e.code !== 'PGRST202') {
                    throw new Error('Error al verificar el acceso de tu cuenta.');
                }
            }
            if (accessCheck && accessCheck.blocked) {
                throw new Error(accessCheck.reason || 'Tu cuenta está bloqueada. Por favor, contacta con soporte.');
            }

            // --- CORRECCIÓN: Usar la Edge Function ---
            const { data, error } = await window.auth.invokeFunction('openai-proxy', {
                body: {
                    type: 'text',
                    prompt: systemPrompt,
                    text: originalText,
                    userId: this.user.id // Enviamos el ID para registrar el uso
                }
            });
            if (error) throw error; // Actualizar el contador de usos en la UI

            // Actualizar el contador de usos en la UI
            // Recargamos el uso desde la DB para tener el dato más fresco y lo mostramos.
            const updatedUsage = await this.loadUserUsage();
            const aiLimit = (await this.loadUserSubscription()).plans?.ai_enhancements_limit || 0;
            const aiUsed = updatedUsage?.ai_enhancements_used || 0;
            document.getElementById('ai-uses-left').textContent = `${aiLimit - aiUsed}/${aiLimit}`;

            const resultContainer = document.getElementById('ai-result-container');
            resultContainer.textContent = data.result || "La IA no devolvió un resultado válido.";
            resultContainer.classList.remove('hidden');

            mainGenerateBtn.classList.add('hidden');
            document.getElementById('apply-ai-btn').classList.remove('hidden');
            document.getElementById('regenerate-ai-btn').classList.remove('hidden');
        } catch (e) {
            // Si el error es por límite de uso, la función ya muestra un mensaje claro.
            if (!/limit/i.test(e.message)) window.showToast('No se pudo generar la mejora. Revisa la consola.', 'error');
        } finally {
            button.disabled = false; // Habilitar el botón que se usó
            button.textContent = isRegenerating ? 'Reintentar' : 'Mejorar Texto';
        }
    }

    handleApplyAi() {
        const newText = document.getElementById('ai-result-container').textContent;
        if (this.aiModalCallback) this.aiModalCallback(newText);
        this.closeAiModal();
    }
}

// =================================================================================
// CLASE PARA EL ASISTENTE DE CONFIGURACIÓN (WIZARD)
// =================================================================================
class Wizard {
    constructor(appInstance) {
        this.app = appInstance;
        this.iti = null;
        this.currentStep = 1; // El paso actual
        this.totalSteps = 4; // WhatsApp, Sync, Company Info, AI Q&A
        this.modal = document.getElementById('wizard-modal');
        this.prevBtn = document.getElementById('wizard-prev-btn');
        this.nextBtn = document.getElementById('wizard-next-btn');
        this.finishBtn = document.getElementById('wizard-finish-btn');
        this.closeBtn = document.getElementById('close-wizard-btn');
        this.stepIndicator = document.getElementById('wizard-step-indicator');
        this.companyForm = document.getElementById('wizard-company-form');
        this.qaForm = this.modal?.querySelector('#wizard-qa-form') || null;
        this.qrContainer = document.getElementById('wizard-qr-container');
        this.requestQrBtn = document.getElementById('wizard-request-qr-btn');
        this.syncContactsBtn = document.getElementById('wizard-sync-contacts-btn');
        this.companySnapshot = null;

        this.setupListeners();
    }

    initQRPlaceholder() {
        // console.log('[QR PLACEHOLDER] Ejecutando initQRPlaceholder()');
        // console.log('[QR PLACEHOLDER] qrContainer existe?', !!this.qrContainer);
        // console.log('[QR PLACEHOLDER] innerHTML actual:', this.qrContainer?.innerHTML);

        // Agregar placeholder visual al área del QR - SIEMPRE agregarlo
        if (this.qrContainer) {
            const isEmpty = !this.qrContainer.innerHTML.trim() || this.qrContainer.innerHTML.includes('<!-- El QR');
            // console.log('[QR PLACEHOLDER] Está vacío?', isEmpty);

            if (isEmpty) {
                // console.log('[QR PLACEHOLDER] Agregando placeholder...');
                this.qrContainer.innerHTML = `
                    <div class="text-center py-8">
                        <div class="w-32 h-32 mx-auto mb-4 bg-slate-200 rounded-xl flex items-center justify-center">
                            <svg class="w-20 h-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                            </svg>
                        </div>
                        <p class="text-slate-500 font-medium">Presiona "Solicitar QR" para comenzar</p>
                        <p class="text-xs text-slate-400 mt-2">El código QR aparecerá aquí</p>
                    </div>
                `;
                // console.log('[QR PLACEHOLDER] Placeholder agregado!');
            }
        }
    }

    updateWizardHTML() {
        // console.log('[WIZARD UPDATE] Actualizando HTML del wizard...');

        const step3 = document.getElementById('wizard-step-3');
        const step4 = document.getElementById('wizard-step-4');

        if (!step3 || !step4) {
            // console.log('[WIZARD UPDATE] No se encontraron los pasos');
            return;
        }

        // Actualizar Paso 3 con diseño funcional y completo
        step3.innerHTML = `
            <h4 class="text-2xl font-bold mb-4 text-center text-slate-800">Paso 3: Configuración de Empresa</h4>
            <p class="text-slate-500 mb-6 text-center max-w-2xl mx-auto">Datos esenciales y funcionalidades que tu IA necesita conocer</p>
            <form id="wizard-company-form" class="space-y-5 max-w-4xl mx-auto">
                <!-- Info Básica -->
                <div class="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="building-2" class="w-5 h-5 text-white"></i>
                            <h5 class="text-base font-bold text-white">Información Básica</h5>
                        </div>
                    </div>
                    <div class="p-5 space-y-3">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                                Nombre de la Empresa <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="wizard-company-name" placeholder="Ej: Mi Empresa S.A."
                                class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                                Teléfono de Contacto <span class="text-red-500">*</span>
                            </label>
                            <input type="tel" id="wizard-admin-phone-input" placeholder="Ej: +52 55 1234 5678"
                                class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                                ¿Qué vendes? <span class="text-red-500">*</span>
                            </label>
                            <textarea id="wizard-company-description" rows="3"
                                class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none resize-none text-sm"
                                placeholder="Describe tus productos/servicios. Sé específico sobre qué SÍ y NO vendes."></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Negocio</label>
                                <select id="wizard-business-type" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                                    <option value="both">Ambos</option>
                                    <option value="ecommerce">E-commerce</option>
                                    <option value="services">Servicios</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apertura</label>
                                    <input type="time" id="wizard-work-start-hour"
                                        class="w-full px-2 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Cierre</label>
                                    <input type="time" id="wizard-work-end-hour"
                                        class="w-full px-2 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                                </div>
                            </div>
                        </div>

                         <!-- Redes Sociales y Web -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                             <div class="col-span-1 md:col-span-3">
                                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Sitio Web</label>
                                <input type="url" id="wizard-website" placeholder="https://miempresa.com"
                                    class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Instagram</label>
                                <input type="text" id="wizard-social-instagram" placeholder="@usuario"
                                    class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                            </div>
                            <div class="col-span-1 md:col-span-2">
                                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Facebook</label>
                                <input type="text" id="wizard-social-facebook" placeholder="facebook.com/pagina"
                                    class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Marca y Branding -->
                <div class="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="palette" class="w-5 h-5 text-white"></i>
                            <h5 class="text-base font-bold text-white">Marca y Personalidad</h5>
                        </div>
                    </div>
                    <div class="p-5 space-y-4">
                        <!-- Logo -->
                        <div class="flex items-center gap-4">
                            <div class="relative group">
                                <img id="wizard-logo-preview" src="https://ui-avatars.com/api/?name=Company&background=random" class="w-16 h-16 rounded-full object-cover border-2 border-slate-200 bg-slate-50">
                                <button type="button" id="wizard-upload-logo-btn" class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <i data-lucide="upload" class="w-5 h-5 text-white"></i>
                                </button>
                            </div>
                            <div>
                                <h6 class="text-sm font-semibold text-slate-800">Logo de la Empresa</h6>
                                <p class="text-xs text-slate-500">Haz clic en la imagen para subir tu logo</p>
                                <input type="file" id="wizard-logo-input" accept="image/*" class="hidden">
                            </div>
                        </div>

                        <!-- Colores -->
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-2">Colores de Marca</label>
                            <div class="flex gap-3">
                                <input type="color" id="wizard-brand-color-1" value="#3b82f6" class="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 p-0.5 bg-white shadow-sm" title="Color Principal">
                                <input type="color" id="wizard-brand-color-2" value="#10b981" class="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 p-0.5 bg-white shadow-sm" title="Color Secundario">
                                <input type="color" id="wizard-brand-color-3" value="#f59e0b" class="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 p-0.5 bg-white shadow-sm" title="Color de Acento">
                                <input type="color" id="wizard-brand-color-4" value="#1e293b" class="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 p-0.5 bg-white shadow-sm" title="Color de Texto/Fondo">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Funcionalidades -->
                <div class="bg-white rounded-xl shadow-md border border-purple-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-purple-500 to-pink-600 px-5 py-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="settings" class="w-5 h-5 text-white"></i>
                            <h5 class="text-base font-bold text-white">Funcionalidades</h5>
                        </div>
                    </div>
                    <div class="p-5 space-y-2.5">
                        <label class="flex items-start gap-2.5 p-2.5 border-2 border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition">
                            <input type="checkbox" id="wizard-appointments-enabled" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600">
                            <div class="flex-1">
                                <div class="font-semibold text-slate-800 text-sm">📅 Sistema de Citas</div>
                                <p class="text-xs text-slate-500 mt-0.5">Detecta cuando quieren agendar y ofrece horarios</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2.5 p-2.5 border-2 border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition">
                            <input type="checkbox" id="wizard-quotes-enabled" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600">
                            <div class="flex-1">
                                <div class="font-semibold text-slate-800 text-sm">💰 Cotizaciones Automáticas</div>
                                <p class="text-xs text-slate-500 mt-0.5">Genera cotizaciones con formato profesional</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2.5 p-2.5 border-2 border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition">
                            <input type="checkbox" id="wizard-daily-summary-enabled" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600">
                            <div class="flex-1">
                                <div class="font-semibold text-slate-800 text-sm">📊 Resumen Diario</div>
                                <p class="text-xs text-slate-500 mt-0.5">Recibe un resumen de conversaciones cada día</p>
                            </div>
                        </label>
                    </div>
                </div>
            </form>
        `;

        // Actualizar Paso 4 - Personalidad mejorada con más opciones
        step4.innerHTML = `
            <h4 class="text-2xl font-bold mb-4 text-center text-slate-800">Paso 4: Personalidad de la IA</h4>
            <p class="text-slate-500 mb-6 text-center max-w-2xl mx-auto">Define el tono, comportamiento y estilo de respuesta de tu asistente</p>
            <form id="wizard-qa-form" class="space-y-5 max-w-5xl mx-auto">
                <!-- Presets de Personalidad -->
                <div class="bg-white rounded-xl shadow-md border border-purple-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-purple-500 to-pink-600 px-5 py-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="sparkles" class="w-5 h-5 text-white"></i>
                            <h5 class="text-base font-bold text-white">Preset de Personalidad</h5>
                        </div>
                    </div>
                    <div class="p-5">
                        <div class="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <label class="cursor-pointer">
                                <input type="radio" name="wizard-persona" value="friendly" class="peer hidden" checked>
                                <div class="p-4 rounded-lg border-2 border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-slate-50 transition">
                                    <div class="text-2xl mb-2 text-center">😊</div>
                                    <div class="font-bold text-slate-800 mb-1 text-sm text-center">Amigable</div>
                                    <p class="text-xs text-slate-500 text-center">Cercano y empático</p>
                                </div>
                            </label>
                            <label class="cursor-pointer">
                                <input type="radio" name="wizard-persona" value="sales_strategist" class="peer hidden">
                                <div class="p-4 rounded-lg border-2 border-slate-200 peer-checked:border-green-500 peer-checked:bg-green-50 hover:bg-slate-50 transition">
                                    <div class="text-2xl mb-2 text-center">🤝</div>
                                    <div class="font-bold text-slate-800 mb-1 text-sm text-center">Vendedor Estratega</div>
                                    <p class="text-xs text-slate-500 text-center">Detecta oportunidades</p>
                                </div>
                            </label>
                            <label class="cursor-pointer">
                                <input type="radio" name="wizard-persona" value="professional" class="peer hidden">
                                <div class="p-4 rounded-lg border-2 border-slate-200 peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50 transition">
                                    <div class="text-2xl mb-2 text-center">💼</div>
                                    <div class="font-bold text-slate-800 mb-1 text-sm text-center">Profesional</div>
                                    <p class="text-xs text-slate-500 text-center">Formal y corporativo</p>
                                </div>
                            </label>
                            <label class="cursor-pointer">
                                <input type="radio" name="wizard-persona" value="concise" class="peer hidden">
                                <div class="p-4 rounded-lg border-2 border-slate-200 peer-checked:border-orange-500 peer-checked:bg-orange-50 hover:bg-slate-50 transition">
                                    <div class="text-2xl mb-2 text-center">🎯</div>
                                    <div class="font-bold text-slate-800 mb-1 text-sm text-center">Directo</div>
                                    <p class="text-xs text-slate-500 text-center">Conciso, al grano</p>
                                </div>
                            </label>
                            <label class="cursor-pointer">
                                <input type="radio" name="wizard-persona" value="enthusiastic" class="peer hidden">
                                <div class="p-4 rounded-lg border-2 border-slate-200 peer-checked:border-pink-500 peer-checked:bg-pink-50 hover:bg-slate-50 transition">
                                    <div class="text-2xl mb-2 text-center">🌟</div>
                                    <div class="font-bold text-slate-800 mb-1 text-sm text-center">Entusiasta</div>
                                    <p class="text-xs text-slate-500 text-center">Energético, motivador</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Opciones de Comportamiento -->
                <div class="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="settings" class="w-5 h-5 text-white"></i>
                            <h5 class="text-base font-bold text-white">Opciones de Comportamiento</h5>
                        </div>
                    </div>
                    <div class="p-5 grid md:grid-cols-2 gap-4">
                        <!-- Emojis -->
                        <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <input type="checkbox" id="wizard-use-emojis" class="w-5 h-5 rounded text-blue-600" checked>
                            <div class="flex-1">
                                <label for="wizard-use-emojis" class="font-semibold text-slate-800 cursor-pointer">Usar Emojis</label>
                                <p class="text-xs text-slate-500">Incluir emojis en respuestas</p>
                            </div>
                        </div>

                        <!-- Longitud de Respuestas -->
                        <div>
                            <label class="block font-semibold text-slate-800 mb-2 text-sm">Longitud de Respuestas</label>
                            <select id="wizard-response-length" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                                <option value="short">Cortas (1-2 líneas)</option>
                                <option value="medium" selected>Medianas (2-4 líneas)</option>
                                <option value="long">Largas (4+ líneas)</option>
                            </select>
                        </div>

                        <!-- Nivel de Formalidad -->
                        <div>
                            <label class="block font-semibold text-slate-800 mb-2 text-sm">Nivel de Formalidad</label>
                            <select id="wizard-formality" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                                <option value="informal">Informal (tuteo, relajado)</option>
                                <option value="neutral" selected>Neutral (profesional pero cercano)</option>
                                <option value="formal">Formal (usted, corporativo)</option>
                            </select>
                        </div>

                        <!-- Enfoque Principal -->
                        <div>
                            <label class="block font-semibold text-slate-800 mb-2 text-sm">Enfoque Principal</label>
                            <select id="wizard-focus" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm">
                                <option value="sales">Ventas (convertir leads)</option>
                                <option value="support">Soporte (resolver dudas)</option>
                                <option value="info">Información (educar cliente)</option>
                                <option value="mixed" selected>Mixto (adaptable)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Instrucciones Custom -->
                <div class="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-slate-600 to-slate-800 px-5 py-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="file-text" class="w-5 h-5 text-white"></i>
                            <h5 class="text-base font-bold text-white">Reglas Específicas (Opcional)</h5>
                        </div>
                    </div>
                    <div class="p-5">
                        <textarea id="wizard-custom-instructions" rows="3"
                            class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-slate-500 outline-none resize-none text-sm"
                            placeholder="Ej: Siempre mencionar garantía de 30 días. No ofrecer descuentos sin autorización. Usar lenguaje inclusivo."></textarea>
                        <p class="text-xs text-slate-500 mt-2">Instrucciones adicionales sobre cómo debe comportarse en situaciones específicas</p>
                    </div>
                </div>
            </form>
        `;

        // Reinicializar iconos de Lucide para los nuevos elementos
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Pre-cargar datos existentes
        this.loadAllWizardData();

        // console.log('[WIZARD UPDATE] Wizard actualizado con diseño nuevo!');
    }

    async loadAllWizardData() {
        // console.log('[WIZARD DATA] Cargando datos existentes...');
        // console.log('[WIZARD DATA] User ID:', this.app.user.id);

        try {
            // Cargar TODOS los datos del perfil para ver qué campos existen realmente
            const { data: profile, error: profileError } = await window.auth.sb
                .from('profiles')
                .select('*')
                .eq('id', this.app.user.id)
                .single();

            // console.log('[WIZARD DATA] 🔍 PROFILE COMPLETO (RAW):', JSON.stringify(profile, null, 2));
            if (profileError) console.error('[WIZARD DATA] Error profile:', profileError);

            if (profile) {
                // console.log('[WIZARD DATA] ✅ Profile existe, procesando campos...');

                // Helper function para convertir número a formato HH:mm
                const formatHourToTime = (hour) => {
                    if (typeof hour === 'number') {
                        return hour.toString().padStart(2, '0') + ':00';
                    }
                    if (typeof hour === 'string' && hour.includes(':')) {
                        return hour; // Ya está en formato correcto
                    }
                    if (typeof hour === 'string') {
                        return hour.padStart(2, '0') + ':00';
                    }
                    return null;
                };

                // Horarios
                const startHour = document.getElementById('wizard-work-start-hour');
                const endHour = document.getElementById('wizard-work-end-hour');
                // console.log('[WIZARD DATA] 🕐 work_start_hour del profile:', profile.work_start_hour, '(tipo:', typeof profile.work_start_hour, ')');
                // console.log('[WIZARD DATA] 🕐 work_end_hour del profile:', profile.work_end_hour, '(tipo:', typeof profile.work_end_hour, ')');

                if (startHour) {
                    if (profile.work_start_hour != null) {
                        const formattedStart = formatHourToTime(profile.work_start_hour);
                        startHour.value = formattedStart;
                        // console.log('[WIZARD DATA] ✅ Horario inicio asignado:', formattedStart, '(original:', profile.work_start_hour, ')');
                    } else {
                        // console.log('[WIZARD DATA] ⚠️ work_start_hour es null/undefined, no se asigna');
                    }
                } else {
                    // console.log('[WIZARD DATA] ❌ Elemento wizard-work-start-hour NO encontrado en DOM');
                }

                if (endHour) {
                    if (profile.work_end_hour != null) {
                        const formattedEnd = formatHourToTime(profile.work_end_hour);
                        endHour.value = formattedEnd;
                        // console.log('[WIZARD DATA] ✅ Horario fin asignado:', formattedEnd, '(original:', profile.work_end_hour, ')');
                    } else {
                        // console.log('[WIZARD DATA] ⚠️ work_end_hour es null/undefined, no se asigna');
                    }
                } else {
                    // console.log('[WIZARD DATA] ❌ Elemento wizard-work-end-hour NO encontrado en DOM');
                }

                // Descripción
                const desc = document.getElementById('wizard-company-description');
                // console.log('[WIZARD DATA] 📝 company_description:', profile.company_description ? 'SÍ EXISTE' : 'null/undefined');
                if (desc && profile.company_description) {
                    desc.value = profile.company_description;
                    // console.log('[WIZARD DATA] ✅ Descripción asignada');
                }

                // Cotizaciones
                const quotesCheck = document.getElementById('wizard-quotes-enabled');
                // console.log('[WIZARD DATA] 💰 quotes_enabled del profile:', profile.quotes_enabled, '(tipo:', typeof profile.quotes_enabled, ')');
                if (quotesCheck) {
                    quotesCheck.checked = profile.quotes_enabled === true;
                    // console.log('[WIZARD DATA] ✅ Checkbox cotizaciones asignado a:', quotesCheck.checked);
                } else {
                    // console.log('[WIZARD DATA] ❌ Elemento wizard-quotes-enabled NO encontrado en DOM');
                }

                // Resumen diario
                const dailySummaryCheck = document.getElementById('wizard-daily-summary-enabled');
                // console.log('[WIZARD DATA] 📊 daily_summary_enabled del profile:', profile.daily_summary_enabled, '(tipo:', typeof profile.daily_summary_enabled, ')');
                if (dailySummaryCheck) {
                    dailySummaryCheck.checked = profile.daily_summary_enabled === true;
                    // console.log('[WIZARD DATA] ✅ Checkbox resumen diario asignado a:', dailySummaryCheck.checked);
                } else {
                    // console.log('[WIZARD DATA] ❌ Elemento wizard-daily-summary-enabled NO encontrado en DOM');
                }

                // Nombre de empresa
                if (profile.organization_id) {
                    const { data: org } = await window.auth.sb
                        .from('organizations')
                        .select('name')
                        .eq('id', profile.organization_id)
                        .single();

                    const nameInput = document.getElementById('wizard-company-name');
                    if (nameInput && org?.name) {
                        nameInput.value = org.name;
                        // console.log('[WIZARD DATA] Nombre empresa cargado:', org.name);
                    }
                }
            }

            // Cargar configuración de citas
            const { data: appointmentSettings, error: apptError } = await window.auth.sb
                .from('appointment_settings')
                .select('*')
                .eq('user_id', this.app.user.id)
                .maybeSingle();

            // console.log('[WIZARD DATA] 🔍 APPOINTMENT SETTINGS COMPLETO (RAW):', JSON.stringify(appointmentSettings, null, 2));
            if (apptError) console.error('[WIZARD DATA] Error appointments:', apptError);

            if (appointmentSettings) {
                // console.log('[WIZARD DATA] ✅ Appointment settings existe, procesando...');

                // Sistema de citas
                const appointmentsCheck = document.getElementById('wizard-appointments-enabled');
                // console.log('[WIZARD DATA] 📅 is_enabled del appointment_settings:', appointmentSettings.is_enabled, '(tipo:', typeof appointmentSettings.is_enabled, ')');

                if (appointmentsCheck) {
                    appointmentsCheck.checked = appointmentSettings.is_enabled === true;
                    // console.log('[WIZARD DATA] ✅ Checkbox citas asignado a:', appointmentsCheck.checked);
                } else {
                    // console.log('[WIZARD DATA] ❌ Elemento wizard-appointments-enabled NO encontrado en DOM');
                }

                // Tipo de negocio
                const businessType = document.getElementById('wizard-business-type');
                // console.log('[WIZARD DATA] 🏢 business_type:', appointmentSettings.business_type);

                if (businessType) {
                    if (appointmentSettings.business_type) {
                        businessType.value = appointmentSettings.business_type;
                        // console.log('[WIZARD DATA] ✅ Tipo de negocio asignado:', businessType.value);
                    } else {
                        // console.log('[WIZARD DATA] ⚠️ business_type es null/undefined');
                    }
                } else {
                    // console.log('[WIZARD DATA] ❌ Elemento wizard-business-type NO encontrado en DOM');
                }
            } else {
                // console.log('[WIZARD DATA] ⚠️ NO hay appointment_settings para este usuario');
            }

            // Resumen de elementos DOM encontrados
            // console.log('[WIZARD DATA] 📋 RESUMEN ELEMENTOS DOM:');
            console.log('  - wizard-work-start-hour:', !!document.getElementById('wizard-work-start-hour'));
            console.log('  - wizard-work-end-hour:', !!document.getElementById('wizard-work-end-hour'));
            console.log('  - wizard-company-description:', !!document.getElementById('wizard-company-description'));
            console.log('  - wizard-company-name:', !!document.getElementById('wizard-company-name'));
            console.log('  - wizard-business-type:', !!document.getElementById('wizard-business-type'));
            console.log('  - wizard-quotes-enabled:', !!document.getElementById('wizard-quotes-enabled'));
            console.log('  - wizard-daily-summary-enabled:', !!document.getElementById('wizard-daily-summary-enabled'));
            console.log('  - wizard-appointments-enabled:', !!document.getElementById('wizard-appointments-enabled'));

            // console.log('[WIZARD DATA] ✅ Todos los datos procesados');
        } catch (error) {
            console.error('[WIZARD DATA] ❌ Error cargando datos:', error);
        }
    }

    setupListeners() {
        // CORRECCIÓN: Mover el modal al body para evitar problemas de apilamiento (z-index)
        if (this.modal && this.modal.parentElement !== document.body) {
            document.body.appendChild(this.modal);
        }

        this.prevBtn.addEventListener('click', () => this.changeStep(-1));
        this.nextBtn.addEventListener('click', () => this.changeStep(1));
        this.finishBtn.addEventListener('click', () => this.finish());
        this.closeBtn.addEventListener('click', () => this.hide());
        this.requestQrBtn?.addEventListener('click', () => this.app.checkWhatsappConnection(true));
        this.syncContactsBtn?.addEventListener('click', () => this.handleSyncClick());

        // Listeners para el nuevo paso de info de la empresa
        // Listeners globales para elementos dinámicos (Delegación de Eventos)
        this.modal.addEventListener('click', (e) => {
            // Upload Logo Button
            if (e.target.closest('#wizard-upload-logo-btn')) {
                this.modal.querySelector('#wizard-logo-input')?.click();
            }
        });

        this.modal.addEventListener('change', (e) => {
            const target = e.target;

            // Logo Input
            if (target.id === 'wizard-logo-input' && target.files?.length > 0) {
                this.previewLogo(target.files[0]);
            }

            // Appointments Enabled
            if (target.id === 'wizard-appointments-enabled') {
                const config = this.modal.querySelector('#wizard-appointments-config');
                if (config) {
                    if (target.checked) config.classList.remove('hidden');
                    else config.classList.add('hidden');
                }
            }

            // Smart Promo
            if (target.id === 'wizard-has-promo') {
                const fields = this.modal.querySelector('#wizard-promo-fields');
                if (fields) {
                    if (target.checked) {
                        fields.classList.remove('hidden');
                        setTimeout(() => fields.querySelector('input')?.focus(), 100);
                    } else {
                        fields.classList.add('hidden');
                    }
                }
            }
        });
    }

    // ... (Métodos intermedios sin cambios: start, hide, changeStep, updateStepUI, previewLogo, loadExistingCompanySettings, handleSettingsSave, handleSyncClick)

    async finish() {
        this.toggleLoading(true);

        try {
            const qaForm = this.qaForm || this.modal?.querySelector('#wizard-qa-form');
            if (!qaForm) throw new Error('No se encontró el formulario de preguntas.');

            const formData = new FormData(qaForm);
            const answers = Object.fromEntries(formData.entries());

            // 1. Smart Promotion Logic
            const hasPromo = this.modal.querySelector('#wizard-has-promo')?.checked;
            if (hasPromo && answers.promo_title) {
                await this.upsertSmartPromotion(answers);
            }

            // 2. Critical Rules Logic (Escalate Anger)
            if (this.modal.querySelector('[name="escalate_anger"]')?.checked) {
                await this.upsertCriticalRule({
                    rule_name: 'Detector de Enojo (Wizard)',
                    trigger_pattern: '(enojado|molesto|insulto|basura|estafa|imbecil|idiota|mierda)',
                    response_template: 'Entiendo tu molestia. Voy a conectar inmeditamente con un humano para resolver esto.',
                    action_type: 'escalate'
                });
            } else {
                // Si el usuario desmarcó la opción, intentamos desactivar la regla creada por el wizard
                // (Opcional: implementar lógica de limpieza si se desea)
            }

            // 3. Prompt Construction (Clean & LITE)
            const finalPrompt = this.buildPromptFromAnswers(answers);

            // 4. Save prompt en múltiples lugares
            const promptTextarea = document.getElementById('ai-master-prompt');
            if (promptTextarea) promptTextarea.value = finalPrompt;

            // Guardar en tabla prompts (vía handlePromptSave)
            await this.app.handlePromptSave(new Event('submit', { cancelable: true }));

            // También guardar en profiles.system_prompt para acceso directo
            await window.auth.sb
                .from('profiles')
                .update({ system_prompt: finalPrompt })
                .eq('id', this.app.user.id);

            // console.log('[WIZARD] ✅ Prompt guardado:', finalPrompt.substring(0, 100) + '...');

            this.toggleLoading(false, true); // Success state
            setTimeout(() => this.hide(), 3000);

        } catch (e) {
            console.error("Error al finalizar el wizard:", e);
            window.showToast('No se pudo generar el prompt. Inténtalo de nuevo.', 'error');
            this.toggleLoading(false, false);
        }
    }

    async upsertSmartPromotion(answers) {
        try {
            // Desactivar promos anteriores del wizard para evitar colisiones excesivas
            await window.auth.sb
                .from('smart_promotions')
                .update({ is_active: false })
                .eq('user_id', this.app.user.id)
                .eq('title', answers.promo_title.trim()); // Simple check

            const promoPayload = {
                user_id: this.app.user.id,
                title: answers.promo_title.trim(),
                description: answers.promo_description?.trim() || '',
                is_active: true,
                auto_insert: true,
                no_schedule: true,
                created_at: new Date().toISOString()
            };

            const { error } = await window.auth.sb.from('smart_promotions').insert(promoPayload);
            if (error) console.warn('[Wizard] Error promo:', error);
            else document.dispatchEvent(new CustomEvent('panel:activated', { detail: { panelId: 'smart-promotions' } }));
        } catch (err) { console.error(err); }
    }

    async upsertCriticalRule(ruleData) {
        try {
            // Verificar si ya existe una regla con ese nombre para actualizarla o dejarla
            const { data: existing } = await window.auth.sb
                .from('critical_rules')
                .select('id')
                .eq('user_id', this.app.user.id)
                .eq('rule_name', ruleData.rule_name)
                .maybeSingle();

            if (existing) {
                await window.auth.sb.from('critical_rules').update({
                    pattern_or_keyword: ruleData.trigger_pattern,
                    action_type: ruleData.action_type || 'notify', // Default to notify
                    is_active: true
                }).eq('id', existing.id);
            } else {
                await window.auth.sb.from('critical_rules').insert({
                    user_id: this.app.user.id,
                    rule_name: ruleData.rule_name,
                    rule_type: 'pattern',
                    pattern_or_keyword: ruleData.trigger_pattern,
                    detection_type: 'custom',
                    action_type: ruleData.action_type || 'notify', // Propagar action_type
                    is_active: true,
                    is_predefined: false,
                    priority: 100
                });
            }
            // console.log('[Wizard] Critical Rule configurada.');
        } catch (err) { console.error('Error configurando Critical Rule:', err); }
    }

    toggleLoading(isLoading, isSuccess = false) {
        if (isLoading) {
            this.modal.querySelectorAll('.wizard-step').forEach(step => step.classList.add('hidden'));
            document.getElementById('wizard-step-5').classList.remove('hidden');
            document.getElementById('wizard-loading').classList.remove('hidden');
            document.getElementById('wizard-success').classList.add('hidden');
            this.prevBtn.parentElement.classList.add('hidden');
        } else {
            if (isSuccess) {
                document.getElementById('wizard-loading').classList.add('hidden');
                document.getElementById('wizard-success').classList.remove('hidden');
            } else {
                // Revertir a paso 4
                this.currentStep = 4;
                this.updateStepUI();
                this.prevBtn.parentElement.classList.remove('hidden');
            }
        }
    }

    buildPromptFromAnswers(answers) {
        const clean = (val) => (val || '').trim();

        // Obtener valores del Step 4 mejorado
        const personaValue = document.querySelector('input[name="wizard-persona"]:checked')?.value || 'friendly';
        const useEmojis = document.getElementById('wizard-use-emojis')?.checked ?? true;
        const responseLength = document.getElementById('wizard-response-length')?.value || 'medium';
        const formality = document.getElementById('wizard-formality')?.value || 'neutral';
        const focus = document.getElementById('wizard-focus')?.value || 'mixed';
        const customInstructions = document.getElementById('wizard-custom-instructions')?.value?.trim() || '';

        // Presets de personalidad mejorados
        const personas = {
            friendly: {
                role: 'asistente cercano y empático',
                behavior: 'Construyes relación antes de vender. Preguntas sobre necesidades. Escuchas activamente.'
            },
            sales_strategist: {
                role: 'asesor comercial estratégico',
                behavior: 'Identificas oportunidades de venta. Haces preguntas calificadoras. Creas urgencia sutilmente.'
            },
            professional: {
                role: 'consultor corporativo',
                behavior: 'Comunicas con precisión. Evitas informalidades. Mantienes distancia profesional.'
            },
            concise: {
                role: 'asistente directo',
                behavior: 'Vas al grano. Evitas rodeos. Priorizas eficiencia sobre calidez.'
            },
            enthusiastic: {
                role: 'asistente energético y motivador',
                behavior: 'Transmites entusiasmo. Usas exclamaciones. Motivas la acción del cliente.'
            }
        };

        const persona = personas[personaValue] || personas.friendly;

        // Mapear longitud de respuestas
        const lengthMap = {
            short: 'Respuestas muy breves (1-2 líneas). Solo lo esencial.',
            medium: 'Respuestas moderadas (2-3 líneas). Balance entre información y brevedad.',
            long: 'Respuestas completas (3-5 líneas). Detalladas cuando sea necesario.'
        };

        // Mapear formalidad
        const formalityMap = {
            informal: 'Tutea al cliente. Usa lenguaje relajado y casual.',
            neutral: 'Trato profesional pero amable. Ni muy formal ni muy casual.',
            formal: 'Usa "usted". Mantén lenguaje corporativo y educado.'
        };

        // Mapear enfoque
        const focusMap = {
            sales: 'Tu prioridad es convertir leads. Guía hacia la compra o cotización.',
            support: 'Tu prioridad es resolver dudas y brindar soporte excelente.',
            info: 'Tu prioridad es educar al cliente sobre productos/servicios.',
            mixed: 'Adapta tu enfoque según el contexto de cada conversación.'
        };

        // Compilar prompt conciso
        const lines = [];
        lines.push('# INSTRUCCIONES DEL ASISTENTE IA');
        lines.push('');
        lines.push(`## ROL: Eres Elina, ${persona.role}.`);
        lines.push('');
        lines.push('## COMPORTAMIENTO:');
        lines.push(`- ${persona.behavior}`);
        lines.push(`- ${lengthMap[responseLength]}`);
        lines.push(`- ${formalityMap[formality]}`);
        lines.push(`- ${useEmojis ? 'Usa emojis moderados para dar calidez.' : 'NO uses emojis. Mantén texto limpio.'}`);
        lines.push('');
        lines.push('## ENFOQUE:');
        lines.push(`- ${focusMap[focus]}`);
        lines.push('');
        lines.push('## REGLAS GENERALES:');
        lines.push('- Usa SOLO información del contexto proporcionado.');
        lines.push('- Si no sabes algo, admítelo y ofrece conectar con un humano.');
        lines.push('- Sé útil, preciso y confiable.');

        // Agregar instrucciones personalizadas si existen
        if (customInstructions) {
            lines.push('');
            lines.push('## REGLAS ESPECÍFICAS:');
            customInstructions.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed) lines.push(`- ${trimmed}`);
            });
        }

        return lines.join('\n');
    }

    // Método para cargar datos existentes (Promos activas y Reglas Críticas) en el Wizard
    async loadExistingData() {
        try {
            // 1. Cargar Promo Activa más reciente
            const { data: promo } = await window.auth.sb
                .from('smart_promotions')
                .select('*')
                .eq('user_id', this.app.user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (promo) {
                const promoCheck = this.modal.querySelector('#wizard-has-promo');
                const titleInput = this.modal.querySelector('[name="promo_title"]');
                const descInput = this.modal.querySelector('[name="promo_description"]');

                if (promoCheck) {
                    promoCheck.checked = true;
                    this.modal.querySelector('#wizard-promo-fields')?.classList.remove('hidden');
                    if (titleInput) titleInput.value = promo.title;
                    if (descInput) descInput.value = promo.description;
                }
            }

            // 2. Cargar Estado de Regla de Enojo
            const { data: angerRule } = await window.auth.sb
                .from('critical_rules')
                .select('id')
                .eq('user_id', this.app.user.id)
                .eq('rule_name', 'Detector de Enojo (Wizard)') // Debe coincidir con el nombre usado en upsertCriticalRule
                .eq('is_active', true)
                .maybeSingle();

            const angerCheck = this.modal.querySelector('[name="escalate_anger"]');
            if (angerCheck) {
                // Si existe la regla activa, marcamos el checkbox. Si no, lo desmarcamos (o dejamos el default si preferimos)
                // Para consistencia con "personalización", reflejamos el estado real.
                angerCheck.checked = !!angerRule;
            }

        } catch (e) {
            console.warn('[Wizard] Error loading existing data:', e);
        }
    }

    start(jumpToQA = false) {
        // console.log('[WIZARD] start() llamado, jumpToQA:', jumpToQA);
        // console.log('[WIZARD] Modal existe?', !!this.modal);

        this.currentStep = jumpToQA ? 4 : 1;
        this.updateStepUI();

        // Agregar placeholder al QR cuando abre el wizard
        this.initQRPlaceholder();

        // Actualizar wizard con diseño nuevo (evita caché HTML)
        this.updateWizardHTML();

        // IMPORTANTE: Re-obtener referencia al formulario después de updateWizardHTML
        this.companyForm = document.getElementById('wizard-company-form');

        if (!jumpToQA) { // CORRECCIÓN: Cargar datos al iniciar.
            this.loadExistingCompanySettings(); // CORRECCIÓN: Cargar datos al iniciar.
        }
        // Cargar datos extra para el paso 4
        this.loadExistingData();

        // console.log('[WIZARD] Antes de mostrar - hidden?', this.modal.classList.contains('hidden'));
        this.modal.classList.remove('hidden');
        // Forzar visibilidad del modal (fix para opacity: 0)
        this.modal.style.opacity = '1';
        this.modal.style.display = 'flex';
        this.modal.style.visibility = 'visible';
        this.modal.style.zIndex = '99999';
        document.body.classList.add('overflow-hidden');

        // DEBUG: Check for duplicates
        // console.log('[WIZARD] Count wizard-modal:', document.querySelectorAll('#wizard-modal').length);
        // console.log('[WIZARD] Count wizard-step-1:', document.querySelectorAll('#wizard-step-1').length);
        const step1 = document.getElementById('wizard-step-1');
        if (step1) {
            // console.log('[WIZARD] Step 1 classes:', step1.className);
            // console.log('[WIZARD] Step 1 style display:', step1.style.display);
        } else {
            // console.log('[WIZARD] CRITICAL: wizard-step-1 NOT FOUND');
        }

        // console.log('[WIZARD] Después de mostrar - hidden?', this.modal.classList.contains('hidden'));
        // console.log('[WIZARD] Estilos aplicados:', {
        //     opacity: this.modal.style.opacity,
        //     display: this.modal.style.display,
        //     visibility: this.modal.style.visibility,
        //     zIndex: this.modal.style.zIndex
        // });
    }

    hide() {
        this.modal.classList.add('hidden');
        // Limpiar estilos inline
        this.modal.style.opacity = '';
        this.modal.style.display = '';
        document.body.classList.remove('overflow-hidden');
    }

    changeStep(direction) {
        // Si estamos en el paso 3 y vamos al 4, primero guardamos los datos de la empresa
        if (this.currentStep === 3 && direction > 0) {
            this.handleSettingsSave(); // Guardar y continuar
            return; // handleSettingsSave se encargará de llamar a changeStep
        }

        const newStep = this.currentStep + direction;
        if (newStep >= 1 && newStep <= this.totalSteps) {
            this.currentStep = newStep;
            this.updateStepUI();
        }
    }

    updateStepUI() {
        // Ocultar todos los pasos
        this.modal.querySelectorAll('.wizard-step').forEach(step => step.classList.add('hidden')); // CORRECCIÓN: Asegurarse de que el formulario exista

        // Mostrar el paso actual
        const currentStepEl = document.getElementById(`wizard-step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.remove('hidden');
        }

        // Actualizar botones
        this.prevBtn.disabled = this.currentStep === 1;
        this.nextBtn.classList.toggle('hidden', this.currentStep >= this.totalSteps); // Ocultar en el último paso
        this.finishBtn.classList.toggle('hidden', this.currentStep !== this.totalSteps); // Mostrar solo en el último paso

        // Actualizar texto del botón "Siguiente"
        if (this.currentStep === 3) {
            this.nextBtn.innerHTML = 'Guardar y Seguir';
        } else {
            this.nextBtn.innerHTML = 'Siguiente';
        }

        // Actualizar indicador de paso (ahora es 4 pasos)
        this.stepIndicator.textContent = `Paso ${this.currentStep} de ${this.totalSteps}`;
    }

    previewLogo(file) {
        if (!file || !this.modal) return;
        const preview = this.modal.querySelector('#wizard-logo-preview');
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; };
        reader.readAsDataURL(file);
    }

    async loadExistingCompanySettings() {
        try { // CORRECCIÓN: Verificar si el formulario existe
            if (!this.companyForm) return; // CORRECCIÓN: Verificar si el formulario existe
            const { data, error } = await window.auth.sb.from('profiles')
                .select('work_start_hour, work_end_hour, company_description, website, social_media, branding_settings, contact_phone, organization_id')
                .eq('id', this.app.user.id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return;

            // Cargar nombre de empresa de organizations
            if (data.organization_id) {
                const { data: orgData, error: orgError } = await window.auth.sb
                    .from('organizations')
                    .select('name')
                    .eq('id', data.organization_id)
                    .single();

                if (!orgError && orgData && orgData.name) {
                    const companyNameInput = this.companyForm.querySelector('#wizard-company-name');
                    if (companyNameInput) {
                        companyNameInput.value = orgData.name;
                    }
                }
            }

            this.companySnapshot = {
                work_start_hour: data.work_start_hour ?? null,
                work_end_hour: data.work_end_hour ?? null,
                company_description: data.company_description ?? '',
                website: data.website ?? '',
                social_media: data.social_media ?? {},
                branding_settings: data.branding_settings ?? {},
                contact_phone: data.contact_phone ?? null,
            };

            const workStartInput = this.companyForm.querySelector('#wizard-work-start-hour');
            if (data.work_start_hour && workStartInput) workStartInput.value = `${String(data.work_start_hour).padStart(2, '0')}:00`;

            const workEndInput = this.companyForm.querySelector('#wizard-work-end-hour');
            if (data.work_end_hour && workEndInput) workEndInput.value = `${String(data.work_end_hour).padStart(2, '0')}:00`;

            const descInput = this.companyForm.querySelector('#wizard-company-description');
            if (data.company_description && descInput) descInput.value = data.company_description;

            const websiteInput = this.companyForm.querySelector('#wizard-website');
            if (data.website && websiteInput) websiteInput.value = data.website;

            if (data.social_media) {
                const igInput = this.companyForm.querySelector('#wizard-social-instagram');
                const fbInput = this.companyForm.querySelector('#wizard-social-facebook');
                if (igInput) igInput.value = data.social_media.instagram || '';
                if (fbInput) fbInput.value = data.social_media.facebook || '';
            }

            // Cargar logo de branding
            const logoPreview = this.companyForm.querySelector('#wizard-logo-preview');
            console.log('[Wizard] Logo URL:', data.branding_settings?.logo_url);
            console.log('[Wizard] Logo preview element:', logoPreview);
            if (data.branding_settings?.logo_url && logoPreview) {
                logoPreview.src = data.branding_settings.logo_url;
                console.log('[Wizard] Logo cargado en preview');
            }

            // Cargar colores de branding
            console.log('[Wizard] Colores:', data.branding_settings?.colors);
            if (data.branding_settings?.colors) {
                data.branding_settings.colors.forEach((c, i) => {
                    const colorInput = this.companyForm.querySelector(`#wizard-brand-color-${i + 1}`);
                    console.log(`[Wizard] Color ${i + 1}:`, c, 'Input:', colorInput);
                    if (colorInput) {
                        colorInput.value = c;
                    }
                });
            }

            if (data.contact_phone && this.iti) this.iti.setNumber(data.contact_phone);

            // Cargar configuración de citas (appointment_settings) para sincronizar con Settings
            try {
                const { data: appointmentSettings, error: appointmentError } = await window.auth.sb
                    .from('appointment_settings')
                    .select('business_type, is_enabled, timezone, default_duration_minutes, buffer_time_minutes, advance_booking_days')
                    .eq('user_id', this.app.user.id)
                    .maybeSingle();

                if (!appointmentError && appointmentSettings) {
                    // Cargar business_type
                    const businessTypeSelect = this.companyForm.querySelector('#wizard-business-type');
                    if (businessTypeSelect && appointmentSettings.business_type) {
                        businessTypeSelect.value = appointmentSettings.business_type;
                    } else if (businessTypeSelect) {
                        businessTypeSelect.value = 'both'; // Valor por defecto
                    }

                    // Cargar configuración de citas si está habilitada
                    const appointmentsEnabled = this.companyForm.querySelector('#wizard-appointments-enabled');
                    if (appointmentsEnabled) {
                        appointmentsEnabled.checked = appointmentSettings.is_enabled || false;
                        // Mostrar/ocultar configuración según el estado
                        const appointmentsConfig = this.companyForm.querySelector('#wizard-appointments-config');
                        if (appointmentsConfig) {
                            if (appointmentSettings.is_enabled) {
                                appointmentsConfig.classList.remove('hidden');
                            } else {
                                appointmentsConfig.classList.add('hidden');
                            }
                        }
                    }

                    // Cargar valores de configuración de citas si están disponibles
                    if (appointmentSettings.is_enabled) {
                        const timezoneSelect = this.companyForm.querySelector('#wizard-appointment-timezone');
                        if (timezoneSelect && appointmentSettings.timezone) {
                            timezoneSelect.value = appointmentSettings.timezone;
                        }

                        const defaultDurationInput = this.companyForm.querySelector('#wizard-appointment-default-duration');
                        if (defaultDurationInput && appointmentSettings.default_duration_minutes) {
                            defaultDurationInput.value = appointmentSettings.default_duration_minutes;
                        }
                    }
                } else if (appointmentError && appointmentError.code !== 'PGRST116') {
                    console.warn('[Wizard] Error al cargar configuración de citas:', appointmentError);
                }
            } catch (appointmentLoadError) {
                console.warn('[Wizard] Error al cargar appointment_settings:', appointmentLoadError);
            }
        } catch (e) {
            console.error("Error al precargar datos de la empresa en el wizard:", e);
        }
    }

    async handleSettingsSave() {
        // CORRECCIÓN: Lógica de guardado y avance (CORRECCIÓN: Guardar para el usuario correcto)
        // Re-obtener referencia al formulario porque updateWizardHTML reemplazó el DOM
        this.companyForm = document.getElementById('wizard-company-form');

        if (!this.companyForm) {
            console.error('[Wizard] Form not found - cannot save settings');
            window.showToast?.('Error: Formulario no encontrado', 'error');
            return;
        }

        this.nextBtn.disabled = true;
        this.nextBtn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>`;

        try {
            // Null check aggressive para el input del logo
            const logoInput = this.companyForm?.querySelector('#wizard-logo-input');
            if (!logoInput) {
                console.warn('[Wizard] #wizard-logo-input not found in form - skipping logo upload');
            }

            const logoFile = (logoInput?.files?.length > 0) ? logoInput.files[0] : null;
            let logoUrl = this.companyForm.querySelector('#wizard-logo-preview')?.src;
            if (logoFile) {
                logoUrl = await this.app.uploadAsset(logoFile, 'logos');
            }

            const brandingSettings = {
                logo_url: logoUrl?.startsWith('https') ? logoUrl : null,
                colors: Array.from({ length: 4 }, (_, i) => {
                    const input = this.companyForm.querySelector(`#wizard-brand-color-${i + 1}`);
                    return input ? input.value : '#000000'; // Fallback
                }),
            };

            const startHourInput = this.companyForm.querySelector('#wizard-work-start-hour')?.value;
            const endHourInput = this.companyForm.querySelector('#wizard-work-end-hour')?.value;

            const adminPhoneInput = this.companyForm.querySelector('#wizard-admin-phone-input');
            const adminPhone = adminPhoneInput ? adminPhoneInput.value.trim() : null;

            const companyName = this.companyForm.querySelector('#wizard-company-name')?.value.trim() || null;

            // Guardar nombre de empresa en organizations
            const { data: profile, error: profileError } = await window.auth.sb
                .from('profiles')
                .select('organization_id')
                .eq('id', this.app.user.id)
                .single();

            if (profileError) {
                console.error('[Wizard] Error al obtener perfil:', profileError);
            }

            if (companyName && profile && profile.organization_id) {
                const { error: orgError } = await window.auth.sb
                    .from('organizations')
                    .update({ name: companyName })
                    .eq('id', profile.organization_id);

                if (orgError) {
                    console.warn('[Wizard] Error al actualizar nombre de empresa:', orgError);
                } else {
                    // console.log('[Wizard] Nombre de empresa actualizado en organizations');
                }
            }

            const settingsData = {
                work_start_hour: startHourInput ? parseInt(startHourInput.split(':')[0]) : null,
                work_end_hour: endHourInput ? parseInt(endHourInput.split(':')[0]) : null,
                company_description: this.companyForm.querySelector('#wizard-company-description')?.value || '',
                website: this.companyForm.querySelector('#wizard-website')?.value || '',
                social_media: {
                    instagram: this.companyForm.querySelector('#wizard-social-instagram')?.value || '',
                    facebook: this.companyForm.querySelector('#wizard-social-facebook')?.value || '',
                },
                contact_phone: adminPhone,
                branding_settings: brandingSettings,
            };

            const { error } = await window.auth.sb.from('profiles').update(settingsData).eq('id', this.app.user.id);
            if (error) throw error;

            // Guardar tipo de negocio y configuración de citas
            const businessType = this.companyForm.querySelector('#wizard-business-type')?.value || 'both';

            // Siempre guardar/actualizar appointment_settings con business_type
            const appointmentSettings = {
                user_id: this.app.user.id,
                business_type: businessType,
            };

            // Si las citas están activadas, agregar configuración adicional
            const appointmentsEnabled = this.companyForm.querySelector('#wizard-appointments-enabled')?.checked || false;
            if (appointmentsEnabled) {
                const timezone = this.companyForm.querySelector('#wizard-appointment-timezone')?.value || 'America/Mexico_City';
                const defaultDuration = parseInt(this.companyForm.querySelector('#wizard-appointment-default-duration')?.value) || 60;

                appointmentSettings.is_enabled = true;
                appointmentSettings.calendar_type = 'internal';
                appointmentSettings.timezone = timezone;
                appointmentSettings.default_duration_minutes = defaultDuration;
                appointmentSettings.buffer_time_minutes = 0; // Cambiado de 15 a 0 para coincidir con Settings
                appointmentSettings.advance_booking_days = 30;
            } else {
                appointmentSettings.is_enabled = false;
            }

            const { error: appointmentError } = await window.auth.sb
                .from('appointment_settings')
                .upsert(appointmentSettings, { onConflict: 'user_id' });

            if (appointmentError) {
                console.warn('[Wizard] Error al guardar configuración de citas:', appointmentError);
            } else {
                // console.log('[Wizard] Configuración de citas y tipo de negocio guardada');
            }

            this.companySnapshot = {
                ...settingsData,
                branding_settings: brandingSettings,
            };

            // ACTUALIZACIÓN DE UI EN TIEMPO REAL (Settings Panel)
            // Para asegurar consistencia si el usuario revisa la configuración inmediatamente
            const settingsForm = document.getElementById('settings-form');
            if (settingsForm) {
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val || '';
                };

                setVal('company-name', companyName);
                setVal('company-description', settingsData.company_description);
                setVal('website', settingsData.website);
                setVal('social-instagram', settingsData.social_media?.instagram);
                setVal('social-facebook', settingsData.social_media?.facebook);
                setVal('admin-phone-input', settingsData.contact_phone);
                setVal('work-start-hour', startHourInput);
                setVal('work-end-hour', endHourInput);
                setVal('business-type', businessType);

                // Actualizar colores
                brandingSettings.colors.forEach((c, i) => {
                    const el = document.getElementById(`brand-color-${i + 1}`);
                    if (el) el.value = c;
                });

                // Actualizar logo
                const logoPreview = document.getElementById('logo-preview');
                if (logoPreview && brandingSettings.logo_url) {
                    logoPreview.src = brandingSettings.logo_url;
                }

                // Actualizar configuración de citas
                const apptEnabled = document.getElementById('appointments-enabled');
                const apptConfigPanel = document.getElementById('appointments-config');

                if (apptEnabled) {
                    apptEnabled.checked = appointmentsEnabled;
                    if (appointmentsEnabled) {
                        apptConfigPanel?.classList.remove('hidden');
                    } else {
                        apptConfigPanel?.classList.add('hidden');
                    }
                }

                // Actualizar campos de citas
                if (appointmentsEnabled) {
                    const wizTz = this.companyForm.querySelector('#wizard-appointment-timezone')?.value;
                    const wizDur = this.companyForm.querySelector('#wizard-appointment-default-duration')?.value;
                    setVal('appointment-timezone', wizTz);
                    setVal('appointment-default-duration', wizDur);
                }
            }

            window.showToast('Información de la empresa guardada.', 'success');
            this.currentStep++; // Avanza manualmente
            this.updateStepUI();

        } catch (e) {
            console.error('Error al guardar configuración desde el wizard:', e);
            window.showToast('No se pudo guardar la información de la empresa.', 'error');
        } finally {
            this.nextBtn.disabled = false;
            this.nextBtn.innerHTML = 'Guardar y Seguir';
        }
    }

    async handleSyncClick() {
        const button = this.syncContactsBtn;
        if (!button || button.disabled) return;

        const originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>`;

        try {
            const userId = this.app.user.id;

            // Usar Edge Function en lugar de n8n (igual que en contacts.js)
            const { data, error } = await window.auth.invokeFunction('sync-contacts', {
                body: { user_id: userId }
            });

            if (error) throw new Error(error.message || 'Error al iniciar la sincronización.');

            // Mostrar notificación de sincronización en progreso
            this.showSyncNotification('processing');

            // Iniciar polling para detectar cuando termine
            this.pollWizardSyncStatus();

        } catch (e) {
            console.error('Error al iniciar la sincronización desde el wizard:', e);
            window.showToast('No se pudo iniciar la sincronización: ' + e.message, 'error');
            button.disabled = false;
            button.innerHTML = originalHtml;
        }
    }

    showSyncNotification(status) {
        const step2 = document.getElementById('wizard-step-2');
        if (!step2) return;

        let notificationDiv = step2.querySelector('#wizard-sync-notification');
        if (!notificationDiv) {
            notificationDiv = document.createElement('div');
            notificationDiv.id = 'wizard-sync-notification';
            notificationDiv.className = 'mt-6';
            step2.appendChild(notificationDiv);
        }

        if (status === 'processing') {
            notificationDiv.innerHTML = `
                <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 animate-pulse">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <h4 class="font-bold text-blue-900 text-lg">Sincronizando contactos...</h4>
                    </div>
                    <p class="text-blue-700 text-sm">Esto puede tardar unos minutos. Estamos procesando tus contactos de WhatsApp.</p>
                </div>
            `;
        } else if (status === 'completed') {
            notificationDiv.innerHTML = `
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-green-900 text-xl">¡Sincronización Completada!</h4>
                            <p class="text-green-700 text-sm mt-1">Tus contactos están listos</p>
                        </div>
                    </div>
                    <button onclick="if(window.app?.wizard) window.app.wizard.changeStep(1)"
                        class="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                        <span>Continuar</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>
            `;
        }
    }

    pollWizardSyncStatus() {
        if (this.syncStatusInterval) {
            clearInterval(this.syncStatusInterval);
        }

        this.syncStatusInterval = setInterval(async () => {
            try {
                const { data, error } = await window.auth.sb
                    .from('profiles')
                    .select('sync_status')
                    .eq('id', this.app.user.id)
                    .single();

                if (error) throw error;

                const syncStatus = data?.sync_status;

                if (syncStatus === 'completed' || syncStatus === 'failed') {
                    clearInterval(this.syncStatusInterval);
                    this.syncStatusInterval = null;

                    // Reactivar botón
                    if (this.syncContactsBtn) {
                        this.syncContactsBtn.disabled = false;
                        this.syncContactsBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i><span>Sincronizar</span>`;
                        if (window.lucide) window.lucide.createIcons();
                    }

                    if (syncStatus === 'completed') {
                        this.showSyncNotification('completed');
                    }
                }
            } catch (e) {
                console.error('[WIZARD SYNC] Error checking sync status:', e);
                clearInterval(this.syncStatusInterval);
                this.syncStatusInterval = null;
            }
        }, 5000); // Check every 5 seconds
    }

}

/**
 * Renderiza el estado de la conexión de WhatsApp en uno o dos contenedores.
 * Siempre actualiza el contenedor principal del dashboard.
 * Opcionalmente, actualiza un segundo contenedor (ej. en un modal).
 * @param {string} status - 'initial', 'loading', 'qr', 'connected', 'error'.
 * @param {string|null} qrCodeBase64 - El código QR en base64 si el estado es 'qr'.
 * @param {string|null} secondaryContainerId - El ID de un segundo contenedor para actualizar.
 */
DashboardApp.prototype.renderWhatsappConnection = function (status, qrCodeBase64 = null, secondaryContainerId = null) {
    // CORRECCIÓN: Lógica de renderizado robusta para múltiples contenedores.
    const mainContainer = { el: document.getElementById('whatsapp-connection-container'), btn: document.getElementById('request-qr-btn') };
    const wizardContainer = { el: document.getElementById('wizard-qr-container'), btn: document.getElementById('wizard-request-qr-btn') };

    const containersToUpdate = [mainContainer];
    // Solo actualiza el contenedor del wizard si el modal está visible.
    if (wizardContainer.el && !document.getElementById('wizard-modal').classList.contains('hidden')) {
        containersToUpdate.push(wizardContainer);
    }

    containersToUpdate.forEach(container => {
        if (!container.el) return;
        let html = '';
        switch (status) {
            case 'connected':
                html = `<div class="flex flex-col items-center justify-center text-green-600 py-4"><i data-lucide="check-circle" class="w-16 h-16"></i><p class="font-bold mt-2">¡Conectado!</p></div>`;
                if (container.btn) container.btn.style.display = 'none';
                break;
            case 'loading':
                html = `<div class="flex justify-center items-center min-h-[200px]"><div class="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900"></div></div>`;
                if (container.btn) container.btn.style.display = 'block';
                break;
            case 'qr':
                html = `<img src="data:image/png;base64,${qrCodeBase64}" alt="Escanea para conectar WhatsApp" class="mx-auto max-w-full h-auto rounded-lg">`;
                if (container.btn) container.btn.style.display = 'block';
                break;
            case 'error':
                html = `<div class="flex flex-col items-center justify-center text-red-500 py-4"><i data-lucide="alert-triangle" class="w-16 h-16"></i><p class="font-bold mt-2">Error de Conexión</p></div>`;
                if (container.btn) container.btn.style.display = 'block';
                break;
            case 'initial':
            default:
                html = `<div class="flex flex-col items-center justify-center text-slate-400 py-4"><i data-lucide="qr-code" class="w-16 h-16"></i><p class="font-bold mt-2">Solicita el QR para vincular</p></div>`;
                if (container.btn) container.btn.style.display = 'block';
                break;
        }
        container.el.innerHTML = html;
    });
    lucide.createIcons();
}

DashboardApp.prototype.openPromptHistory = async function () {
    const modal = document.getElementById('prompt-history-modal');
    const listContainer = document.getElementById('prompt-history-list');
    if (!modal || !listContainer) return;

    modal.classList.remove('hidden');
    listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p class="text-slate-500 font-medium">Cargando tu historial...</p>
        </div>
    `;

    try {
        const userId = await window.getUserId();
        if (!userId) {
            listContainer.innerHTML = '<p class="text-center text-red-500 py-8">Error: No se pudo identificar al usuario</p>';
            return;
        }

        const { data: versions, error } = await auth.sb
            .from('prompt_versions')
            .select('*')
            .eq('user_id', userId)
            .order('version_number', { ascending: false });

        if (error) throw error;

        let versionList = versions || [];

        // Si no hay versiones pero hay contenido en la tabla prompts, crear la v1 automáticamente
        if (versionList.length === 0) {
            const { data: currentPromptData } = await auth.sb
                .from('prompts')
                .select('prompt_content')
                .eq('user_id', userId)
                .single();

            if (currentPromptData?.prompt_content) {
                listContainer.innerHTML = '<p class="text-center text-slate-500 py-4 italic">Creando versión inicial...</p>';
                await auth.sb.rpc('create_prompt_version', {
                    p_user_id: userId,
                    p_prompt_content: currentPromptData.prompt_content,
                    p_change_reason: 'Respaldo automático inicial'
                });

                // Fetch simple instead of recursive call
                const { data: retry } = await auth.sb
                    .from('prompt_versions')
                    .select('*')
                    .eq('user_id', userId)
                    .order('version_number', { ascending: false });

                if (retry && retry.length > 0) {
                    // Update versions and continue to normal rendering
                    versionList = retry;
                }
            }

            if (versionList.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-12">
                        <div class="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="history" class="w-8 h-8 text-slate-300"></i>
                        </div>
                        <p class="text-slate-500 font-medium">No hay versiones guardadas aún.</p>
                        <p class="text-xs text-slate-400 mt-1">Se crean cada vez que publicas un nuevo prompt oficial.</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons({ props: { element: listContainer } });
                return;
            }
        }


        listContainer.innerHTML = '';
        versionList.forEach(version => {
            const date = new Date(version.created_at);
            const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            const item = document.createElement('div');
            item.className = 'group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-200';
            item.innerHTML = `
                <div class="p-4 cursor-pointer flex items-center justify-between bg-slate-50/50 group-hover:bg-white transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <div class="flex items-center gap-4">
                        <div class="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg text-sm">v${version.version_number}</div>
                        <div>
                            <div class="text-sm font-bold text-slate-800">${formattedDate}</div>
                            ${version.change_reason ? `<div class="text-xs text-slate-500 line-clamp-1 italic">${escapeHtmlHelper(version.change_reason)}</div>` : '<div class="text-xs text-slate-400 italic font-mono">Sin descripción</div>'}
                        </div>
                    </div>
                    <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"></i>
                </div>
                <div class="hidden border-t border-slate-100 p-4 space-y-4">
                    <div class="relative">
                        <pre class="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-auto max-h-60 leading-relaxed">${escapeHtmlHelper(version.prompt_content)}</pre>
                        <button class="copy-ver-btn absolute top-2 right-2 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-md transition-all opacity-0 group-hover:opacity-100" title="Copiar contenido">
                            <i data-lucide="copy" class="w-3 h-3"></i>
                        </button>
                    </div>
                    <div class="flex gap-2">
                        <button class="restore-ver-btn flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Restaurar esta Versión
                        </button>
                        <button class="view-ver-btn flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2 rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm">
                            <i data-lucide="eye" class="w-4 h-4"></i> Usar en Editor
                        </button>
                    </div>
                </div>
            `;

            // Tooltips e iconos
            if (window.lucide) lucide.createIcons({ props: { element: item } });

            // Event Listeners
            item.querySelector('.copy-ver-btn').onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(version.prompt_content);
                window.showToast?.('Contenido copiado al portapapeles', 'info');
            };

            item.querySelector('.restore-ver-btn').onclick = (e) => {
                e.stopPropagation();
                this.restorePromptVersion(version);
            };

            item.querySelector('.view-ver-btn').onclick = (e) => {
                e.stopPropagation();
                const textarea = document.getElementById('ai-master-prompt') || document.getElementById('prompt-editor');
                if (textarea) {
                    textarea.value = version.prompt_content;
                    this.closePromptHistory();
                    window.showToast?.(`Contenido de v${version.version_number} cargado en el editor.`, 'info');
                    // Scroll al textarea si no es visible
                    textarea.scrollIntoView({ behavior: 'smooth' });
                }
            };

            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Error al cargar historial:', error);
        listContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-500"></i>
                </div>
                <p class="text-red-500 font-bold">Error al cargar historial</p>
                <p class="text-xs text-slate-400 mt-1">${error.message || 'Error de conexión'}</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons({ props: { element: listContainer } });
    }
};


DashboardApp.prototype.closePromptHistory = function () {
    const modal = document.getElementById('prompt-history-modal');
    if (modal) modal.classList.add('hidden');
};

DashboardApp.prototype.restorePromptVersion = async function (version) {
    if (!confirm(`¿Estás seguro de restaurar definitivamente la versión ${version.version_number}? Se publicará como el contenido oficial actual.`)) {
        return;
    }

    try {
        window.showToast?.('Restaurando versión...', 'info');

        // 1. Actualizar tabla prompts
        const { error: promptError } = await auth.sb
            .from('prompts')
            .upsert({
                user_id: this.user.id,
                prompt_content: version.prompt_content,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (promptError) throw promptError;

        // 2. Crear nueva entrada en el historial para esta restauración
        await auth.sb.rpc('create_prompt_version', {
            p_user_id: this.user.id,
            p_prompt_content: version.prompt_content,
            p_change_reason: `Restaurada versión v${version.version_number}`
        });

        // 3. Actualizar UI
        const mainTextarea = document.getElementById('ai-master-prompt');
        const trainingTextarea = document.getElementById('prompt-editor');

        if (mainTextarea) mainTextarea.value = version.prompt_content;
        if (trainingTextarea) trainingTextarea.value = version.prompt_content;

        this.closePromptHistory();
        window.showToast?.(`Versión v${version.version_number} restaurada y publicada con éxito.`, 'success');

        await this.updatePromptVersionIndicator();
        if (typeof updatePromptVersionIndicator === 'function') {
            await updatePromptVersionIndicator(this.user.id);
        }
    } catch (err) {
        console.error('Error al restaurar:', err);
        window.showToast?.('Error al restaurar la versión', 'error');
    }
};


function escapeHtmlHelper(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

