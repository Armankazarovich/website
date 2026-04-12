const fs = require('fs');
const path = require('path');

const SRC = 'D:/ПилоРус/website';
const DST = 'D:/pilorus/website';

const files = [
  'components/admin/admin-video-bg.tsx',
  'components/admin/admin-lang-picker.tsx',
  'components/admin/admin-shell.tsx',
  'app/api/health/route.ts',
  'app/api/admin/health/route.ts',
  'app/api/ai/chat/route.ts',
  'lib/admin-i18n.ts',
  'lib/aray-router.ts',
  'lib/aray-agent.ts',
  'lib/auth.ts',
  'prisma/schema.prisma',
  'CLAUDE.md',
  'ROADMAP.md',
  'types/next-auth.d.ts',
  'app/globals.css',
];

let ok = 0, fail = 0;
for (const f of files) {
  const src = path.join(SRC, f);
  const dst = path.join(DST, f);
  try {
    // Ensure destination directory exists
    const dir = path.dirname(dst);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dst);
    console.log('OK  ' + f);
    ok++;
  } catch (err) {
    console.log('ERR ' + f + ' — ' + err.message);
    fail++;
  }
}
console.log(`\nSynced: ${ok} OK, ${fail} failed`);
