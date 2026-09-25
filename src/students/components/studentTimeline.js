/**
 * Student Timeline Component
 * Chronological timeline connecting responses, follow-up cases, and registered communication logs.
 */

export function renderStudentTimeline({ evaluations = [], cases = [], communications = [] }) {
  // Collect all events into a unified chronological stream
  const events = [];

  evaluations.forEach(ev => {
    events.push({
      type: 'response',
      timestamp: new Date(ev.createdAt).getTime(),
      dateStr: new Date(ev.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      data: ev
    });
  });

  cases.forEach(cs => {
    events.push({
      type: 'case',
      timestamp: new Date(cs.createdAt).getTime(),
      dateStr: new Date(cs.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      data: cs
    });
  });

  communications.forEach(cm => {
    events.push({
      type: 'communication',
      timestamp: new Date(cm.createdAt || Date.now()).getTime(),
      dateStr: new Date(cm.createdAt || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      data: cm
    });
  });

  // Sort events chronologically DESC (most recent at top)
  events.sort((a, b) => b.timestamp - a.timestamp);

  if (events.length === 0) {
    return `
      <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
        <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Linha do Tempo de Eventos</h4>
        <p style="color:var(--text-muted); font-size:0.85rem;">Nenhum evento registrado no histórico deste aluno.</p>
      </div>
    `;
  }

  const renderedEvents = events.map(evt => {
    if (evt.type === 'response') {
      const res = evt.data;
      const isPromoter = res.npsScore >= 9;
      const isPassive = res.npsScore >= 7 && res.npsScore <= 8;
      const badgeColor = isPromoter ? '#10b981' : (isPassive ? '#f59e0b' : '#ef4444');
      const badgeBg = isPromoter ? 'rgba(16,185,129,0.12)' : (isPassive ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)');
      const label = isPromoter ? 'PROMOTOR' : (isPassive ? 'NEUTRO' : 'DETRATOR');

      return `
        <div class="timeline-item" style="position:relative; padding-left:2rem; padding-bottom:1.5rem; border-left:2px solid rgba(255,255,255,0.08);">
          <div style="position:absolute; left:-9px; top:0; width:16px; height:16px; border-radius:50%; background:${badgeColor}; border:3px solid var(--bg-card);"></div>
          
          <div style="font-size:0.75rem; color:var(--text-dim); font-weight:600; margin-bottom:0.25rem;">
            ${evt.dateStr} — Avaliação NPS
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
            <span style="font-size:1.1rem; font-weight:800; color:${badgeColor};">Nota ${res.npsScore}/10</span>
            <span style="padding:0.15rem 0.5rem; border-radius:4px; font-size:0.72rem; font-weight:700; color:${badgeColor}; background:${badgeBg};">
              ${label}
            </span>
            <span style="font-size:0.75rem; color:var(--text-dim);">Origem: ${res.origin || 'web'}</span>
          </div>

          ${res.comment ? `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:0.75rem; font-size:0.88rem; color:var(--text-primary); margin-top:0.25rem;">
              "${res.comment}"
            </div>
          ` : '<div style="font-size:0.82rem; color:var(--text-dim); italic">Sem comentário escrito.</div>'}
        </div>
      `;
    }

    if (evt.type === 'case') {
      const cs = evt.data;
      const statusLabel = cs.status === 'resolved' ? 'RESOLVIDO' : (cs.status === 'in_progress' ? 'EM TRATATIVA' : 'PENDENTE');
      const statusColor = cs.status === 'resolved' ? '#10b981' : (cs.status === 'in_progress' ? '#3b82f6' : '#f59e0b');

      return `
        <div class="timeline-item" style="position:relative; padding-left:2rem; padding-bottom:1.5rem; border-left:2px solid rgba(255,255,255,0.08);">
          <div style="position:absolute; left:-9px; top:0; width:16px; height:16px; border-radius:50%; background:#3b82f6; border:3px solid var(--bg-card);"></div>
          
          <div style="font-size:0.75rem; color:var(--text-dim); font-weight:600; margin-bottom:0.25rem;">
            ${evt.dateStr} — Acompanhamento de Detrator
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
            <span style="font-size:0.92rem; font-weight:700; color:var(--text-primary);">Case #${cs.id.slice(-6)}</span>
            <span style="padding:0.15rem 0.5rem; border-radius:4px; font-size:0.72rem; font-weight:700; color:${statusColor}; background:rgba(59,130,246,0.12);">
              ${statusLabel}
            </span>
            <span style="font-size:0.75rem; color:var(--text-dim);">Responsável: ${cs.assignedUser || 'Gestão'}</span>
          </div>

          <div style="background:rgba(59,130,246,0.05); border:1px solid rgba(59,130,246,0.2); border-radius:8px; padding:0.75rem; font-size:0.85rem; color:var(--text-secondary);">
            <strong>Ação Registrada:</strong> ${cs.internalNotes || 'Em acompanhamento operacional.'}
          </div>
        </div>
      `;
    }

    if (evt.type === 'communication') {
      const cm = evt.data;
      return `
        <div class="timeline-item" style="position:relative; padding-left:2rem; padding-bottom:1.5rem; border-left:2px solid rgba(255,255,255,0.08);">
          <div style="position:absolute; left:-9px; top:0; width:16px; height:16px; border-radius:50%; background:#8b5cf6; border:3px solid var(--bg-card);"></div>
          
          <div style="font-size:0.75rem; color:var(--text-dim); font-weight:600; margin-bottom:0.25rem;">
            ${evt.dateStr} — Comunicação Registrada (${cm.type || 'Contato'})
          </div>

          <div style="background:rgba(139,92,246,0.05); border:1px solid rgba(139,92,246,0.2); border-radius:8px; padding:0.75rem; font-size:0.85rem; color:var(--text-secondary);">
            ${cm.notes || 'Registro de atendimento telefônico / mensagem.'}
          </div>
        </div>
      `;
    }

    return '';
  }).join('');

  return `
    <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
        <div>
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">Linha do Tempo Cronológica</h4>
          <span style="font-size:0.8rem; color:var(--text-dim);">Eventos, avaliações e acompanhamentos registrados no sistema</span>
        </div>
      </div>

      <div class="timeline-stream" style="padding-top:0.5rem;">
        ${renderedEvents}
      </div>

      <div style="margin-top:0.5rem; padding-top:0.75rem; border-top:1px solid var(--border-subtle); font-size:0.78rem; color:var(--text-dim); display:flex; align-items:center; gap:0.5rem;">
        <span>ℹ️</span>
        <span>A linha do tempo reflete eventos reais gravados no Supabase sem inferência de causalidade não documentada.</span>
      </div>
    </div>
  `;
}
