"use client";

/**
 * ArayOrb — премиальная кристальная сфера Арая ✨
 * Стеклянная оболочка с золотой энергией внутри.
 * Уникальный, узнаваемый, роскошный.
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

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
        <defs>
          {/* ── Внутреннее золотое ядро — глубокая энергия ── */}
          <radialGradient id={`${id}-core`} cx="45%" cy="42%" r="55%">
            <stop offset="0%"  stopColor="#fff7e0"/>
            <stop offset="18%" stopColor="#ffd54f"/>
            <stop offset="40%" stopColor="#e89520"/>
            <stop offset="65%" stopColor="#a86010"/>
            <stop offset="85%" stopColor="#5a2a05"/>
            <stop offset="100%" stopColor="#1c0a00"/>
          </radialGradient>

          {/* ── Стеклянный слой — прозрачный с рефракцией ── */}
          <radialGradient id={`${id}-glass`} cx="32%" cy="26%" r="68%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.45"/>
            <stop offset="25%"  stopColor="#ffffff" stopOpacity="0.08"/>
            <stop offset="60%"  stopColor="#ffffff" stopOpacity="0"/>
            <stop offset="85%"  stopColor="#ffffff" stopOpacity="0.03"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12"/>
          </radialGradient>

          {/* ── Золотой обод — тонкое премиальное кольцо ── */}
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#ffd700"/>
            <stop offset="30%"  stopColor="#b8860b"/>
            <stop offset="50%"  stopColor="#ffd700"/>
            <stop offset="70%"  stopColor="#b8860b"/>
            <stop offset="100%" stopColor="#ffd700"/>
          </linearGradient>

          {/* ── Внутренний свет (пульсирующий центр) ── */}
          <radialGradient id={`${id}-inner`} cx="50%" cy="50%" r="35%">
            <stop offset="0%"  stopColor="#fff8d0" stopOpacity="0.7">
              <animate attributeName="stop-opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor="#ffcc44" stopOpacity="0.2">
              <animate attributeName="stop-opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0"/>
          </radialGradient>

          {/* ── Блик — верхний левый (стеклянное отражение) ── */}
          <radialGradient id={`${id}-hl`} cx="33%" cy="25%" r="25%">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.92"/>
            <stop offset="60%"  stopColor="#fff" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>

          {/* ── Нижний блик — отражение от поверхности ── */}
          <radialGradient id={`${id}-hl2`} cx="60%" cy="78%" r="20%">
            <stop offset="0%"   stopColor="#ffe880" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#ffe880" stopOpacity="0"/>
          </radialGradient>

          {/* ── Каустика (свет преломлённый сквозь стекло) ── */}
          <radialGradient id={`${id}-caust`} cx="50%" cy="50%" r="40%">
            <stop offset="0%"  stopColor="#ffeedd" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#ffcc88" stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r={r - 1}/>
          </clipPath>
        </defs>

        {/* ── Слой 1: Золотое ядро ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-core)`}/>

        {/* ── Слой 2: Пульсирующий внутренний свет ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-inner)`}/>

        {/* ── Слой 3: Живые энергетические потоки внутри ── */}
        <g clipPath={`url(#${id}-clip)`} opacity="0.55">
          {/* Поток 1 — медленная волна */}
          <ellipse rx="30" ry="4" fill={`url(#${id}-caust)`}>
            <animateMotion dur="7s" repeatCount="indefinite"
              path="M25,45 Q50,30 75,50 Q50,70 25,45"/>
            <animate attributeName="opacity" values="0.2;0.55;0.2" dur="7s" repeatCount="indefinite"/>
          </ellipse>

          {/* Поток 2 — перекрёстный */}
          <ellipse rx="22" ry="3" fill={`url(#${id}-caust)`}>
            <animateMotion dur="9s" repeatCount="indefinite"
              path="M30,60 Q55,35 70,55 Q45,75 30,60"/>
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="9s" repeatCount="indefinite"/>
          </ellipse>

          {/* Искра 1 — яркая точка */}
          <circle r="1.5" fill="#fff">
            <animateMotion dur="4s" repeatCount="indefinite"
              path="M30,40 Q50,25 70,45 Q55,65 30,55 Q25,45 30,40"/>
            <animate attributeName="opacity" values="0;0.7;0" dur="4s" repeatCount="indefinite"/>
          </circle>

          {/* Искра 2 */}
          <circle r="1" fill="#ffd700">
            <animateMotion dur="5.5s" repeatCount="indefinite"
              path="M60,35 Q35,50 55,70 Q75,55 60,35"/>
            <animate attributeName="opacity" values="0;0.5;0" dur="5.5s" repeatCount="indefinite"/>
          </circle>

          {/* Искра 3 */}
          <circle r="1.2" fill="#fff8e0">
            <animateMotion dur="6.5s" repeatCount="indefinite"
              path="M45,30 Q65,45 50,65 Q30,50 45,30"/>
            <animate attributeName="opacity" values="0;0.6;0" dur="6.5s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ── Слой 4: Стеклянная оболочка ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-glass)`}/>

        {/* ── Слой 5: Блики (поверх стекла) ── */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl2)`}/>

        {/* ── Слой 6: Премиальное золотое кольцо ── */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={`url(#${id}-ring)`} strokeWidth="1.2" opacity="0.6"/>
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
