export type AdminAtmosphereItem = {
  id: string;
  name: string;
  shortName: string;
  src: string;
  palettes: string[];
};

export const ARAY_ATMOSPHERES: AdminAtmosphereItem[] = [
  {
    id: "water-intelligence",
    name: "Источник воды и интеллекта",
    shortName: "Вода",
    src: "/images/admin-atmosphere/admin-nature-01-meadow-sky.webp",
    palettes: ["ocean"],
  },
  {
    id: "earth-gold",
    name: "Золото земли и ценность",
    shortName: "Земля",
    src: "/images/admin-atmosphere/admin-nature-02-calm-beach.webp",
    palettes: ["timber"],
  },
  {
    id: "night-focus",
    name: "Ночной фокус",
    shortName: "Фокус",
    src: "/images/admin-atmosphere/admin-nature-03-alpine-lake.webp",
    palettes: ["midnight"],
  },
  {
    id: "northern-light",
    name: "Северный свет",
    shortName: "Север",
    src: "/images/admin-atmosphere/admin-nature-04-northern-lake.webp",
    palettes: ["slate"],
  },
  {
    id: "forest-balance",
    name: "Лесной баланс",
    shortName: "Лес",
    src: "/images/admin-atmosphere/admin-nature-05-green-island.webp",
    palettes: ["forest"],
  },
  {
    id: "future-city",
    name: "Город будущего",
    shortName: "Город",
    src: "/images/admin-atmosphere/admin-nature-06-sunset-water.webp",
    palettes: ["avito"],
  },
  {
    id: "solar-impulse",
    name: "Солнечный импульс",
    shortName: "Импульс",
    src: "/images/admin-atmosphere/admin-nature-07-clear-mountain-water.webp",
    palettes: ["crimson"],
  },
  {
    id: "cosmic-data",
    name: "Космос данных",
    shortName: "Космос",
    src: "/images/admin-atmosphere/admin-nature-08-snow-peak.webp",
    palettes: ["amazon"],
  },
  {
    id: "aray-signature",
    name: "ARAY: вода, золото и интеллект",
    shortName: "ARAY",
    src: "/images/admin-atmosphere/admin-nature-09-ocean-surf.webp",
    palettes: ["sber"],
  },
];

export const FALLBACK_ADMIN_PHOTOS = ARAY_ATMOSPHERES.map((item) => item.src);

export function getPaletteAtmosphere(palette: string): AdminAtmosphereItem | null {
  return ARAY_ATMOSPHERES.find((item) => item.palettes.includes(palette)) || null;
}

export function getPalettePhotos(palette: string): string[] {
  const selected = getPaletteAtmosphere(palette);
  if (!selected) return FALLBACK_ADMIN_PHOTOS;
  return [
    selected.src,
    ...FALLBACK_ADMIN_PHOTOS.filter((src) => src !== selected.src),
  ];
}
