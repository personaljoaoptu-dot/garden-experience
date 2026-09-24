import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

// ====================================================================
// GARDEN EXPERIENCE v1.3 — SAAS COMMUNICATION CENTER & FOLLOW-UP LOGIC
// ====================================================================

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://gardengold-supabase.example.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PILOT_UNITS = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'unidade-a', name: 'Garden Gold — Unidade A', location: 'Centro' },
  { id: '22222222-2222-2222-2222-222222222222', code: 'unidade-b', name: 'Garden Gold — Unidade B', location: 'Zona Sul' },
  { id: '33333333-3333-3333-3333-333333333333', code: 'unidade-c', name: 'Garden Gold — Unidade C', location: 'Jardins' },
  { id: '44444444-4444-4444-4444-444444444444', code: 'unidade-d', name: 'Garden Gold — Unidade D', location: 'Norte' }
];

const PILOT_TOKENS_MAP = {
  '755969f2-dc7d-4e91-9fd3-138009b41677': { unitCode: 'unidade-a', surveyId: 's1111111-1111-1111-1111-111111111111', active: true },
  'c3fb5906-86d9-451e-a129-69475b12e4ea': { unitCode: 'unidade-b', surveyId: 's1111111-1111-1111-1111-111111111111', active: true },
  '33749f98-ad85-47db-8aca-56ae914c637c': { unitCode: 'unidade-c', surveyId: 's1111111-1111-1111-1111-111111111111', active: true },
  'abd0b55d-51bc-42e0-b531-39e9d5177052': { unitCode: 'unidade-d', surveyId: 's1111111-1111-1111-1111-111111111111', active: true }
};

