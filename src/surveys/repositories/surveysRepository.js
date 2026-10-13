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
        is_active: survey.is_active !== undefined ? survey.is_active : (survey.isActive !== false),
        is_anonymous_allowed: survey.is_anonymous_allowed !== undefined ? survey.is_anonymous_allowed : (survey.isAnonymousAllowed !== false),
        updated_at: new Date().toISOString()
      };
      if (survey.organization_id || survey.organizationId) {
        payload.organization_id = survey.organization_id || survey.organizationId;
      }

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
  },

  async fetchQuestions(surveyId) {
    if (!surveyId) return [];
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.warn('[surveysRepository.fetchQuestions warning]:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('[surveysRepository.fetchQuestions error]:', err);
      return [];
    }
  },

  async saveSurveyWithQuestions({ surveyId, organizationId, title, description, npsQuestionTitle, textQuestionTitle }) {
    if (!organizationId) {
      return { success: false, error: 'Organização ativa é obrigatória.' };
    }

    try {
      let targetSurveyId = surveyId;

      if (targetSurveyId) {
        const { data: updatedSurvey, error: upErr } = await supabase
          .from('surveys')
          .update({
            title: title || 'Pesquisa de Satisfação NPS',
            description: description || '',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetSurveyId)
          .eq('organization_id', organizationId)
          .select()
          .single();

        if (upErr) {
          return { success: false, error: upErr.message };
        }
        targetSurveyId = updatedSurvey.id;
      } else {
        const { data: createdSurvey, error: crErr } = await supabase
          .from('surveys')
          .insert({
            organization_id: organizationId,
            title: title || 'Pesquisa de Satisfação NPS',
            description: description || '',
            is_active: true,
            is_anonymous_allowed: true
          })
          .select()
          .single();

        if (crErr) {
          return { success: false, error: crErr.message };
        }
        targetSurveyId = createdSurvey.id;
      }

      const existingQuestions = await this.fetchQuestions(targetSurveyId);
      const npsQ = existingQuestions.find(q => q.question_type === 'nps');
      const textQ = existingQuestions.find(q => q.question_type === 'text');

      if (npsQuestionTitle) {
        if (npsQ) {
          await supabase
            .from('questions')
            .update({ title: npsQuestionTitle.trim() })
            .eq('id', npsQ.id);
        } else {
          await supabase
            .from('questions')
            .insert({
              survey_id: targetSurveyId,
              question_type: 'nps',
              title: npsQuestionTitle.trim(),
              is_required: true,
              order_index: 1,
              is_active: true
            });
        }
      }

      if (textQuestionTitle) {
        if (textQ) {
          await supabase
            .from('questions')
            .update({ title: textQuestionTitle.trim() })
            .eq('id', textQ.id);
        } else {
          await supabase
            .from('questions')
            .insert({
              survey_id: targetSurveyId,
              question_type: 'text',
              title: textQuestionTitle.trim(),
              is_required: false,
              order_index: 2,
              is_active: true
            });
        }
      }

      return { success: true, surveyId: targetSurveyId };
    } catch (err) {
      console.error('[surveysRepository.saveSurveyWithQuestions error]:', err);
      return { success: false, error: err.message || 'Erro ao salvar pesquisa.' };
    }
  }
};
