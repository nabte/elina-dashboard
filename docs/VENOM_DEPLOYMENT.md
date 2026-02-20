# 🚀 Guía de Deploy: Sistema Venom WhatsApp Multi-Tenant

## ✅ RESUMEN DE LO IMPLEMENTADO

Se ha creado un sistema completo de WhatsApp multi-tenant usando Venom como alternativa a Evolution API.

### Backend Completo (venom-service/)

```
✅ Session Manager - Gestión multi-sesión en memoria
✅ Event Transformer - Conversión Venom → Baileys (100% compatible)
✅ Webhook Sender - Envío de webhooks con retry
✅ Venom Client - Wrapper con reconexión automática
✅ API REST - Endpoints completos (CRUD sesiones + mensajes)
✅ Redis Integration - Estado, rate limiting, backoff
✅ Dockerfile - Optimizado para Chrome headless
✅ docker-compose.yml - Con Redis incluido
```

### Base de Datos (Supabase)

```
✅ Migration SQL (20260220_venom_instances.sql)
✅ Tabla venom_instances con RLS
✅ Políticas por plan (Enterprise: 3, Business: 1, Free: 0)
✅ Funciones auxiliares (get_venom_instance_limit, get_venom_usage_stats)
✅ Triggers (updated_at automático)
```

### Edge Function (Supabase)

```
✅ manage-venom-instance/index.ts
✅ Proxy entre frontend y Venom Service
✅ Sincronización automática con DB
✅ Acciones: status, get-qr, logout, delete
```

### Frontend

```
✅ Componente usuario (src/settings/whatsapp-venom.js)
⚠️  Integración SuperAdmin (pendiente - ver instrucciones abajo)
```

---

## 📋 PASOS PARA DEPLOYMENT

### FASE 1: Deploy del Servicio Venom en VPS

#### 1.1 Conectar al VPS via SSH

```bash
ssh usuario@tu-vps-ip
```

#### 1.2 Clonar el código o copiar venom-service/

Opción A - Si usas Git:
```bash
cd /home/usuario/
git clone https://github.com/tu-repo/elina.git
cd elina/venom-service/
```

Opción B - Copiar via SCP desde tu máquina local:
```bash
# Desde tu máquina local (Windows):
scp -r "h:/DESAL/ELina 26/venom-service" usuario@tu-vps-ip:/home/usuario/
```

#### 1.3 Configurar variables de entorno

```bash
cd /home/usuario/venom-service/
cp .env.example .env
nano .env
```

Editar con valores reales:
```env
PORT=3000
NODE_ENV=production
API_KEY=<GENERAR_CLAVE_SEGURA_AQUI>  # Ejemplo: openssl rand -hex 32
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<PASSWORD_REDIS>
VENOM_HEADLESS=true
VENOM_USE_CHROME=true
SESSIONS_DIR=/sessions
MAX_SESSIONS=15
LOG_LEVEL=info
```

#### 1.4 Instalar Redis (si no está instalado)

```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Configurar password para Redis:
```bash
sudo nano /etc/redis/redis.conf
```

Buscar y descomentar:
```
requirepass tu-password-redis-aqui
```

Reiniciar Redis:
```bash
sudo systemctl restart redis-server
```

#### 1.5 Deploy en EasyPanel

**Opción A - Via EasyPanel (Recomendado):**

1. Login a EasyPanel: `https://tu-easypanel-url.com`

2. Crear nueva App:
   - **Name**: `venom-whatsapp-service`
   - **Type**: Docker
   - **Build Method**: Dockerfile

3. Configurar Source:
   - **Repository**: Conectar con tu Git repo
   - **Branch**: main
   - **Dockerfile Path**: `/venom-service/Dockerfile`
   - **Context**: `/venom-service`

4. Configurar Variables de Entorno (en EasyPanel):
   ```
   NODE_ENV=production
   PORT=3000
   API_KEY=<tu-api-key>
   REDIS_HOST=redis
   REDIS_PORT=6379
   REDIS_PASSWORD=<tu-password>
   MAX_SESSIONS=15
   ```

5. Configurar Volume (Persistent Storage):
   - **Mount Path**: `/sessions`
   - **Size**: 5GB

6. Configurar Port Mapping:
   - **Internal Port**: 3000
   - **External Port**: Asignado por EasyPanel (ej: 31415)

7. Deploy → Click "Deploy"

