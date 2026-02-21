const fs = require('fs');
const path = 'public/settings.html';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Define start and end markers
    const startMarker = '<!-- Sistema de Cotizaciones -->';
    const endMarker = '<!-- Gestión de Equipo (Solo para Admins) -->';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        // Remove content between markers
        const newContent = content.substring(0, startIndex) + content.substring(endIndex);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Successfully removed Quotes section.');
    } else {
        console.log('Markers not found.');
        console.log('Start index:', startIndex);
        console.log('End index:', endIndex);
    }
} catch (err) {
    console.error('Error:', err);
}
