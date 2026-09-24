/**
 * SaaS Onboarding Wizard Component
 * Guides new customers step-by-step through organization & unit creation.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';

export function setupSaaSOnboarding(refreshAllViewsCallback) {
  const modal = document.getElementById('modalSaaSOnboarding');
  const btnStart = document.getElementById('btnStartOnboarding');
  if (!modal) return;

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      showOnboardingStep(1);
      modal.style.display = 'flex';
    });
  }

  let currentStep = 1;
  function showOnboardingStep(stepNum) {
    currentStep = stepNum;
    for (let i = 1; i <= 7; i++) {
      const stepDiv = document.getElementById(`onboardingStep${i}`) || document.getElementById(`obStep${i}`);
      const indicator = document.getElementById(`stepInd${i}`);
      if (stepDiv) stepDiv.style.display = i === stepNum ? 'block' : 'none';
      if (indicator) {
        if (i < stepNum) {
          indicator.className = 'ob-step-circle completed';
        } else if (i === stepNum) {
          indicator.className = 'ob-step-circle active';
        } else {
          indicator.className = 'ob-step-circle';
        }
      }
    }

    const btnPrev = document.getElementById('btnObPrev');
    const btnNext = document.getElementById('btnObNext');
    const btnFinish = document.getElementById('btnObFinish');

    if (btnPrev) btnPrev.style.visibility = stepNum === 1 ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.display = stepNum === 7 ? 'none' : 'inline-block';
    if (btnFinish) btnFinish.style.display = stepNum === 7 ? 'inline-block' : 'none';
  }

  const btnNext = document.getElementById('btnObNext');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep === 1) {
        const orgName = document.getElementById('obOrgName')?.value.trim();
        const orgEmail = document.getElementById('obOrgEmail')?.value.trim();
        if (!orgName || !orgEmail) {
          alert('Por favor, informe o Nome da Organização e o E-mail Administrativo.');
          return;
        }
      }
      if (currentStep === 2) {
        const unitName = document.getElementById('obUnitName')?.value.trim();
        if (!unitName) {
          alert('Por favor, informe o Nome da primeira unidade.');
          return;
        }
      }

      if (currentStep < 7) {
        showOnboardingStep(currentStep + 1);
      }
    });
  }

  const btnPrev = document.getElementById('btnObPrev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        showOnboardingStep(currentStep - 1);
      }
    });
  }

  const form = document.getElementById('formSaaSOnboarding');
  const btnFinish = document.getElementById('btnObFinish');

  const completeOnboarding = (e) => {
    if (e) e.preventDefault();

    const orgName = document.getElementById('obOrgName')?.value.trim() || 'Nova Organização';
    const orgEmail = document.getElementById('obOrgEmail')?.value.trim() || 'contato@empresa.com';
    const orgPhone = document.getElementById('obOrgPhone')?.value.trim() || '';
    const unitName = document.getElementById('obUnitName')?.value.trim() || 'Unidade Centro';
    const unitCity = document.getElementById('obUnitCity')?.value.trim() || '';
    const unit2Name = document.getElementById('obUnit2Name')?.value.trim() || '';
    const adminName = document.getElementById('obAdminName')?.value.trim() || 'Administrador';
    const surveyName = document.getElementById('obSurveyName')?.value.trim() || 'Pesquisa de Satisfação NPS';
    const surveyQuestion = document.getElementById('obSurveyQuestion')?.value.trim() || 'De 0 a 10, qual a probabilidade de você recomendar nossa empresa a um amigo?';
    const deviceName = document.getElementById('obDeviceName')?.value.trim() || '';

    const newOrg = store.createOrganization({
      orgName,
      orgEmail,
      orgPhone,
      unitName,
      unitCity,
      unit2Name,
      adminName,
      surveyName,
      surveyQuestion,
      deviceName
    });

    modal.style.display = 'none';
    if (form) form.reset();
    showOnboardingStep(1);

    if (typeof refreshAllViewsCallback === 'function') {
      refreshAllViewsCallback();
    }

    showToast(`🎉 Organização "${newOrg.name}" criada com sucesso!`, 'success', 5000);
  };

  if (form) form.addEventListener('submit', completeOnboarding);
  if (btnFinish) btnFinish.addEventListener('click', completeOnboarding);

  // Technical Tools Switcher
  const btnToggleTech = document.getElementById('btnToggleTechSidebar');
  if (btnToggleTech) {
    btnToggleTech.addEventListener('click', () => {
      store.isTechnicalMode = !store.isTechnicalMode;
      const techFooter = document.getElementById('sidebarFooterTechBlock');
      if (techFooter) {
        techFooter.style.display = store.isTechnicalMode ? 'block' : 'none';
      }
      showToast(store.isTechnicalMode ? '🛠️ Atalhos técnicos exibidos no menu inferior.' : '🔒 Atalhos técnicos ocultos (Modo Cliente Comercial).', 'info');
    });
  }

  const btnTechSurveySim = document.getElementById('btnTechOpenSurveySim');
  if (btnTechSurveySim) {
    btnTechSurveySim.addEventListener('click', () => {
      document.querySelectorAll('.mod-pane').forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-survey')?.classList.add('active');
    });
  }

  const btnTechKiosk = document.getElementById('btnTechOpenKiosk');
  if (btnTechKiosk) {
    btnTechKiosk.addEventListener('click', () => {
      document.querySelectorAll('.mod-pane').forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-kiosk')?.classList.add('active');
    });
  }
}
