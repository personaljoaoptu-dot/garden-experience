/**
 * Public Survey Student Simulator Component
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
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
      const tokenInfo = activeOrg?.tokensMap ? activeOrg.tokensMap[token] : null;
      const unitCode = tokenInfo ? tokenInfo.unitCode : (activeOrg?.units?.find(u => u.is_active || u.status === 'Ativa')?.code || null);

      const submitted = await responsesRepository.submitPublicResponse({
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

      if (submitted) {
        await syncStoreWithSupabase();
      }

      form.reset();
      scoreBtns.forEach(b => b.classList.remove('selected'));
      store.selectedSurveyScore = null;

      updateDashboard();
      showToast('🎉 Avaliação enviada com sucesso! Obrigado pelo seu feedback.', 'success', 5000);
    });
  }
}
