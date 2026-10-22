/**
 * Dedicated Real SaaS Login, Collaborator Invite Registration & Company Registration Page
 * Slate / Obsidian theme with Gold accent, coherent with Garden Experience Design System.
 */

import { authService } from '../services/authService.js';
import { usersRepository } from '../../users/repositories/usersRepository.js';
import { showToast } from '../../shared/feedback/toast.js';

export function renderLoginPage() {
  return `
    <div id="authPageContainer" style="min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top right, rgba(229, 185, 63, 0.08), transparent 40%), var(--bg-body, #0d1117); padding: 1.5rem; font-family: var(--font-main, 'Inter', sans-serif);">
      <div style="width: 100%; max-width: 450px; background: rgba(20, 26, 38, 0.85); border: 1px solid rgba(229, 185, 63, 0.25); backdrop-filter: blur(16px); border-radius: 16px; padding: 2.25rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45); color: #f0f6fc;">
        
        <!-- Header Branding -->
        <div style="text-align: center; margin-bottom: 1.75rem;">
          <div style="width: 76px; height: 76px; border-radius: 16px; background: #ffffff; border: 2px solid #e5b93f; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; box-shadow: 0 4px 18px rgba(229, 185, 63, 0.35); overflow: hidden; padding: 4px;">
            <img src="/logo-garden-gold.jpg" alt="Garden Gold Academia" style="width: 100%; height: 100%; object-fit: contain;">
          </div>
          <h1 style="font-family: var(--font-title, 'Outfit', sans-serif); font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; margin: 0 0 0.4rem 0;">Garden Experience</h1>
          <p id="authHeaderSubtitle" style="font-size: 0.88rem; color: #8b949e; margin: 0;">Transforme feedback em experiência.</p>
        </div>

        <!-- Auth Navigation Tabs -->
        <div style="display: flex; background: rgba(13, 17, 23, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 0.25rem; margin-bottom: 1.5rem; gap: 0.25rem;">
          <button type="button" id="tabAuthLogin" class="auth-tab-btn active" style="flex: 1; padding: 0.5rem; border: none; border-radius: 7px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #e5b93f; color: #0d1117; transition: all 0.2s;">
            Entrar
          </button>
          <button type="button" id="tabAuthInvite" class="auth-tab-btn" style="flex: 1; padding: 0.5rem; border: none; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: transparent; color: #8b949e; transition: all 0.2s;">
            Tenho Convite
          </button>
          <button type="button" id="tabAuthRegister" class="auth-tab-btn" style="flex: 1; padding: 0.5rem; border: none; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: transparent; color: #8b949e; transition: all 0.2s;">
            Nova Empresa
          </button>
        </div>

        <!-- Alert Notification Box -->
        <div id="authAlertBox" style="display: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 1.25rem; line-height: 1.45;"></div>

        <!-- FORM 1: LOGIN -->
        <form id="mainLoginForm" style="display: block;">
          <div style="margin-bottom: 1.1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.4rem;">E-mail Comercial</label>
            <input type="email" id="inputLoginEmail" required placeholder="seu.nome@empresa.com.br" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none; transition: border-color 0.2s;">
          </div>

          <div style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <label style="font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e;">Senha</label>
              <a href="#" id="linkForgotPassword" style="font-size: 0.78rem; color: #e5b93f; text-decoration: none; font-weight: 500;">Esqueci minha senha</a>
            </div>
            <input type="password" id="inputLoginPassword" required placeholder="••••••••" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none; transition: border-color 0.2s;">
          </div>

          <button type="submit" id="btnSubmitLogin" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.92rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(229, 185, 63, 0.25); transition: opacity 0.2s;">
            Entrar no Sistema
          </button>
        </form>

        <!-- FORM 2: INVITED COLLABORATOR SIGNUP -->
        <form id="mainInviteForm" style="display: none;">
          <div id="inviteOrgBanner" style="padding: 0.75rem 1rem; background: rgba(229, 185, 63, 0.12); border: 1px solid rgba(229, 185, 63, 0.35); border-radius: 8px; font-size: 0.82rem; color: #fde68a; margin-bottom: 1.1rem; line-height: 1.4;">
            👋 Foi convidado por um administrador? Informe o mesmo e-mail do convite abaixo e crie sua senha para acessar a organização.
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Seu Nome Completo</label>
            <input type="text" id="inputInviteFullName" required placeholder="Ex: Pedro Silva" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">E-mail Convidado</label>
            <input type="email" id="inputInviteEmail" required placeholder="seu.email@empresa.com" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Criar Senha de Acesso</label>
            <input type="password" id="inputInvitePassword" required placeholder="Mínimo 6 caracteres" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Confirmar Senha</label>
            <input type="password" id="inputInviteConfirmPassword" required placeholder="Repita a senha" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <button type="submit" id="btnSubmitInvite" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.92rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(229, 185, 63, 0.25);">
            Criar Senha e Aceitar Convite
          </button>
        </form>

        <!-- FORM 3: REGISTER COMPANY -->
        <form id="mainRegisterForm" style="display: none;">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Nome da Empresa / Organização</label>
            <input type="text" id="inputRegCompany" required placeholder="Ex: Garden Gold Academia" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Nome do Responsável</label>
            <input type="text" id="inputRegFullName" required placeholder="Ex: João Pedro" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">E-mail Comercial</label>
            <input type="email" id="inputRegEmail" required placeholder="joao@gardengold.com.br" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Senha</label>
            <input type="password" id="inputRegPassword" required placeholder="Mínimo 6 caracteres" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Confirmar Senha</label>
            <input type="password" id="inputRegConfirmPassword" required placeholder="Repita a senha" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <button type="submit" id="btnSubmitRegister" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.92rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(229, 185, 63, 0.25);">
            Cadastrar Minha Empresa
          </button>
        </form>

        <!-- FORM 4: FORGOT PASSWORD -->
        <form id="mainForgotForm" style="display: none;">
          <h3 style="font-size: 0.95rem; font-weight: 700; color: #ffffff; margin-bottom: 0.5rem;">Recuperação de Senha</h3>
          <p style="font-size: 0.82rem; color: #8b949e; margin-bottom: 1.25rem;">Informe seu e-mail cadastrado para receber o link de redefinição de senha do Supabase.</p>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.4rem;">E-mail Cadastrado</label>
            <input type="email" id="inputForgotEmail" required placeholder="seu.nome@empresa.com.br" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none;">
          </div>

          <button type="submit" id="btnSubmitForgot" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.92rem; font-weight: 700; cursor: pointer; margin-bottom: 1rem;">
            Enviar Link de Recuperação
          </button>

          <div style="text-align: center;">
            <a href="#" id="linkBackToLogin" style="font-size: 0.8rem; color: #8b949e; text-decoration: none;">← Voltar para a tela de entrar</a>
          </div>
        </form>

        <!-- KIOSK / TABLET TOKEN QUICK ACCESS -->
        <div style="margin-top: 1.35rem; padding-top: 1.1rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <button type="button" id="btnToggleTabletTokenBox" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(229, 185, 63, 0.08); border: 1px solid rgba(229, 185, 63, 0.3); border-radius: 8px; color: #e5b93f; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.45rem; transition: all 0.15s;">
            <span>📱</span>
            <span>Acessar Modo Totem / Tablet com Token</span>
          </button>

          <form id="formConnectTabletToken" style="display: none; margin-top: 0.85rem; padding: 0.95rem; background: rgba(13, 17, 23, 0.85); border: 1px solid rgba(229, 185, 63, 0.35); border-radius: 10px; text-align: left;">
            <label style="display: block; font-size: 0.76rem; font-weight: 700; color: #e5b93f; margin-bottom: 0.35rem;">🔑 Token de Acesso do Dispositivo (Totem):</label>
            <p style="font-size: 0.74rem; color: #8b949e; margin: 0 0 0.6rem 0; line-height: 1.35;">Cole ou digite o token gerado em <strong>Dispositivos</strong> para ativar a coleta de NPS neste aparelho sem precisar fazer login administrativo.</p>
            <div style="display: flex; gap: 0.45rem;">
              <input type="text" id="inputTabletAccessToken" required placeholder="Cole o token aqui..." style="flex: 1; padding: 0.65rem 0.8rem; background: #07090e; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 7px; color: #ffffff; font-size: 0.84rem; font-family: monospace; outline: none;">
              <button type="submit" style="padding: 0.65rem 1rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 7px; color: #0d1117; font-size: 0.82rem; font-weight: 800; cursor: pointer; white-space: nowrap;">
                🚀 Conectar
              </button>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div style="margin-top: 1.15rem; text-align: center; padding-top: 0.5rem;">
          <span style="font-size: 0.75rem; color: #484f58;">Garden Experience SaaS v2.0 • Conexão Criptografada Supabase Auth</span>
        </div>

      </div>
    </div>
  `;
}

