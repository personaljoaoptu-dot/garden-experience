/**
 * Clean Experience Inbox Page Renderer
 */

export function renderResponsesPage() {
  return `
    <section id="mod-responses" class="mod-pane">
      <div class="page-header-block" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
        <div class="page-title-group">
          <h1 style="font-size:1.5rem; font-weight:700; color:var(--text-title); margin:0;">Inbox de Experiência</h1>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.2rem;">Gerencie avaliações e entre em contato direto com os clientes</p>
        </div>
      </div>

      <div class="inbox-layout-container" style="display:grid; grid-template-columns: 320px 1fr; gap:1.25rem; min-height:calc(100vh - 150px);">
        <!-- Column 1: Search, Filter Pills & List -->
        <div class="glass-card" style="padding:1rem; display:flex; flex-direction:column; gap:0.85rem;">
          <input type="text" id="inputResponsesSearch" class="text-input" placeholder="🔍 Buscar por nome, e-mail...">
          
          <div class="filter-pills-row" style="display:flex; flex-wrap:wrap; gap:0.35rem;">
            <button type="button" class="btn-action-pill active" data-inbox-filter="all">Todas</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="promoter">Promotores</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="passive">Passivos</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="detractor">Detratores</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="no_comment">Sem comentário</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted); padding-top:0.5rem; border-top:1px solid var(--border-subtle);">
            <span>RESPOSTAS</span>
            <span id="inboxListCountBadge">0 itens</span>
          </div>

          <div id="inboxItemsList" style="overflow-y:auto; flex:1; max-height:calc(100vh - 300px);"></div>
        </div>

        <!-- Column 2 & 3: Selected Response Detail & Communication Hub -->
        <div class="glass-card" id="inboxDetailPane" style="padding:1.5rem; overflow-y:auto; max-height:calc(100vh - 150px);">
          <div style="color:var(--text-muted); text-align:center; margin-top:5rem;">
            Selecione uma resposta na lista ao lado para visualizar os detalhes.
          </div>
        </div>
      </div>
    </section>
  `;
}
