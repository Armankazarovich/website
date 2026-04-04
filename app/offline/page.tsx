export const metadata = { title: "Нет соединения | Арай" };

export default function OfflinePage() {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: "#080C1E", fontFamily: "sans-serif", color: "white" }}>
        <div style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          gap: "24px",
        }}>
          {/* Aray ball */}
          <svg width="80" height="80" viewBox="0 0 100 100">
            <defs>
              <radialGradient id="bg" cx="36%" cy="30%" r="65%">
                <stop offset="0%"   stopColor="#FFBB6B" />
                <stop offset="22%"  stopColor="#FF8C2A" />
                <stop offset="48%"  stopColor="#E8700A" />
                <stop offset="72%"  stopColor="#C45500" />
                <stop offset="100%" stopColor="#8B3200" />
              </radialGradient>
              <radialGradient id="sh" cx="40%" cy="35%" r="60%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="rgba(232,112,10,0.18)" />
            <circle cx="50" cy="50" r="42" fill="url(#bg)" />
            <ellipse cx="38" cy="34" rx="14" ry="10" fill="url(#sh)" transform="rotate(-20,38,34)" />
            <circle cx="40" cy="30" r="5" fill="rgba(255,255,255,0.65)" />
          </svg>

          <div style={{ maxWidth: "320px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>
              Нет соединения
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.5 }}>
              Арай ждёт тебя онлайн. Проверь интернет и попробуй снова.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              background: "linear-gradient(135deg, #FF8C2A, #E8700A)",
              border: "none",
              borderRadius: "14px",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              padding: "13px 32px",
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
