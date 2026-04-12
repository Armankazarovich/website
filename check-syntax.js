const fs = require('fs');

const files = [
  'components/admin/admin-aray.tsx',
  'lib/aray-agent.ts',
  'lib/google-ai.ts',
  'app/api/ai/generate/route.ts',
  'app/api/ai/tts/route.ts',
];

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let braces = 0, parens = 0, brackets = 0;
    for (const c of content) {
      if (c === '{') braces++;
      if (c === '}') braces--;
      if (c === '(') parens++;
      if (c === ')') parens--;
      if (c === '[') brackets++;
      if (c === ']') brackets--;
    }
    const lines = content.split('\n').length;
    const ok = braces === 0 && parens === 0 && brackets === 0;
    console.log(
      (ok ? 'OK' : 'WARN') + ' ' + file +
      ' (' + lines + ' lines)' +
      (ok ? '' : ' braces=' + braces + ' parens=' + parens + ' brackets=' + brackets)
    );
  } catch (e) {
    console.log('MISS ' + file + ': ' + e.message);
  }
}
