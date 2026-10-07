import { supabase } from '../../core/supabase/client.js';

export const organizationsRepository = {
  async fetchOrganizationById(orgId) {
    if (!orgId) return null;
    try {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
      if (error) {
        console.warn('[organizationsRepository.fetchOrganizationById warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[organizationsRepository.fetchOrganizationById error]:', err);
      return null;
    }
  },

  async fetchOrganizations() {
    try {
      const { data, error } = await supabase.from('organizations').select('*').order('name');
      if (error) {
        console.warn('[organizationsRepository.fetchOrganizations warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[organizationsRepository.fetchOrganizations error]:', err);
      return null;
    }
  },

  async fetchUserOrganization(userId) {
    if (!userId) return null;
    try {
      // 1. Query profiles table for organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (profile && profile.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .maybeSingle();
        if (org) return org;
      }

      // 2. Query user_unit_permissions for unit -> organization
      const { data: perm } = await supabase
        .from('user_unit_permissions')
        .select('unit_id, unit:units(organization_id)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (perm && perm.unit && perm.unit.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', perm.unit.organization_id)
          .maybeSingle();
        if (org) return org;
      }

      // If no profile or unit permission links user to an org, return null (no arbitrary orgs[0] fallback)
      return null;
    } catch (err) {
      console.warn('[organizationsRepository.fetchUserOrganization error]:', err);
      return null;
    }
  },

  async saveOrganization(org) {
    if (!org || !org.id) return null;
    try {
      const payload = {
        id: org.id,
        name: org.name
      };

      const { data, error } = await supabase
        .from('organizations')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.warn('[organizationsRepository.saveOrganization warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[organizationsRepository.saveOrganization error]:', err);
      return null;
    }
  }
};
