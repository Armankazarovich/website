"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "MANAGER", "SELLER"];

interface AdminEditButtonProps {
  /** Путь в админке: "/admin/products/abc123" */
  href: string;
  /** Позиционирование: overlay (поверх карточки при hover) | inline (обычная кнопка) */
  mode?: "overlay" | "inline";
  label?: string;
  className?: string;
}

/**
 * Кнопка "Редактировать" — видна только администраторам.
 * mode="overlay" — абсолютно позиционирована, появляется при hover на родительском group.
 * mode="inline"  — обычная кнопка, вставляется в поток.
 */
export function AdminEditButton({
  href,
  mode = "overlay",
  label = "Редактировать",
  className,
}: AdminEditButtonProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;

  if (!role || !ADMIN_ROLES.includes(role)) return null;

  if (mode === "overlay") {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={label}
        className={cn(
          "absolute top-2 right-2 z-20",
          "flex items-center gap-1 px-2 py-1 rounded-lg",
          "bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium",
          "hover:bg-primary transition-all duration-150 shadow-md",
          "opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0",
          className
        )}
      >
        <Pencil className="w-3 h-3 shrink-0" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  }

  // inline mode
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
        "bg-primary/10 text-primary border border-primary/20 text-xs font-medium",
        "hover:bg-primary hover:text-white transition-all duration-150",
        className
      )}
    >
      <Pencil className="w-3 h-3 shrink-0" />
      {label}
    </Link>
  );
}
