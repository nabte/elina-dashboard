/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Configuración de Bunny.net
const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE_NAME');
const BUNNY_STORAGE_REGION_HOST = Deno.env.get('BUNNY_STORAGE_REGION_HOST') || 'storage.bunnycdn.com';
const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_PULL_ZONE_HOSTNAME');
const BUNNY_API_KEY = Deno.env.get('BUNNY_STORAGE_ACCESS_KEY');

// Importar pdf-lib que es compatible con Deno
// Nota: El import se hará dentro de la función para evitar problemas con top-level await

interface QuoteItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  image_url?: string;
  description?: string;
}

interface QuoteSettings {
  company_name?: string;
  company_type?: string;
  company_logo_url?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  tax_id?: string;
  business_hours?: string;
  footer_text?: string;
  show_logo?: boolean;
  show_address?: boolean;
  show_phone?: boolean;
  show_email?: boolean;
  show_website?: boolean;
  show_tax_id?: boolean;
  show_business_hours?: boolean;
  primary_color?: string;
  secondary_color?: string;
}

interface QuoteData {
  quote_id: string;
  user_id: string;
  user_email?: string;
  contact_id: number;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  valid_until?: string;
  notes?: string;
  settings?: QuoteSettings;
  contact_info?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  company_info?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_CDN_HOSTNAME) {
      throw new Error('Bunny.net configuration missing');
    }

    const quoteData: QuoteData = await req.json();

    if (!quoteData.quote_id || !quoteData.user_id || !quoteData.items) {
      throw new Error('Missing required fields: quote_id, user_id, items');
    }

    // Generar PDF
    const pdfBuffer = await generatePDF(quoteData);

    // Subir a Bunny.net
    const subfolder = 'productos/cotizaciones';
    const fileName = `${quoteData.quote_id}.pdf`;
    const safeEmail = (quoteData.user_email || quoteData.user_id).replace(/[^a-zA-Z0-9._-]/g, '_');
    const destinationPath = `Elina/${safeEmail}/${subfolder}/${fileName}`;
    const bunnyUploadUrl = `https://${BUNNY_STORAGE_REGION_HOST}/${BUNNY_STORAGE_ZONE}/${destinationPath}`;

    console.log(`[generate-quote-pdf] Subiendo PDF a: ${destinationPath}`);

    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/pdf'
      },
      body: pdfBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload PDF to Bunny.net: ${errorText}`);
    }

    const pdfUrl = `https://${BUNNY_CDN_HOSTNAME}/${destinationPath}`;

    return new Response(JSON.stringify({
      success: true,
      pdf_url: pdfUrl,
      quote_id: quoteData.quote_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[generate-quote-pdf] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function generatePDF(data: QuoteData): Promise<Uint8Array> {
  // Importar pdf-lib dinámicamente
  // Intentar primero con npm: specifier (más confiable en Deno)
  let pdfLib;
  try {
    pdfLib = await import('npm:pdf-lib@1.17.1');
  } catch (e) {
    // Fallback a esm.sh si npm: no funciona
    console.warn('npm: specifier failed, trying esm.sh:', e);
    pdfLib = await import('https://esm.sh/pdf-lib@1.17.1');
  }
  const { PDFDocument, rgb, StandardFonts } = pdfLib;

  // Crear documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 en puntos (72 DPI)
  const { width, height } = page.getSize();

  // Fuentes
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPosition = height - 50; // Empezar desde arriba
  const margin = 50;
  const lineHeight = 15;

  // Encabezado
  page.drawText('COTIZACIÓN', {
    x: margin,
    y: yPosition,
    size: 20,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });

  yPosition -= 25;
  page.drawText(`ID: ${data.quote_id}`, {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  });

  yPosition -= 30;

  // Información de la empresa
  if (data.company_info) {
    page.drawText('Información de la Empresa', {
      x: margin,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight * 1.5;

    const companyInfo = [];
    if (data.company_info.name) companyInfo.push(`Nombre: ${data.company_info.name}`);
    if (data.company_info.address) companyInfo.push(`Dirección: ${data.company_info.address}`);
    if (data.company_info.phone) companyInfo.push(`Teléfono: ${data.company_info.phone}`);
    if (data.company_info.email) companyInfo.push(`Email: ${data.company_info.email}`);

    for (const info of companyInfo) {
      page.drawText(info, {
        x: margin,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= lineHeight;
    }
    yPosition -= 10;
  }

  // Información del contacto
  if (data.contact_info) {
    page.drawText('Cliente', {
      x: margin,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight * 1.5;

    const contactInfo = [];
    if (data.contact_info.name) contactInfo.push(`Nombre: ${data.contact_info.name}`);
    if (data.contact_info.phone) contactInfo.push(`Teléfono: ${data.contact_info.phone}`);
    if (data.contact_info.email) contactInfo.push(`Email: ${data.contact_info.email}`);

    for (const info of contactInfo) {
      page.drawText(info, {
        x: margin,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= lineHeight;
    }
    yPosition -= 10;
  }

  // Fecha y validez
  page.drawText(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  });
  yPosition -= lineHeight;

  if (data.valid_until) {
    const validDate = new Date(data.valid_until).toLocaleDateString('es-ES');
    page.drawText(`Válido hasta: ${validDate}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight;
  }

  yPosition -= 20;

  // Tabla de productos
  page.drawText('Productos', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });
  yPosition -= lineHeight * 1.5;

  // Encabezados de tabla
  const tableTop = yPosition;
  const itemHeight = 20;

  page.drawText('Producto', {
    x: margin,
    y: tableTop,
    size: 9,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });
  page.drawText('Cant.', {
    x: margin + 250,
    y: tableTop,
    size: 9,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });
  page.drawText('Precio Unit.', {
    x: margin + 300,
    y: tableTop,
    size: 9,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });
  page.drawText('Subtotal', {
    x: margin + 400,
    y: tableTop,
    size: 9,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });

  // Línea separadora
  page.drawLine({
    start: { x: margin, y: tableTop - 5 },
    end: { x: width - margin, y: tableTop - 5 },
    thickness: 1,
    color: rgb(0, 0, 0)
  });

  let currentY = tableTop - 20;

  // Items de productos
  for (const item of data.items) {
    // Verificar si necesitamos nueva página
    if (currentY < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      currentY = height - 50;
    }

    // Nombre del producto (truncar si es muy largo)
    const productName = (item.product_name || `Producto ${item.product_id}`).substring(0, 30);
    page.drawText(productName, {
      x: margin,
      y: currentY,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });

    // Cantidad
    page.drawText(item.quantity.toString(), {
      x: margin + 250,
      y: currentY,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });

    // Precio unitario
    page.drawText(`$${item.price.toFixed(2)}`, {
      x: margin + 300,
      y: currentY,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });

    // Subtotal
    page.drawText(`$${item.subtotal.toFixed(2)}`, {
      x: margin + 400,
      y: currentY,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });

    currentY -= itemHeight;
  }

  yPosition = currentY - 20;

  // Totales
  yPosition -= 20;
  const totalsY = yPosition;

  page.drawText('Subtotal:', {
    x: margin + 400,
    y: totalsY,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  });
  page.drawText(`$${data.subtotal.toFixed(2)}`, {
    x: margin + 480,
    y: totalsY,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  });

  if (data.discount > 0) {
    page.drawText('Descuento:', {
      x: margin + 400,
      y: totalsY - 20,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    page.drawText(`-$${data.discount.toFixed(2)}`, {
      x: margin + 480,
      y: totalsY - 20,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
  }

  if (data.tax > 0) {
    page.drawText('IVA:', {
      x: margin + 400,
      y: totalsY - 40,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    page.drawText(`$${data.tax.toFixed(2)}`, {
      x: margin + 480,
      y: totalsY - 40,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
  }

  page.drawText('TOTAL:', {
    x: margin + 400,
    y: totalsY - 60,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });
  page.drawText(`$${data.total.toFixed(2)}`, {
    x: margin + 480,
    y: totalsY - 60,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  });

  // Notas
  if (data.notes) {
    yPosition = totalsY - 100;
    page.drawText('Notas:', {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight;
    // Dividir notas en líneas si son muy largas
    const notesLines = data.notes.match(/.{1,60}/g) || [data.notes];
    for (const line of notesLines) {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= lineHeight;
    }
  }

  // Generar PDF y retornar como Uint8Array
  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

