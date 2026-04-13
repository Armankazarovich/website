const fs = require("fs");
const { execSync } = require("child_process");

const files = [
  "components/store/aray-widget.tsx",
  "components/admin/admin-aray.tsx",
];

const src = "D:/ПилоРус/website/";
const dst = "D:/pilorus/website/";

files.forEach(f => {
  fs.copyFileSync(src + f, dst + f);
  console.log("synced:", f);
});

// Git operations
const git = '"C:\\Program Files\\Git\\cmd\\git.exe"';
process.chdir(dst);

try {
  console.log(execSync(`${git} add ${files.join(" ")}`, { encoding: "utf8" }));
  console.log(execSync(`${git} status --short`, { encoding: "utf8" }));
  console.log(execSync(`${git} commit -m "fix: rewrite store TTS/STT to match admin pattern, tune voice params"`, { encoding: "utf8" }));
  console.log(execSync(`${git} push origin main`, { encoding: "utf8", timeout: 30000 }));
  console.log("DEPLOYED OK");
} catch (e) {
  console.error("GIT ERROR:", e.message);
  if (e.stdout) console.log("stdout:", e.stdout);
  if (e.stderr) console.log("stderr:", e.stderr);
}
