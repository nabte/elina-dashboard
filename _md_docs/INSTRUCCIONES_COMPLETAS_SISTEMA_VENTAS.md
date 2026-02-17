# 📋 INSTRUCCIONES COMPLETAS: Sistema de Ventas Automático

## 🎯 Resumen

Sistema completo para cerrar ventas automáticamente por WhatsApp con:
- ✅ Carrito de compras
- ✅ Cotizaciones y pedidos
- ✅ Seguimiento de pedidos
- ✅ Reportes y analytics
- ✅ Descuentos automáticos
- ✅ Integración con Ryze

---

## 📦 ARCHIVOS A CREAR/EJECUTAR

### 1. SQL Schema
**Archivo:** `supabase/schema/20251125_sistema_ventas_completo.sql`
- 9 tablas nuevas
- 12 funciones SQL
- Triggers y índices

### 2. Edge Functions (5)
- `supabase/functions/extract-products/index.ts`
- `supabase/functions/generate-pdf/index.ts`
- `supabase/functions/process-incoming-message/index.ts`
- `supabase/functions/close-sale/index.ts`
- `supabase/functions/sync-ryze/index.ts`

### 3. Workflows n8n (2)
- `n8n/process-incoming-message-flow.json`
- `n8n/close-sale-flow.json`

---

## 🚀 PASOS DE INSTALACIÓN

### ✅ PASO 1: Ejecutar SQL

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `supabase/schema/20251125_sistema_ventas_completo.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run** o presiona `Ctrl+Enter`
6. Espera a que termine (puede tardar 1-2 minutos)
7. Verifica que no haya errores

**✅ Verificación:**
```sql
-- Ejecuta esto para verificar que las tablas se crearon:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'cart_items', 'orders', 'quotes', 'product_extractions',
  'order_tracking', 'discount_rules', 'discount_applications',
  'ryze_integrations', 'sales_analytics'
);
```

Deberías ver 9 filas.

---

### ✅ PASO 2: Desplegar Edge Functions

**Opción A: Usando Supabase CLI (Recomendado)**

```bash
# Desde la raíz del proyecto
cd supabase/functions

# Desplegar cada función (una por una)
supabase functions deploy extract-products
supabase functions deploy generate-pdf
supabase functions deploy process-incoming-message
supabase functions deploy close-sale
supabase functions deploy sync-ryze
```

**Si no tienes Supabase CLI:**
```bash
# Instalar
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref TU_PROJECT_REF
# (Encuentra tu PROJECT_REF en Supabase Dashboard → Settings → General)
```

**Opción B: Usando Supabase Dashboard**

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Para cada función:
   - Haz clic en **Create Function**
   - Nombre: `extract-products` (o el nombre correspondiente)
   - Copia y pega el contenido del archivo `index.ts`
   - Haz clic en **Deploy**

**✅ Verificación:**
Ve a **Supabase Dashboard** → **Edge Functions** y verifica que las 5 funciones estén listadas.

---

### ✅ PASO 3: Configurar Variables de Entorno

1. Ve a **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Agrega/verifica estas variables:

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|----------------|
| `OPENAI_API_KEY` | Para extracción de productos con IA | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `BUNNY_STORAGE_ZONE_NAME` | Nombre de tu zona de almacenamiento | [Bunny.net Dashboard](https://bunny.net) → Storage Zones |
| `BUNNY_STORAGE_ACCESS_KEY` | Access key de Bunny.net | [Bunny.net Dashboard](https://bunny.net) → Storage Zones → API Key |
| `BUNNY_PULL_ZONE_HOSTNAME` | Hostname de tu Pull Zone | [Bunny.net Dashboard](https://bunny.net) → Pull Zones |
| `HTMLPDFAPI_KEY` | (Opcional) Para generar PDFs | [HTMLPDFAPI](https://htmlpdfapi.com) o usar otra API |

**Nota:** Si ya tienes `BUNNY_STORAGE_ZONE_NAME`, `BUNNY_STORAGE_ACCESS_KEY` y `BUNNY_PULL_ZONE_HOSTNAME` configurados (para otras funciones), no necesitas agregarlos de nuevo.

**✅ Verificación:**
En **Secrets**, deberías ver al menos `OPENAI_API_KEY` y las 3 variables de Bunny.net.

---

### ✅ PASO 4: Importar Workflows n8n

1. Abre **n8n Dashboard**
2. Haz clic en **Workflows** → **Import from File**
3. Importa `n8n/process-incoming-message-flow.json`
4. Importa `n8n/close-sale-flow.json`
5. Para cada workflow:
   - Haz clic en el workflow para abrirlo
   - Configura las variables de entorno:
     - `SUPABASE_URL` → Tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
     - `SUPABASE_SERVICE_KEY` → Tu Service Role Key (en Supabase Dashboard → Settings → API)
     - `WHATSAPP_API_URL` → URL de tu API de WhatsApp
     - `WHATSAPP_API_KEY` → API Key de WhatsApp
   - Haz clic en **Save**
   - Activa el workflow (toggle en la esquina superior derecha)

**✅ Verificación:**
Ambos workflows deberían estar activos (toggle verde) y sin errores.

---

### ✅ PASO 5: Configurar Integración con Ryze (Opcional)

Si quieres integrar con Ryze:

1. En Elina, crea una página de configuración o usa la existente
2. Guarda la configuración en la tabla `ryze_integrations`:

```sql
INSERT INTO public.ryze_integrations (
    user_id,
    ryze_supabase_url,
    ryze_api_key,
    ryze_organization_id,
    sync_products,
    sync_quotes,
    sync_orders,
    is_active
) VALUES (
    'tu-user-id-uuid',
    'https://tu-proyecto-ryze.supabase.co',
    'tu-service-role-key-de-ryze',
    'uuid-de-organizacion-en-ryze',
    true,
    true,
    true,
    true
);
```

**✅ Verificación:**
```sql
SELECT * FROM public.ryze_integrations WHERE user_id = 'tu-user-id';
```

---

## 🧪 PRUEBAS BÁSICAS

### Prueba 1: Extracción de Productos

```bash
# Llamar a la Edge Function desde la consola del navegador o Postman
fetch('https://TU_PROJECT.supabase.co/functions/v1/extract-products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TU_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "Necesito 3 toners CE285A",
    user_id: "tu-user-id",
    contact_id: 123
  })
})
.then(r => r.json())
.then(console.log);
```

**✅ Esperado:** Debería retornar productos detectados.

### Prueba 2: Crear Cotización

```sql
-- Primero agrega productos al carrito
SELECT public.add_to_cart(
    p_contact_id := 123,
    p_user_id := 'tu-user-id',
    p_product_id := 456,
    p_quantity := 3
);

