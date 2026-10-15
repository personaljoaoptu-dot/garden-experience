/**
 * Premium SVG Analytics Chart Renderer
 * Renders smooth vector line charts, network NPS benchmark lines, sparklines, and ring gauges.
 */

import { escapeHtml } from '../../core/utils/sanitizer.js';

export function renderSparklineSvg(dataPoints = []) {
  if (!dataPoints || dataPoints.length < 2) {
    return `<svg width="70" height="24" viewBox="0 0 70 24" fill="none"><path d="M0 12 H70" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-dasharray="3 3"/></svg>`;
  }

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;

  const width = 70;
  const height = 24;
  const padding = 3;

  const points = dataPoints.map((val, idx) => {
    const x = (idx / (dataPoints.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((val - min) / range) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <polyline points="${points}" stroke="#d4a017" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

export function renderNpsLineChart(containerId, historyData = [], options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const {
    networkNps = null,
    networkHistoryData = [],
    orgName = 'Rede Garden Gold',
    unitLabel = 'Todas as Unidades',
    isUnitFiltered = false
  } = options;

  if ((!historyData || historyData.length === 0) && (!networkHistoryData || networkHistoryData.length === 0)) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem 1rem; text-align:center; color:var(--text-muted);">
        <div style="font-size:2.2rem; margin-bottom:0.4rem; opacity:0.65;">📈</div>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-title); margin-bottom:0.25rem;">Evolução do NPS da Rede</h4>
        <p style="font-size:0.8rem; max-width:340px; color:var(--text-dim);">O gráfico comparativo aparecerá aqui assim que houver avaliações registradas no período selecionado.</p>
      </div>
    `;
    return;
  }

  const activeSeries = historyData && historyData.length > 0 ? historyData : networkHistoryData;

  const width = 620;
  const height = 185;
  const paddingLeft = 44;
  const paddingRight = 56;
  const paddingTop = 22;
  const paddingBottom = 30;

  const minScore = -100;
  const maxScore = 100;
  const range = maxScore - minScore;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const zeroY = paddingTop + chartH / 2;

  const scoreToY = (score) => {
    const clamped = Math.max(-100, Math.min(100, Number(score) || 0));
    return height - paddingBottom - ((clamped - minScore) / range) * chartH;
  };

  const points = activeSeries.map((d, i) => {
    const x = activeSeries.length === 1
      ? paddingLeft + chartW / 2
      : paddingLeft + (i / Math.max(1, activeSeries.length - 1)) * chartW;
    const y = scoreToY(d.nps);
    return { x, y, nps: d.nps, date: d.date, count: d.count || 1 };
  });

  const pathD = points.length === 1
    ? `M ${paddingLeft} ${points[0].y.toFixed(1)} L ${(width - paddingRight).toFixed(1)} ${points[0].y.toFixed(1)}`
    : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const areaD = points.length === 1
    ? `M ${paddingLeft} ${points[0].y.toFixed(1)} L ${(width - paddingRight).toFixed(1)} ${points[0].y.toFixed(1)} L ${(width - paddingRight).toFixed(1)} ${height - paddingBottom} L ${paddingLeft} ${height - paddingBottom} Z`
    : `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - paddingBottom} L ${points[0].x.toFixed(1)} ${height - paddingBottom} Z`;

  // Optional Network Trend Line when a single unit is filtered
  let networkPathHtml = '';
  if (isUnitFiltered && networkHistoryData && networkHistoryData.length > 0) {
    const netPoints = networkHistoryData.map((d, i) => {
      const x = networkHistoryData.length === 1
        ? paddingLeft + chartW / 2
        : paddingLeft + (i / Math.max(1, networkHistoryData.length - 1)) * chartW;
      const y = scoreToY(d.nps);
      return { x, y, nps: d.nps, date: d.date, count: d.count || 1 };
    });
    const netPathD = netPoints.length === 1
      ? `M ${paddingLeft} ${netPoints[0].y.toFixed(1)} L ${(width - paddingRight).toFixed(1)} ${netPoints[0].y.toFixed(1)}`
      : netPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    networkPathHtml = `
      <path d="${netPathD}" stroke="#10b981" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" fill="none" opacity="0.85"/>
    `;
  }

  // Horizontal Network Consolidated NPS Benchmark Line (always shown when networkNps is available)
  let networkBenchmarkHtml = '';
  if (networkNps !== null && !isNaN(Number(networkNps))) {
    const netY = scoreToY(networkNps);
    const netFormatted = Number(networkNps) > 0 ? `+${networkNps}` : `${networkNps}`;
    networkBenchmarkHtml = `
      <line x1="${paddingLeft}" y1="${netY.toFixed(1)}" x2="${width - paddingRight}" y2="${netY.toFixed(1)}" stroke="#10b981" stroke-dasharray="3 3" stroke-width="1.4" opacity="0.8"/>
      <rect x="${width - paddingRight + 4}" y="${(netY - 9).toFixed(1)}" width="48" height="17" rx="4" fill="rgba(16, 185, 129, 0.16)" stroke="rgba(16, 185, 129, 0.45)" stroke-width="1"/>
      <text x="${width - paddingRight + 28}" y="${(netY + 3).toFixed(1)}" fill="#10b981" font-size="9.5" font-weight="800" text-anchor="middle">Rede ${netFormatted}</text>
    `;
  }

  let circlesHtml = points.map(p => {
    const npsFormatted = p.nps > 0 ? `+${p.nps}` : `${p.nps}`;
    const netInfo = networkNps !== null ? `\nNPS Geral da Rede (${orgName}): ${networkNps > 0 ? '+' + networkNps : networkNps}` : '';
    const tooltipText = `${p.date} — ${unitLabel}\nNPS do Dia: ${npsFormatted} (${p.count} aval.)${netInfo}`;
    return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#e5b93f" stroke="#080b12" stroke-width="2" style="cursor:pointer;">
        <title>${escapeHtml(tooltipText)}</title>
      </circle>
      <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" fill="#e5b93f" font-size="9.5" font-weight="700" text-anchor="middle">${npsFormatted}</text>
    `;
  }).join('');

  // X Axis Date Labels (Sampled for legibility)
  let xLabelsHtml = '';
  const step = Math.max(1, Math.floor(points.length / 5));
  points.forEach((p, idx) => {
    if (idx === 0 || idx === points.length - 1 || idx % step === 0) {
      xLabelsHtml += `<text x="${p.x.toFixed(1)}" y="${height - 7}" fill="var(--text-muted)" font-size="10" text-anchor="middle" font-weight="600">${escapeHtml(p.date)}</text>`;
    }
  });

  container.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="npsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e5b93f" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#e5b93f" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      
      <!-- Scale Labels & Grid Lines (-100, 0, +100) -->
      <text x="5" y="${paddingTop + 4}" fill="var(--text-muted)" font-size="10" font-weight="600">+100</text>
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${width - paddingRight}" y2="${paddingTop}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3 3"/>
      
      <text x="15" y="${zeroY + 3}" fill="var(--text-muted)" font-size="10" font-weight="600">0</text>
      <line x1="${paddingLeft}" y1="${zeroY}" x2="${width - paddingRight}" y2="${zeroY}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4 4" stroke-width="1"/>
      
      <text x="5" y="${height - paddingBottom + 4}" fill="var(--text-muted)" font-size="10" font-weight="600">-100</text>
      <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3 3"/>
      
      <!-- Network Benchmark & Trend -->
      ${networkBenchmarkHtml}
      ${networkPathHtml}

      <!-- Area & Primary Trend Line -->
      <path d="${areaD}" fill="url(#npsGrad)"/>
      <path d="${pathD}" stroke="#e5b93f" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      
      ${circlesHtml}
      ${xLabelsHtml}
    </svg>
  `;
}

export function renderDonutSvg({ total = 0, promoters = 0, passives = 0, detractors = 0, nps = 0 }) {
  const size = 120;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${strokeWidth}"/>
        <text x="${center}" y="${center + 4}" fill="var(--text-muted)" font-size="11" text-anchor="middle" font-weight="500">Sem dados</text>
      </svg>
    `;
  }

  const pPromoter = promoters / total;
  const pPassive = passives / total;
  const pDetractor = detractors / total;

  const lenPromoter = pPromoter * circumference;
  const lenPassive = pPassive * circumference;
  const lenDetractor = pDetractor * circumference;

  const offsetPromoter = 0;
  const offsetPassive = -lenPromoter;
  const offsetDetractor = -(lenPromoter + lenPassive);

  const npsStr = nps > 0 ? `+${nps}` : `${nps}`;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
      <!-- Background Circle -->
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${strokeWidth}"/>
      
      <!-- Promoters Arc -->
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--color-promoter)" stroke-width="${strokeWidth}"
        stroke-dasharray="${lenPromoter} ${circumference - lenPromoter}" stroke-dashoffset="${offsetPromoter}"/>
      
      <!-- Passives Arc -->
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--color-passive)" stroke-width="${strokeWidth}"
        stroke-dasharray="${lenPassive} ${circumference - lenPassive}" stroke-dashoffset="${offsetPassive}"/>
      
      <!-- Detractors Arc -->
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--color-detractor)" stroke-width="${strokeWidth}"
        stroke-dasharray="${lenDetractor} ${circumference - lenDetractor}" stroke-dashoffset="${offsetDetractor}"/>
    </svg>
    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; pointer-events:none;">
      <div style="font-size:1.15rem; font-weight:800; font-family:var(--font-title); color:var(--text-title); line-height:1;">${npsStr}</div>
      <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${total} resp.</div>
    </div>
  `;
}
