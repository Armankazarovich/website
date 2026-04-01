import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Калькулятор пиломатериалов — рассчитайте м³ и стоимость онлайн | ПилоРус",
  description:
    "Бесплатный онлайн калькулятор пиломатериалов: рассчитайте точное количество м³ доски, бруса, вагонки и стоимость за 30 секунд. Химки, доставка по Москве и МО.",
  keywords: [
    "калькулятор пиломатериалов",
    "калькулятор доски",
    "рассчитать куб доски",
    "сколько досок в кубе",
    "калькулятор бруса",
    "калькулятор вагонки",
    "перевод штук в кубы",
    "расчёт пиломатериалов онлайн",
    "сколько нужно досок",
    "кубатура пиломатериалов",
  ],
  openGraph: {
    title: "Калькулятор пиломатериалов — ПилоРус",
    description: "Рассчитайте точное количество м³ и стоимость доски, бруса, вагонки за 30 секунд",
    url: "https://pilo-rus.ru/calculator",
    type: "website",
  },
  alternates: {
    canonical: "https://pilo-rus.ru/calculator",
  },
};

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
