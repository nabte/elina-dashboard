// designer-ai.js - Módulo para el panel de Diseño Gráfico con IA

(function () {
    // --- ESTADO DEL MÓDULO ---
    let isInitialized = false;
    let activeTool = 'home'; // 'home', 'flyer', 'product', 'headshot'
    let localGallery = [];
    let activeImage = null;
    let globalGallery = []; // Galería de todas las imágenes generadas
    let usageInfo = { used: 0, limit: 0 }; // Caché para el uso de imágenes
    let userBranding = null;
    let isLoading = false;
    const IMAGE_GENERATION_SETTINGS = {
        provider: 'kie', // Kie.ai como único proveedor
        model: 'google/nano-banana-edit', // Único modelo
        aspectRatio: 'auto',
        outputFormat: 'png'
    };
    window.designerAiSettings = IMAGE_GENERATION_SETTINGS;
    let eventsBound = false;

    // Estado para la nueva herramienta de Headshot
    let headshotState = {
        images: { ref1: null, ref2: null, ref3: null },
        scene: 'professional',
        finalPrompt: ''
    };

    // Estado para la herramienta de Flyer
    let flyerState = {
        images: { logo: null, product: null, background: null, ref1: null, ref2: null, ref3: null },
        removeProductBg: true,
        flyerStyle: 'none',
        colors: [],
        textInputs: { headline: '', secondary: '', terms: '', price: '', visuals: '', styleMods: '' },
        finalPrompt: ''
    };

    // Estado para la herramienta de Producto
    let productState = {
        images: { main: null, opt1: null, opt2: null },
        mode: 'product-only',
        productOnlyData: { environment: 'studio', customPrompt: '' },
        lifestyleData: { who: 'none', whoCustom: '', where: 'none', whereCustom: '', when: 'none', whenCustom: '' },
        finalPrompt: ''
    };

    // --- CONSTANTES (MIGRADO DE /diseñadoria/index.tsx) ---
    const FLYER_STYLE_FRAGMENTS = {
        'none': { name: 'Ninguno / Manual', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/noun.jpg', prompt: 'Create a visually appealing, well-composed, full-bleed promotional graphic based *only* on the user\'s specific instructions for style, text, and visual elements. There is no predefined base style. Fill the entire canvas edge-to-edge.' },
        'corp-moderno': { name: 'Corp. Moderno', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Corporativo%20Moderno.jpg', prompt: 'Professional, clean, full-bleed corporate design. The background should be a smooth, edge-to-edge gradient in corporate blue tones. Use professional, high-quality photos. Typography is a modern, readable sans-serif. Leave ample clean space for text overlays.' },
        'elegancia': { name: 'Elegancia Min.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Elegancia%20Minimalista.jpg', prompt: 'Elegant, minimalist, full-bleed design. Use a clean, light-colored background (like white or soft gray), a refined serif or sans-serif font. The layout must be uncluttered with generous use of negative space. The overall feeling should be premium and sophisticated.' },
        'comida': { name: 'Estilo Audaz', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Comida%20Audaz.jpg', prompt: 'Bold, high-impact, full-bleed promotional design. Use strong, high-contrast colors like red, yellow, and black. The typography must be large and impactful. The main subject should be presented in a powerful and appealing manner.' },
        'colorido': { name: 'Colorido', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/Gemini_Generated_Image_th5h7nth5h7nth5h.png', prompt: '"Modern Health Campaign" style full-bleed design. The background should feature smooth, flowing gradients of purple and blue that extend edge-to-edge. All visual and textual elements must be integrated directly into this background, utilizing clean, geometric divisions (e.g., sharp diagonal lines, large color blocks, or integrated rounded shapes). High-quality, relevant photography should be seamlessly blended into sections of this full-bleed layout. Typography is a modern, clean sans-serif, using varying weights and colors to establish clear hierarchy.' },
        'urbano': { name: 'Collage Urbano', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Collage%20Urbano.jpg', prompt: 'Dynamic, urban collage-style, full-bleed promotional design. Combine textures like torn paper, duct tape, and spray paint splatters. Use a mix of gritty, high-contrast photography and bold, handwritten or stencil-style fonts. The vibe should be edgy and energetic.' },
        'deporte': { name: 'Estilo Dinámico', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Deporte%20Din%C3%A1mico.jpg', prompt: 'Energetic and dynamic, full-bleed promotional design. Use strong diagonal lines, motion blur effects, and a high-contrast color palette. Typography should be bold, modern, and convey a sense of speed and power.' },
        'premium': { name: 'Brillo Premium', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Brillo%20Premium.jpg', prompt: 'Luxurious and premium, full-bleed design. Use a dark, sophisticated color palette, often incorporating gold, silver, or metallic accents. Lighting should be elegant, creating soft highlights and shadows. The mood is exclusive and high-end.' },
        'lineas': { name: 'Líneas', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/Gemini_Generated_Image_r0m7v1r0m7v1r0m7.png', prompt: '"Dynamic Geometric" style full-bleed design. The composition is based on a clean, bright white background that is geometrically divided by fluid, rounded shapes (circles, capsule-like diagonal forms) in various tones of blue. These shapes must extend to the very edges of the canvas. All visual and textual elements, including photography, must be seamlessly integrated as part of this unified full-bleed canvas. Typography is modern and clean sans-serif, using bold weights for headlines and lighter weights for details.' },
    };
    const ENVIRONMENT_FRAGMENTS = {
        studio: { name: 'Foto de Estudio Clásica', description: 'Fondo limpio y neutro.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/foto%20estudio%20clasica.png', prompt: 'on a seamless, light gray background. The lighting is a soft, three-point setup, creating subtle, flattering shadows that define the product\'s form. Hyper-realistic, 8k, tack sharp focus.' },
        lifestyle: { name: 'Escena de Estilo de Vida', description: 'Integrado en una escena realista.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/lifestyle.png', prompt: 'on a rustic wooden coffee shop table, next to a steaming latte with latte art. Natural, soft window lighting is coming from the side. The scene feels candid, atmospheric, and has a shallow depth of field.' },
        'flat-lay': { name: 'Plano Cenital (Flat Lay)', description: 'Vista desde arriba con accesorios.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/flat%20lay.png', prompt: 'in a perfectly organized top-down flat lay composition on a clean white surface alongside a partially open laptop, a pair of stylish eyeglasses, and a small green succulent plant. The lighting is bright, even, and shadowless.' },
        texture: { name: 'Sobre Fondo Texturizado', description: 'Colocado sobre mármol, madera, etc.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/fondo%20texturizado.png', prompt: 'placed on a rough, dark slab of natural slate. A single, strong directional light rakes across the surface, emphasizing the fine texture of the slate and the smooth, glossy glaze of the product. Moody and tactile.' },
        dramatic: { name: 'Entorno Dramático', description: 'Iluminación cinematográfica.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/entorno%20dramatico.png', prompt: 'on a wet, volcanic rock with mist swirling in the background. The lighting is high-contrast and moody, with a single spotlight hitting the product, making it glow. Shot from a low-angle to make it feel monumental and epic.' },
        abstract: { name: 'Conceptual y Abstracto', description: 'Ambiente surrealista y artístico.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/abstracto.png', prompt: 'floating and partially submerged in crystal clear water, with vibrant clouds of blue and orange ink swirling around it. Bold, artistic lighting creates beautiful refractions through the water and on the product\'s surface.' },
    };
    const LIFESTYLE_WHO = {
        'none': { name: 'Ninguno', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/noun.jpg', prompt: '' },
        'woman': { name: 'Mujer', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/quien%20lo%20usa%20mujer.png', prompt: 'a woman is using the product naturally.' },
        'man': { name: 'Hombre', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/quien%20los%20usa%20hombre.png', prompt: 'a man is using the product naturally.' }
    };
    const LIFESTYLE_WHERE = {
        'none': { name: 'Ninguno', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/noun.jpg', prompt: '' },
        'nature': { name: 'Naturaleza', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/donde%20se%20usa%20naturaleza.png', prompt: 'The scene is set in a vibrant, natural environment like a forest or a beach.' },
        'city': { name: 'Urbano', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/donde%20lo%20usa%20urbano.png', prompt: 'The scene is set in a dynamic, modern urban environment, like a bustling city street or a stylish cafe.' },
        'home': { name: 'Hogar', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/donde%20lo%20usa%20hogar.png', prompt: 'The scene is set inside a cozy, well-lit home, like a living room or kitchen.' }
    };
    const LIFESTYLE_WHEN = {
        'none': { name: 'Ninguno', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/noun.jpg', prompt: '' },
        'day': { name: 'Día', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/ambiente%20dia%20soleado.png', prompt: 'The lighting is bright and clear, like a sunny morning or midday.' },
        'sunset': { name: 'Atardecer', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/ambiente%20atardecer%20dorado.png', prompt: 'The lighting is warm and golden, characteristic of a beautiful sunset.' },
        'night': { name: 'Noche', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/ambiente%20noche.png', prompt: 'The scene is set at night, with dramatic, moody lighting from artificial sources like city lights or lamps.' }
    };
    const HEADSHOT_SCENES = {
        'professional': { name: 'Profesional', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_tdnut4tdnut4tdnu.png', prompt: 'A professional corporate headshot. The person is in business attire, with a soft, out-of-focus modern office background. Lighting is flattering and studio-quality. The expression is confident and approachable. Photorealistic, 8k, sharp focus on the eyes.' },
        'casual': { name: 'Casual Urbano', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_bo3epfbo3epfbo3e.png', prompt: 'A friendly, casual outdoor portrait in a vibrant urban setting, like a stylish city street with bokeh lights. The person is dressed in smart-casual clothing. The lighting is bright, natural daylight, creating a warm and inviting mood. Photorealistic, shallow depth of field.' },
        'studio': { name: 'Estudio Creativo', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_b7m3uob7m3uob7m3.png', prompt: 'A modern, creative studio headshot. The person is against a solid, bold-colored background (like deep teal or mustard yellow). The lighting is more dramatic and artistic, with a key light creating defined shadows. The expression is confident and creative. High-fashion style, sharp details.' },
        'nature': { name: 'Naturaleza', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_h265k4h265k4h265.png', prompt: 'A relaxed, natural headshot in a lush, green environment like a park or forest. The person is dressed casually. The lighting is soft, diffused sunlight filtering through leaves, creating a serene and authentic atmosphere. Photorealistic, natural look.' },
        'event': { name: 'En Evento', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_amp7eiamp7eiamp7.png', prompt: 'A dynamic, in-action headshot as if taken at a professional conference or networking event. The person appears engaged, perhaps speaking or listening intently. The background is blurred, showing hints of a crowd and event lighting, giving a sense of energy and professionalism. Candid style.' },
        'minimalist': { name: 'Minimalista', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_761a3j761a3j761a.png', prompt: 'A clean, minimalist headshot against a simple, textured, light-gray or off-white studio background. The lighting is perfectly even and soft, eliminating harsh shadows. The focus is entirely on the person\'s natural expression. Modern and clean aesthetic.' }
    };

    // --- INICIALIZACIÓN ---
    document.addEventListener('panel:activated', ({ detail }) => {
        if (detail.panelId === 'designer-ai' && !isInitialized) {
            initDesignerPanel(); // Se ejecuta solo la primera vez
        } else if (detail.panelId === 'designer-ai' && window.appInstance) {
            // Si el panel ya está inicializado, solo refresca el contador al volver a entrar.
            // La nueva lógica de eventos se encargará de la actualización.
            window.appInstance.renderUsageAndLimits();
        }
    });

    function initDesignerPanel() {
        isInitialized = true;
        // Ahora la inicialización carga los datos primero
        // --- INICIO: Escuchar el evento de actualización de uso ---
        document.addEventListener('usage:updated', ({ detail }) => {
            const info = detail?.imageGenerations;
            if (!info) return;
            const limit = typeof info.limit === 'number' ? info.limit : 0;
            const remaining = typeof info.remaining === 'number' ? info.remaining : 0;
            usageInfo.limit = limit;
            usageInfo.used = Math.max(0, limit - remaining);
            refreshUsageDisplay();
            render();
        });
        // --- FIN: Escuchar el evento ---

        loadInitialDataAndRender();
        setupEventListeners();
    }

    async function loadInitialDataAndRender() {
        isLoading = true;
        render(); // Muestra un spinner mientras carga

        try {
            const userId = window.auth.getSession()?.user?.id;
            // --- INICIO: Cargar galerÃ­a global ---
            const { data, error } = await window.auth.sb.from('profiles').select('branding_settings, gallery_images').eq('id', userId).single(); // Asegurarse de seleccionar gallery_images
            // Asegurarse de que globalGallery sea siempre un array
            globalGallery = [];
            if (data?.gallery_images) {
                globalGallery = data.gallery_images.map(url => ({ id: url, src: url }));
            }
            // --- FIN: Cargar galerÃ­a global ---
            if (error) throw error;
            await preloadUsageDefaults();
            userBranding = data.branding_settings;
            await initializeStatesWithBranding();
        } catch (e) {
            console.error("Error al generar diseño:", e);
            window.showToast(e.message || 'Ocurrio un error al generar la imagen.', 'error');
        } finally {
            isLoading = false;
            render(); // Esto re-renderizarÃ¡ todo, incluyendo el botÃ³n y la galerÃ­a
            refreshUsageDisplay();
        }
    }



    async function preloadUsageDefaults() {
        try {
            if (!window.appInstance) return;
            const loadPlan = typeof window.appInstance.loadUserSubscription === "function"
                ? window.appInstance.loadUserSubscription()
                : Promise.resolve(null);
            const loadUsage = typeof window.appInstance.loadUserUsage === "function"
                ? window.appInstance.loadUserUsage()
                : Promise.resolve(null);

            const [userPlan, userUsage] = await Promise.all([loadPlan, loadUsage]);
            if (userPlan && userUsage) {
                usageInfo.limit = userPlan?.plans?.image_generations_limit ?? 0;
                usageInfo.used = userUsage?.image_generations_used ?? 0;
            }
        } catch (err) {
            console.warn("No se pudo cargar el uso de imagenes:", err);
        }
    }

    async function initializeStatesWithBranding() {
        resetAllStates();
        if (!userBranding) {
            updateAllPrompts();
            return;
        }

        if (Array.isArray(userBranding.colors) && userBranding.colors.length > 0) {
            flyerState.colors = userBranding.colors.slice(0, 4);
        }

        const tasks = [];

        if (userBranding.logo_url) {
            tasks.push(
                urlToImageFile(userBranding.logo_url).then((file) => {
                    if (file) flyerState.images.logo = file;
                })
            );
        }

        if (Array.isArray(userBranding.reference_images)) {
            userBranding.reference_images.slice(0, 3).forEach((url, index) => {
                tasks.push(
                    urlToImageFile(url).then((file) => {
                        if (file) {
                            const key = `ref${index + 1}`;
                            flyerState.images[key] = file;
                        }
                    })
                );
            });
        }

        if (tasks.length > 0) {
            await Promise.allSettled(tasks);
        }

        updateAllPrompts();
    }

    function resetAllStates() {
        const brandPalette = Array.isArray(userBranding?.colors) && userBranding.colors.length > 0
            ? userBranding.colors.slice(0, 4)
            : ['#4F46E5', '#9333EA', '#FFFFFF', '#000000'];
        flyerState = {
            images: { logo: null, product: null, background: null, ref1: null, ref2: null, ref3: null },
            removeProductBg: true,
            flyerStyle: 'none',
            colors: brandPalette,
            textInputs: { headline: '', secondary: '', terms: '', price: '', visuals: '', styleMods: '' },
            finalPrompt: ''
        };
        productState = {
            images: { main: null, opt1: null, opt2: null },
            mode: 'product-only',
            productOnlyData: { environment: 'studio', customPrompt: '' },
            lifestyleData: { who: 'none', whoCustom: '', where: 'none', whereCustom: '', when: 'none', whenCustom: '' },
            finalPrompt: ''
        };
        headshotState = {
            images: { ref1: null, ref2: null, ref3: null },
            scene: 'professional',
            finalPrompt: ''
        };
        localGallery = [];
        activeImage = null;
        updateAllPrompts();
    }

    function updateAllPrompts() {
        updateFlyerPrompt();
        updateProductPrompt();
        updateHeadshotPrompt();
    }

    function safeTrim(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    // Convierte hex a nombre descriptivo de color para evitar que el modelo lo renderice como texto
    function hexToColorName(hex) {
        if (!hex || typeof hex !== 'string') return null;
        hex = hex.replace('#', '').toUpperCase();
        const colorMap = {
            'FF0000': 'red', 'FF4444': 'bright red', 'CC0000': 'dark red', 'FF6666': 'light red',
            '00FF00': 'green', '00CC00': 'dark green', '33FF33': 'bright green', '228B22': 'forest green',
            '0000FF': 'blue', '0066FF': 'royal blue', '3399FF': 'sky blue', '000080': 'navy blue', '00BFFF': 'deep sky blue',
            'FFFF00': 'yellow', 'FFD700': 'gold', 'FFA500': 'orange', 'FF8C00': 'dark orange',
            'FF00FF': 'magenta', 'FF69B4': 'hot pink', 'FFC0CB': 'pink', 'E91E63': 'rose',
            '800080': 'purple', '9B59B6': 'violet', '6A0DAD': 'deep purple', '8E44AD': 'amethyst',
            '00FFFF': 'cyan', '008080': 'teal', '20B2AA': 'light sea green',
            'FFFFFF': 'white', '000000': 'black', '808080': 'gray', 'C0C0C0': 'silver',
            'A52A2A': 'brown', '8B4513': 'saddle brown', 'D2691E': 'chocolate',
            'F5F5DC': 'beige', 'FFFDD0': 'cream', 'FAF0E6': 'linen',
        };
        if (colorMap[hex]) return colorMap[hex];
        // Approximate by hue for unknown hex
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2 / 255;
        if (max - min < 30) {
            if (l > 0.85) return 'off-white';
            if (l > 0.6) return 'light gray';
            if (l > 0.3) return 'gray';
            return 'dark charcoal';
        }
        let h = 0;
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
        if (h < 15) return l > 0.5 ? 'salmon' : 'dark red';
        if (h < 45) return l > 0.5 ? 'peach' : 'burnt orange';
        if (h < 70) return l > 0.5 ? 'light yellow' : 'olive';
        if (h < 150) return l > 0.5 ? 'light green' : 'dark green';
        if (h < 200) return l > 0.5 ? 'light cyan' : 'teal';
        if (h < 260) return l > 0.5 ? 'light blue' : 'dark blue';
        if (h < 310) return l > 0.5 ? 'lavender' : 'deep purple';
        return l > 0.5 ? 'light pink' : 'dark magenta';
    }

    function formatPalette(colors) {
        return colors.filter(Boolean).map((c) => {
            const name = hexToColorName(c);
            return name || c;
        }).join(', ');
    }

    function updateFlyerPrompt() {
        const pieces = [];
        // Instrucción principal: evitar "flyer/poster/mockup" para que no genere un mockup
        pieces.push('Create a full-bleed, edge-to-edge promotional graphic design that fills the ENTIRE canvas. This is the final print-ready artwork itself, NOT a preview, NOT a mockup, NOT a photo of a printed piece. Every pixel of the canvas must be part of the design.');

        const style = FLYER_STYLE_FRAGMENTS[flyerState.flyerStyle];
        if (style) {
            pieces.push(`Visual style direction: ${style.prompt}`);
        }
        if (flyerState.flyerStyle === 'none') {
            const customStyle = safeTrim(flyerState.textInputs.styleMods);
            if (customStyle) {
                pieces.push(`Custom style: ${customStyle}`);
            }
        }

        // Texto: instrucciones claras de qué texto renderizar
        const textParts = [];
        const headline = safeTrim(flyerState.textInputs.headline);
        if (headline) textParts.push(`Main headline text (large, prominent): "${headline}"`);
        const secondary = safeTrim(flyerState.textInputs.secondary);
        if (secondary) textParts.push(`Supporting text (medium size): "${secondary}"`);
        const price = safeTrim(flyerState.textInputs.price);
        if (price) textParts.push(`Call-to-action or price tag (eye-catching): "${price}"`);
        const terms = safeTrim(flyerState.textInputs.terms);
        if (terms) textParts.push(`Fine print (small, bottom area): "${terms}"`);
        if (textParts.length > 0) {
            pieces.push(`TEXT TO RENDER ON THE DESIGN (display these exact words as typography, using readable fonts with good contrast against the background):\n${textParts.join('\n')}`);
        }

        const visuals = safeTrim(flyerState.textInputs.visuals);
        if (visuals) pieces.push(`Additional visual elements: ${visuals}`);

        // Colores: usar nombres descriptivos, no hex
        if (flyerState.colors && flyerState.colors.length) {
            const colorNames = formatPalette(flyerState.colors);
            pieces.push(`Use this color palette throughout the design: ${colorNames}. These are the brand colors — apply them to backgrounds, accents, shapes, and typography.`);
        }

        if (flyerState.removeProductBg) {
            pieces.push('Remove the original background from the product image and integrate the product seamlessly into the design.');
        }
        flyerState.finalPrompt = pieces.join('\n\n').trim();
    }

    function updateProductPrompt() {
        const pieces = [];
        pieces.push('Create a photorealistic, full-bleed product photograph that fills the entire canvas. The product from the reference image must be the hero of the composition — faithfully preserve its shape, colors, materials, and branding details. Professional e-commerce quality, tack-sharp focus, 8K detail.');
        if (productState.mode === 'product-only') {
            const environment = ENVIRONMENT_FRAGMENTS[productState.productOnlyData.environment];
            if (environment) {
                pieces.push(`Place the product ${environment.prompt}`);
            }
            const custom = safeTrim(productState.productOnlyData.customPrompt);
            if (custom) {
                pieces.push(`Additional direction: ${custom}`);
            }
        } else {
            const who = LIFESTYLE_WHO[productState.lifestyleData.who];
            if (who?.prompt) pieces.push(who.prompt);
            const where = LIFESTYLE_WHERE[productState.lifestyleData.where];
            if (where?.prompt) pieces.push(where.prompt);
            const when = LIFESTYLE_WHEN[productState.lifestyleData.when];
            if (when?.prompt) pieces.push(when.prompt);
            const whoCustom = safeTrim(productState.lifestyleData.whoCustom);
            if (whoCustom) pieces.push(`Subject details: ${whoCustom}`);
            const whereCustom = safeTrim(productState.lifestyleData.whereCustom);
            if (whereCustom) pieces.push(`Location details: ${whereCustom}`);
            const whenCustom = safeTrim(productState.lifestyleData.whenCustom);
            if (whenCustom) pieces.push(`Mood details: ${whenCustom}`);
        }
        productState.finalPrompt = pieces.join('\n\n').trim();
    }

    function updateHeadshotPrompt() {
        const pieces = [];
        pieces.push('Generate a professional portrait photograph that fills the entire canvas. Faithfully preserve the face, identity, skin tone, and features of the person in the reference image. The result must look like a real photograph with realistic lighting, natural skin texture, and professional retouching.');
        const scene = HEADSHOT_SCENES[headshotState.scene];
        if (scene?.prompt) {
            pieces.push(scene.prompt);
        }
        pieces.push('Deliver a sharp, flattering headshot suitable for LinkedIn, corporate websites, or professional branding.');
        headshotState.finalPrompt = pieces.join('\n\n').trim();
    }

    function refreshUsageDisplay() {
        const panel = document.getElementById('designer-ai');
        if (!panel) return;
        const span = panel.querySelector(`#${activeTool}-image-generation-usage`);
        if (span) {
            span.textContent = `${usageInfo.used} / ${usageInfo.limit}`;
        }
    }

    function refreshPromptPreview() {
        const panel = document.getElementById('designer-ai');
        if (!panel) return;
        const preview = panel.querySelector('[data-role="prompt-display"]');
        if (preview) {
            if (activeTool === 'flyer') preview.textContent = flyerState.finalPrompt;
            else if (activeTool === 'product') preview.textContent = productState.finalPrompt;
            else if (activeTool === 'headshot') preview.textContent = headshotState.finalPrompt;
        }
        if (activeTool === 'flyer') {
            const manualBlock = panel.querySelector('[data-flyer-style-manual]');
            if (manualBlock) {
                manualBlock.classList.toggle('hidden', flyerState.flyerStyle !== 'none');
            }
        }
        refreshUsageDisplay();
    }

    function setupEventListeners() {
        if (eventsBound) return;
        eventsBound = true;
        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('input', handleDocumentInput);
        document.addEventListener('change', handleDocumentChange);
    }

    function handleDocumentClick(event) {
        const panel = document.getElementById('designer-ai');
        if (!panel) return;

        const toolButton = event.target.closest('[data-tool]');
        if (toolButton && panel.contains(toolButton)) {
            event.preventDefault();
            switchTool(toolButton.dataset.tool);
            return;
        }

        if (event.target.closest('#view-all-gallery-btn')) {
            event.preventDefault();
            openFullGalleryModal();
            return;
        }

        // Hacer clickeable la galería de la página principal
        const galleryItem = event.target.closest('.gallery-item-home');
        if (galleryItem) {
            const imageSrc = galleryItem.dataset.imageSrc;
            if (imageSrc) openDesignerLightbox(imageSrc);
            return;
        }

        const thumbnail = event.target.closest('.gallery-thumbnail');
        if (thumbnail) {
            activeImage = thumbnail.getAttribute('src');
            refreshPromptPreview();
            render();
            return;
        }

        if (event.target.closest('.generate-btn')) {
            event.preventDefault();
            handleGenerateClick();
            return;
        }

        if (event.target.closest('.view-large-btn') || (event.target.closest('#design-result-container') && activeImage && !isLoading)) {
            event.preventDefault();
            if (activeImage) openDesignerLightbox(activeImage);
            return;
        }

        if (event.target.closest('.download-btn')) {
            event.preventDefault();
            if (activeImage) handleDownload(activeImage);
            return;
        }

        const modeButton = event.target.closest('[data-mode]');
        if (modeButton && panel.contains(modeButton)) {
            const nextMode = modeButton.dataset.mode;
            if (nextMode && nextMode !== productState.mode) {
                productState.mode = nextMode;
                updateProductPrompt();
                render();
            }
        }
    }

    function handleDocumentInput(event) {
        const panel = document.getElementById('designer-ai');
        if (!panel || !panel.contains(event.target)) return;
        const target = event.target;

        if (target.matches('textarea[data-flyer_text]')) {
            const key = target.getAttribute('data-flyer_text');
            if (key) {
                flyerState.textInputs[key] = target.value;
                updateFlyerPrompt();
                refreshPromptPreview();
            }
            return;
        }

        if (target.matches('textarea[data-product_text]')) {
            productState.productOnlyData.customPrompt = target.value;
            updateProductPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('textarea[data-lifestyle_text]')) {
            const key = target.getAttribute('data-lifestyle_text');
            if (key) {
                productState.lifestyleData[key] = target.value;
                updateProductPrompt();
                refreshPromptPreview();
            }
            return;
        }

        if (target.matches('input[type="color"][data-index]')) {
            const idx = Number(target.getAttribute('data-index'));
            if (!Number.isNaN(idx)) {
                flyerState.colors[idx] = target.value;
                updateFlyerPrompt();
                refreshPromptPreview();
            }
        }
    }

    function handleDocumentChange(event) {
        const panel = document.getElementById('designer-ai');
        if (!panel || !panel.contains(event.target)) return;
        const target = event.target;

        if (target.matches('#remove-bg-check')) {
            flyerState.removeProductBg = target.checked;
            updateFlyerPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('input[name="flyer-style"]')) {
            flyerState.flyerStyle = target.value;
            updateFlyerPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('input[name="environment"]')) {
            productState.productOnlyData.environment = target.value;
            updateProductPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('input[name="who"]')) {
            productState.lifestyleData.who = target.value;
            updateProductPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('input[name="where"]')) {
            productState.lifestyleData.where = target.value;
            updateProductPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('input[name="when"]')) {
            productState.lifestyleData.when = target.value;
            updateProductPrompt();
            refreshPromptPreview();
            return;
        }

        if (target.matches('input[name="headshot-scene"]')) {
            headshotState.scene = target.value;
            updateHeadshotPrompt();
            refreshPromptPreview();
            return;
        }
    }

    function switchTool(tool) {
        if (!tool || tool === activeTool) return;
        activeTool = tool;
        isLoading = true;
        render();
        initializeStatesWithBranding().finally(() => {
            isLoading = false;
            render();
            refreshPromptPreview();
        });
    }

    async function handleGenerateClick() {
        if (isLoading) return;
        if (usageInfo.limit > 0 && usageInfo.used >= usageInfo.limit) {
            window.showToast('Has alcanzado tu límite de generaciones.', 'error');
            return;
        }

        const prompt = buildPromptForActiveTool();
        if (!prompt) {
            window.showToast('El prompt está vacío o incompleto.', 'error');
            return;
        }

        isLoading = true;
        render();

        try {
            const userId = window.auth.getSession()?.user?.id;
            if (!userId) throw new Error('No se pudo determinar el usuario actual.');

            // Verificar acceso de cuenta primero (si la función existe)
            let accessCheck = null;
            try {
                const { data, error: accessError } = await window.auth.sb.rpc('check_account_access', { p_user_id: userId });
                if (accessError && accessError.code !== 'PGRST202') {
                    throw new Error('Error al verificar el acceso de tu cuenta.');
                } else if (!accessError) {
                    accessCheck = data;
                }
            } catch (e) {
                if (e.code !== 'PGRST202') {
                    throw new Error('Error al verificar el acceso de tu cuenta.');
                }
            }
            if (accessCheck && accessCheck.blocked) {
                throw new Error(accessCheck.reason || 'Tu cuenta está bloqueada. Por favor, contacta con soporte.');
            }

            // Incrementar el contador de uso ANTES de generar
            const { data: usageCheck, error: usageError } = await window.auth.sb.rpc('increment_image_usage', { p_user_id: userId });
            if (usageError || !usageCheck?.success) {
                throw new Error(usageCheck?.message || usageError?.message || 'Error al verificar el uso.');
            }

            // Generación con KIE (único proveedor)
            await generateWithKIE(userId, prompt, usageCheck);
        } catch (err) {
            console.error('Designer AI generation error:', err);
            const message = err?.message || 'Ocurrió un error al generar la imagen.';
            window.showToast(message, 'error');
        } finally {
            isLoading = false;
            render();
        }
    }

    async function generateWithGemini(userId, prompt, usageCheck) {
        const parts = buildGeminiParts(prompt);

        const { data, error } = await window.auth.invokeFunction('gemini-proxy', {
            body: {
                userId,
                type: 'image',
                parts
            }
        });

        if (error) throw error;

        const base64Results = Array.isArray(data?.results) ? data.results : [];
        if (base64Results.length === 0) {
            throw new Error('La IA no devolvió ninguna imagen.');
        }

        const newLocalItems = base64Results.map((src) => ({
            id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            src
        }));
        localGallery.unshift(...newLocalItems);
        activeImage = newLocalItems[0]?.src || activeImage;

        const uploadResults = await Promise.allSettled(
            base64Results.map(async (b64String) =>
                window.auth.invokeFunction('smart-worker', {
                    body: {
                        userId,
                        userEmail: await window.getUserEmail(),
                        b64_json: (b64String.includes(',') ? b64String.split(',')[1] : b64String),
                        subfolder: 'ELINA'
                    }
                })
            )
        );

        const uploadedUrls = uploadResults
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value?.data?.cdnUrl)
            .filter(Boolean);

        if (uploadedUrls.length) {
            const newItems = uploadedUrls.map((url) => ({ id: url, src: url }));
            globalGallery.unshift(...newItems);
            try {
                const galleryToSave = globalGallery.map((item) => item.src);
                await window.auth.sb.from('profiles').update({ gallery_images: galleryToSave }).eq('id', userId);
            } catch (saveError) {
                console.error('No se pudo guardar la galería en el perfil:', saveError);
            }
        }

        usageInfo.used = usageCheck.used || usageInfo.used + 1;
        refreshUsageDisplay();
        window.showToast('Imágenes generadas correctamente.', 'success');
    }

    // Helper para convertir imagen base64 a URL (subir a Bunny.net)
    async function uploadImageFileToBunny(imageFile, userId, folder = 'ELINA') {
        if (!imageFile || !imageFile.base64) return null;

        try {
            const b64Data = imageFile.base64.includes(',')
                ? imageFile.base64.split(',')[1]
                : imageFile.base64;

            const { data, error } = await window.auth.invokeFunction('smart-worker', {
                body: {
                    userId,
                    userEmail: await window.getUserEmail(),
                    b64_json: b64Data,
                    subfolder: folder
                }
            });

            if (error || !data?.cdnUrl) {
                console.warn('Error al subir imagen a Bunny.net:', error);
                return null;
            }

            return data.cdnUrl;
        } catch (err) {
            console.warn('Error al convertir imagen a URL:', err);
            return null;
        }
    }

    // Construir prompt para KIE replicando la lógica de Gemini
    function buildKIEPrompt(basePrompt) {
        const aspectRatio = IMAGE_GENERATION_SETTINGS.aspectRatio;
        let finalPrompt = basePrompt;

        if (aspectRatio && aspectRatio !== 'auto') {
            finalPrompt += `\n\nRender the image using a ${aspectRatio} aspect ratio.`;
        }

        // Build numbered image references matching the exact order images are collected in generateWithKIE
        // Flyer order: logo(1), product(2), background(3), ref1(4), ref2(5), ref3(6)
        // Product order: main(1), opt1(2), opt2(3)
        // Headshot order: ref1(1), ref2(2), ref3(3)
        const imageRoles = [];
        let imgIndex = 1;

        if (activeTool === 'flyer') {
            const images = flyerState.images || {};
            if (images.logo) {
                imageRoles.push(`- Image ${imgIndex}: This is the BRAND LOGO. Place it in the design (typically top or corner area). Reproduce the logo exactly — do not alter, redraw, or reinterpret it. Keep it crisp and legible.`);
                imgIndex++;
            }
            if (images.product) {
                const bgInstruction = flyerState.removeProductBg
                    ? 'Remove its original background and integrate the product cleanly into the composition.'
                    : 'Keep its original background intact.';
                imageRoles.push(`- Image ${imgIndex}: This is the PRODUCT to feature prominently in the design. Preserve its real appearance, shape, and details accurately. ${bgInstruction}`);
                imgIndex++;
            }
            if (images.background) {
                imageRoles.push(`- Image ${imgIndex}: Use this as the BACKGROUND — stretch or adapt it to fill the entire canvas edge-to-edge. All other elements (text, logo, product) are layered on top of this background.`);
                imgIndex++;
            }
            ['ref1', 'ref2', 'ref3'].forEach((key) => {
                if (images[key]) {
                    imageRoles.push(`- Image ${imgIndex}: This is a STYLE REFERENCE. Match its visual style, color mood, layout approach, and overall aesthetic — but do NOT copy it directly. Use it only as creative inspiration.`);
                    imgIndex++;
                }
            });
        } else if (activeTool === 'product') {
            const images = productState.images || {};
            if (images.main) {
                imageRoles.push(`- Image ${imgIndex}: This is the PRIMARY PRODUCT. It is the hero of the image. Reproduce it with exact fidelity — preserve shape, color, texture, branding, and every detail.`);
                imgIndex++;
            }
            if (images.opt1) {
                imageRoles.push(`- Image ${imgIndex}: SECONDARY REFERENCE — use this for additional context about the product (different angle, packaging, or detail shot). Do not create a separate product from this.`);
                imgIndex++;
            }
            if (images.opt2) {
                imageRoles.push(`- Image ${imgIndex}: SECONDARY REFERENCE — additional angle or detail for context only.`);
                imgIndex++;
            }
        } else if (activeTool === 'headshot') {
            const images = headshotState.images || {};
            let faceIdx = 0;
            ['ref1', 'ref2', 'ref3'].forEach((key) => {
                if (images[key]) {
                    if (faceIdx === 0) {
                        imageRoles.push(`- Image ${imgIndex}: This is the PRIMARY FACE REFERENCE. The generated portrait MUST look like this exact person — preserve facial structure, skin tone, eye color, hair, and all identifying features.`);
                    } else {
                        imageRoles.push(`- Image ${imgIndex}: ADDITIONAL FACE REFERENCE of the same person from a different angle. Use it to improve accuracy of the portrait.`);
                    }
                    imgIndex++;
                    faceIdx++;
                }
            });
        }

        if (imageRoles.length > 0) {
            const roleBlock = `HOW TO USE THE PROVIDED REFERENCE IMAGES:\n${imageRoles.join('\n')}`;
            finalPrompt = `${roleBlock}\n\n${finalPrompt}`;
        }

        return finalPrompt;
    }

    // Mapeo de aspect ratio a formato Seedream V4
    function mapAspectToSeedream(ratio) {
        const map = {
            'auto': 'square_hd',
            '1:1': 'square_hd',
            '16:9': 'landscape_16_9',
            '9:16': 'portrait_16_9',
            '4:3': 'landscape_4_3',
            '3:4': 'portrait_4_3',
            '4:5': 'portrait_4_3', // closest match
            '3:2': 'landscape_3_2',
            '2:3': 'portrait_3_2',
            '21:9': 'landscape_21_9'
        };
        return map[ratio] || 'square_hd';
    }

    // Polling genérico para consultar estado de una tarea en KIE
    async function pollKieTask(taskId, maxAttempts = 60, pollInterval = 5000) {
        const supabaseUrl = window.auth.sb.supabaseUrl;
        const functionsUrl = supabaseUrl.replace('/rest/v1', '') + '/functions/v1';
        const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

        let attempts = 0;
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;

            const { data: sessionData } = await window.auth.sb.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            const queryResponse = await fetch(`${functionsUrl}/kie-image-proxy?taskId=${encodeURIComponent(taskId)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'apikey': SB_KEY,
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                }
            });

            const queryText = await queryResponse.text();
            const queryData = queryText ? JSON.parse(queryText) : {};

            if (!queryResponse.ok) {
                console.warn(`[KIE Poll] Error consultando ${taskId}:`, queryData);
                continue;
            }

            if (queryData?.code === 200 && queryData?.data) {
                const state = queryData.data.state;
                if (state === 'success') {
                    const resultJson = JSON.parse(queryData.data.resultJson || '{}');
                    return resultJson.resultUrls || [];
                } else if (state === 'fail') {
                    throw new Error(queryData.data.failMsg || 'La generación falló');
                }
                // waiting/queuing/generating → seguir polling
            }
        }
        throw new Error('Tiempo de espera agotado.');
    }

    async function generateWithKIE(userId, prompt, usageCheck) {
        // Construir prompt enriquecido
        const enrichedPrompt = buildKIEPrompt(prompt);

        // Aspect ratio
        const aspectRatio = IMAGE_GENERATION_SETTINGS.aspectRatio || 'auto';

        // Recolectar imágenes del tool activo (hasta 10)
        let imageFiles = [];
        if (activeTool === 'flyer') {
            const images = flyerState.images || {};
            if (images.logo) imageFiles.push(images.logo);
            if (images.product) imageFiles.push(images.product);
            if (images.background) imageFiles.push(images.background);
            if (images.ref1) imageFiles.push(images.ref1);
            if (images.ref2) imageFiles.push(images.ref2);
            if (images.ref3) imageFiles.push(images.ref3);
        } else if (activeTool === 'product') {
            const images = productState.images || {};
            if (images.main) imageFiles.push(images.main);
            if (images.opt1) imageFiles.push(images.opt1);
            if (images.opt2) imageFiles.push(images.opt2);
        } else if (activeTool === 'headshot') {
            const images = headshotState.images || {};
            if (images.ref1) imageFiles.push(images.ref1);
            if (images.ref2) imageFiles.push(images.ref2);
            if (images.ref3) imageFiles.push(images.ref3);
        }

        // Subir imágenes a Bunny CDN (ambos modelos requieren URLs)
        let imageUrls = [];
        if (imageFiles.length > 0) {
            window.showToast('Subiendo imágenes...', 'info');
            const uploadPromises = imageFiles.map(img => uploadImageFileToBunny(img, userId, 'ELINA'));
            const uploadedUrls = await Promise.all(uploadPromises);
            imageUrls = uploadedUrls.filter(url => url !== null);
        }

        if (imageUrls.length === 0) {
            throw new Error('Se requiere al menos una imagen. Sube imágenes en la sección correspondiente.');
        }

        // Preparar bodies para ambos modelos
        const nanoBananaBody = {
            model: 'google/nano-banana-edit',
            prompt: enrichedPrompt,
            image_urls: imageUrls,
            image_size: aspectRatio,
            output_format: IMAGE_GENERATION_SETTINGS.outputFormat || 'png'
        };

        const seedreamBody = {
            model: 'bytedance/seedream-v4-edit',
            prompt: enrichedPrompt,
            image_urls: imageUrls,
            image_size: mapAspectToSeedream(aspectRatio),
            image_resolution: '1K',
            max_images: 1
        };

        // Enviar ambas tareas en PARALELO
        window.showToast('Generando con 2 motores de IA...', 'info');

        const [nanoBananaResult, seedreamResult] = await Promise.allSettled([
            window.auth.invokeFunction('kie-image-proxy', { body: nanoBananaBody }),
            window.auth.invokeFunction('kie-image-proxy', { body: seedreamBody })
        ]);

        // Extraer taskIds de las tareas creadas
        const tasks = [];
        if (nanoBananaResult.status === 'fulfilled' && nanoBananaResult.value?.data?.code === 200) {
            tasks.push({ taskId: nanoBananaResult.value.data.data.taskId, model: 'Nano Banana' });
        } else {
            console.warn('[Nano Banana] Error al crear tarea:', nanoBananaResult);
        }
        if (seedreamResult.status === 'fulfilled' && seedreamResult.value?.data?.code === 200) {
            tasks.push({ taskId: seedreamResult.value.data.data.taskId, model: 'Seedream V4' });
        } else {
            console.warn('[Seedream V4] Error al crear tarea:', seedreamResult);
        }

        if (tasks.length === 0) {
            throw new Error('No se pudieron crear las tareas de generación.');
        }

        window.showToast(`Esperando ${tasks.length} resultado${tasks.length > 1 ? 's' : ''}...`, 'info');

        // Polling en paralelo para ambas tareas
        const pollResults = await Promise.allSettled(
            tasks.map(t => pollKieTask(t.taskId))
        );

        // Recolectar todas las URLs de resultado
        let allResultUrls = [];
        pollResults.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value.length > 0) {
                allResultUrls.push(...result.value);
            } else if (result.status === 'rejected') {
                console.warn(`[${tasks[i]?.model}] Falló:`, result.reason?.message);
            }
        });

        if (allResultUrls.length === 0) {
            throw new Error('Ningún motor generó resultados. Intenta de nuevo.');
        }

        // Descargar y procesar las imágenes
        const imagePromises = allResultUrls.map(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        });

        const base64Results = await Promise.all(imagePromises);

        const newLocalItems = base64Results.map((src) => ({
            id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            src
        }));
        localGallery.unshift(...newLocalItems);
        activeImage = newLocalItems[0]?.src || activeImage;

        // Subir resultados a Bunny.net para galería permanente
        const uploadResults = await Promise.allSettled(
            base64Results.map((b64String) =>
                window.auth.invokeFunction('smart-worker', {
                    body: {
                        userId,
                        b64_json: (b64String.includes(',') ? b64String.split(',')[1] : b64String),
                        subfolder: 'ELINA'
                    }
                })
            )
        );

        const cdnUrls = uploadResults
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value?.data?.cdnUrl)
            .filter(Boolean);

        if (cdnUrls.length) {
            const newItems = cdnUrls.map((url) => ({ id: url, src: url }));
            globalGallery.unshift(...newItems);
            try {
                const galleryToSave = globalGallery.map((item) => item.src);
                await window.auth.sb.from('profiles').update({ gallery_images: galleryToSave }).eq('id', userId);
            } catch (saveError) {
                console.error('No se pudo guardar la galería en el perfil:', saveError);
            }
        }

        usageInfo.used = usageCheck.used || usageInfo.used + 1;
        refreshUsageDisplay();
        const successCount = allResultUrls.length;
        window.showToast(`${successCount} imagen${successCount > 1 ? 'es generadas' : ' generada'} correctamente.`, 'success');
        render();
    }

    function buildGeminiParts(prompt) {
        const parts = [];
        const aspectRatio = IMAGE_GENERATION_SETTINGS.aspectRatio;
        let finalPrompt = prompt;

        if (aspectRatio && aspectRatio !== 'auto') {
            finalPrompt = `${prompt}

Render the image using a ${aspectRatio} aspect ratio.`;
        }

        const pushImage = (instruction, file) => {
            if (!file || !file.base64 || !file.mimeType) return;
            if (instruction) {
                parts.push({ text: instruction });
            }
            parts.push({
                inlineData: {
                    data: file.base64,
                    mimeType: file.mimeType,
                },
            });
        };

        if (activeTool === 'flyer') {
            const images = flyerState.images || {};
            pushImage('BACKGROUND IMAGE: Usa esta imagen como fondo completo sin distorsionarla.', images.background);

            if (images.product) {
                const productInstruction = flyerState.removeProductBg
                    ? 'PRODUCT IMAGE: Incluye este producto en el diseno y elimina su fondo original.'
                    : 'PRODUCT IMAGE: Incluye este producto en el diseno respetando su fondo.';
                pushImage(productInstruction, images.product);
            }

            pushImage('LOGO IMAGE: Manten la integridad del logo.', images.logo);

            ['ref1', 'ref2', 'ref3'].forEach((key) => {
                pushImage('STYLE REFERENCE: Utiliza esta imagen como inspiracion visual.', images[key]);
            });
        } else if (activeTool === 'product') {
            const images = productState.images || {};
            pushImage('PRIMARY PRODUCT IMAGE: Manten la fidelidad del producto.', images.main);
            pushImage('SECONDARY IMAGE 1: Usa esta referencia solo para detalles adicionales.', images.opt1);
            pushImage('SECONDARY IMAGE 2: Usa esta referencia solo para detalles adicionales.', images.opt2);
        } else if (activeTool === 'headshot') {
            const images = headshotState.images || {};
            ['ref1', 'ref2', 'ref3'].forEach((key) => {
                pushImage('FACE REFERENCE: Preserva la identidad de la persona.', images[key]);
            });
        }

        parts.push({ text: finalPrompt });
        return parts;
    }


    function buildPromptForActiveTool() {
        if (activeTool === 'flyer') return flyerState.finalPrompt;
        if (activeTool === 'product') return productState.finalPrompt;
        if (activeTool === 'headshot') return headshotState.finalPrompt;
        return null;
    }

    function handleDownload(url) {
        if (!url) return;
        try {
            const link = document.createElement('a');
            link.href = url;
            let extension = 'png';
            if (url.startsWith('data:')) {
                const mimeType = url.split(';')[0].split(':')[1] || '';
                extension = mimeType.split('/')[1] || 'png';
            } else {
                const urlPath = new URL(url).pathname;
                const ext = urlPath.split('.').pop();
                if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) extension = ext;
            }
            link.download = `elina-design-${Date.now()}.${extension}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
            window.showToast?.('Descarga iniciada', 'success');
        } catch (err) {
            console.error('Download error:', err);
            window.open(url, '_blank');
            window.showToast?.('Abierto en nueva pestaña — guarda desde ahí', 'info');
        }
    }

    // --- LÃGICA DE RENDERIZADO ---

    function render() {
        const panel = document.getElementById('designer-ai');
        if (!panel) return;

        // Intentar renderizar dentro de un contenedor específico para no borrar las pestañas de app.js
        let targetContainer = document.getElementById('designer-ai-container');
        if (!targetContainer) {
            // Si el contenedor no existe (porque no se cargó designer-ai.html o no está en el DOM),
            // lo creamos o usamos el panel directamente.
            // Para mantener las pestañas, creamos un div si el panel ya tiene las pestañas.
            if (panel.querySelector('.group-tabs-container')) {
                targetContainer = document.createElement('div');
                targetContainer.id = 'designer-ai-container';
                panel.appendChild(targetContainer);
            } else {
                targetContainer = panel;
            }
        }

        let content = '';
        switch (activeTool) {
            case 'flyer':
                content = renderFlyerTool();
                break;
            case 'product':
                content = renderProductTool();
                break;
            case 'headshot':
                content = renderHeadshotTool();
                break;
            case 'home':
            default:
                content = renderHomePage();
        }
        targetContainer.innerHTML = content;
        // Re-renderizar iconos y listeners después de cada cambio de contenido
        lucide.createIcons();
        // Solo adjuntar listeners de subida si no estamos en la página de inicio
        // CORRECCIÓN: Adjuntar listeners de subida después de renderizar
        if (activeTool !== 'home') attachImageUploadListeners();

        // Event listener para selector de proveedor
        // Provider is fixed to google/nano-banana-edit via KIE - no dropdown needed

        // Event listener para resolución de Flux
        const resolutionSelect = panel.querySelector('#kie-resolution-select');
        if (resolutionSelect) {
            resolutionSelect.value = IMAGE_GENERATION_SETTINGS.resolution || '1K';
            resolutionSelect.addEventListener('change', (event) => {
                IMAGE_GENERATION_SETTINGS.resolution = event.target.value;
            });
        }

        const aspectSelect = panel.querySelector('#image-aspect-ratio-select');
        if (aspectSelect) {
            aspectSelect.value = IMAGE_GENERATION_SETTINGS.aspectRatio;
            aspectSelect.addEventListener('change', (event) => {
                IMAGE_GENERATION_SETTINGS.aspectRatio = event.target.value;
                document.dispatchEvent(new CustomEvent('designer-ai:aspect-ratio-changed', {
                    detail: { aspectRatio: IMAGE_GENERATION_SETTINGS.aspectRatio }
                }));
            });
        }
        refreshPromptPreview();
    }

    function renderHomePage() {
        return `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-700">
                <header class="mb-10 relative">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                            <i data-lucide="palette" class="w-6 h-6 text-white"></i>
                        </div>
                        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Diseñador Gráfico IA</h1>
                    </div>
                    <p class="text-slate-500 text-base font-medium max-w-2xl">Potencia tu marca con piezas publicitarias generadas por inteligencia artificial de vanguardia.</p>
                    <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-400/5 rounded-full blur-3xl -z-10"></div>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <button data-tool="flyer" class="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500 text-left">
                        <div class="aspect-[4/3] overflow-hidden">
                            <img src="https://creativersezone.b-cdn.net/ELINA/media%20app/Gemini_Generated_Image_dvylmddvylmddvyl.png" alt="Flyers" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div class="p-6">
                            <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <i data-lucide="layout-template" class="w-5 h-5"></i>
                            </div>
                            <h3 class="font-bold text-xl text-slate-900">Flyers para Redes</h3>
                            <p class="text-sm text-slate-500 mt-2 leading-relaxed">Promociones, anuncios y comunicados con diseño profesional instantáneo.</p>
                        </div>
                    </button>

                    <button data-tool="product" class="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 transition-all duration-500 text-left">
                        <div class="aspect-[4/3] overflow-hidden">
                            <img src="https://creativersezone.b-cdn.net/ELINA/media%20app/Gemini_Generated_Image_fexq2ufexq2ufexq.png" alt="Producto" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div class="p-6">
                            <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <i data-lucide="gem" class="w-5 h-5"></i>
                            </div>
                            <h3 class="font-bold text-xl text-slate-900">Visualizador de Producto</h3>
                            <p class="text-sm text-slate-500 mt-2 leading-relaxed">Coloca tu producto en escenarios fotorrealistas de estudio o estilo de vida.</p>
                        </div>
                    </button>

                    <button data-tool="headshot" class="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 transition-all duration-500 text-left">
                        <div class="aspect-[4/3] overflow-hidden">
                            <img src="https://creativersezone.b-cdn.net/ELINA/media%20app/smarportrairt/Gemini_Generated_Image_vsl3jdvsl3jdvsl3.png" alt="Headshots" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div class="p-6">
                            <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                <i data-lucide="user-round" class="w-5 h-5"></i>
                            </div>
                            <h3 class="font-bold text-xl text-slate-900">Estudio Fotográfico IA</h3>
                            <p class="text-sm text-slate-500 mt-2 leading-relaxed">Crea retratos corporativos y profesionales a partir de cualquier foto casual.</p>
                        </div>
                    </button>
                </div>

                ${globalGallery.length > 0 ? `
                    <div class="pt-8 border-t border-slate-100">
                        <div class="flex items-center justify-between mb-8">
                            <div>
                                <h2 class="text-2xl font-black text-slate-800">Tu Historial Creativo</h2>
                                <p class="text-sm text-slate-400 font-medium">Tus últimas piezas generadas con Elina Designer</p>
                            </div>
                            <button id="view-all-gallery-btn" class="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all active:scale-95">
                                Ver Galería Completa
                                <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i>
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            ${globalGallery.slice(0, 6).map(item => `
                                <div class="gallery-item-home group aspect-square bg-slate-200 rounded-3xl overflow-hidden relative cursor-pointer shadow-md hover:shadow-xl transition-all duration-500" data-image-src="${item.src}" data-image-id="${item.id || item.src}">
                                    <img src="${item.src}" alt="Imagen generada" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div class="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                            <i data-lucide="zoom-in" class="w-6 h-6 text-white"></i>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div> 
                    </div>
                ` : ''}
            </div>
        `;
    }
    function renderToolComponent(title, description, controlsHtml) {
        return `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <nav class="flex items-center gap-1 mb-8 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm w-fit">
                    <button data-tool="home" class="px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${activeTool === 'home' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
                        <i data-lucide="home" class="w-3.5 h-3.5"></i>
                        <span>Inicio</span>
                    </button>
                    <div class="w-px h-5 bg-slate-100 mx-1"></div>
                    <button data-tool="flyer" class="px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${activeTool === 'flyer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
                        <i data-lucide="layout-template" class="w-3.5 h-3.5"></i>
                        <span>Flyers</span>
                    </button>
                    <button data-tool="product" class="px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${activeTool === 'product' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
                        <i data-lucide="gem" class="w-3.5 h-3.5"></i>
                        <span>Producto</span>
                    </button>
                    <button data-tool="headshot" class="px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${activeTool === 'headshot' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
                        <i data-lucide="user-round" class="w-3.5 h-3.5"></i>
                        <span>Estudio IA</span>
                    </button>
                </nav>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <!-- Panel de Configuración -->
                    <div class="lg:col-span-8 space-y-8">
                        <div class="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/50 p-6 sm:p-8">
                            <header class="mb-8">
                                <h2 class="text-2xl font-black text-slate-800 tracking-tight">${title}</h2>
                                <p class="text-sm text-slate-500 font-medium mt-1">${description}</p>
                            </header>
                            
                            <div class="space-y-10">
                                ${controlsHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Panel de Resultado y Estadísticas -->
                    <!-- Panel de Resultado y Estadísticas -->
                    <div class="lg:col-span-4">
                        <div class="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 p-5 flex flex-col lg:sticky lg:top-6 gap-6">
                            <div>
                                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <i data-lucide="image" class="w-3.5 h-3.5"></i> Vista Previa
                                </h3>
                                
                                <div id="design-result-container" class="relative aspect-square bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner border border-slate-100 ${!isLoading && activeImage ? 'cursor-pointer' : ''}">
                                    ${isLoading ? `
                                        <div class="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 text-center">
                                            <div class="relative w-16 h-16 mb-4">
                                                <div class="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                                                <div class="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                                            </div>
                                            <p class="font-bold text-slate-800 text-base">Invocando a Elina...</p>
                                            <p class="text-[10px] text-slate-400 mt-1 font-medium italic">Suele tomar 10-15 segundos</p>
                                        </div>
                                    ` : ''}

                                    ${!isLoading && activeImage ? `
                                        <img src="${activeImage}" alt="Resultado" class="w-full h-full object-cover" />
                                    ` : ''}

                                    ${!isLoading && !activeImage ? `
                                        <div class="flex flex-col items-center gap-3 text-slate-300">
                                            <i data-lucide="image" class="w-12 h-12 opacity-20"></i>
                                            <span class="text-[10px] font-bold uppercase tracking-widest opacity-40">Tu diseño aparecerá aquí</span>
                                        </div>
                                    ` : ''}
                                </div>

                                ${!isLoading && activeImage ? `
                                <div class="flex gap-2 mt-3">
                                    <button class="view-large-btn flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs">
                                        <i data-lucide="expand" class="w-3.5 h-3.5"></i>
                                        Ver Grande
                                    </button>
                                    <button class="download-btn flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow-sm shadow-emerald-200">
                                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                        Descargar
                                    </button>
                                </div>
                                ` : ''}

                                ${localGallery.length > 1 ? `
                                <div class="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                                    ${localGallery.slice(0, 8).map((item, i) => `
                                        <img src="${item.src}" alt="Variante ${i + 1}" class="gallery-thumbnail w-12 h-12 rounded-lg object-cover border-2 ${item.src === activeImage ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent hover:border-slate-300'} cursor-pointer transition-all flex-shrink-0" />
                                    `).join('')}
                                </div>
                                ` : ''}
                            </div>

                            <div class="space-y-4">
                                <div class="bg-slate-50/50 rounded-2xl p-4 space-y-3 border border-slate-100">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ajustes</span>
                                        <i data-lucide="settings-2" class="w-3.5 h-3.5 text-indigo-400"></i>
                                    </div>
                                    
                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Motores IA</label>
                                        <div class="px-3 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 border border-slate-100 space-y-0.5">
                                            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Nano Banana Edit</div>
                                            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>Seedream V4 Edit</div>
                                        </div>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Formato</label>
                                        <div class="relative">
                                            <select id="image-aspect-ratio-select" class="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-400 transition-all">
                                                <option value="auto">Auto (Recomendado)</option>
                                                <option value="1:1">Cuadrado (1:1)</option>
                                                <option value="16:9">Horizontal (16:9)</option>
                                                <option value="9:16">Vertical (9:16)</option>
                                                <option value="4:5">Retrato (4:5)</option>
                                                <option value="4:3">Paisaje (4:3)</option>
                                                <option value="3:4">Retrato largo (3:4)</option>
                                                <option value="21:9">Ultra ancho (21:9)</option>
                                            </select>
                                            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-blue-50/50 rounded-2xl p-5 flex items-center justify-between border border-blue-100/50">
                                    <div class="flex flex-col">
                                        <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Créditos Elina</h4>
                                        <p class="text-[9px] text-slate-400 font-medium">Generaciones disponibles</p>
                                    </div>
                                    <div class="bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                                        <span id="${activeTool}-image-generation-usage" class="text-lg font-black text-blue-600 tracking-tighter">0 / 0</span>
                                    </div>
                                </div>

                                <button class="generate-btn group relative w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3" ${isLoading || (usageInfo.limit > 0 && usageInfo.used >= usageInfo.limit) ? 'disabled' : ''}>
                                    ${isLoading ? `
                                        <div class="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                        <span class="text-sm tracking-widest">DISEÑANDO...</span>
                                    ` : `
                                        <i data-lucide="wand-2" class="w-4 h-4 text-white group-hover:rotate-12 transition-transform"></i>
                                        <span class="text-sm tracking-widest uppercase">Crear Diseño</span>
                                    `}
                                </button>
                            </div>

                            ${localGallery.length > 0 ? ` 
                                <div class="pt-4 border-t border-slate-100">
                                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Variantes recientes</h3>
                                    <div class="grid grid-cols-5 gap-2">
                                       ${localGallery.map(gen => `
                                            <div class="gallery-thumbnail-wrapper group relative aspect-square rounded-lg overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all">
                                                <img src="${gen.src}" alt="Variant" class="gallery-thumbnail w-full h-full object-cover ${activeImage === gen.src ? 'opacity-40' : ''}" />
                                                ${activeImage === gen.src ? '<div class="absolute inset-0 flex items-center justify-center"><i data-lucide="check" class="w-4 h-4 text-indigo-600"></i></div>' : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="bg-slate-900 rounded-2xl p-4 text-white group overflow-hidden relative mt-auto border border-white/5">
                                <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                                <h4 class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                                    Consejo Pro Elina
                                </h4>
                                <p class="text-[11px] text-slate-200 leading-tight font-medium">Describe el ambiente: <span class="text-indigo-300">"Una tarde nostálgica en París"</span> es mejor que "Torre Eiffel".</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderFlyerTool() {
        const controls = `
            <div class="space-y-12">
                <section>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">1</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Material de Origen</h3>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
                       ${renderImageUpload('flyer-upload-logo', 'Tu Logo', 'Marca', flyerState.images.logo)}
                       <div class="space-y-3">
                            ${renderImageUpload('flyer-upload-product', 'Producto', 'Principal', flyerState.images.product)}
                            <div class="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 w-fit mx-auto cursor-pointer hover:bg-white transition-colors" onclick="const ck = this.querySelector('input'); ck.checked = !ck.checked; ck.dispatchEvent(new Event('change', {bubbles:true}))">
                                <input type="checkbox" id="remove-bg-check" ${flyerState.removeProductBg ? 'checked' : ''} class="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onclick="event.stopPropagation()" />
                                <label for="remove-bg-check" class="text-[8px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">Re-Fondo</label>
                            </div>
                       </div>
                       ${renderImageUpload('flyer-upload-background', 'Escena', 'Luz / Fondo', flyerState.images.background)}
                    </div>
                    
                    <div class="mt-8">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Referencias de Estilo (Opcional)</p>
                        <div class="grid grid-cols-3 sm:grid-cols-5 gap-4 max-w-3xl">
                            ${renderImageUpload('flyer-upload-ref1', 'Estilo 1', 'Opcional', flyerState.images.ref1)}
                            ${renderImageUpload('flyer-upload-ref2', 'Estilo 2', 'Opcional', flyerState.images.ref2)}
                            ${renderImageUpload('flyer-upload-ref3', 'Estilo 3', 'Opcional', flyerState.images.ref3)}
                        </div>
                    </div>
                </section>

                <section>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">2</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Dirección de Arte</h3>
                    </div>
                    <div class="p-1 bg-slate-50 rounded-3xl border border-slate-100">
                        ${renderStyleSelector(FLYER_STYLE_FRAGMENTS, 'flyer-style', flyerState.flyerStyle)}
                    </div>
                </section>

                <section>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">3</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Contenido y Copia</h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Titular Impactante</label>
                            <textarea data-flyer_text="headline" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all resize-none h-24" placeholder="Ej: 50% DE DESCUENTO SOLO HOY">${flyerState.textInputs.headline}</textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Cuerpo del Mensaje</label>
                            <textarea data-flyer_text="secondary" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all resize-none h-24" placeholder="Ej: Renueva tu hogar con nuestra colección premium...">${flyerState.textInputs.secondary}</textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Precio o Llamada a la Acción</label>
                            <textarea data-flyer_text="price" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all resize-none h-20" placeholder="Ej: DESDE $29.99 / COMPRA YA">${flyerState.textInputs.price}</textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Detalles o Términos</label>
                            <textarea data-flyer_text="terms" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all resize-none h-20" placeholder="Ej: Válido hasta el 31 de Diciembre...">${flyerState.textInputs.terms}</textarea>
                        </div>
                         <div class="md:col-span-2 space-y-2">
                            <label class="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Elementos Visuales Adicionales</label>
                            <textarea data-flyer_text="visuals" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all resize-none h-20" placeholder="Ej: Chispas doradas, confeti flotando, luces de neón en los bordes...">${flyerState.textInputs.visuals}</textarea>
                        </div>
                        <div class="md:col-span-2 space-y-2 ${flyerState.flyerStyle === 'none' ? '' : 'hidden'}" data-flyer-style-manual>
                            <label class="text-xs font-black text-indigo-500 uppercase tracking-wider ml-1">Instrucciones de Estilo Personalizado</label>
                            <textarea data-flyer_text="styleMods" class="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none h-24" placeholder="Ej: Estética vaporwave, colores pastel, degradados suaves y formas orgánicas...">${flyerState.textInputs.styleMods}</textarea>
                        </div>
                    </div>
                </section>

                <section>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">4</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Colores de Marca</h3>
                    </div>
                    <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        ${renderColorPalettePicker(flyerState.colors)}
                    </div>
                </section>

                <section class="opacity-40 hover:opacity-100 transition-opacity">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Prompt de Ingeniería (Referencia)</label>
                    <pre class="w-full bg-slate-950 text-indigo-300 p-6 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto border border-white/10" data-role="prompt-display">${flyerState.finalPrompt}</pre>
                </section>
            </div>
        `;
        return renderToolComponent('Creador de Flyers', 'Convierte tus ideas en piezas publicitarias de alto impacto.', controls);
    }

    function renderProductTool() {
        const canGenerate = !!productState.images.main;
        const controls = `
            <div class="space-y-12">
                <section>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">1</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Carga de Producto</h3>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
                       ${renderImageUpload('product-upload-main', 'Vista Principal', 'Producto', productState.images.main)}
                       ${renderImageUpload('product-upload-opt1', 'Detalle 1', 'Opcional', productState.images.opt1)}
                       ${renderImageUpload('product-upload-opt2', 'Detalle 2', 'Opcional', productState.images.opt2)}
                    </div>
                </section>

                <section class="${canGenerate ? 'animate-in fade-in slide-in-from-top-4' : 'opacity-20 grayscale pointer-events-none'} transition-all duration-500">
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">2</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Modo de Visualización</h3>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button data-mode="product-only" class="group relative overflow-hidden rounded-2xl border-2 transition-all p-1 ${productState.mode === 'product-only' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}">
                            <div class="aspect-video rounded-xl overflow-hidden mb-2.5">
                                <img src="https://creativersezone.b-cdn.net/ELINA/media%20app/product/fondo%20texturizado.png" alt="Solo" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div class="px-3 pb-3">
                                <h4 class="font-bold text-slate-800 text-sm">Producto Solo</h4>
                                <p class="text-[9px] text-slate-500 font-medium">Enfoque total en el objeto.</p>
                            </div>
                            ${productState.mode === 'product-only' ? '<div class="absolute top-3 right-3 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in"><i data-lucide="check" class="w-3 h-3"></i></div>' : ''}
                        </button>

                        <button data-mode="with-human" class="group relative overflow-hidden rounded-2xl border-2 transition-all p-1 ${productState.mode === 'with-human' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}">
                            <div class="aspect-video rounded-xl overflow-hidden mb-2.5">
                                <img src="https://creativersezone.b-cdn.net/ELINA/media%20app/product/lifestyle.png" alt="Humano" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div class="px-3 pb-3">
                                <h4 class="font-bold text-slate-800 text-sm">Estilo de Vida</h4>
                                <p class="text-[9px] text-slate-500 font-medium">Interacción humana real.</p>
                            </div>
                            ${productState.mode === 'with-human' ? '<div class="absolute top-3 right-3 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in"><i data-lucide="check" class="w-3 h-3"></i></div>' : ''}
                        </button>
                    </div>
                </section>

                ${productState.mode === 'product-only' ? `
                    <section class="animate-in fade-in slide-in-from-top-4 duration-500">
                        <div class="flex items-center gap-2 mb-6">
                            <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">3</div>
                            <h3 class="text-lg font-black text-slate-900 tracking-tight">Atmósfera de Estudio</h3>
                        </div>
                        <div class="p-1 bg-slate-50 rounded-3xl border border-slate-100 mb-8">
                            ${renderStyleSelector(ENVIRONMENT_FRAGMENTS, 'environment', productState.productOnlyData.environment)}
                        </div>
                        <div class="space-y-2 px-1">
                            <label class="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Instrucciones Adicionales</label>
                            <textarea data-product_text="customPrompt" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all resize-none h-24" placeholder="Ej: con gotas de agua, sobre un pedestal de mármol, luz cenital dramática...">${productState.productOnlyData.customPrompt}</textarea>
                        </div>
                    </section>
                ` : `
                    <section class="animate-in fade-in slide-in-from-top-4 duration-500 space-y-10">
                        <div class="flex items-center gap-2 mb-6">
                            <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">3</div>
                            <h3 class="text-lg font-black text-slate-900 tracking-tight">Narrativa de Escena</h3>
                        </div>
                        
                        <div class="space-y-12">
                            <div class="space-y-4">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">¿Quién utiliza el producto?</label>
                                <div class="p-1 bg-slate-50 rounded-3xl border border-slate-100">
                                    ${renderStyleSelector(LIFESTYLE_WHO, 'who', productState.lifestyleData.who)}
                                </div>
                                <textarea data-lifestyle_text="whoCustom" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all resize-none h-16" placeholder="Detalles específicos (Ej: una modelo de 30 años, sonriente, cabello rizado)...">${productState.lifestyleData.whoCustom}</textarea>
                            </div>

                            <div class="space-y-4">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">¿En qué locación?</label>
                                <div class="p-1 bg-slate-50 rounded-3xl border border-slate-100">
                                    ${renderStyleSelector(LIFESTYLE_WHERE, 'where', productState.lifestyleData.where)}
                                </div>
                                <textarea data-lifestyle_text="whereCustom" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all resize-none h-16" placeholder="Detalles del entorno (Ej: un loft minimalista, con muchas plantas y luz natural)...">${productState.lifestyleData.whereCustom}</textarea>
                            </div>

                            <div class="space-y-4">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">¿En qué momento / mood?</label>
                                <div class="p-1 bg-slate-50 rounded-3xl border border-slate-100">
                                    ${renderStyleSelector(LIFESTYLE_WHEN, 'when', productState.lifestyleData.when)}
                                </div>
                                <textarea data-lifestyle_text="whenCustom" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all resize-none h-16" placeholder="Detalles de iluminación (Ej: luz dorada de atardecer filtrándose por la ventana)...">${productState.lifestyleData.whenCustom}</textarea>
                            </div>
                        </div>
                    </section>
                `}

                <section class="opacity-40 hover:opacity-100 transition-opacity">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Prompt de Ingeniería (Referencia)</label>
                    <pre class="w-full bg-slate-950 text-emerald-300 p-6 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto border border-white/10" data-role="prompt-display">${productState.finalPrompt}</pre>
                </section>
            </div>
        `;
        return renderToolComponent('Visualizador de Producto', 'Crea escenarios fotorrealistas para tus productos sin necesidad de un estudio físico.', controls);
    }

    function renderHeadshotTool() {
        const canGenerate = !!headshotState.images.ref1;
        const controls = `
            <div class="space-y-12">
                <section>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">1</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Fotos de Referencia</h3>
                    </div>
                    <p class="text-[11px] text-slate-500 mb-6 font-medium">Para entrenar a nuestra IA con tu rostro, necesitamos al menos una foto clara.</p>
                    <div class="grid grid-cols-3 sm:grid-cols-5 gap-6 max-w-2xl">
                       ${renderImageUpload('headshot-upload-ref1', 'Principal', 'Requerido', headshotState.images.ref1)}
                       ${renderImageUpload('headshot-upload-ref2', 'Perfil', 'Opcional', headshotState.images.ref2)}
                       ${renderImageUpload('headshot-upload-ref3', 'Tercio', 'Opcional', headshotState.images.ref3)}
                    </div>
                </section>

                <section class="${canGenerate ? 'animate-in fade-in slide-in-from-top-4' : 'opacity-20 grayscale pointer-events-none'} transition-all duration-500">
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">2</div>
                        <h3 class="text-lg font-black text-slate-900 tracking-tight">Escenario y Estilo</h3>
                    </div>
                    <div class="p-1 bg-slate-50 rounded-3xl border border-slate-100">
                        ${renderStyleSelector(HEADSHOT_SCENES, 'headshot-scene', headshotState.scene)}
                    </div>
                </section>

                <section class="opacity-40 hover:opacity-100 transition-opacity">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Prompt de Ingeniería (Referencia)</label>
                    <pre class="w-full bg-slate-950 text-purple-300 p-6 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto border border-white/10" data-role="prompt-display">${headshotState.finalPrompt}</pre>
                </section>
            </div>
        `;
        return renderToolComponent('Estudio Fotográfico IA', 'Crea retratos profesionales de alta gama a partir de tus fotos habituales.', controls);
    }

    // --- HELPERS DE RENDERIZADO DE COMPONENTES ---

    function renderImageUpload(id, label, sublabel, imageFile) {
        const preview = imageFile ? `data:${imageFile.mimeType};base64,${imageFile.base64}` : null;
        return `
            <div class="image-upload-slot group relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center transition-all hover:bg-white hover:border-indigo-300 hover:shadow-indigo-500/10 cursor-pointer" data-upload-id="${id}">
                <label for="${id}" class="absolute inset-0 cursor-pointer flex flex-col items-center justify-center p-3 text-center">
                    ${!imageFile ? `
                        <div class="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                        </div>
                        <span class="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-tight">${label}</span>
                        <span class="text-[8px] text-slate-400 font-bold uppercase mt-1">${sublabel}</span>
                    ` : ''}
                </label>
                ${imageFile ? `
                    <img src="${preview}" alt="Preview" class="w-full h-full object-cover animate-in fade-in duration-500" />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div class="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        </div>
                    </div>
                ` : ''}
                ${imageFile ? `<button class="remove-button absolute top-1 right-1 w-6 h-6 bg-white text-rose-500 rounded-full flex items-center justify-center shadow-lg border border-slate-100 hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all z-10" data-remove-id="${id}"><i data-lucide="x" class="w-3.5 h-3.5 pointer-events-none"></i></button>` : ''}
                <input id="${id}" type="file" class="hidden" accept="image/*" />
            </div>
        `;
    }

    function renderStyleSelector(options, name, selectedValue) {
        return `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                ${Object.entries(options).map(([key, option]) => `
                    <div class="relative group">
                        <input type="radio" id="${name}-${key}" name="${name}" value="${key}" class="hidden peer" ${selectedValue === key ? 'checked' : ''} />
                        <label for="${name}-${key}" class="block relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer ring-4 ring-transparent peer-checked:ring-indigo-500 peer-checked:shadow-xl peer-checked:shadow-indigo-500/20 transition-all active:scale-95">
                            <img src="${option.image}" alt="${option.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                                <span class="text-white text-[10px] font-black uppercase tracking-widest">${option.name}</span>
                            </div>
                            <div class="absolute top-3 right-3 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity shadow-lg">
                                <i data-lucide="check" class="w-3 h-3"></i>
                            </div>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderColorPalettePicker(colors) {
        return `
            <div class="flex flex-wrap gap-6 items-center">
                ${colors.map((color, index) => `
                    <div class="group relative flex flex-col items-center gap-2">
                        <div class="w-14 h-14 rounded-2xl p-1 bg-white shadow-sm border border-slate-200 transition-all hover:border-indigo-300 hover:shadow-xl active:scale-90 overflow-hidden">
                            <input type="color" value="${color}" data-index="${index}" class="color-swatch-input w-full h-full cursor-pointer rounded-xl border-none p-0 bg-transparent animate-in zoom-in" />
                        </div>
                        <span class="text-[10px] font-black text-slate-500 uppercase font-mono tracking-widest group-hover:text-indigo-600 transition-colors">${color}</span>
                    </div>
                `).join('')}
                
                <div class="flex-grow"></div>
                
                <div class="flex flex-col gap-1 items-end">
                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ajustismo de Color</span>
                    <p class="text-[10px] text-slate-400 font-medium max-w-[140px] text-right leading-tight">Usa los colores de tu marca para una integración perfecta.</p>
                </div>
            </div>
        `;
    }

    // --- MANEJO DE UPLOADS ---

    function attachImageUploadListeners() {
        document.querySelectorAll('.image-upload-slot').forEach(slot => {
            const inputId = slot.dataset.uploadId;
            const input = document.getElementById(inputId);

            // El clic en el label ya abre el input, no necesitamos un listener en el slot.
            slot.querySelector('.remove-button')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Evitar que el clic se propague al label
                handleFileChange(null, inputId);
            });

            input.addEventListener('change', (e) => handleFileChange(e.target.files?.[0] || null, inputId));

            slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('dragging-over'); });
            slot.addEventListener('dragleave', e => { e.preventDefault(); slot.classList.remove('dragging-over'); });
            slot.addEventListener('drop', e => {
                e.preventDefault();
                slot.classList.remove('dragging-over');
                handleFileChange(e.dataTransfer.files?.[0] || null, inputId);
            });
        });
    }

    async function handleFileChange(file, id) {
        const getSlot = (id) => {
            if (id.startsWith('flyer-')) return id.replace('flyer-upload-', '');
            if (id.startsWith('product-')) return id.replace('product-upload-', '');
            if (id.startsWith('headshot-')) return id.replace('headshot-upload-', '');
            return null;
        };

        const slot = getSlot(id);
        if (!slot) return;

        let fileData = null;
        if (file && file.type.startsWith('image/')) {
            try {
                const base64 = await fileToBase64(file);
                fileData = { base64, mimeType: file.type };
            } catch (error) {
                console.error("Error leyendo el archivo:", error);
                window.showToast('Error al leer el archivo.', 'error');
            }
        }

        if (activeTool === 'flyer') {
            flyerState.images[slot] = fileData;
        } else if (activeTool === 'product') {
            productState.images[slot] = fileData;
        } else if (activeTool === 'headshot') {
            headshotState.images[slot] = fileData;
        }

        render();
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result).split(',')[1]);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // --- NUEVO: Helper para convertir URL a formato de archivo Base64 ---
    async function urlToImageFile(url) {
        // --- CORRECCIÃN: Usar la Edge Function 'image-proxy' para evitar errores de CORS ---
        // Validar que la URL sea válida antes de hacer la llamada
        if (!url || typeof url !== 'string' || url.trim() === '') {
            console.warn('urlToImageFile: URL inválida o vacía:', url);
            return null;
        }

        // Validar formato básico de URL
        try {
            new URL(url);
        } catch (e) {
            console.warn('urlToImageFile: URL no tiene formato válido:', url);
            return null;
        }

        try {
            const { data, error } = await window.auth.invokeFunction('image-proxy', {
                body: { url: url.trim() }
            });

            if (error) {
                // Manejar específicamente errores 400 (Bad Request)
                if (error.status === 400 || error.statusCode === 400) {
                    console.warn('image-proxy: Error 400 - URL inválida o parámetros incorrectos:', url);
                } else {
                    throw new Error(`Proxy error: ${error.message || 'Error desconocido'}`);
                }
                return null;
            }

            if (!data || !data.base64 || !data.mimeType) {
                console.warn('image-proxy: Respuesta inválida - falta base64 o mimeType');
                return null;
            }

            return { base64: data.base64, mimeType: data.mimeType };

        } catch (error) {
            console.error(`Error al convertir la URL ${url} a Base64:`, error);
            // No mostramos un toast aquÃ­ para no ser intrusivos si falla la carga de una imagen de referencia.
            return null;
        }
    }


    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // --- LÃGICA PARA LA GALERÃA COMPLETA ---

    function openFullGalleryModal() {
        const modal = document.getElementById('full-gallery-modal');
        const content = document.getElementById('full-gallery-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${globalGallery.map(item => `
                    <div class="aspect-square bg-slate-200 rounded-lg overflow-hidden group relative">
                        <img src="${item.src}" alt="Imagen generada" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button class="view-image-btn p-2 bg-white/80 rounded-full" data-src="${item.src}">
                                <i data-lucide="zoom-in" class="w-6 h-6 text-slate-800 pointer-events-none"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        modal.classList.remove('hidden');
        lucide.createIcons();

        document.getElementById('close-full-gallery-modal-btn')?.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
        content.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-image-btn');
            if (viewBtn && viewBtn.dataset.src) {
                openDesignerLightbox(viewBtn.dataset.src);
            }
        });
    }

    // --- Lightbox propio del designer (no depende de modales externos) ---
    function openDesignerLightbox(src) {
        if (!src) return;

        // Remover lightbox previo si existe
        document.getElementById('designer-lightbox')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'designer-lightbox';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:16px;cursor:pointer;backdrop-filter:blur(4px);animation:fadeIn .2s ease';

        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Vista ampliada';
        img.style.cssText = 'max-height:80vh;max-width:90vw;object-fit:contain;border-radius:12px;box-shadow:0 25px 50px rgba(0,0,0,0.5);cursor:default;animation:scaleIn .25s ease';

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:10px;cursor:default';
        actions.innerHTML = `
            <button id="lb-download" style="background:#10b981;color:white;font-weight:800;padding:10px 24px;border-radius:12px;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;box-shadow:0 4px 12px rgba(16,185,129,0.3);transition:transform .1s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Descargar
            </button>
            <button id="lb-close" style="background:rgba(255,255,255,0.15);color:white;font-weight:800;padding:10px 24px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;transition:transform .1s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Cerrar
            </button>
        `;

        overlay.appendChild(img);
        overlay.appendChild(actions);
        document.body.appendChild(overlay);

        // Añadir animaciones
        const style = document.createElement('style');
        style.id = 'designer-lightbox-styles';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }
            #lb-download:hover { transform: scale(1.03) }
            #lb-download:active { transform: scale(0.97) }
            #lb-close:hover { background: rgba(255,255,255,0.25); transform: scale(1.03) }
            #lb-close:active { transform: scale(0.97) }
        `;
        document.head.appendChild(style);

        const closeLightbox = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity .15s ease';
            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 150);
        };

        // Cerrar al click en backdrop
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeLightbox();
        });

        // Cerrar con botón
        actions.querySelector('#lb-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });

        // Descargar
        actions.querySelector('#lb-download').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDownload(src);
        });

        // Cerrar con Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // --- INICIO: Helper para abrir el visor de imÃ¡genes ---
    function openImageInViewer(src, alt = 'Vista previa de imagen', filename = 'imagen.png') {
        const modal = document.getElementById('image-viewer-modal');
        const content = document.getElementById('image-viewer-content');
        const downloadBtn = document.getElementById('download-image-viewer-btn');
        const closeBtn = document.getElementById('close-image-viewer-btn');

        if (!modal || !content || !src) return;

        // Crea un elemento de imagen y lo aÃ±ade al contenedor
        content.innerHTML = `<img src="${src}" alt="${alt}" class="max-h-[80vh] max-w-[85vw] object-contain rounded-lg shadow-2xl">`;

        // Configurar el botÃ³n de descarga
        if (downloadBtn) {
            downloadBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    // Usar método directo sin fetch para evitar CORS
                    // Crear un link temporal y hacer click para descargar
                    const link = document.createElement('a');
                    link.href = src;
                    link.download = filename;
                    link.target = '_blank'; // Abrir en nueva pestaña si falla la descarga
                    link.rel = 'noopener noreferrer';

                    // Agregar al DOM temporalmente
                    document.body.appendChild(link);
                    link.click();

                    // Limpiar después de un momento
                    setTimeout(() => {
                        document.body.removeChild(link);
                    }, 100);

                    window.showToast?.('Descarga iniciada. Si no funciona, haz clic derecho en la imagen y "Guardar como"', 'success');
                } catch (err) {
                    console.error('Error al descargar imagen:', err);
                    // Fallback: abrir en nueva pestaña
                    window.open(src, '_blank');
                    window.showToast?.('Abre la imagen en una nueva pestaña y guárdala desde ahí', 'info');
                }
            };
        }

        // Configurar el botón de cerrar
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.classList.add('hidden');
            };
        }

        // Cerrar al hacer click fuera de la imagen
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        };

        modal.classList.remove('hidden');
        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: modal });
        }
    }
    // --- FIN: Helper para abrir el visor de imÃ¡genes ---

})();