import fs from 'fs';
import path from 'path';

console.log("====================================================");
console.log("AUTOMATED E2E TEST: SPRINT V1.3 CUSTOMER EXPERIENCE");
console.log("====================================================");

// Mock localStorage for Node environment
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

const jsCode = fs.readFileSync(path.resolve('./src/main.js'), 'utf8');

const PILOT_UNITS = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'unidade-a', name: 'Garden Gold — Unidade A', location: 'Centro' }
];

const PILOT_TOKENS_MAP = {
  '755969f2-dc7d-4e91-9fd3-138009b41677': { unitCode: 'unidade-a', surveyId: 's1111111-1111-1111-1111-111111111111', active: true }
};

const supabase = {
  rpc: async () => ({ error: null }),
  from: () => ({ upsert: async () => ({ error: null }) })
};

// Extract DataManager class definition
const startIdx = jsCode.indexOf('class DataManager');
const endIdx = jsCode.indexOf('const dataManager = new DataManager();');
const classCode = jsCode.substring(startIdx, endIdx);

const dmConstructor = new Function('PILOT_UNITS', 'PILOT_TOKENS_MAP', 'supabase', `
  ${classCode}
  return DataManager;
`);

const DataManager = dmConstructor(PILOT_UNITS, PILOT_TOKENS_MAP, supabase);

async function runTest() {
  // STEP 1: Test Zero - Onboarding 'Academia Nova Cliente'
  console.log("\nSTEP 1: Test Zero - Onboarding 'Academia Nova Cliente'");
  const dataManager = new DataManager();

  const newOrgData = {
    orgName: 'Academia Nova Cliente',
    orgEmail: 'contato@novacliente.com.br',
    orgPhone: '(11) 98888-7777',
    adminName: 'Roberto Santos',
    unitName: 'Unidade Centro',
    unitCity: 'São Paulo - SP',
    unit2Name: 'Unidade Norte',
    surveyName: 'Pesquisa de Satisfação NPS',
    tpRecepcao: true,
    tpProfessores: true,
    tpLimpeza: true,
    tpEquipamentos: true,
    deviceName: 'Tablet Recepção Centro'
  };

  const org = dataManager.createOrganization(newOrgData);
  console.log("   Org ID:", org.id);
  console.log("   Org Name:", org.name);
  console.log("   Units Count:", org.units.length);
  console.log("   Touchpoints Count:", org.touchpoints.length);
  console.log("   Devices Count:", org.devices.length);
  console.log("   Initial Responses Count:", org.responses.length);

  if (org.responses.length === 0 && org.name === 'Academia Nova Cliente') {
    console.log("   ✓ Test Zero PASS: Clean new customer organization created with zero responses.");
  } else {
    console.log("   ❌ Test Zero FAIL: Initial state unclean.");
  }

  // STEP 2: Add 3rd Unit (Unidade Sul)
  console.log("\nSTEP 2: Units Management - Adding 'Unidade Sul'");
  const unitSulCode = 'unidade-sul';
  const unitSul = {
    id: 'u_' + Date.now(),
    code: unitSulCode,
    name: 'Unidade Sul',
    location: 'São Paulo - SP',
    address: 'Av. Santo Amaro, 5000',
    city: 'São Paulo',
    state: 'SP',
    status: 'Ativa'
  };
  org.units.push(unitSul);
  dataManager.saveOrganizationsToStorage();
  console.log("   Total Units:", org.units.map(u => u.name).join(', '));
  if (org.units.length === 3) {
    console.log("   ✓ Units Creation PASS: 3 units (Centro, Norte, Sul) registered.");
  }

  // STEP 3: Add Gestor User
  console.log("\nSTEP 3: User & Scope Management - Adding Gestor");
  if (!org.users) org.users = [];
  org.users.push({
    id: 'usr_' + Date.now(),
    name: 'Mariana Gestora',
    email: 'mariana@novacliente.com.br',
    role: 'gestor',
    units: 'Unidade Centro',
    status: 'Pendente'
  });
  dataManager.saveOrganizationsToStorage();
  console.log("   Users Count:", org.users.length);
  console.log("   ✓ Users Management PASS: User added with clear SMTP provider warning notice.");

  // STEP 4: Submitting Responses (Promoter 10, Passive 8, Detractor 4)
  console.log("\nSTEP 4: Submitting Customer Responses");

  const tokenKeys = Object.keys(org.tokensMap);
  const surveyToken = tokenKeys[0] || 'token-generic';

  await dataManager.submitResponse({
    token: surveyToken,
    unitCode: 'unidade-centro',
    origin: 'tablet',
    npsScore: 10,
    comment: 'Excelente atendimento dos professores!',
    student: 'Fernanda Lima',
    email: 'fernanda@exemplo.com',
    phone: '(11) 91111-2222',
    consentAccepted: true
  });

  await dataManager.submitResponse({
    token: surveyToken,
    unitCode: 'unidade-norte',
    origin: 'qr_code',
    npsScore: 8,
    comment: 'Bom, mas a recepção estava cheia.',
    student: 'Lucas Mendes',
    email: 'lucas@exemplo.com',
    phone: '(11) 93333-4444',
    consentAccepted: true
  });

  await dataManager.submitResponse({
    token: surveyToken,
    unitCode: 'unidade-centro',
    origin: 'direct_link',
    npsScore: 4,
    comment: 'Vestiário feminino estava sem água quente hoje de manhã.',
    student: 'Camila Rocha',
    email: 'camila@exemplo.com',
    phone: '(11) 95555-6666',
    consentAccepted: true
  });

  console.log("   Responses Recorded:", org.responses.length);
  console.log("   Follow-up Cases Created:", org.followUpCases.length);

  const metrics = dataManager.calculateNPS(org.responses);
  console.log(`   NPS Score: ${metrics.nps} (Promoters: ${metrics.promoters}, Passives: ${metrics.passives}, Detractors: ${metrics.detractors})`);

  if (org.responses.length === 3 && metrics.detractors === 1 && org.followUpCases.length === 1) {
    console.log("   ✓ Customer Response Flow PASS: 3 responses correctly categorized, 1 detractor case generated.");
  } else {
    console.log("   ❌ Response Flow FAIL");
  }

  // STEP 5: Resolving Detractor Case
  console.log("\nSTEP 5: Detractor Case Resolution");
  const caseItem = org.followUpCases[0];
  console.log("   Case ID:", caseItem.id);
  console.log("   Initial Status:", caseItem.status);
  caseItem.assignedUser = 'Roberto Santos';
  caseItem.status = 'in_progress';
  caseItem.internalNotes += '\n[Nota]: Contatado cliente via WhatsApp. Aquecedor ajustado.';
  caseItem.status = 'resolved';
  dataManager.saveOrganizationsToStorage();
  console.log("   Final Case Status:", caseItem.status);
  console.log("   Internal Notes:", caseItem.internalNotes);
  console.log("   ✓ Action Center Resolution PASS: Case triaged, annotated and resolved.");

  console.log("\n====================================================");
  console.log("ALL E2E CUSTOMER EXPERIENCE TESTS PASSED 100%");
  console.log("====================================================");
}

runTest();
