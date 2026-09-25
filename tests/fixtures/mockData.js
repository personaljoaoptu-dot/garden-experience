/**
 * Isolated Test Fixtures & Mock Data (Test Suite Only - Never Imported in Production Flow)
 */

export const DEFAULT_TOUCHPOINTS = [
  { id: 't1', name: 'Atendimento da Recepção', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
  { id: 't2', name: 'Atendimento dos Professores', category: 'Atendimento', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
  { id: 't3', name: 'Limpeza & Higiene', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' },
  { id: 't4', name: 'Manutenção dos Equipamentos', category: 'Estrutura', evalType: 'Escala 1–5', scaleMin: 1, scaleMax: 5, isActive: true, units: 'Todas as Unidades', avgScore: 0.0, totalCount: 0, statusLabel: '⚪ Sem Avaliações' }
];

export const DEFAULT_TEMPLATES = [
  { id: 'tpl_1', name: 'Agradecimento — Feedback positivo', description: 'Mensagem para alunos promotores (notas 9 e 10).', channel: 'email', subject: 'Obrigado pelo seu feedback!', body: 'Olá, {{nome}}!\n\nAgradecemos por compartilhar sua experiência com a {{organizacao}} ({{unidade}}).\nSua nota {{nps}} nos motiva a continuar oferecendo o melhor atendimento.\n\nAtenciosamente,\n{{gestor}}', isActive: true, updatedAt: new Date().toISOString() }
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
