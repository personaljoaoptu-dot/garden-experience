/**
 * Application Bootstrap Entry Module
 * Renders the master AppLayout DOM structure and wires up event handlers.
 */

import { renderAppLayout } from '../../shared/layout/AppLayout.js';
import { initTheme } from '../../theme/themeEngine.js';
import { setupSidebarNavigation } from '../router/router.js';
import { renderOrganizationHeader } from '../../organizations/components/organizationHeader.js';
import { setupSaaSOnboarding } from '../../organizations/components/onboardingModal.js';
import { setupAuthManager } from '../../auth/components/authModal.js';
import { setupAdminDashboard, updateDashboard } from '../../dashboard/components/dashboardView.js';
import { setupResponsesInbox, renderResponsesInbox } from '../../responses/components/responsesInboxView.js';
import { setupCasesViewSwitcher, renderCasesTable } from '../../followups/components/casesView.js';
import { setupSurveyForm } from '../../surveys/components/surveyFormView.js';
import { setupKioskMode } from '../../devices/components/kioskView.js';
import { setupTouchpointsCategoryFilters, renderTouchpointCards } from '../../touchpoints/components/touchpointsView.js';
import { setupSurveyBuilderTabs, renderSurveysTable } from '../../surveys/components/surveyBuilderView.js';
import { renderDevicesTable } from '../../devices/components/devicesView.js';
import { renderReportsSummary } from '../../reports/components/reportsView.js';
import { setupConfigTabs, renderConfigUnitsTable, renderConfigUsersTable } from '../../settings/components/settingsView.js';
import { setupQrCodeGenerator } from '../../qr/components/qrModal.js';

export function bootstrapApp() {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Render App Layout into Root Container
    const appRoot = document.getElementById('app');
    if (appRoot) {
      appRoot.innerHTML = renderAppLayout();
    }

    // 2. Initialize Theme Engine
    initTheme();

    // 3. Setup Router & View Navigation
    setupSidebarNavigation((modId) => {
      if (modId === 'mod-dash') updateDashboard();
      if (modId === 'mod-surveys') renderSurveysTable();
      if (modId === 'mod-touchpoints') renderTouchpointCards();
      if (modId === 'mod-cases') renderCasesTable();
      if (modId === 'mod-responses') renderResponsesInbox();
      if (modId === 'mod-devices') renderDevicesTable();
      if (modId === 'mod-reports') renderReportsSummary();
    });

    // 4. Setup Feature Modules & Event Listeners
    setupConfigTabs();
    setupSurveyForm();
    setupKioskMode();
    setupAdminDashboard();
    setupResponsesInbox();
    setupSurveyBuilderTabs();
    setupTouchpointsCategoryFilters();
    setupCasesViewSwitcher();
    setupSaaSOnboarding(() => refreshAllViews());
    setupAuthManager(() => refreshAllViews());
    setupQrCodeGenerator();

    // 5. Initial View Render
    refreshAllViews();
  });
}

export function refreshAllViews() {
  renderOrganizationHeader(() => refreshAllViews());
  updateDashboard();
  renderSurveysTable();
  renderTouchpointCards();
  renderDevicesTable();
  renderCasesTable();
  renderResponsesInbox();
  renderConfigUnitsTable();
  renderConfigUsersTable();
}
