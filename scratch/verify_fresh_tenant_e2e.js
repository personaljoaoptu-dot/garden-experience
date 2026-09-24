import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('AUTOMATED E2E TEST: FRESH TENANT & ISOLATION VERIFICATION');
console.log('====================================================');

// Mock localStorage for Node test runner
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

const jsCode = fs.readFileSync(path.resolve('./src/main.js'), 'utf8');

const PILOT_UNITS = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'unidade-a', name: 'Garden Gold — Unidade A', location: 'Centro' },
  { id: '22222222-2222-2222-2222-222222222222', code: 'unidade-b', name: 'Garden Gold — Unidade B', location: 'Zona Sul' },
  { id: '33333333-3333-3333-3333-333333333333', code: 'unidade-c', name: 'Garden Gold — Unidade C', location: 'Jardins' },
  { id: '44444444-4444-4444-4444-444444444444', code: 'unidade-d', name: 'Garden Gold — Unidade D', location: 'Norte' }
];

const PILOT_TOKENS_MAP = {
  '755969f2-dc7d-4e91-9fd3-138009b41677': { unitCode: 'unidade-a', surveyId: 's1111111-1111-1111-1111-111111111111', active: true },
  'c3fb5906-86d9-451e-a129-69475b12e4ea': { unitCode: 'unidade-b', surveyId: 's1111111-1111-1111-1111-111111111111', active: true },
  '33749f98-ad85-47db-8aca-56ae914c637c': { unitCode: 'unidade-c', surveyId: 's1111111-1111-1111-1111-111111111111', active: true },
  'abd0b55d-51bc-42e0-b531-39e9d5177052': { unitCode: 'unidade-d', surveyId: 's1111111-1111-1111-1111-111111111111', active: true }
};

const supabase = {
  rpc: async () => ({ error: null })
};

// Extract DataManager class definition
const startIdx = jsCode.indexOf('class DataManager');
const endIdx = jsCode.indexOf('const dataManager = new DataManager();');
const classCode = jsCode.substring(startIdx, endIdx);

// Bind to Function scope
const dmConstructor = new Function('PILOT_UNITS', 'PILOT_TOKENS_MAP', 'supabase', `
  ${classCode}
  return DataManager;
`);

const DataManager = dmConstructor(PILOT_UNITS, PILOT_TOKENS_MAP, supabase);

// 1. TEST INITIALIZATION & PILOT ORG
console.log('STEP 1: Initialize DataManager (Pilot Tenant Default)');
const dm = new DataManager();
const pilotOrg = dm.getActiveOrg();
console.log('   Active Org Name:', pilotOrg.name);
console.log('   Pilot Responses Count:', dm.localResponses.length);
console.log('   Pilot Cases Count:', dm.followUpCases.length);

const pilotMetrics = dm.calculateNPS(dm.localResponses);
console.log(`   Pilot Metrics: NPS=${pilotMetrics.nps}, Total=${pilotMetrics.total}, Promoters=${pilotMetrics.promoters}, Detractors=${pilotMetrics.detractors}`);

if (pilotOrg.id === 'org_pilot' && pilotMetrics.total === 0) {
  console.log('   ✓ Pilot tenant initialized ZERO-DATA cleanly (0 responses, NPS —)');
} else {
  console.log('   ❌ Pilot tenant corrupt');
  process.exit(1);
}

// 2. TEST CREATING FRESH TENANT
console.log('\nSTEP 2: Create Fresh Tenant ("Academia Fresh Test")');
const freshOrg = dm.createOrganization({
  orgName: 'Academia Fresh Test',
  orgEmail: 'admin@fresh.com',
  orgPhone: '(11) 9999-8888',
  unitName: 'Centro',
  unitCity: 'São Paulo - SP',
  adminName: 'Gestor Fresh',
  surveyName: 'Pesquisa Satisfação Fresh Test',
  surveyQuestion: 'De 0 a 10, como avalia a Academia Fresh Test?',
  tpRecepcao: true,
  tpProfessores: true,
  tpLimpeza: true,
  tpEquipamentos: true,
  deviceName: 'Tablet Recepção Centro'
});

console.log('   Created Org Name:', freshOrg.name);
console.log('   Active Org ID:', dm.activeOrgId);
console.log('   Fresh Responses Count:', dm.localResponses.length);
console.log('   Fresh Cases Count:', dm.followUpCases.length);
console.log('   Fresh Devices Count:', dm.devices.length);
console.log('   Fresh Units Count:', dm.UNITS.length);

