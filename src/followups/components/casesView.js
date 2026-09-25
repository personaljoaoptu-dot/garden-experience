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
    btnList.classList.add('active', 'btn-secondary-gold');
    btnList.classList.remove('btn-outline-gold');
    btnKanban.classList.remove('active', 'btn-secondary-gold');
    btnKanban.classList.add('btn-outline-gold');

    if (paneList) paneList.style.display = 'block';
    if (paneKanban) paneKanban.style.display = 'none';
    renderCasesTable();
  });

  btnKanban.addEventListener('click', () => {
    btnKanban.classList.add('active', 'btn-secondary-gold');
    btnKanban.classList.remove('btn-outline-gold');
    btnList.classList.remove('active', 'btn-secondary-gold');
    btnList.classList.add('btn-outline-gold');

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
  const progressCount = cases.filter(c => c.status === 'in_progress').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;

  if (sidebarBadge) sidebarBadge.textContent = pendingCount;
  if (sumPending) sumPending.textContent = pendingCount;
  if (sumProgress) sumProgress.textContent = progressCount;
  if (sumResolved) sumResolved.textContent = resolvedCount;

  if (!cases.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:1.5rem;">✓ Nenhum acompanhamento pendente ou em andamento.</td></tr>';
    return;
  }

  cases.forEach(c => {
    const u = store.UNITS.find(item => item.code === c.unitCode);
    const unitName = u ? u.name : c.unitCode;
    const priorityClass = c.priority === 'urgent' ? 'urgent' : c.priority === 'high' ? 'high' : 'medium';
    const priorityLabel = c.priority === 'urgent' ? '🔴 Urgente' : c.priority === 'high' ? '🟠 Alta' : '🟡 Média';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(unitName)}</td>
      <td><span style="font-size:0.8rem; color:var(--text-muted);">${new Date(c.createdAt).toLocaleDateString('pt-BR')}</span></td>
      <td>
        <strong>${escapeHtml(c.student)}</strong>
        ${c.student && c.student !== 'Anônimo' ? `
          <div style="margin-top:0.2rem;">
            <button type="button" class="btn-view-case-student" data-student-id="${c.studentId || ''}" data-student-name="${escapeHtml(c.student)}" style="font-size:0.75rem; background:none; border:none; padding:0; color:var(--gold-primary); cursor:pointer; font-weight:600; text-decoration:underline;">
              📈 Ver evolução
            </button>
          </div>
        ` : ''}
      </td>
      <td><span class="badge-status detractor">NPS ${c.npsScore}</span></td>
      <td>"${escapeHtml(c.comment)}"</td>
      <td><span class="badge-status ${c.status === 'pending' ? 'pending' : c.status === 'in_progress' ? 'in_progress' : 'resolved'}">${c.status === 'pending' ? 'Pendente' : c.status === 'in_progress' ? 'Em Andamento' : 'Resolvido'}</span></td>
      <td><span class="badge-priority ${priorityClass}">${priorityLabel}</span></td>
      <td>${escapeHtml(c.assignedUser)}</td>
      <td>
        ${c.status !== 'resolved' ? `
          <div class="btn-group-row">
            <button class="btn-primary-gold btn-sm btn-resolve-case">Resolver</button>
            <button class="btn-outline-gold btn-sm btn-assign-case">Assumir</button>
          </div>
        ` : '<span style="color:var(--color-promoter); font-weight:600;">✓ Resolvido</span>'}
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
      const activeOrg = store.getActiveOrg();
      const student = (activeOrg?.students || []).find(s => s.id === c.studentId || s.name === c.student);
      openStudentEvolutionDetail(student?.id || c.studentId || c.student);
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
    { id: 'pending', label: '🔴 PENDENTES', items: cases.filter(c => c.status === 'pending') },
    { id: 'in_progress', label: '🟡 EM ANDAMENTO', items: cases.filter(c => c.status === 'in_progress') },
    { id: 'resolved', label: '🟢 RESOLVIDOS', items: cases.filter(c => c.status === 'resolved') }
  ];

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'kanban-column';
    colDiv.innerHTML = `
      <div class="kanban-column-header">
        <span>${col.label}</span>
        <span class="badge-status ${col.id === 'pending' ? 'detractor' : col.id === 'in_progress' ? 'passive' : 'promoter'}">${col.items.length}</span>
      </div>
      <div class="kanban-cards-list"></div>
    `;

    const listDiv = colDiv.querySelector('.kanban-cards-list');

    if (!col.items.length) {
      listDiv.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:1rem; text-align:center;">Nenhum caso nesta coluna.</div>';
    } else {
      col.items.forEach(c => {
        const u = store.UNITS.find(item => item.code === c.unitCode);
        const unitName = u ? u.name : c.unitCode;
        const priorityClass = c.priority === 'urgent' ? 'urgent' : c.priority === 'high' ? 'high' : 'medium';
        const priorityLabel = c.priority === 'urgent' ? '🔴 Urgente' : c.priority === 'high' ? '🟠 Alta' : '🟡 Média';

        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span style="font-size:0.85rem; font-weight:700;">${escapeHtml(c.student)}</span>
            <span class="badge-status detractor">NPS ${c.npsScore}</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">${escapeHtml(unitName)} • ${new Date(c.createdAt).toLocaleDateString('pt-BR')}</div>
          <div style="font-size:0.82rem; color:var(--text-main); font-style:italic; margin-bottom:0.6rem;">"${escapeHtml(c.comment)}"</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge-priority ${priorityClass}">${priorityLabel}</span>
            ${c.status !== 'resolved' ? `<button class="btn-primary-gold btn-sm btn-resolve-kanban">Resolver</button>` : '<span style="font-size:0.75rem; color:var(--color-promoter); font-weight:600;">✓ Resolvido</span>'}
          </div>
        `;

        card.querySelector('.btn-resolve-kanban')?.addEventListener('click', async () => {
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

