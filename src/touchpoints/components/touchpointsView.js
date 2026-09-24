/**
 * Touchpoints View Component
 * Renders touchpoint cards and category filters.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function setupTouchpointsCategoryFilters() {
  const filterBtns = document.querySelectorAll('[data-tp-category]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      store.touchpointCategoryFilter = btn.getAttribute('data-tp-category');
      renderTouchpointCards();
    });
  });
}

export function renderTouchpointCards() {
  const container = document.getElementById('touchpointsCardsGrid');
  if (!container) return;
  container.innerHTML = '';

  let tps = store.touchpoints;
  if (store.touchpointCategoryFilter !== 'all') {
    tps = tps.filter(t => t.category === store.touchpointCategoryFilter);
  }

  tps.forEach(tp => {
    const card = document.createElement('div');
    card.className = 'glass-card touchpoint-card mb-3';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-title);">${escapeHtml(tp.name)}</h3>
          <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(tp.category)} • ${escapeHtml(tp.units)}</div>
        </div>
        <span class="badge-status ${tp.isActive ? 'resolved' : 'pending'}">${tp.isActive ? '🟢 Ativo' : '⚪ Inativo'}</span>
      </div>
      <div style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; color:var(--text-muted);">${tp.statusLabel}</span>
        <button class="btn-outline-gold btn-sm btn-toggle-tp-card">${tp.isActive ? 'Desativar' : 'Ativar'}</button>
      </div>
    `;

    card.querySelector('.btn-toggle-tp-card')?.addEventListener('click', () => {
      tp.isActive = !tp.isActive;
      renderTouchpointCards();
    });

    container.appendChild(card);
  });
}
