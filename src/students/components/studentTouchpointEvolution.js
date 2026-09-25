/**
 * Student Touchpoint Evolution Component
 * Displays touchpoint rating progression per touchpoint without zero fallbacks.
 */

export function renderStudentTouchpointEvolution(evaluations = [], touchpointsCatalog = []) {
  if (!evaluations || evaluations.length === 0) {
    return `
      <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
        <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Evolução por Ponto de Contato</h4>
        <p style="color:var(--text-muted); font-size:0.85rem;">Nenhuma avaliação de ponto de contato registrada para este aluno.</p>
      </div>
    `;
  }

  // Sort evaluations ascending by date
  const sorted = [...evaluations].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Map touchpoint keys (e.g., t1, t2, t3, t4 or names)
  const defaultTouchpointNames = {
    t1: 'Atendimento & Recepção',
    t2: 'Professores & Instrução',
    t3: 'Limpeza & Higiene',
    t4: 'Equipamentos & Manutenção'
  };

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
        <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Evolução por Ponto de Contato</h4>
        <p style="color:var(--text-muted); font-size:0.85rem;">Nenhum detalhamento individual de ponto de contato foi preenchido nas avaliações deste aluno.</p>
      </div>
    `;
  }

  const firstEv = sorted[0];
  const lastEv = sorted[sorted.length - 1];

  const touchpointRows = Array.from(ratedKeys).map(key => {
    const catalogTp = touchpointsCatalog.find(t => t.id === key || t.code === key);
    const name = catalogTp ? catalogTp.name : (defaultTouchpointNames[key] || key.toUpperCase());

    const firstVal = firstEv.touchpointRatings ? firstEv.touchpointRatings[key] : undefined;
    const lastVal = lastEv.touchpointRatings ? lastEv.touchpointRatings[key] : undefined;

    const firstDisplay = firstVal !== undefined && firstVal !== null ? `${Number(firstVal).toFixed(1)}/5` : '<span style="color:var(--text-dim); italic">não avaliado</span>';
    const lastDisplay = lastVal !== undefined && lastVal !== null ? `${Number(lastVal).toFixed(1)}/5` : '<span style="color:var(--text-dim); italic">não avaliado</span>';

    let deltaText = '-';
    let badgeClass = 'color:var(--text-dim); background:rgba(255,255,255,0.04)';

    if (firstVal !== undefined && lastVal !== undefined && firstVal !== null && lastVal !== null) {
      const diff = Number(lastVal) - Number(firstVal);
      if (diff > 0) {
        deltaText = `+${diff.toFixed(1)}`;
        badgeClass = 'color:var(--color-promoter, #10b981); background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3);';
      } else if (diff < 0) {
        deltaText = `${diff.toFixed(1)}`;
        badgeClass = 'color:var(--color-detractor, #ef4444); background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3);';
      } else {
        deltaText = '0.0 (estável)';
        badgeClass = 'color:var(--color-passive, #f59e0b); background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3);';
      }
    }

    return `
      <tr style="border-bottom:1px solid var(--border-subtle);">
        <td style="padding:0.75rem 1rem; font-weight:600; color:var(--text-primary);">${name}</td>
        <td style="padding:0.75rem 1rem; color:var(--text-secondary);">${firstDisplay}</td>
        <td style="padding:0.75rem 1rem; color:var(--text-secondary);">${lastDisplay}</td>
        <td style="padding:0.75rem 1rem;">
          <span style="display:inline-block; padding:0.2rem 0.6rem; border-radius:6px; font-size:0.8rem; font-weight:700; ${badgeClass}">
            ${deltaText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">Evolução por Ponto de Contato</h4>
          <span style="font-size:0.8rem; color:var(--text-dim);">Comparação entre a primeira e a última nota (escala de 1 a 5)</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:left;">
          <thead>
            <tr style="border-bottom:2px solid var(--border-subtle); color:var(--text-dim); font-size:0.78rem; text-transform:uppercase; letter-spacing:0.04em;">
              <th style="padding:0.6rem 1rem;">Ponto de Contato</th>
              <th style="padding:0.6rem 1rem;">Nota Inicial</th>
              <th style="padding:0.6rem 1rem;">Nota Atual</th>
              <th style="padding:0.6rem 1rem;">Variação</th>
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
