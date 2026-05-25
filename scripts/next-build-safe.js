#!/usr/bin/env node
/* eslint-disable no-console */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const commandIndex = args.indexOf("--command");
const buildScript = commandIndex >= 0 ? args[commandIndex + 1] : "build:ci:raw";
const shouldRestart = !args.includes("--no-restart") && !process.env.CI;

function npmInvocation(commandArgs) {
  if (process.platform !== "win32") {
    return { command: "npm", args: commandArgs };
  }

  return { command: "cmd.exe", args: ["/d", "/s", "/c", "npm", ...commandArgs] };
}

function runPowerShell(script) {
  if (process.platform !== "win32") return "";

  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ${script}`,
    ],
    {
      cwd: root,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    if (message) console.warn(`[ARAY safe build] PowerShell warning: ${message}`);
  }

  return (result.stdout || "").trim();
}

function localNextProcesses() {
  if (process.platform !== "win32") return [];

  const output = runPowerShell(`
    $items = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Select-Object ProcessId, CommandLine)
    if ($items.Count -eq 0) { '[]' } else { $items | ConvertTo-Json -Compress -Depth 3 }
  `);

  if (!output) return [];

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }

  const processes = Array.isArray(parsed) ? parsed : [parsed];
  const normalizedRoot = root.replace(/\//g, "\\").toLowerCase();

  return processes
    .map((processInfo) => ({
      pid: Number(processInfo.ProcessId),
      commandLine: String(processInfo.CommandLine || ""),
    }))
    .filter((processInfo) => {
      const normalizedCommand = processInfo.commandLine.replace(/\//g, "\\").toLowerCase();
      const isThisProject = normalizedCommand.includes(normalizedRoot);
      const isNextRuntime =
        /next\\dist\\bin\\next/i.test(normalizedCommand) ||
        /next\\dist\\server\\lib\\start-server\.js/i.test(normalizedCommand) ||
        /scripts\\next-dev-stable\.js/i.test(normalizedCommand);
      return processInfo.pid && isThisProject && isNextRuntime;
    })
    .map((processInfo) => ({
      ...processInfo,
      mode: /\bdev\b/i.test(processInfo.commandLine) ? "dev" : "start",
      port: parsePort(processInfo.commandLine),
    }));
}

function parsePort(commandLine) {
  const match =
    commandLine.match(/(?:^|\s)(?:-p|--port)\s+(\d{2,5})(?:\s|$)/i) ||
    commandLine.match(/(?:^|\s)(?:-p|--port)=(\d{2,5})(?:\s|$)/i);
  return match ? Number(match[1]) : 3000;
}

function stopLocalNextProcesses() {
  const processes = localNextProcesses();
  if (processes.length === 0) {
    console.log("[ARAY safe build] No local Next server from this project is holding Prisma files.");
    return [];
  }

  console.log("[ARAY safe build] Releasing local Next server before Prisma/Next build:");
  for (const processInfo of processes) {
    console.log(
      ` - PID ${processInfo.pid}: next ${processInfo.mode} on port ${processInfo.port}`,
    );
    runPowerShell(`Stop-Process -Id ${processInfo.pid} -Force -ErrorAction SilentlyContinue`);
  }

  return processes;
}

function runBuild() {
  const npm = npmInvocation(["run", buildScript]);
  console.log(`[ARAY safe build] Running npm run ${buildScript}`);
  const result = spawnSync(npm.command, npm.args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error) {
    console.error(`[ARAY safe build] Failed to start npm: ${result.error.message}`);
    return { status: 1 };
  }
  return result;
}

function restartStoppedServers(stoppedProcesses) {
  if (!shouldRestart || stoppedProcesses.length === 0) return;

  const seen = new Set();
  for (const processInfo of stoppedProcesses) {
    const key = `${processInfo.mode}:${processInfo.port}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const logPrefix = `.next-${processInfo.mode}-${processInfo.port}.safe`;
    const out = fs.openSync(path.join(root, `${logPrefix}.log`), "a");
    const err = fs.openSync(path.join(root, `${logPrefix}.err.log`), "a");
    const npm = npmInvocation(["run", processInfo.mode, "--", "-p", String(processInfo.port)]);
    const child = spawn(npm.command, npm.args, {
      cwd: root,
      detached: true,
      stdio: ["ignore", out, err],
      shell: false,
      windowsHide: true,
    });
    child.unref();
    console.log(
      `[ARAY safe build] Restarted npm run ${processInfo.mode} -- -p ${processInfo.port}`,
    );
  }
}

if (!buildScript || buildScript === "build" || buildScript === "build:ci") {
  console.error("[ARAY safe build] Refusing recursive build script. Use --command build:raw or build:ci:raw.");
  process.exit(1);
}

const stoppedProcesses = stopLocalNextProcesses();
const result = runBuild();
restartStoppedServers(stoppedProcesses);

process.exit(typeof result.status === "number" ? result.status : 1);
