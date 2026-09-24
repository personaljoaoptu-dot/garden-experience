import fs from 'fs';
import path from 'path';

const distHtmlPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\garden-experience\\dist\\index.html';
const content = fs.readFileSync(distHtmlPath, 'utf-8');

const htmlChecks = {
  btnQuickThemeToggle: content.includes('btnQuickThemeToggle'),
  cfgAppearance: content.includes('cfg-appearance'),
  themeRadioLight: content.includes('themeRadioLight'),
  themeRadioDark: content.includes('themeRadioDark'),
  themeRadioSystem: content.includes('themeRadioSystem'),
  brandHomeLink: content.includes('brandHomeLink')
};

console.log('DIST HTML VERIFICATION RESULTS:');
Object.entries(htmlChecks).forEach(([k, v]) => {
  console.log(`  ${k}: ${v ? 'PASS' : 'FAIL'}`);
});

const srcJsPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\garden-experience\\src\\main.js';
const jsContent = fs.readFileSync(srcJsPath, 'utf-8');

const jsChecks = {
  initTheme: jsContent.includes('function initTheme'),
  setThemeMode: jsContent.includes('function setThemeMode'),
  applyResolvedTheme: jsContent.includes('function applyResolvedTheme'),
  btnQuickAssign: jsContent.includes('btnQuickAssign'),
  btnQuickResolve: jsContent.includes('btnQuickResolve'),
  btnQuickWhatsapp: jsContent.includes('btnQuickWhatsapp'),
  btnQuickEmail: jsContent.includes('btnQuickEmail'),
  btnQuickInternalNote: jsContent.includes('btnQuickInternalNote'),
  localStoragePersistence: jsContent.includes("localStorage.setItem('garden_theme_mode'")
};

console.log('\nSRC JS VERIFICATION RESULTS:');
Object.entries(jsChecks).forEach(([k, v]) => {
  console.log(`  ${k}: ${v ? 'PASS' : 'FAIL'}`);
});

const cssPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\garden-experience\\style.css';
const cssContent = fs.readFileSync(cssPath, 'utf-8');

const cssChecks = {
  lightThemeTokens: cssContent.includes('[data-theme="light"]'),
  kioskIsolation: cssContent.includes('#tab-kiosk'),
  quickActionsBar: cssContent.includes('.detail-quick-actions-bar'),
  smoothTransitions: cssContent.includes('transition: background-color 0.2s ease')
};

console.log('\nCSS SYSTEM VERIFICATION RESULTS:');
Object.entries(cssChecks).forEach(([k, v]) => {
  console.log(`  ${k}: ${v ? 'PASS' : 'FAIL'}`);
});
