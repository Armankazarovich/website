const fs = require('fs');
const path = require('path');

const SRC = 'D:\\ПилоРус\\website';
const DST = 'D:\\pilorus\\website';

const files = [
  'app/api/ai/chat/route.ts',
  'app/globals.css',
  'app/layout.tsx',
  'components/admin/admin-lang-picker.tsx',
  'components/admin/admin-shell.tsx',
  'components/palette-provider.tsx',
  'lib/admin-i18n.ts',
  'lib/admin-i18n-pages.ts',
  'lib/aray-agent.ts',
  'lib/aray-router.ts',
  'lib/google-ai-examples.ts',
];

for (const f of files) {
  const src = path.join(SRC, f);
  const dst = path.join(DST, f);
  try {
    const dir = path.dirname(dst);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dst);
    console.log('OK:', f);
  } catch (e) {
    console.error('FAIL:', f, e.message);
  }
}
console.log('Done');
