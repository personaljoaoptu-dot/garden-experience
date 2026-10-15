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
  const btnDownloadPng = document.getElementById('btnDownloadQrPng');
  let currentResolvedUrl = '';
  let currentUnitName = 'Unidade';

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
    currentUnitName = unitName;

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
    currentResolvedUrl = targetUrl;

    if (titleEl) titleEl.textContent = `${activeOrg.name} — ${unitName}`;
    if (urlEl) urlEl.innerHTML = `<a href="${targetUrl}" target="_blank" style="color:var(--gold-primary); text-decoration:underline;">${targetUrl}</a>`;

    QRCode.toCanvas(canvas, targetUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    }, (err) => {
      if (err) console.warn('[QR Code Generation Warning]:', err);
    });
  }

  if (selectUnit) {
    selectUnit.addEventListener('change', renderQrCode);
  }

  if (btnDownloadPng) {
    btnDownloadPng.onclick = () => {
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeName = currentUnitName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.download = `qrcode_${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('📥 Imagem PNG do QR Code baixada com sucesso!', 'success');
    };
  }

  if (btnPrint) {
    btnPrint.onclick = () => {
      if (!canvas) return;
      const activeOrg = store.getActiveOrg();
      const orgName = activeOrg ? (activeOrg.tradeName || activeOrg.name) : 'Garden Gold Academia';
      const logoSrc = activeOrg?.logoUrl || `${window.location.origin}/logo-garden-gold.jpg`;
      const resolvedLogoSrc = logoSrc.startsWith('/') ? `${window.location.origin}${logoSrc}` : logoSrc;
      const qrDataUrl = canvas.toDataURL('image/png');
      const activeSurvey = (activeOrg?.surveys && activeOrg.surveys[0]) || null;
      const surveyTitle = activeSurvey?.title || 'Pesquisa de Satisfação';

      const printWin = window.open('', '_blank', 'width=850,height=1100');
      if (!printWin) {
        window.print();
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Cartaz QR Code — ${orgName} (${currentUnitName})</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body {
              font-family: 'Segoe UI', 'Inter', Arial, sans-serif;
              background: #ffffff;
              color: #0d1117;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 0.5rem;
            }
            .poster-frame {
              width: 100%;
              max-width: 680px;
              border: 4px solid #c79a2b;
              border-radius: 28px;
              overflow: hidden;
              text-align: center;
              background: #ffffff;
              box-shadow: 0 12px 32px rgba(0,0,0,0.10);
            }
            .poster-header {
              background: linear-gradient(135deg, #0b110e 0%, #142218 100%);
              padding: 2rem 2rem 1.75rem 2rem;
              border-bottom: 4px solid #d4af37;
              color: #ffffff;
            }
            .logo-box {
              width: 118px;
              height: 118px;
              margin: 0 auto 1rem auto;
              border-radius: 22px;
              border: 3px solid #e5b93f;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px;
              box-shadow: 0 6px 20px rgba(0,0,0,0.28);
            }
            .logo-box img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .org-badge {
              display: inline-block;
              background: rgba(229, 185, 63, 0.16);
              border: 1px solid #e5b93f;
              color: #e5b93f;
              font-weight: 800;
              font-size: 0.82rem;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              padding: 0.35rem 1.1rem;
              border-radius: 999px;
              margin-bottom: 0.65rem;
            }
            h1 {
              font-size: 2rem;
              font-weight: 900;
              color: #ffffff;
              line-height: 1.15;
              margin-bottom: 0.35rem;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .gold-accent {
              color: #e5b93f;
            }
            .unit-subtitle {
              font-size: 1.05rem;
              font-weight: 700;
              color: #d1d5db;
              margin-top: 0.25rem;
            }
            .poster-body {
              padding: 2rem 2.25rem 1.75rem 2.25rem;
              background: linear-gradient(180deg, #ffffff 0%, #fdfbf5 100%);
            }
            .stars-row {
              font-size: 1.35rem;
              letter-spacing: 0.2rem;
              margin-bottom: 0.45rem;
            }
            .cta-lead {
              font-size: 1rem;
              font-weight: 600;
              color: #374151;
              max-width: 480px;
              margin: 0 auto 1.35rem auto;
              line-height: 1.45;
            }
            .qr-wrapper {
              display: inline-block;
              background: #ffffff;
              border: 4px solid #0d1117;
              outline: 3px solid #e5b93f;
              border-radius: 24px;
              padding: 1.15rem;
              margin-bottom: 1.65rem;
              box-shadow: 0 8px 24px rgba(0,0,0,0.08);
            }
            .qr-wrapper img {
              width: 265px;
              height: 265px;
              display: block;
            }
            .steps-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 0.9rem;
              margin: 0 auto 1.5rem auto;
              text-align: center;
            }
            .step-card {
              background: #f8f5eb;
              border: 1.5px solid #e6d5a7;
              border-radius: 14px;
              padding: 0.85rem 0.65rem;
            }
            .step-num {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: #0d1117;
              color: #e5b93f;
              font-weight: 800;
              font-size: 0.88rem;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 0.4rem;
            }
            .step-text {
              font-size: 0.84rem;
              font-weight: 700;
              color: #1f2937;
              line-height: 1.3;
            }
            .footer-note {
              font-size: 0.78rem;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 0.9rem;
            }
          </style>
        </head>
        <body>
          <div class="poster-frame">
            <div class="poster-header">
              <div class="logo-box">
                <img src="${resolvedLogoSrc}" alt="${orgName}">
              </div>
              <div class="org-badge">${orgName}</div>
              <h1>Como foi seu treino hoje?<br><span class="gold-accent">Sua opinião vale ouro!</span></h1>
              <div class="unit-subtitle">📍 Unidade ${currentUnitName} • ${surveyTitle}</div>
            </div>

            <div class="poster-body">
              <div class="stars-row">⭐⭐⭐⭐⭐</div>
              <p class="cta-lead">
                Leva menos de <strong>30 segundos</strong>! Sua avaliação nos ajuda a evoluir continuamente nossos treinos, equipamentos e atendimento.
              </p>

              <div class="qr-wrapper">
                <img src="${qrDataUrl}" alt="QR Code da Pesquisa">
              </div>

              <div class="steps-grid">
                <div class="step-card">
                  <div class="step-num">1</div>
                  <div class="step-text">Abra a câmera do seu celular</div>
                </div>
                <div class="step-card">
                  <div class="step-num">2</div>
                  <div class="step-text">Aponte para o QR Code acima</div>
                </div>
                <div class="step-card">
                  <div class="step-num">3</div>
                  <div class="step-text">Dê sua nota de 0 a 10 em segundos!</div>
                </div>
              </div>

              <div class="footer-note">
                Central de Experiência do Cliente <strong>${orgName}</strong> • Link direto: <strong>${currentResolvedUrl}</strong>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 350);
            };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
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
