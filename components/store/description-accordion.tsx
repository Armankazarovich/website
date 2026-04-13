"use client";

import { useState } from "react";
import { ChevronDown, Star, MessageSquare } from "lucide-react";
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
    return `${name} от производителя ООО «ПИТИ» в Химках. Используется в строительстве, отделке и мебельном производстве. Все плитные материалы соответствуют техническим нормативам по прочности, влагостойкости и экологической безопасности. Поставляем оптом от склада.`;
  }

  return `${name} от производителя ООО «ПИТИ» в Химках (${category}). Все материалы проходят входной контроль качества. Работаем по ГОСТ, предоставляем сертификаты качества по запросу. Гибкая система скидок при оптовых заказах. Доставка 1–3 дня по Москве и Московской области собственным транспортом.`;
}

/* ─── types ─── */
interface ReviewData {
  id: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface Props {
  name: string;
  category: string;
  description?: string | null;
  /* Review section */
  reviews?: ReviewData[];
  showReviews?: boolean;
  productId?: string;
  productName?: string;
  userName?: string | null;
  userEmail?: string | null;
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

/* ─── Main accordion ─── */
export function DescriptionAccordion({
  name,
  category,
  description,
  reviews = [],
  showReviews = false,
  productId,
  productName,
  userName,
  userEmail,
  isLoggedIn = false,
}: Props) {
  const [descOpen, setDescOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const text = description || generateDescription(name, category);

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
        <div className="px-5 py-4 border-t border-border bg-card/50">
          <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {["ГОСТ", "Прямой производитель", "Доставка 1–3 дня", "Официальное ООО"].map(
              (tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground border border-border"
                >
                  ✓ {tag}
                </span>
              )
            )}
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
                        <p className="text-[11px] text-muted-foreground/50 mt-2">
                          {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
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
