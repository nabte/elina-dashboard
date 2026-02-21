/**
 * QUALITY DASHBOARD
 * Dashboard para análisis de calidad de conversaciones
 */

let supabase = null
let currentUserId = null
let conversationsData = []

// ============================================================================
// INITIALIZATION
// ============================================================================

// Wait for auth module to be ready
async function waitForAuth() {
    return new Promise((resolve) => {
        if (window.auth?.sb) {
            resolve(window.auth.sb)
        } else {
            const checkAuth = setInterval(() => {
                if (window.auth?.sb) {
                    clearInterval(checkAuth)
                    resolve(window.auth.sb)
                }
            }, 100)
        }
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 [QUALITY_DASHBOARD] Initializing...')

    // Wait for auth to be available
    supabase = await waitForAuth()

    // Check authentication using the shared auth
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('❌ [QUALITY_DASHBOARD] User not authenticated')
        window.location.href = '/'
        return
    }

    currentUserId = user.id
    console.log(`✅ [QUALITY_DASHBOARD] User authenticated: ${user.id}`)

    // Set default date range (last 7 days)
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    document.getElementById('filter-date-to').valueAsDate = today
    document.getElementById('filter-date-from').valueAsDate = weekAgo

    // Load data
    await loadDashboard()

    // Setup event listeners
    document.getElementById('btn-apply-filters').addEventListener('click', loadDashboard)
    document.getElementById('btn-reset-filters').addEventListener('click', resetFilters)
    document.getElementById('close-modal').addEventListener('click', closeModal)
})

// ============================================================================
// LOAD DASHBOARD DATA
// ============================================================================
async function loadDashboard() {
    console.log('📊 [QUALITY_DASHBOARD] Loading dashboard data...')

    showLoading(true)

    try {
        // Build filters
        const filters = getFilters()

        // Fetch conversations
        let query = supabase
            .from('conversation_quality_log')
            .select(`
                *,
                contacts:contact_id (
                    id,
                    full_name,
                    phone_number
                )
            `)
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false })

        // Apply filters
        if (filters.dateFrom) {
            query = query.gte('conversation_date', filters.dateFrom)
        }
        if (filters.dateTo) {
            query = query.lte('conversation_date', filters.dateTo)
        }
        if (filters.errorType) {
            query = query.contains('error_types', [filters.errorType])
        }
        if (filters.maxScore) {
            query = query.lt('quality_score', parseFloat(filters.maxScore))
        }

        const { data, error } = await query

        if (error) {
            console.error('❌ [QUALITY_DASHBOARD] Error fetching data:', error)
            throw error
        }

        conversationsData = data || []
        console.log(`✅ [QUALITY_DASHBOARD] Loaded ${conversationsData.length} conversations`)

        // Update UI
        updateStats()
        renderTable()

    } catch (error) {
        console.error('❌ [QUALITY_DASHBOARD] Error:', error)
        alert('Error al cargar los datos. Por favor recarga la página.')
    } finally {
        showLoading(false)
    }
}

// ============================================================================
// UPDATE STATS
// ============================================================================
function updateStats() {
    const total = conversationsData.length
    const withErrors = conversationsData.filter(c => c.has_errors).length
    const needsReview = conversationsData.filter(c => c.needs_review).length

    const scores = conversationsData.map(c => c.quality_score || 0)
    const avgScore = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
        : '0.00'

    document.getElementById('stat-total').textContent = total
    document.getElementById('stat-errors').textContent = withErrors
    document.getElementById('stat-review').textContent = needsReview
    document.getElementById('stat-score').textContent = avgScore
}

