# 📧 Cómo Editar el Template de Invitación en Supabase

## 🎯 Problema
El correo de invitación está llegando en inglés y quieres personalizarlo en español.

## ✅ Solución: Editar Email Template en Supabase

### Paso 1: Acceder a Email Templates
1. Ve al **Dashboard de Supabase**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Email Templates** (en el menú lateral izquierdo)

### Paso 2: Editar Template "Invite user"
1. En la lista de templates, busca **"Invite user"**
2. Haz clic en el template para editarlo

### Paso 3: Personalizar el Template

**Template recomendado en español:**

```html
<h2>¡Has sido invitado a unirte a Elina IA!</h2>

<p>Hola,</p>

<p>Has sido invitado a unirte al equipo de <strong>{{ .SiteName }}</strong>.</p>

<p>Haz clic en el siguiente enlace para crear tu cuenta y establecer tu contraseña:</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
    Aceptar Invitación
  </a>
</p>

<p>O copia y pega este enlace en tu navegador:</p>
<p style="word-break: break-all; color: #475569;">{{ .ConfirmationURL }}</p>

<p><strong>Importante:</strong> Este enlace expirará en 7 días.</p>

<p>Si no solicitaste esta invitación, puedes ignorar este correo de forma segura.</p>

<p>Saludos,<br>El equipo de Elina IA</p>
```

### Paso 4: Variables Disponibles

En el template puedes usar estas variables:

- `{{ .SiteName }}` - Nombre del sitio (configurado en Supabase)
- `{{ .ConfirmationURL }}` - URL de confirmación (incluye el token)
- `{{ .Email }}` - Email del usuario invitado
- `{{ .Token }}` - Token de invitación (si lo necesitas)

### Paso 5: Guardar Cambios
1. Haz clic en **"Save"** o **"Guardar"** en la parte superior
2. Los cambios se aplicarán inmediatamente a las próximas invitaciones

---

## 🔧 Configuración Adicional

### Cambiar el Nombre del Sitio
1. Ve a **Authentication** → **URL Configuration**
2. En **Site URL**, asegúrate de que esté: `https://app.elinaia.com.mx`
3. En **Site Name**, puedes poner: `Elina IA`

### Personalizar el Remitente
1. Ve a **Authentication** → **Email Templates**
2. En la parte superior, puedes configurar:
   - **From Email**: El correo que aparece como remitente
   - **From Name**: El nombre que aparece como remitente

**Ejemplo:**
- From Email: `noreply@elinaia.com.mx`
- From Name: `Elina IA`

---

## 📝 Notas Importantes

1. **No elimines** `{{ .ConfirmationURL }}` - Es esencial para que funcione la invitación
2. El template soporta HTML básico (colores, enlaces, negritas, etc.)
3. Los cambios se aplican a **todas las futuras invitaciones**
4. Las invitaciones ya enviadas no se verán afectadas

---

## ✅ Verificación

Después de editar el template:

1. **Envía una invitación de prueba** desde tu app
2. **Revisa el correo** que llega
3. **Verifica que:**
   - El texto esté en español
   - El botón/enlace funcione correctamente
   - El diseño se vea bien

---

## 🆘 Problemas Comunes

### El correo sigue en inglés
- Asegúrate de haber guardado los cambios
- Verifica que estés editando el template correcto ("Invite user")
- Limpia la caché del navegador

### El enlace no funciona
- Verifica que `{{ .ConfirmationURL }}` esté en el template
- Asegúrate de que la URL de redirección esté configurada correctamente

### El correo no llega
- Revisa la carpeta de spam
- Verifica la configuración SMTP en Supabase
- Revisa los logs de Auth en Supabase Dashboard

