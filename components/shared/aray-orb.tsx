"use client";

/**
 * ArayOrb v3 — Голографический глобус из будущего
 * Единый компонент — одинаковый на ВСЕХ устройствах и размерах.
 * SVG animate = GPU, 0 JS анимаций, плавно при любом fps.
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
  const r = 42;

  const isListening = pulse === "listening";
  const isSpeaking = pulse === "speaking";
  const isActive = isListening || isSpeaking;

  // Палитра по состоянию
  const c1 = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ffb347";
  const c2 = isListening ? "#3b82f6" : isSpeaking ? "#10b981" : "#ff8c00";
  const c3 = isListening ? "#1e40af" : isSpeaking ? "#047857" : "#b45309";
  const c4 = isListening ? "#1e3a5f" : isSpeaking ? "#064e3b" : "#78350f";
  const glow = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ff9500";
  const grid = isListening ? "rgba(147,197,253," : isSpeaking ? "rgba(110,231,183," : "rgba(255,200,100,";
  const ring = isListening ? "#93c5fd" : isSpeaking ? "#6ee7b7" : "#fbbf24";
  const particle = isListening ? "#bfdbfe" : isSpeaking ? "#a7f3d0" : "#fde68a";

  const breathe = isActive ? "1.5s" : "4s";
  const glowShadow = isListening
    ? "0 0 20px rgba(96,165,250,0.5), 0 0 40px rgba(59,130,246,0.25)"
    : isSpeaking
      ? "0 0 20px rgba(52,211,153,0.5), 0 0 40px rgba(16,185,129,0.25)"
      : "0 0 14px rgba(255,149,0,0.35), 0 0 30px rgba(255,140,0,0.15)";
  const activeGlowShadow = isListening
    ? "0 0 28px rgba(96,165,250,0.7), 0 0 56px rgba(59,130,246,0.35)"
    : isSpeaking
      ? "0 0 28px rgba(52,211,153,0.7), 0 0 56px rgba(16,185,129,0.35)"
      : glowShadow;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={isListening ? "Арай слушает" : isSpeaking ? "Арай говорит" : "Арай — AI-ассистент"}
      style={{ width: size, height: size }}
    >
      {/* CSS Glow — мягкое свечение вокруг, без уродливой обводки */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: isActive ? activeGlowShadow : glowShadow,
          transition: "box-shadow 0.6s ease",
          animation: isActive ? `arayBreathe ${breathe} ease-in-out infinite` : undefined,
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="relative"
        style={{ display: "block", filter: `drop-shadow(0 0 3px ${glow}40)` }}
      >
        <defs>
          {/* Ядро — глубокий градиент с анимацией */}
          <radialGradient id={`${id}-core`} cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor={c1}>
              <animate attributeName="stopColor" values={`${c1};${c2};${c1}`} dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="30%" stopColor={c2}/>
            <stop offset="60%" stopColor={c3}/>
            <stop offset="85%" stopColor={c4}/>
            <stop offset="100%" stopColor="#050200"/>
          </radialGradient>

          {/* Внутреннее свечение ядра */}
          <radialGradient id={`${id}-inner`} cx="45%" cy="42%" r="40%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.6">
              <animate attributeName="stop-opacity" values="0.4;0.75;0.4" dur={breathe} repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor={c2} stopOpacity="0"/>
          </radialGradient>

          {/* Стеклянный блик — верхний левый */}
          <radialGradient id={`${id}-hl`} cx="30%" cy="24%" r="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.92"/>
            <stop offset="50%" stopColor="white" stopOpacity="0.20"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          {/* Нижний отсвет — мягкий */}
          <radialGradient id={`${id}-bl`} cx="65%" cy="78%" r="28%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.20"/>
            <stop offset="100%" stopColor={c1} stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r={r}/>
          </clipPath>
        </defs>

        {/* ═══ СЛОЙ 1: Ядро глобуса ═══ */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-core)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-inner)`}/>

        {/* ═══ СЛОЙ 2: Голограммная сетка — вращается ═══ */}
        <g clipPath={`url(#${id}-clip)`} opacity="0.45">
          {/* Меридианы — вращение */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 50 50;360 50 50" dur="24s" repeatCount="indefinite"/>
            <ellipse cx="50" cy="50" rx="8" ry={r} fill="none" stroke={`${grid}0.6)`} strokeWidth="0.5"/>
            <ellipse cx="50" cy="50" rx="20" ry={r} fill="none" stroke={`${grid}0.45)`} strokeWidth="0.45"/>
            <ellipse cx="50" cy="50" rx="32" ry={r} fill="none" stroke={`${grid}0.35)`} strokeWidth="0.4"/>
            <ellipse cx="50" cy="50" rx={r} ry={r} fill="none" stroke={`${grid}0.2)`} strokeWidth="0.3"/>
          </g>

          {/* Параллели — дуги (не прямые линии — реалистичный глобус) */}
          <ellipse cx="50" cy="30" rx="34" ry="4" fill="none" stroke={`${grid}0.3)`} strokeWidth="0.35"/>
          <ellipse cx="50" cy="40" rx="39" ry="3" fill="none" stroke={`${grid}0.35)`} strokeWidth="0.4"/>
          <ellipse cx="50" cy="50" rx={r} ry="2" fill="none" stroke={`${grid}0.45)`} strokeWidth="0.5">
            <animate attributeName="stroke-opacity" values="0.35;0.6;0.35" dur="3s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="50" cy="60" rx="39" ry="3" fill="none" stroke={`${grid}0.35)`} strokeWidth="0.4"/>
          <ellipse cx="50" cy="70" rx="34" ry="4" fill="none" stroke={`${grid}0.3)`} strokeWidth="0.35"/>
        </g>

        {/* ═══ СЛОЙ 3: Энергетические кольца ═══ */}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Главное кольцо — наклонённое, вращается */}
          <ellipse cx="50" cy="50" rx={r - 3} ry="14" fill="none"
            stroke={ring} strokeWidth="1" strokeDasharray="5 3" opacity="0.55">
            <animateTransform attributeName="transform" type="rotate"
              values="20 50 50;380 50 50" dur="8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.35;0.65;0.35" dur="2.5s" repeatCount="indefinite"/>
          </ellipse>

          {/* Второе кольцо — обратное */}
          <ellipse cx="50" cy="50" rx={r - 8} ry="9" fill="none"
            stroke={particle} strokeWidth="0.6" strokeDasharray="2 4" opacity="0.3">
            <animateTransform attributeName="transform" type="rotate"
              values="65 50 50;-295 50 50" dur="12s" repeatCount="indefinite"/>
          </ellipse>

          {/* Третье кольцо — вертикальное, медленное */}
          <ellipse cx="50" cy="50" rx="6" ry={r - 4} fill="none"
            stroke={`${grid}0.25)`} strokeWidth="0.5" strokeDasharray="4 6" opacity="0.25">
            <animateTransform attributeName="transform" type="rotate"
              values="-10 50 50;350 50 50" dur="18s" repeatCount="indefinite"/>
          </ellipse>
        </g>

        {/* ═══ СЛОЙ 4: Частицы — энергетические точки ═══ */}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Быстрая яркая частица */}
          <circle r="2.2" fill={particle}>
            <animateMotion dur="3.5s" repeatCount="indefinite"
              path="M12,50 A38,13 0 1,1 88,50 A38,13 0 1,1 12,50"/>
            <animate attributeName="opacity" values="0.2;1;0.2" dur="3.5s" repeatCount="indefinite"/>
          </circle>

          {/* Вертикальная частица */}
          <circle r="1.6" fill="white">
            <animateMotion dur="6s" repeatCount="indefinite"
              path="M50,10 A10,40 0 1,1 50,90 A10,40 0 1,1 50,10"/>
            <animate attributeName="opacity" values="0.1;0.6;0.1" dur="6s" repeatCount="indefinite"/>
          </circle>

          {/* Диагональная частица */}
          <circle r="1.8" fill={glow}>
            <animateMotion dur="5s" repeatCount="indefinite"
              path="M22,22 A30,30 0 1,1 78,78 A30,30 0 1,1 22,22"/>
            <animate attributeName="opacity" values="0;0.85;0" dur="5s" repeatCount="indefinite"/>
          </circle>

          {/* Мелкая быстрая */}
          <circle r="1" fill="white">
            <animateMotion dur="2.8s" repeatCount="indefinite"
              path="M18,40 A32,16 0 1,1 82,60 A32,16 0 1,1 18,40"/>
            <animate attributeName="opacity" values="0;0.5;0" dur="2.8s" repeatCount="indefinite"/>
          </circle>

          {/* Пятая частица — медленная большая */}
          <circle r="2.5" fill={ring}>
            <animateMotion dur="9s" repeatCount="indefinite"
              path="M35,12 A20,40 0 1,0 65,88 A20,40 0 1,0 35,12"/>
            <animate attributeName="opacity" values="0.05;0.45;0.05" dur="9s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ═══ СЛОЙ 5: Блики и финиш ═══ */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-bl)`}/>

        {/* Тончайший ободок — не обводка, а свечение края */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={glow} strokeWidth="0.6" opacity="0.35">
          <animate attributeName="stroke-opacity" values="0.2;0.45;0.2" dur={breathe} repeatCount="indefinite"/>
        </circle>
      </svg>

      {/* Badge — непрочитанные */}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-pulse"
          style={{ background: "#ef4444", boxShadow: "0 0 8px rgba(239,68,68,0.8)", border: "2px solid rgba(0,0,0,0.3)" }} />
      )}

      {/* Badge — число */}
      {!badge && badgeCount != null && badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          style={{ background: `linear-gradient(135deg,${c2},${c1})`, boxShadow: `0 0 6px ${glow}50` }}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}

      {/* CSS keyframes для дыхания */}
      <style>{`
        @keyframes arayBreathe {
          0%, 100% { box-shadow: ${glowShadow}; }
          50% { box-shadow: ${activeGlowShadow}; }
        }
      `}</style>
    </div>
  );
}
