/**
 * Premium Executive Analytics Dashboard Page Renderer
 */

export function renderDashboardPage() {
  return `
    <section id="mod-dash" class="mod-pane active">
      <!-- Page Header & Single Row Filters -->
      <div class="page-header-block mb-3" style="display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; flex-wrap:wrap;">
        <div class="page-title-group">
          <h1 style="font-size:1.5rem; font-weight:700; color:var(--text-title); margin:0;">Dashboard</h1>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.2rem;">Visão geral da experiência dos seus clientes</p>
        </div>

        <div class="btn-group-row" style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
          <div class="filter-period-pills" style="display:flex; background:var(--bg-card); border:1px solid var(--border-subtle); padding:0.2rem; border-radius:8px; gap:0.2rem;">
            <button type="button" class="btn-period-pill active" data-period="7" style="background:var(--gold-subtle); color:var(--gold-primary); border:none; padding:0.3rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer;">7 dias</button>
            <button type="button" class="btn-period-pill" data-period="30" style="background:transparent; color:var(--text-muted); border:none; padding:0.3rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:500; cursor:pointer;">30 dias</button>
            <button type="button" class="btn-period-pill" data-period="90" style="background:transparent; color:var(--text-muted); border:none; padding:0.3rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:500; cursor:pointer;">90 dias</button>
            <button type="button" class="btn-period-pill" data-period="all" style="background:transparent; color:var(--text-muted); border:none; padding:0.3rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:500; cursor:pointer;">Tudo</button>
          </div>

          <select id="filterOrigin" class="select-clean" style="padding:0.4rem 0.75rem;">
            <option value="all">Todas as origens</option>
            <option value="qr_code">QR Code</option>
            <option value="link">Link Direto</option>
            <option value="tablet">Tablet Totem</option>
          </select>

          <input type="date" id="filterStartDate" class="select-clean" style="display:none;">
          <input type="date" id="filterEndDate" class="select-clean" style="display:none;">
        </div>
      </div>

      <!-- COMPACT ACTION CENTER / ATENÇÃO -->
      <div id="dashAttentionBlock" class="glass-card mb-3" style="padding:0.85rem 1.25rem; display:flex; justify-content:space-between; align-items:center; background:var(--bg-card);">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:1.1rem;" id="dashAttentionIcon">✓</span>
          <div>
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-title);" id="dashAttentionTitle">Tudo em dia</span>
            <span style="font-size:0.8rem; color:var(--text-muted); margin-left:0.5rem;" id="dashAttentionSubtitle">Nenhuma avaliação precisa de atenção no momento.</span>
          </div>
        </div>
        <button type="button" class="btn-outline-gold btn-sm" id="dashAttentionCta" style="display:none;">Ver Acompanhamentos →</button>
      </div>

      <!-- 5 EXECUTIVE KPI CARDS WITH SPARKLINES -->
      <div class="kpi-grid mb-3" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
        <!-- Card 1: NPS -->
        <div class="glass-card p-3">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">NPS</span>
            <span id="dashNpsSparkline"></span>
          </div>
          <div style="display:flex; align-items:baseline; gap:0.6rem; margin-top:0.3rem;">
            <span style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--text-title);" id="dashValNpsScore">—</span>
            <span class="badge-status passive" id="dashBadgeNpsStatus" style="font-size:0.7rem;">SEM DADOS</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;" id="dashNpsComparison">Sem avaliações no período</div>
        </div>

        <!-- Card 2: AVALIAÇÕES -->
        <div class="glass-card p-3">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">AVALIAÇÕES</span>
            <span id="dashResSparkline"></span>
          </div>
          <div style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--text-title); margin-top:0.3rem;" id="dashValTotalResponses">0</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;" id="dashResComparison">Respostas coletadas</div>
        </div>

        <!-- Card 3: PROMOTORES -->
        <div class="glass-card p-3">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">PROMOTORES</span>
          </div>
          <div style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--color-promoter); margin-top:0.3rem;" id="dashValPromoters">0%</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Notas 9 e 10</div>
        </div>

        <!-- Card 4: DETRATORES -->
        <div class="glass-card p-3">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">DETRATORES</span>
          </div>
          <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:0.3rem;">
            <span style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--color-detractor);" id="dashValDetractors">0</span>
            <span style="font-size:0.75rem; color:var(--text-muted);" id="dashOpenCasesCount">0 abertos</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Notas 0 a 6</div>
        </div>

        <!-- Card 5: EVOLUÇÃO DOS ALUNOS -->
        <div class="glass-card p-3" id="dashCardStudentEvolution" style="cursor:pointer;" title="Clique para abrir a Evolução dos Alunos">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">EVOLUÇÃO DOS ALUNOS</span>
            <span style="font-size:0.8rem; color:var(--gold-primary); font-weight:700;">→</span>
          </div>
          <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:0.3rem;">
            <span style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--gold-primary);" id="dashValTrackedStudents">0</span>
            <span style="font-size:0.85rem; font-weight:700; color:#10b981;" id="dashValAvgEvolutionDelta">+0.0</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;" id="dashStudentEvolutionSubtitle">Alunos acompanhados</div>
        </div>
      </div>

      <!-- MAIN ANALYTICS SECTION: MAIN CHART & DISTRIBUTION -->
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:1.25rem;" class="mb-3">
        <!-- Main Line Chart: NPS ao longo do tempo -->
        <div class="glass-card p-3" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-3">
            <div>
              <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-title); margin:0;">NPS ao longo do tempo</h3>
              <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">Evolução da pontuação de satisfação</p>
            </div>
          </div>
          <div id="npsMainChartContainer" style="height:190px; width:100%;"></div>
        </div>

        <!-- NPS Distribution Donut & Breakdown -->
        <div class="glass-card p-3" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-title);" class="mb-3">Distribuição das avaliações</h3>
            
            <div id="dashDonutContainer" style="position:relative; width:120px; height:120px; margin:0 auto 1.25rem auto;"></div>

            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                  <span style="color:var(--color-promoter); font-weight:600;">Promotores (9–10)</span>
                  <span id="distValPromoters" style="font-weight:700;">0%</span>
                </div>
                <div class="progress-track" style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div class="progress-fill" id="dashBarPromoters" style="width:0%; height:100%; background:var(--color-promoter);"></div></div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                  <span style="color:var(--color-passive); font-weight:600;">Passivos (7–8)</span>
                  <span id="distValPassives" style="font-weight:700;">0%</span>
                </div>
                <div class="progress-track" style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div class="progress-fill" id="dashBarPassives" style="width:0%; height:100%; background:var(--color-passive);"></div></div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                  <span style="color:var(--color-detractor); font-weight:600;">Detratores (0–6)</span>
                  <span id="distValDetractors" style="font-weight:700;">0%</span>
                </div>
                <div class="progress-track" style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div class="progress-fill" id="dashBarDetractors" style="width:0%; height:100%; background:var(--color-detractor);"></div></div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.5rem; padding-top:0.85rem; border-top:1px solid var(--border-subtle); text-align:center;">
            <button type="button" class="btn-outline-gold btn-sm" id="btnDashViewQr" style="width:100%;">📱 Visualizar QR Code da Pesquisa</button>
          </div>
        </div>
      </div>

      <!-- SECONDARY SECTION: TOUCHPOINT EXPERIENCE & INSIGHTS -->
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:1.25rem;" class="mb-3">
        <!-- Touchpoint Ranking -->
        <div class="glass-card p-3">
          <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-title);" class="mb-3">Experiência por ponto de contato</h3>
          <div id="touchpointRankingList" style="display:flex; flex-direction:column; gap:0.85rem;"></div>
        </div>

        <!-- Operational Insights -->
        <div class="glass-card p-3">
          <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-title);" class="mb-3">Visão da experiência</h3>
          <div id="operationalInsightsList" style="display:flex; flex-direction:column; gap:0.75rem;"></div>
        </div>
      </div>

      <!-- RECENT CUSTOMER FEEDBACK & TABLE -->
      <div class="glass-card p-3">
        <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-3">
          <div>
            <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-title); margin:0;">O que seus clientes estão dizendo</h3>
            <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">Últimos comentários registrados na plataforma</p>
          </div>
          <button type="button" class="btn-outline-gold btn-sm" id="btnDashViewAllResponses">Ver todas as respostas →</button>
        </div>

        <div class="table-responsive" id="dashResponsesTableContainer">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente / Aluno</th>
                <th>Nota</th>
                <th>Unidade</th>
                <th>Origem</th>
                <th>Comentário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody id="dashRecentResponsesBody"></tbody>
          </table>
        </div>

        <!-- Professional Empty State -->
        <div id="dashEmptyState" style="display:none; text-align:center; padding:3rem 1.5rem;">
          <div style="font-size:2.5rem;" class="mb-2">📱</div>
          <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-title);" class="mb-1">Ainda não há avaliações</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); max-width:360px; margin:0 auto 1.25rem auto;">Receba sua primeira avaliação disponibilizando seu QR Code na recepção ou utilizando um tablet totem.</p>
          <button type="button" class="btn-primary-gold btn-sm" id="btnEmptyStateQr">📱 Ver QR Code da Pesquisa</button>
        </div>
      </div>
    </section>
  `;
}
