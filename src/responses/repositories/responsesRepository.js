import { supabase } from '../../core/supabase/client.js';

export const responsesRepository = {
  async submitPublicResponse({ token, unitCode, origin, npsScore, comment, student, email, phone, consentAccepted }) {
    try {
      const { data, error } = await supabase.rpc('submit_survey_response', {
        p_survey_link_token: token !== 'generic' ? token : null,
        p_unit_code: unitCode,
        p_origin: origin || 'web',
        p_nps_score: npsScore,
        p_comment: comment || null,
        p_student_identifier: student || null,
        p_consent_accepted: Boolean(consentAccepted),
        p_consent_version: '1.0'
      });

      if (error) {
        console.warn('[Supabase RPC Warning] submit_survey_response:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      console.warn('[Supabase RPC Error]:', err);
      return { success: false, error: err.message };
    }
  },

  async fetchResponses({ organizationId, unitCode, origin, startDate, endDate }) {
    try {
      let query = supabase.from('responses').select('*').order('created_at', { ascending: false });

      if (organizationId) query = query.eq('organization_id', organizationId);
      if (unitCode && unitCode !== 'all') query = query.eq('unit_code', unitCode);
      if (origin && origin !== 'all') query = query.eq('origin', origin);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) {
        console.warn('[responsesRepository.fetchResponses warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[responsesRepository.fetchResponses error]:', err);
      return null;
    }
  }
};
