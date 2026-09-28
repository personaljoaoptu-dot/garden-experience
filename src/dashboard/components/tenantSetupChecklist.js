/**
 * Tenant Setup Checklist Component
 * Visual Onboarding & Config Progress Tracker for Multi-Tenant Administration
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function renderTenantSetupChecklist() {
  return `
    <div id="tenantSetupChecklistCard" class="glass-card mb-3" style="padding: 1.1rem 1.35rem; border: 1px solid var(--border-subtle); background: linear-gradient(135deg, rgba(20, 24, 33, 0.75), rgba(30, 36, 50, 0.65)); display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(229, 185, 63, 0.15); border: 1px solid rgba(229, 185, 63, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
            🚀
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-title); margin: 0;">Setup da Conta do Tenant</h3>
              <span id="setupPercentageBadge" class="badge-status passive" style="font-size: 0.72rem; font-weight: 700;">0% Concluído</span>
            </div>
            <p id="setupProgressSubtitle" style="font-size: 0.8rem; color: var(--text-muted); margin: 0.15rem 0 0 0;">
              Complete as etapas iniciais para liberar a operação comercial de coleta de NPS.
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button type="button" id="btnToggleChecklistDetails" class="btn-ghost btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.6rem; color: var(--gold-primary);">
            <span id="lblToggleChecklist">Ocultar Detalhes ▲</span>
          </button>
          <button type="button" id="btnDismissChecklist" class="btn-ghost btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.5rem; color: var(--text-muted);" title="Fechar aviso de setup">
            ✕
          </button>
        </div>
      </div>

      <!-- General Setup Bar -->
      <div style="height: 8px; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden; margin-bottom: 0.85rem; position: relative;">
        <div id="setupProgressBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #e5b93f, #10b981); border-radius: 999px; transition: width 0.4s ease-in-out;"></div>
      </div>

      <!-- Checklist Items Grid -->
      <div id="setupChecklistGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.65rem; transition: all 0.3s ease;">
        <!-- Step 1 -->
        <div class="setup-step-item" data-target-mod="mod-settings" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.85rem; cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-title);">1. Dados da Organização</span>
            <span id="stepIcon1" style="font-size: 0.85rem;">⭕</span>
          </div>
          <p style="font-size: 0.73rem; color: var(--text-muted); margin: 0; line-height: 1.2;">Razão social e dados comerciais</p>
        </div>

        <!-- Step 2 -->
        <div class="setup-step-item" data-target-mod="mod-units" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.85rem; cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-title);">2. Unidades Cadastradas</span>
            <span id="stepIcon2" style="font-size: 0.85rem;">⭕</span>
          </div>
          <p style="font-size: 0.73rem; color: var(--text-muted); margin: 0; line-height: 1.2;">Cadastre pelo menos 1 unidade</p>
        </div>

        <!-- Step 3 -->
        <div class="setup-step-item" data-target-mod="mod-touchpoints" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.85rem; cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-title);">3. Pontos de Contato</span>
            <span id="stepIcon3" style="font-size: 0.85rem;">⭕</span>
          </div>
          <p style="font-size: 0.73rem; color: var(--text-muted); margin: 0; line-height: 1.2;">Defina setores e experiências</p>
        </div>

        <!-- Step 4 -->
        <div class="setup-step-item" data-target-mod="mod-surveys" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.85rem; cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-title);">4. Pesquisa de Satisfação</span>
            <span id="stepIcon4" style="font-size: 0.85rem;">⭕</span>
          </div>
          <p style="font-size: 0.73rem; color: var(--text-muted); margin: 0; line-height: 1.2;">Configure o questionário NPS</p>
        </div>

        <!-- Step 5 -->
        <div class="setup-step-item" data-target-mod="mod-devices" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.85rem; cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-title);">5. QR Code / Totens</span>
            <span id="stepIcon5" style="font-size: 0.85rem;">⭕</span>
          </div>
          <p style="font-size: 0.73rem; color: var(--text-muted); margin: 0; line-height: 1.2;">Gere tokens e links de coleta</p>
        </div>
      </div>
    </div>
  `;
}

export function updateTenantSetupChecklist() {
  const card = document.getElementById('tenantSetupChecklistCard');
  if (!card) return;

  const activeOrg = store.getActiveOrg();
  if (!activeOrg) {
    card.style.display = 'none';
    return;
  }

  // Check if dismissed in localStorage for this tenant
  const isDismissed = localStorage.getItem(`dismissed_setup_${activeOrg.id}`) === 'true';

  // Evaluate Setup Steps
  const hasOrgData = Boolean(activeOrg.name && (activeOrg.email || activeOrg.phone));
  const hasUnits = Array.isArray(activeOrg.units) && activeOrg.units.length > 0;
  const hasTouchpoints = Array.isArray(activeOrg.touchpoints) && activeOrg.touchpoints.length > 0;
  const hasSurveys = Array.isArray(activeOrg.surveys) && activeOrg.surveys.length > 0;
  
  const hasTokensMap = activeOrg.tokensMap && Object.keys(activeOrg.tokensMap).length > 0;
  const hasDevices = Array.isArray(activeOrg.devices) && activeOrg.devices.length > 0;
  const hasDevicesOrTokens = Boolean(hasTokensMap || hasDevices);

  const steps = [
    { id: 1, ok: hasOrgData },
    { id: 2, ok: hasUnits },
    { id: 3, ok: hasTouchpoints },
    { id: 4, ok: hasSurveys },
    { id: 5, ok: hasDevicesOrTokens }
  ];

  const completedCount = steps.filter(s => s.ok).length;
  const totalSteps = steps.length;
  const pct = Math.round((completedCount / totalSteps) * 100);

  // If 100% completed and dismissed, hide banner. Otherwise keep visible or show button
  if (isDismissed) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  // Update UI components
  const pctBadge = document.getElementById('setupPercentageBadge');
  const progressBar = document.getElementById('setupProgressBar');
  const subTitle = document.getElementById('setupProgressSubtitle');

  if (pctBadge) {
    pctBadge.textContent = `${completedCount} de ${totalSteps} (${pct}%)`;
    pctBadge.className = `badge-status ${pct === 100 ? 'promoter' : (pct >= 60 ? 'passive' : 'detractor')}`;
  }

  if (progressBar) {
    progressBar.style.width = `${pct}%`;
  }

  if (subTitle) {
    if (pct === 100) {
      subTitle.textContent = '🎉 Parabéns! Sua organização está 100% configurada e pronta para coletar avaliações.';
    } else {
      subTitle.textContent = `Você concluiu ${completedCount} de ${totalSteps} etapas. Clique nas pendentes para finalizar a configuração.`;
    }
  }

  // Update individual step icons and styling
  steps.forEach(step => {
    const iconEl = document.getElementById(`stepIcon${step.id}`);
    const itemEl = card.querySelector(`[data-target-mod][data-target-mod$="${step.id === 1 ? 'settings' : step.id === 2 ? 'units' : step.id === 3 ? 'touchpoints' : step.id === 4 ? 'surveys' : 'devices'}"]`);

    if (iconEl) {
      iconEl.textContent = step.ok ? '✓' : '⭕';
      iconEl.style.color = step.ok ? '#10b981' : 'var(--text-muted)';
      iconEl.style.fontWeight = step.ok ? '800' : '400';
    }

    if (itemEl) {
      if (step.ok) {
        itemEl.style.borderColor = 'rgba(16, 185, 129, 0.25)';
        itemEl.style.background = 'rgba(16, 185, 129, 0.04)';
      } else {
        itemEl.style.borderColor = 'var(--border-subtle)';
        itemEl.style.background = 'rgba(255, 255, 255, 0.03)';
      }
    }
  });

  // Attach Event Handlers (Step Navigation)
  const stepItems = card.querySelectorAll('.setup-step-item');
  stepItems.forEach(item => {
    if (!item.__hasClick) {
      item.__hasClick = true;
      item.addEventListener('click', () => {
        const targetMod = item.getAttribute('data-target-mod');
        if (targetMod) {
          document.querySelector(`[data-mod="${targetMod}"]`)?.click();
        }
      });
    }
  });

  // Toggle Details Handler
  const toggleBtn = document.getElementById('btnToggleChecklistDetails');
  const gridEl = document.getElementById('setupChecklistGrid');
  const lblToggle = document.getElementById('lblToggleChecklist');

  if (toggleBtn && !toggleBtn.__hasClick) {
    toggleBtn.__hasClick = true;
    let isExpanded = true;

    toggleBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (gridEl) gridEl.style.display = isExpanded ? 'grid' : 'none';
      if (lblToggle) lblToggle.textContent = isExpanded ? 'Ocultar Detalhes ▲' : 'Ver Detalhes ▼';
    });
  }

  // Dismiss Button Handler
  const dismissBtn = document.getElementById('btnDismissChecklist');
  if (dismissBtn && !dismissBtn.__hasClick) {
    dismissBtn.__hasClick = true;
    dismissBtn.addEventListener('click', () => {
      localStorage.setItem(`dismissed_setup_${activeOrg.id}`, 'true');
      card.style.display = 'none';
    });
  }
}
