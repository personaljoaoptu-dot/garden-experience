/**
 * Reports Page Renderer (V1.4.6 Premium SaaS Analytics)
 */

export function renderReportsPage() {
  return `
    <section id="mod-reports" class="mod-pane">
      <!-- Page Header -->
      <div class="page-header-block" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
        <div class="page-title-group">
          <h1 style="font-size:1.5rem; font-weight:800; color:var(--text-title); margin:0;">Relatórios & Analytics Executivo</h1>
          <p style="font-size:0.88rem; color:var(--text-muted); margin-top:0.25rem;">Análise detalhada da experiência dos seus clientes, tendências NPS e fechamento de loop.</p>
        </div>
        <div class="page-header-actions" style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <select id="repFilterPeriod" class="select-input" style="width:auto; padding:0.45rem 0.85rem; font-size:0.85rem;">
            <option value="30d">Últimos 30 dias</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="month">Este Mês</option>
            <option value="all" selected>Todo o Período</option>
          </select>
          <select id="repFilterUnit" class="select-input" style="width:auto; padding:0.45rem 0.85rem; font-size:0.85rem;">
            <option value="all">Todas as Unidades</option>
          </select>
          <button class="btn-primary-gold btn-sm" id="btnExportCsv" style="display:flex; align-items:center; gap:0.4rem;">
            📥 <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <!-- BLOCO 1: KPI Resumo Executivo -->
      <div class="kpi-grid mb-4" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:1rem;">
        <div class="kpi-card glass-card" style="padding:1.25rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">NPS INDEX</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.5rem;">
            <span id="repNpsScore" style="font-size:2.2rem; font-weight:800; color:var(--gold-primary); font-family:var(--font-title);">--</span>
            <span id="repNpsBadge" class="badge-status" style="font-size:0.7rem;">--</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;" id="repNpsSubtitle">Calculado no período</div>
        </div>

        <div class="kpi-card glass-card" style="padding:1.25rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">TOTAL AVALIAÇÕES</div>
          <div id="repTotalCount" style="font-size:2.2rem; font-weight:800; color:var(--text-title); font-family:var(--font-title); margin-top:0.5rem;">0</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;" id="repTotalSubtitle">Respostas recebidas</div>
        </div>

        <div class="kpi-card glass-card" style="padding:1.25rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">PROMOTORES (9-10)</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.5rem;">
            <span id="repPromotersCount" style="font-size:2.2rem; font-weight:800; color:var(--color-promoter); font-family:var(--font-title);">0</span>
            <span id="repPromotersPct" class="badge-status promoter" style="font-size:0.7rem;">0%</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;">Clientes entusiastas</div>
        </div>

        <div class="kpi-card glass-card" style="padding:1.25rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">PASSIVOS (7-8)</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.5rem;">
            <span id="repPassivesCount" style="font-size:2.2rem; font-weight:800; color:var(--color-passive); font-family:var(--font-title);">0</span>
            <span id="repPassivesPct" class="badge-status passive" style="font-size:0.7rem;">0%</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;">Clientes neutros</div>
        </div>

        <div class="kpi-card glass-card" style="padding:1.25rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">DETRATORES (1-6)</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.5rem;">
            <span id="repDetractorsCount" style="font-size:2.2rem; font-weight:800; color:var(--color-detractor); font-family:var(--font-title);">0</span>
            <span id="repDetractorsPct" class="badge-status detractor" style="font-size:0.7rem;">0%</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;">Clientes insatisfeitos</div>
        </div>

        <div class="kpi-card glass-card" style="padding:1.25rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">CASOS EM ABERTO</div>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.5rem;">
            <span id="repPendingCases" style="font-size:2.2rem; font-weight:800; color:var(--color-detractor); font-family:var(--font-title);">0</span>
            <span id="repResolvedCasesBadge" class="badge-status resolved" style="font-size:0.7rem;">0 resolvidos</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;">Fechamento de loop</div>
        </div>
      </div>

      <!-- Main Analytics Grid -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.5rem; margin-bottom:1.5rem;" class="rep-grid-main">
        <!-- BLOCO 2: Evolução Temporal do NPS -->
        <div class="glass-card" style="padding:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-title); margin:0;">Evolução do NPS</h3>
              <p style="font-size:0.78rem; color:var(--text-muted); margin:0.2rem 0 0 0;">Histórico de pontuação acumulada por período</p>
            </div>
            <span style="font-size:0.75rem; color:var(--gold-primary); background:var(--gold-subtle); border:1px solid var(--border-color); padding:0.2rem 0.6rem; border-radius:var(--radius-md); font-weight:600;">Linha de Tendência</span>
          </div>

          <div id="repChartContainer" style="min-height:220px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <!-- Chart rendered dynamically via JS -->
          </div>
        </div>

        <!-- BLOCO 3: Distribuição NPS -->
        <div class="glass-card" style="padding:1.5rem;">
          <h3 style="font-size:1rem; font-weight:700; color:var(--text-title); margin:0 0 0.2rem 0;">Distribuição de Clientes</h3>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 1.25rem 0;">Proporção relativa por categoria NPS</p>

          <div style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:600; margin-bottom:0.35rem;">
                <span style="color:var(--color-promoter);">Promotores (9-10)</span>
                <span id="repDistPromotersLabel" style="color:var(--text-title);">0 (0%)</span>
              </div>
              <div style="width:100%; height:10px; background:var(--bg-input); border-radius:999px; overflow:hidden;">
                <div id="repBarPromoters" style="width:0%; height:100%; background:var(--color-promoter); transition:width 0.5s ease;"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:600; margin-bottom:0.35rem;">
                <span style="color:var(--color-passive);">Passivos (7-8)</span>
                <span id="repDistPassivesLabel" style="color:var(--text-title);">0 (0%)</span>
              </div>
              <div style="width:100%; height:10px; background:var(--bg-input); border-radius:999px; overflow:hidden;">
                <div id="repBarPassives" style="width:0%; height:100%; background:var(--color-passive); transition:width 0.5s ease;"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:600; margin-bottom:0.35rem;">
                <span style="color:var(--color-detractor);">Detratores (1-6)</span>
                <span id="repDistDetractorsLabel" style="color:var(--text-title);">0 (0%)</span>
              </div>
              <div style="width:100%; height:10px; background:var(--bg-input); border-radius:999px; overflow:hidden;">
                <div id="repBarDetractors" style="width:0%; height:100%; background:var(--color-detractor); transition:width 0.5s ease;"></div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border-subtle); font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
            <span>Amostra total:</span>
            <strong id="repDistTotalLabel" style="color:var(--text-title);">0 respostas</strong>
          </div>
        </div>
      </div>

      <!-- Secondary Analytics Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;" class="rep-grid-secondary">
        <!-- BLOCO 4: Pontos de Contato -->
        <div class="glass-card" style="padding:1.5rem;">
          <h3 style="font-size:1rem; font-weight:700; color:var(--text-title); margin:0 0 0.2rem 0;">Desempenho por Ponto de Contato</h3>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 1rem 0;">Média de satisfação em cada área avaliada</p>

          <div id="repTouchpointsContainer">
            <!-- Dynamic touchpoint table/cards -->
          </div>
        </div>

        <!-- BLOCO 5: Fechamento de Loop de Detratores -->
        <div class="glass-card" style="padding:1.5rem;">
          <h3 style="font-size:1rem; font-weight:700; color:var(--text-title); margin:0 0 0.2rem 0;">Fechamento de Loop (Acompanhamentos)</h3>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 1rem 0;">Eficiência na resolução de queixas de detratores</p>

          <div id="repCasesMetricsContainer">
            <!-- Dynamic cases metrics -->
          </div>
        </div>
      </div>

      <!-- BLOCO 6: Insights Automáticos -->
      <div class="glass-card" style="padding:1.5rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
          <span style="font-size:1.2rem;">💡</span>
          <h3 style="font-size:1rem; font-weight:700; color:var(--text-title); margin:0;">Insights da Operação</h3>
        </div>
        <div id="repInsightsContainer" style="display:flex; flex-direction:column; gap:0.6rem;">
          <!-- Computed insights -->
        </div>
      </div>
    </section>
  `;
}
