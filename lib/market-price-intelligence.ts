export type MarketPriceUnit = "m3" | "piece" | "m2" | "kg" | "service" | "freelance";
export type MarketPriceScenario = "retail" | "wholesale" | "service" | "freelance";

export type MarketPricePoint = {
  unit: MarketPriceUnit;
  price: number;
  productName: string;
  category?: string;
  inStock?: boolean;
  inCartQuantity?: number;
};

export type MarketPriceUnitSummary = {
  unit: MarketPriceUnit;
  label: string;
  count: number;
  min: number;
  max: number;
  average: number;
  retail: number;
  wholesale: number;
  service: number;
  freelance: number;
  demand: number;
};

export type MarketPriceIntelligence = {
  summaries: MarketPriceUnitSummary[];
  primary: MarketPriceUnitSummary | null;
  insight: string;
};

const UNIT_LABELS: Record<MarketPriceUnit, string> = {
  m3: "за м³",
  piece: "за штуку",
  m2: "за м²",
  kg: "за кг",
  service: "услуги",
  freelance: "работы",
};

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizePrice(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function summarizeUnit(unit: MarketPriceUnit, points: MarketPricePoint[]): MarketPriceUnitSummary | null {
  const prices = points.map((point) => normalizePrice(point.price)).filter(Boolean);
  if (!prices.length) return null;
  const average = avg(prices);
  const demand = points.reduce((sum, point) => sum + Number(point.inCartQuantity || 0), 0);

  return {
    unit,
    label: UNIT_LABELS[unit],
    count: prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    average,
    retail: average,
    wholesale: Math.max(1, Math.round(average * 0.94)),
    service: Math.max(1, Math.round(average * 1.18)),
    freelance: Math.max(1, Math.round(average * 1.32)),
    demand,
  };
}

export function buildMarketPriceIntelligence(points: MarketPricePoint[]): MarketPriceIntelligence {
  const byUnit = points.reduce<Record<MarketPriceUnit, MarketPricePoint[]>>((acc, point) => {
    const price = normalizePrice(point.price);
    if (!price) return acc;
    acc[point.unit].push({ ...point, price });
    return acc;
  }, {
    m3: [],
    piece: [],
    m2: [],
    kg: [],
    service: [],
    freelance: [],
  });

  const summaries = (Object.keys(byUnit) as MarketPriceUnit[])
    .map((unit) => summarizeUnit(unit, byUnit[unit]))
    .filter((summary): summary is MarketPriceUnitSummary => Boolean(summary))
    .sort((a, b) => {
      if (a.unit === "m3") return -1;
      if (b.unit === "m3") return 1;
      return b.count - a.count;
    });

  const primary = summaries[0] ?? null;
  const insight = primary
    ? `Основной срез сейчас ${primary.label}: средняя ${primary.average.toLocaleString("ru-RU")} ₽, оптовой ориентир от каталога ${primary.wholesale.toLocaleString("ru-RU")} ₽, розница ${primary.retail.toLocaleString("ru-RU")} ₽.`
    : "Для умной аналитики нужны цены по товарам. Пока показываем только честные доступные данные.";

  return { summaries, primary, insight };
}
