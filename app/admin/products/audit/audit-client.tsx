"use client";

/**
 * Аудит каталога — клиентская часть.
 * Группирует проблемы, показывает чеклист, даёт bulk actions через API.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Eye,
  Image as ImageIcon,
  FileText,
  Copy,
  FolderOpen,
  Power,
  PowerOff,
  Loader2,
  RefreshCw,
  Package,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Variant {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
  stockQty: number | null;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  images: string[];
  active: boolean;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  variants: Variant[];
}

interface EmptyCategory {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  products: Product[];
  emptyCategories: EmptyCategory[];
}

export function AuditClient({ products, emptyCategories }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [working, setWorking] = useState<string | null>(null);
  const [rowWorking, setRowWorking] = useState<string | null>(null);

  // ─── Вычисляем проблемы ──────────────────────────────────────

  const checks = useMemo(() => {
    // 1) Варианты без цены (обе цены null)
    const variantsNoPrice: Array<{ product: Product; variant: Variant }> = [];
    // 2) Варианты НЕ в наличии
    const variantsOutOfStock: Array<{ product: Product; variant: Variant }> = [];
    // 3) Товары без фото
    const productsNoImage: Product[] = [];
    // 4) Товары без описания
    const productsNoDescription: Product[] = [];
    // 5) Товары у которых ВСЕ варианты скрыты (без цены / не в наличии)
    const productsAllHidden: Product[] = [];
    // 6) Товары без вариантов
    const productsNoVariants: Product[] = [];
    // 7) Потенциальные дубли по нормализованному имени
    const nameMap = new Map<string, Product[]>();
    for (const p of products) {
      const norm = p.name.toLowerCase().replace(/\s+/g, " ").trim();
      if (!nameMap.has(norm)) nameMap.set(norm, []);
      nameMap.get(norm)!.push(p);
    }
    const duplicates: Product[][] = [];
    for (const arr of nameMap.values()) {
      if (arr.length > 1) duplicates.push(arr);
    }

    for (const p of products) {
      if (p.variants.length === 0) productsNoVariants.push(p);
      if (!p.images || p.images.length === 0) productsNoImage.push(p);
      if (!p.description || p.description.trim().length < 20) productsNoDescription.push(p);

      let usableVariants = 0;
      for (const v of p.variants) {
        const noPrice = v.pricePerCube === null && v.pricePerPiece === null;
        if (noPrice) variantsNoPrice.push({ product: p, variant: v });
        if (!v.inStock) variantsOutOfStock.push({ product: p, variant: v });
        if (!noPrice && v.inStock) usableVariants++;
      }
      if (p.variants.length > 0 && usableVariants === 0 && p.active) {
        productsAllHidden.push(p);
      }
    }

    return {
      variantsNoPrice,
      variantsOutOfStock,
      productsNoImage,
      productsNoDescription,
      productsAllHidden,
      productsNoVariants,
      duplicates,
    };
  }, [products]);

  const totalProblems =
    checks.variantsNoPrice.length +
    checks.variantsOutOfStock.length +
    checks.productsNoImage.length +
    checks.productsNoDescription.length +
    checks.productsAllHidden.length +
    checks.productsNoVariants.length +
    checks.duplicates.length +
    emptyCategories.length;

  const totalVariants = products.reduce((s, p) => s + p.variants.length, 0);
  const activeProducts = products.filter((p) => p.active).length;

  // ─── Bulk actions ────────────────────────────────────────────

  async function bulkAction(action: string, ids: string[], label: string) {
    if (ids.length === 0) return;
    if (!confirm(`${label}: ${ids.length} записей. Продолжить?`)) return;
    setWorking(action);
    try {
      const res = await fetch("/api/admin/products/audit-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: `${label}`, description: `Обновлено ${data.updated}. Список обновляется…` });
        router.refresh();
      } else {
        toast({
          title: "Ошибка",
          description: data.error || "Не удалось выполнить действие",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Ошибка сети",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  }

  /** Одиночное действие по кнопке в строке — без confirm, с мгновенным toast */
  async function rowAction(action: string, id: string, successTitle: string) {
    setRowWorking(`${action}:${id}`);
    try {
      const res = await fetch("/api/admin/products/audit-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [id] }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: successTitle });
        router.refresh();
      } else {
        toast({
          title: "Ошибка",
          description: data.error || "Не удалось выполнить",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "Ошибка сети", description: String(e), variant: "destructive" });
    } finally {
      setRowWorking(null);
    }
  }

  const hideNoPrice = () =>
    bulkAction(
      "hide-variants",
      checks.variantsNoPrice.map((v) => v.variant.id),
      "Скрыть варианты без цены",
    );

  const deactivateAllHidden = () =>
    bulkAction(
      "deactivate-products",
      checks.productsAllHidden.map((p) => p.id),
      "Деактивировать товары с 0 доступных вариантов",
    );

  // ─── UI ──────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Хедер */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Товары
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-semibold">Аудит каталога</h1>
        <button
          onClick={() => router.refresh()}
          className="ml-auto inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-border hover:bg-primary/5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Обновить
        </button>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Товары всего" value={products.length} icon={Package} />
        <StatCard label="Активные" value={activeProducts} icon={Power} color="emerald" />
        <StatCard label="Вариантов" value={totalVariants} icon={Package} />
        <StatCard
          label="Проблем найдено"
          value={totalProblems}
          icon={AlertTriangle}
          color={totalProblems > 0 ? "amber" : "emerald"}
        />
      </div>

      {/* Если всё ок */}
      {totalProblems === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
          <div>
            <div className="text-lg font-semibold text-emerald-500">Каталог чистый</div>
            <div className="text-sm text-muted-foreground mt-1">
              Нет вариантов без цен, без наличия, товаров без фото/описания или пустых категорий. Можно запускать рекламу.
            </div>
          </div>
        </div>
      )}

      {/* 1. Варианты без цены */}
      {checks.variantsNoPrice.length > 0 && (
        <ProblemSection
          icon={AlertTriangle}
          title={`Варианты без цены (${checks.variantsNoPrice.length})`}
          subtitle="Эти варианты нельзя купить — ни цена за м³, ни цена за шт не задана. Рекомендуется скрыть (данные сохранятся, клиент вернёт когда захочет)."
          color="amber"
          action={
            <button
              onClick={hideNoPrice}
              disabled={working !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-all"
            >
              {working === "hide-variants" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Скрыть все без цены
            </button>
          }
        >
          <Table
            headers={["Товар", "Размер", "₽/м³", "₽/шт", "В наличии", "Действие"]}
            rows={checks.variantsNoPrice.map((v) => [
              <Link
                key="n"
                href={`/admin/products/${v.product.id}`}
                className="text-primary hover:underline"
              >
                {v.product.name}
              </Link>,
              <span key="s" className="font-mono text-xs">
                {v.variant.size}
              </span>,
              "—",
              "—",
              v.variant.inStock ? (
                <span key="is" className="text-emerald-500 text-xs">да</span>
              ) : (
                <span key="is" className="text-muted-foreground text-xs">нет</span>
              ),
              <RowAction
                key="a"
                busy={rowWorking === `hide-variants:${v.variant.id}`}
                disabled={!!working || !!rowWorking}
                onClick={() =>
                  rowAction("hide-variants", v.variant.id, `Вариант скрыт: ${v.product.name} · ${v.variant.size}`)
                }
                icon={EyeOff}
                label="Скрыть"
                tone="amber"
              />,
            ])}
          />
        </ProblemSection>
      )}

      {/* 2. Товары с 0 доступных вариантов (все скрыты) */}
      {checks.productsAllHidden.length > 0 && (
        <ProblemSection
          icon={PowerOff}
          title={`Активные товары без доступных вариантов (${checks.productsAllHidden.length})`}
          subtitle="Эти товары помечены как «активные», но все их варианты скрыты (нет цены или нет в наличии). На сайте они показываются, но купить ничего нельзя — плохой UX для Директа."
          color="amber"
          action={
            <button
              onClick={deactivateAllHidden}
              disabled={working !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-all"
            >
              {working === "deactivate-products" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PowerOff className="w-4 h-4" />
              )}
              Деактивировать все
            </button>
          }
        >
          <Table
            headers={["Товар", "Вариантов всего", "Категория", "Действие"]}
            rows={checks.productsAllHidden.map((p) => [
              <Link
                key="n"
                href={`/admin/products/${p.id}`}
                className="text-primary hover:underline"
              >
                {p.name}
              </Link>,
              p.variants.length,
              p.category?.name || "—",
              <RowAction
                key="a"
                busy={rowWorking === `deactivate-products:${p.id}`}
                disabled={!!working || !!rowWorking}
                onClick={() =>
                  rowAction("deactivate-products", p.id, `Товар скрыт: ${p.name}`)
                }
                icon={PowerOff}
                label="Деактивировать"
                tone="amber"
              />,
            ])}
          />
        </ProblemSection>
      )}

      {/* 3. Товары без фото */}
      {checks.productsNoImage.length > 0 && (
        <ProblemSection
          icon={ImageIcon}
          title={`Товары без фото (${checks.productsNoImage.length})`}
          subtitle="Без фото карточка на сайте выглядит неполноценно. В Директе низкий CTR. Добавь хотя бы одно фото каждому."
          color="amber"
        >
          <Table
            headers={["Товар", "Категория", "Варианты", "Активен", "Действие"]}
            rows={checks.productsNoImage.map((p) => [
              <Link
                key="n"
                href={`/admin/products/${p.id}`}
                className="text-primary hover:underline"
              >
                {p.name}
              </Link>,
              p.category?.name || "—",
              p.variants.length,
              p.active ? (
                <span key="a" className="text-emerald-500 text-xs">да</span>
              ) : (
                <span key="a" className="text-muted-foreground text-xs">нет</span>
              ),
              p.active ? (
                <RowAction
                  key="act"
                  busy={rowWorking === `deactivate-products:${p.id}`}
                  disabled={!!working || !!rowWorking}
                  onClick={() =>
                    rowAction("deactivate-products", p.id, `Товар скрыт: ${p.name}`)
                  }
                  icon={PowerOff}
                  label="Скрыть"
                  tone="amber"
                />
              ) : (
                <RowAction
                  key="act"
                  busy={rowWorking === `activate-products:${p.id}`}
                  disabled={!!working || !!rowWorking}
                  onClick={() =>
                    rowAction("activate-products", p.id, `Товар показан: ${p.name}`)
                  }
                  icon={Power}
                  label="Показать"
                  tone="emerald"
                />
              ),
            ])}
          />
        </ProblemSection>
      )}

      {/* 4. Товары без описания */}
      {checks.productsNoDescription.length > 0 && (
        <ProblemSection
          icon={FileText}
          title={`Товары без описания (${checks.productsNoDescription.length})`}
          subtitle="Описание короче 20 символов или отсутствует. SEO страдает, в Директе низкое качество объявления."
          color="amber"
        >
          <Table
            headers={["Товар", "Категория", "Длина описания", "Действие"]}
            rows={checks.productsNoDescription.map((p) => [
              <Link
                key="n"
                href={`/admin/products/${p.id}`}
                className="text-primary hover:underline"
              >
                {p.name}
              </Link>,
              p.category?.name || "—",
              p.description?.trim().length ?? 0,
              p.active ? (
                <RowAction
                  key="act"
                  busy={rowWorking === `deactivate-products:${p.id}`}
                  disabled={!!working || !!rowWorking}
                  onClick={() =>
                    rowAction("deactivate-products", p.id, `Товар скрыт: ${p.name}`)
                  }
                  icon={PowerOff}
                  label="Скрыть"
                  tone="amber"
                />
              ) : (
                <RowAction
                  key="act"
                  busy={rowWorking === `activate-products:${p.id}`}
                  disabled={!!working || !!rowWorking}
                  onClick={() =>
                    rowAction("activate-products", p.id, `Товар показан: ${p.name}`)
                  }
                  icon={Power}
                  label="Показать"
                  tone="emerald"
                />
              ),
            ])}
          />
        </ProblemSection>
      )}

      {/* 5. Товары без вариантов вообще */}
      {checks.productsNoVariants.length > 0 && (
        <ProblemSection
          icon={AlertTriangle}
          title={`Товары без вариантов (${checks.productsNoVariants.length})`}
          subtitle="У этих товаров вообще нет размеров/цен — карточка на сайте пустая."
          color="red"
        >
          <Table
            headers={["Товар", "Категория", "Активен", "Действие"]}
            rows={checks.productsNoVariants.map((p) => [
              <Link
                key="n"
                href={`/admin/products/${p.id}`}
                className="text-primary hover:underline"
              >
                {p.name}
              </Link>,
              p.category?.name || "—",
              p.active ? (
                <span key="a" className="text-emerald-500 text-xs">да</span>
              ) : (
                <span key="a" className="text-muted-foreground text-xs">нет</span>
              ),
              p.active ? (
                <RowAction
                  key="act"
                  busy={rowWorking === `deactivate-products:${p.id}`}
                  disabled={!!working || !!rowWorking}
                  onClick={() =>
                    rowAction("deactivate-products", p.id, `Товар скрыт: ${p.name}`)
                  }
                  icon={PowerOff}
                  label="Скрыть"
                  tone="amber"
                />
              ) : (
                <RowAction
                  key="act"
                  busy={rowWorking === `activate-products:${p.id}`}
                  disabled={!!working || !!rowWorking}
                  onClick={() =>
                    rowAction("activate-products", p.id, `Товар показан: ${p.name}`)
                  }
                  icon={Power}
                  label="Показать"
                  tone="emerald"
                />
              ),
            ])}
          />
        </ProblemSection>
      )}

      {/* 6. Варианты не в наличии (информационно) */}
      {checks.variantsOutOfStock.length > 0 && (
        <ProblemSection
          icon={EyeOff}
          title={`Варианты не в наличии (${checks.variantsOutOfStock.length})`}
          subtitle="Эти варианты уже скрыты с сайта (inStock=false) и их можно вернуть в один клик из карточки товара, когда снова появятся."
          color="muted"
        >
          <Table
            headers={["Товар", "Размер", "₽/м³", "₽/шт", "Действие"]}
            rows={checks.variantsOutOfStock.map((v) => [
              <Link
                key="n"
                href={`/admin/products/${v.product.id}`}
                className="text-primary hover:underline"
              >
                {v.product.name}
              </Link>,
              <span key="s" className="font-mono text-xs">
                {v.variant.size}
              </span>,
              v.variant.pricePerCube ? v.variant.pricePerCube.toLocaleString("ru-RU") : "—",
              v.variant.pricePerPiece ? v.variant.pricePerPiece.toLocaleString("ru-RU") : "—",
              <RowAction
                key="a"
                busy={rowWorking === `show-variants:${v.variant.id}`}
                disabled={!!working || !!rowWorking}
                onClick={() =>
                  rowAction("show-variants", v.variant.id, `Вариант показан: ${v.product.name} · ${v.variant.size}`)
                }
                icon={Eye}
                label="Показать"
                tone="emerald"
              />,
            ])}
          />
        </ProblemSection>
      )}

      {/* 7. Дубли */}
      {checks.duplicates.length > 0 && (
        <ProblemSection
          icon={Copy}
          title={`Возможные дубли (${checks.duplicates.length} групп)`}
          subtitle="Товары с одинаковыми названиями. Проверь вручную — возможно один из них нужно удалить/объединить."
          color="amber"
        >
          <div className="space-y-3">
            {checks.duplicates.map((group, i) => (
              <div key={i} className="bg-muted/40 rounded-xl p-3 border border-border">
                <div className="text-xs text-muted-foreground mb-2">Группа #{i + 1}</div>
                <div className="space-y-1.5">
                  {group.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/products/${p.id}`}
                      className="flex items-center gap-3 text-sm hover:bg-primary/5 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <span className="font-medium text-primary">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.category?.name || "—"} · {p.variants.length} вар · {p.active ? "активен" : "скрыт"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ProblemSection>
      )}

      {/* 8. Пустые категории */}
      {emptyCategories.length > 0 && (
        <ProblemSection
          icon={FolderOpen}
          title={`Пустые категории (${emptyCategories.length})`}
          subtitle="В этих категориях нет товаров. Клиент кликает — ничего не видит. Либо наполни, либо скрой."
          color="amber"
        >
          <Table
            headers={["Категория", "Slug"]}
            rows={emptyCategories.map((c) => [
              <Link
                key="n"
                href={`/admin/categories`}
                className="text-primary hover:underline"
              >
                {c.name}
              </Link>,
              <code key="s" className="text-xs text-muted-foreground">
                {c.slug}
              </code>,
            ])}
          />
        </ProblemSection>
      )}
    </div>
  );
}

// ─── Вспомогательные компоненты ──────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: "emerald" | "amber";
}) {
  const colorClass =
    color === "emerald" ? "text-emerald-500" :
    color === "amber" ? "text-amber-500" :
    "text-foreground";
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div className={`text-2xl font-semibold ${colorClass}`}>{value.toLocaleString("ru-RU")}</div>
    </div>
  );
}

function ProblemSection({
  icon: Icon,
  title,
  subtitle,
  color,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: "amber" | "red" | "muted";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bgClass =
    color === "red" ? "bg-red-500/5 border-red-500/30" :
    color === "amber" ? "bg-amber-500/5 border-amber-500/30" :
    "bg-muted/40 border-border";
  const iconClass =
    color === "red" ? "text-red-500" :
    color === "amber" ? "text-amber-500" :
    "text-muted-foreground";
  return (
    <div className={`rounded-2xl border p-5 ${bgClass}`}>
      <div className="flex items-start gap-3 mb-4">
        <Icon className={`w-5 h-5 ${iconClass} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function RowAction({
  busy,
  disabled,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "amber" | "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/15"
      : tone === "red"
      ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15"
      : "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/15";
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium disabled:opacity-50 transition-colors ${toneClass}`}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
      {label}
    </button>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (React.ReactNode[])[] }) {
  return (
    <div className="max-h-80 overflow-auto border border-border/40 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border hover:bg-primary/[0.03]">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
