# GUÍA DE SOLUCIÓN FINAL Y DEFINITIVA

Sigue estos pasos EXACTOS para resolver todos los errores (400 Bad Request y contact_id).

## PASO 1: Corrección de Base de Datos (Supabase)

Tienes dos errores de base de datos pendientes. Ejecuta estos scripts en el **SQL Editor** de Supabase en orden:

### 1.1. Arreglar Tabla "Prompts" (Error 400 al guardar)
Copia y ejecuta el contenido de este archivo:
`supabase/schema/20250103_fix_prompts_table_nuclear.sql`

*(Esto borrará y recreará la tabla prompts correctamente para permitir guardar)*

### 1.2. Arreglar Función de Contactos (Error "column does not exist")
Copia y ejecuta el contenido de este archivo:
`supabase/schema/20250103_simulation_contact_system_v3_FINAL.sql`

*(Esto corrige la función para usar `full_name` y `phone_number` que son los nombres reales de tus columnas)*

---

## PASO 2: Actualización de n8n (CRÍTICO)

Sigues teniendo el error de `contact_id` negativo porque **n8n sigue usando el flujo viejo**.

1. Abre tu workflow de Simulación en n8n.
2. **BÓRRALO COMPLETAMENTE**.
3. Importa el archivo: `n8n/Elina V4 Simulacion COMPLETO.json`
4. **ACTÍVALO** (switch arriba a la derecha en verde).

**Prueba de Fuego:**
Abre el nodo llamado **"buscar contacto1"**.
- ¿Es "Code"? ❌ MAL (Borra y reimporta).
- ¿Es "HTTP Request"? ✅ BIEN.

---

## PASO 3: Verificación Final

1. Ve a tu Dashboard y presiona **Ctrl + F5**.
2. Intenta guardar un cambio en el Prompt → **Debería funcionar (toast verde).**
3. Abre el chat de simulación y escribe "Hola".
4. Verás que en la tabla `contacts` de Supabase aparece un nuevo usuario "Usuario de Simulación".
5. El chat responderá sin errores.
