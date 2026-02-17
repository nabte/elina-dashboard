import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  teamId: string;
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener el token de autorización
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autorización' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente de Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Obtener el usuario que hace la petición
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear el body
    let requestBody: RequestBody;
    try {
      const rawBody = await req.text();
      requestBody = JSON.parse(rawBody);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Error al parsear el body de la petición' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, teamId } = requestBody;

    if (!userId || !teamId) {
      return new Response(
        JSON.stringify({ error: 'userId y teamId son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Delete Team Member] Usuario solicitante:', user.id);
    console.log('[Delete Team Member] Usuario a eliminar:', userId);
    console.log('[Delete Team Member] Equipo:', teamId);

    // Verificar que el usuario que hace la petición es admin del equipo
    const { data: requesterMember, error: requesterError } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (requesterError || !requesterMember) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para eliminar miembros de este equipo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario a eliminar es miembro del equipo
    const { data: memberToDelete, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError || !memberToDelete) {
      return new Response(
        JSON.stringify({ error: 'El usuario no es miembro de este equipo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No permitir que un admin se elimine a sí mismo
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminarte a ti mismo del equipo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No permitir eliminar a otro admin (solo el owner puede hacerlo)
    if (memberToDelete.role === 'admin') {
      // Verificar si el usuario que hace la petición es el owner del equipo
      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('owner_id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return new Response(
          JSON.stringify({ error: 'Error al verificar el equipo' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (team.owner_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Solo el propietario del equipo puede eliminar a otros administradores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 1. Eliminar de team_members
    console.log('[Delete Team Member] Eliminando de team_members...');
    const { error: deleteMemberError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (deleteMemberError) {
      console.error('[Delete Team Member] Error al eliminar de team_members:', deleteMemberError);
      return new Response(
        JSON.stringify({ error: `Error al eliminar miembro del equipo: ${deleteMemberError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Obtener email del usuario antes de eliminarlo para eliminar invitaciones
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    // 3. Eliminar invitaciones relacionadas
    if (userEmail) {
      console.log('[Delete Team Member] Eliminando invitaciones relacionadas...');
      const { error: deleteInvitationsError } = await supabaseAdmin
        .from('team_invitations')
        .delete()
        .eq('team_id', teamId)
        .eq('email', userEmail);

      if (deleteInvitationsError) {
        console.warn('[Delete Team Member] Advertencia al eliminar invitaciones (no crítico):', deleteInvitationsError);
      }
    }

    // 4. Eliminar el perfil (opcional, pero recomendado para limpieza)
    console.log('[Delete Team Member] Eliminando perfil...');
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.warn('[Delete Team Member] Advertencia al eliminar perfil (no crítico):', deleteProfileError);
    }

    // 5. Eliminar el usuario de auth.users usando Admin API
    console.log('[Delete Team Member] Eliminando usuario de auth.users...');
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('[Delete Team Member] Error al eliminar usuario de auth:', deleteUserError);
      return new Response(
        JSON.stringify({ error: `Error al eliminar usuario del sistema de autenticación: ${deleteUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Delete Team Member] ✅ Usuario eliminado exitosamente');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuario eliminado exitosamente del equipo y del sistema'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Delete Team Member] Error general:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

