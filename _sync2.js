const fs = require('fs');
const path = require('path');

const files = [
  'app/globals.css',
  'app/admin/page.tsx',
  'components/admin/admin-shell.tsx',
  'components/admin/admin-mobile-bottom-nav.tsx',
  'components/admin/animated-counter.tsx',
  'components/admin/dashboard-greeting.tsx',
  'components/admin/dashboard-metrics.tsx',
  'components/admin/dashboard-chart.tsx',
];

const src = 'D:\\ПилоРус\\website';
const dst = 'D:\\pilorus\\website';

let ok = 0, fail = 0;
for (const f of files) {
  try {
    fs.mkdirSync(path.dirname(path.join(dst, f)), { recursive: true });
    fs.copyFileSync(path.join(src, f), path.join(dst, f));
    console.log('OK: ' + f);
    ok++;
  } catch (e) {
    console.log('FAIL: ' + f + ' - ' + e.message);
    fail++;
  }
}
console.log(`Done: ${ok} ok, ${fail} fail`);
