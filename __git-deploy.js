const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dst = "/sessions/affectionate-wizardly-turing/mnt/website";
const files = [
  "components/admin/admin-shell.tsx",
  "components/store/mobile-bottom-nav.tsx",
  "components/admin/admin-mobile-bottom-nav.tsx",
  "components/store/aray-widget.tsx",
];

const shell = fs.readFileSync(path.join(dst, files[0]), "utf8");
const mobNav = fs.readFileSync(path.join(dst, files[1]), "utf8");
const admNav = fs.readFileSync(path.join(dst, files[2]), "utf8");
const aray = fs.readFileSync(path.join(dst, files[3]), "utf8");

console.log("Verification:");
console.log("  Shell sidebarHex:", shell.includes("sidebarHex"));
console.log("  Shell sidebarBg:", shell.includes("background: sidebarBg"));
console.log("  MobNav orb in nav:", mobNav.includes('marginTop: "-18px"'));
console.log("  AdmNav orb in nav:", admNav.includes("top: -14"));
console.log("  Aray no motion.button:", !aray.includes("motion.button"));
console.log("  Aray hover scale:", aray.includes("hover:scale-[1.08]"));

const opt = { cwd: dst, encoding: "utf8", stdio: "pipe" };
try {
  execSync("git add " + files.join(" "), opt);
  var status = execSync("git status --short", opt);
  console.log("\nGit status:\n" + status);
  if (!status.trim()) { console.log("Nothing to commit"); process.exit(0); }
  var msg = "fix: mobile sidebar dark bg in light theme + orb position restored + remove motion.button from float";
  var out = execSync('git commit -m "' + msg + '"', opt);
  console.log(out);
  execSync("git push origin main", { ...opt, timeout: 25000 });
  console.log("Pushed!");
} catch (e) {
  console.error("Git error:", e.message);
  if (e.stdout) console.log(e.stdout);
  if (e.stderr) console.log(e.stderr);
}
