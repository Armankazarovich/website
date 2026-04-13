"use client";

/**
 * ArayOrb — единый 3D шар Арая.
 * Используется ВЕЗДЕ: store dock, admin dock, floating button, chat header.
 * Один компонент — один вид — везде.
 */

interface ArayOrbProps {
  /** Размер шара в px (ширина = высота) */
  size?: number;
  /** Уникальный id-префикс для SVG-градиентов (нужен если несколько на странице) */
  id?: string;
  /** Пульсация (listening / idle / speaking) */
  pulse?: "idle" | "listening" | "speaking" | "none";
  /** Показать badge (непрочитанные) */
  badge?: boolean;
  /** Количество для badge (корзина и т.д.) */
  badgeCount?: number;
}

export function ArayOrb({
  size = 52,
  id = "aray",
  pulse = "idle",
  badge = false,
  badgeCount,
}: ArayOrbProps) {
  const glowColor =
    pulse === "listening" ? "rgba(59,130,246,0.45)"
    : pulse === "speaking" ? "rgba(52,211,153,0.40)"
    : "rgba(200,80,0,0.55)";

  const glowSpread =
    pulse === "listening" ? "rgba(59,130,246,0.25)"
    : pulse === "speaking" ? "rgba(52,211,153,0.20)"
    : "rgba(232,112,10,0.35)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Пульсирующий ореол — только при активном состоянии (listening/speaking) */}
      {(pulse === "listening" || pulse === "speaking") && (
        <span
          className="absolute rounded-full"
          style={{
            inset: 0,
            background: `radial-gradient(circle, ${
              pulse === "listening" ? "rgba(59,130,246,0.35)"
              : "rgba(52,211,153,0.30)"
            } 40%, transparent 70%)`,
            animation: `arayPulse ${pulse === "listening" ? "0.8s" : "1.2s"} ease-out infinite`,
          }}
        />
      )}

      {/* SVG 3D Сфера */}
      <svg
        width={size} height={size} viewBox="0 0 100 100"
        className="relative"
        style={{
          display: "block",
          filter: `drop-shadow(0 3px 10px ${glowColor}) drop-shadow(0 0 6px ${glowSpread})`,
        }}
      >
        <defs>
          {/* Основной градиент шара */}
          <radialGradient id={`${id}-base`} cx="34%" cy="28%" r="70%">
            <stop offset="0%"   stopColor="#fffbe0"/>
            <stop offset="10%"  stopColor="#ffca40"/>
            <stop offset="28%"  stopColor="#f07800"/>
            <stop offset="52%"  stopColor="#c05000"/>
            <stop offset="75%"  stopColor="#6e1c00"/>
            <stop offset="100%" stopColor="#160300"/>
          </radialGradient>

          {/* Тень нижняя правая */}
          <radialGradient id={`${id}-dark`} cx="72%" cy="74%" r="52%">
            <stop offset="0%"   stopColor="#050000" stopOpacity="0.82"/>
            <stop offset="60%"  stopColor="#100200" stopOpacity="0.32"/>
            <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
          </radialGradient>

          {/* Ободок — краевое свечение */}
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="76%"  stopColor="transparent" stopOpacity="0"/>
            <stop offset="90%"  stopColor="#ff9500"  stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.70"/>
          </radialGradient>

          {/* Основной блик — верхний левый (фиксирован) */}
          <radialGradient id={`${id}-hl`} cx="30%" cy="25%" r="34%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.85"/>
            <stop offset="50%"  stopColor="white" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          {/* Орбитальный блик для анимации вращения */}
          <radialGradient id={`${id}-orbit`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.55"/>
            <stop offset="60%"  stopColor="white" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>

          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r="46"/>
          </clipPath>
        </defs>

        {/* Базовый шар */}
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-dark)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-rim)`}/>

        {/* Статичные орбитальные блики (без анимации — экономия CPU/GPU) */}
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="50" rx="28" ry="10" fill={`url(#${id}-orbit)`} opacity="0.40" transform="rotate(25 50 50)"/>
          <ellipse cx="68" cy="36" rx="5" ry="3" fill="white" opacity="0.22" transform="rotate(-15 68 36)"/>
        </g>

        {/* Неподвижный главный блик */}
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`}/>

        {/* Тонкий контур */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,210,80,0.20)" strokeWidth="1"/>

        {/* Ободок — статичный */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,160,30,0.35)" strokeWidth="1.5"/>
      </svg>

      {/* Badge — непрочитанные */}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-pulse"
          style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.7)", border: "2px solid rgba(0,0,0,0.3)" }} />
      )}

      {/* Badge — число (корзина и т.д.) */}
      {!badge && badgeCount != null && badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)" }}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}
