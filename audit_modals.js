import fs from 'fs';

const htmlPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\garden-experience\\index.html';
const jsPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\garden-experience\\src\\main.js';

const html = fs.readFileSync(htmlPath, 'utf-8');
const js = fs.readFileSync(jsPath, 'utf-8');

// Find all modal ids in HTML
const modalMatches = html.match(/id="(modal[^"]+)"/g) || [];
console.log('=== MODALS IN HTML ===');
modalMatches.forEach(m => console.log(' ', m));

// Find all form ids in HTML
const formMatches = html.match(/id="(form[^"]+)"/g) || [];
console.log('\n=== FORMS IN HTML ===');
formMatches.forEach(f => console.log(' ', f));

// Find all buttons in HTML that open modals
console.log('\n=== BUTTONS TRIGGERING MODALS IN JS ===');
const modalTriggerRegex = /document\.getElementById\(['"](modal[^'"]+)['"]\)\.style\.display = ['"]flex['"]/g;
let match;
while ((match = modalTriggerRegex.exec(js)) !== null) {
  console.log('  Trigger:', match[1]);
}

// Check for any obsolete or fake modals in JS or HTML
const fakeKeywords = ['demo', 'mockup', 'placeholder', 'sample', 'lorem', 'fake', 'dummy'];
fakeKeywords.forEach(kw => {
  const countHtml = (html.match(new RegExp(kw, 'gi')) || []).length;
  const countJs = (js.match(new RegExp(kw, 'gi')) || []).length;
  console.log(`Keyword '${kw}': HTML=${countHtml}, JS=${countJs}`);
});
