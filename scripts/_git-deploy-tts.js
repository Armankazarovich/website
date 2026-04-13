const { execSync } = require("child_process");
const path = require("path");

process.chdir("D:/pilorus/website");
const git = "C:/Program Files/Git/cmd/git.exe";

function run(cmd) {
  console.log(`> ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    if (out.trim()) console.log(out.trim());
    return out;
  } catch (e) {
    console.error(e.stderr || e.message);
    throw e;
  }
}

// Stage files
run(`"${git}" add components/admin/admin-aray.tsx components/store/aray-widget.tsx app/api/ai/tts/route.ts app/api/ai/chat/route.ts`);

// Show status
run(`"${git}" status --short`);

// Commit
run(`"${git}" commit -m "feat(aray): direct ElevenLabs TTS from browser - bypasses VPS geo-block"`);

// Push
run(`"${git}" push origin main`);

console.log("\nDone! Deploy will start on GitHub Actions.");
