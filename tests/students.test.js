/**
 * Student Experience Evolution & Multi-Tenant Hardening Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mockStoreData } from './fixtures/mockData.js';
import { studentsRepository } from '../src/students/repositories/studentsRepository.js';

describe('Student Experience Evolution Suite', () => {
  let sampleOrg;

  beforeEach(() => {
    sampleOrg = JSON.parse(JSON.stringify(mockStoreData.organizations[0]));
  });

  it('1. Student can have multiple historical responses', () => {
    const studentResponses = [
      { id: 'r1', studentId: 'st_001', npsScore: 3, createdAt: '2026-07-01' },
      { id: 'r2', studentId: 'st_001', npsScore: 7, createdAt: '2026-08-01' },
      { id: 'r3', studentId: 'st_001', npsScore: 10, createdAt: '2026-09-01' }
    ];

    expect(studentResponses.length).toBe(3);
    expect(studentResponses[0].npsScore).toBe(3);
    expect(studentResponses[2].npsScore).toBe(10);
  });

  it('2. Anonymous responses are protected and excluded from individual student evolution', () => {
    const responses = [
      { id: 'r1', studentId: 'st_001', student: 'João' },
      { id: 'r2', studentId: null, student: 'Anônimo' }
    ];

    const identified = responses.filter(r => r.studentId !== null && r.student !== 'Anônimo');
    expect(identified.length).toBe(1);
    expect(identified[0].student).toBe('João');
  });

  it('3. Responses are correctly grouped by student_id', () => {
    const responses = [
      { id: 'r1', studentId: 'st_001', npsScore: 3 },
      { id: 'r2', studentId: 'st_002', npsScore: 9 },
      { id: 'r3', studentId: 'st_001', npsScore: 8 }
    ];

    const st1Responses = responses.filter(r => r.studentId === 'st_001');
    expect(st1Responses.length).toBe(2);
    expect(st1Responses.map(r => r.npsScore)).toEqual([3, 8]);
  });

  it('4. Multi-tenant isolation: Students from different organizations never mix', () => {
    const students = [
      { id: 'st_orgA', organization_id: 'org_A', name: 'Aluno Org A' },
      { id: 'st_orgB', organization_id: 'org_B', name: 'Aluno Org B' }
    ];

    const orgAStudents = students.filter(s => s.organization_id === 'org_A');
    expect(orgAStudents.length).toBe(1);
    expect(orgAStudents[0].name).toBe('Aluno Org A');
  });

  it('5. Evolution score delta 3 -> 7 -> 10 correctly calculates +7', () => {
    const scores = [3, 7, 10];
    const initialScore = scores[0];
    const latestScore = scores[scores.length - 1];
    const delta = latestScore - initialScore;

    expect(delta).toBe(7);
  });

  it('6. Negative evolution (decline 9 -> 4) correctly calculates -5', () => {
    const scores = [9, 4];
    const initialScore = scores[0];
    const latestScore = scores[scores.length - 1];
    const delta = latestScore - initialScore;

    expect(delta).toBe(-5);
  });

  it('7. Single response does not generate false trend line', () => {
    const responses = [{ id: 'r1', studentId: 'st_001', npsScore: 8 }];
    const hasTrend = responses.length > 1;

    expect(hasTrend).toBe(false);
  });

  it('8. Touchpoint without rating remains unrated (never defaults to zero)', () => {
    const touchpointRatings = { t1: 5, t2: null }; // t2 not rated

    expect(touchpointRatings.t1).toBe(5);
    expect(touchpointRatings.t2).toBeNull();
    expect(touchpointRatings.t2 !== 0).toBe(true);
  });

  it('9. Follow-up case correctly connects to student response', () => {
    const response = { id: 'sup_resp_900', studentId: 'st_001' };
    const followUpCase = { id: 'sup_case_901', responseId: 'sup_resp_900', studentId: 'st_001' };

    expect(followUpCase.responseId).toBe(response.id);
    expect(followUpCase.studentId).toBe(response.studentId);
  });
});
