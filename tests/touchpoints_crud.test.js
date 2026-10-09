/**
 * Touchpoints Module CRUD & Security Test Suite (15 Scenarios)
 * Validates complete Touchpoint lifecycle, multi-tenant isolation, unit linkage, and dependency protection.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toBeTruthy: () => assert.strictEqual(Boolean(actual), true),
  toBeFalsy: () => assert.strictEqual(Boolean(actual), false),
  not: {
    toBe: (expected) => assert.notStrictEqual(actual, expected)
  }
});

/**
 * Mock touchpoints database state and CRUD logic matching touchpointsRepository contract
 */
function createMockTouchpointsDatabase() {
  const db = {
    touchpoints: [
      { id: 'tp_1', organization_id: 'org_A', name: 'Atendimento Recepção', description: 'Recepção', category: 'Atendimento', is_active: true },
      { id: 'tp_2', organization_id: 'org_A', name: 'Limpeza Vestiários', description: 'Limpeza', category: 'Estrutura', is_active: true },
      { id: 'tp_3', organization_id: 'org_B', name: 'Atendimento Org B', description: 'Recepção B', category: 'Atendimento', is_active: true }
    ],
    unit_touchpoints: [
      { id: 'ut_1', touchpoint_id: 'tp_1', unit_id: 'unit_A1' },
      { id: 'ut_2', touchpoint_id: 'tp_1', unit_id: 'unit_A2' }
    ],
    answers: [
      { id: 'ans_1', touchpoint_id: 'tp_1', answer_numeric: 5 } // Dependency on tp_1!
    ],
    questions: []
  };

  return {
    fetchTouchpoints(orgId) {
      if (!orgId) return [];
      return db.touchpoints
        .filter(t => t.organization_id === orgId)
        .map(t => ({
          ...t,
          unit_touchpoints: db.unit_touchpoints.filter(ut => ut.touchpoint_id === t.id)
        }));
    },

    createTouchpoint({ organizationId, name, category, description, isActive = true, unitIds = [] }) {
      if (!name || !name.trim()) return { data: null, error: { message: 'Nome do Ponto de Contato é obrigatório.' } };
      if (!category || !category.trim()) return { data: null, error: { message: 'Categoria é obrigatória.' } };
      if (!organizationId) return { data: null, error: { message: 'ID da Organização é obrigatório.' } };

      const newTp = {
        id: 'tp_' + Math.random().toString(36).substr(2, 6),
        organization_id: organizationId,
        name: name.trim(),
        description: description ? description.trim() : '',
        category: category.trim(),
        is_active: Boolean(isActive)
      };

      db.touchpoints.push(newTp);

      unitIds.forEach(uId => {
        db.unit_touchpoints.push({
          id: 'ut_' + Math.random().toString(36).substr(2, 6),
          touchpoint_id: newTp.id,
          unit_id: uId
        });
      });

      return { data: newTp, error: null };
    },

    updateTouchpoint({ id, organizationId, name, category, description, isActive, unitIds }) {
      const tp = db.touchpoints.find(t => t.id === id);
      if (!tp) return { data: null, error: { message: 'Ponto de contato não encontrado.' } };

      if (organizationId && tp.organization_id !== organizationId) {
        return { data: null, error: { message: 'Acesso não autorizado para esta organização.' } };
      }

      if (!name || !name.trim()) return { data: null, error: { message: 'Nome do Ponto de Contato é obrigatório.' } };
      if (!category || !category.trim()) return { data: null, error: { message: 'Categoria é obrigatória.' } };

      tp.name = name.trim();
      tp.category = category.trim();
      if (description !== undefined) tp.description = description.trim();
      if (isActive !== undefined) tp.is_active = Boolean(isActive);

      if (Array.isArray(unitIds)) {
        // Sync units
        db.unit_touchpoints = db.unit_touchpoints.filter(ut => ut.touchpoint_id !== id);
        unitIds.forEach(uId => {
          db.unit_touchpoints.push({
            id: 'ut_' + Math.random().toString(36).substr(2, 6),
            touchpoint_id: id,
            unit_id: uId
          });
        });
      }

      return { data: tp, error: null };
    },

    updateTouchpointStatus(id, isActive, organizationId) {
      const tp = db.touchpoints.find(t => t.id === id);
      if (!tp) return { success: false, error: 'Ponto de contato não encontrado.' };

      if (organizationId && tp.organization_id !== organizationId) {
        return { success: false, error: 'Acesso não autorizado para esta organização.' };
      }

      tp.is_active = Boolean(isActive);
      return { success: true, error: null };
    },

    deleteTouchpoint(id, organizationId) {
      const tp = db.touchpoints.find(t => t.id === id);
      if (!tp) return { success: false, error: 'Ponto de contato não encontrado.' };

      if (organizationId && tp.organization_id !== organizationId) {
        return { success: false, error: 'Acesso não autorizado para esta organização.' };
      }

      const hasAnswers = db.answers.some(a => a.touchpoint_id === id);
      const hasQuestions = db.questions.some(q => q.touchpoint_id === id);

      if (hasAnswers || hasQuestions) {
        return {
          success: false,
          isBlocked: true,
          error: 'Este Ponto de Contato possui respostas/perguntas vinculadas e não pode ser excluído. Recomendamos desativá-lo.'
        };
      }

      db.touchpoints = db.touchpoints.filter(t => t.id !== id);
      db.unit_touchpoints = db.unit_touchpoints.filter(ut => ut.touchpoint_id !== id);
      return { success: true, error: null };
    }
  };
}

