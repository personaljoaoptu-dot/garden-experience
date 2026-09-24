/**
 * Theme Manager Engine
 * Controls Light / Dark / System theme modes with persistence.
 */

import { APP_CONFIG } from '../core/config/appConfig.js';
import { showToast } from '../shared/feedback/toast.js';

export function initTheme() {
  const savedMode = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE) || APP_CONFIG.DEFAULT_THEME;
  setThemeMode(savedMode, false);

  // Escutar alteração em Configurações -> Aparência
  document.querySelectorAll('input[name="radioThemeMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      setThemeMode(e.target.value, true);
      const label = e.target.value === 'light' ? 'Modo Claro ☀️' : e.target.value === 'dark' ? 'Modo Escuro 🌙' : 'Seguir Sistema 💻';
      showToast(`✓ Tema alterado para: ${label}`, 'info');
    });
  });

  // Escutar clique no botão rápido do Topbar Header
  const btnQuick = document.getElementById('btnQuickThemeToggle');
  if (btnQuick) {
    btnQuick.addEventListener('click', () => {
      const current = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE) || APP_CONFIG.DEFAULT_THEME;
      const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
      setThemeMode(next, true);
      const label = next === 'light' ? 'Modo Claro ☀️' : next === 'dark' ? 'Modo Escuro 🌙' : 'Seguir Sistema 💻';
      showToast(`✓ Tema alterado para: ${label}`, 'info');
    });
  }

  // Monitorar alteração do SO/Navegador
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const mode = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE) || APP_CONFIG.DEFAULT_THEME;
    if (mode === 'system') {
      applyResolvedTheme(getSystemTheme(), 'system');
    }
  });
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setThemeMode(mode, save = true) {
  if (save) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME_MODE, mode);
  }

  const radio = document.querySelector(`input[name="radioThemeMode"][value="${mode}"]`);
  if (radio) radio.checked = true;

  document.querySelectorAll('.theme-option-card').forEach(c => c.classList.remove('selected'));
  if (mode === 'light') document.getElementById('cardThemeLight')?.classList.add('selected');
  else if (mode === 'dark') document.getElementById('cardThemeDark')?.classList.add('selected');
  else if (mode === 'system') document.getElementById('cardThemeSystem')?.classList.add('selected');

  const resolved = mode === 'system' ? getSystemTheme() : mode;
  applyResolvedTheme(resolved, mode);
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
    if (selectedMode === 'light') {
      iconSpan.textContent = '☀️';
      textSpan.textContent = 'Claro';
    } else if (selectedMode === 'dark') {
      iconSpan.textContent = '🌙';
      textSpan.textContent = 'Escuro';
    } else {
      iconSpan.textContent = '💻';
      textSpan.textContent = 'Sistema (' + (resolvedTheme === 'dark' ? 'Escuro' : 'Claro') + ')';
    }
  }
}
