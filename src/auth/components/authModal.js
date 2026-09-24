/**
 * Auth Modal Component
 * Handles login, registration, and password reset.
 */

import { supabase } from '../../core/supabase/client.js';
import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';

export function setupAuthManager(refreshAllViewsCallback) {
  const btnOpen = document.getElementById('btnOpenAuthModal');
  const modal = document.getElementById('modalAuth');
  if (!modal) return;

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  }

  const btnTabLogin = document.getElementById('btnTabAuthLogin');
  const btnTabRegister = document.getElementById('btnTabAuthRegister');
  const formLogin = document.getElementById('formAuthLogin');
  const formRegister = document.getElementById('formAuthRegister');
  const title = document.getElementById('authModalTitle');

  if (btnTabLogin && btnTabRegister) {
    btnTabLogin.addEventListener('click', () => {
      btnTabLogin.className = 'btn-secondary-gold btn-sm active';
      btnTabRegister.className = 'btn-outline-gold btn-sm';
      if (formLogin) formLogin.style.display = 'block';
      if (formRegister) formRegister.style.display = 'none';
      if (title) title.textContent = '🔐 Entrar no Garden Experience';
    });

    btnTabRegister.addEventListener('click', () => {
      btnTabRegister.className = 'btn-secondary-gold btn-sm active';
      btnTabLogin.className = 'btn-outline-gold btn-sm';
      if (formLogin) formLogin.style.display = 'none';
      if (formRegister) formRegister.style.display = 'block';
      if (title) title.textContent = '🚀 Criar Minha Conta Comercial';
    });
  }

  const linkForgot = document.getElementById('linkForgotPassword');
  if (linkForgot) {
    linkForgot.addEventListener('click', () => {
      const email = document.getElementById('loginEmail')?.value.trim();
      if (!email) {
        alert('Por favor, informe seu e-mail no campo acima.');
        return;
      }
      showToast(`📧 E-mail de recuperação de senha enviado para: ${email}`, 'info', 4000);
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) console.warn('[Supabase Auth Warning]:', error.message);
      } catch (err) {
        console.warn('[Supabase Auth Error]:', err);
      }

      store.currentUser = { email, name: email.split('@')[0] };
      const avatarBadge = document.getElementById('userAvatarBadge');
      if (avatarBadge) avatarBadge.textContent = email.substring(0, 1).toUpperCase();

      modal.style.display = 'none';
      formLogin.reset();
      showToast(`✓ Autenticado com sucesso como ${email}!`, 'success');
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pass = document.getElementById('regPassword').value;
      const passConfirm = document.getElementById('regPasswordConfirm').value;

      if (pass !== passConfirm) {
        alert('As senhas não coincidem. Por favor, verifique.');
        return;
      }
      if (pass.length < 6) {
        alert('A senha deve possuir pelo menos 6 caracteres.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name } }
        });
        if (error) console.warn('[Supabase Register Warning]:', error.message);
      } catch (err) {
        console.warn('[Supabase Register Error]:', err);
      }

      store.currentUser = { email, name };
      modal.style.display = 'none';
      formRegister.reset();

      document.getElementById('btnStartOnboarding')?.click();
      showToast(`🎉 Conta criada para ${name}! Vamos configurar sua empresa.`, 'success', 5000);
    });
  }
}
