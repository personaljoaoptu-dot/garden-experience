import { store } from '../../app/app-state/store.js';
import { renderStudentDetailView } from './studentDetailView.js';

let activeSelectedStudentId = null;

export function renderStudentEvolutionView() {
  const container = document.getElementById('studentEvolutionContainer');
  if (!container) return;

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 3rem; text-align: center; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px;">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5;">🔒</div>
        <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Organização Não Selecionada</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Por favor, selecione uma organização autenticada para visualizar a evolução da experiência dos alunos.</p>
      </div>
    `;
    return;
  }

  // If a student detail is currently selected, render the detail view
  if (activeSelectedStudentId) {
    const student = (activeOrg.students || []).find(s => s.id === activeSelectedStudentId);
    const studentResponses = (activeOrg.responses || []).filter(r => r.studentId === activeSelectedStudentId || r.student === student?.name);
    const studentCases = (activeOrg.followUpCases || []).filter(c => c.studentId === activeSelectedStudentId || c.student === student?.name);

    container.innerHTML = renderStudentDetailView(student, studentResponses, studentCases, () => {
      activeSelectedStudentId = null;
      renderStudentEvolutionView();
    });

    const btnBack = document.getElementById('btnBackToStudentsList');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        activeSelectedStudentId = null;
        renderStudentEvolutionView();
      });
    }
    return;
  }

  // Otherwise, render the Main List & Analytics View
  const units = activeOrg.units || [];
  const students = activeOrg.students || [];
  const responses = activeOrg.responses || [];

  // Read filter values if elements exist in DOM
  const selectedUnitCode = document.getElementById('selectUnitEvolution')?.value || 'all';
  const selectedClassification = document.getElementById('selectClassificationEvolution')?.value || 'all';
  const selectedTrend = document.getElementById('selectTrendEvolution')?.value || 'all';
  const searchText = (document.getElementById('inputSearchStudent')?.value || '').toLowerCase().trim();

  // Process student evolution metrics
  const processedStudents = students.map(st => {
    const stResponses = responses
      .filter(r => (r.studentId === st.id || r.student === st.name) && (selectedUnitCode === 'all' || r.unitCode === selectedUnitCode))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const totalResponses = stResponses.length;
    const firstScore = totalResponses > 0 ? stResponses[0].npsScore : null;
    const latestScore = totalResponses > 0 ? stResponses[totalResponses - 1].npsScore : null;
    const latestDate = totalResponses > 0 ? stResponses[totalResponses - 1].createdAt : null;

    let delta = 0;
    if (firstScore !== null && latestScore !== null && totalResponses > 1) {
      delta = latestScore - firstScore;
    }

    const currentClassification = latestScore !== null ? (latestScore >= 9 ? 'promoter' : (latestScore >= 7 ? 'passive' : 'detractor')) : 'none';

    return {
      ...st,
      responses: stResponses,
      totalResponses,
      firstScore,
      latestScore,
      latestDate,
      delta,
      currentClassification
    };
  }).filter(st => {
    if (st.totalResponses === 0) return false;
    if (searchText && !st.name.toLowerCase().includes(searchText) && !(st.email || '').toLowerCase().includes(searchText)) {
      return false;
    }
    if (selectedClassification !== 'all' && st.currentClassification !== selectedClassification) {
      return false;
    }
    if (selectedTrend === 'positive' && st.delta <= 0) return false;
    if (selectedTrend === 'negative' && st.delta >= 0) return false;
    if (selectedTrend === 'stable' && st.delta !== 0) return false;
    return true;
  });

  // Calculate Aggregated Metrics
  const totalTracked = processedStudents.length;
  let totalDeltaSum = 0;
  let studentsWithDelta = 0;
  let detractorsRecovered = 0;
  let recentDeclines = 0;

  processedStudents.forEach(st => {
    if (st.totalResponses > 1) {
      totalDeltaSum += st.delta;
      studentsWithDelta++;
    }
    if (st.firstScore !== null && st.firstScore <= 6 && st.latestScore !== null && st.latestScore > 6) {
      detractorsRecovered++;
    }
    if (st.delta < 0) {
      recentDeclines++;
    }
  });

  const avgDelta = studentsWithDelta > 0 ? (totalDeltaSum / studentsWithDelta).toFixed(1) : '0.0';
  const avgDeltaDisplay = Number(avgDelta) > 0 ? `+${avgDelta}` : avgDelta;

  // Sorted lists for top evolution and top decline
  const topEvolutions = [...processedStudents].filter(s => s.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const topDeclines = [...processedStudents].filter(s => s.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);

  container.innerHTML = `
    <div class="student-evolution-pane">
      <!-- Header Section -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
        <div>
          <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-primary); margin:0;">Evolução da Experiência</h2>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.25rem;">Veja como a percepção de cada aluno evoluiu ao longo do tempo com base no histórico de respostas.</p>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; margin-bottom:1.5rem;">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; align-items:center;">
          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-dim); display:block; margin-bottom:0.35rem;">UNIDADE</label>
            <select id="selectUnitEvolution" class="form-control" style="font-size:0.85rem;">
              <option value="all" ${selectedUnitCode === 'all' ? 'selected' : ''}>Todas as Unidades</option>
              ${units.map(u => `<option value="${u.code}" ${selectedUnitCode === u.code ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-dim); display:block; margin-bottom:0.35rem;">BUSCAR ALUNO</label>
            <input type="text" id="inputSearchStudent" class="form-control" placeholder="Nome ou e-mail..." value="${searchText}" style="font-size:0.85rem;">
          </div>

          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-dim); display:block; margin-bottom:0.35rem;">CLASSIFICAÇÃO ATUAL</label>
            <select id="selectClassificationEvolution" class="form-control" style="font-size:0.85rem;">
              <option value="all" ${selectedClassification === 'all' ? 'selected' : ''}>Todas</option>
              <option value="promoter" ${selectedClassification === 'promoter' ? 'selected' : ''}>Promotores (9-10)</option>
              <option value="passive" ${selectedClassification === 'passive' ? 'selected' : ''}>Neutros (7-8)</option>
              <option value="detractor" ${selectedClassification === 'detractor' ? 'selected' : ''}>Detratores (0-6)</option>
            </select>
          </div>

          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-dim); display:block; margin-bottom:0.35rem;">TENDÊNCIA</label>
            <select id="selectTrendEvolution" class="form-control" style="font-size:0.85rem;">
              <option value="all" ${selectedTrend === 'all' ? 'selected' : ''}>Todas as Tendências</option>
              <option value="positive" ${selectedTrend === 'positive' ? 'selected' : ''}>Evolução (+)</option>
              <option value="negative" ${selectedTrend === 'negative' ? 'selected' : ''}>Queda (-)</option>
              <option value="stable" ${selectedTrend === 'stable' ? 'selected' : ''}>Estável (=)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:1.5rem;">
        <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Alunos Acompanhados</span>
          <div style="font-size:1.8rem; font-weight:800; color:var(--text-primary); margin-top:0.35rem;">${totalTracked}</div>
          <span style="font-size:0.78rem; color:var(--text-muted);">Com respostas identificadas</span>
        </div>

        <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Evolução Média</span>
          <div style="font-size:1.8rem; font-weight:800; color:${Number(avgDelta) >= 0 ? '#10b981' : '#ef4444'}; margin-top:0.35rem;">${avgDeltaDisplay} pts</div>
          <span style="font-size:0.78rem; color:var(--text-muted);">Variação média do NPS</span>
        </div>

        <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Detratores Recuperados</span>
          <div style="font-size:1.8rem; font-weight:800; color:#10b981; margin-top:0.35rem;">${detractorsRecovered}</div>
          <span style="font-size:0.78rem; color:var(--text-muted);">Iniciaram ≤6 e evoluíram para >6</span>
        </div>

        <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Quedas de Avaliação</span>
          <div style="font-size:1.8rem; font-weight:800; color:#ef4444; margin-top:0.35rem;">${recentDeclines}</div>
          <span style="font-size:0.78rem; color:var(--text-muted);">Alunos com redução no NPS</span>
        </div>
      </div>

      <!-- Content Grid: Student List & Side Widgets -->
      <div style="display:grid; grid-template-columns: 2.2fr 1fr; gap:1.5rem; align-items:flex-start;">
        <!-- Left: Student List -->
        <div class="card" style="padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:1rem;">Histórico de Alunos Identificados</h3>

          ${processedStudents.length === 0 ? `
            <div style="padding:2.5rem; text-align:center; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem; opacity:0.5;">👤</div>
              <h4>Nenhum aluno encontrado</h4>
              <p style="font-size:0.85rem; color:var(--text-dim); margin-top:0.25rem;">Não há alunos identificados correspondentes aos filtros selecionados neste período.</p>
            </div>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:left;">
                <thead>
                  <tr style="border-bottom:2px solid var(--border-subtle); color:var(--text-dim); font-size:0.75rem; text-transform:uppercase;">
                    <th style="padding:0.75rem 1rem;">Aluno</th>
                    <th style="padding:0.75rem 1rem;">NPS Inicial</th>
                    <th style="padding:0.75rem 1rem;">NPS Atual</th>
                    <th style="padding:0.75rem 1rem;">Evolução</th>
                    <th style="padding:0.75rem 1rem;">Avaliações</th>
                    <th style="padding:0.75rem 1rem; text-anchor:end;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${processedStudents.map(st => {
                    const deltaBadgeColor = st.delta > 0 ? '#10b981' : (st.delta < 0 ? '#ef4444' : '#f59e0b');
                    const deltaBadgeBg = st.delta > 0 ? 'rgba(16,185,129,0.12)' : (st.delta < 0 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)');
                    const deltaStr = st.totalResponses > 1 ? (st.delta > 0 ? `+${st.delta}` : `${st.delta}`) : '1ª avaliação';

                    return `
                      <tr style="border-bottom:1px solid var(--border-subtle);" class="table-hover-row">
                        <td style="padding:0.75rem 1rem;">
                          <div style="font-weight:700; color:var(--text-primary);">${st.name}</div>
                          <div style="font-size:0.78rem; color:var(--text-dim);">${st.email || 'Sem e-mail'}</div>
                        </td>
                        <td style="padding:0.75rem 1rem; font-weight:700; color:var(--text-secondary);">${st.firstScore !== null ? st.firstScore : '-'}</td>
                        <td style="padding:0.75rem 1rem; font-weight:800; color:var(--text-primary);">${st.latestScore !== null ? st.latestScore : '-'}</td>
                        <td style="padding:0.75rem 1rem;">
                          <span style="padding:0.2rem 0.6rem; border-radius:6px; font-size:0.78rem; font-weight:700; color:${deltaBadgeColor}; background:${deltaBadgeBg};">
                            ${deltaStr}
                          </span>
                        </td>
                        <td style="padding:0.75rem 1rem; color:var(--text-secondary);">${st.totalResponses} reg.</td>
                        <td style="padding:0.75rem 1rem; text-align:right;">
                          <button class="btn btn-secondary btn-sm btn-view-student-detail" data-student-id="${st.id}" style="font-weight:600; font-size:0.8rem;">
                            Ver Evolução →
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Right: Side Widgets -->
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          <!-- Top Evoluções Widget -->
          <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
            <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:0.75rem;">🚀 Maiores Evoluções</h4>
            ${topEvolutions.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-dim);">Nenhum aluno com evolução positiva acumulada neste período.</p>
            ` : topEvolutions.map(st => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--border-subtle);">
                <div>
                  <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">${st.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-dim);">${st.firstScore} → ${st.latestScore}</div>
                </div>
                <span style="padding:0.15rem 0.5rem; border-radius:4px; font-size:0.78rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.12);">
                  +${st.delta}
                </span>
              </div>
            `).join('')}
          </div>

          <!-- Top Quedas Widget -->
          <div class="card" style="padding:1.25rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
            <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:0.75rem;">⚠️ Maiores Quedas</h4>
            ${topDeclines.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-dim);">Nenhuma queda de avaliação registrada neste período.</p>
            ` : topDeclines.map(st => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--border-subtle);">
                <div>
                  <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">${st.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-dim);">${st.firstScore} → ${st.latestScore}</div>
                </div>
                <span style="padding:0.15rem 0.5rem; border-radius:4px; font-size:0.78rem; font-weight:800; color:#ef4444; background:rgba(239,68,68,0.12);">
                  ${st.delta}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Listeners
  const bindFilters = () => {
    const elUnit = document.getElementById('selectUnitEvolution');
    const elClass = document.getElementById('selectClassificationEvolution');
    const elTrend = document.getElementById('selectTrendEvolution');
    const elSearch = document.getElementById('inputSearchStudent');

    [elUnit, elClass, elTrend].forEach(el => {
      if (el) el.addEventListener('change', () => renderStudentEvolutionView());
    });

    if (elSearch) {
      elSearch.addEventListener('input', () => {
        // debounce re-render
        clearTimeout(window.__studentSearchTimeout);
        window.__studentSearchTimeout = setTimeout(() => {
          renderStudentEvolutionView();
        }, 250);
      });
    }
  };

  bindFilters();

  // Attach click listener for "Ver Evolução" buttons
  const btnDetails = container.querySelectorAll('.btn-view-student-detail');
  btnDetails.forEach(btn => {
    btn.addEventListener('click', () => {
      const stId = btn.getAttribute('data-student-id');
      if (stId) {
        activeSelectedStudentId = stId;
        renderStudentEvolutionView();
      }
    });
  });
}

export function openStudentEvolutionDetail(studentId) {
  activeSelectedStudentId = studentId;
  const navBtn = document.querySelector('[data-mod="mod-student-evolution"]');
  if (navBtn) navBtn.click();
}
