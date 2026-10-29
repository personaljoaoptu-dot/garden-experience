/**
 * Team Management & Collaborator Invitations View Component
 * Single source of truth for adding team members, sharing invite links (WhatsApp / Copy Link),
 * setting roles, and revoking organization access.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { usersRepository } from '../../users/repositories/usersRepository.js';

export function setupTeamManagement() {
  const btnConfigNewUser = document.getElementById('btnConfigNewUser');
  if (btnConfigNewUser) {
    btnConfigNewUser.onclick = () => {
      populateInviteUnitSelect();
      const modalUser = document.getElementById('modalNewUser');
      if (modalUser) modalUser.style.display = 'flex';
    };
  }

  const form = document.getElementById('formNewUser');
  if (form && !form.dataset.teamListenerAttached) {
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
        btnSubmit.textContent = 'Processando convite...';
      }

      try {
        if (store.isSupabaseConnected) {
          const res = await usersRepository.inviteMember({
            organizationId: activeOrg.id,
            email,
            role: roleSelect,
            fullName: name
          });

          if (!res.success) {
            showToast(`❌ ${res.error}`, 'error', 5000);
            return;
          }

          const inviteUrl = res.inviteToken
            ? `${window.location.origin}/?invite=${res.inviteToken}`
            : `${window.location.origin}/?email=${encodeURIComponent(email)}`;

          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(inviteUrl);
            }
          } catch (_) {}

          showToast(`✓ ${res.message} (Link copiado para a área de transferência!)`, 'success', 6500);

          // Fetch refreshed members list (including pending invites)
          const updatedTeam = await usersRepository.fetchTeamMembers(activeOrg.id);
          activeOrg.users = updatedTeam;
          store.users = updatedTeam;

          await renderTeamTable();
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

  // Setup formEditUser
  const formEdit = document.getElementById('formEditUser');
  if (formEdit && !formEdit.dataset.editListenerAttached) {
    formEdit.dataset.editListenerAttached = 'true';
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const memberId = document.getElementById('editUserMemberId')?.value;
      const targetUserId = document.getElementById('editUserTargetUserId')?.value;
      const isPending = document.getElementById('editUserIsPending')?.value === 'true';
      const newName = document.getElementById('inputEditUserName')?.value.trim();
      const newRole = document.getElementById('selectEditUserRole')?.value;
      const activeOrg = store.getActiveOrg();

      if (!newName) {
        showToast('O nome não pode ser vazio.', 'warning');
        return;
      }

      const btnSubmit = formEdit.querySelector('button[type="submit"]');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Salvando...';
      }

      try {
        const res = await usersRepository.updateMemberName({
          userId: targetUserId,
          memberId,
          organizationId: activeOrg?.id,
          newName,
          isPendingInvite: isPending
        });

        if (!res.success) {
          showToast(`❌ ${res.error || 'Erro ao atualizar nome.'}`, 'error');
          return;
        }

        // If role was also edited and not owner
        if (newRole && activeOrg?.id && memberId && newRole !== 'owner') {
          await usersRepository.updateMemberRole(memberId, activeOrg.id, newRole, isPending);
        }

        // Check if updating self
        const isSelf = (targetUserId && targetUserId === store.currentUser?.id) ||
                       (document.getElementById('inputEditUserEmail')?.value === store.currentUser?.email);
        if (isSelf) {
          if (store.currentUser) store.currentUser.name = newName;
          const nameEl = document.getElementById('headerUserName');
          const avatarEl = document.getElementById('userAvatarBadge');
          if (nameEl) nameEl.textContent = newName;
          if (avatarEl) avatarEl.textContent = newName.charAt(0).toUpperCase();
        }

        // Update local team list if present
        if (activeOrg && Array.isArray(activeOrg.users)) {
          const u = activeOrg.users.find(x => x.id === memberId || (x.userId && x.userId === targetUserId));
          if (u) {
            u.name = newName;
            if (newRole && newRole !== 'owner') u.role = newRole;
          }
        }

        await renderTeamTable();
        const modal = document.getElementById('modalEditUser');
        if (modal) modal.style.display = 'none';
        showToast(`✓ Nome atualizado para "${newName}" com sucesso!`, 'success');
      } catch (err) {
        console.error('[updateUser error]:', err);
        showToast('❌ Erro inesperado ao salvar alterações.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Salvar Alterações';
        }
      }
    });
  }
}

export function openEditUserModal(usr, isPending = false, isOwner = false) {
  const modal = document.getElementById('modalEditUser');
  if (!modal) return;

  const memberIdInput = document.getElementById('editUserMemberId');
  const targetUserIdInput = document.getElementById('editUserTargetUserId');
  const isPendingInput = document.getElementById('editUserIsPending');
  const nameInput = document.getElementById('inputEditUserName');
  const emailInput = document.getElementById('inputEditUserEmail');
  const roleSelect = document.getElementById('selectEditUserRole');

  if (memberIdInput) memberIdInput.value = usr.id || '';
  if (targetUserIdInput) targetUserIdInput.value = usr.userId || usr.user_id || usr.id || '';
  if (isPendingInput) isPendingInput.value = isPending ? 'true' : 'false';
  if (nameInput) nameInput.value = usr.name || '';
  if (emailInput) emailInput.value = usr.email || '';
  if (roleSelect) {
    roleSelect.value = usr.role || 'operator';
    if (isOwner || usr.role === 'owner') {
      roleSelect.value = 'owner';
      roleSelect.disabled = true;
    } else {
      roleSelect.disabled = false;
    }
  }

  modal.style.display = 'flex';
  setTimeout(() => {
    nameInput?.focus();
    nameInput?.select();
  }, 50);
}

function populateInviteUnitSelect() {
  const selectUnits = document.getElementById('selectUserUnits');
  if (!selectUnits) return;
  const activeOrg = store.getActiveOrg();
  selectUnits.innerHTML = '<option value="all">Todas as Unidades</option>';
  if (activeOrg && Array.isArray(activeOrg.units)) {
    activeOrg.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      selectUnits.appendChild(opt);
    });
  }
}

let teamRenderSeq = 0;

export async function renderTeamTable() {
  const tbody = document.getElementById('configUsersTableBody');
  if (!tbody) return;

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) {
    tbody.innerHTML = '';
    return;
  }

  const currentSeq = ++teamRenderSeq;
  let users = activeOrg.users || [];

  if (store.isSupabaseConnected && activeOrg.id) {
    users = await usersRepository.fetchTeamMembers(activeOrg.id);
    if (currentSeq !== teamRenderSeq) return; // A newer render call superseded this one
    activeOrg.users = users;
    store.users = users;
  }

  tbody.innerHTML = '';

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
    const isPending = Boolean(usr.isPendingInvite) || usr.status === 'Convite Pendente';
    const roleLabel = roleLabels[usr.role] || usr.role || 'Colaborador';
    const isInactive = usr.status === 'Inativo' || usr.status === 'inactive';
    const statusBadgeClass = isPending ? 'passive' : (isInactive ? 'detractor' : 'resolved');
    const statusLabel = isPending ? '⏳ Convite Pendente' : (usr.status || 'Ativo');

    const accessUrl = usr.inviteToken
      ? `${window.location.origin}/?invite=${usr.inviteToken}`
      : `${window.location.origin}/?email=${encodeURIComponent(usr.email || '')}`;

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><strong>${escapeHtml(usr.name || 'Colaborador')}</strong></td>
      <td>${escapeHtml(usr.email || '—')}</td>
      <td><span class="badge-status ${isOwner ? 'promoter' : 'passive'}">${escapeHtml(roleLabel)}</span></td>
      <td>${escapeHtml(usr.units || 'Todas as Unidades')}</td>
      <td><span class="badge-status ${statusBadgeClass}">${escapeHtml(statusLabel)}</span></td>
      <td>
        <div class="btn-group-row" style="display:flex; gap:0.35rem; flex-wrap:wrap; align-items:center;">
          <button type="button" class="btn-outline-gold btn-sm btn-edit-usr" title="Editar nome e permissões deste usuário">✏️ Editar</button>
          <button type="button" class="btn-outline-gold btn-sm btn-copy-invite" title="Copiar link de acesso/cadastro para enviar ao colaborador">🔗 Copiar Link</button>
          <button type="button" class="btn-outline-gold btn-sm btn-whatsapp-invite" style="color:#10b981; border-color:rgba(16,185,129,0.35);" title="Enviar instruções de acesso pelo WhatsApp">📲 WhatsApp</button>
          ${isOwner ? '' : `
            ${!isPending ? `<button type="button" class="btn-outline-gold btn-sm btn-toggle-usr">${isInactive ? 'Ativar' : 'Inativar'}</button>` : ''}
            <button type="button" class="btn-outline-gold btn-sm btn-remove-usr" style="color:#ef4444; border-color:rgba(239,68,68,0.3);">Remover</button>
          `}
        </div>
      </td>
    `;

    // 0. Edit Member Name / Role
    tr.querySelector('.btn-edit-usr')?.addEventListener('click', () => {
      openEditUserModal(usr, isPending, isOwner);
    });

    // 1. Copy Invite / Access Link
    tr.querySelector('.btn-copy-invite')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(accessUrl);
        showToast(
          isPending
            ? `✓ Link de cadastro copiado! Envie para ${usr.name} criar a senha.`
            : `✓ Link de acesso copiado! ${usr.name} já possui conta ativa e pode entrar direto.`,
          'success'
        );
      } catch (_) {
        prompt('Copie o link de acesso abaixo:', accessUrl);
      }
    });

    // 2. Send Invite / Access Instructions via WhatsApp
    tr.querySelector('.btn-whatsapp-invite')?.addEventListener('click', () => {
      const orgName = activeOrg.tradeName || activeOrg.name || 'Garden Experience';
      const msg = isPending
        ? `Olá, ${usr.name}! 👋 Você foi convidado(a) para acessar o painel da *${orgName}* no Garden Experience como *${roleLabel}*.\n\nClique no link abaixo para criar sua senha e ativar seu acesso:\n${accessUrl}`
        : `Olá, ${usr.name}! 👋 Seu acesso como *${roleLabel}* na organização *${orgName}* já está liberado e ativo no Garden Experience!\n\nAcesse pelo link abaixo usando seu e-mail (${usr.email}):\n${accessUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    });

    if (!isOwner) {
      // 3. Toggle Active/Inactive Status
      tr.querySelector('.btn-toggle-usr')?.addEventListener('click', async () => {
        const newStatus = isInactive ? 'active' : 'inactive';
        if (store.isSupabaseConnected) {
          const updated = await usersRepository.updateMemberStatus(usr.id, activeOrg.id, newStatus);
          if (updated) {
            usr.status = updated.status === 'active' ? 'Ativo' : 'Inativo';
            await renderTeamTable();
            showToast(`✓ Status de ${usr.name} alterado para ${usr.status}.`, 'success');
          } else {
            showToast('❌ Erro ao atualizar status do colaborador no Supabase.', 'error');
          }
        } else {
          usr.status = isInactive ? 'Ativo' : 'Inativo';
          await renderTeamTable();
          showToast(`ℹ️ Status alterado localmente para ${usr.status}.`, 'info');
        }
      });

      // 4. Remove Organization Access or Pending Invite
      tr.querySelector('.btn-remove-usr')?.addEventListener('click', async () => {
        const confirmed = confirm(
          isPending
            ? `Deseja cancelar o convite pendente para ${usr.name} (${usr.email})?`
            : `Tem certeza que deseja remover o acesso de ${usr.name} a esta organização?\nO usuário perderá o acesso mas a conta continuará preservada.`
        );
        if (!confirmed) return;

        if (store.isSupabaseConnected) {
          const removed = await usersRepository.removeMember(usr.id, activeOrg.id, isPending);
          if (removed) {
            activeOrg.users = activeOrg.users.filter(u => u.id !== usr.id);
            await renderTeamTable();
            showToast(`✓ ${isPending ? 'Convite cancelado' : 'Acesso removido'} com sucesso.`, 'success');
          } else {
            showToast('❌ Erro ao remover colaborador no Supabase.', 'error');
          }
        } else {
          activeOrg.users = activeOrg.users.filter(u => u.id !== usr.id);
          await renderTeamTable();
          showToast(`ℹ️ Colaborador removido localmente.`, 'info');
        }
      });
    }

    tbody.appendChild(tr);
  });
}
