import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const s = Number(req.nextUrl.searchParams.get("s") ?? 512);
  const r = s * 0.42; // радиус шара
  const cx = s / 2;
  const cy = s / 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 30% 20%, #1A1035 0%, #080C1E 60%, #04060F 100%)",
          borderRadius: s * 0.22,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Фоновое свечение */}
        <div
          style={{
            position: "absolute",
            width: s * 0.9,
            height: s * 0.9,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, rgba(232,112,10,0.18) 0%, transparent 70%)",
            top: s * 0.05,
            left: s * 0.05,
          }}
        />

        {/* Оранжевый шар */}
        <div
          style={{
            position: "absolute",
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            top: cx - r,
            left: cy - r,
            background:
              "radial-gradient(circle at 36% 30%, #FFBB6B 0%, #FF8C2A 22%, #E8700A 48%, #C45500 72%, #8B3200 100%)",
            boxShadow: `
              0 0 ${s * 0.06}px rgba(232,112,10,0.9),
              0 0 ${s * 0.12}px rgba(232,112,10,0.55),
              0 0 ${s * 0.22}px rgba(232,112,10,0.28),
              inset 0 ${s * -0.04}px ${s * 0.06}px rgba(0,0,0,0.35)
            `,
          }}
        >
          {/* Блик */}
          <div
            style={{
              position: "absolute",
              top: "13%",
              left: "18%",
              width: "36%",
              height: "28%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 40%, transparent 100%)",
              transform: "rotate(-25deg)",
            }}
          />
          {/* Маленький блик */}
          <div
            style={{
              position: "absolute",
              top: "22%",
              left: "26%",
              width: "14%",
              height: "10%",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.70)",
              filter: `blur(${s * 0.005}px)`,
            }}
          />
        </div>

        {/* Буква А */}
        <div
          style={{
            position: "absolute",
            bottom: s * 0.08,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: s * 0.085,
            fontWeight: 700,
            color: "rgba(255,255,255,0.55)",
            fontFamily: "sans-serif",
            letterSpacing: s * 0.025,
            textTransform: "uppercase",
          }}
        >
          АРАЙ
        </div>
      </div>
    ),
    { width: s, height: s }
  );
}
