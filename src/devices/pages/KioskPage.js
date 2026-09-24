/**
 * Tablet Kiosk Page Renderer
 */

export function renderKioskPage() {
  return `
    <section id="tab-kiosk" class="tab-pane">
      <div style="max-width:600px; margin:2rem auto; padding:2rem; text-align:center; position:relative;" class="glass-card">
        <h1 style="color:var(--gold-primary); font-size:1.8rem;" class="mb-2">AVALIE SEU TREINO DE HOJE</h1>
        <p style="font-size:1rem; color:var(--text-muted);" class="mb-4">Sua opinião é instantânea e ajuda a melhorar nossa unidade!</p>

        <form id="formKioskSurvey">
          <div class="mb-3" style="text-align:left;">
            <label style="font-size:0.8rem; color:var(--text-muted);">Unidade do Totem:</label>
            <select id="selectKioskUnit" class="select-input"></select>
          </div>

          <div class="mb-4">
            <div style="display:flex; justify-content:space-between; gap:0.3rem;" class="mb-3">
              ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="kiosk-nps-pill" data-kiosk-score="${n}">${n}</button>`).join('')}
            </div>
          </div>

          <div class="mb-3" style="text-align:left;">
            <input type="text" id="inputKioskStudentName" class="text-input" placeholder="Seu Nome / Matrícula (opcional)">
          </div>

          <div class="mb-4" style="text-align:left;">
            <textarea id="inputKioskComment" class="textarea-input" rows="2" placeholder="Algum comentário ou elogio? (opcional)"></textarea>
          </div>

          <button type="submit" class="btn-primary-gold" style="width:100%; font-size:1.1rem; padding:0.85rem;">TOQUE PARA ENVIAR</button>
        </form>

        <div id="kioskSuccessOverlay" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:var(--bg-card); border-radius:var(--radius-lg); flex-direction:column; align-items:center; justify-content:center; z-index:100;">
          <div style="font-size:3rem;">🎉</div>
          <h2 style="color:var(--color-promoter); margin-top:0.5rem;">OBRIGADO!</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Sua avaliação foi registrada com sucesso.</p>
        </div>
      </div>
    </section>
  `;
}
