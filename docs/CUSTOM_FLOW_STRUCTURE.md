# Estructura de Flujos Personalizados (Custom Flows)

Este documento define la estructura JSON para los "Flujos Personalizados" que permiten a las Auto Responses ejecutar secuencias lógicas e interactivas.

## Concepto
Un **Flujo** es un array de objetos JSON, donde cada objeto representa un "Paso" o "Nodo". El sistema ejecuta estos pasos secuencialmente o saltando según condiciones.

## Ubicación en Base de Datos
- **Tabla:** `auto_responses`
- **Columna:** `flow_data` (JSONB)
- **Flag:** `is_flow` (Boolean) - Si es `true`, el sistema ignora `response_text` y ejecuta `flow_data`.

## Estructura General
```json
[
  {
    "id": "step_unique_id",
    "type": "TYPE_NAME",
    "next_step": "step_id_to_go_next", // null para terminar
    ... propiedades específicas del tipo ...
  }
]
```

## Tipos de Nodos (Steps)

### 1. Mensaje (`message`)
Envía un mensaje de texto al usuario.
```json
{
  "id": "welcome_msg",
  "type": "message",
  "content": "¡Hola! Gracias por contactarnos.",
  "next_step": "ask_name"
}
```

### 2. Esperar Respuesta (`wait_for_response`)
Detiene el flujo y espera a que el usuario envíe un mensaje. El mensaje del usuario se guarda en una variable.
```json
{
  "id": "ask_name",
  "type": "wait_for_response",
  "variable": "user_name", // Nombre de variable para guardar la respuesta
  "next_step": "process_name"
}
```

### 3. Condición (`condition`)
Evalúa una variable y decide a qué paso ir.
```json
{
  "id": "check_interest",
  "type": "condition",
  "variable": "user_interest", // Variable a evaluar (previamente guardada)
  "rules": [
    { "match": "contains", "value": "ventas", "next_step": "sales_flow" },
    { "match": "contains", "value": "soporte", "next_step": "support_flow" }
  ],
  "default_next_step": "general_info" // Si ninguna regla coincide
}
```

### 4. Acción (`action`)
Ejecuta una acción interna (enviar email, notificar equipo, activar IA, etc.).
```json
{
  "id": "notify_agent",
  "type": "action",
  "action_type": "notify_team", // Tipo de acción
  "payload": {
    "team_id": "sales",
    "message": "Nuevo lead interesado en: {{user_interest}}"
  },
  "next_step": "end_flow"
}
```

### 5. Análisis IA (`ai_analysis`)
Pide a la IA que analice el input del usuario o variables y guarde el resultado.
```json
{
  "id": "analyze_sentiment",
  "type": "ai_analysis",
  "prompt": "Analiza el sentimiento de este mensaje: {{last_user_message}}. Responde solo POSITIVO, NEGATIVO o NEUTRO.",
  "output_variable": "sentiment_result",
  "next_step": "check_sentiment"
}
```

## Ejemplo Completo
Un flujo de calificación de leads simple:

```json
[
  {
    "id": "intro",
    "type": "message",
    "content": "Hola, ¿te interesa comprar o rentar?",
    "next_step": "wait_intent"
  },
  {
    "id": "wait_intent",
    "type": "wait_for_response",
    "variable": "intent",
    "next_step": "check_intent"
  },
  {
    "id": "check_intent",
    "type": "condition",
    "variable": "intent",
    "rules": [
      { "match": "contains", "value": "comprar", "next_step": "sales_route" },
      { "match": "contains", "value": "rentar", "next_step": "rent_route" }
    ],
    "default_next_step": "agent_route"
  },
  {
    "id": "sales_route",
    "type": "message",
    "content": "Perfecto, tenemos 3 propiedades en venta. ¿Cuál es tu presupuesto?",
    "next_step": null
  }
]
```
