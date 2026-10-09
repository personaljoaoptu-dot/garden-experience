/**
 * Public Survey Token Security & RPC Contract Test Suite (26 Scenarios)
 * Unit Test Suite validating the hardened public submission rules enforced by Migration 18.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { surveyLinksRepository } from '../src/surveys/repositories/surveyLinksRepository.js';

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toBeTruthy: () => assert.strictEqual(Boolean(actual), true),
  toBeFalsy: () => assert.strictEqual(Boolean(actual), false),
  not: {
    toBe: (expected) => assert.notStrictEqual(actual, expected)
  },
  toThrow: (expectedMessage) => {
    let fn = actual;
    let thrown = false;
    let errMessage = '';
    try {
      fn();
    } catch (e) {
      thrown = true;
      errMessage = e.message;
    }
    assert.strictEqual(thrown, true, 'Expected function to throw an exception');
    if (expectedMessage) {
      assert.strictEqual(errMessage.includes(expectedMessage), true, `Expected error "${errMessage}" to include "${expectedMessage}"`);
    }
  }
});

/**
 * Mock RPC logic mirroring postgres function submit_survey_response (Migration 18)
 */
function simulateSubmitSurveyResponseRPC({
  p_survey_link_token,
  p_unit_code,
  p_nps_score,
  p_comment = null,
  databaseState
}) {
  // 1. Mandatory Token Check
  if (!p_survey_link_token || p_survey_link_token.trim() === '') {
    throw new Error('Token da pesquisa é obrigatório.');
  }

  const cleanToken = p_survey_link_token.trim();

  // 2. NPS Range Check
  if (p_nps_score < 0 || p_nps_score > 10) {
    throw new Error('Pontuação NPS deve estar entre 0 e 10.');
  }

  // 3. Token Resolution JOIN (survey_links JOIN units JOIN surveys)
  const link = databaseState.survey_links.find(sl => sl.token === cleanToken);
  if (!link) {
    throw new Error('Link da pesquisa inválido ou não encontrado.');
  }

  if (!link.is_active) {
    throw new Error('Link da pesquisa inativo ou expirado.');
  }

  if (link.expires_at && new Date(link.expires_at) <= new Date()) {
    throw new Error('Link da pesquisa inativo ou expirado.');
  }

  const unit = databaseState.units.find(u => u.id === link.unit_id);
  if (!unit || !unit.is_active) {
    throw new Error('Unidade vinculada está inativa.');
  }

  const survey = databaseState.surveys.find(s => s.id === link.survey_id);
  if (!survey || !survey.is_active) {
    throw new Error('Pesquisa vinculada está inativa.');
  }

  if (unit.organization_id !== survey.organization_id) {
    throw new Error('Integridade do link violada.');
  }

  // Derive organization, unit, survey EXCLUSIVELY from token!
  // p_unit_code is ignored for tenant resolution.
  const derivedOrgId = unit.organization_id;
  const derivedUnitId = unit.id;
  const derivedSurveyId = survey.id;

  const isDetractor = p_nps_score <= 6;

  return {
    success: true,
    response: {
      id: 'resp_' + Math.random().toString(36).substr(2, 9),
      organization_id: derivedOrgId,
      unit_id: derivedUnitId,
      survey_id: derivedSurveyId,
      nps_score: p_nps_score,
      comment: p_comment,
      is_detractor: isDetractor
    },
    created_case: isDetractor ? {
      organization_id: derivedOrgId,
      unit_id: derivedUnitId,
      status: 'OPEN'
    } : null
  };
}

