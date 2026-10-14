/**
 * Executive Dashboard View Component Logic & Data Binding
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass, getNpsCategoryLabel } from '../../surveys/services/npsService.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { renderNpsLineChart, renderSparklineSvg, renderDonutSvg } from './chartRenderer.js';
import { updateTenantSetupChecklist } from './tenantSetupChecklist.js';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function getMonthKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(ymKey, short = false) {
  const [yStr, mStr] = (ymKey || '').split('-');
  const y = parseInt(yStr, 10);
  const mIdx = parseInt(mStr, 10) - 1;
  if (isNaN(y) || isNaN(mIdx) || mIdx < 0 || mIdx > 11) return ymKey;
  return `${short ? MONTH_SHORT_PT[mIdx] : MONTH_NAMES_PT[mIdx]}/${y}`;
}

function getMonthBounds(ymKey) {
  const [yStr, mStr] = (ymKey || '').split('-');
  const y = parseInt(yStr, 10);
  const mIdx = parseInt(mStr, 10) - 1;
  const firstDay = new Date(y, mIdx, 1);
  const lastDay = new Date(y, mIdx + 1, 0);
  const toIsoDate = (d) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };
  return {
    startStr: toIsoDate(firstDay),
    endStr: toIsoDate(lastDay),
    prevMonthKey: getMonthKey(new Date(y, mIdx - 1, 1))
  };
}

function populateReferenceMonthSelect() {
  const selectEl = document.getElementById('filterReferenceMonth');
  if (!selectEl) return;

  const currentVal = selectEl.value || 'current_month';
  const now = new Date();
  const currentYm = getMonthKey(now);
  const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // Count responses per month
  const monthCounts = {};
  (store.localResponses || []).forEach(r => {
    if (!r.createdAt) return;
    const d = new Date(r.createdAt);
    if (!isNaN(d.getTime())) {
      const ym = getMonthKey(d);
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    }
  });

  // Collect last 12 calendar months + any older months with data
  const monthKeysSet = new Set();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeysSet.add(getMonthKey(d));
  }
  Object.keys(monthCounts).forEach(ym => monthKeysSet.add(ym));

  const sortedMonths = Array.from(monthKeysSet).sort((a, b) => b.localeCompare(a));

  let html = '';
  sortedMonths.forEach(ym => {
    const count = monthCounts[ym] || 0;
    const countSuffix = count > 0 ? ` (${count} aval.)` : '';
    if (ym === currentYm) {
      html += `<option value="current_month">📅 ${formatMonthLabel(ym)} — Mês Atual${countSuffix}</option>`;
    } else if (ym === prevYm) {
      html += `<option value="prev_month">📅 ${formatMonthLabel(ym)} — Mês Anterior${countSuffix}</option>`;
    } else {
      html += `<option value="month:${ym}">📁 ${formatMonthLabel(ym)}${countSuffix}</option>`;
    }
  });

  html += `<option value="all">📊 Acumulado Geral (Todos os meses)</option>`;
  selectEl.innerHTML = html;

  if (Array.from(selectEl.options).some(o => o.value === currentVal)) {
    selectEl.value = currentVal;
  } else {
    selectEl.value = 'current_month';
  }
}

function setActivePillUi(periodValue) {
  const periodBtns = document.querySelectorAll('.btn-period-pill');
  periodBtns.forEach(b => {
    const isMatch = b.getAttribute('data-period') === periodValue;
    b.classList.toggle('active', isMatch);
    b.style.background = isMatch ? 'var(--gold-subtle)' : 'transparent';
    b.style.color = isMatch ? 'var(--gold-primary)' : 'var(--text-muted)';
    b.style.fontWeight = isMatch ? '600' : '500';
  });
}

export function setupAdminDashboard() {
  const filterUnit = document.getElementById('filterUnit');
  const filterOrigin = document.getElementById('filterOrigin');
  const filterRole = document.getElementById('filterRoleSim');
  const filterRefMonth = document.getElementById('filterReferenceMonth');

  [filterUnit, filterOrigin, filterRole].forEach(el => {
    if (el) el.addEventListener('change', () => updateDashboard());
  });

  populateReferenceMonthSelect();

  if (filterRefMonth) {
    filterRefMonth.addEventListener('change', () => {
      const val = filterRefMonth.value;
      setActivePillUi(val);
      filterByDays(val);
    });
  }

  // Period Pills Handler
  const periodBtns = document.querySelectorAll('.btn-period-pill');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.getAttribute('data-period');
      setActivePillUi(period);
      if (filterRefMonth) {
        if (period === 'current_month' || period === 'prev_month' || period === 'all') {
          filterRefMonth.value = period;
        }
      }
      filterByDays(period);
    });
  });

  // Set default dates to Current Month immediately so a new month starts fresh!
  applyPeriodDates('current_month');

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

function applyPeriodDates(period) {
  const startEl = document.getElementById('filterStartDate');
  const endEl = document.getElementById('filterEndDate');
  if (startEl) startEl.dataset.activePeriod = period;

  const now = new Date();
  if (period === 'all') {
    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
  } else if (period === 'current_month') {
    const ym = getMonthKey(now);
    const { startStr, endStr } = getMonthBounds(ym);
    if (startEl) startEl.value = startStr;
    if (endEl) endEl.value = endStr;
  } else if (period === 'prev_month') {
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ym = getMonthKey(prevDate);
    const { startStr, endStr } = getMonthBounds(ym);
    if (startEl) startEl.value = startStr;
    if (endEl) endEl.value = endStr;
  } else if (period && period.startsWith('month:')) {
    const ym = period.replace('month:', '');
    const { startStr, endStr } = getMonthBounds(ym);
    if (startEl) startEl.value = startStr;
    if (endEl) endEl.value = endStr;
  } else {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - parseInt(period, 10));
    if (startEl) startEl.value = start.toISOString().split('T')[0];
    if (endEl) endEl.value = end.toISOString().split('T')[0];
  }
}

function filterByDays(period) {
  applyPeriodDates(period);
  updateDashboard();
}

function openQrModal() {
  const modal = document.getElementById('modalNewQRCode');
  if (modal) modal.style.display = 'flex';
}

export function updateDashboard() {
  updateTenantSetupChecklist();
  populateReferenceMonthSelect();

  const startEl = document.getElementById('filterStartDate');
  const endEl = document.getElementById('filterEndDate');

  // Ensure default current_month is applied if never initialized
  if (startEl && !startEl.dataset.activePeriod) {
    applyPeriodDates('current_month');
  }

  const activePeriod = startEl?.dataset.activePeriod || 'current_month';
  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const originFilter = document.getElementById('filterOrigin')?.value || 'all';
  const startDate = startEl?.value;
  const endDate = endEl?.value;

  let baseResponses = [...store.localResponses];

  if (unitFilter !== 'all') {
    baseResponses = baseResponses.filter(r => r.unitCode === unitFilter);
  }
  if (originFilter !== 'all') {
    baseResponses = baseResponses.filter(r => r.origin === originFilter);
  }

  let responses = [...baseResponses];

  if (startDate) {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    if (!isNaN(startMs)) responses = responses.filter(r => new Date(r.createdAt).getTime() >= startMs);
  }
  if (endDate) {
    const endMs = new Date(endDate + 'T23:59:59.999').getTime();
    if (!isNaN(endMs)) responses = responses.filter(r => new Date(r.createdAt).getTime() <= endMs);
  }

  const metrics = store.calculateNPS(responses);

  // Consistently filter follow-up cases by unit and date range
  let filteredCases = [...store.followUpCases];
  if (unitFilter !== 'all') {
    filteredCases = filteredCases.filter(c => c.unitCode === unitFilter);
  }
  if (startDate) {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    if (!isNaN(startMs)) filteredCases = filteredCases.filter(c => new Date(c.createdAt).getTime() >= startMs);
  }
  if (endDate) {
    const endMs = new Date(endDate + 'T23:59:59.999').getTime();
    if (!isNaN(endMs)) filteredCases = filteredCases.filter(c => new Date(c.createdAt).getTime() <= endMs);
  }

  // Update KPI Cards
  const npsCardLabel = document.getElementById('dashNpsCardLabel');
  const valNps = document.getElementById('dashValNpsScore');
  const badgeStatus = document.getElementById('dashBadgeNpsStatus');
  const npsCompEl = document.getElementById('dashNpsComparison');
  const valTotal = document.getElementById('dashValTotalResponses');
  const resCompEl = document.getElementById('dashResComparison');
  const valPromoters = document.getElementById('dashValPromoters');
  const valDetractors = document.getElementById('dashValDetractors');
  const openCasesCount = document.getElementById('dashOpenCasesCount');
  const npsSparklineEl = document.getElementById('dashNpsSparkline');
  const resSparklineEl = document.getElementById('dashResSparkline');

  if (valNps) valNps.textContent = metrics.total > 0 ? (metrics.nps > 0 ? `+${metrics.nps}` : `${metrics.nps}`) : '—';
  if (badgeStatus) {
    badgeStatus.textContent = metrics.total > 0 ? metrics.status : 'CICLO ZERADO';
    badgeStatus.className = `badge-status ${metrics.total > 0 ? (metrics.nps >= 50 ? 'promoter' : metrics.nps >= 0 ? 'passive' : 'detractor') : 'passive'}`;
  }
  if (valTotal) valTotal.textContent = metrics.total;
  if (valPromoters) valPromoters.textContent = `${metrics.pPromoters}%`;
  if (valDetractors) valDetractors.textContent = `${metrics.detractors}`;

  // Compute monthly cycle label and previous month comparison
  const now = new Date();
  let selectedYm = null;
  if (activePeriod === 'current_month') {
    selectedYm = getMonthKey(now);
  } else if (activePeriod === 'prev_month') {
    selectedYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  } else if (activePeriod.startsWith('month:')) {
    selectedYm = activePeriod.replace('month:', '');
  }

  if (selectedYm) {
    const isCurrentMonth = selectedYm === getMonthKey(now);
    if (npsCardLabel) {
      npsCardLabel.textContent = isCurrentMonth
        ? `NPS DO MÊS (${formatMonthLabel(selectedYm, true).toUpperCase()})`
        : `NPS FECHADO (${formatMonthLabel(selectedYm, true).toUpperCase()})`;
    }
    if (resCompEl) {
      resCompEl.textContent = isCurrentMonth
        ? `Ciclo vigente • ${formatMonthLabel(selectedYm)}`
        : `Histórico salvo • ${formatMonthLabel(selectedYm)}`;
    }

    // Calculate previous month NPS for comparison
    const { prevMonthKey } = getMonthBounds(selectedYm);
    const prevBounds = getMonthBounds(prevMonthKey);
    const prevStartMs = new Date(prevBounds.startStr + 'T00:00:00').getTime();
    const prevEndMs = new Date(prevBounds.endStr + 'T23:59:59.999').getTime();
    const prevResponses = baseResponses.filter(r => {
      const t = new Date(r.createdAt).getTime();
      return t >= prevStartMs && t <= prevEndMs;
    });

    if (npsCompEl) {
      if (prevResponses.length > 0) {
        const prevMetrics = store.calculateNPS(prevResponses);
        const prevScoreStr = prevMetrics.nps > 0 ? `+${prevMetrics.nps}` : `${prevMetrics.nps}`;
        npsCompEl.innerHTML = `Mês ant. (${formatMonthLabel(prevMonthKey, true)}): <strong>NPS ${prevScoreStr}</strong> (${prevResponses.length} aval.)`;
      } else {
        npsCompEl.textContent = isCurrentMonth
          ? `Ciclo de ${formatMonthLabel(selectedYm)} em andamento`
          : `Sem registros em ${formatMonthLabel(prevMonthKey, true)}`;
      }
    }
  } else {
    if (npsCardLabel) npsCardLabel.textContent = activePeriod === 'all' ? 'NPS ACUMULADO GERAL' : `NPS (${activePeriod} DIAS)`;
    if (npsCompEl) npsCompEl.textContent = activePeriod === 'all' ? 'Todo o histórico salvo' : `Últimos ${activePeriod} dias corridos`;
    if (resCompEl) resCompEl.textContent = `${ baseResponses.length } no histórico total`;
  }

  const openCases = filteredCases.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  if (openCasesCount) openCasesCount.textContent = `${openCases} abertos`;

  // Update Student Evolution KPI Card
  const activeOrg = store.getActiveOrg();
  const students = activeOrg?.students || [];
  const valTracked = document.getElementById('dashValTrackedStudents');
  const valDelta = document.getElementById('dashValAvgEvolutionDelta');

  let studentDeltas = [];
  students.forEach(st => {
    const stResponses = responses.filter(r => r.studentId === st.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (stResponses.length > 1) {
      const firstScore = stResponses[0].npsScore;
      const latestScore = stResponses[stResponses.length - 1].npsScore;
      studentDeltas.push(latestScore - firstScore);
    }
  });

  const avgStudentDelta = studentDeltas.length > 0 ? (studentDeltas.reduce((a, b) => a + b, 0) / studentDeltas.length).toFixed(1) : '0.0';
  if (valTracked) valTracked.textContent = students.length;
  if (valDelta) {
    valDelta.textContent = Number(avgStudentDelta) > 0 ? `+${avgStudentDelta}` : `${avgStudentDelta}`;
    valDelta.style.color = Number(avgStudentDelta) >= 0 ? '#10b981' : '#ef4444';
  }

  const cardEvolution = document.getElementById('dashCardStudentEvolution');
  if (cardEvolution && !cardEvolution.__hasClick) {
    cardEvolution.__hasClick = true;
    cardEvolution.addEventListener('click', () => {
      document.querySelector('[data-mod="mod-student-evolution"]')?.click();
    });
  }

  // Render Sparklines if history exists (using real response volume per day)
  if (responses.length >= 2) {
    const sorted = [...responses].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const npsPoints = sorted.map(r => r.npsScore);
    if (npsSparklineEl) npsSparklineEl.innerHTML = renderSparklineSvg(npsPoints);

    // Group real response volume per date
    const dateVolumeMap = {};
    sorted.forEach(r => {
      const d = new Date(r.createdAt).toISOString().split('T')[0];
      dateVolumeMap[d] = (dateVolumeMap[d] || 0) + 1;
    });
    const dailyVolumes = Object.values(dateVolumeMap);
    if (resSparklineEl) resSparklineEl.innerHTML = dailyVolumes.length >= 2 ? renderSparklineSvg(dailyVolumes) : '';
  } else {
    if (npsSparklineEl) npsSparklineEl.innerHTML = '';
    if (resSparklineEl) resSparklineEl.innerHTML = '';
  }

  // Update SVG Donut & Distribution Bars
  const donutContainer = document.getElementById('dashDonutContainer');
  if (donutContainer) {
    donutContainer.innerHTML = renderDonutSvg({
      total: metrics.total,
      promoters: metrics.promoters,
      passives: metrics.passives,
      detractors: metrics.detractors,
      nps: metrics.nps
    });
  }

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
    if (attentionSub) attentionSub.textContent = 'Existem casos de detratores que precisam da atenção da equipe no período selecionado.';
    if (attentionIcon) attentionIcon.textContent = '🚨';
    if (attentionCta) attentionCta.style.display = 'inline-block';
  } else {
    if (attentionTitle) attentionTitle.textContent = 'Tudo em dia';
    if (attentionSub) attentionSub.textContent = 'Nenhuma avaliação precisa de atenção no momento para os filtros selecionados.';
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
    return { date, nps: dayMetrics.nps, count: dayResponses.length };
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

  // Calculate real average ratings using Touchpoint ID (primary) or Name (fallback)
  const tpScores = {};
  const tpCounts = {};

  responses.forEach(r => {
    if (r.touchpointRatings && typeof r.touchpointRatings === 'object') {
      Object.entries(r.touchpointRatings).forEach(([key, val]) => {
        const rating = Number(val);
        if (!isNaN(rating)) {
          tpScores[key] = (tpScores[key] || 0) + rating;
          tpCounts[key] = (tpCounts[key] || 0) + 1;
        }
      });
    }
  });

  container.innerHTML = touchpoints.map(tp => {
    const count = (tpCounts[tp.id] || tpCounts[tp.name]) || 0;
    const totalScore = (tpScores[tp.id] || tpScores[tp.name]) || 0;
    const avg = count > 0 ? (totalScore / count).toFixed(1) : (tp.avgScore > 0 ? tp.avgScore.toFixed(1) : '—');
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
        <p style="font-size:0.82rem; margin:0;">Não há dados suficientes para gerar insights neste período.</p>
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
          <strong>NPS de ${metrics.nps > 0 ? '+' + metrics.nps : metrics.nps}</strong> no período analisado (${metrics.pPromoters}% de promotores).
        </div>
      </div>
    `);
  } else if (metrics.nps >= 0) {
    items.push(`
      <div style="display:flex; align-items:flex-start; gap:0.5rem; background:rgba(229,185,63,0.1); border:1px solid rgba(229,185,63,0.2); padding:0.6rem 0.75rem; border-radius:6px;">
        <span>🟡</span>
        <div style="font-size:0.8rem; color:var(--text-title);">
          <strong>NPS de ${metrics.nps}</strong> no período analisado. Oportunidade de conversão de clientes passivos.
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


