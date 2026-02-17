# GUÍA: Sistema de Borradores y Simulación Avanzada

He implementado el sistema de separación entre tu prompt **Oficial** y tus **Borradores**. Ahora puedes editar y probar sin miedo a afectar a tus clientes reales.

## 1. ¿Cómo funciona ahora?

1.  **Auto-Guardado**: Mientras escribes en el editor, el sistema guarda tu progreso automáticamente cada **5 minutos** en una columna secreta (`prompt_draft`).
2.  **Simulación Real**: Cuando escribes en el chat de simulación, la IA usa **lo que tienes actualmente en el editor**, aunque no lo hayas guardado como oficial.
3.  **Botón "Guardar" (Oficial)**: Solo cuando presionas el botón de guardar, el borrador se convierte en la versión oficial ("Production") y se crea un registro en el historial de versiones.

---

## 2. Ajuste Manual en n8n (CRÍTICO)

Para que n8n use tu borrador en el simulador, necesitas cambiar una pequeña expresión en tu workflow:

1.  Abre tu workflow `Elina V4 Simulacion COMPLETO`.
2.  Busca el nodo que genera la respuesta (donde se usa el System Prompt).
3.  Cambia la referencia del prompt por esta expresión:
    
    `={{ $node["Webhook1"].json.body.draft_prompt || $node["Obtener Prompt y Configuración1"].json.prompt_content }}`

> [!TIP]
> Esta lógica significa: "Si el webhook trae un borrador (porque es simulación), usa ese. Si no, usa el prompt oficial de la base de datos".

---

## 3. Verificación de los Cambios

### En Supabase:
He añadido estas columnas a tu tabla `prompts`:
- `prompt_draft`: Para tus cambios temporales.
- `draft_updated_at`: Para saber cuándo fue el último auto-guardado.

### En el Dashboard:
- El editor ahora carga tu último borrador guardado al abrir la pestaña.
- El simulador envía el campo `draft_prompt` con el contenido exacto de tu editor.

**¿Listo para probar?** Escribe algo nuevo en el editor (sin guardar), prueba en el chat, y verás cómo la IA ya conoce tus cambios.
