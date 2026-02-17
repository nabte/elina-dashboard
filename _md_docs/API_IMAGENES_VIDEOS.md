# 🎨 API para Generación de Imágenes y Videos

## ✅ API Confirmada: **GEMINI**

El sistema de Diseñador Gráfico IA utiliza **Google Gemini** para generar imágenes.

### Detalles Técnicos

- **Edge Function**: `gemini-proxy`
- **Modelo**: `google/nano-banana`
- **Tipo**: Generación de imágenes
- **Formato de salida**: PNG (configurable)
- **Aspect Ratio**: Auto (configurable)

### Ubicación en el Código

**Archivo**: `designer-ai.js`

```javascript
const IMAGE_GENERATION_SETTINGS = {
    model: 'google/nano-banana',
    aspectRatio: 'auto',
    outputFormat: 'png'
};

// Llamada a la API
const { data, error } = await window.auth.invokeFunction('gemini-proxy', {
    body: {
        userId,
        type: 'image',
        parts: buildGeminiParts(prompt)
    }
});
```

### Funcionalidades

1. **Generación de Flyers**: Diseños promocionales para redes sociales
2. **Visualización de Productos**: Renderizados fotorealistas de productos
3. **Estudio Fotográfico IA**: Fotos de perfil profesionales (headshots)

### Edge Function

La función `gemini-proxy` está ubicada en:
- `supabase/functions/gemini-proxy/index.ts`

Esta función actúa como proxy entre el frontend y la API de Google Gemini, manejando:
- Autenticación
- Construcción de prompts
- Procesamiento de respuestas
- Manejo de errores

---

## ❌ NO se usa KIE

El sistema **NO utiliza KIE** para generación de imágenes. KIE se usa para otras funcionalidades (procesamiento de imágenes, proxy, etc.) pero no para generación.

---

## 📝 Notas

- Las imágenes generadas se guardan en la galería del usuario (`profiles.gallery_images`)
- Se suben automáticamente a Bunny.net CDN
- El sistema tiene límites de uso según el plan del usuario (`image_generations_limit`)

---

## 🎬 API para Generación de Videos

### ✅ API Confirmada: **KIE Veo 3.1 Fast**

El sistema de Video IA utiliza **KIE Veo 3.1 Fast** para generar videos.

### Detalles Técnicos

- **Edge Function**: `kie-veo-proxy`
- **Modelo**: `veo3_fast` (la opción más económica)
- **API**: `https://api.kie.ai/api/v1/veo/generate`
- **Aspect Ratio por defecto**: `Auto` (ajusta automáticamente a vertical 9:16)
- **Formato**: MP4 con audio

### Ubicación en el Código

**Archivo**: `video-ai.js`

```javascript
const payload = {
    prompt: combinedPrompt, // Combinación de acciones, texto y audio
    model: 'veo3_fast', // Siempre la opción más barata
    aspectRatio: 'Auto', // Por defecto Auto (vertical)
    generationType: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO',
    enableTranslation: true,
    imageUrls: imageUrls.length ? imageUrls : undefined,
};
```

### Funcionalidades

1. **Text-to-Video**: Genera videos solo con texto
2. **Image-to-Video**: Genera videos a partir de imágenes de referencia
3. **First and Last Frames**: Crea transiciones entre dos imágenes

### Edge Function

La función `kie-veo-proxy` está ubicada en:
- `supabase/functions/kie-veo-proxy/index.ts`

Esta función:
- Usa la API Key de KIE configurada en variables de entorno
- Maneja la autenticación con Bearer Token
- Procesa las respuestas asíncronas (polling)
- Retorna el `taskId` para seguimiento

### Configuración

- **API Key**: Debe estar configurada como `KIE_API_KEY` en las variables de entorno de Supabase
- **Modelo por defecto**: `veo3_fast` (más económico)
- **Aspect Ratio por defecto**: `Auto` (ajusta a vertical automáticamente)

### Proceso de Generación

1. Usuario completa las secciones (acciones, texto, audio)
2. Se combinan en un prompt único
3. Se envía a `kie-veo-proxy` edge function
4. Se obtiene un `taskId`
5. Se hace polling con `kie-task-status` hasta completar
6. El video se descarga y sube a Bunny.net CDN
7. Se muestra el resultado al usuario

