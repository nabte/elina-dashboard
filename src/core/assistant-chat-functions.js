
// ============================================
// ASSISTANT CHAT (IN-APP HELP & BUSINESS)
// ============================================

let assistantChatHistory = [];

async function loadAssistantHistory() {
    // In a real implementation, we would fetch from 'assistant_chat_history' table
    // For now, we start empty or from sessionStorage
    const saved = sessionStorage.getItem('assistant_chat_history');
    if (saved) {
        assistantChatHistory = JSON.parse(saved);
        renderAssistantChatHistory();
    }
}

function renderAssistantChatUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-0.5 shadow-sm">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Elina" alt="Elina" class="w-full h-full rounded-full bg-white">
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800">Chat con Elina</h3>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p class="text-xs text-slate-500">Responde sobre App y Negocio</p>
                        </div>
                    </div>
                </div>
                <button onclick="clearAssistantChat()" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Borrar historial">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>

            <div id="assistant-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
                <!-- Welcome Message -->
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
                    </div>
                    <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 max-w-[85%]">
                        <p class="text-sm text-slate-700">¡Hola! Soy Elina. Puedo ayudarte con:</p>
                        <ul class="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                            <li>Dudas sobre <b>cómo usar la plataforma</b>.</li>
                            <li>Preguntas sobre <b>tu negocio</b> (basado en tus documentos).</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-slate-100">
                <form onsubmit="handleAssistantSubmit(event)" class="relative">
                    <input type="text" id="assistant-chat-input" 
                        class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder="Escribe tu pregunta aquí..."
                        autocomplete="off">
                    <button type="submit" class="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </form>
                <div class="flex items-center justify-center gap-2 mt-2">
                    <span class="text-[10px] text-slate-400 flex items-center gap-1">
                        <i data-lucide="lock" class="w-3 h-3"></i> Privado y seguro
                    </span>
                    <span class="text-slate-300">•</span>
                    <span class="text-[10px] text-slate-400">Contexto híbrido activo</span>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
    loadAssistantHistory();
}

function renderAssistantChatHistory() {
    const container = document.getElementById('assistant-chat-messages');
    if (!container) return;

    // Clear except welcome message (first child)
    // Actually simpler to just clear and re-add welcome if empty, or append new ones
    // For now, let's just append saved messages

    assistantChatHistory.forEach(msg => {
        addMessageToAssistantUI(msg.role, msg.content, msg.sources, false);
    });

    container.scrollTop = container.scrollHeight;
}

function addMessageToAssistantUI(role, content, sources = null, save = true) {
    const container = document.getElementById('assistant-chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `flex items-start gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`; // User right, AI left

    if (role === 'assistant') {
        const sourcesHtml = sources && sources.length > 0
            ? `<div class="mt-2 pt-2 border-t border-slate-100">
                 <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Fuentes:</p>
                 <div class="flex flex-wrap gap-1">
                    ${sources.map(s => `<span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] border border-indigo-100 flex items-center gap-1"><i data-lucide="file-text" class="w-3 h-3"></i> ${s}</span>`).join('')}
                 </div>
               </div>`
            : '';

        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Elina" alt="Elina" class="w-full h-full rounded-full bg-white p-0.5">
            </div>
            <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 max-w-[85%] text-sm text-slate-700 leading-relaxed">
                ${formatMarkdown(content)}
                ${sourcesHtml}
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1 text-indigo-600 font-bold border border-indigo-200">
                TÚ
            </div>
            <div class="bg-indigo-600 p-3 rounded-2xl rounded-tr-sm shadow-md text-white max-w-[85%] text-sm leading-relaxed">
                ${formatMarkdown(content)}
            </div>
        `;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) lucide.createIcons();

    if (save) {
        assistantChatHistory.push({ role, content, sources });
        sessionStorage.setItem('assistant_chat_history', JSON.stringify(assistantChatHistory));
    }
}

async function handleAssistantSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('assistant-chat-input');
    const query = input.value.trim();
    if (!query) return;

    input.value = '';

    // Add user message
    addMessageToAssistantUI('user', query);

    // Show typing indicator
    const container = document.getElementById('assistant-chat-messages');
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = typingId;
    typingDiv.className = 'flex items-start gap-3';
    typingDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Elina" alt="Elina" class="w-full h-full rounded-full bg-white p-0.5">
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
            <div class="flex gap-1">
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
            </div>
        </div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;

    try {
        const response = await fetch('https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/assistant-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
            },
            body: JSON.stringify({
                query: query,
                history: assistantChatHistory.slice(-5) // Send last 5 messages for context
            })
        });

        document.getElementById(typingId)?.remove();

        if (!response.ok) throw new Error('Error en Assistant Chat');

        const data = await response.json();
        addMessageToAssistantUI('assistant', data.answer, data.sources);

    } catch (error) {
        console.error('[Assistant Chat] Error:', error);
        document.getElementById(typingId)?.remove();
        addMessageToAssistantUI('assistant', '⚠️ Lo siento, tuve un problema al procesar tu pregunta. Por favor intenta de nuevo.');
    }
}

function clearAssistantChat() {
    if (!confirm('¿Borrar historial del chat?')) return;
    assistantChatHistory = [];
    sessionStorage.removeItem('assistant_chat_history');
    const container = document.getElementById('assistant-chat-messages');
    // Keep only first child (welcome)
    const welcome = container.firstElementChild;
    container.innerHTML = '';
    if (welcome) container.appendChild(welcome);
}

function formatMarkdown(text) {
    if (!text) return '';
    // Basic markdown formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-pink-500 font-mono text-xs">$1</code>')
        .replace(/\n/g, '<br>');
}

// Global exposure
window.renderAssistantChatUI = renderAssistantChatUI;
window.handleAssistantSubmit = handleAssistantSubmit;
window.clearAssistantChat = clearAssistantChat;
