import { supabase } from '../../core/supabase/client.js';

export const communicationRepository = {
  /**
   * Fetch communication logs for an organization
   */
  async fetchCommunicationLogs({ organizationId, studentId, caseId }) {
    try {
      if (!organizationId) return [];

      let query = supabase.from('communication_logs').select('*').eq('organization_id', organizationId);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      if (caseId) {
        query = query.eq('follow_up_case_id', caseId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('[communicationRepository.fetchCommunicationLogs warning]:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('[communicationRepository.fetchCommunicationLogs error]:', err);
      return [];
    }
  },

  /**
   * Save a new communication log entry to Supabase
   */
  async saveCommunicationLog(logData) {
    try {
      if (!logData || !logData.organization_id) {
        throw new Error('organization_id required for communication log');
      }

      const { data, error } = await supabase
        .from('communication_logs')
        .insert({
          organization_id: logData.organization_id,
          unit_id: logData.unit_id || null,
          response_id: logData.response_id || null,
          follow_up_case_id: logData.follow_up_case_id || null,
          student_id: logData.student_id || null,
          channel: logData.channel || 'internal',
          direction: logData.direction || 'outbound',
          recipient: logData.recipient || null,
          subject: logData.subject || null,
          body: logData.body || '',
          status: logData.status || 'sent',
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } catch (err) {
      console.error('[communicationRepository.saveCommunicationLog error]:', err);
      return { success: false, error: err.message };
    }
  }
};
