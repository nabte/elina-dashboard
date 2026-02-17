/**
 * TEST - Image Logic (n8n V4)
 *
 * Este script prueba la lógica de división de imágenes
 * sin necesidad de hacer una llamada HTTP real.
 */

import { splitMediaIntoMessages } from './utils/text-formatter.ts'

// Test 1: Mensaje con 1 imagen
console.log('\n═══════════════════════════════════════════════════')
console.log('TEST 1: Mensaje con 1 imagen')
console.log('═══════════════════════════════════════════════════')

const test1 = `Hola, aquí está el producto que pediste:

🛍️ *Producto Premium* — $1,299.00
🔹 Excelente calidad

https://ejemplo.com/imagen1.jpg

¿Te gustaría ordenar este producto?`

const result1 = splitMediaIntoMessages(test1, 'image')
console.log('\nResultado:')
result1.forEach((msg, i) => {
    console.log(`\n--- Mensaje ${i + 1} ---`)
    console.log(`Type: ${msg.type}`)
    console.log(`URL: ${msg.media_url}`)
    console.log(`Caption:\n${msg.caption}`)
})

// Test 2: Mensaje con 3 imágenes
console.log('\n\n═══════════════════════════════════════════════════')
console.log('TEST 2: Mensaje con 3 imágenes')
console.log('═══════════════════════════════════════════════════')

const test2 = `Hola, aquí están nuestros productos disponibles:

🛍️ *Producto 1* — $500.00
Descripción del producto 1

https://ejemplo.com/producto1.jpg

🛍️ *Producto 2* — $750.00
Descripción del producto 2

https://ejemplo.com/producto2.jpg

🛍️ *Producto 3* — $1,200.00
Descripción del producto 3

https://ejemplo.com/producto3.jpg

¿Cuál te interesa más? Estamos disponibles para cualquier duda.`

const result2 = splitMediaIntoMessages(test2, 'image')
console.log('\nResultado:')
result2.forEach((msg, i) => {
    console.log(`\n--- Mensaje ${i + 1} ---`)
    console.log(`Type: ${msg.type}`)
    console.log(`URL: ${msg.media_url}`)
    console.log(`Caption (primeros 200 chars):\n${msg.caption.substring(0, 200)}${msg.caption.length > 200 ? '...' : ''}`)
    console.log(`Caption length: ${msg.caption.length}`)
})

// Test 3: Mensaje con 5 imágenes (debe limitar a 3)
console.log('\n\n═══════════════════════════════════════════════════')
console.log('TEST 3: Mensaje con 5 imágenes (debe limitar a 3)')
console.log('═══════════════════════════════════════════════════')

const test3 = `Catálogo completo:

Producto 1: https://ejemplo.com/prod1.jpg
Producto 2: https://ejemplo.com/prod2.jpg
Producto 3: https://ejemplo.com/prod3.jpg
Producto 4: https://ejemplo.com/prod4.jpg
Producto 5: https://ejemplo.com/prod5.jpg

Todos disponibles para entrega inmediata.`

const result3 = splitMediaIntoMessages(test3, 'image')
console.log('\nResultado:')
console.log(`Total de mensajes: ${result3.length} (debería ser 3)`)
result3.forEach((msg, i) => {
    console.log(`\n--- Mensaje ${i + 1} ---`)
    console.log(`URL: ${msg.media_url}`)
    console.log(`Caption:\n${msg.caption}`)
})

// Test 4: Mensaje con etiquetas "Imagen:" que deben ser limpiadas
console.log('\n\n═══════════════════════════════════════════════════')
console.log('TEST 4: Mensaje con etiquetas "Imagen:" (deben limpiarse)')
console.log('═══════════════════════════════════════════════════')

const test4 = `Aquí están tus productos:

Producto A - $299
Imagen: https://ejemplo.com/productoA.jpg

Producto B - $399
Imagen: https://ejemplo.com/productoB.jpg

Imagen: https://ejemplo.com/productoC.jpg

¡Gracias por tu compra!`

const result4 = splitMediaIntoMessages(test4, 'image')
console.log('\nResultado:')
result4.forEach((msg, i) => {
    console.log(`\n--- Mensaje ${i + 1} ---`)
    console.log(`URL: ${msg.media_url}`)
    console.log(`Caption:\n${msg.caption}`)
    console.log(`¿Contiene "Imagen:"? ${msg.caption.includes('Imagen:') ? '❌ SÍ (ERROR)' : '✅ NO (CORRECTO)'}`)
})

console.log('\n\n═══════════════════════════════════════════════════')
console.log('TESTS COMPLETADOS')
console.log('═══════════════════════════════════════════════════\n')
