/**
 * Organization Header Component
 * Handles multi-tenant organization selector and header context display.
 */

import { store } from '../../app/app-state/store.js';
import { showToast } from '../../shared/feedback/toast.js';

export function renderOrganizationHeader(refreshAllViewsCallback) {
  const activeOrg = store.getActiveOrg();
  
  // 1. Populate Active Organization Dropdown in Header
  const orgSelect = document.getElementById('selectActiveOrg');
  if (orgSelect) {
    orgSelect.innerHTML = '';
    store.organizations.forEach(org => {
      const opt = document.createElement('option');
      opt.value = org.id;
      opt.textContent = org.name + (org.isDemo ? ' (🟣 DEMO)' : org.isPilot ? ' (Piloto)' : '');
      if (org.id === activeOrg.id) opt.selected = true;
      orgSelect.appendChild(opt);
    });

    orgSelect.replaceWith(orgSelect.cloneNode(true));
    const newOrgSelect = document.getElementById('selectActiveOrg');
    if (newOrgSelect) {
      newOrgSelect.addEventListener('change', (e) => {
        store.setActiveOrg(e.target.value);
        renderOrganizationHeader(refreshAllViewsCallback);
        if (typeof refreshAllViewsCallback === 'function') {
          refreshAllViewsCallback();
        }
        showToast(`✓ Organização alterada para: ${store.getActiveOrg().name}`, 'info');
      });
    }
  }

  // 2. Update Header Mode Badge & Banners
  const headerModeBadge = document.getElementById('headerModeBadge');
  const demoBanner = document.getElementById('demoModeBanner');
  const zeroDataBanner = document.getElementById('dashZeroDataBanner');

  if (!store.isSupabaseConnected) {
    if (headerModeBadge) {
      headerModeBadge.className = 'badge-status detractor';
      headerModeBadge.textContent = '🔴 BANCO NÃO CONECTADO';
    }
    if (demoBanner) demoBanner.style.display = 'none';
    if (zeroDataBanner) zeroDataBanner.style.display = 'none';
  } else if (activeOrg.isDemo) {
    if (headerModeBadge) {
      headerModeBadge.className = 'badge-status detractor';
      headerModeBadge.textContent = '🟣 MODO DEMONSTRAÇÃO';
      headerModeBadge.style.background = 'rgba(147, 51, 234, 0.2)';
      headerModeBadge.style.color = '#c084fc';
    }
    if (demoBanner) demoBanner.style.display = 'block';
    if (zeroDataBanner) zeroDataBanner.style.display = 'none';
  } else if (activeOrg.isPilot) {
    if (headerModeBadge) {
      headerModeBadge.className = 'badge-status passive';
      headerModeBadge.textContent = '🟡 PILOTO HOMOLOGAÇÃO';
    }
    if (demoBanner) demoBanner.style.display = 'none';
    if (zeroDataBanner) zeroDataBanner.style.display = 'none';
  } else {
    if (headerModeBadge) {
      headerModeBadge.className = 'badge-status promoter';
      headerModeBadge.textContent = '🟢 CONTA COMERCIAL SAAS';
    }
    if (demoBanner) demoBanner.style.display = 'none';
    if (zeroDataBanner && store.localResponses.length === 0) {
      zeroDataBanner.style.display = 'block';
    }
  }

  // 3. Update Titles & Branding
  const brandTitle = document.getElementById('activeOrgBrandTitle');
  if (brandTitle) brandTitle.textContent = `${activeOrg.name} — Dashboard`;

  const cfgName = document.getElementById('cfgOrgNameInput');
  const cfgTradeName = document.getElementById('cfgOrgTradeNameInput');
  const cfgEmail = document.getElementById('cfgOrgEmailInput');
  const cfgPhone = document.getElementById('cfgOrgPhoneInput');
  const cfgLogo = document.getElementById('cfgOrgLogoInput');
  const cfgLogoContainer = document.getElementById('cfgOrgLogoPreviewContainer');
  const cfgLogoPreview = document.getElementById('cfgOrgLogoPreview');

  if (cfgName) cfgName.value = activeOrg.name;
  if (cfgTradeName) cfgTradeName.value = activeOrg.tradeName || activeOrg.name;
  if (cfgEmail) cfgEmail.value = activeOrg.email;
  if (cfgPhone) cfgPhone.value = activeOrg.phone || '';
  if (cfgLogo) cfgLogo.value = activeOrg.logoUrl || '';

  if (activeOrg.logoUrl && cfgLogoContainer && cfgLogoPreview) {
    cfgLogoPreview.src = activeOrg.logoUrl;
    cfgLogoContainer.style.display = 'flex';
  } else if (cfgLogoContainer) {
    cfgLogoContainer.style.display = 'none';
  }

  // 4. Populate Unit Dropdowns
  const unitDropdowns = [
    document.getElementById('filterUnit'),
    document.getElementById('selectSurveyUnit'),
    document.getElementById('selectDeviceUnit'),
    document.getElementById('selectGenericUnit'),
    document.getElementById('selectUserUnits')
  ];

  unitDropdowns.forEach(dropdown => {
    if (!dropdown) return;
    const currentVal = dropdown.value;
    dropdown.innerHTML = (dropdown.id === 'filterUnit' || dropdown.id === 'selectUserUnits') ? '<option value="all">Todas as Unidades</option>' : '';
    
    activeOrg.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.code;
      opt.textContent = u.name;
      dropdown.appendChild(opt);
    });

    if (currentVal && Array.from(dropdown.options).some(o => o.value === currentVal)) {
      dropdown.value = currentVal;
    }
  });

  renderStudentSimulatorTokens();
}

function renderStudentSimulatorTokens() {
  const tokenSelect = document.getElementById('selectTokenSim');
  if (!tokenSelect) return;
  tokenSelect.innerHTML = '';
  
  const tokens = store.TOKENS_MAP;
  const tokenKeys = Object.keys(tokens);
  
  tokenKeys.forEach(t => {
    const info = tokens[t];
    const u = store.UNITS.find(unit => unit.code === info.unitCode);
    const unitName = u ? u.name : info.unitCode;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = `Token ${unitName} (${t.substring(0, 8)}...)`;
    tokenSelect.appendChild(opt);
  });

  const optGeneric = document.createElement('option');
  optGeneric.value = 'generic';
  optGeneric.textContent = 'Link Genérico (Sem token de unidade)';
  tokenSelect.appendChild(optGeneric);

  if (store.currentSurveyToken && tokenSelect.querySelector(`option[value="${store.currentSurveyToken}"]`)) {
    tokenSelect.value = store.currentSurveyToken;
  } else if (tokenKeys.length > 0) {
    store.currentSurveyToken = tokenKeys[0];
    tokenSelect.value = tokenKeys[0];
  }
}
