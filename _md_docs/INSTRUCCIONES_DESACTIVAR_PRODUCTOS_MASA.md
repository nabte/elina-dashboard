# Instrucciones: Desactivar Productos en Masa

## Resumen
Se ha implementado la funcionalidad para desactivar/activar productos en masa por etiqueta o todos según estado, similar a la funcionalidad de contactos.

## Cambios Realizados

### 1. Base de Datos (SQL)
**Archivo:** `supabase/schema/20251125_add_products_bulk_deactivate.sql`

**Cambios:**
- Agregado campo `is_active` (BOOLEAN, default: true) a la tabla `products`
- Agregado campo `labels` (TEXT[]) a la tabla `products` para etiquetas
- Creados índices para mejorar el rendimiento de búsquedas
- Creada función SQL `bulk_update_products_status()` para actualizaciones masivas

**Ejecutar en Supabase:**
```sql
-- Ejecutar el archivo completo en el SQL Editor de Supabase
```

### 2. Frontend (HTML)
**Archivo:** `products.html`

**Cambios:**
- Agregados filtros de etiqueta y estado
- Agregados botones "Desactivar visibles" y "Activar visibles"
- Agregadas columnas "Estado" y "Etiquetas" en la tabla

### 3. Frontend (JavaScript)
**Archivo:** `products.js`

**Cambios:**
- Implementada función `loadLabels()` para cargar etiquetas disponibles
- Implementada función `filterProducts()` mejorada con filtros de etiqueta y estado
- Implementada función `handleBulkStatusChange()` para desactivar/activar en masa
- Actualizada función `renderProductsTable()` para mostrar estado y etiquetas
- Agregados event listeners para filtros y botones de acción masiva

## Cómo Usar

### Paso 1: Ejecutar el SQL
1. Abre el SQL Editor en Supabase
2. Copia y pega el contenido de `supabase/schema/20251125_add_products_bulk_deactivate.sql`
3. Ejecuta el script

### Paso 2: Usar la Funcionalidad

#### Filtrar por Etiqueta
1. En el panel de Productos, usa el dropdown "Todas las etiquetas"
2. Selecciona una etiqueta específica para filtrar productos

#### Filtrar por Estado
1. Usa el dropdown "Todos los estados"
2. Selecciona "Activos" o "Inactivos"

#### Desactivar/Activar en Masa
1. Aplica los filtros deseados (etiqueta, estado, búsqueda)
2. Haz clic en:
   - **"Desactivar visibles"** para desactivar todos los productos que coincidan con los filtros
   - **"Activar visibles"** para activar todos los productos que coincidan con los filtros
3. Confirma la acción en el diálogo

### Ejemplos de Uso

#### Ejemplo 1: Desactivar todos los productos con etiqueta "temporada"
1. Selecciona "temporada" en el filtro de etiquetas
2. Haz clic en "Desactivar visibles"
3. Confirma

#### Ejemplo 2: Activar todos los productos inactivos
1. Selecciona "Inactivos" en el filtro de estado
2. Haz clic en "Activar visibles"
3. Confirma

#### Ejemplo 3: Desactivar productos específicos por búsqueda
1. Busca productos por nombre, SKU o precio
2. Aplica filtros adicionales si es necesario
3. Haz clic en "Desactivar visibles"
4. Confirma

## Notas Importantes

1. **Por defecto, todos los productos existentes estarán activos** (`is_active = true`)
2. **Las etiquetas se cargan automáticamente** de los productos existentes
3. **Los productos inactivos se muestran con opacidad reducida** en la tabla
4. **La función SQL respeta los filtros de usuario** (solo actualiza productos del usuario actual)
5. **Los filtros se pueden combinar** (búsqueda + etiqueta + estado)

## Solución de Problemas

### Los productos no se desactivan
- Verifica que hayas ejecutado el SQL en Supabase
- Verifica que los productos coincidan con los filtros aplicados
- Revisa la consola del navegador para errores

### Las etiquetas no aparecen
- Asegúrate de que los productos tengan el campo `labels` poblado
- Recarga la página después de ejecutar el SQL

### Los filtros no funcionan
- Verifica que el JavaScript se haya cargado correctamente
- Revisa la consola del navegador para errores

## Próximos Pasos (Opcional)

Si deseas agregar etiquetas a productos existentes:
1. Edita un producto individualmente
2. Agrega etiquetas en el campo correspondiente (si se implementa en el modal)
3. O usa una actualización SQL masiva:

```sql
UPDATE products 
SET labels = ARRAY['etiqueta1', 'etiqueta2'] 
WHERE user_id = 'tu-user-id' AND product_name ILIKE '%patrón%';
```

