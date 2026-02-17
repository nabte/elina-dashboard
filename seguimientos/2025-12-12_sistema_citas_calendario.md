# Sistema de Citas y Calendario - Notas de Implementación

**Fecha:** 12 de diciembre, 2025  
**Estado:** ✅ Implementado y listo para usar

---

## 📋 Lo que se solicitó

Implementar un sistema completo de citas/calendario tipo Calendly que:
- Detecte automáticamente cuando los clientes quieren agendar citas en la conversación
- Permita configurar horarios de atención por día de la semana
- Gestione diferentes tipos de citas con duraciones configurables
- Consulte disponibilidad y ofrezca opciones al cliente
- Funcione con calendario interno (con opción futura de Google Calendar)
- Sea **opcional** - cada usuario decide si activarlo o no

---

## ✅ Lo que ya está implementado

### 1. Base de Datos (SQL)
- ✅ Migración: `supabase/schema/20251215_add_appointment_system.sql`
- ✅ Tablas creadas: `appointment_settings`, `appointment_types`, `appointment_hours`
- ✅ Tabla `meetings` extendida con campos de citas
- ✅ Funciones SQL: `detect_appointment_intent()`, `get_available_slots()`

### 2. Edge Functions
- ✅ `supabase/functions/detect-appointment-intent/index.ts` - Detecta intenciones
- ✅ `supabase/functions/get-available-slots/index.ts` - Obtiene horarios disponibles
- ✅ `supabase/functions/create-appointment/index.ts` - Crea citas

### 3. Frontend
- ✅ `settings.html` - Sección de configuración de citas
- ✅ `settings.js` - Funciones para gestionar configuración
- ✅ `dashboard.html` - Panel de visualización de citas
- ✅ `appointments.js` - Módulo para mostrar citas agendadas
- ✅ `app.js` - Importa el módulo de citas

### 4. Workflow n8n
- ✅ `n8n/Elina V4 (1).json` - Workflow modificado con detección de citas

---

## 🔧 Qué debes hacer AHORA

### Paso 1: Aplicar la migración SQL
**Archivo:** `supabase/schema/20251215_add_appointment_system.sql`

**Acción:**
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia y pega el contenido del archivo
4. Ejecuta la migración

**Link:** `supabase/schema/20251215_add_appointment_system.sql`

---

### Paso 2: Desplegar Edge Functions
**Archivos:**
- `supabase/functions/detect-appointment-intent/index.ts`
- `supabase/functions/get-available-slots/index.ts`
- `supabase/functions/create-appointment/index.ts`

**Acción:**
```bash
# Desde la raíz del proyecto
supabase functions deploy detect-appointment-intent
supabase functions deploy get-available-slots
supabase functions deploy create-appointment
```

O desde Supabase Dashboard → Edge Functions → Deploy

---

### Paso 3: Importar workflow en n8n
**Archivo:** `n8n/Elina V4 (1).json`

**Acción:**
1. Abre n8n
2. Ve a Workflows
3. Haz clic en "Import from File"
4. Selecciona `n8n/Elina V4 (1).json`
5. Reemplaza el workflow "Elina V4" existente (o renómbralo)

**Link:** `n8n/Elina V4 (1).json`

**Nota:** El workflow ya tiene los nodos integrados:
- "Detectar Intención de Cita" (después de detección crítica)
- "IF: ¿Tiene Intención de Cita?"
- "Obtener Slots Disponibles"
- "Formatear Disponibilidad"
- "Agregar Contexto de Citas1"

---

### Paso 4: Probar el sistema

1. **Activar en Settings:**
   - Ve a Dashboard → Configuración
   - Busca "Sistema de Citas y Calendario"
   - Activa el toggle "Activar sistema de citas"
   - Configura horarios (ej: Lunes a Viernes 9am-6pm)
   - Agrega tipos de citas (ej: "Consulta inicial" 60 min)
   - Guarda

2. **Probar detección:**
   - Envía mensaje de prueba: "Quiero agendar una cita"
   - La IA debe detectar y ofrecer horarios disponibles

3. **Ver citas agendadas:**
   - Ve a Dashboard → Citas
   - Deberías ver las citas que se agenden

---

## 📁 Archivos modificados/creados

### Nuevos archivos:
- `supabase/schema/20251215_add_appointment_system.sql` - Migración SQL
- `supabase/functions/detect-appointment-intent/index.ts` - Edge Function
- `supabase/functions/get-available-slots/index.ts` - Edge Function
- `supabase/functions/create-appointment/index.ts` - Edge Function
- `appointments.js` - Módulo frontend
- `n8n/GUIA_INTEGRACION_SISTEMA_CITAS.md` - Guía de integración
- `n8n/GUIA_PASO_A_PASO_ELINA_V4_CITAS.md` - Guía paso a paso
- `GUIA_PROMPT_IA_CITAS.md` - Guía para prompts de IA

### Archivos modificados:
- `settings.html` - Agregada sección de citas
- `settings.js` - Funciones de gestión de citas
- `dashboard.html` - Panel de visualización de citas
- `app.js` - Importa appointments.js
- `n8n/Elina V4 (1).json` - Workflow con detección de citas

---

## 🎯 Flujo completo

```
Cliente: "Quiero agendar una cita"
  ↓
n8n → Detectar Intención Crítica (no es crítico)
  ↓
n8n → Detectar Intención de Cita (✅ detectado)
  ↓
n8n → Obtener Slots Disponibles
  ↓
n8n → Formatear Disponibilidad
  ↓
n8n → AI Agent (con contexto de disponibilidad)
  ↓
IA: "Tengo estos horarios disponibles: 1. 10:00-11:00, 2. 14:00-15:00..."
  ↓
Cliente: "El de las 2pm está bien"
  ↓
(Requiere lógica adicional para detectar confirmación y crear cita)
```

---

## ⚠️ Importante

1. **El sistema es OPCIONAL:** Solo funciona si el usuario activa el toggle en Settings
2. **La detección es automática:** No requiere configuración adicional en n8n (ya está integrado)
3. **Google Calendar:** Está preparado pero por ahora funciona solo con calendario interno
4. **Creación automática de citas:** Falta agregar lógica para detectar cuando el cliente confirma un horario específico (futuro)

---

## 🔗 Links rápidos

- Migración SQL: `supabase/schema/20251215_add_appointment_system.sql`
- Edge Functions: `supabase/functions/`
- Workflow n8n: `n8n/Elina V4 (1).json`
- Configuración UI: `settings.html` (línea ~116)
- Vista de citas: `dashboard.html` (línea ~1025)
- Guía integración: `n8n/GUIA_INTEGRACION_SISTEMA_CITAS.md`

---

## 📝 Próximos pasos (opcional)

1. Agregar detección de confirmación de horario para crear cita automáticamente
2. Integrar con Google Calendar (ya está preparado el código)
3. Agregar recordatorios de citas
4. Vista de calendario mensual

---

**Última actualización:** 12 de diciembre, 2025