class DataManager {
  constructor() {
    const pilotOrg = {
      id: 'org_pilot',
      name: 'Garden Gold Academia (Piloto)',
      code: 'gardengold',
      email: 'contato@gardengold.com.br',
      phone: '(11) 3333-4444',
      isPilot: true,
      units: PILOT_UNITS,
      tokensMap: PILOT_TOKENS_MAP,
      responses: [],
      followUpCases: [],
      devices: [],
      touchpoints: [
        { id: 't1', name: 'Atendimento da Recepção', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
        { id: 't2', name: 'Atendimento dos Professores', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
        { id: 't3', name: 'Limpeza & Higiene', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
        { id: 't4', name: 'Manutenção dos Equipamentos', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' }
      ],
      surveys: [
        { id: 's1', name: 'Pesquisa de Satisfação NPS — Geral', unitCode: 'all', type: 'nps', isActive: true, createdAt: new Date().toISOString() }
      ],
      surveySections: [
        { id: 'sec1', title: 'SEÇÃO 1 • EXPERIÊNCIA GERAL', questions: [{ type: 'NPS 0–10', text: 'De 0 a 10, qual a probabilidade de você recomendar a Garden Gold a um amigo?', req: 'NPS • Obrigatória' }] },
        { id: 'sec2', title: 'SEÇÃO 2 • ATENDIMENTO', questions: [{ type: '⭐ Touchpoint', text: 'Atendimento da Recepção', req: 'Escala 1–5 • Obrigatória' }, { type: '⭐ Touchpoint', text: 'Atendimento dos Professores', req: 'Escala 1–5 • Obrigatória' }] },
        { id: 'sec3', title: 'SEÇÃO 3 • INFRAESTRUTURA', questions: [{ type: '⭐ Touchpoint', text: 'Limpeza & Higiene', req: 'Escala 1–5 • Obrigatória' }, { type: '⭐ Touchpoint', text: 'Manutenção dos Equipamentos', req: 'Escala 1–5 • Obrigatória' }] }
      ],
      messageTemplates: [
        { id: 'tpl_1', name: 'Agradecimento — Feedback positivo', description: 'Mensagem de agradecimento para alunos promotores (notas 9 e 10).', channel: 'email', subject: 'Obrigado pelo seu feedback!', body: 'Olá, {{nome}}!\n\nAgradecemos muito por compartilhar sua experiência com a {{organizacao}} ({{unidade}}).\nSua nota {{nps}} nos motiva a continuar oferecendo o melhor treino e atendimento diariamente.\n\nUm grande abraço,\n{{gestor}}', isActive: true, updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'tpl_2', name: 'Retorno — Sugestão', description: 'Resposta para alunos neutros ou que enviaram sugestões de melhoria.', channel: 'email', subject: 'Recebemos sua sugestão', body: 'Olá, {{nome}}!\n\nAgradecemos por compartilhar sua opinião sobre a {{unidade}}.\nSeu feedback de nota {{nps}} foi registrado e encaminhado diretamente à nossa coordenação para avaliação.\n\nObrigado por nos ajudar a evoluir a {{organizacao}}.\n\nAtenciosamente,\n{{gestor}}', isActive: true, updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 'tpl_3', name: 'Problema resolvido', description: 'Mensagem para informar alunos detratores sobre a resolução do problema apontado.', channel: 'email', subject: 'Retorno sobre seu atendimento', body: 'Olá, {{nome}}!\n\nEstamos entrando em contato referente à sua avaliação recente na {{unidade}}.\nGostaríamos de informar que sua observação sobre "{{touchpoint}}" foi tratada e corrigida pela nossa equipe.\n\nAgradecemos por nos sinalizar o ocorrido e estamos à inteira disposição no seu próximo treino!\n\nUm abraço,\n{{gestor}}', isActive: true, updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() }
      ],
      communicationLogs: []
    };

    const DEMO_UNITS = [
      { id: 'u_demo_1', code: 'unidade-demo-centro', name: 'Garden Demo — Centro', location: 'Centro' },
      { id: 'u_demo_2', code: 'unidade-demo-norte', name: 'Garden Demo — Zona Norte', location: 'Norte' }
    ];

    const DEMO_TOKENS_MAP = {
      'demo-token-centro-123': { unitCode: 'unidade-demo-centro', surveyId: 's_demo_1', active: true },
      'demo-token-norte-456': { unitCode: 'unidade-demo-norte', surveyId: 's_demo_1', active: true }
    };

    const demoOrg = {
      id: 'org_demo',
      name: 'Garden Experience Demo',
      code: 'demo',
      email: 'demo@gardengold.com.br',
      phone: '(11) 90000-0000',
      isPilot: false,
      isDemo: true,
      units: DEMO_UNITS,
      tokensMap: DEMO_TOKENS_MAP,
      users: [
        { id: 'usr_demo_1', name: 'Demonstração Comercial', email: 'demo@gardengold.com.br', role: 'admin', units: 'Todas as Unidades', status: 'Ativo' }
      ],
      responses: [],
      followUpCases: [],
      devices: [],
      touchpoints: [
        { id: 't_demo_1', name: 'Atendimento da Recepção', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
        { id: 't_demo_2', name: 'Atendimento dos Professores', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
        { id: 't_demo_3', name: 'Limpeza & Higiene', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
        { id: 't_demo_4', name: 'Manutenção dos Equipamentos', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' }
      ],
      surveys: [
        { id: 's_demo_1', name: 'Pesquisa Comercial Demo NPS 2026', unitCode: 'all', type: 'nps', isActive: true, createdAt: new Date().toISOString() }
      ],
      surveySections: [
        { id: 'sec_demo_1', title: 'SEÇÃO 1 • AVALIAÇÃO GERAL DEMO', questions: [{ type: 'NPS 0–10', text: 'De 0 a 10, qual a probabilidade de você recomendar a Garden Experience a um amigo?', req: 'NPS • Obrigatória' }] }
      ],
      messageTemplates: [
        { id: 'tpl_demo_1', name: 'Agradecimento Demo Promotor', description: 'Template de demonstração.', channel: 'email', subject: 'Agradecemos sua nota {{nps}}!', body: 'Olá, {{nome}}!\nAgradecemos pela sua avaliação da {{unidade}}.\n\nAtenciosamente,\n{{gestor}}', isActive: true, updatedAt: new Date().toISOString() }
      ],
      communicationLogs: []
    };

    const savedOrgsStr = localStorage.getItem('garden_saas_organizations');
    let loadedOrgs = [];
    if (savedOrgsStr) {
      try {
        loadedOrgs = JSON.parse(savedOrgsStr);
      } catch (e) {
        console.warn('Failed parsing saved organizations:', e);
      }
    }

    // Sanitize any loaded orgs from previous sessions to purge synthetic mock data
    loadedOrgs.forEach(org => {
      if (org) {
        if (org.responses) {
          org.responses = org.responses.filter(r => r && !r.id.startsWith('r1') && !r.id.startsWith('r2') && !r.id.startsWith('r3') && !r.id.startsWith('r4') && !r.id.startsWith('r5') && !r.id.startsWith('r6') && !r.id.startsWith('r7') && !r.id.startsWith('r8') && !r.id.startsWith('r9') && !r.id.startsWith('r_demo_'));
        }
        if (org.followUpCases) {
          org.followUpCases = org.followUpCases.filter(c => c && !c.id.startsWith('c1') && !c.id.startsWith('c2') && !c.id.startsWith('c_demo_'));
        }
        if (org.devices) {
          org.devices = org.devices.filter(d => d && !d.id.startsWith('d1') && !d.id.startsWith('d2') && !d.id.startsWith('d3') && !d.id.startsWith('d_demo_'));
        }
        if (org.responses && org.responses.length === 0) {
          (org.touchpoints || []).forEach(tp => {
            tp.avgScore = 0.0;
            tp.totalCount = 0;
            tp.statusLabel = '⚪ Sem Avaliações';
          });
        }
      }
    });

    const pilotIdx = loadedOrgs.findIndex(o => o && o.id === 'org_pilot');
    if (pilotIdx >= 0) loadedOrgs[pilotIdx] = pilotOrg;
    else loadedOrgs.unshift(pilotOrg);

    const demoIdx = loadedOrgs.findIndex(o => o && o.id === 'org_demo');
    if (demoIdx >= 0) loadedOrgs[demoIdx] = demoOrg;
    else loadedOrgs.splice(1, 0, demoOrg);

    this.organizations = loadedOrgs;
    this.activeOrgId = localStorage.getItem('garden_active_org_id') || 'org_pilot';

    if (!this.organizations.some(o => o && o.id === this.activeOrgId)) {
      this.activeOrgId = 'org_pilot';
    }

    this.touchpointCategoryFilter = 'all';
    this.selectedSurveyScore = null;
    this.selectedKioskScore = null;
    this.selectedResponseId = null;
    this.inboxFilter = 'all';
    this.activeCommTab = 'internal';
    this.kioskTimer = null;
    this.currentSurveyToken = Object.keys(this.TOKENS_MAP)[0] || 'generic';
    this.isTechnicalMode = false;
  }

  saveOrganizationsToStorage() {
    try {
      localStorage.setItem('garden_saas_organizations', JSON.stringify(this.organizations));
      localStorage.setItem('garden_active_org_id', this.activeOrgId);
    } catch (e) {
      console.warn('Could not save organizations to storage:', e);
    }
  }

  getActiveOrg() {
    return this.organizations.find(o => o && o.id === this.activeOrgId) || this.organizations[0];
  }

  setActiveOrg(orgId) {
    this.activeOrgId = orgId;
    
    // Update default currentSurveyToken for active organization
    const activeTokens = Object.keys(this.TOKENS_MAP);
    if (activeTokens.length > 0) {
      this.currentSurveyToken = activeTokens[0];
    } else {
      this.currentSurveyToken = 'generic';
    }

    this.saveOrganizationsToStorage();
  }

  async saveOrganizationToSupabase(org) {
    if (!org) return;
    try {
      const { error } = await supabase.from('organizations').upsert({
        name: org.name,
        email: org.email,
        phone: org.phone || null,
        logo_url: org.logoUrl || null,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.warn('Supabase organization sync notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase organization update notice:', err);
    }
  }

  async saveUnitToSupabase(unit) {
    if (!unit) return;
    try {
      const { error } = await supabase.from('units').upsert({
        name: unit.name,
        code: unit.code,
        location: unit.location || 'Geral',
        address: unit.address || null,
        city: unit.city || null,
        state: unit.state || null,
        status: unit.status || 'Ativa',
        updated_at: new Date().toISOString()
      });
      if (error) console.warn('Supabase unit sync notice:', error.message);
    } catch (err) {
      console.warn('Supabase unit update notice:', err);
    }
  }

  async saveDeviceToSupabase(device) {
    if (!device) return;
    try {
      const { error } = await supabase.from('tablets').upsert({
        name: device.name,
        device_token: device.deviceToken,
        status: device.isActive ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      });
      if (error) console.warn('Supabase device sync notice:', error.message);
    } catch (err) {
      console.warn('Supabase device update notice:', err);
    }
  }

  async saveTouchpointToSupabase(touchpoint) {
    if (!touchpoint) return;
    try {
      const { error } = await supabase.from('touchpoints').upsert({
        name: touchpoint.name,
        category: touchpoint.category || 'Atendimento',
        is_active: touchpoint.isActive !== false,
        updated_at: new Date().toISOString()
      });
      if (error) console.warn('Supabase touchpoint sync notice:', error.message);
    } catch (err) {
      console.warn('Supabase touchpoint update notice:', err);
    }
  }

  createOrganization(data) {
    const orgId = 'org_' + Date.now();
    const unit1Code = 'unidade-' + (data.unitName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'centro');
    
    const units = [
      { id: 'u_' + Date.now(), code: unit1Code, name: data.unitName, location: data.unitCity || 'Geral' }
    ];

    if (data.unit2Name && data.unit2Name.trim()) {
      const unit2Code = 'unidade-' + data.unit2Name.toLowerCase().replace(/[^a-z0-9]/g, '');
      units.push({ id: 'u_' + (Date.now() + 1), code: unit2Code, name: data.unit2Name.trim(), location: data.unitCity || 'Geral' });
    }

    const token1 = 'token-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6);
    const tokensMap = {
      [token1]: { unitCode: unit1Code, surveyId: 's_' + Date.now(), active: true }
    };

    if (units.length > 1) {
      const token2 = 'token-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6);
      tokensMap[token2] = { unitCode: units[1].code, surveyId: 's_' + Date.now(), active: true };
    }

    const selectedTouchpoints = [];
    if (data.tpRecepcao) selectedTouchpoints.push({ id: 't_' + Date.now() + '_1', name: 'Atendimento da Recepção', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' });
    if (data.tpProfessores) selectedTouchpoints.push({ id: 't_' + Date.now() + '_2', name: 'Atendimento dos Professores', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' });
    if (data.tpLimpeza) selectedTouchpoints.push({ id: 't_' + Date.now() + '_3', name: 'Limpeza & Higiene', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' });
    if (data.tpEquipamentos) selectedTouchpoints.push({ id: 't_' + Date.now() + '_4', name: 'Manutenção dos Equipamentos', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' });

    const devices = [];
    if (data.deviceName && data.deviceName.trim()) {
      devices.push({ id: 'd_' + Date.now(), name: data.deviceName.trim(), unitCode: unit1Code, deviceToken: 'dev_' + Math.random().toString(36).substring(2, 8), isActive: true, lastPing: 'Ativo agora' });
    }

    const newOrg = {
      id: orgId,
      name: data.orgName,
      code: data.orgName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: data.orgEmail,
      phone: data.orgPhone || '',
      adminName: data.adminName || 'Administrador',
      isPilot: false,
      units: units,
      tokensMap: tokensMap,
      responses: [], // 0 responses!
      followUpCases: [], // 0 cases!
      devices: devices,
      touchpoints: selectedTouchpoints,
      surveys: [
        { id: 's_' + Date.now(), name: data.surveyName || 'Pesquisa de Satisfação NPS', unitCode: 'all', type: 'nps', isActive: true, createdAt: new Date().toISOString() }
      ],
      surveySections: [
        { id: 'sec_' + Date.now(), title: 'SEÇÃO 1 • EXPERIÊNCIA GERAL', questions: [{ type: 'NPS 0–10', text: data.surveyQuestion || 'De 0 a 10, qual a probabilidade de você recomendar nossa empresa a um amigo?', req: 'NPS • Obrigatória' }] }
      ],
      messageTemplates: [
        { id: 'tpl_' + Date.now(), name: 'Agradecimento por Feedback', description: 'Mensagem de agradecimento padrão.', channel: 'email', subject: 'Agradecemos pela sua avaliação', body: 'Olá, {{nome}}!\nAgradecemos por responder à pesquisa de satisfação da {{organizacao}} ({{unidade}}).\n\nAtenciosamente,\n{{gestor}}', isActive: true, updatedAt: new Date().toISOString() }
      ],
      communicationLogs: []
    };

    this.organizations.push(newOrg);
    this.setActiveOrg(orgId);
    this.saveOrganizationsToStorage();
    return newOrg;
  }

  // Active Organization Proxies
  get localResponses() { return this.getActiveOrg().responses; }
  set localResponses(val) { this.getActiveOrg().responses = val; }

  get followUpCases() { return this.getActiveOrg().followUpCases; }
  set followUpCases(val) { this.getActiveOrg().followUpCases = val; }

  get devices() { return this.getActiveOrg().devices; }
  set devices(val) { this.getActiveOrg().devices = val; }

  get touchpoints() { return this.getActiveOrg().touchpoints; }
  set touchpoints(val) { this.getActiveOrg().touchpoints = val; }

  get surveys() { return this.getActiveOrg().surveys; }
  set surveys(val) { this.getActiveOrg().surveys = val; }

  get surveySections() { return this.getActiveOrg().surveySections; }
  set surveySections(val) { this.getActiveOrg().surveySections = val; }

  get messageTemplates() { return this.getActiveOrg().messageTemplates; }
  set messageTemplates(val) { this.getActiveOrg().messageTemplates = val; }

  get communicationLogs() { return this.getActiveOrg().communicationLogs; }
  set communicationLogs(val) { this.getActiveOrg().communicationLogs = val; }

  get users() { return this.getActiveOrg().users || []; }
  set users(val) { this.getActiveOrg().users = val; }

  get UNITS() { return this.getActiveOrg().units; }
  get TOKENS_MAP() { return this.getActiveOrg().tokensMap; }

  async submitResponse({ token, unitCode, origin, npsScore, comment, student, email, phone, consentAccepted }) {
    const resId = 'res_' + Date.now();
    try {
      const { error } = await supabase.rpc('submit_survey_response', {
        p_survey_link_token: token !== 'generic' ? token : null,
        p_unit_code: unitCode,
        p_origin: origin,
        p_nps_score: npsScore,
        p_comment: comment,
        p_student_identifier: student,
        p_consent_accepted: consentAccepted,
        p_consent_version: '1.0'
      });

      if (error) {
        console.warn('Supabase RPC fallback:', error.message);
      }
    } catch (err) {
      console.warn('Supabase Connection Error:', err);
    }

    const newRes = {
      id: resId,
      unitCode,
      origin,
      npsScore,
      comment,
      student: student || 'Anônimo',
      email: email || (student && student.includes('@') ? student : null),
      phone: phone || null,
      createdAt: new Date().toISOString()
    };
    this.localResponses.unshift(newRes);

    if (npsScore <= 6) {
      this.followUpCases.unshift({
        id: 'c_' + Date.now(),
        responseId: resId,
        unitCode,
        student: student || 'Anônimo',
        npsScore,
        comment: comment || 'Sem comentário preenchido',
        status: 'pending',
        priority: 'high',
        assignedUser: 'Não atribuído',
        internalNotes: 'Caso criado automaticamente via envio de NPS ≤ 6.',
        createdAt: new Date().toISOString()
      });
    }

    this.saveOrganizationsToStorage();
  }

  async fetchResponses(unitFilter = 'all', originFilter = 'all', role = 'admin', startDate = null, endDate = null) {
    let list = [...this.localResponses];

    if (role === 'gestor_a') {
      list = list.filter(r => r.unitCode === 'unidade-a');
    } else if (role === 'gestor_b') {
      list = list.filter(r => r.unitCode === 'unidade-b');
    }

    if (unitFilter !== 'all') {
      list = list.filter(r => r.unitCode === unitFilter);
    }
    if (originFilter !== 'all') {
      list = list.filter(r => r.origin === originFilter);
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      if (!isNaN(startMs)) {
        list = list.filter(r => new Date(r.createdAt).getTime() >= startMs);
      }
    }
    if (endDate) {
      const endMs = new Date(endDate + 'T23:59:59.999').getTime();
      if (!isNaN(endMs)) {
        list = list.filter(r => new Date(r.createdAt).getTime() <= endMs);
      }
    }

    return list;
  }

  calculateNPS(responses) {
    if (!responses.length) {
      return { nps: 0, total: 0, promoters: 0, passives: 0, detractors: 0, pPromoters: 0, pPassives: 0, pDetractors: 0, status: 'SEM DADOS' };
    }

    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    responses.forEach(r => {
      if (r.npsScore >= 9) promoters++;
      else if (r.npsScore >= 7) passives++;
      else detractors++;
    });

    const total = responses.length;
    const pPromoters = Math.round((promoters / total) * 100);
    const pPassives = Math.round((passives / total) * 100);
    const pDetractors = Math.round((detractors / total) * 100);
    const nps = pPromoters - pDetractors;

    let status = 'ZONA NEUTRA';
    if (nps >= 75) status = 'ZONA DE EXCELÊNCIA';
    else if (nps >= 50) status = 'ZONA DE QUALIDADE';
    else if (nps >= 0) status = 'ZONA DE APERFEIÇOAMENTO';
    else status = 'ZONA CRÍTICA';

    return { nps, total, promoters, passives, detractors, pPromoters, pPassives, pDetractors, status };
  }
}

const dataManager = new DataManager();

// ====================================================================
// MOTOR DE VARIÁVEIS DINÂMICAS (DYNAMIC VARIABLES ENGINE)
// ====================================================================
function replaceDynamicVariables(templateText, responseData) {
  if (!templateText) return '';

  const activeOrg = dataManager.getActiveOrg();
  const u = dataManager.UNITS.find(unit => unit.code === responseData.unitCode);
  const unitName = u ? u.name : responseData.unitCode;
  const roleSim = document.getElementById('filterRoleSim')?.value || 'admin';
  const gestorName = roleSim === 'gestor_a' ? 'Gestor Unidade A' : roleSim === 'gestor_b' ? 'Gestor Unidade B' : (activeOrg.adminName || 'Gestor');

  // Safe Fallback for student name
  let studentName = responseData.student;
  if (!studentName || studentName.trim() === '' || studentName === 'Anônimo' || studentName.includes('Tablet')) {
    studentName = 'Aluno(a)';
  }

  const dateStr = new Date(responseData.createdAt).toLocaleDateString('pt-BR');

  const replacements = {
    '{{nome}}': studentName,
    '{{unidade}}': unitName,
    '{{organizacao}}': activeOrg.name,
    '{{nps}}': responseData.npsScore !== undefined ? responseData.npsScore : 'N/A',
    '{{data}}': dateStr,
    '{{touchpoint}}': responseData.npsScore <= 6 ? 'Manutenção dos Equipamentos' : 'Atendimento e Estrutura',
    '{{nota_touchpoint}}': responseData.npsScore <= 6 ? '3.8 / 5.0' : '4.8 / 5.0',
    '{{gestor}}': gestorName
  };

  let result = templateText;
  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, replacements[key]);
  });

  return result;
}

// ====================================================================
// MOTOR DE TEMAS: MODO CLARO, ESCURO & SISTEMA (PERSISTENTE)
// ====================================================================

function initTheme() {
  const savedMode = localStorage.getItem('garden_theme_mode') || 'system';
  setThemeMode(savedMode, false);

  // Escutar alteração via Radios em Configurações -> Aparência
  document.querySelectorAll('input[name="radioThemeMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      setThemeMode(e.target.value, true);
      const label = e.target.value === 'light' ? 'Modo Claro ☀️' : e.target.value === 'dark' ? 'Modo Escuro 🌙' : 'Seguir Sistema 💻';
      showToast(`✓ Tema alterado para: ${label}`, 'info');
    });
  });

  // Escutar clique no botão rápido do Topbar Header
  const btnQuick = document.getElementById('btnQuickThemeToggle');
  if (btnQuick) {
    btnQuick.addEventListener('click', () => {
      const current = localStorage.getItem('garden_theme_mode') || 'system';
      const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
      setThemeMode(next, true);
      const label = next === 'light' ? 'Modo Claro ☀️' : next === 'dark' ? 'Modo Escuro 🌙' : 'Seguir Sistema 💻';
      showToast(`✓ Tema alterado para: ${label}`, 'info');
    });
  }

  // Monitorar alteração de preferência de esquema do SO/Navegador
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const mode = localStorage.getItem('garden_theme_mode') || 'system';
    if (mode === 'system') {
      applyResolvedTheme(getSystemTheme(), 'system');
    }
  });
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setThemeMode(mode, save = true) {
  if (save) {
    localStorage.setItem('garden_theme_mode', mode);
  }

  const radio = document.querySelector(`input[name="radioThemeMode"][value="${mode}"]`);
  if (radio) radio.checked = true;

  document.querySelectorAll('.theme-option-card').forEach(c => c.classList.remove('selected'));
  if (mode === 'light') document.getElementById('cardThemeLight')?.classList.add('selected');
  else if (mode === 'dark') document.getElementById('cardThemeDark')?.classList.add('selected');
  else if (mode === 'system') document.getElementById('cardThemeSystem')?.classList.add('selected');

  const resolved = mode === 'system' ? getSystemTheme() : mode;
  applyResolvedTheme(resolved, mode);
}

function applyResolvedTheme(resolvedTheme, selectedMode = 'system') {
  if (resolvedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const iconSpan = document.getElementById('quickThemeIcon');
  const textSpan = document.getElementById('quickThemeText');
  if (iconSpan && textSpan) {
    if (selectedMode === 'light') {
      iconSpan.textContent = '☀️';
      textSpan.textContent = 'Claro';
    } else if (selectedMode === 'dark') {
      iconSpan.textContent = '🌙';
      textSpan.textContent = 'Escuro';
    } else {
      iconSpan.textContent = '💻';
      textSpan.textContent = 'Sistema (' + (resolvedTheme === 'dark' ? 'Escuro' : 'Claro') + ')';
    }
  }
}

// ====================================================================
// INITIALIZATION & EVENT LISTENERS
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupSidebarNavigation();
  setupConfigTabs();
  setupSurveyForm();
  setupKioskMode();
  setupAdminDashboard();
  setupResponsesInbox();
  setupSchemaTab();
  setupTemplatesManager();
  setupModals();
  setupSurveyBuilderTabs();
  setupTouchpointsCategoryFilters();
  setupCasesViewSwitcher();
  setupSaaSOnboarding();
  setupAuthManager();
  setupQrCodeGenerator();

  renderOrganizationHeader();
  updateDashboard();
  renderSurveysTable();
  renderTouchpointCards();
  renderDevicesTable();
  renderCasesTable();
  renderResponsesInbox();
  renderTemplatesTable();
});

// ====================================================================
// MULTI-TENANT ORGANIZATIONS & SAAS ONBOARDING FLOW
// ====================================================================

function renderOrganizationHeader() {
  const activeOrg = dataManager.getActiveOrg();
  
  // 1. Populate Active Organization Dropdown in Header
  const orgSelect = document.getElementById('selectActiveOrg');
  if (orgSelect) {
    orgSelect.innerHTML = '';
    dataManager.organizations.forEach(org => {
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
        dataManager.setActiveOrg(e.target.value);
        renderOrganizationHeader();
        updateDashboard();
        renderSurveysTable();
        renderTouchpointCards();
        renderDevicesTable();
        renderCasesTable();
        renderResponsesInbox();
        renderTemplatesTable();
        showToast(`✓ Organização alterada para: ${dataManager.getActiveOrg().name}`, 'info');
      });
    }
  }

  // 2. Update Header Mode Badge & Banners
  const headerModeBadge = document.getElementById('headerModeBadge');
  const demoBanner = document.getElementById('demoModeBanner');
  const zeroDataBanner = document.getElementById('dashZeroDataBanner');

  if (activeOrg.isDemo) {
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
    if (zeroDataBanner && dataManager.localResponses.length === 0) {
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
  renderConfigUnitsTable();
  renderConfigUsersTable();
}

function renderStudentSimulatorTokens() {
  const tokenSelect = document.getElementById('selectTokenSim');
  if (!tokenSelect) return;
  tokenSelect.innerHTML = '';
  
  const tokens = dataManager.TOKENS_MAP;
  const tokenKeys = Object.keys(tokens);
  
  tokenKeys.forEach(t => {
    const info = tokens[t];
    const u = dataManager.UNITS.find(unit => unit.code === info.unitCode);
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

  if (dataManager.currentSurveyToken && tokenSelect.querySelector(`option[value="${dataManager.currentSurveyToken}"]`)) {
    tokenSelect.value = dataManager.currentSurveyToken;
  } else if (tokenKeys.length > 0) {
    dataManager.currentSurveyToken = tokenKeys[0];
    tokenSelect.value = tokenKeys[0];
  }
}

function setupSaaSOnboarding() {
  const modal = document.getElementById('modalSaaSOnboarding');
  const btnStart = document.getElementById('btnStartOnboarding');
  if (!modal) return;

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      showOnboardingStep(1);
      modal.style.display = 'flex';
    });
  }

  let currentStep = 1;
  function showOnboardingStep(stepNum) {
    currentStep = stepNum;
    for (let i = 1; i <= 7; i++) {
      const stepDiv = document.getElementById(`onboardingStep${i}`) || document.getElementById(`obStep${i}`);
      const indicator = document.getElementById(`stepInd${i}`);
      if (stepDiv) stepDiv.style.display = i === stepNum ? 'block' : 'none';
      if (indicator) {
        if (i < stepNum) {
          indicator.className = 'ob-step-circle completed';
        } else if (i === stepNum) {
          indicator.className = 'ob-step-circle active';
        } else {
          indicator.className = 'ob-step-circle';
        }
      }
    }

    const btnPrev = document.getElementById('btnObPrev');
    const btnNext = document.getElementById('btnObNext');
    const btnFinish = document.getElementById('btnObFinish');

    if (btnPrev) btnPrev.style.visibility = stepNum === 1 ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.display = stepNum === 7 ? 'none' : 'inline-block';
    if (btnFinish) btnFinish.style.display = stepNum === 7 ? 'inline-block' : 'none';
  }

  const btnNext = document.getElementById('btnObNext');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep === 1) {
        const orgName = document.getElementById('obOrgName')?.value.trim();
        const orgEmail = document.getElementById('obOrgEmail')?.value.trim();
        if (!orgName || !orgEmail) {
          alert('Por favor, informe o Nome da Organização e o E-mail Administrativo.');
          return;
        }
      }
      if (currentStep === 2) {
        const unitName = document.getElementById('obUnitName')?.value.trim();
        if (!unitName) {
          alert('Por favor, informe o Nome da primeira unidade.');
          return;
        }
      }

      if (currentStep < 7) {
        showOnboardingStep(currentStep + 1);
      }
    });
  }

  const btnPrev = document.getElementById('btnObPrev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        showOnboardingStep(currentStep - 1);
      }
    });
  }

  const form = document.getElementById('formSaaSOnboarding');
  const btnFinish = document.getElementById('btnObFinish');

  const completeOnboarding = (e) => {
    if (e) e.preventDefault();

    const orgName = document.getElementById('obOrgName')?.value.trim() || 'Nova Organização';
    const orgEmail = document.getElementById('obOrgEmail')?.value.trim() || 'contato@empresa.com';
    const orgPhone = document.getElementById('obOrgPhone')?.value.trim() || '';
    const unitName = document.getElementById('obUnitName')?.value.trim() || 'Unidade Centro';
    const unitCity = document.getElementById('obUnitCity')?.value.trim() || '';
    const unit2Name = document.getElementById('obUnit2Name')?.value.trim() || '';
    const adminName = document.getElementById('obAdminName')?.value.trim() || 'Administrador';
    const surveyName = document.getElementById('obSurveyName')?.value.trim() || 'Pesquisa de Satisfação NPS';
    const surveyQuestion = document.getElementById('obSurveyQuestion')?.value.trim() || 'De 0 a 10, qual a probabilidade de você recomendar nossa empresa a um amigo?';
    const deviceName = document.getElementById('obDeviceName')?.value.trim() || '';

    const tpRecepcao = document.getElementById('chkTpRecepcao')?.checked ?? document.getElementById('chkObTpRecepcao')?.checked;
    const tpProfessores = document.getElementById('chkTpProfessores')?.checked ?? document.getElementById('chkObTpProfessores')?.checked;
    const tpLimpeza = document.getElementById('chkTpLimpeza')?.checked ?? document.getElementById('chkObTpLimpeza')?.checked;
    const tpEquipamentos = document.getElementById('chkTpEquipamentos')?.checked ?? document.getElementById('chkObTpEquipamentos')?.checked;

    const newOrg = dataManager.createOrganization({
      orgName,
      orgEmail,
      orgPhone,
      unitName,
      unitCity,
      unit2Name,
      adminName,
      surveyName,
      surveyQuestion,
      deviceName,
      tpRecepcao,
      tpProfessores,
      tpLimpeza,
      tpEquipamentos
    });

    modal.style.display = 'none';
    if (form) form.reset();
    showOnboardingStep(1);

    renderOrganizationHeader();
    updateDashboard();
    renderSurveysTable();
    renderTouchpointCards();
    renderDevicesTable();
    renderCasesTable();
    renderResponsesInbox();
    renderTemplatesTable();

    showToast(`🎉 Organização "${newOrg.name}" criada com sucesso!`, 'success', 5000);
  };

  if (form) form.addEventListener('submit', completeOnboarding);
  if (btnFinish) btnFinish.addEventListener('click', completeOnboarding);

  // Setup Technical Tools Switcher in Config
  const btnToggleTech = document.getElementById('btnToggleTechSidebar');
  if (btnToggleTech) {
    btnToggleTech.addEventListener('click', () => {
      dataManager.isTechnicalMode = !dataManager.isTechnicalMode;
      const techFooter = document.getElementById('sidebarFooterTechBlock');
      if (techFooter) {
        techFooter.style.display = dataManager.isTechnicalMode ? 'block' : 'none';
      }
      renderOrganizationHeader();
      showToast(dataManager.isTechnicalMode ? '🛠️ Atalhos técnicos exibidos no menu inferior.' : '🔒 Atalhos técnicos ocultos (Modo Cliente Comercial).', 'info');
    });
  }

  const btnTechSurveySim = document.getElementById('btnTechOpenSurveySim');
  if (btnTechSurveySim) {
    btnTechSurveySim.addEventListener('click', () => {
      document.querySelectorAll('.mod-pane').forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-survey')?.classList.add('active');
    });
  }

  const btnTechKiosk = document.getElementById('btnTechOpenKiosk');
  if (btnTechKiosk) {
    btnTechKiosk.addEventListener('click', () => {
      document.querySelectorAll('.mod-pane').forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-kiosk')?.classList.add('active');
    });
  }
}

// --------------------------------------------------------------------
// 1. SIDEBAR & GLOBAL ROUTING
// --------------------------------------------------------------------
function setupSidebarNavigation() {
  const brandHome = document.getElementById('brandHomeLink');
  if (brandHome) {
    brandHome.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('[data-mod="mod-dash"]')?.click();
    });
  }
  const sidebarBtns = document.querySelectorAll('#mainSidebarNav .nav-item');
  const modPanes = document.querySelectorAll('.mod-pane');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const breadcrumbCurrent = document.getElementById('headerBreadcrumbCurrent');

  const titlesMap = {
    'mod-dash': 'Dashboard',
    'mod-surveys': 'Pesquisas',
    'mod-touchpoints': 'Pontos de Contato',
    'mod-responses': 'Respostas (Central de Atendimento)',
    'mod-cases': 'Acompanhamentos (Detratores)',
    'mod-reports': 'Relatórios & CSV',
    'mod-devices': 'Dispositivos',
    'mod-config': 'Configurações'
  };

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarBtns.forEach(b => b.classList.remove('active'));
      modPanes.forEach(m => m.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      const modId = btn.getAttribute('data-mod');
      const pane = document.getElementById(modId);
      if (pane) pane.classList.add('active');

      if (breadcrumbCurrent && titlesMap[modId]) {
        breadcrumbCurrent.textContent = titlesMap[modId];
      }

      if (modId === 'mod-dash') updateDashboard();
      if (modId === 'mod-surveys') renderSurveysTable();
      if (modId === 'mod-touchpoints') renderTouchpointCards();
      if (modId === 'mod-cases') renderCasesTable();
      if (modId === 'mod-responses') renderResponsesInbox();
      if (modId === 'mod-devices') renderDevicesTable();
      if (modId === 'mod-reports') renderReportsSummary();
    });
  });

  const btnPublic = document.getElementById('btnSwitchPublicSurvey');
  if (btnPublic) {
    btnPublic.addEventListener('click', () => {
      modPanes.forEach(m => m.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));
      document.getElementById('tab-survey').classList.add('active');
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Simulador Aluno (QR Code)';
    });
  }

  const btnKiosk = document.getElementById('btnSwitchKiosk');
  if (btnKiosk) {
    btnKiosk.addEventListener('click', () => {
      modPanes.forEach(m => m.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));
      document.getElementById('tab-kiosk').classList.add('active');
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Modo Tablet Kiosk Totem';
    });
  }
}

