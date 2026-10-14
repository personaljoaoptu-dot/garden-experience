import { supabase } from '../../core/supabase/client.js';

export const followupsRepository = {
  async fetchCases(organizationId) {
    try {
      let query = supabase.from('follow_up_cases').select('*').order('created_at', { ascending: false });
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

  async updateCaseStatus(caseId, status, assignedUser = null, internalNotes = null) {
    if (!caseId) return null;
    try {
      const payload = { status, updated_at: new Date().toISOString() };
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (assignedUser && uuidRegex.test(String(assignedUser).trim())) {
        payload.assigned_user_id = String(assignedUser).trim();
      }
      if (internalNotes !== null && internalNotes !== undefined) {
        payload.internal_notes = String(internalNotes).trim();
      }
      if (status === 'resolved') payload.resolved_at = new Date().toISOString();

      const { data, error } = await supabase.from('follow_up_cases').update(payload).eq('id', caseId).select().single();
      if (error) {
        console.warn('[followupsRepository.updateCaseStatus warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[followupsRepository.updateCaseStatus error]:', err);
      return null;
    }
  },

  async createCase({ organizationId, responseId, unitId, studentId = null, status = 'pending', priority = 'high', assignedUserId = null }) {
    if (!organizationId || !responseId || !unitId) return null;
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const payload = {
        organization_id: organizationId,
        response_id: responseId,
        unit_id: unitId,
        student_id: studentId && uuidRegex.test(String(studentId)) ? studentId : null,
        status,
        priority,
        assigned_user_id: assignedUserId && uuidRegex.test(String(assignedUserId)) ? assignedUserId : null,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null
      };

      const { data, error } = await supabase.from('follow_up_cases').insert(payload).select().single();
      if (error) {
        console.warn('[followupsRepository.createCase warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[followupsRepository.createCase error]:', err);
      return null;
    }
  }
};
