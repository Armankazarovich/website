const fs = require('fs');
const path = require('path');

// Check if D:\pilorus\website and D:\ПилоРус\website are the same
try {
  const a = fs.realpathSync('D:/pilorus/website');
  const b = fs.realpathSync('D:/ПилоРус/website');
  console.log('pilorus realpath:', a);
  console.log('PiloRus realpath:', b);
  console.log('Same location:', a === b);
} catch(e) {
  console.log('Error:', e.message);
}

// Check globals.css in both
try {
  const la = fs.statSync('D:/pilorus/website/app/globals.css').size;
  const lb = fs.statSync('D:/ПилоРус/website/app/globals.css').size;
  console.log('pilorus globals.css size:', la);
  console.log('PiloRus globals.css size:', lb);
  console.log('Same size:', la === lb);
} catch(e) {
  console.log('Size check error:', e.message);
}

// Check git status from pilorus
const { execSync } = require('child_process');
try {
  const status = execSync('git status --short', { cwd: 'D:/pilorus/website', encoding: 'utf8' });
  console.log('\ngit status (pilorus):');
  console.log(status || '(clean)');
} catch(e) {
  console.log('git error:', e.message);
}
