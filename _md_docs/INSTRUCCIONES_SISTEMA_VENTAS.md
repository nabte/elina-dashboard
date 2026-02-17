# 📋 Instrucciones: Sistema Completo de Ventas Automático

## 🎯 Resumen

Sistema completo para cerrar ventas automáticamente por WhatsApp, con seguimiento de pedidos, reportes, descuentos automáticos e integración con Ryze.

---

## 📦 Archivos a Ejecutar

### 1. SQL Schema
- **`supabase/schema/20251125_sistema_ventas_completo.sql`**

### 2. Edge Functions (5)
- **`supabase/functions/extract-products/index.ts`**
- **`supabase/functions/generate-pdf/index.ts`**
- **`supabase/functions/process-incoming-message/index.ts`**
- **`supabase/functions/close-sale/index.ts`**
- **`supabase/functions/sync-ryze/index.ts`**

### 3. Workflows n8n (2)
- **`n8n/process-incoming-message-flow.json`**
- **`n8n/close-sale-flow.json`**

---

## 🚀 PASOS DE INSTALACIÓN

### ✅ PASO 1: Ejecutar SQL

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido completo de `supabase/schema/20251125_sistema_ventas_completo.sql`
3. Haz clic en **Run** o presiona `Ctrl+Enter`
4. Verifica que no haya errores
5. Verifica que se crearon las tablas:
   - `cart_items`
   - `orders`
   - `quotes`
   - `product_extractions`
   - `order_tracking`
   - `discount_rules`
   - `discount_applications`
   - `ryze_integrations`
   - `sales_analytics`

**✅ Listo cuando:** Veas "Success. No rows returned" o similar.

---

### ✅ PASO 2: Desplegar Edge Functions

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
# Ir a la carpeta de funciones
cd supabase/functions

# Desplegar cada función (una por una)
supabase functions deploy extract-products
supabase functions deploy generate-pdf
supabase functions deploy process-incoming-message
supabase functions deploy close-sale
supabase functions deploy sync-ryze
```

**Si no tienes `supabase` CLI instalado:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
```

**✅ Listo cuando:** Cada función muestre "Deployed function extract-products" (o el nombre correspondiente).

---

### ✅ PASO 3: Configurar Variables de Entorno

