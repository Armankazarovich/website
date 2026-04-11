const fs = require('fs');
const path = require('path');

const files = [
  'app/admin/page.tsx',
  'components/admin/animated-counter.tsx',
  'components/admin/dashboard-greeting.tsx',
  'components/admin/dashboard-metrics.tsx',
  'components/admin/dashboard-chart.tsx',
];

const src = 'D:\\ПилоРус\\website';
const dst = 'D:\\pilorus\\website';

for (const f of files) {
  const from = path.join(src, f);
  const to = path.join(dst, f);
  try {
    // Ensure target directory exists
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log('OK: ' + f);
  } catch (e) {
    console.log('FAIL: ' + f + ' - ' + e.message);
  }
}
console.log('Done');
