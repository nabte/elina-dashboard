// appointments.js - Módulo para gestionar citas y calendario

(function () {
    let isInitialized = false;
    let userSupabaseClient = null;
    let currentView = 'month'; // 'month' o 'week'
    let currentDate = new Date(); // Fecha actual del calendario
    let appointmentsData = []; // Datos de citas cargadas
    let availableContacts = []; // Lista de contactos para búsqueda rápida

    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'appointments') {
            if (!isInitialized) {
                initAppointmentsPanel();
            }
            // Inicializar vista del calendario
            if (currentView === 'month') {
                switchView('month');
            } else {
                switchView('week');
            }
            loadAppointments();
        }
    });

    document.addEventListener('panel:loaded', ({ detail }) => {
        if (detail.panelId === 'appointments' && !isInitialized) {
            initAppointmentsPanel();
            loadAppointments();
        }
    });

    // Función helper global para formatear hora a formato 12 horas (1:00 PM)
    function formatTime12Hour(time24) {
        if (!time24) return '';
        // Si ya es un string en formato HH:MM, usarlo directamente
        let hours, minutes;
        if (typeof time24 === 'string') {
            const parts = time24.split(':');
            hours = parseInt(parts[0]);
            minutes = parts[1] || '00';
        } else {
            // Si es un objeto Date
            hours = time24.getHours();
            minutes = String(time24.getMinutes()).padStart(2, '0');
        }
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
    }

    function initAppointmentsPanel() {
        //         console.log('[Appointments] Inicializando panel de citas...');
        isInitialized = true;
        userSupabaseClient = window.auth.sb;
        setupEventListeners();
    }

    function setupEventListeners() {
        document.getElementById('refresh-appointments-btn')?.addEventListener('click', () => {
            loadAppointments();
        });

        document.getElementById('appointments-filter-status')?.addEventListener('change', () => {
            loadAppointments();
        });

        document.getElementById('appointments-filter-date')?.addEventListener('change', () => {
            loadAppointments();
        });

        // Botones de vista del calendario (mes y semana)
        document.getElementById('calendar-view-month-btn')?.addEventListener('click', () => {
            switchView('month');
        });
        document.getElementById('calendar-view-week-btn')?.addEventListener('click', () => {
            switchView('week');
        });
        document.getElementById('calendar-view-month-btn-week')?.addEventListener('click', () => {
            switchView('month');
        });
        document.getElementById('calendar-view-week-btn-week')?.addEventListener('click', () => {
            switchView('week');
        });

        // Botones de nueva cita en ambas vistas
        document.getElementById('new-appointment-btn-week')?.addEventListener('click', () => {
            openNewAppointmentModal();
        });

        // Sincronizar filtros entre vistas
        document.getElementById('appointments-filter-status-week')?.addEventListener('change', (e) => {
            const monthFilter = document.getElementById('appointments-filter-status');
            if (monthFilter) {
                monthFilter.value = e.target.value;
            }
            loadAppointments();
        });

        // Navegación del calendario
        document.getElementById('calendar-prev-month')?.addEventListener('click', () => {
            navigateCalendar(-1);
        });
        document.getElementById('calendar-next-month')?.addEventListener('click', () => {
            navigateCalendar(1);
        });
        document.getElementById('calendar-prev-week')?.addEventListener('click', () => {
            navigateCalendar(-1);
        });
        document.getElementById('calendar-next-week')?.addEventListener('click', () => {
            navigateCalendar(1);
        });

        // Botón para nueva cita
        document.getElementById('new-appointment-btn')?.addEventListener('click', () => {
            openNewAppointmentModal();
        });
        document.getElementById('open-new-appointment-modal-btn')?.addEventListener('click', () => {
            openNewAppointmentModal();
        });

        // Botones del modal
        document.getElementById('cancel-appointment-btn')?.addEventListener('click', () => {
            closeNewAppointmentModal();
        });

        document.getElementById('close-new-appointment-modal-btn')?.addEventListener('click', () => {
            closeNewAppointmentModal();
        });

        document.getElementById('save-appointment-btn')?.addEventListener('click', () => {
            saveNewAppointment();
        });

        // Listener para cargar slots cuando cambia la fecha
        const startDateInput = document.getElementById('appointment-start-date');
        const dateWrapper = document.getElementById('appointment-date-wrapper');
        if (startDateInput && dateWrapper) {
            // Hacer que todo el contenedor sea clickeable para abrir el calendario
            dateWrapper.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startDateInput.focus();
                startDateInput.showPicker?.(); // Método moderno para abrir el calendario
            });

            startDateInput.addEventListener('change', async (e) => {
                const date = e.target.value;
                updateDateDisplay('appointment-start-date', 'appointment-date-display');
                if (date) {
                    await loadAvailableTimeSlots(date, 'new');
                }
            });
            // No ocultar el display cuando el input tiene foco - mantenerlo visible siempre
            // Solo ocultarlo temporalmente cuando el calendario nativo está abierto
            startDateInput.addEventListener('focus', () => {
                // No hacer nada - mantener el display visible
            });
            // Actualizar display cuando el input pierde foco
            startDateInput.addEventListener('blur', () => {
                updateDateDisplay('appointment-start-date', 'appointment-date-display');
            });
        }

        // Listener para recalcular slots cuando cambia el servicio
        document.getElementById('appointment-service-select')?.addEventListener('change', async (e) => {
            const serviceId = e.target.value;
            const selectedOption = e.target.options[e.target.selectedIndex];
            const duration = selectedOption?.dataset.duration;

            const dateInput = document.getElementById('appointment-start-date');
            if (dateInput?.value) {
                await loadAvailableTimeSlots(dateInput.value, 'new');
            }

            // Auto-calcular hora de fin basándose en la duración del servicio
            if (duration) {
                const startTimeInput = document.getElementById('appointment-start-time');
                const endTimeInput = document.getElementById('appointment-end-time');
                const startDateInput = document.getElementById('appointment-start-date');
                const endDateInput = document.getElementById('appointment-end-date');

                if (startTimeInput?.value && startDateInput?.value) {
                    const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
                    const durationMinutes = parseInt(duration, 10);

                    if (!isNaN(durationMinutes) && durationMinutes > 0) {
                        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

                        // Actualizar fecha de fin
                        const endDateStr = endDateTime.toISOString().split('T')[0];
                        if (endDateInput) endDateInput.value = endDateStr;

                        // Actualizar hora de fin
                        const hours = String(endDateTime.getHours()).padStart(2, '0');
                        const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
                        if (endTimeInput) endTimeInput.value = `${hours}:${minutes}`;
                    }
                }
            }

            // Generar título automático si hay servicio y contacto
            generateAppointmentTitle();
        });

        // Listener para generar título cuando se selecciona un contacto
        document.getElementById('appointment-contact-select')?.addEventListener('change', () => {
            generateAppointmentTitle();
        });

        // Listener para recalcular hora de fin cuando cambia la hora de inicio
        document.getElementById('appointment-start-time')?.addEventListener('change', (e) => {
            const serviceSelect = document.getElementById('appointment-service-select');
            const selectedOption = serviceSelect?.options[serviceSelect.selectedIndex];
            const duration = selectedOption?.dataset.duration;

            if (duration) {
                const startTimeInput = e.target;
                const endTimeInput = document.getElementById('appointment-end-time');
                const startDateInput = document.getElementById('appointment-start-date');
                const endDateInput = document.getElementById('appointment-end-date');

                if (startTimeInput.value && startDateInput?.value) {
                    const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
                    const durationMinutes = parseInt(duration, 10);

                    if (!isNaN(durationMinutes) && durationMinutes > 0) {
                        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

                        // Actualizar fecha de fin
                        const endDateStr = endDateTime.toISOString().split('T')[0];
                        if (endDateInput) endDateInput.value = endDateStr;

                        // Actualizar hora de fin
                        const hours = String(endDateTime.getHours()).padStart(2, '0');
                        const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
                        if (endTimeInput) endTimeInput.value = `${hours}:${minutes}`;
                    }
                }
            }
        });

        // Listener para limpiar selección de tiempo
        document.getElementById('appointment-clear-time-btn')?.addEventListener('click', () => {
            clearSelectedTime('new');
            const dateInput = document.getElementById('appointment-start-date');
            if (dateInput?.value) {
                loadAvailableTimeSlots(dateInput.value, 'new');
            }
        });

        // Event listeners para modal de detalles de citas
        document.getElementById('close-appointment-details-modal-btn')?.addEventListener('click', () => {
            closeAppointmentDetailsModal();
        });

        document.getElementById('cancel-appointment-details-btn')?.addEventListener('click', () => {
            closeAppointmentDetailsModal();
        });

        document.getElementById('save-appointment-details-btn')?.addEventListener('click', () => {
            saveAppointmentDetails();
        });

        document.getElementById('delete-appointment-btn')?.addEventListener('click', () => {
            deleteAppointment();
        });

        document.getElementById('send-reminder-btn')?.addEventListener('click', () => {
            sendManualReminder();
        });

        // Listener para cargar slots cuando cambia la fecha en modal de detalles
        const detailsDateInput = document.getElementById('appointment-details-start-date');
        const detailsDateWrapper = document.getElementById('appointment-details-date-wrapper');
        if (detailsDateInput && detailsDateWrapper) {
            // Hacer que todo el contenedor sea clickeable para abrir el calendario
            detailsDateWrapper.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                detailsDateInput.focus();
                detailsDateInput.showPicker?.(); // Método moderno para abrir el calendario
            });

            detailsDateInput.addEventListener('change', async (e) => {
                const date = e.target.value;
                updateDateDisplay('appointment-details-start-date', 'appointment-details-date-display');
                if (date) {
                    await loadAvailableTimeSlots(date, 'details');
                }
            });
            // No ocultar el display cuando el input tiene foco - mantenerlo visible siempre
            // Solo ocultarlo temporalmente cuando el calendario nativo está abierto
            detailsDateInput.addEventListener('focus', () => {
                // No hacer nada - mantener el display visible
            });
            // Actualizar display cuando el input pierde foco
            detailsDateInput.addEventListener('blur', () => {
                updateDateDisplay('appointment-details-start-date', 'appointment-details-date-display');
            });
        }

        // Listener para recalcular slots cuando cambia el servicio en modal de detalles
        document.getElementById('appointment-details-service-select')?.addEventListener('change', async (e) => {
            const serviceId = e.target.value;
            const selectedOption = e.target.options[e.target.selectedIndex];
            const duration = selectedOption?.dataset.duration;

            const dateInput = document.getElementById('appointment-details-start-date');
            if (dateInput?.value) {
                await loadAvailableTimeSlots(dateInput.value, 'details');
            }

            // Generar título automático si hay servicio y contacto
            generateAppointmentTitleDetails();
        });

        // Listener para generar título cuando se selecciona un contacto en modal de detalles
        document.getElementById('appointment-details-contact-select')?.addEventListener('change', () => {
            generateAppointmentTitleDetails();
        });

        // Listener para limpiar selección de tiempo en modal de detalles
        document.getElementById('appointment-details-clear-time-btn')?.addEventListener('click', () => {
            clearSelectedTime('details');
            const dateInput = document.getElementById('appointment-details-start-date');
            if (dateInput?.value) {
                loadAvailableTimeSlots(dateInput.value, 'details');
            }
        });

        // Botones de configuración rápida
        document.getElementById('appointments-config-btn')?.addEventListener('click', () => {
            openQuickConfigModal();
        });
        document.getElementById('appointments-config-btn-week')?.addEventListener('click', () => {
            openQuickConfigModal();
        });
        document.getElementById('close-appointments-config-modal-btn')?.addEventListener('click', () => {
            closeQuickConfigModal();
        });
        document.getElementById('cancel-appointments-config-btn')?.addEventListener('click', () => {
            closeQuickConfigModal();
        });
        document.getElementById('save-appointments-config-btn')?.addEventListener('click', () => {
            saveQuickConfig();
        });
        document.getElementById('refresh-hours-btn')?.addEventListener('click', async () => {
            const userId = await window.getUserId();
            if (userId) {
                await loadQuickConfigHours(userId);
            }
        });
        document.getElementById('open-full-settings-btn')?.addEventListener('click', () => {
            closeQuickConfigModal();
            // Cambiar al panel de configuración
            const settingsLink = document.querySelector('[data-target="settings"]');
            if (settingsLink) {
                settingsLink.click();
            }
        });

        document.getElementById('open-products-btn')?.addEventListener('click', () => {
            closeQuickConfigModal();
            // Cambiar al panel de productos
            const productsLink = document.querySelector('[data-target="products"]');
            if (productsLink) {
                productsLink.click();
            }
        });

        // Configurar búsqueda de contactos
        setupContactSearch('appointment-contact-search', 'appointment-contact-select', 'appointment-contact-results', 'new');
        setupContactSearch('appointment-details-contact-search', 'appointment-details-contact-select', 'appointment-details-contact-results', 'details');

        initAppointmentsConfigLogic();
    }

    function setupContactSearch(searchId, selectId, resultsId, modalType) {
        const searchInput = document.getElementById(searchId);
        const resultsContainer = document.getElementById(resultsId);
        const hiddenInput = document.getElementById(selectId);

        if (!searchInput || !resultsContainer || !hiddenInput) return;

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            renderContactSearchResults(searchTerm, resultsContainer, searchInput, hiddenInput, modalType);
        });

        searchInput.addEventListener('focus', () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            renderContactSearchResults(searchTerm, resultsContainer, searchInput, hiddenInput, modalType);
        });

        // Ocultar resultados al hacer clic fuera
        document.addEventListener('mousedown', (e) => {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                setTimeout(() => {
                    resultsContainer.classList.add('hidden');
                }, 150);
            }
        });
    }

    function renderContactSearchResults(searchTerm, container, searchInput, hiddenInput, modalType) {
        if (!availableContacts || availableContacts.length === 0) {
            container.innerHTML = '<div class="p-3 text-sm text-slate-500 text-center">Cargando contactos...</div>';
            container.classList.remove('hidden');
            return;
        }

        const filtered = availableContacts.filter(c => {
            const name = (c.full_name || '').toLowerCase();
            const phone = (c.phone_number || '').toLowerCase();
            return name.includes(searchTerm) || phone.includes(searchTerm);
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div class="p-3 text-sm text-slate-500 text-center">No se encontraron contactos</div>';
        } else {
            container.innerHTML = filtered.map(c => `
                <div class="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 contact-search-item" 
                    data-id="${c.id}" 
                    data-name="${c.full_name || 'Sin nombre'}">
                    <div class="font-medium text-sm text-slate-900">${c.full_name || 'Sin nombre'}</div>
                    <div class="text-xs text-slate-500">${c.phone_number || 'Sin teléfono'}</div>
                </div>
            `).join('');

            container.querySelectorAll('.contact-search-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    const name = item.dataset.name;
                    hiddenInput.value = id;
                    searchInput.value = name;
                    container.classList.add('hidden');

                    // Disparar generación de título
                    if (modalType === 'new') {
                        generateAppointmentTitle();
                    } else {
                        generateAppointmentTitleDetails();
                    }
                });
            });
        }

        container.classList.remove('hidden');
    }

    async function loadAppointments() {
        try {
            const container = document.getElementById('appointments-container');
            const loader = document.getElementById('appointments-loader');
            const list = document.getElementById('appointments-list');
            const empty = document.getElementById('appointments-empty');

            if (!container || !loader || !list || !empty) return;

            loader.classList.remove('hidden');
            list.classList.add('hidden');
            empty.classList.add('hidden');

            const userId = await window.getUserId();
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }

            // Obtener filtros
            const statusFilter = document.getElementById('appointments-filter-status')?.value || 'all';
            const dateFilter = document.getElementById('appointments-filter-date')?.value;

            // Construir query - intentar con productos, si falla hacer sin productos
            let query = userSupabaseClient
                .from('meetings')
                .select(`
                    *,
                    contacts:contact_id (
                        id,
                        full_name,
                        phone_number
                    ),
                    appointment_types:appointment_type_id (
                        id,
                        name,
                        duration_minutes
                    ),
                    products:product_id (
                        id,
                        product_name,
                        service_duration_minutes
                    )
                `)
                .eq('user_id', userId)
                .order('start_time', { ascending: true });

            // Aplicar filtros
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (dateFilter) {
                const startOfDay = new Date(dateFilter);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(dateFilter);
                endOfDay.setHours(23, 59, 59, 999);

                query = query
                    .gte('start_time', startOfDay.toISOString())
                    .lte('start_time', endOfDay.toISOString());
            }

            let { data: appointments, error } = await query;

            // Si hay error relacionado con productos, intentar sin productos
            if (error && error.code === 'PGRST200' && error.message?.includes('product_id')) {
                console.warn('[Appointments] Relación con productos no disponible, cargando sin productos');
                query = userSupabaseClient
                    .from('meetings')
                    .select(`
                        *,
                        contacts:contact_id (
                            id,
                            full_name,
                            phone_number
                        ),
                        appointment_types:appointment_type_id (
                            id,
                            name,
                            duration_minutes
                        )
                    `)
                    .eq('user_id', userId)
                    .order('start_time', { ascending: true });

                const retryResult = await query;
                appointments = retryResult.data;
                error = retryResult.error;
            }

            if (error) {
                throw error;
            }

            loader.classList.add('hidden');

            // Eliminar duplicados por ID antes de asignar
            const uniqueAppointments = [];
            const seenIds = new Set();
            if (appointments) {
                for (const apt of appointments) {
                    if (apt && apt.id && !seenIds.has(apt.id)) {
                        seenIds.add(apt.id);
                        uniqueAppointments.push(apt);
                    }
                }
            }

            appointmentsData = uniqueAppointments;


            if (!appointments || appointments.length === 0) {
                empty.classList.remove('hidden');
                // Aún mostrar el calendario vacío
                renderCalendar();
                return;
            }

            renderCalendar();

        } catch (error) {
            console.error('[Appointments] Error al cargar citas:', error);
            const loader = document.getElementById('appointments-loader');
            if (loader) {
                loader.innerHTML = `
                    <div class="text-center text-red-500 p-8">
                        <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
                        <p>Error al cargar las citas. Intenta nuevamente.</p>
                    </div>
                `;
                lucide.createIcons();
            }
            window.showToast?.('Error al cargar las citas', 'error');
        }
    }

    function switchView(view) {
        currentView = view;
        const monthBtn = document.getElementById('calendar-view-month-btn');
        const weekBtn = document.getElementById('calendar-view-week-btn');

        if (monthBtn && weekBtn) {
            if (view === 'month') {
                monthBtn.classList.remove('text-slate-700', 'hover:text-slate-900');
                monthBtn.classList.add('bg-green-600', 'text-white', 'shadow-sm');
                weekBtn.classList.remove('bg-green-600', 'text-white', 'shadow-sm');
                weekBtn.classList.add('text-slate-700', 'hover:text-slate-900');
            } else {
                weekBtn.classList.remove('text-slate-700', 'hover:text-slate-900');
                weekBtn.classList.add('bg-green-600', 'text-white', 'shadow-sm');
                monthBtn.classList.remove('bg-green-600', 'text-white', 'shadow-sm');
                monthBtn.classList.add('text-slate-700', 'hover:text-slate-900');
            }
        }

        renderCalendar();
    }

    function navigateCalendar(direction) {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + direction);
        } else {
            currentDate.setDate(currentDate.getDate() + (direction * 7));
        }
        renderCalendar();
    }

    function renderCalendar() {
        const monthView = document.getElementById('calendar-month-view');
        const weekView = document.getElementById('calendar-week-view');
        const empty = document.getElementById('appointments-empty');
        const loader = document.getElementById('appointments-loader');

        if (loader) loader.classList.add('hidden');

        if (empty) {
            if (appointmentsData && appointmentsData.length > 0) {
                empty.classList.add('hidden');
            } else {
                empty.classList.remove('hidden');
            }
        }

        if (currentView === 'month') {
            if (monthView) monthView.classList.remove('hidden');
            if (weekView) weekView.classList.add('hidden');
            renderMonthView();
        } else {
            if (weekView) weekView.classList.remove('hidden');
            if (monthView) monthView.classList.add('hidden');
            renderWeekView();
        }
    }

    function renderMonthView() {
        const grid = document.getElementById('calendar-month-grid');
        const title = document.getElementById('calendar-month-title');
        if (!grid || !title) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Actualizar título
        title.textContent = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        // Primer día del mes y último día
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay(); // 0 = Domingo, 6 = Sábado
        const daysInMonth = lastDay.getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);


        // Días de la semana
        const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        let html = weekDays.map(day => `<div class="text-center font-semibold text-slate-700 py-2 text-sm">${day}</div>`).join('');

        // Días vacíos antes del primer día del mes
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += '<div class="aspect-square"></div>';
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isPast = date < today;
            const isToday = dateStr === today.toISOString().split('T')[0];

            // Obtener citas de este día (sin duplicados)
            const seenIds = new Set();
            const dayAppointments = appointmentsData.filter(apt => {
                if (!apt || !apt.start_time || !apt.id) return false;
                // Evitar duplicados
                if (seenIds.has(apt.id)) return false;
                seenIds.add(apt.id);
                try {
                    const aptDate = new Date(apt.start_time);
                    const aptDateStr = aptDate.toISOString().split('T')[0];
                    const matches = aptDateStr === dateStr;


                    return matches;
                } catch (e) {
                    console.warn('[Appointments] Error al procesar fecha de cita:', e, apt);
                    return false;
                }
            });

            let dayClass = 'aspect-square border border-slate-300 rounded-lg p-1.5 overflow-y-auto relative transition-all duration-200';
            let clickable = false;
            if (isPast) {
                dayClass += ' bg-slate-100 opacity-50 cursor-not-allowed';
            } else if (isToday) {
                dayClass += ' bg-green-50 border-green-500 border-2 cursor-pointer hover:bg-green-100 hover:shadow-md';
                clickable = true;
            } else {
                dayClass += ' bg-white hover:bg-slate-50 hover:border-green-400 hover:shadow-sm cursor-pointer';
                clickable = true;
            }

            html += `
                <div class="${dayClass}" ${clickable ? `data-calendar-day data-date="${dateStr}"` : ''}>
                    <div class="flex items-center justify-between mb-0.5">
                        <div class="text-xs font-semibold ${isToday ? 'text-green-700' : 'text-slate-700'}">${day}</div>
                        ${clickable ? `<button class="calendar-add-btn w-4 h-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center hover:bg-green-700 transition" data-date="${dateStr}" title="Agregar cita">
                            <i data-lucide="plus" class="w-2.5 h-2.5"></i>
                        </button>` : ''}
                    </div>
                    <div class="space-y-0.5">
                        ${dayAppointments.slice(0, 3).map(apt => {
                if (!apt) return '';
                const startTime = new Date(apt.start_time);
                const timeStr = formatTime12Hour(startTime);

                // Detectar si fue creada por IA
                const isAICreated = apt.summary?.toLowerCase().includes('elina ia') ||
                    apt.summary?.toLowerCase().includes('cita agendada por ia') ||
                    apt.metadata?.created_by_ai === true ||
                    apt.metadata?.source === 'ai';

                const statusColors = {
                    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    'confirmed': 'bg-green-100 text-green-800 border-green-300',
                    'completed': 'bg-blue-100 text-blue-800 border-blue-300',
                    'cancelled': 'bg-red-100 text-red-800 border-red-300'
                };

                // Estados de confirmación
                const confirmationStatus = apt.confirmation_status || 'draft';
                const confirmationLabels = {
                    'draft': '📝',
                    'pending': '⏳',
                    'confirmed': '✅',
                    'cancelled': '❌'
                };
                const confirmationIcon = confirmationLabels[confirmationStatus] || '';

                // Color azul para citas creadas por IA
                const aiColor = 'bg-blue-100 text-blue-800 border-blue-300';
                const colorClass = isAICreated ? aiColor : (statusColors[apt.status] || 'bg-slate-100 border-slate-300');

                // Obtener nombre del contacto
                const contactName = apt.contacts?.full_name || (Array.isArray(apt.contacts) && apt.contacts[0]?.full_name) || '';

                const aptTitle = apt.summary || apt.products?.product_name || 'Cita';

                // Si es de la IA, mostrarlo claramente
                const displayTitle = isAICreated ?
                    `🤖 ${contactName || aptTitle}` :
                    (contactName ? contactName : (aptTitle.length > 15 ? aptTitle.substring(0, 15) + '...' : aptTitle));

                const fullTooltip = `${timeStr} - ${aptTitle}${contactName ? ` (${contactName})` : ''}`;
                const confirmationTooltip = confirmationStatus === 'draft' ? 'Borrador' :
                    confirmationStatus === 'pending' ? 'Esperando confirmación' :
                        confirmationStatus === 'confirmed' ? 'Confirmado' : 'Cancelado';
                return `
                                <div class="text-[10px] p-0.5 rounded border ${colorClass} truncate font-medium cursor-pointer hover:opacity-80 transition-opacity" title="${fullTooltip} - ${confirmationTooltip}" data-appointment-id="${apt.id || ''}">
                                    ${confirmationIcon} ${timeStr} ${displayTitle}
                                </div>
                            `;
            }).filter(html => html).join('')}
                        ${dayAppointments.length > 3 ? `<div class="text-[10px] text-slate-500">+${dayAppointments.length - 3}</div>` : ''}
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
        lucide.createIcons();

        // Agregar event listeners para días clickeables
        grid.querySelectorAll('[data-calendar-day]').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                // No abrir si se hace clic en el botón + (tiene su propio listener)
                if (e.target.closest('.calendar-add-btn')) return;
                const dateStr = dayEl.dataset.date;
                if (dateStr) {
                    openNewAppointmentModal(dateStr, null);
                }
            });
        });

        // Agregar event listeners para botones + en días
        grid.querySelectorAll('.calendar-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dateStr = btn.dataset.date;
                if (dateStr) {
                    openNewAppointmentModal(dateStr, null);
                }
            });
        });

        // Agregar event listeners para citas clickeables (para ver detalles)
        grid.querySelectorAll('[data-appointment-id]').forEach(aptEl => {
            aptEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const appointmentId = aptEl.dataset.appointmentId;
                if (appointmentId) {
                    openAppointmentDetailsModal(appointmentId);
                }
            });
        });
    }

    function renderWeekView() {
        const grid = document.getElementById('calendar-week-grid');
        const title = document.getElementById('calendar-week-title');
        if (!grid || !title) return;

        // Calcular inicio de semana (lunes)
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
        const weekStart = new Date(date.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);

        // Actualizar título
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        title.textContent = `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

        // Horas del día (8 AM a 8 PM)
        const hours = [];
        for (let h = 8; h <= 20; h++) {
            hours.push(h);
        }

        // Días de la semana
        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        let html = '<div class="font-semibold text-slate-600 py-2 border-b">Hora</div>';

        // Encabezados de días
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const isToday = dayDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
            html += `
                <div class="font-semibold text-slate-600 py-2 border-b text-center ${isToday ? 'bg-green-50' : ''}">
                    <div>${weekDays[i]}</div>
                    <div class="text-lg ${isToday ? 'text-green-700' : 'text-slate-700'}">${dayDate.getDate()}</div>
                </div>
            `;
        }

        // Filas de horas
        hours.forEach(hour => {
            html += `<div class="text-xs text-slate-500 py-2 border-r border-b">${hour.toString().padStart(2, '0')}:00</div>`;

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(weekStart);
                dayDate.setDate(weekStart.getDate() + i);
                dayDate.setHours(hour, 0, 0, 0);

                // Buscar citas en esta hora (sin duplicados)
                const seenIds = new Set();
                const hourAppointments = appointmentsData.filter(apt => {
                    if (!apt || !apt.start_time || !apt.end_time || !apt.id) return false;
                    // Evitar duplicados
                    if (seenIds.has(apt.id)) return false;
                    seenIds.add(apt.id);
                    try {
                        const aptStart = new Date(apt.start_time);
                        const aptEnd = new Date(apt.end_time);
                        return aptStart <= dayDate && aptEnd > dayDate;
                    } catch (e) {
                        console.warn('[Appointments] Error al procesar fecha/hora de cita:', e, apt);
                        return false;
                    }
                });

                let cellClass = 'min-h-[60px] border-r border-b p-1 relative';
                const isPast = dayDate < new Date();
                const dateStr = dayDate.toISOString().split('T')[0];
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;

                if (isPast) {
                    cellClass += ' bg-slate-50 opacity-60';
                } else {
                    cellClass += ' bg-white hover:bg-green-50 cursor-pointer group';
                }

                html += `
                    <div class="${cellClass}" ${!isPast ? `data-calendar-slot data-date="${dateStr}" data-time="${timeStr}"` : ''}>
                        ${hourAppointments.map(apt => {
                    if (!apt) return '';
                    const startTime = new Date(apt.start_time);

                    // Detectar si fue creada por IA
                    const isAICreated = apt.summary?.includes('Cita vía Elina IA') ||
                        apt.summary?.includes('Elina IA') ||
                        apt.metadata?.created_by_ai === true ||
                        apt.metadata?.source === 'ai';

                    const statusColors = {
                        'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                        'confirmed': 'bg-green-100 text-green-800 border-green-300',
                        'completed': 'bg-blue-100 text-blue-800 border-blue-300',
                        'cancelled': 'bg-red-100 text-red-800 border-red-300'
                    };

                    // Estados de confirmación
                    const confirmationStatus = apt.confirmation_status || 'draft';
                    const confirmationLabels = {
                        'draft': '📝',
                        'pending': '⏳',
                        'confirmed': '✅',
                        'cancelled': '❌'
                    };
                    const confirmationIcon = confirmationLabels[confirmationStatus] || '';

                    // Color rosa para citas creadas por IA
                    const aiColor = 'bg-pink-100 text-pink-800 border-pink-300';
                    const colorClass = isAICreated ? aiColor : (statusColors[apt.status] || 'bg-slate-100');

                    const aptTitle = apt.summary || apt.products?.product_name || 'Cita';
                    const confirmationTooltip = confirmationStatus === 'draft' ? 'Borrador' :
                        confirmationStatus === 'pending' ? 'Esperando confirmación' :
                            confirmationStatus === 'confirmed' ? 'Confirmado' : 'Cancelado';
                    return `
                                <div class="text-xs p-1 rounded border ${colorClass} mb-1 cursor-pointer hover:opacity-80 transition-opacity" title="${aptTitle} - ${confirmationTooltip}" data-appointment-id="${apt.id || ''}">
                                    ${confirmationIcon} ${formatTime12Hour(startTime)} ${aptTitle}
                                    </div>
                            `;
                }).filter(html => html).join('')}
                        ${!isPast && hourAppointments.length === 0 ? `
                            <div class="opacity-0 group-hover:opacity-100 transition absolute inset-0 flex items-center justify-center pointer-events-none">
                                <button class="calendar-slot-add-btn w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 shadow-lg pointer-events-auto" data-date="${dateStr}" data-time="${timeStr}" title="Agregar cita a las ${timeStr}">
                                    <i data-lucide="plus" class="w-4 h-4"></i>
                                </button>
                                </div>
                        ` : ''}
                    </div>
                `;
            }
        });

        grid.innerHTML = html;
        lucide.createIcons();

        // Agregar event listeners para slots clickeables
        grid.addEventListener('click', (event) => {
            const slotElement = event.target.closest('[data-calendar-slot]');
            if (slotElement && !slotElement.classList.contains('opacity-60')) { // Only clickable if not a past slot
                const dateStr = slotElement.dataset.date;
                const timeStr = slotElement.dataset.time;
                if (dateStr && timeStr) {
                    openNewAppointmentModal(dateStr, timeStr);
                }
            }
        });

        grid.querySelectorAll('.calendar-slot-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dateStr = btn.dataset.date;
                const timeStr = btn.dataset.time;
                if (dateStr && timeStr) {
                    openNewAppointmentModal(dateStr, timeStr);
                }
            });
        });

        // Agregar event listeners para citas clickeables (para ver detalles)
        grid.querySelectorAll('[data-appointment-id]').forEach(aptEl => {
            aptEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const appointmentId = aptEl.dataset.appointmentId;
                if (appointmentId) {
                    openAppointmentDetailsModal(appointmentId);
                }
            });
        });
    }

    async function openNewAppointmentModal(preselectedDate = null, preselectedTime = null) {
        const modal = document.getElementById('new-appointment-modal');
        if (!modal) return;

        const userId = await window.getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el ID del usuario', 'error');
            return;
        }

        // Cargar contactos
        try {
            const { data: contacts, error: contactsError } = await userSupabaseClient
                .from('contacts')
                .select('id, full_name, phone_number')
                .eq('user_id', userId)
                .order('full_name', { ascending: true });

            if (contacts && !contactsError) {
                availableContacts = contacts;
            }

            const contactSearchInput = document.getElementById('appointment-contact-search');
            const contactHiddenInput = document.getElementById('appointment-contact-select');

            if (contactSearchInput) contactSearchInput.value = '';
            if (contactHiddenInput) contactHiddenInput.value = '';

        } catch (error) {
            console.error('[Appointments] Error al cargar contactos:', error);
        }


        // Cargar servicios (productos tipo 'service')
        try {
            const { data: services, error: servicesError } = await userSupabaseClient
                .from('products')
                .select('id, product_name, service_duration_minutes')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .order('product_name', { ascending: true });

            const serviceSelect = document.getElementById('appointment-service-select');
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="">Sin servicio</option>';
                if (services && !servicesError) {
                    services.forEach(service => {
                        const option = document.createElement('option');
                        option.value = service.id;
                        option.textContent = `${service.product_name} (${service.service_duration_minutes} min)`;
                        option.dataset.duration = service.service_duration_minutes;
                        serviceSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('[Appointments] Error al cargar servicios:', error);
        }

        // Establecer fecha - usar preseleccionada o mañana por defecto
        let defaultDate;
        if (!preselectedDate) {
            // Si no hay fecha preseleccionada, usar mañana
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            defaultDate = tomorrow.toISOString().split('T')[0];
        } else {
            defaultDate = preselectedDate;
        }
        const selectedDate = defaultDate;
        const selectedTime = preselectedTime || null;

        const dateInput = document.getElementById('appointment-start-date');
        if (dateInput) {
            // Establecer fecha mínima como hoy (no se pueden seleccionar fechas pasadas)
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);
            dateInput.value = selectedDate;
            updateDateDisplay('appointment-start-date', 'appointment-date-display');
        }
        document.getElementById('appointment-end-date').value = selectedDate;

        // Limpiar selección de tiempo
        clearSelectedTime('new');
        document.getElementById('appointment-start-time').value = '';
        document.getElementById('appointment-end-time').value = '';

        // Si hay hora preseleccionada, establecerla directamente
        if (selectedTime) {
            // Calcular hora de fin (por defecto 1 hora después)
            const [hours, minutes] = selectedTime.split(':');
            const endTime = new Date();
            endTime.setHours(parseInt(hours) + 1, parseInt(minutes), 0, 0);
            const endTimeStr = endTime.toTimeString().slice(0, 5);

            selectTimeSlot(selectedTime, endTimeStr, 'new');
        } else if (preselectedDate) {
            // Solo cargar slots automáticamente si hay una fecha preseleccionada (desde el calendario)
            // Si viene del botón "Nueva", esperar a que el usuario seleccione una fecha
            await loadAvailableTimeSlots(selectedDate, 'new');
        }
        // Si no hay fecha preseleccionada (botón "Nueva"), no cargar slots hasta que el usuario seleccione una fecha

        // Limpiar otros campos del formulario
        document.getElementById('appointment-title').value = '';
        document.getElementById('appointment-contact-select').value = '';
        document.getElementById('appointment-service-select').value = '';
        document.getElementById('appointment-status').value = 'confirmed';
        document.getElementById('appointment-notes').value = '';

        modal.classList.remove('hidden');

        // Inicializar iconos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function closeNewAppointmentModal() {
        const modal = document.getElementById('new-appointment-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async function openAppointmentDetailsModal(appointmentId) {
        const modal = document.getElementById('appointment-details-modal');
        if (!modal) return;

        let appointment = appointmentsData.find(apt => apt.id === appointmentId);

        // Si no se encuentra en appointmentsData, intentar cargarla directamente de la base de datos
        if (!appointment) {
            console.log('[Appointments] Cita no encontrada en appointmentsData, cargando desde la base de datos...', appointmentId);
            const userId = await window.getUserId();
            if (!userId) {
                window.showToast?.('No se pudo obtener el ID del usuario', 'error');
                return;
            }

            try {
                const { data: fetchedAppointment, error: fetchError } = await userSupabaseClient
                    .from('meetings')
                    .select(`
                        *,
                        contacts:contact_id (
                            id,
                            full_name,
                            phone_number
                        ),
                        products:product_id (
                            id,
                            product_name,
                            service_duration_minutes
                        )
                    `)
                    .eq('id', appointmentId)
                    .eq('user_id', userId)
                    .single();

                if (fetchError) {
                    console.error('[Appointments] Error al cargar cita desde la base de datos:', fetchError);
                    window.showToast?.('No se encontró la cita en la base de datos', 'error');
                    return;
                }

                if (!fetchedAppointment) {
                    window.showToast?.('No se encontró la cita', 'error');
                    return;
                }

                appointment = fetchedAppointment;
                console.log('[Appointments] Cita cargada exitosamente desde la base de datos:', appointment);

                // Actualizar appointmentsData con la cita cargada
                const existingIndex = appointmentsData.findIndex(apt => apt.id === appointmentId);
                if (existingIndex >= 0) {
                    appointmentsData[existingIndex] = appointment;
                } else {
                    appointmentsData.push(appointment);
                }
            } catch (error) {
                console.error('[Appointments] Error al cargar cita:', error);
                window.showToast?.('Error al cargar la cita. Intenta nuevamente.', 'error');
                return;
            }
        }

        if (!appointment) {
            window.showToast?.('No se encontró la cita', 'error');
            return;
        }

        const userId = await window.getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el ID del usuario', 'error');
            return;
        }

        // Cargar contactos
        try {
            const { data: contacts, error: contactsError } = await userSupabaseClient
                .from('contacts')
                .select('id, full_name, phone_number')
                .eq('user_id', userId)
                .order('full_name', { ascending: true });

            if (contacts && !contactsError) {
                availableContacts = contacts;
            }

            const contactSearchInput = document.getElementById('appointment-details-contact-search');
            const contactHiddenInput = document.getElementById('appointment-details-contact-select');

            if (contactSearchInput && contactHiddenInput) {
                if (appointment.contact_id) {
                    const contact = availableContacts.find(c => c.id === appointment.contact_id);
                    contactHiddenInput.value = appointment.contact_id;
                    contactSearchInput.value = contact ? contact.full_name : (appointment.contacts?.full_name || 'Contacto no encontrado');
                } else {
                    contactHiddenInput.value = '';
                    contactSearchInput.value = '';
                }
            }
        } catch (error) {
            console.error('[Appointments] Error al cargar contactos:', error);
        }

        // Cargar servicios (productos tipo 'service')
        try {
            const { data: services, error: servicesError } = await userSupabaseClient
                .from('products')
                .select('id, product_name, service_duration_minutes')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .order('product_name', { ascending: true });

            const serviceSelect = document.getElementById('appointment-details-service-select');
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="">Sin servicio</option>';
                if (services && !servicesError) {
                    services.forEach(service => {
                        const option = document.createElement('option');
                        option.value = service.id;
                        option.textContent = `${service.product_name} (${service.service_duration_minutes} min)`;
                        option.dataset.duration = service.service_duration_minutes;
                        if (appointment.product_id && service.id === appointment.product_id) {
                            option.selected = true;
                        }
                        serviceSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('[Appointments] Error al cargar servicios:', error);
        }

        // Llenar campos del formulario con datos de la cita
        document.getElementById('appointment-details-id').value = appointment.id;
        document.getElementById('appointment-details-title').value = appointment.summary || '';

        // Formatear fechas y horas
        const startDate = new Date(appointment.start_time);
        const endDate = new Date(appointment.end_time);
        const dateStr = startDate.toISOString().split('T')[0];
        const startTimeStr = startDate.toTimeString().slice(0, 5);
        const endTimeStr = endDate.toTimeString().slice(0, 5);

        const detailsDateInput = document.getElementById('appointment-details-start-date');
        if (detailsDateInput) {
            // Establecer fecha mínima como hoy (no se pueden seleccionar fechas pasadas)
            const today = new Date().toISOString().split('T')[0];
            detailsDateInput.setAttribute('min', today);
            detailsDateInput.value = dateStr;
            updateDateDisplay('appointment-details-start-date', 'appointment-details-date-display');
        }
        document.getElementById('appointment-details-end-date').value = endDate.toISOString().split('T')[0];

        // Establecer tiempo seleccionado
        selectTimeSlot(startTimeStr, endTimeStr, 'details');

        document.getElementById('appointment-details-status').value = appointment.status || 'confirmed';
        document.getElementById('appointment-details-notes').value = appointment.notes || '';

        modal.classList.remove('hidden');
        lucide.createIcons(); // Inicializar iconos de Lucide en el modal
    }

    function closeAppointmentDetailsModal() {
        const modal = document.getElementById('appointment-details-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    function calculateEndTimeFromServiceDetails(durationMinutes) {
        const startDateInput = document.getElementById('appointment-details-start-date');
        const startTimeInput = document.getElementById('appointment-details-start-time');
        const endDateInput = document.getElementById('appointment-details-end-date');
        const endTimeInput = document.getElementById('appointment-details-end-time');

        if (!startDateInput?.value || !startTimeInput?.value) {
            return; // No hay fecha/hora de inicio, no calcular
        }

        const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

        // Actualizar fecha y hora de fin
        const endDateStr = endDateTime.toISOString().split('T')[0];
        const endTimeStr = endDateTime.toTimeString().slice(0, 5);

        if (endDateInput) endDateInput.value = endDateStr;
        if (endTimeInput) endTimeInput.value = endTimeStr;
    }

    function generateAppointmentTitleDetails() {
        const titleInput = document.getElementById('appointment-details-title');
        const serviceSelect = document.getElementById('appointment-details-service-select');
        const contactHiddenInput = document.getElementById('appointment-details-contact-select');

        if (!titleInput || !serviceSelect || !contactHiddenInput) return;

        const currentTitle = titleInput.value.trim();
        const serviceId = serviceSelect.value;
        const contactId = contactHiddenInput.value;

        // Si hay servicio y contacto, generar título
        if (serviceId && contactId) {
            const selectedServiceOption = serviceSelect.options[serviceSelect.selectedIndex];
            const serviceName = selectedServiceOption?.textContent?.split(' (')[0] || 'Servicio';

            const contact = availableContacts.find(c => c.id === contactId);
            const contactName = contact ? contact.full_name : 'Contacto';

            // Solo actualizar si el título está vacío o es un título generado anteriormente
            if (!currentTitle || currentTitle.includes(' - ') || currentTitle === '') {
                titleInput.value = `${serviceName} - ${contactName}`;
            }
        }
    }

    async function saveAppointmentDetails() {
        const userId = await window.getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el ID del usuario', 'error');
            return;
        }

        const appointmentId = document.getElementById('appointment-details-id').value;
        if (!appointmentId) {
            window.showToast?.('No se encontró el ID de la cita', 'error');
            return;
        }

        const title = document.getElementById('appointment-details-title').value;
        const startDate = document.getElementById('appointment-details-start-date').value;
        const startTime = document.getElementById('appointment-details-start-time').value;
        const endDate = document.getElementById('appointment-details-end-date').value;
        const endTime = document.getElementById('appointment-details-end-time').value;
        const contactId = document.getElementById('appointment-details-contact-select').value;
        const serviceId = document.getElementById('appointment-details-service-select').value;
        const status = document.getElementById('appointment-details-status').value;
        const notes = document.getElementById('appointment-details-notes').value;

        if (!title || !startDate || !startTime || !endDate || !endTime) {
            window.showToast?.('Por favor completa todos los campos requeridos', 'error');
            return;
        }

        // Construir fechas completas
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (endDateTime <= startDateTime) {
            window.showToast?.('La fecha/hora de fin debe ser posterior a la de inicio', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-appointment-details-btn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        // Validar límites antes de actualizar la cita (excluyendo la cita actual)
        try {
            const { data: settingsData, error: settingsError } = await userSupabaseClient
                .from('appointment_settings')
                .select('max_appointments_per_day, buffer_time_minutes')
                .eq('user_id', userId)
                .eq('is_enabled', true)
                .maybeSingle();

            const settings = settingsData;

            if (!settingsError && settings) {
                // Verificar límite de citas por día (excluyendo la cita actual)
                if (settings.max_appointments_per_day) {
                    const dateStr = startDate;
                    const startOfDay = new Date(dateStr);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(dateStr);
                    endOfDay.setHours(23, 59, 59, 999);

                    const { count } = await userSupabaseClient
                        .from('meetings')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId)
                        .neq('id', appointmentId) // Excluir la cita actual
                        .gte('start_time', startOfDay.toISOString())
                        .lte('start_time', endOfDay.toISOString())
                        .in('status', ['confirmed', 'pending']);

                    if (count >= settings.max_appointments_per_day) {
                        window.showToast?.(
                            `Has alcanzado el límite de ${settings.max_appointments_per_day} citas por día.`,
                            'error'
                        );
                        saveBtn.disabled = false;
                        saveBtn.textContent = originalText;
                        return;
                    }
                }

                // Verificar conflictos con citas existentes (considerando buffer, excluyendo la cita actual)
                const bufferMinutes = settings.buffer_time_minutes || 0;
                const bufferStart = new Date(startDateTime);
                bufferStart.setMinutes(bufferStart.getMinutes() - bufferMinutes);
                const bufferEnd = new Date(endDateTime);
                bufferEnd.setMinutes(bufferEnd.getMinutes() + bufferMinutes);

                const { data: allAppointments } = await userSupabaseClient
                    .from('meetings')
                    .select('id, summary, start_time, end_time')
                    .eq('user_id', userId)
                    .neq('id', appointmentId) // Excluir la cita actual
                    .in('status', ['confirmed', 'pending']);

                if (allAppointments) {
                    const conflictingAppointments = allAppointments.filter(apt => {
                        const aptStart = new Date(apt.start_time);
                        const aptEnd = new Date(apt.end_time);

                        // Verificar solapamiento directo
                        if (startDateTime < aptEnd && endDateTime > aptStart) {
                            return true;
                        }

                        // Verificar buffer antes
                        if (startDateTime >= aptStart && startDateTime < new Date(aptStart.getTime() + bufferMinutes * 60000)) {
                            return true;
                        }

                        // Verificar buffer después
                        if (endDateTime > aptEnd && endDateTime <= new Date(aptEnd.getTime() + bufferMinutes * 60000)) {
                            return true;
                        }

                        return false;
                    });

                    if (conflictingAppointments.length > 0) {
                        window.showToast?.(
                            'Este horario entra en conflicto con una cita existente o está muy cerca de otra (buffer time).',
                            'error'
                        );
                        saveBtn.disabled = false;
                        saveBtn.textContent = originalText;
                        return;
                    }
                }
            }
        } catch (validationError) {
            console.warn('[Appointments] Error en validación previa:', validationError);
            // Continuar con la actualización si la validación falla (no crítico)
        }

        try {
            const { data, error } = await userSupabaseClient
                .from('meetings')
                .update({
                    contact_id: contactId || null,
                    product_id: serviceId || null,
                    summary: title,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    status: status,
                    notes: notes || null
                })
                .eq('id', appointmentId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            console.log('[Appointments] Cita actualizada exitosamente:', data);
            window.showToast?.('Cita actualizada exitosamente', 'success');
            closeAppointmentDetailsModal();

            // Recargar citas para actualizar appointmentsData
            await loadAppointments();
            console.log('[Appointments] Citas recargadas después de actualizar. Total:', appointmentsData.length);
        } catch (error) {
            console.error('[Appointments] Error al actualizar cita:', error);
            window.showToast?.('Error al actualizar la cita. Intenta nuevamente.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    async function deleteAppointment() {
        const appointmentId = document.getElementById('appointment-details-id').value;
        if (!appointmentId) {
            window.showToast?.('No se encontró el ID de la cita', 'error');
            return;
        }

        const appointment = appointmentsData.find(apt => apt.id === appointmentId);
        if (!appointment) {
            window.showToast?.('No se encontró la cita', 'error');
            return;
        }

        const confirmed = await window.appModal?.confirm(
            `¿Estás seguro de que deseas eliminar la cita "${appointment.summary || 'Sin título'}"?`,
            'Confirmar eliminación'
        ) || false;

        if (!confirmed) {
            return;
        }

        const userId = await window.getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el ID del usuario', 'error');
            return;
        }

        const deleteBtn = document.getElementById('delete-appointment-btn');
        const originalText = deleteBtn.textContent;
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Eliminando...';

        try {
            const { error } = await userSupabaseClient
                .from('meetings')
                .delete()
                .eq('id', appointmentId)
                .eq('user_id', userId);

            if (error) throw error;

            window.showToast?.('Cita eliminada exitosamente', 'success');
            closeAppointmentDetailsModal();
            loadAppointments();
        } catch (error) {
            console.error('[Appointments] Error al eliminar cita:', error);
            window.showToast?.('Error al eliminar la cita. Intenta nuevamente.', 'error');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    }

    async function sendManualReminder() {
        const appointmentId = document.getElementById('appointment-details-id').value;
        if (!appointmentId) {
            window.showToast?.('No se encontró el ID de la cita', 'error');
            return;
        }

        const btn = document.getElementById('send-reminder-btn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Enviando...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            const { data, error } = await userSupabaseClient.functions.invoke('send-appointment-reminders', {
                body: { appointment_id: appointmentId }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            window.showToast?.('Recordatorio enviado exitosamente', 'success');
        } catch (error) {
            console.error('[Appointments] Error al enviar recordatorio:', error);
            window.showToast?.('Error al enviar recordatorio: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    async function loadAvailableTimeSlots(date, modalType = 'new') {
        const userId = await window.getUserId();
        if (!userId || !date) return;

        const prefix = modalType === 'details' ? 'appointment-details-' : 'appointment-';
        const slotsContainer = document.getElementById(`${prefix}time-slots-container`);
        const slotsGrid = document.getElementById(`${prefix}time-slots`);
        const selectedTimeInfo = document.getElementById(`${prefix}selected-time-info`);

        if (!slotsContainer || !slotsGrid) return;

        // Obtener duración del servicio si hay uno seleccionado
        const serviceSelect = document.getElementById(`${prefix}service-select`);
        const selectedServiceOption = serviceSelect?.options[serviceSelect?.selectedIndex];
        const durationMinutes = selectedServiceOption?.dataset.duration ? parseInt(selectedServiceOption.dataset.duration) : null;

        try {
            // Verificar si hay horarios configurados, si no, inicializarlos automáticamente
            const { data: existingHours } = await userSupabaseClient
                .from('appointment_hours')
                .select('id')
                .eq('user_id', userId)
                .limit(1);

            if (!existingHours || existingHours.length === 0) {
                // No hay horarios, inicializarlos automáticamente
                console.log('[Appointments] No hay horarios configurados, inicializando horarios por defecto...');
                await initializeDefaultHours(userId);
            }

            // Llamar a la función RPC get_available_slots
            const { data, error } = await userSupabaseClient.rpc('get_available_slots', {
                p_user_id: userId,
                p_date: date,
                p_appointment_type_id: null,
                p_duration_minutes: durationMinutes
            });

            if (error) {
                console.error('[Appointments] Error al cargar slots:', error);
                slotsContainer.classList.add('hidden');
                return;
            }

            const slots = data?.available_slots || [];

            if (slots.length === 0) {
                const errorMsg = data?.error || 'No hay horarios disponibles';
                let message = '';

                if (errorMsg.includes('No hours configured') || errorMsg.includes('Appointment system not enabled')) {
                    message = `
                        <div class="col-span-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div class="flex items-start gap-3">
                                <i data-lucide="alert-circle" class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"></i>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-yellow-800 mb-2">No hay horarios configurados</p>
                                    <p class="text-xs text-yellow-700 mb-3">Para poder agendar citas, necesitas configurar tus horarios de atención.</p>
                                    <div class="bg-white p-3 rounded border border-yellow-300">
                                        <p class="text-xs font-semibold text-yellow-900 mb-1">📋 Cómo configurar tus horarios:</p>
                                        <ol class="text-xs text-yellow-800 space-y-1 ml-4 list-decimal">
                                            <li>Ve al panel de <strong>Configuración</strong> (ícono de engranaje en el menú lateral)</li>
                                            <li>Baja hasta la sección <strong>"Sistema de Citas y Calendario"</strong></li>
                                            <li>Activa el toggle <strong>"Activar sistema de citas"</strong> (esto mostrará las opciones de configuración)</li>
                                            <li>Dentro de la sección que aparece, baja hasta <strong>"Horarios de Atención"</strong></li>
                                            <li>Activa los días que atiendes marcando el checkbox <strong>"Disponible"</strong> para cada día</li>
                                            <li>Configura la hora de inicio y fin para cada día activado</li>
                                            <li>Haz clic en <strong>"Guardar Seguro"</strong> al final de la página</li>
                                        </ol>
                                        </div>
                                            </div>
                                    </div>
                                        </div>
                    `;
                } else if (errorMsg.includes('Maximum appointments')) {
                    message = `
                        <div class="col-span-full p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div class="flex items-start gap-3">
                                <i data-lucide="alert-circle" class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"></i>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-red-800 mb-1">Límite de citas alcanzado</p>
                                    <p class="text-xs text-red-700">Ya has alcanzado el número máximo de citas permitidas para este día.</p>
                                        </div>
                                </div>
                            </div>
                    `;
                } else {
                    message = `
                        <div class="col-span-full p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div class="flex items-start gap-3">
                                <i data-lucide="calendar-x" class="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0"></i>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-slate-800 mb-1">No hay horarios disponibles</p>
                                    <p class="text-xs text-slate-700">No hay slots disponibles para esta fecha. Intenta con otra fecha o verifica tu configuración de horarios en <strong>Configuración → Sistema de Citas y Calendario</strong>.</p>
                        </div>
                        </div>
                    </div>
                    `;
                }

                slotsGrid.innerHTML = message;
                slotsContainer.classList.remove('hidden');

                // Inicializar iconos de Lucide
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                return;
            }

            // Renderizar slots como botones
            slotsGrid.innerHTML = slots.map(slot => {
                const startTime = slot.start || slot.start_time;
                const endTime = slot.end || slot.end_time;
                const displayTime = formatTime12Hour(startTime);
                return `
                    <button type="button" 
                            class="time-slot-btn px-4 py-2.5 text-sm font-semibold rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:bg-green-50 hover:border-green-500 hover:text-green-700 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
                            data-start="${startTime}"
                            data-end="${endTime}"
                            data-duration="${slot.duration_minutes || 60}">
                        ${displayTime}
                    </button>
                `;
            }).join('');

            // Agregar event listeners a los botones
            slotsGrid.querySelectorAll('.time-slot-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectTimeSlot(btn.dataset.start, btn.dataset.end, modalType);
                });
            });

            slotsContainer.classList.remove('hidden');
        } catch (error) {
            console.error('[Appointments] Error al cargar slots disponibles:', error);
            slotsContainer.classList.add('hidden');
        }
    }

    function selectTimeSlot(startTime, endTime, modalType = 'new') {
        const prefix = modalType === 'details' ? 'appointment-details-' : 'appointment-';
        const startDateInput = document.getElementById(`${prefix}start-date`);
        const startTimeInput = document.getElementById(`${prefix}start-time`);
        const endDateInput = document.getElementById(`${prefix}end-date`);
        const endTimeInput = document.getElementById(`${prefix}end-time`);
        const slotsContainer = document.getElementById(`${prefix}time-slots-container`);
        const selectedTimeInfo = document.getElementById(`${prefix}selected-time-info`);

        if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) return;

        // Establecer valores
        startTimeInput.value = startTime;
        endTimeInput.value = endTime;
        endDateInput.value = startDateInput.value;

        // NO mostrar el cuadro de "Horario seleccionado" - solo marcar el botón
        if (selectedTimeInfo) {
            selectedTimeInfo.classList.add('hidden');
        }

        // NO ocultar el selector de slots - mantener visible para poder cambiar fácilmente
        // if (slotsContainer) {
        //     slotsContainer.classList.add('hidden');
        // }

        // Resaltar el botón seleccionado
        const slotsGrid = document.getElementById(`${prefix}time-slots`);
        if (slotsGrid) {
            slotsGrid.querySelectorAll('.time-slot-btn').forEach(btn => {
                btn.classList.remove('bg-green-600', 'text-white', 'border-green-600', 'shadow-lg');
                btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
                if (btn.dataset.start === startTime) {
                    btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
                    btn.classList.add('bg-green-600', 'text-white', 'border-green-600', 'shadow-lg');
                }
            });
        }
    }

    function clearSelectedTime(modalType = 'new') {
        const prefix = modalType === 'details' ? 'appointment-details-' : 'appointment-';
        const startTimeInput = document.getElementById(`${prefix}start-time`);
        const endTimeInput = document.getElementById(`${prefix}end-time`);
        const selectedTimeInfo = document.getElementById(`${prefix}selected-time-info`);
        const slotsContainer = document.getElementById(`${prefix}time-slots-container`);
        const slotsGrid = document.getElementById(`${prefix}time-slots`);

        if (startTimeInput) startTimeInput.value = '';
        if (endTimeInput) endTimeInput.value = '';
        if (selectedTimeInfo) selectedTimeInfo.classList.add('hidden');
        if (slotsContainer) slotsContainer.classList.remove('hidden');

        // Limpiar selección visual de todos los botones
        if (slotsGrid) {
            slotsGrid.querySelectorAll('.time-slot-btn').forEach(btn => {
                btn.classList.remove('bg-green-600', 'text-white', 'border-green-600', 'shadow-lg');
                btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
            });
        }
    }

    function updateDateDisplay(dateInputId, displayId) {
        const dateInput = document.getElementById(dateInputId);
        const display = document.getElementById(displayId);

        if (!dateInput || !display) return;

        const dateValue = dateInput.value;
        if (dateValue) {
            const date = new Date(dateValue + 'T00:00:00');
            const day = date.getDate();
            const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();

            display.textContent = `${day} ${month} ${year}`;
            display.classList.remove('text-slate-400');
            display.classList.add('text-black');
            display.style.color = '#000000'; // Forzar color negro
            // Mantener el display visible siempre, solo ocultarlo cuando el calendario nativo está abierto
            display.style.opacity = '1';
            display.style.visibility = 'visible';
        } else {
            display.textContent = 'Selecciona una fecha';
            display.classList.remove('text-black');
            display.classList.add('text-slate-400');
            // Mostrar el display cuando no hay valor
            display.style.opacity = '1';
        }
    }

    function calculateEndTimeFromService(durationMinutes) {
        const startDateInput = document.getElementById('appointment-start-date');
        const startTimeInput = document.getElementById('appointment-start-time');
        const endDateInput = document.getElementById('appointment-end-date');
        const endTimeInput = document.getElementById('appointment-end-time');

        if (!startDateInput?.value || !startTimeInput?.value) {
            return; // No hay fecha/hora de inicio, no calcular
        }

        const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

        // Actualizar fecha y hora de fin
        const endDateStr = endDateTime.toISOString().split('T')[0];
        const endTimeStr = endDateTime.toTimeString().slice(0, 5);

        if (endDateInput) endDateInput.value = endDateStr;
        if (endTimeInput) endTimeInput.value = endTimeStr;
    }

    function generateAppointmentTitle() {
        const titleInput = document.getElementById('appointment-title');
        const serviceSelect = document.getElementById('appointment-service-select');
        const contactHiddenInput = document.getElementById('appointment-contact-select');

        if (!titleInput || !serviceSelect || !contactHiddenInput) return;

        // Solo generar si el campo de título está vacío o si el usuario no lo ha editado manualmente
        // Usaremos un flag para saber si el título fue generado automáticamente
        const currentTitle = titleInput.value.trim();
        const serviceId = serviceSelect.value;
        const contactId = contactHiddenInput.value;

        // Si hay servicio y contacto, generar título
        if (serviceId && contactId) {
            const selectedServiceOption = serviceSelect.options[serviceSelect.selectedIndex];
            const serviceName = selectedServiceOption?.textContent?.split(' (')[0] || 'Servicio';

            const contact = availableContacts.find(c => c.id === contactId);
            const contactName = contact ? contact.full_name : 'Contacto';

            // Solo actualizar si el título está vacío o es un título generado anteriormente
            if (!currentTitle || currentTitle.includes(' - ') || currentTitle === '') {
                titleInput.value = `${serviceName} - ${contactName}`;
            }
        }
    }

    async function saveNewAppointment() {
        const userId = await window.getUserId();
        if (!userId) {
            window.showToast?.('No se pudo obtener el ID del usuario', 'error');
            return;
        }

        const title = document.getElementById('appointment-title').value;
        const startDate = document.getElementById('appointment-start-date').value;
        const startTime = document.getElementById('appointment-start-time').value;
        const endDate = document.getElementById('appointment-end-date').value;
        const endTime = document.getElementById('appointment-end-time').value;
        const contactId = document.getElementById('appointment-contact-select').value;
        const serviceId = document.getElementById('appointment-service-select').value;
        const status = document.getElementById('appointment-status').value;
        const notes = document.getElementById('appointment-notes').value;

        if (!title || !startDate || !startTime || !endDate || !endTime) {
            window.showToast?.('Por favor completa todos los campos requeridos', 'error');
            return;
        }

        // Construir fechas completas
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (endDateTime <= startDateTime) {
            window.showToast?.('La fecha/hora de fin debe ser posterior a la de inicio', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-appointment-btn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        // Validar límites antes de crear la cita
        try {
            // Obtener configuración de citas
            const { data: settingsData, error: settingsError } = await userSupabaseClient
                .from('appointment_settings')
                .select('max_appointments_per_day, buffer_time_minutes')
                .eq('user_id', userId)
                .eq('is_enabled', true)
                .maybeSingle();

            const settings = settingsData;

            if (!settingsError && settings) {
                // Verificar límite de citas por día
                if (settings.max_appointments_per_day) {
                    const dateStr = startDate;
                    const startOfDay = new Date(dateStr);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(dateStr);
                    endOfDay.setHours(23, 59, 59, 999);

                    const { count } = await userSupabaseClient
                        .from('meetings')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId)
                        .gte('start_time', startOfDay.toISOString())
                        .lte('start_time', endOfDay.toISOString())
                        .in('status', ['confirmed', 'pending']);

                    if (count >= settings.max_appointments_per_day) {
                        window.showToast?.(
                            `Has alcanzado el límite de ${settings.max_appointments_per_day} citas por día.`,
                            'error'
                        );
                        saveBtn.disabled = false;
                        saveBtn.textContent = originalText;
                        return;
                    }
                }

                // Verificar conflictos con citas existentes (considerando buffer)
                const bufferMinutes = settings.buffer_time_minutes || 0;
                const bufferStart = new Date(startDateTime);
                bufferStart.setMinutes(bufferStart.getMinutes() - bufferMinutes);
                const bufferEnd = new Date(endDateTime);
                bufferEnd.setMinutes(bufferEnd.getMinutes() + bufferMinutes);

                // Buscar citas que se solapen o estén dentro del buffer
                const { data: allAppointments } = await userSupabaseClient
                    .from('meetings')
                    .select('id, summary, start_time, end_time')
                    .eq('user_id', userId)
                    .in('status', ['confirmed', 'pending']);

                if (allAppointments) {
                    const conflictingAppointments = allAppointments.filter(apt => {
                        const aptStart = new Date(apt.start_time);
                        const aptEnd = new Date(apt.end_time);

                        // Verificar solapamiento directo
                        if (startDateTime < aptEnd && endDateTime > aptStart) {
                            return true;
                        }

                        // Verificar buffer antes (nueva cita está muy cerca del inicio de una existente)
                        if (startDateTime >= aptStart && startDateTime < new Date(aptStart.getTime() + bufferMinutes * 60000)) {
                            return true;
                        }

                        // Verificar buffer después (nueva cita está muy cerca del final de una existente)
                        if (endDateTime > aptEnd && endDateTime <= new Date(aptEnd.getTime() + bufferMinutes * 60000)) {
                            return true;
                        }

                        return false;
                    });

                    if (conflictingAppointments.length > 0) {
                        window.showToast?.(
                            'Este horario entra en conflicto con una cita existente o está muy cerca de otra (buffer time).',
                            'error'
                        );
                        saveBtn.disabled = false;
                        saveBtn.textContent = originalText;
                        return;
                    }
                }
            }
        } catch (validationError) {
            console.warn('[Appointments] Error en validación previa:', validationError);
            // Continuar con la creación si la validación falla (no crítico)
        }

        // Validar que el contacto tenga teléfono si se seleccionó un contacto
        if (contactId) {
            try {
                const { data: contact, error: contactError } = await userSupabaseClient
                    .from('contacts')
                    .select('id, full_name, phone_number')
                    .eq('id', contactId)
                    .single();

                if (!contactError && contact) {
                    if (!contact.phone_number) {
                        const contactName = contact.full_name || 'el contacto seleccionado';
                        const shouldContinue = confirm(
                            `Advertencia: ${contactName} no tiene un número de teléfono registrado. ` +
                            `Los recordatorios automáticos no se podrán enviar. ¿Deseas continuar de todas formas?`
                        );
                        if (!shouldContinue) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = originalText;
                            return;
                        }
                    }
                }
            } catch (contactCheckError) {
                console.warn('[Appointments] Error al verificar teléfono del contacto:', contactCheckError);
                // Continuar de todas formas
            }
        }

        try {
            const { data, error } = await userSupabaseClient
                .from('meetings')
                .insert({
                    user_id: userId,
                    contact_id: contactId || null,
                    product_id: serviceId || null,
                    summary: title,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    status: status,
                    notes: notes || null,
                    reminder_sent: false,
                    confirmation_status: 'draft' // Default: borrador hasta que se confirme
                })
                .select()
                .single();

            if (error) throw error;

            console.log('[Appointments] Cita creada exitosamente:', data);
            window.showToast?.('Cita creada exitosamente', 'success');
            closeNewAppointmentModal();

            // Recargar citas para actualizar appointmentsData
            await loadAppointments();
            console.log('[Appointments] Citas recargadas después de crear nueva cita. Total:', appointmentsData.length);
        } catch (error) {
            console.error('[Appointments] Error al crear cita:', error);
            window.showToast?.('Error al crear la cita. Intenta nuevamente.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    // ============================================
    // Funciones para Modal de Configuración Rápida
    // ============================================

    async function openQuickConfigModal() {
        const modal = document.getElementById('appointments-quick-config-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        await loadQuickConfigData();
    }

    function closeQuickConfigModal() {
        const modal = document.getElementById('appointments-quick-config-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async function loadQuickConfigData() {
        const userId = await window.getUserId();
        if (!userId) return;

        try {
            // Cargar configuración de citas
            const { data: settings, error: settingsError } = await userSupabaseClient
                .from('appointment_settings')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (settingsError && settingsError.code !== 'PGRST116') {
                throw settingsError;
            }

            if (settings) {
                const bufferInput = document.getElementById('quick-config-buffer-time');
                const maxPerDayInput = document.getElementById('quick-config-max-per-day');
                const defaultDurationInput = document.getElementById('quick-config-default-duration');
                const timezoneSelect = document.getElementById('quick-config-timezone');

                if (bufferInput) bufferInput.value = settings.buffer_time_minutes || 0;
                if (maxPerDayInput) maxPerDayInput.value = settings.max_appointments_per_day || '';
                if (defaultDurationInput) defaultDurationInput.value = settings.default_duration_minutes || 60;
                if (timezoneSelect) timezoneSelect.value = settings.timezone || 'America/Mexico_City';
            }

            // Cargar servicios y calcular MCM
            await loadServicesAndCalculateLCM(userId);

            // Cargar horarios
            await loadQuickConfigHours(userId);
        } catch (error) {
            console.error('[Appointments] Error al cargar configuración rápida:', error);
            window.showToast?.('Error al cargar la configuración', 'error');
        }
    }

    async function loadServicesAndCalculateLCM(userId) {
        try {
            // Obtener servicios
            const { data: services, error } = await userSupabaseClient
                .from('products')
                .select('id, product_name, service_duration_minutes')
                .eq('user_id', userId)
                .eq('product_type', 'service')
                .not('service_duration_minutes', 'is', null);

            if (error) throw error;

            // Obtener tipos de citas
            const { data: appointmentTypes, error: typesError } = await userSupabaseClient
                .from('appointment_types')
                .select('id, name, duration_minutes')
                .eq('user_id', userId)
                .eq('is_active', true)
                .not('duration_minutes', 'is', null);

            if (typesError) throw typesError;

            // Obtener duración por defecto
            const { data: settings } = await userSupabaseClient
                .from('appointment_settings')
                .select('default_duration_minutes')
                .eq('user_id', userId)
                .maybeSingle();

            const defaultDuration = settings?.default_duration_minutes || 60;

            // Recolectar todas las duraciones
            const durations = [];
            if (services && services.length > 0) {
                services.forEach(s => {
                    if (s.service_duration_minutes) {
                        durations.push(s.service_duration_minutes);
                    }
                });
            }
            if (appointmentTypes && appointmentTypes.length > 0) {
                appointmentTypes.forEach(t => {
                    if (t.duration_minutes && !durations.includes(t.duration_minutes)) {
                        durations.push(t.duration_minutes);
                    }
                });
            }
            if (!durations.includes(defaultDuration)) {
                durations.push(defaultDuration);
            }

            // Calcular MCM (simplificado - mínimo 15)
            let lcm = 15;
            if (durations.length > 0) {
                // Función simple para calcular MCM
                const calculateLCM = (a, b) => {
                    const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
                    return (a * b) / gcd(a, b);
                };

                lcm = durations[0];
                for (let i = 1; i < durations.length; i++) {
                    lcm = calculateLCM(lcm, durations[i]);
                }
                lcm = Math.max(lcm, 15); // Mínimo 15 minutos
            }

            // Mostrar información
            const servicesListEl = document.getElementById('quick-config-services-list');

            if (servicesListEl) {
                if (services && services.length > 0) {
                    servicesListEl.innerHTML = services.map(s => `
                        <div class="flex items-center justify-between py-1.5 px-2 bg-white rounded border border-slate-200 mb-1">
                            <span class="text-xs text-slate-700">${s.product_name}</span>
                            <span class="text-xs font-semibold text-slate-600">${s.service_duration_minutes} min</span>
                        </div>
                    `).join('');
                } else {
                    servicesListEl.innerHTML = '<p class="text-xs text-slate-500 text-center py-2">No hay servicios configurados. Crea servicios en el panel de Productos.</p>';
                }
            }
        } catch (error) {
            console.error('[Appointments] Error al cargar servicios:', error);
        }
    }

    async function loadQuickConfigHours(userId) {
        try {
            const { data: hours, error } = await userSupabaseClient
                .from('appointment_hours')
                .select('*')
                .eq('user_id', userId)
                .order('day_of_week', { ascending: true });

            if (error) throw error;

            const container = document.getElementById('quick-config-hours-container');
            if (!container) return;

            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

            // Crear un mapa de horas existentes por día
            const hoursMap = {};
            if (hours && hours.length > 0) {
                hours.forEach(h => {
                    hoursMap[h.day_of_week] = h;
                });
            }

            // Renderizar todos los días de la semana (0-6: Domingo a Sábado)
            container.innerHTML = dayNames.map((name, index) => {
                const dayHours = hoursMap[index];
                const isAvailable = dayHours?.is_available || (index >= 1 && index <= 5); // Lunes-Viernes activos por defecto
                const startTime = dayHours?.start_time || '09:00';
                const endTime = dayHours?.end_time || '18:00';

                return `
                    <div class="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-200">
                        <label class="flex items-center gap-2 cursor-pointer flex-1">
                            <input type="checkbox" class="hour-available-checkbox" data-day="${index}" ${isAvailable ? 'checked' : ''}>
                            <span class="text-sm font-medium text-slate-700 w-20">${name}</span>
                        </label>
                        <input type="time" class="hour-start-time form-input text-xs min-w-[160px]" data-day="${index}" value="${startTime}" ${!isAvailable ? 'disabled' : ''}>
                        <span class="text-xs text-slate-500">-</span>
                        <input type="time" class="hour-end-time form-input text-xs min-w-[160px]" data-day="${index}" value="${endTime}" ${!isAvailable ? 'disabled' : ''}>
                </div>
            `;
            }).join('');

            // Agregar listeners para habilitar/deshabilitar inputs cuando cambia el checkbox
            container.querySelectorAll('.hour-available-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const day = e.target.dataset.day;
                    const startInput = container.querySelector(`.hour-start-time[data-day="${day}"]`);
                    const endInput = container.querySelector(`.hour-end-time[data-day="${day}"]`);
                    if (startInput) startInput.disabled = !e.target.checked;
                    if (endInput) endInput.disabled = !e.target.checked;
                });
            });

            // Inicializar iconos de Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ root: container });
            }
        } catch (error) {
            console.error('[Appointments] Error al cargar horarios:', error);
        }
    }

    // Función para inicializar horarios por defecto (similar a settings.js)
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

            // Verificar que el sistema de citas esté habilitado
            const { data: settings } = await userSupabaseClient
                .from('appointment_settings')
                .select('is_enabled')
                .eq('user_id', userId)
                .maybeSingle();

            if (!settings || !settings.is_enabled) {
                console.log('[Appointments] Sistema de citas no habilitado, no se inicializan horarios');
                return;
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
                console.log('[Appointments] Horarios por defecto creados automáticamente (todos los días, Lunes-Viernes activos)');
            }
        } catch (error) {
            console.error('[Appointments] Error al inicializar horarios por defecto:', error);
        }
    }

    async function saveQuickConfig() {
        const userId = await window.getUserId();
        if (!userId) return;

        const saveBtn = document.getElementById('save-appointments-config-btn');
        const originalText = saveBtn?.textContent;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
        }

        try {
            // Guardar configuración general
            const bufferTime = parseInt(document.getElementById('quick-config-buffer-time')?.value) || 0;
            const maxPerDay = document.getElementById('quick-config-max-per-day')?.value ? parseInt(document.getElementById('quick-config-max-per-day').value) : null;
            const defaultDuration = parseInt(document.getElementById('quick-config-default-duration')?.value) || 60;
            const timezone = document.getElementById('quick-config-timezone')?.value || 'America/Mexico_City';

            const { error: settingsError } = await userSupabaseClient
                .from('appointment_settings')
                .upsert({
                    user_id: userId,
                    buffer_time_minutes: bufferTime,
                    max_appointments_per_day: maxPerDay,
                    default_duration_minutes: defaultDuration,
                    timezone: timezone
                }, {
                    onConflict: 'user_id'
                });

            if (settingsError) throw settingsError;

            // Guardar horarios
            const hourCheckboxes = document.querySelectorAll('.hour-available-checkbox');
            const hoursToSave = [];

            hourCheckboxes.forEach(checkbox => {
                const day = parseInt(checkbox.dataset.day);
                const startInput = document.querySelector(`.hour-start-time[data-day="${day}"]`);
                const endInput = document.querySelector(`.hour-end-time[data-day="${day}"]`);

                if (startInput && endInput) {
                    hoursToSave.push({
                        user_id: userId,
                        day_of_week: day,
                        is_available: checkbox.checked,
                        start_time: startInput.value || '09:00',
                        end_time: endInput.value || '18:00'
                    });
                }
            });

            if (hoursToSave.length > 0) {
                // Eliminar horarios existentes y crear nuevos
                await userSupabaseClient
                    .from('appointment_hours')
                    .delete()
                    .eq('user_id', userId);

                const { error: hoursError } = await userSupabaseClient
                    .from('appointment_hours')
                    .insert(hoursToSave);

                if (hoursError) throw hoursError;
            }

            window.showToast?.('Configuración guardada exitosamente', 'success');
            closeQuickConfigModal();
            // Recargar citas para reflejar cambios
            loadAppointments();
        } catch (error) {
            console.error('[Appointments] Error al guardar configuración:', error);
            window.showToast?.('Error al guardar la configuración', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    }
    function initAppointmentsConfigLogic() {
        const configBtn = document.getElementById('appointments-config-btn');
        const configBtnWeek = document.getElementById('appointments-config-btn-week');
        const modal = document.getElementById('appointments-config-modal');
        const closeBtn = document.getElementById('close-appointments-config-modal');
        const saveBtn = document.getElementById('save-appointments-config');
        const copyBtn = document.getElementById('copy-booking-link-btn');
        const linkInput = document.getElementById('public-booking-link');
        const openLinkBtn = document.getElementById('open-booking-link-btn');

        // Referencias al Banner
        const banner = document.getElementById('appointments-booking-link-banner');
        const bannerLinkText = document.getElementById('appointments-public-link-text');
        const copyBannerBtn = document.getElementById('copy-appointments-link-btn');
        const openBannerBtn = document.getElementById('open-appointments-link-btn');

        let publicLink = '';

        async function loadPublicLink() {
            try {
                const userId = await window.getUserId();
                if (!userId) return;

                const [{ data: profile }, { data: settings }] = await Promise.all([
                    userSupabaseClient.from('profiles').select('slug, id').eq('id', userId).single(),
                    userSupabaseClient.from('appointment_settings').select('is_enabled').eq('user_id', userId).maybeSingle()
                ]);

                if (profile) {
                    // Priorizar slug para el link corto, fallback a ID
                    const linkSuffix = profile.slug || `booking.html?s=${profile.id}`;
                    const baseUrl = window.location.origin.replace(/\/$/, '');
                    publicLink = `${baseUrl}/${linkSuffix}`;

                    // Actualizar inputs/textos si existen
                    if (linkInput) linkInput.value = publicLink;
                    if (openLinkBtn) openLinkBtn.setAttribute('href', publicLink);
                    if (bannerLinkText) bannerLinkText.textContent = publicLink;
                    if (openBannerBtn) openBannerBtn.setAttribute('href', publicLink);

                    // Mostrar banner si las citas están habilitadas
                    if (settings && settings.is_enabled && banner) {
                        banner.classList.remove('hidden');
                    }
                }
            } catch (e) {
                console.error('Error loading public link info', e);
            }
        }

        async function openConfigModal() {
            if (!modal) return;

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('div')?.classList.remove('scale-95');
                modal.querySelector('div')?.classList.add('scale-100');
            }, 10);

            if (!publicLink) await loadPublicLink();

            try {
                const { data: { user } } = await userSupabaseClient.auth.getUser();
                const { data: settings } = await userSupabaseClient
                    .from('appointment_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (settings) {
                    const enabledCheck = document.getElementById('config-reminder-enabled');
                    const daysInput = document.getElementById('config-reminder-days');
                    const hoursInput = document.getElementById('config-reminder-hours');

                    if (enabledCheck) enabledCheck.checked = settings.is_reminder_enabled ?? true;
                    if (daysInput) daysInput.value = settings.reminder_days_before ?? 2;
                    if (hoursInput) hoursInput.value = settings.reminder_hours_before ?? 1;
                }
            } catch (e) {
                console.error('Error loading settings', e);
            }
        }

        function closeConfigModal() {
            if (!modal) return;
            modal.classList.add('opacity-0');
            modal.querySelector('div')?.classList.remove('scale-100');
            modal.querySelector('div')?.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }

        async function saveConfig() {
            const saveBtn = document.getElementById('save-appointments-config');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            try {
                const { data: { user } } = await userSupabaseClient.auth.getUser();
                const enabled = document.getElementById('config-reminder-enabled').checked;
                const days = parseInt(document.getElementById('config-reminder-days').value);
                const hours = parseInt(document.getElementById('config-reminder-hours').value);

                const { error } = await userSupabaseClient
                    .from('appointment_settings')
                    .update({
                        is_reminder_enabled: enabled,
                        reminder_days_before: days,
                        reminder_hours_before: hours
                    })
                    .eq('user_id', user.id);

                if (error) throw error;
                window.showToast?.('Configuración guardada', 'success');
                closeConfigModal();
            } catch (e) {
                console.error('Error saving config', e);
                window.showToast?.('Error al guardar configuración', 'error');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                }
            }
        }

        // Inicializar banner
        loadPublicLink();

        if (configBtn) configBtn.addEventListener('click', openConfigModal);
        if (configBtnWeek) configBtnWeek.addEventListener('click', openConfigModal);
        if (closeBtn) closeBtn.addEventListener('click', closeConfigModal);
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) closeConfigModal();
        });

        if (saveBtn) saveBtn.addEventListener('click', saveConfig);

        // Listeners de copia
        const handleCopy = (text) => {
            navigator.clipboard.writeText(text);
            window.showToast?.('Link copiado', 'success');
        };

        if (copyBtn) copyBtn.addEventListener('click', () => handleCopy(publicLink));
        if (copyBannerBtn) copyBannerBtn.addEventListener('click', () => handleCopy(publicLink));
    }

})();
