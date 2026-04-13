const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const src = "D:/ПилоРус/website";
const dst = "D:/pilorus/website";

// Files edited via Cowork that need sync TO pilorus
const coworkFiles = [
  "components/admin/admin-search.tsx",
  "components/admin/admin-lang-picker.tsx",
  "components/admin/admin-dashboard-widgets.tsx",
];

console.log("=== STEP 1: Sync Cowork edits to pilorus ===");
for (const f of coworkFiles) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  try {
    if (fs.existsSync(s)) {
      fs.copyFileSync(s, d);
      console.log("Synced:", f);
    } else {
      console.log("Not found:", f);
    }
  } catch (e) {
    console.log("Error:", f, e.message);
  }
}

console.log("\n=== STEP 2: Git add all changed files ===");
const cwd = dst;
try {
  const status = execSync("git status --short", { cwd, encoding: "utf8" });
  console.log("Changed files:\n" + status);

  execSync("git add -A", { cwd, encoding: "utf8" });
  console.log("All files staged.");

  const msg = "fix: comprehensive light theme - CRM, finance, modals, status badges, inventory, popups, search, shell settings";
  execSync(`git commit -m "${msg}"`, { cwd, encoding: "utf8" });
  console.log("Committed!");

  console.log("\n=== STEP 3: Push to origin ===");
  const pushOut = execSync("git push origin main 2>&1", { cwd, encoding: "utf8", timeout: 60000 });
  console.log("Push:", pushOut);
} catch (e) {
  console.log("Git error:", e.stdout || e.stderr || e.message);
}

// Now sync back from pilorus to ПилоРус (agent edits)
console.log("\n=== STEP 4: Sync agent edits back to ПилоРус ===");
const agentFiles = [
  "app/admin/crm/crm-client.tsx",
  "app/admin/finance/page.tsx",
  "app/admin/inventory/inventory-client.tsx",
  "app/globals.css",
  "components/admin/admin-ambient-sound.tsx",
  "components/admin/admin-bg-picker.tsx",
  "components/admin/admin-day-planner.tsx",
  "components/admin/admin-shell.tsx",
  "components/admin/order-status-select.tsx",
  "lib/utils.ts",
];
for (const f of agentFiles) {
  const s = path.join(dst, f);
  const d = path.join(src, f);
  try {
    fs.copyFileSync(s, d);
    console.log("Synced back:", f);
  } catch (e) {
    console.log("Error:", f, e.message);
  }
}
console.log("\nDone!");
