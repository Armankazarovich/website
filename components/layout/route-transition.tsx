"use client";

import type { ReactNode } from "react";
import type { RouteMotionSurface } from "@/lib/route-motion";

type RouteTransitionProps = {
  children: ReactNode;
  surface: RouteMotionSurface;
  className?: string;
};

export function RouteTransition({
  children,
  surface: _surface,
  className: _className,
}: RouteTransitionProps) {
  return <>{children}</>;
}
