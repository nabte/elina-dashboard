/**
 * PERSONALITY WIZARD
 *
 * Wizard de 3 pasos para configurar personalidad de agente con IA
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const PERSONALITY_TYPES = {
    seller: {
        name: 'Vendedor',
        emoji: '🛍️',
        description: 'Enfocado en convertir conversaciones en ventas. Ideal para e-commerce y tiendas online.',
        bestFor: 'E-commerce, tiendas de productos físicos, retail',
        features: ['Auto-sugerencia de productos', 'Cierre rápido', 'Respuestas concisas']
    },
    closer: {
        name: 'Closer de Citas',
        emoji: '📅',
        description: 'Especializado en agendar citas. Convierte consultas en reservaciones confirmadas.',
        bestFor: 'Servicios profesionales, consultoría, salones de belleza, clínicas',
        features: ['Prioriza agendamiento', 'Valida disponibilidad', 'Recordatorios automáticos']
    },
    consultant: {
        name: 'Consultor',
        emoji: '🎓',
        description: 'Educa antes de vender. Responde dudas en detalle y genera confianza.',
        bestFor: 'Productos complejos, servicios B2B, consultoría técnica',
        features: ['Respuestas detalladas', 'Búsqueda web habilitada', 'Enfoque educativo']
    },
    high_ticket: {
        name: 'High Ticket',
        emoji: '💎',
        description: 'Venta consultiva de alto valor. Construye relación a largo plazo.',
        bestFor: 'Servicios premium, proyectos grandes, B2B enterprise',
        features: ['Seguimientos inteligentes', 'Personalización profunda', 'Sin urgencia']
    },
    emotional_support: {
        name: 'Soporte Emocional',
        emoji: '💚',
        description: 'Enfoque empático y de apoyo. Ideal para coaching, terapia y bienestar.',
        bestFor: 'Coaching, terapia, psicología, bienestar emocional',
        features: ['Tono cálido y empático', 'Sin presión de ventas', 'Seguimientos de cuidado']
    }
}

// ============================================================================
// STATE
// ============================================================================

let wizardState = {
    currentStep: 1,
    selectedType: null,
    businessDescription: '',
    analysisResult: null,
    createdPersonalityId: null
}

// ============================================================================
// WIZARD INITIALIZATION
// ============================================================================

/**
 * Inicializa el wizard de personalidades
 */
async function initPersonalityWizard() {
    console.log('[Personality Wizard] Initializing...')

    // Check if user already has personalities
    const userId = await window.getUserId()
    if (!userId) {
        console.error('[Personality Wizard] No user ID found')
        return
    }

    const { data: personalities, error } = await window.auth.invokeFunction('get-personalities', {
        body: {}
    })

    if (error) {
        console.error('[Personality Wizard] Error loading personalities:', error)
    } else if (personalities?.personalities?.length > 0) {
        console.log(`[Personality Wizard] User has ${personalities.personalities.length} personalities`)
        renderExistingPersonalities(personalities.personalities, personalities.active_personality)
    }

    // Setup wizard UI
    renderWizardStep1()
}

// ============================================================================
// STEP 1: SELECCIÓN DE PERSONALIDAD
// ============================================================================

