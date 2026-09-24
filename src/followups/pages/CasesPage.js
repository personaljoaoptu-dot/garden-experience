/**
 * Followups / Cases Page Renderer
 */

export function renderCasesPage() {
  return `
    <section id="mod-cases" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Acompanhamentos de Detratores</h1>
          <p>Tratativa automatizada de casos com NPS ≤ 6 (Tabela & Kanban)</p>
        </div>
        <div class="btn-group-row">
          <button class="btn-secondary-gold btn-sm active" id="btnCasesViewList">📋 Lista</button>
          <button class="btn-outline-gold btn-sm" id="btnCasesViewKanban">📊 Kanban</button>
        </div>
      </div>

      <div class="kpi-grid mb-3">
        <div class="kpi-card">
          <div class="kpi-header">PENDENTES</div>
          <div class="kpi-number text-rose" id="caseSummaryPending">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">EM TRATATIVA</div>
          <div class="kpi-number text-amber" id="caseSummaryProgress">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">RESOLVIDOS</div>
          <div class="kpi-number text-emerald" id="caseSummaryResolved">0</div>
        </div>
      </div>

      <!-- List View Pane -->
      <div id="casesListViewPane" class="glass-card panel-block">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Data</th>
                <th>Aluno</th>
                <th>NPS</th>
                <th>Comentário</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Responsável</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody id="casesTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Kanban View Pane -->
      <div id="casesKanbanViewPane" style="display:none; grid-template-columns: repeat(3, 1fr); gap:1.5rem;"></div>
    </section>
  `;
}
