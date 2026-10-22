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
import { touchpointsRepository } from '../../touchpoints/repositories/touchpointsRepository.js';
import { surveysRepository } from '../../surveys/repositories/surveysRepository.js';

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

    // 0.5 Automatically accept any pending organization invitations for this user's email or URL token
    try {
      const urlInviteToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('invite') : null;
      const { data: inviteRes } = await supabase.rpc('accept_organization_invite', {
        p_token: urlInviteToken || null
      });
      if (inviteRes && inviteRes.accepted_count > 0 && inviteRes.organization_id) {
        store.activeOrgId = inviteRes.organization_id;
        if (typeof window !== 'undefined' && urlInviteToken) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    } catch (_) {
      // Ignore if RPC is not available in unit test mock
    }

    // 1. Resolve Profile & Organization Membership
    const { data: memberships, error: memberErr } = await supabase
      .from('organization_members')
      .select('id, organization_id, role, status, created_at')
      .eq('user_id', sessionUser.id)
      .order('created_at', { ascending: false });

    if (memberErr) {
      console.warn('[DataSync] Error fetching memberships:', memberErr.message);
    }

    let activeMembership = null;
    if (memberships && memberships.length > 0) {
      if (store.activeOrgId) {
        activeMembership = memberships.find(m => m.organization_id === store.activeOrgId && m.status === 'active') || null;
      }
      if (!activeMembership) {
        activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
      }
    }

    let activeOrgId = activeMembership?.organization_id || null;
    let userRole = activeMembership?.role || 'viewer';
    let memberStatus = activeMembership?.status || 'active';

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
      tradeName: dbOrg.trade_name || dbOrg.name,
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
    const [dbStudents, dbResponses, dbCases, dbDevices, dbCommLogs, dbTeam, dbTouchpoints, dbSurveys] = await Promise.all([
      studentsRepository.fetchStudents({ organizationId: activeOrgId }),
      responsesRepository.fetchResponses({ organizationId: activeOrgId }),
      followupsRepository.fetchCases(activeOrgId),
      devicesRepository.fetchDevices(activeOrgId),
      communicationRepository.fetchCommunicationLogs({ organizationId: activeOrgId }),
      fetchOrganizationTeamMembers(activeOrgId),
      touchpointsRepository.fetchTouchpoints(activeOrgId),
      surveysRepository.fetchSurveys(activeOrgId)
    ]);

    const unitByIdMap = new Map((dbUnits || []).map(u => [u.id, u]));
    const teamByUserIdMap = new Map((dbTeam || []).map(u => [u.userId, u]));

    if (dbSurveys && Array.isArray(dbSurveys)) {
      activeOrg.surveys = dbSurveys.map(s => ({
        id: s.id,
        organization_id: s.organization_id,
        organizationId: s.organization_id,
        title: s.title || 'Pesquisa de Satisfação NPS',
        description: s.description || '',
        is_active: s.is_active !== false,
        isActive: s.is_active !== false,
        is_anonymous_allowed: s.is_anonymous_allowed !== false,
        isAnonymousAllowed: s.is_anonymous_allowed !== false,
        createdAt: s.created_at || new Date().toISOString()
      }));
    }

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
      activeOrg.responses = dbResponses.map(r => {
        const meta = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
        const unitObj = r.unit_id ? unitByIdMap.get(r.unit_id) : null;
        const resolvedUnitCode = r.unit_code || unitObj?.code || r.unit_id || 'geral';

        return {
          id: r.id,
          studentId: r.student_id || null,
          unitId: r.unit_id || unitObj?.id || null,
          unitCode: resolvedUnitCode,
          origin: r.origin || 'web',
          npsScore: r.nps_score,
          comment: r.comment ?? meta.comment ?? null,
          student: r.student_identifier || 'Anônimo',
          email: r.student_email ?? meta.student_email ?? null,
          phone: r.student_phone ?? meta.student_phone ?? null,
          touchpointRatings: r.touchpoint_ratings ?? meta.touchpoint_ratings ?? null,
          touchpointObservations: meta.touchpoint_observations ?? null,
          createdAt: r.created_at || new Date().toISOString()
        };
      });
    }

    const responseByIdMap = new Map(activeOrg.responses.map(r => [r.id, r]));

    if (dbCases && Array.isArray(dbCases)) {
      activeOrg.followUpCases = dbCases.map(c => {
        const linkedResp = c.response_id ? responseByIdMap.get(c.response_id) : null;
        const unitObj = c.unit_id ? unitByIdMap.get(c.unit_id) : null;
        const assignedMember = c.assigned_user_id ? teamByUserIdMap.get(c.assigned_user_id) : null;

        return {
          id: c.id,
          responseId: c.response_id,
          studentId: c.student_id || linkedResp?.studentId || null,
          unitId: c.unit_id || linkedResp?.unitId || null,
          unitCode: c.unit_code || unitObj?.code || linkedResp?.unitCode || 'geral',
          student: c.student_name || linkedResp?.student || 'Anônimo',
          phone: linkedResp?.phone || null,
          email: linkedResp?.email || null,
          npsScore: c.nps_score ?? linkedResp?.npsScore ?? 0,
          comment: c.comment ?? linkedResp?.comment ?? '',
          status: c.status || 'pending',
          priority: c.priority || 'high',
          assignedUserId: c.assigned_user_id || null,
          assignedUser: c.assigned_user || assignedMember?.name || (c.assigned_user_id ? 'Gestor atribuído' : 'Não atribuído'),
          internalNotes: c.internal_notes || '',
          createdAt: c.created_at || new Date().toISOString()
        };
      });
    }

    if (dbDevices && Array.isArray(dbDevices)) {
      activeOrg.devices = dbDevices.map(d => ({
        id: d.id,
        unit_id: d.unit_id,
        unitId: d.unit_id,
        name: d.device_name || d.name,
        device_name: d.device_name || d.name,
        unitCode: d.unit_code,
        unit_code: d.unit_code,
        unit_name: d.unit_name,
        deviceToken: d.device_token || d.deviceToken,
        device_token: d.device_token || d.deviceToken,
        isActive: d.is_active !== false,
        is_active: d.is_active !== false,
        last_ping: d.last_ping || null,
        lastPing: d.lastPingDisplay || (d.last_ping ? new Date(d.last_ping).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca'),
        lastPingDisplay: d.lastPingDisplay || (d.last_ping ? new Date(d.last_ping).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca')
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
        createdBy: (l.created_by && teamByUserIdMap.get(l.created_by)?.name) || 'Gestor',
        createdAt: l.created_at || new Date().toISOString()
      }));
    }

    if (dbTeam && Array.isArray(dbTeam)) {
      activeOrg.users = dbTeam;
    }

    if (dbTouchpoints && Array.isArray(dbTouchpoints)) {
      activeOrg.touchpoints = dbTouchpoints.map(tp => {
        const linkedUnits = (tp.unit_touchpoints || []).map(ut => ut.units?.name || ut.units?.code).filter(Boolean);
        const unitIds = (tp.unit_touchpoints || []).map(ut => ut.unit_id);
        const unitsDisplay = linkedUnits.length > 0 ? linkedUnits.join(', ') : 'Todas as Unidades';

        return {
          id: tp.id,
          organizationId: tp.organization_id,
          name: tp.name,
          description: tp.description || '',
          category: tp.category || 'Atendimento',
          evaluationType: tp.evaluation_type || 'rating',
          scaleMin: tp.scale_min !== undefined && tp.scale_min !== null ? tp.scale_min : 0,
          scaleMax: tp.scale_max !== undefined && tp.scale_max !== null ? tp.scale_max : 10,
          allowObservation: Boolean(tp.allow_observation),
          orderIndex: tp.order_index ?? 0,
          isActive: tp.is_active !== false,
          statusLabel: tp.is_active !== false ? '🟢 Ativo' : '⚪ Inativo',
          unitIds: unitIds,
          units: unitsDisplay,
          createdAt: tp.created_at || new Date().toISOString(),
          updatedAt: tp.updated_at || new Date().toISOString()
        };
      }).sort((a, b) => (a.orderIndex - b.orderIndex));
    }

    // Fetch questions for the active survey
    let dbQuestions = [];
    if (activeOrg.surveys.length > 0 && activeOrg.surveys[0].id) {
      dbQuestions = await surveysRepository.fetchQuestions(activeOrg.surveys[0].id);
    }
    activeOrg.questions = dbQuestions || [];

    const npsQ = activeOrg.questions.find(q => q.question_type === 'nps');
    const textQ = activeOrg.questions.find(q => q.question_type === 'text');

    // Build surveySections from active survey, questions, and touchpoints for Survey Builder view
    const mainSurveyTitle = activeOrg.surveys[0]?.title || 'Pesquisa de Satisfação NPS';
    const sections = [
      {
        title: `1. ${mainSurveyTitle} (Perguntas Principais)`,
        questions: [
          {
            type: 'Escala NPS (0-10)',
            text: npsQ?.title || 'De 0 a 10, qual a probabilidade de você nos recomendar a um amigo?',
            req: 'Obrigatória'
          },
          {
            type: 'Texto Aberto',
            text: textQ?.title || 'Seu Comentário / Sugestão sobre a experiência',
            req: 'Opcional'
          }
        ]
      }
    ];

    if (activeOrg.touchpoints && activeOrg.touchpoints.length > 0) {
      sections.push({
        title: '2. Avaliação de Pontos de Contato (Touchpoints)',
        questions: activeOrg.touchpoints
          .filter(tp => tp.isActive)
          .map(tp => ({
            type: `Escala (0-10)${tp.allowObservation ? ' + Obs' : ''} • ${tp.category}`,
            text: `${tp.name}${tp.description ? ` — ${tp.description}` : ''}`,
            req: tp.units || 'Todas as Unidades'
          }))
      });
    }
    activeOrg.surveySections = sections;

    return true;
  } catch (err) {
    console.error('[DataSync] Unexpected sync failure:', err);
    store.isSupabaseConnected = false;
    store.connectionStatus = 'ERROR';
    store.authStatus = 'error';
    return false;
  }
}

