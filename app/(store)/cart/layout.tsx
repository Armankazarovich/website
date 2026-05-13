import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Корзина ПилоРус: проверьте выбранные пиломатериалы перед оформлением заявки.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://pilo-rus.ru/cart" },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
