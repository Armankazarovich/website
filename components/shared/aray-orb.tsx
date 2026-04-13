"use client";

/**
 * ArayOrb v4 — Голографический глобус из будущего
 * Единый компонент — ОДИНАКОВЫЙ на всех устройствах.
 *
 * ВАЖНО для мобилок:
 * - НЕТ CSS filter (drop-shadow/blur) на SVG — они убивают GPU-анимации на iOS
 * - Все анимации только через SVG animate/animateTransform — работают везде
 * - Свечение через SVG radialGradient, не CSS box-shadow
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
  const r = 40; // радиус глобуса (из viewBox 100)

  const isListening = pulse === "listening";
  const isSpeaking = pulse === "speaking";
  const isActive = isListening || isSpeaking;

  // Палитра по состоянию
  const c1 = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ffb347";
  const c2 = isListening ? "#3b82f6" : isSpeaking ? "#10b981" : "#ff8c00";
  const c3 = isListening ? "#1e40af" : isSpeaking ? "#047857" : "#b45309";
  const c4 = isListening ? "#1e3a5f" : isSpeaking ? "#064e3b" : "#78350f";
  const glow = isListening ? "#60a5fa" : isSpeaking ? "#34d399" : "#ff9500";
  const glowA = isListening ? "rgba(96,165,250," : isSpeaking ? "rgba(52,211,153," : "rgba(255,149,0,";
  const grid = isListening ? "rgba(147,197,253," : isSpeaking ? "rgba(110,231,183," : "rgba(255,200,100,";
  const ring = isListening ? "#93c5fd" : isSpeaking ? "#6ee7b7" : "#fbbf24";
  const particle = isListening ? "#bfdbfe" : isSpeaking ? "#a7f3d0" : "#fde68a";

  const breathe = isActive ? "1.5s" : "4s";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={isListening ? "Арай слушает" : isSpeaking ? "Арай говорит" : "Арай — AI-ассистент"}
      style={{ width: size, height: size }}
    >
      {/* НИКАКИХ CSS filter/drop-shadow/box-shadow — всё внутри SVG! */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Ядро глобуса */}
          <radialGradient id={`${id}-core`} cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor={c1}>
              <animate attributeName="stopColor" values={`${c1};${c2};${c1}`} dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="30%" stopColor={c2}/>
            <stop offset="60%" stopColor={c3}/>
            <stop offset="85%" stopColor={c4}/>
            <stop offset="100%" stopColor="#050200"/>
          </radialGradient>

          {/* Внутреннее пульсирующее ядро */}
          <radialGradient id={`${id}-inner`} cx="45%" cy="42%" r="38%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.55">
              <animate attributeName="stop-opacity" values="0.35;0.7;0.35" dur={breathe} repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor={c2} stopOpacity="0"/>
          </radialGradient>

          {/* Свечение ВОКРУГ глобуса — мягкое, через SVG */}
          <radialGradient id={`${id}-aura`} cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor={glow} stopOpacity="0"/>
            <stop offset="90%" stopColor={glow} stopOpacity={isActive ? "0.18" : "0.08"}>
              <animate attributeName="stop-opacity"
                values={isActive ? "0.12;0.25;0.12" : "0.05;0.12;0.05"}
                dur={breathe} repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor={glow} stopOpacity={isActive ? "0.25" : "0.12"}>
              <animate attributeName="stop-opacity"
                values={isActive ? "0.18;0.35;0.18" : "0.08;0.18;0.08"}
                dur={breathe} repeatCount="indefinite"/>
            </stop>
          </radialGradient>

          {/* Блик стеклянный */}
          <radialGradient id={`${id}-hl`} cx="30%" cy="24%" r="28%">
            <stop offset="0%" stopColor="white" stopOpacity="0.88"/>
            <stop offset="50%" stopColor="white" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          {/* Нижний отсвет */}
          <radialGradient id={`${id}-bl`} cx="65%" cy="78%" r="24%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.15"/>
            <stop offset="100%" stopColor={c1} stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r={r}/>
          </clipPath>
        </defs>

        {/* ═══ Мягкая аура (свечение) ═══ */}
        <circle cx="50" cy="50" r="49" fill={`url(#${id}-aura)`}/>

        {/* ═══ СЛОЙ 1: Ядро глобуса ═══ */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-core)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-inner)`}/>

        {/* ═══ СЛОЙ 2: Голограммная сетка — вращается ═══ */}
        <g clipPath={`url(#${id}-clip)`} opacity="0.5">
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 50 50;360 50 50" dur="24s" repeatCount="indefinite"/>
            <ellipse cx="50" cy="50" rx="8" ry={r} fill="none" stroke={`${grid}0.55)`} strokeWidth="0.5"/>
            <ellipse cx="50" cy="50" rx="20" ry={r} fill="none" stroke={`${grid}0.4)`} strokeWidth="0.45"/>
            <ellipse cx="50" cy="50" rx="32" ry={r} fill="none" stroke={`${grid}0.3)`} strokeWidth="0.4"/>
          </g>

          {/* Параллели — дуги */}
          <ellipse cx="50" cy="30" rx="32" ry="4" fill="none" stroke={`${grid}0.28)`} strokeWidth="0.35"/>
          <ellipse cx="50" cy="40" rx="37" ry="3" fill="none" stroke={`${grid}0.32)`} strokeWidth="0.4"/>
          <ellipse cx="50" cy="50" rx={r} ry="2" fill="none" stroke={`${grid}0.45)`} strokeWidth="0.5">
            <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="50" cy="60" rx="37" ry="3" fill="none" stroke={`${grid}0.32)`} strokeWidth="0.4"/>
          <ellipse cx="50" cy="70" rx="32" ry="4" fill="none" stroke={`${grid}0.28)`} strokeWidth="0.35"/>
        </g>

        {/* ═══ СЛОЙ 3: Энергетические кольца ═══ */}
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="50" rx={r - 3} ry="13" fill="none"
            stroke={ring} strokeWidth="0.9" strokeDasharray="5 3" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate"
              values="20 50 50;380 50 50" dur="8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite"/>
          </ellipse>

          <ellipse cx="50" cy="50" rx={r - 8} ry="8" fill="none"
            stroke={particle} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3">
            <animateTransform attributeName="transform" type="rotate"
              values="65 50 50;-295 50 50" dur="12s" repeatCount="indefinite"/>
          </ellipse>

          <ellipse cx="50" cy="50" rx="6" ry={r - 4} fill="none"
            stroke={`${grid}0.22)`} strokeWidth="0.45" strokeDasharray="4 6" opacity="0.2">
            <animateTransform attributeName="transform" type="rotate"
              values="-10 50 50;350 50 50" dur="18s" repeatCount="indefinite"/>
          </ellipse>
        </g>

        {/* ═══ СЛОЙ 4: Частицы ═══ */}
        <g clipPath={`url(#${id}-clip)`}>
          <circle r="2" fill={particle}>
            <animateMotion dur="3.5s" repeatCount="indefinite"
              path="M12,50 A38,13 0 1,1 88,50 A38,13 0 1,1 12,50"/>
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3.5s" repeatCount="indefinite"/>
          </circle>

          <circle r="1.5" fill="white">
            <animateMotion dur="6s" repeatCount="indefinite"
              path="M50,12 A10,38 0 1,1 50,88 A10,38 0 1,1 50,12"/>
            <animate attributeName="opacity" values="0.1;0.55;0.1" dur="6s" repeatCount="indefinite"/>
          </circle>

          <circle r="1.6" fill={glow}>
            <animateMotion dur="5s" repeatCount="indefinite"
              path="M22,22 A28,28 0 1,1 78,78 A28,28 0 1,1 22,22"/>
            <animate attributeName="opacity" values="0;0.8;0" dur="5s" repeatCount="indefinite"/>
          </circle>

          <circle r="0.9" fill="white">
            <animateMotion dur="2.8s" repeatCount="indefinite"
              path="M18,40 A32,16 0 1,1 82,60 A32,16 0 1,1 18,40"/>
            <animate attributeName="opacity" values="0;0.5;0" dur="2.8s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ═══ СЛОЙ 5: Блики ═══ */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-bl)`}/>

        {/* Тончайший край — едва заметный */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={glow} strokeWidth="0.5" opacity="0.25">
          <animate attributeName="stroke-opacity" values="0.15;0.35;0.15" dur={breathe} repeatCount="indefinite"/>
        </circle>
      </svg>

      {/* Badge */}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-pulse"
          style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.7)", border: "2px solid rgba(0,0,0,0.3)" }} />
      )}
      {!badge && badgeCount != null && badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          style={{ background: `linear-gradient(135deg,${c2},${c1})` }}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}
