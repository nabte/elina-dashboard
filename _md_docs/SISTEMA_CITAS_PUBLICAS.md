# Sistema de Citas Públicas - Integración con n8n

## 📋 Resumen

Este sistema permite que los clientes agenden citas directamente desde una URL pública sin necesidad de autenticación, similar a Calendly o Vocco.

**URL del sistema:** `https://elinaia.com.mx/{username}`

Ejemplo: `https://elinaia.com.mx/miempresa`

---

## 🔧 Componentes Implementados

### 1. **Página Pública de Booking** (`booking.html`)
- **Ubicación:** `h:\DESAL\ELina 26\booking.html`
- **Funcionalidad:**
  - Wizard de 3 pasos (Servicio → Fecha/Hora → Datos del cliente)
  - Consulta de disponibilidad en tiempo real
  - Creación automática de citas y contactos
  - Diseño responsive y premium

### 2. **Políticas RLS** (`20260129_public_booking_rls.sql`)
- **Ubicación:** `h:\DESAL\ELina 26\supabase\migrations\`
- **Funcionalidad:**
  - Permite lectura pública de perfiles, servicios y citas
  - Permite inserción pública de nuevas citas y contactos
  - Mantiene seguridad para actualizaciones/eliminaciones

### 3. **Integración con n8n** (Pendiente)
- Detectar cuando el cliente pide agendar cita
- Enviar link personalizado por WhatsApp
- Notificar cuando se agenda una cita

---

## 🚀 Cómo Funciona

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIENTE PIDE CITA POR WHATSAPP                          │
│     "Quiero agendar una cita"                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. IA DETECTA INTENCIÓN (n8n)                              │
│     - Palabras clave: "cita", "agendar", "reservar"         │
│     - Busca el username del negocio en profiles             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ENVÍA LINK PERSONALIZADO                                │
│     "¡Claro! Agenda tu cita aquí:                           │
│      https://elinaia.com.mx/miempresa"                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. CLIENTE ABRE EL LINK                                    │
│     - Ve logo y nombre del negocio                          │
│     - Ve servicios disponibles                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. SELECCIONA SERVICIO                                     │
│     Ejemplo: "Corte de cabello - 30 min - $250"            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. ELIGE FECHA Y HORA                                      │
│     - Calendario visual (estilo Calendly)                   │
│     - Muestra solo horarios disponibles                     │
│     - Consulta get_available_slots RPC                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. INGRESA DATOS                                           │
│     - Nombre completo                                       │
│     - WhatsApp (10 dígitos)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  8. CITA CREADA AUTOMÁTICAMENTE                             │
│     - INSERT en tabla meetings                              │
│     - INSERT en tabla contacts (si no existe)               │
│     - status: 'pending'                                     │
│     - confirmation_status: 'pending'                        │
│     - metadata: { created_via: 'public_booking' }           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  9. NOTIFICACIÓN POR WHATSAPP                               │
│     "✅ Tu cita ha sido agendada para el 30 de enero        │
│      a las 2:00 PM. Responde SÍ para confirmar."            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Integración con n8n

### Paso 1: Detectar Intención de Cita

Agregar al nodo **"AI Agent"** o antes de él:

```javascript
// Nodo: Detectar Intención de Cita
const mensaje = $json.text.toLowerCase();

// Palabras clave
const citaKeywords = /\b(cita|agendar|reservar|reservación|appointment|booking)\b/i;

if (citaKeywords.test(mensaje)) {
  // Obtener username del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', $items('Obtener Prompt y Configuración1')[0].json.user_id)
    .single();

  if (profile && profile.username) {
    return [{
      json: {
        should_send_booking_link: true,
        booking_url: `https://elinaia.com.mx/${profile.username}`,
        username: profile.username
      }
    }];
  }
}

return [{ json: { should_send_booking_link: false } }];
```

### Paso 2: Enviar Link por WhatsApp

Agregar nodo **"IF: ¿Enviar Link de Citas?"**:

```javascript
// Condición
$json.should_send_booking_link === true
```

Si es `true`, enviar mensaje:

```javascript
// Nodo: Enviar Link de Booking
const mensaje = `¡Claro! 📅 Puedes agendar tu cita aquí:

${$json.booking_url}

Es súper rápido, solo te tomará 2 minutos. Elige el día y hora que más te convenga. 😊`;

