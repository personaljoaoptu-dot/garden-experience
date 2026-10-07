import { supabase } from '../../core/supabase/client.js';

export const devicesRepository = {
  async fetchDevices(organizationId) {
    try {
      let query = supabase
        .from('tablets')
        .select('id, unit_id, device_name, device_token, is_active, last_ping, created_at, units!inner(id, name, code, organization_id)')
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('units.organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[devicesRepository.fetchDevices warning]:', error.message);
        return null;
      }
      return (data || []).map(t => ({
        id: t.id,
        unit_id: t.unit_id,
        device_name: t.device_name,
        name: t.device_name,
        device_token: t.device_token,
        deviceToken: t.device_token,
        is_active: t.is_active,
        isActive: t.is_active,
        last_ping: t.last_ping,
        unit_code: t.units?.code || '',
        unit_name: t.units?.name || '',
        organization_id: t.units?.organization_id
      }));
    } catch (err) {
      console.warn('[devicesRepository.fetchDevices error]:', err);
      return null;
    }
  },

  async saveDevice(device) {
    if (!device) return null;
    try {
      const payload = {
        unit_id: device.unit_id || device.unitId,
        device_name: device.device_name || device.name || 'Totem Recepção',
        device_token: device.device_token || device.deviceToken || ('tok_' + Math.random().toString(36).substring(2, 10)),
        is_active: device.is_active !== undefined ? Boolean(device.is_active) : (device.isActive !== undefined ? Boolean(device.isActive) : true)
      };

      if (device.id && typeof device.id === 'string' && !device.id.startsWith('dev_')) {
        payload.id = device.id;
      }

      const { data, error } = await supabase.from('tablets').upsert(payload).select().single();

      if (error) console.warn('[devicesRepository.saveDevice warning]:', error.message);
      return data;
    } catch (err) {
      console.warn('[devicesRepository.saveDevice error]:', err);
      return null;
    }
  }
};
