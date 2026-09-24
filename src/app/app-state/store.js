/**
 * Central Reactive Application State Store
 * Manages active organization context and runtime state cleanly without fake databases.
 */

import { calculateNPS } from '../../surveys/services/npsService.js';

export const DEFAULT_TOUCHPOINTS = [
  { id: 't1', name: 'Atendimento da Recepção', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
  { id: 't2', name: 'Atendimento dos Professores', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
  { id: 't3', name: 'Limpeza & Higiene', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
  { id: 't4', name: 'Manutenção dos Equipamentos', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' }
];

export const DEFAULT_TEMPLATES = [
  { id: 'tpl_1', name: 'Agradecimento — Feedback positivo', description: 'Mensagem para alunos promotores (notas 9 e 10).', channel: 'email', subject: 'Obrigado pelo seu feedback!', body: 'Olá, {{nome}}!\n\nAgradecemos por compartilhar sua experiência com a {{organizacao}} ({{unidade}}).\nSua nota {{nps}} nos motiva a continuar oferecendo o melhor atendimento.\n\nAtenciosamente,\n{{gestor}}', isActive: true, updatedAt: new Date().toISOString() },
  { id: 'tpl_2', name: 'Retorno — Sugestão', description: 'Resposta para alunos neutros ou com sugestões de melhoria.', channel: 'email', subject: 'Recebemos sua sugestão', body: 'Olá, {{nome}}!\n\nAgradecemos por compartilhar sua opinião sobre a {{unidade}}.\nSeu feedback com nota {{nps}} foi encaminhado para nossa coordenação.\n\nObrigado por nos ajudar a evoluir a {{organizacao}}.\n\nAtenciosamente,\n{{gestor}}', isActive: true, updatedAt: new Date().toISOString() },
  { id: 'tpl_3', name: 'Problema resolvido', description: 'Mensagem para detratores com problema solucionado.', channel: 'email', subject: 'Retorno sobre seu atendimento', body: 'Olá, {{nome}}!\n\nEstamos entrando em contato referente à sua avaliação na {{unidade}}.\nGostaríamos de informar que sua observação sobre "{{touchpoint}}" foi corrigida pela nossa equipe.\n\nUm abraço,\n{{gestor}}', isActive: true, updatedAt: new Date().toISOString() }
];

export function createEmptyOrg(id = null, name = 'Organização') {
  return {
    id: id || 'org_' + Date.now(),
    name,
    code: name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'org',
    email: '',
    phone: '',
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
  };
}

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
    this.isSupabaseConnected = true;
  }

  getActiveOrg() {
    if (this.organizations.length > 0) {
      const found = this.organizations.find(o => o && o.id === this.activeOrgId);
      if (found) return found;
      return this.organizations[0];
    }

    if (!this._fallbackEmptyOrg) {
      this._fallbackEmptyOrg = createEmptyOrg(null, 'Organização');
    }
    return this._fallbackEmptyOrg;
  }

  setActiveOrg(orgId) {
    const org = this.organizations.find(o => o && o.id === orgId);
    if (org) {
      this.activeOrgId = org.id;
      const activeTokens = Object.keys(this.TOKENS_MAP);
      this.currentSurveyToken = activeTokens.length > 0 ? activeTokens[0] : 'generic';
    }
  }

  createOrganization(data) {
    const orgId = 'org_' + Date.now();
    const unit1Code = 'unidade-' + (data.unitName ? data.unitName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'centro');
    
    const units = [
      { id: 'u_' + Date.now(), code: unit1Code, name: data.unitName || 'Unidade Principal', location: data.unitCity || 'Geral', status: 'Ativa' }
    ];

    if (data.unit2Name && data.unit2Name.trim()) {
      const unit2Code = 'unidade-' + data.unit2Name.toLowerCase().replace(/[^a-z0-9]/g, '');
      units.push({ id: 'u_' + (Date.now() + 1), code: unit2Code, name: data.unit2Name.trim(), location: data.unitCity || 'Geral', status: 'Ativa' });
    }

    const token1 = 'token-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
    const tokensMap = {
      [token1]: { unitCode: unit1Code, surveyId: 's_' + Date.now(), active: true }
    };

    const newOrg = {
      id: orgId,
      name: data.orgName || 'Nova Organização',
      code: (data.orgName || 'org').toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: data.orgEmail || '',
      phone: data.orgPhone || '',
      adminName: data.adminName || 'Administrador',
      units: units,
      tokensMap: tokensMap,
      responses: [],
      followUpCases: [],
      devices: [],
      touchpoints: [...DEFAULT_TOUCHPOINTS],
      surveys: [
        { id: 's_' + Date.now(), name: data.surveyName || 'Pesquisa de Satisfação NPS', unitCode: 'all', type: 'nps', isActive: true, createdAt: new Date().toISOString() }
      ],
      surveySections: [
        { id: 'sec_' + Date.now(), title: 'SEÇÃO 1 • EXPERIÊNCIA GERAL', questions: [{ type: 'NPS 0–10', text: data.surveyQuestion || 'De 0 a 10, qual a probabilidade de você recomendar nossa empresa a um amigo?', req: 'NPS • Obrigatória' }] }
      ],
      messageTemplates: [...DEFAULT_TEMPLATES],
      communicationLogs: [],
      users: []
    };

    this.organizations.push(newOrg);
    this.setActiveOrg(orgId);
    return newOrg;
  }

  get localResponses() { return this.getActiveOrg().responses || []; }
  set localResponses(val) { this.getActiveOrg().responses = val; }

  get followUpCases() { return this.getActiveOrg().followUpCases || []; }
  set followUpCases(val) { this.getActiveOrg().followUpCases = val; }

  get devices() { return this.getActiveOrg().devices || []; }
  set devices(val) { this.getActiveOrg().devices = val; }

  get touchpoints() { return this.getActiveOrg().touchpoints || []; }
  set touchpoints(val) { this.getActiveOrg().touchpoints = val; }

  get surveys() { return this.getActiveOrg().surveys || []; }
  set surveys(val) { this.getActiveOrg().surveys = val; }

  get surveySections() { return this.getActiveOrg().surveySections || []; }
  set surveySections(val) { this.getActiveOrg().surveySections = val; }

  get messageTemplates() { return this.getActiveOrg().messageTemplates || []; }
  set messageTemplates(val) { this.getActiveOrg().messageTemplates = val; }

  get communicationLogs() { return this.getActiveOrg().communicationLogs || []; }
  set communicationLogs(val) { this.getActiveOrg().communicationLogs = val; }

  get users() { return this.getActiveOrg().users || []; }
  set users(val) { this.getActiveOrg().users = val; }

  get UNITS() { return this.getActiveOrg().units || []; }
  get TOKENS_MAP() { return this.getActiveOrg().tokensMap || {}; }

  calculateNPS(responses = this.localResponses) {
    return calculateNPS(responses);
  }
}

export const store = new AppStore();

