import { store } from '../../app/app-state/store.js';
import { renderStudentDetailView } from './studentDetailView.js';
import { renderStudentEvolutionChart } from './studentEvolutionChart.js';

let activeSelectedStudentId = null;
let activePreviewStudentId = null;

export function renderStudentEvolutionView() {
  const container = document.getElementById('studentEvolutionContainer');
  if (!container) return;

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">🔒</div>
        <h3 class="empty-state-title">Organização Não Selecionada</h3>
        <p class="empty-state-desc">Por favor, selecione uma organização autenticada para visualizar a evolução da experiência dos alunos.</p>
      </div>
    `;
    return;
  }

  // If a student detail is currently selected, render the detail view
  if (activeSelectedStudentId) {
    const student = (activeOrg.students || []).find(s => s.id === activeSelectedStudentId);
    const studentResponses = (activeOrg.responses || []).filter(r => r.studentId === activeSelectedStudentId);
    const studentCases = (activeOrg.followUpCases || []).filter(c => c.studentId === activeSelectedStudentId);
    const studentComms = (activeOrg.communicationLogs || []).filter(l => l.studentId === activeSelectedStudentId || (l.caseId && studentCases.some(c => c.id === l.caseId)));

    container.innerHTML = renderStudentDetailView(student, studentResponses, studentCases, studentComms, () => {
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
  const selectedPeriod = document.getElementById('selectPeriodEvolution')?.value || 'all';
  const selectedClassification = document.getElementById('selectClassificationEvolution')?.value || 'all';
  const selectedTrend = document.getElementById('selectTrendEvolution')?.value || 'all';
  const searchText = (document.getElementById('inputSearchStudent')?.value || '').toLowerCase().trim();

  // Calculate period timestamp cutoff
  let minPeriodMs = 0;
  const nowMs = Date.now();
  if (selectedPeriod === '30d') minPeriodMs = nowMs - 30 * 86400000;
  else if (selectedPeriod === '90d') minPeriodMs = nowMs - 90 * 86400000;
  else if (selectedPeriod === '180d') minPeriodMs = nowMs - 180 * 86400000;
  else if (selectedPeriod === '365d') minPeriodMs = nowMs - 365 * 86400000;

  // Process student evolution metrics strictly by ID within the selected period
  const processedStudents = students.map(st => {
    const stResponses = responses
      .filter(r => r.studentId === st.id && (selectedUnitCode === 'all' || r.unitCode === selectedUnitCode))
      .filter(r => minPeriodMs === 0 || new Date(r.createdAt).getTime() >= minPeriodMs)
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
    if (selectedTrend === 'stable' && (st.delta !== 0 || st.totalResponses <= 1)) return false;
    return true;
  });

  // Calculate Aggregated Metrics (excluding single evaluation students from avg delta)
  const totalTracked = processedStudents.length;
  let totalDeltaSum = 0;
  let studentsWithDelta = 0;
  let detractorsRecovered = 0;
  let recentDeclines = 0;

  processedStudents.forEach(st => {
    if (st.totalResponses > 1) {
      totalDeltaSum += st.delta;
      studentsWithDelta++;

      if (st.firstScore <= 6 && st.latestScore > 6) {
        detractorsRecovered++;
      }
      if (st.delta < 0) {
        recentDeclines++;
      }
    }
  });

  const avgDelta = studentsWithDelta > 0 ? (totalDeltaSum / studentsWithDelta).toFixed(1) : '0.0';
  const avgDeltaDisplay = Number(avgDelta) > 0 ? `+${avgDelta}` : avgDelta;

  // Sorted lists for top evolution and top decline (requiring >= 2 responses)
  const topEvolutions = [...processedStudents]
    .filter(s => s.totalResponses > 1 && s.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const topDeclines = [...processedStudents]
    .filter(s => s.totalResponses > 1 && s.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  // Resolve featured student for the main page Evolution Chart
  if (!activePreviewStudentId || !processedStudents.some(s => s.id === activePreviewStudentId)) {
    const withMultiple = processedStudents.find(s => s.totalResponses > 1);
    activePreviewStudentId = withMultiple ? withMultiple.id : (processedStudents[0]?.id || null);
  }
  const previewStudent = processedStudents.find(s => s.id === activePreviewStudentId) || processedStudents[0] || null;

  container.innerHTML = `
    <div class="student-evolution-pane">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <h1 class="page-header-title">Evolução da Experiência dos Alunos</h1>
          <p class="page-header-subtitle">Veja o gráfico de evolução de cada aluno e identifique rapidamente se a experiência está melhorando ou piorando.</p>
        </div>
      </div>

      <!-- Compact Filters Toolbar -->
      <div class="filter-toolbar mb-3">
        <div class="filter-group" style="width:100%;">
          <div style="min-width: 140px; flex: 1;">
            <select id="selectPeriodEvolution" class="select-input" style="width:100%;">
              <option value="all" ${selectedPeriod === 'all' ? 'selected' : ''}>Todo o Período</option>
              <option value="30d" ${selectedPeriod === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
              <option value="90d" ${selectedPeriod === '90d' ? 'selected' : ''}>Últimos 90 dias</option>
              <option value="180d" ${selectedPeriod === '180d' ? 'selected' : ''}>Últimos 6 meses</option>
              <option value="365d" ${selectedPeriod === '365d' ? 'selected' : ''}>Últimos 12 meses</option>
            </select>
          </div>

          <div style="min-width: 140px; flex: 1;">
            <select id="selectUnitEvolution" class="select-input" style="width:100%;">
              <option value="all" ${selectedUnitCode === 'all' ? 'selected' : ''}>Todas as Unidades</option>
              ${units.map(u => `<option value="${u.code}" ${selectedUnitCode === u.code ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
          </div>

          <div style="min-width: 140px; flex: 1;">
            <select id="selectClassificationEvolution" class="select-input" style="width:100%;">
              <option value="all" ${selectedClassification === 'all' ? 'selected' : ''}>Todas Classificações</option>
              <option value="promoter" ${selectedClassification === 'promoter' ? 'selected' : ''}>Promotores (9-10)</option>
              <option value="passive" ${selectedClassification === 'passive' ? 'selected' : ''}>Neutros (7-8)</option>
              <option value="detractor" ${selectedClassification === 'detractor' ? 'selected' : ''}>Detratores (0-6)</option>
            </select>
          </div>

          <div style="min-width: 140px; flex: 1;">
            <select id="selectTrendEvolution" class="select-input" style="width:100%;">
              <option value="all" ${selectedTrend === 'all' ? 'selected' : ''}>Todas Tendências</option>
              <option value="positive" ${selectedTrend === 'positive' ? 'selected' : ''}>📈 Melhorando (+)</option>
              <option value="negative" ${selectedTrend === 'negative' ? 'selected' : ''}>📉 Piorando (-)</option>
              <option value="stable" ${selectedTrend === 'stable' ? 'selected' : ''}>➖ Estável (=)</option>
            </select>
          </div>

          <div style="min-width: 180px; flex: 1.5;">
            <input type="text" id="inputSearchStudent" class="text-input" placeholder="Buscar aluno..." value="${searchText}" style="width:100%;">
          </div>
        </div>
      </div>

      <!-- Compact KPI Summary Cards -->
      <div class="metric-card-grid mb-3">
        <div class="metric-card">
          <div class="metric-card-label">ALUNOS ACOMPANHADOS</div>
          <div class="metric-card-value">${totalTracked}</div>
          <div class="metric-card-subtext">${studentsWithDelta} com ≥2 avaliações</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">COM EVOLUÇÃO MEDIDA</div>
          <div class="metric-card-value">${studentsWithDelta}</div>
          <div class="metric-card-subtext">Alunos com múltiplas avaliações</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">VARIAÇÃO MÉDIA NPS</div>
          <div class="metric-card-value" style="color:${Number(avgDelta) >= 0 ? 'var(--color-promoter)' : 'var(--color-detractor)'};">${avgDeltaDisplay} pts</div>
          <div class="metric-card-subtext">${Number(avgDelta) > 0 ? '📈 Experiência subindo' : Number(avgDelta) < 0 ? '📉 Experiência caindo' : '➖ Estável no período'}</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">DETRATORES RECUPERADOS</div>
          <div class="metric-card-value" style="color:var(--color-promoter);">${detractorsRecovered}</div>
          <div class="metric-card-subtext">Saíram do vermelho (≤6 para >6)</div>
        </div>
      </div>

      <!-- LIVE INTERACTIVE EVOLUTION CHART ON MAIN TAB -->
      ${previewStudent ? `
        <div class="glass-card p-3 mb-3" style="border:1px solid rgba(229, 185, 63, 0.28);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.85rem; margin-bottom:1rem; padding-bottom:0.85rem; border-bottom:1px solid var(--border-subtle);">
            <div>
              <h3 class="section-title" style="margin:0;">📈 Gráfico de Evolução Individual do Aluno</h3>
              <p class="section-subtitle" style="margin:0.2rem 0 0 0;">Selecione qualquer aluno abaixo para visualizar todas as notas que ele deu ao longo do tempo e se a percepção está melhorando ou piorando.</p>
            </div>
            <div style="display:flex; align-items:center; gap:0.65rem; flex-wrap:wrap;">
              <select id="selectPreviewStudentChart" class="select-input" style="width:auto; min-width:220px; font-weight:700;">
                ${processedStudents.map(st => {
                  const tBadge = st.totalResponses > 1
                    ? (st.delta > 0 ? `📈 +${st.delta} pts (${st.firstScore}→${st.latestScore})` : st.delta < 0 ? `📉 ${st.delta} pts (${st.firstScore}→${st.latestScore})` : `➖ Estável (${st.latestScore})`)
                    : `🆕 1ª Aval. (Nota ${st.latestScore})`;
                  return `<option value="${st.id}" ${st.id === previewStudent.id ? 'selected' : ''}>👤 ${st.name} — ${tBadge}</option>`;
                }).join('')}
              </select>
              <button type="button" class="btn-primary-gold btn-sm btn-view-student-detail" data-student-id="${previewStudent.id}">
                🔍 Ver Detalhes por Setor & Linha do Tempo
              </button>
            </div>
          </div>

          ${renderStudentEvolutionChart(previewStudent.responses)}
        </div>
      ` : ''}

      <!-- Content Grid: Premium Student List & Widgets -->
      <div class="student-evo-two-col-grid" style="display:grid; grid-template-columns: 2.2fr 1fr; gap:1.25rem; align-items:flex-start;">
        <!-- Left: Premium Student List Table -->
        <div class="table-container">
          <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <h3 class="section-title">Todos os Alunos Acompanhados</h3>
              <span style="font-size:0.76rem; color:var(--text-muted);">Clique em "📈 Ver no Gráfico" ou "Ver jornada" para abrir a análise detalhada</span>
            </div>
            <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">${processedStudents.length} aluno(s) listado(s)</span>
          </div>

          ${processedStudents.length === 0 ? `
            <div class="empty-state-card">
              <div class="empty-state-icon">👤</div>
              <h4 class="empty-state-title">Nenhum aluno encontrado</h4>
              <p class="empty-state-desc">Não há alunos correspondentes aos filtros selecionados neste período.</p>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Unidade</th>
                  <th>Histórico de Notas (Jornada)</th>
                  <th>Diagnóstico de Evolução</th>
                  <th>Classificação Atual</th>
                  <th style="text-align:right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${processedStudents.map(st => {
                  const initialName = st.name ? st.name.charAt(0).toUpperCase() : 'A';
                  const targetUnitId = st.unitId || st.unit_id;
                  const unitObj = units.find(u => u.code === targetUnitId || u.id === targetUnitId);
                  const unitName = unitObj ? unitObj.name : '—';
                  const isPreviewed = previewStudent && previewStudent.id === st.id;

                  // Build visual chain of ALL scores given by the student over time
                  const journeyBadgesHtml = st.responses.map((ev, i) => {
                    const sc = Number(ev.npsScore ?? 0);
                    const cls = sc >= 9 ? 'promoter' : sc >= 7 ? 'passive' : 'detractor';
                    const dStr = new Date(ev.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const arrow = i < st.responses.length - 1 ? `<span style="color:var(--text-muted); font-size:0.75rem; margin:0 0.2rem;">➔</span>` : '';
                    return `<span class="nps-badge ${cls}" title="${i + 1}ª Avaliação (${dStr}): Nota ${sc}/10" style="padding:0.18rem 0.48rem; font-size:0.8rem;">${sc}</span>${arrow}`;
                  }).join('');

                  let trendClass = 'neutral';
                  let trendText = '🆕 1ª avaliação';
                  if (st.totalResponses > 1) {
                    if (st.delta > 0) {
                      trendClass = 'positive';
                      trendText = `📈 Melhorando (+${st.delta} pts)`;
                    } else if (st.delta < 0) {
                      trendClass = 'negative';
                      trendText = `📉 Piorando (${st.delta} pts)`;
                    } else {
                      trendText = `➖ Estável (0 pts)`;
                    }
                  }

                  const statusClass = st.currentClassification === 'promoter' ? 'promoter' : (st.currentClassification === 'passive' ? 'passive' : 'detractor');
                  const statusLabel = st.currentClassification === 'promoter' ? 'Promotor' : (st.currentClassification === 'passive' ? 'Neutro' : 'Detrator');

                  return `
                    <tr style="${isPreviewed ? 'background:rgba(229,185,63,0.07);' : ''}">
                      <td>
                        <div style="display:flex; align-items:center; gap:0.65rem;">
                          <div class="user-avatar-circle">${initialName}</div>
                          <div>
                            <div style="font-weight:600; color:var(--text-title);">
                              ${st.name}
                              ${isPreviewed ? '<span style="font-size:0.68rem; color:var(--gold-primary); margin-left:0.35rem; font-weight:700;">(No gráfico)</span>' : ''}
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${st.email || st.phone || 'Identificado'} • ${st.totalResponses} aval.</div>
                          </div>
                        </div>
                      </td>
                      <td><span style="font-size:0.82rem; color:var(--text-muted);">${unitName}</span></td>
                      <td>
                        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:0.15rem;">
                          ${journeyBadgesHtml}
                        </div>
                      </td>
                      <td><span class="trend-indicator ${trendClass}" style="white-space:nowrap;">${trendText}</span></td>
                      <td><span class="badge-status ${statusClass}">Nota ${st.latestScore} • ${statusLabel}</span></td>
                      <td style="text-align:right; white-space:nowrap;">
                        <button type="button" class="btn-ghost btn-sm btn-preview-student-chart" data-student-id="${st.id}" style="margin-right:0.25rem;">
                          📈 Gráfico
                        </button>
                        <button type="button" class="btn-secondary btn-sm btn-view-student-detail" data-student-id="${st.id}">
                          Ver jornada
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Right: Side Widgets (Maiores Evoluções & Quedas) -->
        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          <div class="glass-card p-3">
            <h4 class="section-title" style="margin-bottom:0.75rem; font-size:0.95rem;">🚀 Alunos Melhorando</h4>
            ${topEvolutions.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">Nenhum aluno com evolução positiva acumulada neste período.</p>
            ` : topEvolutions.map(st => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid var(--border-subtle); cursor:pointer;" class="btn-view-student-detail" data-student-id="${st.id}">
                <div>
                  <div style="font-size:0.85rem; font-weight:600; color:var(--text-title);">${st.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Subiu de ${st.firstScore} para ${st.latestScore} (${st.totalResponses} aval.)</div>
                </div>
                <span class="trend-indicator positive">📈 +${st.delta}</span>
              </div>
            `).join('')}
          </div>

          <div class="glass-card p-3">
            <h4 class="section-title" style="margin-bottom:0.75rem; font-size:0.95rem;">⚠️ Alunos Piorando</h4>
            ${topDeclines.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">Nenhuma queda de avaliação registrada neste período.</p>
            ` : topDeclines.map(st => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid var(--border-subtle); cursor:pointer;" class="btn-view-student-detail" data-student-id="${st.id}">
                <div>
                  <div style="font-size:0.85rem; font-weight:600; color:var(--text-title);">${st.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Caiu de ${st.firstScore} para ${st.latestScore} (${st.totalResponses} aval.)</div>
                </div>
                <span class="trend-indicator negative">📉 ${st.delta}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Listeners
  const bindFilters = () => {
    const elPeriod = document.getElementById('selectPeriodEvolution');
    const elUnit = document.getElementById('selectUnitEvolution');
    const elClass = document.getElementById('selectClassificationEvolution');
    const elTrend = document.getElementById('selectTrendEvolution');
    const elSearch = document.getElementById('inputSearchStudent');
    const elPreviewChart = document.getElementById('selectPreviewStudentChart');

    [elPeriod, elUnit, elClass, elTrend].forEach(el => {
      if (el) el.addEventListener('change', () => renderStudentEvolutionView());
    });

    if (elPreviewChart) {
      elPreviewChart.addEventListener('change', (e) => {
        activePreviewStudentId = e.target.value;
        renderStudentEvolutionView();
      });
    }

    if (elSearch) {
      elSearch.addEventListener('input', (e) => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        clearTimeout(window.__studentSearchTimeout);
        window.__studentSearchTimeout = setTimeout(() => {
          renderStudentEvolutionView();
          const restoredSearch = document.getElementById('inputSearchStudent');
          if (restoredSearch) {
            restoredSearch.focus();
            if (typeof start === 'number' && typeof end === 'number') {
              try { restoredSearch.setSelectionRange(start, end); } catch (_) {}
            }
          }
        }, 250);
      });
    }
  };

  bindFilters();

  // Attach click listener for "📈 Gráfico" preview buttons
  container.querySelectorAll('.btn-preview-student-chart').forEach(btn => {
    btn.addEventListener('click', () => {
      const stId = btn.getAttribute('data-student-id');
      if (stId) {
        activePreviewStudentId = stId;
        renderStudentEvolutionView();
      }
    });
  });

  // Attach click listener for "Ver jornada" buttons
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
