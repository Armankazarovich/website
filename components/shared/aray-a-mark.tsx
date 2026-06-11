import type { CSSProperties } from "react";

type ArayAMarkProps = {
  size?: number | string;
  className?: string;
  title?: string;
  idPrefix?: string;
  variant?: "official" | "live" | "mono-light" | "mono-dark";
};

type GradientTone = "hot" | "deep";

const CORELDRAW_GRADIENTS: Array<{
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  tone: GradientTone;
}> = [
  { x1: "2667", y1: "2325.53", x2: "4177.84", y2: "2325.53", tone: "hot" },
  { x1: "2372.71", y1: "2608.41", x2: "3848.77", y2: "2608.41", tone: "hot" },
  { x1: "2372.72", y1: "1319.51", x2: "3015.22", y2: "1319.51", tone: "hot" },
  { x1: "253.05", y1: "3385.93", x2: "3335.01", y2: "3385.93", tone: "hot" },
  { x1: "253.05", y1: "2930.15", x2: "3002.14", y2: "2930.15", tone: "hot" },
  { x1: "888.92", y1: "2632.2", x2: "1315.52", y2: "1751.48", tone: "hot" },
  { x1: "1346.51", y1: "2534.93", x2: "1738.82", y2: "1725", tone: "hot" },
  { x1: "2676.83", y1: "2321.27", x2: "4187.68", y2: "2321.27", tone: "deep" },
  { x1: "2382.55", y1: "2604.15", x2: "3858.61", y2: "2604.15", tone: "deep" },
  { x1: "2382.55", y1: "1315.25", x2: "3025.05", y2: "1315.25", tone: "deep" },
  { x1: "262.87", y1: "3382.47", x2: "3344.83", y2: "3382.47", tone: "deep" },
  { x1: "262.87", y1: "2926.69", x2: "3011.96", y2: "2926.69", tone: "deep" },
  { x1: "898.74", y1: "2632.11", x2: "1325.34", y2: "1751.39", tone: "deep" },
  { x1: "1356.33", y1: "2534.84", x2: "1748.65", y2: "1724.9", tone: "deep" },
];

const CORELDRAW_POLYGONS = [
  { gradient: 0, points: "3848.77,3632.19 4177.84,3037.95 3015.21,1018.86 2666.99,1621.75" },
  { gradient: 1, points: "3848.77,3632.19 3601.33,3630.79 2372.71,1584.63 2666.99,1621.75" },
  { gradient: 2, points: "2372.71,1586.93 2723.39,1017.26 3015.21,1018.86 2666.99,1621.75" },
  { gradient: 3, points: "253.04,3080.87 541.97,3684.25 3335,3690.98 3002.13,3082.58" },
  { gradient: 4, points: "253.04,3080.91 407.59,2777.72 2786.06,2784.1 3002.13,3082.58" },
  { gradient: 5, points: "1216.35,2398.81 569.36,2398.81 1749.15,361.38 2421.45,368.11" },
  { gradient: 6, points: "1214.7,2398.81 1552.17,2299.68 2593.79,561.11 2421.45,368.11" },
  { gradient: 7, points: "3858.61,3627.93 4187.67,3033.69 3025.05,1014.6 2676.82,1617.49" },
  { gradient: 8, points: "3858.61,3627.93 3611.16,3626.53 2382.55,1580.36 2676.82,1617.49" },
  { gradient: 9, points: "2382.55,1582.68 2733.22,1013 3025.05,1014.6 2676.82,1617.49" },
  { gradient: 10, points: "262.86,3077.41 551.81,3680.79 3344.82,3687.52 3011.95,3079.12" },
  { gradient: 11, points: "262.86,3077.45 417.43,2774.26 2795.88,2780.63 3011.95,3079.12" },
  { gradient: 12, points: "1226.18,2398.72 579.18,2398.72 1758.97,361.28 2431.28,368" },
  { gradient: 13, points: "1224.54,2398.72 1562,2299.59 2603.62,561 2431.28,368" },
];

