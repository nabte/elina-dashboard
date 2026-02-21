import{u as r,j as e}from"./index-Czd6NKCg.js";const l=()=>{const{t:s}=r();return e.jsxs("div",{className:"bg-white/10 backdrop-blur-lg border border-white/20 text-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto prose dark:prose-invert prose-yellow",children:[e.jsx("h2",{className:"text-2xl font-bold mb-4 text-white",children:s("guide.title")}),e.jsx("p",{children:s("guide.intro")}),e.jsxs("details",{className:"bg-black/20 p-4 rounded-lg border border-white/20",open:!0,children:[e.jsx("summary",{className:"font-semibold text-lg cursor-pointer text-yellow-400",children:s("guide.wp.title")}),e.jsxs("div",{className:"mt-4",children:[e.jsx("h3",{className:"mt-6",children:s("guide.wp.videoTitle")}),e.jsx("p",{children:s("guide.wp.videoDesc")}),e.jsx("div",{className:"aspect-w-16 aspect-h-9",style:{position:"relative",paddingBottom:"56.25%",height:0,overflow:"hidden",maxWidth:"100%"},children:e.jsx("iframe",{src:"https://www.youtube.com/embed/72xdCU__g6M",title:"YouTube video player",frameBorder:"0",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0,style:{position:"absolute",top:0,left:0,width:"100%",height:"100%"}})}),e.jsx("p",{className:"text-xs text-center mt-2",children:s("guide.wp.videoNote")}),e.jsx("h3",{className:"mt-6",children:s("guide.wp.stepsTitle")}),e.jsx("h4",{children:s("guide.wp.step1Title")}),e.jsx("ol",{children:s("guide.wp.step1",{returnObjects:!0}).map((t,o)=>e.jsx("li",{children:t},o))}),e.jsx("div",{className:"p-4 bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-200",children:e.jsx("p",{children:e.jsx("strong",{children:s("guide.wp.importantNote")})})}),e.jsx("h4",{className:"mt-4",children:s("guide.wp.step2Title")}),e.jsx("ol",{children:s("guide.wp.step2",{returnObjects:!0}).map((t,o)=>e.jsx("li",{children:t},o))})]})]}),e.jsxs("details",{className:"bg-black/20 p-4 rounded-lg border border-white/20 mt-6",children:[e.jsx("summary",{className:"font-semibold text-lg cursor-pointer text-yellow-400",children:s("guide.webhook.title")}),e.jsxs("div",{className:"mt-4",children:[e.jsx("h3",{children:s("guide.webhook.howItWorks")}),e.jsx("p",{children:s("guide.webhook.howItWorksDesc")}),e.jsxs("div",{className:"my-6 p-4 border border-dashed border-white/30 rounded-lg bg-black/20 text-center",children:[e.jsx("h4",{className:"font-bold text-white",children:s("guide.webhook.flowTitle")}),e.jsxs("div",{className:"flex items-center justify-center space-x-2 md:space-x-4 text-sm mt-4 flex-wrap",children:[e.jsx("div",{className:"p-3 bg-blue-900/50 rounded-md",children:s("guide.webhook.sender")}),e.jsx("span",{className:"text-yellow-400 font-bold text-xl",children:"→"}),e.jsx("div",{className:"p-3 bg-purple-900/50 rounded-md",children:s("guide.webhook.receiver")}),e.jsx("span",{className:"text-yellow-400 font-bold text-xl",children:"→"}),e.jsx("div",{className:"p-3 bg-green-900/50 rounded-md",children:s("guide.webhook.result")})]})]}),e.jsx("h4",{children:s("guide.webhook.getYourUrlTitle")}),e.jsx("p",{children:s("guide.webhook.getYourUrlDesc")}),e.jsxs("div",{className:"space-y-4 my-4",children:[e.jsxs("div",{className:"p-3 bg-black/30 rounded-lg",children:[e.jsxs("strong",{children:[s("guide.webhook.plan.step1Title"),":"]})," ",s("guide.webhook.plan.step1Desc")]}),e.jsxs("div",{className:"p-3 bg-black/30 rounded-lg",children:[e.jsxs("strong",{children:[s("guide.webhook.plan.step2Title"),":"]})," ",s("guide.webhook.plan.step2Desc")]}),e.jsxs("div",{className:"p-3 bg-black/30 rounded-lg",children:[e.jsxs("strong",{children:[s("guide.webhook.plan.step3Title"),":"]})," ",s("guide.webhook.plan.step3Desc")]}),e.jsxs("div",{className:"p-3 bg-black/30 rounded-lg",children:[e.jsxs("strong",{children:[s("guide.webhook.plan.step4Title"),":"]})," ",s("guide.webhook.plan.step4Desc")]})]}),e.jsx("h4",{className:"mt-4",children:s("guide.webhook.promptTitle")}),e.jsx("p",{children:s("guide.webhook.promptDesc")}),e.jsx("pre",{className:"bg-gray-900 text-white p-4 rounded-md text-sm",children:e.jsx("code",{children:`Escribe un receptor de webhooks en [Tu Lenguaje de Programación, ej: PHP, Python con Flask, Node.js con Express].

El webhook debe:
1. Ser un endpoint POST en la ruta de URL '/api/nuevo-blog-post'.
2. Aceptar un cuerpo JSON con la siguiente estructura:
   {
     "title": "string",
     "htmlContent": "string",
     "featuredImageUrl": "string",
     "metaDescription": "string",
     "focusKeyword": "string"
   }
3. Cuando reciba los datos, debe [Tu Acción Deseada, ej: "crear un nuevo borrador de post en mi base de datos", "guardar el contenido como un archivo markdown", "conectarse a mi API de Ghost CMS y crear un post"].
4. Después de procesar, debe devolver un estado 200 OK con un mensaje JSON confirmando el éxito.
5. Incluir comentarios en el código explicando cada paso.`})}),e.jsx("h4",{className:"mt-6",children:s("guide.webhook.codeExamplesTitle")}),e.jsxs("div",{className:"mt-4",children:[e.jsx("h5",{className:"font-semibold text-md text-yellow-300",children:s("guide.webhook.phpExampleTitle")}),e.jsx("p",{className:"text-sm",children:s("guide.webhook.phpExampleDesc")}),e.jsx("pre",{className:"bg-gray-900 text-white p-4 rounded-md text-sm mt-2",children:e.jsx("code",{children:`<?php // webhook.php

/**
 * Receptor de Webhook para BlogFlow en PHP.
 * Este script está diseñado para funcionar en un hosting compartido como Hostinger.
 */

// --- MANEJO DE CORS ---
// Permite que cualquier origen (como tu app de BlogFlow) envíe solicitudes.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// El navegador envía una solicitud 'OPTIONS' antes de la 'POST' real para verificar los permisos.
// Debemos responder a esta solicitud con un '200 OK' para que proceda.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- PROCESAMIENTO DE LA SOLICITUD POST ---
header('Content-Type: application/json'); // Aseguramos que nuestra respuesta sea JSON.

// BlogFlow envía los datos como un cuerpo JSON, no como un formulario POST.
// 'php://input' es la forma correcta de leer este tipo de datos.
$json_payload = file_get_contents('php://input');
$data = json_decode($json_payload, true); // 'true' lo convierte en un array asociativo.

if ($data && !empty($data['title']) && !empty($data['htmlContent'])) {
    $new_entry = [
        'title' => $data['title'],
        'htmlContent' => $data['htmlContent'],
        'featuredImageUrl' => $data['featuredImageUrl'] ?? '',
        'metaDescription' => $data['metaDescription'] ?? '',
        'focusKeyword' => $data['focusKeyword'] ?? '',
        'date' => date('c') // Formato ISO 8601
    ];

    $file_path = 'blog_entries.json';
    $entries = [];
    if (file_exists($file_path)) {
        $entries = json_decode(file_get_contents($file_path), true);
    }

    // Añadir la nueva entrada al principio del array.
    array_unshift($entries, $new_entry);

    // Guardar el array actualizado de vuelta en el archivo JSON.
    file_put_contents($file_path, json_encode($entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['success' => true, 'message' => 'Post recibido y guardado con éxito.']);
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Error: Faltan datos en la solicitud o el formato es incorrecto.']);
}
?>`})})]}),e.jsxs("div",{className:"mt-6",children:[e.jsx("h5",{className:"font-semibold text-md text-yellow-300",children:s("guide.webhook.nodeExampleTitle")}),e.jsx("p",{className:"text-sm",children:s("guide.webhook.nodeExampleDesc")}),e.jsx("pre",{className:"bg-gray-900 text-white p-4 rounded-md text-sm mt-2",children:e.jsx("code",{children:`// Ejemplo usando Express.js (npm install express)
const express = require('express');
const fs = require('fs');
const cors = require('cors'); // npm install cors
const app = express();

app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Permite recibir JSON

app.post('/api/nuevo-blog-post', (req, res) => {
  const { title, htmlContent } = req.body;

  if (!title || !htmlContent) {
    return res.status(400).json({ success: false, message: 'Datos incompletos.' });
  }

  // Lógica para guardar el post (ej. en un archivo JSON)
  console.log(\`Post recibido: \${title}\`);
  
  res.status(200).json({ success: true, message: 'Post procesado con éxito.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Servidor escuchando en el puerto \${PORT}\`));`})})]}),e.jsx("h4",{className:"mt-4",children:s("guide.webhook.dataStructureTitle")}),e.jsx("p",{children:s("guide.webhook.dataStructureDesc")}),e.jsx("pre",{className:"bg-gray-900 text-white p-4 rounded-md text-sm",children:e.jsx("code",{children:`{
  "id": "string",
  "title": "string",
  "htmlContent": "string (HTML completo del artículo)",
  "featuredImageUrl": "string (URL)",
  "metaDescription": "string",
  "focusKeyword": "string"
}`})})]})]})]})};export{l as ConnectionGuide};