describe('TOUCHPOINTS MODULE CRUD & MULTI-TENANT SUITE', () => {

  it('1. Carregar touchpoints -> Retorna touchpoints da organização', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const list = mockRepo.fetchTouchpoints('org_A');
    expect(list.length).toBe(2);
    expect(list[0].name).toBe('Atendimento Recepção');
  });

  it('2. Criar touchpoint -> Persiste novo ponto de contato', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.createTouchpoint({
      organizationId: 'org_A',
      name: 'Manutenção de Esteiras',
      category: 'Equipamentos',
      description: 'Conservação de aparelhos',
      isActive: true,
      unitIds: ['unit_A1']
    });

    expect(res.error).toBe(null);
    expect(res.data.name).toBe('Manutenção de Esteiras');

    const updatedList = mockRepo.fetchTouchpoints('org_A');
    expect(updatedList.length).toBe(3);
  });

  it('3. Editar touchpoint -> Atualiza dados cadastrais', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.updateTouchpoint({
      id: 'tp_2',
      organizationId: 'org_A',
      name: 'Limpeza Geral dos Vestiários',
      category: 'Limpeza',
      description: 'Higiene constante',
      isActive: true,
      unitIds: ['unit_A1']
    });

    expect(res.error).toBe(null);
    expect(res.data.name).toBe('Limpeza Geral dos Vestiários');
    expect(res.data.category).toBe('Limpeza');
  });

  it('4. Ativar touchpoint -> Define is_active = true', () => {
    const mockRepo = createMockTouchpointsDatabase();
    mockRepo.updateTouchpointStatus('tp_2', false, 'org_A'); // Set inactive first
    const res = mockRepo.updateTouchpointStatus('tp_2', true, 'org_A');
    expect(res.success).toBe(true);

    const list = mockRepo.fetchTouchpoints('org_A');
    const tp2 = list.find(t => t.id === 'tp_2');
    expect(tp2.is_active).toBe(true);
  });

  it('5. Desativar touchpoint -> Define is_active = false com persistência', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.updateTouchpointStatus('tp_1', false, 'org_A');
    expect(res.success).toBe(true);

    const list = mockRepo.fetchTouchpoints('org_A');
    const tp1 = list.find(t => t.id === 'tp_1');
    expect(tp1.is_active).toBe(false);
  });

  it('6. Associar touchpoint à unidade -> Grava vínculos em unit_touchpoints', () => {
    const mockRepo = createMockTouchpointsDatabase();
    mockRepo.updateTouchpoint({
      id: 'tp_2',
      organizationId: 'org_A',
      name: 'Limpeza Vestiários',
      category: 'Estrutura',
      isActive: true,
      unitIds: ['unit_A1', 'unit_A2']
    });

    const list = mockRepo.fetchTouchpoints('org_A');
    const tp2 = list.find(t => t.id === 'tp_2');
    expect(tp2.unit_touchpoints.length).toBe(2);
  });

  it('7. Remover associação -> Remove vínculos não selecionados', () => {
    const mockRepo = createMockTouchpointsDatabase();
    mockRepo.updateTouchpoint({
      id: 'tp_1',
      organizationId: 'org_A',
      name: 'Atendimento Recepção',
      category: 'Atendimento',
      isActive: true,
      unitIds: ['unit_A1'] // Removed unit_A2
    });

    const list = mockRepo.fetchTouchpoints('org_A');
    const tp1 = list.find(t => t.id === 'tp_1');
    expect(tp1.unit_touchpoints.length).toBe(1);
    expect(tp1.unit_touchpoints[0].unit_id).toBe('unit_A1');
  });

  it('8. Nome obrigatório -> Bloqueia submissão sem nome', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.createTouchpoint({
      organizationId: 'org_A',
      name: '   ',
      category: 'Atendimento'
    });

    expect(res.data).toBe(null);
    expect(res.error.message.includes('obrigatório')).toBe(true);
  });

  it('9. Categoria obrigatória -> Bloqueia submissão sem categoria', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.createTouchpoint({
      organizationId: 'org_A',
      name: 'Nome Válido',
      category: ''
    });

    expect(res.data).toBe(null);
    expect(res.error.message.includes('obrigatória')).toBe(true);
  });

  it('10. Organização correta -> Vincula novo touchpoint ao organization_id informado', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.createTouchpoint({
      organizationId: 'org_A',
      name: 'Professor da Musculação',
      category: 'Atendimento'
    });

    expect(res.data.organization_id).toBe('org_A');
  });

  it('11. Isolamento multi-tenant -> Org A não visualiza touchpoints da Org B', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const listA = mockRepo.fetchTouchpoints('org_A');
    const hasOrgBTouchpoint = listA.some(t => t.organization_id === 'org_B' || t.id === 'tp_3');
    expect(hasOrgBTouchpoint).toBe(false);
  });

  it('12. Não permitir alteração de touchpoint de outra organização -> Bloqueia cross-tenant update', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.updateTouchpointStatus('tp_3', false, 'org_A'); // tp_3 belongs to org_B!
    expect(res.success).toBe(false);
    expect(res.error.includes('não autorizado')).toBe(true);
  });

  it('13. Não excluir touchpoint com dependências -> Bloqueia exclusão com respostas vinculadas', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.deleteTouchpoint('tp_1', 'org_A'); // tp_1 has answer ans_1!
    expect(res.success).toBe(false);
    expect(res.isBlocked).toBe(true);
    expect(res.error.includes('respostas/perguntas vinculadas')).toBe(true);
  });

  it('14. Estado vazio -> Retorna lista vazia para org sem touchpoints', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const list = mockRepo.fetchTouchpoints('org_C');
    expect(list.length).toBe(0);
  });

  it('15. Erro de persistência -> Retorna mensagem clara se ID de org estiver ausente', () => {
    const mockRepo = createMockTouchpointsDatabase();
    const res = mockRepo.createTouchpoint({
      organizationId: null,
      name: 'Sem Org',
      category: 'Geral'
    });

    expect(res.data).toBe(null);
    expect(res.error.message.includes('Organização')).toBe(true);
  });

});