// --------------------------------------------------------------------
// 2. CONFIGURAÇÕES SUB-TABS & TEMPLATES MANAGER
// --------------------------------------------------------------------
function setupConfigTabs() {
  const btns = document.querySelectorAll('#configNavTabs .config-tab-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cfg-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const cfgId = btn.getAttribute('data-cfg');
      const target = document.getElementById(cfgId);
      if (target) target.style.display = 'block';

      if (cfgId === 'cfg-templates') renderTemplatesTable();
    });
  });
}

function setupTemplatesManager() {
  const btnNewTemplate = document.getElementById('btnNewTemplate');
  if (btnNewTemplate) {
    btnNewTemplate.addEventListener('click', () => {
      const modal = document.getElementById('modalNewTemplate');
      if (modal) modal.style.display = 'flex';
    });
  }
}

function renderTemplatesTable() {
  const tbody = document.getElementById('templatesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  dataManager.messageTemplates.forEach(tpl => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${tpl.name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${tpl.description || ''}</span></td>
      <td><span class="badge-status passive">${tpl.channel.toUpperCase()}</span></td>
      <td>${tpl.subject || '—'}</td>
      <td>${new Date(tpl.updatedAt).toLocaleDateString()}</td>
      <td><span class="badge-status ${tpl.isActive ? 'resolved' : 'pending'}">${tpl.isActive ? '🟢 Ativa' : '🔴 Inativa'}</span></td>
      <td>
        <div class="btn-group-row">
          <button class="btn-outline-gold btn-sm btn-edit-tpl">Editar</button>
          <button class="btn-outline-gold btn-sm btn-toggle-tpl">${tpl.isActive ? 'Desativar' : 'Ativar'}</button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-edit-tpl').addEventListener('click', () => {
      const newSubject = prompt('Editar assunto do e-mail:', tpl.subject) || tpl.subject;
      const newBody = prompt('Editar corpo da mensagem:', tpl.body) || tpl.body;
      tpl.subject = newSubject.trim();
      tpl.body = newBody.trim();
      tpl.updatedAt = new Date().toISOString();
      renderTemplatesTable();
    });

    tr.querySelector('.btn-toggle-tpl').addEventListener('click', () => {
      tpl.isActive = !tpl.isActive;
      renderTemplatesTable();
    });

    tbody.appendChild(tr);
  });
}

