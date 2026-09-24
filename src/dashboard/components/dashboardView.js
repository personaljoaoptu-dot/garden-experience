/**
 * Executive Dashboard View Component Logic & Data Binding
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass, getNpsCategoryLabel } from '../../surveys/services/npsService.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function setupAdminDashboard() {
  const filterUnit = document.getElementById('filterUnit');
  const filterOrigin = document.getElementById('filterOrigin');
  const filterRole = document.getElementById('filterRoleSim');

  [filterUnit, filterOrigin, filterRole].forEach(el => {
    if (el) el.addEventListener('change', () => updateDashboard());
  });

  // Period Pills Handler
  const periodBtns = document.querySelectorAll('.btn-period-pill');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
        b.style.fontWeight = '500';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--gold-subtle)';
      btn.style.color = 'var(--gold-primary)';
      btn.style.fontWeight = '600';

      const days = btn.getAttribute('data-period');
      filterByDays(days);
    });
  });

  // CTA Buttons
  document.getElementById('btnDashViewQr')?.addEventListener('click', openQrModal);
  document.getElementById('btnEmptyStateQr')?.addEventListener('click', openQrModal);
  document.getElementById('btnDashViewAllResponses')?.addEventListener('click', () => {
    document.querySelector('[data-mod="mod-responses"]')?.click();
  });
  document.getElementById('dashAttentionCta')?.addEventListener('click', () => {
    document.querySelector('[data-mod="mod-cases"]')?.click();
  });
}

function filterByDays(days) {
  const startEl = document.getElementById('filterStartDate');
  const endEl = document.getElementById('filterEndDate');

  if (days === 'all') {
    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
  } else {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - parseInt(days, 10));

    if (startEl) startEl.value = start.toISOString().split('T')[0];
    if (endEl) endEl.value = end.toISOString().split('T')[0];
  }
  updateDashboard();
}

function openQrModal() {
  const modal = document.getElementById('modalNewQRCode');
  if (modal) modal.style.display = 'flex';
}

export function updateDashboard() {
  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const originFilter = document.getElementById('filterOrigin')?.value || 'all';
  const startDate = document.getElementById('filterStartDate')?.value;
  const endDate = document.getElementById('filterEndDate')?.value;

  let responses = [...store.localResponses];

  if (unitFilter !== 'all') {
    responses = responses.filter(r => r.unitCode === unitFilter);
  }
  if (originFilter !== 'all') {
    responses = responses.filter(r => r.origin === originFilter);
  }

  if (startDate) {
    const startMs = new Date(startDate).getTime();
    if (!isNaN(startMs)) responses = responses.filter(r => new Date(r.createdAt).getTime() >= startMs);
  }
  if (endDate) {
    const endMs = new Date(endDate + 'T23:59:59.999').getTime();
    if (!isNaN(endMs)) responses = responses.filter(r => new Date(r.createdAt).getTime() <= endMs);
  }

  const metrics = store.calculateNPS(responses);

  // Update KPI Cards
  const valNps = document.getElementById('dashValNpsScore');
  const badgeStatus = document.getElementById('dashBadgeNpsStatus');
  const valTotal = document.getElementById('dashValTotalResponses');
  const valPromoters = document.getElementById('dashValPromoters');
  const valDetractors = document.getElementById('dashValDetractors');
  const openCasesCount = document.getElementById('dashOpenCasesCount');

  if (valNps) valNps.textContent = metrics.total > 0 ? (metrics.nps > 0 ? `+${metrics.nps}` : `${metrics.nps}`) : '—';
  if (badgeStatus) {
    badgeStatus.textContent = metrics.status;
    badgeStatus.className = `badge-status ${metrics.nps >= 50 ? 'promoter' : metrics.nps >= 0 ? 'passive' : 'detractor'}`;
  }
  if (valTotal) valTotal.textContent = metrics.total;
  if (valPromoters) valPromoters.textContent = `${metrics.pPromoters}%`;
  if (valDetractors) valDetractors.textContent = `${metrics.detractors}`;

  const openCases = store.followUpCases.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  if (openCasesCount) openCasesCount.textContent = `${openCases} em aberto`;

  // Update Distribution Bars
  const distProm = document.getElementById('distValPromoters');
  const distPass = document.getElementById('distValPassives');
  const distDet = document.getElementById('distValDetractors');
  const barProm = document.getElementById('dashBarPromoters');
  const barPass = document.getElementById('dashBarPassives');
  const barDet = document.getElementById('dashBarDetractors');

  if (distProm) distProm.textContent = `${metrics.pPromoters}%`;
  if (distPass) distPass.textContent = `${metrics.pPassives}%`;
  if (distDet) distDet.textContent = `${metrics.pDetractors}%`;

  if (barProm) barProm.style.width = `${metrics.pPromoters}%`;
  if (barPass) barPass.style.width = `${metrics.pPassives}%`;
  if (barDet) barDet.style.width = `${metrics.pDetractors}%`;

  // Update Attention Center Block
  const attentionTitle = document.getElementById('dashAttentionTitle');
  const attentionSub = document.getElementById('dashAttentionSubtitle');
  const attentionIcon = document.getElementById('dashAttentionIcon');
  const attentionCta = document.getElementById('dashAttentionCta');

  if (openCases > 0) {
    if (attentionTitle) attentionTitle.textContent = `${openCases} acompanhamento(s) pendente(s)`;
    if (attentionSub) attentionSub.textContent = 'Existem casos de detratores que precisam da atenção da equipe.';
    if (attentionIcon) attentionIcon.textContent = '🚨';
    if (attentionCta) attentionCta.style.display = 'inline-block';
  } else {
    if (attentionTitle) attentionTitle.textContent = 'Tudo em dia';
    if (attentionSub) attentionSub.textContent = 'Nenhuma avaliação precisa de atenção no momento.';
    if (attentionIcon) attentionIcon.textContent = '✓';
    if (attentionCta) attentionCta.style.display = 'none';
  }

  renderRecentResponsesTable(responses);
}

function renderRecentResponsesTable(responses) {
  const tableContainer = document.getElementById('dashResponsesTableContainer');
  const emptyState = document.getElementById('dashEmptyState');
  const tbody = document.getElementById('dashRecentResponsesBody');

  if (!responses.length) {
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (tableContainer) tableContainer.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';

  if (!tbody) return;
  tbody.innerHTML = '';

  responses.slice(0, 6).forEach(r => {
    const u = store.UNITS.find(unit => unit.code === r.unitCode);
    const unitName = u ? u.name : r.unitCode;
    const catClass = getNpsCategoryClass(r.npsScore);
    const catLabel = getNpsCategoryLabel(r.npsScore);

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td><strong>${escapeHtml(r.student || 'Anônimo')}</strong></td>
      <td><span class="badge-status ${catClass}">${r.npsScore}</span></td>
      <td>${escapeHtml(unitName)}</td>
      <td><span style="font-size:0.78rem; text-transform:uppercase; color:var(--text-muted);">${escapeHtml(r.origin)}</span></td>
      <td>${new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
      <td><span class="badge-status ${catClass}">${catLabel}</span></td>
    `;

    tr.addEventListener('click', () => {
      store.selectedResponseId = r.id;
      document.querySelector('[data-mod="mod-responses"]')?.click();
    });

    tbody.appendChild(tr);
  });
}