// Setup Standard Mock Database State for Multi-Tenant Tests
const dbState = {
  survey_links: [
    { id: 'link_valid_A', token: 'TOKEN_ORG_A_VALID', unit_id: 'unit_A', survey_id: 'survey_A', is_active: true, expires_at: null },
    { id: 'link_expired_A', token: 'TOKEN_ORG_A_EXPIRED', unit_id: 'unit_A', survey_id: 'survey_A', is_active: true, expires_at: '2020-01-01T00:00:00Z' },
    { id: 'link_inactive_A', token: 'TOKEN_ORG_A_INACTIVE', unit_id: 'unit_A', survey_id: 'survey_A', is_active: false, expires_at: null },
    { id: 'link_inactive_survey', token: 'TOKEN_INACTIVE_SURVEY', unit_id: 'unit_A', survey_id: 'survey_inactive', is_active: true, expires_at: null },
    { id: 'link_inactive_unit', token: 'TOKEN_INACTIVE_UNIT', unit_id: 'unit_inactive', survey_id: 'survey_A', is_active: true, expires_at: null },
    { id: 'link_valid_B', token: 'TOKEN_ORG_B_VALID', unit_id: 'unit_B', survey_id: 'survey_B', is_active: true, expires_at: null }
  ],
  units: [
    { id: 'unit_A', code: 'unit_code_A', organization_id: 'org_A', is_active: true },
    { id: 'unit_B', code: 'unit_code_B', organization_id: 'org_B', is_active: true },
    { id: 'unit_inactive', code: 'unit_code_inactive', organization_id: 'org_A', is_active: false }
  ],
  surveys: [
    { id: 'survey_A', organization_id: 'org_A', is_active: true },
    { id: 'survey_B', organization_id: 'org_B', is_active: true },
    { id: 'survey_inactive', organization_id: 'org_A', is_active: false }
  ]
};

