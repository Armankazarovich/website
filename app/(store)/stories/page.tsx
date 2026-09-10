import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CirclePlay, ClipboardList } from "lucide-react";
import { StoriesPageClient } from "@/components/store/stories-page-client";
import { getPublicStoreStories } from "@/lib/store-stories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Сторис и видео ПилоРус",
  description: "Видео-обзоры товаров, услуг, акций и живые подсказки продавца ПилоРус.",
  alternates: { canonical: "https://pilo-rus.ru/stories" },
};

export default async function StoriesPage({
  searchParams,
}: {
  searchParams?: { story?: string };
}) {
  const stories = await getPublicStoreStories({ take: 60 });

  return (
    <div className="container store-mobile-safe-bottom py-8 md:py-12">
      <div className="mx-auto max-w-[1180px]">
        <section className="mb-5 grid gap-4 md:mb-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              <CirclePlay className="h-4 w-4" />
              Живые обзоры
            </div>
            <h1 className="font-display text-3xl font-bold md:text-5xl">Сторис продавца</h1>
            <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-muted-foreground sm:block md:text-base">
              Короткие видео, обзоры товаров, услуги и актуальные предложения в формате, который быстро отвечает на вопрос покупателя.
            </p>
          </div>

          {/* На телефоне сразу сторис: кнопки каталога есть в нижнем меню. */}
          <div className="hidden rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/10 sm:block">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                href="/catalog"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                В каталог
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/price-list"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/35 px-4 text-sm font-semibold transition-colors hover:border-primary/45"
              >
                <ClipboardList className="h-4 w-4" />
                Прайс-лист
              </Link>
            </div>
          </div>
        </section>

        <StoriesPageClient stories={stories} initialStoryId={searchParams?.story} />
      </div>
    </div>
  );
}
