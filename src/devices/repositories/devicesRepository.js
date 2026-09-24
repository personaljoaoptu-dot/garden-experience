import { supabase } from '../../core/supabase/client.js';

export const devicesRepository = {
  async fetchDevices(organizationId) {
    try {
      let query = supabase.from('tablets').select('*').order('created_at', { ascending: false });
      if (organizationId) query = query.eq('organization_id', organizationId);

      const { data, error } = await query;
      if (error) {
        console.warn('[devicesRepository.fetchDevices warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[devicesRepository.fetchDevices error]:', err);
      return null;
    }
  },

  async saveDevice(device) {
    if (!device) return null;
    try {
      const { data, error } = await supabase.from('tablets').upsert({
        name: device.name,
        device_token: device.deviceToken,
        status: device.isActive ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }).select().single();

      if (error) console.warn('[devicesRepository.saveDevice warning]:', error.message);
      return data;
    } catch (err) {
      console.warn('[devicesRepository.saveDevice error]:', err);
      return null;
    }
  }
};
