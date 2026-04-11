const fs = require('fs');  
const files = ['components/admin/admin-aray.tsx','lib/aray-agent.ts','lib/google-ai.ts','app/api/ai/generate/route.ts','app/api/ai/tts/route.ts'];  
for(const f of files){try{const c=fs.readFileSync(f,'utf8');let b=0,p=0;for(const x of c){if(x==='{')b++;if(x==='}')b--;if(x==='(')p++;if(x===')')p--;}console.log((b===0&&p===0?'OK':'ERR')+' '+f+' lines='+c.split('\n').length+(b!==0?' b='+b:'')+(p!==0?' p='+p:''));}catch(e){console.log('MISS '+f);}}  
