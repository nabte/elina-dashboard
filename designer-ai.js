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
        provider: 'gemini', // Solo Gemini
        model: 'google/nano-banana', // Para Gemini
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
        'none': { name: 'Ninguno / Manual', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/noun.jpg', prompt: 'Create a visually appealing, well-composed, full-bleed promotional social media flyer based *only* on the user\'s specific instructions for style, text, and visual elements. There is no predefined base style.' },
        'corp-moderno': { name: 'Corp. Moderno', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Corporativo%20Moderno.jpg', prompt: 'Create a professional, clean, full-bleed promotional social media flyer design. The background should be a smooth, edge-to-edge gradient in corporate blue tones. Use professional, high-quality photos. Typography is a modern, readable sans-serif. Leave ample clean space for text overlays.' },
        'elegancia': { name: 'Elegancia Min.', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Elegancia%20Minimalista.jpg', prompt: 'Create an elegant, minimalist, full-bleed promotional social media flyer design. Use a clean, light-colored background (like white or soft gray), a refined serif or sans-serif font. The layout must be uncluttered with generous use of negative space. The overall feeling should be premium and sophisticated.' },
        'comida': { name: 'Estilo Audaz', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Comida%20Audaz.jpg', prompt: 'Create a bold, promotional, full-bleed social media flyer design. Use strong, high-contrast colors like red, yellow, and black. The typography must be large and impactful. The main subject should be presented in a powerful and appealing manner.' },
        'colorido': { name: 'Colorido', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/Gemini_Generated_Image_th5h7nth5h7nth5h.png', prompt: 'Create a "Modern Health Campaign" style full-bleed design. The background should feature smooth, flowing gradients of purple and blue that extend edge-to-edge. All visual and textual elements must be integrated directly into this background, utilizing clean, geometric divisions (e.g., sharp diagonal lines, large color blocks, or integrated rounded shapes). High-quality, relevant photography should be seamlessly blended into sections of this full-bleed layout. Typography is a modern, clean sans-serif, using varying weights and colors to establish clear hierarchy. The overall feel must be trustworthy, informative, and clean.' },
        'urbano': { name: 'Collage Urbano', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Collage%20Urbano.jpg', prompt: 'Create a dynamic, urban collage-style, full-bleed promotional social media flyer design. Combine textures like torn paper, duct tape, and spray paint splatters. Use a mix of gritty, high-contrast photography and bold, handwritten or stencil-style fonts. The vibe should be edgy and energetic.' },
        'deporte': { name: 'Estilo Dinámico', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Deporte%20Din%C3%A1mico.jpg', prompt: 'Create an energetic and dynamic, full-bleed promotional social media flyer design. Use strong diagonal lines, motion blur effects, and a high-contrast color palette. Typography should be bold, modern, and convey a sense of speed and power.' },
        'premium': { name: 'Brillo Premium', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/Brillo%20Premium.jpg', prompt: 'Create a luxurious and premium, full-bleed promotional social media flyer design. Use a dark, sophisticated color palette, often incorporating gold, silver, or metallic accents. Lighting should be elegant, creating soft highlights and shadows. The mood is exclusive and high-end.' },
        'lineas': { name: 'Líneas', image: 'https://creativersezone.b-cdn.net/ELINA/media%20app/product/Gemini_Generated_Image_r0m7v1r0m7v1r0m7.png', prompt: 'Create a "Dynamic Geometric" style design. The composition is based on a clean, bright white background that is geometrically divided by fluid, rounded shapes (circles, capsule-like diagonal forms) in various tones of blue. These shapes must extend to the very edges of the canvas. All visual and textual elements, including photography, must be seamlessly integrated as part of this unified full-bleed canvas. High-quality photography should be directly incorporated into the flow of the geometric shapes or background, forming an organic part of the overall design. Typography is modern and clean sans-serif, using bold weights for headlines and lighter weights for details.' },
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

    function formatPalette(colors) {
        return colors.filter(Boolean).map((c) => c.toUpperCase()).join(', ');
    }

    function updateFlyerPrompt() {
        const pieces = [];
        pieces.push('Design a polished promotional flyer suitable for social media. Use clear hierarchy and professional layout.');
        const style = FLYER_STYLE_FRAGMENTS[flyerState.flyerStyle];
        if (style) {
            pieces.push(`Base style guidance: ${style.prompt}`);
        }
        if (flyerState.flyerStyle === 'none') {
            const customStyle = safeTrim(flyerState.textInputs.styleMods);
            if (customStyle) {
                pieces.push(`Custom style instructions: ${customStyle}`);
            }
        }
        const headline = safeTrim(flyerState.textInputs.headline);
        if (headline) pieces.push(`Headline: ${headline}`);
        const secondary = safeTrim(flyerState.textInputs.secondary);
        if (secondary) pieces.push(`Secondary text: ${secondary}`);
        const price = safeTrim(flyerState.textInputs.price);
        if (price) pieces.push(`Call to action or price: ${price}`);
        const terms = safeTrim(flyerState.textInputs.terms);
        if (terms) pieces.push(`Small print: ${terms}`);
        const visuals = safeTrim(flyerState.textInputs.visuals);
        if (visuals) pieces.push(`Visual elements to include: ${visuals}`);
        if (flyerState.colors && flyerState.colors.length) {
            pieces.push(`Brand colour palette: ${formatPalette(flyerState.colors)}`);
        }
        if (flyerState.removeProductBg) {
            pieces.push('If a product reference is used, remove its original background.');
        }
        flyerState.finalPrompt = pieces.join('\n\n').trim();
    }

    function updateProductPrompt() {
        const pieces = [];
        pieces.push('Create a photorealistic marketing render of the product with dramatic lighting and professional composition.');
        if (productState.mode === 'product-only') {
            const environment = ENVIRONMENT_FRAGMENTS[productState.productOnlyData.environment];
            if (environment) {
                pieces.push(`Environment: ${environment.prompt}`);
            }
            const custom = safeTrim(productState.productOnlyData.customPrompt);
            if (custom) {
                pieces.push(`Extra instructions: ${custom}`);
            }
        } else {
            const who = LIFESTYLE_WHO[productState.lifestyleData.who];
            if (who?.prompt) pieces.push(`Subject: ${who.prompt}`);
            const where = LIFESTYLE_WHERE[productState.lifestyleData.where];
            if (where?.prompt) pieces.push(`Location: ${where.prompt}`);
            const when = LIFESTYLE_WHEN[productState.lifestyleData.when];
            if (when?.prompt) pieces.push(`Mood or time: ${when.prompt}`);
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
        pieces.push('Generate a professional portrait that preserves the subject identity with realistic lighting and skin texture.');
        const scene = HEADSHOT_SCENES[headshotState.scene];
        if (scene?.prompt) {
            pieces.push(`Scene: ${scene.prompt}`);
        }
        pieces.push('Deliver a sharp, flattering headshot suitable for corporate branding.');
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
            if (imageSrc) {
                const filename = `imagen-${Date.now()}.png`;
                openImageInViewer(imageSrc, 'Imagen generada', filename);
            }
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

            // Generación con Gemini (síncrona)
            await generateWithGemini(userId, prompt, usageCheck);
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

        // Agregar instrucciones de aspect ratio al prompt (como Gemini)
        if (aspectRatio && aspectRatio !== 'auto') {
            finalPrompt = `${basePrompt}

Render the image using a ${aspectRatio} aspect ratio.`;
        }

        // Agregar descripciones de imágenes en el prompt (KIE no soporta imágenes inline como Gemini)
        const imageDescriptions = [];

        if (activeTool === 'flyer') {
            const images = flyerState.images || {};
            if (images.background) {
                imageDescriptions.push('BACKGROUND IMAGE: Usa esta imagen como fondo completo sin distorsionarla.');
            }
            if (images.product) {
                const productInstruction = flyerState.removeProductBg
                    ? 'PRODUCT IMAGE: Incluye este producto en el diseño y elimina su fondo original.'
                    : 'PRODUCT IMAGE: Incluye este producto en el diseño respetando su fondo.';
                imageDescriptions.push(productInstruction);
            }
            if (images.logo) {
                imageDescriptions.push('LOGO IMAGE: Mantén la integridad del logo.');
            }
            ['ref1', 'ref2', 'ref3'].forEach((key) => {
                if (images[key]) {
                    imageDescriptions.push('STYLE REFERENCE: Utiliza esta imagen como inspiración visual.');
                }
            });
        } else if (activeTool === 'product') {
            const images = productState.images || {};
            if (images.main) {
                imageDescriptions.push('PRIMARY PRODUCT IMAGE: Mantén la fidelidad del producto.');
            }
            if (images.opt1) {
                imageDescriptions.push('SECONDARY IMAGE 1: Usa esta referencia solo para detalles adicionales.');
            }
            if (images.opt2) {
                imageDescriptions.push('SECONDARY IMAGE 2: Usa esta referencia solo para detalles adicionales.');
            }
        } else if (activeTool === 'headshot') {
            const images = headshotState.images || {};
            ['ref1', 'ref2', 'ref3'].forEach((key) => {
                if (images[key]) {
                    imageDescriptions.push('FACE REFERENCE: Preserva la identidad de la persona.');
                }
            });
        }

        if (imageDescriptions.length > 0) {
            finalPrompt = `${imageDescriptions.join(' ')}\n\n${finalPrompt}`;
        }

        return finalPrompt;
    }

    async function generateWithKIE(userId, prompt, usageCheck) {
        const providerValue = IMAGE_GENERATION_SETTINGS.provider;
        let model, body;

        // Construir prompt enriquecido (replicando lógica de Gemini)
        const enrichedPrompt = buildKIEPrompt(prompt);

        // Determinar aspect ratio correcto según el formato seleccionado
        let aspectRatio = IMAGE_GENERATION_SETTINGS.aspectRatio;
        if (aspectRatio === 'auto') {
            // Para 'auto', usar 1:1 por defecto (cuadrado) para todos los modelos KIE
            aspectRatio = '1:1';
        }

        if (providerValue === 'kie') {
            // Imagen4 Fast (Gemini desde KIE)
            model = 'google/imagen4-fast';
            body = {
                model,
                prompt: enrichedPrompt,
                aspect_ratio: aspectRatio,
                num_images: '1',
                negative_prompt: '' // Se puede mejorar con negative prompts específicos
            };
        } else if (providerValue === 'kie-flux-text') {
            // Flux 2 Pro Text-to-Image
            model = 'flux-2/pro-text-to-image';
            body = {
                model,
                prompt: enrichedPrompt,
                aspect_ratio: aspectRatio,
                resolution: IMAGE_GENERATION_SETTINGS.resolution || '1K'
            };
        } else if (providerValue === 'kie-flux-image') {
            // Flux 2 Pro Image-to-Image - necesita imágenes de referencia
            model = 'flux-2/pro-image-to-image';

            // Obtener TODAS las imágenes según la herramienta activa (productos + referencia)
            let imageFiles = [];
            if (activeTool === 'flyer') {
                const images = flyerState.images || {};
                // Incluir imágenes de productos/elementos (hasta 3 primeras)
                if (images.background) imageFiles.push(images.background);
                if (images.product) imageFiles.push(images.product);
                if (images.logo) imageFiles.push(images.logo);
                // Incluir imágenes de referencia de estilo (hasta 3)
                if (images.ref1) imageFiles.push(images.ref1);
                if (images.ref2) imageFiles.push(images.ref2);
                if (images.ref3) imageFiles.push(images.ref3);
            } else if (activeTool === 'product') {
                const images = productState.images || {};
                // Imágenes de productos (hasta 3)
                if (images.main) imageFiles.push(images.main);
                if (images.opt1) imageFiles.push(images.opt1);
                if (images.opt2) imageFiles.push(images.opt2);
            } else if (activeTool === 'headshot') {
                const images = headshotState.images || {};
                // Imágenes de referencia (hasta 3)
                if (images.ref1) imageFiles.push(images.ref1);
                if (images.ref2) imageFiles.push(images.ref2);
                if (images.ref3) imageFiles.push(images.ref3);
            }

            if (imageFiles.length === 0) {
                throw new Error('Flux 2 Pro Image-to-Image requiere al menos una imagen de referencia. Sube imágenes en la sección correspondiente.');
            }

            // Convertir imágenes base64 a URLs (subir a Bunny.net)
            window.showToast('Subiendo imágenes de referencia...', 'info');
            const uploadPromises = imageFiles.map(img => uploadImageFileToBunny(img, userId, 'ELINA'));
            const inputUrls = await Promise.all(uploadPromises);
            const validUrls = inputUrls.filter(url => url !== null);

            if (validUrls.length === 0) {
                throw new Error('No se pudieron subir las imágenes de referencia. Intenta de nuevo.');
            }

            body = {
                model,
                prompt: enrichedPrompt,
                input_urls: validUrls, // Array de strings (URLs)
                aspect_ratio: aspectRatio,
                resolution: IMAGE_GENERATION_SETTINGS.resolution || '1K'
            };
        } else {
            throw new Error(`Proveedor no soportado: ${providerValue}`);
        }

        // Crear tarea en KIE
        const { data: createData, error: createError } = await window.auth.invokeFunction('kie-image-proxy', {
            body
        });

        if (createError) throw createError;
        if (createData?.code !== 200 || !createData?.data?.taskId) {
            throw new Error(createData?.msg || 'Error al crear la tarea en KIE');
        }

        const taskId = createData.data.taskId;
        window.showToast('Tarea creada. Esperando generación...', 'info');

        // Polling para obtener el resultado
        let attempts = 0;
        const maxAttempts = 60; // 5 minutos máximo (5 segundos * 60)
        const pollInterval = 5000; // 5 segundos

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;

            // Hacer GET request con query parameters usando invokeFunction helper
            // Necesitamos construir la URL manualmente para GET con query params
            const supabaseUrl = window.auth.sb.supabaseUrl;
            const functionsUrl = supabaseUrl.replace('/rest/v1', '') + '/functions/v1';
            const { data: sessionData } = await window.auth.sb.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            // Obtener la clave desde el contexto (usar el mismo método que invokeFunction)
            const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

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
            const queryError = queryResponse.ok ? null : { message: queryData?.error || 'Error al consultar estado' };

            if (queryError) {
                console.warn('Error al consultar estado:', queryError);
                continue;
            }

            if (queryData?.code === 200 && queryData?.data) {
                const state = queryData.data.state;

                if (state === 'success') {
                    const resultJson = JSON.parse(queryData.data.resultJson || '{}');
                    const resultUrls = resultJson.resultUrls || [];

                    if (resultUrls.length === 0) {
                        throw new Error('KIE no devolvió ninguna imagen.');
                    }

                    // Descargar y procesar las imágenes
                    const imagePromises = resultUrls.map(async (url) => {
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

                    // Subir a Bunny.net
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
                    render();
                    return;
                } else if (state === 'fail') {
                    throw new Error(queryData.data.failMsg || 'La generación falló en KIE');
                }
                // Si está 'waiting', 'queuing' o 'generating', continuar polling
            }
        }

        throw new Error('Tiempo de espera agotado. La generación está tomando más tiempo del esperado.');
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
        const link = document.createElement('a');
        link.href = url;
        const mimeType = url.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `elina-design-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        const providerSelect = panel.querySelector('#image-provider-select');
        if (providerSelect) {
            // Establecer valor según el proveedor actual
            const currentProvider = IMAGE_GENERATION_SETTINGS.provider || 'gemini';
            const currentKieModel = IMAGE_GENERATION_SETTINGS.kieModel || 'google/imagen4-fast';
            let selectValue = currentProvider;
            if (currentProvider === 'kie') {
                if (currentKieModel === 'google/imagen4-fast') selectValue = 'kie';
                else if (currentKieModel === 'flux-2/pro-text-to-image') selectValue = 'kie-flux-text';
                else if (currentKieModel === 'flux-2/pro-image-to-image') selectValue = 'kie-flux-image';
            }
            providerSelect.value = selectValue;

            providerSelect.addEventListener('change', (event) => {
                const value = event.target.value;
                if (value === 'gemini') {
                    IMAGE_GENERATION_SETTINGS.provider = 'gemini';
                } else if (value === 'kie') {
                    IMAGE_GENERATION_SETTINGS.provider = 'kie';
                    IMAGE_GENERATION_SETTINGS.kieModel = 'google/imagen4-fast';
                } else if (value === 'kie-flux-text') {
                    IMAGE_GENERATION_SETTINGS.provider = 'kie-flux-text';
                    IMAGE_GENERATION_SETTINGS.kieModel = 'flux-2/pro-text-to-image';
                } else if (value === 'kie-flux-image') {
                    IMAGE_GENERATION_SETTINGS.provider = 'kie-flux-image';
                    IMAGE_GENERATION_SETTINGS.kieModel = 'flux-2/pro-image-to-image';
                }

                // Mostrar/ocultar configuraciones específicas de KIE
                const kieSettings = panel.querySelector('#kie-model-settings');
                const fluxResolution = panel.querySelector('#flux-resolution-setting');
                if (kieSettings) {
                    kieSettings.classList.toggle('hidden', value === 'gemini');
                }
                if (fluxResolution) {
                    fluxResolution.classList.toggle('hidden', value !== 'kie-flux-text' && value !== 'kie-flux-image');
                }
            });

            // Mostrar/ocultar configuraciones según el proveedor inicial
            const kieSettings = panel.querySelector('#kie-model-settings');
            const fluxResolution = panel.querySelector('#flux-resolution-setting');
            if (kieSettings) {
                kieSettings.classList.toggle('hidden', selectValue === 'gemini');
            }
            if (fluxResolution) {
                fluxResolution.classList.toggle('hidden', selectValue !== 'kie-flux-text' && selectValue !== 'kie-flux-image');
            }
        }

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
                                
                                <div id="design-result-container" class="relative group aspect-square bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner border border-slate-100">
                                    ${isLoading ? `
                                        <div class="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                                            <div class="relative w-16 h-16 mb-4">
                                                <div class="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                                                <div class="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                                            </div>
                                            <p class="font-bold text-slate-800 text-base">Invocando a Elina...</p>
                                            <p class="text-[10px] text-slate-400 mt-1 font-medium italic">Suele tomar 10-15 segundos</p>
                                        </div>
                                    ` : ''} 

                                    ${!isLoading && activeImage ? `
                                        <div class="relative w-full h-full group">
                                            <img src="${activeImage}" alt="Artistic Result" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button class="download-btn bg-white text-slate-900 font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-2xl active:scale-95 transition-all">
                                                    <i data-lucide="download" class="w-4 h-4"></i>
                                                    DESCARGAR
                                                </button>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${!isLoading && !activeImage ? `
                                        <div class="flex flex-col items-center gap-3 text-slate-300">
                                            <i data-lucide="image" class="w-12 h-12 opacity-20"></i>
                                            <span class="text-[10px] font-bold uppercase tracking-widest opacity-40">Tu diseño aparecerá aquí</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="space-y-4">
                                <div class="bg-slate-50/50 rounded-2xl p-4 space-y-3 border border-slate-100">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ajustes</span>
                                        <i data-lucide="settings-2" class="w-3.5 h-3.5 text-indigo-400"></i>
                                    </div>
                                    
                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Formato</label>
                                        <div class="relative">
                                            <select id="image-aspect-ratio-select" class="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-400 transition-all">
                                                <option value="auto">🔥 Auto (Recomendado)</option>
                                                <option value="1:1">🟦 Cuadrado (1:1)</option>
                                                <option value="16:9">📺 Horizontal (16:9)</option>
                                                <option value="9:16">📱 Vertical (9:16)</option>
                                                <option value="4:5">📸 Retrato (4:5)</option>
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
            if (viewBtn) {
                openImageInViewer(viewBtn.dataset.src, 'Imagen de la galerÃ­a');
            }
        });
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