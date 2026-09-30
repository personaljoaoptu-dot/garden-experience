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

  async saveUnit(unit, organizationId) {
    if (!unit) return null;
    try {
      const addressVal = [unit.address, unit.city, unit.state, unit.location].filter(Boolean).join(' - ') || 'Geral';
      const payload = {
        name: unit.name,
        code: unit.code || ('unit-' + unit.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
        address: addressVal,
        is_active: unit.status !== 'Inativa' && unit.is_active !== false
      };
      if (organizationId) payload.organization_id = organizationId;
      if (unit.id && !unit.id.startsWith('u_') && !unit.id.startsWith('unidade-')) payload.id = unit.id;

      const { data, error } = await supabase.from('units').upsert(payload).select().single();
      if (error) {
        console.warn('[unitsRepository.saveUnit warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[unitsRepository.saveUnit error]:', err);
      return null;
    }
  }
};
