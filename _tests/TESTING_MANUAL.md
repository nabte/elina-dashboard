# ELINA V5 - Guía de Testing Manual

## 🎯 Objetivo
Validar que todas las optimizaciones funcionan correctamente y que los mensajes llegan a **nabte 5219995169313**.

---

## 📋 Pre-requisitos

1. Obtener las variables de entorno:
```powershell
$env:SUPABASE_URL
$env:SUPABASE_ANON_KEY
```

2. Tener acceso a:
   - WhatsApp de nabte (5219995169313)
   - Supabase Dashboard para revisar logs

---

## 🧪 Tests Manuales con curl

### Test 1: Mensaje Simple a nabte

```powershell
$body = @{
    instance = "ELINA"
    data = @{
        key = @{
            remoteJid = "5219995169313@s.whatsapp.net"
            id = "test_001"
            fromMe = $false
        }
        message = @{
            conversation = "Hola, esto es una prueba del sistema"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/elina-v5" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

**Validar**:
- [ ] Mensaje recibido en WhatsApp de nabte
- [ ] Respuesta apropiada del bot
- [ ] Logs en Supabase muestran: `[VALIDATION] Clean number: 5219995169313`

---

### Test 2: Consulta de Productos

```powershell
$body = @{
    instance = "ELINA"
    data = @{
        key = @{
            remoteJid = "5219995169313@s.whatsapp.net"
            id = "test_002"
            fromMe = $false
        }
        message = @{
            conversation = "Qué productos tienes disponibles?"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/elina-v5" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

**Validar**:
- [ ] Tool `buscar_productos` ejecutado
- [ ] Productos mostrados con placeholders
- [ ] Imágenes enviadas (máximo 3)

---

### Test 3: Intención Crítica (Queja)

```powershell
$body = @{
    instance = "ELINA"
    data = @{
        key = @{
            remoteJid = "5219995169313@s.whatsapp.net"
            id = "test_003"
            fromMe = $false
        }
        message = @{
            conversation = "Tengo una queja grave sobre el servicio"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/elina-v5" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

**Validar**:
- [ ] Intent `complaint` detectado
- [ ] Conversación pausada
- [ ] Etiqueta "ignorar" aplicada
- [ ] Notificación enviada al dueño
- [ ] Mensaje de reconocimiento a nabte

---

### Test 4: Solicitud de Cita

```powershell
$body = @{
    instance = "ELINA"
    data = @{
        key = @{
            remoteJid = "5219995169313@s.whatsapp.net"
            id = "test_004"
            fromMe = $false
        }
        message = @{
            conversation = "Quiero agendar una cita para mañana"
        }
        pushName = "Test User"
    }
    isSimulation = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/elina-v5" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

**Validar**:
- [ ] Tool `consultar_disponibilidad` ejecutado
- [ ] Horarios mostrados
- [ ] Si se confirma, tool `agendar_cita` ejecutado

---

## 📊 Checklist de Validación Completa

### Funcionalidad Básica
- [ ] Mensajes llegan a nabte 5219995169313
- [ ] Respuestas son coherentes y apropiadas
- [ ] Tiempo de respuesta < 5 segundos

### Detección de Intenciones
- [ ] Saludos detectados correctamente
- [ ] Consultas de productos detectadas
- [ ] Intenciones críticas detectadas
- [ ] Solicitudes de cita detectadas

### Herramientas (Tools)
- [ ] `buscar_productos` funciona
- [ ] `agendar_cita` funciona (si habilitado)
- [ ] `consultar_disponibilidad` funciona (si habilitado)

### Procesamiento de Media
- [ ] Imágenes procesadas y enviadas
- [ ] Máximo 3 media por mensaje
- [ ] Audio transcrito correctamente (si aplica)

### Intenciones Críticas
- [ ] Quejas pausan conversación
- [ ] Etiqueta "ignorar" aplicada
- [ ] Dueño notificado
- [ ] Cliente recibe reconocimiento

### Formato de Texto
- [ ] Negritas convertidas (**texto** → *texto*)
- [ ] URLs removidas del texto
- [ ] Saltos de línea limpios (máximo 2)
- [ ] Cálculos de subtotales correctos

### Optimizaciones Implementadas
- [ ] Retry logic funcionando (revisar logs)
- [ ] Validación de número en logs
- [ ] Sin errores de tipo en catch blocks
- [ ] Mensajes enviados con número limpio

---

## 🔍 Revisar Logs en Supabase

1. Ir a Supabase Dashboard
2. Navegar a: **Logs** → **Edge Functions** → **elina-v5**
3. Buscar las siguientes líneas:

```
✅ Validación de número limpio:
📤 [VALIDATION] Clean number: 5219995169313

✅ Mensaje enviado exitosamente:
✅ [EVOLUTION] Message sent successfully

✅ Retry logic (si hubo fallo temporal):
🔄 [RETRY] Attempt 2/4 for https://...
✅ [RETRY] Succeeded on attempt 2

✅ Tool calling:
🔧 [TOOLS] Executing 1 tool call(s)
   - Calling: buscar_productos

✅ Critical intent:
🚨 [CRITICAL] Critical intent detected: complaint
✅ [CRITICAL] Label "ignorar" added to contact
✅ [CRITICAL] Notification sent to owner
```

---

## 📈 Métricas Esperadas

| Métrica | Objetivo | Validación |
|---------|----------|------------|
| Tasa de éxito de envío | 100% | Todos los mensajes llegan |
| Tiempo de respuesta (p95) | < 3s | Revisar logs |
| Detección de intención | > 90% | Intents correctos |
| Tool calling | 100% | Herramientas ejecutadas |
| Critical intent handling | 100% | Flujo completo |

---

## ✅ Resultado Esperado

Al completar todos los tests:

1. **nabte 5219995169313** debe haber recibido:
   - Mensaje de prueba simple
   - Respuesta sobre productos
   - Reconocimiento de queja
   - Información sobre citas

2. **Logs de Supabase** deben mostrar:
   - `[VALIDATION] Clean number: 5219995169313` en cada envío
   - `[EVOLUTION] Message sent successfully` sin errores
   - Ejecución correcta de tools
   - Detección de intenciones apropiadas

3. **Base de datos** debe reflejar:
   - Historial de conversación guardado
   - Etiquetas aplicadas (si hubo critical intent)
   - Citas agendadas (si aplica)

---

## 🚨 Troubleshooting

### Problema: Mensajes no llegan a nabte

**Verificar**:
1. Logs muestran: `[VALIDATION] Clean number: 5219995169313`
2. Evolution API está activa
3. Instancia "ELINA" está configurada correctamente

**Solución**:
- Revisar configuración de Evolution API
- Verificar que el número no tenga etiqueta "ignorar"
- Confirmar que la suscripción está activa

### Problema: Tools no se ejecutan

**Verificar**:
1. Logs muestran: `🔧 [TOOLS] Executing X tool call(s)`
2. OpenRouter API key configurada
3. Productos existen en la base de datos

**Solución**:
- Verificar OPENROUTER_API_KEY en variables de entorno
- Confirmar que hay productos en la tabla `products`
- Revisar que `hasProducts` está en `true` en config

### Problema: Critical intents no detectados

**Verificar**:
1. Logs muestran: `🚨 [CRITICAL] Critical intent detected`
2. Función `detect-critical-intent` está desplegada

**Solución**:
- Desplegar función `detect-critical-intent` si falta
- Verificar que critical_rules están configuradas
- Confirmar que el mensaje contiene palabras clave de queja

---

## 📞 Siguiente Paso

Una vez completados los tests manuales, reportar:
- ✅ Número de tests exitosos
- ❌ Número de tests fallidos
- 📋 Observaciones y problemas encontrados
- 💡 Sugerencias de mejora
