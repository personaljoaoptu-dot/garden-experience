/**
 * Clean QR Code Generator Modal Component
 * Displays genuine survey links using public ?token= UUIDs from survey_links table.
 */

import QRCode from 'qrcode';
import { store } from '../../app/app-state/store.js';
import { surveyLinksRepository } from '../../surveys/repositories/surveyLinksRepository.js';
import { showToast } from '../../shared/feedback/toast.js';

export function setupQrCodeGenerator() {
  const modal = document.getElementById('modalNewQRCode');
  if (!modal) return;

  const selectUnit = document.getElementById('selectQrUnit');
  const canvas = document.getElementById('qrCanvasElement');
  const titleEl = document.getElementById('qrPreviewUnitTitle');
  const urlEl = document.getElementById('qrResolvedUrl');
  const btnPrint = document.getElementById('btnPrintQrCode');

  // Populate unit select options dynamically
  function populateUnitSelect() {
    if (!selectUnit) return;
    const activeOrg = store.getActiveOrg();
    selectUnit.innerHTML = '';

    if (!activeOrg || !activeOrg.units || activeOrg.units.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhuma unidade cadastrada';
      selectUnit.appendChild(opt);
      return;
    }

    activeOrg.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} (${u.location || u.city || u.code || 'Geral'})`;
      selectUnit.appendChild(opt);
    });
  }

  async function renderQrCode() {
    if (!selectUnit || !canvas) return;
    const unitId = selectUnit.value;
    const activeOrg = store.getActiveOrg();
    if (!activeOrg || !unitId) {
      if (urlEl) urlEl.textContent = 'Selecione uma unidade válida';
      return;
    }

    const unit = (activeOrg.units || []).find(u => u.id === unitId);
    const unitName = unit ? unit.name : 'Unidade';

    // Fetch active survey for organization
    const activeSurvey = (activeOrg.surveys && activeOrg.surveys[0]) || null;
    const surveyId = activeSurvey ? activeSurvey.id : null;

    let linkToken = null;

    if (store.isSupabaseConnected) {
      const link = await surveyLinksRepository.ensureSurveyLinkForUnit(unitId, surveyId);
      if (link && link.token) {
        linkToken = link.token;
      }
    }

    // Safe fallback token if offline
    if (!linkToken) {
      linkToken = unit.code ? `unit-${unit.code}` : 'default';
    }

    const targetUrl = `${window.location.origin}/?token=${linkToken}`;

    if (titleEl) titleEl.textContent = `${activeOrg.name} — ${unitName}`;
    if (urlEl) urlEl.innerHTML = `<a href="${targetUrl}" target="_blank" style="color:var(--gold-primary); text-decoration:underline;">${targetUrl}</a>`;

    QRCode.toCanvas(canvas, targetUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    }, (err) => {
      if (err) console.warn('[QR Code Generation Warning]:', err);
    });
  }

  if (selectUnit) {
    selectUnit.addEventListener('change', renderQrCode);
  }

  if (btnPrint) {
    btnPrint.onclick = () => {
      window.print();
    };
  }

  // Attach click listener for sidebar QR Code trigger button
  const triggerBtn = document.getElementById('btnNavQrModalTrigger');
  if (triggerBtn && !triggerBtn.dataset.qrListenerAttached) {
    triggerBtn.dataset.qrListenerAttached = 'true';
    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openQrModalForUnit();
    });
  }

  // Observe modal display changes to populate and render QR code automatically
  const observer = new MutationObserver(() => {
    if (modal.style.display !== 'none') {
      populateUnitSelect();
      renderQrCode();
    }
  });

  observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
}

export async function openQrModalForUnit(unitId) {
  const modal = document.getElementById('modalNewQRCode');
  const selectUnit = document.getElementById('selectQrUnit');
  if (!modal) return;

  modal.style.display = 'flex';
  if (selectUnit && unitId) {
    selectUnit.value = unitId;
    const changeEvent = new Event('change');
    selectUnit.dispatchEvent(changeEvent);
  }
}
