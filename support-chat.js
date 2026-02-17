// support-chat.js - Widget de Soporte Interno

export async function initSupportChat() {
    const chatWidget = document.getElementById('support-chat-widget');
    const openBtn = document.getElementById('support-open-btn') || document.getElementById('support-open-btn-sidebar'); // El botón en el sidebar o flotante
    const closeBtn = document.getElementById('support-close-btn');
    const sendBtn = document.getElementById('support-send-btn');
    const inputField = document.getElementById('support-input');
    const messagesContainer = document.getElementById('support-messages-container');

    let currentConversationId = null;
    let realtimeChannel = null;

    // 1. Event Listeners de UI
    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatWidget.classList.remove('hidden');
            loadConversation();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            chatWidget.classList.add('hidden');
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => sendMessage());
    }

    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // 2. Cargar o Crear Conversación Activa
    async function loadConversation() {
        if (!window.auth?.session?.user) return;

        try {
            // Buscar conversación activa
            const { data: conversations, error } = await window.auth.sb
                .from('support_conversations')
                .select('id, status')
                .eq('user_id', window.auth.session.user.id)
                .eq('status', 'active')
                .single();

            if (conversations) {
                currentConversationId = conversations.id;
            } else {
                // Si no hay activa, crear una nueva
                const { data: newConv, error: createError } = await window.auth.sb
                    .from('support_conversations')
                    .insert([{ user_id: window.auth.session.user.id, status: 'active' }])
                    .select()
                    .single();

                if (newConv) currentConversationId = newConv.id;
            }

            if (currentConversationId) {
                await loadMessages(currentConversationId);
                subscribeToMessages(currentConversationId);
            }

        } catch (err) {
            console.error('Error loading support conversation:', err);
        }
    }

    // 3. Cargar Mensajes Históricos
    async function loadMessages(conversationId) {
        messagesContainer.innerHTML = ''; // Limpiar

        const { data: messages, error } = await window.auth.sb
            .from('support_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (messages) {
            messages.forEach(renderMessage);
            scrollToBottom();
        }
    }

    // 4. Suscribirse a Realtime
    function subscribeToMessages(conversationId) {
        if (realtimeChannel) window.auth.sb.removeChannel(realtimeChannel);

        realtimeChannel = window.auth.sb
            .channel(`support:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    renderMessage(payload.new);
                    scrollToBottom();
                    // Sonido de notificación si es mensaje entrante (soporte o AI)
                    if (payload.new.sender !== 'user') {
                        // playNotificationSound(); // Opcional
                    }
                }
            )
            .subscribe();
    }

    // 5. Enviar Mensaje
    async function sendMessage() {
        const text = inputField.value.trim();
        if (!text || !currentConversationId) return;

        inputField.value = ''; // Limpiar inmediato para UX

        // Optimist render (opcional, pero Realtime lo hará rápido)
        // renderMessage({ sender: 'user', content: text, created_at: new Date() });

        const { error } = await window.auth.sb
            .from('support_messages')
            .insert([{
                conversation_id: currentConversationId,
                sender: 'user',
                content: text
            }]);

        if (error) {
            console.error('Error sending message:', error);
            window.showToast('Error al enviar mensaje', 'error');
        } else {
            // Trigger n8n webhook for logic (Optional: Supabase Webhooks are better if configured)
            // But if we want direct trigger from client to ensure speed:
            triggerN8NFlow(currentConversationId, text);
        }
    }

    // 6. Renderizado
    function renderMessage(msg) {
        // Evitar duplicados si ya existen (por optimist UI o reload)
        // Simple check por contenido+timestamp si no tenemos ID handy en DOM

        const isMe = msg.sender === 'user';
        const div = document.createElement('div');
        div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 animate-in fade-in slide-in-from-bottom-2`;

        const bubble = document.createElement('div');
        bubble.className = `max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${isMe
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
            }`;

        // Soporte para Markdown básico o saltos de línea
        bubble.innerHTML = msg.content.replace(/\n/g, '<br>');

        if (!isMe) {
            // Avatar o indicador de agente
            const senderName = msg.sender === 'ai' ? 'Elina AI' : 'Soporte Humano';
            const label = document.createElement('div');
            label.className = 'text-[10px] text-slate-400 mb-1 ml-1';
            label.textContent = senderName;
            div.appendChild(bubble); // Bubble primero, luego label wrapper si quisieramos
            // Actually let's put label INSIDE bubble or ABOVE
            // Re-structure:
            div.innerHTML = `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    <span class="text-[10px] text-slate-400 mb-1 px-1">${isMe ? 'Tú' : senderName}</span>
                    <div class="${bubble.className}">
                        ${msg.content.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        } else {
            div.appendChild(bubble);
        }

        messagesContainer.appendChild(div);
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function triggerN8NFlow(convId, text) {
        // Llamada fire-and-forget al webhook de n8n para procesar la respuesta
        // URL del webhook de tu n8n para soporte
        const n8nUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/funnel-chat-support';

        try {
            await fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: convId,
                    user_id: window.auth?.session?.user?.id,
                    message: text,
                    page_context: window.location.hash || 'dashboard'
                })
            });
        } catch (e) {
            console.warn('Failed to trigger n8n hook', e);
        }
    }
}
