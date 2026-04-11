const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = 'D:/\u041f\u0438\u043b\u043e\u0420\u0443\u0441/website';
const dst = 'D:/pilorus/website';

const files = [
  'components/admin/cursor-glow.tsx',
  'components/admin/admin-video-bg.tsx',
  'components/admin/neural-bg.tsx',
  'app/globals.css',
];

let synced = 0;
for (const f of files) {
  const srcPath = path.join(src, f);
  const dstPath = path.join(dst, f);
  try {
    const data = fs.readFileSync(srcPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.writeFileSync(dstPath, data);
    console.log('SYNCED: ' + f);
    synced++;
  } catch (e) {
    console.log('ERROR: ' + f + ' - ' + e.message);
  }
}
console.log('Synced ' + synced + ' files');

// Verify i18n
const i18n = fs.readFileSync(dst + '/lib/admin-i18n.ts', 'utf8');
if (!i18n.trim().split('\n').pop().includes('LANG_LS_KEY')) {
  console.log('FATAL: admin-i18n.ts truncated!');
  process.exit(1);
}
console.log('admin-i18n.ts: OK');

// TypeScript
console.log('TypeScript check...');
try {
  execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', { cwd: dst, encoding: 'utf8', timeout: 120000 });
  console.log('TypeScript: CLEAN');
} catch (e) {
  const errs = (e.stdout||'').split('\n').filter(l => l.includes('error TS'));
  console.log('TS errors: ' + errs.length);
  errs.slice(0,10).forEach(l => console.log(l));
  if (errs.length) process.exit(1);
}

// Git
try { fs.unlinkSync(dst + '/.git/index.lock'); } catch {}
execSync('git add -A', { cwd: dst, encoding: 'utf8' });
const diff = execSync('git diff --cached --name-only', { cwd: dst, encoding: 'utf8' }).trim();
if (!diff) { console.log('Nothing to commit'); process.exit(0); }
console.log('Changed:\n' + diff);
execSync('git commit -m "polish: tone down effects \u2014 subtle glow, denser cards, softer neural net"', { cwd: dst, encoding: 'utf8' });
console.log('Committed');
try {
  execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
  console.log('Pushed!');
} catch (e) {
  console.log('Push failed, retrying...');
  execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
  console.log('Pushed on retry!');
}
