/**
 * Core Data Synchronization Service
 * Fetches real persistent data from Supabase repositories and populates the runtime Store in memory.
 */

import { store, DEFAULT_TOUCHPOINTS, DEFAULT_TEMPLATES } from '../../app/app-state/store.js';
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
    return false;
  }

  try {
    // Perform empirical ping query to verify live Supabase connection
    const { error: pingError } = await supabase.from('units').select('id').limit(1);
    if (pingError) {
      console.warn('[DataSync] Supabase connection ping failed:', pingError.message);
      store.isSupabaseConnected = false;
      return false;
    }

    store.isSupabaseConnected = true;

    // 0. Resolve Auth Session & Current User
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user || null;
    if (sessionUser) {
      store.currentUser = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.full_name || sessionUser.email.split('@')[0]
      };
    }

    // 1. Resolve User Organization & Units from Supabase
    let dbOrg = sessionUser ? await organizationsRepository.fetchUserOrganization(sessionUser.id) : null;
    if (!dbOrg) {
      const allOrgs = await organizationsRepository.fetchOrganizations();
      if (allOrgs && allOrgs.length > 0) dbOrg = allOrgs[0];
    }

    const dbUnits = await unitsRepository.fetchUnits(dbOrg?.id || null);

    const activeOrgId = dbOrg?.id || (dbUnits && dbUnits[0]?.organization_id) || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const activeOrgName = dbOrg?.name || 'Garden Gold Academia';

    store.organizations = [{
      id: activeOrgId,
      name: activeOrgName,
      code: dbOrg?.code || 'gardengold',
      email: dbOrg?.email || 'contato@gardengold.com.br',
      phone: dbOrg?.phone || '',
      logoUrl: dbOrg?.logo_url || null,
      units: [],
      tokensMap: {},
      responses: [],
      followUpCases: [],
      devices: [],
      touchpoints: [...DEFAULT_TOUCHPOINTS],
      surveys: [],
      surveySections: [],
      messageTemplates: [...DEFAULT_TEMPLATES],
      communicationLogs: [],
      users: []
    }];
    store.activeOrgId = activeOrgId;

    const activeOrg = store.getActiveOrg();

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
        deviceToken: d.device_token,
        status: d.status === 'active' ? 'Online' : 'Offline',
        unitCode: d.unit_code || 'unidade-a',
        lastSeenAt: d.updated_at || d.created_at
      }));
    }

    // 5. Fetch Real Surveys from Supabase
    const dbSurveys = await surveysRepository.fetchSurveys(activeOrgId);
    if (dbSurveys && Array.isArray(dbSurveys)) {
      activeOrg.surveys = dbSurveys.map(s => ({
        id: s.id,
        name: s.name,
        unitCode: s.unit_code || 'all',
        type: s.type || 'nps',
        isActive: s.is_active !== false,
        createdAt: s.created_at
      }));
    }

    return true;
  } catch (err) {
    console.warn('[DataSync] Warning during Supabase synchronization:', err);
    store.isSupabaseConnected = false;
    return false;
  }
}

