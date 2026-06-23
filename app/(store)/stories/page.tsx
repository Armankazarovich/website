import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CirclePlay, ClipboardList, PackageCheck, Sparkles } from "lucide-react";
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
  const linkedStories = stories.filter((story) => story.relations.length > 0 || story.ctaUrl).length;
  const liveStories = stories.filter((story) => story.type === "LIVE").length;
  const views = stories.reduce((sum, story) => sum + story.views, 0);

  return (
    <div className="container store-mobile-safe-bottom py-8 md:py-12">
      <div className="mx-auto max-w-[1180px]">
        <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              <CirclePlay className="h-4 w-4" />
              Живые обзоры
            </div>
            <h1 className="font-display text-3xl font-bold md:text-5xl">Сторис продавца</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Короткие видео, обзоры товаров, услуги и актуальные предложения в формате, который быстро отвечает на вопрос покупателя.
            </p>
            {stories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-card px-3 py-1.5">{stories.length} активных</span>
                <span className="rounded-full border border-border bg-card px-3 py-1.5">{linkedStories} связаны с товаром или услугой</span>
                <span className="rounded-full border border-border bg-card px-3 py-1.5">{liveStories || "0"} live</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/10">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-border bg-background/35 p-3">
                <Sparkles className="mx-auto mb-1 h-4 w-4 text-primary" />
                <div className="font-semibold text-foreground">{stories.length}</div>
                <div className="text-muted-foreground">сторис</div>
              </div>
              <div className="rounded-xl border border-border bg-background/35 p-3">
                <PackageCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
                <div className="font-semibold text-foreground">{linkedStories}</div>
                <div className="text-muted-foreground">связей</div>
              </div>
              <div className="rounded-xl border border-border bg-background/35 p-3">
                <CirclePlay className="mx-auto mb-1 h-4 w-4 text-primary" />
                <div className="font-semibold text-foreground">{views}</div>
                <div className="text-muted-foreground">просмотров</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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
