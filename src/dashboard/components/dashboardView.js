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

  let allUnitBaseResponses = [...store.localResponses];
  if (originFilter !== 'all') {
    allUnitBaseResponses = allUnitBaseResponses.filter(r => r.origin === originFilter);
  }

  let baseResponses = [...allUnitBaseResponses];
  if (unitFilter !== 'all') {
    baseResponses = baseResponses.filter(r => r.unitCode === unitFilter);
  }

  let networkResponses = [...allUnitBaseResponses];
  let responses = [...baseResponses];

  if (startDate) {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    if (!isNaN(startMs)) {
      responses = responses.filter(r => new Date(r.createdAt).getTime() >= startMs);
      networkResponses = networkResponses.filter(r => new Date(r.createdAt).getTime() >= startMs);
    }
  }
  if (endDate) {
    const endMs = new Date(endDate + 'T23:59:59.999').getTime();
    if (!isNaN(endMs)) {
      responses = responses.filter(r => new Date(r.createdAt).getTime() <= endMs);
      networkResponses = networkResponses.filter(r => new Date(r.createdAt).getTime() <= endMs);
    }
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

  // Render Monthly NPS Goal & Unit Collection Goal Progress
  renderMonthlyGoalsSection(responses, networkResponses, unitFilter);

  // Main Line Chart Render + Network Consolidated NPS & Units Breakdown
  renderMainNpsChart(responses, networkResponses, unitFilter);

  // Render Touchpoint Ranking & Insights
  renderTouchpointsSection(responses);
  renderInsightsSection(responses, metrics, openCases);

  renderRecentResponsesTable(responses);
}

const GOALS_STORAGE_KEY = 'garden_org_monthly_goals_v1';

export function getOrganizationGoals(orgId) {
  const key = `${GOALS_STORAGE_KEY}_${orgId || store.activeOrgId || 'default'}`;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        targetNps: Number(parsed.targetNps ?? 75),
        targetResponsesPerUnit: Math.max(1, Number(parsed.targetResponsesPerUnit ?? 30))
      };
    }
  } catch (_) {}
  return { targetNps: 75, targetResponsesPerUnit: 30 };
}

export function saveOrganizationGoals(orgId, { targetNps, targetResponsesPerUnit }) {
  const key = `${GOALS_STORAGE_KEY}_${orgId || store.activeOrgId || 'default'}`;
  const payload = {
    targetNps: Math.max(-100, Math.min(100, Number(targetNps ?? 75))),
    targetResponsesPerUnit: Math.max(1, Number(targetResponsesPerUnit ?? 30))
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(payload));
    }
  } catch (_) {}
  return payload;
}

