/**
 * Reports Summary & Executive Analytics View Component
 * Computes analytics strictly from production Store data (Supabase source of truth).
 */

import { store } from '../../app/app-state/store.js';
import { calculateNPS } from '../../surveys/services/npsService.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { showToast } from '../../shared/feedback/toast.js';
import { resolveTouchpointMeta } from '../../students/components/studentTouchpointEvolution.js';
import { getOrganizationGoals } from '../../dashboard/components/dashboardView.js';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getMonthKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(ymKey) {
  const [yStr, mStr] = (ymKey || '').split('-');
  const y = parseInt(yStr, 10);
  const mIdx = parseInt(mStr, 10) - 1;
  if (isNaN(y) || isNaN(mIdx) || mIdx < 0 || mIdx > 11) return ymKey;
  return `${MONTH_NAMES_PT[mIdx]}/${y}`;
}

function getMonthRangeMs(ymKey) {
  const [yStr, mStr] = (ymKey || '').split('-');
  const y = parseInt(yStr, 10);
  const mIdx = parseInt(mStr, 10) - 1;
  const startMs = new Date(y, mIdx, 1, 0, 0, 0, 0).getTime();
  const endMs = new Date(y, mIdx + 1, 0, 23, 59, 59, 999).getTime();
  return { startMs, endMs };
}

export function renderReportsSummary() {
  setupReportFilterListeners();

  const periodSelect = document.getElementById('repFilterPeriod');
  const unitSelect = document.getElementById('repFilterUnit');

  populateUnitFilterOptions(unitSelect);
  populatePeriodFilterOptions(periodSelect);

  const selectedPeriod = periodSelect ? periodSelect.value : 'month';
  const selectedUnit = unitSelect ? unitSelect.value : 'all';

  // 1. Filter Responses by Unit & Period
  const filteredResponses = filterResponses(store.localResponses || [], selectedPeriod, selectedUnit);
  const networkPeriodResponses = filterResponses(store.localResponses || [], selectedPeriod, 'all');
  const filteredCases = filterCases(store.followUpCases || [], selectedUnit);

  // 2. Render Bloque 1: KPI Resumo
  renderBlock1Kpis(filteredResponses, filteredCases, selectedPeriod);

  // 2b. Render Consolidated Monthly History Table
  renderMonthlyHistoryTable(store.localResponses || [], selectedUnit, selectedPeriod);

  // 3. Render Bloque 2: Evolução Chart
  renderBlock2Chart(filteredResponses);

  // 4. Render Bloque 3: Distribuição NPS
  renderBlock3Distribution(filteredResponses);

  // 5. Render Bloque 4: Touchpoints Ranking
  renderBlock4Touchpoints(filteredResponses);

  // 6. Render Bloque 5: Acompanhamentos Metrics
  renderBlock5Cases(filteredCases);

  // 7. Render Bloque 6: Insights
  renderBlock6Insights(filteredResponses, filteredCases);

  // 8. Render Bloque 7: Evolução dos Alunos
  renderBlock7StudentEvolution(filteredResponses);

  // CSV Export Listener
  const btnExport = document.getElementById('btnExportCsv');
  if (btnExport) {
    btnExport.onclick = () => exportToCsv(filteredResponses);
  }

  // Print / Executive PDF Export Listener
  const btnPrint = document.getElementById('btnPrintReport');
  if (btnPrint) {
    btnPrint.onclick = () => {
      openExecutivePdfReport({
        responses: filteredResponses,
        networkResponses: networkPeriodResponses,
        cases: filteredCases,
        period: selectedPeriod,
        unitCode: selectedUnit
      });
    };
  }
}

function setupReportFilterListeners() {
  const periodSelect = document.getElementById('repFilterPeriod');
  const unitSelect = document.getElementById('repFilterUnit');

  if (periodSelect && !periodSelect.dataset.listenerAttached) {
    periodSelect.dataset.listenerAttached = 'true';
    periodSelect.addEventListener('change', () => renderReportsSummary());
  }

  if (unitSelect && !unitSelect.dataset.listenerAttached) {
    unitSelect.dataset.listenerAttached = 'true';
    unitSelect.addEventListener('change', () => renderReportsSummary());
  }
}

function populatePeriodFilterOptions(selectEl) {
  if (!selectEl) return;
  const currentVal = selectEl.value || 'month';
  const now = new Date();
  const currentYm = getMonthKey(now);
  const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const monthCounts = {};
  (store.localResponses || []).forEach(r => {
    const rawDate = r.createdAt || r.created_at;
    if (!rawDate) return;
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const ym = getMonthKey(d);
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    }
  });

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
      html += `<option value="month">📅 ${formatMonthLabel(ym)} — Este Mês${countSuffix}</option>`;
    } else if (ym === prevYm) {
      html += `<option value="prev_month">📅 ${formatMonthLabel(ym)} — Mês Anterior${countSuffix}</option>`;
    } else {
      html += `<option value="month:${ym}">📁 ${formatMonthLabel(ym)} (Salvo)${countSuffix}</option>`;
    }
  });

  html += `
    <option value="30d">⏱️ Últimos 30 dias corridos</option>
    <option value="7d">⏱️ Últimos 7 dias corridos</option>
    <option value="all">📊 Todo o Período (Acumulado)</option>
  `;

  selectEl.innerHTML = html;
  if (Array.from(selectEl.options).some(o => o.value === currentVal)) {
    selectEl.value = currentVal;
  } else {
    selectEl.value = 'month';
  }
}

