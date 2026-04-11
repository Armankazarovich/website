const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = 'D:/\u041f\u0438\u043b\u043e\u0420\u0443\u0441/website';
const dst = 'D:/pilorus/website';

const files = [
  'lib/admin-lang-context.tsx',
  'components/admin/admin-shell.tsx',
  'components/admin/lazy-components.tsx',
  'app/globals.css',
  'app/layout.tsx',
];

let synced = 0;
for (const f of files) {
  try {
    const data = fs.readFileSync(path.join(src, f));
    const dp = path.join(dst, f);
    fs.mkdirSync(path.dirname(dp), { recursive: true });
    fs.writeFileSync(dp, data);
    console.log('SYNCED: ' + f);
    synced++;
  } catch (e) { console.log('ERROR: ' + f + ' - ' + e.message); }
}
console.log('Synced ' + synced + ' files');

// Verify i18n integrity
const i18n = fs.readFileSync(dst + '/lib/admin-i18n.ts', 'utf8');
if (!i18n.trim().split('\n').pop().includes('LANG_LS_KEY')) {
  console.log('FATAL: admin-i18n.ts truncated!'); process.exit(1);
}
console.log('admin-i18n.ts: OK');

// TypeScript check
console.log('TypeScript check...');
try {
  execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', { cwd: dst, encoding: 'utf8', timeout: 120000 });
  console.log('TypeScript: CLEAN');
} catch (e) {
  const errs = (e.stdout||'').split('\n').filter(l => l.includes('error TS'));
  console.log('TS errors: ' + errs.length);
  errs.slice(0, 15).forEach(l => console.log(l));
  if (errs.length) process.exit(1);
}

// Git
try { fs.unlinkSync(dst + '/.git/index.lock'); } catch {}
execSync('git add -A', { cwd: dst, encoding: 'utf8' });
const diff = execSync('git diff --cached --name-only', { cwd: dst, encoding: 'utf8' }).trim();
if (!diff) { console.log('Nothing to commit'); process.exit(0); }
console.log('Changed:\n' + diff);
execSync('git commit -m "feat: Google Translate integration + lazy loading perf"', { cwd: dst, encoding: 'utf8' });
console.log('Committed');
try {
  execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
  console.log('Pushed!');
} catch {
  console.log('Retry push...');
  execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
  console.log('Pushed on retry!');
}
