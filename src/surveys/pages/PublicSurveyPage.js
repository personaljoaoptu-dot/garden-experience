/**
 * Public Survey Page Renderer
 * Renders public NPS collection interface with token validation and Thank You screen.
 */

export function renderPublicSurveyPage() {
  return `
    <section id="mod-public-survey" class="mod-pane">
      <div style="max-width:540px; margin:2rem auto; padding:0 1rem;">
        
        <!-- State 1: Loading Card -->
        <div id="surveyLoadingCard" class="glass-card" style="text-align:center; padding:2.5rem; display:none;">
          <div style="font-size:2rem; margin-bottom:0.5rem;" class="spin-icon">⏳</div>
          <h3 style="color:var(--gold-primary); margin-bottom:0.5rem;">Carregando pesquisa...</h3>
          <p style="font-size:0.85rem; color:var(--text-muted);">Validando link de acesso seguro.</p>
        </div>

        <!-- State 2: Invalid / Expired Token Error Card -->
        <div id="surveyErrorCard" class="glass-card" style="text-align:center; padding:2.5rem; display:none; border-color:rgba(239,68,68,0.4);">
          <div style="font-size:3rem; margin-bottom:0.75rem;">❌</div>
          <h3 style="color:#ef4444; margin-bottom:0.5rem;">Link de Pesquisa Inválido</h3>
          <p id="surveyErrorMessage" style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1.5rem;">
            Este QR Code ou link de pesquisa não é mais válido, está inativo ou expirou.
          </p>
          <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Garden Experience — Sistema Integrado de NPS</span>
        </div>

        <!-- State 3: Active Public Survey Form -->
        <div id="surveyFormCard" class="glass-card" style="padding:2rem;">
          <div id="surveyHeaderUnitInfo" style="text-align:center; margin-bottom:1.75rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1.25rem;">
            <div id="surveyOrgTitle" style="font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--gold-primary); margin-bottom:0.25rem;">GARDEN EXPERIENCE</div>
            <h2 id="surveyUnitName" style="color:var(--text-title); font-size:1.4rem; margin:0 0 0.35rem 0;">Pesquisa de Satisfação</h2>
            <p id="surveySubtitle" style="font-size:0.85rem; color:var(--text-muted); margin:0;">Sua opinião é fundamental para evoluirmos nossos serviços!</p>
          </div>

          <form id="formPublicSurvey">
            <div id="surveyTokenSelectGroup" class="mb-3" style="display:none;">
              <label style="font-size:0.8rem; color:var(--text-muted);">Simulador: Token da Unidade:</label>
              <select id="selectTokenSim" class="select-input"></select>
            </div>

            <div class="mb-4">
              <label style="font-size:0.92rem; font-weight:700; color:var(--text-title); display:block; text-align:center; margin-bottom:0.75rem;">
                De 0 a 10, qual a probabilidade de você nos recomendar a um amigo?
              </label>
              <div style="display:flex; justify-content:space-between; gap:0.25rem; flex-wrap:nowrap;" class="mb-2">
                ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="nps-score-pill" data-score="${n}" style="flex:1; padding:0.6rem 0; font-weight:700;">${n}</button>`).join('')}
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">
                <span>0 = Pouco provável</span>
                <span>10 = Muito provável</span>
              </div>
            </div>

            <div class="mb-3">
              <label style="font-size:0.8rem; color:var(--text-muted);">Seu Nome (opcional):</label>
              <input type="text" id="inputStudentName" class="text-input" placeholder="Ex: Maria Silva">
            </div>

            <div class="mb-3">
              <label style="font-size:0.8rem; color:var(--text-muted);">Seu E-mail (opcional):</label>
              <input type="email" id="inputStudentEmail" class="text-input" placeholder="maria@email.com">
            </div>

            <div class="mb-3">
              <label style="font-size:0.8rem; color:var(--text-muted);">Seu WhatsApp / Telefone (opcional):</label>
              <input type="text" id="inputStudentPhone" class="text-input" placeholder="(11) 99999-9999">
            </div>

            <div class="mb-4">
              <label style="font-size:0.8rem; color:var(--text-muted);">Seu Comentário / Sugestão (opcional):</label>
              <textarea id="inputStudentComment" class="textarea-input" rows="3" placeholder="Conte-nos mais sobre sua experiência..."></textarea>
            </div>

            <button type="submit" id="btnSubmitPublicSurvey" class="btn-primary-gold" style="width:100%; padding:0.85rem; font-size:1rem; font-weight:700;">Enviar Avaliação</button>
          </form>
        </div>

        <!-- State 4: Thank You Card ("Obrigado!") -->
        <div id="surveyThankYouCard" class="glass-card" style="text-align:center; padding:3rem 1.5rem; display:none; border-color:var(--gold-primary);">
          <div style="font-size:3.5rem; margin-bottom:1rem;">🎉</div>
          <h2 style="color:var(--gold-primary); font-size:1.6rem; margin-bottom:0.5rem;">Obrigado pelo seu feedback!</h2>
          <p style="font-size:0.95rem; color:var(--text-title); margin-bottom:0.5rem;">Sua avaliação foi registrada com sucesso.</p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:2rem;">Sua opinião nos ajuda a evoluir diariamente.</p>
          <button type="button" id="btnResetPublicSurvey" class="btn-outline-gold btn-sm">Enviar Nova Resposta</button>
        </div>

      </div>
    </section>
  `;
}
