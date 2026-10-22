/**
 * Survey Builder View Component
 * Renders sections and questions in the survey builder tab.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { surveysRepository } from '../repositories/surveysRepository.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
import { showToast } from '../../shared/feedback/toast.js';

export function setupSurveyBuilderTabs() {
  setupSurveyBuilderForm();
  renderSurveysTable();
}

function setupSurveyBuilderForm() {
  const form = document.getElementById('formSurveyBuilderConfig');
  if (!form || form.dataset.builderListenerAttached) return;
  form.dataset.builderListenerAttached = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeOrg = store.getActiveOrg();
    if (!activeOrg || !activeOrg.id) {
      showToast('⚠️ Nenhuma organização ativa selecionada.', 'warning');
      return;
    }

    const title = document.getElementById('inputBuilderSurveyTitle')?.value.trim();
    const description = document.getElementById('inputBuilderSurveySubtitle')?.value.trim();
    const npsQuestionTitle = document.getElementById('inputBuilderNpsQuestion')?.value.trim();
    const textQuestionTitle = document.getElementById('inputBuilderTextQuestion')?.value.trim();
    const btnSubmit = document.getElementById('btnSaveSurveyBuilder');

    if (!title || !npsQuestionTitle) {
      showToast('⚠️ O título da pesquisa e a pergunta principal de NPS são obrigatórios.', 'warning');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Salvando...';
    }

    try {
      const activeSurvey = (activeOrg.surveys && activeOrg.surveys[0]) || null;

      if (store.isSupabaseConnected) {
        const res = await surveysRepository.saveSurveyWithQuestions({
          surveyId: activeSurvey?.id || null,
          organizationId: activeOrg.id,
          title,
          description,
          npsQuestionTitle,
          textQuestionTitle
        });

        if (!res.success) {
          showToast(`❌ Falha ao salvar pesquisa: ${res.error}`, 'error');
          return;
        }

        await syncStoreWithSupabase();
        renderSurveysTable();
        showToast('✓ Pesquisa e perguntas atualizadas com sucesso no Supabase!', 'success');
      } else {
        if (activeSurvey) {
          activeSurvey.title = title;
          activeSurvey.description = description;
        }
        renderSurveysTable();
        showToast('ℹ️ Alterações aplicadas localmente.', 'info');
      }
    } catch (err) {
      console.error('[setupSurveyBuilderForm error]:', err);
      showToast('❌ Erro inesperado ao salvar pesquisa.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '💾 Salvar Alterações na Pesquisa';
      }
    }
  });
}

export function renderSurveysTable() {
  const activeOrg = store.getActiveOrg();
  const activeSurvey = (activeOrg?.surveys && activeOrg.surveys[0]) || null;
  const questions = activeOrg?.questions || [];
  const npsQ = questions.find(q => q.question_type === 'nps');
  const textQ = questions.find(q => q.question_type === 'text');

  const titleInput = document.getElementById('inputBuilderSurveyTitle');
  const subtitleInput = document.getElementById('inputBuilderSurveySubtitle');
  const npsInput = document.getElementById('inputBuilderNpsQuestion');
  const textInput = document.getElementById('inputBuilderTextQuestion');

  if (titleInput) titleInput.value = activeSurvey?.title || 'Pesquisa de Satisfação NPS';
  if (subtitleInput) subtitleInput.value = activeSurvey?.description || 'Sua opinião é fundamental para evoluirmos nossos serviços!';
  if (npsInput) npsInput.value = npsQ?.title || 'De 0 a 10, qual a probabilidade de você nos recomendar a um amigo?';
  if (textInput) textInput.value = textQ?.title || 'O que motivou sua nota? Deixe seu elogio, crítica ou sugestão.';

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
      </div>
      <div class="section-questions">
        ${questionsHtml}
      </div>
    `;

    container.appendChild(card);
  });
}
