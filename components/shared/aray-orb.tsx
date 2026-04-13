"use client";

/**
 * ArayOrb — чистый золотой глобус Арая ✨
 * Все анимации ВНУТРИ. Без теней и свечения снаружи.
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
  const r = 43;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>

      <svg width={size} height={size} viewBox="0 0 100 100" className="relative" style={{ display: "block" }}>
        <defs>
          {/* Чистый золотой градиент — светлый, без грязи */}
          <radialGradient id={`${id}-bg`} cx="38%" cy="30%" r="62%">
            <stop offset="0%"   stopColor="#fffdf0"/>
            <stop offset="12%"  stopColor="#ffe680"/>
            <stop offset="30%"  stopColor="#ffcc33"/>
            <stop offset="50%"  stopColor="#e8a010"/>
            <stop offset="72%"  stopColor="#b87008"/>
            <stop offset="90%"  stopColor="#7a4005"/>
            <stop offset="100%" stopColor="#4a2003"/>
          </radialGradient>

          {/* Мягкая тень снизу — внутренняя */}
          <radialGradient id={`${id}-sh`} cx="65%" cy="68%" r="45%">
            <stop offset="0%"  stopColor="#3a1800" stopOpacity="0.5"/>
            <stop offset="60%" stopColor="#1a0800" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>

          {/* Блик сверху — чистый белый */}
          <radialGradient id={`${id}-hl`} cx="36%" cy="28%" r="30%">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.95"/>
            <stop offset="40%"  stopColor="#fff" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>

          {/* Маленький вторичный блик */}
          <radialGradient id={`${id}-hl2`} cx="62%" cy="72%" r="18%">
            <stop offset="0%"   stopColor="#ffe080" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#ffe080" stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r={r}/>
          </clipPath>
        </defs>

        {/* Сфера — чистый золотой */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-bg)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-sh)`}/>

        {/* ── Вращающиеся меридианы внутри ── */}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Меридианы — вращаются */}
          <g opacity="0.4" stroke="#ffd860" fill="none">
            <animateTransform attributeName="transform" type="rotate"
              values="0 50 50;360 50 50" dur="20s" repeatCount="indefinite"/>
            <ellipse cx="50" cy="50" rx="10" ry={r} strokeWidth="0.7"/>
            <ellipse cx="50" cy="50" rx="24" ry={r} strokeWidth="0.6"/>
            <ellipse cx="50" cy="50" rx="36" ry={r} strokeWidth="0.5"/>
          </g>

          {/* Параллели — неподвижные */}
          <g opacity="0.3" stroke="#ffd860" fill="none">
            <ellipse cx="50" cy="28" rx="33" ry="5.5" strokeWidth="0.5"/>
            <ellipse cx="50" cy="50" rx={r} ry="7.5" strokeWidth="0.6"/>
            <ellipse cx="50" cy="72" rx="33" ry="5.5" strokeWidth="0.5"/>
          </g>

          {/* Бегущая точка света по экватору */}
          <circle r="2.5" fill="#fff" opacity="0.4">
            <animateMotion dur="5s" repeatCount="indefinite"
              path="M7,50 A43,12 0 1,1 93,50 A43,12 0 1,1 7,50"/>
            <animate attributeName="opacity" values="0.15;0.5;0.15" dur="5s" repeatCount="indefinite"/>
          </circle>

          {/* Второй бегущий блик — медленнее, по наклонной орбите */}
          <circle r="2" fill="#ffe880" opacity="0.3">
            <animateMotion dur="8s" repeatCount="indefinite"
              path="M20,30 A35,20 30 1,1 80,70 A35,20 30 1,1 20,30"/>
            <animate attributeName="opacity" values="0.1;0.35;0.1" dur="8s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* Блики — поверх всего */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl2)`}/>

        {/* Тонкий чистый контур */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(200,150,50,0.25)" strokeWidth="0.8"/>
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
