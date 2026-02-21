# Legacy - Archivos Antiguos y No Utilizados

**Fecha de migración:** 2026-02-19
**Proyecto:** ELina IA - CRM con WhatsApp e Inteligencia Artificial

---

## 📋 Descripción

Esta carpeta contiene archivos que ya no se utilizan activamente en el proyecto principal. Se han movido aquí para mantener el código base limpio y organizado, pero se conservan por si se necesitan en el futuro.

**⚠️ IMPORTANTE:** Los archivos en esta carpeta NO están en uso activo y NO deben ser importados en el código principal.

---

## 📁 Estructura de Carpetas

### `backups/`
Copias de seguridad antiguas de archivos del proyecto.

**Contenido:**
- `BACKUP_PRE_ANALISIS/` - Backup completo del proyecto anterior al análisis de optimización
- `auth.js.backup` - Backup antiguo del archivo de autenticación
- `app.js.wizard-backup-20260215_213348` - Backup del archivo principal con timestamp
- `settings.html.backup` (public/) - Backup de la página de configuración
- `settings.html.backup` (dist/) - Backup compilado de la página de configuración

**¿Por qué están aquí?**
Estos archivos son backups automáticos y manuales creados durante el desarrollo. El código actual ya incluye todas las mejoras necesarias, por lo que estos backups ya no son necesarios para el desarrollo activo.

**¿Se pueden eliminar?**
Sí, después de verificar que no se necesita recuperar código antiguo. Se recomienda mantenerlos por al menos 6 meses antes de eliminarlos permanentemente.

---

### `old-versions/`
Versiones anteriores de módulos que han sido reemplazados por versiones más recientes.

**Contenido:**
- `flow-builder.js` (v1) - 1,765 líneas - Primera versión del constructor de flujos
- `flow-builder-v2.js` (v2) - 1,809 líneas - Segunda versión del constructor de flujos
- `prompt-training-fixed.js` - 1,658 líneas - Versión anterior del módulo de entrenamiento de prompts

**¿Por qué están aquí?**
Actualmente se usa:
- `flow-builder-v3.js` (v3) - La versión actual con 5,483 líneas, mucho más completa y robusta
- `prompt-training.js` - La versión actual del módulo de entrenamiento

Las versiones v1 y v2 del flow-builder ya no se importan en ningún archivo activo del proyecto.

**¿Se pueden eliminar?**
Potencialmente sí, pero se recomienda revisar flow-builder-v3.js para confirmar que todas las funcionalidades de v1 y v2 están incluidas. Una vez confirmado, se pueden eliminar de forma segura.

---

### `dev-scripts/`
Scripts de desarrollo, testing y diagnóstico que se utilizaron durante el desarrollo pero no forman parte del código de producción.

**Contenido:**
- `test-get-all-mode.js` (12K) - Script para testing de modo "get all"
- `test-get-all-simple.js` (8.3K) - Versión simplificada del test anterior
- `activate-mode-and-test.js` (7.9K) - Script de activación y prueba
- `check_meeting.js` (844 bytes) - Verificación de reuniones
- `diagnose_calendar.js` (490 bytes) - Diagnóstico del calendario
- `verify_appointment.js` (3.6K) - Verificación de citas
- `find-flow.js` (1.2K) - Búsqueda de flujos
- `find-all-flows.js` (2.0K) - Búsqueda de todos los flujos
- `remove_quotes.js` (802 bytes) - Script para eliminar comillas
- `remove_quotes_section.js` (920 bytes) - Eliminar sección de cotizaciones

**¿Por qué están aquí?**
Estos scripts fueron utilizados durante el desarrollo y debugging, pero no son parte del flujo normal de la aplicación. Son herramientas de diagnóstico y testing temporal.

**¿Se pueden eliminar?**
Sí, después de confirmar que ya no se necesitan para debugging. Se recomienda mantenerlos temporalmente en caso de que surjan problemas similares que requieran diagnóstico.

---

### `old-docs/`
Documentación antigua de APIs y referencias que ya no son relevantes.

**Contenido:**
- `DocumentacionesAPIS/` - Documentación de APIs antiguas o deprecadas

**¿Por qué están aquí?**
La documentación actual está en la carpeta `docs/` en la raíz del proyecto. Esta carpeta contiene referencias antiguas que pueden no estar actualizadas.

**¿Se pueden eliminar?**
Sí, después de verificar que toda la información relevante está en la nueva documentación. Revisar si hay alguna referencia histórica útil antes de eliminar.

---

### `supabase-duplicates/`
Carpetas duplicadas de Edge Functions de Supabase.

**Contenido:**
- `sync-contacts copy/` - Duplicado obvio de la función sync-contacts

**¿Por qué están aquí?**
Esta carpeta es claramente un duplicado accidental (probablemente creado durante copy-paste o exploración de archivos).

**¿Se pueden eliminar?**
Sí, de forma segura. Es un duplicado obvio y no está referenciado en ningún código.

