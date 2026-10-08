/**
 * Settings View Component (V1.5.0 Production Data Source & Persistence Hardening)
 * Controls tabs, organization form, units, team members, surveys, devices, and security inside Settings.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { renderOrganizationHeader } from '../../organizations/components/organizationHeader.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';
import { organizationsRepository } from '../../organizations/repositories/organizationsRepository.js';
import { unitsRepository } from '../../units/repositories/unitsRepository.js';
import { surveysRepository } from '../../surveys/repositories/surveysRepository.js';
import { devicesRepository } from '../../devices/repositories/devicesRepository.js';
import { renderTeamTable, setupTeamManagement } from './teamManagementView.js';

export function setupConfigTabs() {
  const container = document.querySelector('#mod-config .nav-tabs');

  if (container && !container.dataset.tabsInitialized) {
    container.dataset.tabsInitialized = 'true';

    const tabs = document.querySelectorAll('.cfg-tab');
    const panes = document.querySelectorAll('.cfg-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const paneId = tab.getAttribute('data-cfg-pane');
        if (!paneId) return;

        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => {
          p.classList.remove('active');
          p.style.display = 'none';
        });

        tab.classList.add('active');
        const target = document.getElementById(paneId);
        if (target) {
          target.classList.add('active');
          target.style.display = 'block';
        }
      });
    });
  }

  setupOrgForm();
  setupThemeControls();
  setupNewUnitAndUserButtons();
  setupNewUnitModalForm();
  setupTeamManagement();
  populateOrgFormValues();
  renderTechnicalModeInfo();
  renderConfigUnitsTable();
  renderConfigUsersTable();
  setupSurveyControls();
  renderConfigDevicesTable();
  renderSecurityTabInfo();
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
    const btnSubmit = form.querySelector('button[type="submit"]');

    const prevName = activeOrg.name;
    const prevTrade = activeOrg.tradeName;
    const prevEmail = activeOrg.email;
    const prevPhone = activeOrg.phone;

    if (nameInput && nameInput.value.trim()) activeOrg.name = nameInput.value.trim();
    if (tradeInput && tradeInput.value.trim()) activeOrg.tradeName = tradeInput.value.trim();
    if (emailInput) activeOrg.email = emailInput.value.trim();
    if (phoneInput) activeOrg.phone = phoneInput.value.trim();

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Salvando...';
    }

    try {
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
    } catch (err) {
      console.error('[setupOrgForm error]:', err);
      showToast('❌ Erro inesperado ao atualizar organização.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '💾 Salvar Alterações';
      }
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
    if (!activeOrg || !activeOrg.id) {
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

    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Salvando...';
    }

    const locationText = [inputCity, inputState].filter(Boolean).join(' - ') || 'Geral';
    const newUnitInput = {
      name: inputName,
      city: inputCity || null,
      state: inputState || null,
      location: locationText,
      address: locationText,
      is_active: true
    };

    try {
      if (store.isSupabaseConnected) {
        const { data: savedUnit, error } = await unitsRepository.createUnit(newUnitInput, activeOrg.id);

        if (error || !savedUnit) {
          const errMsg = error?.message || 'Falha ao cadastrar unidade no Supabase.';
          console.error('[setupNewUnitModalForm] Error creating unit:', error);
          showToast(`❌ ${errMsg}`, 'error', 5000);
          return; // Keep modal open on error
        }

        const unitForStore = {
          id: savedUnit.id,
          code: savedUnit.code,
          name: savedUnit.name,
          location: savedUnit.address || locationText,
          address: savedUnit.address || locationText,
          city: inputCity || null,
          state: inputState || null,
          status: savedUnit.is_active !== false ? 'Ativa' : 'Inativa',
          is_active: savedUnit.is_active !== false
        };

        if (!activeOrg.units) activeOrg.units = [];
        activeOrg.units.push(unitForStore);

        renderConfigUnitsTable();
        renderOrganizationHeader();
        updateDashboard();

        document.getElementById('modalNewUnit').style.display = 'none';
        form.reset();
        showToast(`✓ Unidade "${savedUnit.name}" cadastrada e salva no Supabase!`, 'success');
      } else {
        showToast('ℹ️ Cadastro de nova unidade exige conexão com Supabase.', 'info');
      }
    } catch (err) {
      console.error('[setupNewUnitModalForm unexpected error]:', err);
      showToast(`❌ Erro inesperado ao salvar unidade: ${err.message || err}`, 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Salvar Unidade';
      }
    }
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
    const isInactive = u.status === 'Inativa' || u.is_active === false;
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
          <button class="btn-outline-gold btn-sm btn-delete-unit" style="color:#ef4444; border-color:rgba(239,68,68,0.3);">Excluir</button>
        </div>
      </td>
    `;
    tr.querySelector('.btn-edit-unit')?.addEventListener('click', async () => {
      const newName = prompt('Editar nome da unidade:', u.name);
      if (newName && newName.trim() && newName.trim() !== u.name) {
        const oldName = u.name;
        u.name = newName.trim();

        if (store.isSupabaseConnected) {
          const { data: updatedUnit, error } = await unitsRepository.updateUnit(u, activeOrg.id);
          if (updatedUnit) {
            u.name = updatedUnit.name;
            renderConfigUnitsTable();
            renderOrganizationHeader();
            updateDashboard();
            showToast('✓ Nome da unidade atualizado no Supabase!', 'success');
          } else {
            u.name = oldName;
            const msg = error?.message || 'Erro ao salvar nome da unidade no Supabase.';
            showToast(`❌ ${msg}`, 'error');
          }
        } else {
          showToast('ℹ️ Persistência de unidade indisponível no modo offline.', 'info');
        }
      }
    });

    tr.querySelector('.btn-toggle-unit')?.addEventListener('click', async () => {
      const wasActive = u.is_active !== false && u.status !== 'Inativa';
      const newIsActive = !wasActive;

      u.is_active = newIsActive;
      u.status = newIsActive ? 'Ativa' : 'Inativa';

      if (store.isSupabaseConnected) {
        const { data: updatedUnit, error } = await unitsRepository.updateUnit(u, activeOrg.id);
        if (updatedUnit) {
          u.is_active = updatedUnit.is_active;
          u.status = updatedUnit.is_active ? 'Ativa' : 'Inativa';
          renderConfigUnitsTable();
          renderOrganizationHeader();
          updateDashboard();
          showToast(`✓ Status da unidade "${u.name}" alterado para ${u.status}!`, 'success');
        } else {
          u.is_active = wasActive;
          u.status = wasActive ? 'Ativa' : 'Inativa';
          const msg = error?.message || 'Erro ao alterar status da unidade no Supabase.';
          showToast(`❌ ${msg}`, 'error');
        }
      } else {
        renderConfigUnitsTable();
        showToast('ℹ️ Alteração de status indisponível no modo offline.', 'info');
      }
    });

    tr.querySelector('.btn-delete-unit')?.addEventListener('click', async () => {
      const confirmed = confirm(`ATENÇÃO: Deseja realmente excluir permanentemente a unidade "${u.name}"?\nEsta ação não poderá ser desfeita.`);
      if (!confirmed) return;

      if (store.isSupabaseConnected) {
        const res = await unitsRepository.deleteUnit(u.id, activeOrg.id);
        if (res.success) {
          activeOrg.units = activeOrg.units.filter(item => item.id !== u.id);
          renderConfigUnitsTable();
          renderOrganizationHeader();
          updateDashboard();
          showToast(`✓ Unidade "${u.name}" excluída com sucesso!`, 'success');
        } else {
          if (res.blockedByHistory) {
            showToast(`⚠️ Esta unidade possui histórico vinculado (${res.details.join(', ')}) e não pode ser excluída. Desative-a para ocultá-la.`, 'warning', 6000);
          } else {
            const msg = res.error?.message || 'Falha ao excluir unidade no Supabase.';
            showToast(`❌ ${msg}`, 'error');
          }
        }
      } else {
        activeOrg.units = activeOrg.units.filter(item => item.id !== u.id);
        renderConfigUnitsTable();
        showToast(`ℹ️ Unidade removida localmente.`, 'info');
      }
    });

    tbody.appendChild(tr);
  });
}

export function renderConfigUsersTable() {
  renderTeamTable();
}

async function setupSurveyControls() {
  const activeToggle = document.getElementById('cfgSurveyActiveToggle');
  const anonToggle = document.getElementById('cfgSurveyAnonToggle');
  if (!activeToggle || !anonToggle) return;

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) return;

  let survey = (activeOrg.surveys && activeOrg.surveys[0]) || null;

  if (store.isSupabaseConnected && activeOrg.id) {
    const dbSurveys = await surveysRepository.fetchSurveys(activeOrg.id);
    if (dbSurveys && dbSurveys.length > 0) {
      survey = dbSurveys[0];
      activeOrg.surveys = dbSurveys;
    }
  }

  if (survey) {
    activeToggle.checked = survey.is_active !== false;
    anonToggle.checked = survey.is_anonymous_allowed !== false;
  } else {
    activeToggle.checked = true;
    anonToggle.checked = true;
  }

  if (!activeToggle.dataset.listenerAttached) {
    activeToggle.dataset.listenerAttached = 'true';
    activeToggle.addEventListener('change', async () => {
      const isChecked = activeToggle.checked;
      if (survey && survey.id && store.isSupabaseConnected) {
        survey.is_active = isChecked;
        const saved = await surveysRepository.saveSurvey(survey);
        if (saved) {
          showToast(`✓ Pesquisa NPS ${isChecked ? 'ativada' : 'desativada'} no Supabase!`, 'success');
        } else {
          activeToggle.checked = !isChecked;
          showToast('❌ Erro ao atualizar status da pesquisa no Supabase.', 'error');
        }
      } else {
        showToast(`ℹ️ Status da pesquisa ajustado localmente para: ${isChecked ? 'Ativa' : 'Inativa'}`, 'info');
      }
    });
  }

  if (!anonToggle.dataset.listenerAttached) {
    anonToggle.dataset.listenerAttached = 'true';
    anonToggle.addEventListener('change', async () => {
      const isChecked = anonToggle.checked;
      if (survey && survey.id && store.isSupabaseConnected) {
        survey.is_anonymous_allowed = isChecked;
        const saved = await surveysRepository.saveSurvey(survey);
        if (saved) {
          showToast(`✓ Modo de resposta anônima ${isChecked ? 'habilitado' : 'desabilitado'} no Supabase!`, 'success');
        } else {
          anonToggle.checked = !isChecked;
          showToast('❌ Erro ao atualizar opção de anonimato no Supabase.', 'error');
        }
      } else {
        showToast(`ℹ️ Opção de anonimato ajustada localmente para: ${isChecked ? 'Permitido' : 'Obrigatório identificar'}`, 'info');
      }
    });
  }
}

export async function renderConfigDevicesTable() {
  const tbody = document.getElementById('configDevicesTableBody');
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
    const rawTok = String(d.device_token || d.deviceToken || 'dev_totem_01');
    const maskedToken = rawTok.length > 8 ? `${rawTok.slice(0, 4)}****${rawTok.slice(-4)}` : 'dev_****';
    const isActive = d.is_active !== false && d.isActive !== false;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.device_name || d.name || 'Totem Receptor')}</strong></td>
      <td>${escapeHtml(d.unit_name || d.unitCode || 'Recepção')}</td>
      <td><code>${escapeHtml(maskedToken)}</code></td>
      <td><span class="badge-status ${isActive ? 'resolved' : 'detractor'}">${isActive ? '🟢 Ativo' : '🔴 Inativo'}</span></td>
      <td>${escapeHtml(d.last_ping ? new Date(d.last_ping).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Online')}</td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-dev">${isActive ? 'Desativar' : 'Ativar'}</button>
      </td>
    `;

    tr.querySelector('.btn-toggle-dev')?.addEventListener('click', async () => {
      const oldState = isActive;
      d.is_active = !oldState;
      d.isActive = !oldState;

      if (store.isSupabaseConnected) {
        const saved = await devicesRepository.saveDevice(d);
        if (saved) {
          renderConfigDevicesTable();
          showToast(`✓ Status do totem "${d.device_name || d.name}" atualizado no Supabase!`, 'success');
        } else {
          d.is_active = oldState;
          d.isActive = oldState;
          showToast('❌ Erro ao atualizar dispositivo no Supabase.', 'error');
        }
      } else {
        renderConfigDevicesTable();
        showToast('ℹ️ Status do dispositivo alterado localmente.', 'info');
      }
    });

    tbody.appendChild(tr);
  });
}

function renderSecurityTabInfo() {
  const emailEl = document.getElementById('cfgSecUserEmail');
  const roleEl = document.getElementById('cfgSecUserRoleBadge');
  const orgIdEl = document.getElementById('cfgSecOrgId');

  if (emailEl) emailEl.textContent = store.currentUser?.email || 'Nenhum usuário em sessão';
  if (roleEl) roleEl.textContent = (store.getUserRole() || 'VIEWER').toUpperCase();
  if (orgIdEl) orgIdEl.textContent = store.activeOrgId || 'Nenhuma organização selecionada';
}
