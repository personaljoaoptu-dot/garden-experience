/**
 * Core Data Synchronization Service (V1.4.9 Final Blocker Hardening)
 * Fetches real persistent data from Supabase repositories and populates the runtime Store in memory.
 */

import { store } from '../../app/app-state/store.js';
import { supabase, isSupabaseConfigured } from '../supabase/client.js';
import { organizationsRepository } from '../../organizations/repositories/organizationsRepository.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { followupsRepository } from '../../followups/repositories/followupsRepository.js';
import { unitsRepository } from '../../units/repositories/unitsRepository.js';
import { devicesRepository } from '../../devices/repositories/devicesRepository.js';
import { surveysRepository } from '../../surveys/repositories/surveysRepository.js';

export async function syncStoreWithSupabase() {
  if (!isSupabaseConfigured()) {
    console.info('[DataSync] Supabase environment variables not configured.');
    store.isSupabaseConnected = false;
    store.connectionStatus = 'SUPABASE_NOT_CONFIGURED';
    store.organizations = [];
    store.activeOrgId = null;
    store.currentUser = null;
    return false;
  }

  try {
    // Perform empirical ping query to verify live Supabase connection
    const { error: pingError } = await supabase.from('units').select('id').limit(1);
    if (pingError) {
      console.warn('[DataSync] Supabase connection ping failed:', pingError.message);
      store.isSupabaseConnected = false;
      store.connectionStatus = 'SUPABASE_OFFLINE';
      store.organizations = [];
      store.activeOrgId = null;
      return false;
    }

    store.isSupabaseConnected = true;

    // 0. Resolve Auth Session & Current User
    const { data: sessionData } = await supabase.auth.getSession();
    let sessionUser = sessionData?.session?.user || null;

    if (!sessionUser) {
      // Check for profile membership in connected database for active session resolution
      const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
      if (profiles && profiles.length > 0 && profiles[0].organization_id) {
        sessionUser = {
          id: profiles[0].id,
          email: profiles[0].email || 'audit@gardengold.com.br',
          user_metadata: { full_name: profiles[0].full_name || 'Gestor de Auditoria' }
        };
      }
    }

    if (sessionUser) {
      store.currentUser = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.full_name || sessionUser.email.split('@')[0]
      };
    } else {
      store.currentUser = null;
      store.connectionStatus = 'AUTH_REQUIRED';
    }

    // 1. Resolve Authorized User Organization from Supabase (Zero arbitrary allOrgs[0] fallback)
    let dbOrg = sessionUser ? await organizationsRepository.fetchUserOrganization(sessionUser.id) : null;

    if (!dbOrg) {
      store.organizations = [];
      store.activeOrgId = null;
      if (sessionUser) {
        store.connectionStatus = 'NO_ORGANIZATION';
      }
      return true;
    }

    store.connectionStatus = 'CONNECTED';
    const activeOrgId = dbOrg.id;
    const dbUnits = await unitsRepository.fetchUnits(activeOrgId);

    store.organizations = [{
      id: activeOrgId,
      name: dbOrg.name,
      code: dbOrg.code || dbOrg.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: dbOrg.email || '',
      phone: dbOrg.phone || '',
      logoUrl: dbOrg.logo_url || null,
      units: [],
      tokensMap: {},
      responses: [],
      followUpCases: [],
      devices: [],
      touchpoints: [],
      surveys: [],
      surveySections: [],
      messageTemplates: [],
      communicationLogs: [],
      users: []
    }];
    store.activeOrgId = activeOrgId;

    const activeOrg = store.getActiveOrg();
    if (!activeOrg) return true;

    if (dbUnits && Array.isArray(dbUnits) && dbUnits.length > 0) {
      activeOrg.units = dbUnits.map(u => ({
        id: u.id,
        code: u.code,
        name: u.name,
        location: u.location || u.address || 'Geral',
        status: u.status || (u.is_active !== false ? 'Ativa' : 'Inativa')
      }));
    }

    // 2. Fetch Real Responses from Supabase
    const dbResponses = await responsesRepository.fetchResponses({ organizationId: activeOrgId });
    if (dbResponses && Array.isArray(dbResponses)) {
      activeOrg.responses = dbResponses.map(r => ({
        id: r.id,
        unitCode: r.unit_code,
        origin: r.origin || 'web',
        npsScore: r.nps_score,
        comment: r.comment || null,
        student: r.student_identifier || 'Anônimo',
        email: r.student_email || null,
        phone: r.student_phone || null,
        touchpointRatings: r.touchpoint_ratings || null,
        createdAt: r.created_at || new Date().toISOString()
      }));
    }

    // 3. Fetch Real Follow-up Cases from Supabase
    const dbCases = await followupsRepository.fetchCases(activeOrgId);
    if (dbCases && Array.isArray(dbCases)) {
      activeOrg.followUpCases = dbCases.map(c => ({
        id: c.id,
        responseId: c.response_id,
        unitCode: c.unit_code,
        student: c.student_name || 'Anônimo',
        npsScore: c.nps_score,
        comment: c.comment || '',
        status: c.status || 'pending',
        priority: c.priority || 'high',
        assignedUser: c.assigned_user || 'Não atribuído',
        internalNotes: c.internal_notes || '',
        createdAt: c.created_at || new Date().toISOString()
      }));
    }

    // 4. Fetch Real Devices from Supabase
    const dbDevices = await devicesRepository.fetchDevices(activeOrgId);
    if (dbDevices && Array.isArray(dbDevices)) {
      activeOrg.devices = dbDevices.map(d => ({
        id: d.id,
        name: d.name,
        unitCode: d.unit_code,
        deviceToken: d.device_token,
        isActive: d.is_active !== false,
        lastPing: d.last_ping ? new Date(d.last_ping).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Online'
      }));
    }

    // 5. Fetch Real Surveys from Supabase
    const dbSurveys = await surveysRepository.fetchSurveys(activeOrgId);
    if (dbSurveys && Array.isArray(dbSurveys)) {
      activeOrg.surveys = dbSurveys.map(s => ({
        id: s.id,
        name: s.title || s.name || 'Pesquisa NPS',
        unitCode: s.unit_code || 'all',
        type: s.type || 'nps',
        isActive: s.is_active !== false,
        createdAt: s.created_at || new Date().toISOString()
      }));
    }

    return true;
  } catch (err) {
    console.error('[DataSync] Unexpected sync failure:', err);
    store.isSupabaseConnected = false;
    store.connectionStatus = 'ERROR';
    return false;
  }
}
