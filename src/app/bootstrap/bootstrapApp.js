/**
 * Application Bootstrap Entry Module (V2.0 Production Auth & Multi-Tenant Access Control)
 * Controls application lifecycle, authentication guards, router protection, and view rendering.
 */

import { store } from '../app-state/store.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
import { authService } from '../../auth/services/authService.js';
import { renderAppLayout } from '../../shared/layout/AppLayout.js';
import { renderLoginPage, setupLoginPageHandlers } from '../../auth/pages/LoginPage.js';
import { renderResetPasswordPage, setupResetPasswordHandlers } from '../../auth/pages/ResetPasswordPage.js';
import { initTheme } from '../../theme/themeEngine.js';
import { setupSidebarNavigation } from '../router/router.js';
import { renderOrganizationHeader } from '../../organizations/components/organizationHeader.js';
import { setupSaaSOnboarding } from '../../organizations/components/onboardingModal.js';
import { setupAdminDashboard, updateDashboard } from '../../dashboard/components/dashboardView.js';
import { setupResponsesInbox, renderResponsesInbox } from '../../responses/components/responsesInboxView.js';
import { setupCasesViewSwitcher, renderCasesTable } from '../../followups/components/casesView.js';
import { setupSurveyForm } from '../../surveys/components/surveyFormView.js';
import { setupKioskMode } from '../../devices/components/kioskView.js';
import { setupTouchpointsCategoryFilters, renderTouchpointCards } from '../../touchpoints/components/touchpointsView.js';
import { setupSurveyBuilderTabs, renderSurveysTable } from '../../surveys/components/surveyBuilderView.js';
import { renderDevicesTable } from '../../devices/components/devicesView.js';
import { renderReportsSummary } from '../../reports/components/reportsView.js';
import { setupConfigTabs, renderConfigUnitsTable } from '../../settings/components/settingsView.js';
import { setupTeamManagement, renderTeamTable } from '../../settings/components/teamManagementView.js';
import { renderStudentEvolutionView } from '../../students/components/studentEvolutionView.js';
import { setupQrCodeGenerator } from '../../qr/components/qrModal.js';

export function bootstrapApp() {
  const init = async () => {
    initTheme();

    // 1. Initial Data Sync & Auth Session Resolution
    try {
      await syncStoreWithSupabase();
    } catch (err) {
      console.warn('[Bootstrap] Data sync warning:', err);
    }

    // 2. Setup Real-time Auth State Change Listener
    authService.setupSessionListener(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        renderAuthOrMainShell();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        renderAuthOrMainShell();
      }
    });

    // 3. Render Appropriate Root View (Public Survey vs Login vs Main SaaS Shell)
    renderAuthOrMainShell();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export function renderAuthOrMainShell() {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view') || window.location.hash.replace('#', '');

  // 1. PUBLIC ROUTES (No Admin Auth Required)
  if (viewParam === 'public_survey' || viewParam === 'kiosk' || urlParams.get('token') || urlParams.get('tablet_token')) {
    appRoot.innerHTML = renderAppLayout();
    wireMainAppEvents();
    if (viewParam === 'public_survey' || urlParams.get('token')) {
      document.querySelector('[data-mod="mod-public-survey"]')?.click();
    } else if (viewParam === 'kiosk' || urlParams.get('tablet_token')) {
      document.querySelector('[data-mod="mod-kiosk"]')?.click();
    }
    return;
  }

  // 2. PASSWORD RESET ROUTE
  if (viewParam === 'reset_password' || window.location.hash.includes('type=recovery')) {
    appRoot.innerHTML = renderResetPasswordPage();
    setupResetPasswordHandlers(() => {
      window.location.href = window.location.origin + window.location.pathname;
    });
    return;
  }

  // 3. UNAUTHENTICATED STATE -> Show Dedicated Login Screen
  if (store.authStatus === 'unauthenticated' || !store.currentUser) {
    appRoot.innerHTML = renderLoginPage();
    setupLoginPageHandlers(() => {
      renderAuthOrMainShell();
    });
    return;
  }

  // 4. NO ORGANIZATION STATE -> Show No Organization Screen
  if (store.authStatus === 'no_organization') {
    appRoot.innerHTML = renderNoOrganizationScreen();
    setupNoOrganizationHandlers();
    return;
  }

  // 5. AUTHENTICATED SaaS STATE -> Render Full Application Shell Layout
  appRoot.innerHTML = renderAppLayout();
  wireMainAppEvents();
  refreshAllViews();
}

