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

      const seenKeys = new Set();
      const activeList = [];
      for (const m of (members || [])) {
        const key = (m.profiles?.email || m.user_id || m.id || '').toLowerCase();
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);
        activeList.push({
          id: m.id,
          userId: m.user_id,
          name: m.profiles?.full_name || m.profiles?.email || 'Colaborador',
          email: m.profiles?.email || '',
          role: m.role,
          status: m.status === 'active' ? 'Ativo' : (m.status === 'invited' ? 'Convidado' : 'Inativo'),
          isPendingInvite: false,
          inviteToken: null,
          createdAt: m.created_at
        });
      }

      // Also fetch pending invitations from organization_invites
      const { data: pendingInvites } = await supabase
        .from('organization_invites')
        .select('id, email, full_name, role, token, status, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const inviteList = [];
      for (const inv of (pendingInvites || [])) {
        const emailKey = (inv.email || inv.id || '').toLowerCase();
        if (!emailKey || seenKeys.has(emailKey)) continue;
        seenKeys.add(emailKey);
        inviteList.push({
          id: inv.id,
          userId: null,
          name: inv.full_name || inv.email?.split('@')[0] || 'Convidado',
          email: inv.email || '',
          role: inv.role || 'operator',
          status: 'Convite Pendente',
          isPendingInvite: true,
          inviteToken: inv.token,
          createdAt: inv.created_at
        });
      }

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
  },

  /**
   * Update member name (in profiles table and/or organization_invites)
   */
  async updateMemberName({ userId, memberId, organizationId, newName, isPendingInvite = false }) {
    const cleanName = String(newName || '').trim();
    if (!cleanName) return { success: false, error: 'Nome não pode ser vazio.' };

    try {
      if (isPendingInvite) {
        const { error: invErr } = await supabase
          .from('organization_invites')
          .update({ full_name: cleanName, updated_at: new Date().toISOString() })
          .eq('id', memberId)
          .eq('organization_id', organizationId);

        if (invErr) {
          console.warn('[usersRepository.updateMemberName invite warning]:', invErr.message);
          return { success: false, error: invErr.message };
        }
        return { success: true, name: cleanName };
      }

      // If user is editing their own account, update auth user metadata as well
      const currentUserId = (await supabase.auth.getUser())?.data?.user?.id;
      if (currentUserId && (currentUserId === userId || !userId)) {
        try {
          await supabase.auth.updateUser({ data: { full_name: cleanName } });
        } catch (_) {}
      }

      // Update profiles table
      const targetId = userId || currentUserId;
      if (targetId) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({ full_name: cleanName })
          .eq('id', targetId);

        if (profErr) {
          console.warn('[usersRepository.updateMemberName direct profile update warning]:', profErr.message);
          // Try RPC fallback if available
          const { data: rpcData, error: rpcErr } = await supabase.rpc('update_member_name', {
            p_user_id: targetId,
            p_new_name: cleanName,
            p_organization_id: organizationId,
            p_is_pending: false
          });
          if (rpcErr || (rpcData && rpcData.success === false)) {
            return { success: false, error: rpcErr?.message || rpcData?.error || profErr.message };
          }
        }
      }

      return { success: true, name: cleanName };
    } catch (err) {
      console.error('[usersRepository.updateMemberName error]:', err);
      return { success: false, error: 'Erro inesperado ao atualizar nome.' };
    }
  },

  /**
   * Update member role in organization
   */
  async updateMemberRole(memberId, organizationId, newRole, isPendingInvite = false) {
    if (!memberId || !organizationId || !newRole) return null;
    try {
      const table = isPendingInvite ? 'organization_invites' : 'organization_members';
      const { data, error } = await supabase
        .from(table)
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.warn('[usersRepository.updateMemberRole warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[usersRepository.updateMemberRole error]:', err);
      return null;
    }
  }
};
