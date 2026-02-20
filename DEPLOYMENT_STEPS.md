# 🚀 GUÍA PASO A PASO - DEPLOYMENT VENOM EN EASYPANEL

## PASO 0: CONEXIÓN SSH (Windows)

### Opción A: Usando PowerShell/CMD (Windows 10/11)

```powershell
# Abrir PowerShell como Administrador
# Conectar al VPS
ssh usuario@IP-DEL-VPS

# Ejemplo:
ssh root@123.45.67.89

# Te pedirá la contraseña, escríbela y presiona Enter
# (No verás nada mientras escribes, es normal)
```

### Opción B: Usando PuTTY (si prefieres interfaz gráfica)

1. Descargar PuTTY: https://www.putty.org/
2. Abrir PuTTY
3. En "Host Name": poner `usuario@IP-DEL-VPS`
4. Port: `22`
5. Click "Open"
6. Escribir contraseña cuando lo pida

---

## PASO 1: PREPARAR REPOSITORIO GIT

### 1.1 Verificar que tienes Git instalado

```bash
# En tu PC (PowerShell o CMD)
git --version

# Si no tienes Git, descárgalo de:
# https://git-scm.com/download/win
```

### 1.2 Inicializar repositorio (si no existe)

```bash
# Navegar a la carpeta del proyecto
cd "h:/DESAL/ELina 26"

# Verificar estado de git
git status

# Si no está inicializado:
git init
git add .
git commit -m "Initial commit with Venom service"
```

### 1.3 Crear repositorio en GitHub/GitLab

**Opción A - GitHub:**
1. Ir a https://github.com/new
2. Nombre: `elina-whatsapp`
3. Privado: ✅ (recomendado)
4. Click "Create repository"
5. Copiar la URL que te da (ejemplo: `https://github.com/tu-usuario/elina-whatsapp.git`)

**Opción B - GitLab:**
1. Ir a https://gitlab.com/projects/new
2. Nombre: `elina-whatsapp`
3. Visibilidad: Private
4. Click "Create project"

### 1.4 Conectar repo local con GitHub/GitLab

```bash
# En PowerShell, en la carpeta del proyecto
cd "h:/DESAL/ELina 26"

# Agregar remote (cambiar URL por la tuya)
git remote add origin https://github.com/TU-USUARIO/elina-whatsapp.git

# Push
git branch -M main
git push -u origin main

# Te pedirá usuario y contraseña de GitHub/GitLab
```

---

## PASO 2: CONFIGURAR EASYPANEL

### 2.1 Acceder a EasyPanel

1. Abrir navegador
2. Ir a: `https://TU-EASYPANEL-URL.com`
3. Login con tus credenciales

### 2.2 Crear nueva App

1. Click en **"+ New"** → **"App"**
2. **Name**: `venom-whatsapp-service`
3. **Type**: **"Git"** (no "Docker Image")
4. Click **"Create"**

### 2.3 Configurar Source (Git)

1. En la app recién creada, ir a **"Source"**
2. Click **"Connect Repository"**
3. Seleccionar **GitHub** o **GitLab**
4. Autorizar acceso (si es primera vez)
5. Seleccionar repositorio: `elina-whatsapp`
6. **Branch**: `main`
7. **Build Method**: `Dockerfile`
8. **Dockerfile Path**: `/venom-service/Dockerfile`
9. **Context Path**: `/venom-service`
10. Click **"Save"**

### 2.4 Configurar Variables de Entorno

1. En la app, ir a **"Environment"**
2. Click **"+ Add Variable"**
3. Agregar estas variables (una por una):

```
NODE_ENV = production
PORT = 3000
API_KEY = [GENERAR-CLAVE-SEGURA] ← Ver nota abajo
REDIS_HOST = redis
REDIS_PORT = 6379
REDIS_PASSWORD = [PASSWORD-REDIS]
VENOM_HEADLESS = true
VENOM_USE_CHROME = true
VENOM_LOG_QR = false
SESSIONS_DIR = /sessions
MAX_SESSIONS = 15
RATE_LIMIT_WINDOW_MS = 60000
RATE_LIMIT_MAX_REQUESTS = 100
WEBHOOK_RETRY_ATTEMPTS = 3
WEBHOOK_RETRY_DELAY_MS = 1000
WEBHOOK_TIMEOUT_MS = 10000
LOG_LEVEL = info
```

**NOTA - Generar API_KEY segura:**

En PowerShell:
```powershell
# Generar clave aleatoria
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Copiar el resultado y usarlo como API_KEY
```

