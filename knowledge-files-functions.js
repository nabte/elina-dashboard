// ============================================
// KNOWLEDGE FILES MANAGEMENT (RAG)
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function (m) { return map[m]; });
}

async function loadKnowledgeFiles() {
    try {
        const { data, error } = await window.auth.invokeFunction('knowledge-files', {
            method: 'GET'
        });

        if (error) throw new Error(error.message || 'Failed to load files');

        // FILTER:
        // - Hide faq_ (they are in the FAQ tab)
        // - Hide knowledge_chunk_ (they are internal RAG fragments)
        // - Show everything else (PDFs, manual uploads, and Parent Documents 'knowledge_doc_')
        const files = (data.files || []).filter(f =>
            !f.filename.startsWith('faq_') &&
            !f.filename.startsWith('knowledge_chunk_')
        );

        renderKnowledgeFiles(files);
    } catch (error) {
        console.error('[Knowledge Files] Error loading files:', error);
        const container = document.getElementById('knowledge-files-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
                    <p class="text-sm">Error al cargar archivos</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }
}

function renderKnowledgeFiles(files) {
    const container = document.getElementById('knowledge-files-list');
    if (!container) return;

    if (!files || files.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 opacity-20"></i>
                <p class="text-sm">No hay archivos subidos</p>
                <p class="text-xs mt-1">Sube PDFs, DOCX o TXT para que Elina los consulte</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = files.map(file => {
        const statusConfig = {
            'pending': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'PENDIENTE' },
            'processing': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'PROCESANDO' },
            'ready': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'ACTIVO' },
            'error': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'ERROR' }
        };

        const status = statusConfig[file.status] || statusConfig['pending'];
        const fileSize = formatFileSize(file.file_size);
        const fileDate = formatRelativeDate(file.created_at);

        const displayFilename = file.filename
            .replace(/^knowledge_doc_\d+_/, '')
            .replace(/^knowledge_manual_\d+_/, '')
            .replace('.txt', '')
            .replace(/_/g, ' ');

        return `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all group">
                <div class="flex items-center gap-3 flex-1">
                    <div class="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center">
                        <i data-lucide="file-text" class="w-5 h-5 text-slate-400"></i>
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <p class="text-sm font-bold text-slate-700 truncate" title="${escapeHtml(file.filename)}">${escapeHtml(displayFilename)}</p>
                        <p class="text-[10px] text-slate-400">${fileDate} • ${fileSize}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="px-2 py-1 ${status.bg} ${status.text} rounded text-[10px] font-bold tracking-wider border ${status.border}">
                        ${status.label}
                    </div>
                    ${file.status === 'ready' ? `
                        <button onclick="viewKnowledgeFile('${file.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded transition-all" title="Ver contenido">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button onclick="editKnowledgeNote('${file.id}')" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="Editar contenido">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                    <button onclick="deleteKnowledgeFile('${file.id}', '${escapeHtml(file.filename)}')" class="p-2 text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100" title="Eliminar">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function uploadKnowledgeFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await uploadFile(file);
    };

    input.click();
}