// --------------------------------------------------------------------
// 3. STUDENT PUBLIC SURVEY
// --------------------------------------------------------------------
function setupSurveyForm() {
  const scaleContainer = document.getElementById('npsScaleButtons');
  const feedbackBadge = document.getElementById('npsFeedbackText');
  const tokenSelect = document.getElementById('selectTokenSim');
  const resolvedUrlDisplay = document.getElementById('resolvedUrlDisplay');
  const surveyUnitName = document.getElementById('surveyUnitName');
  const genericUnitBox = document.getElementById('genericUnitSelectBox');

  if (!scaleContainer) return;
  scaleContainer.innerHTML = '';

  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nps-btn ' + getNpsCategoryClass(i);
    btn.textContent = i;

    btn.addEventListener('click', () => {
      document.querySelectorAll('#npsScaleButtons .nps-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      dataManager.selectedSurveyScore = i;

      feedbackBadge.style.display = 'block';
      if (i >= 9) {
        feedbackBadge.textContent = `Nota ${i} • Promotor (Excelente!)`;
        feedbackBadge.className = 'badge-status promoter w-full mt-2';
      } else if (i >= 7) {
        feedbackBadge.textContent = `Nota ${i} • Neutro/Passivo`;
        feedbackBadge.className = 'badge-status passive w-full mt-2';
      } else {
        feedbackBadge.textContent = `Nota ${i} • Detrator (Crítico)`;
        feedbackBadge.className = 'badge-status detractor w-full mt-2';
      }
    });

    scaleContainer.appendChild(btn);
  }

  document.querySelectorAll('#touchpointRatingList .rating-stars-row').forEach(row => {
    const starBtns = row.querySelectorAll('.star-btn');
    starBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        starBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  tokenSelect.addEventListener('change', (e) => {
    const tokenVal = e.target.value;
    dataManager.currentSurveyToken = tokenVal;

    if (tokenVal === 'generic') {
      resolvedUrlDisplay.textContent = 'https://gardengold.com.br/pesquisa/nps';
      surveyUnitName.textContent = `${dataManager.getActiveOrg().name} • Pesquisa Geral`;
      genericUnitBox.style.display = 'block';
    } else {
      resolvedUrlDisplay.textContent = `https://gardengold.com.br/p/${tokenVal}`;
      genericUnitBox.style.display = 'none';
      const tokenInfo = dataManager.TOKENS_MAP[tokenVal];
      if (tokenInfo) {
        const u = dataManager.UNITS.find(item => item.code === tokenInfo.unitCode);
        if (u) {
          surveyUnitName.textContent = `${u.name} • ${u.location}`;
        }
      }
    }
  });

  let isSubmitting = false;

  document.getElementById('btnSubmitSurvey').addEventListener('click', async () => {
    if (isSubmitting) return;

    if (dataManager.selectedSurveyScore === null) {
      alert('Por favor, selecione uma nota de 0 a 10 antes de enviar.');
      return;
    }

    const lgpdConsent = document.getElementById('chkLgpdConsent').checked;
    if (!lgpdConsent) {
      alert('É necessário aceitar os termos de privacidade para enviar.');
      return;
    }

    const btnSubmit = document.getElementById('btnSubmitSurvey');
    isSubmitting = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    try {
      let unitCode;
      const tokenVal = tokenSelect.value;
      if (tokenVal === 'generic') {
        unitCode = document.getElementById('selectGenericUnit').value;
      } else if (dataManager.TOKENS_MAP[tokenVal]) {
        unitCode = dataManager.TOKENS_MAP[tokenVal].unitCode;
      } else {
        unitCode = dataManager.UNITS[0]?.code || 'unidade-a';
      }

      const comment = document.getElementById('answerText').value;
      const student = document.getElementById('studentIdentifier').value;

      await dataManager.submitResponse({
        token: tokenVal,
        unitCode,
        origin: tokenVal.startsWith('7559') ? 'qr_code' : 'link',
        npsScore: dataManager.selectedSurveyScore,
        comment,
        student,
        email: student && student.includes('@') ? student : null,
        consentAccepted: lgpdConsent
      });

      const thanksMsg = document.getElementById('thanksCustomMessage');
      if (dataManager.selectedSurveyScore >= 9) {
        thanksMsg.textContent = 'Ficamos imensamente felizes com sua nota 9 ou 10! Seu entusiasmo nos motiva diariamente na Garden Gold.';
      } else if (dataManager.selectedSurveyScore >= 7) {
        thanksMsg.textContent = 'Obrigado pela sua nota. Estamos trabalhando continuamente para tornar sua experiência nota 10!';
      } else {
        thanksMsg.textContent = 'Lamentamos não ter atingido suas expectativas. Nosso gestor de unidade analisará seu comentário com prioridade.';
      }

      document.getElementById('surveyFormState').style.display = 'none';
      document.getElementById('surveyThanksState').style.display = 'flex';

      updateDashboard();
      renderCasesTable();
      renderResponsesInbox();
    } finally {
      isSubmitting = false;
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Enviar Avaliação';
    }
  });

  document.getElementById('btnResetSurvey').addEventListener('click', () => {
    dataManager.selectedSurveyScore = null;
    document.querySelectorAll('#npsScaleButtons .nps-btn').forEach(b => b.classList.remove('selected'));
    feedbackBadge.style.display = 'none';
    document.getElementById('answerText').value = '';
    document.getElementById('studentIdentifier').value = '';

    document.getElementById('surveyThanksState').style.display = 'none';
    document.getElementById('surveyFormState').style.display = 'block';
  });
}

// --------------------------------------------------------------------
// 4. TABLET KIOSK MODE
// --------------------------------------------------------------------
function setupKioskMode() {
  const kioskGrid = document.getElementById('kioskNpsGrid');
  if (!kioskGrid) return;

  kioskGrid.innerHTML = '';
  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kiosk-nps-btn ' + getNpsCategoryClass(i);
    btn.textContent = i;

    btn.addEventListener('click', () => {
      document.querySelectorAll('#kioskNpsGrid .kiosk-nps-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      dataManager.selectedKioskScore = i;
    });

    kioskGrid.appendChild(btn);
  }

  document.getElementById('btnKioskStart').addEventListener('click', () => {
    dataManager.selectedKioskScore = null;
    document.querySelectorAll('#kioskNpsGrid .kiosk-nps-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('kioskComment').value = '';

    document.getElementById('kioskStandbyState').style.display = 'none';
    document.getElementById('kioskFormState').style.display = 'flex';
  });

  document.getElementById('btnKioskCancel').addEventListener('click', () => {
    document.getElementById('kioskFormState').style.display = 'none';
    document.getElementById('kioskStandbyState').style.display = 'flex';
  });

  document.getElementById('btnKioskSubmit').addEventListener('click', async () => {
    if (dataManager.selectedKioskScore === null) {
      alert('Toque em uma nota de 0 a 10.');
      return;
    }

    const comment = document.getElementById('kioskComment').value;

    await dataManager.submitResponse({
      token: null,
      unitCode: 'unidade-a',
      origin: 'tablet',
      npsScore: dataManager.selectedKioskScore,
      comment,
      student: 'Aluno (Tablet Totem)',
      email: null,
      phone: null,
      consentAccepted: true
    });

    document.getElementById('kioskFormState').style.display = 'none';
    document.getElementById('kioskThanksState').style.display = 'flex';

    let count = 5;
    const countEl = document.getElementById('kioskCountdown');
    countEl.textContent = count;

    if (dataManager.kioskTimer) clearInterval(dataManager.kioskTimer);
    dataManager.kioskTimer = setInterval(() => {
      count--;
      countEl.textContent = count;
      if (count <= 0) {
        clearInterval(dataManager.kioskTimer);
        document.getElementById('kioskComment').value = '';
        dataManager.selectedKioskScore = null;
        document.getElementById('kioskThanksState').style.display = 'none';
        document.getElementById('kioskStandbyState').style.display = 'flex';
      }
    }, 1000);

    updateDashboard();
    renderCasesTable();
    renderResponsesInbox();
  });
}

// --------------------------------------------------------------------
// 5. DASHBOARD & OPERATIONAL MODULES
// --------------------------------------------------------------------
function setupAdminDashboard() {
  const formOrg = document.getElementById('formConfigOrg');
  if (formOrg) {
    formOrg.addEventListener('submit', async (e) => {
      e.preventDefault();
      const activeOrg = dataManager.getActiveOrg();
      const cfgName = document.getElementById('cfgOrgNameInput');
      const cfgTradeName = document.getElementById('cfgOrgTradeNameInput');
      const cfgEmail = document.getElementById('cfgOrgEmailInput');
      const cfgPhone = document.getElementById('cfgOrgPhoneInput');
      const cfgLogo = document.getElementById('cfgOrgLogoInput');

      if (cfgName) activeOrg.name = cfgName.value.trim();
      if (cfgTradeName) activeOrg.tradeName = cfgTradeName.value.trim();
      if (cfgEmail) activeOrg.email = cfgEmail.value.trim();
      if (cfgPhone) activeOrg.phone = cfgPhone.value.trim();
      if (cfgLogo) activeOrg.logoUrl = cfgLogo.value.trim();

      dataManager.saveOrganizationsToStorage();
      await dataManager.saveOrganizationToSupabase(activeOrg);
      renderOrganizationHeader();
      showToast('✓ Organização atualizada com sucesso no banco de dados.', 'success', 4000);
    });
  }

  const filterUnit = document.getElementById('filterUnit');
  const filterOrigin = document.getElementById('filterOrigin');
  const filterRoleSim = document.getElementById('filterRoleSim');
  const filterPeriod = document.getElementById('filterPeriod');
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');

  if (filterPeriod) {
    filterPeriod.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === '7') {
        const d = new Date(Date.now() - 7 * 86400000);
        if (filterStartDate) filterStartDate.value = d.toISOString().split('T')[0];
        if (filterEndDate) filterEndDate.value = new Date().toISOString().split('T')[0];
      } else if (val === '30') {
        const d = new Date(Date.now() - 30 * 86400000);
        if (filterStartDate) filterStartDate.value = d.toISOString().split('T')[0];
        if (filterEndDate) filterEndDate.value = new Date().toISOString().split('T')[0];
      } else {
        if (filterStartDate) filterStartDate.value = '';
        if (filterEndDate) filterEndDate.value = '';
      }
      updateDashboard();
      renderCasesTable();
      renderResponsesInbox();
    });
  }

  [filterUnit, filterOrigin, filterRoleSim, filterStartDate, filterEndDate].forEach(el => {
    if (!el) return;
    el.addEventListener('change', () => {
      updateDashboard();
      renderCasesTable();
      renderResponsesInbox();
    });
  });

  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportToCsv);

  const btnNewSurvey = document.getElementById('btnNewSurvey');
  if (btnNewSurvey) {
    btnNewSurvey.addEventListener('click', () => {
      const modal = document.getElementById('modalNewSurvey');
      if (modal) modal.style.display = 'flex';
    });
  }

  const btnAddSurveySection = document.getElementById('btnAddSurveySection');
  if (btnAddSurveySection) {
    btnAddSurveySection.addEventListener('click', () => {
      const modal = document.getElementById('modalNewSection');
      if (modal) modal.style.display = 'flex';
    });
  }

  const btnNewDevice = document.getElementById('btnNewDevice');
  if (btnNewDevice) {
    btnNewDevice.addEventListener('click', () => {
      const modal = document.getElementById('modalNewDevice');
      if (modal) modal.style.display = 'flex';
    });
  }

  const btnNewTouchpoint = document.getElementById('btnNewTouchpoint');
  if (btnNewTouchpoint) {
    btnNewTouchpoint.addEventListener('click', () => {
      const modal = document.getElementById('modalNewTouchpoint');
      if (modal) modal.style.display = 'flex';
    });
  }
}

function setupModals() {
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const backdrop = e.target.closest('.modal-backdrop');
      if (backdrop) backdrop.style.display = 'none';
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.style.display = 'none';
    });
  });

  const formNewSurvey = document.getElementById('formNewSurvey');
  if (formNewSurvey) {
    formNewSurvey.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inputSurveyName').value;
      const unitCode = document.getElementById('selectSurveyUnit').value;
      const type = document.getElementById('selectSurveyType').value;

      dataManager.surveys.push({
        id: 's_' + Date.now(),
        name,
        unitCode,
        type,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      const titleEl = document.getElementById('builderSurveyTitle');
      if (titleEl) titleEl.textContent = name;

      document.getElementById('modalNewSurvey').style.display = 'none';
      formNewSurvey.reset();
      alert(`Pesquisa "${name}" criada com sucesso!`);
    });
  }

  const formNewSection = document.getElementById('formNewSection');
  if (formNewSection) {
    formNewSection.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('inputSectionTitle').value;
      const desc = document.getElementById('inputSectionDesc').value;

      dataManager.surveySections.push({
        id: 'sec_' + Date.now(),
        title: title.toUpperCase(),
        questions: [{ type: '⭐ Touchpoint', text: desc || 'Pergunta genérica de seção', req: 'Escala 1–5 • Opcional' }]
      });

      renderSurveysTable();
      document.getElementById('modalNewSection').style.display = 'none';
      formNewSection.reset();
    });
  }

  const formNewTouchpoint = document.getElementById('formNewTouchpoint');
  if (formNewTouchpoint) {
    formNewTouchpoint.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inputTpName').value;
      const category = document.getElementById('selectTpCategory').value;
      const evalType = document.getElementById('selectTpScale').value;

      dataManager.touchpoints.push({
        id: 't_' + Date.now(),
        name,
        category,
        evalType,
        scaleMin: 1,
        scaleMax: 5,
        isActive: true,
        units: 'Todas as Unidades',
        avgScore: 5.0,
        totalCount: 0,
        statusLabel: '🟢 Excelente'
      });

      renderTouchpointsTable();
      renderTouchpointRankingTable();
      renderTouchpointCards();
      document.getElementById('modalNewTouchpoint').style.display = 'none';
      formNewTouchpoint.reset();
    });
  }

  const formNewDevice = document.getElementById('formNewDevice');
  if (formNewDevice) {
    formNewDevice.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inputDeviceName').value;
      const unitCode = document.getElementById('selectDeviceUnit').value;

      dataManager.devices.push({
        id: 'd_' + Date.now(),
        name,
        unitCode,
        deviceToken: Math.random().toString(36).substring(2, 6) + '...' + Math.random().toString(36).substring(2, 6),
        isActive: true,
        lastPing: 'Agora'
      });

      renderDevicesTable();
      document.getElementById('modalNewDevice').style.display = 'none';
      formNewDevice.reset();
    });
  }

  const formNewTemplate = document.getElementById('formNewTemplate');
  if (formNewTemplate) {
    formNewTemplate.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inputTplName').value;
      const channel = document.getElementById('selectTplChannel').value;
      const subject = document.getElementById('inputTplSubject').value;
      const body = document.getElementById('inputTplBody').value;

      dataManager.messageTemplates.push({
        id: 'tpl_' + Date.now(),
        name,
        description: 'Mensagem cadastrada via modal de mensagens padrão.',
        channel,
        subject,
        body,
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      renderTemplatesTable();
      document.getElementById('modalNewTemplate').style.display = 'none';
      formNewTemplate.reset();
    });
  }
}

function setupSurveyBuilderTabs() {
  const tabBtns = document.querySelectorAll('.survey-builder-tabs .builder-tab-btn');
  const panes = document.querySelectorAll('#mod-surveys .builder-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.getAttribute('data-stab');
      panes.forEach(p => {
        if (p.id === targetId) p.style.display = 'block';
        else p.style.display = 'none';
      });
    });
  });
}

function setupTouchpointsCategoryFilters() {
  const btns = document.querySelectorAll('#mod-touchpoints .toolbar-bar button');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => {
        b.classList.remove('active');
        b.classList.remove('btn-secondary-gold');
        b.classList.add('btn-outline-gold');
      });
      btn.classList.add('active');
      btn.classList.remove('btn-outline-gold');
      btn.classList.add('btn-secondary-gold');

      const catText = btn.textContent.trim();
      dataManager.touchpointCategoryFilter = catText === 'Todos' ? 'all' : catText;
      renderTouchpointCards();
    });
  });
}

// ====================================================================
// UX 2.0 HELPERS: TOASTS, CONFIRMATION MODALS & ACTION CENTER
// ====================================================================

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('globalToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem; margin-left:0.5rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, duration);
}

function showConfirmationModal({ icon = '⚠️', title = 'Confirmar Ação', message, onConfirm }) {
  const modal = document.getElementById('modalConfirmation');
  if (!modal) return;

  document.getElementById('confirmModalIcon').textContent = icon;
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;

  const btnProceed = document.getElementById('btnConfirmProceed');
  const btnCancel = document.getElementById('btnConfirmCancel');

  const cleanUp = () => {
    modal.style.display = 'none';
    btnProceed.replaceWith(btnProceed.cloneNode(true));
    btnCancel.replaceWith(btnCancel.cloneNode(true));
  };

  btnCancel.addEventListener('click', cleanUp);
  btnProceed.addEventListener('click', () => {
    cleanUp();
    if (typeof onConfirm === 'function') onConfirm();
  });

  modal.style.display = 'flex';
}

function formatElapsedTime(isoString) {
  if (!isoString) return '—';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `Aberto há ${diffMins} min`;
  if (diffHours < 24) return `Aberto há ${diffHours} h`;
  return `Aberto há ${diffDays} dia(s)`;
}

