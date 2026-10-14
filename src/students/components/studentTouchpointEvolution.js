/**
 * Student Touchpoint Evolution Component
 * Displays clear, visual touchpoint ratings and progression per sector without raw UUIDs or false deltas on 1st evaluation.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const KNOWN_TOUCHPOINTS_FALLBACK = {
  t1: { name: 'Atendimento da Recepção', category: 'Atendimento' },
  t2: { name: 'Atendimento dos Professores', category: 'Atendimento' },
  t3: { name: 'Limpeza & Higiene', category: 'Limpeza' },
  t4: { name: 'Equipamentos & Manutenção', category: 'Equipamentos' },
  '11111111-1111-1111-1111-111111111111': { name: 'Atendimento da Recepção', category: 'Atendimento' },
  '22222222-2222-2222-2222-222222222222': { name: 'Atendimento dos Professores', category: 'Atendimento' },
  '33333333-3333-3333-3333-333333333333': { name: 'Limpeza & Higiene', category: 'Estrutura' },
  '44444444-4444-4444-4444-444444444444': { name: 'Manutenção dos Equipamentos', category: 'Estrutura' },
  '5d9b3e57-5382-4132-9c92-a8039ec04eeb': { name: 'Atendimento dos Professores de Musculação', category: 'Atendimento' },
  '2256951e-63d9-475f-82ed-cdeac62f92cb': { name: 'Atendimento da Recepção', category: 'Atendimento' },
  '58f9131a-3969-447a-8a1c-5396b1fdb9f5': { name: 'Treinos', category: 'Geral' },
  'bbb1846d-9e3f-4991-9466-74adb53a6487': { name: 'Equipamentos e Acessórios', category: 'Equipamentos' },
  '91385d3c-c701-4dc9-b02f-b11fda7c8747': { name: 'Limpeza e Higienização', category: 'Limpeza' },
  '566c8fd4-e842-47e2-b5cf-f31579d62171': { name: 'Manutenção', category: 'Equipamentos' },
  'f15aa5bc-02e8-4860-8bb2-d9f975882814': { name: 'Estrutura', category: 'Estrutura' }
};

export function resolveTouchpointMeta(key, catalog = [], index = 1) {
  const cleanKey = String(key || '').trim();
  const lowerKey = cleanKey.toLowerCase();

  const allCatalog = [
    ...(Array.isArray(catalog) ? catalog : []),
    ...(store.getActiveOrg()?.touchpoints || []),
    ...(store.touchpoints || [])
  ];

  const matched = allCatalog.find(t =>
    String(t.id || '').toLowerCase() === lowerKey ||
    String(t.code || '').toLowerCase() === lowerKey ||
    String(t.name || '').toLowerCase() === lowerKey
  );

  if (matched) {
    return {
      name: matched.name,
      category: matched.category || 'Geral'
    };
  }

  if (KNOWN_TOUCHPOINTS_FALLBACK[lowerKey]) {
    return KNOWN_TOUCHPOINTS_FALLBACK[lowerKey];
  }

  // Never show a raw 36-char UUID to the user
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);
  return {
    name: isUuid ? `Ponto de Contato #${index}` : cleanKey,
    category: 'Geral'
  };
}

function renderStars(score) {
  const num = Math.max(0, Math.min(5, Math.round(Number(score) || 0)));
  return '★'.repeat(num) + '☆'.repeat(5 - num);
}

export function renderStudentTouchpointEvolution(evaluations = [], touchpointsCatalog = []) {
  if (!evaluations || evaluations.length === 0) {
    return `
      <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
        <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Avaliação por Ponto de Contato</h4>
        <p style="color:var(--text-muted); font-size:0.85rem;">Nenhuma avaliação de ponto de contato registrada para este aluno.</p>
      </div>
    `;
  }

  // Sort evaluations ascending by date
  const sorted = [...evaluations].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Collect all touchpoint keys rated across evaluations
  const ratedKeys = new Set();
  sorted.forEach(ev => {
    if (ev.touchpointRatings && typeof ev.touchpointRatings === 'object') {
      Object.keys(ev.touchpointRatings).forEach(k => ratedKeys.add(k));
    }
  });

  if (ratedKeys.size === 0) {
    return `
      <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
        <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Avaliação por Ponto de Contato</h4>
        <p style="color:var(--text-muted); font-size:0.85rem;">Nenhum detalhamento individual de ponto de contato foi preenchido nas avaliações deste aluno.</p>
      </div>
    `;
  }

  const isSingleEvaluation = sorted.length === 1;
  const firstEv = sorted[0];
  const lastEv = sorted[sorted.length - 1];
  const firstDateStr = new Date(firstEv.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const lastDateStr = new Date(lastEv.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  // CASE 1: Student has only 1 evaluation -> Show clean Sector Ratings Grid (no fake Before/After comparison)
  if (isSingleEvaluation) {
    const cardsHtml = Array.from(ratedKeys).map((key, idx) => {
      const meta = resolveTouchpointMeta(key, touchpointsCatalog, idx + 1);
      const rawVal = lastEv.touchpointRatings ? lastEv.touchpointRatings[key] : undefined;
      const hasVal = rawVal !== undefined && rawVal !== null;
      const numVal = hasVal ? Number(rawVal) : 0;
      const pct = hasVal ? Math.round((numVal / 5) * 100) : 0;

      const barColor = numVal >= 4.5 ? '#10b981' : numVal >= 3.5 ? '#f59e0b' : '#ef4444';
      const statusLabel = numVal >= 4.5 ? 'Excelente' : numVal >= 3.5 ? 'Bom' : 'Atenção';

      return `
        <div style="padding:1rem 1.15rem; background:rgba(255,255,255,0.025); border:1px solid var(--border-subtle); border-radius:10px; display:flex; flex-direction:column; gap:0.55rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
            <div>
              <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary);">${escapeHtml(meta.name)}</div>
              <span style="font-size:0.72rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:2px 7px; border-radius:4px; display:inline-block; margin-top:0.2rem;">
                📍 ${escapeHtml(meta.category)}
              </span>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              ${hasVal ? `
                <div style="font-size:1.05rem; font-weight:800; color:${barColor};">${numVal.toFixed(1)}<span style="font-size:0.75rem; color:var(--text-muted);">/5</span></div>
                <div style="font-size:0.75rem; color:var(--gold-primary); letter-spacing:1px;">${renderStars(numVal)}</div>
              ` : `<span style="font-size:0.78rem; color:var(--text-dim);">Não avaliado</span>`}
            </div>
          </div>

          <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:999px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:999px;"></div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.73rem; color:var(--text-muted);">
            <span>Avaliado em ${lastDateStr}</span>
            <span style="color:${barColor}; font-weight:600;">● ${statusLabel}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.75rem; margin-bottom:1.15rem;">
          <div>
            <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin:0;">Notas por Ponto de Contato (1ª Avaliação)</h4>
            <span style="font-size:0.82rem; color:var(--text-muted); display:block; margin-top:0.2rem;">
              Veja a nota que o aluno deu para cada setor da academia (escala de 1 a 5 estrelas). Quando ele avaliar novamente, o comparativo de evolução aparecerá aqui.
            </span>
          </div>
          <span class="badge-status passive" style="font-size:0.74rem;">1ª Avaliação em ${lastDateStr}</span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:0.85rem;">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  // CASE 2: Student has 2+ evaluations -> Show clear Before vs. Now comparison table
  const touchpointRows = Array.from(ratedKeys).map((key, idx) => {
    const meta = resolveTouchpointMeta(key, touchpointsCatalog, idx + 1);

    const firstVal = firstEv.touchpointRatings ? firstEv.touchpointRatings[key] : undefined;
    const lastVal = lastEv.touchpointRatings ? lastEv.touchpointRatings[key] : undefined;

    const hasFirst = firstVal !== undefined && firstVal !== null;
    const hasLast = lastVal !== undefined && lastVal !== null;

    const firstDisplay = hasFirst
      ? `<div style="font-weight:700; color:var(--text-primary);">${Number(firstVal).toFixed(1)}/5 <span style="color:var(--gold-primary); font-size:0.75rem;">${renderStars(firstVal)}</span></div>`
      : '<span style="color:var(--text-dim); font-style:italic;">Não avaliado</span>';

    const lastDisplay = hasLast
      ? `<div style="font-weight:700; color:var(--text-primary);">${Number(lastVal).toFixed(1)}/5 <span style="color:var(--gold-primary); font-size:0.75rem;">${renderStars(lastVal)}</span></div>`
      : '<span style="color:var(--text-dim); font-style:italic;">Não avaliado</span>';

    let deltaText = '—';
    let badgeStyle = 'color:var(--text-dim); background:rgba(255,255,255,0.04);';

    if (hasFirst && hasLast) {
      const diff = Number(lastVal) - Number(firstVal);
      if (diff > 0) {
        deltaText = `▲ +${diff.toFixed(1)} (Evoluiu)`;
        badgeStyle = 'color:#10b981; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3);';
      } else if (diff < 0) {
        deltaText = `▼ ${diff.toFixed(1)} (Caiu)`;
        badgeStyle = 'color:#ef4444; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3);';
      } else {
        deltaText = `= Manteve ${Number(lastVal).toFixed(1)}/5`;
        badgeStyle = 'color:#10b981; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2);';
      }
    }

    return `
      <tr style="border-bottom:1px solid var(--border-subtle);">
        <td style="padding:0.85rem 1rem;">
          <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${escapeHtml(meta.name)}</div>
          <span style="font-size:0.72rem; color:var(--text-muted);">📍 ${escapeHtml(meta.category)}</span>
        </td>
        <td style="padding:0.85rem 1rem;">${firstDisplay}</td>
        <td style="padding:0.85rem 1rem;">${lastDisplay}</td>
        <td style="padding:0.85rem 1rem;">
          <span style="display:inline-block; padding:0.25rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:700; ${badgeStyle}">
            ${deltaText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
        <div>
          <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin:0;">Evolução por Ponto de Contato</h4>
          <span style="font-size:0.82rem; color:var(--text-muted);">Comparativo entre a 1ª avaliação (${firstDateStr}) e a avaliação mais recente (${lastDateStr})</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:left;">
          <thead>
            <tr style="border-bottom:2px solid var(--border-subtle); color:var(--text-dim); font-size:0.76rem; text-transform:uppercase; letter-spacing:0.04em;">
              <th style="padding:0.6rem 1rem;">Setor / Ponto de Contato</th>
              <th style="padding:0.6rem 1rem;">1ª Avaliação (${firstDateStr})</th>
              <th style="padding:0.6rem 1rem;">Nota Atual (${lastDateStr})</th>
              <th style="padding:0.6rem 1rem;">Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${touchpointRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
