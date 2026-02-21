
/**
 * plans-modal.js
 * Maneja la lógica del modal de selección de planes.
 */

export async function initPlansModal() {
    const upgradeBtn = document.getElementById('upgrade-trial-btn');
    const upgradeCollapsedBtn = document.getElementById('upgrade-collapsed-btn');
    const upgradeGrowBtn = document.getElementById('upgrade-grow-btn');

    // Create modal element if it doesn't exist
    if (!document.getElementById('plans-modal')) {
        createPlansModal();
    }

    const openModal = (e) => {
        e.preventDefault();
        const modal = document.getElementById('plans-modal');
        modal.classList.remove('hidden');
        loadPlans();
    };

    if (upgradeBtn) upgradeBtn.addEventListener('click', openModal);
    if (upgradeCollapsedBtn) upgradeCollapsedBtn.addEventListener('click', openModal);
    if (upgradeGrowBtn) upgradeGrowBtn.addEventListener('click', openModal);

    // Close modal listeners
    document.getElementById('close-plans-modal')?.addEventListener('click', () => {
        document.getElementById('plans-modal').classList.add('hidden');
    });

    document.getElementById('plans-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('plans-modal')) {
            document.getElementById('plans-modal').classList.add('hidden');
        }
    });
}

function createPlansModal() {
    const modalHTML = `
    <div id="plans-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] px-4 backdrop-blur-sm transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">Elige tu Plan Ideal</h2>
            <p class="text-slate-500 text-sm mt-1">Potencia tu negocio con las mejores herramientas de IA</p>
          </div>
          <button id="close-plans-modal" class="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          
          <!-- Period Switcher (Monthly/Yearly) - Placeholder for now -->
          <!-- 
          <div class="flex justify-center mb-8">
            <div class="bg-slate-200 p-1 rounded-xl inline-flex relative">
              <div class="w-1/2 h-full absolute left-0 bg-white rounded-lg shadow-sm transition-all"></div>
              <button class="relative z-10 px-6 py-2 text-sm font-bold text-slate-800">Mensual</button>
              <button class="relative z-10 px-6 py-2 text-sm font-bold text-slate-500">Anual <span class="text-green-600 text-[10px] ml-1">-20%</span></button>
            </div>
          </div>
          -->

          <!-- Plans Grid -->
          <div id="plans-container" class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <!-- Loading State -->
            <div class="col-span-3 py-12 flex flex-col items-center justify-center text-slate-400">
              <i data-lucide="loader-2" class="w-10 h-10 animate-spin mb-4 text-blue-500"></i>
              <p class="font-medium animate-pulse">Cargando planes disponibles...</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 bg-white text-center text-xs text-slate-400">
          Pagos seguros procesados por Stripe. Puedes cancelar en cualquier momento.
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    // Re-initialize icons for the new modal
    if (window.lucide) window.lucide.createIcons();
}

async function loadPlans() {
    const container = document.getElementById('plans-container');
    if (!container) return;

    try {
        const { data: plans, error } = await window.auth.sb
            .from('plans')
            .select('*')
            .neq('id', 'free_trial') // Don't show free trial as an option to upgrade to
            .order('price_monthly', { ascending: true });

        if (error) throw error;

        if (!plans || plans.length === 0) {
            container.innerHTML = `
        <div class="col-span-3 text-center py-10">
          <div class="inline-flex bg-yellow-50 p-4 rounded-full mb-4"><i data-lucide="alert-triangle" class="w-8 h-8 text-yellow-500"></i></div>
          <h3 class="text-lg font-bold text-slate-800">No hay planes disponibles</h3>
          <p class="text-slate-500">Por favor contacta a soporte.</p>
        </div>
      `;
            window.lucide.createIcons();
            return;
        }

        renderPlans(plans);

    } catch (err) {
        console.error('Error loading plans:', err);
        container.innerHTML = `
      <div class="col-span-3 text-center py-10">
        <div class="inline-flex bg-red-50 p-4 rounded-full mb-4"><i data-lucide="x-circle" class="w-8 h-8 text-red-500"></i></div>
        <h3 class="text-lg font-bold text-slate-800">Error al cargar planes</h3>
        <p class="text-slate-500 text-sm mt-2">${err.message}</p>
        <button onclick="loadPlans()" class="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">Reintentar</button>
      </div>
    `;
        window.lucide.createIcons();
    }
}

function renderPlans(plans) {
    const container = document.getElementById('plans-container');

    // Helper to format currency
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
    };

    const html = plans.map(plan => {
        const isPopular = plan.id === 'grow'; // Hardcoded for now, could be a DB flag
        const features = plan.features || {}; // JSONB column

        // Feature list builder based on plan limits
        const featureList = [
            { text: `${plan.max_advisors} Asesores (Cuentas)`, available: true },
            { text: `${plan.bulk_sends_limit} Envíos Masivos / mes`, available: true },
            { text: `${plan.ai_enhancements_limit} Mejoras con IA / mes`, available: true },
            { text: `${plan.image_generations_limit} Generación de Imágenes / mes`, available: true },
            { text: `${plan.video_generations_limit} Generación de Videos / mes`, available: true },
            { text: `Editor de Flujos Avanzado`, available: true },
            { text: `Soporte Prioritario`, available: plan.id !== 'starter' },
            { text: `Marca Blanca`, available: plan.id === 'business' },
        ];

        return `
      <div class="relative flex flex-col bg-white rounded-2xl border ${isPopular ? 'border-blue-500 shadow-xl scale-105 z-10' : 'border-slate-200 shadow-sm hover:shadow-md'} transition-all duration-300 overflow-hidden">
        ${isPopular ? `<div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-400 to-indigo-600"></div>` : ''}
        ${isPopular ? `<div class="absolute top-4 right-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Más Popular</div>` : ''}
        
        <div class="p-6 flex-grow">
          <h3 class="text-xl font-black text-slate-900 mb-2">${plan.name}</h3>
          <p class="text-slate-500 text-xs h-10 line-clamp-2 mb-4">El plan perfecto para escalar tu operación.</p>
          
          <div class="flex items-baseline gap-1 mb-6">
            <span class="text-4xl font-black text-slate-800 tracking-tight">${formatMoney(plan.price_monthly)}</span>
            <span class="text-slate-400 font-medium text-sm">/ mes</span>
          </div>

          <button onclick="window.selectPlan('${plan.id}', '${plan.stripe_price_id || plan.stripe_product_id}')"
            class="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all mb-8 flex items-center justify-center gap-2
            ${isPopular
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }">
            <span>Elegir ${plan.name}</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>

          <div class="space-y-3">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Incluye:</p>
            ${featureList.map(feature => `
              <div class="flex items-start gap-3 text-sm ${feature.available ? 'text-slate-700' : 'text-slate-300 line-through decoration-slate-300'}">
                <i data-lucide="${feature.available ? 'check-circle-2' : 'x-circle'}" class="w-5 h-5 flex-shrink-0 ${feature.available ? 'text-green-500' : 'text-slate-200'}"></i>
                <span class="leading-tight">${feature.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    }).join('');

    container.innerHTML = html;
    window.lucide.createIcons();
}

// Global function to be called from the buttons generated in HTML string
window.selectPlan = async (planId, priceId) => {
    if (!priceId) {
        window.showToast('Este plan no está configurado para pagos online.', 'error');
        return;
    }

    const btn = event.currentTarget; // The clicked button
    // Add loading state to button
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Procesando...`;
    btn.disabled = true;
    window.lucide.createIcons();

    try {
        console.log(`Starting checkout for plan: ${planId}, price: ${priceId}`);

        // Call Supabase Edge Function to create Stripe Checkout Session
        const { data, error } = await window.auth.invokeFunction('create-checkout-session', {
            body: {
                priceId: priceId, // Stripe Price ID (from product_id col in this case, assumed to be Price ID or Product ID handled by backend)
                planId: planId,
                successUrl: `${window.location.origin}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/dashboard.html`
            }
        });

        if (error) throw new Error(error.message || 'Error al iniciar checkout');

        if (data?.url) {
            window.location.href = data.url;
        } else {
            throw new Error('No se recibió la URL de pago');
        }

    } catch (err) {
        console.error('Checkout error:', err);
        window.showToast(`Error: ${err.message}`, 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
        window.lucide.createIcons();
    }
};
