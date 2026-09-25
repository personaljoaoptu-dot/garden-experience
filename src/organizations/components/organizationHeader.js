/**
 * Organization Header Component (V1.4.7 Production Data Source Hardening)
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
    if (store.organizations && store.organizations.length > 0) {
      store.organizations.forEach(org => {
        const opt = document.createElement('option');
        opt.value = org.id;
        opt.textContent = org.name;
        if (activeOrg && org.id === activeOrg.id) opt.selected = true;
        orgSelect.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sem organização vinculada';
      orgSelect.appendChild(opt);
    }

    orgSelect.replaceWith(orgSelect.cloneNode(true));
    const newOrgSelect = document.getElementById('selectActiveOrg');
    if (newOrgSelect) {
      newOrgSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          store.setActiveOrg(e.target.value);
          renderOrganizationHeader(refreshAllViewsCallback);
          if (typeof refreshAllViewsCallback === 'function') {
            refreshAllViewsCallback();
          }
          const currentOrg = store.getActiveOrg();
          if (currentOrg) {
            showToast(`✓ Organização alterada para: ${currentOrg.name}`, 'info');
          }
        }
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
  } else if (!activeOrg) {
    if (headerModeBadge) {
      headerModeBadge.className = 'badge-status passive';
      headerModeBadge.textContent = '🟡 SEM ORGANIZAÇÃO';
    }
    if (demoBanner) demoBanner.style.display = 'none';
    if (zeroDataBanner) zeroDataBanner.style.display = 'block';
  } else {
    if (headerModeBadge) {
      headerModeBadge.className = 'badge-status promoter';
      headerModeBadge.textContent = '🟢 CONTA COMERCIAL SAAS';
    }
    if (demoBanner) demoBanner.style.display = 'none';
    if (zeroDataBanner && store.localResponses.length === 0) {
      zeroDataBanner.style.display = 'block';
    } else if (zeroDataBanner) {
      zeroDataBanner.style.display = 'none';
    }
  }

  // 3. Update Titles & Branding
  const brandTitle = document.getElementById('activeOrgBrandTitle');
  if (brandTitle) {
    brandTitle.textContent = activeOrg ? `${activeOrg.name} — Dashboard` : 'Garden Experience — Dashboard';
  }

  // 4. Populate Unit Dropdowns
  const unitDropdowns = [
    document.getElementById('filterUnit'),
    document.getElementById('selectSurveyUnit'),
    document.getElementById('selectDeviceUnit'),
    document.getElementById('selectGenericUnit'),
    document.getElementById('selectUserUnits')
  ];

  const unitsList = activeOrg?.units || [];

  unitDropdowns.forEach(dropdown => {
    if (!dropdown) return;
    const currentVal = dropdown.value;
    dropdown.innerHTML = (dropdown.id === 'filterUnit' || dropdown.id === 'selectUserUnits') ? '<option value="all">Todas as Unidades</option>' : '';
    
    unitsList.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.code || u.id;
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