O usar este generador online: https://www.random.org/strings/

### 2.5 Configurar Redis (Servicio adicional)

**Opción A - Redis como servicio en EasyPanel:**
1. En EasyPanel, click **"+ New"** → **"App"**
2. **Name**: `redis`
3. **Type**: **"Docker Image"**
4. **Image**: `redis:7-alpine`
5. En **"Environment"**, agregar:
   ```
   REDIS_PASSWORD = tu-password-aqui
   ```
6. En **"Command"**, poner:
   ```
   redis-server --requirepass ${REDIS_PASSWORD}
   ```
7. **Port**: `6379` (interno)
8. Click **"Create"** y **"Deploy"**

**Opción B - Redis ya instalado en VPS:**
```bash
# Conectar via SSH al VPS
ssh usuario@IP-VPS

# Instalar Redis
sudo apt update
sudo apt install redis-server -y

# Configurar password
sudo nano /etc/redis/redis.conf

# Buscar y descomentar la línea:
# requirepass tu-password-aqui

# Guardar (Ctrl+X, Y, Enter)

# Reiniciar Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 2.6 Configurar Persistent Volume (para /sessions)

1. En la app `venom-whatsapp-service`, ir a **"Volumes"**
2. Click **"+ Add Volume"**
3. **Mount Path**: `/sessions`
4. **Type**: **"Persistent"**
5. **Size**: `5 GB`
6. Click **"Save"**

### 2.7 Configurar Port Mapping

1. Ir a **"Domains"**
2. Click **"+ Add Domain"**

**Opción A - Usar dominio propio (Recomendado):**
- **Domain**: `venom-api.tudominio.com`
- **Port**: `3000`
- **SSL**: ✅ Activar

**Opción B - Usar IP del VPS:**
- **Host**: `IP-DEL-VPS`
- **Port**: `3000` → `31000` (ejemplo de puerto externo)

3. Click **"Save"**

### 2.8 Deploy!

1. Ir a **"Deployments"**
2. Click **"Deploy"** o **"Redeploy"**
3. Esperar 3-5 minutos (verás logs en tiempo real)
4. ✅ Cuando veas "Server running on port 3000" → **Listo!**

### 2.9 Verificar que funciona

Abrir navegador y ir a:
- Si usaste dominio: `https://venom-api.tudominio.com/health`
- Si usaste IP: `http://IP-VPS:31000/health`

Deberías ver:
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "activeSessions": 0,
  "memory": {...}
}
```

---

## PASO 3: CONFIGURAR SUPABASE

### 3.1 Aplicar Migración SQL

1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a **"SQL Editor"**
4. Click **"+ New query"**
5. Copiar todo el contenido de:
   ```
   h:\DESAL\ELina 26\supabase\migrations\20260220_venom_instances.sql
   ```
6. Pegar en el editor
7. Click **"Run"** (botón verde)
8. ✅ Deberías ver: "Success. No rows returned"

**Verificar migración:**
```sql
-- En SQL Editor, ejecutar:
SELECT * FROM venom_instances LIMIT 1;

-- Debe retornar estructura de la tabla (vacía por ahora)
```

### 3.2 Deploy Edge Function

**Opción A - Via Supabase CLI (Recomendado):**

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
# Windows (PowerShell como Admin):
scoop install supabase

# O descarga desde: https://github.com/supabase/cli/releases

# 2. Login a Supabase
supabase login

# 3. Link al proyecto
cd "h:/DESAL/ELina 26"
supabase link --project-ref TU-PROJECT-REF

# Obtén TU-PROJECT-REF de la URL de Supabase:
# https://supabase.com/dashboard/project/[ESTO-ES-PROJECT-REF]/

# 4. Deploy edge function
supabase functions deploy manage-venom-instance

# ✅ Deberías ver: "Deployed function manage-venom-instance"
```

**Opción B - Manual (si CLI falla):**

1. Ir a https://supabase.com/dashboard/project/TU-PROJECT/functions
2. Click **"+ Create function"**
3. **Name**: `manage-venom-instance`
4. Copiar código de:
   ```
   h:\DESAL\ELina 26\supabase\functions\manage-venom-instance\index.ts
   ```
5. Pegar en el editor
6. Click **"Deploy"**

### 3.3 Configurar Secrets en Supabase

```bash
# Via CLI (en PowerShell):
cd "h:/DESAL/ELina 26"

# VENOM_SERVICE_URL - URL donde está corriendo tu servicio
supabase secrets set VENOM_SERVICE_URL=https://venom-api.tudominio.com
# O si usas IP:
# supabase secrets set VENOM_SERVICE_URL=http://IP-VPS:31000

# VENOM_API_KEY - La MISMA que pusiste en EasyPanel
supabase secrets set VENOM_API_KEY=tu-api-key-aqui
```

