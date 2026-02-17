/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface QuoteItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  image_url?: string;
  description?: string;
}

interface CreateQuoteRequest {
  user_id: string;
  user_email?: string;
  contact_id: number;
  items: QuoteItem[];
  discount?: number;
  tax?: number;
  valid_until?: string;
  notes?: string;
  contact_info?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener token de autorización
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: CreateQuoteRequest = await req.json();

    if (!requestData.user_id || !requestData.contact_id || !requestData.items || requestData.items.length === 0) {
      throw new Error('Missing required fields: user_id, contact_id, items');
    }

    // Validar que los productos existan y obtener información completa
    const productIds = requestData.items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, product_name, price, media_url, description, stock')
      .in('id', productIds)
      .eq('user_id', requestData.user_id);

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    if (!products || products.length !== productIds.length) {
      throw new Error('Some products not found');
    }

    // Crear mapa de productos para validación
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validar y completar items con datos de productos
    const validatedItems: QuoteItem[] = requestData.items.map(item => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      // Usar precio del producto si no se proporcionó
      const price = item.price || parseFloat(product.price) || 0;
      const quantity = item.quantity || 1;
      const subtotal = price * quantity;

      return {
        product_id: item.product_id,
        product_name: item.product_name || product.product_name,
        quantity,
        price,
        subtotal,
        image_url: item.image_url || product.media_url || undefined,
        description: item.description || product.description || undefined
      };
    });

    // Calcular totales
    const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = requestData.discount || 0;
    const tax = requestData.tax || 0;
    const total = subtotal - discount + tax;

    // Generar ID de cotización usando función SQL
    const { data: quoteIdData, error: quoteIdError } = await supabase
      .rpc('generate_quote_id', { p_user_id: requestData.user_id });

    if (quoteIdError || !quoteIdData) {
      throw new Error(`Error generating quote ID: ${quoteIdError?.message || 'Unknown error'}`);
    }

    const quoteId = quoteIdData as string;

    // Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('full_name, phone_number')
      .eq('id', requestData.contact_id)
      .eq('user_id', requestData.user_id)
      .single();

    if (contactError) {
      console.warn('Could not fetch contact info:', contactError);
    }

    // Obtener información de la empresa
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, business_address, business_phone, email')
      .eq('id', requestData.user_id)
      .single();

    if (profileError) {
      console.warn('Could not fetch company info:', profileError);
    }

    // Preparar datos para generar PDF
    const quoteDataForPDF = {
      quote_id: quoteId,
      user_id: requestData.user_id,
      user_email: requestData.user_email || profile?.email,
      contact_id: requestData.contact_id,
      items: validatedItems,
      subtotal,
      discount,
      tax,
      total,
      valid_until: requestData.valid_until,
      notes: requestData.notes,
      contact_info: requestData.contact_info || (contact ? {
        name: contact.full_name,
        phone: contact.phone_number
      } : undefined),
      company_info: profile ? {
        name: profile.full_name,
        address: profile.business_address,
        phone: profile.business_phone,
        email: profile.email
      } : undefined
    };

    // Llamar a generate-quote-pdf
    const generatePdfUrl = `${supabaseUrl}/functions/v1/generate-quote-pdf`;
    const pdfResponse = await fetch(generatePdfUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(quoteDataForPDF)
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`Error generating PDF: ${errorText}`);
    }

    const pdfResult = await pdfResponse.json();
    const pdfUrl = pdfResult.pdf_url;

    if (!pdfUrl) {
      throw new Error('PDF generation did not return URL');
    }

    // Crear registro en la base de datos
    const { data: quote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        id: quoteId,
        user_id: requestData.user_id,
        contact_id: requestData.contact_id,
        status: 'draft',
        items: validatedItems,
        subtotal,
        discount,
        tax,
        total,
        valid_until: requestData.valid_until ? new Date(requestData.valid_until).toISOString() : null,
        pdf_url: pdfUrl,
        notes: requestData.notes
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error creating quote: ${insertError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      quote: {
        id: quote.id,
        quote_id: quoteId,
        user_id: quote.user_id,
        contact_id: quote.contact_id,
        status: quote.status,
        items: quote.items,
        subtotal: quote.subtotal,
        discount: quote.discount,
        tax: quote.tax,
        total: quote.total,
        pdf_url: quote.pdf_url,
        created_at: quote.created_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[create-quote] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

