/**
 * Core Data Synchronization Service
 * Fetches real persistent data from Supabase repositories and populates the runtime Store in memory.
 */

import { store } from '../../app/app-state/store.js';
import { isSupabaseConfigured } from '../supabase/client.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { followupsRepository } from '../../followups/repositories/followupsRepository.js';
import { unitsRepository } from '../../units/repositories/unitsRepository.js';
import { devicesRepository } from '../../devices/repositories/devicesRepository.js';
import { surveysRepository } from '../../surveys/repositories/surveysRepository.js';

export async function syncStoreWithSupabase() {
  if (!isSupabaseConfigured()) {
    console.info('[DataSync] Supabase is not fully configured. Operating on local state memory.');
    return false;
  }

  try {
    const activeOrg = store.getActiveOrg();
    const orgId = activeOrg ? activeOrg.id : null;

    // 1. Fetch Real Units from Supabase
    const dbUnits = await unitsRepository.fetchUnits(orgId);
    if (dbUnits && Array.isArray(dbUnits) && dbUnits.length > 0) {
      activeOrg.units = dbUnits.map(u => ({
        id: u.id,
        code: u.code,
        name: u.name,
        location: u.location || 'Geral',
        status: u.status || 'Ativa'
      }));
    }

    // 2. Fetch Real Responses from Supabase
    const dbResponses = await responsesRepository.fetchResponses({ organizationId: orgId });
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
    const dbCases = await followupsRepository.fetchCases(orgId);
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
    const dbDevices = await devicesRepository.fetchDevices(orgId);
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
    const dbSurveys = await surveysRepository.fetchSurveys(orgId);
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
    return false;
  }
}