function wireMainAppEvents() {
  setupSidebarNavigation((modId) => {
    if (modId === 'mod-dash') updateDashboard();
    if (modId === 'mod-surveys') renderSurveysTable();
    if (modId === 'mod-touchpoints') renderTouchpointCards();
    if (modId === 'mod-cases') renderCasesTable();
    if (modId === 'mod-responses') renderResponsesInbox();
    if (modId === 'mod-student-evolution') renderStudentEvolutionView();
    if (modId === 'mod-devices') renderDevicesTable();
    if (modId === 'mod-reports') renderReportsSummary();
    if (modId === 'mod-config') {
      renderConfigUnitsTable();
      renderTeamTable();
    }
  });

  setupConfigTabs();
  setupTeamManagement();
  setupSurveyForm();
  setupKioskMode();
  setupAdminDashboard();
  setupResponsesInbox();
  setupSurveyBuilderTabs();
  setupTouchpointsCategoryFilters();
  setupCasesViewSwitcher();
  setupSaaSOnboarding(() => refreshAllViews());
  setupQrCodeGenerator();

  // Attach Logout Button Handler in Header
  document.getElementById('btnHeaderLogout')?.addEventListener('click', async () => {
    await authService.logout();
    renderAuthOrMainShell();
  });
}

export async function refreshAllViews() {
  if (!store.currentUser) return;
  renderOrganizationHeader(() => refreshAllViews());
  updateDashboard();
  renderSurveysTable();
  renderTouchpointCards();
  renderDevicesTable();
  renderCasesTable();
  renderResponsesInbox();
  renderStudentEvolutionView();
  renderReportsSummary();
  renderConfigUnitsTable();
  renderTeamTable();

  // Update Header User Profile and Role Badge
  const nameEl = document.getElementById('headerUserName');
  const roleEl = document.getElementById('headerUserRoleBadge');
  const avatarEl = document.getElementById('userAvatarBadge');

  if (nameEl) nameEl.textContent = store.currentUser?.name || store.currentUser?.email || 'Administrador';
  if (roleEl) roleEl.textContent = (store.getUserRole() || 'VIEWER').toUpperCase();
  if (avatarEl && store.currentUser?.name) {
    avatarEl.textContent = store.currentUser.name.charAt(0).toUpperCase();
  }

  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-app-loaded', 'true');
  }
}

