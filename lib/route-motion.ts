export type RouteMotionSurface = "admin" | "auth" | "store" | "cabinet";

export type RouteMotionPolicy = {
  durationMs: number;
  x: number;
  y: number;
  scale: number;
};

const ROUTE_MOTION: Record<RouteMotionSurface, RouteMotionPolicy> = {
  admin: {
    durationMs: 0,
    x: 0,
    y: 0,
    scale: 1,
  },
  auth: {
    durationMs: 0,
    x: 0,
    y: 0,
    scale: 1,
  },
  store: {
    durationMs: 0,
    x: 0,
    y: 0,
    scale: 1,
  },
  cabinet: {
    durationMs: 0,
    x: 0,
    y: 0,
    scale: 1,
  },
};

export function getRouteMotionPolicy(surface: RouteMotionSurface) {
  return ROUTE_MOTION[surface];
}
