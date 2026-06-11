"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  MessageSquare,
  Package,
  Phone,
  Ruler,
  Star,
  Store,
  ThumbsDown,
  ThumbsUp,
  Truck,
} from "lucide-react";
import { ReviewForm } from "./review-form";

/* ─── auto-generate description if product has none ─── */
function generateDescription(name: string, category: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("доска")) {
    return `${name} — обрезной пиломатериал из древесины хвойных пород (сосна, ель). Применяется в строительстве, отделке, производстве мебели и упаковки. Наша продукция соответствует ГОСТ 8486-86. Влажность — естественная или камерная сушка до 18–22%. Точные сечения по чертежу, минимальные дефекты. Доставляем по Москве и МО за 1–3 рабочих дня с погрузкой.`;
  }
  if (lower.includes("брус")) {
    return `${name} — конструкционный пиломатериал для возведения каркасных домов, перегородок, стропильных систем и опалубки. Изготовлен из сосны/ели, соответствует ГОСТ 24454-80. Ровные торцы, точные сечения, небольшое количество сучков. Поставляем оптом и в розницу напрямую с производства без наценки посредников.`;
  }
  if (lower.includes("вагонка")) {
    return `${name} — профилированная обшивочная доска для внутренней и наружной отделки помещений. Система крепления «шип-паз» обеспечивает плотное прилегание без зазоров. Подходит для бань, саун, жилых и хозяйственных помещений. Производится из сухой сосны/ели, поверхность строгана до гладкости.`;
  }
  if (lower.includes("блок-хаус") || (lower.includes("блок") && lower.includes("хаус"))) {
    return `${name} — имитация оцилиндрованного бревна для наружной и внутренней отделки фасадов и интерьеров. Создаёт эффект деревянного сруба при значительно меньших затратах. Изготовлена из сосны/ели с обработкой от влаги. Проста в монтаже, доступна в различных сечениях и длинах.`;
  }
  if (lower.includes("планкен")) {
    return `${name} — фасадная доска с продольным скосом для современной отделки фасадов и заборов. Монтируется горизонтально или вертикально с вентиляционным зазором. Натуральная древесина хвойных пород, высокая стойкость к атмосферным воздействиям. Рекомендуется покрытие антисептиком перед монтажом.`;
  }
  if (lower.includes("фанера")) {
    return `${name} — листовой материал из шпона берёзы или хвойных пород, склеенный под давлением. Применяется в строительстве, мебельном производстве, опалубке и упаковке. Высокая прочность на изгиб, равномерная структура. Доступны марки ФК (для помещений) и ФСФ (влагостойкая для наружных работ).`;
  }
  if (lower.includes("дсп") || lower.includes("лдсп")) {
    return `${name} — плитный материал из древесных частиц, связанных смолой и спрессованных под высоким давлением. Широко используется в производстве корпусной мебели, строительстве перегородок и черновых полов. ЛДСП покрыто ламинатом, устойчивым к механическим повреждениям и влаге.`;
  }
  if (lower.includes("мдф") || lower.includes("осб")) {
    return `${name} от производителя ПилоРус в Химках. Используется в строительстве, отделке и мебельном производстве. Все плитные материалы соответствуют техническим нормативам по прочности, влагостойкости и экологической безопасности. Поставляем оптом от склада.`;
  }

  return `${name} от производителя ПилоРус в Химках (${category}). Все материалы проходят входной контроль качества. Работаем по ГОСТ, предоставляем сертификаты качества по запросу. Гибкая система скидок при оптовых заказах. Доставка 1–3 дня по Москве и Московской области собственным транспортом.`;
}

/* ─── types ─── */
interface ReviewData {
  id: string;
  name: string;
  rating: number;
  text: string;
  images?: string[];
  likes?: number;
  dislikes?: number;
  adminReply?: string | null;
  createdAt: string;
  user?: { avatarUrl: string | null } | null;
}

interface Props {
  name: string;
  category: string;
  categorySlug?: string;
  description?: string | null;
  /* Review section */
  reviews?: ReviewData[];
  showReviews?: boolean;
  productId?: string;
  productName?: string;
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null;
  isLoggedIn?: boolean;
}

/* ─── stars helper ─── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`transition-colors ${
            i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted-foreground/20 text-muted-foreground/20"
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function splitDescription(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/* ─── Like/Dislike buttons ─── */
function ReviewLikes({ reviewId, likes, dislikes }: { reviewId: string; likes: number; dislikes: number }) {
  const [l, setL] = useState(likes);
  const [d, setD] = useState(dislikes);
  const [voted, setVoted] = useState<string | null>(null);

  const vote = async (action: "like" | "dislike") => {
    if (voted) return;
    setVoted(action);
    if (action === "like") setL((v) => v + 1);
    else setD((v) => v + 1);
    try {
      await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => vote("like")} disabled={!!voted}
        className={`flex items-center gap-1 text-[11px] transition-colors ${voted === "like" ? "text-green-600" : "text-muted-foreground/50 hover:text-green-600"}`}>
        <ThumbsUp className="w-3 h-3" />{l > 0 && l}
      </button>
      <button onClick={() => vote("dislike")} disabled={!!voted}
        className={`flex items-center gap-1 text-[11px] transition-colors ${voted === "dislike" ? "text-red-500" : "text-muted-foreground/50 hover:text-red-500"}`}>
        <ThumbsDown className="w-3 h-3" />{d > 0 && d}
      </button>
    </div>
  );
}

