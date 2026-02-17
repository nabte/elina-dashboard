# 📋 Instrucciones de Migración SQL Pendiente

**IMPORTANTE:** Estas migraciones deben ejecutarse en Supabase SQL Editor

## Migración 1: Agregar columnas a tabla `quotes`

**Estado:** ⚠️ PENDIENTE DE VERIFICACIÓN

**SQL a ejecutar:**
```sql
-- Agregar columnas de descuento e impuesto a la tabla quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 0;
```

**Pasos:**
1. Ir a Supabase Dashboard → SQL Editor
2. Copiar y ejecutar el SQL de arriba
3. Verificar que las columnas se crearon correctamente:
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'quotes' 
   AND column_name IN ('discount_percent', 'tax_percent');
   ```
4. Marcar como completado en este archivo

## Migración 2: Verificar columna `quotes_enabled` en `profiles`

**Estado:** ⚠️ PENDIENTE DE VERIFICACIÓN

**SQL de verificación:**
```sql
-- Verificar si la columna existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'quotes_enabled';
```

**Si NO existe, ejecutar:**
```sql
-- Agregar columna quotes_enabled a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quotes_enabled boolean DEFAULT false;
```

## Checklist de Verificación

- [x] Ejecutada migración de `quotes.discount_percent`
- [x] Ejecutada migración de `quotes.tax_percent`
- [x] Verificada existencia de `profiles.quotes_enabled`
- [ ] Probado funcionamiento de cotizaciones
- [ ] Eliminado archivo `manual_migration_instructions.txt` después de completar

## Notas

- Estas migraciones son **seguras** (usan `IF NOT EXISTS`)
- No afectan datos existentes
- Se pueden ejecutar múltiples veces sin problemas
- Después de ejecutar, actualizar `CRITICOS12.md` con el estado

**Fecha de creación:** 6 de Enero de 2026
**Prioridad:** 🔥 ALTA