-- Luego crea la cotización
SELECT public.create_quote_from_cart(
    p_contact_id := 123,
    p_user_id := 'tu-user-id',
    p_valid_days := 7
);
```

**✅ Esperado:** Debería retornar un ID de cotización (ej: `COT-20251125-001`).

---

## 📝 NOTAS IMPORTANTES

1. **Bunny.net**: Todos los PDFs se almacenan en `elina/{user_name}/pdfs/quotes/` o `elina/{user_name}/pdfs/orders/`
2. **Descuentos**: Se aplican automáticamente si `auto_apply = true` en `discount_rules`
3. **Stock**: Se actualiza automáticamente al confirmar pedido
4. **Ryze**: La sincronización es opcional y requiere configuración previa
5. **Analytics**: Se calculan en tiempo real usando la función `get_sales_analytics()`

---

## ✅ CHECKLIST FINAL

- [ ] SQL ejecutado correctamente (9 tablas creadas)
- [ ] Edge Functions desplegadas (5 funciones)
- [ ] Variables de entorno configuradas
- [ ] Workflows n8n importados y activos (2 workflows)
- [ ] Integración Ryze configurada (si aplica)
- [ ] Prueba de extracción de productos exitosa
- [ ] Prueba de generación de PDF exitosa
- [ ] Prueba de cierre de venta exitosa

---

## 🐛 TROUBLESHOOTING

### Error: "table already exists"
- **Solución:** Las tablas ya existen. Puedes continuar o eliminarlas primero con `DROP TABLE IF EXISTS ...`

### Error: "function already exists"
- **Solución:** Las funciones ya existen. El SQL usa `CREATE OR REPLACE FUNCTION` así que debería actualizarlas.

### Error: "Edge Function returned a non-2xx status code"
- **Solución:** Revisa los logs en Supabase Dashboard → Edge Functions → Logs

### Error: "KIE_API_KEY is not configured"
- **Solución:** Agrega `KIE_API_KEY` en Supabase Edge Functions Secrets (si usas KIE.ai)

---

**¿Listo para vender automáticamente?** 🚀

**Siguiente paso:** Ejecuta el SQL y luego despliega las Edge Functions.

