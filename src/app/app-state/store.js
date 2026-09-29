/**
 * Central Reactive Application State Store (V2.0 Production Auth & Multi-Tenant Access Control)
 * Manages active organization context, authentications, roles, and tenant state without fake fallbacks.
 */

import { calculateNPS } from '../../surveys/services/npsService.js';

class AppStore {
  constructor() {
    this.organizations = [];
    this.activeOrgId = null;
    this.currentUser = null;
    this.currentProfile = null;
    this.currentMembership = null;
    this.userUnitPermissions = [];

    // Auth & Tenant Status: 'loading' | 'unauthenticated' | 'authenticated' | 'no_organization' | 'no_unit_access' | 'error'
    this.authStatus = 'loading';

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
    this.connectionStatus = 'OFFLINE';
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

  resetAuth() {
    this.currentUser = null;
    this.currentProfile = null;
    this.currentMembership = null;
    this.userUnitPermissions = [];
    this.organizations = [];
    this.activeOrgId = null;
    this.authStatus = 'unauthenticated';
  }

  getUserRole() {
    return this.currentMembership?.role || this.currentProfile?.role || 'viewer';
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