// ============================================================================
// RENDER TABLE
// ============================================================================
function renderTable() {
    const tbody = document.getElementById('conversations-table')

    if (conversationsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                    No se encontraron conversaciones con los filtros aplicados
                </td>
            </tr>
        `
        return
    }

    tbody.innerHTML = conversationsData.map(conv => {
        const contactName = conv.contacts?.full_name || conv.contacts?.phone_number || 'Desconocido'
        const score = (conv.quality_score || 0).toFixed(2)
        const scoreColor = getScoreColor(conv.quality_score)
        const errorBadges = (conv.error_types || []).map(type =>
            `<span class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 mr-1">
                ${getErrorLabel(type)}
            </span>`
        ).join('')
        const tools = (conv.tools_used || []).join(', ') || 'Ninguna'
        const statusBadge = conv.needs_review
            ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><i class="fas fa-flag mr-1"></i>Revisar</span>'
            : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="fas fa-check mr-1"></i>OK</span>'

        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${formatDate(conv.conversation_date)}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="font-medium">${contactName}</div>
                    <div class="text-xs text-gray-500">${conv.total_messages || 1} mensajes</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div class="${scoreColor} h-full" style="width: ${score * 100}%"></div>
                        </div>
                        <span class="text-sm font-medium text-gray-900">${score}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm">
                    ${errorBadges || '<span class="text-gray-400">Ninguno</span>'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${tools}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                        onclick="viewTranscript(${conv.id})"
                        class="text-blue-600 hover:text-blue-800 font-medium"
                        ${!conv.transcript ? 'disabled' : ''}
                    >
                        <i class="fas fa-eye mr-1"></i>
                        ${conv.transcript ? 'Ver transcript' : 'N/A'}
                    </button>
                </td>
            </tr>
        `
    }).join('')
}

// ============================================================================
// VIEW TRANSCRIPT
// ============================================================================
window.viewTranscript = function(conversationId) {
    const conv = conversationsData.find(c => c.id === conversationId)

    if (!conv || !conv.transcript) {
        return
    }

    const modal = document.getElementById('transcript-modal')
    const content = document.getElementById('transcript-content')

    const errorDetails = conv.error_details || {}
    const errorDetailsHtml = Object.keys(errorDetails).length > 0
        ? `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 class="font-bold text-red-900 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Detalles de Errores</h4>
                <pre class="text-sm text-red-800 whitespace-pre-wrap">${JSON.stringify(errorDetails, null, 2)}</pre>
            </div>
        `
        : ''

    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="text-sm font-medium text-gray-500">Score de Calidad</span>
                    <div class="text-2xl font-bold ${getScoreTextColor(conv.quality_score)}">${(conv.quality_score || 0).toFixed(2)}</div>
                </div>
                <div>
                    <span class="text-sm font-medium text-gray-500">Herramientas Usadas</span>
                    <div class="text-sm text-gray-900">${(conv.tools_used || []).join(', ') || 'Ninguna'}</div>
                </div>
            </div>

            ${errorDetailsHtml}

            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-comments mr-2"></i>Transcript</h4>
                <div class="text-sm text-gray-800 whitespace-pre-wrap font-mono">${conv.transcript}</div>
            </div>

            <div class="flex gap-2">
                <button
                    onclick="markAsReviewed(${conv.id})"
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                    <i class="fas fa-check mr-2"></i>Marcar como Revisado
                </button>
                <button
                    onclick="closeModal()"
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                    Cerrar
                </button>
            </div>
        </div>
    `

    modal.classList.remove('hidden')
}

// ============================================================================
// MARK AS REVIEWED
// ============================================================================
window.markAsReviewed = async function(conversationId) {
    try {
        const { error } = await supabase
            .from('conversation_quality_log')
            .update({
                needs_review: false,
                reviewed_by: currentUserId,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', conversationId)

        if (error) throw error

        alert('✅ Marcado como revisado')
        closeModal()
        await loadDashboard()

    } catch (error) {
        console.error('❌ Error marking as reviewed:', error)
        alert('Error al marcar como revisado')
    }
}

// ============================================================================
// HELPERS
// ============================================================================
function getFilters() {
    return {
        dateFrom: document.getElementById('filter-date-from').value,
        dateTo: document.getElementById('filter-date-to').value,
        errorType: document.getElementById('filter-error-type').value,
        maxScore: document.getElementById('filter-score').value
    }
}

function resetFilters() {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    document.getElementById('filter-date-to').valueAsDate = today
    document.getElementById('filter-date-from').valueAsDate = weekAgo
    document.getElementById('filter-error-type').value = ''
    document.getElementById('filter-score').value = ''

    loadDashboard()
}

function closeModal() {
    document.getElementById('transcript-modal').classList.add('hidden')
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show)
    document.getElementById('content').classList.toggle('hidden', show)
}

function formatDate(dateStr) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

function getScoreColor(score) {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
}

function getScoreTextColor(score) {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
}

function getErrorLabel(errorType) {
    const labels = {
        'product_not_found': 'Producto no encontrado',
        'tool_error': 'Error de herramienta',
        'hallucination': 'Alucinación',
        'validation_failed': 'Validación fallida'
    }
    return labels[errorType] || errorType
}

window.closeModal = closeModal
