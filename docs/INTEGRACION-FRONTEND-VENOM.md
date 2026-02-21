# Integración Frontend - Venom WhatsApp

## Estado Actual
- ✅ Servicio Venom corriendo: https://evolutionapi-venom-whatsapp-service.mcjhhb.easypanel.host
- ✅ Migración SQL aplicada
- ✅ Edge Function deployada
- ✅ Secrets configurados
- ✅ Componente `whatsapp-venom.js` creado

## Pendiente: Integrar en el Frontend

---

## 1️⃣ Integrar en Settings (Vista de Usuario)

### Paso 1: Agregar contenedor HTML

Abre `dist/dashboard.html` y busca la sección de settings (o donde se renderizan los paneles).

Agrega este contenedor donde quieras que aparezca la sección de WhatsApp Venom:

```html
<!-- WhatsApp Venom Section -->
<div id="venom-container" class="mb-6"></div>
```

**Ubicación sugerida:** Después de las otras secciones de settings, junto a Evolution API o configuración de WhatsApp.

---

### Paso 2: Cargar el script

Al final del `<body>`, antes del cierre `</body>`, agrega:

```html
<!-- WhatsApp Venom Manager -->
<script src="/src/settings/whatsapp-venom.js"></script>
```

---

### Paso 3: Inicializar el componente

En el mismo lugar (o en `src/settings/settings.js`), agrega la inicialización:

```html
<script>
// Esperar a que el usuario esté autenticado
document.addEventListener('auth:ready', ({ detail }) => {
    if (detail.session && detail.session.user) {
        // Inicializar Venom Manager
        if (typeof WhatsAppVenomManager !== 'undefined') {
            window.venomManager = new WhatsAppVenomManager('venom-container');
            window.venomManager.init(detail.session.user);
        }
    }
});

// Cleanup al cambiar de panel
document.addEventListener('panel:deactivated', (e) => {
    if (e.detail?.panelId === 'settings' && window.venomManager) {
        window.venomManager.destroy();
    }
});
</script>
```

**Alternativa:** Si prefieres agregarlo directamente en `src/settings/settings.js`:

```javascript
// Al final de src/settings/settings.js, dentro del DOMContentLoaded:

document.addEventListener('auth:ready', ({ detail }) => {
    if (detail.session && detail.session.user) {
        if (typeof WhatsAppVenomManager !== 'undefined') {
            window.venomManager = new WhatsAppVenomManager('venom-container');
            window.venomManager.init(detail.session.user);
        }
    }
});
```

---

## 2️⃣ Integrar en SuperAdmin (Vista de SuperAdmin)

### Paso 1: Agregar tab en SuperAdmin

Abre `superadmin.html` y busca la sección de navegación (tabs). Agrega:

```html
<button
    class="nav-tab px-4 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
    data-target="venom-instances-section">
    <i data-lucide="smartphone" class="inline w-4 h-4 mr-2"></i>
    Instancias Venom
</button>
```

---

### Paso 2: Agregar sección de contenido

En `superadmin.html`, dentro del `<main>`, agrega esta sección:

