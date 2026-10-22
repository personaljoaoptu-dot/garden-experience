/**
 * Tablet Kiosk Mode Controller Component
 * Implements kiosk touch interactions with 5s auto-reset and memory form purging.
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { surveyLinksRepository } from '../../surveys/repositories/surveyLinksRepository.js';
import { showToast } from '../../shared/feedback/toast.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

export function setupKioskMode() {
  const scoreBtns = document.querySelectorAll('.kiosk-nps-pill');
  const kioskCommentInput = document.getElementById('inputKioskComment');

  scoreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scoreBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const score = parseInt(btn.getAttribute('data-kiosk-score'), 10);
      store.selectedKioskScore = score;
      if (kioskCommentInput) {
        if (score === 0) {
          kioskCommentInput.required = true;
          kioskCommentInput.placeholder = 'Obrigatório para nota 0: conte-nos o que aconteceu *';
          kioskCommentInput.style.borderColor = 'rgba(239, 68, 68, 0.55)';
        } else {
          kioskCommentInput.required = false;
          kioskCommentInput.placeholder = 'Algum comentário ou elogio? (opcional)';
          kioskCommentInput.style.borderColor = '';
        }
      }
    });
  });

  const form = document.getElementById('formKioskSurvey');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (store.selectedKioskScore === null) {
        showToast('⚠️ Por favor, escolha uma nota de 0 a 10.', 'warning');
        return;
      }

      const unitCode = document.getElementById('selectKioskUnit')?.value || 'unidade-a';
      const student = document.getElementById('inputKioskStudentName')?.value.trim() || 'Tablet Totem';
      const comment = document.getElementById('inputKioskComment')?.value.trim() || '';

      if (Number(store.selectedKioskScore) === 0 && !comment) {
        showToast('⚠️ Para avaliar com nota 0, é obrigatório deixar um comentário explicando o motivo.', 'warning');
        kioskCommentInput?.focus();
        return;
      }

      let effectiveToken = 'kiosk-device-token';
      const activeOrg = store.getActiveOrg();
      if (store.isSupabaseConnected && activeOrg && activeOrg.units && activeOrg.units.length > 0) {
        const matchedUnit = activeOrg.units.find(u => u.code === unitCode || u.id === unitCode) || activeOrg.units[0];
        const activeSurvey = (activeOrg.surveys && activeOrg.surveys[0]) || null;
        if (matchedUnit && matchedUnit.id) {
          const link = await surveyLinksRepository.ensureSurveyLinkForUnit(matchedUnit.id, activeSurvey?.id || null);
          if (link && link.token) {
            effectiveToken = link.token;
          }
        }
      }

      await responsesRepository.submitPublicResponse({
        token: effectiveToken,
        unitCode,
        origin: 'kiosk',
        npsScore: store.selectedKioskScore,
        comment,
        student,
        email: null,
        phone: null,
        consentAccepted: true
      });

      const resId = 'res_' + Date.now();
      const newRes = {
        id: resId,
        unitCode,
        origin: 'kiosk',
        npsScore: store.selectedKioskScore,
        comment,
        student: student || 'Tablet Totem',
        email: null,
        phone: null,
        createdAt: new Date().toISOString()
      };
      store.localResponses.unshift(newRes);

      if (store.selectedKioskScore <= 6) {
        store.followUpCases.unshift({
          id: 'c_' + Date.now(),
          responseId: resId,
          unitCode,
          student: student || 'Tablet Totem',
          npsScore: store.selectedKioskScore,
          comment: comment || 'Avaliação via Totem Tablet',
          status: 'pending',
          priority: 'high',
          assignedUser: 'Não atribuído',
          createdAt: new Date().toISOString()
        });
      }

      // Memory Purging & 5s Auto-Reset UI
      const successOverlay = document.getElementById('kioskSuccessOverlay');
      if (successOverlay) successOverlay.style.display = 'flex';

      form.reset();
      scoreBtns.forEach(b => b.classList.remove('selected'));
      store.selectedKioskScore = null;
      if (kioskCommentInput) {
        kioskCommentInput.required = false;
        kioskCommentInput.placeholder = 'Algum comentário ou elogio? (opcional)';
        kioskCommentInput.style.borderColor = '';
      }

      if (store.kioskTimer) clearTimeout(store.kioskTimer);
      store.kioskTimer = setTimeout(() => {
        if (successOverlay) successOverlay.style.display = 'none';
      }, 5000);

      updateDashboard();
      showToast('✓ Resposta do Totem enviada!', 'success');
    });
  }
}
