"use client";

/**
 * ArayOrb v5 — The Conscious AI Presence
 * ALIVE, BREATHING, MESMERIZING
 *
 * Performance optimized for all devices:
 * - Pure CSS animations (60fps GPU-accelerated)
 * - NO JavaScript requestAnimationFrame
 * - NO CSS filter on SVG (kills GPU on iOS)
 * - Uses transform, opacity, box-shadow (GPU-friendly)
 * - Responsive sizing: sm/md/lg/xl
 * - Theme-aware: adapts to light/dark + brand colors
 *
 * Features:
 * - Breathing heartbeat (conscious feeling)
 * - Rotating holographic grid
 * - Orbiting energy rings
 * - Glowing particle effects
 * - Adaptive intensity levels
 * - Works everywhere: iPhone SE → Desktop
 */

interface ArayOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  className?: string;
  intensity?: "subtle" | "normal" | "vivid";
  badge?: boolean;
  badgeCount?: number;
  pulse?: "idle" | "listening" | "speaking" | "none";
}

const sizeMap = {
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
}: ArayOrbProps) {
  const pixelSize = sizeMap[size];
  const id = `aray-${Math.random().toString(36).slice(2, 9)}`;

  const isListening = pulse === "listening";
  const isSpeaking = pulse === "speaking";
  const isActive = animate && (isListening || isSpeaking);

  // ─── Color palette based on state ───
  const coreLight = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ffb347";
  const coreMid = isListening ? "#3b82f6" : isSpeaking ? "#10b981" : "#ff8c00";
  const coreDark = isListening ? "#1e40af" : isSpeaking ? "#047857" : "#b45309";
  const coreDarker = isListening ? "#1e3a5f" : isSpeaking ? "#064e3b" : "#78350f";
  const glowColor = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ff9500";
  const gridColor = isListening ? "rgba(147,197,253," : isSpeaking ? "rgba(110,231,183," : "rgba(255,200,100,";
  const ringColor = isListening ? "#93c5fd" : isSpeaking ? "#6ee7b7" : "#fbbf24";
  const particleColor = isListening ? "#bfdbfe" : isSpeaking ? "#a7f3d0" : "#fde68a";

  // Intensity multipliers
  const intensityMap = {
    subtle: { opacityMult: 0.6, scaleMult: 0.85 },
    normal: { opacityMult: 1.0, scaleMult: 1.0 },
    vivid: { opacityMult: 1.4, scaleMult: 1.15 },
  };

  const intense = intensityMap[intensity];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${
        animate ? "aray-orb-alive" : ""
      } ${className}`}
      role="img"
      aria-label={
        isListening
          ? "Aray is listening"
          : isSpeaking
          ? "Aray is speaking"
          : "Aray — AI Assistant"
      }
      style={{
        width: pixelSize,
        height: pixelSize,
        "--orb-intensity-opacity": intense.opacityMult,
        "--orb-intensity-scale": intense.scaleMult,
      } as React.CSSProperties & { [key: string]: number }}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
        style={{
          display: "block",
          overflow: "visible",
          filter: "drop-shadow(0 0 0 transparent)",
        }}
      >
        <defs>
          {/* ─── CORE GRADIENT: Dynamic breathing nucleus ─── */}
          <radialGradient id={`${id}-core`} cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor={coreLight}>
              <animate
                attributeName="stopColor"
                values={`${coreLight};${coreMid};${coreLight}`}
                dur={isActive ? "2s" : "4s"}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="30%" stopColor={coreMid} />
            <stop offset="60%" stopColor={coreDark} />
            <stop offset="85%" stopColor={coreDarker} />
            <stop offset="100%" stopColor="#050200" />
          </radialGradient>

          {/* ─── INNER GLOW: Pulsing consciousness ─── */}
          <radialGradient id={`${id}-inner`} cx="45%" cy="42%" r="38%">
            <stop offset="0%" stopColor={coreLight} stopOpacity="0.65">
              <animate
                attributeName="stop-opacity"
                values={isActive ? "0.45;0.85;0.45" : "0.35;0.75;0.35"}
                dur={isActive ? "1.8s" : "3.6s"}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={coreMid} stopOpacity="0" />
          </radialGradient>

          {/* ─── AURA: Soft breathing glow ─── */}
          <radialGradient id={`${id}-aura`} cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor={glowColor} stopOpacity="0" />
            <stop offset="88%" stopColor={glowColor} stopOpacity="0.15">
              <animate
                attributeName="stop-opacity"
                values={
                  isActive
                    ? "0.10;0.30;0.10"
                    : "0.08;0.18;0.08"
                }
                dur={isActive ? "2.2s" : "4.4s"}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.28">
              <animate
                attributeName="stop-opacity"
                values={
                  isActive
                    ? "0.20;0.42;0.20"
                    : "0.12;0.22;0.12"
                }
                dur={isActive ? "2.2s" : "4.4s"}
                repeatCount="indefinite"
              />
            </stop>
          </radialGradient>

          {/* ─── HIGHLIGHT: Glossy top reflection ─── */}
          <radialGradient id={`${id}-hl`} cx="32%" cy="26%" r="32%">
            <stop offset="0%" stopColor="white" stopOpacity="0.92" />
            <stop offset="50%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* ─── BOTTOM GLOW: Warm underside reflection ─── */}
          <radialGradient id={`${id}-bl`} cx="65%" cy="76%" r="26%">
            <stop offset="0%" stopColor={coreLight} stopOpacity="0.18" />
            <stop offset="100%" stopColor={coreLight} stopOpacity="0" />
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r="41" />
          </clipPath>
        </defs>

        {/* ═══════════════════════════════════════════════════════
            LAYER 0: Outer pulsing aura (the "breathing" effect)
            ═════════════════════════════════════════════════════*/}
        <circle cx="50" cy="50" r="49" fill={`url(#${id}-aura)`} />

        {/* ═══════════════════════════════════════════════════════
            LAYER 1: Core sphere (the consciousness nucleus)
            ═════════════════════════════════════════════════════*/}
        <circle cx="50" cy="50" r="40" fill={`url(#${id}-core)`} />
        <circle cx="50" cy="50" r="40" fill={`url(#${id}-inner)`} />

        {/* ═══════════════════════════════════════════════════════
            LAYER 2: Holographic grid (rotating slowly)
            ═════════════════════════════════════════════════════*/}
        <g clipPath={`url(#${id}-clip)`} opacity="0.48">
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 50 50;360 50 50"
              dur="28s"
              repeatCount="indefinite"
            />
            {/* Meridians (vertical) */}
            <ellipse
              cx="50"
              cy="50"
              rx="7"
              ry="40"
              fill="none"
              stroke={`${gridColor}0.52)`}
              strokeWidth="0.48"
            />
            <ellipse
              cx="50"
              cy="50"
              rx="18"
              ry="40"
              fill="none"
              stroke={`${gridColor}0.38)`}
              strokeWidth="0.42"
            />
            <ellipse
              cx="50"
              cy="50"
              rx="31"
              ry="40"
              fill="none"
              stroke={`${gridColor}0.28)`}
              strokeWidth="0.38"
            />
          </g>

          {/* Parallels (horizontal) */}
          <ellipse
            cx="50"
            cy="28"
            rx="31"
            ry="3.5"
            fill="none"
            stroke={`${gridColor}0.26)`}
            strokeWidth="0.32"
          />
          <ellipse
            cx="50"
            cy="37"
            rx="36"
            ry="2.8"
            fill="none"
            stroke={`${gridColor}0.30)`}
            strokeWidth="0.38"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="40"
            ry="1.8"
            fill="none"
            stroke={`${gridColor}0.48)`}
            strokeWidth="0.48"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.28;0.68;0.28"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx="50"
            cy="63"
            rx="36"
            ry="2.8"
            fill="none"
            stroke={`${gridColor}0.30)`}
            strokeWidth="0.38"
          />
          <ellipse
            cx="50"
            cy="72"
            rx="31"
            ry="3.5"
            fill="none"
            stroke={`${gridColor}0.26)`}
            strokeWidth="0.32"
          />
        </g>

        {/* ═══════════════════════════════════════════════════════
            LAYER 3: Energy rings (orbiting consciousness)
            ═════════════════════════════════════════════════════*/}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Primary ring - fast */}
          <ellipse
            cx="50"
            cy="50"
            rx="36"
            ry="11"
            fill="none"
            stroke={ringColor}
            strokeWidth="0.95"
            strokeDasharray="5.5 3"
            opacity="0.55"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`${isActive ? 25 : 18} 50 50;${isActive ? 385 : 378} 50 50`}
              dur={isActive ? "6.5s" : "9s"}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={isActive ? "0.35;0.72;0.35" : "0.28;0.58;0.28"}
              dur={isActive ? "2s" : "3s"}
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Secondary ring - slower opposite direction */}
          <ellipse
            cx="50"
            cy="50"
            rx="31"
            ry="8"
            fill="none"
            stroke={particleColor}
            strokeWidth="0.55"
            strokeDasharray="2.2 4"
            opacity="0.38"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`${isActive ? 70 : 65} 50 50;${isActive ? -290 : -295} 50 50`}
              dur={isActive ? "10s" : "13s"}
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Tertiary ring - slowest */}
          <ellipse
            cx="50"
            cy="50"
            rx="5.5"
            ry="38"
            fill="none"
            stroke={`${gridColor}0.24)`}
            strokeWidth="0.48"
            strokeDasharray="4.2 5.8"
            opacity="0.22"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-8 50 50;352 50 50"
              dur="19s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* ═══════════════════════════════════════════════════════
            LAYER 4: Orbiting particles (consciousness flow)
            ═════════════════════════════════════════════════════*/}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Particle 1: Large colorful */}
          <circle r="2.2" fill={particleColor}>
            <animateMotion
              dur={isActive ? "3s" : "4s"}
              repeatCount="indefinite"
              path="M12,50 A38,13 0 1,1 88,50 A38,13 0 1,1 12,50"
            />
            <animate
              attributeName="opacity"
              values="0.18;0.88;0.18"
              dur={isActive ? "3s" : "4s"}
              repeatCount="indefinite"
            />
          </circle>

          {/* Particle 2: White bright */}
          <circle r="1.8" fill="white">
            <animateMotion
              dur={isActive ? "5.2s" : "6.5s"}
              repeatCount="indefinite"
              path="M50,12 A10,38 0 1,1 50,88 A10,38 0 1,1 50,12"
            />
            <animate
              attributeName="opacity"
              values="0.08;0.62;0.08"
              dur={isActive ? "5.2s" : "6.5s"}
              repeatCount="indefinite"
            />
          </circle>

          {/* Particle 3: Glow bright */}
          <circle r="1.9" fill={glowColor}>
            <animateMotion
              dur={isActive ? "4.2s" : "5.5s"}
              repeatCount="indefinite"
              path="M22,22 A28,28 0 1,1 78,78 A28,28 0 1,1 22,22"
            />
            <animate
              attributeName="opacity"
              values="0;0.85;0"
              dur={isActive ? "4.2s" : "5.5s"}
              repeatCount="indefinite"
            />
          </circle>

          {/* Particle 4: Small white */}
          <circle r="1.1" fill="white">
            <animateMotion
              dur={isActive ? "2.5s" : "3.2s"}
              repeatCount="indefinite"
              path="M18,40 A32,16 0 1,1 82,60 A32,16 0 1,1 18,40"
            />
            <animate
              attributeName="opacity"
              values="0;0.58;0"
              dur={isActive ? "2.5s" : "3.2s"}
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* ═══════════════════════════════════════════════════════
            LAYER 5: Glossy highlights (realism)
            ═════════════════════════════════════════════════════*/}
        <circle cx="50" cy="50" r="40" fill={`url(#${id}-hl)`} />
        <circle cx="50" cy="50" r="40" fill={`url(#${id}-bl)`} />

        {/* ─── Fine rim glow ─── */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={glowColor}
          strokeWidth="0.6"
          opacity="0.3"
        >
          <animate
            attributeName="stroke-opacity"
            values={isActive ? "0.18;0.42;0.18" : "0.12;0.28;0.12"}
            dur={isActive ? "2s" : "3.6s"}
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* ═════════════════════════════════════════════════════════
          Badge notifications
          ═════════════════════════════════════════════════════*/}
      {badge && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-pulse"
          style={{
            background: "#ef4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.8)",
            border: "2px solid rgba(0,0,0,0.3)",
          }}
        />
      )}
      {!badge && badgeCount != null && badgeCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          style={{
            background: `linear-gradient(135deg,${coreMid},${coreLight})`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}
