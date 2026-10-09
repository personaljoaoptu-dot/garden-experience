/**
 * Public Survey Student Simulator & Public Route Handler Component
 * Handles token validation from survey_links, public form submission via submit_survey_response RPC,
 * and Thank You screen ("Obrigado!").
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { surveyLinksRepository } from '../repositories/surveyLinksRepository.js';
import { touchpointsRepository } from '../../touchpoints/repositories/touchpointsRepository.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
import { showToast } from '../../shared/feedback/toast.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

let activeTokenData = null;
let selectedTouchpointRatings = {};

export async function setupSurveyForm() {
  const modPublicSurvey = document.getElementById('mod-public-survey');
  const loadingCard = document.getElementById('surveyLoadingCard');
  const errorCard = document.getElementById('surveyErrorCard');
  const formCard = document.getElementById('surveyFormCard');
  const thankYouCard = document.getElementById('surveyThankYouCard');
  const tokenGroup = document.getElementById('surveyTokenSelectGroup');
  const orgTitle = document.getElementById('surveyOrgTitle');
  const unitTitle = document.getElementById('surveyUnitName');

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const viewParam = urlParams.get('view') || window.location.hash.replace('#', '');
  const isPublicRoute = viewParam === 'public_survey' || !!tokenFromUrl;

  // Reset cards visibility
  if (loadingCard) loadingCard.style.display = 'none';
  if (errorCard) errorCard.style.display = 'none';
  if (thankYouCard) thankYouCard.style.display = 'none';
  if (formCard) formCard.style.display = 'block';

  // Activate public survey module pane if in public route mode
  if (isPublicRoute && modPublicSurvey) {
    modPublicSurvey.classList.add('active');
  }

  // 1. Validate mandatory ?token= parameter from URL
  if (!tokenFromUrl || !tokenFromUrl.trim()) {
    if (loadingCard) loadingCard.style.display = 'none';
    if (formCard) formCard.style.display = 'none';
    if (errorCard) {
      errorCard.style.display = 'block';
      const errMsgEl = document.getElementById('surveyErrorMessage');
      if (errMsgEl) errMsgEl.textContent = 'Token da pesquisa é obrigatório para acessar a avaliação pública.';
    }
    return;
  }

  if (loadingCard) loadingCard.style.display = 'block';
  if (formCard) formCard.style.display = 'none';

  try {
    activeTokenData = await surveyLinksRepository.getSurveyLinkByToken(tokenFromUrl.trim());

    if (loadingCard) loadingCard.style.display = 'none';

    if (!activeTokenData || activeTokenData.is_active === false) {
      if (errorCard) {
        errorCard.style.display = 'block';
        const errMsgEl = document.getElementById('surveyErrorMessage');
        if (errMsgEl) errMsgEl.textContent = 'Este link ou QR Code de pesquisa não é mais válido, está inativo ou expirou.';
      }
      return;
    }

    // Valid token! Render active unit & org info
    if (formCard) formCard.style.display = 'block';
    if (tokenGroup) tokenGroup.style.display = 'none';

    const unitObj = activeTokenData.units;
    const surveyObj = activeTokenData.surveys;

    if (orgTitle) orgTitle.textContent = 'GARDEN EXPERIENCE';
    if (unitTitle) unitTitle.textContent = unitObj?.name ? `${unitObj.name}` : (surveyObj?.title || 'Pesquisa de Satisfação');

    // Fetch and render touchpoints for unit/organization
    const touchpoints = await touchpointsRepository.fetchTouchpointsForUnit(activeTokenData.unit_id, unitObj?.organization_id);
    const tpContainer = document.getElementById('surveyTouchpointsContainer');
    const tpList = document.getElementById('surveyTouchpointsList');
    selectedTouchpointRatings = {};

    if (tpContainer && tpList) {
      if (touchpoints && touchpoints.length > 0) {
        tpList.innerHTML = '';
        touchpoints.forEach(tp => {
          const itemDiv = document.createElement('div');
          itemDiv.style.cssText = 'background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:0.85rem;';
          itemDiv.innerHTML = `
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-title); margin-bottom:0.25rem;">${tp.name}</div>
            ${tp.description ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${tp.description}</div>` : ''}
            <div style="display:flex; gap:0.4rem; justify-content:space-between;">
              ${[1,2,3,4,5].map(star => `<button type="button" class="tp-rating-pill" data-tp-id="${tp.id}" data-rating="${star}" style="flex:1; padding:0.4rem 0; font-size:0.8rem; font-weight:700; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); color:var(--text-title); border-radius:6px; cursor:pointer;">${star} ⭐</button>`).join('')}
            </div>
          `;
          tpList.appendChild(itemDiv);
        });

        // Attach event listeners for touchpoint rating pills
        const tpBtns = tpList.querySelectorAll('.tp-rating-pill');
        tpBtns.forEach(btn => {
          btn.onclick = (e) => {
            e.preventDefault();
            const tpId = btn.getAttribute('data-tp-id');
            const rating = parseInt(btn.getAttribute('data-rating'), 10);
            tpList.querySelectorAll(`.tp-rating-pill[data-tp-id="${tpId}"]`).forEach(b => {
              b.style.background = 'rgba(255,255,255,0.05)';
              b.style.color = 'var(--text-title)';
              b.style.borderColor = 'var(--border-subtle)';
            });
            btn.style.background = 'linear-gradient(135deg, var(--gold-primary), #c79a2b)';
            btn.style.color = '#0d1117';
            btn.style.borderColor = 'var(--gold-primary)';
            selectedTouchpointRatings[tpId] = rating;
          };
        });

        tpContainer.style.display = 'block';
      } else {
        tpContainer.style.display = 'none';
      }
    }

  } catch (err) {
    console.error('[setupSurveyForm token validation error]:', err);
    if (loadingCard) loadingCard.style.display = 'none';
    if (errorCard) errorCard.style.display = 'block';
    return;
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
          touchpointRatings: selectedTouchpointRatings,
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
      selectedTouchpointRatings = {};
      const tpBtns = document.querySelectorAll('.tp-rating-pill');
      tpBtns.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.05)';
        b.style.color = 'var(--text-title)';
        b.style.borderColor = 'var(--border-subtle)';
      });
      if (thankYouCard) thankYouCard.style.display = 'none';
      if (formCard) formCard.style.display = 'block';
    };
  }
}
