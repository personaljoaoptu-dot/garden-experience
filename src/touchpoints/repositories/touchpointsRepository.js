import { supabase } from '../../core/supabase/client.js';

export const touchpointsRepository = {
  /**
   * Fetch touchpoints for a specific organization joined with unit associations
   */
  async fetchTouchpoints(organizationId) {
    if (!organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('touchpoints')
        .select(`
          id,
          organization_id,
          name,
          description,
          category,
          evaluation_type,
          scale_min,
          scale_max,
          is_active,
          created_at,
          updated_at,
          unit_touchpoints (
            id,
            unit_id,
            units (
              id,
              name,
              code
            )
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[touchpointsRepository.fetchTouchpoints warning]:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[touchpointsRepository.fetchTouchpoints error]:', err);
      return [];
    }
  },

  /**
   * Fetch active touchpoints for a unit or organization for public survey rendering
   */
  async fetchTouchpointsForUnit(unitId, organizationId = null) {
    if (!unitId && !organizationId) return [];

    try {
      if (unitId) {
        const { data: unitTps, error: utErr } = await supabase
          .from('unit_touchpoints')
          .select('touchpoint_id, touchpoints!inner(id, name, description, category, evaluation_type, scale_min, scale_max, is_active, organization_id)')
          .eq('unit_id', unitId)
          .eq('touchpoints.is_active', true);

        if (!utErr && unitTps && unitTps.length > 0) {
          return unitTps.map(item => item.touchpoints).filter(Boolean);
        }
      }

      if (organizationId) {
        const { data: orgTps, error: orgErr } = await supabase
          .from('touchpoints')
          .select('id, name, description, category, evaluation_type, scale_min, scale_max, is_active, organization_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (!orgErr && orgTps && orgTps.length > 0) {
          return orgTps;
        }
      }

      return [];
    } catch (err) {
      console.warn('[touchpointsRepository.fetchTouchpointsForUnit error]:', err);
      return [];
    }
  },

  /**
   * Create a new touchpoint and bind it to selected units
   */
  async createTouchpoint({ organizationId, name, description = '', category = 'Atendimento', isActive = true, unitIds = [] }) {
    const cleanName = name ? String(name).trim() : '';
    const cleanCategory = category ? String(category).trim() : 'Atendimento';

    if (!cleanName) {
      return { data: null, error: { message: 'Nome do Ponto de Contato é obrigatório.' } };
    }
    if (!cleanCategory) {
      return { data: null, error: { message: 'Categoria é obrigatória.' } };
    }
    if (!organizationId) {
      return { data: null, error: { message: 'ID da Organização é obrigatório.' } };
    }

    try {
      const payload = {
        organization_id: organizationId,
        name: cleanName,
        description: description ? String(description).trim() : null,
        category: cleanCategory,
        is_active: Boolean(isActive)
      };

      const { data: created, error } = await supabase
        .from('touchpoints')
        .insert(payload)
        .select()
        .single();

      if (error || !created) {
        console.error('[touchpointsRepository.createTouchpoint error]:', error?.message);
        return { data: null, error };
      }

      // Link to selected units if provided
      if (Array.isArray(unitIds) && unitIds.length > 0) {
        const unitLinks = unitIds.map(uId => ({
          touchpoint_id: created.id,
          unit_id: uId
        }));
        const { error: linkErr } = await supabase
          .from('unit_touchpoints')
          .insert(unitLinks);

        if (linkErr) {
          console.warn('[touchpointsRepository.createTouchpoint link warning]:', linkErr.message);
        }
      }

      return { data: created, error: null };
    } catch (err) {
      console.error('[touchpointsRepository.createTouchpoint error]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing touchpoint and sync unit associations
   */
  async updateTouchpoint({ id, organizationId, name, description = '', category = 'Atendimento', isActive = true, unitIds = [] }) {
    if (!id) return { data: null, error: { message: 'ID do Ponto de Contato é obrigatório.' } };

    const cleanName = name ? String(name).trim() : '';
    const cleanCategory = category ? String(category).trim() : 'Atendimento';

    if (!cleanName) return { data: null, error: { message: 'Nome do Ponto de Contato é obrigatório.' } };
    if (!cleanCategory) return { data: null, error: { message: 'Categoria é obrigatória.' } };

    try {
      const payload = {
        name: cleanName,
        description: description ? String(description).trim() : null,
        category: cleanCategory,
        is_active: Boolean(isActive),
        updated_at: new Date().toISOString()
      };

      let query = supabase.from('touchpoints').update(payload).eq('id', id);
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: updated, error } = await query.select().single();
      if (error) {
        console.error('[touchpointsRepository.updateTouchpoint error]:', error.message);
        return { data: null, error };
      }

      // Sync unit associations in unit_touchpoints
      if (Array.isArray(unitIds)) {
        // Delete old links
        await supabase.from('unit_touchpoints').delete().eq('touchpoint_id', id);

        // Insert new links
        if (unitIds.length > 0) {
          const unitLinks = unitIds.map(uId => ({
            touchpoint_id: id,
            unit_id: uId
          }));
          await supabase.from('unit_touchpoints').insert(unitLinks);
        }
      }

      return { data: updated, error: null };
    } catch (err) {
      console.error('[touchpointsRepository.updateTouchpoint error]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Update active/inactive status of a touchpoint with full persistence
   */
  async updateTouchpointStatus(id, isActive, organizationId = null) {
    if (!id) return { success: false, error: 'ID inválido.' };

    try {
      let query = supabase
        .from('touchpoints')
        .update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() })
        .eq('id', id);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { error } = await query;
      if (error) {
        console.warn('[touchpointsRepository.updateTouchpointStatus error]:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err) {
      console.error('[touchpointsRepository.updateTouchpointStatus error]:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete or deactivate touchpoint checking for dependencies
   */
  async deleteTouchpoint(id, organizationId = null) {
    if (!id) return { success: false, error: 'ID inválido.' };

    try {
      // Check if referenced by answers or questions
      const { count: answersCount } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('touchpoint_id', id);

      const { count: questionsCount } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('touchpoint_id', id);

      const totalReferences = (answersCount || 0) + (questionsCount || 0);

      if (totalReferences > 0) {
        return {
          success: false,
          isBlocked: true,
          error: `Este Ponto de Contato possui ${totalReferences} registro(s) ou pergunta(s) vinculada(s) e não pode ser excluído. Recomendamos desativá-lo.`
        };
      }

      // Delete unit associations first
      await supabase.from('unit_touchpoints').delete().eq('touchpoint_id', id);

      // Delete touchpoint
      let query = supabase.from('touchpoints').delete().eq('id', id);
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { error } = await query;
      if (error) {
        console.error('[touchpointsRepository.deleteTouchpoint error]:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('[touchpointsRepository.deleteTouchpoint error]:', err);
      return { success: false, error: err.message };
    }
  }
};
