"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudRain,
  CloudSun,
  LocateFixed,
  MapPin,
  Snowflake,
  Sun,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WeatherData = {
  temp: number;
  code: number;
  city: string;
  located: boolean;
};

type GeoCache = {
  lat: number;
  lon: number;
  city: string;
  ts: number;
};

type WeatherCache = WeatherData & {
  ts: number;
};

const GEO_KEY = "aray-geo-cache";
const WEATHER_KEY = "aray-weather-cache";
const DEFAULT_LOCATION = { lat: 55.8945, lon: 37.3877, city: "Химки", located: false };

function getWeatherInfo(code: number): { label: string; icon: LucideIcon } {
  if (code === 0) return { label: "Ясно", icon: Sun };
  if (code <= 2) return { label: "Малооблачно", icon: CloudSun };
  if (code === 3) return { label: "Пасмурно", icon: Cloud };
  if (code <= 49) return { label: "Туман", icon: CloudFog };
  if (code <= 59) return { label: "Морось", icon: CloudDrizzle };
  if (code <= 69) return { label: "Дождь", icon: CloudRain };
  if (code <= 79) return { label: "Снег", icon: Snowflake };
  if (code <= 82) return { label: "Ливень", icon: CloudRain };
  if (code <= 86) return { label: "Снегопад", icon: Snowflake };
  if (code >= 95) return { label: "Гроза", icon: Zap };
  return { label: "Переменно", icon: CloudSun };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function resolveCity(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ru`,
      { cache: "force-cache" }
    );
    if (!response.ok) return "Ваш город";
    const data = await response.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.suburb ||
      data.address?.county ||
      "Ваш город"
    );
  } catch {
    return "Ваш город";
  }
}

async function fetchWeather(lat: number, lon: number, city: string, located: boolean): Promise<WeatherData> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=Europe%2FMoscow`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("weather fetch failed");
  const data = await response.json();
  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weathercode,
    city,
    located,
  };
}

function useAdminWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const loadWeather = useCallback(async (location: typeof DEFAULT_LOCATION | (GeoCache & { located: boolean })) => {
    const next = await fetchWeather(location.lat, location.lon, location.city, location.located);
    setWeather(next);
    writeJson(WEATHER_KEY, { ...next, ts: Date.now() });
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const city = await resolveCity(lat, lon);
        writeJson(GEO_KEY, { lat, lon, city, ts: Date.now() });
        await loadWeather({ lat, lon, city, ts: Date.now(), located: true }).catch(() => {});
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false),
      { timeout: 7000, maximumAge: 3600_000 }
    );
  }, [loadWeather]);

  useEffect(() => {
    let cancelled = false;

    const cachedWeather = readJson<WeatherCache>(WEATHER_KEY);
    if (cachedWeather && Date.now() - cachedWeather.ts < 10 * 60_000) {
      setWeather(cachedWeather);
    }

    async function boot() {
      const cachedWeather = readJson<WeatherCache>(WEATHER_KEY);
      if (cachedWeather && Date.now() - cachedWeather.ts < 10 * 60_000) {
        setWeather(cachedWeather);
      }

      const cachedGeo = readJson<GeoCache>(GEO_KEY);
      const freshGeo = cachedGeo && Date.now() - cachedGeo.ts < 3600_000 ? cachedGeo : null;
      const location = freshGeo ? { ...freshGeo, located: true } : DEFAULT_LOCATION;

      try {
        const next = await fetchWeather(location.lat, location.lon, location.city, location.located);
        if (!cancelled) {
          setWeather(next);
          writeJson(WEATHER_KEY, { ...next, ts: Date.now() });
        }
      } catch {}

      if (!freshGeo && "permissions" in navigator && "geolocation" in navigator) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((permission) => {
            if (permission.state === "granted" && !cancelled) requestLocation();
          })
          .catch(() => {});
      }
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) void boot();
    }, 3500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [requestLocation]);

  return { weather, loadingLocation, requestLocation };
}

export function AdminWeatherChip({
  variant = "rail",
  className,
}: {
  variant?: "rail" | "mobile";
  className?: string;
}) {
  const { weather, loadingLocation, requestLocation } = useAdminWeather();
  const info = useMemo(() => getWeatherInfo(weather?.code ?? 1), [weather?.code]);
  const Icon = info.icon;

  if (!weather) {
    if (variant === "rail") {
      return (
        <button
          type="button"
          onClick={requestLocation}
          className={cn(
            "group w-11 rounded-2xl border border-border bg-background/70 px-1.5 py-2 text-muted-foreground",
            "hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all",
            className
          )}
          aria-label="Погода и местоположение"
          title="Погода. Нажмите, чтобы определить город"
        >
          <CloudSun className="mx-auto h-4 w-4 animate-pulse" strokeWidth={1.8} />
          <span className="mt-1 block text-[10px] font-bold leading-none text-center text-foreground group-hover:text-primary">
            ...
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={requestLocation}
        className={cn(
          "flex w-full items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-2 text-left",
          "shadow-sm backdrop-blur-xl transition-all active:scale-[0.99]",
          className
        )}
        aria-label="Погода и местоположение"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CloudSun className="h-4 w-4 animate-pulse" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight text-foreground">Погода</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs leading-none text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{DEFAULT_LOCATION.city}</span>
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground">
          <LocateFixed className={cn("h-4 w-4", loadingLocation && "animate-pulse text-primary")} strokeWidth={1.8} />
        </span>
      </button>
    );
  }

  const temp = `${weather.temp > 0 ? "+" : ""}${weather.temp}°`;

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={requestLocation}
        className={cn(
          "group w-11 rounded-2xl border border-border bg-background/70 px-1.5 py-2 text-muted-foreground",
          "hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all",
          className
        )}
        aria-label="Погода и местоположение"
        title={weather.located ? `${weather.city}: ${temp}, ${info.label}` : "Погода. Нажмите, чтобы определить город"}
      >
        <Icon className="mx-auto h-4 w-4" strokeWidth={1.8} />
        <span className="mt-1 block text-[10px] font-bold leading-none text-center text-foreground group-hover:text-primary">
          {temp}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-2 text-left",
        "shadow-sm backdrop-blur-xl transition-all active:scale-[0.99]",
        className
      )}
      aria-label="Погода и местоположение"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-tight text-foreground">{temp} · {info.label}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs leading-none text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{weather.city}</span>
        </span>
      </span>
      {!weather.located && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground">
          <LocateFixed className={cn("h-4 w-4", loadingLocation && "animate-pulse text-primary")} strokeWidth={1.8} />
        </span>
      )}
    </button>
  );
}
