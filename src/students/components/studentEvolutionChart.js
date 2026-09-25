/**
 * Student Experience Evolution Line Chart Component
 * Renders an SVG line chart mapping 0-10 NPS evaluations over time.
 */

export function renderStudentEvolutionChart(evaluations = []) {
  if (!evaluations || evaluations.length === 0) {
    return `
      <div class="empty-state-card" style="padding: 2.5rem; text-align: center; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">📊</div>
        <h4 style="margin-bottom: 0.5rem; color: var(--text-primary);">Histórico Insuficiente</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Não há avaliações suficientes cadastradas para gerar a linha de tendência temporal deste aluno.</p>
      </div>
    `;
  }

  if (evaluations.length === 1) {
    const single = evaluations[0];
    const scoreColor = single.npsScore >= 9 ? 'var(--color-promoter, #10b981)' : (single.npsScore >= 7 ? 'var(--color-passive, #f59e0b)' : 'var(--color-detractor, #ef4444)');
    const dateFormatted = new Date(single.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <div class="card" style="padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">Avaliação Única Registrada</h4>
          <span style="font-size:0.8rem; color:var(--text-dim);">${dateFormatted}</span>
        </div>
        <div style="display:flex; align-items:center; gap: 1.25rem;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.03); border: 2px solid ${scoreColor}; display:flex; align-items:center; justify-content:center; font-size: 1.75rem; font-weight: 800; color: ${scoreColor};">
            ${single.npsScore}
          </div>
          <div>
            <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${single.npsScore >= 9 ? 'Promotor (9-10)' : (single.npsScore >= 7 ? 'Neutro (7-8)' : 'Detractor (0-6)')}</div>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">"${single.comment || 'Sem comentário cadastrado.'}"</p>
          </div>
        </div>
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-subtle); font-size: 0.8rem; color: var(--text-dim);">
          ℹ️ Este aluno possui apenas uma avaliação. Novas avaliações permitirão visualizar o gráfico de tendência temporal.
        </div>
      </div>
    `;
  }

  // Sort evaluations chronological ASC for chart rendering
  const sorted = [...evaluations].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const width = 800;
  const height = 260;
  const paddingX = 50;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = sorted.map((ev, idx) => {
    const x = paddingX + (idx / (sorted.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (ev.npsScore / 10) * chartHeight;
    return { x, y, ev };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Gradient area path
  const areaPoints = [
    `${points[0].x.toFixed(1)},${(paddingTop + chartHeight).toFixed(1)}`,
    ...points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${points[points.length - 1].x.toFixed(1)},${(paddingTop + chartHeight).toFixed(1)}`
  ].join(' ');

  const gridYValues = [0, 2, 4, 6, 8, 10];

  return `
    <div class="evolution-chart-container" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1.5rem; position: relative;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
        <div>
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">Trajetória da Avaliação (NPS 0 a 10)</h4>
          <span style="font-size:0.8rem; color:var(--text-dim);">${sorted.length} avaliações registradas no histórico</span>
        </div>
        <div style="display:flex; gap:1rem; font-size:0.78rem; font-weight:600;">
          <span style="color:var(--color-promoter, #10b981);">● Promotor (9-10)</span>
          <span style="color:var(--color-passive, #f59e0b);">● Neutro (7-8)</span>
          <span style="color:var(--color-detractor, #ef4444);">● Detrator (0-6)</span>
        </div>
      </div>

      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; min-width: 500px;" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
            </linearGradient>
          </defs>

          <!-- Horizontal Grid Lines -->
          ${gridYValues.map(val => {
            const y = paddingTop + chartHeight - (val / 10) * chartHeight;
            return `
              <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
              <text x="${paddingX - 10}" y="${y + 4}" text-anchor="end" fill="var(--text-dim, #94a3b8)" font-size="11" font-weight="600">${val}</text>
            `;
          }).join('')}

          <!-- Fill Area under curve -->
          <polygon points="${areaPoints}" fill="url(#chartGradient)" />

          <!-- Line plot -->
          <polyline points="${polylinePoints}" fill="none" stroke="var(--gold-primary, #f59e0b)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Points and tooltips -->
          ${points.map((p, i) => {
            const ev = p.ev;
            const color = ev.npsScore >= 9 ? '#10b981' : (ev.npsScore >= 7 ? '#f59e0b' : '#ef4444');
            const dateStr = new Date(ev.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            return `
              <g class="chart-point-group" cursor="pointer">
                <circle cx="${p.x}" cy="${p.y}" r="6.5" fill="${color}" stroke="#0f172a" stroke-width="2.5">
                  <title>Data: ${dateStr}&#10;Nota: ${ev.npsScore}/10&#10;Comentário: ${ev.comment || 'Sem comentário'}</title>
                </circle>
                <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="${color}" font-size="12" font-weight="800">${ev.npsScore}</text>
                <text x="${p.x}" y="${height - 12}" text-anchor="middle" fill="var(--text-muted, #94a3b8)" font-size="11" font-weight="600">${dateStr}</text>
              </g>
            `;
          }).join('')}
        </svg>
      </div>
    </div>
  `;
}
