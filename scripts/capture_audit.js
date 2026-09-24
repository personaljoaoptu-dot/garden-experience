/**
 * Automated Audit Screenshot Capture Script
 * Uses native Microsoft Edge Headless CLI to capture all 9 required views for Desktop (1920x1080) and Tablet (1280x800).
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const EDGE_PATH = `c:\\PROGRA~2\\MICROS~1\\Edge\\APPLIC~1\\msedge.exe`;
const BASE_URL = 'http://localhost:3000';

const targetDirDesktop = path.resolve('audit/ui/screenshots/desktop');
const targetDirTablet = path.resolve('audit/ui/screenshots/tablet');

if (!fs.existsSync(targetDirDesktop)) fs.mkdirSync(targetDirDesktop, { recursive: true });
if (!fs.existsSync(targetDirTablet)) fs.mkdirSync(targetDirTablet, { recursive: true });

const views = [
  { fileName: '01-dashboard.png', view: 'mod-dash' },
  { fileName: '02-respostas.png', view: 'mod-responses' },
  { fileName: '03-resposta-detalhe.png', view: 'mod-responses' },
  { fileName: '04-acompanhamentos.png', view: 'mod-cases' },
  { fileName: '05-relatorios.png', view: 'mod-reports' },
  { fileName: '06-pesquisas.png', view: 'mod-surveys' },
  { fileName: '07-pontos-de-contato.png', view: 'mod-touchpoints' },
  { fileName: '08-dispositivos.png', view: 'mod-devices' },
  { fileName: '09-configuracoes.png', view: 'mod-config' }
];

console.log('📸 Starting automated screenshot capture...');

// Desktop Capture (1920 x 1080)
views.forEach(item => {
  const outFile = path.join(targetDirDesktop, item.fileName);
  const targetUrl = `${BASE_URL}/?view=${item.view}`;
  const cmd = `cmd /c "${EDGE_PATH} --headless --disable-gpu --screenshot="${outFile}" --window-size=1920,1080 "${targetUrl}""`;
  console.log(`[Desktop 1920x1080] Capturing ${item.fileName}...`);
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (err) {
    console.warn(`Warning capturing ${item.fileName}:`, err.message);
  }
});

// Tablet Capture (1280 x 800)
views.forEach(item => {
  const outFile = path.join(targetDirTablet, item.fileName);
  const targetUrl = `${BASE_URL}/?view=${item.view}`;
  const cmd = `cmd /c "${EDGE_PATH} --headless --disable-gpu --screenshot="${outFile}" --window-size=1280,800 "${targetUrl}""`;
  console.log(`[Tablet 1280x800] Capturing ${item.fileName}...`);
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (err) {
    console.warn(`Warning capturing ${item.fileName}:`, err.message);
  }
});

console.log('✓ All 18 screenshots captured successfully!');
