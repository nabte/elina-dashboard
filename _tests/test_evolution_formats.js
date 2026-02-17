/**
 * Test directo a Evolution API para descubrir el formato correcto
 */

const EVOLUTION_URL = 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host';
const INSTANCE = 'Nabte';
const API_KEY = 'F6235095-E971-4C21-B6FA-0A8BF54B0E7A';
const PHONE = '5219995169313';

// Probar diferentes formatos
const formats = [
    {
        name: 'Formato 1: text directo',
        payload: {
            number: PHONE,
            text: 'Test 1'
        }
    },
    {
        name: 'Formato 2: textMessage.text',
        payload: {
            number: PHONE,
            textMessage: {
                text: 'Test 2'
            }
        }
    },
    {
        name: 'Formato 3: text + options.delay',
        payload: {
            number: PHONE,
            text: 'Test 3',
            options: {
                delay: 1000
            }
        }
    },
    {
        name: 'Formato 4: textMessage + options',
        payload: {
            number: PHONE,
            options: {
                delay: 1000
            },
            textMessage: {
                text: 'Test 4'
            }
        }
    }
];

async function testFormat(format) {
    console.log(`\n🧪 Probando: ${format.name}`);
    console.log(`📦 Payload:`, JSON.stringify(format.payload, null, 2));

    try {
        const response = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(format.payload)
        });

        const text = await response.text();
        console.log(`📊 Status: ${response.status}`);
        console.log(`📋 Response:`, text);

        if (response.ok) {
            console.log(`✅ ¡FORMATO CORRECTO!`);
            return true;
        }
    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }

    return false;
}

async function main() {
    console.log('🚀 Iniciando pruebas de formatos Evolution API\n');
    console.log(`📍 URL: ${EVOLUTION_URL}`);
    console.log(`🏢 Instancia: ${INSTANCE}`);
    console.log(`📱 Teléfono: ${PHONE}\n`);

    for (const format of formats) {
        const success = await testFormat(format);
        if (success) {
            console.log(`\n🎉 ¡Formato encontrado! Usa: ${format.name}`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main();
