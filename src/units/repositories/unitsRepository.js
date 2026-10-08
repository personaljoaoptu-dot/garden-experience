import { supabase } from '../../core/supabase/client.js';

export const unitsRepository = {
  async fetchUnits(organizationId) {
    try {
      let query = supabase.from('units').select('*').order('name');
      if (organizationId) query = query.eq('organization_id', organizationId);

      const { data, error } = await query;
      if (error) {
        console.warn('[unitsRepository.fetchUnits warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[unitsRepository.fetchUnits error]:', err);
      return null;
    }
  },

  /**
   * Create a new unit record in Supabase using INSERT
   */
  async createUnit(unit, organizationId) {
    if (!unit || !unit.name) {
      return { data: null, error: { message: 'Nome da unidade é obrigatório.' } };
    }
    if (!organizationId) {
      return { data: null, error: { message: 'ID da organização é obrigatório para cadastrar unidade.' } };
    }

    try {
      const slug = unit.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Guarantee unique code to satisfy units_code_key constraint
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const safeCode = unit.code || `unit-${slug}-${uniqueSuffix}`;
      const addressVal = [unit.city, unit.state, unit.address, unit.location].filter(Boolean).join(' - ') || 'Geral';

      const payload = {
        organization_id: organizationId,
        name: unit.name.trim(),
        code: safeCode,
        address: addressVal,
        is_active: unit.is_active !== undefined ? Boolean(unit.is_active) : (unit.status !== 'Inativa')
      };

      console.info('[unitsRepository.createUnit] Executing INSERT:', payload);

      const { data, error } = await supabase
        .from('units')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[unitsRepository.createUnit error]:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[unitsRepository.createUnit unexpected]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing unit record in Supabase using UPDATE
   */
  async updateUnit(unit, organizationId) {
    if (!unit || !unit.id) {
      return { data: null, error: { message: 'ID da unidade é obrigatório para atualização.' } };
    }
    if (!organizationId) {
      return { data: null, error: { message: 'ID da organização é obrigatório para atualização.' } };
    }

    try {
      const addressVal = [unit.city, unit.state, unit.address, unit.location].filter(Boolean).join(' - ') || 'Geral';
      const payload = {
        name: unit.name.trim(),
        address: addressVal,
        is_active: unit.is_active !== undefined ? Boolean(unit.is_active) : (unit.status !== 'Inativa')
      };
      if (unit.code) payload.code = unit.code;

      console.info(`[unitsRepository.updateUnit] Executing UPDATE for unit ${unit.id}:`, payload);

      const { data, error } = await supabase
        .from('units')
        .update(payload)
        .eq('id', unit.id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[unitsRepository.updateUnit error]:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[unitsRepository.updateUnit unexpected]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Inspect foreign key dependencies before unit deletion to preserve historical data
   */
  async checkUnitDependencies(unitId) {
    if (!unitId) return { hasDependencies: false, details: [] };
    try {
      const [resCount, caseCount, stCount, tabCount] = await Promise.all([
        supabase.from('responses').select('id', { count: 'exact', head: true }).eq('unit_id', unitId),
        supabase.from('follow_up_cases').select('id', { count: 'exact', head: true }).eq('unit_id', unitId),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('unit_id', unitId),
        supabase.from('tablets').select('id', { count: 'exact', head: true }).eq('unit_id', unitId)
      ]);

      const details = [];
      if (resCount.count > 0) details.push(`${resCount.count} resposta(s) NPS`);
      if (caseCount.count > 0) details.push(`${caseCount.count} caso(s) de acompanhamento`);
      if (stCount.count > 0) details.push(`${stCount.count} aluno(s) cadastrado(s)`);
      if (tabCount.count > 0) details.push(`${tabCount.count} dispositivo(s) totem`);

      return {
        hasDependencies: details.length > 0,
        details
      };
    } catch (err) {
      console.warn('[unitsRepository.checkUnitDependencies error]:', err);
      return { hasDependencies: false, details: [] };
    }
  },

  /**
   * Safely delete a unit record if no historical data depends on it
   */
  async deleteUnit(unitId, organizationId) {
    if (!unitId || !organizationId) {
      return { success: false, error: { message: 'ID da unidade e da organização são obrigatórios.' } };
    }

    try {
      const dep = await this.checkUnitDependencies(unitId);
      if (dep.hasDependencies) {
        return {
          success: false,
          blockedByHistory: true,
          details: dep.details,
          error: {
            message: `Esta unidade possui dados históricos vinculados (${dep.details.join(', ')}) e não pode ser excluída. Recomendamos alterá-la para Inativa.`
          }
        };
      }

      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[unitsRepository.deleteUnit error]:', error);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('[unitsRepository.deleteUnit unexpected]:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Backward-compatible saveUnit method delegating to createUnit or updateUnit
   */
  async saveUnit(unit, organizationId) {
    if (!unit) return null;
    const isExisting = unit.id && !unit.id.startsWith('u_') && !unit.id.startsWith('unidade-');

    if (isExisting) {
      const res = await this.updateUnit(unit, organizationId);
      return res.data;
    } else {
      const res = await this.createUnit(unit, organizationId);
      return res.data;
    }
  }
};
