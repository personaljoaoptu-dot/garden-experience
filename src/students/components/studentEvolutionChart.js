/**
 * Student Experience Evolution Line Chart Component
 * Renders an SVG line chart mapping 0-10 NPS evaluations over time with
 * clear visual trend diagnosis ("Melhorando", "Piorando", "Estável", or "1ª Avaliação").
 */

import { escapeHtml } from '../../core/utils/sanitizer.js';

function getCategoryLabel(score) {
  const s = Number(score);
  if (s >= 9) return 'Promotor';
  if (s >= 7) return 'Neutro';
  return 'Detrator';
}

function getScoreColor(score) {
  const s = Number(score);
  if (s >= 9) return '#10b981';
  if (s >= 7) return '#f59e0b';
  return '#ef4444';
}

export function renderStudentEvolutionChart(evaluations = []) {
  if (!evaluations || evaluations.length === 0) {
    return `
      <div class="empty-state-card" style="padding: 2.5rem; text-align: center; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">📊</div>
        <h4 style="margin-bottom: 0.5rem; color: var(--text-primary);">Histórico Insuficiente</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Não há avaliações registradas para gerar o gráfico de evolução deste aluno.</p>
      </div>
    `;
  }

  // Sort evaluations chronological ASC for chart rendering
  const sorted = [...evaluations].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const firstEv = sorted[0];
  const lastEv = sorted[sorted.length - 1];
  const firstScore = Number(firstEv.npsScore ?? 0);
  const lastScore = Number(lastEv.npsScore ?? 0);
  const delta = sorted.length > 1 ? (lastScore - firstScore) : 0;

  // Determine Trend Diagnosis Banner
  let bannerBg = 'rgba(229, 185, 63, 0.1)';
  let bannerBorder = 'rgba(229, 185, 63, 0.35)';
  let bannerColor = 'var(--gold-primary, #e5b93f)';
  let bannerIcon = '🆕';
  let bannerTitle = `Ponto de Partida Registrado (1ª Avaliação: Nota ${lastScore}/10)`;
  let bannerDesc = `Este aluno realizou sua 1ª avaliação como <strong>${getCategoryLabel(lastScore)}</strong>. Assim que ele responder uma nova pesquisa, a linha de evolução mostrará se a experiência está melhorando ou piorando.`;
  let strokeColor = '#e5b93f';
  let gradStopColor = '#e5b93f';

  if (sorted.length > 1) {
    if (delta > 0) {
      bannerBg = 'rgba(16, 185, 129, 0.1)';
      bannerBorder = 'rgba(16, 185, 129, 0.35)';
      bannerColor = '#10b981';
      bannerIcon = '📈';
      bannerTitle = `Experiência Melhorando (+${delta} pontos no NPS)`;
      bannerDesc = `Excelente evolução! O aluno subiu da nota <strong>${firstScore}/10 (${getCategoryLabel(firstScore)})</strong> na 1ª avaliação para <strong>${lastScore}/10 (${getCategoryLabel(lastScore)})</strong> na avaliação mais recente.`;
      strokeColor = '#10b981';
      gradStopColor = '#10b981';
    } else if (delta < 0) {
      bannerBg = 'rgba(239, 68, 68, 0.1)';
      bannerBorder = 'rgba(239, 68, 68, 0.35)';
      bannerColor = '#ef4444';
      bannerIcon = '📉';
      bannerTitle = `Experiência Piorando (${delta} pontos no NPS)`;
      bannerDesc = `Atenção necessária: a percepção do aluno caiu de <strong>${firstScore}/10 (${getCategoryLabel(firstScore)})</strong> para <strong>${lastScore}/10 (${getCategoryLabel(lastScore)})</strong>. Verifique os setores abaixo e entre em contato.`;
      strokeColor = '#ef4444';
      gradStopColor = '#ef4444';
    } else {
      bannerBg = 'rgba(245, 158, 11, 0.1)';
      bannerBorder = 'rgba(245, 158, 11, 0.35)';
      bannerColor = '#f59e0b';
      bannerIcon = '➖';
      bannerTitle = `Experiência Estável (Manteve Nota ${lastScore}/10)`;
      bannerDesc = `O aluno manteve a mesma nota <strong>${lastScore}/10 (${getCategoryLabel(lastScore)})</strong> entre a primeira e a última avaliação.`;
      strokeColor = '#f59e0b';
      gradStopColor = '#f59e0b';
    }
  }

  const width = 800;
  const height = 265;
  const paddingX = 56;
  const paddingTop = 28;
  const paddingBottom = 42;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const yForScore = (s) => paddingTop + chartHeight - (Math.max(0, Math.min(10, Number(s))) / 10) * chartHeight;

  const points = sorted.map((ev, idx) => {
    const x = sorted.length === 1
      ? paddingX + chartWidth / 2
      : paddingX + (idx / (sorted.length - 1)) * chartWidth;
    const y = yForScore(ev.npsScore);
    return { x, y, ev, idx };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const areaPoints = sorted.length > 1
    ? [
        `${points[0].x.toFixed(1)},${(paddingTop + chartHeight).toFixed(1)}`,
        ...points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
        `${points[points.length - 1].x.toFixed(1)},${(paddingTop + chartHeight).toFixed(1)}`
      ].join(' ')
    : '';

  const gridYValues = [0, 2, 4, 6, 8, 10];

  // Zone background heights (Promoter: 8.5..10, Passive: 6.5..8.5, Detractor: 0..6.5)
  const yTop10 = yForScore(10);
  const yPromoterBottom = yForScore(8.5);
  const yPassiveBottom = yForScore(6.5);
  const yBottom0 = yForScore(0);

  // Build step-by-step cards below chart
  const stepsHtml = sorted.map((ev, idx) => {
    const score = Number(ev.npsScore ?? 0);
    const color = getScoreColor(score);
    const cat = getCategoryLabel(score);
    const dateFull = new Date(ev.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const prevScore = idx > 0 ? Number(sorted[idx - 1].npsScore ?? 0) : null;
    const stepDiff = prevScore !== null ? (score - prevScore) : null;
    let stepDeltaBadge = `<span style="font-size:0.7rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">1ª Avaliação</span>`;
    if (stepDiff !== null) {
      if (stepDiff > 0) {
        stepDeltaBadge = `<span style="font-size:0.72rem; font-weight:700; color:#10b981; background:rgba(16,185,129,0.12); padding:2px 6px; border-radius:4px;">▲ +${stepDiff} pts</span>`;
      } else if (stepDiff < 0) {
        stepDeltaBadge = `<span style="font-size:0.72rem; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.12); padding:2px 6px; border-radius:4px;">▼ ${stepDiff} pts</span>`;
      } else {
        stepDeltaBadge = `<span style="font-size:0.72rem; font-weight:700; color:#f59e0b; background:rgba(245,158,11,0.12); padding:2px 6px; border-radius:4px;">= Manteve</span>`;
      }
    }

    return `
      <div style="flex:1; min-width:190px; padding:0.85rem 1rem; background:var(--bg-card-surface, rgba(255,255,255,0.03)); border:1px solid var(--border-subtle); border-left:3px solid ${color}; border-radius:10px; display:flex; flex-direction:column; gap:0.35rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem;">
          <span style="font-size:0.74rem; font-weight:700; color:var(--text-muted);">${idx + 1}ª Avaliação • ${dateFull}</span>
          ${stepDeltaBadge}
        </div>
        <div style="display:flex; align-items:baseline; gap:0.5rem;">
          <span style="font-size:1.35rem; font-weight:800; color:${color}; font-family:var(--font-title);">Nota ${score}/10</span>
          <span style="font-size:0.75rem; font-weight:700; color:${color};">(${cat})</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">
          "${escapeHtml(ev.comment || 'Sem comentário por escrito.')}"
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="evolution-chart-container" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1.5rem; position: relative;">
      <!-- Visual Diagnosis Banner -->
      <div style="display:flex; align-items:flex-start; gap:0.9rem; padding:1rem 1.15rem; border-radius:10px; background:${bannerBg}; border:1px solid ${bannerBorder}; margin-bottom:1.25rem;">
        <div style="font-size:1.75rem; line-height:1;">${bannerIcon}</div>
        <div style="flex:1;">
          <div style="font-size:1rem; font-weight:800; color:${bannerColor}; margin-bottom:0.2rem;">${bannerTitle}</div>
          <div style="font-size:0.84rem; color:var(--text-main); line-height:1.45;">${bannerDesc}</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom: 1rem;">
        <div>
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin:0;">Gráfico de Evolução da Experiência (Escala NPS 0 a 10)</h4>
          <span style="font-size:0.8rem; color:var(--text-dim);">${sorted.length} avaliação(ões) registrada(s) no histórico do aluno</span>
        </div>
        <div style="display:flex; gap:0.85rem; font-size:0.76rem; font-weight:700; flex-wrap:wrap;">
          <span style="color:#10b981;">● Zona Promotor (9–10)</span>
          <span style="color:#f59e0b;">● Zona Neutra (7–8)</span>
          <span style="color:#ef4444;">● Zona Detrator (0–6)</span>
        </div>
      </div>

      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; min-width: 480px;" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="studentEvoChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${gradStopColor}" stop-opacity="0.32"/>
              <stop offset="100%" stop-color="${gradStopColor}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>

          <!-- Colored Zone Background Bands -->
          <rect x="${paddingX}" y="${yTop10}" width="${chartWidth}" height="${yPromoterBottom - yTop10}" fill="rgba(16, 185, 129, 0.05)" rx="4" />
          <rect x="${paddingX}" y="${yPromoterBottom}" width="${chartWidth}" height="${yPassiveBottom - yPromoterBottom}" fill="rgba(245, 158, 11, 0.04)" />
          <rect x="${paddingX}" y="${yPassiveBottom}" width="${chartWidth}" height="${yBottom0 - yPassiveBottom}" fill="rgba(239, 68, 68, 0.04)" rx="4" />

          <!-- Horizontal Grid Lines -->
          ${gridYValues.map(val => {
            const y = yForScore(val);
            return `
              <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3,3" />
              <text x="${paddingX - 10}" y="${y + 4}" text-anchor="end" fill="var(--text-dim, #94a3b8)" font-size="11" font-weight="600">${val}</text>
            `;
          }).join('')}

          ${sorted.length > 1 ? `
            <!-- Fill Area under curve -->
            <polygon points="${areaPoints}" fill="url(#studentEvoChartGrad)" />

            <!-- Line plot -->
            <polyline points="${polylinePoints}" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          ` : `
            <!-- Single evaluation reference line -->
            <line x1="${paddingX}" y1="${points[0].y}" x2="${width - paddingX}" y2="${points[0].y}" stroke="${ getScoreColor(points[0].ev.npsScore) }" stroke-width="2" stroke-dasharray="6,6" opacity="0.6" />
          `}

          <!-- Points and labels -->
          ${points.map((p, i) => {
            const ev = p.ev;
            const color = getScoreColor(ev.npsScore);
            const dateStr = new Date(ev.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeStr = new Date(ev.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const labelText = sorted.length > 1 ? `${i + 1}ª (${dateStr})` : `1ª Avaliação (${dateStr} às ${timeStr})`;
            return `
              <g class="chart-point-group" cursor="pointer">
                <circle cx="${p.x}" cy="${p.y}" r="8" fill="${color}" stroke="#0f172a" stroke-width="2.5">
                  <title>${i + 1}ª Avaliação (${dateStr} ${timeStr})&#10;Nota: ${ev.npsScore}/10 (${getCategoryLabel(ev.npsScore)})&#10;Comentário: ${escapeHtml(ev.comment || 'Sem comentário')}</title>
                </circle>
                <rect x="${p.x - 24}" y="${p.y - 30}" width="48" height="19" rx="5" fill="#0f172a" stroke="${color}" stroke-width="1.2" />
                <text x="${p.x}" y="${p.y - 17}" text-anchor="middle" fill="${color}" font-size="11.5" font-weight="800">Nota ${ev.npsScore}</text>
                <text x="${p.x}" y="${height - 12}" text-anchor="middle" fill="var(--text-muted, #94a3b8)" font-size="11" font-weight="600">${labelText}</text>
              </g>
            `;
          }).join('')}
        </svg>
      </div>

      <!-- Step-by-Step Evaluation Cards Strip -->
      <div style="margin-top:1.25rem; padding-top:1.1rem; border-top:1px solid var(--border-subtle);">
        <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.65rem;">
          📋 Histórico Passo a Passo das Avaliações (${sorted.length})
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          ${stepsHtml}
        </div>
      </div>
    </div>
  `;
}
