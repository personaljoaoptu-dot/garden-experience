/**
 * Application Router & Navigation Component (V2.0 Production Auth & Route Guards)
 */

import { store } from '../app-state/store.js';

export function setupSidebarNavigation(onNavigateCallback) {
  const brandHome = document.getElementById('brandHomeLink');
  if (brandHome) {
    brandHome.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('[data-mod="mod-dash"]')?.click();
    });
  }

  const sidebarBtns = document.querySelectorAll('#mainSidebarNav .nav-item');
  const modPanes = document.querySelectorAll('.mod-pane');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const breadcrumbCurrent = document.getElementById('headerBreadcrumbCurrent');

  const titlesMap = {
    'mod-dash': 'Dashboard',
    'mod-surveys': 'Pesquisas',
    'mod-touchpoints': 'Pontos de Contato',
    'mod-responses': 'Respostas (Central de Atendimento)',
    'mod-cases': 'Acompanhamentos (Detratores)',
    'mod-student-evolution': 'Evolução da Experiência dos Alunos',
    'mod-reports': 'Relatórios & CSV',
    'mod-devices': 'Dispositivos',
    'mod-config': 'Configurações'
  };

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modId = btn.getAttribute('data-mod');
      if (!modId) return;

      // Public view exception: allow mod-public-survey and mod-kiosk without admin auth
      const isPublicView = modId === 'mod-public-survey' || modId === 'mod-kiosk';

      // Route Guard: verify authentication for private routes
      if (!isPublicView && (!store.currentUser || store.authStatus === 'unauthenticated')) {
        console.warn('[Router Guard] Navigation blocked for unauthenticated user.');
        window.location.href = window.location.origin + window.location.pathname;
        return;
      }

      sidebarBtns.forEach(b => b.classList.remove('active'));
      modPanes.forEach(m => m.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(modId);
      if (pane) pane.classList.add('active');

      if (breadcrumbCurrent && titlesMap[modId]) {
        breadcrumbCurrent.textContent = titlesMap[modId];
      }

      if (typeof onNavigateCallback === 'function') {
        onNavigateCallback(modId);
      }
    });
  });

  // Check URL query ?view= or hash for direct module navigation
  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get('view') || window.location.hash.replace('#', '');
  if (initialView) {
    setTimeout(() => {
      document.querySelector(`[data-mod="${initialView}"]`)?.click();
    }, 100);
  }
}
