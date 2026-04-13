"use client";

/**
 * ArayOrb — футуристический голограммный глобус Арая
 * Сетка меридианов, вращающееся энергетическое кольцо, частицы, пульсация.
 * Все анимации через SVG animate — GPU-ускоренные, 0 JS анимаций.
 */

interface ArayOrbProps {
  size?: number;
  id?: string;
  pulse?: "idle" | "listening" | "speaking" | "none";
  badge?: boolean;
  badgeCount?: number;
}

export function ArayOrb({
  size = 52,
  id = "aray",
  pulse = "idle",
  badge = false,
  badgeCount,
}: ArayOrbProps) {
  const r = 44;

  // Цвета по состоянию
  const isListening = pulse === "listening";
  const isSpeaking = pulse === "speaking";

  const coreColor1 = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ff9500";
  const coreColor2 = isListening ? "#3b82f6" : isSpeaking ? "#10b981" : "#e8700a";
  const coreColor3 = isListening ? "#1d4ed8" : isSpeaking ? "#059669" : "#c05000";
  const glowColor = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ffaa30";
  const gridColor = isListening ? "rgba(96,165,250," : isSpeaking ? "rgba(52,211,153," : "rgba(255,170,50,";
  const particleColor = isListening ? "#93c5fd" : isSpeaking ? "#6ee7b7" : "#ffd080";
  const ringColor = isListening ? "#3b82f6" : isSpeaking ? "#10b981" : "#ff8c00";

  const breathDur = isListening ? "1.2s" : isSpeaking ? "1.5s" : "4s";

  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label="Арай — AI-ассистент" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
        <defs>
          {/* Основной градиент — ядро глобуса */}
          <radialGradient id={`${id}-core`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor={coreColor1} stopOpacity="0.95">
              <animate attributeName="stopColor" values={`${coreColor1};${coreColor2};${coreColor1}`} dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="35%" stopColor={coreColor2} stopOpacity="0.85"/>
            <stop offset="70%" stopColor={coreColor3} stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#0a0200" stopOpacity="0.95"/>
          </radialGradient>

          {/* Внешнее свечение (glow) */}
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor={glowColor} stopOpacity="0">
              <animate attributeName="stop-opacity" values="0;0.06;0" dur={breathDur} repeatCount="indefinite"/>
            </stop>
            <stop offset="88%" stopColor={glowColor} stopOpacity="0.20">
              <animate attributeName="stop-opacity" values="0.20;0.40;0.20" dur={breathDur} repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.35">
              <animate attributeName="stop-opacity" values="0.35;0.55;0.35" dur={breathDur} repeatCount="indefinite"/>
            </stop>
          </radialGradient>

          {/* Блик — стеклянный */}
          <radialGradient id={`${id}-hl`} cx="32%" cy="26%" r="32%">
            <stop offset="0%" stopColor="white" stopOpacity="0.90"/>
            <stop offset="40%" stopColor="white" stopOpacity="0.30"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          {/* Внутреннее ядро свечения */}
          <radialGradient id={`${id}-inner`} cx="50%" cy="50%" r="35%">
            <stop offset="0%" stopColor={coreColor1} stopOpacity="0.5">
              <animate attributeName="stop-opacity" values="0.5;0.8;0.5" dur={breathDur} repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor={coreColor2} stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r={r}/>
          </clipPath>
        </defs>

        {/* ── Внешнее свечение (за пределами шара) ── */}
        <circle cx="50" cy="50" r={r + 6} fill={`url(#${id}-glow)`}/>

        {/* ── Базовый шар — ядро ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-core)`}/>

        {/* ── Внутреннее ядро ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-inner)`}/>

        {/* ── Голограммная сетка (меридианы + параллели) ── */}
        <g clipPath={`url(#${id}-clip)`} opacity="0.55">
          {/* Вращающаяся сетка меридианов */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 50 50;360 50 50" dur="20s" repeatCount="indefinite"/>
            {/* Меридианы — эллипсы разного наклона */}
            <ellipse cx="50" cy="50" rx="10" ry={r} fill="none" stroke={`${gridColor}0.5)`} strokeWidth="0.6"/>
            <ellipse cx="50" cy="50" rx="24" ry={r} fill="none" stroke={`${gridColor}0.4)`} strokeWidth="0.5"/>
            <ellipse cx="50" cy="50" rx="36" ry={r} fill="none" stroke={`${gridColor}0.3)`} strokeWidth="0.4"/>
            <ellipse cx="50" cy="50" rx={r} ry={r} fill="none" stroke={`${gridColor}0.25)`} strokeWidth="0.4"/>
          </g>

          {/* Параллели — горизонтальные линии */}
          <line x1="14" y1="28" x2="86" y2="28" stroke={`${gridColor}0.25)`} strokeWidth="0.4"/>
          <line x1="8"  y1="40" x2="92" y2="40" stroke={`${gridColor}0.30)`} strokeWidth="0.4"/>
          <line x1="6"  y1="50" x2="94" y2="50" stroke={`${gridColor}0.35)`} strokeWidth="0.5">
            <animate attributeName="stroke-opacity" values="0.35;0.55;0.35" dur="3s" repeatCount="indefinite"/>
          </line>
          <line x1="8"  y1="60" x2="92" y2="60" stroke={`${gridColor}0.30)`} strokeWidth="0.4"/>
          <line x1="14" y1="72" x2="86" y2="72" stroke={`${gridColor}0.25)`} strokeWidth="0.4"/>
        </g>

        {/* ── Вращающееся энергетическое кольцо ── */}
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="50" rx={r - 2} ry="12" fill="none"
            stroke={ringColor} strokeWidth="1.2" strokeDasharray="6 4" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate"
              values="25 50 50;385 50 50" dur="10s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite"/>
          </ellipse>

          {/* Второе кольцо — обратное вращение */}
          <ellipse cx="50" cy="50" rx={r - 6} ry="8" fill="none"
            stroke={particleColor} strokeWidth="0.7" strokeDasharray="3 5" opacity="0.35">
            <animateTransform attributeName="transform" type="rotate"
              values="70 50 50;-290 50 50" dur="14s" repeatCount="indefinite"/>
          </ellipse>
        </g>

        {/* ── Частицы — бегущие точки по орбитам ── */}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Частица 1 — быстрая */}
          <circle r="2" fill={particleColor} opacity="0.7">
            <animateMotion dur="4s" repeatCount="indefinite"
              path="M10,50 A40,14 0 1,1 90,50 A40,14 0 1,1 10,50"/>
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="4s" repeatCount="indefinite"/>
            <animate attributeName="r" values="1.5;2.5;1.5" dur="4s" repeatCount="indefinite"/>
          </circle>

          {/* Частица 2 — медленная, другой угол */}
          <circle r="1.5" fill="white" opacity="0.5">
            <animateMotion dur="7s" repeatCount="indefinite"
              path="M30,15 A25,38 0 1,1 70,85 A25,38 0 1,1 30,15"/>
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="7s" repeatCount="indefinite"/>
          </circle>

          {/* Частица 3 — мерцающая */}
          <circle r="1.8" fill={glowColor} opacity="0.6">
            <animateMotion dur="5.5s" repeatCount="indefinite"
              path="M50,8 A42,42 0 1,0 50,92 A42,42 0 1,0 50,8"/>
            <animate attributeName="opacity" values="0;0.8;0" dur="5.5s" repeatCount="indefinite"/>
          </circle>

          {/* Частица 4 — маленькая быстрая */}
          <circle r="1" fill="white" opacity="0.4">
            <animateMotion dur="3.2s" repeatCount="indefinite"
              path="M20,35 A30,18 0 1,1 80,65 A30,18 0 1,1 20,35"/>
            <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3.2s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ── Стеклянный блик ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl)`}/>

        {/* ── Ободок — голограммный край ── */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={glowColor} strokeWidth="1" opacity="0.45">
          <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur={breathDur} repeatCount="indefinite"/>
        </circle>

        {/* Тонкий второй ободок */}
        <circle cx="50" cy="50" r={r + 2} fill="none"
          stroke={glowColor} strokeWidth="0.4" opacity="0.2">
          <animate attributeName="stroke-opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite"/>
        </circle>
      </svg>

      {/* Badge — непрочитанные */}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-pulse"
          style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.7)", border: "2px solid rgba(0,0,0,0.3)" }} />
      )}

      {/* Badge — число */}
      {!badge && badgeCount != null && badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)" }}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}
