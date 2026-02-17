# Simulación de Smart Flow Engine - Test de Memoria Temporal

## Escenario 1: Primera Cotización
```json
{
  "flow_id": "llaveros",
  "input_text": "tu vendes llaveros?",
  "conversation_id": "5215512345678",
  "user_id": "uuid-del-usuario",
  "contact_id": 123,
  "user_properties": {}
}
```

**Resultado Esperado:**
- ✅ Detecta como NUEVA solicitud
- ✅ Crea estado fresco
- ✅ Recopila: cantidad, diseño, etc.
- ✅ Genera cotización
- ✅ Al completar: LIMPIA variables transaccionales
- ✅ Guarda solo: "interesado en llaveros"

---

## Escenario 2: Segunda Cotización (30 min después)
```json
{
  "flow_id": "llaveros",
  "input_text": "quiero llaveros",
  "conversation_id": "5215512345678",
  "user_id": "uuid-del-usuario",
  "contact_id": 123,
  "user_properties": {}
}
```

**Resultado Esperado:**
- ✅ Detecta como NUEVA solicitud (estado anterior expirado/limpiado)
- ✅ NO asume cantidad anterior
- ✅ Pregunta de nuevo: "¿Cuántas piezas necesitas?"
- ✅ Responde en ESPAÑOL

---

## Escenario 3: Continuación de Flow Activo
```json
// Primera llamada
{
  "flow_id": "llaveros",
  "input_text": "tu vendes llaveros?",
  "conversation_id": "5215512345678",
  "user_id": "uuid-del-usuario",
  "contact_id": 123
}

// Bot: "¿Cuántas piezas necesitas?"

// Segunda llamada (2 minutos después)
{
  "flow_id": "llaveros",
  "input_text": "50",
  "conversation_id": "5215512345678",
  "user_id": "uuid-del-usuario",
  "contact_id": 123
}
```

**Resultado Esperado:**
- ✅ Detecta como CONTINUACIÓN (< 30 min)
- ✅ Carga estado existente
- ✅ Continúa desde paso actual
- ✅ Actualiza variable: cantidad = 50

---

## Escenario 4: Cambio de Producto
```json
{
  "flow_id": "llaveros",
  "input_text": "mejor quiero otro producto",
  "conversation_id": "5215512345678",
  "user_id": "uuid-del-usuario",
  "contact_id": 123
}
```

**Resultado Esperado:**
- ✅ Detecta palabra clave "otro" -> NUEVA solicitud
- ✅ Limpia estado anterior
- ✅ Inicia flow desde el principio

---

## Verificación de Idioma

Todas las respuestas deben estar en **ESPAÑOL**, incluyendo:
- Mensajes del flow
- Respuestas de IA (si se integra)
- Mensajes de error

**Configuración:**
```typescript
metadata: {
  language: 'es' // FORZADO
}
```

---

## Comandos de Prueba

### 1. Verificar tabla creada
```sql
SELECT * FROM flow_states LIMIT 5;
```

### 2. Ver estados activos
```sql
SELECT 
  contact_id, 
  flow_id, 
  status, 
  current_step_id,
  variables,
  metadata,
  expires_at
FROM flow_states 
WHERE status IN ('active', 'paused')
ORDER BY last_updated DESC;
```

### 3. Limpiar estados expirados manualmente
```sql
UPDATE flow_states 
SET status = 'expired'
WHERE expires_at < NOW() 
  AND status != 'expired';
```

### 4. Ver historial de un contacto
```sql
SELECT 
  flow_id,
  status,
  created_at,
  last_updated,
  expires_at,
  metadata->>'is_transactional' as is_transactional
FROM flow_states
WHERE contact_id = 123
ORDER BY created_at DESC;
```

---

## Checklist de Validación

- [ ] Flow inicia correctamente con nueva solicitud
- [ ] Estado se guarda en `flow_states` table
- [ ] Continuación funciona dentro de 30 min
- [ ] Nueva solicitud después de 30 min
- [ ] Limpieza de datos transaccionales al completar
- [ ] Palabras clave de "nueva solicitud" funcionan
- [ ] Idioma español forzado en metadata
- [ ] RLS policies permiten acceso correcto
- [ ] Índices optimizan consultas
- [ ] Expiración automática funciona

---

## Notas de Debugging

### Ver logs en tiempo real
```bash
# En Supabase Dashboard -> Edge Functions -> smart-flow-engine -> Logs
```

### Buscar en logs:
- `[StateManager]` - Operaciones de estado
- `🆕 NEW REQUEST` - Nueva solicitud detectada
- `🔄 CONTINUING` - Continuación detectada
- `🧹 Flow completed` - Limpieza ejecutada

### Variables importantes:
- `isNewRequest` - Boolean de detección
- `state.metadata.is_transactional` - Flag de limpieza
- `state.metadata.language` - Idioma forzado
