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
