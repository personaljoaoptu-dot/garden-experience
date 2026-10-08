import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Variáveis de ambiente do servidor não configuradas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 1. Verify Authorization Header (JWT of calling admin user)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autorização necessária.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão do administrador inválida.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body = await req.json();
    const { organizationId, email, role, fullName } = body;

    if (!organizationId || !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'organizationId e email são obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Admin client with SERVICE_ROLE_KEY (Server-side only)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check caller role in organization_members
    const { data: callerMember, error: roleErr } = await adminClient
      .from('organization_members')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (roleErr || !callerMember || !['owner', 'admin'].includes(callerMember.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas Administradores ou Proprietários podem convidar colaboradores.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 3. Send Supabase Auth Admin Email Invitation
    const redirectTo = `${req.headers.get('origin') || 'https://garden-experience-green.vercel.app'}?view=accept_invite`;
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim(),
      {
        redirectTo,
        data: {
          full_name: fullName || email.split('@')[0],
          organization_id: organizationId,
          role: role || 'operator'
        }
      }
    );

    let invitedUserId = inviteData?.user?.id || null;

    if (inviteErr) {
      // If user already exists in auth.users, fetch user ID
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
      if (existingUser) {
        invitedUserId = existingUser.id;
      } else {
        return new Response(
          JSON.stringify({ success: false, error: inviteErr.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // 4. Upsert organization_members record with status 'active' or 'invited'
    if (invitedUserId) {
      await adminClient
        .from('organization_members')
        .upsert({
          organization_id: organizationId,
          user_id: invitedUserId,
          role: role || 'operator',
          status: 'active',
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id,user_id' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Convite enviado com sucesso por e-mail para ${email}!`,
        user: inviteData?.user || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno ao processar convite.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
