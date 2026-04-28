"use client";

/**
 * DashboardGreeting — приветствие на главной админки.
 *
 * Сессия 40 (28.04.2026): полная переписка под calm UI магазина.
 * Удалено:
 *  - aray-stat-card (старый ARAYGLASS)
 *  - emoji в приветствии (стоп-лист DESIGN_SYSTEM п.10)
 *  - role-badge (дублирует AppHeader, не несёт UX-ценности на дашборде)
 *
 * Добавлено:
 *  - bg-card border-border rounded-2xl
 *  - font-display заголовок, primary акцент на имени
 *  - subtitle с ролью + датой одним блоком, чище визуал
 *  - subtle gradient сверху (без resignation)
 */
import { useEffect, useState } from "react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 17) return "Добрый день";
  if (h >= 17 && h < 22) return "Добрый вечер";
  return "Доброй ночи";
}

function getDateString(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface DashboardGreetingProps {
  userName: string;
  roleLabel: string;
  /** roleColor сохранён для совместимости, но не используется (badge убран). */
  roleColor?: string;
}

export function DashboardGreeting({ userName, roleLabel }: DashboardGreetingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute greeting/date only after mount to avoid SSR mismatch.
  const greeting = mounted ? getGreeting() : "Добро пожаловать";
  const dateStr = mounted ? getDateString() : "";
  const firstName = userName.split(" ")[0];

  return (
    <div
      className="relative overflow-hidden bg-card border border-border rounded-2xl px-5 py-5 sm:px-6 sm:py-6 transition-all duration-500"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
      }}
    >
      {/* Тонкое свечение primary (декорация) */}
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative flex flex-col gap-1.5">
        <p className="font-display font-bold text-xl sm:text-2xl leading-tight text-foreground">
          {greeting},{" "}
          <span className="text-primary">{firstName}</span>
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
          {roleLabel}
          {dateStr && (
            <>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="capitalize">{dateStr}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