```html
<!-- Sección: Instancias Venom -->
<section id="venom-instances-section" class="panel-section hidden">
    <div class="mb-6">
        <h2 class="text-2xl font-bold text-white mb-2">Instancias WhatsApp Venom</h2>
        <p class="text-slate-400 text-sm">Gestión de todas las instancias Venom del sistema</p>
    </div>

    <!-- Filtros -->
    <div class="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <div class="flex gap-4">
            <input type="text" id="venom-search" placeholder="Buscar por usuario, email o session_id..."
                class="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500">

            <select id="venom-status-filter"
                class="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">Todos los estados</option>
                <option value="connected">Conectado</option>
                <option value="disconnected">Desconectado</option>
                <option value="qr_ready">QR Listo</option>
                <option value="connecting">Conectando</option>
                <option value="error">Error</option>
            </select>

            <button onclick="loadVenomInstances()"
                class="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg transition-colors">
                <i data-lucide="refresh-cw" class="inline w-4 h-4 mr-2"></i>
                Refrescar
            </button>
        </div>
    </div>

    <!-- Estadísticas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-sm">Total Instancias</p>
                    <p id="venom-stat-total" class="text-2xl font-bold text-white">0</p>
                </div>
                <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                    <i data-lucide="smartphone" class="w-6 h-6 text-slate-400"></i>
                </div>
            </div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-green-500/30">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-sm">Conectadas</p>
                    <p id="venom-stat-connected" class="text-2xl font-bold text-green-400">0</p>
                </div>
                <div class="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <i data-lucide="check-circle" class="w-6 h-6 text-green-400"></i>
                </div>
            </div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-sm">Desconectadas</p>
                    <p id="venom-stat-disconnected" class="text-2xl font-bold text-slate-400">0</p>
                </div>
                <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                    <i data-lucide="x-circle" class="w-6 h-6 text-slate-400"></i>
                </div>
            </div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-red-500/30">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-sm">Con Error</p>
                    <p id="venom-stat-error" class="text-2xl font-bold text-red-400">0</p>
                </div>
                <div class="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <i data-lucide="alert-triangle" class="w-6 h-6 text-red-400"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Tabla de instancias -->
    <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-slate-900">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Usuario</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Session ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Teléfono</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Última Conexión</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody id="venom-instances-tbody" class="divide-y divide-slate-700">
                    <!-- Las filas se cargan dinámicamente -->
                </tbody>
            </table>
        </div>
    </div>

    <!-- Empty state -->
    <div id="venom-empty-state" class="hidden text-center py-12">
        <i data-lucide="smartphone" class="w-16 h-16 text-slate-600 mx-auto mb-4"></i>
        <p class="text-slate-400 text-lg">No hay instancias Venom registradas</p>
    </div>
</section>
```

---

### Paso 3: Agregar funciones JavaScript en SuperAdmin

Abre `src/core/superadmin.js` y agrega estas funciones al final:

