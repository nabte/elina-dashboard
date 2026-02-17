// Diagnóstico rápido del calendario
const today = new Date();
const cita = new Date('2026-02-10T15:00:00Z');

console.log('=== DIAGNÓSTICO ===');
console.log('Hoy:', today.toLocaleDateString('es-MX'));
console.log('Cita:', cita.toLocaleDateString('es-MX'), 'a las', cita.toLocaleTimeString('es-MX'));
console.log('¿Es pasada?', cita < today);
console.log('Fecha ISO cita:', cita.toISOString().split('T')[0]);
console.log('Fecha ISO hoy:', today.toISOString().split('T')[0]);
