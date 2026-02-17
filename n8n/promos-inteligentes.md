# Promos Inteligentes · Integración con n8n

Esta guía explica cómo conectar las nuevas **Promos Inteligentes** (`smart_promotions`) con tus flujos de conversación usando n8n. Incluye pasos manuales y un flujo de ejemplo (`promos-inteligentes-flow.json`) que puedes importar y adaptar.

---

## 1. Objetivo del flujo

1. Recibir el mensaje entrante (webhook o disparador ya existente).
2. Consultar en Supabase si el usuario tiene promos activas para ese momento.
3. Decidir, con ayuda de OpenAI, si vale la pena mencionar la promo (también se usa cuando el cliente pregunta explícitamente por promos).
4. Registrar y/o enviar el mensaje construido a tu backend/bot.

---

## 2. Prerrequisitos

| Elemento | Detalle |
| --- | --- |
| Supabase REST URL | `https://<project>.supabase.co/rest/v1` |
| Supabase Service Key | Usa la *anon* key para llamadas RLS o la *service* key si el flujo va del lado del servidor. |
| Tabla | `public.smart_promotions` creada por la migración `20251108_add_smart_promotions.sql`. |
| Endpoint para enviar mensaje | Puede ser tu función `smart-worker`, `notify-escalation` o un hook propio que publique el texto en el chat. |

Guarda las llaves en **Credentials** de n8n o como Environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `BOT_ENDPOINT`, `OPENAI_API_KEY`).

---

## 3. Pasos manuales (si no usas el JSON)

1. **Webhook / Disparador**
   - Tipo: `Webhook` (POST).
   - URL sugerida: `/webhook/promos-inteligentes`.
   - El payload debe contener al menos: `userId`, `contactId`, `lastMessages[]`, `explicitPromoRequest` (bool cuando una intent class detecta “¿tienes promos?”).

2. **HTTP Request → Supabase (Promos)**
   - Método: `GET`.
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/smart_promotions?select=*&user_id=eq.{{$json["body"]["userId"]}}&is_active=eq.true`.
   - Headers:
     - `apikey`: `{{$env.SUPABASE_KEY}}`
     - `Authorization`: `Bearer {{$env.SUPABASE_KEY}}`
     - `Prefer`: `return=representation`

3. **Function node → `Filter/Score Promos`**
   - Lee `items[1].json` (resultado del HTTP).
   - Descarta promos fuera de rango (`start_at` / `end_at`) cuando `no_schedule` es `false`.
   - Respeta `max_mentions_per_day` comparando contra `trigger_count` o guardando logs en otra tabla (puedes agregar un node adicional para leer `smart_promotions_logs` si los gestionas).
   - Selecciona la promo “ganadora” (ej. la más nueva) y añade `promoContext` al flujo.

   ```js
   const promos = items[0].json;
   const now = new Date();
   const selected = promos.find(promo => {
     if (!promo.is_active) return false;
     if (!promo.no_schedule) {
       if (promo.start_at && new Date(promo.start_at) > now) return false;
       if (promo.end_at && new Date(promo.end_at) < now) return false;
     }
     return true;
   });
   return selected ? [{ json: { promo: selected } }] : [];
   ```

4. **OpenAI (Chat) → `Promo Writer`**
   - Usa modelo `gpt-4o-mini` o similar.
   - Prompt sugerido:

     ```
     Eres un asistente de ventas. Con base en el historial:
     {{ $json["messages"] }}

     Si el usuario preguntó por promociones (bandera {{ $json["explicitPromoRequest"] }}),
     responde directamente con la promo.

     Promoción disponible:
     Título: {{ $json["promo"]["title"] }}
     Descripción: {{ $json["promo"]["description"] }}
     Beneficios: {{ $json["promo"]["benefits"] }}
     CTA: {{ $json["promo"]["call_to_action"] }}

     Redacta UNA respuesta breve, coherente y no invasiva. Máx. 80 palabras.
     ```

5. **IF node (`Promo Available?`)**
   - Condición: existe `promo`.
   - Si NO hay promo → termina o sigue el flujo original.

6. **HTTP Request → `Enviar mensaje a bot`**
   - POST a tu endpoint (`{{$env.BOT_ENDPOINT}}/api/promos`).
   - Body JSON:

     ```json
     {
       "userId": "={{$json["userId"]}}",
       "contactId": "={{$json["contactId"]}}",
       "message": "={{$json["text"]}}",
       "promoId": "={{$json["promo"]["id"]}}"
     }
     ```

7. **Registrar Inserción → `Register Promo Insertion`**
   - **IMPORTANTE**: Después de enviar la promo, debes registrar la inserción para que el dashboard muestre las estadísticas correctas.
   - Usa un nodo **HTTP Request** o **Supabase** para llamar a la función SQL:
   
   **Opción A: Usando Supabase REST API (RPC)**
   - Método: `POST`
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/rpc/register_smart_promotion_insertion`
   - Headers:
     - `apikey`: `{{$env.SUPABASE_KEY}}`
     - `Authorization`: `Bearer {{$env.SUPABASE_KEY}}`
     - `Content-Type`: `application/json`
   - Body JSON:
     ```json
     {
       "p_promotion_id": "={{$json[\"promo\"][\"id\"]}}",
       "p_user_id": "={{$json[\"userId\"]}}",
       "p_contact_id": "={{$json[\"contactId\"]}}"
     }
     ```
   
   **Opción B: Usando nodo Supabase (si está disponible)**
   - Operación: `Execute Function`
   - Función: `register_smart_promotion_insertion`
   - Parámetros:
     - `p_promotion_id`: `{{$json["promo"]["id"]}}`
     - `p_user_id`: `{{$json["userId"]}}`
     - `p_contact_id`: `{{$json["contactId"]}}`
   
   Esta función:
   - Registra la inserción en la tabla `smart_promotion_insertions`
   - Actualiza `last_triggered_at` y `trigger_count` en `smart_promotions`
   - Permite que el dashboard muestre las estadísticas correctas de "Menciones hoy"

---

## 4. Archivo JSON de ejemplo

El archivo [`promos-inteligentes-flow.json`](./promos-inteligentes-flow.json) contiene un flujo listo para importar en n8n 1.69+. Debes:

1. Ir a **n8n → Flows → Import**.
2. Elegir `promos-inteligentes-flow.json`.
3. Actualizar credenciales en los nodos `HTTP Request (Supabase)` y `HTTP Request (Enviar Promo)`.
4. Verificar el nombre de tus campos (`userId`, `contactId`, `messages`, etc.).
5. Ajustar el prompt en el nodo OpenAI si usas otro modelo.

---

## 5. Buenas prácticas

- **Throttle**: usa un nodo `Rate Limit` o `Function` que consulte cuántas promos ya se enviaron a ese contacto hoy.
- **Etiquetas**: si limitas Promos a ciertas etiquetas, agrega un paso que lea el contacto/labels antes de elegir promo.
- **Fallback**: si la IA decide no enviar la promo, simplemente deja que el flujo continúe con la respuesta normal.
- **Monitoreo**: usa los campos `trigger_count` y `last_triggered_at` para mostrar métricas en la UI (ya se renderizan en la tarjeta).

Con esto deberías tener Promos Inteligentes funcionando end-to-end. Ajusta el flujo a tus necesidades y mantén las claves en credenciales seguras.
