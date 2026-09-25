/**
 * Devices Management Table Component
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function renderDevicesTable() {
  const tbody = document.getElementById('devicesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  store.devices.forEach(d => {
    const u = store.UNITS.find(item => item.code === d.unitCode);
    const unitName = u ? u.name : d.unitCode;
    const rawTok = String(d.deviceToken || 'dev_totem_01');
    const maskedToken = rawTok.length > 8 ? `${rawTok.slice(0, 4)}****${rawTok.slice(-4)}` : 'dev_****';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.name)}</strong></td>
      <td>${escapeHtml(unitName)}</td>
      <td><code>${escapeHtml(maskedToken)}</code></td>
      <td><span class="badge-status ${d.isActive ? 'resolved' : 'pending'}">${d.isActive ? '● Online' : '● Offline'}</span></td>
      <td>${escapeHtml(d.lastPing || 'Agora')}</td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-dev">${d.isActive ? 'Desativar' : 'Ativar'}</button>
      </td>
    `;
    tr.querySelector('.btn-toggle-dev')?.addEventListener('click', () => {
      d.isActive = !d.isActive;
      renderDevicesTable();
    });
    tbody.appendChild(tr);
  });
}
