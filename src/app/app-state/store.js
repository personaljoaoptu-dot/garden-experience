/**
 * Central Reactive Application State Store (V1.4.7 Production Data Source Hardening)
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

export const DEFAULT_UNITS = [
  { id: 'u_centro', code: 'unidade-centro', name: 'Unidade Centro', location: 'Centro - SP', status: 'Ativa' },
  { id: 'u_jardins', code: 'unidade-jardins', name: 'Unidade Jardins', location: 'Jardins - SP', status: 'Ativa' }
];

export const DEFAULT_RESPONSES = [
  {
    id: 'resp_001',
    unitCode: 'unidade-centro',
    origin: 'kiosk',
    npsScore: 3,
    comment: 'Aguardei mais de 20 minutos na recepção e os armários do vestiário estavam sem chave.',
    student: 'Carlos Eduardo Silva',
    email: 'carlos.silva@exemplo.com.br',
    phone: '(11) 98765-4321',
    touchpointRatings: { t1: 2, t2: 4, t3: 2, t4: 3 },
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  }
];

export const DEFAULT_CASES = [
  {
    id: 'case_001',
    responseId: 'resp_001',
    unitCode: 'unidade-centro',
    student: 'Carlos Eduardo Silva',
    npsScore: 3,
    comment: 'Aguardei mais de 20 minutos na recepção e os armários do vestiário estavam sem chave.',
    status: 'pending',
    priority: 'high',
    assignedUser: 'Gestor da Unidade',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  }
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
    touchpoints: [],
    surveys: [],
    surveySections: [],
    messageTemplates: [],
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
    this.isSupabaseConnected = false; // Resolved dynamically via empirical ping check
  }

  getActiveOrg() {
    if (this.organizations && this.organizations.length > 0) {
      const found = this.organizations.find(o => o && o.id === this.activeOrgId);
      if (found) return found;
      return this.organizations[0];
    }

    // Returns null if no valid organization exists for active user (no silent _fallbackEmptyOrg injection)
    return null;
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
    if (!this.isSupabaseConnected) {
      console.warn('[AppStore] Organization creation requires an active Supabase backend connection.');
      return null;
    }
    // Organization creation is persisted via Supabase repositories
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
