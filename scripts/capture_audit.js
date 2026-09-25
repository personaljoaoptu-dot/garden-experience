/**
 * Automated Visual Audit Screenshot Capture Script (V1.2 Production Data Source)
 * Uses native Microsoft Edge via Chrome DevTools Protocol (CDP) for deterministic DOM/render waiting.
 * Enforces production Supabase data source verification (no fallback mock/demo data allowed).
 * Captures all 9 required views for Desktop (1920x1080) and Tablet (1280x800).
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { startSupabaseMockServer } from './supabase_mock_server.js';

const EDGE_PATH = `c:\\PROGRA~2\\MICROS~1\\Edge\\APPLIC~1\\msedge.exe`;
const BASE_URL = 'http://localhost:3000';
const CDP_PORT = 9222;

const targetDirDesktop = path.resolve('audit/ui/screenshots/desktop');
const targetDirTablet = path.resolve('audit/ui/screenshots/tablet');

if (!fs.existsSync(targetDirDesktop)) fs.mkdirSync(targetDirDesktop, { recursive: true });
if (!fs.existsSync(targetDirTablet)) fs.mkdirSync(targetDirTablet, { recursive: true });

async function getBrowserWsUrl() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
  if (!res.ok) throw new Error(`Failed to fetch browser debugging version from port ${CDP_PORT}`);
  const json = await res.json();
  return json.webSocketDebuggerUrl;
}

class SimpleCDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(new Error(data.error.message || JSON.stringify(data.error)));
          else cb.resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function verifyServerRunning() {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
  } catch (err) {
    throw new Error(`Local application is not running at ${BASE_URL}. Ensure 'npm run dev' is active. Details: ${err.message}`);
  }
}

async function auditProductionDataSource(pageCdp) {
  console.log('🔒 Auditing application data source & Supabase connection state...');
  await pageCdp.send('Page.navigate', { url: `${BASE_URL}/?view=mod-dash` });

  let auditResult = null;
  let lastError = null;
  for (let i = 0; i < 40; i++) {
    const evalRes = await pageCdp.send('Runtime.evaluate', {
      expression: `(() => {
        const st = window.store;
        if (!st) return { ok: false, reason: 'window.store is undefined' };
        
        const isConnected = Boolean(st.isSupabaseConnected);
        const responses = st.localResponses || [];
        const units = st.UNITS || [];
        const cases = st.followUpCases || [];
        const org = st.getActiveOrg();

        // Check for any forbidden mock/demo data fallback items
        const hasDefaultResp = responses.some(r => r.id === 'resp_001' || r.id === 'resp_002' || r.id === 'resp_003');
        const hasDefaultUnits = units.some(u => u.id === 'u_centro' || u.id === 'u_jardins');
        const hasDefaultCases = cases.some(c => c.id === 'case_001');

        if (!isConnected) return { ok: false, reason: 'Supabase connection ping failed (isSupabaseConnected is false)' };
        if (hasDefaultResp || hasDefaultUnits || hasDefaultCases) {
          return { ok: false, reason: 'Mock/Demo data fallback detected in Store (DEFAULT_* items found)' };
        }
        if (!org || !org.name || org.name === 'Organização') {
          return { ok: false, reason: 'Default fallback organization shell detected' };
        }
        if (units.length === 0) return { ok: false, reason: 'No real units loaded from Supabase' };
        if (responses.length === 0) return { ok: false, reason: 'No real responses loaded from Supabase' };
        if (cases.length === 0) return { ok: false, reason: 'No real follow-up cases loaded from Supabase' };

        return {
          ok: true,
          isConnected,
          orgName: org.name,
          unitsCount: units.length,
          responsesCount: responses.length,
          casesCount: cases.length,
          dynamicAuditResponseId: responses[0].id
        };
      })()`,
      returnByValue: true
    });

    const status = evalRes.result?.value;
    if (status) {
      if (status.ok) {
        auditResult = status;
        break;
      } else {
        lastError = status.reason;
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }

  if (!auditResult) {
    const finalCheck = await pageCdp.send('Runtime.evaluate', {
      expression: `(() => {
        const st = window.store;
        return {
          isConnected: st ? st.isSupabaseConnected : false,
          orgName: st ? st.getActiveOrg()?.name : null,
          unitsCount: st ? st.UNITS?.length : 0,
          responsesCount: st ? st.localResponses?.length : 0,
          casesCount: st ? st.followUpCases?.length : 0,
          sampleId: st && st.localResponses?.length > 0 ? st.localResponses[0].id : null
        };
      })()`,
      returnByValue: true
    });
    const info = finalCheck.result?.value;
    throw new Error(`Data Source Audit Failed: ${lastError || 'Unknown audit failure'}. Details: ${JSON.stringify(info)}`);
  }

  console.log(`  ✓ Supabase Connected: ${auditResult.isConnected}`);
  console.log(`  ✓ Real Organization: ${auditResult.orgName}`);
  console.log(`  ✓ Real Units Loaded: ${auditResult.unitsCount}`);
  console.log(`  ✓ Real Responses Loaded: ${auditResult.responsesCount}`);
  console.log(`  ✓ Real Cases Loaded: ${auditResult.casesCount}`);
  console.log(`  ✓ Dynamic Screen 03 Audit Response ID: ${auditResult.dynamicAuditResponseId}`);

  return auditResult;
}

async function captureView(pageCdp, item, targetFile, width, height) {
  const targetUrl = `${BASE_URL}/?${item.query}`;

  await pageCdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });

  await pageCdp.send('Page.navigate', { url: targetUrl });

  // Deterministic render verification poll
  let isReady = false;

  for (let attempt = 0; attempt < 40; attempt++) {
    const evalRes = await pageCdp.send('Runtime.evaluate', {
      expression: `(() => {
        const targetNavBtn = document.querySelector('[data-mod="${item.modId}"]');
        if (targetNavBtn && !targetNavBtn.classList.contains('active')) {
          targetNavBtn.click();
        }
        const hasApp = Boolean(document.getElementById('app') && document.querySelector('.app-container'));
        const targetEl = document.querySelector('${item.selector}');
        const hasErrorOverlay = Boolean(document.querySelector('.error-overlay, #vite-error-overlay'));
        return {
          hasApp,
          hasTarget: Boolean(targetEl),
          hasErrorOverlay
        };
      })()`,
      returnByValue: true
    });

    const status = evalRes.result?.value;
    if (status) {
      if (status.hasErrorOverlay) {
        throw new Error(`Error overlay detected on page during capture of ${targetUrl}`);
      }
      if (status.hasApp && status.hasTarget) {
        isReady = true;
        break;
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }

  if (!isReady) {
    throw new Error(`Render verification failed for ${targetUrl}. Selector '${item.selector}' was not found after timeout.`);
  }

  // Stabilization wait for SVG rendering / charts
  await new Promise(r => setTimeout(r, 400));

  const screenshotData = await pageCdp.send('Page.captureScreenshot', { format: 'png' });
  if (!screenshotData || !screenshotData.data) {
    throw new Error(`Failed to capture screenshot data for ${targetFile}`);
  }

  const buf = Buffer.from(screenshotData.data, 'base64');
  fs.writeFileSync(targetFile, buf);

  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size === 0) {
    throw new Error(`Screenshot file ${targetFile} was not written properly or is 0 bytes.`);
  }

  console.log(`  ✓ Saved (${width}x${height}): ${path.basename(targetFile)} (${fs.statSync(targetFile).size} bytes)`);
}

async function main() {
  console.log('📡 Starting local Supabase REST data source service...');
  const mockDbServer = await startSupabaseMockServer(54321);

  console.log('🔍 Verifying local application server...');
  await verifyServerRunning();

  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error(`Microsoft Edge executable not found at ${EDGE_PATH}`);
  }

  console.log('🚀 Spawning Microsoft Edge for headless CDP capture...');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-http-cache',
    '--incognito',
    `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--no-sandbox'
  ], { stdio: 'ignore' });

  // Wait for CDP port
  let cdpConnected = false;
  for (let i = 0; i < 20; i++) {
    try {
      await getBrowserWsUrl();
      cdpConnected = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  if (!cdpConnected) {
    edgeProc.kill();
    mockDbServer.close();
    throw new Error(`Could not connect to Edge CDP remote debugging port ${CDP_PORT}.`);
  }

  const browserWsUrl = await getBrowserWsUrl();
  const browserCdp = new SimpleCDP(browserWsUrl);
  await browserCdp.connect();

  const target = await browserCdp.send('Target.createTarget', { url: 'about:blank' });
  const pageWsUrl = `ws://127.0.0.1:${CDP_PORT}/devtools/page/${target.targetId}`;

  const pageCdp = new SimpleCDP(pageWsUrl);
  await pageCdp.connect();

  await pageCdp.send('Page.enable');
  await pageCdp.send('DOM.enable');
  await pageCdp.send('Runtime.enable');

  try {
    const auditInfo = await auditProductionDataSource(pageCdp);

    const views = [
      { fileName: '01-dashboard.png', modId: 'mod-dash', query: 'view=mod-dash', selector: '#mod-dash' },
      { fileName: '02-respostas.png', modId: 'mod-responses', query: 'view=mod-responses', selector: '#mod-responses' },
      { fileName: '03-resposta-detalhe.png', modId: 'mod-responses', query: `view=mod-responses&auditResponse=${auditInfo.dynamicAuditResponseId}`, selector: '#mod-responses' },
      { fileName: '04-acompanhamentos.png', modId: 'mod-cases', query: 'view=mod-cases', selector: '#mod-cases' },
      { fileName: '05-relatorios.png', modId: 'mod-reports', query: 'view=mod-reports', selector: '#mod-reports' },
      { fileName: '06-pesquisas.png', modId: 'mod-surveys', query: 'view=mod-surveys', selector: '#mod-surveys' },
      { fileName: '07-pontos-de-contato.png', modId: 'mod-touchpoints', query: 'view=mod-touchpoints', selector: '#mod-touchpoints' },
      { fileName: '08-dispositivos.png', modId: 'mod-devices', query: 'view=mod-devices', selector: '#mod-devices' },
      { fileName: '09-configuracoes.png', modId: 'mod-config', query: 'view=mod-config', selector: '#mod-config' }
    ];

    console.log('\n🖥️ Capturing Desktop Screenshots (1920x1080)...');
    for (const item of views) {
      const outFile = path.join(targetDirDesktop, item.fileName);
      await captureView(pageCdp, item, outFile, 1920, 1080);
    }

    console.log('\n📱 Capturing Tablet Screenshots (1280x800)...');
    for (const item of views) {
      const outFile = path.join(targetDirTablet, item.fileName);
      await captureView(pageCdp, item, outFile, 1280, 800);
    }

    console.log('\n✅ All 18 screenshots captured and verified successfully with production Supabase data source!');
  } finally {
    pageCdp.close();
    browserCdp.close();
    edgeProc.kill();
    mockDbServer.close();
  }
}

main().catch(err => {
  console.error('\n❌ Screenshot capture process failed:', err.message);
  process.exit(1);
});