const freshMetrics = dm.calculateNPS(dm.localResponses);
console.log(`   Fresh Initial Metrics: Total=${freshMetrics.total}, Detractors=${freshMetrics.detractors}`);

if (dm.localResponses.length === 0 && dm.followUpCases.length === 0 && freshMetrics.total === 0) {
  console.log('   ✓ Fresh Tenant started ZERO-DATA cleanly (0 responses, 0 cases, 0 detratores)!');
} else {
  console.log('   ❌ Fresh Tenant contains leaked data');
  process.exit(1);
}

// 3. SUBMIT REAL RESPONSE ON FRESH TENANT
console.log('\nSTEP 3: Submit 1st Real Response on Fresh Tenant (NPS 4 - Detractor)');
await dm.submitResponse({
  token: Object.keys(dm.TOKENS_MAP)[0],
  unitCode: dm.UNITS[0].code,
  origin: 'qr_code',
  npsScore: 4,
  comment: 'Equipamento em manutenção na unidade Centro.',
  student: 'Aluno Fresh Test',
  email: 'aluno@fresh.com',
  consentAccepted: true
});

console.log('   Fresh Responses After 1st Response:', dm.localResponses.length);
console.log('   Fresh Cases After 1st Response:', dm.followUpCases.length);

const freshMetricsAfter = dm.calculateNPS(dm.localResponses);
console.log(`   Fresh Metrics After Submission: NPS=${freshMetricsAfter.nps}, Total=${freshMetricsAfter.total}, Detractors=${freshMetricsAfter.detractors}`);

if (dm.localResponses.length === 1 && dm.followUpCases.length === 1 && freshMetricsAfter.nps === -100) {
  console.log('   ✓ Response & Detractor case correctly registered for Fresh Tenant (NPS -100)!');
} else {
  console.log('   ❌ Response submission failed');
  process.exit(1);
}

// 4. TEST ISOLATION SWITCHING (Fresh Tenant <-> Pilot Tenant)
console.log('\nSTEP 4: Test Tenant Isolation (Switch to Pilot -> Switch to Fresh)');
dm.setActiveOrg('org_pilot');
console.log('   Switched to Active Org:', dm.getActiveOrg().name);
console.log('   Pilot Responses Count:', dm.localResponses.length);
console.log('   Pilot Cases Count:', dm.followUpCases.length);

const checkPilotLeaks = dm.localResponses.some(r => r.student === 'Aluno Fresh Test');
if (dm.localResponses.length === 0 && !checkPilotLeaks) {
  console.log('   ✓ Isolation PASS: Fresh Tenant response did NOT leak into Pilot Tenant!');
} else {
  console.log('   ❌ Isolation FAIL: Fresh response leaked into Pilot!');
  process.exit(1);
}

dm.setActiveOrg(freshOrg.id);
console.log('   Switched back to Active Org:', dm.getActiveOrg().name);
console.log('   Fresh Responses Count:', dm.localResponses.length);
const checkFreshLeaks = dm.localResponses.some(r => r.student === 'Carlos Silva');
if (dm.localResponses.length === 1 && !checkFreshLeaks) {
  console.log('   ✓ Isolation PASS: Pilot Tenant data did NOT leak into Fresh Tenant!');
} else {
  console.log('   ❌ Isolation FAIL: Pilot response leaked into Fresh!');
  process.exit(1);
}

// 5. TEST REFRESH / LOGOUT / LOGIN PERSISTENCE
console.log('\nSTEP 5: Test Refresh & Session Persistence');
const dmRefreshed = new DataManager();
console.log('   Restored Active Org Name:', dmRefreshed.getActiveOrg().name);
console.log('   Restored Responses Count:', dmRefreshed.localResponses.length);
console.log('   Restored Cases Count:', dmRefreshed.followUpCases.length);

if (dmRefreshed.getActiveOrg().id === freshOrg.id && dmRefreshed.localResponses.length === 1) {
  console.log('   ✓ Persistence PASS: Active Tenant and data restored cleanly after refresh!');
} else {
  console.log('   ❌ Persistence FAIL');
  process.exit(1);
}

console.log('\n====================================================');
console.log('ALL E2E SAAS TENANT ISOLATION TESTS PASSED 100%');
console.log('====================================================');
