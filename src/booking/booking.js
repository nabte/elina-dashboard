
// booking.js
const SUPABASE_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let phoneInput; // IntlTelInput instance

// State
const state = {
    slug: null,
    company: null,
    services: [],
    selectedService: null,
    selectedDate: null,
    selectedSlot: null,
    timezone: 'America/Mexico_City',
    currentMonth: new Date(),
    availableSlots: []
};

// DOM Elements
const els = {
    loading: document.getElementById('loading-overlay'),
    main: document.getElementById('main-container'),
    companyLogo: document.getElementById('company-logo'),
    companyName: document.getElementById('company-name'),
    errorMsg: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    successState: document.getElementById('success-state'),
    servicesList: document.getElementById('services-list'),
    calendarDays: document.getElementById('calendar-days'),
    monthLabel: document.getElementById('current-month-label'),
    timeSlotsGrid: document.getElementById('time-slots-grid'),
    timeSlotsContainer: document.getElementById('time-slots-container'),
    stepIndicator1: document.getElementById('step-1-indicator'),
    stepIndicator2: document.getElementById('step-2-indicator'),
    stepIndicator3: document.getElementById('step-3-indicator'),
    backToServices: document.getElementById('back-to-services'),
    backToCalendar: document.getElementById('back-to-calendar'),
    bookingForm: document.getElementById('booking-form'),
    phoneInput: document.getElementById('contact-phone')
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Parse Slug from URL (?s=slug OR ?slug=slug)
    const params = new URLSearchParams(window.location.search);
    state.slug = params.get('s') || params.get('slug');

    // Fallback: Try to get slug from path (e.g. /nombre-empresa)
    if (!state.slug) {
        const path = window.location.pathname;
        const possibleSlug = path.substring(path.lastIndexOf('/') + 1);

        // Filter out known pages or empty paths
        const ignoredPaths = ['booking.html', 'index.html', 'dashboard.html', '', 'auth.html', 'settings.html'];
        if (possibleSlug && !ignoredPaths.includes(possibleSlug)) {
            state.slug = possibleSlug;
        }
    }

    if (!state.slug) {
        window.location.href = '/404.html';
        return;
    }

    try {
        await fetchCompanyInfo();
        renderCompanyInfo();
        renderServices();
        els.main.classList.remove('hidden');
        els.loading.classList.add('hidden');

        // Init Phone Input
        phoneInput = window.intlTelInput(els.phoneInput, {
            preferredCountries: ['mx', 'us', 'co', 'ar', 'es'],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        });

    } catch (error) {
        showError(error.message);
        els.loading.classList.add('hidden');
    }

    // Listeners
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    els.backToServices.addEventListener('click', () => showStep(1));
    els.backToCalendar.addEventListener('click', () => showStep(2));
    els.bookingForm.addEventListener('submit', handleBookingSubmit);
});


// API Calls
async function fetchCompanyInfo() {
    const { data: responseData, error } = await supabase.functions.invoke('get-public-profile', {
        body: { slug: state.slug }
    });

    if (error) {
        console.error('Function Error:', error);
        window.location.href = '/404.html';
        return;
    }

    // responseData is usually the JSON returned by function.
    // NOTE: supabase-js invoke parses JSON automatically if function returns JSON.
    // If function returns Error inside JSON, we check it.
    if (responseData.error) {
        window.location.href = '/404.html';
        return;
    }

    state.company = responseData;
    state.services = responseData.services || [];
    state.timezone = responseData.timezone || 'America/Mexico_City';
}

async function fetchAvailability(dateStr) {
    els.timeSlotsGrid.innerHTML = '<div class="col-span-3 text-center py-4"><div class="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full mx-auto"></div></div>';
    els.timeSlotsContainer.classList.remove('hidden');

    try {
        const { data, error } = await supabase.functions.invoke('get-available-slots', {
            body: {
                slug: state.slug,
                date: dateStr,
                appointment_type_id: state.selectedService.id,
                duration_minutes: state.selectedService.duration_minutes
            }
        });

        if (error || data.error) throw new Error(error?.message || data?.error);

        state.availableSlots = data.available_slots || [];
        renderTimeSlots();
    } catch (err) {
        els.timeSlotsGrid.innerHTML = `<div class="col-span-3 text-red-500 text-sm text-center py-2">Error al cargar horarios: ${err.message}</div>`;
    }
}

