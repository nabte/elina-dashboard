# 📘 Miniguía: Sistema de Mensajes Críticos

## 🎯 ¿Qué es el Sistema de Críticos?

El sistema de críticos detecta automáticamente cuando un cliente necesita atención especial y **pausa la conversación** para que un humano pueda responder. Esto evita que la IA responda en situaciones importantes.

---

## 🚀 Cómo Usar el Sistema (Paso a Paso)

### **Paso 1: Activar Críticos Predefinidos**

Los críticos predefinidos ya están listos para usar. Solo necesitas activarlos:

1. Ve a **Contexto de Ventas** (en el menú lateral)
2. Busca la sección **"🚨 Mensajes Críticos"**
3. Activa los switches de los críticos que quieras usar:
   - ✅ **Solicitud de Humano**: Detecta cuando alguien quiere hablar con una persona
   - ✅ **Intención de Compra**: Detecta cuando alguien quiere comprar
   - ✅ **Atención Urgente**: Detecta palabras como "urgente", "problema", "queja"

**Ejemplo:**
```
✅ Solicitud de Humano  [ON]
✅ Intención de Compra  [ON]
❌ Atención Urgente     [OFF]
```

---

### **Paso 2: Crear un Crítico Personalizado**

Si necesitas detectar algo específico de tu negocio:

1. En la sección **"🚨 Mensajes Críticos"**, haz clic en **"Agregar crítico"**
2. Te aparecerá un modal (no una alerta del navegador) pidiendo:
   - **Nombre del crítico**: Ejemplo: "Consulta de envío"
3. Luego te preguntará:
   - **¿Usar patrón o palabra clave?**
     - **Patrón (Sí)**: Más flexible, detecta variaciones
     - **Palabra clave (No)**: Detecta texto exacto
4. Ingresa el patrón o palabra clave:
   - **Ejemplo de patrón**: `(dónde|donde).*(envío|envio|pedido)`
   - **Ejemplo de palabra clave**: `envío`
5. Selecciona el tipo de detección:
   - Solicitud de Humano
   - Intención de Compra
   - Atención Urgente
   - Consulta de Envío
   - Personalizado

**Ejemplo Completo:**
```
Nombre: "Consulta de Envío"
Tipo: Patrón (regex)
Patrón: (dónde|donde).*(envío|envio|pedido|paquete)
Tipo de detección: Consulta de Envío
```

---

### **Paso 3: Activar/Desactivar Críticos**

- **Para activar/desactivar**: Simplemente marca o desmarca el checkbox al lado del crítico
- Los cambios se guardan automáticamente
- Verás una notificación verde confirmando el cambio

---

### **Paso 4: Eliminar un Crítico Personalizado**

1. Busca el crítico personalizado que quieres eliminar
2. Haz clic en el ícono de **papelera** 🗑️
3. Te aparecerá un modal de confirmación (no una alerta del navegador)
4. Confirma la eliminación

**Nota:** Los críticos predefinidos no se pueden eliminar, solo activar/desactivar.

---

## 📝 Ejemplos Prácticos

### **Ejemplo 1: Detectar Consultas de Envío**

**Configuración:**
- Nombre: "¿Dónde está mi pedido?"
- Tipo: Patrón
- Patrón: `(dónde|donde|cuándo|cuando).*(pedido|envío|envio|paquete|orden)`
- Tipo: Consulta de Envío

**Mensajes que detectará:**
- "¿Dónde está mi pedido?"
- "¿Cuándo llega mi envío?"
- "Donde mi paquete"
- "Cuándo recibiré mi orden"

---

### **Ejemplo 2: Detectar Solicitudes de Descuento**

**Configuración:**
- Nombre: "Pregunta por Descuento"
- Tipo: Patrón
- Patrón: `(descuento|rebaja|promoción|promocion|oferta|barato|precio).*(tienes|hay|ofreces)`
- Tipo: Personalizado

