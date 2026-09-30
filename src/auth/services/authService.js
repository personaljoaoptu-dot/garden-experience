/**
 * Authentication Service (V2.0 Production Supabase Auth & Session Listener)
 * Encapsulates Supabase Auth operations, password recovery, session handling, and team invitations.
 */

import { supabase, isSupabaseConfigured } from '../../core/supabase/client.js';
import { store } from '../../app/app-state/store.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
import { showToast } from '../../shared/feedback/toast.js';

export const authService = {
  /**
   * Real Supabase Authentication via Password
   */
  async login(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Por favor, preencha o e-mail e a senha.' };
    }
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas no ambiente da Vercel.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.warn('[AuthService.login error]:', error.message);
        let friendlyMsg = 'E-mail ou senha incorretos.';
        if (error.message.includes('Invalid login credentials')) {
          friendlyMsg = 'E-mail ou senha incorretos. Por favor, tente novamente.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMsg = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('Failed to fetch')) {
          friendlyMsg = 'Falha ao conectar com o Supabase (Failed to fetch). Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY foram configuradas na Vercel.';
        }
        return { success: false, error: friendlyMsg };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Sessão não foi confirmada pelo servidor.' };
      }

      // Sync store with authenticated user data
      await syncStoreWithSupabase();
      return { success: true, user: data.user };
    } catch (err) {
      console.error('[AuthService.login unexpected]:', err);
      const msg = err?.message?.includes('Failed to fetch') 
        ? 'Falha ao conectar com o Supabase (Failed to fetch). Verifique a configuração na Vercel.'
        : 'Erro inesperado ao realizar login. Tente novamente.';
      return { success: false, error: msg };
    }
  },

  /**
   * Create Organization for an Already Authenticated User (First-access flow)
   */
  async createOrganizationForAuthenticatedUser({ companyName, fullName }) {
    if (!companyName) {
      return { success: false, error: 'Por favor, informe o nome da sua empresa.' };
    }
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'As variáveis de ambiente do Supabase não estão configuradas na Vercel.' };
    }

    try {
      const user = store.currentUser;
      const userEmail = user?.email;
      const userName = fullName || user?.name || userEmail;

      if (!userEmail) {
        return { success: false, error: 'Sessão do usuário não encontrada. Por favor, faça login novamente.' };
      }

      const { data: orgId, error: rpcErr } = await supabase.rpc('create_new_organization_owner', {
        p_org_name: companyName.trim(),
        p_user_email: userEmail.trim(),
        p_user_full_name: userName ? userName.trim() : userEmail.trim()
      });

      if (rpcErr) {
        console.error('[AuthService.createOrganizationForAuthenticatedUser RPC Error]:', rpcErr.message);
        return { success: false, error: `Falha ao criar empresa: ${rpcErr.message}` };
      }

      await syncStoreWithSupabase();
      return { success: true };
    } catch (err) {
      console.error('[AuthService.createOrganizationForAuthenticatedUser unexpected]:', err);
      return { success: false, error: 'Erro inesperado ao criar empresa. Tente novamente.' };
    }
  },

  /**
   * Real Enterprise Sign Up & Owner Account Creation
   */
  async registerCompany({ companyName, fullName, email, password }) {
    if (!companyName || !email || !password) {
      return { success: false, error: 'Preencha todos os campos obrigatórios.' };
    }
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas no ambiente da Vercel.' };
    }

    // Protection: If user is ALREADY authenticated with matching email, bypass signUp
    if (store.currentUser && store.currentUser.email === email.trim()) {
      return await this.createOrganizationForAuthenticatedUser({ companyName, fullName });
    }

    try {
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (authErr) {
        console.warn('[AuthService.registerCompany auth error]:', authErr.message);
        const errorMsg = authErr.message?.includes('Failed to fetch')
          ? 'Falha ao conectar com o Supabase (Failed to fetch). Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.'
          : authErr.message;
        return { success: false, error: errorMsg };
      }

      const user = authData?.user;
      if (!user) {
        return { success: false, error: 'Não foi possível criar o usuário de autenticação.' };
      }

      // 2. If session is active, invoke secure RPC to create organization & membership
      if (authData.session) {
        const { data: orgId, error: rpcErr } = await supabase.rpc('create_new_organization_owner', {
          p_org_name: companyName.trim(),
          p_user_email: email.trim(),
          p_user_full_name: fullName ? fullName.trim() : email.trim()
        });

        if (rpcErr) {
          console.error('[AuthService.registerCompany RPC Error]:', rpcErr.message);
          return { success: false, error: `Falha ao registrar empresa: ${rpcErr.message}` };
        }

        await syncStoreWithSupabase();
        return { success: true, requiresConfirmation: false };
      } else {
        // Email confirmation is required by Supabase Auth settings
        return {
          success: true,
          requiresConfirmation: true,
          message: 'Conta registrada! Por favor, verifique seu e-mail para ativar sua conta antes de entrar.'
        };
      }
    } catch (err) {
      console.error('[AuthService.registerCompany unexpected]:', err);
      const msg = err?.message?.includes('Failed to fetch')
        ? 'Falha de conexão com o Supabase (Failed to fetch). Verifique a configuração na Vercel.'
        : 'Erro inesperado durante o cadastro. Tente novamente.';
      return { success: false, error: msg };
    }
  },

  /**
   * Real Password Reset Email Request
   */
  async requestPasswordReset(email) {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Por favor, informe um e-mail válido.' };
    }
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas no ambiente da Vercel.' };
    }

    try {
      const redirectTo = window.location.origin + window.location.pathname + '?view=reset_password';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      if (error) {
        console.warn('[AuthService.requestPasswordReset error]:', error.message);
        const msg = error.message?.includes('Failed to fetch')
          ? 'Falha de conexão com o Supabase (Failed to fetch). Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY foram configuradas na Vercel.'
          : error.message;
        return { success: false, error: msg };
      }

      return { success: true };
    } catch (err) {
      console.error('[AuthService.requestPasswordReset unexpected]:', err);
      const msg = err?.message?.includes('Failed to fetch')
        ? 'Falha de conexão com o Supabase (Failed to fetch). Verifique a configuração na Vercel.'
        : 'Falha ao solicitar recuperação de senha.';
      return { success: false, error: msg };
    }
  },

  /**
   * Define New Password after Recovery Link
   */
  async updateUserPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve possuir pelo menos 6 caracteres.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Erro ao atualizar senha.' };
    }
  },

  /**
   * Real Supabase Sign Out
   */
  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthService.logout warning]:', err);
    } finally {
      store.resetAuth();
    }
  },

  /**
   * Listen to Supabase Auth State Changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED)
   */
  setupSessionListener(onAuthStateChangeCallback) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.info(`[AuthListener] Auth Event: ${event}`);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          await syncStoreWithSupabase();
        } else {
          store.resetAuth();
        }
      } else if (event === 'SIGNED_OUT') {
        store.resetAuth();
      }

      if (typeof onAuthStateChangeCallback === 'function') {
        onAuthStateChangeCallback(event, session);
      }
    });
  }
};
