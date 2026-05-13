"use client";

import type { CSSProperties, ReactNode } from "react";
import { getRouteMotionPolicy, type RouteMotionSurface } from "@/lib/route-motion";

type RouteTransitionProps = {
  children: ReactNode;
  surface: RouteMotionSurface;
  className?: string;
};

export function RouteTransition({
  children,
  surface,
  className,
}: RouteTransitionProps) {
  const policy = getRouteMotionPolicy(surface);
  const shellClassName = [className, "route-transition-shell"].filter(Boolean).join(" ");
  const style = {
    "--route-motion-duration": `${policy.durationMs}ms`,
    "--route-motion-x": `${policy.x}px`,
    "--route-motion-y": `${policy.y}px`,
    "--route-motion-scale": String(policy.scale),
  } as CSSProperties;

  return (
    <div className={shellClassName} data-route-transition="enter" style={style}>
      {children}
    </div>
  );
}
