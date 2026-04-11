const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = 'D:/\u041f\u0438\u043b\u043e\u0420\u0443\u0441/website';
const dst = 'D:/pilorus/website';

const files = [
  'components/admin/cursor-glow.tsx',
  'components/admin/admin-video-bg.tsx',
  'app/globals.css',
  'app/admin/orders/new/page.tsx',
];

let synced = 0;
for (const f of files) {
  const srcPath = path.join(src, f);
  const dstPath = path.join(dst, f);
  try {
    const srcData = fs.readFileSync(srcPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    let needsSync = true;
    try {
      const dstData = fs.readFileSync(dstPath);
      if (Buffer.compare(srcData, dstData) === 0) needsSync = false;
    } catch {}
    if (needsSync) {
      fs.writeFileSync(dstPath, srcData);
      console.log('SYNCED: ' + f + ' (' + srcData.length + ' bytes)');
      synced++;
    } else {
      console.log('SAME:   ' + f);
    }
  } catch (e) {
    console.log('ERROR:  ' + f + ' - ' + e.message);
  }
}
console.log('\nSynced ' + synced + ' files');

// Verify admin-i18n.ts is NOT truncated
try {
  const i18nContent = fs.readFileSync(dst + '/lib/admin-i18n.ts', 'utf8');
  const lastLine = i18nContent.trim().split('\n').pop();
  if (lastLine.includes('LANG_LS_KEY')) {
    console.log('admin-i18n.ts: OK (complete)');
  } else {
    console.log('FATAL: admin-i18n.ts truncated! Last line: ' + lastLine);
    process.exit(1);
  }
} catch (e) {
  console.log('WARN: Could not verify admin-i18n.ts: ' + e.message);
}

// TypeScript check
console.log('\nRunning TypeScript check...');
try {
  execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', { cwd: dst, encoding: 'utf8', timeout: 120000 });
  console.log('TypeScript: ALL CLEAN');
} catch (e) {
  const out = (e.stdout || '').toString();
  const errs = out.split('\n').filter(l => l.includes('error TS'));
  console.log('TypeScript errors: ' + errs.length);
  errs.slice(0, 15).forEach(l => console.log(l));
  if (errs.length > 0) {
    console.log('\nABORTING deploy due to TypeScript errors');
    process.exit(1);
  }
}

// Git
console.log('\nGit operations...');
try { fs.unlinkSync(dst + '/.git/index.lock'); } catch {}
execSync('git add -A', { cwd: dst, encoding: 'utf8' });

const status = execSync('git diff --cached --name-only', { cwd: dst, encoding: 'utf8' }).trim();
if (!status) {
  console.log('Nothing to commit');
  process.exit(0);
}
console.log('Changed files:\n' + status);

const msg = 'fix: soft glow, video crossfade A/B, sidebar glass, qty buttons';
execSync('git commit -m "' + msg + '"', { cwd: dst, encoding: 'utf8' });
console.log('Committed');

execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
console.log('\nPushed to production!');
