/**
 * Surveys & Survey Builder Page Renderer
 */

export function renderSurveysPage() {
  return `
    <section id="mod-surveys" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Gestão de Pesquisas & Survey Builder</h1>
          <p>Personalize o título, mensagem de boas-vindas e perguntas da pesquisa de satisfação ativa (persistido no Supabase).</p>
        </div>
        <div class="btn-group-row">
          <button type="button" class="btn-outline-gold btn-sm" onclick="document.getElementById('btnNavQrModalTrigger')?.click()">
            📱 Testar Pesquisa / QR Code
          </button>
        </div>
      </div>

      <div class="glass-card panel-block mb-3">
        <div class="panel-header">
          <h3>✏️ Personalizar Pesquisa Ativa</h3>
          <span class="badge-status promoter">🟢 Ativa em Produção</span>
        </div>

        <form id="formSurveyBuilderConfig" style="display:flex; flex-direction:column; gap:1.25rem; width:100%;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Título da Pesquisa *:</label>
              <input type="text" id="inputBuilderSurveyTitle" class="text-input" placeholder="Ex: Pesquisa de Satisfação NPS" required>
            </div>
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Subtítulo / Mensagem de Boas-Vindas:</label>
              <input type="text" id="inputBuilderSurveySubtitle" class="text-input" placeholder="Ex: Sua opinião é fundamental para evoluirmos nossos serviços!">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Pergunta Principal de NPS (Escala 0 a 10) *:</label>
              <input type="text" id="inputBuilderNpsQuestion" class="text-input" placeholder="Ex: Em uma escala de 0 a 10, o quanto você recomendaria nossa academia a um amigo?" required>
            </div>
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Pergunta Aberta de Comentário / Justificativa:</label>
              <input type="text" id="inputBuilderTextQuestion" class="text-input" placeholder="Ex: O que motivou sua nota? Deixe seu elogio, crítica ou sugestão.">
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:0.85rem; border-top:1px solid var(--border-subtle); flex-wrap:wrap; gap:0.75rem;">
            <span style="font-size:0.78rem; color:var(--text-muted);">💡 As alterações feitas aqui atualizam imediatamente o link público dos QR Codes e Totens.</span>
            <button type="submit" id="btnSaveSurveyBuilder" class="btn-primary-gold">💾 Salvar Alterações na Pesquisa</button>
          </div>
        </form>
      </div>

      <div class="glass-card panel-block mb-3">
        <div class="panel-header">
          <h3>📋 Estrutura e Seções da Pesquisa Ativa</h3>
          <span style="font-size:0.78rem; color:var(--text-muted);">Sincronizado com Perguntas & Pontos de Contato</span>
        </div>
        <div id="builderSectionsList"></div>
      </div>
    </section>
  `;
}

