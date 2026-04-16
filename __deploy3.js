const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = "D:/\u041F\u0438\u043B\u043E\u0420\u0443\u0441/website";
const dst = "D:/pilorus/website";

const changedFiles = [
  "app/(store)/catalog/page.tsx",
];

// Clean git locks
function cleanLocks(gitDir) {
  try {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".lock")) {
          try { fs.unlinkSync(full); } catch { try { fs.renameSync(full, full + ".old"); } catch {} }
        }
      }
    };
    walk(gitDir);
  } catch {}
}

console.log("=== Sync ===");
for (const f of changedFiles) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
  console.log("  Synced:", f);
}

console.log("=== Git ===");
cleanLocks(path.join(dst, ".git"));
const opt = { cwd: dst, encoding: "utf8", stdio: "pipe", timeout: 60000 };
try {
  execSync("git add -A", opt);
  const status = execSync("git status --short", opt);
  console.log(status);
  if (!status.trim()) { console.log("Nothing!"); process.exit(0); }
  execSync('git commit -m "fix: catalog filters sync - sizes respect type, types respect size"', opt);
  const push = execSync("git push origin main 2>&1", opt);
  console.log("Push:", push, "\nDEPLOY STARTED!");
} catch (e) {
  console.log("Error:", e.stderr || e.stdout || e.message);
}
