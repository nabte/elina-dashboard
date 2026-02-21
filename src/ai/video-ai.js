// video-ai.js - Módulo para el panel de Video IA

(function () {
    let isInitialized = false;
    let videoState = {};
    let userPlan = null;
    let usageInfo = { used: 0, limit: 0 };
    let isLoading = false;
    const VEO_POLL_INTERVAL_MS = 5000;
    const VEO_MAX_ATTEMPTS = 40;

    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'video-ai' && !isInitialized) {
            initVideoAiPanel();
        }
    });

    async function initVideoAiPanel() {
        isInitialized = true;
        await loadInitialData();
        resetState();
        setupEventListeners();
        render();
    }

    async function loadInitialData() {
        userPlan = await window.appInstance.loadUserSubscription();
        const userUsage = await window.appInstance.loadUserUsage();
        usageInfo = {
            used: userUsage?.video_generations_used || 0,
            limit: userPlan?.plans?.video_generations_limit || 0
        };
    }

    function resetState() {
        videoState = {
            actionsPrompt: '', // Prompt de acciones
            textPrompt: '', // Prompt de texto
            audioType: '', // Tipo de audio de fondo
            imageUrls: [],
            model: 'veo3_fast', // Siempre usar veo3_fast (la más barata)
            aspectRatio: 'Auto', // Por defecto Auto (vertical)
            callBackUrl: '',
            seed: null,
            generationType: 'auto',
        };
    }

    function setupEventListeners() {
        const panel = document.getElementById('video-ai');
        if (!panel) return;

        panel.addEventListener('input', (e) => {
            if (e.target.id === 'video-actions-prompt') videoState.actionsPrompt = e.target.value;
            if (e.target.id === 'video-text-prompt') videoState.textPrompt = e.target.value;
            if (e.target.id === 'video-audio-type') videoState.audioType = e.target.value;
            if (e.target.id === 'video-aspect-ratio-select') videoState.aspectRatio = e.target.value;
        });

        panel.addEventListener('click', (e) => {
            if (e.target.id === 'generate-video-btn') handleGenerate();
        });
    }

    function render() {
        const panel = document.getElementById('video-ai');
        if (!panel) return;

        const canUseFeature = userPlan?.plans?.features?.video_ai ?? false;
        panel.querySelector('.grid').classList.toggle('hidden', !canUseFeature);
        panel.querySelector('#video-ai-access-denied').classList.toggle('hidden', canUseFeature);

        if (!canUseFeature) {
            document.getElementById('upgrade-to-grow-from-video').onclick = () => window.appInstance.handleUpgradeClick('grow');
            return;
        }

        const imageSelector = panel.querySelector('#video-reference-selector');
        if (imageSelector) {
            imageSelector.innerHTML = Array.from({ length: 2 }).map((_, index) =>
                renderImageUpload(`video-ref-${index}`, index === 0 ? 'Primer Frame' : 'Último Frame', videoState.imageUrls[index])
            ).join('');
        }

        // Cargar valores de los campos
        const actionsInput = panel.querySelector('#video-actions-prompt');
        const textInput = panel.querySelector('#video-text-prompt');
        const audioInput = panel.querySelector('#video-audio-type');
        const aspectSelect = panel.querySelector('#video-aspect-ratio-select');

        if (actionsInput) actionsInput.value = videoState.actionsPrompt || '';
        if (textInput) textInput.value = videoState.textPrompt || '';
        if (audioInput) audioInput.value = videoState.audioType || '';
        if (aspectSelect) aspectSelect.value = videoState.aspectRatio || 'Auto';

        const usageContainer = panel.querySelector('#video-generation-usage-container');
        if (usageContainer) {
            usageContainer.innerHTML = `
                <h4 class="font-bold text-sm mb-1">Uso Mensual</h4>
                <p class="text-xs text-slate-600">Videos generados: <span id="video-generation-usage" class="font-bold">${usageInfo.used} / ${usageInfo.limit}</span></p>
            `;
        }

        attachImageUploadListeners();
        lucide.createIcons();
    }

    function renderImageUpload(id, label, imageUrl) {
        return `
            <div class="image-upload-slot" data-upload-id="${id}">
                <label for="${id}" class="upload-label">
                    ${!imageUrl ? `<div class="text-center text-xs text-gray-500"><p class="font-semibold">${label}</p></div>` : ''}
                </label>
                ${imageUrl ? `<img src="${imageUrl}" alt="Preview" class="image-preview" />` : ''}
                ${imageUrl ? `<button class="remove-button" data-remove-id="${id}"><i data-lucide="x" class="w-4 h-4 pointer-events-none"></i></button>` : ''}
                <input id="${id}" type="file" class="hidden" accept="image/*" />
            </div>
        `;
    }

    function attachImageUploadListeners() {
        document.querySelectorAll('#video-reference-selector .image-upload-slot').forEach(slot => {
            const inputId = slot.dataset.uploadId;
            const input = document.getElementById(inputId);
            const index = parseInt(inputId.split('-')[2], 10);

            slot.querySelector('.remove-button')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                videoState.imageUrls[index] = null;
                render();
            });

            input.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                    const url = await window.appInstance.uploadAsset(file, 'video-references');
                    videoState.imageUrls[index] = url;
                } catch (err) {
                    window.showToast('Error al subir la imagen.', 'error');
                }
                render();
            });
        });
    }

    function buildCombinedPrompt() {
        const parts = [];
        
        // Prompt de acciones
        if (videoState.actionsPrompt?.trim()) {
            parts.push(`Acciones: ${videoState.actionsPrompt.trim()}`);
        }
        
        // Prompt de texto
        if (videoState.textPrompt?.trim()) {
            parts.push(videoState.textPrompt.trim());
        }
        
        // Tipo de audio de fondo
        if (videoState.audioType?.trim()) {
            parts.push(`Audio de fondo: ${videoState.audioType.trim()}`);
        }
        
        return parts.join('. ');
    }

    async function handleGenerate() {
        if (isLoading) return;
        
        const combinedPrompt = buildCombinedPrompt();
        if (!combinedPrompt || combinedPrompt.trim().length === 0) {
            window.showToast('Debes completar al menos una sección (acciones, texto o audio).', 'error');
            return;
        }

        if (usageInfo.limit > 0 && usageInfo.used >= usageInfo.limit) {
            window.showToast('Has alcanzado tu limite de generaciones de video.', 'error');
            return;
        }

        const generateBtn = document.getElementById('generate-video-btn');
        const resultContainer = document.getElementById('video-result-container');

        isLoading = true;
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generando...';
        resultContainer.innerHTML = '<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>';

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) throw new Error('No se pudo determinar el usuario actual.');

            // Verificar acceso de cuenta primero (si la función existe)
            let accessCheck = null;
            try {
                const { data, error: accessError } = await window.auth.sb.rpc('check_account_access', { p_user_id: userId });
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

            const { data: usageCheck, error: usageError } = await window.auth.sb.rpc('increment_video_usage', { p_user_id: userId });
            if (usageError || !usageCheck?.success) {
                throw new Error(usageCheck?.message || usageError?.message || 'Error al verificar el uso.');
            }

            const imageUrls = videoState.imageUrls.filter(Boolean);
            let generationType = 'TEXT_2_VIDEO';
            
            // Determinar el tipo de generación basado en las imágenes
            if (imageUrls.length >= 1) {
                // Si hay 1 imagen: usar como referencia (FIRST_AND_LAST_FRAMES_2_VIDEO con 1 imagen)
                // Si hay 2 imágenes: primera y última frame
                generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
            }

            const payload = {
                prompt: combinedPrompt,
                model: 'veo3_fast', // Siempre usar veo3_fast (la más barata)
                aspectRatio: videoState.aspectRatio || 'Auto', // Por defecto Auto (vertical)
                generationType,
                enableTranslation: true,
                imageUrls: imageUrls.length ? imageUrls : undefined,
                callBackUrl: videoState.callBackUrl || undefined,
                seeds: videoState.seed || undefined,
            };

            const { data, error } = await window.auth.invokeFunction('kie-veo-proxy', { body: payload });
            if (error) throw error;

            const taskId = data?.data?.taskId;
            if (!taskId) throw new Error('La API de Kie.ai no devolvio un identificador de tarea.');

            resultContainer.innerHTML = `
                <div class="text-center p-4">
                    <p class="font-semibold">Tarea enviada. Esperando resultados...</p>
                    <p class="text-xs text-slate-500 mt-1">ID: <span class="font-mono">${taskId}</span></p>
                </div>
            `;

            const taskInfo = await pollVeoTaskResult(taskId);
            const videoUrl = extractVideoUrl(taskInfo);
            if (!videoUrl) throw new Error('La tarea finalizo sin devolver el video.');

            const cdnUrl = await persistVideoToCdn(videoUrl, userId);
            // Actualizar el contador local con el valor retornado de la función
            usageInfo.used = usageCheck.used || usageInfo.used + 1;
            refreshUsageDisplay();

            resultContainer.innerHTML = `
                <div class="space-y-3">
                    <video class="w-full rounded-lg shadow-lg" controls playsinline src="${cdnUrl}"></video>
                    <div class="flex flex-col items-center gap-2 text-sm text-slate-600">
                        <span class="font-semibold">Video generado con audio (KIE Veo 3.1 Fast)</span>
                        <a class="text-indigo-600 hover:underline" href="${cdnUrl}" target="_blank" rel="noopener">Abrir en nueva pestaña</a>
                    </div>
                </div>
            `;
            lucide.createIcons();
            window.showToast('Video generado correctamente.', 'success');
        } catch (e) {
            console.error('Error al generar video:', e);
            const message = e?.message || 'Ocurrio un error al generar el video.';
            window.showToast(message, 'error');
            refreshUsageDisplay();
            const resultContainer = document.getElementById('video-result-container');
            resultContainer.innerHTML = `
                <div class="text-center p-4">
                    <i data-lucide="alert-triangle" class="w-12 h-12 text-red-500 mx-auto"></i>
                    <p class="font-semibold mt-2 text-red-700">Error en la generacion</p>
                    <p class="text-xs text-slate-500 mt-1">${message}</p>
                </div>
            `;
            lucide.createIcons();
        } finally {
            isLoading = false;
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generar Video';
        }
    }

    async function pollVeoTaskResult(taskId, maxAttempts = VEO_MAX_ATTEMPTS, intervalMs = VEO_POLL_INTERVAL_MS) {
        let attempt = 0;
        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                const { data, error } = await window.auth.invokeFunction('kie-task-status', {
                    body: { taskId }
                });

                if (error) throw new Error(error.message || 'Error consultando el estado de la tarea.');

                const taskData = data?.data;
                const state = taskData?.state;

                if (state === 'success') {
                    return taskData;
                }

                if (state === 'fail') {
                    const message = taskData?.failMsg || 'La generacion de video fallo.';
                    throw new Error(message);
                }

                await sleep(intervalMs);
            } catch (pollError) {
                console.error('Error al consultar el estado de la tarea de video:', pollError);
                if (attempt >= maxAttempts) throw pollError;
                await sleep(intervalMs);
            }
        }
        throw new Error('La generacion de video esta tardando mas de lo esperado. Intenta nuevamente.');
    }

    function extractVideoUrl(taskData) {
        if (!taskData) return null;
        if (Array.isArray(taskData.resultUrls) && taskData.resultUrls.length > 0) {
            return taskData.resultUrls[0];
        }

        if (taskData.videoUrl) return taskData.videoUrl;

        const raw = typeof taskData.resultJson === 'string' ? taskData.resultJson : null;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                    return parsed.resultUrls[0];
                }
                if (parsed.videoUrl) {
                    return parsed.videoUrl;
                }
            } catch (err) {
                console.error('No se pudo interpretar el resultJson de Veo 3.1:', err);
            }
        }
        return null;
    }

    async function persistVideoToCdn(sourceUrl, userId) {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            throw new Error(`No se pudo descargar el video generado (status ${response.status}).`);
        }
        const blob = await response.blob();
        const extension = inferVideoExtension(blob.type);
        const fileName = `veo-video-${Date.now()}.${extension}`;
        const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });

        const cdnUrl = await window.appInstance.uploadAsset(file, 'video-results');

        try {
            await window.auth.sb
                .from('profiles')
                .update({ last_video_generated_url: cdnUrl })
                .eq('id', userId);
        } catch (err) {
            console.warn('No se pudo registrar el último video generado en el perfil:', err);
        }

        return cdnUrl;
    }

    function inferVideoExtension(mimeType) {
        if (!mimeType) return 'mp4';
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mov')) return 'mov';
        if (mimeType.includes('gif')) return 'gif';
        return 'mp4';
    }

    function refreshUsageDisplay() {
        const span = document.getElementById('video-generation-usage');
        if (span) {
            span.textContent = `${usageInfo.used} / ${usageInfo.limit}`;
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

})();
