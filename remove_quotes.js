import fs from 'fs';
import path from 'path';

const filePath = 'public/settings.html';

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Define markers
    const startMarker = '<!-- Sistema de Cotizaciones -->';
    const endMarker = '<!-- Gestión de Equipo (Solo para Admins) -->';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        const newContent = content.substring(0, startIndex) + content.substring(endIndex);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Removed Quotes section successfully.');
    } else {
        console.log('Markers not found.');
    }
} catch (err) {
    console.error('Error:', err);
}
