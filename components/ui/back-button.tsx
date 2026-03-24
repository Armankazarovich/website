"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BackButtonProps {
  href: string;
  label: string;
  className?: string;
}

export function BackButton({ href, label, className }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl
        text-muted-foreground hover:text-foreground border border-border/40
        hover:bg-muted transition-all shrink-0 ${className ?? "mb-3"}`}
    >
      <ArrowLeft className="w-4 h-4" />
    </Link>
  );
}
