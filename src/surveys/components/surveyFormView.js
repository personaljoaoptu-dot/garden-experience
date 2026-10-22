/**
 * Public Survey Student Simulator & Public Route Handler Component
 * Handles token validation from survey_links, public form submission via submit_survey_response RPC,
 * and Thank You screen ("Obrigado!").
 */

import { store } from '../../app/app-state/store.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { surveyLinksRepository } from '../repositories/surveyLinksRepository.js';
import { surveysRepository } from '../repositories/surveysRepository.js';
import { organizationsRepository } from '../../organizations/repositories/organizationsRepository.js';
import { touchpointsRepository } from '../../touchpoints/repositories/touchpointsRepository.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';
import { showToast } from '../../shared/feedback/toast.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

let activeTokenData = null;
let selectedTouchpointRatings = {};
let selectedTouchpointObservations = {};

function getSurveyDraftStorageKey(token) {
  return `garden_survey_draft_${String(token || 'default').trim()}`;
}

function saveSurveyDraft(token) {
  if (!token || typeof localStorage === 'undefined') return;
  try {
    const draft = {
      score: store.selectedSurveyScore ?? null,
      touchpointRatings: { ...selectedTouchpointRatings },
      touchpointObservations: { ...selectedTouchpointObservations },
      name: document.getElementById('inputStudentName')?.value || '',
      email: document.getElementById('inputStudentEmail')?.value || '',
      phone: document.getElementById('inputStudentPhone')?.value || '',
      comment: document.getElementById('inputStudentComment')?.value || '',
      updatedAt: Date.now()
    };
    localStorage.setItem(getSurveyDraftStorageKey(token), JSON.stringify(draft));
  } catch (_) {}
}

