import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = Number(req.nextUrl.searchParams.get("s") ?? 512);
  const r = Math.round(s * 0.42);
  const cx = Math.round(s / 2);
  const cy = Math.round(s / 2);

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
          borderRadius: Math.round(s * 0.22),
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow behind ball */}
        <div
          style={{
            position: "absolute",
            width: Math.round(s * 0.88),
            height: Math.round(s * 0.88),
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, rgba(232,112,10,0.22) 0%, transparent 70%)",
            top: Math.round(s * 0.06),
            left: Math.round(s * 0.06),
            display: "flex",
          }}
        />

        {/* Orange ball */}
        <div
          style={{
            position: "absolute",
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            top: cy - r,
            left: cx - r,
            background: "radial-gradient(circle at 36% 30%, #FFBB6B 0%, #FF8C2A 22%, #E8700A 48%, #C45500 72%, #8B3200 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Main shine */}
          <div
            style={{
              position: "absolute",
              top: "12%",
              left: "16%",
              width: "38%",
              height: "30%",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.20) 40%, transparent 100%)",
              display: "flex",
            }}
          />
          {/* Small bright spot */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "24%",
              width: "15%",
              height: "11%",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.72)",
              display: "flex",
            }}
          />
        </div>

        {/* ARAY label */}
        <div
          style={{
            position: "absolute",
            bottom: Math.round(s * 0.07),
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: Math.round(s * 0.082),
            fontWeight: 700,
            color: "rgba(255,255,255,0.50)",
            fontFamily: "sans-serif",
            letterSpacing: Math.round(s * 0.022),
            display: "flex",
            justifyContent: "center",
          }}
        >
          ARAY
        </div>
      </div>
    ),
    { width: s, height: s }
  );
}