async function uploadFile(file) {
    // Show loading state
    const container = document.getElementById('knowledge-files-list');
    if (container) {
        const loaderId = 'upload-progress-' + Date.now();
        container.insertAdjacentHTML('afterbegin', `
            <div id="${loaderId}" class="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                <i data-lucide="loader" class="w-5 h-5 text-blue-600 animate-spin"></i>
                <div class="flex-1">
                    <p class="text-sm font-bold text-blue-900">Subiendo ${escapeHtml(file.name)}...</p>
                    <p class="text-xs text-blue-700">Esto puede tardar unos segundos</p>
                </div>
            </div>
        `);
        if (window.lucide) lucide.createIcons();
    }

    try {
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await window.auth.invokeFunction('knowledge-files', {
            method: 'POST',
            body: formData
        });

        // Remove progress indicator (all of them just in case)
        const loaders = document.querySelectorAll('[id^="upload-progress-"]');
        loaders.forEach(l => l.remove());

        if (error) {
            // Check if upgrade is required
            if (error.details && error.details.upgrade_required) {
                showToast(error.message, 'error');
                // Show upgrade modal
                if (confirm(`${error.message}\n\n¿Quieres actualizar tu plan ahora?`)) {
                    window.location.href = '/pricing.html';
                }
            } else {
                throw new Error(error.message || 'Upload failed');
            }
            return;
        }

        // Show success message
        showToast('Archivo subido exitosamente. Procesando...', 'success');

        // Reload files list
        await loadKnowledgeFiles();

    } catch (error) {
        console.error('[Knowledge Files] Upload error:', error);
        const loaders = document.querySelectorAll('[id^="upload-progress-"]');
        loaders.forEach(l => l.remove());
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function createKnowledgeNote() {
    // Custom modal for note creation - Larger and strict closing
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4';
    // Increased max-w-4xl and fixed height
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col">
            <div class="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 class="text-xl font-bold text-slate-800">Crear Archivo de Texto</h3>
                <button id="close-note-btn-top" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            
            <div class="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">Título del Archivo</label>
                    <input type="text" id="note-title" class="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg px-4 py-3" placeholder="Ej: Política de Reembolsos 2024">
                </div>
                <div class="flex-1 flex flex-col">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Contenido</label>
                    <textarea id="note-content" class="w-full flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-4 resize-none font-mono text-sm leading-relaxed" placeholder="Escribe o pega aquí la información detallada que la IA debe aprender..."></textarea>
                </div>
            </div>

            <div class="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                <button id="cancel-note-btn" class="px-6 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all font-medium">Cancelar</button>
                <button id="save-note-btn" class="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                    <i data-lucide="save" class="w-4 h-4"></i> Guardar Archivo
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const close = () => modal.remove();

    // Close buttons
    document.getElementById('cancel-note-btn').onclick = close;
    document.getElementById('close-note-btn-top').onclick = close;

    // Save action
    document.getElementById('save-note-btn').onclick = async () => {
        const titleInput = document.getElementById('note-title');
        const contentInput = document.getElementById('note-content');
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title) {
            showToast('El título es obligatorio', 'error');
            titleInput.focus();
            return;
        }
        if (!content) {
            showToast('El contenido no puede estar vacío', 'error');
            contentInput.focus();
            return;
        }

        // Create a fake file object
        const safeTitle = title.replace(/[^a-z0-9áéíóúñ]/gi, '_').toLowerCase();
        const fileName = `${safeTitle}.txt`;
        const file = new File([content], fileName, { type: 'text/plain' });

        close();
        await uploadFile(file);
    };

    // Removed the "click outside to close" logic as requested
    // only explicit close buttons trigger the close action
}

async function viewKnowledgeFile(fileId) {
    try {
        const { data, error } = await window.auth.invokeFunction(`knowledge-files/${fileId}`, {
            method: 'GET'
        });

        if (error) throw new Error(error.message || 'Failed to load file');

        const { file } = data;

        // Show modal with extracted text
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div class="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">${escapeHtml(file.filename)}</h3>
                        <p class="text-sm text-slate-500">Contenido extraído</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-slate-100 rounded-lg transition-all">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1">
                    <pre class="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">${escapeHtml(file.extracted_text || 'No hay contenido extraído')}</pre>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

    } catch (error) {
        console.error('[Knowledge Files] View error:', error);
        showToast('Error al cargar el archivo', 'error');
    }
}

async function editKnowledgeNote(fileId) {
    try {
        // Fetch current content
        const { data, error } = await window.auth.invokeFunction(`knowledge-files/${fileId}`, {
            method: 'GET'
        });

        if (error) throw new Error(error.message || 'Failed to load file');
        const { file } = data;

        // Reuse the create modal structure but pre-fill data
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col">
                <div class="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">Editar Archivo</h3>
                        <p class="text-sm text-slate-500">Editando: ${escapeHtml(file.filename)}</p>
                    </div>
                     <button id="close-edit-btn-top" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                
                <div class="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                        <div class="flex gap-3">
                            <i data-lucide="info" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"></i>
                            <div>
                                <h4 class="font-bold text-blue-900 text-sm">Información Importante</h4>
                                <p class="text-sm text-blue-800 mt-1">Al guardar, el archivo se re-procesará automáticamente para actualizar la "memoria" de la IA. El contenido original será reemplazado.</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 flex flex-col">
                        <label class="block text-sm font-bold text-slate-700 mb-2">Contenido</label>
                        <textarea id="edit-content" class="w-full flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-4 resize-none font-mono text-sm leading-relaxed" placeholder="Escribe aquí...">${escapeHtml(file.extracted_text || '')}</textarea>
                    </div>
                </div>

                <div class="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button id="cancel-edit-btn" class="px-6 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all font-medium">Cancelar</button>
                    <button id="save-edit-btn" class="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                        <i data-lucide="save" class="w-4 h-4"></i> Guardar Cambios
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();

        const close = () => modal.remove();
        document.getElementById('cancel-edit-btn').onclick = close;
        document.getElementById('close-edit-btn-top').onclick = close;

        document.getElementById('save-edit-btn').onclick = async () => {
            const contentInput = document.getElementById('edit-content');
            const content = contentInput.value.trim();

            if (!content) {
                showToast('El contenido no puede estar vacío', 'error');
                return;
            }

            const btn = document.getElementById('save-edit-btn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Guardando...`;
            if (window.lucide) lucide.createIcons();

            try {
                const { error: updateError } = await window.auth.invokeFunction(`knowledge-files/${fileId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ content })
                });

                if (updateError) throw new Error(updateError.message || 'Failed to update file');

                showToast('Archivo actualizado y re-procesando...', 'success');
                close();
                await loadKnowledgeFiles();

            } catch (err) {
                console.error('Update error:', err);
                showToast(`Error: ${err.message}`, 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };

    } catch (error) {
        console.error('[Knowledge Files] Edit error:', error);
        showToast('Error al cargar archivo para editar', 'error');
    }
}

async function deleteKnowledgeFile(fileId, filename) {
    // Custom modal for confirmation
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden transform transition-all scale-100">
            <div class="p-6 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="alert-triangle" class="w-8 h-8 text-red-600"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">¿Eliminar archivo?</h3>
                <p class="text-sm text-slate-600">
                    Estás a punto de eliminar <span class="font-bold text-slate-800">"${escapeHtml(filename)}"</span>. 
                    <br>Esta acción eliminará también la "memoria" asociada y no se puede deshacer.
                </p>
            </div>
            <div class="p-6 border-t border-slate-200 flex gap-3 bg-slate-50">
                <button id="cancel-delete-btn" class="flex-1 px-4 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all font-medium">
                    Cancelar
                </button>
                <button id="confirm-delete-btn" class="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const close = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 200);
    };

    document.getElementById('cancel-delete-btn').onclick = close;

    document.getElementById('confirm-delete-btn').onclick = async () => {
        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Eliminando...`;

        try {
            const { error } = await window.auth.invokeFunction(`knowledge-files/${fileId}`, {
                method: 'DELETE'
            });

            if (error) throw new Error(error.message || 'Failed to delete file');

            showToast('Archivo eliminado exitosamente', 'success');
            close();
            await loadKnowledgeFiles();

        } catch (error) {
            console.error('[Knowledge Files] Delete error:', error);
            showToast('Error al eliminar el archivo', 'error');
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar`;
        }
    };

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
}

// Helper functions (checking validity before format)
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
}

// Ensure showToast is available or redefine it safely
if (typeof window.showToast !== 'function') {
    window.showToast = function (message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}

// Expose functions to window
// ==========================================
// CREATE KNOWLEDGE MODAL (Unified)
// ==========================================

window.openPasteKnowledgeModal = function () {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in';
    modal.style.backdropFilter = 'blur(4px)';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden transform transition-all scale-100">
            <div class="p-5 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                <div>
                    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <div class="p-2 bg-pink-100 rounded-lg">
                            <i data-lucide="library" class="w-5 h-5 text-pink-600"></i>
                        </div>
                        Nuevo Conocimiento
                    </h3>
                    <p class="text-sm text-slate-500 mt-1 ml-11">Agrega información para que tu IA la aprenda.</p>
                </div>
                <button id="close-paste-modal" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            
            <div class="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
                <!-- Input Column -->
                <div class="flex-1 p-6 flex flex-col border-r border-slate-200/60 bg-white relative">
                    <div class="flex justify-between items-center mb-3">
                         <label class="block text-sm font-bold text-slate-700">Contenido Original</label>
                         <div class="flex gap-2">
                            <input type="file" id="import-file-input" class="hidden" accept=".txt,.md,.json,.csv">
                            <button onclick="document.getElementById('import-file-input').click()" class="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 transition-all flex items-center gap-2">
                                <i data-lucide="file-up" class="w-3 h-3"></i> Importar archivo local
                            </button>
                         </div>
                    </div>
                    
                    <textarea id="raw-knowledge-input" class="flex-1 w-full border-slate-200 bg-slate-50/30 rounded-xl p-4 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none transition-all placeholder:text-slate-300 leading-relaxed font-mono" placeholder="Pega aquí tu texto, manual o información..."></textarea>
                    
                    <!-- Actions Bar -->
                    <div class="mt-4 flex flex-col gap-3">
                        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <div class="flex items-center gap-3">
                                <div class="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <i data-lucide="save" class="w-4 h-4 text-slate-500"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold text-slate-700">Guardado Rápido</span>
                                    <span class="text-[10px] text-slate-400">Guarda el texto tal cual está</span>
                                </div>
                             </div>
                             <button id="direct-save-btn" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm text-xs transition-all">
                                Guardar sin cambios
                             </button>
                        </div>

                        <div class="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 relative overflow-hidden group">
                             <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <div class="flex items-center gap-3 relative z-10">
                                <div class="p-2 bg-white rounded-lg border border-indigo-200 shadow-sm">
                                    <i data-lucide="sparkles" class="w-4 h-4 text-indigo-600"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold text-indigo-900">Optimizar con IA</span>
                                    <span class="text-[10px] text-indigo-600/70">Estructura y limpia el contenido</span>
                                </div>
                             </div>
                             <button id="normalize-btn" class="relative z-10 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 text-xs">
                                <i data-lucide="wand-2" class="w-3.5 h-3.5"></i> Estructurar
                             </button>
                        </div>
                    </div>
                </div>

                <!-- Output Column -->
                <div class="flex-1 p-6 flex flex-col bg-slate-50/50 transition-all duration-500" id="output-column">
                    <label class="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                        <span>Vista Previa (Optimizado)</span>
                        <span id="chunks-count-badge" class="hidden bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">0 Secciones</span>
                    </label>
                    <div id="normalized-preview" class="flex-1 w-full border border-slate-200 rounded-xl p-0 text-sm bg-white overflow-hidden flex flex-col relative shadow-sm">
                        <!-- Empty State -->
                        <div id="preview-empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
                            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                <i data-lucide="layout-template" class="w-8 h-8 text-slate-200"></i>
                            </div>
                            <h4 class="font-bold text-slate-400 mb-1 text-xs uppercase tracking-wider">Esperando Análisis</h4>
                            <p class="text-[10px] text-slate-400 max-w-[180px]">Usa "Estructurar con IA" para previsualizar el resultado organizado.</p>
                        </div>
                        
                        <!-- Content Area -->
                        <div id="preview-content" class="hidden w-full h-full overflow-y-auto p-5 space-y-4 font-mono text-slate-600 text-xs leading-relaxed bg-white"></div>
                    </div>
                    <div class="mt-4 flex justify-end">
                        <button id="save-normalized-btn" class="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all opacity-50 cursor-not-allowed transform hover:-translate-y-0.5 hover:shadow-emerald-300" disabled>
                            <i data-lucide="check-circle-2" class="w-4 h-4"></i> Confirmar y Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const close = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    };
    document.getElementById('close-paste-modal').onclick = close;

    // Close on escape
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
    }, { once: true });

    const rawInput = document.getElementById('raw-knowledge-input');
    const importInput = document.getElementById('import-file-input');
    const previewContent = document.getElementById('preview-content');
    const previewEmpty = document.getElementById('preview-empty-state');
    const normalizeBtn = document.getElementById('normalize-btn');
    const directSaveBtn = document.getElementById('direct-save-btn');
    const saveBtn = document.getElementById('save-normalized-btn');
    const countBadge = document.getElementById('chunks-count-badge');

    let normalizedContent = '';

    // File Import Logic
    importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            rawInput.value = e.target.result;
            showToast('Archivo cargado correctamente', 'success');
        };
        reader.readAsText(file);
    };

    // Direct Save Action
    directSaveBtn.onclick = async () => {
        const text = rawInput.value.trim();
        if (!text) {
            showToast('El campo de texto está vacío', 'error');
            return;
        }

        const originalText = directSaveBtn.innerHTML;
        directSaveBtn.disabled = true;
        directSaveBtn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Guardando...`;
        if (window.lucide) lucide.createIcons();

        try {
            await saveSingleKnowledge(text);
            close();
            await window.loadKnowledgeFiles();
            showToast('Conocimiento guardado correctamente', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error: ' + err.message, 'error');
            directSaveBtn.disabled = false;
            directSaveBtn.innerHTML = originalText;
        }
    };

    // Normalize Action
    normalizeBtn.onclick = async () => {
        const text = rawInput.value.trim();
        if (!text || text.length < 10) {
            showToast('Por favor escribe más texto para analizar.', 'error');
            return;
        }

        const originalBtnText = normalizeBtn.innerHTML;
        normalizeBtn.disabled = true;
        normalizeBtn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Analizando...`;
        if (window.lucide) lucide.createIcons();

        try {
            const { data: { session } } = await window.auth.sb.auth.getSession();
            const sbUrl = window.auth.sb.supabaseUrl;

            const response = await fetch(`${sbUrl}/functions/v1/normalize-knowledge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
                },
                body: JSON.stringify({ rawText: text })
            });

            if (!response.ok) throw new Error(await response.text());

            const data = await response.json();
            normalizedContent = data.normalizedText;

            // Show Preview
            previewEmpty.classList.add('hidden');
            previewContent.classList.remove('hidden');

            // Render markdown nicely
            const htmlContent = normalizedContent
                .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-2">$1</h1>')
                .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-indigo-700 mt-4 mb-2">$1</h2>')
                .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-slate-700 mt-2 mb-1">$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                .replace(/\n/gim, '<br>');

            previewContent.innerHTML = htmlContent;

            // Count chunks estimate
            const chunks = normalizedContent.split(/^#/gm).length - 1;
            countBadge.textContent = `${Math.max(1, chunks)} Secciones detectadas`;
            countBadge.classList.remove('hidden');

            // Enable Save
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            saveBtn.classList.add('animate-pulse'); // Attention grabber
            setTimeout(() => saveBtn.classList.remove('animate-pulse'), 1000);

        } catch (err) {
            console.error(err);
            showToast('Error al normalizar: ' + err.message, 'error');
        } finally {
            normalizeBtn.disabled = false;
            normalizeBtn.innerHTML = originalBtnText;
            if (window.lucide) lucide.createIcons();
        }
    };

    // Save Normalized Action
    saveBtn.onclick = async () => {
        if (!normalizedContent) return;

        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Guardando secciones...`;
        if (window.lucide) lucide.createIcons();

        try {
            await saveNormalizedChunks(normalizedContent);
            close();
            await window.loadKnowledgeFiles();

            showToast('Conocimiento estructurado guardado correctamente', 'success');

        } catch (err) {
            console.error(err);
            showToast('Error al guardar: ' + err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
            if (window.lucide) lucide.createIcons();
        }
    };
};

async function saveSingleKnowledge(content) {
    const { data: { session } } = await window.auth.sb.auth.getSession();
    const sbUrl = window.auth.sb.supabaseUrl;

    // Use Title from first line or generic
    const title = content.split('\n')[0].substring(0, 50).replace(/[^a-zA-Z0-9 ]/g, '') || 'Nota Rápida';

    await fetch(`${sbUrl}/functions/v1/generate-faqs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
        },
        body: JSON.stringify({
            manual: true,
            type: 'knowledge',
            question: `KB: ${title}`,
            answer: content
        })
    });
}

async function saveNormalizedChunks(markdownText) {
    // 1. Split into logical sections based on headers
    const lines = markdownText.split('\n');
    let chunks = [];
    let currentChunk = { title: 'General', content: [] };

    lines.forEach(line => {
        if (line.match(/^#{1,3}\s/)) {
            if (currentChunk.content.length > 0) {
                chunks.push({
                    title: currentChunk.title.replace(/[*#]/g, '').trim(),
                    content: currentChunk.content.join('\n').trim()
                });
            }
            currentChunk = {
                title: line.replace(/^#+\s/, '').trim(),
                content: [line]
            };
        } else {
            currentChunk.content.push(line);
        }
    });

    if (currentChunk.content.length > 0) {
        chunks.push({
            title: currentChunk.title.replace(/[*#]/g, '').trim(),
            content: currentChunk.content.join('\n').trim()
        });
    }

    chunks = chunks.filter(c => c.content.length > 10);
    if (chunks.length === 0) {
        chunks.push({ title: 'Info General', content: markdownText });
    }

    const { data: { session } } = await window.auth.sb.auth.getSession();
    const sbUrl = window.auth.sb.supabaseUrl;

    // A. SAVE PARENT (Display Only)
    const docTitle = chunks[0].title.substring(0, 40) || 'Nuevo Documento';
    console.log(`[RAG] Saving Parent Doc: ${docTitle}`);

    await fetch(`${sbUrl}/functions/v1/generate-faqs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
        },
        body: JSON.stringify({
            manual: true,
            type: 'doc',
            question: docTitle,
            answer: markdownText // Full content
        })
    });

    // B. SAVE CHUNKS (Hidden for RAG) - OPTIMIZED BATCH
    console.log(`[RAG] Saving ${chunks.length} hidden chunks via Batch...`);

    // Format chunks as text blocks
    const formattedChunks = chunks.map((chunk, i) => {
        return `Title: ${docTitle} (Sección ${i + 1}): ${chunk.title}\nContent: ${chunk.content}`;
    });

    await fetch(`${sbUrl}/functions/v1/generate-faqs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
        },
        body: JSON.stringify({
            manual: true,
            type: 'batch_chunks',
            docTitle: docTitle,
            chunks: formattedChunks
        })
    });
}

// Expose functions to window
window.loadKnowledgeFiles = loadKnowledgeFiles;
window.uploadKnowledgeFile = uploadKnowledgeFile;
window.createKnowledgeNote = createKnowledgeNote;
window.viewKnowledgeFile = viewKnowledgeFile;
window.editKnowledgeNote = editKnowledgeNote;
window.deleteKnowledgeFile = deleteKnowledgeFile;