function renderWizardStep1() {
    const container = document.getElementById('personality-wizard-container')
    if (!container) return

    wizardState.currentStep = 1

    container.innerHTML = `
        <div class="wizard-header">
            <h2>🤖 Configura la Personalidad de tu Agente</h2>
            <p>Selecciona el tipo de personalidad que mejor se adapte a tu negocio</p>
            <div class="wizard-progress">
                <div class="progress-step active">1. Tipo</div>
                <div class="progress-step">2. Negocio</div>
                <div class="progress-step">3. Confirmar</div>
            </div>
        </div>

        <div class="personality-grid">
            ${Object.entries(PERSONALITY_TYPES).map(([type, info]) => `
                <div class="personality-card ${wizardState.selectedType === type ? 'selected' : ''}"
                     onclick="selectPersonalityType('${type}')">
                    <div class="personality-emoji">${info.emoji}</div>
                    <h3>${info.name}</h3>
                    <p class="personality-description">${info.description}</p>
                    <div class="personality-best-for">
                        <strong>Ideal para:</strong> ${info.bestFor}
                    </div>
                    <ul class="personality-features">
                        ${info.features.map(f => `<li>✓ ${f}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>

        <div class="wizard-actions">
            <button class="btn-secondary" onclick="closePersonalityWizard()">Cancelar</button>
            <button class="btn-primary"
                    onclick="goToStep2()"
                    ${!wizardState.selectedType ? 'disabled' : ''}>
                Continuar →
            </button>
        </div>
    `
}

window.selectPersonalityType = function(type) {
    wizardState.selectedType = type
    renderWizardStep1() // Re-render to show selection
}

// ============================================================================
// STEP 2: DESCRIPCIÓN DEL NEGOCIO
// ============================================================================

function renderWizardStep2() {
    const container = document.getElementById('personality-wizard-container')
    if (!container) return

    wizardState.currentStep = 2

    const selectedInfo = PERSONALITY_TYPES[wizardState.selectedType]

    container.innerHTML = `
        <div class="wizard-header">
            <h2>🏢 Cuéntale a la IA sobre tu Negocio</h2>
            <p>La IA analizará tu negocio y personalizará el agente ${selectedInfo.emoji} <strong>${selectedInfo.name}</strong></p>
            <div class="wizard-progress">
                <div class="progress-step completed">1. Tipo</div>
                <div class="progress-step active">2. Negocio</div>
                <div class="progress-step">3. Confirmar</div>
            </div>
        </div>

        <div class="business-description-container">
            <label for="business-description">
                <strong>Describe tu negocio:</strong>
                <span class="hint">Servicios que ofreces, horarios, especialidades, etc.</span>
            </label>
            <textarea
                id="business-description"
                placeholder="Ejemplo: Somos un salón de belleza especializado en cortes, tinte y tratamientos capilares. Trabajamos de lunes a sábado de 9am a 7pm. Ofrecemos servicios premium con productos de alta calidad."
                rows="6"
                maxlength="1000"
                oninput="updateBusinessDescription(this.value)"
            >${wizardState.businessDescription}</textarea>
            <div class="char-counter">
                <span id="char-count">${wizardState.businessDescription.length}</span>/1000 caracteres
            </div>

            <div class="ai-hint">
                💡 <strong>La IA analizará:</strong> Tipo de negocio, servicios, horarios, insights clave
            </div>
        </div>

        <div class="wizard-actions">
            <button class="btn-secondary" onclick="goToStep1()">← Atrás</button>
            <button class="btn-primary"
                    onclick="analyzeAndGoToStep3()"
                    ${wizardState.businessDescription.trim().length < 20 ? 'disabled' : ''}>
                Analizar con IA →
            </button>
        </div>
    `
}

window.updateBusinessDescription = function(value) {
    wizardState.businessDescription = value
    document.getElementById('char-count').textContent = value.length

    // Enable/disable button based on length
    const btn = document.querySelector('.wizard-actions .btn-primary')
    if (btn) {
        btn.disabled = value.trim().length < 20
    }
}

// ============================================================================
// STEP 3: ANÁLISIS Y CONFIRMACIÓN
// ============================================================================

async function analyzeAndGoToStep3() {
    const container = document.getElementById('personality-wizard-container')

    // Show loading state
    container.innerHTML = `
        <div class="wizard-loading">
            <div class="spinner"></div>
            <h3>🧠 Analizando tu negocio con IA...</h3>
            <p>Esto tomará unos segundos</p>
        </div>
    `

    try {
        // Call setup-personality endpoint
        const { data, error } = await window.auth.invokeFunction('setup-personality', {
            body: {
                personality_type: wizardState.selectedType,
                business_description: wizardState.businessDescription
            }
        })

        if (error) {
            throw error
        }

        wizardState.analysisResult = data
        wizardState.createdPersonalityId = data.personality.id

        renderWizardStep3()

    } catch (error) {
        console.error('[Personality Wizard] Error analyzing business:', error)

        container.innerHTML = `
            <div class="wizard-error">
                <h3>❌ Error al analizar</h3>
                <p>${error.message || 'Ocurrió un error al analizar tu negocio'}</p>
                <button class="btn-primary" onclick="goToStep2()">Intentar de nuevo</button>
            </div>
        `
    }
}

function renderWizardStep3() {
    const container = document.getElementById('personality-wizard-container')
    if (!container) return

    wizardState.currentStep = 3

    const { personality, setup_summary } = wizardState.analysisResult
    const selectedInfo = PERSONALITY_TYPES[wizardState.selectedType]
    const analysis = personality.business_analysis || {}

    container.innerHTML = `
        <div class="wizard-header">
            <h2>✅ Personalidad Configurada</h2>
            <p>Tu agente ${selectedInfo.emoji} <strong>${selectedInfo.name}</strong> está listo</p>
            <div class="wizard-progress">
                <div class="progress-step completed">1. Tipo</div>
                <div class="progress-step completed">2. Negocio</div>
                <div class="progress-step active">3. Confirmar</div>
            </div>
        </div>

        <div class="analysis-summary">
            <h3>📊 Análisis de tu Negocio</h3>
            <div class="analysis-grid">
                ${analysis.business_type ? `
                    <div class="analysis-item">
                        <strong>Tipo de negocio:</strong>
                        <span>${analysis.business_type}</span>
                    </div>
                ` : ''}

                ${analysis.services && analysis.services.length > 0 ? `
                    <div class="analysis-item">
                        <strong>Servicios detectados:</strong>
                        <div class="services-list">
                            ${analysis.services.map(s => `<span class="service-tag">${s}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${analysis.key_insights && analysis.key_insights.length > 0 ? `
                    <div class="analysis-item full-width">
                        <strong>Insights clave:</strong>
                        <ul>
                            ${analysis.key_insights.map(i => `<li>${i}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>

            <h3>🎯 Configuración Aplicada</h3>
            <div class="setup-summary-grid">
                <div class="summary-stat">
                    <div class="stat-number">${setup_summary.faqs_created}</div>
                    <div class="stat-label">FAQs creadas</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-number">${setup_summary.tags_configured}</div>
                    <div class="stat-label">Etiquetas automáticas</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-number">${setup_summary.followups_created}</div>
                    <div class="stat-label">Templates de seguimiento</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-number">${setup_summary.rag_suggested}</div>
                    <div class="stat-label">Docs sugeridos</div>
                </div>
            </div>
        </div>

        <div class="wizard-actions">
            <button class="btn-secondary" onclick="closePersonalityWizard()">Guardar sin Activar</button>
            <button class="btn-primary btn-lg" onclick="activatePersonalityAndClose()">
                ✨ Activar Ahora
            </button>
        </div>
    `
}

// ============================================================================
// WIZARD ACTIONS
// ============================================================================

window.goToStep1 = function() {
    renderWizardStep1()
}

window.goToStep2 = function() {
    if (!wizardState.selectedType) {
        window.showToast?.('Selecciona un tipo de personalidad', 'warning')
        return
    }
    renderWizardStep2()
}

window.analyzeAndGoToStep3 = analyzeAndGoToStep3

window.activatePersonalityAndClose = async function() {
    if (!wizardState.createdPersonalityId) return

    try {
        const { data, error } = await window.auth.invokeFunction('activate-personality', {
            body: {
                personality_id: wizardState.createdPersonalityId,
                is_active: true
            }
        })

        if (error) throw error

        window.showToast?.('🎉 Personalidad activada con éxito', 'success')
        closePersonalityWizard()

        // Reload page to reflect changes
        setTimeout(() => location.reload(), 1000)

    } catch (error) {
        console.error('[Personality Wizard] Error activating:', error)
        window.showToast?.('Error al activar personalidad', 'error')
    }
}

window.closePersonalityWizard = function() {
    const modal = document.getElementById('personality-wizard-modal')
    if (modal) {
        modal.classList.remove('active')
        setTimeout(() => modal.remove(), 300)
    }

    // Reset state
    wizardState = {
        currentStep: 1,
        selectedType: null,
        businessDescription: '',
        analysisResult: null,
        createdPersonalityId: null
    }
}

// ============================================================================
// EXISTING PERSONALITIES MANAGEMENT
// ============================================================================

function renderExistingPersonalities(personalities, activePersonality) {
    const container = document.getElementById('existing-personalities-list')
    if (!container) return

    container.innerHTML = `
        <div class="personalities-header">
            <h3>Tus Personalidades</h3>
            <button class="btn-primary" onclick="openPersonalityWizard()">
                + Nueva Personalidad
            </button>
        </div>

        <div class="personalities-list">
            ${personalities.map(p => {
                const isActive = activePersonality?.id === p.id
                const typeInfo = PERSONALITY_TYPES[p.personality_type] || {}

                return `
                    <div class="personality-item ${isActive ? 'active' : ''}">
                        <div class="personality-item-emoji">${typeInfo.emoji || '🤖'}</div>
                        <div class="personality-item-info">
                            <div class="personality-item-name">
                                ${typeInfo.name || p.personality_type}
                                ${isActive ? '<span class="badge-active">ACTIVA</span>' : ''}
                            </div>
                            <div class="personality-item-date">
                                Creada: ${new Date(p.created_at).toLocaleDateString('es-MX')}
                            </div>
                        </div>
                        <div class="personality-item-actions">
                            ${!isActive ? `
                                <button class="btn-sm btn-primary"
                                        onclick="activatePersonality('${p.id}')">
                                    Activar
                                </button>
                            ` : ''}
                            <button class="btn-sm btn-secondary"
                                    onclick="viewPersonalityDetails('${p.id}')">
                                Ver Detalles
                            </button>
                        </div>
                    </div>
                `
            }).join('')}
        </div>
    `
}

window.activatePersonality = async function(personalityId) {
    try {
        const { data, error } = await window.auth.invokeFunction('activate-personality', {
            body: {
                personality_id: personalityId,
                is_active: true
            }
        })

        if (error) throw error

        window.showToast?.('Personalidad activada', 'success')
        location.reload()

    } catch (error) {
        console.error('[Personality] Error activating:', error)
        window.showToast?.('Error al activar personalidad', 'error')
    }
}

// ============================================================================
// MODAL LAUNCHER
// ============================================================================

window.openPersonalityWizard = function() {
    // Create modal
    const modal = document.createElement('div')
    modal.id = 'personality-wizard-modal'
    modal.className = 'modal'
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closePersonalityWizard()"></div>
        <div class="modal-content modal-large">
            <button class="modal-close" onclick="closePersonalityWizard()">&times;</button>
            <div id="personality-wizard-container"></div>
        </div>
    `
    document.body.appendChild(modal)

    setTimeout(() => modal.classList.add('active'), 10)

    renderWizardStep1()
}

// Export for external use
if (typeof window !== 'undefined') {
    window.initPersonalityWizard = initPersonalityWizard
    window.openPersonalityWizard = openPersonalityWizard
}
