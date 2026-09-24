/**
 * Executive Dashboard View Component Logic & Data Binding
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass, getNpsCategoryLabel } from '../../surveys/services/npsService.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { renderNpsLineChart, renderSparklineSvg } from './chartRenderer.js';

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
  const npsSparklineEl = document.getElementById('dashNpsSparkline');
  const resSparklineEl = document.getElementById('dashResSparkline');

  if (valNps) valNps.textContent = metrics.total > 0 ? (metrics.nps > 0 ? `+${metrics.nps}` : `${metrics.nps}`) : '—';
  if (badgeStatus) {
    badgeStatus.textContent = metrics.total > 0 ? metrics.status : 'SEM DADOS';
    badgeStatus.className = `badge-status ${metrics.total > 0 ? (metrics.nps >= 50 ? 'promoter' : metrics.nps >= 0 ? 'passive' : 'detractor') : 'passive'}`;
  }
  if (valTotal) valTotal.textContent = metrics.total;
  if (valPromoters) valPromoters.textContent = `${metrics.pPromoters}%`;
  if (valDetractors) valDetractors.textContent = `${metrics.detractors}`;

  const openCases = store.followUpCases.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  if (openCasesCount) openCasesCount.textContent = `${openCases} abertos`;

  // Render Sparklines if history exists
  if (responses.length >= 2) {
    const sorted = [...responses].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const npsPoints = sorted.map(r => r.npsScore);
    if (npsSparklineEl) npsSparklineEl.innerHTML = renderSparklineSvg(npsPoints);

    const countsOverTime = sorted.map((_, idx) => idx + 1);
    if (resSparklineEl) resSparklineEl.innerHTML = renderSparklineSvg(countsOverTime);
  } else {
    if (npsSparklineEl) npsSparklineEl.innerHTML = '';
    if (resSparklineEl) resSparklineEl.innerHTML = '';
  }

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

  // Main Line Chart Render (without inventing data)
  renderMainNpsChart(responses);

  // Render Touchpoint Ranking & Insights
  renderTouchpointsSection(responses);
  renderInsightsSection(responses, metrics, openCases);

  renderRecentResponsesTable(responses);
}

function renderMainNpsChart(responses) {
  if (!responses.length) {
    renderNpsLineChart('npsMainChartContainer', []);
    return;
  }

  // Group responses by date
  const dateMap = {};
  const sorted = [...responses].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  sorted.forEach(r => {
    const dStr = new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!dateMap[dStr]) dateMap[dStr] = [];
    dateMap[dStr].push(r);
  });

  const historyData = Object.keys(dateMap).map(date => {
    const dayResponses = dateMap[date];
    const dayMetrics = store.calculateNPS(dayResponses);
    return { date, nps: dayMetrics.nps };
  });

  renderNpsLineChart('npsMainChartContainer', historyData);
}

function renderTouchpointsSection(responses) {
  const container = document.getElementById('touchpointRankingList');
  if (!container) return;

  const touchpoints = store.touchpoints || [];
  if (!touchpoints.length) {
    container.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted); padding:0.5rem 0;">Nenhum ponto de contato cadastrado.</p>`;
    return;
  }

  // Calculate real average ratings if responses exist
  const tpScores = {};
  const tpCounts = {};

  responses.forEach(r => {
    if (r.touchpointRatings && typeof r.touchpointRatings === 'object') {
      Object.entries(r.touchpointRatings).forEach(([name, val]) => {
        const rating = Number(val);
        if (!isNaN(rating)) {
          tpScores[name] = (tpScores[name] || 0) + rating;
          tpCounts[name] = (tpCounts[name] || 0) + 1;
        }
      });
    }
  });

  container.innerHTML = touchpoints.map(tp => {
    const count = tpCounts[tp.name] || 0;
    const avg = count > 0 ? (tpScores[tp.name] / count).toFixed(1) : (tp.avgScore > 0 ? tp.avgScore.toFixed(1) : '—');
    const pct = avg !== '—' ? (parseFloat(avg) / 5) * 100 : 0;

    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; margin-bottom:0.25rem;">
          <span style="font-weight:600; color:var(--text-title);">${escapeHtml(tp.name)}</span>
          <span style="font-weight:700; color:var(--gold-primary);">${avg} <span style="font-size:0.7rem; color:var(--text-muted);">★</span></span>
        </div>
        <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--gold-secondary), var(--gold-primary)); border-radius:999px;"></div>
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem; display:flex; justify-content:space-between;">
          <span>${count > 0 ? `${count} avaliação(ões)` : 'Sem avaliações'}</span>
          <span>${escapeHtml(tp.category)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderInsightsSection(responses, metrics, openCases) {
  const container = document.getElementById('operationalInsightsList');
  if (!container) return;

  if (!responses.length) {
    container.innerHTML = `
      <div style="padding:1rem 0; text-align:center; color:var(--text-muted);">
        <p style="font-size:0.82rem; margin:0;">Os insights aparecerão conforme novas avaliações forem recebidas.</p>
      </div>
    `;
    return;
  }

  const items = [];

  if (openCases > 0) {
    items.push(`
      <div style="display:flex; align-items:flex-start; gap:0.5rem; background:rgba(224,93,93,0.1); border:1px solid rgba(224,93,93,0.2); padding:0.6rem 0.75rem; border-radius:6px;">
        <span>🔴</span>
        <div style="font-size:0.8rem; color:var(--text-title);">
          <strong>${openCases} detrator(es)</strong> aguardando acompanhamento na Central de Atenção.
        </div>
      </div>
    `);
  }

  if (metrics.nps >= 50) {
    items.push(`
      <div style="display:flex; align-items:flex-start; gap:0.5rem; background:rgba(60,187,119,0.1); border:1px solid rgba(60,187,119,0.2); padding:0.6rem 0.75rem; border-radius:6px;">
        <span>🟢</span>
        <div style="font-size:0.8rem; color:var(--text-title);">
          <strong>NPS em nível de Excelência (${metrics.nps > 0 ? '+' + metrics.nps : metrics.nps})</strong> com ${metrics.pPromoters}% de promotores.
        </div>
      </div>
    `);
  } else if (metrics.nps >= 0) {
    items.push(`
      <div style="display:flex; align-items:flex-start; gap:0.5rem; background:rgba(229,185,63,0.1); border:1px solid rgba(229,185,63,0.2); padding:0.6rem 0.75rem; border-radius:6px;">
        <span>🟡</span>
        <div style="font-size:0.8rem; color:var(--text-title);">
          <strong>NPS em Zona de Aperfeiçoamento (${metrics.nps})</strong>. Foque em converter clientes passivos.
        </div>
      </div>
    `);
  } else {
    items.push(`
      <div style="display:flex; align-items:flex-start; gap:0.5rem; background:rgba(224,93,93,0.1); border:1px solid rgba(224,93,93,0.2); padding:0.6rem 0.75rem; border-radius:6px;">
        <span>🔴</span>
        <div style="font-size:0.8rem; color:var(--text-title);">
          <strong>NPS Crítico (${metrics.nps})</strong>. Ações imediatas de recuperação são recomendadas.
        </div>
      </div>
    `);
  }

  container.innerHTML = items.join('');
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
    const commentText = r.comment ? escapeHtml(r.comment) : '<em style="color:var(--text-dim); font-size:0.78rem;">Sem comentário</em>';

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td><strong>${escapeHtml(r.student || 'Anônimo')}</strong></td>
      <td><span class="badge-status ${catClass}">${r.npsScore}</span></td>
      <td>${escapeHtml(unitName)}</td>
      <td><span style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">${escapeHtml(r.origin)}</span></td>
      <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${commentText}</td>
      <td>${new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
    `;

    tr.addEventListener('click', () => {
      store.selectedResponseId = r.id;
      document.querySelector('[data-mod="mod-responses"]')?.click();
    });

    tbody.appendChild(tr);
  });
}

