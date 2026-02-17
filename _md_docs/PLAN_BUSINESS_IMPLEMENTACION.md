# Plan Business - Implementación y Respuestas

## ✅ ¿Afecta a otros planes?

**NO, el plan business NO afecta a otros planes.** 

### Protecciones implementadas:

1. **Filtros condicionales**: Las funciones `getAdvisorLabelFilters()` solo se ejecutan si:
   - El usuario tiene `teamInfo` (solo usuarios con plan business)
   - Y su rol es `'advisor'` (vendedor)
   
   ```javascript
   // En contacts.js y chats.js
   if (teamInfo?.user_role !== 'advisor') return null;
   ```

2. **Usuarios sin plan business**:
   - No tienen `teamInfo` → `teamInfo` es `null` o `undefined`
   - Las funciones retornan `null` inmediatamente
   - **No se aplican filtros, funcionan normalmente**

3. **Funciones SQL protegidas**:
   - `setup_advisor_user`: Verifica que el usuario sea admin del equipo
   - `sync_advisor_name_to_label`: Solo se ejecuta si el usuario es `advisor`
   - `bulk_update_ignore_label`: Funciona para todos los usuarios (no es específica de business)

4. **Trigger condicional**:
   - Solo se ejecuta si el usuario es `advisor` en un equipo
   - Usuarios normales no se ven afectados

## ✅ ¿Cómo funciona el Plan Business?

**SÍ, es correcto: es una sola cuenta (administrador) que puede administrar todo.**

### Estructura:

```
┌─────────────────────────────────┐
│  Administrador (Plan Business)  │
│  - Crea vendedores              │
│  - Administra permisos          │
│  - Ve todos los contactos       │
│  - Gestiona etiquetas           │
└──────────────┬──────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│ Vendedor 1  │  │ Vendedor 2  │
│ - Solo ve   │  │ - Solo ve   │
│   contactos │  │   contactos │
│   con su    │  │   con su    │
│   etiqueta  │  │   etiqueta  │
└─────────────┘  └─────────────┘
```

### Características:

1. **Una cuenta principal (Admin)**:
   - Compra el plan business
   - Tiene acceso completo
   - Puede crear vendedores
   - Ve todos los contactos y datos

2. **Vendedores (Advisors)**:
   - Creados por el administrador
   - Solo ven contactos con su etiqueta (su nombre)
   - Permisos configurables por el admin
   - Por defecto NO pueden ver "Contactos" (solo Chats, Follow-ups, Kanban)

3. **Etiquetas automáticas**:
   - Cuando se crea un vendedor, se crea una etiqueta con su nombre
   - Los contactos asignados a ese vendedor tienen esa etiqueta
   - Si cambia el nombre del vendedor, se actualiza la etiqueta automáticamente

## 📋 Pasos para completar la implementación

### 1. Ejecutar SQL en Supabase ✅

Ejecuta este archivo en el SQL Editor de Supabase:

```
supabase/schema/20251125_bulk_ignore_and_business_features.sql
```

Este archivo contiene:
- ✅ Función `bulk_update_ignore_label` (optimización de botones)
- ✅ Función `setup_advisor_user` (configurar vendedores)
- ✅ Función `sync_advisor_name_to_label` (sincronizar nombres)
- ✅ Trigger para sincronización automática

### 2. Desplegar Edge Function ✅

Despliega la nueva Edge Function `create-user`:

```bash
# Desde la raíz del proyecto
supabase functions deploy create-user
```

O desde el dashboard de Supabase:
1. Ve a **Edge Functions**
2. Crea nueva función llamada `create-user`
3. Copia el contenido de `supabase/functions/create-user/index.ts`

### 3. Verificar que todo funciona

#### Para usuarios sin plan business:
- ✅ Deben funcionar normalmente
- ✅ No deben ver cambios
- ✅ Los botones "Desactivar todas" / "Activar todas" funcionan más rápido

#### Para administradores con plan business:
- ✅ Pueden acceder a `/company-admin.html`
- ✅ Pueden crear vendedores directamente
- ✅ Pueden invitar vendedores por correo
- ✅ Pueden gestionar permisos

#### Para vendedores:
- ✅ Solo ven contactos/chats con su etiqueta
- ✅ No pueden ver "Contactos" por defecto (configurable)
- ✅ Si cambian su nombre, la etiqueta se actualiza automáticamente

## 🔍 Verificación de que no afecta otros planes

### Código de protección:

```javascript
// contacts.js línea 24-31
function getAdvisorLabelFilters(scope) {
    const teamInfo = window.appInstance?.teamInfo;
    if (teamInfo?.user_role !== 'advisor') return null; // ← Sale inmediatamente si no es advisor
    // ... resto del código
}
```

**Si `teamInfo` es `null` (usuario sin plan business):**
- `teamInfo?.user_role` es `undefined`
- `undefined !== 'advisor'` es `true`
- Retorna `null` inmediatamente
- **No se aplican filtros**

**Si `teamInfo` existe pero el usuario es `admin`:**
- `teamInfo.user_role === 'admin'`
- `'admin' !== 'advisor'` es `true`
- Retorna `null` inmediatamente
- **No se aplican filtros**

**Solo se aplican filtros si:**
- `teamInfo` existe
- Y `teamInfo.user_role === 'advisor'`

## 📝 Resumen

✅ **No afecta otros planes**: El código está protegido con verificaciones condicionales  
✅ **Una cuenta administra todo**: El admin del plan business puede crear y gestionar vendedores  
✅ **Pasos completados**: SQL creado, Edge Function creada, código actualizado  

Solo falta:
1. Ejecutar el SQL en Supabase
2. Desplegar la Edge Function `create-user`

¡Listo para usar! 🚀

