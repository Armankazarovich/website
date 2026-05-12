"use client";

import type { CSSProperties } from "react";

/**
 * ArayOrb is the shared visual identity for ARAY.
 * It reads as a warm core inside a living neural globe: calm at rest,
 * brighter while listening, warmer while speaking, and faster while thinking.
 */

interface ArayOrbProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  animate?: boolean;
  className?: string;
  intensity?: "subtle" | "normal" | "vivid";
  badge?: boolean;
  badgeCount?: number;
  pulse?: "idle" | "listening" | "speaking" | "thinking" | "none";
  id?: string;
}

type ArayIconProps = {
  className?: string;
  id?: string;
  size?: number | string;
  strokeWidth?: number;
};

const sizeMap: Record<string, number> = {
  sm: 40,
  md: 52,
  lg: 72,
  xl: 96,
};

export function ArayOrb({
  size = "md",
  animate = true,
  className = "",
  intensity = "normal",
  badge = false,
  badgeCount,
  pulse = "idle",
  id: _id,
}: ArayOrbProps) {
  const pixelSize = typeof size === "number" ? size : (sizeMap[size] || 52);
  const isListening = pulse === "listening";
  const isSpeaking = pulse === "speaking";
  const isThinking = pulse === "thinking";
  const isStateDriven = isListening || isSpeaking || isThinking;
  const isCompact = pixelSize < 48;
  const isSmall = pixelSize < 72;
  const isActive = animate && pulse !== "none";
  const opMult = intensity === "subtle" ? 0.72 : intensity === "vivid" ? 1.24 : 1;
  const accent = isListening ? "56 189 248" : isSpeaking ? "245 158 11" : isThinking ? "34 211 238" : "20 184 166";
  const warm = "245 158 11";
  const cool = isListening ? "125 211 252" : "45 212 191";
  const label = isListening ? "ARAY слушает" : isSpeaking ? "ARAY говорит" : isThinking ? "ARAY думает" : "ARAY";
  const haloAlpha = Math.min(0.4, 0.2 * opMult);
  const glowAlpha = Math.min(0.36, 0.22 * opMult);
  const stateClass = isListening ? "is-listening" : isSpeaking ? "is-speaking" : isThinking ? "is-thinking" : "";

  return (
    <div
      className={`aray-orb-root relative inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={label}
      style={
        {
          width: pixelSize,
          height: pixelSize,
          "--aray-size": `${pixelSize}px`,
          "--aray-accent": accent,
          "--aray-warm": warm,
          "--aray-cool": cool,
          "--aray-halo-alpha": haloAlpha,
          "--aray-glow-alpha": glowAlpha,
          "--aray-halo-blur": `${pixelSize * 0.12}px`,
          "--aray-inner-glow": `${pixelSize * 0.16}px`,
          "--aray-shadow-y": `${pixelSize * -0.1}px`,
          "--aray-shadow-blur": `${pixelSize * 0.22}px`,
          "--aray-outer-glow": `${pixelSize * 0.18}px`,
          "--aray-core-blur": `${Math.max(0.8, pixelSize * 0.01)}px`,
          "--aray-panel-depth": "7 24 48",
          "--aray-panel-depth-soft": "16 49 78",
          "--aray-network-opacity": isCompact ? 0.78 : isSmall ? 0.86 : 0.92,
          "--aray-signature-opacity": isCompact ? 1 : isSmall ? 0.95 : 0.86,
          "--aray-signature-stroke": isCompact ? 2.45 : isSmall ? 2.05 : 1.7,
          "--aray-word-opacity": isCompact ? 0 : isSmall ? 0.22 : 0.58,
          "--aray-word-size": isSmall ? "6.4px" : "7.8px",
          "--aray-ring-alpha": isCompact ? 0.56 : 0.42,
          "--aray-shell-border-alpha": isCompact ? 0.44 : 0.68,
          "--aray-shell-hover-border-alpha": isCompact ? 0.52 : 0.76,
          "--aray-rim-white-alpha": isCompact ? 0.08 : 0.14,
          "--aray-rim-accent-alpha": isCompact ? 0.18 : 0.3,
          "--aray-rim-glow-alpha": isCompact ? 0.18 : 0.34,
          "--aray-rim-outer-alpha": isCompact ? 0.16 : 0.28,
          "--aray-rim-glint-opacity": isCompact ? 0.58 : 0.96,
          "--aray-state-ring-inset": isCompact ? "-2%" : "-4%",
          "--aray-state-ring-alpha": isCompact ? 0.1 : 0.2,
          "--aray-sun-opacity": isCompact ? 1 : 0.9,
        } as CSSProperties
      }
    >
      <span className={`aray-orb-halo ${isActive ? "is-active" : ""}`} />
      <span className={`aray-orb-shell ${isActive ? "is-active" : ""} ${stateClass}`}>
        <span className="aray-orb-atmosphere" />
        <span className="aray-orb-cosmos" />
        <svg className="aray-orb-neural-field" viewBox="0 0 100 100" aria-hidden="true">
          <path className="aray-field-flow aray-field-flow-warm" d="M18 62 C30 47 42 48 52 58 S73 73 88 48" />
          <path className="aray-field-flow aray-field-flow-cool" d="M24 35 C40 28 52 37 62 49 S78 62 88 31" />
          <path className="aray-field-flow aray-field-flow-deep" d="M28 78 C42 62 54 64 66 55 S78 42 84 22" />
        </svg>
        <span className="aray-orb-grid aray-orb-grid-a" />
        <span className="aray-orb-grid aray-orb-grid-b" />
        <svg className="aray-orb-network" viewBox="0 0 100 100" aria-hidden="true">
          <path className="aray-net-line aray-net-line-a" d="M20 57 C33 34 46 33 56 48 S75 62 83 33" />
          <path className="aray-net-line aray-net-line-b" d="M24 38 C36 58 48 62 63 45 S78 42 88 61" />
          <path className="aray-net-line aray-net-line-c" d="M31 71 C42 55 54 61 65 70 S78 73 88 50" />
          <circle className="aray-net-node aray-node-a" cx="25" cy="53" r="1.7" />
          <circle className="aray-net-node aray-node-b" cx="43" cy="39" r="2.1" />
          <circle className="aray-net-node aray-node-c" cx="58" cy="49" r="1.8" />
          <circle className="aray-net-node aray-node-d" cx="74" cy="58" r="2" />
          <circle className="aray-net-node aray-node-e" cx="66" cy="71" r="1.5" />
        </svg>
        <svg className="aray-orb-signature" viewBox="0 0 100 100" aria-hidden="true">
          <path className="aray-signature-backbone aray-signature-left" d="M39 68 C44 54 49 41 54 30" />
          <path className="aray-signature-backbone aray-signature-right" d="M54 30 C61 42 67 55 73 68" />
          <path className="aray-signature-cross" d="M47 56 C54 50 63 51 68 57" />
          <path className="aray-signature-tail" d="M64 58 C70 55 75 51 80 44" />
          <path className="aray-signature-spark" d="M74 38 L82 34 L77 43" />
          <text className="aray-signature-word" x="50" y="77" textLength="25" lengthAdjust="spacingAndGlyphs">ARAY</text>
        </svg>
        <span className="aray-orb-orbit aray-orb-orbit-a" />
        <span className="aray-orb-orbit aray-orb-orbit-b" />
        <span className="aray-orb-depth" />
        <span className="aray-orb-core" />
        <span className="aray-orb-sun" />
        <span className="aray-orb-glass" />
        <span className="aray-orb-rim" />
      </span>
      <span className={`aray-orb-state-ring ${isStateDriven ? "is-active" : ""} ${stateClass}`} />

      {badge && (
        <span
          className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-destructive"
          style={{ boxShadow: "0 0 8px hsl(var(--destructive) / 0.75)" }}
        />
      )}

      {!badge && badgeCount != null && badgeCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-lg">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}

      <style jsx global>{`
        .aray-orb-halo {
          position: absolute;
          inset: -20%;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgb(var(--aray-accent) / var(--aray-halo-alpha)) 0%, transparent 60%),
            radial-gradient(circle at 34% 60%, rgb(var(--aray-warm) / 0.14) 0%, transparent 44%);
          filter: blur(var(--aray-halo-blur));
          opacity: 0.8;
          pointer-events: none;
        }

        .aray-orb-halo.is-active {
          animation: arayOrbBreathe 1.65s ease-in-out infinite;
        }

        .aray-orb-shell {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 999px;
          background:
            radial-gradient(circle at 72% 74%, rgb(3 20 46 / 0.4) 0%, transparent 34%),
            radial-gradient(circle at 50% 50%, transparent 0 46%, rgb(3 20 45 / 0.2) 72%, rgb(2 12 30 / 0.42) 100%),
            radial-gradient(ellipse at 30% 80%, rgb(10 58 112 / 0.2), transparent 42%),
            radial-gradient(circle at 42% 42%, rgb(230 255 252 / 0.24) 0%, transparent 10%),
            radial-gradient(circle at 35% 56%, rgb(var(--aray-warm) / 1) 0%, rgb(var(--aray-warm) / 0.58) 18%, transparent 33%),
            radial-gradient(circle at 63% 47%, rgb(var(--aray-cool) / 0.92) 0%, rgb(var(--aray-accent) / 0.58) 15%, transparent 30%),
            radial-gradient(circle at 54% 56%, rgb(var(--aray-panel-depth-soft) / 0.98) 0%, rgb(var(--aray-panel-depth) / 1) 62%, rgb(4 13 30 / 1) 100%),
            conic-gradient(from 236deg, rgb(var(--aray-warm) / 0.62), rgb(var(--aray-accent) / 0.84), rgb(14 165 233 / 0.44), rgb(var(--aray-warm) / 0.62));
          border: 1px solid rgb(var(--aray-accent) / var(--aray-shell-border-alpha));
          box-shadow:
            inset 0 0 var(--aray-inner-glow) rgb(255 255 255 / 0.14),
            inset 0 var(--aray-shadow-y) var(--aray-shadow-blur) rgb(0 0 0 / 0.62),
            inset 0 0 calc(var(--aray-size) * 0.055) rgb(var(--aray-accent) / 0.34),
            0 0 var(--aray-outer-glow) rgb(var(--aray-accent) / var(--aray-glow-alpha));
          filter: saturate(1.12) contrast(1.08);
          transform: translateZ(0);
        }

        .aray-orb-shell.is-active {
          animation: arayOrbPresence 5.6s ease-in-out infinite;
        }

        .aray-orb-root:hover .aray-orb-shell {
          border-color: rgb(var(--aray-accent) / var(--aray-shell-hover-border-alpha));
          box-shadow:
            inset 0 0 var(--aray-inner-glow) rgb(255 255 255 / 0.22),
            inset 0 var(--aray-shadow-y) var(--aray-shadow-blur) rgb(0 0 0 / 0.46),
            inset 0 0 calc(var(--aray-size) * 0.055) rgb(var(--aray-accent) / 0.34),
            0 0 calc(var(--aray-outer-glow) * 1.35) rgb(var(--aray-accent) / 0.34),
            0 0 calc(var(--aray-outer-glow) * 1.9) hsl(var(--primary) / 0.18);
        }

        .aray-orb-root:hover .aray-orb-halo {
          opacity: 0.98;
        }

        :where(.light, [data-theme="light"]) .aray-orb-root:hover .aray-orb-shell {
          border-color: rgb(var(--aray-accent) / 0.72);
          box-shadow:
            inset 0 0 var(--aray-inner-glow) rgb(255 255 255 / 0.14),
            inset 0 var(--aray-shadow-y) var(--aray-shadow-blur) rgb(0 0 0 / 0.6),
            inset 0 0 calc(var(--aray-size) * 0.055) rgb(var(--aray-accent) / 0.28);
        }

        :where(.light, [data-theme="light"]) .aray-orb-root:hover .aray-orb-halo {
          opacity: 0.28;
          filter: blur(calc(var(--aray-halo-blur) * 0.75));
        }

        .aray-orb-root:hover .aray-orb-signature,
        .aray-orb-root:hover .aray-net-node {
          opacity: 1;
        }

        .aray-orb-root:hover .aray-signature-line {
          stroke: hsl(var(--primary) / 0.88);
        }

        .aray-orb-root:hover .aray-signature-bridge {
          stroke: rgb(var(--aray-warm) / 0.9);
        }

        .aray-orb-root:hover .aray-net-line-a {
          stroke: hsl(var(--primary) / 0.68);
        }

        .aray-orb-root:hover .aray-orb-neural-field {
          opacity: 1;
        }

        .aray-orb-root:hover .aray-field-flow-cool {
          stroke: hsl(var(--primary) / 0.58);
        }

        .aray-orb-atmosphere,
        .aray-orb-cosmos,
        .aray-orb-neural-field,
        .aray-orb-grid,
        .aray-orb-network,
        .aray-orb-signature,
        .aray-orb-orbit,
        .aray-orb-depth,
        .aray-orb-core,
        .aray-orb-sun,
        .aray-orb-glass,
        .aray-orb-rim,
        .aray-orb-state-ring {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
        }

        .aray-orb-atmosphere {
          background:
            radial-gradient(circle at 30% 26%, rgb(255 255 255 / 0.1), transparent 16%),
            radial-gradient(circle at 72% 36%, rgb(var(--aray-accent) / 0.28), transparent 26%),
            radial-gradient(circle at 34% 76%, rgb(var(--aray-warm) / 0.24), transparent 30%),
            radial-gradient(ellipse at 48% 56%, rgb(var(--aray-accent) / 0.1), transparent 40%);
          mix-blend-mode: screen;
          opacity: 0.68;
        }

        .aray-orb-cosmos {
          background:
            radial-gradient(circle at 73% 24%, rgb(147 197 253 / 0.72) 0 1px, transparent 1.7px),
            radial-gradient(circle at 82% 55%, rgb(45 212 191 / 0.6) 0 1px, transparent 1.7px),
            radial-gradient(circle at 27% 73%, rgb(251 191 36 / 0.42) 0 1.1px, transparent 2px),
            radial-gradient(circle at 58% 78%, rgb(226 232 240 / 0.44) 0 0.9px, transparent 1.8px),
            radial-gradient(ellipse at 70% 58%, rgb(var(--aray-panel-depth-soft) / 0.34), transparent 44%),
            radial-gradient(ellipse at 28% 30%, rgb(14 77 128 / 0.24), transparent 42%),
            radial-gradient(ellipse at 42% 88%, rgb(30 64 175 / 0.14), transparent 44%),
            linear-gradient(160deg, rgb(var(--aray-panel-depth-soft) / 0.12), rgb(var(--aray-panel-depth) / 0.06));
          mix-blend-mode: screen;
          opacity: 0.46;
          animation: arayOrbCosmos 7.2s ease-in-out infinite;
        }

        .aray-orb-neural-field {
          width: 100%;
          height: 100%;
          overflow: visible;
          mix-blend-mode: screen;
          opacity: 0.86;
          filter: saturate(1.16);
        }

        .aray-field-flow {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 42 74;
          stroke-width: 7.5;
          opacity: 0.52;
          filter:
            blur(1.4px)
            drop-shadow(0 0 8px rgb(var(--aray-accent) / 0.48));
          animation: arayOrbFieldFlow 8.8s ease-in-out infinite;
        }

        .aray-field-flow-warm {
          stroke: rgb(var(--aray-warm) / 0.64);
          animation-duration: 9.6s;
        }

        .aray-field-flow-cool {
          stroke: rgb(var(--aray-accent) / 0.58);
          animation-duration: 7.8s;
          animation-delay: -2.2s;
        }

        .aray-field-flow-deep {
          stroke: rgb(var(--aray-cool) / 0.34);
          stroke-width: 5.5;
          opacity: 0.42;
          animation-duration: 11.2s;
          animation-delay: -4s;
        }

        .aray-orb-grid {
          opacity: 0.34;
          mix-blend-mode: screen;
          border: 1px solid rgb(var(--aray-cool) / 0.22);
          box-shadow: inset 0 0 calc(var(--aray-size) * 0.15) rgb(var(--aray-accent) / 0.08);
        }

        .aray-orb-grid-a {
          inset: 12% 8%;
          transform: rotate(-25deg) scaleX(0.48);
        }

        .aray-orb-grid-b {
          inset: 18% 4%;
          transform: rotate(18deg) scaleY(0.28);
          opacity: 0.26;
        }

        .aray-orb-network {
          width: 100%;
          height: 100%;
          overflow: visible;
          mix-blend-mode: screen;
          opacity: var(--aray-network-opacity);
        }

        .aray-net-line {
          fill: none;
          stroke: rgb(var(--aray-cool) / 0.74);
          stroke-linecap: round;
          stroke-width: 1.22;
          stroke-dasharray: 8 18;
          filter: drop-shadow(0 0 3px rgb(var(--aray-accent) / 0.82));
          animation: arayOrbSignal 3.8s linear infinite;
        }

        .aray-net-line-b {
          stroke: rgb(var(--aray-warm) / 0.62);
          animation-duration: 4.6s;
          animation-direction: reverse;
        }

        .aray-net-line-c {
          opacity: 0.58;
          animation-duration: 5.2s;
        }

        .aray-net-node {
          fill: rgb(236 254 255 / 0.94);
          filter: drop-shadow(0 0 4px rgb(var(--aray-accent) / 0.9));
          animation: arayOrbNode 2.8s ease-in-out infinite;
        }

        .aray-node-b,
        .aray-node-d {
          fill: rgb(var(--aray-warm) / 0.95);
          animation-delay: -0.9s;
        }

        .aray-node-c {
          animation-delay: -1.8s;
        }

        .aray-orb-signature {
          width: 100%;
          height: 100%;
          overflow: visible;
          mix-blend-mode: screen;
          opacity: var(--aray-signature-opacity);
          transform: translate(3%, -1%);
        }

        .aray-signature-backbone,
        .aray-signature-cross,
        .aray-signature-tail,
        .aray-signature-spark,
        .aray-signature-word {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter:
            drop-shadow(0 0 3px rgb(var(--aray-accent) / 0.9))
            drop-shadow(0 0 7px rgb(var(--aray-warm) / 0.28));
        }

        .aray-signature-backbone {
          stroke: rgb(225 252 255 / 0.82);
          stroke-width: var(--aray-signature-stroke);
          stroke-dasharray: 42;
          stroke-dashoffset: 42;
          animation: arayOrbSignature 5.2s ease-in-out infinite;
        }

        .aray-signature-right {
          animation-delay: -0.55s;
        }

        .aray-signature-left {
          stroke: rgb(236 254 255 / 0.88);
        }

        .aray-signature-right {
          stroke: rgb(var(--aray-accent) / 0.88);
        }

        .aray-signature-cross {
          stroke: rgb(var(--aray-warm) / 0.78);
          stroke-width: calc(var(--aray-signature-stroke) * 0.86);
          animation-delay: -1.1s;
        }

        .aray-signature-tail {
          stroke: rgb(var(--aray-accent) / 0.76);
          stroke-width: calc(var(--aray-signature-stroke) * 0.7);
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: arayOrbSignature 4.4s ease-in-out infinite;
          animation-delay: -1.45s;
        }

        .aray-signature-spark {
          stroke: rgb(var(--aray-accent) / 0.9);
          stroke-width: calc(var(--aray-signature-stroke) * 0.9);
          opacity: 0.82;
          animation: arayOrbSpark 2.8s ease-in-out infinite;
        }

        .aray-signature-word {
          fill: rgb(225 252 255 / 0.82);
          stroke: rgb(var(--aray-accent) / 0.18);
          stroke-width: 0.28;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: var(--aray-word-size);
          font-weight: 800;
          letter-spacing: 0;
          opacity: var(--aray-word-opacity);
          filter:
            drop-shadow(0 0 3px rgb(var(--aray-accent) / 0.82))
            drop-shadow(0 0 6px rgb(var(--aray-warm) / 0.28));
          animation: arayOrbWordGlow 4.6s ease-in-out infinite;
        }

        .aray-orb-orbit {
          inset: 17%;
          border: 1px solid rgb(var(--aray-accent) / 0.22);
          transform: rotate(-18deg) scaleY(0.32);
          opacity: 0.72;
        }

        .aray-orb-orbit::after {
          content: "";
          position: absolute;
          top: 50%;
          left: -2px;
          width: 7%;
          height: 7%;
          border-radius: 999px;
          background: rgb(var(--aray-accent) / 0.95);
          box-shadow: 0 0 8px rgb(var(--aray-accent) / 0.95);
          transform: translateY(-50%);
          animation: arayOrbOrbitDot 3.6s ease-in-out infinite;
        }

        .aray-orb-orbit-b {
          inset: 25% 9%;
          transform: rotate(26deg) scaleY(0.22);
          border-color: rgb(var(--aray-warm) / 0.2);
          opacity: 0.48;
        }

        .aray-orb-orbit-b::after {
          background: rgb(var(--aray-warm) / 0.92);
          box-shadow: 0 0 8px rgb(var(--aray-warm) / 0.82);
          animation-duration: 4.4s;
          animation-delay: -1.4s;
        }

        .aray-orb-depth {
          background:
            conic-gradient(from 128deg, transparent, rgb(255 255 255 / 0.09), transparent 28%, rgb(var(--aray-warm) / 0.22), transparent 72%),
            radial-gradient(circle at 50% 48%, transparent 0 36%, rgb(0 0 0 / 0.24) 58%, rgb(0 0 0 / 0.64) 100%);
          mix-blend-mode: screen;
          opacity: 0.9;
        }

        .aray-orb-core {
          inset: 27%;
          background:
            radial-gradient(circle at 42% 36%, rgb(255 255 255 / 0.86), transparent 16%),
            radial-gradient(circle, rgb(var(--aray-accent) / 0.86), rgb(2 6 23 / 0.08) 56%, transparent 66%);
          filter: blur(var(--aray-core-blur));
          opacity: 0.88;
          transform-origin: center;
          animation: arayOrbCore 2.8s ease-in-out infinite;
        }

        .aray-orb-sun {
          inset: auto;
          left: 21%;
          top: 35%;
          width: 31%;
          height: 31%;
          border-radius: 54% 46% 58% 42%;
          background:
            radial-gradient(circle at 42% 38%, rgb(255 249 203 / 0.74), transparent 15%),
            radial-gradient(circle at 52% 54%, rgb(255 202 105 / 0.74) 0%, rgb(var(--aray-warm) / 0.46) 36%, rgb(var(--aray-warm) / 0.14) 60%, transparent 82%),
            conic-gradient(from 218deg, transparent 0deg, rgb(255 255 255 / 0.1) 48deg, rgb(var(--aray-warm) / 0.24) 84deg, transparent 142deg, rgb(var(--aray-accent) / 0.14) 224deg, transparent 360deg);
          filter: blur(calc(var(--aray-size) * 0.01)) saturate(1.16) contrast(1.02);
          mix-blend-mode: screen;
          opacity: calc(var(--aray-sun-opacity) * 0.88);
          overflow: hidden;
          animation: arayOrbSun 3.4s ease-in-out infinite;
        }

        .aray-orb-sun::before,
        .aray-orb-sun::after {
          content: "";
          position: absolute;
          border-radius: inherit;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .aray-orb-sun::before {
          inset: -28%;
          background:
            conic-gradient(from 0deg, transparent 0deg, rgb(var(--aray-warm) / 0.18) 72deg, rgb(255 255 255 / 0.14) 102deg, transparent 138deg, rgb(var(--aray-accent) / 0.14) 238deg, transparent 360deg);
          opacity: 0.52;
          animation: arayOrbSunFlow 6.2s linear infinite;
        }

        .aray-orb-sun::after {
          inset: 8% 0 10% 18%;
          background:
            radial-gradient(circle at 67% 37%, rgb(255 255 255 / 0.28), transparent 13%),
            linear-gradient(124deg, transparent 18%, rgb(255 255 255 / 0.13) 46%, transparent 64%);
          filter: blur(calc(var(--aray-size) * 0.011));
          opacity: 0.44;
          animation: arayOrbSunCaustic 4.8s ease-in-out infinite;
        }

        .aray-orb-glass {
          background:
            radial-gradient(ellipse at 30% 18%, rgb(255 255 255 / 0.16), transparent 15%),
            radial-gradient(ellipse at 64% 30%, rgb(var(--aray-accent) / 0.14), transparent 28%),
            radial-gradient(ellipse at 36% 72%, rgb(var(--aray-warm) / 0.12), transparent 26%);
          opacity: 0.46;
          overflow: hidden;
          animation: arayOrbGlassLight 6.4s ease-in-out infinite;
        }

        .aray-orb-glass::before {
          content: "";
          position: absolute;
          inset: -22%;
          border-radius: inherit;
          background:
            conic-gradient(
              from 90deg,
              transparent 0deg,
              transparent 62deg,
              hsl(var(--primary) / 0.12) 78deg,
              rgb(255 255 255 / 0.13) 92deg,
              rgb(var(--aray-accent) / 0.16) 108deg,
              transparent 128deg,
              transparent 360deg
            );
          mix-blend-mode: screen;
          opacity: 0.6;
          transform-origin: center;
          animation: arayOrbInnerSweep 8.5s linear infinite;
        }

        .aray-orb-root:hover .aray-orb-glass {
          opacity: 0.78;
          background:
            radial-gradient(ellipse at 30% 18%, rgb(255 255 255 / 0.22), transparent 16%),
            radial-gradient(ellipse at 66% 32%, rgb(var(--aray-accent) / 0.24), transparent 30%),
            radial-gradient(ellipse at 34% 70%, rgb(var(--aray-warm) / 0.18), transparent 28%);
        }

        .aray-orb-root:hover .aray-orb-glass::before {
          opacity: 0.88;
          animation-duration: 5.4s;
        }

        .aray-orb-rim {
          overflow: hidden;
          box-shadow:
            inset 0 0 0 1px rgb(255 255 255 / var(--aray-rim-white-alpha)),
            inset 0 0 0 max(1px, calc(var(--aray-size) * 0.012)) rgb(var(--aray-accent) / var(--aray-rim-accent-alpha)),
            inset 0 0 calc(var(--aray-size) * 0.13) rgb(var(--aray-accent) / var(--aray-rim-glow-alpha)),
            0 0 calc(var(--aray-size) * 0.08) rgb(var(--aray-accent) / var(--aray-rim-outer-alpha));
        }

        .aray-orb-rim::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: max(1.2px, calc(var(--aray-size) * 0.018));
          background:
            conic-gradient(
              from -18deg,
              transparent 0deg,
              transparent 18deg,
              rgb(var(--aray-accent) / 0.18) 34deg,
              rgb(255 255 255 / 0.74) 58deg,
              hsl(var(--primary) / 0.66) 78deg,
              rgb(var(--aray-cool) / 0.48) 98deg,
              transparent 124deg,
              transparent 214deg,
              rgb(255 255 255 / 0.16) 234deg,
              rgb(var(--aray-warm) / 0.26) 250deg,
              transparent 272deg,
              transparent 360deg
            );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          mix-blend-mode: screen;
          opacity: var(--aray-rim-glint-opacity);
          filter:
            drop-shadow(0 0 calc(var(--aray-size) * 0.04) rgb(255 255 255 / 0.26))
            drop-shadow(0 0 calc(var(--aray-size) * 0.07) rgb(var(--aray-accent) / 0.42));
          transform-origin: center;
          animation: arayOrbRimGlint 7.8s linear infinite;
        }

        .aray-orb-root:hover .aray-orb-rim::before {
          opacity: 1;
          animation-duration: 4.7s;
          filter:
            drop-shadow(0 0 calc(var(--aray-size) * 0.07) rgb(255 255 255 / 0.38))
            drop-shadow(0 0 calc(var(--aray-size) * 0.12) hsl(var(--primary) / 0.48));
        }

        :where(.light, [data-theme="light"]) .aray-orb-root:hover .aray-orb-rim::before {
          filter:
            drop-shadow(0 0 calc(var(--aray-size) * 0.035) rgb(255 255 255 / 0.2))
            drop-shadow(0 0 calc(var(--aray-size) * 0.055) rgb(var(--aray-accent) / 0.28));
        }

        .aray-orb-shell.is-listening .aray-orb-rim::before {
          animation-duration: 4.8s;
        }

        .aray-orb-shell.is-speaking .aray-orb-rim::before {
          animation-duration: 4.2s;
        }

        .aray-orb-shell.is-thinking .aray-orb-rim::before {
          animation-duration: 3.6s;
        }

        .aray-orb-state-ring {
          inset: var(--aray-state-ring-inset);
          border-radius: 999px;
          border: 1px solid rgb(var(--aray-accent) / var(--aray-state-ring-alpha));
          opacity: var(--aray-state-ring-alpha);
        }

        .aray-orb-root:hover .aray-orb-state-ring {
          opacity: 0.36;
          filter: drop-shadow(0 0 5px rgb(var(--aray-accent) / 0.28));
        }

        .aray-orb-state-ring::after {
          content: "";
          position: absolute;
          inset: 9%;
          border-radius: inherit;
          border: 1px solid rgb(var(--aray-warm) / 0.18);
          opacity: 0;
        }

        .aray-orb-state-ring.is-active {
          border-color: rgb(var(--aray-accent) / var(--aray-ring-alpha));
          opacity: 0.66;
          animation: arayOrbRing 2.6s ease-in-out infinite;
        }

        .aray-orb-shell.is-listening .aray-orb-core,
        .aray-orb-shell.is-listening .aray-orb-sun {
          animation-duration: 1.25s;
        }

        .aray-orb-shell.is-speaking .aray-orb-core,
        .aray-orb-shell.is-speaking .aray-orb-sun {
          animation-duration: 0.92s;
        }

        .aray-orb-shell.is-thinking .aray-net-line {
          animation-duration: 2.2s;
        }

        .aray-orb-shell.is-thinking .aray-signature-backbone,
        .aray-orb-shell.is-thinking .aray-signature-cross,
        .aray-orb-shell.is-thinking .aray-signature-tail {
          animation-duration: 2.7s;
        }

        .aray-orb-shell.is-thinking .aray-orb-orbit::after {
          animation-duration: 2.5s;
        }

        @keyframes arayOrbBreathe {
          0%, 100% { transform: scale(0.96); opacity: 0.56; }
          50% { transform: scale(1.08); opacity: 0.95; }
        }

        @keyframes arayOrbPresence {
          0%, 100% { filter: saturate(1) brightness(1); }
          50% { filter: saturate(1.08) brightness(1.06); }
        }

        @keyframes arayOrbSignal {
          to { stroke-dashoffset: -52; }
        }

        @keyframes arayOrbCosmos {
          0%, 100% { opacity: 0.36; filter: saturate(1); }
          50% { opacity: 0.58; filter: saturate(1.12); }
        }

        @keyframes arayOrbFieldFlow {
          0%, 100% { stroke-dashoffset: 64; opacity: 0.34; }
          45% { stroke-dashoffset: 0; opacity: 0.62; }
          72% { stroke-dashoffset: -44; opacity: 0.46; }
        }

        @keyframes arayOrbSignature {
          0%, 100% { stroke-dashoffset: 42; opacity: 0.32; }
          28%, 62% { stroke-dashoffset: 0; opacity: 0.92; }
          78% { stroke-dashoffset: -42; opacity: 0.48; }
        }

        @keyframes arayOrbSpark {
          0%, 100% { opacity: 0.26; transform: translate(-1px, 1px); }
          50% { opacity: 1; transform: translate(1px, -1px); }
        }

        @keyframes arayOrbGlassLight {
          0%, 100% { opacity: 0.38; filter: saturate(1); }
          45% { opacity: 0.58; filter: saturate(1.14); }
          70% { opacity: 0.44; filter: saturate(1.08); }
        }

        @keyframes arayOrbInnerSweep {
          to { transform: rotate(360deg); }
        }

        @keyframes arayOrbRimGlint {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes arayOrbCore {
          0%, 100% { transform: scale(0.82); opacity: 0.58; }
          50% { transform: scale(1.08); opacity: 0.95; }
        }

        @keyframes arayOrbSun {
          0%, 100% { transform: scale(0.95) rotate(-2deg); opacity: 0.68; filter: blur(calc(var(--aray-size) * 0.012)) saturate(1.1) contrast(1); }
          50% { transform: scale(1.12) rotate(3deg); opacity: 0.92; filter: blur(calc(var(--aray-size) * 0.008)) saturate(1.2) contrast(1.06); }
        }

        @keyframes arayOrbSunFlow {
          to { transform: rotate(360deg); }
        }

        @keyframes arayOrbSunCaustic {
          0%, 100% { transform: translate(-3%, 3%) rotate(-7deg); opacity: 0.34; }
          50% { transform: translate(5%, -2%) rotate(8deg); opacity: 0.72; }
        }

        @keyframes arayOrbNode {
          0%, 100% { opacity: 0.42; transform: scale(0.86); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        @keyframes arayOrbOrbitDot {
          0%, 100% { left: 2%; opacity: 0.28; }
          46% { opacity: 1; }
          50% { left: 94%; opacity: 0.78; }
        }

        @keyframes arayOrbRing {
          0%, 100% { transform: scale(0.98); opacity: 0.42; }
          50% { transform: scale(1.08); opacity: 0.88; }
        }

        @media (prefers-reduced-motion: reduce) {
          .aray-orb-halo,
          .aray-orb-shell,
          .aray-orb-core,
          .aray-orb-sun,
          .aray-orb-sun::before,
          .aray-orb-sun::after,
          .aray-orb-cosmos,
          .aray-orb-glass,
          .aray-orb-glass::before,
          .aray-orb-rim::before,
          .aray-field-flow,
          .aray-signature-backbone,
          .aray-signature-cross,
          .aray-signature-tail,
          .aray-signature-spark,
          .aray-net-line,
          .aray-net-node,
          .aray-orb-orbit::after,
          .aray-orb-state-ring {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export function ArayIcon({ className = "", id, size = 18 }: ArayIconProps) {
  const pixelSize = typeof size === "number" ? size : Number.parseInt(size, 10) || 18;
  return <ArayOrb id={id} size={pixelSize} pulse="idle" intensity="subtle" className={className} />;
}
