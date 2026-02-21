/**
 * Personal Tasks Manager (IA Mind)
 * Handles CRUD operations for personal tasks and reminders.
 */

let currentTaskId = null;
let currentFilter = 'pending';

const PERSONAL_TASKS_HTML = `
<div id="personal-tasks-container" class="space-y-6">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h2 class="text-xl font-bold text-slate-800">Recordatorios del Asistente</h2>
            <p class="text-sm text-slate-500">Gestiona tus recordatorios y tareas personales para que Elina te ayude.
            </p>
        </div>
        <div class="flex gap-2">
            <button id="btn-reminder-settings"
                class="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                <i data-lucide="settings" class="w-4 h-4"></i>
                Configuración
            </button>
            <button id="btn-add-task"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i>
                Nueva Tarea
            </button>
        </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 w-fit">
        <button class="filter-btn px-3 py-1.5 text-sm font-medium rounded-md bg-blue-50 text-blue-700"
            data-status="pending">
            Pendientes
        </button>
        <button class="filter-btn px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50"
            data-status="completed">
            Completadas
        </button>
        <button class="filter-btn px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50"
            data-status="all">
            Todas
        </button>
    </div>

    <!-- Tasks List -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr
                        class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th class="px-6 py-3">Tarea</th>
                        <th class="px-6 py-3">Vencimiento</th>
                        <th class="px-6 py-3">Estado</th>
                        <th class="px-6 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody id="personal-tasks-list" class="divide-y divide-slate-100">
                    <!-- Tasks will be injected here -->
                    <tr>
                        <td colspan="4" class="px-6 py-8 text-center text-slate-500">
                            <i data-lucide="loader" class="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500"></i>
                            Cargando tareas...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Reminder Settings Modal -->
<div id="modal-reminder-settings" class="fixed inset-0 z-50 hidden" aria-labelledby="modal-settings-title" role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity opacity-0" id="modal-settings-backdrop"></div>
    <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
            <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-md opacity-0 scale-95" id="modal-settings-panel">
                <div class="bg-white p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-slate-900" id="modal-settings-title">Configuración de Alertas</h3>
                        <button id="btn-close-settings" class="text-slate-400 hover:text-slate-600">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <p class="text-sm text-slate-500 mb-6">Define con qué anticipación quieres recibir recordatorios antes del vencimiento de tus tareas.</p>

                    <div class="space-y-4">
                        <div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Reglas Activas</label>
                            <div id="reminder-rules-list" class="space-y-2 min-h-[50px]">
                                <!-- Rules injected here -->
                                <p class="text-sm text-slate-400 italic text-center py-2">No hay reglas definidas</p>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Agregar Nueva Regla</label>
                            <div class="flex gap-2">
                                <input type="number" id="new-rule-value" class="w-20 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" placeholder="1" min="1">
                                <select id="new-rule-unit" class="flex-1 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                                    <option value="hours">Horas antes</option>
                                    <option value="days">Días antes</option>
                                    <option value="weeks">Semanas antes</option>
                                </select>
                                <button id="btn-add-rule" class="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                                    <i data-lucide="plus" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button type="button" id="btn-save-settings" class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto">Guardar Cambios</button>
                    <button type="button" id="btn-cancel-settings" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto">Cancelar</button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Add/Edit Task Modal -->
<div id="modal-task" class="fixed inset-0 z-50 hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity opacity-0" id="modal-task-backdrop">
    </div>

    <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg opacity-0 scale-95"
                id="modal-task-panel">
                <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div
                            class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                            <i data-lucide="check-square" class="h-6 w-6 text-blue-600"></i>
                        </div>
                        <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                            <h3 class="text-base font-semibold leading-6 text-slate-900" id="modal-task-title">Nueva
                                Tarea</h3>
                            <div class="mt-4 space-y-4">
                                <div>
                                    <label for="task-title" class="block text-sm font-medium text-slate-700">Título /
                                        Descripción</label>
                                    <input type="text" id="task-title"
                                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        placeholder="Ej: Pagar la luz">
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="task-date"
                                            class="block text-sm font-medium text-slate-700">Fecha</label>
                                        <input type="date" id="task-date"
                                            class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                                    </div>
                                    <div>
                                        <label for="task-time"
                                            class="block text-sm font-medium text-slate-700">Hora</label>
                                        <input type="time" id="task-time"
                                            class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                                    </div>
                                </div>
                                <input type="hidden" id="task-id">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button type="button" id="btn-save-task"
                        class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto">Guardar</button>
                    <button type="button" id="btn-cancel-task"
                        class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto">Cancelar</button>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Initialize the module
export async function initPersonalTasks() {
    console.log('[PersonalTasks] Initializing...');

    // Attach event listeners
    attachEventListeners();

    // Initial fetch
    await fetchTasks();
}

// Global function to render text helper widget
window.renderPersonalTasks = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('[PersonalTasks] Container not found:', containerId);
        return;
    }
    container.innerHTML = PERSONAL_TASKS_HTML;
    initPersonalTasks();
    if (window.lucide) window.lucide.createIcons();
};

function attachEventListeners() {
    // Add Task Button
    const btnAdd = document.getElementById('btn-add-task');
    if (btnAdd) btnAdd.addEventListener('click', () => openTaskModal());

    // Settings Button (NEW)
    const btnSettings = document.getElementById('btn-reminder-settings');
    if (btnSettings) btnSettings.addEventListener('click', () => openSettingsModal());

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update UI
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-blue-50', 'text-blue-700');
                b.classList.add('text-slate-600', 'hover:bg-slate-50');
            });
            e.target.classList.remove('text-slate-600', 'hover:bg-slate-50');
            e.target.classList.add('bg-blue-50', 'text-blue-700');

            // Update Filter
            currentFilter = e.target.dataset.status;
            fetchTasks();
        });
    });

    // Modal Actions (Task)
    const btnSave = document.getElementById('btn-save-task');
    if (btnSave) btnSave.addEventListener('click', saveTask);

    const btnCancel = document.getElementById('btn-cancel-task');
    if (btnCancel) btnCancel.addEventListener('click', closeTaskModal);

    // Close modal on click outside (Task)
    const modalBackdrop = document.getElementById('modal-task-backdrop');
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeTaskModal);

    // Modal Actions (Settings)
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);

    const btnCancelSettings = document.getElementById('btn-cancel-settings');
    if (btnCancelSettings) btnCancelSettings.addEventListener('click', closeSettingsModal);

    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettings);

    const btnAddRule = document.getElementById('btn-add-rule');
    if (btnAddRule) btnAddRule.addEventListener('click', addRule);

    const modalSettingsBackdrop = document.getElementById('modal-settings-backdrop');
    if (modalSettingsBackdrop) modalSettingsBackdrop.addEventListener('click', closeSettingsModal);
}

async function fetchTasks() {
    const listContainer = document.getElementById('personal-tasks-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-8 text-center text-slate-500">
                <i data-lucide="loader" class="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500"></i>
                Cargando tareas...
            </td>
        </tr>
    `;
    lucide.createIcons();

    try {
        const user = window.auth.getSession()?.user;
        if (!user) throw new Error('Usuario no autenticado');

        let query = window.auth.sb
            .from('personal_tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data: tasks, error } = await query;

        if (error) throw error;

        renderTasks(tasks);

    } catch (error) {
        console.error('[PersonalTasks] Error fetching tasks:', error);
        listContainer.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-red-500">
                    Error al cargar las tareas. Intenta nuevamente.
                </td>
            </tr>
        `;
    }
}

function renderTasks(tasks) {
    const listContainer = document.getElementById('personal-tasks-list');
    listContainer.innerHTML = '';

    if (!tasks || tasks.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-slate-500">
                    No hay tareas ${currentFilter === 'pending' ? 'pendientes' : ''}.
                </td>
            </tr>
        `;
        return;
    }

    tasks.forEach(task => {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const isOverdue = dueDate < now && task.status === 'pending';

        const row = document.createElement('tr');
        row.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors group';
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-medium text-slate-900 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}">${task.title}</div>
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}">
                    ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    ${isOverdue ? '<span class="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Vencida</span>' : ''}
                </div>
            </td>
             <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
            }">
                    ${task.status === 'pending' ? 'Pendiente' : 'Completada'}
                </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
                <button class="text-slate-400 hover:text-blue-600 transition-colors btn-edit-task" title="Editar">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button class="text-slate-400 hover:text-green-600 transition-colors btn-toggle-task" title="${task.status === 'pending' ? 'Marcar Completada' : 'Marcar Pendiente'}">
                    <i data-lucide="${task.status === 'pending' ? 'check-circle' : 'rotate-ccw'}" class="w-4 h-4"></i>
                </button>
                <button class="text-slate-400 hover:text-red-600 transition-colors btn-delete-task" title="Eliminar">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;

        // Action Bindings
        row.querySelector('.btn-edit-task').addEventListener('click', () => openTaskModal(task));
        row.querySelector('.btn-toggle-task').addEventListener('click', () => toggleTaskStatus(task));
        row.querySelector('.btn-delete-task').addEventListener('click', () => deleteTask(task.id));

        listContainer.appendChild(row);
    });

    lucide.createIcons();
}

