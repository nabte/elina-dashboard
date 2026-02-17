# 🔧 Configuración de Redirect URLs en Supabase

## ⚠️ Problema: 404 en accept-invitation.html

Si estás recibiendo un error 404 al acceder a `accept-invitation.html`, necesitas configurar las Redirect URLs en Supabase.

## ✅ Solución: Configurar Redirect URLs

### Paso 1: Acceder a URL Configuration
1. Ve al **Dashboard de Supabase**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration** (en el menú lateral izquierdo)

### Paso 2: Agregar Redirect URLs

En la sección **Redirect URLs**, agrega estas URLs (una por línea):

```
https://app.elinaia.com.mx/accept-invitation.html
https://app.elinaia.com.mx/dashboard.html
https://app.elinaia.com.mx/reset-password.html
https://app.elinaia.com.mx/
```

**Para desarrollo local (opcional):**
```
http://localhost:3000/accept-invitation.html
http://localhost:3000/dashboard.html
http://localhost:3000/
```

### Paso 3: Configurar Site URL

En la sección **Site URL**, asegúrate de que esté configurado:

```
https://app.elinaia.com.mx
```

**Importante:** Esta debe ser la URL base de tu aplicación, no la URL oficial del sitio web.

### Paso 4: Guardar Cambios

1. Haz clic en **"Save"** o **"Guardar"**
2. Los cambios se aplicarán inmediatamente

---

## 🔍 Verificación

Después de configurar:

1. **Envía una invitación de prueba** desde tu app
2. **Haz clic en el link del correo**
3. **Verifica que:**
   - No aparezca error 404
   - La página `accept-invitation.html` se cargue correctamente
   - El formulario de establecer contraseña se muestre

---

## 📝 Notas Importantes

1. **Las Redirect URLs deben coincidir exactamente** con las URLs que usas en tu aplicación
2. **No uses wildcards** (`*`) a menos que sea absolutamente necesario
3. **Incluye el protocolo** (`https://` o `http://`)
4. **No incluyas parámetros** en las URLs (ej: `?invitation=123`)

---

## 🆘 Si Sigue Dando 404

### Verificar que el archivo existe:
1. Asegúrate de que `accept-invitation.html` esté en la raíz de tu proyecto
2. Verifica que el servidor web esté configurado para servir archivos HTML estáticos
3. Revisa los logs del servidor para ver qué está pasando

### Verificar configuración del servidor:
Si usas Apache (`.htaccess`), el archivo ya está configurado para permitir acceso directo a `accept-invitation.html`.

Si usas otro servidor (nginx, etc.), asegúrate de que esté configurado para servir archivos HTML estáticos.

---

## 🔄 Flujo Correcto

1. Usuario recibe correo con link de Supabase
2. Link de Supabase: `https://mytvwfbijlgbihlegmfg.supabase.co/auth/v1/verify?token=...&redirect_to=https://app.elinaia.com.mx/accept-invitation.html?invitation=...`
3. Supabase verifica el token y redirige a: `https://app.elinaia.com.mx/accept-invitation.html?invitation=...#access_token=...&type=invite`
4. La página `accept-invitation.html` se carga y procesa el token
5. Usuario establece contraseña y nombre
6. Redirige a `dashboard.html?invitation=...`
7. Dashboard procesa la invitación y agrega al usuario al equipo

