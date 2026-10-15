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

        <!-- State 2: Invalid / Expired Token or Manual Device Token Entry Card -->
        <div id="surveyErrorCard" class="glass-card" style="text-align:center; padding:2.25rem; display:none; border-color:rgba(229,185,63,0.35);">
          <div style="font-size:2.6rem; margin-bottom:0.6rem;">📱</div>
          <h3 style="color:var(--gold-primary); margin-bottom:0.4rem;">Conectar Totem ou Link de Pesquisa</h3>
          <p id="surveyErrorMessage" style="font-size:0.86rem; color:var(--text-muted); margin-bottom:1.25rem;">
            Informe o Token de Acesso do Dispositivo (Totem) ou escaneie o QR Code da unidade.
          </p>

          <form id="formManualDeviceToken" style="max-width:380px; margin:0 auto 1.25rem auto; text-align:left; background:var(--bg-card-surface); padding:1rem; border-radius:10px; border:1px solid var(--border-subtle);">
            <label style="display:block; font-size:0.76rem; font-weight:700; color:var(--text-title); margin-bottom:0.4rem;">🔑 Token de Acesso do Dispositivo:</label>
            <div style="display:flex; gap:0.45rem;">
              <input type="text" id="inputManualDeviceToken" class="text-input" placeholder="Cole o token do dispositivo..." style="flex:1; font-family:monospace; font-size:0.82rem;">
              <button type="submit" class="btn-primary-gold btn-sm" style="white-space:nowrap; font-weight:800;">🚀 Ativar Totem</button>
            </div>
          </form>

          <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Garden Experience — Sistema Integrado de NPS</span>
        </div>

        <!-- State 3: Active Public Survey Form -->
        <div id="surveyFormCard" class="glass-card" style="padding:2rem;">
          <div id="surveyHeaderUnitInfo" style="text-align:center; margin-bottom:1.75rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1.25rem;">
            <div id="surveyTabletModeBadge" style="display:none; margin-bottom:0.65rem;">
              <span style="display:inline-flex; align-items:center; gap:0.35rem; padding:0.22rem 0.7rem; border-radius:999px; background:rgba(229,185,63,0.14); border:1px solid rgba(229,185,63,0.35); color:var(--gold-primary); font-size:0.72rem; font-weight:700;">
                📱 <span id="surveyTabletDeviceName">Modo Totem Ativo</span>
              </span>
            </div>
            <div style="width:78px; height:78px; border-radius:16px; background:#ffffff; border:2px solid var(--gold-primary); display:flex; align-items:center; justify-content:center; margin:0 auto 0.85rem auto; overflow:hidden; padding:4px; box-shadow:0 4px 16px rgba(229,185,63,0.25);">
              <img id="surveyOrgLogoImg" src="/logo-garden-gold.jpg" alt="Logo da Empresa" style="width:100%; height:100%; object-fit:contain;">
            </div>
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
              <label id="surveyNpsQuestionLabel" style="font-size:0.92rem; font-weight:700; color:var(--text-title); display:block; text-align:center; margin-bottom:0.75rem;">
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

            <!-- Touchpoints Section -->
            <div id="surveyTouchpointsContainer" class="mb-4" style="display:none; border-top:1px solid var(--border-subtle); padding-top:1.25rem;">
              <label style="font-size:0.92rem; font-weight:700; color:var(--text-title); display:block; text-align:center; margin-bottom:0.75rem;">
                Como você avalia nossa estrutura e atendimento?
              </label>
              <div id="surveyTouchpointsList" style="display:flex; flex-direction:column; gap:1rem;"></div>
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
              <label id="surveyCommentQuestionLabel" style="font-size:0.8rem; color:var(--text-muted);">Seu Comentário / Sugestão (opcional):</label>
              <textarea id="inputStudentComment" class="textarea-input" rows="3" placeholder="Conte-nos mais sobre sua experiência..."></textarea>
            </div>

            <button type="submit" id="btnSubmitPublicSurvey" class="btn-primary-gold" style="width:100%; padding:0.85rem; font-size:1rem; font-weight:700;">Enviar Avaliação</button>
          </form>
        </div>

        <!-- State 4: Thank You Card ("Obrigado!") -->
        <div id="surveyThankYouCard" class="glass-card" style="text-align:center; padding:2.75rem 1.5rem; display:none; border-color:var(--gold-primary);">
          <div id="thankYouIcon" style="font-size:3.5rem; margin-bottom:0.85rem;">🎉</div>
          <h2 id="thankYouTitle" style="color:var(--gold-primary); font-size:1.55rem; margin-bottom:0.5rem;">Obrigado pelo seu feedback!</h2>
          <p id="thankYouSubtitle" style="font-size:0.95rem; color:var(--text-title); margin-bottom:0.5rem;">Sua avaliação foi registrada com sucesso.</p>
          <p id="thankYouDetail" style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.75rem; max-width:420px; margin-left:auto; margin-right:auto; line-height:1.5;">
            Sua opinião nos ajuda a evoluir diariamente.
          </p>

          <!-- Dynamic Promoter Action Box (9-10) -->
          <div id="thankYouPromoterBox" style="display:none; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:1.1rem; margin-bottom:1.5rem;">
            <div style="font-size:0.85rem; font-weight:700; color:#10b981; margin-bottom:0.35rem;">💚 Você é um Promotor da nossa experiência!</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.75rem 0;">Que tal convidar um amigo para treinar e viver essa experiência com você?</p>
            <button type="button" id="btnSharePromoterWa" class="btn-primary-gold btn-sm" style="background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; padding:0.5rem 1rem; font-weight:700;">
              📲 Indicar um Amigo no WhatsApp
            </button>
          </div>

          <!-- Auto-Reset Kiosk / Totem Countdown Bar (10s) -->
          <div id="surveyAutoResetContainer" style="max-width:340px; margin:0 auto 1.25rem auto; padding:0.75rem 1rem; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.76rem; color:var(--text-muted); margin-bottom:0.45rem;">
              <span id="surveyAutoResetLabel">🔄 Reiniciando para nova avaliação em <strong style="color:var(--gold-primary);">10s</strong></span>
              <button type="button" id="btnPauseAutoReset" style="background:none; border:none; color:var(--text-muted); font-size:0.72rem; cursor:pointer; text-decoration:underline; padding:0;">Pausar</button>
            </div>
            <div style="height:4px; width:100%; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
              <div id="surveyAutoResetProgressBar" style="height:100%; width:100%; background:var(--gold-primary); transition:width 1s linear;"></div>
            </div>
          </div>

          <button type="button" id="btnResetPublicSurvey" class="btn-outline-gold btn-sm">Enviar Nova Resposta Agora</button>
        </div>

      </div>
    </section>
  `;
}
