// bulk-sending.js - Módulo aislado para el panel de envío masivo

class BulkSendingModule {
    constructor() {
        this.file = null;
        this.iti = null; // Instancia para el input de teléfono de prueba
        this.init();
        // Vincular métodos para asegurar que 'this' funcione correctamente
        this.insertPlaceholder = this.insertPlaceholder.bind(this);
        this.openAiModalForBulk = this.openAiModalForBulk.bind(this);
        this.handleTestSend = this.handleTestSend.bind(this);
    }

    init() {
        document.addEventListener('panel:activated', ({ detail }) => {
            if (detail.panelId === 'bulk-sending') {
                this.onPanelActivated();
            }
        });
    }

    onPanelActivated() {
        //         console.log('Panel de Envío Masivo activado.');
        this.checkPrerequisites();
        this.setupEventListeners();
        this.populateLabelSelectors();
        this.initializeScheduleDefaults();

        // Re-renderizar iconos para asegurar que se vean correctamente
        if (window.lucide) {
            window.lucide.createIcons();
        }

        document.addEventListener('profile:updated', () => this.checkPrerequisites());
    }

    async checkPrerequisites() {
        const button = document.getElementById('bulk-submit-btn');
        const stopButton = document.getElementById('bulk-stop-btn');
        if (!button) return;

        const userId = window.auth.getSession()?.user?.id;
        if (!userId) {
            console.error("No se encontró el ID de usuario para verificar el estado de la campaña.");
            return;
        }

        try {
            const [profileRes, usageRes, planRes] = await Promise.all([
                window.auth.sb.from('profiles').select('active_campaign_id, whatsapp_connected').eq('id', userId).single(),
                window.appInstance.loadUserUsage(),
                window.appInstance.loadUserSubscription()
            ]);

            if (profileRes.error) throw profileRes.error;

            const profile = profileRes.data;
            const usage = usageRes;
            const plan = planRes;

            const bulkSendsLimit = plan?.plans?.bulk_sends_limit || 0;
            const bulkSendsUsed = usage?.bulk_sends_used || 0;

            //             console.log(`[Bulk Sending] Usage: ${bulkSendsUsed} / ${bulkSendsLimit}`);

            // Mostrar/ocultar botón de detener según active_campaign_id
            if (stopButton) {
                if (profile.active_campaign_id) {
                    stopButton.classList.remove('hidden');
                } else {
                    stopButton.classList.add('hidden');
                }
            }

            if (!profile.whatsapp_connected) {
                button.disabled = true;
                button.querySelector('.button-text').textContent = 'Conecta WhatsApp primero';
            } else if (profile.active_campaign_id) {
                button.disabled = true;
                button.querySelector('.button-text').textContent = 'Campaña en progreso...';
            } else if (bulkSendsUsed >= bulkSendsLimit) {
                button.disabled = true;
                button.querySelector('.button-text').textContent = 'Límite de envíos alcanzado';
            } else {
                button.disabled = false;
                button.querySelector('.button-text').textContent = 'Enviar Campaña';
            }
        } catch (error) {
            console.error("Error al verificar pre-requisitos de envío masivo:", error);
            button.disabled = true;
            button.querySelector('.button-text').textContent = 'Error al verificar';
        }
    }

