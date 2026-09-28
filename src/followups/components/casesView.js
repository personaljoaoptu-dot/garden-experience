/**
 * Follow-up Cases Table & Kanban View Component
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';
import { followupsRepository } from '../repositories/followupsRepository.js';
import { openStudentEvolutionDetail } from '../../students/components/studentEvolutionView.js';

export function setupCasesViewSwitcher() {
  const btnList = document.getElementById('btnCasesViewList');
  const btnKanban = document.getElementById('btnCasesViewKanban');
  const paneList = document.getElementById('casesListViewPane');
  const paneKanban = document.getElementById('casesKanbanViewPane');

  if (!btnList || !btnKanban) return;

  btnList.addEventListener('click', () => {
    btnList.classList.add('active', 'btn-secondary');
    btnList.classList.remove('btn-ghost');
    btnKanban.classList.remove('active', 'btn-secondary');
    btnKanban.classList.add('btn-ghost');

    if (paneList) paneList.style.display = 'block';
    if (paneKanban) paneKanban.style.display = 'none';
    renderCasesTable();
  });

  btnKanban.addEventListener('click', () => {
    btnKanban.classList.add('active', 'btn-secondary');
    btnKanban.classList.remove('btn-ghost');
    btnList.classList.remove('active', 'btn-secondary');
    btnList.classList.add('btn-ghost');

    if (paneList) paneList.style.display = 'none';
    if (paneKanban) paneKanban.style.display = 'grid';
    renderCasesKanban();
  });
}

export function renderCasesTable() {
  const tbody = document.getElementById('casesTableBody');
  const sidebarBadge = document.getElementById('sidebarPendingBadge');
  const sumPending = document.getElementById('caseSummaryPending');
  const sumProgress = document.getElementById('caseSummaryProgress');
  const sumResolved = document.getElementById('caseSummaryResolved');

  if (!tbody) return;
  tbody.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  let cases = [...store.followUpCases];
  if (unitFilter !== 'all') cases = cases.filter(c => c.unitCode === unitFilter);

  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const progressCount = cases.filter(c => c.status === 'in_progress' || c.status === 'waiting').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;

  if (sidebarBadge) sidebarBadge.textContent = pendingCount;
  if (sumPending) sumPending.textContent = pendingCount;
  if (sumProgress) sumProgress.textContent = progressCount;
  if (sumResolved) sumResolved.textContent = resolvedCount;

  if (!cases.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:2rem;">✓ Nenhum acompanhamento pendente ou em andamento.</td></tr>';
    return;
  }

  cases.forEach(c => {
    const u = store.UNITS.find(item => item.code === c.unitCode);
    const unitName = u ? u.name : c.unitCode;
    const priorityClass = c.priority === 'urgent' ? 'detractor' : c.priority === 'high' ? 'passive' : 'neutral';
    const priorityLabel = c.priority === 'urgent' ? 'Urgente' : c.priority === 'high' ? 'Alta' : 'Média';
    const initialName = c.student ? c.student.charAt(0).toUpperCase() : 'A';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(unitName)}</span></td>
      <td><span style="font-size:0.8rem; color:var(--text-muted);">${new Date(c.createdAt).toLocaleDateString('pt-BR')}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <div class="user-avatar-circle" style="width:26px; height:26px; font-size:0.75rem;">${initialName}</div>
          <div>
            <div style="font-weight:600; color:var(--text-title);">${escapeHtml(c.student)}</div>
            ${c.studentId ? `
              <button type="button" class="btn-view-case-student" data-student-id="${c.studentId}" style="font-size:0.72rem; background:none; border:none; padding:0; color:var(--gold-primary); cursor:pointer; font-weight:600;">
                📈 Ver jornada
              </button>
            ` : ''}
          </div>
        </div>
      </td>
      <td><span class="nps-badge detractor" style="font-size:0.78rem;">${c.npsScore}</span></td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${escapeHtml(c.comment || 'Sem comentário')}"</td>
      <td><span class="badge-status ${c.status === 'pending' ? 'pending' : c.status === 'in_progress' ? 'in_progress' : c.status === 'waiting' ? 'passive' : 'resolved'}">${c.status === 'pending' ? 'Novo' : c.status === 'in_progress' ? 'Em andamento' : c.status === 'waiting' ? 'Aguardando' : 'Resolvido'}</span></td>
      <td><span class="badge-status ${priorityClass}">${priorityLabel}</span></td>
      <td><span style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(c.assignedUser || 'Não atribuído')}</span></td>
      <td>
        ${c.status !== 'resolved' ? `
          <div style="display:flex; gap:0.35rem;">
            <button class="btn-primary-gold btn-sm btn-resolve-case">Resolver</button>
            <button class="btn-secondary btn-sm btn-assign-case">Assumir</button>
          </div>
        ` : '<span style="color:var(--color-promoter); font-weight:600; font-size:0.8rem;">✓ Resolvido</span>'}
      </td>
    `;

    tr.querySelector('.btn-resolve-case')?.addEventListener('click', async () => {
      c.status = 'resolved';
      c.resolvedAt = new Date().toISOString();
      await followupsRepository.updateCaseStatus(c.id, 'resolved', c.assignedUser);
      renderCasesTable();
      renderCasesKanban();
      updateDashboard();
      showToast('✓ Acompanhamento marcado como resolvido!', 'success');
    });

    tr.querySelector('.btn-assign-case')?.addEventListener('click', async () => {
      c.status = 'in_progress';
      c.assignedUser = 'Você (Gestor)';
      await followupsRepository.updateCaseStatus(c.id, 'in_progress', 'Você (Gestor)');
      renderCasesTable();
      renderCasesKanban();
      showToast('✓ Caso atribuído a você!', 'info');
    });

    tr.querySelector('.btn-view-case-student')?.addEventListener('click', () => {
      if (c.studentId) {
        openStudentEvolutionDetail(c.studentId);
      }
    });

    tbody.appendChild(tr);
  });
}

export function renderCasesKanban() {
  const container = document.getElementById('casesKanbanViewPane');
  if (!container) return;
  container.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  let cases = [...store.followUpCases];
  if (unitFilter !== 'all') cases = cases.filter(c => c.unitCode === unitFilter);

  const columns = [
    { id: 'pending', label: 'Novos', items: cases.filter(c => c.status === 'pending') },
    { id: 'in_progress', label: 'Em andamento', items: cases.filter(c => c.status === 'in_progress') },
    { id: 'waiting', label: 'Aguardando', items: cases.filter(c => c.status === 'waiting') },
    { id: 'resolved', label: 'Resolvidos', items: cases.filter(c => c.status === 'resolved') }
  ];

  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(4, 1fr)';
  container.style.gap = '1rem';

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'glass-card p-3';
    colDiv.style.cssText = 'padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;';
    colDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:0.5rem; border-bottom:1px solid var(--border-subtle);">
        <span style="font-size:0.85rem; font-weight:700; color:var(--text-title);">${col.label}</span>
        <span class="badge-status ${col.id === 'pending' ? 'detractor' : col.id === 'in_progress' ? 'passive' : col.id === 'waiting' ? 'passive' : 'promoter'}" style="font-size:0.75rem;">${col.items.length}</span>
      </div>
      <div class="kanban-cards-list" style="display:flex; flex-direction:column; gap:0.65rem; min-height:180px;"></div>
    `;

    const listDiv = colDiv.querySelector('.kanban-cards-list');

    if (!col.items.length) {
      listDiv.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:1.5rem 0.5rem; text-align:center;">Nenhum caso nesta coluna.</div>';
    } else {
      col.items.forEach(c => {
        const u = store.UNITS.find(item => item.code === c.unitCode);
        const unitName = u ? u.name : c.unitCode;
        const initialName = c.student ? c.student.charAt(0).toUpperCase() : 'A';
        const hoursOpen = Math.round((Date.now() - new Date(c.createdAt).getTime()) / 3600000);
        const openTimeStr = hoursOpen > 24 ? `${Math.round(hoursOpen / 24)}d em aberto` : `${hoursOpen}h em aberto`;

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.cssText = 'padding: 0.85rem; background: var(--bg-card-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); transition: transform 0.15s ease; cursor: pointer;';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <div class="user-avatar-circle" style="width:24px; height:24px; font-size:0.7rem;">${initialName}</div>
              <span style="font-size:0.85rem; font-weight:600; color:var(--text-title);">${escapeHtml(c.student)}</span>
            </div>
            <span class="nps-badge detractor" style="font-size:0.75rem; padding:0.15rem 0.45rem;">${c.npsScore}</span>
          </div>
          
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem; display:flex; justify-content:space-between;">
            <span>${escapeHtml(unitName)}</span>
            <span>${openTimeStr}</span>
          </div>
          
          <div style="font-size:0.8rem; color:var(--text-main); font-style:italic; margin-bottom:0.6rem; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">"${escapeHtml(c.comment || 'Sem comentário escrito.')}"</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-dim); border-top:1px solid var(--border-subtle); padding-top:0.4rem;">
            <span>👤 ${escapeHtml(c.assignedUser || 'Não atribuído')}</span>
            ${c.status !== 'resolved' ? `<button class="btn-primary-gold btn-sm btn-resolve-kanban" style="padding:0.2rem 0.5rem; font-size:0.72rem;">Resolver</button>` : '<span style="color:var(--color-promoter); font-weight:600;">✓ Resolvido</span>'}
          </div>
        `;

        card.querySelector('.btn-resolve-kanban')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          c.status = 'resolved';
          c.resolvedAt = new Date().toISOString();
          await followupsRepository.updateCaseStatus(c.id, 'resolved', c.assignedUser);
          renderCasesTable();
          renderCasesKanban();
          updateDashboard();
          showToast('✓ Acompanhamento marcado como resolvido!', 'success');
        });

        listDiv.appendChild(card);
      });
    }

    container.appendChild(colDiv);
  });
}