function renderMonthlyGoalsSection(responses, networkResponses = [], unitFilter = 'all') {
  const container = document.getElementById('dashMonthlyGoalsBlock');
  if (!container) return;

  const activeOrg = store.getActiveOrg();
  const orgName = activeOrg?.tradeName || activeOrg?.name || 'Rede Garden Gold';
  const units = store.UNITS || [];
  const goals = getOrganizationGoals(store.activeOrgId);

  const networkMetrics = store.calculateNPS(networkResponses);
  const totalUnitsCount = Math.max(1, units.length);
  const networkResponseGoal = goals.targetResponsesPerUnit * totalUnitsCount;
  const networkCollectionPct = Math.min(100, Math.round((networkMetrics.total / networkResponseGoal) * 100));

  const targetNpsStr = goals.targetNps > 0 ? `+${goals.targetNps}` : `${goals.targetNps}`;
  const currentNetNpsStr = networkMetrics.total > 0
    ? (networkMetrics.nps > 0 ? `+${networkMetrics.nps}` : `${networkMetrics.nps}`)
    : '—';

  const isNpsGoalMet = networkMetrics.total > 0 && networkMetrics.nps >= goals.targetNps;
  const npsDeltaToGoal = networkMetrics.total > 0 ? networkMetrics.nps - goals.targetNps : null;

  // Map -100..+100 NPS to 0..100% progress bar relative to target
  const npsBarPct = networkMetrics.total === 0
    ? 0
    : Math.max(8, Math.min(100, Math.round(((networkMetrics.nps + 100) / (goals.targetNps + 100 || 1)) * 100)));

  const unitGoalRowsHtml = units.map(u => {
    const uResps = networkResponses.filter(r => r.unitCode === u.code);
    const uMetrics = store.calculateNPS(uResps);
    const uCount = uMetrics.total;
    const uPct = Math.min(100, Math.round((uCount / goals.targetResponsesPerUnit) * 100));
    const uNpsStr = uCount > 0 ? (uMetrics.nps > 0 ? `+${uMetrics.nps}` : `${uMetrics.nps}`) : '—';
    const uMetNps = uCount > 0 && uMetrics.nps >= goals.targetNps;
    const uMetVol = uCount >= goals.targetResponsesPerUnit;

    return `
      <div style="padding:0.65rem 0.85rem; background:rgba(255,255,255,0.02); border:1px solid ${unitFilter === u.code ? 'var(--gold-primary)' : 'var(--border-subtle)'}; border-radius:9px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-title);">📍 ${escapeHtml(u.name)}</span>
          <span style="font-size:0.74rem; font-weight:800; color:${uMetNps ? '#10b981' : (uCount > 0 ? 'var(--gold-primary)' : 'var(--text-muted)')};">
            NPS ${uNpsStr} ${uMetNps ? '🏆' : ''}
          </span>
        </div>
        <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden; margin-bottom:0.3rem;">
          <div style="height:100%; width:${uPct}%; background:${uMetVol ? '#10b981' : 'linear-gradient(90deg, var(--gold-secondary), var(--gold-primary))'}; border-radius:999px; transition:width 0.3s;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted);">
          <span>Coleta: <strong style="color:var(--text-main);">${uCount} / ${goals.targetResponsesPerUnit}</strong> aval.</span>
          <span style="font-weight:700; color:${uMetVol ? '#10b981' : 'var(--text-muted)'};">${uPct}% da meta</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.9rem;">
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:1.25rem;">🎯</span>
        <div>
          <h3 class="section-title" style="margin:0;">Metas do Ciclo: NPS da Rede & Coleta por Unidade</h3>
          <p class="section-subtitle" style="margin:0.1rem 0 0 0;">Acompanhamento da meta oficial de satisfação (${targetNpsStr}) e volume mensal de feedbacks por unidade</p>
        </div>
      </div>
      <button type="button" id="btnToggleGoalsEditor" class="btn-outline-gold btn-sm" style="font-size:0.74rem; padding:0.3rem 0.75rem;">
        ⚙️ Ajustar Metas
      </button>
    </div>

    <!-- Inline Goals Editor -->
    <div id="dashGoalsEditorDrawer" style="display:none; padding:0.95rem 1.1rem; background:rgba(13,17,23,0.88); border:1px solid var(--gold-primary); border-radius:10px; margin-bottom:1rem;">
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; align-items:end;">
        <div>
          <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Meta de NPS da Rede (-100 a +100)</label>
          <input type="number" id="inputGoalTargetNps" class="text-input" min="-100" max="100" value="${goals.targetNps}">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Meta Mensal de Avaliações por Unidade</label>
          <input type="number" id="inputGoalResponsesPerUnit" class="text-input" min="1" max="5000" value="${goals.targetResponsesPerUnit}">
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button type="button" id="btnSaveOrgGoals" class="btn-primary-gold btn-sm" style="padding:0.55rem 1.1rem; font-weight:700;">
            💾 Salvar Metas
          </button>
        </div>
      </div>
    </div>

    <!-- Main Network Goals Summary Row -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:0.9rem; margin-bottom:${units.length > 0 ? '0.95rem' : '0'};">
      <!-- Goal 1: Network NPS vs Target -->
      <div style="padding:0.85rem 1rem; background:rgba(255,255,255,0.025); border:1px solid var(--border-subtle); border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <span style="font-size:0.74rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">🏆 NPS Geral da Rede vs. Meta</span>
          <span class="badge-status ${isNpsGoalMet ? 'promoter' : 'passive'}" style="font-size:0.7rem;">
            ${networkMetrics.total === 0 ? 'Aguardando coletas' : (isNpsGoalMet ? '🎉 Meta Batida!' : `Faltam ${Math.abs(npsDeltaToGoal)} pts`)}
          </span>
        </div>
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:0.45rem;">
          <div>
            <span style="font-size:1.45rem; font-weight:800; font-family:var(--font-title); color:${isNpsGoalMet ? '#10b981' : 'var(--gold-primary)'};">${currentNetNpsStr}</span>
            <span style="font-size:0.78rem; color:var(--text-muted); margin-left:0.35rem;">/ Meta <strong>${targetNpsStr}</strong></span>
          </div>
          <span style="font-size:0.74rem; color:var(--text-muted);">Zona de Excelência</span>
        </div>
        <div style="height:7px; background:var(--bg-input); border-radius:999px; overflow:hidden;">
          <div style="height:100%; width:${npsBarPct}%; background:${isNpsGoalMet ? '#10b981' : 'linear-gradient(90deg, var(--gold-secondary), var(--gold-primary))'}; border-radius:999px;"></div>
        </div>
      </div>

      <!-- Goal 2: Network Collection Volume vs Target -->
      <div style="padding:0.85rem 1rem; background:rgba(255,255,255,0.025); border:1px solid var(--border-subtle); border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <span style="font-size:0.74rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">📊 Meta de Coleta da Rede (${escapeHtml(orgName)})</span>
          <span class="badge-status ${networkCollectionPct >= 100 ? 'promoter' : 'passive'}" style="font-size:0.7rem;">
            ${networkCollectionPct}% concluído
          </span>
        </div>
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:0.45rem;">
          <div>
            <span style="font-size:1.45rem; font-weight:800; font-family:var(--font-title); color:var(--text-title);">${networkMetrics.total}</span>
            <span style="font-size:0.78rem; color:var(--text-muted); margin-left:0.35rem;">/ Meta <strong>${networkResponseGoal} avaliações</strong> (${goals.targetResponsesPerUnit}/unid.)</span>
          </div>
        </div>
        <div style="height:7px; background:var(--bg-input); border-radius:999px; overflow:hidden;">
          <div style="height:100%; width:${networkCollectionPct}%; background:${networkCollectionPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #10b981)'}; border-radius:999px;"></div>
        </div>
      </div>
    </div>

    ${units.length > 0 ? `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.65rem;">
        ${unitGoalRowsHtml}
      </div>
    ` : ''}
  `;

  document.getElementById('btnToggleGoalsEditor')?.addEventListener('click', () => {
    const drawer = document.getElementById('dashGoalsEditorDrawer');
    if (drawer) {
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    }
  });

  document.getElementById('btnSaveOrgGoals')?.addEventListener('click', () => {
    const tNps = Number(document.getElementById('inputGoalTargetNps')?.value ?? 75);
    const tVol = Number(document.getElementById('inputGoalResponsesPerUnit')?.value ?? 30);
    saveOrganizationGoals(store.activeOrgId, {
      targetNps: isNaN(tNps) ? 75 : tNps,
      targetResponsesPerUnit: isNaN(tVol) || tVol < 1 ? 30 : tVol
    });
    updateDashboard();
  });
}

function buildDailyNpsSeries(respList) {
  const dateMap = {};
  const sorted = [...(respList || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  sorted.forEach(r => {
    const dStr = new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!dateMap[dStr]) dateMap[dStr] = [];
    dateMap[dStr].push(r);
  });

  return Object.keys(dateMap).map(date => {
    const dayResponses = dateMap[date];
    const dayMetrics = store.calculateNPS(dayResponses);
    return { date, nps: dayMetrics.nps, count: dayResponses.length };
  });
}

function renderMainNpsChart(responses, networkResponses = [], unitFilter = 'all') {
  const activeOrg = store.getActiveOrg();
  const orgName = activeOrg?.tradeName || activeOrg?.name || 'Rede Garden Gold';
  const networkMetrics = store.calculateNPS(networkResponses);
  const unitMetrics = store.calculateNPS(responses);

  const isUnitFiltered = unitFilter !== 'all';
  const unitObj = isUnitFiltered ? (store.UNITS || []).find(u => u.code === unitFilter) : null;
  const unitLabel = isUnitFiltered ? (unitObj?.name || unitFilter) : `Rede ${orgName} (Todas as Unidades)`;

  // 1. Update Header Legend Badge (#dashNetworkNpsHeaderBadge)
  const headerBadgeEl = document.getElementById('dashNetworkNpsHeaderBadge');
  if (headerBadgeEl) {
    const netScoreStr = networkMetrics.total > 0
      ? (networkMetrics.nps > 0 ? `+${networkMetrics.nps}` : `${networkMetrics.nps}`)
      : '—';
    const unitScoreStr = unitMetrics.total > 0
      ? (unitMetrics.nps > 0 ? `+${unitMetrics.nps}` : `${unitMetrics.nps}`)
      : '—';

    headerBadgeEl.innerHTML = `
      <div style="display:inline-flex; align-items:center; gap:0.45rem; padding:0.35rem 0.75rem; border-radius:999px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); font-size:0.76rem; color:#10b981; font-weight:700;" title="NPS consolidado somando todas as unidades da rede no período">
        <span>🏆 NPS Geral da Rede (${escapeHtml(orgName)}):</span>
        <span style="font-size:0.86rem; font-weight:800;">${netScoreStr}</span>
        <span style="font-size:0.7rem; opacity:0.85; font-weight:600;">(${networkMetrics.total} aval.)</span>
      </div>
      ${isUnitFiltered ? `
        <div style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.35rem 0.75rem; border-radius:999px; background:rgba(229,185,63,0.12); border:1px solid rgba(229,185,63,0.35); font-size:0.76rem; color:var(--gold-primary); font-weight:700;">
          <span>● ${escapeHtml(unitLabel)}:</span>
          <span style="font-size:0.86rem; font-weight:800;">${unitScoreStr}</span>
        </div>
      ` : ''}
    `;
  }

  // 2. Render SVG Line Chart with Network Benchmark
  const historyData = buildDailyNpsSeries(responses);
  const networkHistoryData = buildDailyNpsSeries(networkResponses);

  renderNpsLineChart('npsMainChartContainer', historyData, {
    networkNps: networkMetrics.total > 0 ? networkMetrics.nps : null,
    networkHistoryData,
    orgName,
    unitLabel,
    isUnitFiltered
  });

  // 3. Render Units vs. Network Consolidated NPS Strip (#dashUnitsNpsComparisonBar)
  const unitsBarEl = document.getElementById('dashUnitsNpsComparisonBar');
  if (unitsBarEl) {
    const units = store.UNITS || [];
    const netNpsStr = networkMetrics.total > 0
      ? (networkMetrics.nps > 0 ? `+${networkMetrics.nps}` : `${networkMetrics.nps}`)
      : '—';
    const netColor = networkMetrics.total === 0
      ? 'var(--text-muted)'
      : (networkMetrics.nps >= 50 ? 'var(--color-promoter)' : networkMetrics.nps >= 0 ? 'var(--gold-primary)' : 'var(--color-detractor)');

    const unitCardsHtml = units.map(u => {
      const uResps = networkResponses.filter(r => r.unitCode === u.code);
      const uMetrics = store.calculateNPS(uResps);
      const uScoreStr = uMetrics.total > 0 ? (uMetrics.nps > 0 ? `+${uMetrics.nps}` : `${uMetrics.nps}`) : '—';
      const isSelected = unitFilter === u.code;
      const scoreColor = uMetrics.total === 0
        ? 'var(--text-muted)'
        : (uMetrics.nps >= 50 ? 'var(--color-promoter)' : uMetrics.nps >= 0 ? 'var(--gold-primary)' : 'var(--color-detractor)');

      return `
        <button type="button" data-dash-unit-pill="${escapeHtml(u.code)}" style="text-align:left; padding:0.55rem 0.75rem; border-radius:9px; cursor:pointer; background:${isSelected ? 'rgba(229,185,63,0.12)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; transition:all 0.15s;">
          <div style="overflow:hidden;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-title); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📍 ${escapeHtml(u.name)}</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">${uMetrics.total} aval. no período</div>
          </div>
          <div style="font-size:0.95rem; font-weight:800; font-family:var(--font-title); color:${scoreColor}; flex-shrink:0;">
            ${uScoreStr}
          </div>
        </button>
      `;
    }).join('');

    unitsBarEl.innerHTML = `
      <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.55rem; display:flex; justify-content:space-between; align-items:center;">
        <span>Comparativo: NPS Geral da Rede vs. Unidades</span>
        <span style="font-weight:500; text-transform:none;">Clique para filtrar</span>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap:0.5rem;">
        <button type="button" data-dash-unit-pill="all" style="text-align:left; padding:0.55rem 0.8rem; border-radius:9px; cursor:pointer; background:${unitFilter === 'all' ? 'linear-gradient(135deg, rgba(229,185,63,0.18), rgba(16,185,129,0.10))' : 'rgba(16,185,129,0.06)'}; border:1px solid ${unitFilter === 'all' ? 'var(--gold-primary)' : 'rgba(16,185,129,0.3)'}; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; transition:all 0.15s;">
          <div style="overflow:hidden;">
            <div style="font-size:0.76rem; font-weight:800; color:var(--gold-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">🏆 NPS Geral (${escapeHtml(orgName)})</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Todas as unidades (${networkMetrics.total} aval.)</div>
          </div>
          <div style="font-size:1.05rem; font-weight:800; font-family:var(--font-title); color:${netColor}; flex-shrink:0;">
            ${netNpsStr}
          </div>
        </button>
        ${unitCardsHtml}
      </div>
    `;

    unitsBarEl.querySelectorAll('[data-dash-unit-pill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUnit = btn.getAttribute('data-dash-unit-pill') || 'all';
        const selectUnitEl = document.getElementById('filterUnit');
        if (selectUnitEl) {
          selectUnitEl.value = targetUnit;
          updateDashboard();
        }
      });
    });
  }
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


