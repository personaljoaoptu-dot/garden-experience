import test from 'node:test';
import assert from 'node:assert/strict';
import { usersRepository } from '../src/users/repositories/usersRepository.js';
import { responsesRepository } from '../src/responses/repositories/responsesRepository.js';

test('USERS & UNIT TRANSFER SUITE', async (t) => {
  await t.test('1. updateMemberName requires non-empty name', async () => {
    const res = await usersRepository.updateMemberName({
      userId: 'usr_1',
      memberId: 'mem_1',
      organizationId: 'org_1',
      newName: '   '
    });
    assert.equal(res.success, false);
    assert.match(res.error, /vazio/i);
  });

  await t.test('2. transferResponseUnit requires responseId and targetUnitId', async () => {
    const res = await responsesRepository.transferResponseUnit({
      responseId: '',
      targetUnitId: 'u4'
    });
    assert.equal(res.success, false);
    assert.match(res.error, /obrigat/i);
  });

  await t.test('3. updateMemberRole returns null when arguments are missing', async () => {
    const res = await usersRepository.updateMemberRole(null, 'org_1', 'admin');
    assert.equal(res, null);
  });
});
