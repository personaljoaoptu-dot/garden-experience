/**
 * Admin Dashboard View Component
 * Renders executive overview metrics, NPS status gauge, breakdown bars, and recent activity table.
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass } from '../../surveys/services/npsService.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function setupAdminDashboard() {
  const filterUnit = document.getElementById('filterUnit');
  const filterOrigin = document.getElementById('filterOrigin');
  const filterRole = document.getElementById('filterRoleSim');
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');
  const btnClearFilters = document.getElementById('btnClearFilters');

  [filterUnit, filterOrigin, filterRole, filterStartDate, filterEndDate].forEach(el => {
    if (el) el.addEventListener('change', () => updateDashboard());
  });

  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      if (filterUnit) filterUnit.value = 'all';
      if (filterOrigin) filterOrigin.value = 'all';
      if (filterRole) filterRole.value = 'admin';
      if (filterStartDate) filterStartDate.value = '';
      if (filterEndDate) filterEndDate.value = '';
      updateDashboard();
    });
  }
}

export function updateDashboard() {
  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const originFilter = document.getElementById('filterOrigin')?.value || 'all';
  const role = document.getElementById('filterRoleSim')?.value || 'admin';
  const startDate = document.getElementById('filterStartDate')?.value;
  const endDate = document.getElementById('filterEndDate')?.value;

  let responses = [...store.localResponses];

  if (role === 'gestor_a') {
    responses = responses.filter(r => r.unitCode === 'unidade-a');
  } else if (role === 'gestor_b') {
    responses = responses.filter(r => r.unitCode === 'unidade-b');
  }

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

  // Update Metric Cards
  const valNps = document.getElementById('dashValNpsScore');
  const badgeStatus = document.getElementById('dashBadgeNpsStatus');
  const valPromoters = document.getElementById('dashValPromoters');
  const valPassives = document.getElementById('dashValPassives');
  const valDetractors = document.getElementById('dashValDetractors');
  const valTotal = document.getElementById('dashValTotalResponses');

  if (valNps) valNps.textContent = metrics.total > 0 ? (metrics.nps > 0 ? `+${metrics.nps}` : metrics.nps) : '0';
  if (badgeStatus) {
    badgeStatus.textContent = metrics.status;
    badgeStatus.className = `badge-status ${metrics.nps >= 50 ? 'promoter' : metrics.nps >= 0 ? 'passive' : 'detractor'}`;
  }
  if (valPromoters) valPromoters.textContent = `${metrics.promoters} (${metrics.pPromoters}%)`;
  if (valPassives) valPassives.textContent = `${metrics.passives} (${metrics.pPassives}%)`;
  if (valDetractors) valDetractors.textContent = `${metrics.detractors} (${metrics.pDetractors}%)`;
  if (valTotal) valTotal.textContent = metrics.total;

  // Update Progress Bars
  const barProm = document.getElementById('dashBarPromoters');
  const barPass = document.getElementById('dashBarPassives');
  const barDet = document.getElementById('dashBarDetractors');

  if (barProm) barProm.style.width = `${metrics.pPromoters}%`;
  if (barPass) barPass.style.width = `${metrics.pPassives}%`;
  if (barDet) barDet.style.width = `${metrics.pDetractors}%`;

  renderRecentResponsesTable(responses);
}

function renderRecentResponsesTable(responses) {
  const tbody = document.getElementById('dashRecentResponsesBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!responses.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Nenhuma avaliação registrada com os filtros selecionados.</td></tr>';
    return;
  }

  responses.slice(0, 8).forEach(r => {
    const u = store.UNITS.find(unit => unit.code === r.unitCode);
    const unitName = u ? u.name : r.unitCode;
    const catClass = getNpsCategoryClass(r.npsScore);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(r.student || 'Anônimo')}</strong></td>
      <td>${escapeHtml(unitName)}</td>
      <td><span class="badge-status ${catClass}">NPS ${r.npsScore}</span></td>
      <td><span style="font-size:0.8rem; text-transform:uppercase;">${escapeHtml(r.origin)}</span></td>
      <td>"${escapeHtml(r.comment || 'Sem comentário')}"</td>
      <td>${new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
    `;
    tbody.appendChild(tr);
  });
}