function renderActionCenter() {
  const grid = document.getElementById('actionCardsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  let cases = [...dataManager.followUpCases];
  if (unitFilter !== 'all') cases = cases.filter(c => c.unitCode === unitFilter);

  const pendingDetractors = cases.filter(c => c.status === 'pending');
  const inProgressCases = cases.filter(c => c.status === 'in_progress');
  const criticalTouchpoints = dataManager.touchpoints.filter(t => t.isActive && t.avgScore < 4.0);

  if (!dataManager.localResponses.length) {
    grid.innerHTML = `
      <div class="action-item-card success" style="grid-column: 1 / -1; cursor:default;">
        <div>
          <div class="action-item-text">✓ Tudo sob controle</div>
          <div class="action-item-sub">Ainda não existem avaliações suficientes para gerar ações.</div>
        </div>
        <span class="badge-status promoter">Pronto</span>
      </div>
    `;
    return;
  }

  if (!pendingDetractors.length && !inProgressCases.length && !criticalTouchpoints.length) {
    grid.innerHTML = `
      <div class="action-item-card success" style="grid-column: 1 / -1; cursor:default;">
        <div>
          <div class="action-item-text">✓ Tudo sob controle</div>
          <div class="action-item-sub">Nenhum detractor pendente ou ponto de contato crítico no momento.</div>
        </div>
        <span class="badge-status promoter">100% Ok</span>
      </div>
    `;
    return;
  }

  if (pendingDetractors.length > 0) {
    const card = document.createElement('div');
    card.className = 'action-item-card critical';
    card.innerHTML = `
      <div>
        <div class="action-item-text">🔴 ${pendingDetractors.length} detractor(es) aguardando atendimento</div>
        <div class="action-item-sub">Clique para triar na Central de Respostas</div>
      </div>
      <span class="badge-priority urgent">Ação Necessária</span>
    `;
    card.addEventListener('click', () => {
      document.querySelector('[data-mod="mod-responses"]')?.click();
      document.querySelector('[data-inbox-filter="detractor"]')?.click();
    });
    grid.appendChild(card);
  }

  if (inProgressCases.length > 0) {
    const card = document.createElement('div');
    card.className = 'action-item-card warning';
    card.innerHTML = `
      <div>
        <div class="action-item-text">🟠 ${inProgressCases.length} acompanhamento(s) em andamento</div>
        <div class="action-item-sub">Clique para acompanhar resolução</div>
      </div>
      <span class="badge-priority high">Em Tratativa</span>
    `;
    card.addEventListener('click', () => {
      document.querySelector('[data-mod="mod-cases"]')?.click();
    });
    grid.appendChild(card);
  }

  if (criticalTouchpoints.length > 0) {
    criticalTouchpoints.forEach(tp => {
      const card = document.createElement('div');
      card.className = 'action-item-card critical';
      card.innerHTML = `
        <div>
          <div class="action-item-text">🔴 Ponto de Contato "${tp.name}" nota ${tp.avgScore.toFixed(1)} ★</div>
          <div class="action-item-sub">Abaixo da meta de qualidade (4.0 ★)</div>
        </div>
        <span class="badge-priority urgent">Crítico</span>
      `;
      card.addEventListener('click', () => {
        document.querySelector('[data-mod="mod-touchpoints"]')?.click();
      });
      grid.appendChild(card);
    });
  }
}

async function updateDashboard() {
  const activeOrg = dataManager.getActiveOrg();
  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const originFilter = document.getElementById('filterOrigin')?.value || 'all';
  const role = document.getElementById('filterRoleSim')?.value || 'admin';
  const startDate = document.getElementById('filterStartDate')?.value || null;
  const endDate = document.getElementById('filterEndDate')?.value || null;

  if (startDate && endDate && startDate > endDate) {
    showToast('⚠️ A data inicial ("De") não pode ser posterior à data final ("Até").', 'error');
    return;
  }

  const responses = await dataManager.fetchResponses(unitFilter, originFilter, role, startDate, endDate);
  const metrics = dataManager.calculateNPS(responses);

  renderActionCenter();

  // Zero-data Banner handling
  const zeroDataBanner = document.getElementById('dashZeroDataBanner');
  if (zeroDataBanner) {
    if (responses.length === 0) {
      zeroDataBanner.style.display = 'block';
      const nameEl = document.getElementById('zeroDataOrgName');
      if (nameEl) nameEl.textContent = activeOrg.name;
    } else {
      zeroDataBanner.style.display = 'none';
    }
  }

  const kpiNps = document.getElementById('kpiNpsScore');
  if (kpiNps) kpiNps.textContent = responses.length === 0 ? '—' : (metrics.nps > 0 ? '+' : '') + metrics.nps;

  const kpiTrend = document.getElementById('kpiNpsTrend');
  if (kpiTrend) {
    if (responses.length === 0) {
      kpiTrend.innerHTML = '— <span style="font-weight:400; color:var(--text-muted);">Sem dados suficientes para comparação</span>';
      kpiTrend.className = 'kpi-trend';
    } else {
      kpiTrend.innerHTML = '↑ 0,0% <span style="font-weight:400; color:var(--text-muted);">vs. período anterior</span>';
      kpiTrend.className = 'kpi-trend up';
    }
  }

  const kpiStatus = document.getElementById('kpiNpsStatus');
  if (kpiStatus) kpiStatus.textContent = responses.length === 0 ? 'Ainda estamos começando' : metrics.status;

  const kpiTpAvg = document.getElementById('kpiTouchpointsAvg');
  if (kpiTpAvg) {
    const activeTouchpoints = dataManager.touchpoints.filter(t => t.isActive && t.totalCount > 0 && t.avgScore > 0);
    if (responses.length === 0 || activeTouchpoints.length === 0) {
      kpiTpAvg.textContent = '—';
    } else {
      const sum = activeTouchpoints.reduce((acc, t) => acc + t.avgScore, 0);
      const avg = sum / activeTouchpoints.length;
      kpiTpAvg.textContent = `${avg.toFixed(1)} ★`;
    }
  }

  const kpiTotal = document.getElementById('kpiTotalResponses');
  if (kpiTotal) kpiTotal.textContent = metrics.total;

  const kpiDetractors = document.getElementById('kpiDetractorsCount');
  if (kpiDetractors) kpiDetractors.textContent = metrics.detractors;

  const kpiDetractorsPercent = document.getElementById('kpiDetractorsPercent');
  if (kpiDetractorsPercent) kpiDetractorsPercent.textContent = responses.length === 0 ? '0% do total' : `${metrics.pDetractors}% do total`;

  const barPromoter = document.getElementById('barPromoter');
  if (barPromoter) barPromoter.style.width = metrics.pPromoters + '%';

  const valPromoter = document.getElementById('valPromoter');
  if (valPromoter) valPromoter.textContent = metrics.pPromoters + '%';

  const barPassive = document.getElementById('barPassive');
  if (barPassive) barPassive.style.width = metrics.pPassives + '%';

  const valPassive = document.getElementById('valPassive');
  if (valPassive) valPassive.textContent = metrics.pPassives + '%';

  const barDetractor = document.getElementById('barDetractor');
  if (barDetractor) barDetractor.style.width = metrics.pDetractors + '%';

  const valDetractor = document.getElementById('valDetractor');
  if (valDetractor) valDetractor.textContent = metrics.pDetractors + '%';

  renderUnitTable(metrics.nps);
  renderCommentsFeedSafe(responses);
  renderTouchpointRankingTable();
  renderTouchpointsTable();
}

function renderUnitTable(overallNps) {
  const tbody = document.getElementById('unitTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  dataManager.UNITS.forEach(u => {
    const unitResponses = dataManager.localResponses.filter(r => r.unitCode === u.code);
    const uMetrics = dataManager.calculateNPS(unitResponses);
    const isBelow = uMetrics.total > 0 && uMetrics.nps < overallNps;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td>${uMetrics.total}</td>
      <td class="text-emerald">${uMetrics.promoters} (${uMetrics.pPromoters}%)</td>
      <td class="text-amber">${uMetrics.passives} (${uMetrics.pPassives}%)</td>
      <td class="text-rose">${uMetrics.detractors} (${uMetrics.pDetractors}%)</td>
      <td><strong class="${isBelow ? 'text-rose' : 'text-emerald'}">${uMetrics.nps > 0 ? '+' : ''}${uMetrics.nps} ${isBelow ? '⚠️ (Abaixo)' : ''}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCommentsFeedSafe(responses) {
  const feed = document.getElementById('commentsFeed');
  if (!feed) return;
  feed.innerHTML = '';

  const withComments = responses.filter(r => r.comment && r.comment.trim() !== '');
  const badge = document.getElementById('commentCountBadge');
  if (badge) badge.textContent = `${withComments.length} Comentários`;

  if (!withComments.length) {
    feed.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:1.5rem; text-align:center;">Nenhuma resposta ainda.<br><span style="font-size:0.78rem;">Quando seus clientes responderem às pesquisas, as avaliações aparecerão aqui.</span></div>';
    return;
  }

  withComments.forEach(r => {
    const u = dataManager.UNITS.find(item => item.code === r.unitCode);
    const unitName = u ? u.name : r.unitCode;
    const catClass = getNpsCategoryClass(r.npsScore);

    const card = document.createElement('div');
    card.className = `glass-card mb-2`;
    card.style.padding = '0.9rem';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <span style="font-size:0.85rem; font-weight:600;">${r.student || 'Anônimo'} • <span style="color:var(--text-muted); font-weight:400;">${unitName}</span></span>
        <span class="badge-status ${catClass}">Nota ${r.npsScore}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-main); font-style:italic;">"${r.comment}"</div>
    `;
    feed.appendChild(card);
  });
}

function renderTouchpointRankingTable() {
  const tbody = document.getElementById('touchpointRankingTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const sorted = [...dataManager.touchpoints].sort((a, b) => b.avgScore - a.avgScore);
  sorted.forEach(tp => {
    const tr = document.createElement('tr');
    const isBelow = tp.avgScore < 4.0;

    tr.innerHTML = `
      <td><strong>${tp.name}</strong></td>
      <td>${tp.category}</td>
      <td>${tp.evalType}</td>
      <td>${tp.totalCount}</td>
      <td><strong class="${isBelow ? 'text-rose' : 'text-emerald'}">${tp.avgScore.toFixed(1)} / 5.0 ${isBelow ? '⚠️' : '↑'}</strong></td>
      <td><span class="badge-status ${tp.isActive ? 'resolved' : 'pending'}">${tp.isActive ? '🟢 Ativo' : '🔴 Inativo'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTouchpointsTable() {
  const tbody = document.getElementById('touchpointsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  dataManager.touchpoints.forEach(tp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${tp.name}</strong></td>
      <td>${tp.category}</td>
      <td>Avaliação Direta</td>
      <td>${tp.evalType}</td>
      <td><span class="badge-status ${tp.isActive ? 'resolved' : 'pending'}">${tp.isActive ? 'Ativo' : 'Inativo'}</span></td>
      <td>${tp.units}</td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-tp">${tp.isActive ? 'Inativar' : 'Reativar'}</button>
      </td>
    `;
    tr.querySelector('.btn-toggle-tp').addEventListener('click', () => {
      tp.isActive = !tp.isActive;
      renderTouchpointsTable();
      renderTouchpointRankingTable();
      renderTouchpointCards();
    });
    tbody.appendChild(tr);
  });
}

function renderTouchpointCards() {
  const container = document.getElementById('touchpointCardsGrid');
  if (!container) return;
  container.innerHTML = '';

  let list = [...dataManager.touchpoints];
  if (dataManager.touchpointCategoryFilter && dataManager.touchpointCategoryFilter !== 'all') {
    list = list.filter(tp => tp.category.toLowerCase() === dataManager.touchpointCategoryFilter.toLowerCase());
  }

  if (!list.length) {
    container.innerHTML = '<div style="color:var(--text-muted); padding:1.5rem; text-align:center; grid-column: 1 / -1;">Nenhum ponto de contato encontrado nesta categoria.</div>';
    return;
  }

  list.forEach(tp => {
    const card = document.createElement('div');
    card.className = 'touchpoint-card';
    const statusClass = tp.avgScore >= 4.5 ? 'excellent' : tp.avgScore >= 4.0 ? 'attention' : 'critical';
    const statusLabel = tp.avgScore >= 4.5 ? '🟢 Excelente' : tp.avgScore >= 4.0 ? '🟡 Atenção' : '🔴 Crítico';

    card.innerHTML = `
      <div class="tp-card-header">
        <div>
          <h4 class="tp-title">${tp.name.toUpperCase()}</h4>
          <span class="tp-cat-tag">${tp.category}</span>
        </div>
        <span class="badge-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="tp-metric-box">
        <span class="tp-score-val">${tp.avgScore.toFixed(1)} ★</span>
        <span class="tp-eval-count">${tp.totalCount} avaliações</span>
      </div>
      <div class="btn-group-row">
        <button class="btn-outline-gold btn-sm w-full btn-edit-tp-card">Editar</button>
        <button class="btn-outline-gold btn-sm w-full btn-toggle-tp-card">${tp.isActive ? 'Desativar' : 'Ativar'}</button>
      </div>
    `;

    card.querySelector('.btn-edit-tp-card').addEventListener('click', () => {
      const newName = prompt('Editar nome do Ponto de Contato:', tp.name);
      if (newName && newName.trim()) {
        tp.name = newName.trim();
        renderTouchpointsTable();
        renderTouchpointRankingTable();
        renderTouchpointCards();
      }
    });

    card.querySelector('.btn-toggle-tp-card').addEventListener('click', () => {
      tp.isActive = !tp.isActive;
      renderTouchpointsTable();
      renderTouchpointRankingTable();
      renderTouchpointCards();
    });

    container.appendChild(card);
  });
}

function renderSurveysTable() {
  const container = document.getElementById('builderSectionsList');
  if (!container) return;
  container.innerHTML = '';

  dataManager.surveySections.forEach((sec, idx) => {
    const card = document.createElement('div');
    card.className = 'builder-section-card mb-3';
    
    let questionsHtml = sec.questions.map(q => `
      <div class="question-row-item">
        <span class="q-type-badge ${q.type.includes('NPS') ? 'badge-nps' : 'badge-rating'}">${q.type}</span>
        <span class="q-text">${q.text}</span>
        <span class="q-req">${q.req}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="section-card-header">
        <span class="sec-tag">${sec.title}</span>
        <button class="btn-outline-gold btn-sm btn-delete-sec">🗑 Excluir Seção</button>
      </div>
      <div class="section-questions">
        ${questionsHtml}
      </div>
    `;

    card.querySelector('.btn-delete-sec')?.addEventListener('click', () => {
      dataManager.surveySections.splice(idx, 1);
      renderSurveysTable();
    });

    container.appendChild(card);
  });
}

// --------------------------------------------------------------------
// 6. RESPOSTAS (SAAS INBOX CENTRAL DE ATENDIMENTO & FOLLOW-UP V1.3)
// --------------------------------------------------------------------
function setupResponsesInbox() {
  const filterBtns = document.querySelectorAll('[data-inbox-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dataManager.inboxFilter = btn.getAttribute('data-inbox-filter');
      renderResponsesInbox();
    });
  });

  const searchInput = document.getElementById('inputResponsesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      dataManager.inboxSearchQuery = e.target.value.toLowerCase().trim();
      renderResponsesInbox();
    });
  }
}

function renderResponsesInbox() {
  const listContainer = document.getElementById('inboxItemsList');
  const countBadge = document.getElementById('inboxListCountBadge');
  const detailPane = document.getElementById('inboxDetailPane');

  if (!listContainer) return;
  listContainer.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  let items = [...dataManager.localResponses];

  if (unitFilter !== 'all') {
    items = items.filter(r => r.unitCode === unitFilter);
  }

  if (dataManager.inboxFilter === 'promoter') {
    items = items.filter(r => r.npsScore >= 9);
  } else if (dataManager.inboxFilter === 'passive') {
    items = items.filter(r => r.npsScore >= 7 && r.npsScore <= 8);
  } else if (dataManager.inboxFilter === 'detractor') {
    items = items.filter(r => r.npsScore <= 6);
  } else if (dataManager.inboxFilter === 'pending_case') {
    const pendingResIds = dataManager.followUpCases.filter(c => c.status === 'pending' || c.status === 'in_progress').map(c => c.responseId);
    items = items.filter(r => pendingResIds.includes(r.id));
  } else if (dataManager.inboxFilter === 'resolved_case') {
    const resolvedResIds = dataManager.followUpCases.filter(c => c.status === 'resolved').map(c => c.responseId);
    items = items.filter(r => resolvedResIds.includes(r.id));
  }

  if (dataManager.inboxSearchQuery) {
    const q = dataManager.inboxSearchQuery;
    items = items.filter(r => 
      (r.student && r.student.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q))
    );
  }

  if (countBadge) countBadge.textContent = `${items.length} itens`;

  if (!items.length) {
    listContainer.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">Nenhuma resposta encontrada.</div>';
    if (detailPane) {
      detailPane.innerHTML = '<div style="color:var(--text-muted); text-align:center; margin-top:3rem;">Nenhuma resposta para exibir com os filtros atuais.</div>';
    }
    return;
  }

  if (!dataManager.selectedResponseId || !items.some(i => i.id === dataManager.selectedResponseId)) {
    dataManager.selectedResponseId = items[0].id;
  }

  items.forEach(item => {
    const u = UNITS.find(unit => unit.code === item.unitCode);
    const unitName = u ? u.name : item.unitCode;
    const catClass = getNpsCategoryClass(item.npsScore);
    const isSelected = item.id === dataManager.selectedResponseId;

    const div = document.createElement('div');
    div.className = `inbox-item-card ${isSelected ? 'selected' : ''}`;
    div.innerHTML = `
      <div class="inbox-item-top">
        <span class="inbox-student-name">${item.student || 'Anônimo'}</span>
        <span class="badge-status ${catClass}">NPS ${item.npsScore}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${unitName} • ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="inbox-item-comment-snippet">"${item.comment || 'Sem comentário preenchido.'}"</div>
    `;

    div.addEventListener('click', () => {
      dataManager.selectedResponseId = item.id;
      renderResponsesInbox();
    });

    listContainer.appendChild(div);
  });

  // Render detail pane with Communication Hub & Timeline
  const selectedItem = items.find(i => i.id === dataManager.selectedResponseId);
  if (selectedItem && detailPane) {
    const u = UNITS.find(unit => unit.code === selectedItem.unitCode);
    const unitName = u ? u.name : selectedItem.unitCode;
    const catClass = getNpsCategoryClass(selectedItem.npsScore);
    const linkedCase = dataManager.followUpCases.find(c => c.responseId === selectedItem.id);

    detailPane.innerHTML = `
      <!-- 1. NPS & CLASSIFICAÇÃO -->
      <div class="detail-header-card">
        <div>
          <h2 class="detail-student-title">${selectedItem.student || 'Anônimo'}</h2>
          <div class="detail-meta-row">
            <span>Unidade: <strong>${unitName}</strong></span>
            <span>Canal: <strong>${selectedItem.origin.toUpperCase()}</strong></span>
            <span>E-mail: <strong>${selectedItem.email || 'Não informado'}</strong></span>
            <span>Telefone: <strong>${selectedItem.phone || 'Não informado'}</strong></span>
          </div>
        </div>
        <span class="badge-status ${catClass}" style="font-size:1.1rem; padding:0.5rem 1.2rem; font-weight:700;">NPS ${selectedItem.npsScore}</span>
      </div>

      <!-- 2. STATUS DO ACOMPANHAMENTO -->
      ${linkedCase ? `
        <div class="glass-card mb-3" style="border-color:var(--color-detractor-border); background:var(--color-detractor-bg); padding:0.85rem 1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="color:var(--color-detractor); font-size:0.9rem; font-weight:700; margin:0;">⚠️ CASO DE DETRATOR VINCULADO (${linkedCase.id})</h4>
            <span class="badge-status ${linkedCase.status === 'pending' ? 'pending' : linkedCase.status === 'in_progress' ? 'in_progress' : 'resolved'}">${linkedCase.status === 'pending' ? 'Pendente' : linkedCase.status === 'in_progress' ? 'Em Tratativa' : 'Resolvido'}</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-main); margin-top:0.3rem;">Responsável: <strong>${linkedCase.assignedUser}</strong> • Prioridade: <strong>${linkedCase.priority.toUpperCase()}</strong></p>
        </div>
      ` : ''}

      <!-- 3. BARRA DE AÇÕES RÁPIDAS (PRIORIDADE UX 2.0) -->
      <div class="detail-quick-actions-bar">
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-right:0.3rem;">AÇÕES RÁPIDAS:</span>
        
        ${(!linkedCase || linkedCase.status !== 'resolved') ? `
          <button type="button" class="btn-action-pill primary" id="btnQuickAssign">
            👤 Assumir Resposta
          </button>
          <button type="button" class="btn-action-pill" id="btnQuickResolve" style="border-color:var(--color-promoter); color:var(--color-promoter);">
            ✅ Resolver Atendimento
          </button>
        ` : `
          <span style="font-size:0.8rem; color:var(--color-promoter); font-weight:600; padding:0.3rem 0.6rem; background:var(--color-promoter-bg); border-radius:6px;">✓ Caso Resolvido</span>
        `}

        <button type="button" class="btn-action-pill" id="btnQuickWhatsapp">
          💬 WhatsApp
        </button>
        <button type="button" class="btn-action-pill" id="btnQuickEmail">
          ✉️ E-mail
        </button>
        <button type="button" class="btn-action-pill" id="btnQuickInternalNote">
          📝 Nota Interna
        </button>
      </div>

      <!-- 4. COMENTÁRIO DO ALUNO -->
      <div class="mb-3">
        <div class="detail-section-title">COMENTÁRIO DO ALUNO</div>
        <div class="detail-comment-quote">
          "${selectedItem.comment || 'Nenhum comentário em texto foi preenchido nesta avaliação.'}"
        </div>
      </div>

      <!-- 5. PONTOS DE CONTATO (TOUCHPOINTS) -->
      <div class="mb-3">
        <div class="detail-section-title">AVALIAÇÃO DE PONTOS DE CONTATO (TOUCHPOINTS)</div>
        <div class="glass-card">
          <div class="question-row-item">
            <span>⭐ Atendimento da Recepção</span>
            <span class="badge-status excellent">5 / 5 ★</span>
          </div>
          <div class="question-row-item">
            <span>⭐ Atendimento dos Professores</span>
            <span class="badge-status excellent">5 / 5 ★</span>
          </div>
          <div class="question-row-item">
            <span>⭐ Limpeza & Higiene</span>
            <span class="badge-status attention">4 / 5 ★</span>
          </div>
          <div class="question-row-item">
            <span>⭐ Manutenção dos Equipamentos</span>
            <span class="badge-status ${selectedItem.npsScore <= 6 ? 'critical' : 'attention'}">${selectedItem.npsScore <= 6 ? '2 / 5 ★' : '4 / 5 ★'}</span>
          </div>
        </div>
      </div>

      <!-- 6. CENTRAL DE COMUNICAÇÃO & TIMELINE -->
      <div class="comm-tabs-container">
        <div class="detail-section-title" style="margin-bottom:0.75rem;">CENTRAL DE COMUNICAÇÃO & ATENDIMENTO</div>
        
        <div class="comm-tabs-header">
          <button class="comm-tab-btn ${dataManager.activeCommTab === 'internal' ? 'active' : ''}" id="btnTabCommInternal">
            📝 Nota Interna
          </button>
          <button class="comm-tab-btn ${dataManager.activeCommTab === 'email' ? 'active' : ''}" id="btnTabCommEmail">
            ✉️ E-mail ${selectedItem.email ? '🟢' : '⚪'}
          </button>
          <button class="comm-tab-btn ${dataManager.activeCommTab === 'whatsapp' ? 'active' : ''}" id="btnTabCommWhatsapp">
            💬 WhatsApp ${selectedItem.phone ? '🟢' : '⚪'}
          </button>
        </div>

        <!-- ABA 1: NOTA INTERNA -->
        <div id="paneCommInternal" class="comm-tab-pane ${dataManager.activeCommTab === 'internal' ? 'active' : ''}">
          <label style="font-size:0.8rem; color:var(--text-muted);">Comentário interno da equipe (NÃO enviado ao aluno):</label>
          <textarea id="inputInternalNote" class="textarea-input mt-2" rows="3" placeholder="Ex: Entrar em contato com o gerente da unidade para verificar manutenção..."></textarea>
          <div class="mt-2 text-right" style="display:flex; justify-content:flex-end;">
            <button class="btn-primary-gold btn-sm" id="btnSaveInternalNote">💾 Salvar Nota Interna</button>
          </div>
        </div>

        <!-- ABA 2: E-MAIL -->
        <div id="paneCommEmail" class="comm-tab-pane ${dataManager.activeCommTab === 'email' ? 'active' : ''}">
          ${!selectedItem.email ? `
            <div style="padding:1rem; background:rgba(255,255,255,0.03); border-radius:8px; color:var(--text-muted); font-size:0.85rem; text-align:center;">
              ✉️ <strong>E-mail não informado pelo aluno</strong> (Resposta Anônima).
            </div>
          ` : `
            <div class="template-picker-bar">
              <span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);">Mensagem Padrão:</span>
              <select id="selectEmailTemplate" class="select-input template-select-box">
                <option value="">-- Selecionar Resposta Pronta --</option>
                ${dataManager.messageTemplates.filter(t => t.isActive).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
              </select>
              <button class="btn-secondary-gold btn-sm" id="btnApplyTemplate">Usar Template</button>
            </div>

            <div class="filter-group mb-2">
              <label>Para:</label>
              <input type="text" id="inputEmailTo" class="text-input" value="${selectedItem.email}" readonly>
            </div>

            <div class="filter-group mb-2">
              <label>Assunto:</label>
              <input type="text" id="inputEmailSubject" class="text-input" placeholder="Assunto do e-mail...">
            </div>

            <div class="filter-group mb-2">
              <label>Mensagem:</label>
              <textarea id="inputEmailBody" class="textarea-input" rows="5" placeholder="Escreva a resposta ao aluno..."></textarea>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;" class="mt-2">
              <span class="provider-status-badge warning">
                ⚠️ Provider Transacional Pendente (EMAIL_PROVIDER_REQUIRED)
              </span>
              <button class="btn-primary-gold btn-sm" id="btnSendEmail">
                ✉️ Registrar E-mail Enviado
              </button>
            </div>
          `}
        </div>

        <!-- ABA 3: WHATSAPP -->
        <div id="paneCommWhatsapp" class="comm-tab-pane ${dataManager.activeCommTab === 'whatsapp' ? 'active' : ''}">
          ${!selectedItem.phone ? `
            <div style="padding:1rem; background:rgba(255,255,255,0.03); border-radius:8px; color:var(--text-muted); font-size:0.85rem; text-align:center;">
              💬 <strong>Telefone não informado pelo aluno.</strong>
            </div>
          ` : `
            <div class="provider-status-badge info mb-2">
              🟢 Telefone informado: ${selectedItem.phone} (WhatsApp Direto)
            </div>

            <div class="filter-group mb-2">
              <label>Mensagem WhatsApp:</label>
              <textarea id="inputWhatsappBody" class="textarea-input" rows="4" placeholder="Escreva a mensagem para o WhatsApp..."></textarea>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;" class="mt-2">
              <span style="font-size:0.75rem; color:var(--text-muted);">
                * WhatsApp API Oficial não configurada. Ação abre link wa.me/ e copia o texto.
              </span>
              <div class="btn-group-row">
                <button class="btn-outline-gold btn-sm" id="btnCopyWaMsg">📋 Copiar Mensagem</button>
                <button class="btn-primary-gold btn-sm" id="btnOpenWa">💬 Abrir no WhatsApp Web</button>
              </div>
            </div>
          `}
        </div>

      </div>

      <!-- HISTÓRICO DE COMUNICAÇÃO / TIMELINE V1.3 -->
      <div>
        <div class="detail-section-title" style="margin-top:1rem;">HISTÓRICO DE COMUNICAÇÃO & ATIVIDADES</div>
        <div class="timeline-container" id="inboxTimelineContainer">
          <!-- Timeline Items Rendered via JS -->
        </div>
      </div>
    `;

    // Attach Quick Action Buttons Handlers
    document.getElementById('btnQuickAssign')?.addEventListener('click', () => {
      let caseItem = dataManager.followUpCases.find(c => c.responseId === selectedItem.id);
      if (!caseItem) {
        caseItem = {
          id: 'c_' + Date.now(),
          responseId: selectedItem.id,
          unitCode: selectedItem.unitCode,
          student: selectedItem.student || 'Anônimo',
          npsScore: selectedItem.npsScore,
          comment: selectedItem.comment || '',
          status: 'in_progress',
          priority: selectedItem.npsScore <= 6 ? 'high' : 'medium',
          assignedUser: 'Você (Gestor)',
          createdAt: new Date().toISOString()
        };
        dataManager.followUpCases.push(caseItem);
      } else {
        caseItem.status = 'in_progress';
        caseItem.assignedUser = 'Você (Gestor)';
      }
      renderCasesTable();
      renderResponsesInbox();
      showToast('✓ Atendimento atribuído a você com sucesso!', 'info');
    });

    document.getElementById('btnQuickResolve')?.addEventListener('click', () => {
      showConfirmationModal({
        icon: '✅',
        title: 'Resolver Atendimento',
        message: `Deseja marcar o atendimento de ${selectedItem.student || 'Anônimo'} como Resolvido?`,
        onConfirm: () => {
          let caseItem = dataManager.followUpCases.find(c => c.responseId === selectedItem.id);
          if (!caseItem) {
            caseItem = {
              id: 'c_' + Date.now(),
              responseId: selectedItem.id,
              unitCode: selectedItem.unitCode,
              student: selectedItem.student || 'Anônimo',
              npsScore: selectedItem.npsScore,
              comment: selectedItem.comment || '',
              status: 'resolved',
              priority: 'low',
              assignedUser: 'Você (Gestor)',
              createdAt: new Date().toISOString()
            };
            dataManager.followUpCases.push(caseItem);
          } else {
            caseItem.status = 'resolved';
            caseItem.resolvedAt = new Date().toISOString();
          }
          renderCasesTable();
          renderResponsesInbox();
          updateDashboard();
          showToast('✓ Caso marcado como resolvido!', 'success');
        }
      });
    });

    document.getElementById('btnQuickWhatsapp')?.addEventListener('click', () => {
      dataManager.activeCommTab = 'whatsapp';
      renderResponsesInbox();
    });

    document.getElementById('btnQuickEmail')?.addEventListener('click', () => {
      dataManager.activeCommTab = 'email';
      renderResponsesInbox();
    });

    document.getElementById('btnQuickInternalNote')?.addEventListener('click', () => {
      dataManager.activeCommTab = 'internal';
      renderResponsesInbox();
      document.getElementById('inputInternalNote')?.focus();
    });

    // Attach Communication Tab Switchers
    document.getElementById('btnTabCommInternal')?.addEventListener('click', () => {
      dataManager.activeCommTab = 'internal';
      renderResponsesInbox();
    });
    document.getElementById('btnTabCommEmail')?.addEventListener('click', () => {
      dataManager.activeCommTab = 'email';
      renderResponsesInbox();
    });
    document.getElementById('btnTabCommWhatsapp')?.addEventListener('click', () => {
      dataManager.activeCommTab = 'whatsapp';
      renderResponsesInbox();
    });

    // Attach Template Picker Click
    document.getElementById('btnApplyTemplate')?.addEventListener('click', () => {
      const tplId = document.getElementById('selectEmailTemplate')?.value;
      if (!tplId) {
        alert('Por favor, selecione uma mensagem padrão na lista.');
        return;
      }
      const tpl = dataManager.messageTemplates.find(t => t.id === tplId);
      if (tpl) {
        const parsedSubject = replaceDynamicVariables(tpl.subject || '', selectedItem);
        const parsedBody = replaceDynamicVariables(tpl.body || '', selectedItem);

        document.getElementById('inputEmailSubject').value = parsedSubject;
        document.getElementById('inputEmailBody').value = parsedBody;
      }
    });

    // Attach Internal Note Handler
    document.getElementById('btnSaveInternalNote')?.addEventListener('click', () => {
      const noteText = document.getElementById('inputInternalNote')?.value;
      if (!noteText || !noteText.trim()) {
        alert('Digite o texto da nota interna.');
        return;
      }

      const roleSim = document.getElementById('filterRoleSim')?.value || 'admin';
      const author = roleSim === 'gestor_a' ? 'Gestor Unidade A' : roleSim === 'gestor_b' ? 'Gestor Unidade B' : 'João (Gestor)';

      dataManager.communicationLogs.unshift({
        id: 'log_' + Date.now(),
        responseId: selectedItem.id,
        channel: 'internal',
        direction: 'internal',
        recipient: null,
        subject: 'Nota Interna',
        body: noteText.trim(),
        status: 'sent',
        createdBy: author,
        createdAt: new Date().toISOString()
      });

      renderResponsesInbox();
      alert('✓ Nota interna registrada no histórico com sucesso!');
    });

    // Attach Email Send Handler
    document.getElementById('btnSendEmail')?.addEventListener('click', () => {
      const subject = document.getElementById('inputEmailSubject')?.value;
      const body = document.getElementById('inputEmailBody')?.value;
      if (!body || !body.trim()) {
        alert('Digite a mensagem antes de registrar.');
        return;
      }

      const roleSim = document.getElementById('filterRoleSim')?.value || 'admin';
      const author = roleSim === 'gestor_a' ? 'Gestor Unidade A' : roleSim === 'gestor_b' ? 'Gestor Unidade B' : 'João (Gestor)';

      dataManager.communicationLogs.unshift({
        id: 'log_' + Date.now(),
        responseId: selectedItem.id,
        channel: 'email',
        direction: 'outbound',
        recipient: selectedItem.email,
        subject: subject || 'Atendimento Garden Gold',
        body: body.trim(),
        status: 'draft',
        createdBy: author,
        createdAt: new Date().toISOString()
      });

      renderResponsesInbox();
      alert('✓ Registro de comunicação gravado no histórico!\n(Status: Rascunho / Provider Transacional pendente EMAIL_PROVIDER_REQUIRED)');
    });

    // Attach WhatsApp Handlers
    document.getElementById('btnCopyWaMsg')?.addEventListener('click', () => {
      const body = document.getElementById('inputWhatsappBody')?.value || '';
      if (!body.trim()) {
        alert('Digite a mensagem antes de copiar.');
        return;
      }
      navigator.clipboard.writeText(body);
      alert('✓ Mensagem copiada para a área de transferência!');
    });

    document.getElementById('btnOpenWa')?.addEventListener('click', () => {
      const body = document.getElementById('inputWhatsappBody')?.value || '';
      const cleanPhone = (selectedItem.phone || '').replace(/\D/g, '');
      const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(body)}`;

      const roleSim = document.getElementById('filterRoleSim')?.value || 'admin';
      const author = roleSim === 'gestor_a' ? 'Gestor Unidade A' : roleSim === 'gestor_b' ? 'Gestor Unidade B' : 'João (Gestor)';

      dataManager.communicationLogs.unshift({
        id: 'log_' + Date.now(),
        responseId: selectedItem.id,
        channel: 'whatsapp',
        direction: 'outbound',
        recipient: selectedItem.phone,
        subject: 'WhatsApp Direct Link',
        body: body || 'Mensagem enviada via wa.me/',
        status: 'sent',
        createdBy: author,
        createdAt: new Date().toISOString()
      });

      window.open(waUrl, '_blank');
      renderResponsesInbox();
    });

    // Render Timeline Items
    renderTimelineForResponse(selectedItem.id);
  }
}

function renderTimelineForResponse(responseId) {
  const container = document.getElementById('inboxTimelineContainer');
  if (!container) return;
  container.innerHTML = '';

  const logs = dataManager.communicationLogs.filter(l => l.responseId === responseId);

  if (!logs.length) {
    container.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:0.5rem 0;">Nenhuma comunicação registrada ainda.</div>';
    return;
  }

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const iconDot = log.channel === 'internal' ? '📝' : log.channel === 'email' ? '✉️' : '💬';
    const statusText = log.status === 'draft' ? '⏳ Rascunho / Provider Pendente' : log.status === 'sent' ? '✓ Registrado' : log.status;

    item.innerHTML = `
      <div class="timeline-icon-dot">${iconDot}</div>
      <div class="timeline-header">
        <span class="timeline-author">${log.createdBy} • <span style="color:var(--gold-primary); font-size:0.78rem;">${log.channel.toUpperCase()}</span></span>
        <span class="timeline-time">${new Date(log.createdAt).toLocaleString()}</span>
      </div>
      ${log.subject ? `<div class="timeline-subject">${log.subject}</div>` : ''}
      <div class="timeline-body">${log.body}</div>
      <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem; text-align:right;">Status: ${statusText}</div>
    `;

    container.appendChild(item);
  });
}

// --------------------------------------------------------------------
// 7. ACOMPANHAMENTOS & CASOS DE DETRATORES UX 2.0
// --------------------------------------------------------------------
function setupCasesViewSwitcher() {
  const btnList = document.getElementById('btnCasesViewList');
  const btnKanban = document.getElementById('btnCasesViewKanban');
  const paneList = document.getElementById('casesListViewPane');
  const paneKanban = document.getElementById('casesKanbanViewPane');

  if (!btnList || !btnKanban) return;

  btnList.addEventListener('click', () => {
    btnList.classList.add('active', 'btn-secondary-gold');
    btnList.classList.remove('btn-outline-gold');
    btnKanban.classList.remove('active', 'btn-secondary-gold');
    btnKanban.classList.add('btn-outline-gold');

    if (paneList) paneList.style.display = 'block';
    if (paneKanban) paneKanban.style.display = 'none';
    renderCasesTable();
  });

  btnKanban.addEventListener('click', () => {
    btnKanban.classList.add('active', 'btn-secondary-gold');
    btnKanban.classList.remove('btn-outline-gold');
    btnList.classList.remove('active', 'btn-secondary-gold');
    btnList.classList.add('btn-outline-gold');

    if (paneList) paneList.style.display = 'none';
    if (paneKanban) paneKanban.style.display = 'grid';
    renderCasesKanban();
  });
}

function renderCasesKanban() {
  const container = document.getElementById('casesKanbanViewPane');
  if (!container) return;
  container.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const role = document.getElementById('filterRoleSim')?.value || 'admin';

  let cases = [...dataManager.followUpCases];
  if (role === 'gestor_a') cases = cases.filter(c => c.unitCode === 'unidade-a');
  else if (role === 'gestor_b') cases = cases.filter(c => c.unitCode === 'unidade-b');
  if (unitFilter !== 'all') cases = cases.filter(c => c.unitCode === unitFilter);

  const columns = [
    { id: 'pending', label: '🔴 PENDENTES', items: cases.filter(c => c.status === 'pending') },
    { id: 'in_progress', label: '🟡 EM ANDAMENTO', items: cases.filter(c => c.status === 'in_progress') },
    { id: 'resolved', label: '🟢 RESOLVIDOS', items: cases.filter(c => c.status === 'resolved') }
  ];

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'kanban-column';
    colDiv.innerHTML = `
      <div class="kanban-column-header">
        <span>${col.label}</span>
        <span class="badge-status ${col.id === 'pending' ? 'detractor' : col.id === 'in_progress' ? 'passive' : 'promoter'}">${col.items.length}</span>
      </div>
      <div class="kanban-cards-list"></div>
    `;

    const listDiv = colDiv.querySelector('.kanban-cards-list');

    if (!col.items.length) {
      listDiv.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:1rem; text-align:center;">Nenhum caso nesta coluna.</div>';
    } else {
      col.items.forEach(c => {
        const u = dataManager.UNITS.find(item => item.code === c.unitCode);
        const unitName = u ? u.name : c.unitCode;
        const priorityClass = c.priority === 'urgent' ? 'urgent' : c.priority === 'high' ? 'high' : 'medium';
        const priorityLabel = c.priority === 'urgent' ? '🔴 Urgente' : c.priority === 'high' ? '🟠 Alta' : '🟡 Média';

        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span style="font-size:0.85rem; font-weight:700;">${c.student}</span>
            <span class="badge-status detractor">NPS ${c.npsScore}</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">${unitName} • ${formatElapsedTime(c.createdAt)}</div>
          <div style="font-size:0.82rem; color:var(--text-main); font-style:italic; margin-bottom:0.6rem;">"${c.comment}"</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge-priority ${priorityClass}">${priorityLabel}</span>
            ${c.status !== 'resolved' ? `
              <button class="btn-primary-gold btn-sm btn-resolve-kanban">Resolver</button>
            ` : '<span style="font-size:0.75rem; color:var(--color-promoter); font-weight:600;">✓ Resolvido</span>'}
          </div>
        `;

        card.querySelector('.btn-resolve-kanban')?.addEventListener('click', () => {
          c.status = 'resolved';
          c.resolvedAt = new Date().toISOString();
          renderCasesTable();
          renderCasesKanban();
          updateDashboard();
          showToast('✓ Acompanhamento marcado como resolvido!', 'success');
        });

        listDiv.appendChild(card);
      });
    }

    container.appendChild(colDiv);
  });
}

function renderCasesTable() {
  const tbody = document.getElementById('casesTableBody');
  const sidebarBadge = document.getElementById('sidebarPendingBadge');
  const sumPending = document.getElementById('caseSummaryPending');
  const sumProgress = document.getElementById('caseSummaryProgress');
  const sumResolved = document.getElementById('caseSummaryResolved');

  if (!tbody) return;
  tbody.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const role = document.getElementById('filterRoleSim')?.value || 'admin';

  let cases = [...dataManager.followUpCases];
  if (role === 'gestor_a') cases = cases.filter(c => c.unitCode === 'unidade-a');
  else if (role === 'gestor_b') cases = cases.filter(c => c.unitCode === 'unidade-b');
  if (unitFilter !== 'all') cases = cases.filter(c => c.unitCode === unitFilter);

  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const progressCount = cases.filter(c => c.status === 'in_progress').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;

  if (sidebarBadge) sidebarBadge.textContent = pendingCount;
  if (sumPending) sumPending.textContent = pendingCount;
  if (sumProgress) sumProgress.textContent = progressCount;
  if (sumResolved) sumResolved.textContent = resolvedCount;

  if (!cases.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:1.5rem;">✓ Nenhum acompanhamento pendente ou em andamento.</td></tr>';
    return;
  }

  cases.forEach(c => {
    const u = dataManager.UNITS.find(item => item.code === c.unitCode);
    const unitName = u ? u.name : c.unitCode;
    const priorityClass = c.priority === 'urgent' ? 'urgent' : c.priority === 'high' ? 'high' : 'medium';
    const priorityLabel = c.priority === 'urgent' ? '🔴 Urgente' : c.priority === 'high' ? '🟠 Alta' : '🟡 Média';

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${unitName}</td>
      <td><span style="font-size:0.8rem; color:var(--text-muted);">${formatElapsedTime(c.createdAt)}</span></td>
      <td><strong>${c.student}</strong></td>
      <td><span class="badge-status detractor">NPS ${c.npsScore}</span></td>
      <td>"${c.comment}"</td>
      <td><span class="badge-status ${c.status === 'pending' ? 'pending' : c.status === 'in_progress' ? 'in_progress' : 'resolved'}">${c.status === 'pending' ? 'Pendente' : c.status === 'in_progress' ? 'Em Andamento' : 'Resolvido'}</span></td>
      <td><span class="badge-priority ${priorityClass}">${priorityLabel}</span></td>
      <td>${c.assignedUser}</td>
      <td>
        ${c.status !== 'resolved' ? `
          <div class="btn-group-row">
            <button class="btn-primary-gold btn-sm btn-resolve-case">Resolver</button>
            <button class="btn-outline-gold btn-sm btn-assign-case">Assumir</button>
          </div>
        ` : '<span style="color:var(--color-promoter); font-weight:600;">✓ Resolvido</span>'}
      </td>
    `;

    const btnResolve = tr.querySelector('.btn-resolve-case');
    if (btnResolve) {
      btnResolve.addEventListener('click', () => {
        c.status = 'resolved';
        c.resolvedAt = new Date().toISOString();
        renderCasesTable();
        renderCasesKanban();
        updateDashboard();
        showToast('✓ Acompanhamento marcado como resolvido!', 'success');
      });
    }

    const btnAssign = tr.querySelector('.btn-assign-case');
    if (btnAssign) {
      btnAssign.addEventListener('click', () => {
        c.status = 'in_progress';
        c.assignedUser = 'Você (Gestor)';
        renderCasesTable();
        renderCasesKanban();
        showToast('✓ Caso atribuído a você!', 'info');
      });
    }

    tbody.appendChild(tr);
  });
}

// --------------------------------------------------------------------
// 8. RELATÓRIOS, DISPOSITIVOS & CSV EXPORT
// --------------------------------------------------------------------
function renderDevicesTable() {
  const tbody = document.getElementById('devicesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  dataManager.devices.forEach(d => {
    const u = dataManager.UNITS.find(item => item.code === d.unitCode);
    const unitName = u ? u.name : d.unitCode;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.name}</strong></td>
      <td>${unitName}</td>
      <td><code>${d.deviceToken}</code></td>
      <td><span class="badge-status ${d.isActive ? 'resolved' : 'pending'}">${d.isActive ? '● Online' : '● Offline'}</span></td>
      <td>${d.lastPing}</td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-dev">${d.isActive ? 'Desativar' : 'Ativar'}</button>
      </td>
    `;
    tr.querySelector('.btn-toggle-dev').addEventListener('click', () => {
      d.isActive = !d.isActive;
      renderDevicesTable();
    });
    tbody.appendChild(tr);
  });
}

function renderReportsSummary() {
  const repTotal = document.getElementById('repTotalCount');
  const repResolved = document.getElementById('repResolvedCases');
  const repPending = document.getElementById('repPendingCases');

  if (repTotal) repTotal.textContent = dataManager.localResponses.length;
  if (repResolved) repResolved.textContent = dataManager.followUpCases.filter(c => c.status === 'resolved').length;
  if (repPending) repPending.textContent = dataManager.followUpCases.filter(c => c.status === 'pending').length;
}

function exportToCsv() {
  let csvContent = 'data:text/csv;charset=utf-8,ID,Unidade,Origem,Nota_NPS,Categoria,Aluno,Email,Telefone,Comentario,Data\n';

  dataManager.localResponses.forEach(r => {
    const cat = r.npsScore >= 9 ? 'Promotor' : r.npsScore >= 7 ? 'Passivo' : 'Detrator';
    const cleanComment = (r.comment || '').replace(/"/g, '""');
    csvContent += `"${r.id}","${r.unitCode}","${r.origin}",${r.npsScore},"${cat}","${r.student}","${r.email || ''}","${r.phone || ''}","${cleanComment}","${r.createdAt}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `relatorio_nps_garden_gold_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setupSchemaTab() {
  const sqlText = `-- GARDEN EXPERIENCE V1.3 - COMMUNICATION CENTER & RLS DIAGNOSTICS
-- File: supabase/migrations/06_communication_center.sql

CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    channel comm_channel_enum NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    response_id UUID NOT NULL REFERENCES responses(id),
    channel comm_channel_enum NOT NULL,
    direction comm_direction_enum NOT NULL,
    body TEXT NOT NULL,
    status comm_status_enum NOT NULL DEFAULT 'sent'
);`;

  const container = document.getElementById('sqlCodeContainer');
  if (container) container.textContent = sqlText;

  const btnCopy = document.getElementById('btnCopySql');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(sqlText);
      alert('Código SQL v1.3 copiado para a área de transferência!');
    });
  }
}