function loadSurveyDraft(token) {
  if (!token || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getSurveyDraftStorageKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire draft after 24 hours
    if (parsed?.updatedAt && (Date.now() - parsed.updatedAt) > 24 * 3600 * 1000) {
      localStorage.removeItem(getSurveyDraftStorageKey(token));
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

function clearSurveyDraft(token) {
  if (!token || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(getSurveyDraftStorageKey(token));
  } catch (_) {}
}

export async function setupSurveyForm() {
  const modPublicSurvey = document.getElementById('mod-public-survey');
  const loadingCard = document.getElementById('surveyLoadingCard');
  const errorCard = document.getElementById('surveyErrorCard');
  const formCard = document.getElementById('surveyFormCard');
  const thankYouCard = document.getElementById('surveyThankYouCard');
  const tokenGroup = document.getElementById('surveyTokenSelectGroup');
  const orgLogoImg = document.getElementById('surveyOrgLogoImg');
  const orgTitle = document.getElementById('surveyOrgTitle');
  const unitTitle = document.getElementById('surveyUnitName');
  const subtitleEl = document.getElementById('surveySubtitle');
  const npsLabelEl = document.getElementById('surveyNpsQuestionLabel');
  const commentLabelEl = document.getElementById('surveyCommentQuestionLabel');

  const urlParams = new URLSearchParams(window.location.search);
  const pathname = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
  const pathMatch = pathname.match(/^\/(?:p|avaliar)\/([^/?#]+)/i);
  const pathToken = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  const tokenFromUrl = urlParams.get('token') || pathToken;
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

  // Wire Manual Device Token form inside #surveyErrorCard
  const formManualTok = document.getElementById('formManualDeviceToken');
  if (formManualTok && !formManualTok.dataset.listenerAttached) {
    formManualTok.dataset.listenerAttached = 'true';
    formManualTok.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawVal = document.getElementById('inputManualDeviceToken')?.value.trim() || '';
      if (!rawVal) return;
      let extractedToken = rawVal;
      if (rawVal.includes('token=')) {
        try {
          const u = new URL(rawVal);
          extractedToken = u.searchParams.get('token') || rawVal;
        } catch (_) {
          const match = rawVal.match(/[?&]token=([^&]+)/);
          if (match && match[1]) extractedToken = decodeURIComponent(match[1]);
        }
      }
      window.location.href = `${window.location.origin}/?token=${encodeURIComponent(extractedToken.trim())}&origin=tablet`;
    });
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

    const tabletBadge = document.getElementById('surveyTabletModeBadge');
    const tabletNameSpan = document.getElementById('surveyTabletDeviceName');
    const isTabletDevice = Boolean(activeTokenData.is_tablet_device || urlParams.get('origin') === 'tablet');
    if (tabletBadge) {
      tabletBadge.style.display = isTabletDevice ? 'block' : 'none';
      if (tabletNameSpan) {
        tabletNameSpan.textContent = activeTokenData.device_name
          ? `Totem: ${activeTokenData.device_name}`
          : 'Modo Totem Ativo';
      }
    }

    const unitObj = activeTokenData.units;
    const surveyObj = activeTokenData.surveys;

    if (orgTitle) orgTitle.textContent = surveyObj?.title ? surveyObj.title.toUpperCase() : 'GARDEN EXPERIENCE';
    if (unitTitle) unitTitle.textContent = unitObj?.name ? `${unitObj.name}` : (surveyObj?.title || 'Pesquisa de Satisfação');
    if (subtitleEl && surveyObj?.description) {
      subtitleEl.textContent = surveyObj.description;
    }

    // Fetch public branding (logo_url & trade_name) for the organization
    if (unitObj?.organization_id) {
      const branding = await organizationsRepository.fetchPublicBranding(unitObj.organization_id);
      if (branding) {
        if (orgLogoImg) orgLogoImg.src = branding.logo_url || '/logo-garden-gold.jpg';
        if (orgTitle && !surveyObj?.title && (branding.trade_name || branding.name)) {
          orgTitle.textContent = String(branding.trade_name || branding.name).toUpperCase();
        }
      }
    }

    // Fetch customized questions for this survey if available
    if (activeTokenData.survey_id) {
      const surveyQuestions = await surveysRepository.fetchQuestions(activeTokenData.survey_id);
      const npsQ = (surveyQuestions || []).find(q => q.question_type === 'nps');
      const textQ = (surveyQuestions || []).find(q => q.question_type === 'text');
      if (npsLabelEl && npsQ?.title) npsLabelEl.textContent = npsQ.title;
      if (commentLabelEl && textQ?.title) commentLabelEl.textContent = textQ.title;
    }

    // Fetch and render touchpoints for unit/organization
    const touchpoints = await touchpointsRepository.fetchTouchpointsForUnit(activeTokenData.unit_id, unitObj?.organization_id);
    const tpContainer = document.getElementById('surveyTouchpointsContainer');
    const tpList = document.getElementById('surveyTouchpointsList');
    selectedTouchpointRatings = {};
    selectedTouchpointObservations = {};

    if (tpContainer && tpList) {
      if (touchpoints && touchpoints.length > 0) {
        // Sort touchpoints by designated order_index
        const sortedTouchpoints = [...touchpoints].sort((a, b) => ((a.order_index ?? a.orderIndex ?? 0) - (b.order_index ?? b.orderIndex ?? 0)));

        tpList.innerHTML = '';
        sortedTouchpoints.forEach(tp => {
          const itemDiv = document.createElement('div');
          itemDiv.style.cssText = 'background:rgba(255,255,255,0.035); border:1px solid var(--border-subtle); border-radius:12px; padding:1.15rem;';
          const hasObs = Boolean(tp.allow_observation || tp.allowObservation);

          itemDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
              <span style="font-size:1.05rem; font-weight:800; color:var(--text-title); letter-spacing:0.3px;">${escapeHtml(tp.name)}</span>
              ${hasObs ? '<span style="font-size:0.78rem; font-weight:700; color:var(--gold-primary); background:rgba(217,163,35,0.12); padding:2px 8px; border-radius:6px; border:1px solid rgba(217,163,35,0.25);">💬 Comentário ativado</span>' : ''}
            </div>
            ${tp.description ? `<div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.65rem; line-height:1.4;">${escapeHtml(tp.description)}</div>` : ''}
            <div class="tp-scale-row" style="display:flex; gap:0.3rem; justify-content:space-between; margin-top:0.4rem;">
              ${[0,1,2,3,4,5,6,7,8,9,10].map(val => `<button type="button" class="tp-rating-pill" data-tp-id="${tp.id}" data-rating="${val}" style="flex:1; min-width:24px; padding:0.65rem 0; font-size:1.1rem; font-weight:800; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); color:var(--text-title); border-radius:8px; cursor:pointer; text-align:center;">${val}</button>`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-top:0.4rem;">
              <span>0 = Crítico</span>
              <span>10 = Excelente</span>
            </div>
            ${hasObs ? `
              <div class="tp-obs-wrapper" style="margin-top:0.75rem;">
                <input type="text" 
                       class="text-input tp-observation-input" 
                       data-tp-id="${tp.id}" 
                       placeholder="Observação sobre ${escapeHtml(tp.name)} (opcional)..." 
                       style="font-size:0.95rem; padding:0.7rem 0.9rem; width:100%; border-radius:8px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); color:var(--text-primary);" />
              </div>
            ` : ''}
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
            saveSurveyDraft(tokenFromUrl);
          };
        });

        // Attach event listeners for touchpoint observation inputs
        const obsInputs = tpList.querySelectorAll('.tp-observation-input');
        obsInputs.forEach(input => {
          input.addEventListener('input', (e) => {
            const tpId = input.getAttribute('data-tp-id');
            const val = e.target.value.trim();
            if (val) {
              selectedTouchpointObservations[tpId] = val;
            } else {
              delete selectedTouchpointObservations[tpId];
            }
            saveSurveyDraft(tokenFromUrl);
          });
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

  const applyScoreCommentPrompt = (score) => {
    const commentInputEl = document.getElementById('inputStudentComment');
    if (!commentLabelEl || score === null || score === undefined) return;
    commentLabelEl.style.fontSize = '1.05rem';
    commentLabelEl.style.fontWeight = '700';
    commentLabelEl.style.lineHeight = '1.45';
    commentLabelEl.style.marginBottom = '0.45rem';
    commentLabelEl.style.display = 'block';

    if (score === 0) {
      commentLabelEl.innerHTML = 'Qual motivo da sua nota? <strong style="color:#ef4444; font-size:0.92rem;">(Obrigatório *)</strong>';
      commentLabelEl.style.color = 'var(--text-title)';
      if (commentInputEl) {
        commentInputEl.required = true;
        commentInputEl.placeholder = 'Conte-nos mais sobre sua experiência...';
        commentInputEl.style.borderColor = 'rgba(239, 68, 68, 0.55)';
      }
    } else {
      commentLabelEl.textContent = 'Qual motivo da sua nota?';
      commentLabelEl.style.color = 'var(--text-title)';
      if (commentInputEl) {
        commentInputEl.required = false;
        commentInputEl.placeholder = 'Conte-nos mais sobre sua experiência...';
        commentInputEl.style.borderColor = '';
      }
    }
  };

  // 2. NPS score pills selection (0 to 10)
  const scoreBtns = document.querySelectorAll('.nps-score-pill');
  scoreBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      scoreBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const score = parseInt(btn.getAttribute('data-score'), 10);
      store.selectedSurveyScore = score;
      applyScoreCommentPrompt(score);
      saveSurveyDraft(tokenFromUrl);
    };
  });

  // 2B. Wire live draft auto-save on text inputs and restore any existing draft for this token
  const draftInputs = [
    document.getElementById('inputStudentName'),
    document.getElementById('inputStudentEmail'),
    document.getElementById('inputStudentPhone'),
    document.getElementById('inputStudentComment')
  ];
  draftInputs.forEach(inp => {
    if (inp && !inp.dataset.draftListenerAttached) {
      inp.dataset.draftListenerAttached = 'true';
      inp.addEventListener('input', () => saveSurveyDraft(tokenFromUrl));
      inp.addEventListener('change', () => saveSurveyDraft(tokenFromUrl));
    }
  });

  const savedDraft = loadSurveyDraft(tokenFromUrl);
  if (savedDraft) {
    if (savedDraft.score !== null && savedDraft.score !== undefined) {
      const numScore = Number(savedDraft.score);
      store.selectedSurveyScore = numScore;
      scoreBtns.forEach(b => {
        if (parseInt(b.getAttribute('data-score'), 10) === numScore) {
          b.classList.add('selected');
        } else {
          b.classList.remove('selected');
        }
      });
      applyScoreCommentPrompt(numScore);
    }

    if (savedDraft.touchpointRatings && typeof savedDraft.touchpointRatings === 'object') {
      const tpListEl = document.getElementById('surveyTouchpointsList');
      Object.entries(savedDraft.touchpointRatings).forEach(([tpId, ratingVal]) => {
        const numRating = Number(ratingVal);
        if (!isNaN(numRating) && numRating >= 0 && numRating <= 10) {
          selectedTouchpointRatings[tpId] = numRating;
          const matchingBtn = tpListEl?.querySelector(`.tp-rating-pill[data-tp-id="${tpId}"][data-rating="${numRating}"]`);
          if (matchingBtn) {
            matchingBtn.style.background = 'linear-gradient(135deg, var(--gold-primary), #c79a2b)';
            matchingBtn.style.color = '#0d1117';
            matchingBtn.style.borderColor = 'var(--gold-primary)';
          }
        }
      });
    }

    if (savedDraft.touchpointObservations && typeof savedDraft.touchpointObservations === 'object') {
      const tpListEl = document.getElementById('surveyTouchpointsList');
      selectedTouchpointObservations = { ...savedDraft.touchpointObservations };
      Object.entries(savedDraft.touchpointObservations).forEach(([tpId, obsVal]) => {
        const matchingInput = tpListEl?.querySelector(`.tp-observation-input[data-tp-id="${tpId}"]`);
        if (matchingInput && obsVal) {
          matchingInput.value = obsVal;
        }
      });
    }

    const nameEl = document.getElementById('inputStudentName');
    const emailEl = document.getElementById('inputStudentEmail');
    const phoneEl = document.getElementById('inputStudentPhone');
    const commentEl = document.getElementById('inputStudentComment');
    if (nameEl && savedDraft.name) nameEl.value = savedDraft.name;
    if (emailEl && savedDraft.email) emailEl.value = savedDraft.email;
    if (phoneEl && savedDraft.phone) phoneEl.value = savedDraft.phone;
    if (commentEl && savedDraft.comment) commentEl.value = savedDraft.comment;
  }

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

      const submittedScore = Number(store.selectedSurveyScore);
      const tokenSelect = document.getElementById('selectTokenSim');
      const effectiveToken = tokenFromUrl || (tokenSelect ? tokenSelect.value : null);
      const rawStudentName = document.getElementById('inputStudentName')?.value.trim() || '';
      const isAnonAllowed = activeTokenData?.surveys?.is_anonymous_allowed !== false;
      if (!isAnonAllowed && !rawStudentName) {
        showToast('⚠️ Por favor, informe seu Nome para concluir a avaliação.', 'warning');
        document.getElementById('inputStudentName')?.focus();
        return;
      }
      const student = rawStudentName || 'Anônimo';
      const email = document.getElementById('inputStudentEmail')?.value.trim() || '';
      const phone = document.getElementById('inputStudentPhone')?.value.trim() || '';
      const comment = document.getElementById('inputStudentComment')?.value.trim() || '';

      if (submittedScore === 0 && !comment) {
        showToast('⚠️ Para avaliar com nota 0, é obrigatório deixar um comentário explicando o motivo.', 'warning');
        const commentInputEl = document.getElementById('inputStudentComment');
        if (commentInputEl) {
          commentInputEl.style.borderColor = '#ef4444';
          commentInputEl.focus();
        }
        return;
      }

      const activeOrg = store.getActiveOrg();
      const tokenInfo = activeTokenData ? { unitCode: activeTokenData.units?.code } : (activeOrg?.tokensMap ? activeOrg.tokensMap[effectiveToken] : null);
      const unitCode = tokenInfo ? tokenInfo.unitCode : (activeOrg?.units?.find(u => u.is_active || u.status === 'Ativa')?.code || null);

      const btnSubmit = document.getElementById('btnSubmitPublicSurvey');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando resposta...';
      }

      const isTabletOrigin = Boolean(activeTokenData?.is_tablet_device || new URLSearchParams(window.location.search).get('origin') === 'tablet');

      try {
        const res = await responsesRepository.submitPublicResponse({
          token: effectiveToken,
          unitCode,
          origin: isTabletOrigin ? 'tablet' : 'qr_web',
          npsScore: submittedScore,
          comment,
          student,
          email,
          phone,
          touchpointRatings: selectedTouchpointRatings,
          touchpointObservations: selectedTouchpointObservations,
          consentAccepted: true
        });

        if (res && res.success === false) {
          const errMsg = res.error || 'Falha ao registrar resposta.';
          showToast(`❌ ${errMsg}`, 'error');
          return;
        }

        // Clear saved draft once submission succeeds
        clearSurveyDraft(effectiveToken || tokenFromUrl);

        // Customize Thank You screen by NPS segment (Promoter / Passive / Detractor)
        const tyIcon = document.getElementById('thankYouIcon');
        const tyTitle = document.getElementById('thankYouTitle');
        const tySub = document.getElementById('thankYouSubtitle');
        const tyDetail = document.getElementById('thankYouDetail');
        const tyPromBox = document.getElementById('thankYouPromoterBox');
        const btnShareWa = document.getElementById('btnSharePromoterWa');
        const orgDisplayName = orgTitle?.textContent || 'Garden Experience';

        if (submittedScore >= 9) {
          if (tyIcon) tyIcon.textContent = '🌟';
          if (tyTitle) tyTitle.textContent = 'Que alegria receber sua nota!';
          if (tySub) tySub.textContent = `Ficamos muito felizes em saber que você ama a experiência na ${orgDisplayName}!`;
          if (tyDetail) tyDetail.textContent = 'Nosso time trabalha todos os dias para entregar o melhor ambiente, estrutura e atendimento para você.';
          if (tyPromBox) tyPromBox.style.display = 'block';
          if (btnShareWa) {
            btnShareWa.onclick = () => {
              const referralText = `Oi! Estou treinando na ${orgDisplayName} e recomendo demais a experiência! 💪✨`;
              window.open(`https://wa.me/?text=${encodeURIComponent(referralText)}`, '_blank', 'noopener,noreferrer');
            };
          }
        } else if (submittedScore >= 7) {
          if (tyIcon) tyIcon.textContent = '🙏';
          if (tyTitle) tyTitle.textContent = 'Muito obrigado pela sua avaliação!';
          if (tySub) tySub.textContent = 'Sua resposta foi registrada com sucesso.';
          if (tyDetail) tyDetail.textContent = 'Vamos analisar suas sugestões com carinho para que sua próxima experiência conosco seja nota 10!';
          if (tyPromBox) tyPromBox.style.display = 'none';
        } else {
          if (tyIcon) tyIcon.textContent = '🤝';
          if (tyTitle) tyTitle.textContent = 'Agradecemos sua sinceridade';
          if (tySub) tySub.textContent = 'Sua avaliação já foi encaminhada com prioridade para nossa gestão.';
          if (tyDetail) tyDetail.textContent = 'Levamos seu feedback muito a sério. Caso tenha deixado seu contato, nossa coordenação falará com você em breve para resolvermos qualquer ponto de insatisfação.';
          if (tyPromBox) tyPromBox.style.display = 'none';
        }

        // Trigger optional Detractor Webhook if configured & score <= 6
        if (submittedScore <= 6) {
          try {
            const webhookUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('garden_detractor_webhook_url') : null;
            if (webhookUrl && webhookUrl.startsWith('http') && typeof fetch === 'function') {
              fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'detractor_alert',
                  organization: orgDisplayName,
                  unit: unitTitle?.textContent || unitCode || 'Geral',
                  npsScore: submittedScore,
                  student,
                  email,
                  phone,
                  comment,
                  createdAt: new Date().toISOString()
                })
              }).catch(() => {});
            }
          } catch (_) {}
        }

        // Hide form and display Thank You Card ("Obrigado!")
        if (formCard) formCard.style.display = 'none';
        if (thankYouCard) thankYouCard.style.display = 'block';

        const autoResetContainer = document.getElementById('surveyAutoResetContainer');
        const btnResetNow = document.getElementById('btnResetPublicSurvey');

        if (isTabletOrigin) {
          // Only in Totem / Tablet mode: show countdown bar and auto-restart for the next student
          if (autoResetContainer) autoResetContainer.style.display = 'block';
          if (btnResetNow) btnResetNow.style.display = 'inline-flex';
          startPublicSurveyAutoReset();
        } else {
          // Regular QR Code / Public Link on student's phone: keep on Thank You screen without restarting
          clearPublicSurveyAutoReset();
          if (autoResetContainer) autoResetContainer.style.display = 'none';
          if (btnResetNow) btnResetNow.style.display = 'none';
        }

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

  let autoResetIntervalId = null;

  function clearPublicSurveyAutoReset() {
    if (autoResetIntervalId) {
      clearInterval(autoResetIntervalId);
      autoResetIntervalId = null;
    }
  }

  function resetPublicSurveyForm() {
    clearPublicSurveyAutoReset();
    clearSurveyDraft(tokenFromUrl);
    form?.reset();
    scoreBtns.forEach(b => b.classList.remove('selected'));
    store.selectedSurveyScore = null;
    selectedTouchpointRatings = {};
    selectedTouchpointObservations = {};
    if (commentLabelEl) {
      commentLabelEl.textContent = 'Qual motivo da sua nota?';
      commentLabelEl.style.color = 'var(--text-title)';
    }
    if (commentInputEl) {
      commentInputEl.required = false;
      commentInputEl.placeholder = 'Conte-nos mais sobre sua experiência...';
      commentInputEl.style.borderColor = '';
    }
    const tpBtns = document.querySelectorAll('.tp-rating-pill');
    tpBtns.forEach(b => {
      b.style.background = 'rgba(255,255,255,0.05)';
      b.style.color = 'var(--text-title)';
      b.style.borderColor = 'var(--border-subtle)';
    });
    const obsInputs = document.querySelectorAll('.tp-observation-input');
    obsInputs.forEach(i => {
      i.value = '';
    });
    if (thankYouCard) thankYouCard.style.display = 'none';
    if (formCard) formCard.style.display = 'block';
  }

  function startPublicSurveyAutoReset() {
    clearPublicSurveyAutoReset();
    const labelEl = document.getElementById('surveyAutoResetLabel');
    const barEl = document.getElementById('surveyAutoResetProgressBar');
    const pauseBtn = document.getElementById('btnPauseAutoReset');

    let configuredSecs = 10;
    try {
      const saved = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('garden_kiosk_reset_seconds'), 10) : 10;
      if (!isNaN(saved) && saved >= 3 && saved <= 120) configuredSecs = saved;
    } catch (_) {}

    let remaining = configuredSecs;
    let isPaused = false;

    const updateUi = () => {
      if (labelEl) {
        labelEl.innerHTML = isPaused
          ? '⏸️ Reinício automático pausado'
          : `🔄 Reiniciando para nova avaliação em <strong style="color:var(--gold-primary);">${remaining}s</strong>`;
      }
      if (barEl) {
        const pct = Math.max(0, Math.round((remaining / configuredSecs) * 100));
        barEl.style.width = `${pct}%`;
      }
      if (pauseBtn) {
        pauseBtn.textContent = isPaused ? 'Retomar' : 'Pausar';
      }
    };

    updateUi();

    if (pauseBtn) {
      pauseBtn.onclick = () => {
        isPaused = !isPaused;
        updateUi();
      };
    }

    autoResetIntervalId = setInterval(() => {
      if (isPaused) return;
      remaining -= 1;
      updateUi();
      if (remaining <= 0) {
        resetPublicSurveyForm();
      }
    }, 1000);

    // Ensure Node.js test runner does not hang waiting for this interval
    if (autoResetIntervalId && typeof autoResetIntervalId.unref === 'function') {
      autoResetIntervalId.unref();
    }
  }

  // 4. Thank You Card Reset Button
  const btnReset = document.getElementById('btnResetPublicSurvey');
  if (btnReset) {
    btnReset.onclick = () => {
      resetPublicSurveyForm();
    };
  }
}
