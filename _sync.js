const fs = require('fs');
const path = require('path');

const SRC = 'D:\\ПилоРус\\website';
const DST = 'D:\\pilorus\\website';

const files = [
  'app/admin/page.tsx',
  'app/api/ai/tts/route.ts',
  'components/admin/admin-aray.tsx',
  'components/admin/animated-counter.tsx',
  'components/admin/dashboard-greeting.tsx',
  'components/admin/dashboard-metrics.tsx',
  'components/admin/dashboard-chart.tsx',
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
