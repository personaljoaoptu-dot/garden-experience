import { supabase } from '../../core/supabase/client.js';

export const followupsRepository = {
  async fetchCases(organizationId) {
    try {
      let query = supabase.from('followup_cases').select('*').order('created_at', { ascending: false });
      if (organizationId) query = query.eq('organization_id', organizationId);

      const { data, error } = await query;
      if (error) {
        console.warn('[followupsRepository.fetchCases warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[followupsRepository.fetchCases error]:', err);
      return null;
    }
  },

  async updateCaseStatus(caseId, status, assignedUser = null) {
    try {
      const payload = { status, updated_at: new Date().toISOString() };
      if (assignedUser) payload.assigned_user = assignedUser;
      if (status === 'resolved') payload.resolved_at = new Date().toISOString();

      const { data, error } = await supabase.from('followup_cases').update(payload).eq('id', caseId).select().single();
      if (error) {
        console.warn('[followupsRepository.updateCaseStatus warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[followupsRepository.updateCaseStatus error]:', err);
      return null;
    }
  }
};
