"use client";

/**
 * ArayOrb — золотой глобус Арая ✨
 * Вращающиеся меридианы + пульсирующее свечение.
 * Единый компонент для всех мест: store dock, admin dock, floating button, chat.
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
  const isActive = pulse === "listening" || pulse === "speaking";
  const r = 42; // Радиус глобуса

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>

      {/* Живое свечение */}
      <span
        className="absolute rounded-full"
        style={{
          inset: -6,
          background: isActive
            ? `radial-gradient(circle, ${pulse === "listening" ? "rgba(59,130,246,0.5)" : "rgba(52,211,153,0.45)"} 30%, transparent 70%)`
            : "radial-gradient(circle, rgba(255,170,40,0.5) 15%, rgba(220,120,10,0.2) 45%, transparent 70%)",
          animation: isActive
            ? `arayGlow ${pulse === "listening" ? "0.8s" : "1.2s"} ease-out infinite`
            : "arayBreath 3.5s ease-in-out infinite",
        }}
      />

      <svg
        width={size} height={size} viewBox="0 0 100 100"
        className="relative"
        style={{
          display: "block",
          filter: "drop-shadow(0 2px 10px rgba(220,130,20,0.6)) drop-shadow(0 0 20px rgba(255,170,40,0.35))",
        }}
      >
        <defs>
          {/* Фоновый градиент сферы */}
          <radialGradient id={`${id}-bg`} cx="38%" cy="32%" r="65%">
            <stop offset="0%"   stopColor="#fff8e0"/>
            <stop offset="15%"  stopColor="#ffd54f"/>
            <stop offset="35%"  stopColor="#f0a020"/>
            <stop offset="60%"  stopColor="#c06800"/>
            <stop offset="82%"  stopColor="#6a2400"/>
            <stop offset="100%" stopColor="#1a0500"/>
          </radialGradient>

          {/* Затемнение снизу-справа */}
          <radialGradient id={`${id}-sh`} cx="68%" cy="70%" r="50%">
            <stop offset="0%"  stopColor="#000" stopOpacity="0.7"/>
            <stop offset="50%" stopColor="#000" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>

          {/* Блик сверху */}
          <radialGradient id={`${id}-hl`} cx="35%" cy="28%" r="32%">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.9"/>
            <stop offset="45%"  stopColor="#fff" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>

          {/* Свечение ободка */}
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="80%"  stopColor="transparent"/>
            <stop offset="92%"  stopColor="#ffaa30" stopOpacity="0.5">
              <animate attributeName="stop-opacity" values="0.4;0.7;0.4" dur="2.5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="#ffd060" stopOpacity="0.8">
              <animate attributeName="stop-opacity" values="0.6;0.95;0.6" dur="2.5s" repeatCount="indefinite"/>
            </stop>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r={r}/>
          </clipPath>
        </defs>

        {/* Сфера */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-bg)`}/>
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-sh)`}/>

        {/* ── Вращающиеся меридианы (глобус!) ── */}
        <g clipPath={`url(#${id}-clip)`} opacity="0.45">
          {/* Группа меридианов — вращается */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 50 50;360 50 50" dur="20s" repeatCount="indefinite"/>

            {/* Меридианы — эллипсы с разным наклоном */}
            <ellipse cx="50" cy="50" rx="42" ry="42" fill="none" stroke="#ffd060" strokeWidth="0.6" opacity="0.5"/>
            <ellipse cx="50" cy="50" rx="10" ry="42" fill="none" stroke="#ffd060" strokeWidth="0.7"/>
            <ellipse cx="50" cy="50" rx="24" ry="42" fill="none" stroke="#ffd060" strokeWidth="0.6"/>
            <ellipse cx="50" cy="50" rx="36" ry="42" fill="none" stroke="#ffd060" strokeWidth="0.5" opacity="0.7"/>
          </g>

          {/* Параллели — неподвижные */}
          <ellipse cx="50" cy="30" rx="36" ry="6"  fill="none" stroke="#ffd060" strokeWidth="0.5" opacity="0.4"/>
          <ellipse cx="50" cy="50" rx="42" ry="8"  fill="none" stroke="#ffd060" strokeWidth="0.7" opacity="0.6"/>
          <ellipse cx="50" cy="70" rx="36" ry="6"  fill="none" stroke="#ffd060" strokeWidth="0.5" opacity="0.4"/>

          {/* Бегущая точка света */}
          <circle r="3" fill="#fff8d0" opacity="0.5">
            <animateMotion dur="5s" repeatCount="indefinite"
              path="M8,50 A42,14 0 1,1 92,50 A42,14 0 1,1 8,50"/>
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="5s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* Свечение ободка */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-rim)`}/>

        {/* Блик */}
        <circle cx="50" cy="50" r={r} fill={`url(#${id}-hl)`}/>

        {/* Тонкий контур */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,200,60,0.3)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.3;0.55;0.3" dur="3s" repeatCount="indefinite"/>
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
