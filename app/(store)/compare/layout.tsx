import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Сравнение товаров | ПилоРус",
  description: "Сравните пиломатериалы по цене, размерам, единицам, наличию и назначению.",
  alternates: { canonical: "https://pilo-rus.ru/compare" },
  robots: { index: false, follow: true },
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
