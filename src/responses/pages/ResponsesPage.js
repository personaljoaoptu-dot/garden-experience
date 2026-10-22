/**
 * Clean Experience Inbox Page Renderer
 * Structured 2-column layout: Evaluation List on the left, Customer Response & Action Center on the right.
 */

export function renderResponsesPage() {
  return `
    <section id="mod-responses" class="mod-pane">
      <div class="page-header-block" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
        <div class="page-title-group">
          <h1 style="font-size:1.5rem; font-weight:700; color:var(--text-title); margin:0;">Central de Respostas & Atendimento</h1>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.2rem;">Visualize cada avaliação recebida e responda ao aluno diretamente por WhatsApp ou E-mail.</p>
        </div>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <select id="inboxFilterMonth" class="select-clean" style="padding:0.45rem 0.85rem; font-weight:600;">
            <option value="all">📊 Todos os Meses</option>
            <option value="current_month">📅 Mês Atual</option>
            <option value="prev_month">📅 Mês Anterior</option>
          </select>
        </div>
      </div>

      <div class="inbox-layout-container" style="display:grid; grid-template-columns: 350px 1fr; gap:1.25rem; min-height:calc(100vh - 160px); align-items:start;">
        <!-- Column 1: Search, Filter Pills & List -->
        <div class="glass-card" style="padding:1.1rem; display:flex; flex-direction:column; gap:0.85rem;">
          <input type="search" id="inputResponsesSearch" name="garden_inbox_search_filter" autocomplete="off" data-lpignore="true" data-form-type="other" readonly onfocus="this.removeAttribute('readonly')" class="text-input" placeholder="🔍 Buscar aluno, e-mail, telefone ou comentário...">
          
          <div class="filter-pills-row" style="display:flex; flex-wrap:wrap; gap:0.35rem;">
            <button type="button" class="btn-action-pill active" data-inbox-filter="all">Todas</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="unreplied">⏳ Sem Resposta</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="detractor">🚨 Detratores (0-6)</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="passive">😐 Neutros (7-8)</button>
            <button type="button" class="btn-action-pill" data-inbox-filter="promoter">😍 Promotores (9-10)</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:700; color:var(--text-muted); padding-top:0.5rem; border-top:1px solid var(--border-subtle);">
            <span>AVALIAÇÕES RECEBIDAS</span>
            <span id="inboxListCountBadge" style="color:var(--gold-primary);">0 avaliações</span>
          </div>

          <div id="inboxItemsList" style="overflow-y:auto; flex:1; max-height:calc(100vh - 310px); display:flex; flex-direction:column; gap:0.4rem;"></div>
        </div>

        <!-- Column 2: Selected Response Detail & Direct Reply Hub (WhatsApp / Email) -->
        <div class="glass-card" id="inboxDetailPane" style="padding:1.6rem;">
          <div style="color:var(--text-muted); text-align:center; padding:4rem 1rem;">
            Selecione uma avaliação na lista ao lado para visualizar os detalhes e responder ao cliente.
          </div>
        </div>
      </div>
    </section>
  `;
}
