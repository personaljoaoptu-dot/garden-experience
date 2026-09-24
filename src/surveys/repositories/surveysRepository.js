import { supabase } from '../../core/supabase/client.js';

export const surveysRepository = {
  async getSurveyByToken(token) {
    if (!token || token === 'generic') return null;
    try {
      const { data, error } = await supabase
        .from('survey_links')
        .select('*, unit:units(*), survey:surveys(*)')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('[surveysRepository.getSurveyByToken warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[surveysRepository.getSurveyByToken error]:', err);
      return null;
    }
  },

  async fetchSurveys(organizationId) {
    try {
      let query = supabase.from('surveys').select('*').order('created_at', { ascending: false });
      if (organizationId) query = query.eq('organization_id', organizationId);

      const { data, error } = await query;
      if (error) {
        console.warn('[surveysRepository.fetchSurveys warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[surveysRepository.fetchSurveys error]:', err);
      return null;
    }
  }
};
