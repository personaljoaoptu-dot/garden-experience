/**
 * Public Survey Simulator Page Renderer
 */

export function renderPublicSurveyPage() {
  return `
    <section id="tab-survey" class="tab-pane">
      <div style="max-width:540px; margin:0 auto; padding:1.5rem;" class="glass-card">
        <div style="text-align:center;" class="mb-4">
          <h2 style="color:var(--gold-primary);">PESQUISA DE SATISFAÇÃO</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Sua opinião é muito importante para nós!</p>
        </div>

        <form id="formPublicSurvey">
          <div class="mb-3">
            <label style="font-size:0.8rem; color:var(--text-muted);">Token da Unidade:</label>
            <select id="selectTokenSim" class="select-input"></select>
          </div>

          <div class="mb-4">
            <label style="font-size:0.9rem; font-weight:700; display:block; text-align:center;" class="mb-2">
              De 0 a 10, qual a probabilidade de você nos recomendar a um amigo?
            </label>
            <div style="display:flex; justify-content:space-between; gap:0.2rem;" class="mb-2">
              ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="nps-score-pill" data-score="${n}">${n}</button>`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted);">
              <span>0 = Nenhuma</span>
              <span>10 = Com certeza</span>
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

          <button type="submit" class="btn-primary-gold" style="width:100%;">Enviar Avaliação</button>
        </form>
      </div>
    </section>
  `;
}
