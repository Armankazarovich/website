"use client";

import React from "react";

/**
 * ArayOrb — единый живой шар Арая для всего сайта (админка + клиент).
 * Живая оранжевая сфера с анимацией огня внутри + вращающееся кольцо-орбита.
 *
 * @param size  — диаметр шара (px), по умолчанию 28
 * @param pulse — яркий режим: glow-фильтр + яркое кольцо (при загрузке / стриминге)
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
      {/* ── Вращающееся кольцо-орбита ── */}
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
          cx="50" cy="50" r="43" fill="none"
          stroke={`url(#${id}-rg)`}
          strokeWidth="4"
          strokeDasharray="55 220"
          strokeLinecap="round"
        />
      </svg>

      {/* ── Живой шар с анимацией огня ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Glow-фильтр (оранжевый ореол) */}
          <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="2 0.8 0 0 0  0.6 0.2 0 0 0  0 0 0 0 0  0 0 0 0.9 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Базовый градиент сферы — анимация цвета */}
          <radialGradient id={`${id}-base`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#fff8d0" />
            <stop offset="18%" stopColor="#fbbf24">
              <animate
                attributeName="stopColor"
                values="#fbbf24;#f97316;#fde047;#fbbf24"
                dur="5s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#e8700a">
              <animate
                attributeName="stopColor"
                values="#e8700a;#c2410c;#f97316;#e8700a"
                dur="7s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="82%" stopColor="#7c2d12" />
            <stop offset="100%" stopColor="#1a0500" />
          </radialGradient>

          {/* Вращающийся внутренний жар */}
          <radialGradient id={`${id}-hot`} cx="50%" cy="22%" r="48%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75">
              <animate
                attributeName="stopOpacity"
                values="0.75;1;0.5;0.75"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>

          {/* Зеркальный блик */}
          <radialGradient id={`${id}-hl`} cx="30%" cy="24%" r="40%">
            <stop offset="0%" stopColor="white" stopOpacity="0.88" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Клип для анимации внутри шара */}
          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        {/* Базовая сфера */}
        <circle
          cx="50" cy="50" r="46"
          fill={`url(#${id}-base)`}
          filter={pulse ? `url(#${id}-glow)` : undefined}
        />

        {/* Вращающиеся внутренние огни — clipped */}
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="28" rx="36" ry="22" fill={`url(#${id}-hot)`}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="6s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx="50" cy="72" rx="26" ry="15" fill="#fb923c" opacity="0.18">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="180 50 50"
              to="-180 50 50"
              dur="9s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.18;0.28;0.1;0.18"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* Блик (поверх всего) */}
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`} />
      </svg>
    </div>
  );
}
