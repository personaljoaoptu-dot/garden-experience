/**
 * Central Reactive Application State Store
 * Manages active organization context and runtime state cleanly without fake databases.
 */

import { APP_CONFIG } from '../../core/config/appConfig.js';
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

    this.initDefaultOrg();
  }

  initDefaultOrg() {
    const defaultUnits = [
      { id: 'u_1', code: 'unidade-a', name: 'Unidade A — Centro', location: 'Centro', status: 'Ativa' },
      { id: 'u_2', code: 'unidade-b', name: 'Unidade B — Zona Sul', location: 'Zona Sul', status: 'Ativa' }
    ];

    const defaultTokensMap = {
      '755969f2-dc7d-4e91-9fd3-138009b41677': { unitCode: 'unidade-a', surveyId: 's1', active: true },
      'c3fb5906-86d9-451e-a129-69475b12e4ea': { unitCode: 'unidade-b', surveyId: 's1', active: true }
    };

    const mainOrg = {
      id: 'org_main',
      name: 'Organização Principal',
      code: 'main_org',
      email: 'contato@experienciadaempresa.com.br',
      phone: '(11) 3333-4444',
      units: defaultUnits,
      tokensMap: defaultTokensMap,
      responses: [],
      followUpCases: [],
      devices: [],
      touchpoints: [...DEFAULT_TOUCHPOINTS],
      surveys: [
        { id: 's1', name: 'Pesquisa de Satisfação NPS — Geral', unitCode: 'all', type: 'nps', isActive: true, createdAt: new Date().toISOString() }
      ],
      surveySections: [
        { id: 'sec1', title: 'SEÇÃO 1 • EXPERIÊNCIA GERAL', questions: [{ type: 'NPS 0–10', text: 'De 0 a 10, qual a probabilidade de você recomendar a nossa empresa a um amigo?', req: 'NPS • Obrigatória' }] },
        { id: 'sec2', title: 'SEÇÃO 2 • ATENDIMENTO', questions: [{ type: '⭐ Touchpoint', text: 'Atendimento da Recepção', req: 'Escala 1–5 • Obrigatória' }] }
      ],
      messageTemplates: [...DEFAULT_TEMPLATES],
      communicationLogs: [],
      users: []
    };

    this.organizations = [mainOrg];
    this.activeOrgId = mainOrg.id;
  }

  getActiveOrg() {
    return this.organizations.find(o => o && o.id === this.activeOrgId) || this.organizations[0];
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
    const unit1Code = 'unidade-' + (data.unitName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'centro');
    
    const units = [
      { id: 'u_' + Date.now(), code: unit1Code, name: data.unitName, location: data.unitCity || 'Geral', status: 'Ativa' }
    ];

    if (data.unit2Name && data.unit2Name.trim()) {
      const unit2Code = 'unidade-' + data.unit2Name.toLowerCase().replace(/[^a-z0-9]/g, '');
      units.push({ id: 'u_' + (Date.now() + 1), code: unit2Code, name: data.unit2Name.trim(), location: data.unitCity || 'Geral', status: 'Ativa' });
    }

    const token1 = 'token-' + Math.random().toString(36).substring(2, 10);
    const tokensMap = {
      [token1]: { unitCode: unit1Code, surveyId: 's_' + Date.now(), active: true }
    };

    const newOrg = {
      id: orgId,
      name: data.orgName,
      code: data.orgName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: data.orgEmail,
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

  calculateNPS(responses = this.localResponses) {
    return calculateNPS(responses);
  }
}

export const store = new AppStore();
