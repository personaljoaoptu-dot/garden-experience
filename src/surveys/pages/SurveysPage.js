/**
 * Surveys & Survey Builder Page Renderer
 */

export function renderSurveysPage() {
  return `
    <section id="mod-surveys" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Gestão de Pesquisas & Survey Builder</h1>
          <p>Configure perguntas e seções das pesquisas de satisfação</p>
        </div>
      </div>

      <div class="glass-card panel-block mb-3">
        <div class="panel-header">
          <h3>SEÇÕES DA PESQUISA ATIVA</h3>
        </div>
        <div id="builderSectionsList"></div>
      </div>
    </section>
  `;
}
