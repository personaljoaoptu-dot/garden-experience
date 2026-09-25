/**
 * Central Reactive Application State Store (V1.4.9 Production Source & Tenant Hardening)
 * Manages active organization context and runtime state cleanly without fake databases.
 */

import { calculateNPS } from '../../surveys/services/npsService.js';

class AppStore {
  constructor() {
    this.organizations = [];
    this.activeOrgId = null;
    this.currentUser = null;

    // Transient UI State
    this.touchpointCategoryFilter = 'all';
    this.selectedSurveyScore = null;
    this.selectedKioskScore = null;
    this.selectedResponseId = null;
    this.inboxFilter = 'all';
    this.inboxSearchQuery = '';
    this.activeCommTab = 'internal';
    this.kioskTimer = null;
    this.currentSurveyToken = 'generic';
    this.isTechnicalMode = false;
    this.isSupabaseConnected = false;
    this.connectionStatus = 'OFFLINE'; // 'CONNECTED' | 'NOT_CONFIGURED' | 'OFFLINE' | 'AUTH_REQUIRED' | 'NO_ORGANIZATION' | 'ERROR'
  }

  getActiveOrg() {
    if (!this.activeOrgId) {
      return null;
    }
    return this.organizations.find(
      org => org && org.id === this.activeOrgId
    ) || null;
  }

  setActiveOrg(orgId) {
    const org = this.organizations.find(o => o && o.id === orgId);
    if (org) {
      this.activeOrgId = org.id;
      const activeTokens = Object.keys(this.TOKENS_MAP);
      this.currentSurveyToken = activeTokens.length > 0 ? activeTokens[0] : 'generic';
    } else {
      this.activeOrgId = null;
    }
  }

  createOrganization() {
    console.warn('[AppStore] Organization creation is disabled in local memory. Must be executed via Supabase backend services.');
    return null;
  }

  get localResponses() { return this.getActiveOrg()?.responses || []; }
  set localResponses(val) { const org = this.getActiveOrg(); if (org) org.responses = val; }

  get followUpCases() { return this.getActiveOrg()?.followUpCases || []; }
  set followUpCases(val) { const org = this.getActiveOrg(); if (org) org.followUpCases = val; }

  get devices() { return this.getActiveOrg()?.devices || []; }
  set devices(val) { const org = this.getActiveOrg(); if (org) org.devices = val; }

  get touchpoints() { return this.getActiveOrg()?.touchpoints || []; }
  set touchpoints(val) { const org = this.getActiveOrg(); if (org) org.touchpoints = val; }

  get surveys() { return this.getActiveOrg()?.surveys || []; }
  set surveys(val) { const org = this.getActiveOrg(); if (org) org.surveys = val; }

  get surveySections() { return this.getActiveOrg()?.surveySections || []; }
  set surveySections(val) { const org = this.getActiveOrg(); if (org) org.surveySections = val; }

  get messageTemplates() { return this.getActiveOrg()?.messageTemplates || []; }
  set messageTemplates(val) { const org = this.getActiveOrg(); if (org) org.messageTemplates = val; }

  get communicationLogs() { return this.getActiveOrg()?.communicationLogs || []; }
  set communicationLogs(val) { const org = this.getActiveOrg(); if (org) org.communicationLogs = val; }

  get users() { return this.getActiveOrg()?.users || []; }
  set users(val) { const org = this.getActiveOrg(); if (org) org.users = val; }

  get UNITS() { return this.getActiveOrg()?.units || []; }
  get TOKENS_MAP() { return this.getActiveOrg()?.tokensMap || {}; }

  calculateNPS(responses = this.localResponses) {
    return calculateNPS(responses);
  }
}

export const store = new AppStore();
if (typeof window !== 'undefined') {
  window.store = store;
}
