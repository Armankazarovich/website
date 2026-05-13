import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Отслеживание заказа",
  description: "Проверка статуса заказа ПилоРус по номеру и телефону.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://pilo-rus.ru/track" },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
