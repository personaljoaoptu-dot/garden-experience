/**
 * Survey Builder View Component
 * Renders sections and questions in the survey builder tab.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function setupSurveyBuilderTabs() {
  renderSurveysTable();
}

export function renderSurveysTable() {
  const container = document.getElementById('builderSectionsList');
  if (!container) return;
  container.innerHTML = '';

  store.surveySections.forEach((sec, idx) => {
    const card = document.createElement('div');
    card.className = 'builder-section-card mb-3';

    let questionsHtml = sec.questions.map(q => `
      <div class="question-row-item">
        <span class="q-type-badge ${q.type.includes('NPS') ? 'badge-nps' : 'badge-rating'}">${escapeHtml(q.type)}</span>
        <span class="q-text">${escapeHtml(q.text)}</span>
        <span class="q-req">${escapeHtml(q.req)}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="section-card-header">
        <span class="sec-tag">${escapeHtml(sec.title)}</span>
        <button class="btn-outline-gold btn-sm btn-delete-sec">🗑 Excluir Seção</button>
      </div>
      <div class="section-questions">
        ${questionsHtml}
      </div>
    `;

    card.querySelector('.btn-delete-sec')?.addEventListener('click', () => {
      store.surveySections.splice(idx, 1);
      renderSurveysTable();
    });

    container.appendChild(card);
  });
}
