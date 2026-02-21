# Diagnóstico: Error al generar código QR de WhatsApp

## Problema
La API devuelve `{count: 0}` en lugar del código QR esperado.

## Causas posibles

### 1. Variables de entorno no configuradas en Supabase
Las siguientes variables deben estar configuradas en el proyecto de Supabase:

- `EVOLUTION_API_URL` - URL base de la API de Evolution (ej: `https://evolution.example.com`)
- `EVOLUTION_API_KEY` - Key de autenticación para Evolution API
- `SUPABASE_URL` - URL del proyecto de Supabase (auto-configurado)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-configurado)

**Cómo verificar:**
1. Ve a: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/settings/functions
2. Click en "Edge Functions"
3. Verifica que las variables de entorno estén configuradas

### 2. URL de Evolution API incorrecta
La URL debe apuntar al endpoint correcto de Evolution API sin `/manager` al final.

**Formato correcto:** `https://tu-dominio.com` (sin trailing slash)
**Formato incorrecto:** `https://tu-dominio.com/manager/`

### 3. API de Evolution no responde correctamente
Evolution API puede estar caída o no estar configurada para generar QR codes.

**Cómo verificar:**
1. Prueba manualmente el endpoint: `GET /instance/connect/{instanceName}`
2. Verifica que devuelva un objeto con campo `base64` o `qrcode.base64`

### 4. Instancia de WhatsApp ya existe pero está en mal estado
Si la instancia ya existe en Evolution pero está en un estado inconsistente.

**Solución:**
1. Elimina la instancia desde Evolution API: `DELETE /instance/delete/{instanceName}`
2. Vuelve a intentar generar el QR

## Pasos para diagnosticar

### Paso 1: Revisar logs de Supabase
1. Ve a: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/logs/edge-functions
2. Busca logs de la función `manage-whatsapp-instance`
3. Verifica si hay mensajes de error como:
   - `[ERROR QR] Evolution API responded with XXX`
   - `Evolution API error: XXX`

### Paso 2: Verificar respuesta de Evolution API
En los logs de Supabase, busca:
```
[QR] RESPUESTA COMPLETA DE EVOLUTION API:
```

Esto te mostrará exactamente qué está devolviendo Evolution API.

**Respuesta esperada:**
```json
{
  "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "qrcode": {
    "base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "instance": {
    "state": "connecting",
    "name": "...",
    "token": "..."
  }
}
```

**Respuesta incorrecta (lo que estás recibiendo):**
```json
{
  "count": 0
}
```

### Paso 3: Probar Evolution API manualmente
Usa Postman o curl para probar directamente:

```bash
curl -X GET \
  "https://TU_EVOLUTION_URL/instance/connect/TEST_INSTANCE" \
  -H "apikey: TU_EVOLUTION_API_KEY"
```

### Paso 4: Verificar configuración de Evolution
Asegúrate que Evolution API esté configurado correctamente:
- ✅ QRCODE está habilitado
- ✅ BASE64 está habilitado
- ✅ La integración es WHATSAPP-BAILEYS

## Solución temporal

Mientras se resuelve el problema con QR, puedes usar **Pairing Code** (código de emparejamiento):

1. En el dashboard, cambia a modo "Pairing Code"
2. Ingresa tu número de WhatsApp
3. Se generará un código de 8 dígitos
4. Ingresa ese código en WhatsApp > Dispositivos Vinculados > Vincular Dispositivo

## Próximos pasos

1. **Revisar logs de Supabase** (Paso 1)
2. **Verificar variables de entorno** (Causa #1)
3. **Probar Evolution API manualmente** (Paso 3)
4. Si todo falla, **contactar al administrador de Evolution API** para verificar que el servicio esté funcionando correctamente

## Cambios realizados

### Frontend (app.js)
- ✅ Agregados logs detallados de la respuesta
- ✅ Agregado manejo de error con mensaje descriptivo
- ✅ Agregada alerta para el usuario con instrucciones

### Backend (manage-whatsapp-instance/index.ts)
- ✅ Agregados logs de la respuesta de Evolution API
- ⏳ Pendiente: Desplegar cambios con `supabase functions deploy manage-whatsapp-instance`

## Comandos útiles

### Desplegar función actualizada
```bash
supabase functions deploy manage-whatsapp-instance
```

### Ver logs en tiempo real
```bash
supabase functions logs manage-whatsapp-instance --tail
```

### Probar función localmente
```bash
supabase functions serve manage-whatsapp-instance
```