```javascript
// =========================================
// VENOM INSTANCES MANAGEMENT
// =========================================

async function loadVenomInstances() {
    try {
        const search = document.getElementById('venom-search')?.value || '';
        const statusFilter = document.getElementById('venom-status-filter')?.value || '';

        // Consultar instancias desde Supabase
        let query = window.auth.sb
            .from('venom_instances')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    email,
                    plan_id
                )
            `)
            .order('created_at', { ascending: false });

        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        const { data: instances, error } = await query;

        if (error) throw error;

        // Filtrar por búsqueda
        let filtered = instances || [];
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(inst =>
                inst.profiles?.email?.toLowerCase().includes(searchLower) ||
                inst.profiles?.full_name?.toLowerCase().includes(searchLower) ||
                inst.session_id?.toLowerCase().includes(searchLower) ||
                inst.phone_number?.toLowerCase().includes(searchLower)
            );
        }

        // Actualizar estadísticas
        const stats = {
            total: filtered.length,
            connected: filtered.filter(i => i.status === 'connected').length,
            disconnected: filtered.filter(i => i.status === 'disconnected').length,
            error: filtered.filter(i => i.status === 'error').length
        };

        document.getElementById('venom-stat-total').textContent = stats.total;
        document.getElementById('venom-stat-connected').textContent = stats.connected;
        document.getElementById('venom-stat-disconnected').textContent = stats.disconnected;
        document.getElementById('venom-stat-error').textContent = stats.error;

        // Renderizar tabla
        const tbody = document.getElementById('venom-instances-tbody');
        const emptyState = document.getElementById('venom-empty-state');

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState?.classList.remove('hidden');
        } else {
            emptyState?.classList.add('hidden');
            tbody.innerHTML = filtered.map(instance => {
                const statusColors = {
                    'connected': 'bg-green-500/20 text-green-400 border-green-500/30',
                    'disconnected': 'bg-slate-600/20 text-slate-400 border-slate-600/30',
                    'qr_ready': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                    'connecting': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                    'error': 'bg-red-500/20 text-red-400 border-red-500/30'
                };

                const statusClass = statusColors[instance.status] || statusColors.disconnected;

                return `
                    <tr class="hover:bg-slate-700/50">
                        <td class="px-6 py-4">
                            <div>
                                <p class="text-sm font-medium text-white">${instance.profiles?.full_name || 'N/A'}</p>
                                <p class="text-xs text-slate-400">${instance.profiles?.email || 'N/A'}</p>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <code class="text-xs bg-slate-900 px-2 py-1 rounded text-cyan-400">${instance.session_id}</code>
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-300">
                            ${instance.phone_number || '-'}
                        </td>
                        <td class="px-6 py-4">
                            <span class="px-3 py-1 text-xs font-medium rounded-full border ${statusClass}">
                                ${instance.status.toUpperCase()}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-400">
                            ${instance.last_connected_at ? new Date(instance.last_connected_at).toLocaleString('es-ES') : 'Nunca'}
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex gap-2">
                                ${instance.status === 'qr_ready' || instance.status === 'connecting' ? `
                                    <button onclick="viewVenomQR('${instance.session_id}')"
                                        class="text-cyan-400 hover:text-cyan-300"
                                        title="Ver QR">
                                        <i data-lucide="qr-code" class="w-4 h-4"></i>
                                    </button>
                                ` : ''}
                                <button onclick="deleteVenomInstance('${instance.id}', '${instance.session_id}')"
                                    class="text-red-400 hover:text-red-300"
                                    title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Reinicializar iconos Lucide
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

    } catch (error) {
        console.error('[SuperAdmin] Error loading Venom instances:', error);
        window.showToast('Error al cargar instancias Venom', 'error');
    }
}

async function viewVenomQR(sessionId) {
    try {
        const apiKey = 'TU_API_KEY_AQUI'; // Usar la misma que configuraste en EasyPanel
        const response = await fetch(`https://evolutionapi-venom-whatsapp-service.mcjhhb.easypanel.host/sessions/${sessionId}/qr`, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener QR');
        }

        const { base64 } = await response.json();

        // Mostrar modal con QR
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-slate-800 rounded-xl p-6 max-w-md">
                <h3 class="text-xl font-bold text-white mb-4">Código QR - ${sessionId}</h3>
                <div class="bg-white p-4 rounded-lg mb-4">
                    <img src="data:image/png;base64,${base64}" class="w-full" alt="QR Code">
                </div>
                <button onclick="this.closest('.fixed').remove()"
                    class="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">
                    Cerrar
                </button>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (error) {
        console.error('[SuperAdmin] Error viewing QR:', error);
        window.showToast('Error al obtener código QR', 'error');
    }
}

async function deleteVenomInstance(instanceId, sessionId) {
    if (!confirm(`¿Eliminar instancia ${sessionId}?`)) return;

    try {
        const { error } = await window.auth.sb
            .from('venom_instances')
            .delete()
            .eq('id', instanceId);

        if (error) throw error;

        window.showToast('Instancia eliminada correctamente', 'success');
        loadVenomInstances();

    } catch (error) {
        console.error('[SuperAdmin] Error deleting instance:', error);
        window.showToast('Error al eliminar instancia', 'error');
    }
}

// Event listeners para filtros
document.getElementById('venom-search')?.addEventListener('input', debounce(loadVenomInstances, 500));
document.getElementById('venom-status-filter')?.addEventListener('change', loadVenomInstances);
```

---

### Paso 4: Registrar evento de carga

En `src/core/superadmin.js`, busca donde se manejan los eventos de cambio de tabs y agrega:

```javascript
} else if (targetId === 'venom-instances-section') {
    loadVenomInstances();
}
```

---

## 3️⃣ Test Final

Una vez integrado todo:

1. **Login como usuario Business/Enterprise**
2. Ir a **Settings**
3. Scroll hasta la sección **"WhatsApp Venom"**
4. Click **"Conectar WhatsApp"**
5. Escanear QR con WhatsApp móvil
6. Verificar que cambia a **"Conectado"**

7. **Login como SuperAdmin**
8. Ir al tab **"Instancias Venom"**
9. Verificar que aparece la instancia creada
10. Probar ver QR y eliminar instancia

---

## 4️⃣ Troubleshooting

### Error: "Perfil no encontrado"
- Verificar que el usuario está autenticado
- Verificar que `auth.uid()` retorna un UUID válido

### Error: "Edge Function timeout"
- Verificar que el servicio Venom está corriendo: https://evolutionapi-venom-whatsapp-service.mcjhhb.easypanel.host/health
- Verificar logs en EasyPanel

### No aparece el componente
- Verificar que `whatsapp-venom.js` se carga correctamente (inspeccionar Network en DevTools)
- Verificar que el contenedor `#venom-container` existe en el DOM

### QR no se genera
- Verificar que Redis está funcionando (logs en EasyPanel)
- Verificar que Chromium está instalado en el contenedor

---

**Fecha:** 2026-02-20
**Versión:** 1.0