// Enviar por Evolution API
```

### Paso 3: Notificar cuando se Crea una Cita

**Edge Function:** `send-appointment-notification`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { appointment_id, type } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Obtener datos de la cita
  const { data: appointment } = await supabase
    .from('meetings')
    .select(`
      *,
      contacts(full_name, phone_number),
      products(product_name),
      profiles(business_name, username)
    `)
    .eq('id', appointment_id)
    .single();

  if (!appointment) return new Response('Cita no encontrada', { status: 404 });

  // 2. Formatear fecha y hora
  const startTime = new Date(appointment.start_time);
  const fecha = startTime.toLocaleDateString('es-MX', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const hora = startTime.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // 3. Crear mensaje
  const mensaje = `✅ *Cita Confirmada*

Hola ${appointment.contacts.full_name},

Tu cita para *${appointment.products.product_name}* ha sido agendada:

📅 *Fecha:* ${fecha}
🕐 *Hora:* ${hora}
📍 *Negocio:* ${appointment.profiles.business_name}

Por favor responde *SÍ* para confirmar tu asistencia.

¡Te esperamos! 😊`;

  // 4. Enviar por WhatsApp (Evolution API)
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

  await fetch(`${evolutionUrl}/message/sendText/${appointment.profiles.username}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionKey
    },
    body: JSON.stringify({
      number: appointment.contacts.phone_number.replace('+', ''),
      text: mensaje
    })
  });

  return new Response('Notificación enviada', { status: 200 });
});
```

---

## 🔐 Seguridad

### Políticas RLS Aplicadas

1. **Lectura Pública:**
   - `profiles`: Solo datos públicos (nombre, logo, horarios)
   - `products`: Solo servicios activos (`product_type = 'service'`)
   - `meetings`: Solo para calcular disponibilidad
   - `appointment_settings`: Solo si está habilitado

2. **Inserción Pública:**
   - `meetings`: Solo si `metadata.created_via = 'public_booking'`
   - `contacts`: Permitido para crear nuevos contactos

3. **Actualización/Eliminación:**
   - Solo el dueño (`user_id = auth.uid()`)

---

## 📦 Despliegue

### 1. Aplicar Migraciones

```bash
# Voy a usar supabase-ELINA
# project_ref = mytvwfbijlgbihlegmfg

# Aplicar políticas RLS
supabase db push
```

### 2. Subir Página de Booking

**Opción A: Hosting en Supabase Storage**
```bash
# Subir booking.html a bucket público
supabase storage upload public booking.html
```

**Opción B: Hosting en servidor web**
- Configurar rewrite en `.htaccess`:
```apache
RewriteEngine On
RewriteRule ^([a-zA-Z0-9_-]+)$ /booking.html?u=$1 [L,QSA]
```

### 3. Desplegar Edge Function

```bash
supabase functions deploy send-appointment-notification
```

---

## 🧪 Testing

### Probar la Página de Booking

1. Crear un usuario de prueba con `username = 'test'`
2. Crear servicios en la tabla `products` con `product_type = 'service'`
3. Configurar horarios en `appointment_settings` y `appointment_hours`
4. Abrir: `https://elinaia.com.mx/test`

### Probar el Flujo Completo

1. Enviar mensaje por WhatsApp: "Quiero agendar una cita"
2. Verificar que la IA envíe el link
3. Abrir el link y agendar una cita
4. Verificar que llegue la notificación por WhatsApp

---

## 📊 Ventajas de este Sistema

✅ **Sin fricción:** El cliente no necesita registrarse ni autenticarse  
✅ **Rápido:** Solo 3 pasos para agendar  
✅ **Profesional:** Diseño premium similar a Calendly  
✅ **Automatizado:** Se integra con WhatsApp y el CRM  
✅ **Seguro:** Políticas RLS protegen los datos  
✅ **Escalable:** Funciona para múltiples negocios (multi-tenant)

---

## 🔄 Próximos Pasos

1. ✅ Crear página de booking
2. ✅ Configurar políticas RLS
3. ⏳ Integrar con n8n (detectar intención y enviar link)
4. ⏳ Crear Edge Function para notificaciones
5. ⏳ Configurar hosting y dominio
6. ⏳ Testing completo

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa:
- `GUIA_PROMPT_IA_CITAS.md` - Guía para modificar el prompt de IA
- `appointments.js` - Lógica del sistema de citas en el panel
- `Vocco/BookingPage.tsx` - Referencia del sistema de Vocco
