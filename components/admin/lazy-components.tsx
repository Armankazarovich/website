import dynamic from "next/dynamic";

// ── Lazy-loaded heavy admin components ──────────────────────────────────────
// These components are code-split and only loaded when actually needed.
// This reduces the initial JS bundle for the admin panel significantly.

export const LazyAdminAray = dynamic(
  () => import("@/components/admin/admin-aray").then(m => ({ default: m.AdminAray })),
  { loading: () => null, ssr: false }
);

export const LazyAdminVideoBg = dynamic(
  () => import("@/components/admin/admin-video-bg").then(m => ({ default: m.AdminVideoBg })),
  { loading: () => null, ssr: false }
);

export const LazyNeuralBg = dynamic(
  () => import("@/components/admin/neural-bg").then(m => ({ default: m.NeuralBg })),
  { loading: () => null, ssr: false }
);

export const LazyCursorGlow = dynamic(
  () => import("@/components/admin/cursor-glow").then(m => ({ default: m.CursorGlow })),
  { loading: () => null, ssr: false }
);

export const LazyAdminTour = dynamic(
  () => import("@/components/admin/admin-tour").then(m => ({ default: m.AdminTour })),
  { loading: () => null, ssr: false }
);

export const LazyAdminPageHelp = dynamic(
  () => import("@/components/admin/admin-page-help").then(m => ({ default: m.AdminPageHelp })),
  { loading: () => null, ssr: false }
);
