/**
 * Tablet Kiosk Mode Controller Component
 * Implements kiosk touch interactions with 5s auto-reset and memory form purging.
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { showToast } from '../../shared/feedback/toast.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

export function setupKioskMode() {
  const scoreBtns = document.querySelectorAll('.kiosk-nps-pill');
  scoreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scoreBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      store.selectedKioskScore = parseInt(btn.getAttribute('data-kiosk-score'), 10);
    });
  });

  const form = document.getElementById('formKioskSurvey');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (store.selectedKioskScore === null) {
        alert('Por favor, escolha uma nota de 0 a 10.');
        return;
      }

      const unitCode = document.getElementById('selectKioskUnit')?.value || 'unidade-a';
      const student = document.getElementById('inputKioskStudentName')?.value.trim() || 'Tablet Totem';
      const comment = document.getElementById('inputKioskComment')?.value.trim() || '';

      await responsesRepository.submitPublicResponse({
        token: 'kiosk-device-token',
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

      if (store.kioskTimer) clearTimeout(store.kioskTimer);
      store.kioskTimer = setTimeout(() => {
        if (successOverlay) successOverlay.style.display = 'none';
      }, 5000);

      updateDashboard();
      showToast('✓ Resposta do Totem enviada!', 'success');
    });
  }
}
