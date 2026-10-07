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
  },

  async saveSurvey(survey) {
    if (!survey || !survey.id) return null;
    try {
      const payload = {
        id: survey.id,
        title: survey.title || 'Pesquisa de Satisfação NPS',
        description: survey.description || '',
        is_active: survey.is_active !== undefined ? survey.is_active : true,
        is_anonymous_allowed: survey.is_anonymous_allowed !== undefined ? survey.is_anonymous_allowed : true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('surveys').upsert(payload).select().single();
      if (error) {
        console.warn('[surveysRepository.saveSurvey warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[surveysRepository.saveSurvey error]:', err);
      return null;
    }
  }
};