function populateUnitFilterOptions(selectEl) {
  if (!selectEl) return;
  const currentVal = selectEl.value;
  const activeOrg = store.getActiveOrg();
  const units = activeOrg?.units || [];

  selectEl.innerHTML = '<option value="all">Todas as Unidades</option>';
  units.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.code || u.id;
    opt.textContent = u.name;
    if (opt.value === currentVal) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function filterResponses(responses, period, unitCode) {
  let list = [...responses];

  if (unitCode && unitCode !== 'all') {
    list = list.filter(r => r.unitCode === unitCode || r.unit_code === unitCode);
  }

  if (period && period !== 'all') {
    const now = new Date();
    const nowMs = now.getTime();

    if (period === '7d' || period === '30d') {
      const maxAgeMs = (period === '7d' ? 7 : 30) * 24 * 3600 * 1000;
      list = list.filter(r => {
        const createdTime = new Date(r.createdAt || r.created_at).getTime();
        return (nowMs - createdTime) <= maxAgeMs;
      });
    } else if (period === 'month') {
      const { startMs, endMs } = getMonthRangeMs(getMonthKey(now));
      list = list.filter(r => {
        const t = new Date(r.createdAt || r.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
    } else if (period === 'prev_month') {
      const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const { startMs, endMs } = getMonthRangeMs(prevYm);
      list = list.filter(r => {
        const t = new Date(r.createdAt || r.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
    } else if (period.startsWith('month:')) {
      const ym = period.replace('month:', '');
      const { startMs, endMs } = getMonthRangeMs(ym);
      list = list.filter(r => {
        const t = new Date(r.createdAt || r.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
    }
  }

  return list;
}

function filterCases(cases, unitCode) {
  if (!unitCode || unitCode === 'all') return cases;
  return cases.filter(c => c.unitCode === unitCode || c.unit_code === unitCode);
}

function renderMonthlyHistoryTable(allResponses, unitCode, activePeriod) {
  const tbody = document.getElementById('repMonthlyHistoryBody');
  if (!tbody) return;

  let unitResponses = [...allResponses];
  if (unitCode && unitCode !== 'all') {
    unitResponses = unitResponses.filter(r => r.unitCode === unitCode || r.unit_code === unitCode);
  }

  const now = new Date();
  const currentYm = getMonthKey(now);
  const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // Group responses by YYYY-MM
  const byMonth = {};
  unitResponses.forEach(r => {
    const rawDate = r.createdAt || r.created_at;
    if (!rawDate) return;
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const ym = getMonthKey(d);
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push(r);
    }
  });

  // Always show at least the last 6 calendar months + any older months with data
  const monthSet = new Set();
  for (let i = 0; i < 6; i++) {
    monthSet.add(getMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  Object.keys(byMonth).forEach(ym => monthSet.add(ym));

  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  tbody.innerHTML = sortedMonths.map(ym => {
    const monthList = byMonth[ym] || [];
    const total = monthList.length;
    const isCurrent = ym === currentYm;
    const periodVal = isCurrent ? 'month' : (ym === prevYm ? 'prev_month' : `month:${ym}`);
    const isSelected = activePeriod === periodVal;

    let npsBadgeHtml = '<span class="badge-status passive">Sem dados</span>';
    let promStr = '0 (0%)';
    let passStr = '0 (0%)';
    let detStr = '0 (0%)';

    if (total > 0) {
      const scores = monthList.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
      const nps = calculateNPS(scores);
      const scoreFormatted = nps.score > 0 ? `+${nps.score}` : `${nps.score}`;
      npsBadgeHtml = `<span class="badge-status ${nps.zoneClass || 'promoter'}" style="font-size:0.82rem; font-weight:800;">NPS ${scoreFormatted} • ${nps.zone}</span>`;

      const prom = scores.filter(s => s >= 9).length;
      const pass = scores.filter(s => s >= 7 && s <= 8).length;
      const det = scores.filter(s => s <= 6).length;

      promStr = `<span style="color:var(--color-promoter); font-weight:600;">${prom} (${Math.round((prom / total) * 100)}%)</span>`;
      passStr = `<span style="color:var(--color-passive); font-weight:600;">${pass} (${Math.round((pass / total) * 100)}%)</span>`;
      detStr = `<span style="color:var(--color-detractor); font-weight:600;">${det} (${Math.round((det / total) * 100)}%)</span>`;
    }

    const cycleBadge = isCurrent
      ? `<span class="badge-status promoter" style="font-size:0.7rem;">🟢 Ciclo Vigente</span>`
      : `<span class="badge-status passive" style="font-size:0.7rem;">🔒 Histórico Salvo</span>`;

    return `
      <tr style="${isSelected ? 'background:rgba(212,175,55,0.08);' : ''}">
        <td>
          <strong style="color:var(--text-title);">${escapeHtml(formatMonthLabel(ym))}</strong>
          ${isSelected ? '<span style="font-size:0.68rem; color:var(--gold-primary); margin-left:0.4rem; font-weight:700;">(Visualizando)</span>' : ''}
        </td>
        <td>${cycleBadge}</td>
        <td>${npsBadgeHtml}</td>
        <td><strong>${total}</strong> aval.</td>
        <td>${promStr}</td>
        <td>${passStr}</td>
        <td>${detStr}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button type="button" class="btn-secondary btn-sm btn-view-month-report" data-period="${periodVal}" style="padding:0.25rem 0.55rem; font-size:0.74rem; margin-right:0.3rem;">
            🔍 Ver Mês
          </button>
          <button type="button" class="btn-outline-gold btn-sm btn-print-month-pdf" data-period="${periodVal}" style="padding:0.25rem 0.55rem; font-size:0.74rem; margin-right:0.3rem;">
            🖨️ PDF
          </button>
          <button type="button" class="btn-ghost btn-sm btn-export-month-csv" data-ym="${ym}" style="padding:0.25rem 0.55rem; font-size:0.74rem;" ${total === 0 ? 'disabled' : ''}>
            📥 CSV
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-view-month-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPeriod = btn.getAttribute('data-period');
      const periodSelect = document.getElementById('repFilterPeriod');
      if (periodSelect && targetPeriod) {
        periodSelect.value = targetPeriod;
        renderReportsSummary();
        showToast('📅 Exibindo relatório do mês selecionado.', 'info');
      }
    });
  });

  tbody.querySelectorAll('.btn-print-month-pdf').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPeriod = btn.getAttribute('data-period') || 'month';
      const mResps = filterResponses(allResponses, targetPeriod, unitCode);
      const mNetResps = filterResponses(allResponses, targetPeriod, 'all');
      const mCases = filterCases(store.followUpCases || [], unitCode);
      openExecutivePdfReport({
        responses: mResps,
        networkResponses: mNetResps,
        cases: mCases,
        period: targetPeriod,
        unitCode
      });
    });
  });

  tbody.querySelectorAll('.btn-export-month-csv').forEach(btn => {
    btn.addEventListener('click', () => {
      const ym = btn.getAttribute('data-ym');
      const monthList = byMonth[ym] || [];
      exportToCsv(monthList);
    });
  });
}

function renderBlock1Kpis(responses, cases, selectedPeriod = 'month') {
  const repNpsScore = document.getElementById('repNpsScore');
  const repNpsBadge = document.getElementById('repNpsBadge');
  const repNpsSubtitle = document.getElementById('repNpsSubtitle');
  const repTotalCount = document.getElementById('repTotalCount');
  const repPromotersCount = document.getElementById('repPromotersCount');
  const repPromotersPct = document.getElementById('repPromotersPct');
  const repPassivesCount = document.getElementById('repPassivesCount');
  const repPassivesPct = document.getElementById('repPassivesPct');
  const repDetractorsCount = document.getElementById('repDetractorsCount');
  const repDetractorsPct = document.getElementById('repDetractorsPct');
  const repPendingCases = document.getElementById('repPendingCases');
  const repResolvedCasesBadge = document.getElementById('repResolvedCasesBadge');

  const now = new Date();
  if (repNpsSubtitle) {
    if (selectedPeriod === 'month') {
      repNpsSubtitle.textContent = `Ciclo vigente (${formatMonthLabel(getMonthKey(now))})`;
    } else if (selectedPeriod === 'prev_month') {
      const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      repNpsSubtitle.textContent = `Ciclo fechado (${formatMonthLabel(prevYm)})`;
    } else if (selectedPeriod?.startsWith('month:')) {
      repNpsSubtitle.textContent = `Ciclo salvo (${formatMonthLabel(selectedPeriod.replace('month:', ''))})`;
    } else {
      repNpsSubtitle.textContent = selectedPeriod === 'all' ? 'Acumulado de todos os meses' : 'Calculado no período';
    }
  }

  const total = responses.length;
  if (repTotalCount) repTotalCount.textContent = total;

  if (total === 0) {
    if (repNpsScore) repNpsScore.textContent = '--';
    if (repNpsBadge) {
      repNpsBadge.textContent = 'Ciclo Zerado';
      repNpsBadge.className = 'badge-status passive';
    }
    if (repPromotersCount) repPromotersCount.textContent = '0';
    if (repPromotersPct) repPromotersPct.textContent = '0%';
    if (repPassivesCount) repPassivesCount.textContent = '0';
    if (repPassivesPct) repPassivesPct.textContent = '0%';
    if (repDetractorsCount) repDetractorsCount.textContent = '0';
    if (repDetractorsPct) repDetractorsPct.textContent = '0%';
  } else {
    const scores = responses.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
    const nps = calculateNPS(scores);

    if (repNpsScore) repNpsScore.textContent = nps.score;
    if (repNpsBadge) {
      repNpsBadge.textContent = nps.zone;
      repNpsBadge.className = `badge-status ${nps.zoneClass || 'promoter'}`;
    }

    const promoters = scores.filter(s => s >= 9).length;
    const passives = scores.filter(s => s >= 7 && s <= 8).length;
    const detractors = scores.filter(s => s <= 6).length;

    if (repPromotersCount) repPromotersCount.textContent = promoters;
    if (repPromotersPct) repPromotersPct.textContent = `${Math.round((promoters / total) * 100)}%`;

    if (repPassivesCount) repPassivesCount.textContent = passives;
    if (repPassivesPct) repPassivesPct.textContent = `${Math.round((passives / total) * 100)}%`;

    if (repDetractorsCount) repDetractorsCount.textContent = detractors;
    if (repDetractorsPct) repDetractorsPct.textContent = `${Math.round((detractors / total) * 100)}%`;
  }

  const pendingCount = cases.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;

  if (repPendingCases) repPendingCases.textContent = pendingCount;
  if (repResolvedCasesBadge) {
    repResolvedCasesBadge.textContent = `${resolvedCount} resolvidos`;
  }
}

function renderBlock2Chart(responses) {
  const container = document.getElementById('repChartContainer');
  if (!container) return;

  if (!responses || responses.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-muted);">
        <div style="font-size:1.8rem; margin-bottom:0.5rem; opacity:0.5;">📈</div>
        <div style="font-size:0.88rem; font-weight:600;">Dados insuficientes para gerar o gráfico de evolução</div>
        <div style="font-size:0.78rem; opacity:0.75; margin-top:0.25rem;">Nenhuma avaliação registrada no período selecionado.</div>
      </div>
    `;
    return;
  }

  // Sort responses chronologically
  const sorted = [...responses].sort((a, b) => new Date(a.createdAt || a.created_at) - new Date(b.createdAt || b.created_at));
  
  // Group by date string (YYYY-MM-DD)
  const daysMap = {};
  sorted.forEach(r => {
    const dateStr = new Date(r.createdAt || r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!daysMap[dateStr]) daysMap[dateStr] = [];
    daysMap[dateStr].push(Number(r.npsScore ?? r.nps_score ?? 0));
  });

  const dates = Object.keys(daysMap);
  const npsValues = dates.map(d => calculateNPS(daysMap[d]).score);

  // If only 1 date, add visual representation bar chart/line
  let svgContent = '';
  const height = 180;
  const width = 500;
  const padding = 30;

  if (dates.length === 1) {
    const score = npsValues[0];
    const color = score >= 50 ? 'var(--color-promoter)' : score >= 0 ? 'var(--color-passive)' : 'var(--color-detractor)';
    svgContent = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:180px; overflow:visible;">
        <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="var(--border-subtle)" stroke-dasharray="4" />
        <circle cx="${width / 2}" cy="${height / 2 - (score * 0.6)}" r="8" fill="${color}" stroke="var(--bg-card)" stroke-width="3" />
        <text x="${width / 2}" y="${height / 2 - (score * 0.6) - 15}" fill="var(--text-title)" font-size="14" font-weight="bold" text-anchor="middle">NPS ${score}</text>
        <text x="${width / 2}" y="${height - 5}" fill="var(--text-muted)" font-size="12" text-anchor="middle">${dates[0]}</text>
      </svg>
    `;
  } else {
    // Generate polyline for multiple dates
    const xStep = (width - padding * 2) / (dates.length - 1);
    const points = npsValues.map((val, idx) => {
      const x = padding + idx * xStep;
      const y = (height / 2) - (val * 0.6); // Scale -100..100 to canvas height
      return `${x},${y}`;
    }).join(' ');

    const dots = npsValues.map((val, idx) => {
      const x = padding + idx * xStep;
      const y = (height / 2) - (val * 0.6);
      const color = val >= 50 ? 'var(--color-promoter)' : val >= 0 ? 'var(--color-passive)' : 'var(--color-detractor)';
      return `
        <circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="var(--bg-card)" stroke-width="2" />
        <text x="${x}" y="${y - 12}" fill="var(--text-title)" font-size="11" font-weight="bold" text-anchor="middle">${val}</text>
        <text x="${x}" y="${height - 5}" fill="var(--text-muted)" font-size="10" text-anchor="middle">${dates[idx]}</text>
      `;
    }).join('');

    svgContent = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:180px; overflow:visible;">
        <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="var(--border-subtle)" stroke-dasharray="4" />
        <polyline fill="none" stroke="var(--gold-primary)" stroke-width="3" points="${points}" stroke-linecap="round" stroke-linejoin="round" />
        ${dots}
      </svg>
    `;
  }

  container.innerHTML = svgContent;
}

function renderBlock3Distribution(responses) {
  const repDistPromotersLabel = document.getElementById('repDistPromotersLabel');
  const repBarPromoters = document.getElementById('repBarPromoters');
  const repDistPassivesLabel = document.getElementById('repDistPassivesLabel');
  const repBarPassives = document.getElementById('repBarPassives');
  const repDistDetractorsLabel = document.getElementById('repDistDetractorsLabel');
  const repBarDetractors = document.getElementById('repBarDetractors');
  const repDistTotalLabel = document.getElementById('repDistTotalLabel');

  const total = responses.length;
  if (repDistTotalLabel) repDistTotalLabel.textContent = `${total} avaliações`;

  if (total === 0) {
    if (repDistPromotersLabel) repDistPromotersLabel.textContent = '0 (0%)';
    if (repBarPromoters) repBarPromoters.style.width = '0%';

    if (repDistPassivesLabel) repDistPassivesLabel.textContent = '0 (0%)';
    if (repBarPassives) repBarPassives.style.width = '0%';

    if (repDistDetractorsLabel) repDistDetractorsLabel.textContent = '0 (0%)';
    if (repBarDetractors) repBarDetractors.style.width = '0%';
    return;
  }

  const scores = responses.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
  const promoters = scores.filter(s => s >= 9).length;
  const passives = scores.filter(s => s >= 7 && s <= 8).length;
  const detractors = scores.filter(s => s <= 6).length;

  const pPct = Math.round((promoters / total) * 100);
  const pasPct = Math.round((passives / total) * 100);
  const dPct = Math.round((detractors / total) * 100);

  if (repDistPromotersLabel) repDistPromotersLabel.textContent = `${promoters} (${pPct}%)`;
  if (repBarPromoters) repBarPromoters.style.width = `${pPct}%`;

  if (repDistPassivesLabel) repDistPassivesLabel.textContent = `${passives} (${pasPct}%)`;
  if (repBarPassives) repBarPassives.style.width = `${pasPct}%`;

  if (repDistDetractorsLabel) repDistDetractorsLabel.textContent = `${detractors} (${dPct}%)`;
  if (repBarDetractors) repBarDetractors.style.width = `${dPct}%`;
}

function renderBlock4Touchpoints(responses) {
  const container = document.getElementById('repTouchpointsContainer');
  if (!container) return;

  const defaultTouchpoints = store.getActiveOrg()?.touchpoints || [];

  // Calculate scores for touchpoints from response touchpointRatings
  const tpStats = {};

  defaultTouchpoints.forEach(tp => {
    tpStats[tp.id] = { id: tp.id, name: tp.name, category: tp.category, sum: 0, count: 0 };
  });

  responses.forEach(r => {
    if (r.touchpointRatings && typeof r.touchpointRatings === 'object') {
      Object.keys(r.touchpointRatings).forEach((tpId, idx) => {
        const val = Number(r.touchpointRatings[tpId]);
        if (!isNaN(val) && val >= 0) {
          if (!tpStats[tpId]) {
            const meta = resolveTouchpointMeta(tpId, defaultTouchpoints, idx + 1);
            tpStats[tpId] = { id: tpId, name: meta.name, category: meta.category, sum: 0, count: 0 };
          }
          tpStats[tpId].sum += val;
          tpStats[tpId].count += 1;
        }
      });
    }
  });

  const list = Object.values(tpStats).filter(item => item.count > 0);

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted);">
        <div style="font-size:1.5rem; margin-bottom:0.35rem; opacity:0.5;">📍</div>
        <div style="font-size:0.85rem; font-weight:600;">Sem avaliações de pontos de contato</div>
        <div style="font-size:0.75rem; opacity:0.75;">As respostas registradas no período não possuem notas por categoria.</div>
      </div>
    `;
    return;
  }

  list.forEach(item => {
    item.avg = (item.sum / item.count).toFixed(1);
    item.avgNum = Number(item.avg);
  });

  list.sort((a, b) => b.avgNum - a.avgNum);

  let html = '<div style="display:flex; flex-direction:column; gap:0.75rem;">';
  list.forEach(item => {
    const scoreColor = item.avgNum >= 8.5 ? '#10b981' : item.avgNum >= 7.0 ? 'var(--gold-primary)' : '#ef4444';
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.65rem 0.85rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
        <div>
          <strong style="font-size:0.85rem; color:var(--text-title); font-weight:600; display:block;">${escapeHtml(item.name)}</strong>
          <span style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(item.category)} • ${item.count} avaliações</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:1.05rem; font-weight:800; color:${scoreColor}; font-family:var(--font-title); margin-right:0.2rem;">${item.avg}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">/10</span>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

function renderBlock5Cases(cases) {
  const container = document.getElementById('repCasesMetricsContainer');
  if (!container) return;

  if (!cases || cases.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted);">
        <div style="font-size:1.5rem; margin-bottom:0.35rem; opacity:0.5;">🤝</div>
        <div style="font-size:0.85rem; font-weight:600;">Nenhum caso de detrator no período</div>
        <div style="font-size:0.75rem; opacity:0.75;">Excelente! Não existem tickets pendentes de fechamento de loop.</div>
      </div>
    `;
    return;
  }

  const pending = cases.filter(c => c.status === 'pending').length;
  const inProgress = cases.filter(c => c.status === 'in_progress').length;
  const resolved = cases.filter(c => c.status === 'resolved').length;
  const total = cases.length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem; margin-bottom:1rem;">
      <div style="padding:0.75rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
        <span style="font-size:0.72rem; color:var(--text-muted); display:block;">Casos Pendentes</span>
        <strong style="font-size:1.2rem; color:var(--color-detractor);">${pending}</strong>
      </div>
      <div style="padding:0.75rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
        <span style="font-size:0.72rem; color:var(--text-muted); display:block;">Em Andamento</span>
        <strong style="font-size:1.2rem; color:var(--color-passive);">${inProgress}</strong>
      </div>
      <div style="padding:0.75rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
        <span style="font-size:0.72rem; color:var(--text-muted); display:block;">Resolvidos</span>
        <strong style="font-size:1.2rem; color:var(--color-promoter);">${resolved}</strong>
      </div>
      <div style="padding:0.75rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
        <span style="font-size:0.72rem; color:var(--text-muted); display:block;">Taxa de Resolução</span>
        <strong style="font-size:1.2rem; color:var(--gold-primary);">${resolutionRate}%</strong>
      </div>
    </div>
  `;
}

function renderBlock6Insights(responses, cases) {
  const container = document.getElementById('repInsightsContainer');
  if (!container) return;

  const insights = [];

  if (responses.length === 0) {
    container.innerHTML = `
      <div style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">
        Dados insuficientes no período para gerar insights automáticos da operação.
      </div>
    `;
    return;
  }

  const scores = responses.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
  const nps = calculateNPS(scores);
  const promotersCount = scores.filter(s => s >= 9).length;
  const detractorsCount = scores.filter(s => s <= 6).length;
  const total = responses.length;

  // Insight 1: NPS Index
  if (nps.score >= 50) {
    insights.push(`🎉 <strong>NPS em Zona de Excelência (${nps.score}):</strong> ${Math.round((promotersCount / total) * 100)}% das avaliações são de clientes promotores entusiastas.`);
  } else if (nps.score >= 0) {
    insights.push(`📊 <strong>NPS em Zona Qualidade (${nps.score}):</strong> Acompanhe os clientes neutros para transformá-los em promotores.`);
  } else {
    insights.push(`🚨 <strong>Atenção ao NPS (${nps.score}):</strong> Alta proporção de detratores (${detractorsCount} de ${total}) exige ação prioritária da equipe.`);
  }

  // Insight 2: Pending detractor cases
  const pendingCasesCount = cases.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  if (pendingCasesCount > 0) {
    insights.push(`⚠️ <strong>Fechamento de Loop:</strong> Existem ${pendingCasesCount} caso(s) de detrator aguardando acompanhamento direto.`);
  } else if (cases.length > 0) {
    insights.push(`✅ <strong>Atendimento Eficiente:</strong> Todos os casos de detratores do período foram tratados com sucesso.`);
  }

  // Insight 3: Touchpoints
  const defaultTouchpoints = store.getActiveOrg()?.touchpoints || [];
  const tpStats = {};
  defaultTouchpoints.forEach(tp => { tpStats[tp.id] = { name: tp.name, sum: 0, count: 0 }; });
  responses.forEach(r => {
    if (r.touchpointRatings) {
      Object.keys(r.touchpointRatings).forEach((tpId, idx) => {
        const val = Number(r.touchpointRatings[tpId]);
        if (val > 0) {
          if (!tpStats[tpId]) {
            const meta = resolveTouchpointMeta(tpId, defaultTouchpoints, idx + 1);
            tpStats[tpId] = { name: meta.name, sum: 0, count: 0 };
          }
          tpStats[tpId].sum += val;
          tpStats[tpId].count += 1;
        }
      });
    }
  });

  const ratedTps = Object.values(tpStats).filter(t => t.count > 0).map(t => ({ name: t.name, avg: (t.sum / t.count).toFixed(1) }));
  if (ratedTps.length > 0) {
    ratedTps.sort((a, b) => b.avg - a.avg);
    const topTp = ratedTps[0];
    const lowestTp = ratedTps[ratedTps.length - 1];
    insights.push(`⭐ <strong>Melhor Ponto de Contato:</strong> "${escapeHtml(topTp.name)}" lidera com nota média de <strong>${topTp.avg}/5</strong>.`);
    if (ratedTps.length > 1 && lowestTp.avg < topTp.avg) {
      insights.push(`🔍 <strong>Oportunidade de Melhoria:</strong> "${escapeHtml(lowestTp.name)}" obteve a menor média (${lowestTp.avg}/5).`);
    }
  }

  let html = '';
  insights.forEach(item => {
    html += `<div style="font-size:0.85rem; color:var(--text-main); padding:0.5rem 0.75rem; background:var(--bg-input); border-radius:var(--radius-md); border-left:3px solid var(--gold-primary);">${item}</div>`;
  });

  container.innerHTML = html;
}

function renderBlock7StudentEvolution(responses) {
  const elCount = document.getElementById('repTrackedStudents');
  const elDelta = document.getElementById('repAvgEvolutionDelta');
  if (!elCount || !elDelta) return;

  const activeOrg = store.getActiveOrg();
  const students = activeOrg?.students || [];

  let deltas = [];
  students.forEach(st => {
    const stResponses = responses.filter(r => r.studentId === st.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (stResponses.length > 1) {
      const firstScore = stResponses[0].npsScore;
      const latestScore = stResponses[stResponses.length - 1].npsScore;
      deltas.push(latestScore - firstScore);
    }
  });

  const avgDelta = deltas.length > 0 ? (deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1) : '0.0';
  elCount.textContent = students.length;
  elDelta.textContent = Number(avgDelta) > 0 ? `+${avgDelta}` : `${avgDelta}`;
  elDelta.className = `badge-status ${Number(avgDelta) >= 0 ? 'promoter' : 'detractor'}`;
}

export function exportToCsv(responsesToExport) {
  const list = responsesToExport || store.localResponses || [];
  if (list.length === 0) {
    showToast('⚠️ Nenhuma resposta encontrada no filtro selecionado para exportar.', 'warning');
    return;
  }

  const activeOrg = store.getActiveOrg();
  const units = activeOrg?.units || [];
  const touchpoints = activeOrg?.touchpoints || [];
  const tpNameById = new Map(touchpoints.map(tp => [tp.id, tp.name]));

  const headers = [
    'ID',
    'Data_Hora',
    'Unidade',
    'Codigo_Unidade',
    'Origem',
    'Nota_NPS',
    'Classificacao',
    'Aluno',
    'Email',
    'Telefone',
    'Comentario',
    'Avaliacao_Pontos_Contato'
  ];

  const rows = [headers.join(';')];

  list.forEach(r => {
    const score = Number(r.npsScore ?? r.nps_score ?? 0);
    const cat = score >= 9 ? 'Promotor' : score >= 7 ? 'Passivo' : 'Detrator';
    const cleanComment = (r.comment || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
    const uCode = r.unitCode || r.unit_code || 'geral';
    const matchedUnit = units.find(u => u.code === uCode || u.id === r.unitId || u.id === uCode);
    const uName = (matchedUnit?.name || uCode).replace(/"/g, '""');
    const stName = (r.student || r.student_identifier || 'Anônimo').replace(/"/g, '""');
    const dateVal = r.createdAt || r.created_at ? new Date(r.createdAt || r.created_at).toLocaleString('pt-BR') : '';

    let tpSummary = '';
    if (r.touchpointRatings && typeof r.touchpointRatings === 'object') {
      tpSummary = Object.entries(r.touchpointRatings)
        .map(([tpId, rating]) => `${tpNameById.get(tpId) || tpId}: ${rating}/5`)
        .join(' | ')
        .replace(/"/g, '""');
    }

    rows.push([
      `"${r.id}"`,
      `"${dateVal}"`,
      `"${uName}"`,
      `"${uCode}"`,
      `"${r.origin || 'web'}"`,
      score,
      `"${cat}"`,
      `"${stName}"`,
      `"${r.email || ''}"`,
      `"${r.phone || ''}"`,
      `"${cleanComment}"`,
      `"${tpSummary}"`
    ].join(';'));
  });

  const csvString = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const orgSlug = (activeOrg?.name || 'garden').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateSlug = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_nps_${orgSlug}_${dateSlug}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`✓ Relatório exportado com ${list.length} avaliação(ões)!`, 'success');
}

function resolvePeriodDisplayLabel(period) {
  const now = new Date();
  if (!period || period === 'month') {
    return `${formatMonthLabel(getMonthKey(now))} (Ciclo Vigente)`;
  }
  if (period === 'prev_month') {
    const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    return `${formatMonthLabel(prevYm)} (Ciclo Fechado)`;
  }
  if (period.startsWith('month:')) {
    return `${formatMonthLabel(period.replace('month:', ''))} (Histórico Salvo)`;
  }
  if (period === '30d') return 'Últimos 30 dias corridos';
  if (period === '7d') return 'Últimos 7 dias corridos';
  return 'Acumulado Geral (Todos os Meses)';
}

function openExecutivePdfReport({ responses = [], networkResponses = [], cases = [], period = 'month', unitCode = 'all' }) {
  const activeOrg = store.getActiveOrg();
  const orgName = activeOrg?.tradeName || activeOrg?.name || 'Garden Gold Academia';
  const units = activeOrg?.units || store.UNITS || [];
  const goals = getOrganizationGoals(store.activeOrgId);

  const logoSrc = activeOrg?.logoUrl || `${window.location.origin}/logo-garden-gold.jpg`;
  const resolvedLogoSrc = logoSrc.startsWith('/') ? `${window.location.origin}${logoSrc}` : logoSrc;

  const periodLabel = resolvePeriodDisplayLabel(period);
  const selectedUnitObj = unitCode !== 'all' ? units.find(u => u.code === unitCode || u.id === unitCode) : null;
  const scopeLabel = selectedUnitObj ? `Unidade ${selectedUnitObj.name}` : `Rede Completa (${units.length || 1} unidades)`;

  const scores = responses.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
  const npsObj = scores.length > 0 ? calculateNPS(scores) : { score: 0, zone: 'Sem Dados' };
  const npsStr = scores.length > 0 ? (npsObj.score > 0 ? `+${npsObj.score}` : `${npsObj.score}`) : '—';
  const targetNpsStr = goals.targetNps > 0 ? `+${goals.targetNps}` : `${goals.targetNps}`;

  const promoters = scores.filter(s => s >= 9).length;
  const passives = scores.filter(s => s >= 7 && s <= 8).length;
  const detractors = scores.filter(s => s <= 6).length;
  const total = scores.length;

  const pProm = total > 0 ? Math.round((promoters / total) * 100) : 0;
  const pPass = total > 0 ? Math.round((passives / total) * 100) : 0;
  const pDet = total > 0 ? Math.round((detractors / total) * 100) : 0;

  const netScores = networkResponses.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
  const netNpsObj = netScores.length > 0 ? calculateNPS(netScores) : { score: 0, zone: 'Sem Dados' };
  const netNpsStr = netScores.length > 0 ? (netNpsObj.score > 0 ? `+${netNpsObj.score}` : `${netNpsObj.score}`) : '—';
  const netProm = netScores.filter(s => s >= 9).length;
  const netPass = netScores.filter(s => s >= 7 && s <= 8).length;
  const netDet = netScores.filter(s => s <= 6).length;

  const totalCases = cases.length;
  const resolvedCases = cases.filter(c => c.status === 'resolved').length;
  const resolutionRate = totalCases > 0 ? `${Math.round((resolvedCases / totalCases) * 100)}%` : '100%';

  // Build Units Comparison Rows
  const unitRowsHtml = units.map(u => {
    const uList = networkResponses.filter(r => (r.unitCode || r.unit_code) === u.code);
    const uScores = uList.map(r => Number(r.npsScore ?? r.nps_score ?? 0));
    const uNps = uScores.length > 0 ? calculateNPS(uScores) : null;
    const uNpsStr = uNps ? (uNps.score > 0 ? `+${uNps.score}` : `${uNps.score}`) : '—';
    const uProm = uScores.filter(s => s >= 9).length;
    const uPass = uScores.filter(s => s >= 7 && s <= 8).length;
    const uDet = uScores.filter(s => s <= 6).length;
    const uGoalPct = Math.min(100, Math.round((uScores.length / goals.targetResponsesPerUnit) * 100));

    return `
      <tr>
        <td><strong>📍 ${escapeHtml(u.name)}</strong></td>
        <td><strong>${uNpsStr}</strong> ${uNps ? `<span style="font-size:11px; color:#6b7280;">(${escapeHtml(uNps.zone)})</span>` : ''}</td>
        <td>${uScores.length} / ${goals.targetResponsesPerUnit} (${uGoalPct}%)</td>
        <td style="color:#059669; font-weight:700;">${uProm}</td>
        <td style="color:#b45309; font-weight:700;">${uPass}</td>
        <td style="color:#dc2626; font-weight:700;">${uDet}</td>
      </tr>
    `;
  }).join('');

  // Build Touchpoints Performance Rows
  const tpAgg = {};
  responses.forEach(r => {
    const ratings = r.touchpointRatings || r.touchpoint_ratings;
    if (ratings && typeof ratings === 'object') {
      Object.entries(ratings).forEach(([tpKey, val]) => {
        const num = Number(val);
        if (!isNaN(num) && num >= 0) {
          if (!tpAgg[tpKey]) tpAgg[tpKey] = { sum: 0, count: 0 };
          tpAgg[tpKey].sum += num;
          tpAgg[tpKey].count += 1;
        }
      });
    }
  });

  const tpEntries = Object.entries(tpAgg).map(([tpKey, stats], idx) => {
    const meta = resolveTouchpointMeta(tpKey, store.touchpoints, idx + 1);
    const avg = stats.count > 0 ? (stats.sum / stats.count) : 0;
    return {
      name: meta.name,
      category: meta.category,
      avg: avg.toFixed(1),
      avgNum: avg,
      count: stats.count
    };
  }).sort((a, b) => b.avgNum - a.avgNum);

  const tpRowsHtml = tpEntries.length > 0
    ? tpEntries.map(tp => {
        const scoreColor = tp.avgNum >= 8.5 ? '#10b981' : tp.avgNum >= 7.0 ? '#b38b20' : '#ef4444';
        return `
          <tr>
            <td><strong>${escapeHtml(tp.name)}</strong></td>
            <td>${escapeHtml(tp.category)}</td>
            <td style="color:${scoreColor}; font-weight:800;">${tp.avg} / 10</td>
            <td>${tp.count} aval.</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="4" style="text-align:center; color:#6b7280; padding:12px;">Nenhuma avaliação por ponto de contato registrada no período.</td></tr>`;

  // Recent Comments
  const commentedResponses = responses.filter(r => r.comment && String(r.comment).trim()).slice(0, 10);
  const commentsHtml = commentedResponses.length > 0
    ? commentedResponses.map(r => {
        const u = units.find(unit => unit.code === (r.unitCode || r.unit_code));
        const uName = u ? u.name : (r.unitCode || 'Geral');
        const score = Number(r.npsScore ?? r.nps_score ?? 0);
        const dateStr = new Date(r.createdAt || r.created_at).toLocaleDateString('pt-BR');
        return `
          <tr>
            <td><strong>${escapeHtml(r.student || 'Anônimo')}</strong><br><span style="font-size:11px; color:#6b7280;">📍 ${escapeHtml(uName)} • ${dateStr}</span></td>
            <td style="font-weight:800; color:${score >= 9 ? '#059669' : score >= 7 ? '#b45309' : '#dc2626'};">Nota ${score}/10</td>
            <td style="font-style:italic; color:#1f2937;">"${escapeHtml(r.comment)}"</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center; color:#6b7280; padding:12px;">Nenhum comentário por escrito registrado neste período.</td></tr>`;

  const printWin = window.open('', '_blank', 'width=960,height=1100');
  if (!printWin) {
    window.print();
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Executivo NPS — ${escapeHtml(orgName)} (${escapeHtml(periodLabel)})</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: 'Segoe UI', 'Inter', Arial, sans-serif;
          background: #ffffff;
          color: #111827;
          font-size: 12.5px;
          line-height: 1.45;
        }
        .exec-header {
          background: linear-gradient(135deg, #0b110e 0%, #16241b 100%);
          color: #ffffff;
          padding: 20px 24px;
          border-radius: 14px;
          border-bottom: 4px solid #d4af37;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logo-box {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: #ffffff;
          border: 2px solid #e5b93f;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .badge-gold {
          display: inline-block;
          background: rgba(229, 185, 63, 0.18);
          border: 1px solid #e5b93f;
          color: #e5b93f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 2px 9px;
          border-radius: 999px;
          margin-bottom: 4px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .kpi-card {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 10px;
          padding: 12px;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 800;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .kpi-val {
          font-size: 22px;
          font-weight: 900;
          color: #111827;
          margin: 4px 0 2px 0;
        }
        .kpi-sub {
          font-size: 11px;
          color: #4b5563;
        }
        .section-box {
          margin-bottom: 18px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: #0d1117;
          border-left: 4px solid #d4af37;
          padding-left: 8px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          background: #f3f4f6;
          color: #374151;
          text-align: left;
          font-weight: 700;
          padding: 8px 10px;
          border-bottom: 2px solid #d1d5db;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .network-row {
          background: #fef9c3;
          font-weight: 700;
        }
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #d1d5db;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="exec-header">
        <div class="header-left">
          <div class="logo-box">
            <img src="${resolvedLogoSrc}" alt="${escapeHtml(orgName)}">
          </div>
          <div>
            <div class="badge-gold">Relatório Executivo de Experiência & NPS</div>
            <h1 style="font-size:20px; font-weight:900; margin:0;">${escapeHtml(orgName)}</h1>
            <div style="font-size:12px; color:#d1d5db; margin-top:2px;">📍 ${escapeHtml(scopeLabel)} • Período: <strong>${escapeHtml(periodLabel)}</strong></div>
          </div>
        </div>
        <div style="text-align:right; font-size:11px; color:#d1d5db;">
          <div>Emitido em: <strong>${new Date().toLocaleString('pt-BR')}</strong></div>
          <div style="color:#e5b93f; font-weight:700; margin-top:3px;">Meta Oficial da Rede: NPS ${targetNpsStr}</div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" style="border-color:#d4af37; background:#fffbeb;">
          <div class="kpi-label">NPS do Período</div>
          <div class="kpi-val" style="color:#b45309;">${npsStr}</div>
          <div class="kpi-sub">Meta: <strong>${targetNpsStr}</strong> (${escapeHtml(npsObj.zone)})</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avaliações Coletadas</div>
          <div class="kpi-val">${total}</div>
          <div class="kpi-sub">Meta Unid.: ${goals.targetResponsesPerUnit} aval./mês</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Promotores (9–10)</div>
          <div class="kpi-val" style="color:#059669;">${pProm}%</div>
          <div class="kpi-sub">${promoters} aluno(s) promotor(es)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Neutros (7–8)</div>
          <div class="kpi-val" style="color:#d97706;">${pPass}%</div>
          <div class="kpi-sub">${passives} aluno(s) neutro(s)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Detratores & tratativa</div>
          <div class="kpi-val" style="color:#dc2626;">${detractors} (${pDet}%)</div>
          <div class="kpi-sub">Resolução: <strong>${resolutionRate}</strong></div>
        </div>
      </div>

      <!-- Section 1: Network vs Units -->
      <div class="section-box">
        <div class="section-title">1. Consolidado da Rede vs. Desempenho por Unidade</div>
        <table>
          <thead>
            <tr>
              <th>Unidade / Rede</th>
              <th>Score NPS</th>
              <th>Coleta / Meta Mensal</th>
              <th>Promotores (9–10)</th>
              <th>Neutros (7–8)</th>
              <th>Detratores (0–6)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="network-row">
              <td>🏆 NPS GERAL DA REDE (${escapeHtml(orgName)})</td>
              <td><strong>${netNpsStr}</strong> (${escapeHtml(netNpsObj.zone)})</td>
              <td>${netScores.length} / ${goals.targetResponsesPerUnit * Math.max(1, units.length)} aval.</td>
              <td style="color:#059669;">${netProm}</td>
              <td style="color:#b45309;">${netPass}</td>
              <td style="color:#dc2626;">${netDet}</td>
            </tr>
            ${unitRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 2: Touchpoints -->
      <div class="section-box">
        <div class="section-title">2. Avaliação por Ponto de Contato (Setores da Academia)</div>
        <table>
          <thead>
            <tr>
              <th>Ponto de Contato</th>
              <th>Categoria / Setor</th>
              <th>Nota Média (0 a 10)</th>
              <th>Amostra</th>
            </tr>
          </thead>
          <tbody>
            ${tpRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 3: Customer Verbatims -->
      <div class="section-box">
        <div class="section-title">3. Principais Comentários dos Alunos no Período</div>
        <table>
          <thead>
            <tr>
              <th style="width:28%;">Aluno / Unidade</th>
              <th style="width:14%;">Nota NPS</th>
              <th>Comentário / Sugestão</th>
            </tr>
          </thead>
          <tbody>
            ${commentsHtml}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <span><strong>${escapeHtml(orgName)}</strong> — Plataforma Garden Experience SaaS</span>
        <span>Documento executivo gerado automaticamente a partir do banco de dados oficial</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}

