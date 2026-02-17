# 📧 Guía de Verificación: Correos de Invitación

## 🔍 Problema Común

**Síntoma:** El sistema reporta "Invitación enviada con éxito" pero el correo no llega.

**Causas posibles:**
1. SMTP no configurado en Supabase
2. Variables de entorno faltantes
3. Correo en carpeta de spam
4. Configuración incorrecta de Email Templates

---

## ✅ PASO 1: Verificar Configuración de SMTP en Supabase

### Opción A: Usar SMTP Personalizado (Recomendado)

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **Settings** → **Auth** → **SMTP Settings**
3. Configura tu proveedor de correo:

#### Para Gmail:
```
Host: smtp.gmail.com
Port: 587
Username: tu-email@gmail.com
Password: [App Password de Gmail]
Sender email: tu-email@gmail.com
Sender name: Elina AI
```

**Nota:** Para Gmail necesitas crear una "App Password":
- Ve a tu cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones

#### Para SendGrid:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Tu API Key de SendGrid]
Sender email: noreply@tudominio.com
Sender name: Elina AI
```

#### Para Mailgun:
```
Host: smtp.mailgun.org
Port: 587
Username: postmaster@tudominio.mailgun.org
Password: [Tu contraseña de Mailgun]
Sender email: noreply@tudominio.com
Sender name: Elina AI
```

### Opción B: Usar el SMTP por defecto de Supabase

Si no configuras SMTP personalizado, Supabase usa su servicio por defecto, pero:
- ⚠️ Puede tener límites de envío
- ⚠️ Los correos pueden ir a spam más fácilmente
- ⚠️ No puedes personalizar el remitente

---

## ✅ PASO 2: Verificar Variables de Entorno

1. Ve a **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Verifica que exista:
   - `SITE_URL` → Debe ser la URL donde está tu aplicación (ej: `https://app.elinaia.com.mx`)

**Si falta `SITE_URL`:**
- Agrega el secret con el valor de tu dominio de la aplicación
- Ejemplo: `SITE_URL=https://app.elinaia.com.mx`
- **Nota:** Si no se configura, la función usará `https://app.elinaia.com.mx` por defecto

**Importante:** 
- URL oficial: `elinaia.com.mx` (sitio web)
- URL de la app: `app.elinaia.com.mx` (aplicación) ← **Esta es la que debe usarse**

---

## ✅ PASO 3: Verificar Email Templates

1. Ve a **Supabase Dashboard** → **Auth** → **Email Templates**
2. Verifica el template **"Invite user"**
3. Asegúrate de que el template tenga:
   - Un enlace de confirmación: `{{ .ConfirmationURL }}`
   - Mensaje claro de invitación

**Template recomendado:**
```
Hola,

Has sido invitado a unirte a {{ .SiteName }}.

Haz clic en el siguiente enlace para crear tu cuenta:
{{ .ConfirmationURL }}

Este enlace expirará en 7 días.

Si no solicitaste esta invitación, puedes ignorar este correo.
```

---

## ✅ PASO 4: Revisar Logs de Supabase

### Revisar logs de la Edge Function:

1. Ve a **Supabase Dashboard** → **Edge Functions** → **invite-team-member**
2. Haz clic en **Logs**
3. Busca errores relacionados con:
   - `inviteUserByEmail`
   - `SMTP`
   - `email`

### Revisar logs de Auth:

1. Ve a **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Busca intentos de envío de correo
3. Verifica si hay errores de SMTP

---

## ✅ PASO 5: Verificar Invitaciones en la Base de Datos

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
SELECT 
    ti.id,
    ti.email,
    ti.role,
    ti.status,
    ti.error_message,
    ti.created_at,
    ti.expires_at,
    t.name as team_name
FROM public.team_invitations ti
JOIN public.teams t ON t.id = ti.team_id
WHERE ti.status IN ('pending', 'failed')
ORDER BY ti.created_at DESC
LIMIT 10;
```

**Interpretación:**
- `status = 'pending'` → Invitación creada pero correo puede no haberse enviado
- `status = 'failed'` → Error al enviar correo (revisa `error_message`)
- `error_message` → Contiene el error específico

---

## ✅ PASO 6: Probar el Envío Manualmente

### Opción A: Desde el Dashboard de Supabase

1. Ve a **Supabase Dashboard** → **Auth** → **Users**
2. Haz clic en **Invite user**
3. Ingresa un correo de prueba
4. Verifica si llega el correo

### Opción B: Desde la función Edge

Usa esta llamada de prueba (reemplaza con tus valores):

```bash
curl -X POST 'https://TU_PROJECT.supabase.co/functions/v1/invite-team-member' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "teamId": "TU_TEAM_ID",
    "inviteeEmail": "correo-prueba@ejemplo.com",
    "role": "advisor"
  }'
```

---

## 🔧 Soluciones Comunes

### Error: "SMTP connection failed"

**Solución:**
1. Verifica que el host, puerto, usuario y contraseña sean correctos
2. Para Gmail, asegúrate de usar una "App Password", no tu contraseña normal
3. Verifica que el firewall no bloquee el puerto SMTP

### Error: "Email rate limit exceeded"

**Solución:**
1. Configura SMTP personalizado (no uses el por defecto de Supabase)
2. Espera unos minutos antes de intentar de nuevo
3. Considera usar un servicio de correo profesional (SendGrid, Mailgun)

### Correo llega a spam

**Solución:**
1. Configura SPF, DKIM y DMARC en tu dominio
2. Usa un dominio personalizado para enviar correos
3. Evita palabras spam en el asunto y contenido
4. Configura un remitente profesional (ej: `noreply@tudominio.com`)

### Correo no llega pero no hay error

**Solución:**
1. Revisa la carpeta de spam
2. Verifica que el correo esté bien escrito
3. Revisa los logs de Auth en Supabase
4. Intenta con otro correo de prueba

---

## 📝 Checklist de Verificación

- [ ] SMTP configurado en Supabase (o usando el por defecto)
- [ ] Variable `SITE_URL` configurada en Edge Functions Secrets
- [ ] Email Template "Invite user" configurado correctamente
- [ ] Logs de Edge Function revisados (sin errores)
- [ ] Logs de Auth revisados (sin errores)
- [ ] Invitación creada en `team_invitations` con `status = 'pending'` o `'failed'`
- [ ] Correo de prueba enviado manualmente desde Supabase Dashboard
- [ ] Correo revisado en spam si no llega

---

## 🆘 Si Nada Funciona

1. **Contacta a Supabase Support** con:
   - Tu Project ID
   - Timestamp del intento de envío
   - Logs de la Edge Function
   - Logs de Auth

2. **Alternativa temporal:** 
   - Puedes crear usuarios manualmente desde el Dashboard
   - O usar un servicio de correo externo (SendGrid, Mailgun) y enviar el correo desde una Edge Function personalizada

---

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth - Email](https://supabase.com/docs/guides/auth/auth-email)
- [Configuración de SMTP en Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Email Templates en Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)