// --- CRUD Operations ---

async function saveTask() {
    const titleObj = document.getElementById('task-title');
    const dateObj = document.getElementById('task-date');
    const timeObj = document.getElementById('task-time');

    if (!titleObj.value || !dateObj.value || !timeObj.value) {
        window.showToast('Por favor completa todos los campos', 'error');
        return;
    }

    const dueDateTime = `${dateObj.value}T${timeObj.value}:00`;

    const taskData = {
        title: titleObj.value,
        due_date: new Date(dueDateTime).toISOString(),
        user_id: window.auth.getSession()?.user?.id
    };

    const btnSave = document.getElementById('btn-save-task');
    const originalText = btnSave.textContent;
    btnSave.textContent = 'Guardando...';
    btnSave.disabled = true;

    try {
        let result;
        if (currentTaskId) {
            // Update
            result = await window.auth.sb
                .from('personal_tasks')
                .update(taskData)
                .eq('id', currentTaskId);
        } else {
            // Create
            taskData.status = 'pending'; // Default
            result = await window.auth.sb
                .from('personal_tasks')
                .insert([taskData]);
        }

        if (result.error) throw result.error;

        window.showToast('Tarea guardada exitosamente', 'success');
        closeTaskModal();
        fetchTasks();

    } catch (error) {
        console.error('[PersonalTasks] Error saving task:', error);
        window.showToast('Error al guardar la tarea', 'error');
    } finally {
        btnSave.textContent = originalText;
        btnSave.disabled = false;
    }
}

