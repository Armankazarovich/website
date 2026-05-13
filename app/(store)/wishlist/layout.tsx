import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохраненные товары ПилоРус.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://pilo-rus.ru/wishlist" },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