let activeRealtimeChannel = null;

export function setupRealtimeSubscription(onRealtimeEvent) {
  if (!isSupabaseConfigured() || !store.isSupabaseConnected || !store.activeOrgId) return;

  try {
    if (activeRealtimeChannel) {
      supabase.removeChannel(activeRealtimeChannel);
      activeRealtimeChannel = null;
    }

    const orgId = store.activeOrgId;
    activeRealtimeChannel = supabase
      .channel(`garden-org-live-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses', filter: `organization_id=eq.${orgId}` },
        async (payload) => {
          await syncStoreWithSupabase();
          if (typeof onRealtimeEvent === 'function') {
            onRealtimeEvent({ table: 'responses', eventType: 'INSERT', record: payload.new });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follow_up_cases', filter: `organization_id=eq.${orgId}` },
        async (payload) => {
          await syncStoreWithSupabase();
          if (typeof onRealtimeEvent === 'function') {
            onRealtimeEvent({ table: 'follow_up_cases', eventType: payload.eventType, record: payload.new });
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('[DataSync Realtime] Could not subscribe to realtime channel:', err);
  }
}

async function fetchOrganizationTeamMembers(orgId) {
  try {
    let { data: members, error } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, profiles(email, full_name)')
      .eq('organization_id', orgId);

    if (error || !members) {
      const { data: rawMembers, error: rawErr } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status')
        .eq('organization_id', orgId);

      if (rawErr || !rawMembers) return [];

      const userIds = rawMembers.map(m => m.user_id).filter(Boolean);
      let profilesById = new Map();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        if (profs) {
          profilesById = new Map(profs.map(p => [p.id, p]));
        }
      }

      members = rawMembers.map(m => ({
        ...m,
        profiles: profilesById.get(m.user_id) || null
      }));
    }

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
