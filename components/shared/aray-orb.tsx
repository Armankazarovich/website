"use client";

/**
 * ArayOrb v6 — Living Face Avatar
 * Real ARAY face image with CSS glow animations
 *
 * Two image variants:
 * - Large (>= 64px): /images/aray/face.png (full portrait)
 * - Small (< 64px): /images/aray/face-mob.png (face crop, sharper at small sizes)
 */

interface ArayOrbProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  animate?: boolean;
  className?: string;
  intensity?: "subtle" | "normal" | "vivid";
  badge?: boolean;
  badgeCount?: number;
  pulse?: "idle" | "listening" | "speaking" | "none";
  id?: string;
}

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
  const isActive = animate && (isListening || isSpeaking);

  // Pick image based on size
  const imgSrc = pixelSize >= 64 ? "/images/aray/face.png" : "/images/aray/face-mob.png";

  // Animation speed based on state
  const breatheDur = isActive ? "2s" : "4s";
  const glowDur = isActive ? "1.5s" : "3s";

  // Glow color based on state
  const glowColor = isListening
    ? "rgba(96,165,250,"
    : isSpeaking
    ? "rgba(52,211,153,"
    : "rgba(96,165,250,";

  // Border color
  const borderColor = isListening
    ? "rgba(96,165,250,0.4)"
    : isSpeaking
    ? "rgba(52,211,153,0.4)"
    : "rgba(96,165,250,0.3)";

  // Intensity
  const opMult = intensity === "subtle" ? 0.6 : intensity === "vivid" ? 1.4 : 1.0;

  // Inner glow intensity
  const innerGlow = `inset 0 0 ${pixelSize * 0.15}px ${glowColor}${0.25 * opMult})`;
  const outerGlow = `0 0 ${pixelSize * 0.08}px ${glowColor}${0.15 * opMult})`;
  const innerGlowStrong = `inset 0 0 ${pixelSize * 0.25}px ${glowColor}${0.4 * opMult})`;
  const outerGlowStrong = `0 0 ${pixelSize * 0.12}px ${glowColor}${0.25 * opMult})`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={
        isListening ? "Aray is listening"
          : isSpeaking ? "Aray is speaking"
          : "Aray — AI Assistant"
      }
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Image container with circle clip and animations */}
      <div
        style={{
          width: pixelSize,
          height: pixelSize,
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          border: `1.5px solid ${borderColor}`,
          boxShadow: `${innerGlow}, ${outerGlow}`,
          animation: animate ? `arayInnerPulse ${glowDur} ease-in-out infinite` : undefined,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="ARAY"
          width={pixelSize}
          height={pixelSize}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: pixelSize >= 64 ? "center 15%" : "center center",
            borderRadius: "50%",
            filter: `brightness(${isActive ? 1.25 : 1.1}) contrast(1.1) saturate(1.1)`,
            animation: animate ? `arayBreathe ${breatheDur} ease-in-out infinite` : undefined,
            imageRendering: pixelSize < 64 ? "-webkit-optimize-contrast" : undefined,
          } as React.CSSProperties}
        />
      </div>

      {/* Badge notifications */}
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
            background: "linear-gradient(135deg,#3b82f6,#60a5fa)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}

      {/* Global keyframes (injected once) */}
      <style jsx global>{`
        @keyframes arayBreathe {
          0%, 100% { transform: scale(1); filter: brightness(1.1) contrast(1.1) saturate(1.1); }
          35% { transform: scale(1.02); filter: brightness(1.25) contrast(1.15) saturate(1.15); }
          65% { transform: scale(0.99); filter: brightness(1.05) contrast(1.1) saturate(1.05); }
          85% { transform: scale(1.01); filter: brightness(1.2) contrast(1.1) saturate(1.1); }
        }
        @keyframes arayInnerPulse {
          0%, 100% {
            box-shadow: inset 0 0 8px rgba(96,165,250,0.25), 0 0 4px rgba(96,165,250,0.1);
            border-color: rgba(96,165,250,0.3);
          }
          50% {
            box-shadow: inset 0 0 16px rgba(96,165,250,0.4), 0 0 8px rgba(96,165,250,0.2);
            border-color: rgba(96,165,250,0.5);
          }
        }
      `}</style>
    </div>
  );
}
