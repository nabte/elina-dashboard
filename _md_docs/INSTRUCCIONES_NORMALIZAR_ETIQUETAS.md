# 📋 INSTRUCCIONES: Normalizar y Unificar Etiquetas

## ⚠️ PROBLEMA
Tienes etiquetas duplicadas que solo difieren en capitalización:
- "No responde", "no responde", "NO RESPONDE"
- "nuevo cliente", "Nuevo cliente", "NUEVO CLIENTE"
- "ignorar", "Ignorar", "IGNORAR"

Estas etiquetas duplicadas crean confusión y ocupan espacio innecesario.

## ✅ SOLUCIÓN

### 1️⃣ EJECUTAR SQL EN SUPABASE

**Archivo:** `supabase/schema/20251125_unify_duplicate_labels.sql`

**Cómo ejecutarlo:**
1. Ve al **Dashboard de Supabase**
2. Abre el **SQL Editor**
3. Copia y pega **TODO el contenido** del archivo
4. Haz clic en **RUN**

**¿Qué hace este archivo?**
- ✅ Crea función `normalize_label_name_to_title_case()` para normalizar nombres
- ✅ Crea función `normalize_all_labels_to_title_case()` para normalizar todas las etiquetas de un usuario
- ✅ Crea función `unify_duplicate_labels()` para unificar duplicados
- ✅ Crea función `normalize_and_unify_all_labels()` que hace ambas cosas
- ✅ Crea función `normalize_and_unify_all_labels_all_users()` para todos los usuarios
- ✅ Crea trigger para normalizar automáticamente al insertar nuevas etiquetas
- ✅ **NO ejecuta la normalización automáticamente** (tú decides cuándo)

### 2️⃣ NORMALIZAR Y UNIFICAR ETIQUETAS EXISTENTES

**Opción A: Para un usuario específico**

```sql
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario
SELECT * FROM public.normalize_and_unify_all_labels('USER_ID_AQUI');
```

**Opción B: Para TODOS los usuarios (RECOMENDADO)**

```sql
SELECT * FROM public.normalize_and_unify_all_labels_all_users();
```

**⚠️ IMPORTANTE:** 
- Haz un **backup** antes de ejecutar
- Revisa los resultados antes de confirmar
- La función retorna información sobre qué se normalizó y unificó

### 3️⃣ VERIFICAR RESULTADOS

Después de ejecutar, verifica:

```sql
-- Ver etiquetas duplicadas restantes (debería estar vacío)
SELECT 
  user_id,
  lower(trim(name)) as normalized_name,
  array_agg(name ORDER BY name) as variations,
  count(*) as count
FROM public.labels
GROUP BY user_id, lower(trim(name))
HAVING count(*) > 1;

-- Ver etiquetas que no están en Title Case (debería estar vacío)
SELECT id, name, user_id
FROM public.labels
WHERE name != (
  upper(left(trim(name), 1)) || lower(substring(trim(name) from 2))
);
```

### 4️⃣ PREVENCIÓN FUTURA

El código JavaScript y el trigger de Supabase ya están actualizados para:
- ✅ Normalizar nombres al crear etiquetas (primera letra mayúscula, resto minúsculas)
- ✅ Verificar duplicados antes de insertar
- ✅ Usar nombres normalizados consistentemente

**Archivos JavaScript actualizados:**
- `contacts.js` - Normaliza al crear etiquetas
- `smart-labels.js` - Normaliza al crear etiquetas (incluyendo "Ignorar")

## 📝 RESUMEN

### Archivos SQL a ejecutar:
1. ✅ `supabase/schema/20251125_unify_duplicate_labels.sql` - Crear funciones
2. ✅ Ejecutar `normalize_and_unify_all_labels_all_users()` - Normalizar y unificar duplicados existentes

### Archivos JavaScript (ya actualizados):
- ✅ `contacts.js` - Normaliza nombres al crear
- ✅ `smart-labels.js` - Normaliza nombres al crear (incluyendo "Ignorar")

## 🔍 CÓMO FUNCIONA

1. **Normalización:**
   - Convierte todas las etiquetas a formato "Title Case" (primera mayúscula, resto minúsculas)
   - Ejemplo: "nuevo cliente" → "Nuevo cliente", "NO RESPONDE" → "No responde"

2. **Unificación:**
   - Encuentra todas las variaciones de una etiqueta (ej: "No responde", "no responde", "NO RESPONDE")
   - Elige un nombre canónico en Title Case (ej: "No responde")
   - Actualiza todos los contactos para usar el nombre canónico
   - Elimina las etiquetas duplicadas

3. **Prevención:**
   - Al crear una etiqueta, se normaliza automáticamente a "Title Case"
   - Se verifica si ya existe antes de insertar
   - El trigger previene duplicados a nivel de base de datos

## ✅ CHECKLIST

- [ ] SQL ejecutado en Supabase
- [ ] Función `normalize_and_unify_all_labels_all_users()` ejecutada
- [ ] Verificado que no quedan duplicados
- [ ] Verificado que todas las etiquetas están en Title Case
- [ ] Código JavaScript actualizado (ya está hecho)

**¡Listo! Tus etiquetas estarán normalizadas, unificadas y no se crearán más duplicados.** 🚀

