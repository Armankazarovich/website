import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Tag, Clock, BookOpen, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug, published: true },
    select: { title: true, excerpt: true, coverImage: true },
  });
  if (!post) return { title: "Статья не найдена" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `https://pilo-rus.ru/news/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://pilo-rus.ru/news/${params.slug}`,
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
  };
}

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

export default async function PostPage({ params }: Props) {
  const [post, session] = await Promise.all([
    prisma.post.findUnique({ where: { slug: params.slug, published: true } }),
    auth(),
  ]);

  if (!post) notFound();

  const role = (session?.user as any)?.role;
  const isAdmin = session && ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role);

  // Increment views (fire and forget)
  prisma.post
    .update({ where: { id: post.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  // Related posts (same topic, max 3, exclude current)
  const related = post.topic
    ? await prisma.post.findMany({
        where: {
          published: true,
          topic: post.topic,
          NOT: { id: post.id },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { slug: true, title: true, excerpt: true, topic: true, readTime: true },
      })
    : [];

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      {/* Admin edit button */}
      {isAdmin && (
        <Link
          href="/admin/posts"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-xl hover:bg-primary/90 transition-all font-semibold text-sm group"
        >
          <Pencil className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Редактировать
        </Link>
      )}

      {/* Back button */}
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Все статьи
      </Link>

      {/* Article header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {post.topic && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${topicClass(post.topic)}`}>
              <Tag className="w-3.5 h-3.5" />
              {post.topic}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {post.readTime} мин чтения
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold leading-tight mb-4">
          {post.title}
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed">
          {post.excerpt}
        </p>
      </header>

      {/* Cover image */}
      {post.coverImage && (
        <div className="relative rounded-2xl overflow-hidden mb-8 h-64 md:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article content */}
      <article
        className="prose prose-zinc dark:prose-invert max-w-none
          prose-headings:font-display prose-headings:font-semibold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
          prose-p:leading-relaxed prose-p:text-foreground/90
          prose-li:text-foreground/90
          prose-strong:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-ul:my-4 prose-li:my-1"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Divider */}
      <div className="border-t border-border my-12" />

      {/* CTA block */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 mb-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-display font-semibold text-base mb-1">Нужны пиломатериалы?</p>
          <p className="text-sm text-muted-foreground">
            Ознакомьтесь с нашим каталогом или рассчитайте количество материала для вашего проекта
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/catalog"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Каталог
          </Link>
          <Link
            href="/calculator"
            className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
          >
            Калькулятор
          </Link>
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-primary mb-5">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-widest">Похожие статьи</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/news/${r.slug}`}
                className="group flex flex-col bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all"
              >
                {r.topic && (
                  <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${topicClass(r.topic)}`}>
                    {r.topic}
                  </span>
                )}
                <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {r.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
