/**
 * Settings View Component (V1.4.8 Production Data Source & Persistence Hardening)
 * Controls tabs, organization form, units, team members, theme mode, and technical mode inside Settings.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { renderOrganizationHeader } from '../../organizations/components/organizationHeader.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';
import { organizationsRepository } from '../../organizations/repositories/organizationsRepository.js';
import { unitsRepository } from '../../units/repositories/unitsRepository.js';

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
  setupNewUnitModalForm();
  setupNewUserModalForm();
  populateOrgFormValues();
  renderTechnicalModeInfo();
}

function setupOrgForm() {
  const form = document.getElementById('formConfigOrg');
  if (!form || form.dataset.listenerAttached) return;
  form.dataset.listenerAttached = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeOrg = store.getActiveOrg();
    if (!activeOrg) {
      showToast('⚠️ Nenhuma organização ativa para atualizar.', 'warning');
      return;
    }

    const nameInput = document.getElementById('cfgOrgNameInput');
    const tradeInput = document.getElementById('cfgOrgTradeNameInput');
    const emailInput = document.getElementById('cfgOrgEmailInput');
    const phoneInput = document.getElementById('cfgOrgPhoneInput');

    const prevName = activeOrg.name;
    const prevTrade = activeOrg.tradeName;
    const prevEmail = activeOrg.email;
    const prevPhone = activeOrg.phone;

    if (nameInput && nameInput.value.trim()) activeOrg.name = nameInput.value.trim();
    if (tradeInput && tradeInput.value.trim()) activeOrg.tradeName = tradeInput.value.trim();
    if (emailInput) activeOrg.email = emailInput.value.trim();
    if (phoneInput) activeOrg.phone = phoneInput.value.trim();

    if (store.isSupabaseConnected) {
      const saved = await organizationsRepository.saveOrganization(activeOrg);
      if (saved) {
        showToast('✓ Dados da organização persistidos no Supabase!', 'success');
      } else {
        // Revert local changes on failure
        activeOrg.name = prevName;
        activeOrg.tradeName = prevTrade;
        activeOrg.email = prevEmail;
        activeOrg.phone = prevPhone;
        populateOrgFormValues();
        showToast('❌ Falha ao salvar alterações no Supabase. Alterações revertidas.', 'error');
      }
    } else {
      showToast('ℹ️ Conexão com Supabase indisponível no momento.', 'info');
    }

    renderOrganizationHeader();
    updateDashboard();
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

function setupNewUnitModalForm() {
  const form = document.getElementById('formNewUnit');
  if (!form || form.dataset.listenerAttached) return;
  form.dataset.listenerAttached = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeOrg = store.getActiveOrg();
    if (!activeOrg) {
      showToast('⚠️ Nenhuma organização ativa selecionada.', 'warning');
      return;
    }

    const inputName = document.getElementById('inputUnitName')?.value.trim();
    const inputCity = document.getElementById('inputUnitCity')?.value.trim();
    const inputState = document.getElementById('inputUnitState')?.value.trim();

    if (!inputName) {
      showToast('Por favor, informe o Nome da Unidade.', 'warning');
      return;
    }

    const newUnit = {
      code: 'unidade-' + inputName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: inputName,
      location: inputCity || 'Geral',
      city: inputCity || null,
      state: inputState || null,
      status: 'Ativa'
    };

    if (store.isSupabaseConnected) {
      const saved = await unitsRepository.saveUnit(newUnit, activeOrg.id);
      if (saved) {
        newUnit.id = saved.id;
        activeOrg.units.push(newUnit);
        renderConfigUnitsTable();
        renderOrganizationHeader();
        updateDashboard();
        document.getElementById('modalNewUnit').style.display = 'none';
        form.reset();
        showToast('✓ Nova unidade cadastrada e salva no Supabase!', 'success');
      } else {
        showToast('❌ Falha ao cadastrar unidade no Supabase.', 'error');
      }
    } else {
      showToast('ℹ️ Cadastro de nova unidade exige conexão com Supabase.', 'info');
    }
  });
}

function setupNewUserModalForm() {
  const form = document.getElementById('formNewUser');
  if (!form || form.dataset.listenerAttached) return;
  form.dataset.listenerAttached = 'true';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('modalNewUser').style.display = 'none';
    form.reset();
    showToast('ℹ️ Convite de usuários disponível via integração com Supabase Auth Admin.', 'info', 5000);
  });
}

export function renderConfigUnitsTable() {
  const tbody = document.getElementById('configUnitsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeOrg = store.getActiveOrg();
  if (!activeOrg || !activeOrg.units || !activeOrg.units.length) {
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
    tr.querySelector('.btn-edit-unit')?.addEventListener('click', async () => {
      const newName = prompt('Editar nome da unidade:', u.name);
      if (newName && newName.trim() && newName.trim() !== u.name) {
        const oldName = u.name;
        u.name = newName.trim();

        if (store.isSupabaseConnected) {
          const saved = await unitsRepository.saveUnit(u, activeOrg.id);
          if (saved) {
            renderConfigUnitsTable();
            renderOrganizationHeader();
            updateDashboard();
            showToast('✓ Nome da unidade atualizado no Supabase!', 'success');
          } else {
            u.name = oldName;
            showToast('❌ Erro ao salvar nome da unidade no Supabase.', 'error');
          }
        } else {
          showToast('ℹ️ Persistência de unidade indisponível no modo offline.', 'info');
        }
      }
    });

    tr.querySelector('.btn-toggle-unit')?.addEventListener('click', async () => {
      const oldStatus = u.status;
      u.status = u.status === 'Inativa' ? 'Ativa' : 'Inativa';

      if (store.isSupabaseConnected) {
        const saved = await unitsRepository.saveUnit(u, activeOrg.id);
        if (saved) {
          renderConfigUnitsTable();
          renderOrganizationHeader();
          updateDashboard();
          showToast(`✓ Status da unidade "${u.name}" alterado para ${u.status}!`, 'success');
        } else {
          u.status = oldStatus;
          showToast('❌ Erro ao alterar status da unidade no Supabase.', 'error');
        }
      } else {
        showToast('ℹ️ Alteração de status indisponível no modo offline.', 'info');
      }
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Nenhum usuário adicional cadastrado nesta organização.</td></tr>';
    return;
  }

  users.forEach((usr) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(usr.name || 'Usuário')}</strong></td>
      <td>${escapeHtml(usr.email || '—')}</td>
      <td><span class="badge-status ${usr.role === 'admin' ? 'promoter' : 'passive'}">${usr.role === 'admin' ? 'Administrador' : 'Gestor'}</span></td>
      <td>${escapeHtml(usr.units || 'Todas as Unidades')}</td>
      <td><span class="badge-status resolved">${escapeHtml(usr.status || 'Ativo')}</span></td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-usr">${usr.status === 'Inativo' ? 'Ativar' : 'Inativar'}</button>
      </td>
    `;
    tr.querySelector('.btn-toggle-usr')?.addEventListener('click', () => {
      showToast('ℹ️ Gerenciamento de usuários exige permissões de Administrador do Supabase Auth.', 'info');
    });
    tbody.appendChild(tr);
  });
}
