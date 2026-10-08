import { supabase } from '../../core/supabase/client.js';

export const usersRepository = {
  /**
   * Fetch organization team members with profile details
   */
  async fetchTeamMembers(organizationId) {
    if (!organizationId) return [];
    try {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status, created_at, profiles(email, full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error || !members) {
        console.warn('[usersRepository.fetchTeamMembers warning]:', error?.message);
        return [];
      }

      return members.map(m => ({
        id: m.id,
        userId: m.user_id,
        name: m.profiles?.full_name || m.profiles?.email || 'Colaborador',
        email: m.profiles?.email || '',
        role: m.role,
        status: m.status === 'active' ? 'Ativo' : (m.status === 'invited' ? 'Convidado' : 'Inativo'),
        createdAt: m.created_at
      }));
    } catch (err) {
      console.warn('[usersRepository.fetchTeamMembers error]:', err);
      return [];
    }
  },

  /**
   * Invite or link a member to the active organization via secure RPC
   */
  async inviteMember({ organizationId, email, role }) {
    if (!organizationId || !email) {
      return { success: false, error: 'Organização e E-mail são obrigatórios.' };
    }

    try {
      const { data, error } = await supabase.rpc('invite_organization_member', {
        p_org_id: organizationId,
        p_user_email: email.trim(),
        p_role: role || 'operator'
      });

      if (error) {
        console.error('[usersRepository.inviteMember RPC Error]:', error.message);
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Falha ao processar convite.' };
      }

      return { success: true, message: data.message };
    } catch (err) {
      console.error('[usersRepository.inviteMember unexpected]:', err);
      return { success: false, error: 'Erro inesperado ao convidar colaborador.' };
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
   * Remove member access from organization without deleting auth.users account
   */
  async removeMember(memberId, organizationId) {
    if (!memberId || !organizationId) return false;
    try {
      const { error } = await supabase
        .from('organization_members')
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