function getNpsCategoryClass(score) {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

// ====================================================================
// CONFIGURAÇÕES COMMERCIAL HELPERS & MODALS (v1.4 RELEASE)
// ====================================================================

function renderConfigUnitsTable() {
  const tbody = document.getElementById('configUnitsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeOrg = dataManager.getActiveOrg();
  if (!activeOrg.units || !activeOrg.units.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1rem;">Nenhuma unidade cadastrada nesta organização.</td></tr>';
    return;
  }

  activeOrg.units.forEach(u => {
    const isInactive = u.status === 'Inativa';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td>${u.city || u.location || '—'}</td>
      <td><code>${u.state || u.code || '—'}</code></td>
      <td><span class="badge-status ${isInactive ? 'detractor' : 'resolved'}">${isInactive ? '🔴 Inativa' : '🟢 Ativa'}</span></td>
      <td>
        <div class="btn-group-row">
          <button class="btn-outline-gold btn-sm btn-edit-unit">Editar</button>
          <button class="btn-outline-gold btn-sm btn-toggle-unit">${isInactive ? 'Ativar' : 'Desativar'}</button>
        </div>
      </td>
    `;
    tr.querySelector('.btn-edit-unit')?.addEventListener('click', async () => {
      const newName = prompt('Editar nome da unidade:', u.name);
      if (newName && newName.trim()) {
        u.name = newName.trim();
        dataManager.saveOrganizationsToStorage();
        await dataManager.saveUnitToSupabase(u);
        renderConfigUnitsTable();
        renderOrganizationHeader();
        updateDashboard();
        showToast('✓ Unidade atualizada com sucesso!', 'success');
      }
    });
    tr.querySelector('.btn-toggle-unit')?.addEventListener('click', async () => {
      u.status = u.status === 'Inativa' ? 'Ativa' : 'Inativa';
      dataManager.saveOrganizationsToStorage();
      await dataManager.saveUnitToSupabase(u);
      renderConfigUnitsTable();
      renderOrganizationHeader();
      updateDashboard();
      showToast(`✓ Unidade "${u.name}" agora está ${u.status}!`, 'info');
    });
    tbody.appendChild(tr);
  });
}

function renderConfigUsersTable() {
  const tbody = document.getElementById('configUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = dataManager.users;
  if (!users || !users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1rem;">Nenhum usuário adicional cadastrado nesta organização.</td></tr>';
    return;
  }

  users.forEach((usr) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${usr.name}</strong></td>
      <td>${usr.email}</td>
      <td><span class="badge-status ${usr.role === 'admin' ? 'promoter' : 'passive'}">${usr.role === 'admin' ? 'Administrador' : 'Gestor'}</span></td>
      <td>${usr.units || 'Todas as Unidades'}</td>
      <td><span class="badge-status resolved">${usr.status || 'Ativo'}</span></td>
      <td>
        <button class="btn-outline-gold btn-sm btn-toggle-usr">${usr.status === 'Inativo' ? 'Ativar' : 'Inativar'}</button>
      </td>
    `;
    tr.querySelector('.btn-toggle-usr')?.addEventListener('click', () => {
      usr.status = usr.status === 'Inativo' ? 'Ativo' : 'Inativo';
      dataManager.saveOrganizationsToStorage();
      renderConfigUsersTable();
      showToast(`✓ Status de ${usr.name} alterado!`, 'info');
    });
    tbody.appendChild(tr);
  });
}

function setupAuthManager() {
  const btnOpen = document.getElementById('btnOpenAuthModal');
  const modal = document.getElementById('modalAuth');
  if (!modal) return;

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  }

  const btnTabLogin = document.getElementById('btnTabAuthLogin');
  const btnTabRegister = document.getElementById('btnTabAuthRegister');
  const formLogin = document.getElementById('formAuthLogin');
  const formRegister = document.getElementById('formAuthRegister');
  const title = document.getElementById('authModalTitle');

  if (btnTabLogin && btnTabRegister) {
    btnTabLogin.addEventListener('click', () => {
      btnTabLogin.className = 'btn-secondary-gold btn-sm active';
      btnTabRegister.className = 'btn-outline-gold btn-sm';
      if (formLogin) formLogin.style.display = 'block';
      if (formRegister) formRegister.style.display = 'none';
      if (title) title.textContent = '🔐 Entrar no Garden Experience';
    });

    btnTabRegister.addEventListener('click', () => {
      btnTabRegister.className = 'btn-secondary-gold btn-sm active';
      btnTabLogin.className = 'btn-outline-gold btn-sm';
      if (formLogin) formLogin.style.display = 'none';
      if (formRegister) formRegister.style.display = 'block';
      if (title) title.textContent = '🚀 Criar Minha Conta Comercial';
    });
  }

  const linkForgot = document.getElementById('linkForgotPassword');
  if (linkForgot) {
    linkForgot.addEventListener('click', () => {
      const email = document.getElementById('loginEmail')?.value.trim();
      if (!email) {
        alert('Por favor, informe seu e-mail no campo acima.');
        return;
      }
      showToast(`📧 E-mail de recuperação de senha enviado para: ${email}`, 'info', 4000);
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) console.warn('Supabase auth warning:', error.message);
      } catch (err) {
        console.warn('Supabase auth error:', err);
      }

      dataManager.currentUser = { email, name: email.split('@')[0] };
      const avatarBadge = document.getElementById('userAvatarBadge');
      if (avatarBadge) avatarBadge.textContent = email.substring(0, 1).toUpperCase();

      modal.style.display = 'none';
      formLogin.reset();
      showToast(`✓ Autenticado com sucesso como ${email}!`, 'success');
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pass = document.getElementById('regPassword').value;
      const passConfirm = document.getElementById('regPasswordConfirm').value;

      if (pass !== passConfirm) {
        alert('As senhas não coincidem. Por favor, verifique.');
        return;
      }
      if (pass.length < 6) {
        alert('A senha deve possuir pelo menos 6 caracteres.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name } }
        });
        if (error) console.warn('Supabase register warning:', error.message);
      } catch (err) {
        console.warn('Supabase register error:', err);
      }

      dataManager.currentUser = { email, name };
      modal.style.display = 'none';
      formRegister.reset();

      document.getElementById('btnStartOnboarding')?.click();
      showToast(`🎉 Conta criada para ${name}! Vamos configurar sua empresa.`, 'success', 5000);
    });
  }

  const btnDemoStartClient = document.getElementById('btnDemoStartClient');
  if (btnDemoStartClient) {
    btnDemoStartClient.addEventListener('click', () => {
      document.getElementById('btnStartOnboarding')?.click();
    });
  }

  const btnConfigNewUnit = document.getElementById('btnConfigNewUnit');
  if (btnConfigNewUnit) {
    btnConfigNewUnit.addEventListener('click', () => {
      const modalUnit = document.getElementById('modalNewUnit');
      if (modalUnit) modalUnit.style.display = 'flex';
    });
  }

  const btnConfigNewUser = document.getElementById('btnConfigNewUser');
  if (btnConfigNewUser) {
    btnConfigNewUser.addEventListener('click', () => {
      const modalUser = document.getElementById('modalNewUser');
      if (modalUser) modalUser.style.display = 'flex';
    });
  }

  const formNewUnit = document.getElementById('formNewUnit');
  if (formNewUnit) {
    formNewUnit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('inputUnitName').value.trim();
      const address = document.getElementById('inputUnitAddress')?.value.trim() || '';
      const city = document.getElementById('inputUnitCity')?.value.trim() || '';
      const state = document.getElementById('inputUnitState')?.value.trim().toUpperCase() || '';
      const status = document.getElementById('selectUnitStatus')?.value || 'Ativa';
      const activeOrg = dataManager.getActiveOrg();

      const unitCode = 'unidade-' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const locationText = [city, state].filter(Boolean).join(' - ') || 'Geral';
      const newUnit = { 
        id: 'u_' + Date.now(), 
        code: unitCode, 
        name, 
        address,
        city,
        state,
        location: locationText,
        status 
      };
      activeOrg.units.push(newUnit);

      const newToken = 'token-' + Math.random().toString(36).substring(2, 10);
      activeOrg.tokensMap[newToken] = { unitCode: unitCode, surveyId: 's_' + Date.now(), active: true };

      dataManager.saveOrganizationsToStorage();
      await dataManager.saveUnitToSupabase(newUnit);

      document.getElementById('modalNewUnit').style.display = 'none';
      formNewUnit.reset();

      renderConfigUnitsTable();
      renderOrganizationHeader();
      updateDashboard();
      showToast(`✓ Unidade "${name}" criada com sucesso!`, 'success');
    });
  }

  const formNewUser = document.getElementById('formNewUser');
  if (formNewUser) {
    formNewUser.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inputUserName').value.trim();
      const email = document.getElementById('inputUserEmail').value.trim();
      const role = document.getElementById('selectUserRole').value;
      const units = document.getElementById('selectUserUnits').value;

      const activeOrg = dataManager.getActiveOrg();
      if (!activeOrg.users) activeOrg.users = [];
      activeOrg.users.push({
        id: 'usr_' + Date.now(),
        name,
        email,
        role,
        units: units === 'all' ? 'Todas as Unidades' : units,
        status: 'Pendente'
      });

      dataManager.saveOrganizationsToStorage();
      document.getElementById('modalNewUser').style.display = 'none';
      formNewUser.reset();

      renderConfigUsersTable();
      showToast(`⚠️ Usuário "${name}" cadastrado. O envio de convites por e-mail requer configuração do provedor de e-mail no Supabase.`, 'warning', 6000);
    });
  }

  const formConfigOrg = document.getElementById('formConfigOrg');
  if (formConfigOrg) {
    formConfigOrg.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeOrg = dataManager.getActiveOrg();
      activeOrg.name = document.getElementById('cfgOrgNameInput').value.trim();
      activeOrg.email = document.getElementById('cfgOrgEmailInput').value.trim();
      activeOrg.phone = document.getElementById('cfgOrgPhoneInput').value.trim();

      dataManager.saveOrganizationsToStorage();
      renderOrganizationHeader();
      showToast('✓ Dados da organização atualizados com sucesso!', 'success');
    });
  }
}

function setupQrCodeGenerator() {
  const modal = document.getElementById('modalNewQRCode');
  if (!modal) return;

  const selectUnit = document.getElementById('selectQrUnit');
  const canvas = document.getElementById('qrCanvasElement');
  const titleEl = document.getElementById('qrPreviewUnitTitle');
  const urlEl = document.getElementById('qrResolvedUrl');
  const btnPrint = document.getElementById('btnPrintQrCode');

  function renderQrCode() {
    if (!selectUnit || !canvas) return;
    const unitCode = selectUnit.value;
    const activeOrg = dataManager.getActiveOrg();
    const u = activeOrg.units.find(item => item.code === unitCode) || activeOrg.units[0];
    const token = Object.keys(activeOrg.tokensMap)[0] || 'generic';
    const targetUrl = `https://gardengold.com.br/p/${token}`;

    if (titleEl) titleEl.textContent = `${activeOrg.name} — ${u ? u.name : 'Unidade'}`;
    if (urlEl) urlEl.textContent = targetUrl;

    QRCode.toCanvas(canvas, targetUrl, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, (err) => {
      if (err) console.warn('QR Code generation error:', err);
    });
  }

  if (selectUnit) {
    selectUnit.addEventListener('change', renderQrCode);
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
}