1. Ve a **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Agrega/verifica estas variables:

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|----------------|
| `OPENAI_API_KEY` | Para extracción de productos con IA | [OpenAI](https://platform.openai.com/api-keys) |
| `BUNNY_STORAGE_ZONE_NAME` | Nombre de tu zona de almacenamiento | [Bunny.net Dashboard](https://bunny.net) |
| `BUNNY_STORAGE_ACCESS_KEY` | Access key de Bunny.net | [Bunny.net Dashboard](https://bunny.net) |
| `BUNNY_PULL_ZONE_HOSTNAME` | Hostname de tu Pull Zone | [Bunny.net Dashboard](https://bunny.net) |
| `HTMLPDFAPI_KEY` | (Opcional) Para generar PDFs | [HTMLPDFAPI](https://htmlpdfapi.com) o usar otra API |

**Nota:** Si ya tienes `BUNNY_STORAGE_ZONE_NAME`, `BUNNY_STORAGE_ACCESS_KEY` y `BUNNY_PULL_ZONE_HOSTNAME` configurados (para otras funciones), no necesitas agregarlos de nuevo.

**✅ Listo cuando:** Todas las variables estén configuradas.

---

### ✅ PASO 4: Importar Workflows n8n

1. Abre **n8n Dashboard**
2. Haz clic en **Workflows** → **Import from File**
3. Importa `n8n/process-incoming-message-flow.json`
4. Importa `n8n/close-sale-flow.json`
5. Para cada workflow:
   - Configura las variables de entorno en n8n:
     - `SUPABASE_URL` → Tu URL de Supabase
     - `SUPABASE_SERVICE_KEY` → Tu Service Role Key
     - `WHATSAPP_API_URL` → URL de tu API de WhatsApp
     - `WHATSAPP_API_KEY` → API Key de WhatsApp
   - Activa el workflow (toggle en la esquina superior derecha)

**✅ Listo cuando:** Ambos workflows estén activos y sin errores.

---

### ✅ PASO 5: Configurar Integración con Ryze (Opcional)

Si quieres integrar con Ryze:

1. En Elina, ve a **Configuración** → **Integraciones** (o crea la página si no existe)
2. Ingresa:
   - **URL de Supabase de Ryze** → `https://tu-proyecto-ryze.supabase.co`
   - **API Key de Ryze** → Service Role Key de Ryze
   - **ID de Organización en Ryze** → UUID de la organización
3. Activa la sincronización

**✅ Listo cuando:** La integración esté guardada en la tabla `ryze_integrations`.

---

## 🧪 PRUEBAS

### Prueba 1: Extracción de Productos

1. Envía un mensaje de prueba: "Necesito 3 toners CE285A"
2. Verifica que se detecten los productos en `product_extractions`
3. Verifica que se agreguen al carrito en `cart_items`

### Prueba 2: Generación de PDF

1. Crea una cotización desde el carrito
2. Llama a la Edge Function `generate-pdf` con `type: "quote"` y `quote_id`
3. Verifica que el PDF se genere y se suba a Bunny.net
4. Verifica que la URL esté en `quotes.pdf_url`

### Prueba 3: Cierre de Venta

1. Confirma un pedido desde una cotización
2. Verifica que se cree la orden en `orders`
3. Verifica que el stock se actualice en `products`
4. Verifica que se cree el registro de seguimiento en `order_tracking`

---

## 📊 Uso de Funciones SQL

### Crear Cotización desde Carrito

```sql
SELECT public.create_quote_from_cart(
    p_contact_id := 123,  -- ID del contacto
    p_user_id := 'uuid-del-usuario',
    p_valid_days := 7,     -- Días de validez
    p_terms := 'Términos y condiciones'
);
```

### Confirmar Pedido desde Cotización

```sql
SELECT public.confirm_order_from_quote(
    p_quote_id := 'COT-20251125-001',
    p_payment_method := 'credito',
    p_shipping_address := 'Dirección de envío'
);
```

### Actualizar Seguimiento de Pedido

```sql
SELECT public.update_order_tracking(
    p_order_id := 'ORD-20251125-001',
    p_status := 'shipped',
    p_description := 'Pedido enviado',
    p_location := 'Ciudad de México',
    p_estimated_delivery := '2025-11-27 18:00:00'::timestamptz
);
```

### Obtener Analytics

```sql
SELECT public.get_sales_analytics(
    p_user_id := 'uuid-del-usuario',
    p_start_date := '2025-11-01'::date,
    p_end_date := '2025-11-30'::date,
    p_metric_type := 'daily'
);
```

---

## 🔧 Configuración Adicional

### Crear Regla de Descuento

```sql
INSERT INTO public.discount_rules (
    user_id,
    name,
    rule_type,
    discount_type,
    discount_value,
    min_quantity,
    auto_apply
) VALUES (
    'user-uuid',
    'Descuento por cantidad',
    'quantity',
    'percentage',
    10,  -- 10% de descuento
    5,   -- Mínimo 5 productos
    true -- Aplicar automáticamente
);
```

---

## 🐛 Troubleshooting

### Error: "Producto no encontrado"
- **Causa:** El producto no existe en la tabla `products`
- **Solución:** Verifica que los productos estén en `products` con el `user_id` correcto

### Error: "Failed to upload PDF to Bunny.net"
- **Causa:** Credenciales incorrectas o zona no configurada
- **Solución:** Verifica las variables de entorno de Bunny.net

### Error: "KIE_API_KEY is not configured"
- **Causa:** Falta la API key de KIE.ai
- **Solución:** Agrega `KIE_API_KEY` en Supabase Edge Functions Secrets

### Error: "Edge Function returned a non-2xx status code"
- **Causa:** La función falló internamente
- **Solución:** Revisa los logs en Supabase Dashboard → Edge Functions → Logs

### PDF no se genera
- **Causa:** Falta `HTMLPDFAPI_KEY` o la API no está disponible
- **Solución:** 
  - Configura `HTMLPDFAPI_KEY` en Supabase
  - O modifica `generate-pdf/index.ts` para usar otra API de PDF

---

## 📝 Notas Importantes

1. **Bunny.net**: Todos los PDFs se almacenan en `elina/{user_name}/pdfs/quotes/` o `elina/{user_name}/pdfs/orders/`
2. **Descuentos**: Se aplican automáticamente si `auto_apply = true` en `discount_rules`
3. **Stock**: Se actualiza automáticamente al confirmar pedido
4. **Ryze**: La sincronización es opcional y requiere configuración previa
5. **Analytics**: Se calculan en tiempo real, no hay tabla pre-calculada

---

## ✅ Checklist Final

- [ ] SQL ejecutado correctamente
- [ ] Edge Functions desplegadas (5 funciones)
- [ ] Variables de entorno configuradas
- [ ] Workflows n8n importados y activos (2 workflows)
- [ ] Integración Ryze configurada (si aplica)
- [ ] Prueba de extracción de productos exitosa
- [ ] Prueba de generación de PDF exitosa
- [ ] Prueba de cierre de venta exitosa
- [ ] Prueba de seguimiento de pedidos exitosa
- [ ] Prueba de descuentos automáticos exitosa
- [ ] Prueba de analytics exitosa

---

**¿Listo para vender automáticamente?** 🚀