/* ─── Main accordion ─── */
export function DescriptionAccordion({
  name,
  category,
  categorySlug,
  description,
  reviews = [],
  showReviews = false,
  productId,
  productName,
  userName,
  userEmail,
  userAvatar,
  isLoggedIn = false,
}: Props) {
  const [descOpen, setDescOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const text = description || generateDescription(name, category);
  const descriptionParts = splitDescription(text);
  const categoryHref = categorySlug ? `/catalog?category=${categorySlug}` : "/catalog";
  const usefulLinks = [
    { href: categoryHref, label: `Все товары: ${category}`, icon: Package },
    { href: "/delivery", label: "Доставка и оплата", icon: Truck },
    { href: "/calculator", label: "Калькулятор объема", icon: Calculator },
    { href: "/contacts", label: "Связаться с менеджером", icon: Phone },
  ];
  const choicePoints = [
    { label: "Сечение и длину под задачу", icon: Ruler },
    { label: "Сорт, влажность и поверхность", icon: ClipboardCheck },
    { label: "Объем, доставку и разгрузку", icon: Truck },
  ];

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* ─── Panel 1: Description ─── */}
      <button
        type="button"
        onClick={() => setDescOpen(!descOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/50 transition-colors text-left"
      >
        <span className="font-display font-semibold text-base">
          Описание и характеристики
        </span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            descOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {descOpen && (
        <div className="border-t border-border bg-card/50 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
            <div className="rounded-2xl border border-border/75 bg-background/55 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="store-icon-tile h-10 w-10 rounded-xl">
                  <Package className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Описание товара</h3>
                  <p className="truncate text-xs text-muted-foreground">{category}</p>
                </div>
              </div>
              <div className="space-y-3">
                {descriptionParts.map((part, index) => (
                  <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                    {part}
                  </p>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["ГОСТ", "Прямой производитель", "Доставка 1–3 дня", "Официальное ООО"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3 text-brand-green" />
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-2">
                {usefulLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-[52px] items-center gap-3 rounded-2xl border border-border/75 bg-background/55 px-3 py-2.5 text-sm font-semibold text-foreground/82 transition-colors hover:border-primary/45 hover:text-primary"
                  >
                    <span className="store-icon-tile h-8 w-8 rounded-xl">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">{label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                ))}
              </div>

              <div className="rounded-2xl border border-border/75 bg-background/55 p-4">
                <h3 className="text-sm font-semibold text-foreground">Что уточнить перед заказом</h3>
                <div className="mt-3 space-y-2">
                  {choicePoints.map(({ label, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                      <span className="store-icon-tile mt-0.5 h-6 w-6 shrink-0 rounded-xl">
                        <Icon className="h-3 w-3" />
                      </span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Panel 2: Reviews + Form ─── */}
      {showReviews && (
        <>
          <button
            type="button"
            onClick={() => setReviewsOpen(!reviewsOpen)}
            className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/50 transition-colors text-left border-t border-border"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessageSquare className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
              <span className="font-display font-semibold text-base">
                Отзывы покупателей
              </span>
              {reviews.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal shrink-0">
                  ({reviews.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {reviews.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Stars rating={Math.round(avgRating)} size={14} />
                  <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                </div>
              )}
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                  reviewsOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {reviewsOpen && (
            <div className="border-t border-border bg-card/50">
              {/* Review summary + cards */}
              {reviews.length > 0 ? (
                <div className="px-5 py-5">
                  {/* Summary bar */}
                  <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border/50">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground leading-none">
                        {avgRating.toFixed(1)}
                      </p>
                      <Stars rating={Math.round(avgRating)} size={16} />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        средняя оценка
                      </p>
                    </div>
                    <div className="h-12 w-px bg-border" />
                    <div>
                      <p className="font-semibold text-sm">
                        {reviews.length}{" "}
                        {reviews.length === 1
                          ? "отзыв"
                          : reviews.length < 5
                          ? "отзыва"
                          : "отзывов"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        от наших клиентов
                      </p>
                    </div>
                  </div>

                  {/* Review cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reviews.slice(0, 6).map((review) => (
                      <div
                        key={review.id}
                        className="bg-background border border-border rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {review.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-sm">
                              {review.name}
                            </span>
                          </div>
                          <Stars rating={review.rating} size={13} />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {review.text}
                        </p>

                        {/* Photos — filter out broken base64 from old reviews */}
                        {review.images && review.images.filter(u => u && !u.startsWith("data:")).length > 0 && (
                          <div className="flex gap-1.5 mt-3 overflow-x-auto">
                            {review.images.filter(u => u && !u.startsWith("data:")).map((img, i) => (
                              <img key={i} src={img} alt="Фото к отзыву" className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover border border-border shrink-0"
                                onError={(e) => { const el = e.target as HTMLImageElement; el.style.opacity = "0.3"; el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' fill='%23999'%3E%3Crect width='64' height='64' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' font-size='10'%3E%F0%9F%96%BC%EF%B8%8F%3C/text%3E%3C/svg%3E"; }} />
                            ))}
                          </div>
                        )}

                        {/* Admin reply */}
                        {review.adminReply && (
                          <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg py-2 pr-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Store className="w-3 h-3 text-primary" />
                              <span className="text-[11px] font-semibold text-primary">Ответ магазина</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{review.adminReply}</p>
                          </div>
                        )}

                        {/* Date + Likes */}
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[11px] text-muted-foreground/50">
                            {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <ReviewLikes reviewId={review.id} likes={review.likes || 0} dislikes={review.dislikes || 0} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-6 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Пока нет отзывов. Будьте первым!
                  </p>
                </div>
              )}

              {/* ─── Review form ─── */}
              {productId && (
                <div className="px-5 pb-5 pt-2">
                  <div className="border-t border-border/50 pt-5">
                    <ReviewForm
                      productId={productId}
                      productName={productName || name}
                      userName={userName}
                      userEmail={userEmail}
                      userAvatar={userAvatar}
                      isLoggedIn={isLoggedIn}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
