/**
 * Team Management & Collaborator Invitations View Component
 * Single source of truth for adding team members, setting roles, and revoking organization access.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { usersRepository } from '../../users/repositories/usersRepository.js';

export function setupTeamManagement() {
  const form = document.getElementById('formNewUser');
  if (!form || form.dataset.teamListenerAttached) return;
  form.dataset.teamListenerAttached = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const activeOrg = store.getActiveOrg();
    if (!activeOrg || !activeOrg.id) {
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

    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Enviando convite...';
    }

    try {
      if (store.isSupabaseConnected) {
        const res = await usersRepository.inviteMember({
          organizationId: activeOrg.id,
          email,
          role: roleSelect
        });

        if (!res.success) {
          showToast(`❌ ${res.error}`, 'error', 5000);
          return; // Keep modal open on error
        }

        showToast(`✓ ${res.message}`, 'success');

        // Fetch refreshed members list
        const updatedTeam = await usersRepository.fetchTeamMembers(activeOrg.id);
        activeOrg.users = updatedTeam;
        store.users = updatedTeam;

        renderTeamTable();
        const modal = document.getElementById('modalNewUser');
        if (modal) modal.style.display = 'none';
        form.reset();
      } else {
        showToast('ℹ️ Convite de colaboradores exige conexão com Supabase.', 'info');
      }
    } catch (err) {
      console.error('[setupTeamManagement error]:', err);
      showToast('❌ Erro inesperado ao convidar colaborador.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Convite';
      }
    }
  });
}

export async function renderTeamTable() {
  const tbody = document.getElementById('configUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) return;

  let users = activeOrg.users || [];

  if (store.isSupabaseConnected && activeOrg.id && (!users || users.length === 0)) {
    users = await usersRepository.fetchTeamMembers(activeOrg.id);
    activeOrg.users = users;
    store.users = users;
  }

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
    const isInactive = usr.status === 'Inativo' || usr.status === 'inactive';
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><strong>${escapeHtml(usr.name || 'Colaborador')}</strong></td>
      <td>${escapeHtml(usr.email || '—')}</td>
      <td><span class="badge-status ${isOwner ? 'promoter' : 'passive'}">${escapeHtml(roleLabel)}</span></td>
      <td>${escapeHtml(usr.units || 'Todas as Unidades')}</td>
      <td><span class="badge-status ${isInactive ? 'detractor' : 'resolved'}">${escapeHtml(usr.status || 'Ativo')}</span></td>
      <td>
        ${isOwner ? '<span style="font-size:0.75rem; color:var(--text-muted);">Principal</span>' : `
          <div class="btn-group-row" style="display:flex; gap:0.4rem;">
            <button class="btn-outline-gold btn-sm btn-toggle-usr">${isInactive ? 'Ativar' : 'Inativar'}</button>
            <button class="btn-outline-gold btn-sm btn-remove-usr" style="color:#ef4444; border-color:rgba(239,68,68,0.3);">Remover</button>
          </div>
        `}
      </td>
    `;

    if (!isOwner) {
      // Toggle Active/Inactive Status
      tr.querySelector('.btn-toggle-usr')?.addEventListener('click', async () => {
        const newStatus = isInactive ? 'active' : 'inactive';
        if (store.isSupabaseConnected) {
          const updated = await usersRepository.updateMemberStatus(usr.id, activeOrg.id, newStatus);
          if (updated) {
            usr.status = updated.status === 'active' ? 'Ativo' : 'Inativo';
            renderTeamTable();
            showToast(`✓ Status de ${usr.name} alterado para ${usr.status}.`, 'success');
          } else {
            showToast('❌ Erro ao atualizar status do colaborador no Supabase.', 'error');
          }
        } else {
          usr.status = isInactive ? 'Ativo' : 'Inativo';
          renderTeamTable();
          showToast(`ℹ️ Status alterado localmente para ${usr.status}.`, 'info');
        }
      });

      // Remove Organization Access
      tr.querySelector('.btn-remove-usr')?.addEventListener('click', async () => {
        const confirmed = confirm(`Tem certeza que deseja remover o acesso de ${usr.name} a esta organização?\nO usuário perderá o acesso mas a conta continuará preservada.`);
        if (!confirmed) return;

        if (store.isSupabaseConnected) {
          const removed = await usersRepository.removeMember(usr.id, activeOrg.id);
          if (removed) {
            activeOrg.users = activeOrg.users.filter(u => u.id !== usr.id);
            renderTeamTable();
            showToast(`✓ Acesso de ${usr.name} removido da organização com sucesso.`, 'success');
          } else {
            showToast('❌ Erro ao remover colaborador no Supabase.', 'error');
          }
        } else {
          activeOrg.users = activeOrg.users.filter(u => u.id !== usr.id);
          renderTeamTable();
          showToast(`ℹ️ Colaborador removido localmente.`, 'info');
        }
      });
    }

    tbody.appendChild(tr);
  });
}
