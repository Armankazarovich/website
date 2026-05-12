"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Palette } from "lucide-react";
import { ARAY_FOCUS_RING } from "@/lib/aray-design-tokens";

const APPEARANCE_RETURN_KEY = "aray:appearance:return-to";

export function ArayControlCenter({
  userRole,
  position = "header",
}: {
  userRole?: string;
  position?: "header" | "bottom" | "right";
}) {
  const pathname = usePathname();
  const router = useRouter();
  if (position === "bottom") return null;

  const href = userRole === "USER" ? "/cabinet/appearance" : "/admin/appearance";
  const isAppearancePage = pathname === href;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;

    if (!isAppearancePage) {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentPath !== href) {
        window.sessionStorage.setItem(APPEARANCE_RETURN_KEY, currentPath);
      }
      return;
    }

    event.preventDefault();
    const saved = window.sessionStorage.getItem(APPEARANCE_RETURN_KEY);
    const fallback = userRole === "USER" ? "/cabinet" : "/admin";
    const canReturn = saved && saved.startsWith("/") && saved !== href && !saved.startsWith(`${href}?`);
    router.push(canReturn ? saved : fallback);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label={isAppearancePage ? "Вернуться из оформления" : "Оформление"}
      title={isAppearancePage ? "Вернуться назад" : "Оформление"}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${ARAY_FOCUS_RING} ${
        isAppearancePage
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Palette className="h-[18px] w-[18px]" strokeWidth={1.75} />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
    </Link>
  );
}
