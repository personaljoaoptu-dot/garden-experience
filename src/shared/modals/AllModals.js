/**
 * Master Modals Container Renderer
 */

export function renderAllModals() {
  return `
    <!-- Modal 1: Auth Modal -->
    <div id="modalAuth" class="modal-overlay" style="display:none;">
      <div class="modal-content-card">
        <h3 id="authModalTitle">🔐 Entrar no Garden Experience</h3>
        <div class="btn-group-row my-3" style="display:flex; gap:0.5rem; margin:1rem 0;">
          <button type="button" class="btn-secondary-gold btn-sm active" id="btnTabAuthLogin">Entrar</button>
          <button type="button" class="btn-outline-gold btn-sm" id="btnTabAuthRegister">Criar Conta</button>
        </div>
        <form id="formAuthLogin">
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">E-mail:</label><input type="email" id="loginEmail" class="text-input" required></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Senha:</label><input type="password" id="loginPassword" class="text-input" required></div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <a href="javascript:void(0)" id="linkForgotPassword" style="font-size:0.8rem;">Esqueceu a senha?</a>
            <button type="submit" class="btn-primary-gold btn-sm">Entrar</button>
          </div>
        </form>
        <form id="formAuthRegister" style="display:none;">
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Nome Completo:</label><input type="text" id="regName" class="text-input" required></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">E-mail:</label><input type="email" id="regEmail" class="text-input" required></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Senha:</label><input type="password" id="regPassword" class="text-input" required></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Confirmar Senha:</label><input type="password" id="regPasswordConfirm" class="text-input" required></div>
          <button type="submit" class="btn-primary-gold btn-sm" style="width:100%;">Criar Conta Comercial</button>
        </form>
      </div>
    </div>

    <!-- Modal 2: SaaS Onboarding Wizard -->
    <div id="modalSaaSOnboarding" class="modal-overlay" style="display:none;">
      <div class="modal-content-card" style="max-width:650px;">
        <h3>🚀 Configuração de Nova Organização</h3>
        <form id="formSaaSOnboarding" class="mt-3">
          <div id="obStep1">
            <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Nome da Empresa / Organização:</label><input type="text" id="obOrgName" class="text-input" placeholder="Ex: Minha Empresa"></div>
            <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">E-mail Administrativo:</label><input type="email" id="obOrgEmail" class="text-input" placeholder="contato@empresa.com"></div>
            <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Telefone:</label><input type="text" id="obOrgPhone" class="text-input" placeholder="(11) 99999-9999"></div>
          </div>
          <div id="obStep2" style="display:none;">
            <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Nome da Primera Unidade:</label><input type="text" id="obUnitName" class="text-input" placeholder="Ex: Unidade Centro"></div>
            <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Cidade:</label><input type="text" id="obUnitCity" class="text-input" placeholder="São Paulo"></div>
            <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Segunda Unidade (opcional):</label><input type="text" id="obUnit2Name" class="text-input" placeholder="Ex: Unidade Zona Sul"></div>
          </div>
          <div id="obStep3" style="display:none;"><p>Avançado...</p></div>
          <div id="obStep4" style="display:none;"><p>Avançado...</p></div>
          <div id="obStep5" style="display:none;"><p>Avançado...</p></div>
          <div id="obStep6" style="display:none;"><p>Avançado...</p></div>
          <div id="obStep7" style="display:none;"><p>Tudo pronto!</p></div>

          <div style="display:flex; justify-content:space-between; margin-top:1.5rem;">
            <button type="button" class="btn-outline-gold btn-sm" id="btnObPrev">Voltar</button>
            <div>
              <button type="button" class="btn-primary-gold btn-sm" id="btnObNext">Avançar →</button>
              <button type="button" class="btn-primary-gold btn-sm" id="btnObFinish" style="display:none;">Concluir e Criar</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 3: QR Code Generator -->
    <div id="modalNewQRCode" class="modal-overlay" style="display:none;">
      <div class="modal-content-card" style="text-align:center;">
        <h3>📱 QR Code da Pesquisa</h3>
        <select id="selectQrUnit" class="select-input my-3"></select>
        <div style="background:#fff; padding:1rem; border-radius:12px; display:inline-block;" class="my-3">
          <canvas id="qrCanvasElement"></canvas>
        </div>
        <div id="qrPreviewUnitTitle" style="font-weight:700; color:var(--gold-primary);"></div>
        <div id="qrResolvedUrl" style="font-size:0.78rem; color:var(--text-muted);" class="mb-3"></div>
        <button type="button" class="btn-primary-gold btn-sm" id="btnPrintQrCode">🖨 Imprimir Placa QR Code</button>
      </div>
    </div>

    <!-- Modal 4: New Unit -->
    <div id="modalNewUnit" class="modal-overlay" style="display:none;">
      <div class="modal-content-card">
        <h3>📍 Nova Unidade</h3>
        <form id="formNewUnit" class="mt-3">
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Nome da Unidade:</label><input type="text" id="inputUnitName" class="text-input" required></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Cidade:</label><input type="text" id="inputUnitCity" class="text-input"></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Estado (UF):</label><input type="text" id="inputUnitState" class="text-input" maxlength="2"></div>
          <button type="submit" class="btn-primary-gold btn-sm" style="width:100%;">Salvar Unidade</button>
        </form>
      </div>
    </div>

    <!-- Modal 5: New User -->
    <div id="modalNewUser" class="modal-overlay" style="display:none;">
      <div class="modal-content-card">
        <h3>👥 Convidar Usuário</h3>
        <form id="formNewUser" class="mt-3">
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">Nome:</label><input type="text" id="inputUserName" class="text-input" required></div>
          <div class="mb-3"><label style="font-size:0.8rem; color:var(--text-muted);">E-mail:</label><input type="email" id="inputUserEmail" class="text-input" required></div>
          <div class="mb-3">
            <label style="font-size:0.8rem; color:var(--text-muted);">Função:</label>
            <select id="selectUserRole" class="select-input">
              <option value="admin">Administrador</option>
              <option value="gestor">Gestor de Unidade</option>
            </select>
          </div>
          <div class="mb-3">
            <label style="font-size:0.8rem; color:var(--text-muted);">Unidades Permitidas:</label>
            <select id="selectUserUnits" class="select-input"></select>
          </div>
          <button type="submit" class="btn-primary-gold btn-sm" style="width:100%;">Enviar Convite</button>
        </form>
      </div>
    </div>

    <!-- Modal 6: Confirmation Dialog -->
    <div id="modalConfirmAction" class="modal-overlay" style="display:none;">
      <div class="modal-content-card" style="text-align:center;">
        <div id="modalConfirmIcon" style="font-size:2.5rem;" class="mb-2">❓</div>
        <h3 id="modalConfirmTitle">Confirmar Ação</h3>
        <p id="modalConfirmMessage" style="font-size:0.9rem; color:var(--text-muted);" class="my-3"></p>
        <div style="display:flex; justify-content:center; gap:1rem;">
          <button type="button" class="btn-outline-gold btn-sm" id="btnConfirmActionCancel">Cancelar</button>
          <button type="button" class="btn-primary-gold btn-sm" id="btnConfirmActionOk">Confirmar</button>
        </div>
      </div>
    </div>
  `;
}
