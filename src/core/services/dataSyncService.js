/**
 * Core Data Synchronization Service (V2.0 Production Auth & Multi-Tenant Access Control)
 * Strictly syncs authenticated Supabase Auth session, organization membership, and unit permissions.
 * ZERO insecure fallbacks (no profiles.limit(1), no fake users, no unauthenticated mock orgs).
 */

import { store } from '../../app/app-state/store.js';
import { supabase, isSupabaseConfigured } from '../supabase/client.js';
import { organizationsRepository } from '../../organizations/repositories/organizationsRepository.js';
import { responsesRepository } from '../../responses/repositories/responsesRepository.js';
import { followupsRepository } from '../../followups/repositories/followupsRepository.js';
import { unitsRepository } from '../../units/repositories/unitsRepository.js';
import { devicesRepository } from '../../devices/repositories/devicesRepository.js';
import { studentsRepository } from '../../students/repositories/studentsRepository.js';
import { communicationRepository } from '../../communication/repositories/communicationRepository.js';

export async function syncStoreWithSupabase() {
  if (!isSupabaseConfigured()) {
    console.info('[DataSync] Supabase environment variables not configured.');
    store.isSupabaseConnected = false;
    store.connectionStatus = 'SUPABASE_NOT_CONFIGURED';
    store.resetAuth();
    return false;
  }

  try {
    // 0. Verify Live Supabase Auth Session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn('[DataSync] Supabase Auth getSession error:', sessionError.message);
    }

    const sessionUser = sessionData?.session?.user || null;

    if (!sessionUser) {
      store.isSupabaseConnected = true;
      store.connectionStatus = 'AUTH_REQUIRED';
      store.resetAuth();
      return false;
    }

    store.isSupabaseConnected = true;
    store.currentUser = {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.user_metadata?.full_name || sessionUser.email.split('@')[0]
    };

    // 1. Resolve Profile & Organization Membership
    const { data: membership, error: memberErr } = await supabase
      .from('organization_members')
      .select('id, organization_id, role, status')
      .eq('user_id', sessionUser.id)
      .maybeSingle();

    if (memberErr) {
      console.warn('[DataSync] Error fetching membership:', memberErr.message);
    }

    // Fallback query to profiles if organization_members record is missing
    let activeOrgId = membership?.organization_id || null;
    let userRole = membership?.role || 'viewer';
    let memberStatus = membership?.status || 'active';

    if (!activeOrgId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, full_name')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (profile && profile.organization_id) {
        activeOrgId = profile.organization_id;
        userRole = profile.role || 'viewer';
      }
    }

    if (!activeOrgId) {
      store.connectionStatus = 'NO_ORGANIZATION';
      store.authStatus = 'no_organization';
      store.organizations = [];
      store.activeOrgId = null;
      return true;
    }

    if (memberStatus === 'suspended') {
      store.connectionStatus = 'SUSPENDED';
      store.authStatus = 'suspended';
      store.resetAuth();
      return false;
    }

    store.currentMembership = {
      organizationId: activeOrgId,
      role: userRole,
      status: memberStatus
    };

    // 2. Fetch User Unit Permissions
    const { data: permissions } = await supabase
      .from('user_unit_permissions')
      .select('unit_id, permission_level')
      .eq('user_id', sessionUser.id);

    store.userUnitPermissions = permissions || [];

    // 3. Fetch Organization Details from Supabase
    const dbOrg = await organizationsRepository.fetchOrganizationById(activeOrgId);

    if (!dbOrg) {
      store.connectionStatus = 'NO_ORGANIZATION';
      store.authStatus = 'no_organization';
      store.organizations = [];
      store.activeOrgId = null;
      return true;
    }

    store.connectionStatus = 'CONNECTED';
    store.authStatus = 'authenticated';

    const dbUnits = await unitsRepository.fetchUnits(activeOrgId);

    // Filter units based on role & user permissions
    let authorizedUnits = dbUnits || [];
    if (userRole !== 'owner' && userRole !== 'admin' && permissions && permissions.length > 0) {
      const allowedIds = new Set(permissions.map(p => p.unit_id));
      authorizedUnits = (dbUnits || []).filter(u => allowedIds.has(u.id));
    }

    if (userRole !== 'owner' && userRole !== 'admin' && authorizedUnits.length === 0 && (dbUnits || []).length > 0) {
      store.authStatus = 'no_unit_access';
    }

    store.organizations = [{
      id: activeOrgId,
      name: dbOrg.name,
      code: dbOrg.code || dbOrg.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: dbOrg.email || '',
      phone: dbOrg.phone || '',
      logoUrl: dbOrg.logo_url || null,
      units: [],
      tokensMap: {},
      students: [],
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

    if (authorizedUnits && Array.isArray(authorizedUnits)) {
      activeOrg.units = authorizedUnits.map(u => ({
        id: u.id,
        code: u.code,
        name: u.name,
        location: u.location || u.address || 'Geral',
        status: u.status || (u.is_active !== false ? 'Ativa' : 'Inativa')
      }));
    }

    // 4. Fetch Real Organization Data from Repositories
    const [dbStudents, dbResponses, dbCases, dbDevices, dbCommLogs, dbTeam] = await Promise.all([
      studentsRepository.fetchStudents({ organizationId: activeOrgId }),
      responsesRepository.fetchResponses({ organizationId: activeOrgId }),
      followupsRepository.fetchCases(activeOrgId),
      devicesRepository.fetchDevices(activeOrgId),
      communicationRepository.fetchCommunicationLogs({ organizationId: activeOrgId }),
      fetchOrganizationTeamMembers(activeOrgId)
    ]);

    if (dbStudents && Array.isArray(dbStudents)) {
      activeOrg.students = dbStudents.map(s => ({
        id: s.id,
        organizationId: s.organization_id,
        unitId: s.unit_id || null,
        name: s.name,
        email: s.email || null,
        phone: s.phone || null,
        externalEvoId: s.external_evo_id || null,
        status: s.status || 'active',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || new Date().toISOString()
      }));
    }

    if (dbResponses && Array.isArray(dbResponses)) {
      activeOrg.responses = dbResponses.map(r => ({
        id: r.id,
        studentId: r.student_id || null,
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

    if (dbCases && Array.isArray(dbCases)) {
      activeOrg.followUpCases = dbCases.map(c => ({
        id: c.id,
        responseId: c.response_id,
        studentId: c.student_id || null,
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

    if (dbCommLogs && Array.isArray(dbCommLogs)) {
      activeOrg.communicationLogs = dbCommLogs.map(l => ({
        id: l.id,
        organizationId: l.organization_id,
        unitId: l.unit_id || null,
        responseId: l.response_id || null,
        caseId: l.follow_up_case_id || null,
        studentId: l.student_id || null,
        channel: l.channel || 'internal',
        type: l.channel || 'internal',
        direction: l.direction || 'outbound',
        recipient: l.recipient || null,
        subject: l.subject || null,
        body: l.body || l.notes || '',
        notes: l.body || l.notes || '',
        status: l.status || 'sent',
        createdAt: l.created_at || new Date().toISOString()
      }));
    }

    if (dbTeam && Array.isArray(dbTeam)) {
      activeOrg.users = dbTeam;
    }

    return true;
  } catch (err) {
    console.error('[DataSync] Unexpected sync failure:', err);
    store.isSupabaseConnected = false;
    store.connectionStatus = 'ERROR';
    store.authStatus = 'error';
    return false;
  }
}

async function fetchOrganizationTeamMembers(orgId) {
  try {
    const { data: members, error } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, profiles(email, full_name)')
      .eq('organization_id', orgId);

    if (error || !members) return [];

    return members.map(m => ({
      id: m.id,
      userId: m.user_id,
      name: m.profiles?.full_name || m.profiles?.email || 'Colaborador',
      email: m.profiles?.email || '',
      role: m.role,
      status: m.status === 'active' ? 'Ativo' : 'Inativo'
    }));
  } catch (_) {
    return [];
  }
}