---

### `deploy 2025/`
Archivos de deployment antiguos y pre-compilados.

**Contenido:**
Archivos de build y deployment del año 2025.

**¿Por qué está aquí?**
Los builds actuales se generan automáticamente con `vite build` y se almacenan en `dist/`. Esta carpeta contiene builds antiguos que ya no son necesarios.

**¿Se pueden eliminar?**
Sí, de forma segura después de confirmar que los builds actuales funcionan correctamente.

---

## 🔍 Archivos Activos que SÍ se Usan

Para referencia, estos archivos **NO están en legacy** y son parte activa del proyecto:

### Archivos JavaScript Principales (Root)
- ✅ `app.js` (4,100 líneas) - Aplicación principal
- ✅ `flow-builder-v3.js` (5,483 líneas) - Constructor de flujos ACTUAL
- ✅ `contacts.js` (3,977 líneas) - Gestión de contactos
- ✅ `prompt-training.js` (3,096 líneas) - Entrenamiento de prompts ACTUAL
- ✅ `settings.js` (3,361 líneas) - Configuración
- ✅ `appointments.js` (2,594 líneas) - Sistema de citas
- ✅ `products.js` (2,269 líneas) - Gestión de productos
- ✅ `chats.js` (2,208 líneas) - Chats con WhatsApp
- ✅ `designer-ai.js` (2,076 líneas) - Diseñador de personalidades IA
- ✅ Y 14+ módulos más importados activamente en app.js

### Supabase Edge Functions (83 funciones activas)
Todas las funciones en `supabase/functions/` están activas y en uso:
- `elina-v6/` - Motor IA actual (versión 6)
- `process-incoming-message/` - Procesamiento de mensajes
- `detect-appointment-intent/` - Detección de intención de citas
- `create-appointment/` - Creación de citas
- Y 79+ funciones más...

**Nota:** Las funciones de Supabase NO se movieron a legacy, todas permanecen activas.

---

## 📊 Estadísticas de Limpieza

### Archivos Movidos a Legacy:
- **Backups:** 5 archivos/carpetas
- **Versiones antiguas:** 3 archivos
- **Scripts de desarrollo:** 10 archivos
- **Documentación antigua:** 1 carpeta
- **Duplicados de Supabase:** 1 carpeta
- **Deploy antiguo:** 1 carpeta

### Total: ~21 archivos/carpetas movidas

### Espacio liberado en root:
- ~15,000+ líneas de código obsoleto removidas del directorio principal
- Estructura más limpia y fácil de navegar
- Imports más claros (sin conflictos con versiones antiguas)

---

## ⚠️ Recomendaciones

### Antes de Eliminar Permanentemente:

1. **Backups (backups/):**
   - Esperar 6 meses antes de eliminar
   - Verificar que no hay código único que se necesite recuperar

2. **Versiones Antiguas (old-versions/):**
   - Revisar flow-builder-v3.js para confirmar que incluye todas las funcionalidades
   - Comparar prompt-training.js con prompt-training-fixed.js
   - Una vez confirmado, se pueden eliminar

3. **Scripts de Desarrollo (dev-scripts/):**
   - Mantener por 3 meses en caso de problemas similares
   - Si no se usan, eliminar después

4. **Documentación Antigua (old-docs/):**
   - Revisar si hay información histórica valiosa
   - Migrar cualquier dato útil a docs/ actual
   - Eliminar después

5. **Duplicados y Deploy:**
   - Se pueden eliminar inmediatamente de forma segura

---

## 📝 Historial de Cambios

### 2026-02-19 - Migración Inicial
- Creación de la carpeta legacy
- Migración de 21 archivos/carpetas obsoletas
- Organización en subcarpetas temáticas
- Creación de esta documentación

---

## 🔗 Referencias

- **Análisis completo del proyecto:** Disponible en los logs de Claude Code
- **Estructura actual:** Ver archivo raíz del proyecto
- **Documentación técnica actual:** `docs/` en la raíz del proyecto

---

## ❓ FAQ

**P: ¿Puedo usar código de esta carpeta?**
R: No se recomienda. El código aquí es obsoleto y puede tener bugs o incompatibilidades con la versión actual.

**P: ¿Debo hacer backup de esta carpeta?**
R: Sí, si haces backup del proyecto completo. No la excluyas del .gitignore si usas Git.

**P: ¿Cuándo puedo eliminar esta carpeta?**
R: Después de 6 meses de verificar que no se necesita nada de aquí. Se recomienda revisar archivo por archivo antes de eliminar.

**P: ¿Se pueden restaurar archivos de aquí?**
R: Sí, simplemente copia el archivo de vuelta a su ubicación original. Pero asegúrate de que no cause conflictos con el código actual.

---

**Última actualización:** 2026-02-19
**Responsable:** Claude Code - Limpieza y Organización del Proyecto ELina IA
