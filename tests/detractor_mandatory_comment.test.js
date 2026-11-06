import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { responsesRepository } from '../src/responses/repositories/responsesRepository.js';

describe('Detractor Mandatory Comment Suite (0 to 6 NPS & Touchpoints)', () => {

  it('1. General NPS detractor (0 to 6) without comment is BLOCKED', async () => {
    for (let score = 0; score <= 6; score++) {
      const res = await responsesRepository.submitPublicResponse({
        token: 'test-token',
        npsScore: score,
        comment: '',
        student: 'Aluno Teste',
        email: 'aluno@teste.com',
        phone: '11999999999'
      });

      assert.strictEqual(res.success, false, `Score ${score} without comment should fail`);
      assert.strictEqual(res.error.includes('detrator'), true);
    }
  });

  it('2. General NPS detractor (0 to 6) with only whitespace comment is BLOCKED', async () => {
    const res = await responsesRepository.submitPublicResponse({
      token: 'test-token',
      npsScore: 5,
      comment: '    ',
      student: 'Aluno Teste',
      email: 'aluno@teste.com',
      phone: '11999999999'
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error.includes('detrator'), true);
  });

  it('3. Touchpoint detractor (0 to 6) without observation is BLOCKED', async () => {
    for (let tpScore = 0; tpScore <= 6; tpScore++) {
      const res = await responsesRepository.submitPublicResponse({
        token: 'test-token',
        npsScore: 10,
        comment: 'Gostei muito',
        student: 'Aluno Teste',
        email: 'aluno@teste.com',
        phone: '11999999999',
        touchpointRatings: { 'tp-cleanliness': tpScore },
        touchpointObservations: { 'tp-cleanliness': '' }
      });

      assert.strictEqual(res.success, false, `Touchpoint rating ${tpScore} without observation should fail`);
      assert.strictEqual(res.error.includes('pontos de contato'), true);
    }
  });

  it('4. Touchpoint detractor (0 to 6) with observation passes repository check', async () => {
    const res = await responsesRepository.submitPublicResponse({
      token: 'test-token',
      npsScore: 9,
      comment: '',
      student: 'Aluno Teste',
      email: 'aluno@teste.com',
      phone: '11999999999',
      touchpointRatings: { 'tp-cleanliness': 4 },
      touchpointObservations: { 'tp-cleanliness': 'Banheiro estava molhado' }
    });

    // It passes detractor comment validation; in decoupled test environment it then tries supabase RPC or returns success/offline
    assert.notStrictEqual(res.error, 'Para avaliações detratoras (0 a 6) em pontos de contato, o comentário é obrigatório.');
  });

  it('5. Passive (7-8) and Promoter (9-10) without comment passes validation', async () => {
    for (const score of [7, 8, 9, 10]) {
      const res = await responsesRepository.submitPublicResponse({
        token: 'test-token',
        npsScore: score,
        comment: '',
        student: 'Aluno Teste',
        email: 'aluno@teste.com',
        phone: '11999999999',
        touchpointRatings: { 'tp-equip': 8 },
        touchpointObservations: {}
      });

      assert.notStrictEqual(res.error, 'Para notas de 0 a 6 (detrator), o comentário é obrigatório.');
      assert.notStrictEqual(res.error, 'Para avaliações detratoras (0 a 6) em pontos de contato, o comentário é obrigatório.');
    }
  });

});
