const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = "D:/\u041F\u0438\u043B\u043E\u0420\u0443\u0441/website";
const dst = "D:/pilorus/website";

const changedFiles = [
  "lib/product-types.ts",
  "app/(store)/catalog/page.tsx",
  "components/store/catalog-type-filter.tsx",
  "components/store/catalog-filters.tsx",
  "components/store/catalog-mobile-filter.tsx",
  "app/(store)/calculator/page.tsx",
];

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
let ok = 0;
for (const f of changedFiles) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  try {
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    console.log("  OK:", f);
    ok++;
  } catch (e) {
    console.log("  ERR:", f, e.message);
  }
}
console.log(ok + "/" + changedFiles.length + " synced\n");

console.log("=== Git ===");
cleanLocks(path.join(dst, ".git"));
const opt = { cwd: dst, encoding: "utf8", stdio: "pipe", timeout: 60000 };
try {
  execSync("git add -A", opt);
  const st = execSync("git status --short", opt);
  console.log(st);
  if (!st.trim()) { console.log("Nothing!"); process.exit(0); }
  execSync('git commit -m "feat: dynamic catalog filters + calculator sqm/pieces modes"', opt);
  const push = execSync("git push origin main 2>&1", opt);
  console.log("Push:", push, "\nDEPLOY STARTED!");
} catch (e) {
  console.log("Error:", e.stderr || e.stdout || e.message);
}
