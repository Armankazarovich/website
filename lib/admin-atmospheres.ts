export type AdminAtmosphereItem = {
  id: string;
  name: string;
  shortName: string;
  src: string;
  palettes: string[];
};

export const ARAY_ATMOSPHERES: AdminAtmosphereItem[] = [
  {
    id: "meadow-sky",
    name: "Чистое небо и поле",
    shortName: "Небо",
    src: "/images/admin-atmosphere/admin-nature-01-meadow-sky.webp",
    palettes: ["ocean"],
  },
  {
    id: "calm-beach",
    name: "Спокойная береговая линия",
    shortName: "Берег",
    src: "/images/admin-atmosphere/admin-nature-02-calm-beach.webp",
    palettes: ["timber"],
  },
  {
    id: "alpine-lake",
    name: "Горное озеро",
    shortName: "Озеро",
    src: "/images/admin-atmosphere/admin-nature-03-alpine-lake.webp",
    palettes: ["midnight"],
  },
  {
    id: "northern-lake",
    name: "Северная вода",
    shortName: "Север",
    src: "/images/admin-atmosphere/admin-nature-04-northern-lake.webp",
    palettes: ["slate"],
  },
  {
    id: "green-island",
    name: "Зеленый остров",
    shortName: "Остров",
    src: "/images/admin-atmosphere/admin-nature-05-green-island.webp",
    palettes: ["forest"],
  },
  {
    id: "sunset-water",
    name: "Мягкий закат на воде",
    shortName: "Закат",
    src: "/images/admin-atmosphere/admin-nature-06-sunset-water.webp",
    palettes: ["avito"],
  },
  {
    id: "clear-mountain-water",
    name: "Прозрачная горная вода",
    shortName: "Вода",
    src: "/images/admin-atmosphere/admin-nature-07-clear-mountain-water.webp",
    palettes: ["crimson"],
  },
  {
    id: "snow-peak",
    name: "Светлая снежная вершина",
    shortName: "Снег",
    src: "/images/admin-atmosphere/admin-nature-08-snow-peak.webp",
    palettes: ["amazon"],
  },
  {
    id: "ocean-surf",
    name: "Океанский свет",
    shortName: "Океан",
    src: "/images/admin-atmosphere/admin-nature-09-ocean-surf.webp",
    palettes: ["sber"],
  },
];

export const FALLBACK_ADMIN_PHOTOS = ARAY_ATMOSPHERES.map((item) => item.src);
export const ADMIN_ATMOSPHERE_PHOTOS = ARAY_ATMOSPHERES.map((item) => item.src);

export function getPaletteAtmosphere(palette: string): AdminAtmosphereItem | null {
  return ARAY_ATMOSPHERES.find((item) => item.palettes.includes(palette)) || null;
}

export function getPalettePhotos(palette: string): string[] {
  return ADMIN_ATMOSPHERE_PHOTOS;
}
