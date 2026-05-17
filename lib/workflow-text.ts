const VISIBLE_EMOJI_PATTERN = /[\u{1f1e6}-\u{1faff}\u{2600}-\u{27bf}\u{2b00}-\u{2bff}\ufe0f]/gu;

export function cleanWorkflowDisplayText(value: string | null | undefined) {
  return (value || "")
    .replace(VISIBLE_EMOJI_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[\u2014\u2013-]\s*/, "")
    .trim();
}

export function sanitizeWorkflowForDisplay<T extends { name?: string | null; description?: string | null }>(
  workflow: T,
): T {
  return {
    ...workflow,
    name: cleanWorkflowDisplayText(workflow.name),
    description: workflow.description ? cleanWorkflowDisplayText(workflow.description) : workflow.description,
  };
}
