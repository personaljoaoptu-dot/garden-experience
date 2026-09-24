/**
 * Master Application Shell Layout Renderer
 */

import { renderSidebar } from './Sidebar.js';
import { renderHeader } from './Header.js';
import { renderDashboardPage } from '../../dashboard/pages/DashboardPage.js';
import { renderResponsesPage } from '../../responses/pages/ResponsesPage.js';
import { renderCasesPage } from '../../followups/pages/CasesPage.js';
import { renderReportsPage } from '../../reports/pages/ReportsPage.js';
import { renderSurveysPage } from '../../surveys/pages/SurveysPage.js';
import { renderTouchpointsPage } from '../../touchpoints/pages/TouchpointsPage.js';
import { renderDevicesPage } from '../../devices/pages/DevicesPage.js';
import { renderSettingsPage } from '../../settings/pages/SettingsPage.js';
import { renderPublicSurveyPage } from '../../surveys/pages/PublicSurveyPage.js';
import { renderKioskPage } from '../../devices/pages/KioskPage.js';
import { renderAllModals } from '../modals/AllModals.js';

export function renderAppLayout() {
  return `
    <div class="app-container">
      ${renderSidebar()}
      
      <div class="app-main-wrapper">
        ${renderHeader()}

        <main class="app-content" id="mainAppContent">
          ${renderDashboardPage()}
          ${renderResponsesPage()}
          ${renderCasesPage()}
          ${renderReportsPage()}
          ${renderSurveysPage()}
          ${renderTouchpointsPage()}
          ${renderDevicesPage()}
          ${renderSettingsPage()}
          ${renderPublicSurveyPage()}
          ${renderKioskPage()}
        </main>
      </div>
    </div>
    
    <div id="allModalsContainer">
      ${renderAllModals()}
    </div>
  `;
}
