# 🔑 Variables de Entorno en n8n

## ❌ Error Común

**NO confundas:**
- `SUPABASE_URL` = `https://mytvwfbijlgbihlegmfg.supabase.co` ✅ (URL)
- `SUPABASE_SERVICE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ✅ (Token/Key)

---

## 📋 Variables Necesarias

### **1. SUPABASE_URL**
- **Valor:** `https://mytvwfbijlgbihlegmfg.supabase.co`
- **Tipo:** URL
- **Descripción:** URL base de tu proyecto Supabase
- **Dónde encontrarla:** Dashboard de Supabase → Settings → API → Project URL

---

### **2. SUPABASE_KEY** (Anon Key)
- **Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTgwMDAwMDAwMH0.xxxxx`
- **Tipo:** JWT Token
- **Descripción:** Clave pública (anon) para acceso desde el frontend
- **Dónde encontrarla:** Dashboard de Supabase → Settings → API → Project API keys → `anon` `public`
- **Uso:** Para consultas desde el cliente (navegador) con RLS activo

---

### **3. SUPABASE_SERVICE_KEY** (Service Role Key)
- **Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.xxxxx`
- **Tipo:** JWT Token
- **Descripción:** Clave privada (service_role) que BYPASSEA RLS
- **Dónde encontrarla:** Dashboard de Supabase → Settings → API → Project API keys → `service_role` `secret`
- **⚠️ IMPORTANTE:** Esta clave es SECRETA, nunca la expongas en el frontend
- **Uso:** Para operaciones administrativas desde el backend (n8n, Edge Functions)

---

## 🔧 Cómo Configurar en n8n

### **Opción 1: Variables de Entorno Globales (Recomendado)**

1. En n8n, ve a **Settings** → **Environment Variables**
2. Agrega estas variables:

```
SUPABASE_URL=https://mytvwfbijlgbihlegmfg.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role key)
```

3. En los nodos, usa: `={{ $env.SUPABASE_URL }}`

---

### **Opción 2: Credenciales Genéricas**

1. En n8n, ve a **Credentials** → **New**
2. Selecciona **HTTP Header Auth**
3. Configura:
   - **Name:** `Supabase Service Role`
   - **Header Name:** `apikey`
   - **Header Value:** `{{ $env.SUPABASE_SERVICE_KEY }}`
   - **Additional Header:**
     - **Name:** `Authorization`
     - **Value:** `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`

---

## 📝 Ejemplo de Uso en Nodos

### **HTTP Request para Edge Function:**

```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/functions/v1/detect-critical-intent",
  "headers": {
    "apikey": "={{ $env.SUPABASE_SERVICE_KEY }}",
    "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
    "Content-Type": "application/json"
  }
}
```

### **HTTP Request para REST API (con RLS):**

```json
{
  "method": "GET",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/smart_promotions",
  "headers": {
    "apikey": "={{ $env.SUPABASE_KEY }}",
    "Authorization": "Bearer {{ $env.SUPABASE_KEY }}"
  },
  "query": {
    "user_id": "eq.{{ $json.user_id }}",
    "is_active": "eq.true"
  }
}
```

---

## 🔍 Cómo Verificar que Están Configuradas

### **En n8n:**

1. Ve a **Settings** → **Environment Variables**
2. Verifica que aparezcan las 3 variables
3. Prueba en un nodo Code:
   ```javascript
   return [{
     json: {
       url: $env.SUPABASE_URL,
       has_key: !!$env.SUPABASE_KEY,
       has_service_key: !!$env.SUPABASE_SERVICE_KEY
     }
   }];
   ```

---

## ⚠️ Seguridad

- ✅ **SUPABASE_KEY (anon):** Puede estar en el frontend (navegador)
- ❌ **SUPABASE_SERVICE_KEY:** NUNCA en el frontend, solo en backend (n8n, Edge Functions)
- ✅ Usa variables de entorno, no hardcodees las keys
- ✅ Rota las keys si se comprometen

---

## 🆘 Troubleshooting

### **Error: "Variable not found"**
- Verifica que la variable esté en **Environment Variables**
- Verifica el nombre exacto (case-sensitive)
- Reinicia n8n después de agregar variables

### **Error: "Unauthorized"**
- Verifica que estés usando la key correcta:
  - `SUPABASE_KEY` para operaciones con RLS
  - `SUPABASE_SERVICE_KEY` para operaciones sin RLS (admin)

### **Error: "Invalid API key"**
- Copia la key completa desde Supabase Dashboard
- Verifica que no tenga espacios al inicio/final
- Verifica que sea la key correcta (anon vs service_role)

---

¿Necesitas ayuda configurando las variables? 🚀

