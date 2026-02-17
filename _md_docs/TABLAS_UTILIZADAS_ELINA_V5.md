# Tablas y Datos utilizados por ELINA V5 Edge Function

Esta tabla detalla exactamente qué tablas de la base de datos lee la función `elina-v5` y qué campos específicos utiliza para su funcionamiento.

| Tabla | Campos Leídos | Propósito / Uso en ELINA V5 |
|---|---|---|
| **`profiles`** | `id`, `full_name`, `evolution_instance_name`, `company_description`, `website`, `business_address`, `business_phone`, `timezone`, `evolution_api_key`, `evolution_api_url`, `work_start_hour`, `work_end_hour`, `product_count`, `service_count`, `business_type`, `quotes_enabled`, `has_shipping_system` | **Configuración Principal**: Carga la identidad de la empresa, credenciales de API (Evolution), horarios laborales y capacidades del negocio (si tiene productos, citas, etc.). `company_description` es vital para el Prompt del Sistema. |
| **`contacts`** | `id`, `user_id`, `phone_number`, `full_name`, `labels`, `created_at`, `is_simulation` | **Gestión de Contactos**: Identifica al usuario que escribe. El campo `labels` se usa críticamente para el **filtro de ignorar** (si contiene 'ignorar'). |
| **`teams`** | `owner_id`, `ignored_labels` | **Configuración de Equipo**: Obtiene la lista global de etiquetas que deben ser ignoradas por el bot. |
| **`critical_rules`** | `*` (Todo el registro si `is_active` es true) | **Reglas Críticas**: Carga reglas específicas de detección de intenciones que requieren atención inmediata o manejo especial. |
| **`auto_responses`** | `*` (Todo le registro si `is_active` es true) | **Respuestas Automáticas**: Carga respuestas predefinidas que se disparan por palabras clave exactas o patrones. |
| **`appointment_settings`** | `is_enabled` | **Configuración de Citas**: Verifica si el sistema de agendamiento está activo para la cuenta. |
| **`conversation_states`** | `is_paused`, `pause_reason`, `contact_id` | **Estado de Conversación**: Determina si el bot está **pausado** para un contacto específico (ej. intervención humana). |
| **`chat_history`** | `message_type`, `content`, `created_at` | **Memoria a Corto Plazo**: Recupera los últimos 10 mensajes para dar contexto a la conversación actual. |
| **`user_preferences`** | `*` (Todo el registro asociado al `contact_id`) | **Preferencias de Usuario**: Carga datos aprendidos sobre el usuario (ej. tallas, gustos) para personalizar la respuesta. |
| **`products`** | `*` (Todo el registro: `id`, `product_name`, `price`, `stock`, `description`, `media_url`, `product_type`, `view_count`) | **Contexto de Productos & Placeholders**: Se usa para dar contexto de productos "Top" y, crucialmente, para **reemplazar placeholders** (`[PRODUCT:ID]`) y obtener imágenes (`media_url`) para enviar. |
| **`account_learnings`** | `*` (via búsqueda semántica `match_account_learnings`) | **Memoria a Largo Plazo**: Recupera aprendizajes pasados relevantes (patrones, objeciones) usando embeddings vectoriales. |
| **`prompts`** | `prompt_content` | **Prompt Personalizado**: Busca si existe una instrucción de sistema específica/personalizada para reemplazar o aumentar la default. |

---
**Nota:** El símbolo `*` indica que se seleccionan todas las columnas disponibles o relevantes para el objeto de negocio en esa consulta.
