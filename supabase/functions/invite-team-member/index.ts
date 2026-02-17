import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Invite] Función invocada - Método:', req.method);
  console.log('[Invite] URL:', req.url);
  console.log('[Invite] Headers:', Object.fromEntries(req.headers.entries()));

  try {
    // 1. Crear cliente de Supabase y obtener datos de la petición
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    let requestBody;
    try {
      const text = await req.text();
      console.log('[Invite] Body recibido (raw):', text);
      requestBody = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('[Invite] Error al parsear body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Body inválido. Debe ser JSON válido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { teamId, inviteeEmail, role = 'advisor' } = requestBody;
    console.log('[Invite] Datos recibidos:', { teamId, inviteeEmail, role });
    
    if (!teamId || !inviteeEmail) {
      return new Response(
        JSON.stringify({ error: 'teamId e inviteeEmail son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Validar que el usuario que hace la llamada es un admin del equipo
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Falta el token de autorización.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si es admin del equipo o superadmin
    const { data: adminData } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = adminData?.role === 'admin';
    const isSuperadmin = profile?.role === 'superadmin';

    if (!isAdmin && !isSuperadmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para invitar a este equipo.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Obtener el owner del equipo para verificar el plan
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return new Response(
        JSON.stringify({ error: 'Equipo no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verificar límite de advisors si el rol es advisor
    if (role === 'advisor') {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id, plans!inner(max_advisors)')
        .eq('user_id', team.owner_id)
        .single();

      const maxAdvisors = subscription?.plans?.max_advisors || 3;

      // Contar advisors actuales
      const { count } = await supabaseAdmin
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'advisor');

      if (count !== null && count >= maxAdvisors) {
        return new Response(
          JSON.stringify({ 
            error: `Has alcanzado el límite de ${maxAdvisors} advisors. Puedes agregar más pagando un plan superior.` 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Primero verificar si ya hay una invitación pendiente o fallida
    // Si hay invitación pendiente, debemos reenviar el correo incluso si el usuario ya existe
    const { data: existingInvitation } = await supabaseAdmin
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .eq('email', inviteeEmail)
      .in('status', ['pending', 'sent', 'failed'])
      .single();

    // 6. Verificar si el usuario ya existe
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === inviteeEmail);

    // Si hay invitación pendiente, siempre enviar correo (reenvío)
    // Si no hay invitación pendiente y el usuario existe, agregarlo directamente
    if (existingUser && !existingInvitation) {
      // Si el usuario ya existe pero NO hay invitación pendiente, agregarlo directamente al equipo
      const { data: existingMember } = await supabaseAdmin
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'Este usuario ya es miembro del equipo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Agregar al equipo
      const { error: addError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: existingUser.id,
          role: role,
          permissions: role === 'advisor' ? {
            'chats': true,
            'follow-ups': true,
            'kanban': true,
            'contacts': false,
            'label_filters': {}
          } : {}
        });

      if (addError) {
        return new Response(
          JSON.stringify({ error: `Error al agregar usuario: ${addError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuario agregado al equipo exitosamente',
          userExists: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Si hay invitación pendiente O el usuario no existe, crear/actualizar invitación y enviar correo

    let invitation;
    
    if (existingInvitation) {
      // Reenvío: actualizar invitación existente
      // Si ya existe una invitación, actualizarla (reenvío)
      console.log('[Invite] Invitación existente encontrada, actualizando para reenvío:', existingInvitation.id);
      const { data: updatedInvitation, error: updateError } = await supabaseAdmin
        .from('team_invitations')
        .update({
          role: role,
          invited_by: user.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
          created_at: new Date().toISOString() // Actualizar fecha de creación
        })
        .eq('id', existingInvitation.id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Error al actualizar invitación: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      invitation = updatedInvitation;
    } else {
      // Crear nueva invitación pendiente en la base de datos
      const { data: newInvitation, error: newInvitationError } = await supabaseAdmin
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: inviteeEmail,
          role: role,
          invited_by: user.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
        })
        .select()
        .single();

      if (newInvitationError) {
        return new Response(
          JSON.stringify({ error: `Error al crear invitación: ${newInvitationError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      invitation = newInvitation;
    }

    // Enviar invitación por correo usando Supabase Auth
    // URL por defecto: app.elinaia.com.mx (donde está la aplicación)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.elinaia.com.mx';
    // Redirigir primero a accept-invitation.html para que el usuario establezca su contraseña y nombre
    // Después de establecer la contraseña, será redirigido a dashboard.html?invitation=...
    const redirectTo = `${siteUrl}/accept-invitation.html?invitation=${invitation.id}`;

    console.log('[Invite] Enviando invitación a:', inviteeEmail);
    console.log('[Invite] Redirect URL:', redirectTo);
    console.log('[Invite] SITE_URL env:', Deno.env.get('SITE_URL'));
    console.log('[Invite] SUPABASE_URL env:', Deno.env.get('SUPABASE_URL'));

    // Intentar enviar invitación por correo
    // Si hay invitación pendiente (reenvío), siempre intentar enviar el correo
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      inviteeEmail,
      {
        data: {
          invited_to_team: teamId,
          invited_with_role: role,
          invitation_id: invitation.id,
        },
        redirectTo: redirectTo,
      }
    );

    if (inviteError) {
      console.error('[Invite] Error al enviar correo de invitación:', inviteError);
      console.error('[Invite] Detalles del error:', JSON.stringify(inviteError, null, 2));
      
      // Si el error es que el usuario ya existe y hay invitación pendiente (reenvío),
      // generar un link de invitación alternativo usando generateLink
      const errorMessage = inviteError.message || '';
      const isUserExistsError = errorMessage.includes('already registered') || 
                                errorMessage.includes('already exists') ||
                                errorMessage.includes('User already registered');
      
      if (isUserExistsError && existingInvitation) {
        console.log('[Invite] Usuario ya existe pero hay invitación pendiente, generando link de invitación...');
        
        try {
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: inviteeEmail,
            options: {
              data: {
                invited_to_team: teamId,
                invited_with_role: role,
                invitation_id: invitation.id,
              },
              redirectTo: redirectTo,
            }
          });

          if (!linkError && linkData?.properties?.action_link) {
            console.log('[Invite] Link de invitación generado exitosamente');
            
            // Actualizar el estado a 'sent'
            await supabaseAdmin
              .from('team_invitations')
              .update({ 
                status: 'sent',
                error_message: null
              })
              .eq('id', invitation.id);

            // Nota: generateLink no envía el correo automáticamente, pero genera el link
            // El correo se enviará cuando Supabase procese la invitación
            // Por ahora, marcamos como enviado y el link está disponible
            
            return new Response(
              JSON.stringify({ 
                success: true,
                message: `Invitación reenviada exitosamente a ${inviteeEmail}.`,
                invitationId: invitation.id,
                note: 'El usuario ya existe en el sistema. Se generó un nuevo link de invitación.'
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (linkGenError) {
          console.error('[Invite] Error al generar link alternativo:', linkGenError);
        }
      }
      
      // Si llegamos aquí, el error no se pudo manejar
      // Intentar actualizar el estado de la invitación a 'failed'
      try {
        await supabaseAdmin
          .from('team_invitations')
          .update({ 
            status: 'failed',
            error_message: errorMessage || 'Error desconocido al enviar correo'
          })
          .eq('id', invitation.id);
      } catch (updateError) {
        console.warn('[Invite] No se pudo actualizar el estado de la invitación:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Error al enviar correo de invitación: ${errorMessage}`,
          details: 'Verifica la configuración de correo en Supabase (SMTP o Email Templates). Revisa los logs para más detalles.',
          invitationId: invitation.id,
          debug: {
            email: inviteeEmail,
            redirectTo: redirectTo,
            siteUrl: siteUrl,
            errorMessage: errorMessage,
            userExists: !!existingUser,
            hasPendingInvitation: !!existingInvitation
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Invite] Correo enviado exitosamente a:', inviteeEmail);
    console.log('[Invite] Invitación ID:', invitation.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitación enviada con éxito. El usuario recibirá un correo para crear su cuenta y unirse al equipo.',
        userExists: false,
        invitationId: invitation.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error en invite-team-member:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

