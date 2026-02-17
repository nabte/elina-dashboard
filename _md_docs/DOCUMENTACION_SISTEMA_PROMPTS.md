# Documentación del Sistema de Entrenamiento y RAG de Prompts

Este documento describe la arquitectura completa del sistema de "Prompt Learning", diseñado para permitir que la IA mejore iterativamente mediante versionado de prompts, simulación de conversaciones y aprendizaje por refuerzo con ejemplos (RAG).

## 1. Flujo General del Sistema

El objetivo es cerrar el ciclo entre la edición del prompt y el comportamiento real de la IA:
1.  **Edición**: El usuario modifica su prompt en el Dashboard.
2.  **Simulación**: El usuario prueba el prompt con un chat simulado.
3.  **Feedback**: El usuario marca respuestas como "buenas" o "malas" (ejemplos de entrenamiento).
4.  **Inferencia**: Cuando un cliente real escribe, la IA busca no solo en documentos, sino en **ejemplos de entrenamiento** relevantes para saber cómo comportarse.

---

## 2. Arquitectura de Base de Datos (Supabase)

El sistema se apoya en 4 pilares fundamentales de datos.

### A. Tabla `prompts` (Master)
Almacena el prompt actual y activo del usuario.
```sql
CREATE TABLE prompts (
    user_id UUID PRIMARY KEY, -- Enlace 1:1 con el usuario
    prompt_content TEXT NOT NULL,
    updated_at TIMESTAMPTZ
);
```

### B. Tabla `prompt_versions` (Historial)
Cada vez que se guarda un prompt, se genera una versión inmutable.
```sql
CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    prompt_content TEXT NOT NULL,
    version_number INTEGER, -- Autoincremental por usuario
    change_reason TEXT,     -- Explicación del cambio (ej: "Ajustar tono de venta")
    created_at TIMESTAMPTZ
);
```

### C. Tabla `training_examples` (Memoria RAG)
Aquí se guarda el "conocimiento de comportamiento".
```sql
CREATE TABLE training_examples (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_message TEXT,      -- Qué dijo el usuario
    ai_response TEXT,       -- Cómo respondió la IA
    is_good_example BOOLEAN, -- TRUE = Imitar, FALSE = Evitar
    embedding VECTOR(1536)   -- Vector semántico para búsqueda rápida
);
```

### D. Contactos de Simulación (`contacts` + `chat_history`)
Para aislar las pruebas de los datos reales, usamos contactos especiales.
*   **Unique Simulation Contact**: Cada usuario tiene 1 contacto vinculado (`is_simulation = true`).
*   **Chat History**: Los chats de simulación se guardan con `is_simulation = true` y el ID del contacto simulado.

---

## 3. Lógica del Backend (Edge Functions & RPC)

### Función: `get_or_create_simulation_contact` (PostgreSQL)
Garantiza que el usuario siempre tenga un entorno seguro de pruebas.
*   **Entrada**: `user_id`
*   **Lógica**: Busca si existe un contacto con `is_simulation=true`. Si no, lo crea con nombre "Usuario de Simulación".
*   **Salida**: Objeto `contact` completo (con ID real).

### Función: `rag-with-fallback` (Deno Edge Function)
El cerebro de la recuperación de información.
1.  Recibe la consulta del usuario.
2.  Genera un embedding.
3.  **Búsqueda Híbrida**:
    *   Busca en `training_examples`: "¿He tenido conversaciones similares antes que el usuario marcó como buenas/malas?"
    *   Busca en documentos de negocio (PDFs, precios).
4.  **Construcción de Contexto**: Une ambas fuentes para el Prompt del Sistema.

---

## 4. Flujo de Automatización (n8n)

El workflow de n8n orquesta la simulación.

### Paso 1: Webhook de Entrada
Recibe `isSimulation: true` y `simulationUserId` desde el Dashboard.

### Paso 2: Resolución de Identidad
En lugar de usar datos hardcodeados, **llama a Supabase**:
*   **Nodo**: `HTTP Request` (POST `/rpc/get_or_create_simulation_contact`)
*   **Resultado**: Obtiene el `contact_id` real (ej: 543) del entorno de simulación.

### Paso 3: RAG Inteligente
*   **Nodo**: `2. RAG - Buscar en Supabase`
*   **Payload**: Envía `include_simulations: true` a la Edge Function.
*   Esto permite que la IA recuerde lo que se habló en la sesión de prueba actual, manteniendo el contexto.

### Paso 4: Generación y Guardado
*   Genera la respuesta con OpenAI.
*   Guarda el mensaje en `chat_history` usando el `contact_id` de simulación y el `prompt_version` actual.

---

## 5. Resumen para Desarrolladores (IA)

Si vas a modificar este sistema, ten en cuenta:

1.  **Integridad de Datos**: NUNCA uses IDs negativos o inventados para `contact_id`. Siempre usa la función RPC `get_or_create_simulation_contact`.
2.  **Contexto**: El RAG debe recibir siempre el flag `include_simulations: true` cuando el origen es el Dashboard.
3.  **Versionado**: Al guardar un prompt, DEBES actualizar tanto la tabla `prompts` (estado actual) como insertar en `prompt_versions` (auditoría).
4.  **Feedback**: Los ejemplos de entrenamiento (`training_examples`) son la forma más potente de corregir al modelo sin cambiar el Prompt Maestro constantemente.
