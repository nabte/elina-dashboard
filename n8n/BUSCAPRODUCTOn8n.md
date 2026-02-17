📘 Manual de Ajustes: Sistema de Búsqueda Elina V4
Este sistema funciona como un "embudo" de dos pasos: Supabase encuentra los candidatos y n8n decide qué tan honesto ser con el usuario.

1. El Motor (Supabase SQL)
Si sientes que el buscador no encuentra nada (muy estricto) o trae basura (muy relajado), debes ajustar la función search_products_v2.

Variables de Control:
p_threshold (Default 0.05): Es el "piso" de entrada.
Si quieres más resultados: Bájalo a 0.01.
Si quieres solo cosas muy parecidas: Súbelo a 0.2.
Los multiplicadores (Prioridades):
1.0: Es un "Match" total (usualmente reservado para SKU exacto).
0.8: Es una coincidencia muy fuerte (Nombre o Modelo).
0.5: Es una coincidencia moderada (Palabras en descripción).
Tip: Si agregas nuevos rubros (ej: Inmuebles, Carros), asegúrate de que esos datos estén en la columna description o product_name para que el SQL los vea.

2. El Cerebro (n8n: Clasificador Proactivo)
Aquí es donde decides el tono de la IA. Si la IA dice que "No hay" cuando tú ves que los datos sí llegaron, ajusta los Umbrales de Confianza en el nodo Code:

javascript
// AJUSTA AQUÍ SI LA IA ES MUY TÍMIDA:
const highConfidence = results.filter(r => r.confidence >= 0.3); // Nivel "Es el producto"
const alternatives = results.filter(r => r.confidence >= 0.10); // Nivel "Recomendación"
¿La IA recomienda cosas que no tienen nada que ver? Sube el 0.10 a 0.20.
¿La IA dice "No tengo" aunque el producto es casi igual? Baja el 0.3 a 0.2.
3. El Puente (Mapeo de Datos)
Si de repente la búsqueda deja de funcionar y devuelve NOT_FOUND siempre, revisa que el puente no se haya roto:

En Elina V4 (Principal): El nodo buscar_productos_tienda debe enviar: keyword: {{ $fromAI('keyword') || $fromAI('query') || "" }}
En el Secundario: El nodo HTTP Request debe enviar: keyword: {{ $node["When Executed by Another Workflow"].json.keyword }}
📝 Resumen de Funcionamiento para SaaS:
Hardware/Técnico: Prioriza el SKU y modelos cortos (ej: TN436).
Servicios (Dentista/Peluquería): Escanea la descripción buscando palabras clave ("Dental", "Corte", "Barba").
Proactividad: Si no hay coincidencia del 30%, pero hay algo del 10%, n8n le dice a la IA: "Oye, esto es una sugerencia, no es lo que pidió pero se parece".
¡Con este esquema tu SaaS es capaz de atender desde una papelería hasta una clínica médica sin cambiar una sola línea de código! 🚀