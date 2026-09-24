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
      const payload = {
        name: unit.name,
        code: unit.code,
        location: unit.location || 'Geral',
        address: unit.address || null,
        city: unit.city || null,
        state: unit.state || null,
        status: unit.status || 'Ativa',
        updated_at: new Date().toISOString()
      };
      if (organizationId) payload.organization_id = organizationId;
      if (unit.id && !unit.id.startsWith('u_')) payload.id = unit.id;

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
