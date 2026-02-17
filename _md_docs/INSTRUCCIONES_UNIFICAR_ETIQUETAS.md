# 📋 INSTRUCCIONES: Unificar Etiquetas Duplicadas

## ⚠️ PROBLEMA
Tienes etiquetas duplicadas que solo difieren en capitalización:
- "No responde" y "no responde" y "NO RESPONDE"
- "nuevo cliente", "Nuevo cliente" y "NUEVO CLIENTE"
- "ignorar" e "Ignorar"

## ✅ SOLUCIÓN

### 1️⃣ EJECUTAR SQL EN SUPABASE

**Archivo:** `supabase/schema/20251125_unify_duplicate_labels.sql`

**Cómo ejecutarlo:**
1. Ve al **Dashboard de Supabase**
2. Abre el **SQL Editor**
3. Copia y pega **TODO el contenido** del archivo
4. Haz clic en **RUN**

**¿Qué hace este archivo?**
- ✅ Crea función `unify_duplicate_labels()` para unificar duplicados de un usuario
- ✅ Crea función `unify_all_duplicate_labels()` para unificar todos los usuarios
- ✅ Crea función `get_canonical_label_name()` para obtener el nombre canónico
- ✅ Crea trigger para prevenir duplicados futuros
- ✅ **NO ejecuta la unificación automáticamente** (tú decides cuándo)

### 2️⃣ UNIFICAR ETIQUETAS EXISTENTES

**Opción A: Unificar para un usuario específico**

```sql
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario
SELECT * FROM public.unify_duplicate_labels('USER_ID_AQUI');
```

**Opción B: Unificar para TODOS los usuarios (recomendado)**

```sql
SELECT * FROM public.unify_all_duplicate_labels();
```

**⚠️ IMPORTANTE:** 
- Haz un **backup** antes de ejecutar
- Revisa los resultados antes de confirmar
- La función retorna información sobre qué se unificó

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
```

### 4️⃣ PREVENCIÓN FUTURA

El código JavaScript ya está actualizado para:
- ✅ Normalizar nombres al crear etiquetas (primera letra mayúscula)
- ✅ Verificar duplicados antes de insertar
- ✅ Usar nombres normalizados consistentemente

**Archivos JavaScript actualizados:**
- `contacts.js` - Normaliza al crear etiquetas
- `smart-labels.js` - Normaliza al crear etiquetas

## 📝 RESUMEN

### Archivos SQL a ejecutar:
1. ✅ `supabase/schema/20251125_unify_duplicate_labels.sql` - Crear funciones
2. ✅ Ejecutar `unify_all_duplicate_labels()` - Unificar duplicados existentes

### Archivos JavaScript (ya actualizados):
- ✅ `contacts.js` - Normaliza nombres al crear
- ✅ `smart-labels.js` - Normaliza nombres al crear

## 🔍 CÓMO FUNCIONA

1. **Unificación:**
   - Encuentra todas las variaciones de una etiqueta (ej: "No responde", "no responde", "NO RESPONDE")
   - Elige un nombre canónico (prefiere mayúscula inicial: "No responde")
   - Actualiza todos los contactos para usar el nombre canónico
   - Elimina las etiquetas duplicadas

2. **Prevención:**
   - Al crear una etiqueta, se normaliza a "Primera letra mayúscula"
   - Se verifica si ya existe antes de insertar
   - El trigger previene duplicados a nivel de base de datos

## ✅ CHECKLIST

- [ ] SQL ejecutado en Supabase
- [ ] Función `unify_all_duplicate_labels()` ejecutada
- [ ] Verificado que no quedan duplicados
- [ ] Código JavaScript actualizado (ya está hecho)

**¡Listo! Tus etiquetas estarán unificadas y no se crearán más duplicados.** 🚀

