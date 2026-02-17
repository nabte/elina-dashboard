# 📋 INSTRUCCIONES DE EJECUCIÓN

## ⚠️ IMPORTANTE: Ejecuta estos archivos en orden

---

## 1️⃣ EJECUTAR SQL EN SUPABASE

### Archivo a ejecutar:
```
supabase/schema/20251125_bulk_ignore_and_business_features.sql
```

### Cómo ejecutarlo:
1. Ve al **Dashboard de Supabase**
2. Abre el **SQL Editor**
3. Crea una nueva consulta
4. Copia y pega **TODO el contenido** del archivo `20251125_bulk_ignore_and_business_features.sql`
5. Haz clic en **RUN** o presiona `Ctrl+Enter`

### ¿Qué hace este archivo?
- ✅ Crea función `bulk_update_ignore_label` (optimización de botones)
- ✅ Crea función `setup_advisor_user` (configurar vendedores)
- ✅ Crea función `sync_advisor_name_to_label` (sincronizar nombres)
- ✅ Crea trigger para sincronización automática
- ✅ Agrega columna `max_advisors` a la tabla `plans`
- ✅ Configura límite de 2 advisors por defecto para plan business

### Verificación:
Después de ejecutar, verifica que:
```sql
SELECT id, name, max_advisors FROM public.plans WHERE id = 'business';
```
Debe mostrar `max_advisors = 2`

---

## 2️⃣ DESPLEGAR EDGE FUNCTION

### Archivo a desplegar:
```
supabase/functions/create-user/index.ts
```

### Opción A: Desde la terminal (Recomendado)

```bash
# Asegúrate de estar en la raíz del proyecto
cd "W:\Woks\DESARROLLOS NABTE\archivos reales a compilar ultimo estable"

# Desplegar la función
supabase functions deploy create-user
```

### Opción B: Desde el Dashboard de Supabase

1. Ve al **Dashboard de Supabase**
2. Abre **Edge Functions**
3. Haz clic en **Create a new function**
4. Nombre: `create-user`
5. Copia y pega **TODO el contenido** del archivo `supabase/functions/create-user/index.ts`
6. Haz clic en **Deploy**

### ¿Qué hace esta función?
- ✅ Crea usuarios en Supabase Auth
- ✅ Verifica que el usuario sea admin del equipo
- ✅ Verifica límite de advisors (máximo 2 por defecto)
- ✅ Retorna error si se alcanza el límite

### Verificación:
Después de desplegar, prueba creando un advisor desde el panel de administrador.

---

## 3️⃣ VERIFICAR QUE TODO FUNCIONA

### Para Administradores:
1. Inicia sesión con una cuenta que tenga plan business
2. Ve a `/company-admin.html`
3. Intenta crear un advisor:
   - ✅ Debe funcionar si tienes menos de 2 advisors
   - ❌ Debe mostrar error si ya tienes 2 advisors

### Para Vendedores (Advisors):
1. Inicia sesión con una cuenta de advisor
2. Verifica que solo ve contactos con su etiqueta
3. Verifica que no puede acceder a configuración

---

## 📝 RESUMEN DE ARCHIVOS

### ✅ Archivos SQL (Ejecutar en Supabase SQL Editor):
- `supabase/schema/20251125_bulk_ignore_and_business_features.sql`

### ✅ Archivos Edge Functions (Desplegar):
- `supabase/functions/create-user/index.ts`

### ✅ Archivos JavaScript (Ya actualizados, no necesitas hacer nada):
- `contacts.js` - Optimización de botones
- `company-admin.js` - Panel de administrador
- `company-admin.html` - HTML del panel

---

## 🔍 TROUBLESHOOTING

### Error: "function bulk_update_ignore_label does not exist"
- **Solución**: Ejecuta el archivo SQL completo

### Error: "No tienes permisos para crear usuarios"
- **Solución**: Verifica que el usuario sea admin del equipo

### Error: "Has alcanzado el límite de 2 advisors"
- **Solución**: Esto es correcto, necesitas comprar más asientos o aumentar el límite en el plan

### La Edge Function no se despliega
- **Solución**: Verifica que tengas el CLI de Supabase instalado o usa el dashboard

---

## ✅ CHECKLIST FINAL

- [ ] SQL ejecutado en Supabase
- [ ] Edge Function `create-user` desplegada
- [ ] Verificado que el límite de 2 advisors funciona
- [ ] Verificado que los botones "Desactivar todas" funcionan rápido
- [ ] Verificado que los advisors solo ven sus contactos

---

**¡Listo! Una vez ejecutados estos archivos, todo debería funcionar correctamente.** 🚀

