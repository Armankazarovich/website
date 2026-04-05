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

    // Шаг 1: сразу Химки (без ожидания)
    fetchWeather(55.8945, 37.3877, "Химки");

    // Шаг 2: если разрешат геолокацию — обновим
    if ("geolocation" in navigator) {
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
          fetchWeather(la, lo, city);
        },
        () => { /* отказал — Химки уже показаны */ },
        { timeout: 6000, maximumAge: 300_000 }
      );
    }
  }, []);

  return weather;
}

// ── Компактная строчка погоды — встраивается в шапку дашборда ─────────────────
export function AdminDashboardWidgets() {
  const [mounted, setMounted] = useState(false);
  const weather = useWeather();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !weather) return null;

  const { emoji, label } = getWeatherInfo(weather.code);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const tempStr = `${weather.temp > 0 ? "+" : ""}${weather.temp}°`;

  return (
    <div className="flex items-center gap-2 text-foreground/50">
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-xs font-medium text-foreground/60">{tempStr} · {label}</span>
      <span className="text-foreground/25">·</span>
      <span className="text-xs text-foreground/40 capitalize">{weather.city}</span>
      <span className="text-foreground/25">·</span>
      <span className="text-xs text-foreground/40 capitalize">{dateStr}</span>
    </div>
  );
}
