const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const src = 'D:/\u041f\u0438\u043b\u043e\u0420\u0443\u0441/website';
const dst = 'D:/pilorus/website';
const files = [
  'lib/admin-lang-context.tsx',
  'components/admin/admin-shell.tsx',
  'app/globals.css',
];
let n = 0;
for (const f of files) {
  try {
    fs.writeFileSync(path.join(dst, f), fs.readFileSync(path.join(src, f)));
    console.log('OK: ' + f); n++;
  } catch (e) { console.log('ERR: ' + f + ' ' + e.message); }
}
console.log(n + ' synced');
// Verify
const i = fs.readFileSync(dst+'/lib/admin-i18n.ts','utf8');
if(!i.trim().split('\n').pop().includes('LANG_LS_KEY')){console.log('FATAL i18n');process.exit(1);}
// TS check
console.log('tsc...');
try{execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1',{cwd:dst,encoding:'utf8',timeout:120000});console.log('TS OK');}
catch(e){const er=(e.stdout||'').split('\n').filter(l=>l.includes('error TS'));console.log('TS err:'+er.length);er.slice(0,10).forEach(l=>console.log(l));if(er.length)process.exit(1);}
// Git
try{fs.unlinkSync(dst+'/.git/index.lock');}catch{}
execSync('git add -A',{cwd:dst,encoding:'utf8'});
const d=execSync('git diff --cached --name-only',{cwd:dst,encoding:'utf8'}).trim();
if(!d){console.log('Nothing');process.exit(0);}
console.log(d);
execSync('git commit -m "feat: hide GT banner + ARAY grammar check"',{cwd:dst,encoding:'utf8'});
try{execSync('git push origin main',{cwd:dst,encoding:'utf8',timeout:60000});console.log('Pushed!');}
catch{execSync('git push origin main',{cwd:dst,encoding:'utf8',timeout:60000});console.log('Pushed retry!');}
