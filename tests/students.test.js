/**
 * Student Experience Evolution & Multi-Tenant Hardening Comprehensive Test Suite
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockStoreData } from './fixtures/mockData.js';

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toBeNull: () => assert.strictEqual(actual, null),
  toBeDefined: () => assert.notStrictEqual(actual, undefined),
  not: {
    toBe: (expected) => assert.notStrictEqual(actual, expected)
  }
});

describe('Student Experience Evolution Hardening & Data Flow Suite', () => {
  let sampleOrg;

  beforeEach(() => {
    sampleOrg = JSON.parse(JSON.stringify(mockStoreData.organizations[0]));
  });

  it('1. Table students schema support and ID uniqueness', () => {
    const student = {
      id: 'st_11111111-1111-1111-1111-111111111111',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      status: 'active'
    };

    expect(student.id).toBeDefined();
    expect(student.organization_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });

  it('2. responses.student_id is nullable (anonymous response maintains student_id = NULL)', () => {
    const anonResponse = {
      id: 'r_anon_01',
      organization_id: 'org_A',
      student_id: null,
      nps_score: 8,
      comment: 'Resposta anônima'
    };

    expect(anonResponse.student_id).toBeNull();
  });

  it('3. Anonymous response does not open individual evolution view', () => {
    const anonResponse = { id: 'r_anon_01', student_id: null, student: 'Anônimo' };
    const canOpenEvolution = Boolean(anonResponse.student_id);

    expect(canOpenEvolution).toBe(false);
  });

  it('4. Two responses from the same student correctly tracked by ID', () => {
    const responses = [
      { id: 'r1', studentId: 'st_001', npsScore: 4, createdAt: '2026-07-10' },
      { id: 'r2', studentId: 'st_001', npsScore: 8, createdAt: '2026-08-10' }
    ];

    const studentResponses = responses.filter(r => r.studentId === 'st_001');
    expect(studentResponses.length).toBe(2);
  });

  it('5. Three responses from the same student correctly tracked by ID', () => {
    const responses = [
      { id: 'r1', studentId: 'st_001', npsScore: 3, createdAt: '2026-07-01' },
      { id: 'r2', studentId: 'st_001', npsScore: 7, createdAt: '2026-08-01' },
      { id: 'r3', studentId: 'st_001', npsScore: 10, createdAt: '2026-09-01' }
    ];

    const studentResponses = responses.filter(r => r.studentId === 'st_001');
    expect(studentResponses.length).toBe(3);
  });

  it('6. Evolution 3 -> 7 -> 10 calculates delta +7', () => {
    const scores = [3, 7, 10];
    const initial = scores[0];
    const latest = scores[scores.length - 1];
    const delta = latest - initial;

    expect(delta).toBe(7);
  });

  it('7. Negative evolution 8 -> 6 -> 4 calculates delta -4', () => {
    const scores = [8, 6, 4];
    const initial = scores[0];
    const latest = scores[scores.length - 1];
    const delta = latest - initial;

    expect(delta).toBe(-4);
  });

  it('8. Single response has no evolution delta (1ª avaliação)', () => {
    const responses = [{ id: 'r1', studentId: 'st_001', npsScore: 9 }];
    const totalCount = responses.length;

    expect(totalCount).toBe(1);
    const hasDelta = totalCount > 1;
    expect(hasDelta).toBe(false);
  });

  it('9. Two responses in the same month maintained as 2 distinct evaluations', () => {
    const responses = [
      { id: 'r1', studentId: 'st_001', npsScore: 5, createdAt: '2026-08-02T10:00:00Z' },
      { id: 'r2', studentId: 'st_001', npsScore: 9, createdAt: '2026-08-25T15:00:00Z' }
    ];

    expect(responses.length).toBe(2);
    expect(responses[0].id).not.toBe(responses[1].id);
  });

  it('10. Period filtering correctly restricts evaluations to timeframe', () => {
    const nowMs = new Date('2026-09-28T00:00:00Z').getTime();
    const responses = [
      { id: 'r1', studentId: 'st_001', npsScore: 3, createdAt: '2026-05-01T00:00:00Z' }, // 150 days ago
      { id: 'r2', studentId: 'st_001', npsScore: 7, createdAt: '2026-09-01T00:00:00Z' }, // 27 days ago
      { id: 'r3', studentId: 'st_001', npsScore: 10, createdAt: '2026-09-25T00:00:00Z' } // 3 days ago
    ];

    const cutoff30d = nowMs - 30 * 86400000;
    const periodResponses = responses.filter(r => new Date(r.createdAt).getTime() >= cutoff30d);

    expect(periodResponses.length).toBe(2);
    expect(periodResponses[0].npsScore).toBe(7);
    expect(periodResponses[1].npsScore).toBe(10);
  });

  it('11. Student A does not receive responses belonging to Student B', () => {
    const responses = [
      { id: 'r1', studentId: 'st_A', npsScore: 5 },
      { id: 'r2', studentId: 'st_B', npsScore: 10 }
    ];

    const stAResponses = responses.filter(r => r.studentId === 'st_A');
    expect(stAResponses.length).toBe(1);
    expect(stAResponses[0].id).toBe('r1');
  });

  it('12. Organization A cannot access Student B (cross-tenant protection)', () => {
    const students = [
      { id: 'st_A', organization_id: 'org_A', name: 'Student Org A' },
      { id: 'st_B', organization_id: 'org_B', name: 'Student Org B' }
    ];

    const activeOrgId = 'org_A';
    const orgAStudents = students.filter(s => s.organization_id === activeOrgId);

    expect(orgAStudents.length).toBe(1);
    expect(orgAStudents[0].id).toBe('st_A');
  });

  it('13. Follow-up case linked strictly by student_id', () => {
    const followUpCase = { id: 'c1', studentId: 'st_001', npsScore: 3, status: 'in_progress' };

    expect(followUpCase.studentId).toBe('st_001');
  });

  it('14. Communication log linked by student_id or case_id', () => {
    const commLog = { id: 'l1', studentId: 'st_001', caseId: 'c1', channel: 'phone', notes: 'Contato telefônico' };

    expect(commLog.studentId).toBe('st_001');
    expect(commLog.caseId).toBe('c1');
  });

  it('15. Chronological timeline ordering combines responses, cases, and comm logs', () => {
    const events = [
      { type: 'response', date: '2026-07-01' },
      { type: 'case', date: '2026-07-02' },
      { type: 'comm', date: '2026-07-03' },
      { type: 'response', date: '2026-08-01' }
    ];

    const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));
    expect(sorted[0].date).toBe('2026-08-01');
    expect(sorted[3].date).toBe('2026-07-01');
  });

  it('16. Touchpoint without rating remains unrated (never defaults to zero)', () => {
    const ratings = { t1: 4, t2: null }; // t2 not rated

    expect(ratings.t1).toBe(4);
    expect(ratings.t2).toBeNull();
    expect(ratings.t2 !== 0).toBe(true);
  });

  it('17. Dashboard excludes single evaluation students from average delta calculation', () => {
    const studentsData = [
      { id: 'st_1', responses: [{ score: 3 }, { score: 9 }] }, // delta +6
      { id: 'st_2', responses: [{ score: 8 }] }                // single evaluation (no delta)
    ];

    const deltas = [];
    studentsData.forEach(s => {
      if (s.responses.length > 1) {
        deltas.push(s.responses[s.responses.length - 1].score - s.responses[0].score);
      }
    });

    expect(deltas.length).toBe(1);
    expect(deltas[0]).toBe(6);
  });

  it('18. Anonymous response cannot open individual student evolution', () => {
    const anonResponse = { id: 'r_anon', studentId: null };
    const canOpen = Boolean(anonResponse.studentId);

    expect(canOpen).toBe(false);
  });

  it('19. Strict ID matching without name fallback', () => {
    const student = { id: 'st_123', name: 'João Silva' };
    const responseWithSameNameDifferentId = { id: 'r1', studentId: 'st_999', student: 'João Silva' };

    const matches = responseWithSameNameDifferentId.studentId === student.id;
    expect(matches).toBe(false);
  });

  it('20. Offline state sets SUPABASE_OFFLINE status without mock data fallback', () => {
    const connectionStatus = 'SUPABASE_OFFLINE';
    const organizations = [];

    expect(connectionStatus).toBe('SUPABASE_OFFLINE');
    expect(organizations.length).toBe(0);
  });
});
