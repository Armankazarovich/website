/* eslint-disable no-console */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const allowDirty = process.argv.includes("--allow-dirty");

function run(label, command, args) {
  console.log(`\n[ARAY Deploy Preflight] ${label}`);
  const executable = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? "cmd.exe"
    : command;
  const finalArgs = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? ["/d", "/s", "/c", command, ...args]
    : args;
  const result = spawnSync(executable, finalArgs, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "");
    process.exit(result.status || 1);
  }
  return result.stdout.trim();
}

const status = capture("git", ["status", "--porcelain"]);
if (status && !allowDirty) {
  console.error("\n[ARAY Deploy Preflight] Blocked: there are uncommitted changes.");
  console.error("Commit the tested release first, then run deploy. This prevents pushing an older build by accident.");
  console.error("Changed files:");
  for (const line of status.split(/\r?\n/).slice(0, 40)) console.error(` - ${line}`);
  if (status.split(/\r?\n/).length > 40) console.error(" - ...");
  process.exit(1);
}

run("Full local quality gate", "npm", ["run", "quality:full"]);
run("Browser cart flow guard", "npm", ["run", "browser:cart:check"]);
run("Browser mobile store guard", "npm", ["run", "browser:mobile:check"]);
run("Browser stories responsive guard", "npm", ["run", "browser:stories:check"]);
run("Browser stories preview recovery guard", "npm", ["run", "browser:stories:recovery:check"]);

console.log("\n[ARAY Deploy Preflight] Passed");
