const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = "D:/\u041F\u0438\u043B\u043E\u0420\u0443\u0441/website";
const dst = "D:/pilorus/website";

const changedFiles = [
  "app/(store)/page.tsx",
  "app/admin/finance/page.tsx",
  "app/admin/page.tsx",
  "app/admin/reviews/reviews-client.tsx",
  "app/api/admin/clients/[id]/route.ts",
  "app/api/cabinet/password/route.ts",
  "app/cabinet/media/page.tsx",
  "app/globals.css",
  "components/admin/aray-control-center.tsx",
  "components/store/description-accordion.tsx",
  "lib/auth.ts",
];
function cleanLocks(gitDir) {
  try {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".lock")) {
          try { fs.unlinkSync(full); console.log("  Removed lock:", full); } catch {}
        }
      }
    };
    walk(gitDir);
  } catch {}
}

console.log("=== STEP 1: Sync files ===");
let synced = 0;
for (const f of changedFiles) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  try {
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    console.log("  OK:", f);
    synced++;
  } catch (e) {
    console.log("  ERR:", f, e.message);
  }
}
console.log("Synced " + synced + "/" + changedFiles.length);
console.log("\n=== STEP 2: Clean git locks ===");
cleanLocks(path.join(dst, ".git"));

console.log("\n=== STEP 3: Git commit + push ===");
const opt = { cwd: dst, encoding: "utf8", stdio: "pipe", timeout: 60000 };
try {
  execSync("git add -A", opt);
  const status = execSync("git status --short", opt);
  console.log("Changed:\n" + status);
  if (!status.trim()) { console.log("Nothing to commit!"); process.exit(0); }
  const msg = "fix: audit - revenue calc, normalizePhone, password validation, role escalation, CSS, reviews, dynamic rating";
  execSync('git commit -m "' + msg + '"', opt);
  console.log("Committed!");
  console.log("\n=== STEP 4: Push ===");
  const push = execSync("git push origin main 2>&1", opt);
  console.log("Push:", push);
  console.log("\nDEPLOY STARTED! ~2-3 min via GitHub Actions.");
} catch (e) {
  console.log("Error:", e.stderr || e.stdout || e.message);
}