async function toggleTaskStatus(task) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';

    try {
        const { error } = await window.auth.sb
            .from('personal_tasks')
            .update({ status: newStatus })
            .eq('id', task.id);

        if (error) throw error;

        fetchTasks(); // Refresh list
        window.showToast(`Tarea marcada como ${newStatus === 'pending' ? 'pendiente' : 'completada'}`, 'success');

    } catch (error) {
        console.error('[PersonalTasks] Error updating status:', error);
        window.showToast('Error al actualizar estado', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    try {
        const { error } = await window.auth.sb
            .from('personal_tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;

        fetchTasks();
        window.showToast('Tarea eliminada', 'success');

    } catch (error) {
        console.error('[PersonalTasks] Error deleting task:', error);
        window.showToast('Error al eliminar tarea', 'error');
    }
}

// --- Modal Management ---

function openTaskModal(task = null) {
    const modal = document.getElementById('modal-task');
    const modalBackdrop = document.getElementById('modal-task-backdrop');
    const modalPanel = document.getElementById('modal-task-panel');
    const modalTitle = document.getElementById('modal-task-title');

    const titleInput = document.getElementById('task-title');
    const dateInput = document.getElementById('task-date');
    const timeInput = document.getElementById('task-time');

    if (task) {
        currentTaskId = task.id;
        modalTitle.textContent = 'Editar Tarea';
        titleInput.value = task.title;

        const dateObj = new Date(task.due_date);
        dateInput.value = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        timeInput.value = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); // HH:MM
    } else {
        currentTaskId = null;
        modalTitle.textContent = 'Nueva Tarea';
        titleInput.value = '';

        // Default to today + 1 hour
        const now = new Date();
        now.setHours(now.getHours() + 1);
        dateInput.value = now.toISOString().split('T')[0];
        timeInput.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    modal.classList.remove('hidden');
    // Simple animation logic
    requestAnimationFrame(() => {
        modalBackdrop.classList.remove('opacity-0');
        modalPanel.classList.remove('opacity-0', 'scale-95');
    });
}

function closeTaskModal() {
    const modal = document.getElementById('modal-task');
    const modalBackdrop = document.getElementById('modal-task-backdrop');
    const modalPanel = document.getElementById('modal-task-panel');

    modalBackdrop.classList.add('opacity-0');
    modalPanel.classList.add('opacity-0', 'scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200); // Match transition duration
}

// --- Settings Management ---

let currentReminderRules = [];

function openSettingsModal() {
    const modal = document.getElementById('modal-reminder-settings');
    const backdrop = document.getElementById('modal-settings-backdrop');
    const panel = document.getElementById('modal-settings-panel');

    // Load current settings
    loadReminderSettings();

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
    });
}

function closeSettingsModal() {
    const modal = document.getElementById('modal-reminder-settings');
    const backdrop = document.getElementById('modal-settings-backdrop');
    const panel = document.getElementById('modal-settings-panel');

    backdrop.classList.add('opacity-0');
    panel.classList.add('opacity-0', 'scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

async function loadReminderSettings() {
    const userId = window.auth.getSession()?.user?.id;
    if (!userId) {
        console.warn('[PersonalTasks] No user ID found for settings');
        return;
    }

    try {
        const { data, error } = await window.auth.sb
            .from('user_settings')
            .select('reminder_preferences')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        const prefs = data?.reminder_preferences;

        currentReminderRules = [];
        if (Array.isArray(prefs)) {
            currentReminderRules = prefs;
        } else if (typeof prefs === 'object' && prefs !== null) {
            // Migrate old format
            if (prefs['48h']) currentReminderRules.push({ value: 2, unit: 'days' });
            if (prefs['24h']) currentReminderRules.push({ value: 1, unit: 'days' });
            if (prefs['2h']) currentReminderRules.push({ value: 2, unit: 'hours' });
        } else {
            // Default rules if nothing saved
            currentReminderRules = [
                { value: 2, unit: 'days' },
                { value: 1, unit: 'days' },
                { value: 2, unit: 'hours' }
            ];
        }

        renderReminderRules();

    } catch (error) {
        console.error('[PersonalTasks] Error loading settings:', error);
        window.showToast?.('Error al cargar configuración', 'error');
    }
}

function renderReminderRules() {
    const container = document.getElementById('reminder-rules-list');
    if (!container) return;

    container.innerHTML = '';

    if (currentReminderRules.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-400 italic text-center py-2">No hay reglas definidas</p>';
        return;
    }

    currentReminderRules.forEach((rule, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-white p-3 rounded-md border border-slate-200 shadow-sm transition-all hover:border-blue-200';

        let label = '';
        if (rule.unit === 'hours') label = `${rule.value} hora${rule.value > 1 ? 's' : ''} antes`;
        if (rule.unit === 'days') label = `${rule.value} día${rule.value > 1 ? 's' : ''} antes`;
        if (rule.unit === 'weeks') label = `${rule.value} semana${rule.value > 1 ? 's' : ''} antes`;

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <i data-lucide="clock" class="w-4 h-4 text-blue-500"></i>
                </div>
                <span class="text-sm font-medium text-slate-700">${label}</span>
            </div>
            <button class="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 btn-remove-rule">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        div.querySelector('.btn-remove-rule').addEventListener('click', () => removeRule(index));
        container.appendChild(div);
    });

    if (window.lucide) window.lucide.createIcons();
}

function addRule() {
    const valueInput = document.getElementById('new-rule-value');
    const unitInput = document.getElementById('new-rule-unit');

    const value = parseInt(valueInput.value);
    const unit = unitInput.value;

    if (!value || value <= 0) {
        window.showToast?.('Ingresa un valor válido', 'warning');
        return;
    }

    // Check duplicate
    const exists = currentReminderRules.some(r => r.value === value && r.unit === unit);
    if (exists) {
        window.showToast?.('Esta regla ya existe', 'warning');
        return;
    }

    const newRule = { value, unit };
    currentReminderRules.push(newRule);

    // Sort logic: compare total hours
    currentReminderRules.sort((a, b) => {
        const getHours = (r) => {
            if (r.unit === 'weeks') return r.value * 24 * 7;
            if (r.unit === 'days') return r.value * 24;
            return r.value;
        };
        return getHours(b) - getHours(a); // Descending
    });

    valueInput.value = '';
    renderReminderRules();
}

function removeRule(index) {
    currentReminderRules.splice(index, 1);
    renderReminderRules();
}

async function saveSettings() {
    const userId = window.auth.getSession()?.user?.id;
    if (!userId) return;

    const btn = document.getElementById('btn-save-settings');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    try {
        const { error } = await window.auth.sb
            .from('user_settings')
            .upsert({
                user_id: userId,
                reminder_preferences: currentReminderRules,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        window.showToast?.('Configuración guardada', 'success');
        closeSettingsModal();

    } catch (error) {
        console.error('[PersonalTasks] Error saving settings:', error);
        window.showToast?.('Error al guardar configuración', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
