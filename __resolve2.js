const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const dst = "D:/pilorus/website";
const opt = { cwd: dst, encoding: "utf8", stdio: "pipe", timeout: 60000 };

function cleanLocks() {
  try {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".lock")) {
          try { fs.unlinkSync(full); } catch {}
        }
      }
    };
    walk(path.join(dst, ".git"));
  } catch {}
}
try {
  // Abort the failed rebase first
  cleanLocks();
  try { execSync("git rebase --abort", opt); } catch {}
  console.log("Rebase aborted");

  // Now do merge instead of rebase
  cleanLocks();
  execSync("git pull origin main --no-rebase -X ours 2>&1", opt);
  console.log("Merged with ours strategy");

  // Now copy our fixed file again (merge may have overwritten)
  const src = "D:/\u041F\u0438\u043B\u043E\u0420\u0443\u0441/website";
  const fixFile = "components/admin/aray-control-center.tsx";
  fs.copyFileSync(path.join(src, fixFile), path.join(dst, fixFile));
  console.log("Re-applied our fix to", fixFile);

  cleanLocks();
  execSync("git add -A", opt);
  cleanLocks();
  const status = execSync("git status --short", opt);
  console.log("Status:", status);

  if (status.trim()) {
    cleanLocks();
    execSync('git commit -m "fix: re-apply audit fix for aray-control-center"', opt);
    console.log("Committed merge fix");
  }

  cleanLocks();
  const push = execSync("git push origin main 2>&1", opt);
  console.log("Push:", push);
  console.log("\nDEPLOY OK!");
} catch (e) {
  console.log("Error:", e.stderr || e.stdout || e.message);
}