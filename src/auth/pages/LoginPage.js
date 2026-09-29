/**
 * Dedicated Real SaaS Login & Registration Page Component
 * Slate / Obsidian theme with Gold accent, coherent with Garden Experience Design System.
 */

import { authService } from '../services/authService.js';
import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';

export function renderLoginPage() {
  return `
    <div id="authPageContainer" style="min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top right, rgba(229, 185, 63, 0.08), transparent 40%), var(--bg-body, #0d1117); padding: 1.5rem; font-family: var(--font-main, 'Inter', sans-serif);">
      <div style="width: 100%; max-width: 440px; background: rgba(20, 26, 38, 0.85); border: 1px solid rgba(229, 185, 63, 0.25); backdrop-filter: blur(16px); border-radius: 16px; padding: 2.25rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45); color: #f0f6fc;">
        
        <!-- Header Branding -->
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #e5b93f, #b38b20); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; box-shadow: 0 4px 14px rgba(229, 185, 63, 0.35);">
            <span style="font-size: 1.5rem; font-weight: 800; color: #0d1117; font-family: var(--font-title, 'Outfit', sans-serif);">G</span>
          </div>
          <h1 style="font-family: var(--font-title, 'Outfit', sans-serif); font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; margin: 0 0 0.4rem 0;">Garden Experience</h1>
          <p style="font-size: 0.88rem; color: #8b949e; margin: 0;">Transforme feedback em experiência.</p>
        </div>

        <!-- Auth Navigation Tabs -->
        <div style="display: flex; background: rgba(13, 17, 23, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 0.25rem; margin-bottom: 1.75rem; gap: 0.25rem;">
          <button type="button" id="tabAuthLogin" class="auth-tab-btn active" style="flex: 1; padding: 0.5rem; border: none; border-radius: 7px; font-size: 0.82rem; font-weight: 600; cursor: pointer; background: #e5b93f; color: #0d1117; transition: all 0.2s;">
            Entrar
          </button>
          <button type="button" id="tabAuthRegister" class="auth-tab-btn" style="flex: 1; padding: 0.5rem; border: none; border-radius: 7px; font-size: 0.82rem; font-weight: 500; cursor: pointer; background: transparent; color: #8b949e; transition: all 0.2s;">
            Criar Empresa
          </button>
        </div>

        <!-- Alert Notification Box -->
        <div id="authAlertBox" style="display: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 1.25rem; line-height: 1.4;"></div>

        <!-- FORM 1: LOGIN -->
        <form id="mainLoginForm" style="display: block;">
          <div style="margin-bottom: 1.1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.4rem;">E-mail Comercial</label>
            <input type="email" id="inputLoginEmail" required placeholder="seu.name@empresa.com.br" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none; transition: border-color 0.2s;">
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

        <!-- FORM 2: REGISTER COMPANY -->
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

        <!-- FORM 3: FORGOT PASSWORD -->
        <form id="mainForgotForm" style="display: none;">
          <h3 style="font-size: 0.95rem; font-weight: 700; color: #ffffff; margin-bottom: 0.5rem;">Recuperação de Senha</h3>
          <p style="font-size: 0.82rem; color: #8b949e; margin-bottom: 1.25rem;">Informe seu e-mail cadastrado para receber o link de redefinição de senha do Supabase.</p>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.4rem;">E-mail Cadastrado</label>
            <input type="email" id="inputForgotEmail" required placeholder="seu.name@empresa.com.br" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none;">
          </div>

          <button type="submit" id="btnSubmitForgot" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.92rem; font-weight: 700; cursor: pointer; margin-bottom: 1rem;">
            Enviar Link de Recuperação
          </button>

          <div style="text-align: center;">
            <a href="#" id="linkBackToLogin" style="font-size: 0.8rem; color: #8b949e; text-decoration: none;">← Voltar para a tela de entrar</a>
          </div>
        </form>

        <!-- Footer -->
        <div style="margin-top: 1.75rem; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1rem;">
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
  const tabRegister = document.getElementById('tabAuthRegister');
  const formLogin = document.getElementById('mainLoginForm');
  const formRegister = document.getElementById('mainRegisterForm');
  const formForgot = document.getElementById('mainForgotForm');

  if (tabLogin && tabRegister) {
    tabLogin.onclick = () => {
      hideAlert();
      tabLogin.style.background = '#e5b93f';
      tabLogin.style.color = '#0d1117';
      tabLogin.style.fontWeight = '600';

      tabRegister.style.background = 'transparent';
      tabRegister.style.color = '#8b949e';
      tabRegister.style.fontWeight = '500';

      if (formLogin) formLogin.style.display = 'block';
      if (formRegister) formRegister.style.display = 'none';
      if (formForgot) formForgot.style.display = 'none';
    };

    tabRegister.onclick = () => {
      hideAlert();
      tabRegister.style.background = '#e5b93f';
      tabRegister.style.color = '#0d1117';
      tabRegister.style.fontWeight = '600';

      tabLogin.style.background = 'transparent';
      tabLogin.style.color = '#8b949e';
      tabLogin.style.fontWeight = '500';

      if (formLogin) formLogin.style.display = 'none';
      if (formRegister) formRegister.style.display = 'block';
      if (formForgot) formForgot.style.display = 'none';
    };
  }

  // Forgot password link click
  document.getElementById('linkForgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideAlert();
    if (formLogin) formLogin.style.display = 'none';
    if (formRegister) formRegister.style.display = 'none';
    if (formForgot) formForgot.style.display = 'block';

    const loginEmailVal = document.getElementById('inputLoginEmail')?.value;
    const forgotEmailInput = document.getElementById('inputForgotEmail');
    if (forgotEmailInput && loginEmailVal) forgotEmailInput.value = loginEmailVal;
  });

  document.getElementById('linkBackToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    tabLogin?.click();
  });

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

  // Submit Handler 2: Register Company
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

  // Submit Handler 3: Request Forgot Password Email
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
