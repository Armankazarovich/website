/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const registryPath = path.join(root, "config", "aray-agent-registry.json");

function fail(message) {
  console.error(`[ARAY Agent Registry] ${message}`);
  process.exitCode = 1;
}

function uniqueBy(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item[key];
    if (!value || typeof value !== "string") {
      fail(`${label} has missing ${key}`);
      continue;
    }
    if (seen.has(value)) fail(`${label} id duplicated: ${value}`);
    seen.add(value);
  }
  return seen;
}

function assertArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
    return [];
  }
  return value;
}

function validate() {
  console.log("\n[ARAY] Agent registry validation");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  const departments = assertArray(registry.departments, "departments");
  const agents = assertArray(registry.agents, "agents");
  const areas = assertArray(registry.controlledAreas, "controlledAreas");
  const qualityDimensions = new Set(assertArray(registry.qualityDimensions, "qualityDimensions"));
  const riskStatuses = new Set(assertArray(registry.riskStatuses, "riskStatuses"));

  const departmentIds = uniqueBy(departments, "id", "department");
  const agentIds = uniqueBy(agents, "id", "agent");
  uniqueBy(areas, "id", "controlledArea");

  for (const department of departments) {
    for (const field of ["ownerAgent", "reviewerAgent", "deputyAgent"]) {
      if (!agentIds.has(department[field])) {
        fail(`department ${department.id} references missing ${field}: ${department[field]}`);
      }
    }
    for (const field of ["scope", "qualityFocus", "outputs", "agents"]) {
      assertArray(department[field], `department ${department.id}.${field}`);
    }
    for (const dimension of department.qualityFocus || []) {
      if (!qualityDimensions.has(dimension)) {
        fail(`department ${department.id} uses unknown quality dimension: ${dimension}`);
      }
    }
    for (const agentId of department.agents || []) {
      if (!agentIds.has(agentId)) {
        fail(`department ${department.id} lists missing agent: ${agentId}`);
      }
    }
  }

  for (const agent of agents) {
    if (!departmentIds.has(agent.primaryDepartmentId)) {
      fail(`agent ${agent.id} has missing primaryDepartmentId: ${agent.primaryDepartmentId}`);
    }
    if (agent.reportsTo !== "human-board" && !agentIds.has(agent.reportsTo)) {
      fail(`agent ${agent.id} reports to missing agent: ${agent.reportsTo}`);
    }
    if (agent.reportsTo === agent.id) {
      fail(`agent ${agent.id} reports to itself`);
    }
    if (!Number.isInteger(agent.tier) || agent.tier < 0 || agent.tier > 4) {
      fail(`agent ${agent.id} has invalid tier: ${agent.tier}`);
    }
    if (!Number.isInteger(agent.maxAutonomyLevel) || agent.maxAutonomyLevel < 0 || agent.maxAutonomyLevel > 4) {
      fail(`agent ${agent.id} has invalid maxAutonomyLevel: ${agent.maxAutonomyLevel}`);
    }
    for (const field of ["qualityScope", "responsibilities", "mustEscalate"]) {
      assertArray(agent[field], `agent ${agent.id}.${field}`);
    }
    for (const dimension of agent.qualityScope || []) {
      if (!qualityDimensions.has(dimension)) {
        fail(`agent ${agent.id} uses unknown quality dimension: ${dimension}`);
      }
    }
  }

  for (const area of areas) {
    if (!departmentIds.has(area.ownerDepartmentId)) {
      fail(`controlledArea ${area.id} has missing ownerDepartmentId: ${area.ownerDepartmentId}`);
    }
    if (!agentIds.has(area.ownerAgent)) {
      fail(`controlledArea ${area.id} has missing ownerAgent: ${area.ownerAgent}`);
    }
    if (!agentIds.has(area.reviewerAgent)) {
      fail(`controlledArea ${area.id} has missing reviewerAgent: ${area.reviewerAgent}`);
    }
    if (!riskStatuses.has(area.riskStatus)) {
      fail(`controlledArea ${area.id} has invalid riskStatus: ${area.riskStatus}`);
    }
    if (typeof area.qualityScore !== "number" || area.qualityScore < 0 || area.qualityScore > 100) {
      fail(`controlledArea ${area.id} has invalid qualityScore: ${area.qualityScore}`);
    }
    assertArray(area.paths, `controlledArea ${area.id}.paths`);
    if (!area.nextAction || typeof area.nextAction !== "string") {
      fail(`controlledArea ${area.id} must have nextAction`);
    }
  }

  const areasWithoutDepartment = departments.filter(
    (department) => !areas.some((area) => area.ownerDepartmentId === department.id),
  );
  for (const department of areasWithoutDepartment) {
    fail(`department ${department.id} has no controlled areas`);
  }

  if (process.exitCode) process.exit(process.exitCode);

  console.log(
    `[ARAY] Agent registry passed: ${departments.length} departments, ${agents.length} agents, ${areas.length} controlled areas`,
  );
}

validate();
