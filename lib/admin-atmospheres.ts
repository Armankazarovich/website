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
    src: "/images/admin-atmosphere/aray-01-water-intelligence.webp",
    palettes: ["ocean"],
  },
  {
    id: "earth-gold",
    name: "Золото земли и ценность",
    shortName: "Земля",
    src: "/images/admin-atmosphere/aray-02-earth-gold.webp",
    palettes: ["timber"],
  },
  {
    id: "night-focus",
    name: "Ночной фокус",
    shortName: "Фокус",
    src: "/images/admin-atmosphere/aray-03-night-focus.webp",
    palettes: ["midnight"],
  },
  {
    id: "northern-light",
    name: "Северный свет",
    shortName: "Север",
    src: "/images/admin-atmosphere/aray-04-northern-light.webp",
    palettes: ["slate"],
  },
  {
    id: "forest-balance",
    name: "Лесной баланс",
    shortName: "Лес",
    src: "/images/admin-atmosphere/aray-05-forest-balance.webp",
    palettes: ["forest"],
  },
  {
    id: "future-city",
    name: "Город будущего",
    shortName: "Город",
    src: "/images/admin-atmosphere/aray-06-future-city.webp",
    palettes: ["avito"],
  },
  {
    id: "solar-impulse",
    name: "Солнечный импульс",
    shortName: "Импульс",
    src: "/images/admin-atmosphere/aray-07-solar-impulse.webp",
    palettes: ["crimson"],
  },
  {
    id: "cosmic-data",
    name: "Космос данных",
    shortName: "Космос",
    src: "/images/admin-atmosphere/aray-08-cosmic-data.webp",
    palettes: ["amazon"],
  },
  {
    id: "quiet-luxury",
    name: "Тихая роскошь",
    shortName: "Роскошь",
    src: "/images/admin-atmosphere/aray-09-quiet-luxury.webp",
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
