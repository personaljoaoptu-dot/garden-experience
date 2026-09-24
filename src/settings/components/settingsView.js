/**
 * Settings View Component
 * Controls tabs, unit & user configuration tables inside Settings.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { renderOrganizationHeader } from '../../organizations/components/organizationHeader.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

export function setupConfigTabs() {
  const tabs = document.querySelectorAll('.cfg-tab');
  const panes = document.querySelectorAll('.cfg-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const paneId = tab.getAttribute('data-cfg-pane');
      const target = document.getElementById(paneId);
      if (target) target.classList.add('active');
    });
  });

  setupNewUnitAndUserButtons();
}

function setupNewUnitAndUserButtons() {
  const btnConfigNewUnit = document.getElementById('btnConfigNewUnit');
  if (btnConfigNewUnit) {
    btnConfigNewUnit.onclick = () => {
      const modalUnit = document.getElementById('modalNewUnit');
      if (modalUnit) modalUnit.style.display = 'flex';
    };
  }

  const btnConfigNewUser = document.getElementById('btnConfigNewUser');
  if (btnConfigNewUser) {
    btnConfigNewUser.onclick = () => {
      const modalUser = document.getElementById('modalNewUser');
      if (modalUser) modalUser.style.display = 'flex';
    };
  }
}

export function renderConfigUnitsTable() {
  const tbody = document.getElementById('configUnitsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeOrg = store.getActiveOrg();
  if (!activeOrg.units || !activeOrg.units.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1rem;">Nenhuma unidade cadastrada nesta organização.</td></tr>';
    return;
  }

  activeOrg.units.forEach(u => {
    const isInactive = u.status === 'Inativa';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td>${escapeHtml(u.city || u.location || '—')}</td>
      <td><code>${escapeHtml(u.state || u.code || '—')}</code></td>
      <td><span class="badge-status ${isInactive ? 'detractor' : 'resolved'}">${isInactive ? '🔴 Inativa' : '🟢 Ativa'}</span></td>
      <td>
        <div class="btn-group-row">
          <button class="btn-outline-gold btn-sm btn-edit-unit">Editar</button>
          <button class="btn-outline-gold btn-sm btn-toggle-unit">${isInactive ? 'Ativar' : 'Desativar'}</button>
        </div>
      </td>
    `;
    tr.querySelector('.btn-edit-unit')?.addEventListener('click', () => {
      const newName = prompt('Editar nome da unidade:', u.name);
      if (newName && newName.trim()) {
        u.name = newName.trim();
        renderConfigUnitsTable();
        renderOrganizationHeader();
        updateDashboard();
        showToast('✓ Unidade atualizada com sucesso!', 'success');
      }
    });
    tr.querySelector('.btn-toggle-unit')?.addEventListener('click', () => {
      u.status = u.status === 'Inativa' ? 'Ativa' : 'Inativa';
      renderConfigUnitsTable();
      renderOrganizationHeader();
      updateDashboard();
      showToast(`✓ Unidade "${u.name}" agora está ${u.status}!`, 'info');
    });
    tbody.appendChild(tr);
  });
}

export function renderConfigUsersTable() {
  const tbody = document.getElementById('configUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = store.users;
  if (!users || !users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1rem;">Nenhum usuário adicional cadastrado nesta organização.</td></tr>';
    return;
  }

  users.forEach((usr) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(usr.name)}</strong></td>
      <td>${escapeHtml(usr.email)}</td>
      <td><span class="badge-status ${usr.role === 'admin' ? 'promoter' : 'passive'}">${usr.role === 'admin' ? 'Administrador' : 'Gestor'}</span></td>
      <td>${escapeHtml(usr.units || 'Todas as Unidades')}</td>
      <td><span class="badge-status resolved">${escapeHtml(usr.status || 'Ativo')}</span></td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-usr">${usr.status === 'Inativo' ? 'Ativar' : 'Inativar'}</button>
      </td>
    `;
    tr.querySelector('.btn-toggle-usr')?.addEventListener('click', () => {
      usr.status = usr.status === 'Inativo' ? 'Ativo' : 'Inativo';
      renderConfigUsersTable();
      showToast(`✓ Status de ${usr.name} alterado!`, 'info');
    });
    tbody.appendChild(tr);
  });
}
