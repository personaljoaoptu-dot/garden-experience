/**
 * Public Survey Student Simulator Component
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { showToast } from '../../shared/feedback/toast.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

export function setupSurveyForm() {
  const scoreBtns = document.querySelectorAll('.nps-score-pill');
  scoreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scoreBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      store.selectedSurveyScore = parseInt(btn.getAttribute('data-score'), 10);
    });
  });

  const form = document.getElementById('formPublicSurvey');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (store.selectedSurveyScore === null) {
        alert('Por favor, selecione uma nota de 0 a 10 para o NPS.');
        return;
      }

      const tokenSelect = document.getElementById('selectTokenSim');
      const token = tokenSelect ? tokenSelect.value : 'generic';
      const student = document.getElementById('inputStudentName')?.value.trim() || 'Anônimo';
      const email = document.getElementById('inputStudentEmail')?.value.trim() || '';
      const phone = document.getElementById('inputStudentPhone')?.value.trim() || '';
      const comment = document.getElementById('inputStudentComment')?.value.trim() || '';

      const activeOrg = store.getActiveOrg();
      const tokenInfo = activeOrg.tokensMap[token];
      const unitCode = tokenInfo ? tokenInfo.unitCode : (activeOrg.units[0]?.code || 'unidade-a');

      await responsesRepository.submitPublicResponse({
        token,
        unitCode,
        origin: 'qr_web',
        npsScore: store.selectedSurveyScore,
        comment,
        student,
        email,
        phone,
        consentAccepted: true
      });

      const resId = 'res_' + Date.now();
      const newRes = {
        id: resId,
        unitCode,
        origin: 'qr_web',
        npsScore: store.selectedSurveyScore,
        comment,
        student: student || 'Anônimo',
        email: email || null,
        phone: phone || null,
        createdAt: new Date().toISOString()
      };
      store.localResponses.unshift(newRes);

      if (store.selectedSurveyScore <= 6) {
        store.followUpCases.unshift({
          id: 'c_' + Date.now(),
          responseId: resId,
          unitCode,
          student: student || 'Anônimo',
          npsScore: store.selectedSurveyScore,
          comment: comment || 'Sem comentário preenchido',
          status: 'pending',
          priority: 'high',
          assignedUser: 'Não atribuído',
          internalNotes: 'Caso criado automaticamente via envio de NPS ≤ 6.',
          createdAt: new Date().toISOString()
        });
      }

      form.reset();
      scoreBtns.forEach(b => b.classList.remove('selected'));
      store.selectedSurveyScore = null;

      updateDashboard();
      showToast('🎉 Avaliação enviada com sucesso! Obrigado pelo seu feedback.', 'success', 5000);
    });
  }
}
