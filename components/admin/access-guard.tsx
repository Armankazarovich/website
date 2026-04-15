"use client";

import { usePathname } from "next/navigation";
import { canAccess, pathToSection } from "@/lib/permissions";
import { ShieldOff } from "lucide-react";

interface AccessGuardProps {
  role: string;
  children: React.ReactNode;
}

/**
 * Client-side access guard.
 * Wraps page content and checks if the current role can access the current path.
 * Shows "Access Denied" if not allowed.
 *
 * Usage in admin-shell.tsx:
 * <AccessGuard role={role}>{children}</AccessGuard>
 */
export function AccessGuard({ role, children }: AccessGuardProps) {
  const pathname = usePathname();
  const section = pathToSection(pathname);

  // If we can't map the path to a section, allow (unknown routes)
  if (!section) return <>{children}</>;

  // Check access
  if (!canAccess(role, section)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="font-display font-bold text-xl mb-2">Нет доступа</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          У вашей роли нет прав на просмотр этого раздела. Обратитесь к администратору для получения доступа.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
