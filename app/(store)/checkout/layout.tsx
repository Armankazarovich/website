import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Оформление заказа",
  description: "Оформление заявки на пиломатериалы ПилоРус.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://pilo-rus.ru/checkout" },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
