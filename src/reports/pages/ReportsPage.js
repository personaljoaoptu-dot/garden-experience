/**
 * Reports Page Renderer (V1.5.0 Executive B2B SaaS Analytics)
 */

export function renderReportsPage() {
  return `
    <section id="mod-reports" class="mod-pane">
      <!-- Page Header -->
      <div class="page-header" style="margin-bottom:1.5rem;">
        <div>
          <h1 class="page-header-title">Relatórios & Analytics Executivo</h1>
          <p class="page-header-subtitle">Análise detalhada da experiência dos clientes, tendências NPS e fechamento de loop.</p>
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <select id="repFilterPeriod" class="select-input" style="width:auto;">
            <option value="30d">Últimos 30 dias</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="month">Este Mês</option>
            <option value="all" selected>Todo o Período</option>
          </select>
          <select id="repFilterUnit" class="select-input" style="width:auto;">
            <option value="all">Todas as Unidades</option>
          </select>
          <button class="btn-primary-gold btn-sm" id="btnExportCsv" style="display:flex; align-items:center; gap:0.4rem;">
            📥 <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <!-- SEÇÃO 1: RESULTADO GERAL ("O que aconteceu?") -->
      <div class="section-header">
        <div>
          <h2 class="section-title">1. Resultado Geral</h2>
          <p class="section-subtitle">O que aconteceu no período analisado?</p>
        </div>
      </div>

      <div class="metric-card-grid mb-3">
        <div class="metric-card">
          <div class="metric-card-label">NPS INDEX</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.35rem;">
            <span id="repNpsScore" class="metric-card-value" style="color:var(--gold-primary);">--</span>
            <span id="repNpsBadge" class="badge-status passive" style="font-size:0.72rem;">--</span>
          </div>
          <div class="metric-card-subtext" id="repNpsSubtitle">Calculado no período</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">TOTAL AVALIAÇÕES</div>
          <div id="repTotalCount" class="metric-card-value">0</div>
          <div class="metric-card-subtext" id="repTotalSubtitle">Respostas recebidas</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">PROMOTORES (9-10)</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.35rem;">
            <span id="repPromotersCount" class="metric-card-value" style="color:var(--color-promoter);">0</span>
            <span id="repPromotersPct" class="badge-status promoter" style="font-size:0.72rem;">0%</span>
          </div>
          <div class="metric-card-subtext">Clientes entusiastas</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">PASSIVOS (7-8)</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.35rem;">
            <span id="repPassivesCount" class="metric-card-value" style="color:var(--color-passive);">0</span>
            <span id="repPassivesPct" class="badge-status passive" style="font-size:0.72rem;">0%</span>
          </div>
          <div class="metric-card-subtext">Clientes neutros</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-label">DETRATORES (0-6)</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.35rem;">
            <span id="repDetractorsCount" class="metric-card-value" style="color:var(--color-detractor);">0</span>
            <span id="repDetractorsPct" class="badge-status detractor" style="font-size:0.72rem;">0%</span>
          </div>
          <div class="metric-card-subtext">Clientes insatisfeitos</div>
        </div>
      </div>

      <!-- SEÇÃO 2: EVOLUÇÃO TEMPORAL ("Por que importa?") -->
      <div class="section-header" style="margin-top:1.5rem;">
        <div>
          <h2 class="section-title">2. Evolução da Experiência</h2>
          <p class="section-subtitle">Por que importa? A satisfação está aumentando ou caindo?</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.25rem; margin-bottom:1.5rem;">
        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Histórico de NPS</h3>
          <div id="repChartContainer" style="min-height:200px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Proporção de Clientes</h3>
          <div style="display:flex; flex-direction:column; gap:0.85rem;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.25rem;">
                <span style="color:var(--color-promoter); font-weight:600;">Promotores</span>
                <span id="repDistPromotersLabel" style="font-weight:700;">0 (0%)</span>
              </div>
              <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div id="repBarPromoters" style="width:0%; height:100%; background:var(--color-promoter);"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.25rem;">
                <span style="color:var(--color-passive); font-weight:600;">Passivos</span>
                <span id="repDistPassivesLabel" style="font-weight:700;">0 (0%)</span>
              </div>
              <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div id="repBarPassives" style="width:0%; height:100%; background:var(--color-passive);"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.25rem;">
                <span style="color:var(--color-detractor); font-weight:600;">Detratores</span>
                <span id="repDistDetractorsLabel" style="font-weight:700;">0 (0%)</span>
              </div>
              <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div id="repBarDetractors" style="width:0%; height:100%; background:var(--color-detractor);"></div></div>
            </div>
          </div>
          <div style="margin-top:1.25rem; padding-top:0.75rem; border-top:1px solid var(--border-subtle); font-size:0.78rem; color:var(--text-muted); display:flex; justify-content:space-between;">
            <span>Amostra total:</span>
            <strong id="repDistTotalLabel" style="color:var(--text-title);">0 respostas</strong>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 3: PONTOS DE CONTATO & LOOP ("Onde está o problema?") -->
      <div class="section-header" style="margin-top:1.5rem;">
        <div>
          <h2 class="section-title">3. Pontos de Contato & Fechamento de Loop</h2>
          <p class="section-subtitle">Onde está o problema operacional e como os casos estão sendo tratados?</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem; margin-bottom:1.5rem;">
        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Desempenho por Ponto de Contato</h3>
          <div id="repTouchpointsContainer"></div>
        </div>

        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Fechamento de Loop de Detratores</h3>
          <div id="repCasesMetricsContainer"></div>
        </div>
      </div>

      <!-- SEÇÃO 4: EVOLUÇÃO DOS ALUNOS & INSIGHTS -->
      <div class="section-header" style="margin-top:1.5rem;">
        <div>
          <h2 class="section-title">4. Evolução dos Alunos & Síntese de Insights</h2>
          <p class="section-subtitle">Como a percepção individual dos alunos mudou e quais ações são recomendadas?</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 2fr; gap:1.25rem; margin-bottom:1.5rem;">
        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Evolução Individual</h3>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            <div>
              <span style="font-size:0.78rem; color:var(--text-muted);">Alunos Acompanhados:</span>
              <div id="repTrackedStudents" style="font-size:1.6rem; font-weight:800; color:var(--text-title);">0</div>
            </div>
            <div>
              <span style="font-size:0.78rem; color:var(--text-muted);">Variação Média NPS:</span>
              <div style="margin-top:0.2rem;"><span id="repAvgEvolutionDelta" class="badge-status promoter">+0.0</span></div>
            </div>
          </div>
        </div>

        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Síntese de Insights Operacionais</h3>
          <div id="repInsightsContainer" style="display:flex; flex-direction:column; gap:0.6rem;"></div>
        </div>
      </div>
    </section>
  `;
}