export function setupLoginPageHandlers(onAuthSuccessCallback) {
  const alertBox = document.getElementById('authAlertBox');

  const showAlert = (msg, type = 'error') => {
    if (!alertBox) return;
    alertBox.style.display = 'block';
    if (type === 'error') {
      alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
      alertBox.style.border = '1px solid rgba(239, 68, 68, 0.35)';
      alertBox.style.color = '#fca5a5';
    } else if (type === 'success') {
      alertBox.style.background = 'rgba(16, 185, 129, 0.15)';
      alertBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
      alertBox.style.color = '#6ee7b7';
    } else {
      alertBox.style.background = 'rgba(229, 185, 63, 0.15)';
      alertBox.style.border = '1px solid rgba(229, 185, 63, 0.35)';
      alertBox.style.color = '#fde68a';
    }
    alertBox.textContent = msg;
  };

  const hideAlert = () => {
    if (alertBox) alertBox.style.display = 'none';
  };

  // Tab Switchers
  const tabLogin = document.getElementById('tabAuthLogin');
  const tabInvite = document.getElementById('tabAuthInvite');
  const tabRegister = document.getElementById('tabAuthRegister');
  const formLogin = document.getElementById('mainLoginForm');
  const formInvite = document.getElementById('mainInviteForm');
  const formRegister = document.getElementById('mainRegisterForm');
  const formForgot = document.getElementById('mainForgotForm');

  const activateTab = (activeBtn, activeForm) => {
    hideAlert();
    [tabLogin, tabInvite, tabRegister].forEach(btn => {
      if (!btn) return;
      if (btn === activeBtn) {
        btn.style.background = '#e5b93f';
        btn.style.color = '#0d1117';
        btn.style.fontWeight = '600';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#8b949e';
        btn.style.fontWeight = '500';
      }
    });
    [formLogin, formInvite, formRegister, formForgot].forEach(f => {
      if (!f) return;
      f.style.display = f === activeForm ? 'block' : 'none';
    });
  };

  if (tabLogin) tabLogin.onclick = () => activateTab(tabLogin, formLogin);
  if (tabInvite) tabInvite.onclick = () => activateTab(tabInvite, formInvite);
  if (tabRegister) tabRegister.onclick = () => activateTab(tabRegister, formRegister);

  // Check URL parameters (?invite=TOKEN or ?email=EMAIL)
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite');
  const prefillEmail = urlParams.get('email');

  if (prefillEmail) {
    const loginEmailInput = document.getElementById('inputLoginEmail');
    if (loginEmailInput) loginEmailInput.value = prefillEmail;
    showAlert(`Seu e-mail (${prefillEmail}) já está liberado na organização! Digite sua senha abaixo para entrar.`, 'info');
  }

  if (inviteToken) {
    activateTab(tabInvite, formInvite);
    usersRepository.getInviteByToken(inviteToken).then(inv => {
      if (inv) {
        const banner = document.getElementById('inviteOrgBanner');
        const nameInput = document.getElementById('inputInviteFullName');
        const emailInput = document.getElementById('inputInviteEmail');
        if (banner) {
          banner.innerHTML = `🎉 Você foi convidado(a) para acessar a organização <strong>${inv.organization_name || 'Garden Experience'}</strong>! Crie sua senha abaixo para liberar seu acesso.`;
        }
        if (nameInput && inv.full_name) nameInput.value = inv.full_name;
        if (emailInput && inv.email) emailInput.value = inv.email;
      }
    });
  }

  // Forgot password link click
  document.getElementById('linkForgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideAlert();
    if (formLogin) formLogin.style.display = 'none';
    if (formInvite) formInvite.style.display = 'none';
    if (formRegister) formRegister.style.display = 'none';
    if (formForgot) formForgot.style.display = 'block';

    const loginEmailVal = document.getElementById('inputLoginEmail')?.value;
    const forgotEmailInput = document.getElementById('inputForgotEmail');
    if (forgotEmailInput && loginEmailVal) forgotEmailInput.value = loginEmailVal;
  });

  document.getElementById('linkBackToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    activateTab(tabLogin, formLogin);
  });

  // Tablet / Totem Token Connection Handler
  const btnToggleTablet = document.getElementById('btnToggleTabletTokenBox');
  const formTabletToken = document.getElementById('formConnectTabletToken');
  if (btnToggleTablet && formTabletToken) {
    btnToggleTablet.addEventListener('click', () => {
      const isVisible = formTabletToken.style.display === 'block';
      formTabletToken.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        document.getElementById('inputTabletAccessToken')?.focus();
      }
    });

    formTabletToken.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawVal = document.getElementById('inputTabletAccessToken')?.value.trim() || '';
      if (!rawVal) return;
      // Allow pasting either the raw token OR the full URL containing ?token=
      let extractedToken = rawVal;
      if (rawVal.includes('token=')) {
        try {
          const u = new URL(rawVal);
          extractedToken = u.searchParams.get('token') || rawVal;
        } catch (_) {
          const match = rawVal.match(/[?&]token=([^&]+)/);
          if (match && match[1]) extractedToken = decodeURIComponent(match[1]);
        }
      }
      window.location.href = `${window.location.origin}/?token=${encodeURIComponent(extractedToken.trim())}&origin=tablet`;
    });
  }

  // Submit Handler 1: Login
  if (formLogin) {
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      hideAlert();

      const btn = document.getElementById('btnSubmitLogin');
      const email = document.getElementById('inputLoginEmail')?.value.trim();
      const pass = document.getElementById('inputLoginPassword')?.value;

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Autenticando...';
      }

      const res = await authService.login(email, pass);

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Entrar no Sistema';
      }

      if (!res.success) {
        showAlert(res.error, 'error');
        showToast(`❌ ${res.error}`, 'error');
        return;
      }

      showToast(`✓ Autenticado com sucesso como ${email}!`, 'success');
      if (typeof onAuthSuccessCallback === 'function') {
        onAuthSuccessCallback();
      }
    };
  }

  // Submit Handler 2: Invited Collaborator Registration
  if (formInvite) {
    formInvite.onsubmit = async (e) => {
      e.preventDefault();
      hideAlert();

      const fullName = document.getElementById('inputInviteFullName')?.value.trim();
      const email = document.getElementById('inputInviteEmail')?.value.trim();
      const pass = document.getElementById('inputInvitePassword')?.value;
      const passConfirm = document.getElementById('inputInviteConfirmPassword')?.value;

      if (pass !== passConfirm) {
        showAlert('As senhas digitadas não coincidem.', 'error');
        return;
      }

      if (pass.length < 6) {
        showAlert('A senha deve conter pelo menos 6 caracteres.', 'error');
        return;
      }

      const btn = document.getElementById('btnSubmitInvite');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Ativando Acesso...';
      }

      const res = await authService.registerInvitedMember({
        inviteToken,
        fullName,
        email,
        password: pass
      });

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Criar Senha e Aceitar Convite';
      }

      if (!res.success) {
        showAlert(res.error, 'error');
        showToast(`❌ ${res.error}`, 'error');
        return;
      }

      if (res.requiresConfirmation) {
        showAlert(res.message, 'info');
        showToast(`📧 ${res.message}`, 'info', 6000);
      } else {
        showToast(`🎉 Bem-vindo(a), ${fullName}! Seu acesso foi ativado com sucesso.`, 'success');
        if (typeof onAuthSuccessCallback === 'function') {
          onAuthSuccessCallback();
        }
      }
    };
  }

  // Submit Handler 3: Register New Company
  if (formRegister) {
    formRegister.onsubmit = async (e) => {
      e.preventDefault();
      hideAlert();

      const companyName = document.getElementById('inputRegCompany')?.value.trim();
      const fullName = document.getElementById('inputRegFullName')?.value.trim();
      const email = document.getElementById('inputRegEmail')?.value.trim();
      const pass = document.getElementById('inputRegPassword')?.value;
      const passConfirm = document.getElementById('inputRegConfirmPassword')?.value;

      if (pass !== passConfirm) {
        showAlert('As senhas digitadas não coincidem.', 'error');
        return;
      }

      if (pass.length < 6) {
        showAlert('A senha deve conter pelo menos 6 caracteres.', 'error');
        return;
      }

      const btn = document.getElementById('btnSubmitRegister');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Criando Empresa...';
      }

      const res = await authService.registerCompany({ companyName, fullName, email, password: pass });

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Cadastrar Minha Empresa';
      }

      if (!res.success) {
        showAlert(res.error, 'error');
        showToast(`❌ ${res.error}`, 'error');
        return;
      }

      if (res.requiresConfirmation) {
        showAlert(res.message, 'info');
        showToast(`📧 ${res.message}`, 'info', 6000);
      } else {
        showToast(`🎉 Empresa "${companyName}" criada com sucesso!`, 'success');
        if (typeof onAuthSuccessCallback === 'function') {
          onAuthSuccessCallback();
        }
      }
    };
  }

  // Submit Handler 4: Request Forgot Password Email
  if (formForgot) {
    formForgot.onsubmit = async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('inputForgotEmail')?.value.trim();
      const btn = document.getElementById('btnSubmitForgot');

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
      }

      const res = await authService.requestPasswordReset(email);

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Enviar Link de Recuperação';
      }

      if (!res.success) {
        showAlert(res.error, 'error');
        return;
      }

      showAlert('Link de redefinição de senha enviado para o e-mail informado!', 'success');
      showToast(`📧 Instruções enviadas para ${email}. Verifique sua caixa de entrada.`, 'success', 6000);
    };
  }
}
