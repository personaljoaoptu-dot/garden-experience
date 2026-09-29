/**
 * Password Reset Page Component (Triggered when user opens email recovery link)
 */

import { authService } from '../services/authService.js';
import { showToast } from '../../shared/feedback/toast.js';

export function renderResetPasswordPage() {
  return `
    <div id="resetPasswordContainer" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top right, rgba(229, 185, 63, 0.08), transparent 40%), var(--bg-body, #0d1117); padding: 1.5rem; font-family: var(--font-main, 'Inter', sans-serif);">
      <div style="width: 100%; max-width: 420px; background: rgba(20, 26, 38, 0.85); border: 1px solid rgba(229, 185, 63, 0.25); backdrop-filter: blur(16px); border-radius: 16px; padding: 2.25rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45); color: #f0f6fc;">
        
        <div style="text-align: center; margin-bottom: 1.75rem;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(229, 185, 63, 0.15); border: 1px solid rgba(229, 185, 63, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.25rem;">
            🔑
          </div>
          <h2 style="font-family: var(--font-title, 'Outfit', sans-serif); font-size: 1.4rem; font-weight: 700; color: #ffffff; margin: 0 0 0.4rem 0;">Redefinir Senha</h2>
          <p style="font-size: 0.85rem; color: #8b949e; margin: 0;">Crie uma nova senha segura para sua conta.</p>
        </div>

        <div id="resetAlertBox" style="display: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 1.25rem;"></div>

        <form id="formResetPassword">
          <div style="margin-bottom: 1.1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.4rem;">Nova Senha</label>
            <input type="password" id="inputNewPassword" required placeholder="Mínimo 6 caracteres" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none;">
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.4rem;">Confirmar Nova Senha</label>
            <input type="password" id="inputConfirmNewPassword" required placeholder="Repita a nova senha" style="width: 100%; padding: 0.75rem 1rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none;">
          </div>

          <button type="submit" id="btnSubmitResetPassword" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.92rem; font-weight: 700; cursor: pointer;">
            Salvar Nova Senha
          </button>
        </form>

      </div>
    </div>
  `;
}

export function setupResetPasswordHandlers(onResetSuccessCallback) {
  const form = document.getElementById('formResetPassword');
  if (!form) return;

  const alertBox = document.getElementById('resetAlertBox');
  const showAlert = (msg, isError = true) => {
    if (!alertBox) return;
    alertBox.style.display = 'block';
    alertBox.style.background = isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    alertBox.style.border = isError ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)';
    alertBox.style.color = isError ? '#fca5a5' : '#6ee7b7';
    alertBox.textContent = msg;
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('inputNewPassword')?.value;
    const confirmPass = document.getElementById('inputConfirmNewPassword')?.value;

    if (newPass !== confirmPass) {
      showAlert('As senhas não coincidem.');
      return;
    }

    if (newPass.length < 6) {
      showAlert('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    const res = await authService.updateUserPassword(newPass);
    if (!res.success) {
      showAlert(res.error);
      return;
    }

    showAlert('Senha atualizada com sucesso! Redirecionando...', false);
    showToast('✓ Sua nova senha foi salva com sucesso!', 'success');
    setTimeout(() => {
      if (typeof onResetSuccessCallback === 'function') {
        onResetSuccessCallback();
      }
    }, 1500);
  };
}