    setupEventListeners() {
        const form = document.getElementById('bulk-send-form');
        if (!form || form.dataset.listenersAttached === 'true') return;
        form.dataset.listenersAttached = 'true';

        form.addEventListener('submit', this.handleBulkSend.bind(this));

        const dropZone = document.getElementById('file-drop-zone');
        const fileInput = document.getElementById('bulk-file-input');
        const removeFileBtn = document.getElementById('remove-file-btn');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-blue-500', 'bg-blue-50'));
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-blue-50'); if (e.dataTransfer.files.length) this.handleFileSelect(e.dataTransfer.files[0]); });
        fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.handleFileSelect(e.target.files[0]); });
        removeFileBtn.addEventListener('click', () => this.removeFile());

        document.getElementById('personalize-name-btn')?.addEventListener('click', this.insertPlaceholder);
        document.getElementById('bulk-test-btn')?.addEventListener('click', this.handleTestSend);
        document.getElementById('bulk-stop-btn')?.addEventListener('click', this.handleStopCampaign.bind(this));

        // Botón para mejorar con IA
        document.getElementById('bulk-ai-enhance-btn')?.addEventListener('click', this.openAiModalForBulk);


    }

    async handleFileSelect(file) {
        const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
        if (file.size > MAX_SIZE) {
            const message = "Ups, el archivo es muy grande (máximo 25MB). Te recomendamos esta web para reducir el peso de tu archivo.";
            if (confirm(message)) {
                window.open('https://www.iloveimg.com/compress-image', '_blank');
            }
            this.removeFile();
            return;
        }

        // Mostrar barra de progreso
        this.showUploadProgress(0, 'Optimizando archivo...');

        try {
            // Optimizar el archivo antes de guardarlo
            const optimizedFile = await this.optimizeFile(file);
            this.file = optimizedFile;

            const filePreviewContainer = document.getElementById('file-preview');
            const imagePreview = document.getElementById('file-image-preview');
            document.getElementById('file-name').textContent = optimizedFile.name;

            // Mostrar vista previa si es una imagen
            if (optimizedFile.type.startsWith('image/')) {
                imagePreview.src = URL.createObjectURL(optimizedFile);
                imagePreview.classList.remove('hidden');
            } else {
                imagePreview.classList.add('hidden');
            }

            filePreviewContainer.classList.remove('hidden');
            document.getElementById('file-drop-zone').classList.add('hidden');
            this.hideUploadProgress();
            lucide.createIcons(); // CORRECCIÓN: Renderizar iconos después de insertar HTML
        } catch (error) {
            console.error('Error al optimizar archivo:', error);
            window.showToast?.('Error al procesar el archivo. Se usará el archivo original.', 'warning');
            this.file = file;
            this.hideUploadProgress();
        }
    }

    showUploadProgress(percent, message = '') {
        let progressContainer = document.getElementById('file-upload-progress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'file-upload-progress';
            progressContainer.className = 'mt-4';
            progressContainer.innerHTML = `
                <div class="bg-slate-100 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-slate-700" id="upload-progress-text">${message || 'Subiendo...'}</span>
                        <span class="text-sm text-slate-500" id="upload-progress-percent">0%</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2">
                        <div id="upload-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
            `;
            const filePreview = document.getElementById('file-preview');
            if (filePreview) {
                filePreview.appendChild(progressContainer);
            }
        }
        const progressBar = document.getElementById('upload-progress-bar');
        const progressPercent = document.getElementById('upload-progress-percent');
        const progressText = document.getElementById('upload-progress-text');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
        if (progressText && message) progressText.textContent = message;
        progressContainer.classList.remove('hidden');
    }

    hideUploadProgress() {
        const progressContainer = document.getElementById('file-upload-progress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    async optimizeFile(file) {
        // Si es una imagen, comprimirla
        if (file.type.startsWith('image/')) {
            return await this.compressImage(file);
        }
        // Si es un video, intentar comprimirlo (si es posible en el cliente)
        if (file.type.startsWith('video/')) {
            // Por ahora, devolvemos el archivo original ya que la compresión de video en el cliente es compleja
            // En el futuro se podría usar una librería como ffmpeg.wasm
            return file;
        }
        // Para otros tipos, devolver el archivo original
        return file;
    }

    async compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Redimensionar si es necesario
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = width * ratio;
                        height = height * ratio;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Error al comprimir la imagen'));
                            return;
                        }
                        // Preservar el nombre original pero mantener la extensión correcta
                        const originalName = file.name;
                        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
                        const extension = file.type === 'image/jpeg' ? 'jpg' :
                            file.type === 'image/png' ? 'png' :
                                file.type === 'image/webp' ? 'webp' : 'jpg';
                        const optimizedName = `${nameWithoutExt}.${extension}`;

                        const optimizedFile = new File([blob], optimizedName, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        resolve(optimizedFile);
                    }, file.type, quality);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    removeFile() {
        this.file = null;
        document.getElementById('bulk-file-input').value = '';
        document.getElementById('file-preview').classList.add('hidden');
        document.getElementById('file-image-preview').classList.add('hidden');
        document.getElementById('file-drop-zone').classList.remove('hidden');
    }

    async populateLabelSelectors() {
        const includeSelect = document.getElementById('include-labels');
        const excludeSelect = document.getElementById('exclude-labels');

        try {
            const { data: labels, error } = await window.auth.sb.from('labels').select('name');
            if (error) throw error;

            const uniqueLabelNames = [...new Set(labels.map(l => l.name))].sort();

            includeSelect.innerHTML = '<option value="todos">Todos los contactos</option>';
            uniqueLabelNames.forEach(name => includeSelect.innerHTML += `<option value="${name}">${name}</option>`);

            excludeSelect.innerHTML = '<option value="ninguno">Ninguno</option>';
            uniqueLabelNames.forEach(name => excludeSelect.innerHTML += `<option value="${name}">${name}</option>`);
        } catch (error) {
            console.error('Error al cargar etiquetas para selectores:', error);
            includeSelect.innerHTML = '<option>Error al cargar</option>';
            excludeSelect.innerHTML = '<option>Error al cargar</option>';
        }
    }

    initializeScheduleDefaults() {
        const dateInput = document.getElementById('bulk-schedule-date');
        if (dateInput) {
            const today = new Date();
            const offsetMs = today.getTimezoneOffset() * 60000;
            const localIso = new Date(today.getTime() - offsetMs).toISOString().split('T')[0];
            dateInput.min = localIso;
        }
    }

    insertPlaceholder() {
        const textarea = document.getElementById('bulk-message');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const placeholder = '%nombre%';
        textarea.value = text.substring(0, start) + placeholder + text.substring(end);
        textarea.focus();
        textarea.selectionEnd = start + placeholder.length;
    }

    openAiModalForBulk() {
        const textarea = document.getElementById('bulk-message');
        const originalText = textarea.value;
        if (!originalText) {
            alert('Primero escribe un mensaje para poder mejorarlo.');
            return;
        }
        // Reutilizamos la función global del modal de IA que estará en app.js
        window.appInstance.openAiEnhanceModal(originalText, (newText) => {
            textarea.value = newText;
        });
    }

    async requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return false;
        }
        if (Notification.permission === "granted") {
            return true;
        }
        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return false;
    }

    sendBrowserNotification(title, body) {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                body: body,
                icon: '/public/favicon.ico' // Ajusta si tienes un icono específico
            });

            // Opcional: cerrar la notificación automáticamente después de unos segundos
            setTimeout(() => notification.close(), 5000);
        }
    }

    async handleBulkSend(e) {
        e.preventDefault();

        // Solicitar permiso para notificaciones al inicio de la interacción
        await this.requestNotificationPermission();

        const button = e.target.querySelector('button[type="submit"]');
        button.disabled = true;
        const buttonText = button.querySelector('.button-text');
        buttonText.textContent = 'Preparando...';
        button.querySelector('.loading-spinner').classList.remove('hidden');

        try {
            const userId = window.auth.getSession().user.id;

            // Bloquear futuros envíos actualizando el estado en Supabase
            const { error: statusError } = await window.auth.sb
                .from('profiles')
                .update({ active_campaign_id: `campaign_${Date.now()}` }) // Asigna un ID de campaña único
                .eq('id', userId);

            if (statusError) throw new Error(`No se pudo actualizar el estado: ${statusError.message}`);

            let fileUrl = null;
            if (this.file) {
                buttonText.textContent = 'Subiendo archivo...';
                // Usamos la función global centralizada que sube a Bunny.net
                if (!window.appInstance) throw new Error("La instancia de la aplicación no está lista.");

                // Mostrar barra de progreso
                this.showUploadProgress(0, 'Subiendo archivo...');

                try {
                    fileUrl = await window.appInstance.uploadAsset(this.file, 'bulk-campaigns', (progress) => {
                        this.showUploadProgress(progress, 'Subiendo archivo...');
                    });
                    this.showUploadProgress(100, 'Archivo subido correctamente');
                    setTimeout(() => this.hideUploadProgress(), 1000);
                } catch (error) {
                    this.hideUploadProgress();
                    throw error;
                }
            }

            const scheduleDateInput = document.getElementById('bulk-schedule-date');
            const scheduleTimeInput = document.getElementById('bulk-schedule-time');
            const scheduleDate = scheduleDateInput?.value?.trim() || '';
            const scheduleTime = scheduleTimeInput?.value?.trim() || '';

            let scheduledAt = null;
            let scheduledTimezone = null;

            if (scheduleDate || scheduleTime) {
                if (!scheduleDate || !scheduleTime) {
                    throw new Error('Si quieres programar la campaña debes seleccionar fecha y hora.');
                }
                const localDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
                if (Number.isNaN(localDateTime.getTime())) {
                    throw new Error('La fecha y hora seleccionadas no son válidas.');
                }
                if (localDateTime.getTime() <= Date.now()) {
                    throw new Error('Programa la campaña en una fecha y hora futura.');
                }
                scheduledAt = localDateTime.toISOString();
                try {
                    scheduledTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                } catch (_err) {
                    scheduledTimezone = null;
                }
            }

            buttonText.textContent = scheduledAt ? 'Programando campaña...' : 'Enviando campaña...';

            const payload = {
                userId: userId,
                message: document.getElementById('bulk-message').value,
                includeTag: document.getElementById('include-labels').value,
                excludeTag: document.getElementById('exclude-labels').value,
                fileUrl: fileUrl, // Enviamos la URL en lugar del archivo
                scheduledAt,
                scheduledTimezone,
                scheduledDate: scheduleDate || null,
                scheduledTime: scheduleTime || null,
            };

            const webhookUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/masivos-elina';
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('El servidor de automatización (n8n) no respondió correctamente.');

            if (scheduledAt) {
                const msg = '¡Campaña programada! La enviaremos automáticamente en la fecha y hora seleccionadas.';
                // alert(msg); // Opcional: mantener alert o quitarlo
                this.sendBrowserNotification('Campaña Programada', msg);
                window.showToast?.(msg, 'success'); // Usar toast si disponible
            } else {
                const msg = '¡Campaña iniciada! El proceso se está ejecutando en segundo plano.';
                // alert(msg); // Opcional: mantener alert o quitarlo
                this.sendBrowserNotification('Campaña Enviada', msg);
                window.showToast?.(msg, 'success'); // Usar toast si disponible
            }

            // Mostrar el botón de detener después de iniciar la campaña
            const stopButton = document.getElementById('bulk-stop-btn');
            if (stopButton) {
                stopButton.classList.remove('hidden');
                // Renderizar iconos de Lucide
                if (window.lucide?.createIcons) {
                    window.lucide.createIcons({ root: stopButton });
                }
            }

            e.target.reset();
            this.removeFile();
            if (scheduleDateInput) scheduleDateInput.value = '';
            if (scheduleTimeInput) scheduleTimeInput.value = '';

        } catch (error) {
            console.error('Error al enviar la campaña:', error);
            // alert(`Error al enviar la campaña: ${error.message}`);
            window.showToast?.(`Error al enviar la campaña: ${error.message}`, 'error');
            this.sendBrowserNotification('Error en Campaña', `No se pudo enviar la campaña: ${error.message}`);

            // Si hay error, limpiar el active_campaign_id para permitir reintentar
            try {
                const userId = window.auth.getSession().user.id;
                await window.auth.sb
                    .from('profiles')
                    .update({ active_campaign_id: null })
                    .eq('id', userId);
            } catch (cleanupError) {
                console.error('Error al limpiar active_campaign_id:', cleanupError);
            }
        } finally {
            button.disabled = false;
            buttonText.textContent = 'Enviar Campaña';
            button.querySelector('.loading-spinner').classList.add('hidden');
        }
    }

    async handleStopCampaign() {
        const stopButton = document.getElementById('bulk-stop-btn');
        const submitButton = document.getElementById('bulk-submit-btn');

        if (!stopButton) return;

        // Confirmar con el usuario
        const confirmed = await window.appModal?.confirm(
            '¿Estás seguro de que quieres detener la campaña en progreso? El flujo de n8n se detendrá en la siguiente iteración.',
            'Detener Campaña'
        );

        if (!confirmed) return;

        // Deshabilitar el botón mientras se procesa
        stopButton.disabled = true;
        const originalText = stopButton.querySelector('span')?.textContent || 'Detener Campaña';
        if (stopButton.querySelector('span')) {
            stopButton.querySelector('span').textContent = 'Deteniendo...';
        }

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) {
                throw new Error('No se pudo obtener el ID de usuario');
            }

            // Obtener el campaign_id actual antes de limpiarlo (por si queremos cancelar la ejecución)
            const { data: profile } = await window.auth.sb
                .from('profiles')
                .select('active_campaign_id')
                .eq('id', userId)
                .single();

            // Actualizar active_campaign_id a null en Supabase
            // Esto hará que el workflow de n8n se detenga en la siguiente iteración del loop
            const { error } = await window.auth.sb
                .from('profiles')
                .update({ active_campaign_id: null })
                .eq('id', userId);

            if (error) throw error;

            // Intentar cancelar la ejecución de n8n directamente si tenemos el execution ID
            // Esto es opcional pero hace que la detención sea más inmediata
            try {
                // Buscar el campaign_id en campaign_state para obtener el execution ID
                if (profile?.active_campaign_id) {
                    const { data: campaignState } = await window.auth.sb
                        .from('campaign_state')
                        .select('campaign_id')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (campaignState?.campaign_id) {
                        // Intentar cancelar la ejecución en n8n
                        // Nota: Esto requiere que tengas acceso a la API de n8n
                        // Si no tienes las credenciales, el workflow se detendrá automáticamente
                        // en la siguiente iteración cuando verifique active_campaign_id
                        const n8nBaseUrl = 'https://n8n-n8n.mcjhhb.easypanel.host';
                        const executionId = campaignState.campaign_id;

                        // Intentar cancelar (esto puede fallar si no hay permisos, pero no es crítico)
                        try {
                            await fetch(`${n8nBaseUrl}/api/v1/executions/${executionId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    // Nota: Si n8n requiere autenticación, necesitarías agregar el token aquí
                                }
                            });
                        } catch (cancelError) {
                            // No es crítico si falla, el workflow se detendrá en la siguiente iteración
                            console.log('No se pudo cancelar la ejecución directamente, pero el workflow se detendrá automáticamente');
                        }
                    }
                }
            } catch (cancelError) {
                // No es crítico si falla
                console.log('Error al intentar cancelar ejecución:', cancelError);
            }

            // Ocultar el botón de detener
            stopButton.classList.add('hidden');

            // Habilitar el botón de envío
            if (submitButton) {
                submitButton.disabled = false;
                const buttonText = submitButton.querySelector('.button-text');
                if (buttonText) {
                    buttonText.textContent = 'Enviar Campaña';
                }
            }

            // Mostrar mensaje de confirmación
            window.showToast?.('Campaña detenida. El flujo se detendrá en la siguiente iteración.', 'success');

        } catch (error) {
            console.error('Error al detener la campaña:', error);
            window.showToast?.('Error al detener la campaña: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            stopButton.disabled = false;
            if (stopButton.querySelector('span')) {
                stopButton.querySelector('span').textContent = originalText;
            }
        }
    }

    handleTestSend() {
        const modal = document.getElementById('test-send-modal');
        modal.classList.remove('hidden');

        if (!this.iti) {
            const phoneInput = document.querySelector("#test-phone-input");
            this.iti = window.intlTelInput(phoneInput, {
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                initialCountry: "mx",
                separateDialCode: true,
            });

            // Añadir listeners aquí, una vez que estamos seguros de que el modal está abierto
            document.getElementById('cancel-test-send-btn').addEventListener('click', () => this.closeTestModal());
            document.getElementById('confirm-test-send-btn').addEventListener('click', () => this.executeTestSend());
        }
    }

    closeTestModal() {
        document.getElementById('test-send-modal').classList.add('hidden');
        document.getElementById('test-phone-error').classList.add('hidden');
    }

    async executeTestSend() {
        if (!this.iti.isValidNumber()) {
            document.getElementById('test-phone-error').classList.remove('hidden');
            return;
        }
        document.getElementById('test-phone-error').classList.add('hidden');
        const testNumber = this.iti.getNumber(); // Obtiene el número en formato internacional

        const button = document.getElementById('confirm-test-send-btn');
        button.disabled = true;
        button.textContent = 'Enviando...';

        try {
            const userId = window.auth.getSession().user.id;
            const message = document.getElementById('bulk-message').value.replace('%nombre%', 'Prueba');

            let fileUrl = null;
            if (this.file) {
                if (!window.appInstance) throw new Error("La instancia de la aplicación no está lista.");

                // Mostrar barra de progreso
                this.showUploadProgress(0, 'Subiendo archivo...');

                try {
                    fileUrl = await window.appInstance.uploadAsset(this.file, 'bulk-tests', (progress) => {
                        this.showUploadProgress(progress, 'Subiendo archivo...');
                    });
                    this.showUploadProgress(100, 'Archivo subido correctamente');
                    setTimeout(() => this.hideUploadProgress(), 1000);
                } catch (error) {
                    this.hideUploadProgress();
                    throw error;
                }
            }

            const payload = {
                userId: userId,
                testNumber: testNumber,
                message: message,
                fileUrl: fileUrl
            };

            const webhookUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/masivos-test-elina';
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('El servidor no respondió correctamente.');
            alert(`Mensaje de prueba enviado a ${testNumber}.`);

        } catch (error) {
            console.error('Error en envío de prueba:', error);
            alert(`Error al enviar la prueba: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = 'Enviar Prueba';
            this.closeTestModal();
        }
    }
}

new BulkSendingModule();