function renderNoOrganizationScreen() {
  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-body, #0d1117); padding: 1.5rem; font-family: var(--font-main, 'Inter', sans-serif);">
      <div style="width: 100%; max-width: 460px; background: rgba(20, 26, 38, 0.85); border: 1px solid rgba(229, 185, 63, 0.25); border-radius: 16px; padding: 2.25rem; text-align: center; color: #ffffff;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🏢</div>
        <h2 style="font-family: var(--font-title, 'Outfit', sans-serif); font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">Nenhuma Organização Vinculada</h2>
        <p style="font-size: 0.85rem; color: #8b949e; line-height: 1.5; margin-bottom: 1.5rem;">
          Sua conta (<strong>${store.currentUser?.email || ''}</strong>) foi autenticada, porém ainda não possui uma organização vinculada.
        </p>

        <!-- Initial Action Buttons -->
        <div id="noOrgInitialActions">
          <button type="button" id="btnCreateCompanyFromNoOrg" style="width: 100%; padding: 0.8rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.9rem; font-weight: 700; cursor: pointer; margin-bottom: 0.75rem;">
            🚀 Criar Minha Empresa Agora
          </button>

          <button type="button" id="btnLogoutFromNoOrg" style="width: 100%; padding: 0.75rem; background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #8b949e; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            🚪 Sair da Conta
          </button>
        </div>

        <!-- Dedicated Form for Authenticated Company Creation -->
        <form id="formCreateOrgAuth" style="display: none; text-align: left; margin-top: 1rem;">
          <div id="noOrgAlertBox" style="display: none; padding: 0.75rem; border-radius: 8px; font-size: 0.82rem; margin-bottom: 1rem;"></div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Nome da Empresa / Organização</label>
            <input type="text" id="inputAuthCompany" required placeholder="Ex: Garden Gold Academia" style="width: 100%; padding: 0.75rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 0.35rem;">Seu Nome (Responsável)</label>
            <input type="text" id="inputAuthFullName" required value="${store.currentUser?.name || ''}" placeholder="Ex: João Pedro" style="width: 100%; padding: 0.75rem 0.9rem; background: rgba(13, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 0.88rem; outline: none;">
          </div>

          <button type="submit" id="btnSubmitCreateOrgAuth" style="width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #e5b93f, #c79a2b); border: none; border-radius: 8px; color: #0d1117; font-size: 0.9rem; font-weight: 700; cursor: pointer; margin-bottom: 0.75rem;">
            Confirmar e Criar Empresa
          </button>

          <button type="button" id="btnCancelCreateOrgAuth" style="width: 100%; padding: 0.65rem; background: transparent; border: none; color: #8b949e; font-size: 0.82rem; cursor: pointer; text-align: center;">
            ← Voltar
          </button>
        </form>

      </div>
    </div>
  `;
}

function setupNoOrganizationHandlers() {
  document.getElementById('btnLogoutFromNoOrg')?.addEventListener('click', async () => {
    await authService.logout();
    renderAuthOrMainShell();
  });

  const btnCreate = document.getElementById('btnCreateCompanyFromNoOrg');
  const initialActions = document.getElementById('noOrgInitialActions');
  const formCreateOrg = document.getElementById('formCreateOrgAuth');
  const btnCancel = document.getElementById('btnCancelCreateOrgAuth');
  const alertBox = document.getElementById('noOrgAlertBox');

  if (btnCreate && formCreateOrg && initialActions) {
    btnCreate.addEventListener('click', () => {
      initialActions.style.display = 'none';
      formCreateOrg.style.display = 'block';
      document.getElementById('inputAuthCompany')?.focus();
    });

    btnCancel?.addEventListener('click', () => {
      formCreateOrg.style.display = 'none';
      initialActions.style.display = 'block';
    });

    formCreateOrg.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (alertBox) alertBox.style.display = 'none';

      const companyName = document.getElementById('inputAuthCompany')?.value.trim();
      const fullName = document.getElementById('inputAuthFullName')?.value.trim();
      const btnSubmit = document.getElementById('btnSubmitCreateOrgAuth');

      if (!companyName) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
          alertBox.style.border = '1px solid rgba(239, 68, 68, 0.35)';
          alertBox.style.color = '#fca5a5';
          alertBox.textContent = 'Por favor, informe o nome da empresa.';
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Criando Empresa...';
      }

      try {
        const res = await authService.createOrganizationForAuthenticatedUser({ companyName, fullName });

        if (!res.success) {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Confirmar e Criar Empresa';
          }
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
            alertBox.style.border = '1px solid rgba(239, 68, 68, 0.35)';
            alertBox.style.color = '#fca5a5';
            alertBox.textContent = res.error;
          }
          showToast(`❌ ${res.error}`, 'error');
          return;
        }

        showToast(`🎉 Empresa "${companyName}" criada com sucesso!`, 'success');
        renderAuthOrMainShell();
      } catch (err) {
        console.error('[CreateOrg] Submit handler error:', err);
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Confirmar e Criar Empresa';
        }
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
          alertBox.style.border = '1px solid rgba(239, 68, 68, 0.35)';
          alertBox.style.color = '#fca5a5';
          alertBox.textContent = 'Erro ao processar criação da empresa. Tente novamente.';
        }
      }
    });
  }
}
