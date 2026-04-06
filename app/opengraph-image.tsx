import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ПилоРус — Пиломатериалы от производителя";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a0f00 0%, #2d1800 40%, #1a0f00 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Orange accent line top */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "6px",
          background: "linear-gradient(90deg, #e8700a, #f59020, #e8700a)",
        }} />

        {/* Logo area */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            width: "80px", height: "80px",
            background: "linear-gradient(135deg, #e8700a, #f59020)",
            borderRadius: "20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(232,112,10,0.4)",
          }}>
            <div style={{
              fontSize: "40px", fontWeight: "900", color: "white",
              letterSpacing: "-2px",
            }}>П</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              fontSize: "48px", fontWeight: "900", color: "white",
              letterSpacing: "2px", lineHeight: 1,
            }}>ПилоРус</div>
            <div style={{
              fontSize: "18px", color: "rgba(255,255,255,0.6)",
              marginTop: "4px", letterSpacing: "1px",
            }}>Пиломатериалы от производителя</div>
          </div>
        </div>

        {/* Main message */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            fontSize: "62px", fontWeight: "900", color: "white",
            lineHeight: 1.1, maxWidth: "700px",
          }}>
            Доска, брус, вагонка
            <span style={{ color: "#e8700a" }}> — напрямую</span>
          </div>
          <div style={{
            fontSize: "26px", color: "rgba(255,255,255,0.7)",
            maxWidth: "600px", lineHeight: 1.4,
          }}>
            Химки, Московская обл. · Склад 2000 м²
          </div>
        </div>

        {/* Bottom badges */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {["🚚 Доставка 1-3 дня", "📦 Опт и розница", "✅ ГОСТ продукция", "💰 Цены от завода"].map((badge) => (
            <div key={badge} style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(232,112,10,0.3)",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "18px", color: "rgba(255,255,255,0.85)",
              fontWeight: "600",
            }}>{badge}</div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: "absolute", bottom: "32px", right: "80px",
          fontSize: "22px", color: "rgba(255,255,255,0.4)",
          letterSpacing: "1px",
        }}>pilo-rus.ru</div>
      </div>
    ),
    { ...size }
  );
}
