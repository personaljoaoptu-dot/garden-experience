/**
 * Responses Inbox 3-Column Page Renderer
 */

export function renderResponsesPage() {
  return `
    <section id="mod-responses" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Central de Respostas & Atendimento</h1>
          <p>Inbox 3 Colunas com Central de Comunicação e Timeline de Tratativa</p>
        </div>
      </div>

      <div class="inbox-layout-container" style="display:grid; grid-template-columns: 320px 1fr; gap:1.5rem; min-height:calc(100vh - 180px);">
        <!-- Column 1: Filters & Items List -->
        <div class="glass-card" style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
          <input type="text" id="inputResponsesSearch" class="text-input" placeholder="🔍 Buscar por aluno, e-mail...">
          
          <div class="filter-pills-row" style="display:flex; flex-wrap:wrap; gap:0.4rem;">
            <button class="btn-action-pill active" data-inbox-filter="all">Todas</button>
            <button class="btn-action-pill" data-inbox-filter="promoter">Promotores</button>
            <button class="btn-action-pill" data-inbox-filter="passive">Passivos</button>
            <button class="btn-action-pill" data-inbox-filter="detractor">Detratores</button>
            <button class="btn-action-pill" data-inbox-filter="pending_case">Com Pendência</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--text-muted);">
            <span>LISTA DE RESPOSTAS</span>
            <span id="inboxListCountBadge">0 itens</span>
          </div>

          <div id="inboxItemsList" style="overflow-y:auto; flex:1; max-height:calc(100vh - 340px);"></div>
        </div>

        <!-- Column 2 & 3: Selected Response Detail & Communication Hub -->
        <div class="glass-card" id="inboxDetailPane" style="padding:1.5rem; overflow-y:auto; max-height:calc(100vh - 180px);">
          <div style="color:var(--text-muted); text-align:center; margin-top:5rem;">
            Selecione uma resposta na lista ao lado para visualizar os detalhes.
          </div>
        </div>
      </div>
    </section>
  `;
}
