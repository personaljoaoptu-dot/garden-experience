/**
 * Devices Management Table Component
 * Connects directly to Supabase devicesRepository for real persistent CRUD operations.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { showToast } from '../../shared/feedback/toast.js';
import { devicesRepository } from '../repositories/devicesRepository.js';
import { openDeviceModal } from '../../settings/components/settingsView.js';

export async function renderDevicesTable() {
  const tbody = document.getElementById('devicesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) return;

  let devices = activeOrg.devices || [];

  if (store.isSupabaseConnected && activeOrg.id) {
    const dbDevices = await devicesRepository.fetchDevices(activeOrg.id);
    if (dbDevices) {
      devices = dbDevices;
      activeOrg.devices = dbDevices;
    }
  }

  if (!devices || devices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Nenhum dispositivo totem cadastrado nesta organização.</td></tr>';
    return;
  }

  devices.forEach(d => {
    const rawTok = String(d.device_token || d.deviceToken || '—');
    const maskedToken = rawTok.length > 8 ? `${rawTok.slice(0, 4)}••••••••${rawTok.slice(-4)}` : (rawTok !== '—' ? '••••••••' : '—');
    const isActive = d.is_active !== false && d.isActive !== false;
    const lastPingStr = d.lastPingDisplay || (d.last_ping ? new Date(d.last_ping).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Nunca');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.device_name || d.name || 'Totem Receptor')}</strong></td>
      <td>${escapeHtml(d.unit_name || d.unitCode || 'Recepção')}</td>
      <td>
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <code>${escapeHtml(maskedToken)}</code>
          ${rawTok !== '—' ? '<button class="btn-outline-gold btn-sm btn-copy-tok" style="padding:2px 6px; font-size:0.7rem;" title="Copiar Token">📋</button>' : ''}
        </div>
      </td>
      <td><span class="badge-status ${isActive ? 'resolved' : 'detractor'}">${isActive ? '🟢 Ativo' : '🔴 Inativo'}</span></td>
      <td>${escapeHtml(lastPingStr)}</td>
      <td>
        <div class="btn-group-row" style="display:flex; gap:0.4rem;">
          <button class="btn-outline-gold btn-sm btn-edit-dev">Editar</button>
          <button class="btn-outline-gold btn-sm btn-toggle-dev">${isActive ? 'Desativar' : 'Ativar'}</button>
          <button class="btn-outline-gold btn-sm btn-delete-dev" style="color:#ef4444; border-color:rgba(239,68,68,0.3);">Excluir</button>
        </div>
      </td>
    `;

    // Copy Token Action
    tr.querySelector('.btn-copy-tok')?.addEventListener('click', () => {
      navigator.clipboard.writeText(rawTok);
      showToast('✓ Token do dispositivo copiado para a área de transferência!', 'success');
    });

    // Edit Device Action
    tr.querySelector('.btn-edit-dev')?.addEventListener('click', () => {
      openDeviceModal(d);
    });

    // Toggle Status Action
    tr.querySelector('.btn-toggle-dev')?.addEventListener('click', async () => {
      const oldState = isActive;
      const newState = !oldState;

      d.is_active = newState;
      d.isActive = newState;

      if (store.isSupabaseConnected) {
        const res = await devicesRepository.updateDevice({ id: d.id, isActive: newState });
        if (res.data) {
          renderDevicesTable();
          showToast(`✓ Status do totem "${d.device_name || d.name}" alterado para ${newState ? 'Ativo' : 'Inativo'}!`, 'success');
        } else {
          d.is_active = oldState;
          d.isActive = oldState;
          const msg = res.error?.message || 'Erro ao atualizar dispositivo no Supabase.';
          showToast(`❌ ${msg}`, 'error');
        }
      } else {
        renderDevicesTable();
        showToast('ℹ️ Status do dispositivo alterado localmente.', 'info');
      }
    });

    // Delete Device Action
    tr.querySelector('.btn-delete-dev')?.addEventListener('click', async () => {
      const confirmed = confirm(`ATENÇÃO: Deseja realmente excluir permanentemente o dispositivo "${d.device_name || d.name}"?\nEsta ação não poderá ser desfeita.`);
      if (!confirmed) return;

      if (store.isSupabaseConnected) {
        const res = await devicesRepository.deleteDevice(d.id, activeOrg.id);
        if (res.success) {
          activeOrg.devices = activeOrg.devices.filter(item => item.id !== d.id);
          renderDevicesTable();
          showToast(`✓ Dispositivo "${d.device_name || d.name}" excluído com sucesso!`, 'success');
        } else {
          if (res.blockedByHistory) {
            showToast(`⚠️ Este dispositivo possui respostas vinculadas e não pode ser excluído. Desative-o para interromper o uso.`, 'warning', 6000);
          } else {
            const msg = res.error?.message || 'Falha ao excluir dispositivo no Supabase.';
            showToast(`❌ ${msg}`, 'error');
          }
        }
      } else {
        activeOrg.devices = activeOrg.devices.filter(item => item.id !== d.id);
        renderDevicesTable();
        showToast(`ℹ️ Dispositivo removido localmente.`, 'info');
      }
    });

    tbody.appendChild(tr);
  });
}
