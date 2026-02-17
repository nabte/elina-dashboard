# Análisis: Flujo Actual (Edge Function) vs n8n

## 🔍 Flujo n8n (Original)

### Orden de Procesamiento:
```
1. Webhook recibe mensaje
2. Detectar tipo de mensaje (audio/imagen/texto/video)
3. Procesar contenido (transcribir audio, describir imagen)
4. Obtener historial de chat
5. Obtener prompt y configuración del usuario
6. **LLAMAR AL AI AGENT** (LLM)
7. Extraer IDs de placeholders de la respuesta
8. Obtener productos por IDs
9. Reemplazar placeholders con datos reales
10. Detectar si necesita cotización
11. Generar cotización (si aplica)
12. Enviar mensaje final
```

### Características Clave:
- **Análisis POST-LLM:** La detección de cotización ocurre DESPUÉS de que el LLM responde
- **LLM enfocado:** El AI Agent solo se encarga de generar la respuesta conversacional
- **Procesamiento en capas:** Cada nodo hace UNA cosa específica

---

## 🔍 Flujo Actual (Edge Function `process-chat-message`)

### Orden de Procesamiento:
```
1. Webhook recibe mensaje
2. Extraer datos del mensaje
3. Obtener perfil del usuario
4. **DETECTAR INTENCIÓN DE CITA** (pre-LLM)
5. **DETECTAR INTENCIÓN CRÍTICA** (pre-LLM)
6. Obtener historial, RAG, promoción activa
7. Verificar respuestas preset
8. Obtener slots de citas disponibles (si hay intención)
9. Construir contexto masivo para el LLM
10. **LLAMAR AL LLM** con TODO el contexto
11. Procesar placeholders
12. Detectar si necesita cotización
13. Generar cotización (si aplica)
14. Enviar mensaje
```

### Características Actuales:
- **Análisis PRE-LLM:** Detectamos intenciones ANTES del LLM
- **LLM sobrecargado:** Le damos TODO el contexto de una vez:
  - Reglas de agendamiento
  - Reglas de ventas
  - Reglas de placeholders
  - Inventario completo
  - Slots disponibles
  - Promociones
  - RAG context
- **Resultado:** El LLM intenta hacer TODO y se vuelve "robótico"

---

## 🎯 Problema Identificado

### El LLM recibe demasiadas instrucciones imperativas:

```typescript
// Ejemplo del System Prompt actual:
REGLAS DE AGENDAMIENTO (ACCIÓN INMEDIATA):
1. **DETECCIÓN Y ACCIÓN DIRECTA.**
   - Si el usuario menciona un servicio (ej: "sacar muela"), ofrece horarios disponibles inmediatamente.
   - **IMPORTANTE:** USA ÚNICAMENTE los slots que aparecen en "HORARIOS DISPONIBLES" abajo.
   
2. **CONTROL DE LA AGENDA (SLOTS REALES).**
   - Usa EXCLUSIVAMENTE la información de "HORARIOS DISPONIBLES" abajo.
   - **PROHIBIDO INVENTAR HORAS**.
   
3. **AGENDAMIENTO INMEDIATO (SIN CONFIRMACIÓN EXTRA).**
   - **REGLA DE ORO:** NUNCA digas "Cita agendada" si no has ejecutado la herramienta primero.
```

**Efecto:** El modelo se siente "presionado" a vender/agendar incluso cuando el usuario solo saluda.

---

## ✅ Solución Propuesta

### Opción 1: Contexto Condicional (Ya implementado parcialmente)

**Estado actual:**
- ✅ Si `isDraftPrompt = true`, se omiten reglas de personalidad
- ✅ Si `isDraftPrompt = true`, se omiten reglas de agendamiento
- ❌ Pero el inventario completo SIEMPRE se inyecta
- ❌ Las instrucciones de placeholders SIEMPRE se inyectan

**Mejora propuesta:**
```typescript
// Solo inyectar contexto relevante según la intención detectada

if (hasAppointmentIntent && appointmentSettings?.is_enabled) {
    // Inyectar slots y reglas de agendamiento
    systemPrompt += appointmentContext
}

if (hasProductMention || isProductQuery) {
    // Inyectar inventario
    systemPrompt += inventoryContext
}

// Siempre inyectar (técnico):
systemPrompt += placeholderInstructions
```

### Opción 2: Análisis en Dos Fases (Más cercano a n8n)

```typescript
// FASE 1: LLM genera respuesta conversacional (sin reglas agresivas)
const aiResponse = await runAgent(...)

// FASE 2: Análisis post-LLM
const hasPlaceholders = detectPlaceholders(aiResponse)
if (hasPlaceholders) {
    await processPlaceholders(aiResponse)
}

const needsQuote = shouldGenerateQuote(aiResponse, productIds)
if (needsQuote) {
    await createAndSendQuote(...)
}
```

---

## 🛠️ Recomendación Inmediata

### Para el Sandbox (Simulador):
**Objetivo:** Que funcione IGUAL que producción, pero sin WhatsApp real.

**Cambios necesarios:**
1. ✅ **HECHO:** Historial de simulación separado
2. ✅ **HECHO:** Omitir envío de mensajes reales
3. ❌ **PENDIENTE:** El `isDraftPrompt` NO debería cambiar el comportamiento del sistema
   - El Draft Prompt es solo para PROBAR prompts personalizados
   - El sistema debe seguir el mismo flujo de análisis

### Para Reducir el "Robotismo":
1. **Simplificar el System Prompt base:**
   - Quitar instrucciones imperativas ("SIEMPRE", "NUNCA", "PROHIBIDO")
   - Usar lenguaje más suave ("Considera", "Si aplica", "Cuando sea relevante")

2. **Inyección Condicional:**
   - Solo inyectar reglas de agendamiento si `hasAppointmentIntent = true`
   - Solo inyectar inventario completo si el usuario pregunta por productos

3. **Separar Instrucciones Técnicas de Comportamiento:**
   - Placeholders: Instrucciones técnicas (siempre necesarias)
   - Agendamiento/Ventas: Comportamiento (condicional)

---

## 📝 Siguiente Paso

¿Qué prefieres?

**A)** Implementar inyección condicional de contexto (más rápido, menos cambios)
**B)** Refactorizar a análisis en dos fases (más cercano a n8n, más trabajo)
**C)** Solo suavizar el lenguaje del System Prompt (cambio mínimo)

Dime qué opción prefieres y procedo.

## 🔍 Verificación de Aislamiento por Cuenta (Multitenancy)

Se ha verificado el código fuente para confirmar que el sistema opera de forma aislada por cuenta:

1.  **Identificación:** `index.ts` obtiene el `profile.id` basándose en la instancia de WhatsApp o el `user_id` simulado.
2.  **Inventario:** `llm.ts` filtra productos y servicios usando `.eq('user_id', userId)`.
3.  **Citas:** `context.ts` consulta slots disponibles enviando el `user_id` específico.
4.  **Configuración:** `index.ts` recupera `edge_function_config` filtrando por `user_id`.

**Conclusión:** El sistema respeta el aislamiento de datos y configuración entre diferentes comercios/usuarios.
