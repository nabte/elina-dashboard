// settings.js - Módulo para el panel de Configuración

(function () {
    let isInitialized = false;
    let userSupabaseClient = null; // Para guardar el cliente de Supabase autenticado
    let teamLabels = [];
    let unavailableDates = [];

    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'settings') {
            if (!isInitialized) {
                initSettingsPanel();
            }
        }
    });

    document.addEventListener('panel:loaded', ({ detail }) => {
        if (detail.panelId === 'settings' && !isInitialized) {
            initSettingsPanel();
        }
    });

    function initSettingsPanel() {
        // console.log('[Settings] Inicializando panel de Configuración...');
        isInitialized = true;
        userSupabaseClient = window.auth.sb; // CORRECCIÓN: La instancia del cliente está en window.auth.sb

        // Inicializar tabs - mostrar la primera tab por defecto
        setTimeout(() => {
            if (typeof window.switchSettingsTab === 'function') {
                window.switchSettingsTab('company');
            }
        }, 100);

        setupEventListeners();
        // Ahora fetchCompanySettings se encarga de mostrar/ocultar el panel de equipo
        fetchCompanySettings();
        initRemindersConfig(); // Inicializar configuración de recordatorios

        // Inicializar Base de Conocimiento (RAG)
        if (typeof window.loadKnowledgeFiles === 'function') {
            window.loadKnowledgeFiles();
        } else {
            // console.warn('[Settings] loadKnowledgeFiles no está disponible');
        }

        // CORRECCIÓN: Eliminados listeners fallback duplicados
        // El MutationObserver en setupEventListeners() maneja esto de forma más robusta
    }

    // Usar función global getUserId (definida en auth.js)
    async function resolveTargetUserId() {
        if (typeof window.getUserId === 'function') {
            return await window.getUserId();
        }
        // console.warn('[Settings] window.getUserId no está disponible');
        return null;
    }

    function setupEventListeners() {
        // IMPORTANTE: El listener del formulario de settings debe ejecutarse DESPUÉS
        // del listener del botón de invitación, por eso lo configuramos con capture: false
        // (por defecto) para que el listener del botón (con capture: true) tenga prioridad
        document.getElementById('settings-form')?.addEventListener('submit', handleSettingsSave, { capture: false });
        document.getElementById('settings-save-safe-btn')?.addEventListener('click', handleSecondarySaveClick);

        // Listeners para la sección de branding
        document.getElementById('upload-logo-btn')?.addEventListener('click', () => document.getElementById('logo-input').click());
        document.getElementById('logo-input')?.addEventListener('change', (e) => previewLogo(e.target.files[0]));

        // Listeners para QR de pago
        document.getElementById('upload-payment-qr-btn')?.addEventListener('click', () => document.getElementById('payment-qr-input').click());
        document.getElementById('payment-qr-input')?.addEventListener('change', (e) => previewPaymentQR(e.target.files[0]));

        const refImageInput = document.getElementById('reference-image-input');
        refImageInput?.addEventListener('change', (e) => handleNewReferenceImage(e.target.files));

        // Listener para el nuevo slot de "añadir imagen"
        document.getElementById('add-ref-image-slot')?.addEventListener('click', () => refImageInput.click());

        const refContainer = document.getElementById('reference-images-container');
        refContainer?.addEventListener('click', (e) => {
            if (e.target.closest('.delete-ref-image-btn')) {
                handleDeleteReferenceImage(e.target.closest('.delete-ref-image-btn'));
            } else if (e.target.closest('#add-ref-image-slot')) {
                // El listener de arriba ya se encarga de esto, aquí no hacemos nada
            } else if (!e.target.closest('.ref-image-item')) { // Clic en el fondo (ya no es necesario)
                if (refContainer.querySelectorAll('.ref-image-item').length < 3) refImageInput.click();
            }
        });

        // --- INICIO: Listeners para Gestión de Equipo ---
        // IMPORTANTE: El formulario de invitación está dentro del formulario de settings
        // Necesitamos interceptar el evento ANTES de que llegue al formulario padre

        const inviteBtn = document.getElementById('invite-member-btn');
        const inviteForm = document.getElementById('invite-member-form');

        // Función helper para configurar el listener del botón con máxima prioridad
        const setupInviteButtonListener = (button, source = 'initial') => {
            if (!button) {
                // console.warn(`[Settings] Botón #invite-member-btn no encontrado (${source})`);
                return false;
            }

            // Remover listeners anteriores si existen (marcar para evitar duplicados)
            if (button.hasAttribute('data-invite-listener-attached')) {
                // console.log(`[Settings] Listener ya está adjunto al botón (${source}), omitiendo...`);
                return true;
            }

            // console.log(`[Settings] ✓ Configurando listener de botón de invitación (${source})`);

            // Usar capture: true y once: false para interceptar ANTES que otros listeners
            const clickHandler = async (e) => {
                // console.log('[Settings] ========== BOTÓN DE INVITAR CLICKEADO ==========');
                // console.log('[Settings] Evento capturado:', {
                //     target: e.target.id,
                //     currentTarget: e.currentTarget.id,
                //     type: e.type,
                //     bubbles: e.bubbles
                // });

                // Detener propagación INMEDIATAMENTE
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                // Verificar que no se propague al formulario padre
                const form = document.getElementById('invite-member-form');
                if (form) {
                    const parentForm = form.closest('form');
                    if (parentForm && parentForm !== form) {
                        // console.warn('[Settings] Formulario de invitación está dentro de otro formulario. Previniendo submit del padre.');
                        // Prevenir submit del formulario padre también
                        const parentSubmitEvent = new Event('submit', { bubbles: false, cancelable: true });
                        parentForm.dispatchEvent(parentSubmitEvent);
                        if (parentSubmitEvent.defaultPrevented) {
                            // console.log('[Settings] Submit del formulario padre prevenido');
                        }
                    }
                }

                // Ejecutar la función de invitación
                await handleInviteMember();
            };

            // Agregar listener con capture: true para máxima prioridad
            button.addEventListener('click', clickHandler, {
                capture: true,  // Interceptar en la fase de captura (antes de otros listeners)
                passive: false  // Permitir preventDefault
            });

            button.setAttribute('data-invite-listener-attached', 'true');
            // console.log(`[Settings] ✓ Listener adjunto exitosamente (${source})`);

            return true;
        };

        // Configurar listener inicial
        if (!setupInviteButtonListener(inviteBtn, 'initial')) {
            // CORRECCIÓN: Usar MutationObserver en lugar de múltiples setTimeout
            // Esto evita listeners duplicados y es más confiable
            // console.log('[Settings] Botón no encontrado, configurando MutationObserver...');

            const observer = new MutationObserver((mutations, obs) => {
                const delayedInviteButton = document.getElementById('invite-member-btn');
                if (delayedInviteButton && !delayedInviteButton.hasAttribute('data-invite-listener-attached')) {
                    // console.log('[Settings] Botón detectado por MutationObserver');
                    if (setupInviteButtonListener(delayedInviteButton, 'mutation-observer')) {
                        obs.disconnect(); // Dejar de observar después de configurar exitosamente
                    }
                }
            });

            // Observar cambios en el DOM
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Timeout de seguridad: desconectar observer después de 5 segundos
            setTimeout(() => {
                observer.disconnect();
                // console.log('[Settings] MutationObserver desconectado por timeout');
            }, 5000);
        }

        // Prevenir submit del formulario de invitación
        if (inviteForm) {
            inviteForm.addEventListener('submit', (e) => {
                // console.log('[Settings] ⚠️ Formulario de invitar SUBMITTED (prevenido)');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                // No llamar handleInviteMember aquí para evitar doble ejecución
                // El botón ya maneja el click
            }, { capture: true, passive: false });

            // Prevenir que Enter en el input de email haga submit del formulario padre
            const emailInput = document.getElementById('invite-email');
            if (emailInput) {
                emailInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // console.log('[Settings] Enter presionado en input de email');
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        // Llamar handleInviteMember directamente
                        handleInviteMember();
                    }
                }, { capture: true });
            }
        } else {
            // console.warn('[Settings] Formulario #invite-member-form no encontrado al configurar listeners.');
        }

        // Listener para los toggles de permisos
        document.getElementById('team-members-list')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('permission-toggle')) {
                handlePermissionChange(e.target);
            } else if (e.target.classList.contains('label-filter-select')) {
                handleLabelFilterChange(e.target);
            }
        });

        // --- INICIO: Listeners para Sistema de Citas ---
        const appointmentsEnabled = document.getElementById('appointments-enabled');
        const appointmentsEnabledGeneral = document.getElementById('appointments-enabled-general');

        // console.log('[Settings] Inicializando listeners de citas:');
        // console.log('[Settings] - appointments-enabled encontrado:', !!appointmentsEnabled);
        // console.log('[Settings] - appointments-enabled-general encontrado:', !!appointmentsEnabledGeneral);

        // Sincronizar toggles entre Funcionalidades y Sistema de Citas
        const syncAppointmentsToggles = (source, target) => {
            if (source && target && source.checked !== target.checked) {
                target.checked = source.checked;
            }
        };

        appointmentsEnabled?.addEventListener('change', async (e) => {
            // console.log('[Settings] Toggle de citas cambiado:', e.target.checked);
            syncAppointmentsToggles(e.target, appointmentsEnabledGeneral);
            // Actualizar visibilidad del menú lateral
            updateAppointmentsMenuVisibility(e.target.checked);

            // Si se activa, cargar horarios y crear por defecto si no existen
            if (e.target.checked) {
                const userId = await resolveTargetUserId();
                if (userId) {
                    await initializeDefaultHours(userId);
                    await loadAppointmentHours(userId);
                }
            }
        });

        appointmentsEnabledGeneral?.addEventListener('change', async (e) => {
            // console.log('[Settings] Toggle general de citas cambiado:', e.target.checked);
            syncAppointmentsToggles(e.target, appointmentsEnabled);
            // Actualizar visibilidad del menú lateral
            updateAppointmentsMenuVisibility(e.target.checked);

            // Si se activa, cargar horarios y crear por defecto si no existen
            if (e.target.checked) {
                const userId = await resolveTargetUserId();
                if (userId) {
                    await initializeDefaultHours(userId);
                    await loadAppointmentHours(userId);
                }
            }
        });

        // Función para actualizar visibilidad del menú lateral
        function updateAppointmentsMenuVisibility(isEnabled) {
            const menuItem = document.getElementById('appointments-menu-item');
            if (menuItem) {
                if (isEnabled) {
                    menuItem.classList.remove('hidden');
                } else {
                    menuItem.classList.add('hidden');
                    // Si el panel de citas está activo, cambiar al dashboard
                    const activePanel = document.querySelector('.content-panel.active');
                    if (activePanel && activePanel.id === 'appointments') {
                        const dashboardLink = document.querySelector('[data-target="dashboard"]');
                        if (dashboardLink) {
                            dashboardLink.click();
                        }
                    }
                }
            }
        }

        // Exponer función globalmente para uso desde otros módulos
        window.updateAppointmentsMenuVisibility = updateAppointmentsMenuVisibility;

        // Listener para toggle de recordatorios
        const remindersEnabled = document.getElementById('reminders-enabled');
        remindersEnabled?.addEventListener('change', (e) => {
            const remindersConfig = document.getElementById('reminders-config');
            if (remindersConfig) {
                remindersConfig.classList.toggle('hidden', !e.target.checked);
            }
        });

        // Listener para toggle de recordatorio días antes
        const reminderDaysEnabled = document.getElementById('reminder-days-enabled');
        reminderDaysEnabled?.addEventListener('change', (e) => {
            if (reminderDaysConfig) {
                reminderDaysConfig.classList.toggle('hidden', !e.target.checked);
            }
        });

        // Listener para toggle de resumen diario
        const dailySummaryEnabled = document.getElementById('daily-summary-enabled');
        dailySummaryEnabled?.addEventListener('change', (e) => {
            const configDiv = document.getElementById('daily-summary-config');
            if (configDiv) {
                configDiv.classList.toggle('hidden', !e.target.checked);
            }
        });

        // --- INICIO: Listeners para Voz de la IA (TTS) ---
        // Listener eliminado porque la voz siempre está activa
        /*
        const ttsEnabled = document.getElementById('tts-enabled');
        ttsEnabled?.addEventListener('change', (e) => {
            const configDiv = document.getElementById('tts-config');
            if (configDiv) {
                configDiv.classList.toggle('hidden', !e.target.checked);
            }
            if (e.target.checked) {
                loadVoicesFromServer();
            }
        });
        */

        document.getElementById('play-voice-preview')?.addEventListener('click', () => {
            const voiceSelect = document.getElementById('tts-voice');
            const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
            const previewUrl = selectedOption.dataset.preview;
            if (previewUrl) {
                const audio = new Audio(previewUrl);
                audio.play();
            } else {
                window.showToast?.('Esta voz no tiene vista previa disponible.', 'warning');
            }
        });
        // --- FIN: Listeners para Voz de la IA (TTS) ---

        document.getElementById('add-appointment-type-btn')?.addEventListener('click', () => {
            handleAddAppointmentType();
        });

        // Delegación de eventos para tipos de citas y horarios
        document.getElementById('appointment-types-container')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-appointment-type-btn')) {
                handleDeleteAppointmentType(e.target.closest('.appointment-type-item'));
            }
        });

        // Listener for Unavailable Dates
        document.getElementById('add-unavailable-date-btn')?.addEventListener('click', handleAddUnavailableDate);
        document.getElementById('unavailable-dates-list')?.addEventListener('click', (e) => {
            if (e.target.closest('.delete-unavailable-date-btn')) {
                const badge = e.target.closest('.unavailable-date-badge');
                if (badge) handleDeleteUnavailableDate(badge.dataset.date);
            }
        });
        // --- FIN: Listeners para Sistema de Citas ---
        // --- INICIO: Listeners para Slugs ---
        const companyNameInput = document.getElementById('company-name');
        const companySlugInput = document.getElementById('company-slug');
        let isSlugManuallyEdited = false;

        companySlugInput?.addEventListener('input', (e) => {
            isSlugManuallyEdited = true;
            handleSlugChange(e.target.value);
        });

        companyNameInput?.addEventListener('input', (e) => {
            // Solo auto-generar si el slug está vacío o no ha sido editado manualmente de forma crítica
            if (!isSlugManuallyEdited || !companySlugInput.value) {
                const suggestedSlug = generateSlug(e.target.value);
                if (companySlugInput) {
                    companySlugInput.value = suggestedSlug;
                    handleSlugChange(suggestedSlug);
                }
            }
        });
        // --- FIN: Listeners para Slugs ---
    }

    async function fetchCompanySettings() {
        try {
            // --- INICIO: CORRECCIÓN para cargar datos del usuario correcto (actual o suplantado) ---
            const targetUserId = await resolveTargetUserId();
            if (!targetUserId) throw new Error('No se pudo determinar el usuario para cargar la configuracion.');

            // Cargar datos de profiles
            // Intentar incluir quotes_enabled, pero manejar el caso cuando la columna no existe
            let { data, error } = await userSupabaseClient
                .from('profiles')
                .select('work_start_hour, work_end_hour, company_description, website, social_media, branding_settings, contact_phone, business_address, business_phone, pickup_location, has_shipping_system, organization_id, quotes_enabled, daily_summary_enabled, daily_summary_time, pending_tasks_reminder_enabled, slug, automation_settings, payment_info')
                .eq('id', targetUserId)
                .single();

            // Si el error es que la columna quotes_enabled no existe (42703 o PGRST204), intentar sin esa columna
            if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                // console.warn('[Settings] quotes_enabled no existe en la base de datos, usando valor por defecto (false)');
                const { data: dataWithoutQuotes, error: errorWithoutQuotes } = await userSupabaseClient
                    .from('profiles')
                    .select('work_start_hour, work_end_hour, company_description, website, social_media, branding_settings, contact_phone, business_address, business_phone, pickup_location, has_shipping_system, organization_id, slug, daily_summary_enabled, daily_summary_time, pending_tasks_reminder_enabled, payment_info')
                    .eq('id', targetUserId)
                    .single();

                if (errorWithoutQuotes && errorWithoutQuotes.code !== 'PGRST116') throw errorWithoutQuotes;
                data = dataWithoutQuotes;
                error = null;
            } else if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!data) return;

            // Obtener quotes_enabled (puede ser null si la columna no existe en versiones antiguas)
            const quotesEnabled = data.quotes_enabled || false;

            // Cargar datos de organization (nombre de empresa)
            if (data.organization_id) {
                const { data: orgData, error: orgError } = await userSupabaseClient
                    .from('organizations')
                    .select('name')
                    .eq('id', data.organization_id)
                    .single();

                if (!orgError && orgData && orgData.name) {
                    const companyNameInput = document.getElementById('company-name');
                    if (companyNameInput) {
                        companyNameInput.value = orgData.name;
                    }
                }
            }

            // Cargar Slug
            if (data.slug) {
                const slugInput = document.getElementById('company-slug');
                if (slugInput) slugInput.value = data.slug;
            }

            // Rellenar el formulario con los datos guardados
            const workStartEl = document.getElementById('work-start-hour');
            const workEndEl = document.getElementById('work-end-hour');
            const companyDescEl = document.getElementById('company-description');
            const websiteEl = document.getElementById('website');

            if (workStartEl && data.work_start_hour) workStartEl.value = `${String(data.work_start_hour).padStart(2, '0')}:00`;
            if (workEndEl && data.work_end_hour) workEndEl.value = `${String(data.work_end_hour).padStart(2, '0')}:00`;
            if (companyDescEl && data.company_description) companyDescEl.value = data.company_description;
            if (websiteEl && data.website) websiteEl.value = data.website;

            // Toggle de cotizaciones
            const quotesEnabledInput = document.getElementById('quotes-enabled');
            if (quotesEnabledInput) {
                quotesEnabledInput.checked = quotesEnabled;
            }
            if (data.social_media) {
                const instagramEl = document.getElementById('social-instagram');
                const facebookEl = document.getElementById('social-facebook');
                const mapsLinkEl = document.getElementById('business-maps-link');
                if (instagramEl) instagramEl.value = data.social_media.instagram || '';
                if (facebookEl) facebookEl.value = data.social_media.facebook || '';
                if (mapsLinkEl) mapsLinkEl.value = data.social_media.maps_link || '';
            }
            // --- INICIO: CORRECCIÓN para usar un campo de texto simple para el teléfono ---
            const phoneInput = document.getElementById('admin-phone-input');
            const countrySelect = document.getElementById('admin-phone-country-code');

            if (phoneInput && data.contact_phone) {
                // Intentar separar el código de país
                let phone = data.contact_phone.replace('+', '');
                let countryFound = false;

                // Lista de prefijos soportados (la misma que en el HTML)
                const prefixes = ['52', '1', '34', '57', '54', '56', '51'];

                // Casos especiales para México (521 -> visualmente mostramos sin el 1 pero guardamos con él)
                // O mejor, mostramos como está guardado pero el select en 52.
                // Si el número es +521XXXXXXXXXX, mostramos XXXXXXXXXX y select MX.
                if (phone.startsWith('521') && phone.length > 3) {
                    if (countrySelect) countrySelect.value = '52';
                    phoneInput.value = phone.substring(3); // Quitar 521
                    countryFound = true;
                } else {
                    for (const prefix of prefixes) {
                        if (phone.startsWith(prefix)) {
                            if (countrySelect) countrySelect.value = prefix;
                            phoneInput.value = phone.substring(prefix.length);
                            countryFound = true;
                            break;
                        }
                    }
                }

                // Si no coincide con ningún prefijo conocido, poner todo en el input
                if (!countryFound) {
                    phoneInput.value = data.contact_phone;
                }
            }
            // --- FIN: CORRECCIÓN ---

            // Cargar datos del negocio
            const businessAddressEl = document.getElementById('business-address');
            const pickupLocationEl = document.getElementById('pickup-location');
            if (businessAddressEl && data.business_address) businessAddressEl.value = data.business_address;
            if (pickupLocationEl && data.pickup_location) pickupLocationEl.value = data.pickup_location;

            // Cargar business phone con código de país
            const businessPhoneInput = document.getElementById('business-phone-input');
            const businessCountrySelect = document.getElementById('business-phone-country-code');

            if (businessPhoneInput && data.business_phone) {
                // Intentar separar el código de país
                let phone = data.business_phone.replace('+', '');
                let countryFound = false;

                // Lista de prefijos soportados
                const prefixes = ['52', '1', '34', '57', '54', '56', '51'];

                // Caso especial para México (521 -> mostrar sin el 1)
                for (const prefix of prefixes) {
                    if (prefix === '52' && phone.startsWith('521')) {
                        if (businessCountrySelect) businessCountrySelect.value = '52';
                        businessPhoneInput.value = phone.substring(3); // Sin 521
                        countryFound = true;
                        break;
                    } else if (phone.startsWith(prefix)) {
                        if (businessCountrySelect) businessCountrySelect.value = prefix;
                        businessPhoneInput.value = phone.substring(prefix.length);
                        countryFound = true;
                        break;
                    }
                }

                if (!countryFound) {
                    // No se encontró prefijo conocido, mostrar todo en el input
                    businessPhoneInput.value = phone;
                }
            }
            const hasShippingSystem = document.getElementById('has-shipping-system');
            if (hasShippingSystem) hasShippingSystem.checked = data.has_shipping_system || false;

            // Cargar Configuración de Asistente
            const dailySummaryEnabledInput = document.getElementById('daily-summary-enabled');
            if (dailySummaryEnabledInput) {
                dailySummaryEnabledInput.checked = data.daily_summary_enabled || false;
                // Disparar evento para actualizar visibilidad
                dailySummaryEnabledInput.dispatchEvent(new Event('change'));
            }

            // CORRECCIÓN: Verificar existencia antes de asignar
            const dailySummaryTimeInput = document.getElementById('daily-summary-time');
            if (dailySummaryTimeInput && data.daily_summary_time) {
                dailySummaryTimeInput.value = data.daily_summary_time;
            }

            const pendingTasksReminderEnabledInput = document.getElementById('pending-tasks-reminder-enabled');
            if (pendingTasksReminderEnabledInput) pendingTasksReminderEnabledInput.checked = data.pending_tasks_reminder_enabled || false;

            // Cargar branding
            const logoPreviewEl = document.getElementById('logo-preview');
            if (logoPreviewEl && data.branding_settings?.logo_url) logoPreviewEl.src = data.branding_settings.logo_url;
            if (data.branding_settings?.colors) {
                data.branding_settings.colors.forEach((c, i) => {
                    const colorEl = document.getElementById(`brand-color-${i + 1}`);
                    if (colorEl) colorEl.value = c;
                });
            }
            if (data.branding_settings?.reference_images) {
                renderReferenceImages(data.branding_settings.reference_images);
            }

            // Cargar información de pago
            if (data.payment_info) {
                const paymentInfo = typeof data.payment_info === 'string' ? JSON.parse(data.payment_info) : data.payment_info;
                const bankNameEl = document.getElementById('payment-bank-name');
                const bankAccountEl = document.getElementById('payment-bank-account');
                const accountHolderEl = document.getElementById('payment-account-holder');
                const clabeEl = document.getElementById('payment-clabe');
                const paypalEmailEl = document.getElementById('payment-paypal-email');
                const qrPreviewEl = document.getElementById('payment-qr-preview');
                const businessNameEl = document.getElementById('payment-business-name');

                if (bankNameEl && paymentInfo.bank_name) bankNameEl.value = paymentInfo.bank_name;
                if (bankAccountEl && paymentInfo.bank_account) bankAccountEl.value = paymentInfo.bank_account;
                if (accountHolderEl && paymentInfo.account_holder) accountHolderEl.value = paymentInfo.account_holder;
                if (clabeEl && paymentInfo.clabe) clabeEl.value = paymentInfo.clabe;
                if (paypalEmailEl && paymentInfo.paypal_email) paypalEmailEl.value = paymentInfo.paypal_email;
                if (qrPreviewEl && paymentInfo.qr_code_url) qrPreviewEl.src = paymentInfo.qr_code_url;
                if (businessNameEl && paymentInfo.business_name) businessNameEl.value = paymentInfo.business_name;
            }

            // Cargar configuración de TTS
            // Siempre cargar las voces ya que ahora es siempre activo
            if (data.automation_settings) {
                await loadVoicesFromServer(data.automation_settings.ttsVoice);
            } else {
                await loadVoicesFromServer();
            }     // Cargar etiquetas a ignorar
            if (data.automation_settings) {
                // Cargar categoría de negocio
                const businessCategoryInput = document.getElementById('business-category');
                if (businessCategoryInput && data.automation_settings.businessCategory) {
                    businessCategoryInput.value = data.automation_settings.businessCategory;
                }

                // Cargar tipo de negocio
                const businessTypeInput = document.getElementById('business-type');
                if (businessTypeInput && data.automation_settings.businessType) {
                    businessTypeInput.value = data.automation_settings.businessType;
                }
            }

            // --- INICIO: Lógica para mostrar el panel de equipo ---
            const teamInfo = window.appInstance?.teamInfo; // Usamos la info ya cargada
            await renderTeamManagementPanel(teamInfo); // CORRECCIÓN: Esperar a que el panel se renderice
            // --- FIN: Lógica para mostrar el panel de equipo ---

            // --- INICIO: Cargar configuración de citas ---
            await loadAppointmentSettings(targetUserId);
            // --- FIN: Cargar configuración de citas ---
        } catch (error) {
            console.error('Error al cargar la configuración de la empresa:', error);
        }
    }

    async function handleSettingsSave(e) {
        // Ignorar si el evento viene del formulario de invitación
        const inviteForm = document.getElementById('invite-member-form');
        if (inviteForm && (e.target === inviteForm || inviteForm.contains(e.target))) {
            // console.log('[Settings] Submit del formulario de invitación ignorado en handleSettingsSave');
            return;
        }

        // Ignorar si el botón clickeado es el de invitar
        const clickedButton = e.submitter || (e.target && e.target.closest('button'));
        if (clickedButton && clickedButton.id === 'invite-member-btn') {
            // console.log('[Settings] Click en botón de invitar ignorado en handleSettingsSave');
            return;
        }

        e.preventDefault();
        const form = e.target;
        const button = form.querySelector('button[data-settings-primary]') || form.querySelector('button[type="submit"]');
        await performSettingsSave(button);
    }

    // --- Lógica de Configuración de Recordatorios ---
    function initRemindersConfig() {
        // console.log('[Settings] Inicializando configuración de recordatorios...');
        const openBtn = document.getElementById('open-reminders-config-btn');
        const modal = document.getElementById('reminders-config-modal');
        const closeBtn = document.getElementById('close-reminders-config-btn');
        const cancelBtn = document.getElementById('cancel-reminders-config-btn');
        const saveBtn = document.getElementById('save-reminders-config-btn');

        if (openBtn) {
            // console.log('[Settings] Botón de recordatorios encontrado, adjuntando listener.');
            // Eliminar listener previo para evitar duplicados si se reinicializa
            const newBtn = openBtn.cloneNode(true);
            openBtn.parentNode.replaceChild(newBtn, openBtn);

            newBtn.addEventListener('click', (e) => {
                // console.log('[Settings] Click en botón de recordatorios');
                e.preventDefault();
                openRemindersModal();
            });
        } else {
            // console.warn('[Settings] Botón #open-reminders-config-btn NO encontrado en el DOM.');
        }

        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        if (saveBtn) saveBtn.addEventListener('click', saveRemindersConfig);
    }

    async function openRemindersModal() {
        // console.log('[Settings] Abriendo modal de recordatorios...');
        const modal = document.getElementById('reminders-config-modal');
        if (!modal) {
            console.error('[Settings] Modal #reminders-config-modal NO encontrado.');
            return;
        }

        modal.classList.remove('hidden');
        // Cargar configuración actual
        const userId = await resolveTargetUserId();
        // console.log('[Settings] Usuario objetivo para recordatorios:', userId);
        if (userId) {
            await loadRemindersConfig(userId);
        } else {
            // console.warn('[Settings] No se pudo resolver el usuario para cargar configuraciones.');
        }
    }

    async function loadRemindersConfig(userId) {
        try {
            const { data, error } = await window.auth.sb
                .from('user_settings')
                .select('reminder_preferences')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading reminders config:', error);
                return;
            }

            const prefs = data?.reminder_preferences || { '48h': true, '24h': true, '2h': true }; // Default values

            document.getElementById('reminder-48h').checked = prefs['48h'] !== false;
            document.getElementById('reminder-24h').checked = prefs['24h'] !== false;
            document.getElementById('reminder-2h').checked = prefs['2h'] !== false;

        } catch (err) {
            console.error('Unexpected error loading reminders:', err);
        }
    }

    async function saveRemindersConfig() {
        const userId = await resolveTargetUserId();
        if (!userId) return;

        const saveBtn = document.getElementById('save-reminders-config-btn');
        const statusDiv = document.getElementById('reminders-save-status');

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
        statusDiv.textContent = '';

        const prefs = {
            '48h': document.getElementById('reminder-48h').checked,
            '24h': document.getElementById('reminder-24h').checked,
            '2h': document.getElementById('reminder-2h').checked
        };

        try {
            // Upsert user_settings
            const { error } = await window.auth.sb
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    reminder_preferences: prefs,
                    updated_at: new Date()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            statusDiv.textContent = '¡Preferencias guardadas!';
            statusDiv.classList.add('text-green-600');
            setTimeout(() => {
                document.getElementById('reminders-config-modal').classList.add('hidden');
                statusDiv.textContent = '';
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Preferencias';
            }, 1500);

        } catch (err) {
            console.error('Error saving reminders:', err);
            statusDiv.textContent = 'Error al guardar.';
            statusDiv.classList.add('text-red-600');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Preferencias';
        }
    }

    async function handleSecondarySaveClick(e) {
        e.preventDefault();
        const button = e.currentTarget;
        // console.log('[Settings] Boton "Guardar Seguro" presionado.');
        await performSettingsSave(button, {
            toastMessage: 'Guardando configuracion (modo seguro)...'
        });
    }

    async function performSettingsSave(button, options = {}) {
        const form = document.getElementById('settings-form');
        if (!form) {
            // console.warn('[Settings] No se encontro el formulario de configuracion.');
            return;
        }

        const targetButton = button || form.querySelector('button[type="submit"]');
        if (!targetButton) {
            // console.warn('[Settings] No se encontro el boton de guardado.');
            return;
        }

        const {
            loadingLabel = 'Guardando...',
            restoreLabel = targetButton.dataset.originalLabel || targetButton.textContent || 'Guardar Configuracion',
            toastMessage = 'Guardando configuracion...'
        } = options;

        window.showToast(toastMessage, 'info', 2000);
        targetButton.dataset.originalLabel = restoreLabel;
        targetButton.disabled = true;
        targetButton.textContent = loadingLabel;

        try {
            // console.log('[Settings] Iniciando guardado...');

            // Obtener targetUserId primero, antes de usarlo en cualquier lógica
            const targetUserId = await resolveTargetUserId();
            if (!targetUserId) {
                console.error('[Settings] Error: no se pudo determinar el usuario objetivo.');
                throw new Error('No se pudo determinar el usuario objetivo para guardar la configuracion.');
            }

            // Manejar logo con verificación de null
            const logoInput = document.getElementById('logo-input');
            const logoPreview = document.getElementById('logo-preview');
            const logoFile = logoInput?.files?.[0];
            let logoUrl = logoPreview?.src?.startsWith('https') ? logoPreview.src : null;
            if (logoFile) {
                if (!window.appInstance) throw new Error('La instancia de la aplicacion no esta lista.');
                logoUrl = await window.appInstance.uploadAsset(logoFile, 'logos');
            }
            // console.log('[Settings] URL del logo:', logoUrl);

            // Manejar QR de pago con verificación de null
            const paymentQRInput = document.getElementById('payment-qr-input');
            const paymentQRPreview = document.getElementById('payment-qr-preview');
            const paymentQRFile = paymentQRInput?.files?.[0];
            let paymentQRUrl = paymentQRPreview?.src?.startsWith('https') ? paymentQRPreview.src : null;
            if (paymentQRFile) {
                if (!window.appInstance) throw new Error('La instancia de la aplicacion no esta lista.');
                paymentQRUrl = await window.appInstance.uploadAsset(paymentQRFile, 'payment_qr');
            }
            // console.log('[Settings] URL del QR de pago:', paymentQRUrl);

            // Manejar imágenes de referencia con verificación de null
            const refImagesContainer = document.querySelector('#reference-images-container');
            const existingImageUrls = refImagesContainer
                ? Array.from(refImagesContainer.querySelectorAll('.ref-image-item img'))
                    .map(img => img.src.split('?')[0])
                : [];

            const refImageInput = document.getElementById('reference-image-input');
            const newRefFiles = refImageInput?.files || [];
            const uploadPromises = Array.from(newRefFiles).map(file => window.appInstance.uploadAsset(file, 'reference_images'));
            const newUrls = await Promise.all(uploadPromises);
            const referenceImageUrls = [...existingImageUrls, ...newUrls.filter(Boolean)];
            // console.log('[Settings] URLs de referencia:', referenceImageUrls);

            // Manejar branding settings con verificación de null
            const brandFont = document.getElementById('brand-font');
            const brandingSettings = {
                logo_url: logoUrl,
                colors: Array.from({ length: 4 }, (_, i) => {
                    const colorInput = document.getElementById(`brand-color-${i + 1}`);
                    return colorInput?.value || '#000000';
                }),
                font: brandFont?.value || 'Arial',
                reference_images: referenceImageUrls.slice(0, 3)
            };
            // console.log('[Settings] Datos de branding:', brandingSettings);

            // Manejar automation settings
            const ttsEnabledInput = document.getElementById('tts-enabled');
            const ttsVoiceSelect = document.getElementById('tts-voice');

            // Cargar configuración actual para no perder otros campos de automation_settings
            const { data: profileForAutomation } = await userSupabaseClient
                .from('profiles')
                .select('automation_settings')
                .eq('id', targetUserId)
                .single();

            const currentAutomationSettings = profileForAutomation?.automation_settings || {};



            const businessCategoryInput = document.getElementById('business-category');
            const businessCategory = businessCategoryInput?.value?.trim() || '';

            const businessTypeInput = document.getElementById('business-type');
            const businessType = businessTypeInput?.value || 'services';

            const automationSettings = {
                ...currentAutomationSettings,
                ttsEnabled: true, // Siempre activo
                ttsVoice: ttsVoiceSelect?.value || '86V9x9hrQds83qf7zaGn',
                businessCategory: businessCategory,
                businessType: businessType
            };
            // console.log('[Settings] Datos de automatización:', automationSettings);

            // Manejar campos de configuración con verificación de null
            const workStartHour = document.getElementById('work-start-hour');
            const workEndHour = document.getElementById('work-end-hour');
            const companyDescription = document.getElementById('company-description');
            const website = document.getElementById('website');
            const socialInstagram = document.getElementById('social-instagram');
            const socialFacebook = document.getElementById('social-facebook');
            const businessMapsLink = document.getElementById('business-maps-link');
            const adminPhoneInput = document.getElementById('admin-phone-input');
            const countrySelect = document.getElementById('admin-phone-country-code');
            let fullPhone = '';

            if (adminPhoneInput && adminPhoneInput.value.trim()) {
                const countryCode = countrySelect ? countrySelect.value : '52';
                let localNumber = adminPhoneInput.value.replace(/\D/g, ''); // Solo números

                // Formato especial para México: +52 + 1 + 10 dígitos (celular)
                if (countryCode === '52' && localNumber.length === 10) {
                    fullPhone = `+521${localNumber}`;
                } else if (countryCode === '52' && localNumber.length === 12 && localNumber.startsWith('52')) {
                    fullPhone = `+521${localNumber.substring(2)}`;
                } else {
                    fullPhone = `+${countryCode}${localNumber}`;
                }
            }

            const businessAddress = document.getElementById('business-address');

            // Manejar business phone con código de país
            const businessPhoneInput = document.getElementById('business-phone-input');
            const businessCountrySelect = document.getElementById('business-phone-country-code');
            let fullBusinessPhone = '';

            if (businessPhoneInput && businessPhoneInput.value.trim()) {
                const countryCode = businessCountrySelect ? businessCountrySelect.value : '52';
                let localNumber = businessPhoneInput.value.replace(/\D/g, ''); // Solo números

                // Formato especial para México: +52 + 1 + 10 dígitos (celular)
                if (countryCode === '52' && localNumber.length === 10) {
                    fullBusinessPhone = `+521${localNumber}`;
                } else if (countryCode === '52' && localNumber.length === 12 && localNumber.startsWith('52')) {
                    fullBusinessPhone = `+521${localNumber.substring(2)}`;
                } else {
                    fullBusinessPhone = `+${countryCode}${localNumber}`;
                }
            }

            // ... (resto de declaraciones) ...
            const pickupLocation = document.getElementById('pickup-location');
            const hasShippingSystem = document.getElementById('has-shipping-system');
            const companySlugInput = document.getElementById('company-slug');

            const dailySummaryEnabled = document.getElementById('daily-summary-enabled');
            const dailySummaryTime = document.getElementById('daily-summary-time');
            const pendingTasksReminderEnabled = document.getElementById('pending-tasks-reminder-enabled');

            const startHourInput = workStartHour?.value || '';
            const endHourInput = workEndHour?.value || '';
            const adminPhoneNumber = fullPhone || null;

            // --- AUTO-IGNORE LOGIC ---
            if (fullPhone) {
                try {
                    console.log(`[Automation] Verificando contacto de administración ${fullPhone}...`);
                    // Normalizar para búsqueda (sin +)
                    const waPhone = fullPhone.replace('+', '');

                    // Buscar o crear contacto
                    // Nota: No podemos usar await dentro de esta funcion si queremos que sea rapida, 
                    // pero es importante asegurar que se marque. Lo haremos asíncrono sin bloquear UI excesivamente.
                    (async () => {
                        try {
                            const { data: existingContact } = await window.auth.sb
                                .from('contacts')
                                .select('id, labels')
                                .eq('user_id', targetUserId)
                                .or(`phone_number.eq.${fullPhone},phone_number.eq.${waPhone}`)
                                .maybeSingle();

                            if (!existingContact) {
                                console.log(`[Automation] Creando contacto admin...`);
                                await window.auth.sb.from('contacts').insert({
                                    user_id: targetUserId,
                                    phone_number: fullPhone,
                                    full_name: 'Admin (Notificaciones)',
                                    labels: ['ignorar']
                                });
                            } else {
                                const currentLabels = existingContact.labels || [];
                                if (!currentLabels.includes('ignorar')) {
                                    console.log(`[Automation] Marcando contacto existente como ignorar...`);
                                    await window.auth.sb.from('contacts')
                                        .update({ labels: [...currentLabels, 'ignorar'] })
                                        .eq('id', existingContact.id);
                                }
                            }
                        } catch (err) {
                            console.error('[Automation] Error en proceso de auto-ignore:', err);
                        }
                    })();
                } catch (e) {
                    console.error('Error iniciando auto-ignore:', e);
                }
            }

            // Validar Slug
            let companySlug = companySlugInput?.value?.trim() || null;
            if (companySlug) {
                // Forzar minúsculas
                companySlug = companySlug.toLowerCase();
                if (companySlugInput) companySlugInput.value = companySlug;

                const slugRegex = /^[a-z0-9-]+$/;
                if (!slugRegex.test(companySlug)) {
                    window.showToast?.('El slug solo puede contener letras minúsculas, números y guiones.', 'error');
                    if (targetButton) { targetButton.disabled = false; targetButton.textContent = restoreLabel; }
                    return;
                }

                // Verificación final de disponibilidad sincrónica antes de guardar
                try {
                    const { data: existingSlug } = await userSupabaseClient
                        .from('profiles')
                        .select('id')
                        .eq('slug', companySlug)
                        .neq('id', targetUserId)
                        .maybeSingle();

                    if (existingSlug) {
                        window.showToast?.('Este link ya está en uso por otra empresa. Por favor elige otro.', 'error');
                        if (companySlugInput) companySlugInput.classList.add('border-red-500');
                        if (targetButton) { targetButton.disabled = false; targetButton.textContent = restoreLabel; }
                        return;
                    }
                } catch (err) {
                    console.warn('Error verificado slug antes de guardar:', err);
                }
            }

            // Obtener targetUserId primero, antes de usarlo
            // targetUserId ya fue obtenido al inicio

            // Obtener organization_id
            const { data: currentProfile, error: profileFetchError } = await userSupabaseClient
                .from('profiles')
                .select('organization_id')
                .eq('id', targetUserId)
                .single();

            if (profileFetchError) {
                console.error('[Settings] Error al obtener perfil:', profileFetchError);
                // Continuar de todas formas, puede que no haya organization_id
            }

            // console.log('[Settings] Perfil obtenido:', {
            //     hasProfile: !!currentProfile,
            //     organizationId: currentProfile?.organization_id
            // });

            // Guardar nombre de empresa en organizations
            const companyNameInput = document.getElementById('company-name');
            const companyName = companyNameInput?.value?.trim();

            if (companyNameInput && companyName) {
                try {
                    let organizationId = currentProfile?.organization_id;

                    // Si no hay organization_id, crear una organización nueva usando la función RPC
                    if (!organizationId) {
                        // console.log('[Settings] No hay organization_id, creando nueva organización usando RPC...');
                        const { data: newOrgId, error: createError } = await userSupabaseClient
                            .rpc('create_user_organization', { p_organization_name: companyName });

                        if (createError) {
                            console.error('[Settings] Error al crear organización:', createError);
                            throw new Error('No se pudo crear la organización: ' + (createError.message || 'Error desconocido'));
                        }

                        organizationId = newOrgId;
                        // console.log('[Settings] ✓ Organización creada y vinculada:', organizationId);
                    } else {
                        // Actualizar organización existente
                        const { error: orgError } = await userSupabaseClient
                            .from('organizations')
                            .update({ name: companyName })
                            .eq('id', organizationId);

                        if (orgError) {
                            console.error('[Settings] Error al actualizar nombre de empresa:', orgError);
                            // Mostrar error al usuario si es un error crítico
                            if (orgError.code !== 'PGRST204' && orgError.code !== '42501') {
                                window.showToast?.('Error al guardar el nombre de empresa. Verifica tus permisos.', 'error');
                            }
                            throw orgError;
                        } else {
                            // console.log('[Settings] ✓ Nombre de empresa actualizado exitosamente en organizations');
                        }
                    }
                } catch (e) {
                    console.error('[Settings] Excepción al guardar nombre de empresa:', e);
                    // No lanzar error aquí para no detener el guardado de otros campos
                    window.showToast?.('Error al guardar el nombre de empresa. Los demás datos se guardaron correctamente.', 'warning');
                }
            } else if (companyNameInput && !companyName) {
                // console.warn('[Settings] El campo nombre de empresa está vacío, no se guarda');
            }

            // Toggle de cotizaciones: YA NO SE MANEJA AQUI (se maneja en quotes.js)
            // const quotesEnabledInput = document.getElementById('quotes-enabled');


            // Construir settingsData sin quotes_enabled primero
            const settingsData = {
                work_start_hour: startHourInput ? parseInt(startHourInput.split(':')[0], 10) : null,
                work_end_hour: endHourInput ? parseInt(endHourInput.split(':')[0], 10) : null,
                company_description: companyDescription?.value || '',
                website: website?.value || '',
                social_media: {
                    instagram: socialInstagram?.value || '',
                    facebook: socialFacebook?.value || '',
                    maps_link: businessMapsLink?.value || ''
                },
                branding_settings: brandingSettings,
                contact_phone: adminPhoneNumber,
                business_address: businessAddress?.value?.trim() || null,
                business_phone: fullBusinessPhone || null,
                pickup_location: pickupLocation?.value?.trim() || null,
                has_shipping_system: hasShippingSystem?.checked || false,
                slug: companySlug,
                daily_summary_enabled: dailySummaryEnabled?.checked || false,
                daily_summary_time: dailySummaryTime?.value || '08:00',
                pending_tasks_reminder_enabled: pendingTasksReminderEnabled?.checked || false
            };

            // Construir objeto de información de pago
            const paymentInfo = {
                bank_name: document.getElementById('payment-bank-name')?.value?.trim() || '',
                bank_account: document.getElementById('payment-bank-account')?.value?.trim() || '',
                account_holder: document.getElementById('payment-account-holder')?.value?.trim() || '',
                clabe: document.getElementById('payment-clabe')?.value?.trim() || '',
                paypal_email: document.getElementById('payment-paypal-email')?.value?.trim() || '',
                qr_code_url: paymentQRUrl || '',
                business_name: document.getElementById('payment-business-name')?.value?.trim() || ''
            };

            // Guardar configuración (sin quotes_enabled, ya que se maneja en otro lugar)
            let { error } = await userSupabaseClient
                .from('profiles')
                .update({
                    work_start_hour: startHourInput ? parseInt(startHourInput.split(':')[0], 10) : null,
                    work_end_hour: endHourInput ? parseInt(endHourInput.split(':')[0], 10) : null,
                    company_description: companyDescription?.value || null,
                    website: website?.value || null,
                    social_media: {
                        instagram: socialInstagram?.value || null,
                        facebook: socialFacebook?.value || null,
                        maps_link: businessMapsLink?.value || null
                    },
                    branding_settings: brandingSettings,
                    contact_phone: adminPhoneNumber,
                    business_address: businessAddress?.value || null,
                    business_phone: fullBusinessPhone || null,
                    pickup_location: pickupLocation?.value || null,
                    has_shipping_system: hasShippingSystem?.checked || false,
                    quotes_enabled: document.getElementById('quotes-enabled')?.checked || false,
                    daily_summary_enabled: dailySummaryEnabled?.checked || false,
                    daily_summary_time: dailySummaryTime?.value || '08:00',
                    pending_tasks_reminder_enabled: pendingTasksReminderEnabled?.checked || false,
                    slug: companySlug,
                    automation_settings: automationSettings,
                    payment_info: paymentInfo
                })
                .eq('id', targetUserId);

            /* Lógica antigua de quotes_enabled eliminada para evitar sobreescritura */
            const isQuotesColumnError = false;
            if (false) {
                // (Mantenemos la estructura para minimizar diff pero desactivamos la lógica)
                // console.warn('[Settings] Bloque ignorado');
                ({ error } = await userSupabaseClient
                    .from('profiles')
                    .update(settingsData)
                    .eq('id', targetUserId));
            }

            // console.log('[Settings] Datos a guardar:', settingsData);

            if (error) {
                console.error('[Settings] Error de Supabase al guardar:', error);
                throw new Error(error.message);
            }

            // Guardar la configuración de visibilidad de chats para el equipo (solo si existe la columna - plan business)
            const teamInfo = window.appInstance?.teamInfo;
            if (teamInfo && teamInfo.user_role === 'admin' && teamInfo.team_id) {
                const seeAllChatsToggle = document.getElementById('see-all-chats-toggle');
                const ignoreLabelsInput = document.getElementById('ignore-labels-input');

                // Verificar que los elementos existan antes de acceder a sus propiedades
                const allowAllChats = seeAllChatsToggle?.checked ?? false;
                const ignoredLabelsInput = ignoreLabelsInput?.value || '';
                const ignoredLabels = ignoredLabelsInput.split(',').map(label => label.trim()).filter(label => label);

                // Intentar actualizar, pero no fallar si la columna no existe o no hay permisos (plan gratuito)
                try {
                    const { error: teamError } = await userSupabaseClient
                        .from('teams')
                        .update({
                            allow_all_chats_visibility: allowAllChats,
                            ignored_labels: ignoredLabels
                        })
                        .eq('id', teamInfo.team_id);

                    if (teamError) {
                        // Silenciar todos los errores de teams - no es crítico para el flujo principal
                        // Los errores 400 pueden ser por RLS, permisos, o columnas faltantes
                        // No loguear para evitar ruido en la consola
                    }
                } catch (e) {
                    // Silenciar errores de equipos - no es crítico para el flujo principal
                    // No loguear para evitar ruido en la consola
                }
            }
            // --- INICIO: Guardar configuración de citas ---
            try {
                await saveAppointmentSettings(targetUserId);
            } catch (error) {
                console.error('[Settings] Error al guardar configuración de citas:', error);
                // No lanzamos error aquí para no detener el flujo principal
            }
            // --- FIN: Guardar configuración de citas ---

            // console.log('[Settings] Guardado con exito.');
            window.showToast('Configuracion guardada con exito.', 'success');
        } catch (error) {
            console.error('Error al guardar la configuracion:', error);
            window.showToast('No se pudo guardar la configuracion.', 'error');
        } finally {
            targetButton.disabled = false;
            targetButton.textContent = restoreLabel;
        }
    }
    // --- INICIO: Funciones para Gestión de Equipo ---

    async function loadTeamLabels(teamInfo) {
        const ownerId = teamInfo?.owner_id || teamInfo?.profiles?.id || window.appInstance?.user?.id || window.auth.getSession()?.user?.id;
        if (!ownerId) {
            teamLabels = [];
            return;
        }

        const { data, error } = await window.auth.sb
            .from('labels')
            .select('name')
            .eq('user_id', ownerId)
            .order('name', { ascending: true });

        if (error) {
            console.error('[Settings] Error al cargar etiquetas del equipo:', error);
            teamLabels = [];
            return;
        }

        teamLabels = (data || []).map((label) => label.name).filter(Boolean);
    }

    async function renderTeamManagementPanel(teamInfo) {
        const panel = document.getElementById('team-management-panel');
        if (!panel) return;

        // CORRECCIÓN: Solo los 'admin' de un equipo y con el plan adecuado pueden ver este panel.
        let canManageTeam = false;
        if (teamInfo?.user_role === 'admin') {
            const userPlan = await window.appInstance?.loadUserSubscription();
            if (userPlan?.plans?.features?.multi_user) {
                canManageTeam = true;
            }
        }

        if (!canManageTeam) {
            // Mostrar overlay de upgrade en lugar de ocultar el panel
            panel.classList.remove('hidden');
            panel.innerHTML = `
                <div class="relative bg-gradient-to-br from-cyan-50 to-blue-100 rounded-2xl p-8 border-2 border-cyan-200 overflow-hidden">
                    <!-- Patrón de fondo -->
                    <div class="absolute inset-0 opacity-10">
                        <div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width=\\\"20\\\" height=\\\"20\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"%3E%3Cg fill=\\\"%23000\\\" fill-opacity=\\\"1\\\" fill-rule=\\\"evenodd\\\"%3E%3Ccircle cx=\\\"3\\\" cy=\\\"3\\\" r=\\\"1\\\"/%3E%3C/g%3E%3C/svg%3E');"></div>
                    </div>

                    <!-- Contenido -->
                    <div class="relative z-10 text-center max-w-2xl mx-auto">
                        <div class="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <i data-lucide="users" class="w-10 h-10 text-white"></i>
                        </div>

                        <h3 class="text-2xl font-bold text-slate-900 mb-3">
                            🚀 Potencia tu equipo con Plan Business
                        </h3>

                        <p class="text-slate-700 mb-6 text-lg">
                            Colabora con tu equipo, delega conversaciones y escala tu negocio
                        </p>

                        <!-- Beneficios -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                            <div class="bg-white/80 backdrop-blur rounded-xl p-4 border border-cyan-200">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                                        <i data-lucide="user-plus" class="w-4 h-4 text-green-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 mb-1">Múltiples usuarios</h4>
                                        <p class="text-sm text-slate-600">Invita vendedores y asesores a tu equipo</p>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white/80 backdrop-blur rounded-xl p-4 border border-cyan-200">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                                        <i data-lucide="shield-check" class="w-4 h-4 text-purple-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 mb-1">Permisos personalizados</h4>
                                        <p class="text-sm text-slate-600">Controla qué puede ver y hacer cada miembro</p>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white/80 backdrop-blur rounded-xl p-4 border border-cyan-200">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                        <i data-lucide="tag" class="w-4 h-4 text-blue-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 mb-1">Filtrado por etiquetas</h4>
                                        <p class="text-sm text-slate-600">Asigna chats específicos a cada vendedor</p>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white/80 backdrop-blur rounded-xl p-4 border border-cyan-200">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                                        <i data-lucide="bar-chart-3" class="w-4 h-4 text-orange-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 mb-1">Métricas de equipo</h4>
                                        <p class="text-sm text-slate-600">Monitorea el desempeño de cada miembro</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- CTA -->
                        <button onclick="if(typeof window.showPlansModal === 'function') { window.showPlansModal(); } else { window.location.href='https://elina.app/planes'; }"
                            class="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-2">
                            <i data-lucide="rocket" class="w-5 h-5"></i>
                            Actualizar a Plan Business
                        </button>

                        <p class="text-sm text-slate-600 mt-4">
                            ¿Tienes dudas? <a href="https://wa.me/5218139606991?text=Hola,%20quiero%20información%20sobre%20el%20Plan%20Business" target="_blank" class="text-cyan-600 font-semibold hover:underline">Contáctanos por WhatsApp</a>
                        </p>
                    </div>
                </div>
            `;

            // Re-renderizar iconos de Lucide en el nuevo contenido
            if (window.lucide) {
                window.lucide.createIcons({
                    attrs: { class: 'lucide-icon' },
                    nameAttr: 'data-lucide'
                });
            }
            return;
        }

        panel.classList.remove('hidden');

        await loadTeamLabels(teamInfo);

        // Renderizar la lista de miembros del equipo
        const listContainer = document.getElementById('team-members-list');
        if (!listContainer) return;

        // Obtener miembros del equipo
        const { data: members, error: membersError } = await window.auth.sb
            .from('team_members')
            .select('user_id, role, permissions')
            .eq('team_id', teamInfo.team_id);

        if (membersError) {
            console.error("Error al cargar miembros del equipo:", membersError);
        }

        // Obtener invitaciones pendientes
        // console.log('[Settings] 🔍 Cargando invitaciones para el equipo:', teamInfo.team_id);
        const { data: invitations, error: invitationsError } = await window.auth.sb
            .from('team_invitations')
            .select('id, email, role, status, created_at, expires_at')
            .eq('team_id', teamInfo.team_id)
            .in('status', ['pending', 'sent', 'failed'])
            .order('created_at', { ascending: false });

        if (invitationsError) {
            console.error("[Settings] ❌ Error al cargar invitaciones:", invitationsError);
            console.error("[Settings] Código de error:", invitationsError.code);
            console.error("[Settings] Mensaje:", invitationsError.message);
            console.error("[Settings] Detalles completos:", JSON.stringify(invitationsError, null, 2));

            // Si es un error de permisos, mostrar mensaje más claro
            if (invitationsError.code === '42501' || invitationsError.message?.includes('permission denied')) {
                // console.warn('[Settings] ⚠️ Error de permisos al cargar invitaciones. Verifica las políticas RLS.');
            }

            // Continuar sin invitaciones si hay error (no es crítico para la funcionalidad)
        } else {
            // console.log('[Settings] ✅ Invitaciones cargadas exitosamente:', invitations?.length || 0);
            if (invitations && invitations.length > 0) {
                // console.log('[Settings] 📋 Lista de invitaciones:', invitations.map(inv => ({
                //     email: inv.email,
                //     status: inv.status,
                //     role: inv.role
                // })));
            }
        }

        // Si no hay miembros ni invitaciones, mostrar mensaje
        if ((!members || members.length === 0) && (!invitations || invitations.length === 0)) {
            listContainer.innerHTML = '<p class="text-slate-500 text-sm">Aún no has invitado vendedores.</p>';
            return;
        }

        // Obtener perfiles de los miembros
        let profilesMap = {};
        if (members && members.length > 0) {
            const userIds = members.map(m => m.user_id);
            const { data: profiles, error: profilesError } = await window.auth.sb
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            if (!profilesError && profiles) {
                profiles.forEach(profile => {
                    profilesMap[profile.id] = profile;
                });
            }
        }

        // Renderizar miembros activos
        const membersHtml = (members || []).map(member => {
            const profile = profilesMap[member.user_id] || {};
            const isCurrentUser = member.user_id === window.appInstance?.user?.id;
            return `
                <div class="bg-white p-4 rounded-lg border">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="font-semibold">${profile.full_name || profile.email || 'Usuario sin nombre'}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${member.role}</span>
                                <span class="text-xs text-green-600">✓ Conectado</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-4">
                            ${member.role === 'advisor' ? `
                                <button class="text-xs text-slate-600 hover:text-slate-800 hover:underline font-medium" onclick="this.nextElementSibling.classList.toggle('hidden')">Permisos</button>
                            ` : ''}
                            ${!isCurrentUser ? `
                                <button 
                                    class="delete-member-btn text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium whitespace-nowrap" 
                                    data-user-id="${member.user_id}"
                                    data-user-name="${profile.full_name || profile.email || 'Usuario'}"
                                    title="Eliminar usuario del equipo y del sistema"
                                >
                                    Eliminar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    ${member.role === 'advisor' ? `
                        <div class="hidden mt-4 pt-4 border-t border-slate-100 space-y-4">
                            <div>
                                <h5 class="text-sm font-semibold text-slate-600">Acceso a Paneles:</h5>
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                    ${renderPermissionToggle(member, 'follow-ups', 'Seguimientos')}
                                    ${renderPermissionToggle(member, 'bulk-sending', 'Envío Masivo')}
                                    ${renderPermissionToggle(member, 'contacts', 'Contactos')}
                                    ${renderPermissionToggle(member, 'templates', 'Plantillas')}
                                    ${renderPermissionToggle(member, 'products', 'Productos')}
                                    ${renderPermissionToggle(member, 'designer-ai', 'Diseñador IA')}
                                </div>
                            </div>
                            ${renderLabelFilters(member)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Renderizar invitaciones pendientes
        const invitationsHtml = (invitations || []).map(invitation => {
            const statusClass = invitation.status === 'sent' ? 'bg-yellow-100 text-yellow-700' : invitation.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
            const statusText = invitation.status === 'sent' ? 'Enviado' : invitation.status === 'failed' ? 'Fallido' : 'Pendiente';
            const expiresDate = new Date(invitation.expires_at);
            const isExpired = expiresDate < new Date();

            return `
                <div class="bg-slate-50 p-4 rounded-lg border border-dashed">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="font-semibold">${invitation.email}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${invitation.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${invitation.role}</span>
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}">${statusText}</span>
                                ${isExpired ? '<span class="text-xs text-red-600">Expirado</span>' : ''}
                            </div>
                            <p class="text-xs text-slate-500 mt-2">
                                Invitado el ${new Date(invitation.created_at).toLocaleDateString('es-MX')}
                                ${!isExpired ? `• Expira el ${expiresDate.toLocaleDateString('es-MX')}` : ''}
                            </p>
                        </div>
                        <div class="flex items-center gap-2 ml-4">
                            <button 
                                class="resend-invitation-btn text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap" 
                                data-invitation-id="${invitation.id}"
                                data-invitation-email="${invitation.email}"
                                data-invitation-role="${invitation.role}"
                                title="Reenviar invitación por correo"
                            >
                                Reenviar
                            </button>
                            <button 
                                class="delete-invitation-btn text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium whitespace-nowrap" 
                                data-invitation-id="${invitation.id}"
                                data-invitation-email="${invitation.email}"
                                title="Eliminar esta invitación"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = membersHtml + invitationsHtml;

        // Agregar event listeners para los botones de eliminar miembros
        listContainer.querySelectorAll('.delete-member-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = button.getAttribute('data-user-id');
                const userName = button.getAttribute('data-user-name');
                await handleDeleteTeamMember(userId, userName, teamInfo.team_id);
            });
        });

        // Agregar event listeners para los botones de reenviar invitación
        listContainer.querySelectorAll('.resend-invitation-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const invitationId = button.getAttribute('data-invitation-id');
                const invitationEmail = button.getAttribute('data-invitation-email');
                const invitationRole = button.getAttribute('data-invitation-role');
                await handleResendInvitation(invitationEmail, invitationRole, teamInfo.team_id);
            });
        });

        // Agregar event listeners para los botones de eliminar invitación
        listContainer.querySelectorAll('.delete-invitation-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const invitationId = button.getAttribute('data-invitation-id');
                const invitationEmail = button.getAttribute('data-invitation-email');
                await handleDeleteInvitation(invitationId, invitationEmail, teamInfo.team_id);
            });
        });

        // Renderizar panel de permisos granulares (solo para admins con plan business)
        // Este panel se renderiza después de la lista de miembros
        if (canManageTeam && teamInfo?.user_role === 'admin') {
            // Esperar un momento para que el DOM se actualice
            setTimeout(async () => {
                await renderOrganizationPermissionsPanel(teamInfo);
            }, 100);
        }
    }

    async function handleDeleteTeamMember(userId, userName, teamId) {
        // Confirmar eliminación usando modal de la app
        const confirmMessage = `¿Estás seguro de que deseas eliminar a ${userName}?\n\nEsta acción:\n- Eliminará al usuario del equipo\n- Eliminará su cuenta del sistema de autenticación\n- Eliminará su perfil y datos\n\nEsta acción NO se puede deshacer.`;

        const confirmed = await window.appModal?.confirm?.(confirmMessage, 'Eliminar Usuario');
        if (!confirmed) {
            return;
        }

        try {
            // console.log('[Settings] 🗑️ Eliminando miembro del equipo:', { userId, userName, teamId });

            // Llamar a la Edge Function para eliminar el usuario
            const response = await window.auth.invokeFunction('delete-team-member', {
                body: {
                    userId: userId,
                    teamId: teamId
                }
            });

            const { data, error } = response || {};

            if (error) {
                console.error('[Settings] ❌ Error al eliminar miembro:', error);
                throw new Error(error.message || 'No se pudo eliminar el usuario');
            }

            // console.log('[Settings] ✅ Usuario eliminado exitosamente');
            window.showToast?.(`Usuario ${userName} eliminado exitosamente del equipo y del sistema.`, 'success');

            // Pequeña espera para asegurar que la DB esté lista
            await new Promise(r => setTimeout(r, 800));

            // Recargar la lista de miembros
            const teamInfoAfterDelete = window.appInstance?.teamInfo;
            if (teamInfoAfterDelete) {
                await renderTeamManagementPanel(teamInfoAfterDelete);
            }

        } catch (e) {
            console.error('[Settings] ❌ Error al eliminar miembro:', e);
            const errorMessage = e.message || 'No se pudo eliminar el usuario. Intenta de nuevo.';
            window.showToast?.(errorMessage, 'error');
        }
    }

    async function handleResendInvitation(email, role, teamId) {
        try {
            // console.log('[Settings] 📧 Reenviando invitación a:', email);

            // Deshabilitar botón mientras se procesa
            const buttons = document.querySelectorAll(`.resend-invitation-btn[data-invitation-email="${email}"]`);
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.textContent = 'Enviando...';
            });

            // Llamar a la Edge Function para reenviar la invitación
            const response = await window.auth.invokeFunction('invite-team-member', {
                body: {
                    teamId: teamId,
                    inviteeEmail: email,
                    role: role || 'advisor'
                }
            });

            const { data, error } = response || {};

            if (error) {
                console.error('[Settings] ❌ Error al reenviar invitación:', error);
                throw new Error(error.message || 'No se pudo reenviar la invitación');
            }

            // console.log('[Settings] ✅ Invitación reenviada exitosamente');
            window.showToast?.(`Invitación reenviada exitosamente a ${email}.`, 'success');

            // Pequeña espera para asegurar que la DB esté lista
            await new Promise(r => setTimeout(r, 800));

            // Recargar la lista de miembros
            const teamInfoAfterResend = window.appInstance?.teamInfo;
            if (teamInfoAfterResend) {
                await renderTeamManagementPanel(teamInfoAfterResend);
            }

        } catch (e) {
            console.error('[Settings] ❌ Error al reenviar invitación:', e);
            const errorMessage = e.message || 'No se pudo reenviar la invitación. Intenta de nuevo.';
            window.showToast?.(errorMessage, 'error');

            // Restaurar botones
            const buttons = document.querySelectorAll(`.resend-invitation-btn[data-invitation-email="${email}"]`);
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.textContent = 'Reenviar';
            });
        }
    }

    async function handleDeleteInvitation(invitationId, invitationEmail, teamId) {
        // Confirmar eliminación usando modal de la app
        const confirmMessage = `¿Estás seguro de que deseas eliminar la invitación para ${invitationEmail}?\n\nEsta acción eliminará la invitación pendiente. El usuario no podrá usar el enlace anterior.`;

        const confirmed = await window.appModal?.confirm?.(confirmMessage, 'Eliminar Invitación');
        if (!confirmed) {
            return;
        }

        try {
            // console.log('[Settings] 🗑️ Eliminando invitación:', { invitationId, invitationEmail, teamId });

            // Eliminar la invitación de la base de datos
            const { error } = await window.auth.sb
                .from('team_invitations')
                .delete()
                .eq('id', invitationId)
                .eq('team_id', teamId);

            if (error) {
                console.error('[Settings] ❌ Error al eliminar invitación:', error);
                throw new Error(error.message || 'No se pudo eliminar la invitación');
            }

            // console.log('[Settings] ✅ Invitación eliminada exitosamente');
            window.showToast?.(`Invitación para ${invitationEmail} eliminada exitosamente.`, 'success');

            // Pequeña espera para asegurar que la DB esté lista
            await new Promise(r => setTimeout(r, 800));

            // Recargar la lista de miembros
            const teamInfoAfterDelete = window.appInstance?.teamInfo;
            if (teamInfoAfterDelete) {
                await renderTeamManagementPanel(teamInfoAfterDelete);
            }

        } catch (e) {
            console.error('[Settings] ❌ Error al eliminar invitación:', e);
            const errorMessage = e.message || 'No se pudo eliminar la invitación. Intenta de nuevo.';
            window.showToast?.(errorMessage, 'error');
        }
    }

    async function renderOrganizationPermissionsPanel(teamInfo) {
        // Obtener organization_id del perfil del usuario actual
        const { data: currentProfile } = await window.auth.sb
            .from('profiles')
            .select('organization_id')
            .eq('id', window.appInstance?.user?.id)
            .single();

        if (!currentProfile?.organization_id) {
            // console.warn('[Settings] No se encontró organization_id para el usuario actual');
            return;
        }

        // Obtener permisos existentes
        const { data: existingPermissions, error: permError } = await window.auth.sb
            .from('organization_permissions')
            .select('*')
            .eq('organization_id', currentProfile.organization_id)
            .eq('role', 'advisor');

        if (permError) {
            console.error('[Settings] Error al cargar permisos:', permError);
            return;
        }

        // Crear mapa de permisos por recurso
        const permissionsMap = {};
        (existingPermissions || []).forEach(perm => {
            permissionsMap[perm.resource] = {
                can_view: perm.can_view,
                can_modify: perm.can_modify
            };
        });

        // Recursos configurables
        const resources = [
            { id: 'qr_number', name: 'Número QR', description: 'Número de WhatsApp vinculado a la organización' },
            { id: 'ai_prompt', name: 'Prompt de IA', description: 'Configuración del prompt principal de la IA' },
            { id: 'images', name: 'Imágenes de Referencia', description: 'Imágenes de referencia para generación de IA' },
            { id: 'branding', name: 'Branding', description: 'Logo, colores y tipografía de la organización' },
            { id: 'settings', name: 'Configuración General', description: 'Configuración de horarios, descripción, etc.' },
            { id: 'contacts', name: 'Contactos', description: 'Ver y gestionar contactos' },
            { id: 'chats', name: 'Chats', description: 'Ver y responder chats' },
            { id: 'products', name: 'Productos', description: 'Ver y gestionar productos' },
            { id: 'templates', name: 'Plantillas', description: 'Ver y crear plantillas de mensajes' },
            { id: 'follow-ups', name: 'Seguimientos', description: 'Ver y gestionar seguimientos automáticos' },
            { id: 'kanban', name: 'Kanban', description: 'Ver y gestionar tablero Kanban' },
            { id: 'designer-ai', name: 'Diseñador IA', description: 'Generar imágenes con IA' }
        ];

        const permissionsHtml = `
            <div class="mt-8 bg-white p-6 rounded-lg border">
                <h4 class="font-semibold mb-2 text-lg">Permisos Granulares para Asesores</h4>
                <p class="text-sm text-slate-600 mb-6">Define qué pueden ver y modificar los asesores en tu organización. Los cambios se aplican a todos los asesores.</p>
                
                <div class="space-y-6">
                    ${resources.map(resource => {
            const perm = permissionsMap[resource.id] || { can_view: false, can_modify: false };
            return `
                            <div class="border border-slate-200 rounded-lg p-4">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex-1">
                                        <h5 class="font-semibold text-slate-800">${resource.name}</h5>
                                        <p class="text-xs text-slate-500 mt-1">${resource.description}</p>
                                    </div>
                                </div>
                                <div class="flex gap-6 mt-4">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            class="org-permission-toggle form-checkbox h-5 w-5 rounded text-blue-600" 
                                            data-resource="${resource.id}" 
                                            data-action="view"
                                            ${perm.can_view ? 'checked' : ''}
                                        >
                                        <span class="text-sm font-medium text-slate-700">Puede Ver</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            class="org-permission-toggle form-checkbox h-5 w-5 rounded text-blue-600" 
                                            data-resource="${resource.id}" 
                                            data-action="modify"
                                            ${perm.can_modify ? 'checked' : ''}
                                            ${!perm.can_view ? 'disabled' : ''}
                                        >
                                        <span class="text-sm font-medium text-slate-700">Puede Modificar</span>
                                    </label>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button 
                        id="save-org-permissions-btn" 
                        class="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700"
                    >
                        Guardar Permisos
                    </button>
                </div>
            </div>
        `;

        // Buscar o crear contenedor de permisos
        let permissionsContainer = document.getElementById('organization-permissions-container');
        if (!permissionsContainer) {
            const teamPanel = document.getElementById('team-management-panel');
            if (teamPanel) {
                permissionsContainer = document.createElement('div');
                permissionsContainer.id = 'organization-permissions-container';
                teamPanel.appendChild(permissionsContainer);
            } else {
                // console.warn('[Settings] No se encontró el panel de gestión de equipo');
                return;
            }
        }

        permissionsContainer.innerHTML = permissionsHtml;

        // Configurar listeners para los checkboxes
        setupOrganizationPermissionsListeners(currentProfile.organization_id);
    }

    function setupOrganizationPermissionsListeners(organizationId) {
        // Listener para checkboxes de permisos
        document.querySelectorAll('.org-permission-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const resource = e.target.dataset.resource;
                const action = e.target.dataset.action;

                // Si se desmarca "Puede Ver", también desmarcar "Puede Modificar"
                if (action === 'view' && !e.target.checked) {
                    const modifyToggle = document.querySelector(
                        `.org-permission-toggle[data-resource="${resource}"][data-action="modify"]`
                    );
                    if (modifyToggle) {
                        modifyToggle.checked = false;
                        modifyToggle.disabled = true;
                    }
                }

                // Si se marca "Puede Ver", habilitar "Puede Modificar"
                if (action === 'view' && e.target.checked) {
                    const modifyToggle = document.querySelector(
                        `.org-permission-toggle[data-resource="${resource}"][data-action="modify"]`
                    );
                    if (modifyToggle) {
                        modifyToggle.disabled = false;
                    }
                }
            });
        });

        // Listener para el botón de guardar
        const saveBtn = document.getElementById('save-org-permissions-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await saveOrganizationPermissions(organizationId);
            });
        }
    }

    async function saveOrganizationPermissions(organizationId) {
        const saveBtn = document.getElementById('save-org-permissions-btn');
        if (!saveBtn) return;

        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            // Recopilar todos los permisos de los checkboxes
            const permissions = [];
            document.querySelectorAll('.org-permission-toggle').forEach(toggle => {
                const resource = toggle.dataset.resource;
                const action = toggle.dataset.action;
                const isChecked = toggle.checked;

                // Buscar si ya existe un permiso para este recurso
                let perm = permissions.find(p => p.resource === resource);
                if (!perm) {
                    perm = {
                        organization_id: organizationId,
                        role: 'advisor',
                        resource: resource,
                        can_view: false,
                        can_modify: false
                    };
                    permissions.push(perm);
                }

                if (action === 'view') {
                    perm.can_view = isChecked;
                } else if (action === 'modify') {
                    perm.can_modify = isChecked;
                }
            });

            // Eliminar permisos existentes y crear nuevos (upsert)
            for (const perm of permissions) {
                const { error } = await window.auth.sb
                    .from('organization_permissions')
                    .upsert({
                        organization_id: perm.organization_id,
                        role: perm.role,
                        resource: perm.resource,
                        can_view: perm.can_view,
                        can_modify: perm.can_modify
                    }, {
                        onConflict: 'organization_id,role,resource'
                    });

                if (error) {
                    console.error('[Settings] Error al guardar permiso:', error);
                    throw error;
                }
            }

            window.showToast?.('Permisos guardados exitosamente', 'success');

            // Recargar el panel para mostrar los cambios
            const teamInfo = window.appInstance?.teamInfo;
            if (teamInfo) {
                await renderTeamManagementPanel(teamInfo);
            }

        } catch (e) {
            console.error('[Settings] Error al guardar permisos:', e);
            window.showToast?.('Error al guardar permisos. Intenta de nuevo.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    function renderPermissionToggle(member, panelId, panelName) {
        const isChecked = member.permissions?.[panelId] || false;
        return `
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" class="permission-toggle form-checkbox h-4 w-4 rounded text-blue-600" data-member-id="${member.user_id}" data-panel-id="${panelId}" ${isChecked ? 'checked' : ''}>
                <span class="text-sm text-slate-700">${panelName}</span>
            </label>
        `;
    }

    function renderLabelFilters(member) {
        const labelFilters = member.permissions?.label_filters || {};
        const contactsScope = Array.isArray(labelFilters.contacts) ? labelFilters.contacts : [];
        const chatsScope = Array.isArray(labelFilters.chats) ? labelFilters.chats : [];

        return `
            <div class="space-y-2">
                <h5 class="text-sm font-semibold text-slate-600">Etiquetas permitidas</h5>
                <p class="text-xs text-slate-500">Solo verá contactos y chats que tengan las etiquetas seleccionadas.</p>
                <div class="grid gap-3 md:grid-cols-2">
                    ${renderLabelSelect(member, 'contacts', 'Contactos y Kanban', contactsScope)}
                    ${renderLabelSelect(member, 'chats', 'Chats', chatsScope)}
                </div>
            </div>
        `;
    }

    function renderLabelSelect(member, scope, label, selectedValues) {
        const optionSet = new Set([...(teamLabels || []), ...(selectedValues || [])]);
        if (!optionSet.size) {
            return `
                <div class="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-3">
                    Crea etiquetas desde el panel de Contactos para asignarlas a tus vendedores.
                </div>
            `;
        }

        const optionsHtml = Array.from(optionSet)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
            .map((name) => `<option value="${name}" ${selectedValues?.includes(name) ? 'selected' : ''}>${name}</option>`)
            .join('');

        return `
            <label class="flex flex-col gap-1 text-sm text-slate-600">
                <span>${label}</span>
                <select multiple size="4" class="label-filter-select border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-member-id="${member.user_id}" data-scope="${scope}">
                    ${optionsHtml}
                </select>
            </label>
        `;
    }

    async function handleInviteMember() {
        // console.log('[Settings] ========== handleInviteMember INICIADO ==========');
        const startTime = performance.now();

        // Buscar el input de email y el botón (lo único que necesitamos)
        const emailInput = document.getElementById('invite-email');
        const button = document.getElementById('invite-member-btn');

        // console.log('[Settings] 🔍 Buscando elementos de invitación:', {
        //     emailInput: !!emailInput,
        //     button: !!button,
        //     emailInputId: emailInput?.id,
        //     buttonId: button?.id
        // });

        // Solo necesitamos el input y el botón para funcionar
        if (!emailInput || !button) {
            console.error('[Settings] ❌ No se encontraron los elementos necesarios:', {
                emailInput: !!emailInput,
                button: !!button
            });
            window.showToast?.('Error: No se pudo encontrar el campo de correo o el botón de invitación. Recarga la página.', 'error');
            return;
        }

        // console.log('[Settings] ✅ Elementos encontrados correctamente');

        const email = emailInput.value.trim();
        // console.log('[Settings] 📧 Email ingresado:', email);

        if (!email) {
            // console.warn('[Settings] ⚠️ Email vacío');
            window.showToast?.('Por favor ingresa un correo electrónico', 'error');
            emailInput.focus();
            return;
        }

        // Validar formato de email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            // console.warn('[Settings] ⚠️ Email con formato inválido:', email);
            window.showToast?.('Por favor ingresa un correo electrónico válido', 'error');
            emailInput.focus();
            return;
        }

        // Obtener teamInfo del appInstance
        const teamInfo = window.appInstance?.teamInfo;
        // console.log('[Settings] 👥 teamInfo:', teamInfo);

        if (!teamInfo) {
            console.error('[Settings] ❌ teamInfo no disponible en appInstance');
            window.showToast?.('Error: No se pudo obtener la información del equipo. Recarga la página.', 'error');
            return;
        }

        // Verificar que el usuario es admin
        if (teamInfo?.user_role !== 'admin') {
            console.error('[Settings] ❌ Usuario no es admin. Rol actual:', teamInfo?.user_role);
            window.showToast?.('Solo los administradores pueden invitar miembros.', 'error');
            return;
        }

        // Verificar que tiene plan multi_user
        // console.log('[Settings] 🔍 Verificando plan del usuario...');
        let userPlan;
        try {
            userPlan = await window.appInstance?.loadUserSubscription();
            // console.log('[Settings] 📦 Plan del usuario:', userPlan);
        } catch (planError) {
            console.error('[Settings] ❌ Error al verificar plan:', planError);
            window.showToast?.('Error al verificar tu plan. Intenta de nuevo.', 'error');
            return;
        }

        if (!userPlan?.plans?.features?.multi_user) {
            console.error('[Settings] ❌ Plan no incluye multi_user. Plan:', userPlan);
            window.showToast?.('Tu plan no incluye la función de múltiples usuarios.', 'error');
            return;
        }

        if (!teamInfo?.team_id) {
            console.error('[Settings] ❌ team_id no disponible. teamInfo:', teamInfo);
            window.showToast?.('Error: No se pudo obtener el ID del equipo. Recarga la página.', 'error');
            return;
        }

        // console.log('[Settings] ✅ Validaciones pasadas. Invitando a:', email, 'al equipo:', teamInfo.team_id);

        // Deshabilitar botón y mostrar estado de carga
        const originalButtonText = button.textContent;
        button.disabled = true;
        button.textContent = 'Enviando...';
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';

        try {
            // console.log('[Settings] ===== INICIANDO LLAMADA A EDGE FUNCTION =====');
            // console.log('[Settings] 🔧 Verificando disponibilidad de invokeFunction...');
            // console.log('[Settings]   - window.auth existe:', !!window.auth);
            // console.log('[Settings]   - window.auth.invokeFunction existe:', !!(window.auth?.invokeFunction));

            if (!window.auth) {
                throw new Error('window.auth no está disponible. Verifica que auth.js esté cargado antes que settings.js.');
            }

            if (!window.auth.invokeFunction) {
                throw new Error('window.auth.invokeFunction no está disponible. Verifica que auth.js esté cargado correctamente.');
            }

            const requestData = {
                teamId: teamInfo.team_id,
                inviteeEmail: email,
                role: 'advisor'
            };

            // console.log('[Settings] 📤 Datos a enviar a edge function:', requestData);
            // console.log('[Settings] 📡 URL de edge function:', `${window.location.origin.includes('localhost') ? 'http://localhost:54321' : 'https://mytvwfbijlgbihlegmfg.supabase.co'}/functions/v1/invite-team-member`);

            const functionStartTime = performance.now();
            const response = await window.auth.invokeFunction('invite-team-member', {
                body: requestData
            });
            const functionEndTime = performance.now();

            // console.log('[Settings] ⏱️ Tiempo de respuesta de edge function:', (functionEndTime - functionStartTime).toFixed(2), 'ms');
            // console.log('[Settings] 📥 Respuesta completa de invokeFunction:', response);

            const { data, error } = response || {};
            // console.log('[Settings] 📊 Data extraída:', data);
            // console.log('[Settings] ⚠️ Error extraído:', error);

            if (error) {
                console.error('[Settings] ❌ Error en la respuesta de la edge function:', error);
                console.error('[Settings] Detalles del error:', JSON.stringify(error, null, 2));

                // Mensaje de error más descriptivo
                let errorMessage = 'No se pudo enviar la invitación.';
                if (error.message) {
                    errorMessage = error.message;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                }

                // Si el error incluye información sobre configuración de correo
                if (error.details && typeof error.details === 'string' && error.details.includes('correo')) {
                    errorMessage += ' ' + error.details;
                }

                throw new Error(errorMessage);
            }

            if (!data) {
                throw new Error('La edge function no retornó datos. Verifica los logs de la función.');
            }

            // console.log('[Settings] ✅ Invitación procesada exitosamente');
            // console.log('[Settings] 📋 Datos de respuesta:', JSON.stringify(data, null, 2));

            // Mostrar mensaje de éxito
            const successMessage = data.message || `Invitación enviada a ${email}.`;
            window.showToast?.(successMessage, 'success');

            // Limpiar input
            emailInput.value = '';
            emailInput.focus();

            // Recargar la lista de miembros para mostrar la invitación pendiente
            // console.log('[Settings] 🔄 Recargando panel de gestión de equipo...');
            const teamInfoAfterInvite = window.appInstance?.teamInfo;
            if (teamInfoAfterInvite) {
                try {
                    await renderTeamManagementPanel(teamInfoAfterInvite);
                    // console.log('[Settings] ✅ Panel de gestión de equipo recargado');
                } catch (renderError) {
                    console.error('[Settings] ⚠️ Error al recargar panel (no crítico):', renderError);
                }
            }

        } catch (e) {
            console.error("[Settings] ❌ Error al invitar miembro:", e);
            console.error("[Settings] Stack trace:", e.stack);

            // Mensaje de error más descriptivo
            let errorMessage = 'No se pudo enviar la invitación.';
            if (e.message) {
                errorMessage = e.message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            }

            // Agregar sugerencias según el tipo de error
            if (errorMessage.includes('invokeFunction')) {
                errorMessage += ' Verifica que auth.js esté cargado correctamente.';
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                errorMessage += ' Verifica tu conexión a internet.';
            }

            window.showToast?.(errorMessage, 'error');
        } finally {
            // Restaurar botón
            button.disabled = false;
            button.textContent = originalButtonText;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';

            const endTime = performance.now();
            // console.log('[Settings] ⏱️ Tiempo total de handleInviteMember:', (endTime - startTime).toFixed(2), 'ms');
            // console.log('[Settings] ========== handleInviteMember FINALIZADO ==========');
        }
    }

    async function handlePermissionChange(toggle) {
        const memberId = toggle.dataset.memberId;
        const panelId = toggle.dataset.panelId;
        const isEnabled = toggle.checked;

        if (!memberId || !panelId) return;

        try {
            const { data: member, error: fetchError } = await userSupabaseClient
                .from('team_members')
                .select('permissions')
                .eq('user_id', memberId)
                .eq('team_id', teamInfo.team_id)
                .single();
            if (fetchError) throw fetchError;

            const currentPermissions = normalizePermissions(member.permissions);
            currentPermissions[panelId] = isEnabled;

            const { error: updateError } = await userSupabaseClient
                .from('team_members')
                .update({ permissions: currentPermissions })
                .eq('user_id', memberId)
                .eq('team_id', teamInfo.team_id);
            if (updateError) throw updateError;

        } catch (e) {
            console.error("Error al actualizar permisos:", e);
            window.showToast('No se pudo actualizar el permiso.', 'error');
            toggle.checked = !isEnabled; // Revertir el cambio en la UI si falla
        }
    }

    async function handleLabelFilterChange(selectEl) {
        const memberId = selectEl.dataset.memberId;
        const scope = selectEl.dataset.scope;
        if (!memberId || !scope) return;

        const selectedValues = Array.from(selectEl.selectedOptions).map((opt) => opt.value).filter(Boolean);

        try {
            const { data: member, error: fetchError } = await userSupabaseClient
                .from('team_members')
                .select('permissions')
                .eq('user_id', memberId)
                .eq('team_id', teamInfo.team_id)
                .single();
            if (fetchError) throw fetchError;

            const currentPermissions = normalizePermissions(member.permissions);
            currentPermissions.label_filters[scope] = selectedValues;

            const { error: updateError } = await userSupabaseClient
                .from('team_members')
                .update({ permissions: currentPermissions })
                .eq('user_id', memberId)
                .eq('team_id', teamInfo.team_id);
            if (updateError) throw updateError;
        } catch (e) {
            console.error('[Settings] Error al actualizar etiquetas permitidas:', e);
            window.showToast('No se pudo actualizar el acceso por etiquetas.', 'error');
            await renderTeamManagementPanel(teamInfo);
        }
    }

    function normalizePermissions(rawPermissions) {
        const base = rawPermissions && typeof rawPermissions === 'object' ? { ...rawPermissions } : {};
        const labelFilters = base.label_filters && typeof base.label_filters === 'object'
            ? { ...base.label_filters }
            : {};

        if (!Array.isArray(labelFilters.contacts)) labelFilters.contacts = [];
        if (!Array.isArray(labelFilters.chats)) labelFilters.chats = [];

        base.label_filters = labelFilters;
        return base;
    }
    // --- FIN: Funciones para Gestión de Equipo ---

    function previewLogo(file) {
        if (!file) return;
        const preview = document.getElementById('logo-preview');
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; };
        reader.readAsDataURL(file);
    }

    function previewPaymentQR(file) {
        if (!file) return;
        const preview = document.getElementById('payment-qr-preview');
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; };
        reader.readAsDataURL(file);
    }

    async function handleNewReferenceImage(files) {
        const container = document.getElementById('reference-images-container');
        if (!container) return;

        for (const file of files) {
            if (container.querySelectorAll('.ref-image-item').length >= 3) {
                window.showToast?.('Puedes subir un máximo de 3 imágenes de referencia.', 'warning');
                break;
            }
            // Asegurarnos de que appInstance está disponible
            if (!window.appInstance) throw new Error("La instancia de la aplicación no está lista.");
            const newUrl = await window.appInstance.uploadAsset(file, 'reference_images'); // Usamos la función global
            if (newUrl) {
                const addSlot = document.getElementById('add-ref-image-slot');
                addSlot.insertAdjacentHTML('beforebegin', createReferenceImageItem(newUrl));
                lucide.createIcons();
            }
        }
        document.getElementById('reference-image-input').value = '';
        // Ocultar el slot si se alcanzó el límite
        if (container.querySelectorAll('.ref-image-item').length >= 3) {
            document.getElementById('add-ref-image-slot').style.display = 'none';
        }
    }

    function renderReferenceImages(urls) {
        const container = document.getElementById('reference-images-container');
        const addSlot = document.getElementById('add-ref-image-slot');
        if (!container) return;

        // Limpiar solo las imágenes, no el slot de añadir
        container.querySelectorAll('.ref-image-item').forEach(item => item.remove());

        (urls || []).forEach(url => {
            addSlot.insertAdjacentHTML('beforebegin', createReferenceImageItem(url));
        });

        // Ocultar el slot de añadir si se alcanza el límite
        addSlot.style.display = (urls || []).length >= 3 ? 'none' : 'flex';
        lucide.createIcons();
    }

    function handleDeleteReferenceImage(button) {
        const item = button.closest('.ref-image-item');
        if (item) {
            item.remove();
            // Mostrar el slot de añadir de nuevo si estábamos en el límite
            const addSlot = document.getElementById('add-ref-image-slot');
            if (addSlot) addSlot.style.display = 'flex';
        }
    }

    function createReferenceImageItem(url) {
        return `<div class="ref-image-item relative group aspect-square bg-slate-100 rounded-lg"><img src="${url}" class="w-full h-full object-cover rounded-lg"><button type="button" class="delete-ref-image-btn absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="x" class="w-3 h-3 pointer-events-none"></i></button></div>`;
    }

    // --- INICIO: Funciones para Sistema de Citas ---
    const DAYS_OF_WEEK = [
        { value: 0, name: 'Domingo' },
        { value: 1, name: 'Lunes' },
        { value: 2, name: 'Martes' },
        { value: 3, name: 'Miércoles' },
        { value: 4, name: 'Jueves' },
        { value: 5, name: 'Viernes' },
        { value: 6, name: 'Sábado' }
    ];

    function handleAddUnavailableDate() {
        const input = document.getElementById('new-unavailable-date');
        const date = input?.value;
        if (!date) return;

        if (!unavailableDates.includes(date)) {
            unavailableDates.push(date);
            unavailableDates.sort(); // Keep sorted
            renderUnavailableDates();
        }
        input.value = '';
    }

    function handleDeleteUnavailableDate(date) {
        unavailableDates = unavailableDates.filter(d => d !== date);
        renderUnavailableDates();
    }

    function renderUnavailableDates() {
        const container = document.getElementById('unavailable-dates-list');
        if (!container) return;

        container.innerHTML = unavailableDates.map(date => {
            // Format nice: "Lunes, 20 de Mayo" logic or simple text
            const dateObj = new Date(date + 'T12:00:00'); // Midday to avoid timezone shifting issues
            const formatted = dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

            return `
                <div class="unavailable-date-badge bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-2" data-date="${date}">
                    ${formatted} (${date})
                    <button type="button" class="delete-unavailable-date-btn text-red-600 hover:text-red-900 focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
        }).join('');
    }

    async function loadAppointmentSettings(userId) {
        try {
            // Cargar configuración de citas
            const { data: settings, error: settingsError } = await userSupabaseClient
                .from('appointment_settings')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            const appointmentsEnabled = document.getElementById('appointments-enabled');

            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error('[Settings] Error al cargar configuración de citas:', settingsError);
                return;
            }

            if (settings) {
                const appointmentsEnabledGeneral = document.getElementById('appointments-enabled-general');
                if (appointmentsEnabled) appointmentsEnabled.checked = settings.is_enabled;
                if (appointmentsEnabledGeneral) appointmentsEnabledGeneral.checked = settings.is_enabled;

                // Actualizar visibilidad del menú lateral
                if (window.updateAppointmentsMenuVisibility) {
                    window.updateAppointmentsMenuVisibility(settings.is_enabled);
                }

                const timezoneInput = document.getElementById('appointment-timezone');
                if (timezoneInput) timezoneInput.value = settings.timezone || 'America/Mexico_City';

                const defaultDurationInput = document.getElementById('appointment-default-duration');
                if (defaultDurationInput) defaultDurationInput.value = settings.default_duration_minutes || 60;

                const bufferTimeInput = document.getElementById('appointment-buffer-time');
                if (bufferTimeInput) bufferTimeInput.value = settings.buffer_time_minutes || 0;

                const advanceDaysInput = document.getElementById('appointment-advance-days');
                if (advanceDaysInput) advanceDaysInput.value = settings.advance_booking_days || 30;

                // Cargar max_appointments_per_day
                const maxPerDayInput = document.getElementById('appointment-max-per-day');
                if (maxPerDayInput) {
                    maxPerDayInput.value = settings.max_appointments_per_day || '';
                }
            } else {
                // Valores por defecto
                const appointmentsEnabledGeneral = document.getElementById('appointments-enabled-general');
                if (appointmentsEnabled) appointmentsEnabled.checked = false;
                if (appointmentsEnabledGeneral) appointmentsEnabledGeneral.checked = false;

                // Ocultar menú lateral por defecto
                if (window.updateAppointmentsMenuVisibility) {
                    window.updateAppointmentsMenuVisibility(false);
                }
            }

            // Cargar business_type desde appointment_settings
            const businessTypeSelect = document.getElementById('business-type');
            if (businessTypeSelect && settings?.business_type) {
                businessTypeSelect.value = settings.business_type;
            } else if (businessTypeSelect) {
                businessTypeSelect.value = 'both'; // Valor por defecto
            }

            // Cargar configuración de recordatorios
            const remindersEnabledInput = document.getElementById('reminders-enabled');
            const remindersConfigDiv = document.getElementById('reminders-config');
            if (remindersEnabledInput) {
                remindersEnabledInput.checked = settings?.reminders_enabled || false;
                if (remindersConfigDiv) {
                    remindersConfigDiv.classList.toggle('hidden', !settings?.reminders_enabled);
                }
            }

            // Cargar configuración de tipos de recordatorios
            const reminder24hEnabledInput = document.getElementById('reminder-24h-enabled');
            if (reminder24hEnabledInput) {
                reminder24hEnabledInput.checked = settings?.reminder_24h_enabled !== false; // default true
            }

            const reminder2hEnabledInput = document.getElementById('reminder-2h-enabled');
            if (reminder2hEnabledInput) {
                reminder2hEnabledInput.checked = settings?.reminder_2h_enabled !== false; // default true
            }

            const reminderDaysEnabledInput = document.getElementById('reminder-days-enabled');
            const reminderDaysConfigDiv = document.getElementById('reminder-days-config');
            if (reminderDaysEnabledInput) {
                // Habilitar si reminder_days_before está configurado
                reminderDaysEnabledInput.checked = settings?.reminder_days_before ? true : false;
                if (reminderDaysConfigDiv) {
                    reminderDaysConfigDiv.classList.toggle('hidden', !reminderDaysEnabledInput.checked);
                }
            }

            const reminderDaysBeforeInput = document.getElementById('reminder-days-before');
            if (reminderDaysBeforeInput) {
                reminderDaysBeforeInput.value = settings?.reminder_days_before || 1;
            }

            const reminderMessageTemplateInput = document.getElementById('reminder-message-template');
            if (reminderMessageTemplateInput && settings?.reminder_message_template) {
                reminderMessageTemplateInput.value = settings.reminder_message_template;
            }

            if (reminderMessageTemplateInput && settings?.reminder_message_template) {
                reminderMessageTemplateInput.value = settings.reminder_message_template;
            }

            // Load Unavailable Dates
            unavailableDates = settings?.unavailable_dates || [];
            renderUnavailableDates();

            // Cargar horarios solo si la sección está visible (toggle activado)
            if (settings?.is_enabled) {
                // Si está activado pero no hay horarios, inicializar con valores por defecto
                const { data: existingHours } = await userSupabaseClient
                    .from('appointment_hours')
                    .select('id')
                    .eq('user_id', userId)
                    .limit(1);

                if (!existingHours || existingHours.length === 0) {
                    await initializeDefaultHours(userId);
                }
                // Cargar horarios después de verificar/inicializar
                await loadAppointmentHours(userId);
            } else {
                // Si no está activado, asegurarse de que el contenedor esté vacío
                const container = document.getElementById('appointment-hours-container');
                if (container) {
                    container.innerHTML = '';
                }
            }

            // Cargar tipos de citas
            await loadAppointmentTypes(userId);
        } catch (error) {
            console.error('[Settings] Error al cargar configuración de citas:', error);
        }
    }

    async function initializeDefaultHours(userId) {
        try {
            // Verificar si ya hay horarios
            const { data: existingHours } = await userSupabaseClient
                .from('appointment_hours')
                .select('id')
                .eq('user_id', userId)
                .limit(1);

            if (existingHours && existingHours.length > 0) {
                return; // Ya hay horarios, no inicializar
            }

            // Obtener horas de apertura y cierre desde profiles
            const { data: profile } = await userSupabaseClient
                .from('profiles')
                .select('work_start_hour, work_end_hour')
                .eq('id', userId)
                .single();

            // Usar horas del perfil o valores por defecto
            const startHour = profile?.work_start_hour || 9;
            const endHour = profile?.work_end_hour || 18;

            // Formatear como HH:MM
            const startTime = `${String(startHour).padStart(2, '0')}:00`;
            const endTime = `${String(endHour).padStart(2, '0')}:00`;

            // Crear horarios por defecto para todos los días de la semana (0-6: Domingo a Sábado)
            const defaultHours = [];
            for (let day = 0; day <= 6; day++) {
                defaultHours.push({
                    user_id: userId,
                    day_of_week: day,
                    is_available: day >= 1 && day <= 5, // Lunes a Viernes activos por defecto, Sábado y Domingo inactivos
                    start_time: startTime,
                    end_time: endTime
                });
            }

            if (defaultHours.length > 0) {
                await userSupabaseClient
                    .from('appointment_hours')
                    .insert(defaultHours);
                // console.log('[Settings] Horarios por defecto creados (todos los días, Lunes-Viernes activos)');
            }
        } catch (error) {
            console.error('[Settings] Error al inicializar horarios por defecto:', error);
        }
    }

    async function loadAppointmentHours(userId) {
        try {
            const { data: hours, error } = await userSupabaseClient
                .from('appointment_hours')
                .select('*')
                .eq('user_id', userId)
                .order('day_of_week');

            if (error) {
                console.error('[Settings] Error al cargar horarios:', error);
                return;
            }

            const container = document.getElementById('appointment-hours-container');
            const emptyMessage = document.getElementById('appointment-hours-empty');
            if (!container) return;

            container.innerHTML = '';

            let hasAvailableDays = false;

            DAYS_OF_WEEK.forEach(day => {
                const dayHours = hours?.find(h => h.day_of_week === day.value);
                const isAvailable = dayHours?.is_available || false;
                if (isAvailable) hasAvailableDays = true;

                const html = `
                    <div class="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all">
                        <div class="w-28 flex-shrink-0">
                            <label class="block text-sm font-semibold text-slate-700">${day.name}</label>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <input type="checkbox" 
                                   class="day-available-toggle h-5 w-5 rounded text-green-600 focus:ring-green-500 focus:ring-2" 
                                   data-day="${day.value}"
                                   ${isAvailable ? 'checked' : ''}>
                            <label class="text-sm font-medium text-slate-700 cursor-pointer">Disponible</label>
                        </div>
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <input type="time" 
                                   class="day-start-time form-input border-slate-300 rounded-lg text-sm min-w-[160px]" 
                                   data-day="${day.value}"
                                   value="${dayHours?.start_time || '09:00'}"
                                   ${!isAvailable ? 'disabled' : ''}>
                            <span class="text-slate-400 font-medium">-</span>
                            <input type="time" 
                                   class="day-end-time form-input border-slate-300 rounded-lg text-sm min-w-[160px]" 
                                   data-day="${day.value}"
                                   value="${dayHours?.end_time || '18:00'}"
                                   ${!isAvailable ? 'disabled' : ''}>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });

            // Mostrar/ocultar mensaje de vacío
            if (emptyMessage) {
                if (hasAvailableDays) {
                    emptyMessage.classList.add('hidden');
                } else {
                    emptyMessage.classList.remove('hidden');
                }
            }

            // Agregar listeners para toggles
            container.querySelectorAll('.day-available-toggle').forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const day = e.target.dataset.day;
                    const startInput = container.querySelector(`.day-start-time[data-day="${day}"]`);
                    const endInput = container.querySelector(`.day-end-time[data-day="${day}"]`);
                    if (startInput) startInput.disabled = !e.target.checked;
                    if (endInput) endInput.disabled = !e.target.checked;

                    // Actualizar mensaje de vacío
                    const checkedToggles = container.querySelectorAll('.day-available-toggle:checked');
                    if (emptyMessage) {
                        if (checkedToggles.length > 0) {
                            emptyMessage.classList.add('hidden');
                        } else {
                            emptyMessage.classList.remove('hidden');
                        }
                    }
                });
            });

            // Inicializar iconos de Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('[Settings] Error al cargar horarios:', error);
        }
    }

    async function loadAppointmentTypes(userId) {
        try {
            const { data: types, error } = await userSupabaseClient
                .from('appointment_types')
                .select('*')
                .eq('user_id', userId)
                .order('created_at');

            if (error) {
                console.error('[Settings] Error al cargar tipos de citas:', error);
                return;
            }

            const container = document.getElementById('appointment-types-container');
            if (!container) return;

            container.innerHTML = '';

            (types || []).forEach(type => {
                container.insertAdjacentHTML('beforeend', createAppointmentTypeHTML(type));
            });
        } catch (error) {
            console.error('[Settings] Error al cargar tipos de citas:', error);
        }
    }

    function createAppointmentTypeHTML(type) {
        return `
            <div class="appointment-type-item bg-white p-4 rounded-lg border" data-type-id="${type.id || 'new'}">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                        <input type="text" 
                               class="appointment-type-name form-input border-slate-300 rounded-lg text-sm w-full" 
                               value="${type.name || ''}" 
                               placeholder="Ej: Consulta inicial">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Duración (minutos)</label>
                        <input type="number" 
                               class="appointment-type-duration form-input border-slate-300 rounded-lg text-sm w-full" 
                               value="${type.duration_minutes || 60}" 
                               min="15" 
                               step="15">
                    </div>
                    <div class="flex items-end">
                        <button type="button" 
                                class="delete-appointment-type-btn bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 text-sm">
                            Eliminar
                        </button>
                    </div>
                </div>
                <div class="mt-2">
                    <label class="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
                    <input type="text" 
                           class="appointment-type-description form-input border-slate-300 rounded-lg text-sm w-full" 
                           value="${type.description || ''}" 
                           placeholder="Descripción del tipo de cita">
                </div>
            </div>
        `;
    }

    function handleAddAppointmentType() {
        const container = document.getElementById('appointment-types-container');
        if (!container) return;

        const newType = {
            id: 'new_' + Date.now(),
            name: '',
            duration_minutes: 60,
            description: '',
            is_active: true
        };

        container.insertAdjacentHTML('beforeend', createAppointmentTypeHTML(newType));
    }

    function handleDeleteAppointmentType(item) {
        if (item) {
            item.remove();
        }
    }

    async function saveAppointmentSettings(userId) {
        try {
            const appointmentsEnabled = document.getElementById('appointments-enabled');
            const appointmentsEnabledGeneral = document.getElementById('appointments-enabled-general');
            // Usar cualquiera de los dos toggles (deben estar sincronizados)
            const isEnabled = (appointmentsEnabled?.checked || appointmentsEnabledGeneral?.checked) || false;

            if (!isEnabled) {
                // Si está deshabilitado, solo actualizar el estado pero mantener business_type
                const businessTypeSelect = document.getElementById('business-type');
                const businessType = businessTypeSelect?.value || 'both';

                await userSupabaseClient
                    .from('appointment_settings')
                    .upsert({
                        user_id: userId,
                        is_enabled: false,
                        business_type: businessType
                    }, { onConflict: 'user_id' });

                // Ocultar menú lateral cuando se desactiva
                if (window.updateAppointmentsMenuVisibility) {
                    window.updateAppointmentsMenuVisibility(false);
                }
                return;
            }

            // Guardar configuración general
            const maxPerDayInput = document.getElementById('appointment-max-per-day');
            const maxPerDayValue = maxPerDayInput?.value?.trim();

            // Obtener valores de los inputs con verificación null-safe
            const timezoneInput = document.getElementById('appointment-timezone');
            const defaultDurationInput = document.getElementById('appointment-default-duration');
            const bufferTimeInput = document.getElementById('appointment-buffer-time');
            const advanceDaysInput = document.getElementById('appointment-advance-days');

            const settings = {
                user_id: userId,
                is_enabled: true,
                calendar_type: 'internal',
                timezone: timezoneInput?.value || 'America/Mexico_City',
                default_duration_minutes: defaultDurationInput ? parseInt(defaultDurationInput.value) || 60 : 60,
                buffer_time_minutes: bufferTimeInput ? parseInt(bufferTimeInput.value) || 0 : 0,
                advance_booking_days: advanceDaysInput ? parseInt(advanceDaysInput.value) || 30 : 30,

                max_appointments_per_day: maxPerDayValue ? parseInt(maxPerDayValue) : null,
                unavailable_dates: unavailableDates
            };

            // Guardar business_type desde el selector en Información de la Empresa
            const businessTypeSelect = document.getElementById('business-type');
            if (businessTypeSelect) {
                settings.business_type = businessTypeSelect.value || 'both';
            }

            // Guardar configuración de recordatorios
            const remindersEnabledInput = document.getElementById('reminders-enabled');
            if (remindersEnabledInput) {
                settings.reminders_enabled = remindersEnabledInput.checked || false;
            }

            // Guardar configuración de tipos de recordatorios
            const reminder24hEnabledInput = document.getElementById('reminder-24h-enabled');
            if (reminder24hEnabledInput) {
                settings.reminder_24h_enabled = reminder24hEnabledInput.checked;
            }

            const reminder2hEnabledInput = document.getElementById('reminder-2h-enabled');
            if (reminder2hEnabledInput) {
                settings.reminder_2h_enabled = reminder2hEnabledInput.checked;
            }

            const reminderDaysEnabledInput = document.getElementById('reminder-days-enabled');
            const reminderDaysBeforeInput = document.getElementById('reminder-days-before');
            if (reminderDaysEnabledInput && reminderDaysBeforeInput) {
                if (reminderDaysEnabledInput.checked) {
                    settings.reminder_days_before = parseInt(reminderDaysBeforeInput.value) || 1;
                } else {
                    settings.reminder_days_before = null; // Deshabilitado
                }
            }

            const reminderMessageTemplateInput = document.getElementById('reminder-message-template');
            if (reminderMessageTemplateInput) {
                const template = reminderMessageTemplateInput.value?.trim();
                settings.reminder_message_template = template || null;
            }

            await userSupabaseClient
                .from('appointment_settings')
                .upsert(settings, { onConflict: 'user_id' });

            // Actualizar visibilidad del menú lateral después de guardar
            if (window.updateAppointmentsMenuVisibility) {
                window.updateAppointmentsMenuVisibility(true);
            }

            // Guardar horarios
            const hoursContainer = document.getElementById('appointment-hours-container');
            const hoursToSave = [];

            DAYS_OF_WEEK.forEach(day => {
                const toggle = hoursContainer?.querySelector(`.day-available-toggle[data-day="${day.value}"]`);
                const startInput = hoursContainer?.querySelector(`.day-start-time[data-day="${day.value}"]`);
                const endInput = hoursContainer?.querySelector(`.day-end-time[data-day="${day.value}"]`);

                if (toggle && startInput && endInput) {
                    hoursToSave.push({
                        user_id: userId,
                        day_of_week: day.value,
                        is_available: toggle.checked,
                        start_time: startInput.value || '09:00',
                        end_time: endInput.value || '18:00'
                    });
                }
            });

            // Eliminar horarios existentes y crear nuevos
            await userSupabaseClient
                .from('appointment_hours')
                .delete()
                .eq('user_id', userId);

            if (hoursToSave.length > 0) {
                await userSupabaseClient
                    .from('appointment_hours')
                    .insert(hoursToSave);
            }

            // Guardar tipos de citas
            const typesContainer = document.getElementById('appointment-types-container');
            const typesToSave = [];

            typesContainer?.querySelectorAll('.appointment-type-item').forEach(item => {
                const typeId = item.dataset.typeId;
                const name = item.querySelector('.appointment-type-name')?.value?.trim();
                const duration = parseInt(item.querySelector('.appointment-type-duration')?.value) || 60;
                const description = item.querySelector('.appointment-type-description')?.value?.trim() || null;

                if (name) {
                    if (typeId.startsWith('new_')) {
                        // Nuevo tipo
                        typesToSave.push({
                            user_id: userId,
                            name,
                            duration_minutes: duration,
                            description,
                            is_active: true
                        });
                    } else {
                        // Tipo existente - actualizar
                        userSupabaseClient
                            .from('appointment_types')
                            .update({
                                name,
                                duration_minutes: duration,
                                description,
                                is_active: true
                            })
                            .eq('id', typeId)
                            .eq('user_id', userId);
                    }
                }
            });

            // Insertar nuevos tipos
            if (typesToSave.length > 0) {
                await userSupabaseClient
                    .from('appointment_types')
                    .insert(typesToSave);
            }

            // console.log('[Settings] Configuración de citas guardada exitosamente');
        } catch (error) {
            console.error('[Settings] Error al guardar configuración de citas:', error);
            throw error;
        }
    }
    // --- FIN: Funciones para Sistema de Citas ---

    // --- INICIO: Funciones de Utilidad para Slugs ---
    function generateSlug(text) {
        if (!text) return '';
        return text
            .toString()
            .normalize('NFD') // Quitar acentos
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Espacios por guiones
            .replace(/[^\w-]+/g, '')  // Quitar caracteres no permitidos
            .replace(/--+/g, '-');    // Quitar guiones duplicados
    }

    let slugCheckTimeout = null;
    async function handleSlugChange(slug) {
        const slugInput = document.getElementById('company-slug');
        const feedbackDiv = document.getElementById('slug-feedback');
        const previewDiv = document.getElementById('slug-preview');
        const previewUrl = document.getElementById('slug-preview-url');

        if (!slugInput || !feedbackDiv) return;

        if (!slug) {
            feedbackDiv.classList.add('hidden');
            if (previewDiv) previewDiv.classList.add('hidden');
            slugInput.classList.remove('border-red-500', 'border-green-500');
            return;
        }

        const cleanSlug = generateSlug(slug);

        // Debounce para no saturar Supabase
        clearTimeout(slugCheckTimeout);
        slugCheckTimeout = setTimeout(async () => {
            feedbackDiv.classList.remove('hidden');
            feedbackDiv.innerHTML = '<i class="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full mr-1"></i> Verificando...';
            feedbackDiv.className = 'mt-1 text-xs text-slate-500';

            try {
                const targetUserId = await resolveTargetUserId();
                const { data: existing, error } = await userSupabaseClient
                    .from('profiles')
                    .select('id')
                    .eq('slug', cleanSlug)
                    .neq('id', targetUserId)
                    .maybeSingle();

                if (error) throw error;

                if (existing) {
                    // Si existe, buscar el siguiente disponible
                    let counter = 1;
                    let nextSlug = cleanSlug;
                    let found = false;

                    while (!found && counter < 100) {
                        nextSlug = `${cleanSlug}-${counter}`;
                        const { data: check } = await userSupabaseClient
                            .from('profiles')
                            .select('id')
                            .eq('slug', nextSlug)
                            .neq('id', targetUserId)
                            .maybeSingle();
                        if (!check) found = true;
                        else counter++;
                    }

                    feedbackDiv.innerHTML = `❌ <strong>${cleanSlug}</strong> no está disponible. Usando: <strong>${nextSlug}</strong>`;
                    feedbackDiv.className = 'mt-1 text-xs text-amber-600 font-medium';
                    slugInput.value = nextSlug;
                    slugInput.classList.remove('border-red-500');
                    slugInput.classList.add('border-green-500');

                    // Actualizar preview
                    if (previewDiv && previewUrl) {
                        previewUrl.textContent = `elinaia.com.mx/${nextSlug}`;
                        previewDiv.classList.remove('hidden');
                    }
                } else {
                    feedbackDiv.textContent = '✅ Link disponible';
                    feedbackDiv.className = 'mt-1 text-xs text-green-600';
                    slugInput.classList.remove('border-red-500');
                    slugInput.classList.add('border-green-500');
                    if (slugInput.value !== cleanSlug) slugInput.value = cleanSlug;

                    // Actualizar preview
                    if (previewDiv && previewUrl) {
                        previewUrl.textContent = `elinaia.com.mx/${cleanSlug}`;
                        previewDiv.classList.remove('hidden');
                    }
                }
            } catch (err) {
                console.error('Error checking slug:', err);
                feedbackDiv.classList.add('hidden');
                if (previewDiv) previewDiv.classList.add('hidden');
            }
        }, 500);
    }

    // Agregar listener para botón de copiar
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar tabs - mostrar la primera tab por defecto
        if (typeof window.switchSettingsTab === 'function') {
            window.switchSettingsTab('company');
        }

        const copyBtn = document.getElementById('copy-slug-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const previewUrl = document.getElementById('slug-preview-url');
                if (previewUrl && previewUrl.textContent) {
                    try {
                        await navigator.clipboard.writeText(previewUrl.textContent);
                        window.showToast?.('Link copiado al portapapeles', 'success');
                    } catch (err) {
                        console.error('Error al copiar:', err);
                        window.showToast?.('Error al copiar el link', 'error');
                    }
                }
            });
        }
    });
    // --- INICIO: Funciones de Utilidad para Voces ---
    let voicesLoaded = false;
    async function loadVoicesFromServer(selectedVoiceId = null) {
        if (voicesLoaded && !selectedVoiceId) return;

        const voiceSelect = document.getElementById('tts-voice');
        if (!voiceSelect) return;

        try {
            // console.log('[Settings] Cargando lista de voces predefinidas...');

            // Voces estáticas definidas por el usuario
            const voices = [
                {
                    id: '86V9x9hrQds83qf7zaGn',
                    name: 'Elina (Default)',
                    previewUrl: 'https://creativersezone.b-cdn.net/ELINA/media%20app/ElevenLabs_2026-02-11T19_33_21_Marcela%20-%20Colombian%20Girl_pvc_sp100_s50_sb75_v3.mp3'
                },
                {
                    id: 'VmejBeYhbrcTPwDniox7',
                    name: 'Maria',
                    previewUrl: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Maria-VmejBeYhbrcTPwDniox7.mp3'
                },
                {
                    id: 'ZSHzpa6aUvhjzShiBmYw',
                    name: 'Sanna',
                    previewUrl: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Sanna%20id%20ZSHzpa6aUvhjzShiBmYw.mp3'
                }
            ];

            voiceSelect.innerHTML = '';
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = voice.name;
                option.dataset.preview = voice.previewUrl;
                if (selectedVoiceId === voice.id) {
                    option.selected = true;
                }
                voiceSelect.appendChild(option);
            });

            // Si no hay seleccionada y la voz por defecto existe en la lista, seleccionarla
            if (!selectedVoiceId) {
                const defaultVoiceId = '86V9x9hrQds83qf7zaGn';
                if (voices.some(v => v.id === defaultVoiceId)) {
                    voiceSelect.value = defaultVoiceId;
                }
            }

            voicesLoaded = true;
            // console.log(`[Settings] ✓ ${voices.length} voces cargadas exitosamente.`);
        } catch (error) {
            console.error('[Settings] Error cargando voces:', error);
            // Fallback si falla
            if (voiceSelect.innerHTML.includes('Cargando')) {
                voiceSelect.innerHTML = '<option value="86V9x9hrQds83qf7zaGn" selected>Por defecto (Elina)</option>';
            }
        }
    }
    // --- FIN: Funciones de Utilidad para Voces ---

    // --- INICIO: Función de Tabs ---
    window.switchSettingsTab = function(tabName) {
        // console.log('[Settings] Cambiando a tab:', tabName);

        // Ocultar todos los contenidos de tabs
        const allTabContents = document.querySelectorAll('.settings-tab-content');
        allTabContents.forEach(content => {
            content.style.display = 'none';
        });

        // Mostrar el contenido del tab seleccionado
        const selectedContent = document.getElementById(`tab-${tabName}`);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }

        // Actualizar clases de los botones de tabs
        const allTabButtons = document.querySelectorAll('.settings-tab');
        allTabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Activar el botón del tab seleccionado
        const selectedButton = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
    };
    // --- FIN: Función de Tabs ---

    // --- FIN: Funciones de Utilidad para Slugs ---
})();
