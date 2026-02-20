# Venom WhatsApp Multi-Tenant Service

Servicio Node.js multi-tenant para WhatsApp usando Venom (venom-bot) como alternativa a Evolution API.

## 🚀 Características

- ✅ Multi-sesión: Gestiona hasta 15 números WhatsApp simultáneos
- ✅ API REST completa con autenticación
- ✅ Webhooks compatibles con formato Baileys (Evolution API)
- ✅ Persistencia de sesiones en volumen Docker
- ✅ Redis para estado y rate limiting
- ✅ Reconexión automática con backoff exponencial
- ✅ Logging estructurado
- ✅ Healthcheck integrado

## 📋 Requisitos

- Docker & Docker Compose
- 2GB RAM mínimo (4GB recomendado para 10+ sesiones)
- 1 vCPU mínimo (2 vCPU recomendado)

## ⚙️ Instalación

### 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
API_KEY=tu-api-key-segura-aqui
REDIS_PASSWORD=tu-password-redis
MAX_SESSIONS=15
LOG_LEVEL=info
```

### 2. Construir e iniciar servicios

```bash
docker-compose up -d
```

### 3. Verificar estado

```bash
curl http://localhost:3000/health
```

## 📡 API Endpoints

### Autenticación

Todos los endpoints (excepto `/health`) requieren header:

```
X-API-Key: tu-api-key
```

### Crear Sesión

```bash
POST /sessions
Content-Type: application/json

{
  "sessionId": "user-ABC123",
  "userId": "uuid-del-usuario",
  "webhookUrl": "https://tu-webhook.com/endpoint",
  "phoneNumber": "+5211234567890"
}
```

**Respuesta:**

```json
{
  "sessionId": "user-ABC123",
  "status": "connecting",
  "userId": "uuid-del-usuario"
}
```

### Obtener QR Code

```bash
GET /sessions/user-ABC123/qr
X-API-Key: tu-api-key
```

**Respuesta:**

```json
{
  "qr": "base64-string-del-qr",
  "base64": "base64-string-del-qr"
}
```

### Verificar Estado

```bash
GET /sessions/user-ABC123/status
X-API-Key: tu-api-key
```

**Respuesta:**

```json
{
  "status": "connected",
  "connectionState": "CONNECTED",
  "hostDevice": {
    "phone": "5211234567890",
    "platform": "android"
  },
  "qrAvailable": false,
  "inMemory": true
}
```

### Enviar Mensaje

```bash
POST /messages
Content-Type: application/json
X-API-Key: tu-api-key

{
  "sessionId": "user-ABC123",
  "to": "+5219876543210",
  "message": "Hola desde Venom!",
  "type": "text"
}
```

**Respuesta:**

```json
{
  "success": true,
  "messageId": "3EB0ABCD1234567890",
  "timestamp": 1709123456
}
```

### Listar Sesiones

```bash
GET /sessions
X-API-Key: tu-api-key
```

**Respuesta:**

```json
{
  "count": 2,
  "sessions": [
    {
      "sessionId": "user-ABC123",
      "status": "connected",
      "userId": "uuid-1",
      "createdAt": 1709123456000,
      "webhookUrl": "https://webhook.com/endpoint"
    }
  ]
}
```

### Eliminar Sesión

```bash
DELETE /sessions/user-ABC123
X-API-Key: tu-api-key
```

**Respuesta:**

```json
{
  "success": true
}
```

## 🔔 Webhooks

El servicio envía eventos a la URL configurada en formato Baileys:

### Evento: Mensaje Recibido

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "user-ABC123",
  "data": {
    "key": {
      "remoteJid": "5219876543210@s.whatsapp.net",
      "id": "3EB0ABCD1234567890",
      "fromMe": false
    },
    "message": {
      "conversation": "Texto del mensaje"
    },
    "pushName": "Nombre del Contacto",
    "messageTimestamp": 1709123456
  }
}
```

### Evento: Cambio de Conexión

```json
{
  "event": "CONNECTION_UPDATE",
  "instance": "user-ABC123",
  "data": {
    "state": "open"
  }
}
```

Estados posibles: `open`, `connecting`, `close`, `qr_ready`

### Evento: QR Generado

```json
{
  "event": "QR_CODE",
  "instance": "user-ABC123",
  "data": {
    "qr": "base64-string"
  }
}
```

## 🔧 Deploy en EasyPanel

### 1. Crear App en EasyPanel

- Tipo: **Docker**
- Nombre: `venom-whatsapp-service`

### 2. Configurar Build

- **Build Method**: Dockerfile
- **Dockerfile Path**: `/Dockerfile`
- **Context**: `/`

### 3. Configurar Variables de Entorno

Añadir en EasyPanel:

```
API_KEY=<generar-clave-segura>
REDIS_HOST=redis
REDIS_PORT=6379
MAX_SESSIONS=15
NODE_ENV=production
```

### 4. Configurar Volumes

- **Mount Path**: `/sessions`
- **Type**: Persistent Volume
- **Size**: 5GB

### 5. Configurar Redis (Servicio Adicional)

Crear servicio Redis en EasyPanel:

- **Image**: `redis:7-alpine`
- **Port**: 6379 (interno)
- **Volume**: `/data` → Persistent (1GB)

### 6. Configurar Dominio (Opcional)

Si necesitas HTTPS público:

- Dominio: `venom-api.tudominio.com`
- Port: 3000
- SSL: Activar

### 7. Deploy

Click en **Deploy** y esperar 2-3 minutos.

## 📊 Monitoreo

### Logs en tiempo real

```bash
docker-compose logs -f venom-service
```

### Uso de recursos

```bash
docker stats venom-whatsapp-service
```

### Healthcheck

```bash
curl http://localhost:3000/health
```

## 🛠️ Troubleshooting

### Error: Chrome/Chromium not found

Verificar que el Dockerfile incluya las dependencias de Chrome:

```bash
docker-compose build --no-cache
```

### Error: Session not connecting

1. Verificar logs: `docker-compose logs venom-service`
2. Verificar que el QR no haya expirado (60 segundos de validez)
3. Reiniciar sesión: `DELETE /sessions/:id` → `POST /sessions`

### Error: Out of memory

Reducir `MAX_SESSIONS` o aumentar RAM del contenedor en `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 6G
```

### Redis connection failed

Verificar que Redis esté corriendo:

```bash
docker-compose ps redis
docker-compose logs redis
```

## 📈 Límites de Producción

| Sesiones | RAM Recomendado | CPU Recomendado |
|----------|-----------------|-----------------|
| 1-5      | 2GB             | 1 vCPU          |
| 5-10     | 4GB             | 2 vCPU          |
| 10-15    | 6GB             | 3 vCPU          |

**Nota**: Cada sesión consume ~300-500MB RAM en promedio.

## 🔒 Seguridad

1. **Cambiar API_KEY**: Usar clave fuerte y única
2. **Restringir CORS**: En producción, configurar dominios permitidos
3. **Redis Password**: Configurar password para Redis
4. **Rate Limiting**: Activado por defecto (100 req/min por IP)
5. **Firewall**: Solo exponer puerto 3000 a edge function de Supabase

## 📝 Licencia

MIT
