"use client";

/**
 * ArayOrb — живой 3D шар Арая ☀️
 * Используется ВЕЗДЕ: store dock, admin dock, floating button, chat header.
 * Один компонент — один вид — везде.
 *
 * Анимации через CSS (transform, opacity) — GPU-ускоренные, не грузят CPU.
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

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>

      {/* ── Живое свечение (всегда, даже idle) ── */}
      <span
        className="absolute rounded-full"
        style={{
          inset: -4,
          background: isActive
            ? `radial-gradient(circle, ${pulse === "listening" ? "rgba(59,130,246,0.5)" : "rgba(52,211,153,0.45)"} 30%, transparent 70%)`
            : "radial-gradient(circle, rgba(232,120,10,0.55) 20%, rgba(200,80,0,0.25) 45%, transparent 70%)",
          animation: isActive
            ? `arayGlow ${pulse === "listening" ? "0.8s" : "1.2s"} ease-out infinite`
            : "arayBreath 3s ease-in-out infinite",
        }}
      />

      {/* ── SVG 3D Сфера с анимациями ── */}
      <svg
        width={size} height={size} viewBox="0 0 100 100"
        className="relative"
        style={{
          display: "block",
          filter: `drop-shadow(0 2px 8px rgba(200,80,0,0.5)) drop-shadow(0 0 14px rgba(232,112,10,0.4))`,
        }}
      >
        <defs>
          {/* Основной градиент — переливающийся */}
          <radialGradient id={`${id}-base`} cx="34%" cy="28%" r="70%">
            <stop offset="0%"   stopColor="#fffbe0">
              <animate attributeName="stopColor" values="#fffbe0;#fff5c0;#fffbe0" dur="4s" repeatCount="indefinite"/>
            </stop>
            <stop offset="10%"  stopColor="#ffca40">
              <animate attributeName="stopColor" values="#ffca40;#ffd860;#ffca40" dur="3.5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="28%"  stopColor="#f07800">
              <animate attributeName="stopColor" values="#f07800;#ff8c20;#f07800" dur="5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="52%"  stopColor="#c05000"/>
            <stop offset="75%"  stopColor="#6e1c00"/>
            <stop offset="100%" stopColor="#160300"/>
          </radialGradient>

          {/* Тень */}
          <radialGradient id={`${id}-dark`} cx="72%" cy="74%" r="52%">
            <stop offset="0%"   stopColor="#050000" stopOpacity="0.82"/>
            <stop offset="60%"  stopColor="#100200" stopOpacity="0.32"/>
            <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
          </radialGradient>

          {/* Краевое свечение — мерцающее */}
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="76%"  stopColor="transparent" stopOpacity="0"/>
            <stop offset="90%"  stopColor="#ff9500" stopOpacity="0.45">
              <animate attributeName="stopOpacity" values="0.45;0.65;0.45" dur="2.5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.70">
              <animate attributeName="stopOpacity" values="0.70;0.90;0.70" dur="2.5s" repeatCount="indefinite"/>
            </stop>
          </radialGradient>

          {/* Главный блик */}
          <radialGradient id={`${id}-hl`} cx="30%" cy="25%" r="34%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.85"/>
            <stop offset="50%"  stopColor="white" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          {/* Блик для вращения */}
          <radialGradient id={`${id}-orbit`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.6"/>
            <stop offset="60%"  stopColor="white" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          {/* Второй орбитальный блик */}
          <radialGradient id={`${id}-orbit2`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffd080" stopOpacity="0.45"/>
            <stop offset="70%"  stopColor="#ffa040" stopOpacity="0.08"/>
            <stop offset="100%" stopColor="#ffa040" stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r="46"/>
          </clipPath>
        </defs>

        {/* Базовый шар */}
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-dark)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-rim)`}/>

        {/* Вращающиеся орбитальные блики — ЖИВОЙ ШАР! */}
        <g clipPath={`url(#${id}-clip)`}>
          {/* Орбита 1 — медленное вращение */}
          <ellipse cx="50" cy="50" rx="30" ry="10" fill={`url(#${id}-orbit)`} opacity="0.45">
            <animateTransform attributeName="transform" type="rotate"
              values="0 50 50;360 50 50" dur="8s" repeatCount="indefinite"/>
          </ellipse>

          {/* Орбита 2 — наклонная, обратное вращение */}
          <ellipse cx="50" cy="50" rx="22" ry="8" fill={`url(#${id}-orbit2)`} opacity="0.35">
            <animateTransform attributeName="transform" type="rotate"
              values="60 50 50;-300 50 50" dur="12s" repeatCount="indefinite"/>
          </ellipse>

          {/* Бегущий блик по поверхности */}
          <circle r="4" fill="white" opacity="0.25">
            <animateMotion dur="6s" repeatCount="indefinite"
              path="M20,50 A30,12 0 1,1 80,50 A30,12 0 1,1 20,50"/>
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="6s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* Неподвижный главный блик */}
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`}/>

        {/* Ободок — мерцающий */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,160,30,0.35)" strokeWidth="1.5">
          <animate attributeName="stroke-opacity" values="0.35;0.55;0.35" dur="3s" repeatCount="indefinite"/>
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
