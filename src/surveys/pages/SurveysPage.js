/**
 * Surveys & Survey Builder Page Renderer
 */

export function renderSurveysPage() {
  return `
    <section id="mod-surveys" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Gestão de Pesquisas & Survey Builder</h1>
          <p>Personalize o título, boas-vindas e perguntas da pesquisa de satisfação ativa (persistido no Supabase)</p>
        </div>
      </div>

      <div class="glass-card panel-block mb-3" style="padding:1.5rem;">
        <div class="panel-header" style="margin-bottom:1.25rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.75rem;">
          <h3>✏️ PERSONALIZAR PESQUISA ATIVA</h3>
        </div>
        <form id="formSurveyBuilderConfig" style="display:flex; flex-direction:column; gap:1rem; max-width:780px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div>
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Título da Pesquisa:</label>
              <input type="text" id="inputBuilderSurveyTitle" class="text-input" placeholder="Ex: Pesquisa de Satisfação NPS" required>
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Subtítulo / Mensagem de Boas-Vindas:</label>
              <input type="text" id="inputBuilderSurveySubtitle" class="text-input" placeholder="Ex: Sua opinião é fundamental para evoluirmos nossos serviços!">
            </div>
          </div>

          <div>
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Pergunta Principal de NPS (Escala 0 a 10) *:</label>
            <input type="text" id="inputBuilderNpsQuestion" class="text-input" placeholder="Ex: Em uma escala de 0 a 10, o quanto você nos recomendaria a um amigo?" required>
          </div>

          <div>
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Pergunta Aberta de Comentário / Justificativa:</label>
            <input type="text" id="inputBuilderTextQuestion" class="text-input" placeholder="Ex: O que motivou sua nota? Deixe seu elogio, crítica ou sugestão.">
          </div>

          <div style="display:flex; justify-content:flex-end; padding-top:0.5rem;">
            <button type="submit" id="btnSaveSurveyBuilder" class="btn-primary-gold btn-sm">💾 Salvar Alterações na Pesquisa</button>
          </div>
        </form>
      </div>

      <div class="glass-card panel-block mb-3">
        <div class="panel-header">
          <h3>📋 ESTRUTURA E SEÇÕES DA PESQUISA ATIVA</h3>
        </div>
        <div id="builderSectionsList"></div>
      </div>
    </section>
  `;
}
