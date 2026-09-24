import { supabase } from '../../core/supabase/client.js';

export const organizationsRepository = {
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

  async saveOrganization(org) {
    if (!org) return null;
    try {
      const payload = {
        name: org.name,
        email: org.email,
        phone: org.phone || null,
        logo_url: org.logoUrl || null,
        updated_at: new Date().toISOString()
      };
      if (org.id && !org.id.startsWith('org_')) {
        payload.id = org.id;
      }

      const { data, error } = await supabase.from('organizations').upsert(payload).select().single();
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
