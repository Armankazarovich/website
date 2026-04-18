"use client";
import { useEffect, useState } from "react";

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Доброе утро", emoji: "☀️" };
  if (h >= 12 && h < 17) return { text: "Добрый день", emoji: "🌤" };
  if (h >= 17 && h < 22) return { text: "Добрый вечер", emoji: "🌙" };
  return { text: "Доброй ночи", emoji: "🌙" };
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
  roleColor: string;
}

export function DashboardGreeting({ userName, roleLabel, roleColor }: DashboardGreetingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Compute greeting/date only after mount to avoid server/client timezone mismatch (React #425)
  const greeting = mounted ? getGreeting() : { text: "Добро пожаловать", emoji: "" };
  const dateStr = mounted ? getDateString() : "";

  return (
    <div
      className="arayglass arayglass-shimmer relative rounded-2xl px-4 py-3.5 lg:p-5 transition-all duration-500"
      style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(8px)" }}
    >
      {/* Subtle gradient accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-lg font-bold leading-tight">
            {greeting.text}, {userName.split(" ")[0]}!
          </p>
          {dateStr && <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>}
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${roleColor}`}>
          {roleLabel}
        </span>
      </div>
    </div>
  );
}
