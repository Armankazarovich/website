import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, ArrowRight, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новости и статьи | ПилоРус",
  description:
    "Полезные статьи о пиломатериалах: как выбрать доску, антисептирование, расчёт материалов, советы по строительству в Подмосковье.",
  alternates: { canonical: "https://pilo-rus.ru/news" },
  openGraph: {
    title: "Новости и статьи | ПилоРус",
    description: "Полезные статьи о пиломатериалах от производителя ПилоРус",
    url: "https://pilo-rus.ru/news",
  },
};

const TOPIC_COLORS: Record<string, string> = {
  "Пиломатериалы": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Обработка":    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Сравнение":    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Советы":       "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Баня":         "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function topicClass(topic: string | null) {
  if (!topic) return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return TOPIC_COLORS[topic] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

export default async function NewsPage() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      topic: true,
      readTime: true,
      coverImage: true,
    },
  });

  return (
    <div className="container py-10 md:py-14">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-primary mb-3">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">База знаний</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
          Статьи и советы
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Полезные материалы о выборе, обработке и применении пиломатериалов от специалистов ПилоРус
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Статьи скоро появятся</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/news/${post.slug}`}
              className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-200"
            >
              {/* Cover image */}
              <div className="relative h-48 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 overflow-hidden shrink-0">
                {post.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 64 64"
                      fill="none"
                      className="opacity-20"
                    >
                      <rect x="8" y="20" width="48" height="8" rx="3" fill="currentColor" />
                      <rect x="8" y="32" width="48" height="8" rx="3" fill="currentColor" />
                      <rect x="8" y="44" width="32" height="8" rx="3" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-5">
                {/* Topic + readTime */}
                <div className="flex items-center gap-2 mb-3">
                  {post.topic && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${topicClass(post.topic)}`}>
                      <Tag className="w-3 h-3" />
                      {post.topic}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {post.readTime} мин
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-display font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1 mb-4">
                  {post.excerpt}
                </p>

                {/* CTA */}
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                  Читать
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
