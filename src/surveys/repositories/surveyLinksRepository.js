import { supabase } from '../../core/supabase/client.js';

export const surveyLinksRepository = {
  /**
   * Fetch survey links for a given organization ID joined with unit info
   */
  async fetchSurveyLinks(organizationId) {
    if (!organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('survey_links')
        .select('id, token, survey_id, unit_id, is_active, expires_at, created_at, units!inner(id, name, code, organization_id), surveys(id, title, is_active)')
        .eq('units.organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[surveyLinksRepository.fetchSurveyLinks warning]:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[surveyLinksRepository.fetchSurveyLinks error]:', err);
      return [];
    }
  },

  /**
   * Get active survey link for a specific unit
   */
  async getSurveyLinkForUnit(unitId) {
    if (!unitId) return null;

    try {
      const { data, error } = await supabase
        .from('survey_links')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('[surveyLinksRepository.getSurveyLinkForUnit warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[surveyLinksRepository.getSurveyLinkForUnit error]:', err);
      return null;
    }
  },

  /**
   * Create a new survey link for a unit and survey
   */
  async createSurveyLink(unitId, surveyId) {
    if (!unitId) return { data: null, error: { message: 'ID da unidade é obrigatório.' } };

    try {
      const safeToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('link_' + Math.random().toString(36).substring(2, 12));
      const payload = {
        unit_id: unitId,
        survey_id: surveyId || null,
        token: safeToken,
        is_active: true
      };

      const { data, error } = await supabase
        .from('survey_links')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[surveyLinksRepository.createSurveyLink error]:', error.message);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error('[surveyLinksRepository.createSurveyLink unexpected]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Ensure an active survey link exists for a unit, creating one if missing
   */
  async ensureSurveyLinkForUnit(unitId, surveyId) {
    if (!unitId) return null;

    const existing = await this.getSurveyLinkForUnit(unitId);
    if (existing) return existing;

    const created = await this.createSurveyLink(unitId, surveyId);
    return created.data;
  },

  /**
   * Deactivate a survey link by ID
   */
  async deactivateSurveyLink(id) {
    if (!id) return false;

    try {
      const { error } = await supabase
        .from('survey_links')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.warn('[surveyLinksRepository.deactivateSurveyLink warning]:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[surveyLinksRepository.deactivateSurveyLink error]:', err);
      return false;
    }
  },

  /**
   * Fetch survey link by public token (no admin auth required)
   */
  async getSurveyLinkByToken(token) {
    if (!token) return null;

    try {
      const { data, error } = await supabase
        .from('survey_links')
        .select('id, token, survey_id, unit_id, is_active, expires_at, units(id, name, code, organization_id), surveys(id, title, is_active)')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('[surveyLinksRepository.getSurveyLinkByToken warning]:', error.message);
        return null;
      }

      if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
        console.warn('[surveyLinksRepository.getSurveyLinkByToken]: Token expired');
        return null;
      }

      return data;
    } catch (err) {
      console.error('[surveyLinksRepository.getSurveyLinkByToken error]:', err);
      return null;
    }
  }
};
