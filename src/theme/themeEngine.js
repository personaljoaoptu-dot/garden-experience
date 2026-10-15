/**
 * Theme Manager Engine
 * Controls Light / Dark / System theme modes with persistence.
 */

import { APP_CONFIG } from '../core/config/appConfig.js';
import { showToast } from '../shared/feedback/toast.js';

export function initTheme() {
  const savedMode =
    localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE) ||
    localStorage.getItem('app-theme-mode') ||
    APP_CONFIG.DEFAULT_THEME;
  setThemeMode(savedMode, false);

  // Escutar alteração em Configurações -> Aparência
  document.querySelectorAll('input[name="radioThemeMode"]').forEach(radio => {
    if (radio.dataset.themeListenerAttached) return;
    radio.dataset.themeListenerAttached = 'true';
    radio.addEventListener('change', (e) => {
      setThemeMode(e.target.value, true);
      const label = e.target.value === 'light' ? 'Modo Claro ☀️' : e.target.value === 'dark' ? 'Modo Escuro 🌙' : 'Seguir Sistema 💻';
      showToast(`✓ Tema alterado para: ${label}`, 'info');
    });
  });

  // Escutar clique no botão rápido do Topbar Header (Alterna direto entre Claro e Escuro em 1 clique)
  const btnQuick = document.getElementById('btnQuickThemeToggle');
  if (btnQuick && !btnQuick.dataset.themeListenerAttached) {
    btnQuick.dataset.themeListenerAttached = 'true';
    btnQuick.addEventListener('click', () => {
      const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
      const next = isCurrentlyLight ? 'dark' : 'light';
      setThemeMode(next, true);
      const label = next === 'light' ? 'Modo Claro ☀️' : 'Modo Escuro 🌙';
      showToast(`✓ Tema alterado para: ${label}`, 'info');
    });
  }

  // Monitorar alteração do SO/Navegador (apenas uma vez por sessão)
  if (typeof window !== 'undefined' && window.matchMedia && !window.__gardenThemeMediaBound) {
    window.__gardenThemeMediaBound = true;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const mode = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE) || APP_CONFIG.DEFAULT_THEME;
      if (mode === 'system') {
        applyResolvedTheme(getSystemTheme(), 'system');
      }
    });
  }
}

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function setThemeMode(mode, save = true) {
  const validMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'dark';
  if (save) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE, validMode);
    localStorage.setItem('app-theme-mode', validMode);
  }

  document.querySelectorAll('input[name="radioThemeMode"]').forEach(r => {
    r.checked = (r.value === validMode);
  });

  document.querySelectorAll('.theme-option-card').forEach(c => c.classList.remove('selected'));
  if (validMode === 'light') document.getElementById('cardThemeLight')?.classList.add('selected');
  else if (validMode === 'dark') document.getElementById('cardThemeDark')?.classList.add('selected');
  else if (validMode === 'system') document.getElementById('cardThemeSystem')?.classList.add('selected');

  const resolved = validMode === 'system' ? getSystemTheme() : validMode;
  applyResolvedTheme(resolved, validMode);
}

function applyResolvedTheme(resolvedTheme, selectedMode = 'system') {
  if (resolvedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const iconSpan = document.getElementById('quickThemeIcon');
  const textSpan = document.getElementById('quickThemeText');
  if (iconSpan && textSpan) {
    if (resolvedTheme === 'light') {
      iconSpan.textContent = '☀️';
      textSpan.textContent = selectedMode === 'system' ? 'Sistema (Claro)' : 'Claro';
    } else {
      iconSpan.textContent = '🌙';
      textSpan.textContent = selectedMode === 'system' ? 'Sistema (Escuro)' : 'Escuro';
    }
  }
}
