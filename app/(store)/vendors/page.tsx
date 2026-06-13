import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Каталог ПилоРус",
  description: "Пиломатериалы, фанера, стройматериалы, цены, доставка и оформление заказа в ПилоРус.",
  alternates: { canonical: "https://pilo-rus.ru/catalog" },
  robots: { index: false, follow: true },
};

export default function VendorsPage() {
  redirect("/catalog");
}
