/**
 * Reports Page Renderer
 */

export function renderReportsPage() {
  return `
    <section id="mod-reports" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Análises & Relatórios</h1>
          <p>Exportação de dados em CSV e indicadores operacionais</p>
        </div>
        <button class="btn-primary-gold" id="btnExportCsv">📥 Exportar Relatório em CSV</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">TOTAL DE AVALIAÇÕES</div>
          <div class="kpi-number" id="repTotalCount">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">CASOS RESOLVIDOS</div>
          <div class="kpi-number text-emerald" id="repResolvedCases">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">CASOS PENDENTES</div>
          <div class="kpi-number text-rose" id="repPendingCases">0</div>
        </div>
      </div>
    </section>
  `;
}