**Verificar secrets:**
```bash
supabase secrets list
```

### 3.4 Test de Edge Function

```bash
# En PowerShell o navegador (Postman/Insomnia)
curl -X POST https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/manage-venom-instance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_KEY" \
  -d "{\"action\":\"status\",\"user_id\":\"test-user-id\"}"

# Respuesta esperada:
# {"status":"disconnected","instance":null,"message":"No instance found"}
```

---

## PASO 4: INTEGRAR FRONTEND

### 4.1 Agregar script en settings.html

Abre `h:\DESAL\ELina 26\settings.html` (o donde esté tu settings)

**ANTES del cierre de `</body>`, agregar:**

```html
<!-- WhatsApp Venom Section -->
<script src="/src/settings/whatsapp-venom.js"></script>
<script>
    document.addEventListener('auth:ready', ({ detail }) => {
        if (detail.session) {
            window.venomManager = new WhatsAppVenomManager('venom-container');
            window.venomManager.init(detail.session.user);
        }
    });
</script>
```

**En el HTML de settings, agregar sección:**

```html
<!-- En alguna parte de settings.html -->
<div class="space-y-6">
    <!-- ... otras secciones ... -->

    <!-- WhatsApp Venom -->
    <div id="venom-container"></div>
</div>
```

### 4.2 Modificar SuperAdmin

**En `superadmin.html`**, buscar el `<nav>` con los tabs y agregar:

```html
<button
    class="nav-tab px-4 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
    data-target="venom-instances-section">
    Instancias Venom
</button>
```

**En `superadmin.html`**, antes del cierre de `<main>`, agregar la sección completa (copiar de `docs/VENOM_DEPLOYMENT.md` - FASE 3, sección SuperAdmin).

**En `src/core/superadmin.js`**, agregar al final del archivo las funciones `loadVenomInstances()`, `viewVenomQR()`, `deleteVenomInstance()` (copiar de `docs/VENOM_DEPLOYMENT.md`).

**En `src/core/superadmin.js`**, modificar `setupEventListeners()` para incluir:

```javascript
} else if (targetId === 'impersonation-logs-section') {
    loadImpersonationLogs();
} else if (targetId === 'venom-instances-section') {
    loadVenomInstances(); // ← AGREGAR ESTA LÍNEA
}
```

### 4.3 Commit y Push

```bash
cd "h:/DESAL/ELina 26"

git add .
git commit -m "Add Venom WhatsApp integration"
git push origin main
```

---

## PASO 5: TESTING FINAL

### Test 1: Healthcheck del servicio

```bash
curl https://venom-api.tudominio.com/health
```

✅ Esperado: `{"status":"healthy", ...}`

### Test 2: Crear instancia desde frontend

1. Login en ELINA como usuario Business/Enterprise
2. Ir a Settings
3. Scroll hasta "WhatsApp Venom"
4. Click "Conectar WhatsApp"
5. ✅ Debe aparecer código QR
6. Escanear con WhatsApp móvil
7. ✅ Debe cambiar a "Conectado"

### Test 3: Ver en SuperAdmin

1. Login como SuperAdmin
2. Click en tab "Instancias Venom"
3. ✅ Debe aparecer la instancia creada

### Test 4: Enviar mensaje de prueba

```bash
curl -X POST https://venom-api.tudominio.com/messages \
  -H "X-API-Key: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user-XXXXXXXX",
    "to": "+5211234567890",
    "message": "Prueba desde Venom ✅"
  }'
```

---

## 🎉 ¡COMPLETADO!

Si todos los tests pasan, el sistema Venom está funcionando correctamente.

---

## 🆘 TROUBLESHOOTING

### Error: "Cannot connect to Redis"

```bash
# SSH al VPS
ssh usuario@IP-VPS

# Verificar Redis
sudo systemctl status redis-server

# Si no está corriendo
sudo systemctl start redis-server
```

### Error: "Chrome not found"

En EasyPanel, reconstruir la imagen:
1. Ir a app `venom-whatsapp-service`
2. Click "Rebuild" (sin cache)

### Ver logs en tiempo real

En EasyPanel:
1. Ir a app `venom-whatsapp-service`
2. Tab "Logs"
3. Seleccionar "Live logs"

---

**Fecha**: 2026-02-20
**Versión**: 1.0
