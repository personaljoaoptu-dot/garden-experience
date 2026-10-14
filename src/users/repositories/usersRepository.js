import { supabase } from '../../core/supabase/client.js';

export const usersRepository = {
  /**
   * Fetch organization team members with profile details AND pending invitations
   */
  async fetchTeamMembers(organizationId) {
    if (!organizationId) return [];
    try {
      let { data: members, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status, created_at, profiles(email, full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error || !members) {
        const { data: rawMembers, error: rawErr } = await supabase
          .from('organization_members')
          .select('id, user_id, role, status, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (rawErr || !rawMembers) {
          console.warn('[usersRepository.fetchTeamMembers warning]:', (rawErr || error)?.message);
          members = [];
        } else {
          const userIds = rawMembers.map(m => m.user_id).filter(Boolean);
          let profilesById = new Map();
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, email, full_name')
              .in('id', userIds);
            if (profs) {
              profilesById = new Map(profs.map(p => [p.id, p]));
            }
          }

          members = rawMembers.map(m => ({
            ...m,
            profiles: profilesById.get(m.user_id) || null
          }));
        }
      }

      const activeList = (members || []).map(m => ({
        id: m.id,
        userId: m.user_id,
        name: m.profiles?.full_name || m.profiles?.email || 'Colaborador',
        email: m.profiles?.email || '',
        role: m.role,
        status: m.status === 'active' ? 'Ativo' : (m.status === 'invited' ? 'Convidado' : 'Inativo'),
        isPendingInvite: false,
        inviteToken: null,
        createdAt: m.created_at
      }));

      // Also fetch pending invitations from organization_invites
      const { data: pendingInvites } = await supabase
        .from('organization_invites')
        .select('id, email, full_name, role, token, status, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const activeEmails = new Set(activeList.map(a => (a.email || '').toLowerCase()));
      const inviteList = (pendingInvites || [])
        .filter(inv => !activeEmails.has((inv.email || '').toLowerCase()))
        .map(inv => ({
          id: inv.id,
          userId: null,
          name: inv.full_name || inv.email?.split('@')[0] || 'Convidado',
          email: inv.email || '',
          role: inv.role || 'operator',
          status: 'Convite Pendente',
          isPendingInvite: true,
          inviteToken: inv.token,
          createdAt: inv.created_at
        }));

      return [...activeList, ...inviteList];
    } catch (err) {
      console.warn('[usersRepository.fetchTeamMembers error]:', err);
      return [];
    }
  },

  /**
   * Invite or link a member to the active organization via Edge Function or secure RPC
   */
  async inviteMember({ organizationId, email, role, fullName }) {
    if (!organizationId || !email) {
      return { success: false, error: 'Organização e E-mail são obrigatórios.' };
    }

    const normalizedRole = role === 'gestor' || role === 'unit_manager' ? 'manager' : (role || 'operator');

    try {
      // 1. Try invoking Edge Function invite-user if deployed
      const { data: funcData, error: funcErr } = await supabase.functions.invoke('invite-user', {
        body: { organizationId, email: email.trim(), role: normalizedRole, fullName }
      });

      if (!funcErr && funcData && funcData.success !== undefined) {
        if (!funcData.success) {
          return { success: false, error: funcData.error || 'Falha ao processar convite.' };
        }
        return {
          success: true,
          alreadyRegistered: Boolean(funcData.already_registered),
          inviteToken: funcData.invite_token || null,
          message: funcData.message || 'Convite processado com sucesso!'
        };
      }

      // 2. PostgreSQL RPC invite_organization_member (handles both existing users & new pending invites)
      const { data: rpcData, error: rpcError } = await supabase.rpc('invite_organization_member', {
        p_org_id: organizationId,
        p_user_email: email.trim(),
        p_role: normalizedRole,
        p_full_name: fullName ? fullName.trim() : null
      });

      if (rpcError) {
        console.error('[usersRepository.inviteMember RPC Error]:', rpcError.message);
        return { success: false, error: rpcError.message };
      }

      if (rpcData && rpcData.success === false) {
        return { success: false, error: rpcData.error || 'Falha ao processar convite.' };
      }

      return {
        success: true,
        alreadyRegistered: Boolean(rpcData?.already_registered),
        inviteToken: rpcData?.invite_token || null,
        message: rpcData?.message || 'Colaborador convidado com sucesso!'
      };
    } catch (err) {
      console.error('[usersRepository.inviteMember unexpected]:', err);
      return { success: false, error: 'Erro inesperado ao convidar colaborador.' };
    }
  },

  /**
   * Fetch public invite details by token
   */
  async getInviteByToken(token) {
    if (!token) return null;
    try {
      const { data, error } = await supabase.rpc('get_invite_by_token', {
        p_token: String(token).trim()
      });
      if (error) {
        console.warn('[usersRepository.getInviteByToken warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[usersRepository.getInviteByToken error]:', err);
      return null;
    }
  },

  /**
   * Accept pending invite(s) for currently authenticated user
   */
  async acceptInvite(token = null) {
    try {
      const { data, error } = await supabase.rpc('accept_organization_invite', {
        p_token: token ? String(token).trim() : null
      });
      if (error) {
        console.warn('[usersRepository.acceptInvite warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[usersRepository.acceptInvite error]:', err);
      return null;
    }
  },

  /**
   * Update team member status (active, inactive, suspended)
   */
  async updateMemberStatus(memberId, organizationId, newStatus) {
    if (!memberId || !organizationId) return null;
    try {
      const dbStatus = newStatus === 'Ativo' || newStatus === 'active' ? 'active' : 'inactive';
      const { data, error } = await supabase
        .from('organization_members')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.warn('[usersRepository.updateMemberStatus warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[usersRepository.updateMemberStatus error]:', err);
      return null;
    }
  },

  /**
   * Remove member access or revoke pending invite
   */
  async removeMember(memberId, organizationId, isPendingInvite = false) {
    if (!memberId || !organizationId) return false;
    try {
      const table = isPendingInvite ? 'organization_invites' : 'organization_members';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', memberId)
        .eq('organization_id', organizationId);

      if (error) {
        console.warn('[usersRepository.removeMember warning]:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[usersRepository.removeMember error]:', err);
      return false;
    }
  }
};
