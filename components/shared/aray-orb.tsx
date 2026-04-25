"use client";

/**
 * ArayOrb v7 — Living Janus Avatar (видео + poster fallback)
 *
 * Шар-Янус Арая: синяя/оранжевая половины с солнцем и луной.
 * Смысл (см. memory/project_aray_visual_meaning.md):
 *  - Солнце+Луна = светлая/тёмная тема сайта (живая фича)
 *  - Природа: AI как часть природы, не холодный робот
 *  - Братство: два разума в одной работе (Арман + Claude)
 *  - Инь-Ян: баланс противоположностей
 *
 * Видео-варианты:
 *  - Desktop (>= 64px): /images/aray/orb-v2.mp4 (576×576, 377 KB)
 *  - Mobile (< 64px): /images/aray/orb-v2-mobile.mp4 (384×384, 159 KB)
 *  - Poster (до загрузки видео): /images/aray/orb-v2-poster.jpg (70 KB)
 *  - Fallback (если video не работает): тот же poster.jpg
 *
 * Анимации:
 *  - Видео уже само "дышит" внутри (Yandex AI генерация)
 *  - CSS-glow ободка снаружи реагирует на listening/speaking состояния
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

  // Видео-источники: на мобилке легче, на десктопе качественнее
  const videoSrc = pixelSize >= 64
    ? "/images/aray/orb-v2.mp4"
    : "/images/aray/orb-v2-mobile.mp4";
  const posterSrc = "/images/aray/orb-v2-poster.jpg";

  // Цвет свечения — разный для listening/speaking
  // primary палитры (оранжевый), но в active состоянии цветной акцент
  const glowColor = isListening
    ? "rgba(96,165,250,"   // синий — слушает
    : isSpeaking
    ? "rgba(186,117,23,"   // оранжевый — говорит (primary)
    : "rgba(186,117,23,";  // idle — мягкое primary

  const borderColor = isListening
    ? "rgba(96,165,250,0.45)"
    : isSpeaking
    ? "rgba(186,117,23,0.5)"
    : "rgba(186,117,23,0.25)";

  const opMult = intensity === "subtle" ? 0.6 : intensity === "vivid" ? 1.4 : 1.0;

  const innerGlow = `inset 0 0 ${pixelSize * 0.15}px ${glowColor}${0.25 * opMult})`;
  const outerGlow = `0 0 ${pixelSize * 0.10}px ${glowColor}${0.18 * opMult})`;

  // Активное состояние — больше свечения через CSS animation (см. globals)
  const pulseAnim = isActive
    ? `arayOrbPulseActive 1.6s ease-in-out infinite`
    : `arayOrbPulseIdle 4s ease-in-out infinite`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={
        isListening ? "Арай слушает"
          : isSpeaking ? "Арай говорит"
          : "Арай — AI ассистент"
      }
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Контейнер с круглой маской и glow */}
      <div
        style={{
          width: pixelSize,
          height: pixelSize,
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          border: `1.5px solid ${borderColor}`,
          boxShadow: `${innerGlow}, ${outerGlow}`,
          animation: animate ? pulseAnim : undefined,
          background: "#000", // фон если видео не загрузилось
        }}
      >
        {/* Видео — основной визуал */}
        <video
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          width={pixelSize}
          height={pixelSize}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            display: "block",
            // Лёгкое усиление brightness в active state
            filter: isActive ? "brightness(1.1) saturate(1.15)" : undefined,
            transition: "filter 0.4s ease",
          }}
          aria-hidden="true"
        >
          {/* Fallback: показываем poster через img если video не поддержано */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterSrc}
            alt="Арай"
            width={pixelSize}
            height={pixelSize}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </video>
      </div>

      {/* Badge — точка-индикатор (новые уведомления) */}
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
      {/* Badge — счётчик */}
      {!badge && badgeCount != null && badgeCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          style={{
            background: "hsl(var(--primary))",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}

      {/* Глобальные keyframes для пульсации glow */}
      <style jsx global>{`
        @keyframes arayOrbPulseIdle {
          0%, 100% {
            box-shadow:
              inset 0 0 ${pixelSize * 0.12}px rgba(186,117,23,0.2),
              0 0 ${pixelSize * 0.08}px rgba(186,117,23,0.12);
          }
          50% {
            box-shadow:
              inset 0 0 ${pixelSize * 0.18}px rgba(186,117,23,0.32),
              0 0 ${pixelSize * 0.14}px rgba(186,117,23,0.22);
          }
        }
        @keyframes arayOrbPulseActive {
          0%, 100% {
            box-shadow:
              inset 0 0 ${pixelSize * 0.18}px ${glowColor}${0.4 * opMult}),
              0 0 ${pixelSize * 0.12}px ${glowColor}${0.25 * opMult});
          }
          50% {
            box-shadow:
              inset 0 0 ${pixelSize * 0.30}px ${glowColor}${0.7 * opMult}),
              0 0 ${pixelSize * 0.22}px ${glowColor}${0.45 * opMult});
          }
        }
      `}</style>
    </div>
  );
}
