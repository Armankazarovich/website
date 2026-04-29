/**
 * Shared z-index contract for app chrome, drawers, assistant surfaces and toasts.
 *
 * Keep these values as literal Tailwind classes so the scanner can include them.
 * Decorative page animations must stay below overlays and must not own navigation.
 */
export const UI_LAYERS = {
  content: "z-[5]",
  navRail: "z-30",
  header: "z-50",
  overlay: "z-[320]",
  assistant: "z-[300]",
  assistantBrowser: "z-[340]",
  toast: "z-[400]",
} as const;
