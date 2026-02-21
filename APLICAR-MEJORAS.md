# Guía Rápida: Aplicar Mejoras RAG

## Opción 1: Usando Supabase Dashboard (Más Fácil) ✅

### Paso 1: Aplicar Migraciones SQL

1. Ve a https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg
2. Click en **SQL Editor** (icono de base de datos en el menú izquierdo)
3. Click en **New query**

**Primera migración (Tabla FAQs):**
- Copia todo el contenido de: `supabase/migrations/20260220_separate_faqs_table.sql`
- Pégalo en el editor SQL
- Click en **Run** (esquina inferior derecha)
- ✅ Deberías ver: "Success. No rows returned"

**Segunda migración (Métricas):**
- Click en **New query** de nuevo
- Copia todo el contenido de: `supabase/migrations/20260220_rag_metrics_system.sql`
- Pégalo en el editor SQL
- Click en **Run**
- ✅ Deberías ver: "Success. No rows returned"

### Paso 2: Deploy Edge Functions

1. Ve a **Edge Functions** en el dashboard
2. Click en **Deploy new function**

**Función 1: smart-chunk-document**
- Name: `smart-chunk-document`
- Click **Browse files** y selecciona: `supabase/functions/smart-chunk-document/index.ts`
- ⚠️ También necesitas subir el shared: `supabase/functions/_shared/smart-chunker.ts`
- Click **Deploy**

**NOTA:** Si el dashboard no permite subir _shared, usa la opción 2 (CLI).

### Paso 3: Verificar

**Verificar tabla FAQs:**
```sql
-- En SQL Editor:
SELECT COUNT(*) as total_faqs FROM faqs;
```

**Verificar tablas de métricas:**
```sql
SELECT COUNT(*) as total FROM rag_queries;
SELECT COUNT(*) as total FROM rag_results;
SELECT COUNT(*) as total FROM knowledge_usage;
```

---

## Opción 2: Usando Supabase CLI (Recomendado) ✅

### Instalar Supabase CLI (si no lo tienes)

**Windows:**
```powershell
scoop install supabase
```

O descarga desde: https://github.com/supabase/cli/releases

**Verificar instalación:**
```bash
supabase --version
```

### Login y Link

```bash
cd "h:\DESAL\ELina 26"

# Login (abre el navegador)
supabase login

# Link al proyecto
supabase link --project-ref mytvwfbijlgbihlegmfg
```

### Aplicar Migraciones

```bash
# Aplicar todas las migraciones pendientes
supabase db push

# O aplicar una por una:
supabase db push --include-all
```

### Deploy Edge Functions

```bash
# Deploy la función de chunking
supabase functions deploy smart-chunk-document

# Deploy todas las funciones (opcional)
supabase functions deploy
```

---

## Opción 3: Script Automatizado (Node.js)

Si tienes Node.js y las credenciales de Supabase:

1. Asegúrate de tener las credenciales en un archivo `.env`:
```env
SUPABASE_URL=https://mytvwfbijlgbihlegmfg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

2. Ejecutar:
```bash
npm install @supabase/supabase-js dotenv
node apply-migrations.js
```

---

## Verificación Post-Implementación

### 1. Verificar Chunking Mejorado

1. Ve a tu dashboard en: https://tu-app.com/dashboard.html
2. Navega a **Configuración** > **Knowledge Files** (o pestaña de FAQs/Conocimiento)
3. Click en **"Nuevo Conocimiento"** o **"Paste Knowledge"**
4. Pega un texto largo (>1000 palabras)
5. Click en **"Estructurar con IA"**
6. Deberías ver: **"X Secciones detectadas"**
7. Abre la consola del navegador (F12)
8. Al hacer click en **"Confirmar y Guardar"**, deberías ver:
```
[RAG] Generated 5 chunks: {totalTokens: 2340, avgTokensPerChunk: 468, chunksWithOverlap: 4}
```

### 2. Verificar Tabla FAQs

En SQL Editor:
```sql
SELECT
    question,
    answer,
    source,
    usage_count,
    created_at
FROM faqs
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Verificar Métricas (después de usar el sistema)

```sql
-- Ver actividad reciente
SELECT * FROM rag_analytics
WHERE user_id = auth.uid()
ORDER BY date DESC
LIMIT 7;

-- Top FAQs/chunks más usados
SELECT * FROM top_knowledge_sources
WHERE user_id = auth.uid()
ORDER BY total_retrievals DESC
LIMIT 10;
```

---

## Troubleshooting

### "Function smart-chunk-document not found"
- No se deployó la función edge
- Usa Opción 2 (CLI) para deployar

### "Table faqs does not exist"
- La migración no se aplicó
- Ejecuta manualmente el SQL desde el dashboard

### "El chunking no muestra overlap"
- El documento es muy pequeño (<500 tokens)
- Verifica que se haya deployado `smart-chunk-document`
- Revisa los logs del navegador (F12)

### "Las métricas están vacías"
- Es normal, se llenan cuando el sistema RAG se usa
- Espera a que lleguen mensajes de usuarios
- O usa el sistema manualmente para testear

---

## Archivos Modificados

✅ **Edge Functions:**
- `supabase/functions/_shared/smart-chunker.ts` (nuevo)
- `supabase/functions/smart-chunk-document/index.ts` (nuevo)
- `supabase/functions/_shared/rag-with-metrics.ts` (nuevo)

✅ **Migraciones:**
- `supabase/migrations/20260220_separate_faqs_table.sql` (nuevo)
- `supabase/migrations/20260220_rag_metrics_system.sql` (nuevo)

✅ **Frontend:**
- `src/settings/knowledge-files-functions.js` (modificado)

✅ **RAG System:**
- `supabase/functions/elina-v5/utils/rag-system.ts` (threshold 0.45)
- `supabase/functions/elina-v6/utils/rag-system.ts` (threshold 0.45)
- `supabase/functions/rag-with-fallback/index.ts` (threshold 0.45)

---

## Próximos Pasos

1. ✅ Aplicar migraciones (arriba)
2. ✅ Deploy edge functions (arriba)
3. 📊 Esperar 1 semana y revisar métricas
4. 🔧 Ajustar threshold si es necesario (0.4-0.5)
5. 🗑️ Eliminar FAQs sin uso después de 1 mes

---

## Soporte

- Ver documentación completa: [`docs/MEJORAS-RAG-IMPLEMENTADAS.md`](docs/MEJORAS-RAG-IMPLEMENTADAS.md)
- Ver guía de métricas: [`docs/COMO-LEER-METRICAS-RAG.md`](docs/COMO-LEER-METRICAS-RAG.md)
- Logs de Supabase: https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/logs
