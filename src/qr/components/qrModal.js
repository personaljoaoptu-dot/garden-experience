/**
 * Clean QR Code Generator Modal Component
 */

import QRCode from 'qrcode';
import { store } from '../../app/app-state/store.js';

export function setupQrCodeGenerator() {
  const modal = document.getElementById('modalNewQRCode');
  if (!modal) return;

  const selectUnit = document.getElementById('selectQrUnit');
  const canvas = document.getElementById('qrCanvasElement');
  const titleEl = document.getElementById('qrPreviewUnitTitle');
  const urlEl = document.getElementById('qrResolvedUrl');
  const btnPrint = document.getElementById('btnPrintQrCode');

  function renderQrCode() {
    if (!selectUnit || !canvas) return;
    const unitCode = selectUnit.value;
    const activeOrg = store.getActiveOrg();
    const u = activeOrg.units.find(item => item.code === unitCode) || activeOrg.units[0];
    const unitName = u ? u.name : 'Unidade';
    const targetUrl = `${window.location.origin}/p/${unitCode}`;

    if (titleEl) titleEl.textContent = `${activeOrg.name} — ${unitName}`;
    if (urlEl) urlEl.textContent = targetUrl;

    QRCode.toCanvas(canvas, targetUrl, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, (err) => {
      if (err) console.warn('[QR Code Generation Warning]:', err);
    });
  }

  if (selectUnit) {
    selectUnit.addEventListener('change', renderQrCode);
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
}
