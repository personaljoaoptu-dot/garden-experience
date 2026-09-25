import { renderStudentEvolutionChart } from './studentEvolutionChart.js';
import { renderStudentTouchpointEvolution } from './studentTouchpointEvolution.js';
import { renderStudentTimeline } from './studentTimeline.js';

export function renderStudentDetailView(student, studentResponses = [], studentCases = [], onBackClick) {
  if (!student) {
    return `
      <div style="padding: 2rem; text-align: center;">
        <p style="color: var(--text-muted);">Aluno não encontrado ou sem permissão de acesso.</p>
        <button class="btn btn-secondary" id="btnBackToStudentsList" style="margin-top: 1rem;">← Voltar para Lista</button>
      </div>
    `;
  }

  // Sort responses ascending to calculate delta
  const sortedResponses = [...studentResponses].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const totalCount = sortedResponses.length;

  const firstResponse = totalCount > 0 ? sortedResponses[0] : null;
  const lastResponse = totalCount > 0 ? sortedResponses[totalCount - 1] : null;

  const firstScore = firstResponse ? firstResponse.npsScore : null;
  const lastScore = lastResponse ? lastResponse.npsScore : null;

  let deltaText = '-';
  let deltaColor = 'var(--text-dim)';
  let deltaBg = 'rgba(255,255,255,0.05)';

  if (firstScore !== null && lastScore !== null && totalCount > 1) {
    const diff = lastScore - firstScore;
    if (diff > 0) {
      deltaText = `+${diff}`;
      deltaColor = 'var(--color-promoter, #10b981)';
      deltaBg = 'rgba(16,185,129,0.12)';
    } else if (diff < 0) {
      deltaText = `${diff}`;
      deltaColor = 'var(--color-detractor, #ef4444)';
      deltaBg = 'rgba(239,68,68,0.12)';
    } else {
      deltaText = '0 (estável)';
      deltaColor = 'var(--color-passive, #f59e0b)';
      deltaBg = 'rgba(245,158,11,0.12)';
    }
  } else if (totalCount === 1) {
    deltaText = '1ª Avaliação';
  }

  const currentClassification = lastScore !== null ? (lastScore >= 9 ? 'Promotor' : (lastScore >= 7 ? 'Neutro' : 'Detrator')) : 'Sem avaliações';
  const currentBadgeColor = lastScore !== null ? (lastScore >= 9 ? '#10b981' : (lastScore >= 7 ? '#f59e0b' : '#ef4444')) : '#94a3b8';

  const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AL';

  return `
    <div class="student-detail-pane" style="animation: fadeIn 0.25s ease-out;">
      <!-- Navigation Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <button class="btn btn-secondary" id="btnBackToStudentsList" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Voltar para Lista de Alunos
        </button>

        <div style="font-size:0.8rem; color:var(--text-dim); display:flex; align-items:center; gap:0.5rem;">
          <span>ID Aluno:</span>
          <code style="background:rgba(255,255,255,0.05); padding:0.15rem 0.4rem; border-radius:4px; font-size:0.75rem;">${student.id.slice(0, 18)}...</code>
        </div>
      </div>

      <!-- Student Card Header -->
      <div class="card" style="padding:1.75rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:14px; margin-bottom:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
          <div style="display:flex; align-items:center; gap:1.25rem;">
            <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--gold-primary, #f59e0b), #b45309); color:#000; font-weight:800; font-size:1.5rem; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(245,158,11,0.25);">
              ${initials}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); margin:0;">${student.name}</h2>
                <span style="padding:0.2rem 0.6rem; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-subtle);">
                  ${student.status === 'active' ? '● Aluno Ativo' : 'Inativo'}
                </span>
                ${student.externalEvoId ? `
                  <span style="padding:0.2rem 0.6rem; border-radius:20px; font-size:0.72rem; font-weight:700; background:rgba(59,130,246,0.12); color:#3b82f6; border:1px solid rgba(59,130,246,0.3);" title="Preparado para futura integração com EVO">
                    EVO ID: ${student.externalEvoId}
                  </span>
                ` : ''}
              </div>
              <div style="display:flex; gap:1.25rem; font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">
                <span>📧 ${student.email || 'E-mail não informado'}</span>
                <span>📞 ${student.phone || 'Telefone não informado'}</span>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:1rem;">
            <div style="text-align:right;">
              <span style="font-size:0.75rem; color:var(--text-dim); display:block; font-weight:600;">CLASSIFICAÇÃO ATUAL</span>
              <span style="font-size:1.05rem; font-weight:800; color:${currentBadgeColor};">${currentClassification}</span>
            </div>
          </div>
        </div>

        <!-- KPIs Bar -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:1rem; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--border-subtle);">
          <div style="background:rgba(255,255,255,0.02); padding:0.85rem; border-radius:8px; border:1px solid var(--border-subtle);">
            <span style="font-size:0.75rem; color:var(--text-dim); display:block;">NPS Inicial</span>
            <span style="font-size:1.3rem; font-weight:800; color:var(--text-primary);">${firstScore !== null ? firstScore : '-'}</span>
          </div>

          <div style="background:rgba(255,255,255,0.02); padding:0.85rem; border-radius:8px; border:1px solid var(--border-subtle);">
            <span style="font-size:0.75rem; color:var(--text-dim); display:block;">NPS Atual</span>
            <span style="font-size:1.3rem; font-weight:800; color:${currentBadgeColor};">${lastScore !== null ? lastScore : '-'}</span>
          </div>

          <div style="background:rgba(255,255,255,0.02); padding:0.85rem; border-radius:8px; border:1px solid var(--border-subtle);">
            <span style="font-size:0.75rem; color:var(--text-dim); display:block;">Variação Total</span>
            <span style="font-size:1.3rem; font-weight:800; color:${deltaColor};">${deltaText}</span>
          </div>

          <div style="background:rgba(255,255,255,0.02); padding:0.85rem; border-radius:8px; border:1px solid var(--border-subtle);">
            <span style="font-size:0.75rem; color:var(--text-dim); display:block;">Total de Avaliações</span>
            <span style="font-size:1.3rem; font-weight:800; color:var(--text-primary);">${totalCount}</span>
          </div>
        </div>
      </div>

      <!-- Evolution Chart -->
      <div style="margin-bottom:1.5rem;">
        ${renderStudentEvolutionChart(sortedResponses)}
      </div>

      <!-- Touchpoint Evolution Grid -->
      <div style="margin-bottom:1.5rem;">
        ${renderStudentTouchpointEvolution(sortedResponses)}
      </div>

      <!-- Timeline & Event Stream -->
      <div>
        ${renderStudentTimeline({ evaluations: sortedResponses, cases: studentCases, communications: [] })}
      </div>
    </div>
  `;
}
