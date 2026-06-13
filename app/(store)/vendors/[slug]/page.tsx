import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Каталог ПилоРус",
  description: "Каталог ПилоРус: пиломатериалы, фанера, стройматериалы, цены и доставка.",
  alternates: { canonical: "https://pilo-rus.ru/catalog" },
  robots: { index: false, follow: true },
};

export default function VendorStorefrontPage() {
  redirect("/catalog");
}
