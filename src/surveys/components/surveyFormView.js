/**
 * Public Survey Student Simulator & Public Route Handler Component
 * Handles token validation from survey_links, public form submission via submit_survey_response RPC,
 * and Thank You screen ("Obrigado!").
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { surveyLinksRepository } from '../repositories/surveyLinksRepository.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
import { showToast } from '../../shared/feedback/toast.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

let activeTokenData = null;

export async function setupSurveyForm() {
  const loadingCard = document.getElementById('surveyLoadingCard');
  const errorCard = document.getElementById('surveyErrorCard');
  const formCard = document.getElementById('surveyFormCard');
  const thankYouCard = document.getElementById('surveyThankYouCard');
  const tokenGroup = document.getElementById('surveyTokenSelectGroup');
  const orgTitle = document.getElementById('surveyOrgTitle');
  const unitTitle = document.getElementById('surveyUnitName');

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');

  // Reset cards visibility
  if (loadingCard) loadingCard.style.display = 'none';
  if (errorCard) errorCard.style.display = 'none';
  if (thankYouCard) thankYouCard.style.display = 'none';
  if (formCard) formCard.style.display = 'block';

  // 1. If URL has ?token=, validate against survey_links table
  if (tokenFromUrl) {
    if (loadingCard) loadingCard.style.display = 'block';
    if (formCard) formCard.style.display = 'none';

    try {
      activeTokenData = await surveyLinksRepository.getSurveyLinkByToken(tokenFromUrl);

      if (loadingCard) loadingCard.style.display = 'none';

      if (!activeTokenData || activeTokenData.is_active === false) {
        if (errorCard) errorCard.style.display = 'block';
        return;
      }

      // Valid token found! Render active unit & org info
      if (formCard) formCard.style.display = 'block';
      if (tokenGroup) tokenGroup.style.display = 'none';

      const unitObj = activeTokenData.units;
      const surveyObj = activeTokenData.surveys;

      if (orgTitle) orgTitle.textContent = unitObj?.organization_id ? 'GARDEN EXPERIENCE' : 'GARDEN EXPERIENCE';
      if (unitTitle) unitTitle.textContent = unitObj?.name ? `${unitObj.name}` : (surveyObj?.title || 'Pesquisa de Satisfação');

    } catch (err) {
      console.error('[setupSurveyForm token validation error]:', err);
      if (loadingCard) loadingCard.style.display = 'none';
      if (errorCard) errorCard.style.display = 'block';
      return;
    }
  } else {
    // Simulator mode inside admin dashboard
    if (tokenGroup) tokenGroup.style.display = 'block';
  }

  // 2. NPS score pills selection (0 to 10)
  const scoreBtns = document.querySelectorAll('.nps-score-pill');
  scoreBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      scoreBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      store.selectedSurveyScore = parseInt(btn.getAttribute('data-score'), 10);
    };
  });

  // 3. Form Submit Handler
  const form = document.getElementById('formPublicSurvey');
  if (form && !form.dataset.publicListenerAttached) {
    form.dataset.publicListenerAttached = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (store.selectedSurveyScore === null || store.selectedSurveyScore === undefined) {
        showToast('⚠️ Por favor, selecione uma nota de 0 a 10 para o NPS.', 'warning');
        return;
      }

      const tokenSelect = document.getElementById('selectTokenSim');
      const effectiveToken = tokenFromUrl || (tokenSelect ? tokenSelect.value : null);
      const student = document.getElementById('inputStudentName')?.value.trim() || 'Anônimo';
      const email = document.getElementById('inputStudentEmail')?.value.trim() || '';
      const phone = document.getElementById('inputStudentPhone')?.value.trim() || '';
      const comment = document.getElementById('inputStudentComment')?.value.trim() || '';

      const activeOrg = store.getActiveOrg();
      const tokenInfo = activeTokenData ? { unitCode: activeTokenData.units?.code } : (activeOrg?.tokensMap ? activeOrg.tokensMap[effectiveToken] : null);
      const unitCode = tokenInfo ? tokenInfo.unitCode : (activeOrg?.units?.find(u => u.is_active || u.status === 'Ativa')?.code || null);

      const btnSubmit = document.getElementById('btnSubmitPublicSurvey');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando resposta...';
      }

      try {
        const res = await responsesRepository.submitPublicResponse({
          token: effectiveToken,
          unitCode,
          origin: 'qr_web',
          npsScore: store.selectedSurveyScore,
          comment,
          student,
          email,
          phone,
          consentAccepted: true
        });

        if (res && res.success === false) {
          const errMsg = res.error || 'Falha ao registrar resposta.';
          showToast(`❌ ${errMsg}`, 'error');
          return;
        }

        // Hide form and display Thank You Card ("Obrigado!")
        if (formCard) formCard.style.display = 'none';
        if (thankYouCard) thankYouCard.style.display = 'block';

        if (store.isSupabaseConnected && store.currentUser) {
          await syncStoreWithSupabase();
          updateDashboard();
        }

        showToast('🎉 Avaliação registrada com sucesso! Obrigado pelo seu feedback.', 'success');
      } catch (err) {
        console.error('[setupSurveyForm submit error]:', err);
        showToast('❌ Erro inesperado ao enviar resposta.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Enviar Avaliação';
        }
      }
    });
  }

  // 4. Thank You Card Reset Button
  const btnReset = document.getElementById('btnResetPublicSurvey');
  if (btnReset) {
    btnReset.onclick = () => {
      form?.reset();
      scoreBtns.forEach(b => b.classList.remove('selected'));
      store.selectedSurveyScore = null;
      if (thankYouCard) thankYouCard.style.display = 'none';
      if (formCard) formCard.style.display = 'block';
    };
  }
}
