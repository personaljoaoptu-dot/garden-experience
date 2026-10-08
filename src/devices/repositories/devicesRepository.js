import { supabase } from '../../core/supabase/client.js';

export const devicesRepository = {
  /**
   * Fetch all devices (tablets) for a given organization ID joined with unit info
   */
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
        is_active: t.is_active !== false,
        isActive: t.is_active !== false,
        last_ping: t.last_ping,
        lastPingDisplay: t.last_ping ? new Date(t.last_ping).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Nunca',
        unit_code: t.units?.code || '',
        unit_name: t.units?.name || '',
        organization_id: t.units?.organization_id
      }));
    } catch (err) {
      console.warn('[devicesRepository.fetchDevices error]:', err);
      return null;
    }
  },

  /**
   * Create a new device record in Supabase using INSERT
   */
  async createDevice({ unitId, name, isActive }) {
    if (!unitId || !name) {
      return { data: null, error: { message: 'Unidade e Nome do dispositivo são obrigatórios.' } };
    }

    try {
      const payload = {
        unit_id: unitId,
        device_name: name.trim(),
        is_active: isActive !== undefined ? Boolean(isActive) : true
      };

      console.info('[devicesRepository.createDevice] Executing INSERT:', payload);

      const { data, error } = await supabase
        .from('tablets')
        .insert(payload)
        .select('id, unit_id, device_name, device_token, is_active, last_ping, created_at, units(id, name, code, organization_id)')
        .single();

      if (error) {
        console.error('[devicesRepository.createDevice error]:', error.message);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[devicesRepository.createDevice unexpected]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing device record (name, unit_id, is_active). Does NOT change token.
   */
  async updateDevice({ id, unitId, name, isActive }) {
    if (!id) {
      return { data: null, error: { message: 'ID do dispositivo é obrigatório para atualização.' } };
    }

    try {
      const payload = {};
      if (name) payload.device_name = name.trim();
      if (unitId) payload.unit_id = unitId;
      if (isActive !== undefined) payload.is_active = Boolean(isActive);

      console.info(`[devicesRepository.updateDevice] Executing UPDATE for device ${id}:`, payload);

      const { data, error } = await supabase
        .from('tablets')
        .update(payload)
        .eq('id', id)
        .select('id, unit_id, device_name, device_token, is_active, last_ping, created_at, units(id, name, code, organization_id)')
        .single();

      if (error) {
        console.error('[devicesRepository.updateDevice error]:', error.message);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[devicesRepository.updateDevice unexpected]:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Inspect foreign key / response dependencies before device deletion
   */
  async checkDeviceDependencies(deviceId) {
    if (!deviceId) return { hasDependencies: false, details: [] };
    try {
      // Query responses table if metadata contains deviceId
      const { count, error } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .or(`metadata->>tablet_id.eq.${deviceId},metadata->>device_id.eq.${deviceId}`);

      if (error) {
        console.warn('[devicesRepository.checkDeviceDependencies warning]:', error.message);
        return { hasDependencies: false, details: [] };
      }

      return {
        hasDependencies: count > 0,
        details: count > 0 ? [`${count} resposta(s) NPS vinculada(s)`] : []
      };
    } catch (err) {
      console.warn('[devicesRepository.checkDeviceDependencies error]:', err);
      return { hasDependencies: false, details: [] };
    }
  },

  /**
   * Safely delete a device record if no responses depend on it
   */
  async deleteDevice(deviceId, organizationId) {
    if (!deviceId) {
      return { success: false, error: { message: 'ID do dispositivo é obrigatório.' } };
    }

    try {
      // 1. Try calling delete_tablet RPC if available
      if (organizationId) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('delete_tablet', {
          p_tablet_id: deviceId,
          p_org_id: organizationId
        });

        if (!rpcErr && rpcData) {
          if (rpcData.success === false) {
            return {
              success: false,
              blockedByHistory: Boolean(rpcData.blockedByHistory),
              error: { message: rpcData.error || 'Falha ao excluir dispositivo.' }
            };
          }
          return { success: true, error: null };
        }
      }

      // 2. Direct fallback delete with JS dependency check
      const dep = await this.checkDeviceDependencies(deviceId);
      if (dep.hasDependencies) {
        return {
          success: false,
          blockedByHistory: true,
          details: dep.details,
          error: {
            message: `Este dispositivo possui histórico vinculado (${dep.details.join(', ')}) e não pode ser excluído. Recomendamos alterá-lo para Inativo.`
          }
        };
      }

      const { error } = await supabase
        .from('tablets')
        .delete()
        .eq('id', deviceId);

      if (error) {
        console.error('[devicesRepository.deleteDevice error]:', error.message);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('[devicesRepository.deleteDevice unexpected]:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Backward-compatible saveDevice method delegating to createDevice or updateDevice
   */
  async saveDevice(device, organizationId) {
    if (!device) return null;
    const isExisting = device.id && typeof device.id === 'string' && !device.id.startsWith('dev_');

    if (isExisting) {
      const res = await this.updateDevice({
        id: device.id,
        unitId: device.unit_id || device.unitId,
        name: device.device_name || device.name,
        isActive: device.is_active !== undefined ? device.is_active : device.isActive
      });
      return res.data;
    } else {
      const res = await this.createDevice({
        unitId: device.unit_id || device.unitId,
        name: device.device_name || device.name,
        isActive: device.is_active !== undefined ? device.is_active : device.isActive
      });
      return res.data;
    }
  }
};