async function bookAppointment(payload) {
    const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: payload
    });

    if (error || data.error) throw new Error(error?.message || data?.error);
    return data;
}


// Rendering
function renderCompanyInfo() {
    if (state.company.branding?.logo_url) {
        els.companyLogo.src = state.company.branding.logo_url;
        els.companyLogo.classList.remove('hidden');
    }
    els.companyName.textContent = state.company.company_name;

    // Apply branding colors if available? (Advanced feature, maybe later)
}

function renderServices() {
    els.servicesList.innerHTML = '';
    if (state.services.length === 0) {
        els.servicesList.innerHTML = '<p class="text-slate-500 text-center">No hay servicios disponibles.</p>';
        return;
    }

    state.services.forEach(service => {
        const div = document.createElement('div');
        div.className = 'border border-slate-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h3 class="font-semibold text-slate-800">${service.name}</h3>
                <span class="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">${service.duration_minutes} min</span>
            </div>
            ${service.description ? `<p class="text-sm text-slate-500 mt-1">${service.description}</p>` : ''}
        `;
        div.addEventListener('click', () => selectService(service));
        els.servicesList.appendChild(div);
    });
}

function renderCalendar() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    // Label
    const monthName = state.currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    els.monthLabel.textContent = monthName;

    els.calendarDays.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday

    // Padding for prev month
    for (let i = 0; i < startingDay; i++) {
        const div = document.createElement('div');
        els.calendarDays.appendChild(div); // Empty
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const isPast = date < today;
        const isSelected = state.selectedDate && date.toDateString() === state.selectedDate.toDateString();
        const isToday = date.toDateString() === today.toDateString();

        const div = document.createElement('div');
        div.className = `calendar-day ${isPast ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`;
        div.textContent = d;

        if (!isPast) {
            div.addEventListener('click', () => selectDate(date, div));
        }

        els.calendarDays.appendChild(div);
    }
}

function renderTimeSlots() {
    els.timeSlotsGrid.innerHTML = '';
    if (state.availableSlots.length === 0) {
        els.timeSlotsGrid.innerHTML = '<div class="col-span-full text-center text-slate-500 text-sm py-4">No hay horarios disponibles para este día.</div>';
        return;
    }

    state.availableSlots.forEach(slot => {
        // slot.start is "HH:MM:SS"
        const timeShort = slot.start.substring(0, 5); // "10:00"

        const div = document.createElement('div');
        div.className = 'time-slot font-medium text-sm';
        div.textContent = timeShort;
        div.addEventListener('click', () => selectSlot(slot, div));
        els.timeSlotsGrid.appendChild(div);
    });
}


// Actions
function selectService(service) {
    state.selectedService = service;
    document.getElementById('selected-service-name').textContent = `Servicio: ${service.name} (${service.duration_minutes} min)`;

    showStep(2);
    renderCalendar();
    // Default hiding slots until date picked
    els.timeSlotsContainer.classList.add('hidden');
    state.selectedDate = null;
    state.selectedSlot = null;
}

function changeMonth(delta) {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + delta);
    renderCalendar();
}

function selectDate(date, cellEl) {
    // UI Update
    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    cellEl.classList.add('selected');

    state.selectedDate = date;
    const dateStr = date.toISOString().split('T')[0];
    document.getElementById('selected-date-label').textContent = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    fetchAvailability(dateStr);
}

function selectSlot(slot, cellEl) {
    document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
    cellEl.classList.add('selected');
    state.selectedSlot = slot;

    // Proceed to Step 3
    showStep(3);

    // Update Step 3 Summary
    document.getElementById('confirm-service').textContent = state.selectedService.name;
    document.getElementById('confirm-date').textContent = state.selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('confirm-time').textContent = `Hora: ${slot.start.substring(0, 5)} hrs`;
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const btn = els.bookingForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>';

    try {
        const name = document.getElementById('contact-name').value;
        const phone = phoneInput.getNumber(); // Get full number with country code
        const email = document.getElementById('contact-email').value;
        const notes = document.getElementById('contact-notes').value;

        // Construct Start/End ISO strings
        // state.selectedDate is Date object at 00:00:00 local (browser) or constructed from Year/Month/Day
        // slot.start is HH:MM in server/setting timezone.
        // We accept that "selectedDate" + "slot.start" is the Local Time of the Service.
        // We should construct the correct ISO string based on the Company Timezone provided in `state.timezone`.
        // BUT for simplicity in public booking without complex TZ libraries:
        // We will combine YYYY-MM-DD from selectedDate with HH:MM from slot.
        // And send that string. The backend expects ISO.

        // Let's create a date string "YYYY-MM-DDTHH:MM:SS"
        const yyyy = state.selectedDate.getFullYear();
        const mm = String(state.selectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(state.selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const startTimeStr = `${dateStr}T${state.selectedSlot.start}`;
        // Calculate End Time logic?
        // Actually, backend expects ISO8601 with Offset.
        // If we send Local string, backend might interpret as UTC or fail.
        // We should attach the Timezone Offset if possible.
        // Or simpler: Send the date-string and let the backend/edge function handle the timezone logic if we passed it?
        // `book-appointment` expects `start_time` and `end_time` as strings.
        // If we send `${dateStr}T${state.selectedSlot.start}-06:00` (assuming Mexico City).
        // Since we don't know the offset easily without a lib, let's use the browser's knowledge IF the user is in same timezone.
        // If user is remote, it's tricky.
        // BEST APPROACH: Just send the combined string "YYYY-MM-DDTHH:MM:SS" and let's update `book-appointment` to handle "implicit timezone" OR send the timezone in the body.
        // `book-appointment` body currently does NOT take timezone param, it expects start_time/end_time.
        // Let's assume the string we send is treated as the correct time.
        // Actually, `new Date(string)` uses local.

        // For this iteration, we will send an ISO string assuming the User's browser time matches or just sending the literal.
        // We will send: start_time: "2023-10-10T10:00:00" (no Z). Postgres handles this as "timestamp without time zone" usually if implicit?
        // But `meetings` table uses `timestamptz`. Supabase expects ISO with offset or Z.
        // If I send without Z, Supabase assumes UTC?
        // This is a common pain point.
        // Let's grab the offset from the Company Timezone? No, we don't have offset data.
        // Let's just create a Date object setting the hours, then toISOString().
        // This converts to UTC.
        // Ex: User selects 10:00. Browser is in Mexico City. New Date(.., 10, ..) is 10:00 Mex. toISOString is 16:00 UTC. Correct.

        const startDateTime = new Date(state.selectedDate);
        const [hours, minutes] = state.selectedSlot.start.split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

        // Calculate End Time
        const endDateTime = new Date(startDateTime.getTime() + state.selectedService.duration_minutes * 60000);

        const payload = {
            slug: state.slug,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            contact_name: name,
            contact_phone: phone,
            contact_email: email,
            notes: notes,
            appointment_type_id: state.selectedService.id
        };

        const result = await bookAppointment(payload);

        // Success
        document.getElementById('success-service').textContent = state.selectedService.name;
        document.getElementById('success-date').textContent = startDateTime.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });

        els.step3.classList.add('hidden');
        els.successState.classList.remove('hidden');
        els.stepIndicator3.classList.remove('bg-slate-200');
        els.stepIndicator3.classList.add('bg-blue-600');

    } catch (error) {
        alert('Error al agendar: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Helpers
function showStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${step}`).classList.remove('hidden');

    // Indicators
    const indicators = [els.stepIndicator1, els.stepIndicator2, els.stepIndicator3];
    indicators.forEach((ind, i) => {
        if (i + 1 <= step) {
            ind.classList.remove('bg-slate-200');
            ind.classList.add('bg-blue-600');
        } else {
            ind.classList.remove('bg-blue-600');
            ind.classList.add('bg-slate-200');
        }
    });

    // Reset error when changing steps
    els.errorMsg.classList.add('hidden');
}

function showError(msg) {
    els.errorText.textContent = msg;
    els.errorMsg.classList.remove('hidden');
}
