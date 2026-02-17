# 📋 INSTRUCCIONES: Recuperación de Contraseña

## ✅ ARCHIVOS CREADOS

### 1. Páginas HTML:
- ✅ `forgot-password.html` - Solicitar recuperación de contraseña
- ✅ `reset-password.html` - Restablecer contraseña con token

### 2. JavaScript:
- ✅ `forgot-password.js` - Lógica para solicitar reset
- ✅ `reset-password.js` - Lógica para cambiar contraseña

### 3. Actualizaciones:
- ✅ `index.html` - Agregado enlace "¿Olvidaste tu contraseña?"
- ✅ `auth.js` - Agregadas rutas de recuperación a authPaths

---

## ⚙️ CONFIGURACIÓN EN SUPABASE

### Paso 1: Configurar URL de Redirección

1. Ve al **Dashboard de Supabase**
2. Abre **Authentication** → **URL Configuration**
3. En **Redirect URLs**, agrega:
   ```
   https://app.elinaia.com.mx/reset-password.html
   ```
4. También agrega para desarrollo local (opcional):
   ```
   http://localhost:3000/reset-password.html
   ```

### Paso 2: Configurar Plantilla de Email (Opcional)

1. Ve a **Authentication** → **Email Templates**
2. Selecciona **Reset Password**
3. Personaliza el email si lo deseas
4. El enlace debe incluir: `{{ .ConfirmationURL }}`

**Ejemplo de plantilla:**
```
Hola,

Has solicitado restablecer tu contraseña en Elina IA.

Haz clic en el siguiente enlace para crear una nueva contraseña:
{{ .ConfirmationURL }}

Este enlace expirará en 1 hora.

Si no solicitaste este cambio, puedes ignorar este correo.

Saludos,
El equipo de Elina IA
```

---

## 🔄 FLUJO DE RECUPERACIÓN

### 1. Usuario solicita recuperación:
- Va a `/forgot-password.html`
- Ingresa su correo
- Supabase envía email con enlace

### 2. Usuario hace clic en el enlace:
- El enlace lo lleva a `/reset-password.html?access_token=XXX&type=recovery`
- La página verifica el token
- Si es válido, muestra formulario

### 3. Usuario cambia contraseña:
- Ingresa nueva contraseña
- Confirma contraseña
- Se actualiza en Supabase
- Redirige al login

---

## 📝 VERIFICACIÓN

### Probar el flujo completo:

1. **Solicitar recuperación:**
   - Ve a `https://app.elinaia.com.mx/forgot-password.html`
   - Ingresa un correo válido
   - Debe mostrar mensaje de éxito

2. **Revisar email:**
   - Revisa la bandeja de entrada
   - Debe llegar un correo de Supabase
   - El enlace debe apuntar a `reset-password.html`

3. **Restablecer contraseña:**
   - Haz clic en el enlace del email
   - Debe abrir `reset-password.html`
   - Ingresa nueva contraseña
   - Debe actualizarse y redirigir

---

## ⚠️ IMPORTANTE

### URLs que deben estar configuradas en Supabase:

**Redirect URLs:**
- `https://app.elinaia.com.mx/reset-password.html`
- `http://localhost:3000/reset-password.html` (para desarrollo)

**Site URL:**
- `https://app.elinaia.com.mx`

### Si el enlace no funciona:

1. Verifica que la URL de redirección esté en Supabase
2. Verifica que el dominio sea exactamente `app.elinaia.com.mx`
3. Los enlaces expiran después de 1 hora (configurable en Supabase)

---

## ✅ CHECKLIST

- [ ] Archivos HTML creados
- [ ] Archivos JavaScript creados
- [ ] Enlace agregado en `index.html`
- [ ] URL de redirección configurada en Supabase
- [ ] Plantilla de email personalizada (opcional)
- [ ] Probar flujo completo

---

**¡Listo! Tu sistema de recuperación de contraseña está completo.** 🚀

