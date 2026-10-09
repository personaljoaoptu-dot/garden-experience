/**
 * Touchpoints Page Renderer
 */

export function renderTouchpointsPage() {
  return `
    <section id="mod-touchpoints" class="mod-pane">
      <div class="page-header-block" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
        <div class="page-title-group">
          <h1>Pontos de Contato (Touchpoints)</h1>
          <p>Aspectos operacionais avaliados pelos clientes (Atendimento, Estrutura, etc.)</p>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <div class="btn-group-row">
            <button class="btn-action-pill active" data-tp-category="all">Todos</button>
            <button class="btn-action-pill" data-tp-category="Atendimento">Atendimento</button>
            <button class="btn-action-pill" data-tp-category="Estrutura">Estrutura</button>
          </div>
          <button id="btnNewTouchpoint" class="btn-primary-gold btn-sm">
            <span>+ Novo Ponto de Contato</span>
          </button>
        </div>
      </div>

      <div id="touchpointsCardsGrid" class="kpi-grid"></div>
    </section>
  `;
}
