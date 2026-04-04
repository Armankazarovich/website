"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";

// ── ПОГОДНЫЕ ТЕМЫ — каждая палитра = своя природа × день/ночь ─────────────────

type Photo = { url: string; label: string; anim: string };

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1920&q=80`;

const ANIM = ["kenburns-in", "kenburns-2", "kenburns-3"] as const;
const a = (i: number) => ANIM[i % 3];

// 🍂 ОСЕНЬ / ТЁПЛЫЙ ЗАКАТ — timber, amazon
const AUTUMN: Record<"day" | "night", Photo[]> = {
  day: [
    { url: U("1507003211-7a17a2e78d78"), label: "Осенний лес",    anim: a(0) },
    { url: U("1474552226256-ddff9f2b0a20"), label: "Золотая осень", anim: a(1) },
    { url: U("1477601263568-b65657ab44c5"), label: "Осенний парк",  anim: a(2) },
  ],
  night: [
    { url: U("1506905925346-21bda4d32df4"), label: "Горный закат",  anim: a(0) },
    { url: U("1480497490-fa5c5aff5051"),   label: "Закат в горах",  anim: a(1) },
    { url: U("1455218873509-8ef305a30235"), label: "Осенний вечер", anim: a(2) },
  ],
};

// 🌲 ЛЕС / ПРИРОДА — forest, sber
const FOREST: Record<"day" | "night", Photo[]> = {
  day: [
    { url: U("1441974231531-c6227db76b6e"), label: "Летний лес",     anim: a(0) },
    { url: U("1448375240703-89f2b795f098"), label: "Туманный лес",   anim: a(1) },
    { url: U("1542273917-3e29a42d9e48"),   label: "Зелёный лес",    anim: a(2) },
  ],
  night: [
    { url: U("1531297484001-80022131f5a1"), label: "Звёздный лес",   anim: a(0) },
    { url: U("1419242902344-4b9f4c242d08"), label: "Млечный путь",   anim: a(1) },
    { url: U("1445905595283-21f8ae8a33d2"), label: "Ночные горы",    anim: a(2) },
  ],
};

// 🌊 ОКЕАН / МОРЕ — ocean, avito, ozon
const OCEAN: Record<"day" | "night", Photo[]> = {
  day: [
    { url: U("1505118380757-91f5f5632de0"), label: "Океан",          anim: a(0) },
    { url: U("1476673479940-e2f5bf9239be"), label: "Морские волны",  anim: a(1) },
    { url: U("1439066615861-d1af74d74000"), label: "Тропическое море",anim: a(2) },
  ],
  night: [
    { url: U("1507525428034-b723cf961d3e"), label: "Ночной пляж",    anim: a(0) },
    { url: U("1505765577774-4e73c27e49a5"), label: "Морской закат",  anim: a(1) },
    { url: U("1519046909901-c5c1a6e77"),    label: "Ночное море",    anim: a(2) },
  ],
};

// 🌌 НОЧНОЕ НЕБО / ЗВЁЗДЫ — midnight, wildberries
const NIGHT_SKY: Record<"day" | "night", Photo[]> = {
  day: [
    { url: U("1464822759023-fed622ff2c3b"), label: "Альпы",          anim: a(0) },
    { url: U("1519681393784-d1bc9aa72d54"), label: "Горные вершины", anim: a(1) },
    { url: U("1464822759023-fed622ff2c3b"), label: "Скалы",          anim: a(2) },
  ],
  night: [
    { url: U("1531366936705-b04c78e59d98"), label: "Северное сияние",anim: a(0) },
    { url: U("1419242902344-4b9f4c242d08"), label: "Звёздное небо",  anim: a(1) },
    { url: U("1573566226606-4ef5fcf1c9af"), label: "Аврора",         anim: a(2) },
  ],
};

// ❄️ ЗИМА / СНЕГ — slate
const WINTER: Record<"day" | "night", Photo[]> = {
  day: [
    { url: U("1491555103944-7c89fc6e1e65"), label: "Снежные горы",  anim: a(0) },
    { url: U("1483921354064-9b29dbbdb04c"), label: "Зимний пейзаж", anim: a(1) },
    { url: U("1457269449834-928af64c684d"), label: "Снежный лес",   anim: a(2) },
  ],
  night: [
    { url: U("1491156379076-f1b38db96af3"), label: "Зимняя ночь",   anim: a(0) },
    { url: U("1531366936705-b04c78e59d98"), label: "Сияние над снегом", anim: a(1) },
    { url: U("1519681393784-d1bc9aa72d54"), label: "Звёздная зима", anim: a(2) },
  ],
};

// 🔥 ОГОНЬ / ЗАКАТ — crimson, aliexpress, yandex
const FIRE: Record<"day" | "night", Photo[]> = {
  day: [
    { url: U("1470770903676-69b98201ea1c"), label: "Водопад",        anim: a(0) },
    { url: U("1475274047050-1d0c0975de51"), label: "Вулканический",  anim: a(1) },
    { url: U("1506905925346-21bda4d32df4"), label: "Драматические горы",anim: a(2) },
  ],
  night: [
    { url: U("1480497490-fa5c5aff5051"),   label: "Огненный закат",  anim: a(0) },
    { url: U("1455218873509-8ef305a30235"), label: "Закат над горами",anim: a(1) },
    { url: U("1507003211-7a17a2e78d78"),   label: "Вечерний лес",    anim: a(2) },
  ],
};

// ── Маппинг palette → тема природы ───────────────────────────────────────────
const THEME_MAP: Record<string, Record<"day" | "night", Photo[]>> = {
  timber:      AUTUMN,
  amazon:      AUTUMN,
  forest:      FOREST,
  sber:        FOREST,
  ocean:       OCEAN,
  avito:       OCEAN,
  ozon:        OCEAN,
  midnight:    NIGHT_SKY,
  wildberries: NIGHT_SKY,
  slate:       WINTER,
  crimson:     FIRE,
  aliexpress:  FIRE,
  yandex:      FIRE,
};

const SHOW_MS = 20_000;
const FADE_MS =  4_000;

export function AdminNatureBg({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();

  const isDark = resolvedTheme !== "light";
  const timeKey: "day" | "night" = isDark ? "night" : "day";

  const themePhotos = THEME_MAP[palette] ?? AUTUMN;
  const PHOTOS = themePhotos[timeKey];

  const [cur,    setCur]    = useState(0);
  const [next,   setNext]   = useState(1);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  // Сбрасываем индекс при смене набора фоток (палитра или тема)
  useEffect(() => {
    setCur(0);
    setNext(1 % PHOTOS.length);
    setFading(false);
    setFailed(new Set());
  }, [palette, timeKey]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      setFading(true);
      const n = (cur + 1) % PHOTOS.length;
      setNext(n);
      setTimeout(() => { setCur(n); setFading(false); }, FADE_MS);
    }, SHOW_MS);
    return () => clearInterval(t);
  }, [enabled, cur, PHOTOS]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* Текущее фото */}
      {!failed.has(cur) && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={PHOTOS[cur].url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${PHOTOS[cur].anim} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, cur]))}
          />
        </div>
      )}

      {/* Следующее фото (предзагрузка + появляется при fade) */}
      {!failed.has(next) && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={PHOTOS[next].url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: `${PHOTOS[next].anim} ${SHOW_MS}ms ease-in-out forwards`, willChange: "transform" }}
            onError={() => setFailed(f => new Set([...f, next]))}
          />
        </div>
      )}

      {/* ТЁМНАЯ ТЕМА — больше затемнение */}
      <div className="aray-photo-overlay-dark absolute inset-0 bg-black/62" />
      {/* СВЕТЛАЯ ТЕМА — лёгкое затемнение */}
      <div className="aray-photo-overlay-light absolute inset-0" style={{ background: "rgba(0,0,0,0.12)" }} />
      {/* Виньетка снизу */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.10) 40%, transparent 65%)" }} />
      <div className="aray-photo-overlay-light absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.30) 0%, transparent 50%)" }} />
      {/* Виньетка сверху — только в тёмной теме */}
      <div className="aray-photo-overlay-dark absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 22%)" }} />

      {/* Лейбл */}
      <div className="absolute bottom-3 right-5 flex items-center gap-1.5 opacity-25">
        <span className="w-1 h-1 rounded-full bg-white" style={{ animation: "pulse 3s ease-in-out infinite" }} />
        <span className="text-white text-[9px] tracking-[0.25em] uppercase font-light">
          {PHOTOS[cur].label}
        </span>
      </div>
    </div>
  );
}
