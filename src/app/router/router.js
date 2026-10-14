/**
 * Application Router & Navigation Component (V2.0 Production Auth & Route Guards)
 * Persists active module across tab switches and page reloads.
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

      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('garden_active_mod', modId);
        }
      } catch (_) {}

      if (typeof onNavigateCallback === 'function') {
        onNavigateCallback(modId);
      }
    });
  });

  // Restore active module from URL ?view=, hash, or sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  let savedMod = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      savedMod = sessionStorage.getItem('garden_active_mod');
    }
  } catch (_) {}

  const initialView = urlParams.get('view') || window.location.hash.replace('#', '') || savedMod;
  if (initialView && initialView !== 'mod-dash') {
    const targetBtn = document.querySelector(`#mainSidebarNav .nav-item[data-mod="${initialView}"]`);
    if (targetBtn) {
      targetBtn.click();
    }
  }
}
