# 📊 Análisis de Planes de Elina

## ✅ PLANES CORRECTOS (Mantener)

Basado en el análisis del código, estos son los **4 planes** que realmente se usan en Elina:

### 1. `free_trial` - Prueba Gratuita
- **Precio:** $0
- **Uso:** Se menciona en `app.js`, `superadmin.js`
- **Características:** Plan de prueba de 7 días
- ✅ **MANTENER**

### 2. `starter` - Plan Starter  
- **Precio:** $999 MXN / mes (según `index2.html`)
- **Uso:** Se menciona en `index2.html`, `app.js`, `dashboard.html`
- **Características:** 
  - 1 número de WhatsApp + 2 agentes
  - 300 respuestas IA y 30 imágenes
  - Automatizaciones básicas
- ✅ **MANTENER**

### 3. `grow` - Plan Grow
- **Precio:** $1,999 MXN / mes (según `index2.html`)
- **Uso:** Se menciona en `index2.html`, `app.js`, `dashboard.html`, `superadmin.html`
- **Características:**
  - WhatsApp ilimitado
  - 80 imágenes + 12 videos VEO 3.1
  - Campañas masivas ilimitadas
- ✅ **MANTENER**

### 4. `business` - Plan Business
- **Precio:** $2,799 MXN / mes (según `index2.html`)
- **Uso:** Se menciona en `index2.html`, `superadmin.js`, y acabamos de implementarlo
- **Características:**
  - 3 números, atención 24/7
  - 150 imágenes + 25 videos VEO 3.1
  - API abierta, roles avanzados
  - **Multi-usuario** (multi_user: true)
- ✅ **MANTENER**

---

## ❌ PLANES A ELIMINAR (De otro servicio)

Estos planes **NO aparecen** en el código de Elina:

### 1. `crecimiento` - Crecimiento
- **Precio:** $49
- **Razón:** No se menciona en ningún archivo del código
- ❌ **ELIMINAR**

### 2. `empresarial` - Empresarial
- **Precio:** $99
- **Razón:** No se menciona en ningún archivo del código
- ❌ **ELIMINAR**

### 3. `gratuito` - Gratuito
- **Precio:** $0
- **Razón:** Solo aparece una vez en un comentario de `app.js`, no se usa realmente
- ❌ **ELIMINAR**

### 4. `solopreneur` - Solopreneur
- **Precio:** $19
- **Razón:** No se menciona en ningún archivo del código
- ❌ **ELIMINAR**

---

## 📋 INSTRUCCIONES PARA LIMPIAR

### ⚠️ ANTES DE ELIMINAR - Verificar usuarios

Ejecuta esto primero para ver si hay usuarios con estos planes:

```sql
SELECT 
  s.user_id,
  s.plan_id,
  p.name as plan_name,
  u.email
FROM public.subscriptions s
JOIN public.plans p ON p.id = s.plan_id
JOIN auth.users u ON u.id = s.user_id
WHERE s.plan_id IN ('crecimiento', 'empresarial', 'gratuito', 'solopreneur');
```

**Si hay usuarios con estos planes:**
1. Migra sus suscripciones a uno de los 4 planes correctos
2. Luego ejecuta el script de limpieza

### ✅ EJECUTAR LIMPIEZA

**Archivo:** `supabase/schema/20251125_cleanup_plans.sql`

**Cómo ejecutarlo:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido del archivo
3. Ejecuta (RUN)

**¿Qué hace?**
- ✅ Verifica que no haya usuarios con planes a eliminar
- ✅ Elimina los 4 planes incorrectos
- ✅ Muestra los planes restantes para verificación

---

## 📊 RESUMEN

### Planes a mantener (4):
- ✅ `free_trial`
- ✅ `starter`
- ✅ `grow`
- ✅ `business`

### Planes a eliminar (4):
- ❌ `crecimiento`
- ❌ `empresarial`
- ❌ `gratuito`
- ❌ `solopreneur`

---

## 🔍 VERIFICACIÓN POST-LIMPIEZA

Después de ejecutar, verifica:

```sql
SELECT id, name, price_monthly, max_advisors 
FROM public.plans 
ORDER BY 
  CASE id
    WHEN 'free_trial' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'grow' THEN 3
    WHEN 'business' THEN 4
  END;
```

Debe mostrar exactamente **4 planes**.