export function ArayAMark({
  size = 112,
  className = "",
  title = "ARAY",
  idPrefix = "aray-a-mark",
  variant = "live",
}: ArayAMarkProps) {
  const officialVars = {
    "--aray-a-hot": "hsl(var(--primary))",
    "--aray-a-mid": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--foreground)) 18%)",
    "--aray-a-deep": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--background)) 42%)",
    "--aray-a-warm": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--accent)) 28%)",
    "--aray-a-shadow": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--background)) 64%)",
    "--aray-a-glow": "hsl(var(--primary) / 0.34)",
  };
  const liveVars = {
    "--aray-a-hot": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--primary)) 42%)",
    "--aray-a-mid": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--foreground)) 12%)",
    "--aray-a-deep": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--background)) 50%)",
    "--aray-a-warm": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--accent)) 24%)",
    "--aray-a-shadow": "color-mix(in srgb, hsl(var(--primary)), hsl(var(--background)) 70%)",
    "--aray-a-glow": "hsl(var(--primary) / 0.38)",
  };
  const monoLightVars = {
    "--aray-a-hot": "hsl(var(--primary-foreground))",
    "--aray-a-mid": "hsl(var(--muted))",
    "--aray-a-deep": "hsl(var(--muted-foreground))",
    "--aray-a-warm": "hsl(var(--card))",
    "--aray-a-shadow": "hsl(var(--border))",
    "--aray-a-glow": "hsl(var(--primary-foreground) / 0.2)",
  };
  const monoDarkVars = {
    "--aray-a-hot": "hsl(var(--foreground))",
    "--aray-a-mid": "hsl(var(--muted-foreground))",
    "--aray-a-deep": "hsl(var(--background))",
    "--aray-a-warm": "hsl(var(--card))",
    "--aray-a-shadow": "hsl(var(--background))",
    "--aray-a-glow": "hsl(var(--background) / 0.16)",
  };
  const variantVars =
    variant === "official"
      ? officialVars
      : variant === "mono-light"
        ? monoLightVars
        : variant === "mono-dark"
          ? monoDarkVars
          : liveVars;

  const style = {
    width: typeof size === "number" ? `${size}px` : size,
    height: "auto",
    ...variantVars,
  } as CSSProperties;

  const gradients = CORELDRAW_GRADIENTS.map((gradient, index) => ({
    ...gradient,
    id: `${idPrefix}-corel-${index}`,
  }));
  const glowGradient = `${idPrefix}-inner-glow`;
  const glowFilter = `${idPrefix}-soft-glow`;
  const useGlow = variant === "live";

  return (
    <svg
      className={className}
      viewBox="0 0 4334.92 4334.92"
      role="img"
      aria-label={title}
      style={style}
      shapeRendering="geometricPrecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        {gradients.map((gradient) => (
          <linearGradient
            key={gradient.id}
            id={gradient.id}
            gradientUnits="userSpaceOnUse"
            x1={gradient.x1}
            y1={gradient.y1}
            x2={gradient.x2}
            y2={gradient.y2}
          >
            {gradient.tone === "hot" ? (
              <>
                <stop offset="0" stopColor="var(--aray-a-deep)" />
                <stop offset="0.529412" stopColor="var(--aray-a-mid)" />
                <stop offset="1" stopColor="var(--aray-a-hot)" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="var(--aray-a-deep)" />
                <stop offset="0.529412" stopColor="var(--aray-a-shadow)" />
                <stop offset="1" stopColor="var(--aray-a-warm)" />
              </>
            )}
          </linearGradient>
        ))}
        <radialGradient
          id={glowGradient}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(1180 0 0 1040 2150 2210)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="white" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="var(--aray-a-glow)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--aray-a-glow)" stopOpacity="0" />
        </radialGradient>
        <filter id={glowFilter} x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="22" result="blur" />
          <feColorMatrix
            in="blur"
            result="glow"
            type="matrix"
            values="1 0 0 0 0 0 0.32 0 0 0 0 0 0.46 0 0 0 0 0 0.32 0"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {useGlow ? (
        <circle cx="2150" cy="2210" r="1180" fill={`url(#${glowGradient})`} opacity="0.24" />
      ) : null}
      <g filter={useGlow ? `url(#${glowFilter})` : undefined} fillRule="nonzero" clipRule="evenodd">
        {CORELDRAW_POLYGONS.map((polygon, index) => (
          <polygon
            key={`${polygon.points}-${index}`}
            points={polygon.points}
            fill={`url(#${gradients[polygon.gradient].id})`}
          />
        ))}
      </g>
    </svg>
  );
}
