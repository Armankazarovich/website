const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

// Remove git lock files
const locks = [
  "D:/pilorus/website/.git/index.lock",
  "D:/ПилоРус/website/.git/index.lock",
];
for (const lock of locks) {
  try { fs.unlinkSync(lock); console.log("Deleted:", lock); }
  catch (e) { console.log("No lock:", lock); }
}

// Sync changed files from D:/ПилоРус/website to D:/pilorus/website
const src = "D:/ПилоРус/website";
const dst = "D:/pilorus/website";
const files = [
  "app/globals.css",
  "app/admin/page.tsx",
  "components/admin/info-popup.tsx",
];

for (const f of files) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  try {
    fs.copyFileSync(s, d);
    console.log("Synced:", f);
  } catch (e) {
    console.log("Sync error:", f, e.message);
  }
}

// Git operations in D:/pilorus/website
const cwd = dst;
try {
  for (const f of files) {
    execSync(`git add "${f}"`, { cwd, encoding: "utf8" });
    console.log("Staged:", f);
  }
  const msg = "fix: orb animation conflict, mobile quick-actions grid, info-popup light theme text";
  execSync(`git commit -m "${msg}"`, { cwd, encoding: "utf8" });
  console.log("Committed!");
  const pushOut = execSync("git push origin main 2>&1", { cwd, encoding: "utf8", timeout: 30000 });
  console.log("Push:", pushOut);
} catch (e) {
  console.log("Git error:", e.stdout || e.stderr || e.message);
}