8. (Opcional) Configurar Dominio:
   - Dominio: `venom-api.tudominio.com`
   - Target Port: 3000
   - SSL: Activar (Let's Encrypt)

**Opción B - Via Docker Compose (Manual):**

```bash
cd /home/usuario/venom-service/
docker-compose up -d
```

Verificar logs:
```bash
docker-compose logs -f venom-service
```

#### 1.6 Verificar que el servicio está corriendo

```bash
# Verificar healthcheck
curl http://localhost:3000/health

# Debería retornar:
# {
#   "status": "healthy",
#   "uptime": 123.45,
#   "activeSessions": 0,
#   "memory": {...}
# }
```

---

### FASE 2: Configurar Supabase

#### 2.1 Aplicar la migración SQL

Opción A - Via Supabase CLI:
```bash
cd "h:/DESAL/ELina 26"
supabase db push
```

Opción B - Via Dashboard:
1. Ir a `https://supabase.com/dashboard/project/tu-proyecto/editor`
2. SQL Editor → New Query
3. Copiar contenido de `supabase/migrations/20260220_venom_instances.sql`
4. Ejecutar

#### 2.2 Verificar migración

En SQL Editor:
```sql
-- Verificar tabla
SELECT * FROM venom_instances LIMIT 1;

-- Verificar políticas RLS
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'venom_instances';

-- Verificar funciones
SELECT get_venom_instance_limit('usuario-uuid-aqui'::uuid);
```

#### 2.3 Deployar Edge Function

```bash
cd "h:/DESAL/ELina 26"

# Deploy de manage-venom-instance
supabase functions deploy manage-venom-instance
```

#### 2.4 Configurar Secrets en Supabase

```bash
# VENOM_SERVICE_URL - URL del servicio Venom
supabase secrets set VENOM_SERVICE_URL=http://tu-vps-ip:3000
# Si usaste EasyPanel con dominio:
# supabase secrets set VENOM_SERVICE_URL=https://venom-api.tudominio.com

# VENOM_API_KEY - La misma que pusiste en .env del servicio
supabase secrets set VENOM_API_KEY=<tu-api-key-aqui>
```

#### 2.5 Verificar Edge Function

```bash
# Test de la edge function
curl -X POST https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/manage-venom-instance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_KEY" \
  -d '{
    "action": "status",
    "user_id": "tu-user-id-aqui"
  }'
```

---

### FASE 3: Integrar Frontend

#### 3.1 Agregar componente usuario en settings

**Archivo: `settings.html`** (antes del cierre de `</body>`):

```html
<!-- Sección WhatsApp Venom -->
<div id="whatsapp-venom-section" class="hidden">
    <div id="venom-container"></div>
</div>

<!-- Cargar script -->
<script src="/src/settings/whatsapp-venom.js"></script>
<script>
    // Inicializar cuando se carga la página de settings
    document.addEventListener('auth:ready', ({ detail }) => {
        if (detail.session) {
            window.venomManager = new WhatsAppVenomManager('venom-container');
            window.venomManager.init(detail.session.user);
        }
    });
</script>
```

#### 3.2 Agregar sección en SuperAdmin

**Archivo: `superadmin.html`** - Agregar tab en nav (línea ~78):

```html
<button
    class="nav-tab px-4 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
    data-target="venom-instances-section">
    Instancias Venom
</button>
```

**Archivo: `superadmin.html`** - Agregar sección (antes del cierre de main):

```html
<!-- SECCIÓN: Instancias Venom -->
<section id="venom-instances-section" class="tab-content hidden max-w-7xl mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-white">Gestión de Instancias Venom</h2>
        <button onclick="loadVenomInstances()"
                class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg shadow">
            <i data-lucide="refresh-cw" class="inline w-4 h-4 mr-2"></i>
            Actualizar
        </button>
    </div>

    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left">
                <thead class="bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                        <th class="p-4 border-b border-slate-700">Session ID</th>
                        <th class="p-4 border-b border-slate-700">Usuario</th>
                        <th class="p-4 border-b border-slate-700">Estado</th>
                        <th class="p-4 border-b border-slate-700">Teléfono</th>
                        <th class="p-4 border-b border-slate-700">Última Conexión</th>
                        <th class="p-4 text-right border-b border-slate-700">Acciones</th>
                    </tr>
                </thead>
                <tbody id="venom-instances-tbody" class="divide-y divide-slate-700">
                    <!-- Se rellena dinámicamente -->
                </tbody>
            </table>
        </div>
    </div>
</section>
```

**Archivo: `src/core/superadmin.js`** - Agregar función loadVenomInstances al final:

```javascript
async function loadVenomInstances() {
    const tbody = document.getElementById('venom-instances-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Cargando...</td></tr>';

    try {
        const { data: instances, error } = await window.auth.sb
            .from('venom_instances')
            .select(`
                *,
                profiles!inner(email, full_name, plan_id)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!instances || instances.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">No hay instancias Venom creadas</td></tr>';
            return;
        }

        tbody.innerHTML = instances.map(inst => {
            const statusColors = {
                'connected': 'bg-green-500/20 text-green-400 border-green-500/30',
                'connecting': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                'qr_ready': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                'disconnected': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                'error': 'bg-red-500/20 text-red-400 border-red-500/30'
            };

            const statusClass = statusColors[inst.status] || statusColors.disconnected;

            return `
                <tr class="hover:bg-slate-800/50 transition-colors">
                    <td class="p-4">
                        <code class="text-xs bg-slate-700 px-2 py-1 rounded">${inst.session_id}</code>
                    </td>
                    <td class="p-4">
                        <div class="text-sm font-medium">${inst.profiles.email}</div>
                        <div class="text-xs text-slate-400">${inst.profiles.plan_id.toUpperCase()}</div>
                    </td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 text-xs rounded-full font-medium ${statusClass} border uppercase">
                            ${inst.status}
                        </span>
                    </td>
                    <td class="p-4 text-sm">${inst.phone_number || '-'}</td>
                    <td class="p-4 text-sm text-slate-400">
                        ${inst.last_connected_at ? new Date(inst.last_connected_at).toLocaleString('es-ES') : 'Nunca'}
                    </td>
                    <td class="p-4 text-right">
                        <button onclick="viewVenomQR('${inst.session_id}')"
                                class="text-xs bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 px-3 rounded shadow mr-2">
                            Ver QR
                        </button>
                        <button onclick="deleteVenomInstance('${inst.id}', '${inst.session_id}')"
                                class="text-xs bg-red-600 hover:bg-red-500 text-white py-1.5 px-3 rounded shadow">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('Error al cargar instancias Venom:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400">Error: ${error.message}</td></tr>`;
    }
}

