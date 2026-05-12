/* eslint-disable no-console */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const registryPath = path.join(root, "config", "aray-agent-registry.json");
const rawArgs = process.argv.slice(2);
const strict = rawArgs.includes("--strict");
const target = rawArgs.filter((arg) => arg !== "--strict").join(" ").trim();

function run(command, args) {
  const executable = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? "cmd.exe"
    : command;
  const finalArgs = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? ["/d", "/s", "/c", command, ...args]
    : args;
  return spawnSync(executable, finalArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
}

function printBlock(title, lines = []) {
  console.log(`\n[ARAY Preflight] ${title}`);
  for (const line of lines) console.log(`- ${line}`);
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function findArea(registry, query) {
  const q = normalize(query);
  if (!q) return null;
  return registry.controlledAreas.find((area) => {
    const fields = [
      area.id,
      area.label,
      area.ownerDepartmentId,
      area.ownerAgent,
      area.reviewerAgent,
      ...(area.paths || []),
    ].map(normalize);
    return fields.some((field) => field.includes(q));
  }) || null;
}

function findDepartment(registry, departmentId) {
  return registry.departments.find((department) => department.id === departmentId) || null;
}

function pathStatus(areaPath) {
  if (areaPath.includes("*")) return "pattern";
  return fs.existsSync(path.join(root, areaPath)) ? "exists" : "missing";
}

function summarizeGitStatus() {
  const result = run("git", ["status", "--short", "--branch"]);
  if (result.status !== 0) return [`git status failed: ${result.stderr || result.stdout}`];
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  const branch = lines[0] || "branch unknown";
  const changes = Math.max(lines.length - 1, 0);
  return [
    branch,
    `${changes} changed/untracked entries visible; do not revert unrelated work.`,
  ];
}

function summarizeDiffCheck() {
  const result = run("git", ["diff", "--check"]);
  if (result.status === 0) return ["diff whitespace check: passed"];
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  const firstLines = output.split(/\r?\n/).filter(Boolean).slice(0, 6);
  return [
    strict ? "diff whitespace check: failed" : "diff whitespace check: warning",
    ...firstLines,
  ];
}

function validateRegistry() {
  const result = run("node", ["scripts/validate-aray-agent-registry.js"]);
  if (result.status === 0) {
    const lastLine = result.stdout.trim().split(/\r?\n/).filter(Boolean).slice(-1)[0];
    return { ok: true, lines: [lastLine || "agent registry validation passed"] };
  }
  return {
    ok: false,
    lines: `${result.stdout || ""}${result.stderr || ""}`.trim().split(/\r?\n/).filter(Boolean).slice(0, 8),
  };
}

function riskySignals(registry, area) {
  const text = normalize([
    area.id,
    area.label,
    area.ownerDepartmentId,
    area.nextAction,
    ...(area.paths || []),
  ].join(" "));
  const rules = registry.globalEscalationRules || [];
  return rules.filter((rule) => {
    const token = normalize(rule).replace(/_/g, " ");
    if (rule === "money_or_payments") return /finance|payment|invoice|cash|money|pay/.test(text);
    if (rule === "personal_data") return /client|user|profile|crm|order|lead/.test(text);
    if (rule === "role_or_permission_change") return /role|permission|staff|access/.test(text);
    if (rule === "mass_notification_or_campaign") return /notification|email|campaign|promotion|push/.test(text);
    if (rule === "production_database_change") return /database|prisma|schema|migration/.test(text);
    if (rule === "data_deletion") return /delete|trash|clear|remove/.test(text);
    if (rule === "secret_or_key_exposure") return /secret|key|smtp|telegram|integration/.test(text);
    if (rule === "tenant_isolation_risk") return /tenant|api|database/.test(text);
    return text.includes(token);
  });
}

function printPlan(area, department, risks) {
  printBlock("Agency plan template", [
    `Section: ${area.id} - ${area.label}`,
    `Owner: ${department?.name || area.ownerDepartmentId} / ${area.ownerAgent}`,
    `Reviewer: ${area.reviewerAgent}`,
    `Risk: ${area.riskStatus}, quality score ${area.qualityScore}/100`,
    `Next action: ${area.nextAction}`,
    "Main Codex: critical path, architecture, integration and final acceptance.",
    "Agent Design/UX: mobile/tablet/desktop, design-system drift and touch ergonomics.",
    "Agent Engineering/API: contracts, roles, data, performance and safe limits.",
    "Agent QA/Logs: smoke scenarios, console/dev logs, regressions and checklist.",
    "High-speed 1.5x mode: read-only audit 4-7 min, small patch 8-15 min, complex slice 15-25 min.",
    risks.length > 0
      ? `Escalate before risky actions: ${risks.join(", ")}`
      : "No obvious global escalation signal from registry text.",
  ]);
}

function main() {
  console.log("[ARAY Preflight] Section dispatcher");
  console.log(`[ARAY Preflight] Target: ${target || "(not provided)"}`);
  console.log("[ARAY Preflight] Mode: read-only, high-speed 1.5x, no deploy/db/browser side effects");

  printBlock("Git state", summarizeGitStatus());
  printBlock("Diff hygiene", summarizeDiffCheck());

  const registryResult = validateRegistry();
  printBlock("Agent registry", registryResult.lines);
  if (!registryResult.ok && strict) process.exit(1);

  const registry = loadRegistry();
  const area = findArea(registry, target);
  if (!area) {
    const suggestions = registry.controlledAreas
      .slice(0, 10)
      .map((item) => `${item.id}: ${item.label}`);
    printBlock("No exact area match", [
      "Pass a controlled area id, label fragment or path fragment.",
      "Examples: npm run preflight:section -- orders-crm",
      "Examples: npm run preflight:section -- admin-shell",
      ...suggestions,
    ]);
    return;
  }

  const department = findDepartment(registry, area.ownerDepartmentId);
  printBlock("Controlled area", [
    `${area.id}: ${area.label}`,
    `Department: ${department?.name || area.ownerDepartmentId}`,
    `Owner agent: ${area.ownerAgent}`,
    `Reviewer agent: ${area.reviewerAgent}`,
    `Risk status: ${area.riskStatus}`,
    `Quality score: ${area.qualityScore}/100`,
  ]);

  printBlock(
    "Workset paths",
    area.paths.map((areaPath) => `${areaPath} [${pathStatus(areaPath)}]`),
  );

  const risks = riskySignals(registry, area);
  printPlan(area, department, risks);

  printBlock("Acceptance checklist", [
    "Architecture and section law are clear before edits.",
    "Desktop/tablet/mobile are smoke-checked after implementation.",
    "Logs are checked for the touched route/page.",
    "npm run quality passes after changes.",
    "Main Codex updates live checklist and reports accepted work to Arman.",
  ]);

  if (strict && summarizeDiffCheck()[0].includes("failed")) process.exit(1);
}

main();
