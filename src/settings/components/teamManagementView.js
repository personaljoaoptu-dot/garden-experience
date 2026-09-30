/**
 * Team Management & Collaborator Invitations View Component
 * Handles adding team members, setting roles (Admin, Manager, Operator, Viewer), and unit permissions.
 */

import { supabase } from '../../core/supabase/client.js';
import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function setupTeamManagement() {
  const form = document.getElementById('formNewUser');
  if (!form || form.dataset.teamListenerAttached) return;
  form.dataset.teamListenerAttached = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const activeOrg = store.getActiveOrg();
    if (!activeOrg) {
      showToast('⚠️ Nenhuma organização ativa selecionada.', 'warning');
      return;
    }

    const currentRole = store.getUserRole();
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      showToast('⚠️ Apenas Administradores ou Proprietários podem convidar colaboradores.', 'error');
      return;
    }

    const name = document.getElementById('inputUserName')?.value.trim();
    const email = document.getElementById('inputUserEmail')?.value.trim();
    const roleSelect = document.getElementById('selectUserRole')?.value || 'operator';

    if (!name || !email) {
      showToast('Por favor, preencha o nome e o e-mail do colaborador.', 'warning');
      return;
    }

    if (roleSelect === 'owner' && currentRole !== 'owner') {
      showToast('Apenas o Proprietário atual pode delegar acesso de Owner.', 'error');
      return;
    }

    // Provide accurate production invite status
    document.getElementById('modalNewUser').style.display = 'none';
    form.reset();
    showToast(`ℹ️ O envio de convite por e-mail para ${email} exige o serviço de e-mail do Supabase Auth ativado no projeto.`, 'info', 5000);
  });
}

export function renderTeamTable() {
  const tbody = document.getElementById('configUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeOrg = store.getActiveOrg();
  const users = activeOrg?.users || store.users || [];

  if (!users || !users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Nenhum colaborador adicional cadastrado nesta organização.</td></tr>';
    return;
  }

  const roleLabels = {
    owner: 'Proprietário (Owner)',
    admin: 'Administrador (Admin)',
    manager: 'Gestor (Manager)',
    operator: 'Operador (Operator)',
    viewer: 'Leitor (Viewer)'
  };

  users.forEach((usr) => {
    const isOwner = usr.role === 'owner';
    const roleLabel = roleLabels[usr.role] || usr.role || 'Colaborador';
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><strong>${escapeHtml(usr.name || 'Colaborador')}</strong></td>
      <td>${escapeHtml(usr.email || '—')}</td>
      <td><span class="badge-status ${isOwner ? 'promoter' : 'passive'}">${escapeHtml(roleLabel)}</span></td>
      <td>${escapeHtml(usr.units || 'Todas as Unidades')}</td>
      <td><span class="badge-status ${usr.status === 'Inativo' ? 'detractor' : 'resolved'}">${escapeHtml(usr.status || 'Ativo')}</span></td>
      <td>
        ${isOwner ? '<span style="font-size:0.75rem; color:var(--text-muted);">Principal</span>' : `
          <button class="btn-outline-gold btn-sm btn-toggle-usr">${usr.status === 'Inativo' ? 'Ativar' : 'Inativar'}</button>
        `}
      </td>
    `;

    if (!isOwner) {
      tr.querySelector('.btn-toggle-usr')?.addEventListener('click', async () => {
        usr.status = usr.status === 'Inativo' ? 'Ativo' : 'Inativo';
        renderTeamTable();
        showToast(`✓ Status de ${usr.name} alterado para ${usr.status}.`, 'info');
      });
    }

    tbody.appendChild(tr);
  });
}

function genRandomUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
