/**
 * Premium SVG Analytics Chart Renderer
 * Renders smooth vector line charts, sparklines, and ring gauges with zero external heavy chart libraries.
 */

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

export function renderNpsLineChart(containerId, historyData = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!historyData || historyData.length === 0) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3.5rem 1rem; text-align:center; color:var(--text-muted);">
        <div style="font-size:2.5rem; margin-bottom:0.5rem; opacity:0.6;">📈</div>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-title); margin-bottom:0.25rem;">NPS ao longo do tempo</h4>
        <p style="font-size:0.82rem; max-width:320px; color:var(--text-dim);">Seu gráfico aparecerá aqui quando você receber as primeiras avaliações no período selecionado.</p>
      </div>
    `;
    return;
  }

  const width = 600;
  const height = 180;
  const padding = 30;

  const dates = historyData.map(d => d.date);
  const scores = historyData.map(d => d.nps);

  const minScore = -100;
  const maxScore = 100;
  const range = maxScore - minScore;

  const points = historyData.map((d, i) => {
    const x = padding + (i / Math.max(1, historyData.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.nps - minScore) / range) * (height - 2 * padding);
    return { x, y, nps: d.nps, date: d.date };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

  let circlesHtml = points.map(p => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#d4a017" stroke="#080b12" stroke-width="2">
      <title>${p.date}: NPS ${p.nps > 0 ? '+' + p.nps : p.nps}</title>
    </circle>
  `).join('');

  container.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="npsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d4a017" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#d4a017" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Grid Lines -->
      <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 4"/>
      <!-- Area & Line -->
      <path d="${areaD}" fill="url(#npsGrad)"/>
      <path d="${pathD}" stroke="#d4a017" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      ${circlesHtml}
    </svg>
  `;
}
