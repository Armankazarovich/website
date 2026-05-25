import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CirclePlay } from "lucide-react";
import { StoriesPageClient } from "@/components/store/stories-page-client";
import { getPublicStoreStories } from "@/lib/store-stories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Сторис и видео ПилоРус",
  description: "Видео-обзоры товаров, услуг, акции и живые подсказки продавца ПилоРус.",
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              <CirclePlay className="h-4 w-4" />
              Живые обзоры
            </div>
            <h1 className="font-display text-3xl font-bold md:text-5xl">Сторис продавца</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Короткие видео, обзоры товаров, услуги и актуальные предложения в одном понятном формате.
            </p>
            {stories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-card px-3 py-1.5">{stories.length} активных</span>
                <span className="rounded-full border border-border bg-card px-3 py-1.5">товары и услуги связаны</span>
                <span className="rounded-full border border-border bg-card px-3 py-1.5">виджет работает по сайту</span>
              </div>
            )}
          </div>
          <Link
            href="/catalog"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/40"
          >
            В каталог
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <StoriesPageClient stories={stories} initialStoryId={searchParams?.story} />
      </div>
    </div>
  );
}
