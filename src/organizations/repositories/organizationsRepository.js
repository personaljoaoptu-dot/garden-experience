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
      const updatePayload = {
        name: org.name,
        trade_name: org.tradeName || org.trade_name || org.name || null,
        email: org.email || null,
        phone: org.phone || null,
        logo_url: org.logoUrl || org.logo_url || '/logo-garden-gold.jpg',
        updated_at: new Date().toISOString()
      };

      // 1. Try SECURITY DEFINER RPC first for guaranteed persistence across multi-tenant memberships
      if (typeof supabase.rpc === 'function') {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('update_organization_settings', {
            p_org_id: org.id,
            p_name: updatePayload.name,
            p_trade_name: updatePayload.trade_name,
            p_email: updatePayload.email,
            p_phone: updatePayload.phone,
            p_logo_url: updatePayload.logo_url
          });
          if (!rpcError && rpcData) {
            return rpcData;
          }
        } catch (_) {}
      }

      // 2. Fallback to direct table UPDATE
      const { data: updatedData, error: updateError } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', org.id)
        .select()
        .maybeSingle();

      if (!updateError && updatedData) {
        return updatedData;
      }

      // 3. Fallback to UPSERT
      const { data, error } = await supabase
        .from('organizations')
        .upsert({ id: org.id, ...updatePayload })
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
  },

  async fetchPublicBranding(orgId) {
    if (!orgId) return null;
    try {
      const { data, error } = await supabase.rpc('get_public_organization_branding', {
        p_org_id: orgId
      });
      if (error) {
        console.warn('[organizationsRepository.fetchPublicBranding warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[organizationsRepository.fetchPublicBranding error]:', err);
      return null;
    }
  }
};

