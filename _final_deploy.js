const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = 'D:/\u041f\u0438\u043b\u043e\u0420\u0443\u0441/website';
const dst = 'D:/pilorus/website';

// Files to sync from Cowork path → git repo
const files = [
  'components/admin/neural-bg.tsx',
  'components/admin/cursor-glow.tsx',
  'components/admin/admin-shell.tsx',
  'components/admin/admin-video-bg.tsx',
  'app/globals.css',
  'lib/admin-i18n.ts',
];

let synced = 0;
for (const f of files) {
  const srcPath = path.join(src, f);
  const dstPath = path.join(dst, f);
  try {
    const srcData = fs.readFileSync(srcPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.writeFileSync(dstPath, srcData);
    console.log('SYNCED: ' + f + ' (' + srcData.length + ' bytes)');
    synced++;
  } catch (e) {
    console.log('ERROR:  ' + f + ' - ' + e.message);
  }
}
console.log('Synced ' + synced + ' files');

// Verify admin-i18n.ts is NOT truncated
const i18nContent = fs.readFileSync(dst + '/lib/admin-i18n.ts', 'utf8');
const lastLine = i18nContent.trim().split('\n').pop();
console.log('\nadmin-i18n.ts last line: "' + lastLine + '"');
if (lastLine.includes('LANG_LS_KEY')) {
  console.log('admin-i18n.ts: OK (complete)');
} else {
  console.log('FATAL: admin-i18n.ts is truncated! Aborting.');
  process.exit(1);
}

// TypeScript check
console.log('\nRunning TypeScript check...');
try {
  execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', { cwd: dst, encoding: 'utf8', timeout: 120000 });
  console.log('TypeScript: ALL CLEAN');
} catch (e) {
  const errs = (e.stdout || '').toString().split('\n').filter(l => l.includes('error TS'));
  console.log('TypeScript errors: ' + errs.length);
  errs.slice(0, 10).forEach(l => console.log(l));
  if (errs.length > 0) {
    console.log('ABORTING deploy');
    process.exit(1);
  }
}

// Git
console.log('\nGit operations...');
try { fs.unlinkSync(dst + '/.git/index.lock'); } catch {}
execSync('git add -A', { cwd: dst });

const changed = execSync('git diff --cached --name-only', { cwd: dst, encoding: 'utf8' }).trim();
if (!changed) { console.log('Nothing to commit'); process.exit(0); }
console.log('Changed:\n' + changed);

const msg = 'feat: neural bg, cursor glow, glass cards, video crossfade, 2-mode switcher';
execSync('git commit -m "' + msg + '"', { cwd: dst, encoding: 'utf8' });
console.log('Committed');

execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
console.log('\nPushed to production!');
