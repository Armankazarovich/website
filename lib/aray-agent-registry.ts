import registryData from "@/config/aray-agent-registry.json";

export type ArayRiskStatus = "green" | "yellow" | "red" | "blocked";

export type ArayAgent = {
  id: string;
  name: string;
  title: string;
  tier: number;
  primaryDepartmentId: string;
  reportsTo: string;
  maxAutonomyLevel: number;
  reportCadence: string;
  qualityScope: string[];
  responsibilities: string[];
  mustEscalate: string[];
};

export type ArayDepartment = {
  id: string;
  name: string;
  mission: string;
  ownerAgent: string;
  reviewerAgent: string;
  deputyAgent: string;
  scope: string[];
  qualityFocus: string[];
  outputs: string[];
  agents: string[];
};

export type ArayControlledArea = {
  id: string;
  label: string;
  paths: string[];
  ownerDepartmentId: string;
  ownerAgent: string;
  reviewerAgent: string;
  riskStatus: ArayRiskStatus;
  qualityScore: number;
  nextAction: string;
};

export type ArayAgentRegistry = {
  version: string;
  name: string;
  principle: string;
  riskStatuses: ArayRiskStatus[];
  qualityDimensions: string[];
  globalEscalationRules: string[];
  departments: ArayDepartment[];
  controlledAreas: ArayControlledArea[];
  agents: ArayAgent[];
};

export const arayAgentRegistry = registryData as ArayAgentRegistry;

export function getAgentById(id: string) {
  return arayAgentRegistry.agents.find((agent) => agent.id === id) || null;
}

export function getDepartmentById(id: string) {
  return arayAgentRegistry.departments.find((department) => department.id === id) || null;
}

export function getRiskStatusCounts(areas = arayAgentRegistry.controlledAreas) {
  return areas.reduce<Record<ArayRiskStatus, number>>(
    (acc, area) => {
      acc[area.riskStatus] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0, blocked: 0 },
  );
}

export function getAverageQualityScore(areas = arayAgentRegistry.controlledAreas) {
  if (areas.length === 0) return 0;
  const total = areas.reduce((sum, area) => sum + area.qualityScore, 0);
  return Math.round(total / areas.length);
}

export function getAgentRegistrySummary() {
  const statusCounts = getRiskStatusCounts();
  const deputyCount = arayAgentRegistry.agents.filter((agent) => agent.tier === 1).length;
  const workerCount = arayAgentRegistry.agents.filter((agent) => agent.tier >= 3).length;

  return {
    departments: arayAgentRegistry.departments.length,
    agents: arayAgentRegistry.agents.length,
    deputies: deputyCount,
    workers: workerCount,
    controlledAreas: arayAgentRegistry.controlledAreas.length,
    averageQualityScore: getAverageQualityScore(),
    statusCounts,
  };
}

export function getDepartmentHealth() {
  return arayAgentRegistry.departments.map((department) => {
    const areas = arayAgentRegistry.controlledAreas.filter(
      (area) => area.ownerDepartmentId === department.id,
    );
    const statusCounts = getRiskStatusCounts(areas);
    const averageQualityScore = getAverageQualityScore(areas);
    const owner = getAgentById(department.ownerAgent);
    const reviewer = getAgentById(department.reviewerAgent);

    return {
      department,
      owner,
      reviewer,
      areas,
      statusCounts,
      averageQualityScore,
    };
  });
}
