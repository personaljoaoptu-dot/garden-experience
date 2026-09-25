/**
 * Settings View Component (V1.4.6 SaaS Polish)
 * Controls tabs, organization form, units, team members, theme mode, and technical mode inside Settings.
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

  setupOrgForm();
  setupThemeControls();
  setupNewUnitAndUserButtons();
  populateOrgFormValues();
  renderTechnicalModeInfo();
}

function setupOrgForm() {
  const form = document.getElementById('formConfigOrg');
  if (!form || form.dataset.listenerAttached) return;
  form.dataset.listenerAttached = 'true';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const activeOrg = store.getActiveOrg();
    const nameInput = document.getElementById('cfgOrgNameInput');
    const tradeInput = document.getElementById('cfgOrgTradeNameInput');
    const emailInput = document.getElementById('cfgOrgEmailInput');
    const phoneInput = document.getElementById('cfgOrgPhoneInput');

    if (nameInput && nameInput.value.trim()) {
      activeOrg.name = nameInput.value.trim();
    }
    if (tradeInput && tradeInput.value.trim()) {
      activeOrg.tradeName = tradeInput.value.trim();
    }
    if (emailInput) activeOrg.email = emailInput.value.trim();
    if (phoneInput) activeOrg.phone = phoneInput.value.trim();

    renderOrganizationHeader();
    updateDashboard();
    showToast('✓ Dados da organização atualizados com sucesso!', 'success');
  });
}

function populateOrgFormValues() {
  const activeOrg = store.getActiveOrg();
  if (!activeOrg) return;

  const nameInput = document.getElementById('cfgOrgNameInput');
  const tradeInput = document.getElementById('cfgOrgTradeNameInput');
  const emailInput = document.getElementById('cfgOrgEmailInput');
  const phoneInput = document.getElementById('cfgOrgPhoneInput');

  if (nameInput) nameInput.value = activeOrg.name || '';
  if (tradeInput) tradeInput.value = activeOrg.tradeName || activeOrg.name || '';
  if (emailInput) emailInput.value = activeOrg.email || '';
  if (phoneInput) phoneInput.value = activeOrg.phone || '';
}

function setupThemeControls() {
  const radios = document.querySelectorAll('input[name="radioThemeMode"]');
  const currentTheme = localStorage.getItem('app-theme-mode') || 'dark';

  radios.forEach(r => {
    if (r.value === currentTheme) r.checked = true;
    r.addEventListener('change', () => {
      localStorage.setItem('app-theme-mode', r.value);
      if (r.value === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else if (r.value === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      showToast(`✓ Modo visual alterado para: ${r.value}`, 'info');
    });
  });
}

function renderTechnicalModeInfo() {
  const techBadge = document.getElementById('techSupabaseStatusBadge');
  if (techBadge) {
    if (store.isSupabaseConnected) {
      techBadge.textContent = '🟢 Conectado';
      techBadge.className = 'badge-status resolved';
    } else {
      techBadge.textContent = '🟡 Modo Offline';
      techBadge.className = 'badge-status passive';
    }
  }
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
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Nenhuma unidade cadastrada nesta organização.</td></tr>';
    return;
  }

  activeOrg.units.forEach(u => {
    const isInactive = u.status === 'Inativa';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td>${escapeHtml(u.location || u.city || 'Geral')}</td>
      <td><code>${escapeHtml(u.code || u.id || '—')}</code></td>
      <td><span class="badge-status ${isInactive ? 'detractor' : 'resolved'}">${isInactive ? '🔴 Inativa' : '🟢 Ativa'}</span></td>
      <td>
        <div class="btn-group-row" style="display:flex; gap:0.4rem;">
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

  const users = store.users && store.users.length > 0 ? store.users : [
    { name: 'Administrador Principal', email: store.currentUser?.email || 'admin@gardengold.com.br', role: 'admin', units: 'Todas as Unidades', status: 'Ativo' }
  ];

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
