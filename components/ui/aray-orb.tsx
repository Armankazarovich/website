"use client";

import React from "react";

/**
 * ArayOrb — единый шар Арая для всего сайта (админка + клиент).
 * Оранжевая сфера с вращающимся кольцом-орбитой.
 *
 * @param size  — диаметр шара (px), по умолчанию 28
 * @param pulse — яркий режим (при загрузке / стриминге)
 * @param id    — уникальный prefix для SVG id (если несколько на странице)
 */
export function ArayOrb({
  size = 28,
  pulse = false,
  id = "ao",
}: {
  size?: number;
  pulse?: boolean;
  id?: string;
}) {
  const ringSize = Math.round(size * 1.55);
  const offset = Math.round((ringSize - size) / 2);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        display: "block",
      }}
    >
      {/* Вращающееся кольцо-орбита */}
      <svg
        width={ringSize}
        height={ringSize}
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          top: -offset,
          left: -offset,
          animation: "aray-ring-spin 5s linear infinite",
          opacity: pulse ? 0.95 : 0.65,
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id={`${id}-rg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffaa20" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ff6600" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke={`url(#${id}-rg)`}
          strokeWidth="4"
          strokeDasharray="55 220"
          strokeLinecap="round"
        />
      </svg>

      {/* Основной шар */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          display: "block",
          filter: pulse
            ? "drop-shadow(0 0 10px rgba(240,120,0,0.75)) drop-shadow(0 0 4px rgba(255,180,0,0.5))"
            : "drop-shadow(0 0 5px rgba(240,110,0,0.45))",
        }}
      >
        <defs>
          <radialGradient id={`${id}-base`} cx="34%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#fffbe0" />
            <stop offset="10%" stopColor="#ffca40" />
            <stop offset="28%" stopColor="#f07800" />
            <stop offset="52%" stopColor="#c05000" />
            <stop offset="75%" stopColor="#6e1c00" />
            <stop offset="100%" stopColor="#160300" />
          </radialGradient>
          <radialGradient id={`${id}-dark`} cx="72%" cy="74%" r="52%">
            <stop offset="0%" stopColor="#050000" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#050000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-hl`} cx="30%" cy="25%" r="34%">
            <stop offset="0%" stopColor="white" stopOpacity="0.90" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="76%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.55" />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`} />
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-dark)`} />
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-rim)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="50" rx="28" ry="10" fill="white" opacity="0.14">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="9s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`} />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(255,200,60,0.25)"
          strokeWidth="1.5"
        >
          <animate
            attributeName="stroke-opacity"
            values="0.25;0.60;0.25"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