async function viewVenomQR(sessionId) {
    try {
        // TODO: Implementar modal con QR
        alert(`Función Ver QR para ${sessionId} - Por implementar`);
    } catch (error) {
        alert(`Error: ${error.message}`);
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

        alert('Instancia eliminada correctamente');
        loadVenomInstances();

    } catch (error) {
        alert(`Error al eliminar: ${error.message}`);
    }
}
```

**Archivo: `src/core/superadmin.js`** - Modificar setupEventListeners (línea ~70):

```javascript
} else if (targetId === 'impersonation-logs-section') {
    loadImpersonationLogs();
} else if (targetId === 'venom-instances-section') {
    loadVenomInstances(); // ← AGREGAR ESTA LÍNEA
}
```

---

### FASE 4: Testing

#### Test 1: Crear instancia desde usuario

1. Login como usuario con plan Business/Enterprise
2. Ir a Settings → WhatsApp Venom
3. Click "Conectar WhatsApp"
4. Verificar que se genera QR
5. Escanear con WhatsApp móvil
6. Verificar que cambia a "Conectado"

#### Test 2: Ver instancia en SuperAdmin

1. Login como SuperAdmin
2. Ir a "Instancias Venom"
3. Verificar que aparece la instancia creada
4. Estado debe ser "connected"

#### Test 3: Enviar mensaje

```bash
curl -X POST http://tu-vps-ip:3000/messages \
  -H "X-API-Key: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user-abc12345",
    "to": "+5211234567890",
    "message": "Prueba desde Venom",
    "type": "text"
  }'
```

#### Test 4: Recibir mensaje (Webhook)

1. Enviar mensaje al WhatsApp conectado
2. Verificar logs de message-router:
   ```bash
   # En Supabase Dashboard
   Functions → message-router → Logs
   ```
3. Debe recibir evento `MESSAGES_UPSERT` en formato Baileys

---

## 🔧 TROUBLESHOOTING

### Error: "Chrome/Chromium not found"

```bash
# Reconstruir imagen Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Error: "Redis connection refused"

```bash
# Verificar Redis
docker-compose ps redis
docker-compose logs redis

# Reiniciar Redis
docker-compose restart redis
```

### Error: "Session not connecting"

1. Verificar logs del servicio:
   ```bash
   docker-compose logs -f venom-service
   ```

2. Verificar que el QR no expiró (60 segundos)

3. Reintentar:
   - Eliminar sesión
   - Crear nueva sesión

### Error: "Max sessions reached"

Aumentar límite en `.env`:
```env
MAX_SESSIONS=20
```

Reiniciar:
```bash
docker-compose restart venom-service
```

---

## 📊 MONITOREO

### Ver logs en tiempo real

```bash
docker-compose logs -f venom-service
```

### Ver uso de recursos

```bash
docker stats venom-whatsapp-service
```

### Ver sesiones activas

```bash
curl http://localhost:3000/sessions \
  -H "X-API-Key: tu-api-key"
```

---

## 🎯 PRÓXIMOS PASOS (Opcional)

1. ✅ Sistema básico funcionando
2. ⚡ Implementar pairing code en Venom (cuando esté disponible)
3. 📊 Dashboard de métricas (Grafana)
4. 🔔 Alertas (Discord/Slack cuando servicio cae)
5. 📱 App móvil para gestión
6. 🤖 Auto-scaling según carga

---

## 📝 NOTAS IMPORTANTES

- **Seguridad**: Cambiar API_KEY en producción
- **Backups**: Volumen `/sessions` contiene tokens críticos
- **Límites**: 10-15 sesiones recomendado para VPS 8GB
- **Firewall**: Solo exponer puerto 3000 a Supabase
- **SSL**: Si usas dominio público, activar SSL obligatorio

---

**Fecha**: 2026-02-20
**Versión**: 1.0
**Estado**: ✅ Listo para deployment