**Mensajes que detectará:**
- "¿Tienes algún descuento?"
- "Hay alguna promoción?"
- "Ofreces rebajas?"

---

### **Ejemplo 3: Detectar Reclamos**

**Configuración:**
- Nombre: "Reclamo o Queja"
- Tipo: Palabra clave
- Palabra clave: `reclamo`
- Tipo: Atención Urgente

**Mensajes que detectará:**
- Cualquier mensaje que contenga la palabra "reclamo"

---

## ⚙️ Tipos de Detección Explicados

| Tipo | Cuándo Usarlo | Ejemplo |
|------|---------------|---------|
| **Solicitud de Humano** | Cuando el cliente pide hablar con una persona | "Quiero hablar con un humano" |
| **Intención de Compra** | Cuando el cliente muestra interés en comprar | "Quiero comprar", "Me interesa" |
| **Atención Urgente** | Cuando hay problemas o urgencias | "Urgente", "Problema", "Queja" |
| **Consulta de Envío** | Cuando preguntan por envíos o pedidos | "¿Dónde está mi pedido?" |
| **Personalizado** | Para cualquier otro caso específico | Tu propio caso |

---

## 💡 Consejos y Mejores Prácticas

### ✅ **Usa Patrones para Mayor Flexibilidad**

**Bueno:**
```
Patrón: (dónde|donde).*(envío|envio|pedido)
```
Detecta: "¿dónde está mi envío?", "donde mi pedido", etc.

**Menos flexible:**
```
Palabra clave: envío
```
Solo detecta mensajes que contengan exactamente "envío"

---

### ✅ **Prueba tus Patrones**

Antes de guardar, piensa en las variaciones que los clientes podrían usar:
- "¿Dónde está mi pedido?" ✅
- "Donde mi envío" ✅
- "Cuándo llega mi paquete" ✅

---

### ✅ **No Crear Demasiados Críticos**

- Empieza con los 3 predefinidos
- Agrega 1-2 personalizados si realmente los necesitas
- Demasiados críticos pueden pausar conversaciones innecesariamente

---

## 🔄 ¿Qué Pasa Cuando se Detecta un Crítico?

1. **La conversación se pausa automáticamente**
   - La IA deja de responder
   - El cliente espera tu respuesta

2. **Recibes una notificación**
   - Por WhatsApp (si está configurado)
   - En el dashboard

3. **Puedes responder manualmente**
   - Ve a Chats
   - Encuentra la conversación pausada
   - Responde como humano

4. **Puedes reanudar la IA**
   - Cuando termines, puedes reactivar la IA
   - La conversación continúa normalmente

---

## ❓ Preguntas Frecuentes

### **¿Puedo editar un crítico después de crearlo?**
Actualmente no hay edición directa. Puedes:
1. Eliminar el crítico
2. Crear uno nuevo con la configuración correcta

### **¿Los críticos funcionan en tiempo real?**
Sí, se detectan inmediatamente cuando llega un mensaje nuevo.

### **¿Puedo tener múltiples críticos activos?**
Sí, puedes tener todos los críticos que necesites activos al mismo tiempo.

### **¿Qué pasa si un mensaje coincide con varios críticos?**
Se detecta el crítico con mayor prioridad (los predefinidos tienen prioridad más alta).

---

## 🎨 Notas sobre la Interfaz

- **No verás alertas del navegador**: Todo se maneja con modales elegantes con el branding de la app
- **Notificaciones verdes**: Cuando guardas o actualizas algo, verás una notificación en la esquina inferior derecha
- **Modales responsivos**: Funcionan bien en móvil y desktop

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas o preguntas:
1. Revisa que los críticos estén activos (checkbox marcado)
2. Verifica que el patrón o palabra clave sea correcto
3. Prueba enviando un mensaje de prueba desde otro número
4. Contacta soporte si el problema persiste

---

**Última actualización:** Diciembre 2025

