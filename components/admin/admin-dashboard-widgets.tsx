"use client";

import { useState, useEffect } from "react";

// ── WMO коды погоды → emoji + описание ───────────────────────────────────────
function getWeatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0)   return { label: "Ясно",        emoji: "☀️" };
  if (code <= 2)    return { label: "Малооблачно", emoji: "🌤" };
  if (code === 3)   return { label: "Пасмурно",    emoji: "☁️" };
  if (code <= 49)   return { label: "Туман",        emoji: "🌫" };
  if (code <= 59)   return { label: "Морось",       emoji: "🌦" };
  if (code <= 69)   return { label: "Дождь",        emoji: "🌧" };
  if (code <= 79)   return { label: "Снег",         emoji: "❄️" };
  if (code <= 82)   return { label: "Ливень",       emoji: "⛈" };
  if (code <= 86)   return { label: "Снегопад",     emoji: "🌨" };
  if (code >= 95)   return { label: "Гроза",        emoji: "⛈" };
  return             { label: "Переменно",   emoji: "🌥" };
}

type WeatherData = { temp: number; code: number; city: string };

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function fetchWeather(la: number, lo: number, cityName: string) {
      try {
        const res  = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weathercode&timezone=Europe%2FMoscow`
        );
        const data = await res.json();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weathercode,
          city: cityName,
        });
      } catch { /* тихо */ }
    }

    // Проверяем кэш геолокации (не спрашиваем каждый раз!)
    const GEO_KEY = "aray-geo-cache";
    const cached = (() => {
      try {
        const raw = localStorage.getItem(GEO_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        // Кэш на 1 час
        if (Date.now() - d.ts > 3600_000) return null;
        return d as { lat: number; lon: number; city: string; ts: number };
      } catch { return null; }
    })();

    if (cached) {
      // Есть свежий кэш — используем без запроса геолокации
      fetchWeather(cached.lat, cached.lon, cached.city);
    } else {
      // Нет кэша — показываем Химки по умолчанию
      fetchWeather(55.8945, 37.3877, "Химки");

      // Запрашиваем геолокацию ТОЛЬКО если разрешение уже дано (без popup!)
      if ("geolocation" in navigator && "permissions" in navigator) {
        navigator.permissions.query({ name: "geolocation" }).then(perm => {
          if (perm.state !== "granted") return; // Не спрашиваем, если не дано
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude: la, longitude: lo } = pos.coords;
              let city = "Ваш город";
              try {
                const geo = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=ru`,
                  { headers: { "User-Agent": "PiloRus-Admin/1.0" } }
                );
                const gd = await geo.json();
                city = gd.address?.city || gd.address?.town || gd.address?.village || gd.address?.suburb || city;
              } catch { /* оставим координаты */ }
              // Кэшируем на 1 час
              try { localStorage.setItem(GEO_KEY, JSON.stringify({ lat: la, lon: lo, city, ts: Date.now() })); } catch {}
              fetchWeather(la, lo, city);
            },
            () => { /* отказал — Химки уже показаны */ },
            { timeout: 6000, maximumAge: 3600_000 }
          );
        }).catch(() => {}); // permissions API не поддерживается
      }
    }
  }, []);

  return weather;
}

// ── Компактная погода в боковой панели — с hover-раскрытием ──────────────────
export function AdminSidebarWeather() {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const weather = useWeather();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !weather) return null;

  const { emoji, label } = getWeatherInfo(weather.code);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
  const tempStr = `${weather.temp > 0 ? "+" : ""}${weather.temp}°`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="mx-3 mb-1.5 px-3 py-2.5 rounded-2xl cursor-default select-none transition-all duration-300"
      style={{
        background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.2)" : "none",
      }}
    >
      {/* Всегда видная строчка */}
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{emoji}</span>
        <span className="text-sm font-bold leading-none" style={{ color: "hsl(var(--primary))" }}>{tempStr}</span>
        <span className="text-[11px] text-white/45 ml-auto leading-none">{weather.city}</span>
      </div>

      {/* Раскрывается при наведении */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: hovered ? "56px" : "0px", opacity: hovered ? 1 : 0, marginTop: hovered ? "8px" : "0px" }}
      >
        <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[11px] font-medium text-white/65">{label}</p>
          <p className="text-[10px] text-white/35 mt-0.5 capitalize">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

// ── Устаревший компонент (оставлен для обратной совместимости) ────────────────
export function AdminDashboardWidgets() {
  return null;
}