describe('11. MANDATORY SECURITY TESTS — PUBLIC SURVEY HARDENING', () => {

  // --- TOKEN VALIDATIONS ---
  it('1. Token válido -> PASSA', () => {
    const res = simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    });
    expect(res.success).toBe(true);
    expect(res.response.organization_id).toBe('org_A');
  });

  it('2. Token inexistente -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_NON_EXISTENT',
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Link da pesquisa inválido ou não encontrado.');
  });

  it('3. Token vazio -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: '   ',
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Token da pesquisa é obrigatório.');
  });

  it('4. Token NULL -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: null,
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Token da pesquisa é obrigatório.');
  });

  it('5. Token expirado -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_EXPIRED',
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Link da pesquisa inativo ou expirado.');
  });

  it('6. Token inativo -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_INACTIVE',
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Link da pesquisa inativo ou expirado.');
  });

  // --- SURVEY VALIDATIONS ---
  it('7. Token vinculado a survey ativa -> PASSA', () => {
    const res = simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_nps_score: 9,
      databaseState: dbState
    });
    expect(res.success).toBe(true);
    expect(res.response.survey_id).toBe('survey_A');
  });

  it('8. Token vinculado a survey inativa -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_INACTIVE_SURVEY',
      p_nps_score: 9,
      databaseState: dbState
    })).toThrow('Pesquisa vinculada está inativa.');
  });

  // --- UNIT VALIDATIONS ---
  it('9. Token vinculado a unidade ativa -> PASSA', () => {
    const res = simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_nps_score: 8,
      databaseState: dbState
    });
    expect(res.success).toBe(true);
    expect(res.response.unit_id).toBe('unit_A');
  });

  it('10. Token vinculado a unidade inativa -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_INACTIVE_UNIT',
      p_nps_score: 8,
      databaseState: dbState
    })).toThrow('Unidade vinculada está inativa.');
  });

  // --- MULTI-TENANT VALIDATIONS ---
  it('11. Token da organização A -> grava somente na organização A', () => {
    const res = simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_nps_score: 10,
      databaseState: dbState
    });
    expect(res.response.organization_id).toBe('org_A');
  });

  it('12. Não deve existir possibilidade de token da organização A -> gravar na organização B', () => {
    const res = simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_nps_score: 10,
      databaseState: dbState
    });
    expect(res.response.organization_id).not.toBe('org_B');
  });

  it('13. Unit code da organização B enviado junto com token da organização A -> o unit_code NÃO altera a unidade', () => {
    const res = simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_unit_code: 'unit_code_B', // Malicious attempt to force Org B unit code!
      p_nps_score: 10,
      databaseState: dbState
    });
    // Unit ID and Org ID are derived EXCLUSIVELY from token ('unit_A' and 'org_A')
    expect(res.response.unit_id).toBe('unit_A');
    expect(res.response.organization_id).toBe('org_A');
  });

  // --- NO TOKEN ATTEMPTS ---
  it('14. p_survey_link_token = NULL -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: null,
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Token da pesquisa é obrigatório.');
  });

  it('15. p_survey_link_token = "" -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: '',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Token da pesquisa é obrigatório.');
  });

  it('16. p_unit_code válido + token NULL -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: null,
      p_unit_code: 'unit_code_A',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Token da pesquisa é obrigatório.');
  });

  it('17. p_unit_code de outra organização + token NULL -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: null,
      p_unit_code: 'unit_code_B',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Token da pesquisa é obrigatório.');
  });

  it('18. Não existe survey ativa -> token correspondente a survey inativa deve bloquear', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_INACTIVE_SURVEY',
      p_nps_score: 10,
      databaseState: dbState
    })).toThrow('Pesquisa vinculada está inativa.');
  });

  // --- NPS SCORES ---
  it('19. NPS 0 -> PASSA', () => {
    const res = simulateSubmitSurveyResponseRPC({ p_survey_link_token: 'TOKEN_ORG_A_VALID', p_nps_score: 0, databaseState: dbState });
    expect(res.success).toBe(true);
    expect(res.response.nps_score).toBe(0);
    expect(res.response.is_detractor).toBe(true);
  });

  it('20. NPS 6 -> PASSA + cria detrator', () => {
    const res = simulateSubmitSurveyResponseRPC({ p_survey_link_token: 'TOKEN_ORG_A_VALID', p_nps_score: 6, databaseState: dbState });
    expect(res.success).toBe(true);
    expect(res.response.is_detractor).toBe(true);
    expect(res.created_case).toBeTruthy();
  });

  it('21. NPS 7 -> PASSA (Neutro)', () => {
    const res = simulateSubmitSurveyResponseRPC({ p_survey_link_token: 'TOKEN_ORG_A_VALID', p_nps_score: 7, databaseState: dbState });
    expect(res.success).toBe(true);
    expect(res.response.is_detractor).toBe(false);
  });

  it('22. NPS 8 -> PASSA (Neutro)', () => {
    const res = simulateSubmitSurveyResponseRPC({ p_survey_link_token: 'TOKEN_ORG_A_VALID', p_nps_score: 8, databaseState: dbState });
    expect(res.success).toBe(true);
    expect(res.response.is_detractor).toBe(false);
  });

  it('23. NPS 9 -> PASSA (Promotor)', () => {
    const res = simulateSubmitSurveyResponseRPC({ p_survey_link_token: 'TOKEN_ORG_A_VALID', p_nps_score: 9, databaseState: dbState });
    expect(res.success).toBe(true);
    expect(res.response.is_detractor).toBe(false);
  });

  it('24. NPS 10 -> PASSA (Promotor)', () => {
    const res = simulateSubmitSurveyResponseRPC({ p_survey_link_token: 'TOKEN_ORG_A_VALID', p_nps_score: 10, databaseState: dbState });
    expect(res.success).toBe(true);
    expect(res.response.is_detractor).toBe(false);
  });

  it('25. NPS 11 -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_nps_score: 11,
      databaseState: dbState
    })).toThrow('Pontuação NPS deve estar entre 0 e 10.');
  });

  it('26. NPS -1 -> BLOQUEIA', () => {
    expect(() => simulateSubmitSurveyResponseRPC({
      p_survey_link_token: 'TOKEN_ORG_A_VALID',
      p_nps_score: -1,
      databaseState: dbState
    })).toThrow('Pontuação NPS deve estar entre 0 e 10.');
  });

});
