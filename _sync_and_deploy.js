const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = 'D:/\u041f\u0438\u043b\u043e\u0420\u0443\u0441/website';
const dst = 'D:/pilorus/website';

// Files to sync
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
    const dstDir = path.dirname(dstPath);
    if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });

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

// TypeScript check
console.log('\nRunning TypeScript check...');
try {
  execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', { cwd: dst, encoding: 'utf8', timeout: 120000 });
  console.log('TypeScript: ALL CLEAN');
} catch (e) {
  const errs = e.stdout.toString().split('\n').filter(l => l.includes('error TS'));
  console.log('TypeScript errors: ' + errs.length);
  errs.slice(0, 15).forEach(l => console.log(l));
  if (errs.length > 0) {
    console.log('\nABORTING deploy due to TypeScript errors');
    process.exit(1);
  }
}

// Git add + commit + push
console.log('\nStaging...');
try { fs.unlinkSync(dst + '/.git/index.lock'); } catch {}
execSync('git add -A', { cwd: dst, encoding: 'utf8' });

const status = execSync('git diff --cached --name-only', { cwd: dst, encoding: 'utf8' }).trim();
if (!status) {
  console.log('Nothing to commit');
  process.exit(0);
}
console.log('Changed files:\n' + status);

const msg = 'feat: neural network bg, cursor glow, glass cards, video fix, 2-mode switcher';
execSync('git commit -m "' + msg + '"', { cwd: dst, encoding: 'utf8' });
console.log('Committed');

execSync('git push origin main', { cwd: dst, encoding: 'utf8', timeout: 60000 });
console.log('Pushed to production!');
