"use client";

/**
 * AdminSearchPanel — поиск админки выезжает слева (side-panel).
 *
 * Сессия 39 (28.04.2026): после фидбека Армана — поиск делаем как в магазине
 * (открывается слева, не центральный modal). Использует SidePanel из магазина
 * для единого UX.
 *
 * Что ищет:
 *  1. Разделы админки (instant, фильтр по allNavItems)
 *  2. Товары магазина (через /api/search — debounced)
 *  3. Заказы / Клиенты — заглушка «скоро» (расширим следующими заходами)
 *
 * Структура (1-в-1 как магазинный поиск на скриншоте Армана):
 *  - Search input
 *  - Категории (4 быстрых раздела как карточки 2x2)
 *  - Популярные товары (если что-то найдено по query)
 *  - Быстрые действия (реальные ссылки для staff)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search, Loader2, ShoppingBag, Package, UserCircle, BarChart2,
  ArrowRight, Truck, Receipt, Plus, Users, Mail, X,
} from "lucide-react";
import { SidePanel } from "@/components/store/side-panel";
import { useAdminLang } from "@/lib/admin-lang-context";
import { allNavItems, GROUP_LABELS, type NavItem } from "@/components/admin/admin-nav";
import { formatPrice } from "@/lib/utils";

interface ProductResult {
  id: string;
  slug: string;
  name: string;
  category: { name: string };
  images: string[];
  saleUnit: string;
  variants: { pricePerCube: number | null; pricePerPiece: number | null }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  role: string;
}

// ── 4 быстрых категории-раздела (карточки 2x2) ──
const QUICK_SECTIONS_STAFF = [
  { href: "/admin/orders", label: "Заказы", hint: "Активные, история", icon: ShoppingBag, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"] },
  { href: "/admin/products", label: "Товары", hint: "Каталог, склад", icon: Package, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"] },
  { href: "/admin/clients", label: "Клиенты", hint: "База покупателей", icon: UserCircle, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { href: "/admin/analytics", label: "Аналитика", hint: "Выручка, отчёты", icon: BarChart2, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
];
const QUICK_SECTIONS_USER = [
  { href: "/cabinet/orders", label: "Мои заказы", hint: "Активные, история", icon: ShoppingBag, roles: ["USER"] },
  { href: "/catalog", label: "Каталог", hint: "Товары магазина", icon: Package, roles: ["USER"] },
  { href: "/cabinet/profile", label: "Профиль", hint: "Имя, аватар, тема", icon: UserCircle, roles: ["USER"] },
  { href: "/cabinet/reviews", label: "Мои отзывы", hint: "Оценки и фото", icon: BarChart2, roles: ["USER"] },
];

// ── Быстрые действия staff — не подсказки, а прямые переходы ──
const QUICK_ACTIONS_STAFF = [
  { href: "/admin/orders/new", label: "Новый заказ", icon: Plus, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"] },
  { href: "/admin/delivery", label: "Доставка", icon: Truck, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER"] },
  { href: "/admin/staff", label: "Команда", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/aray/costs", label: "Расходы Арая", icon: Receipt, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/email", label: "Email рассылка", icon: Mail, roles: ["SUPER_ADMIN", "ADMIN"] },
];
const QUICK_HINTS_USER = [
  "Доска обрезная", "Брус 150×150", "Вагонка", "Планкен", "Лиственница",
];

export function AdminSearchPanel({ open, onClose, role }: Props) {
  const { t } = useAdminLang();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUser = role === "USER";

  // ── Auto-focus ──
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setProducts([]);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // ── Поиск товаров (debounced) ──
  useEffect(() => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.results || []);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Локальный поиск по разделам ──
  const visibleSections = useMemo(
    () => allNavItems.filter((i) => i.roles.includes(role)),
    [role]
  );
  const matchedSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return visibleSections.filter((i) => {
      const label = (i.labelKey ? t(i.labelKey) : i.label).toLowerCase();
      const groupLabel = (GROUP_LABELS[i.group] || "").toLowerCase();
      return label.includes(q) || groupLabel.includes(q) || i.href.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [visibleSections, query, t]);

  const quickSections = useMemo(() => {
    const list = isUser ? QUICK_SECTIONS_USER : QUICK_SECTIONS_STAFF;
    return list.filter((s) => s.roles.includes(role));
  }, [role, isUser]);

  const quickActions = useMemo(
    () => (isUser ? [] : QUICK_ACTIONS_STAFF.filter((a) => a.roles.includes(role))),
    [role, isUser]
  );
  const quickHints = isUser ? QUICK_HINTS_USER : [];

  const showCategories = !query;
  const showHints = !query;
  const showSections = matchedSections.length > 0;
  const showProducts = !loadingProducts && products.length > 0;
  const showLoading = loadingProducts && query.length >= 2;
  const showEmpty =
    !loadingProducts &&
    query.length >= 2 &&
    matchedSections.length === 0 &&
    products.length === 0;

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Поиск"
      icon={<Search className="w-4 h-4" strokeWidth={2} />}
      iconTone="bg-primary/10 text-primary"
      maxWidth="520px"
      side="left"
    >
      <div className="px-4 sm:px-5 py-4 space-y-5">
        {/* Search input */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-11 rounded-xl bg-background border border-border focus-within:border-primary/40 transition-all shadow-sm">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isUser ? "Доска, брус, вагонка, 50×150…" : "Раздел, товар, заказ, клиент…"}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            style={{ fontSize: 16 }}
          />
          {loadingProducts && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
          {query && !loadingProducts && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Категории (когда нет query) */}
        {showCategories && (
          <div>
            <h3 className="font-display font-semibold text-xs mb-2.5 text-muted-foreground uppercase tracking-wider">
              Категории
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickSections.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border hover:bg-accent hover:border-primary/30 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">
                        {s.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {s.hint}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Найденные разделы */}
        {showSections && (
          <div>
            <h3 className="font-display font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">
              Разделы
            </h3>
            <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border">
              {matchedSections.map((i) => {
                const ItemIcon = i.icon;
                const label = i.labelKey ? t(i.labelKey) : i.label;
                const groupLabel = GROUP_LABELS[i.group] || "";
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ItemIcon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-tight truncate">{label}</p>
                      {groupLabel && (
                        <p className="text-[11px] text-muted-foreground truncate">{groupLabel}</p>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Товары — реальный API */}
        {showProducts && (
          <div>
            <h3 className="font-display font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">
              Популярные товары
            </h3>
            <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border">
              {products.slice(0, 5).map((p) => {
                const minPrice = p.variants.reduce((min, v) => {
                  const price = v.pricePerCube ?? v.pricePerPiece;
                  return price !== null && price < min ? price : min;
                }, Infinity);
                const productHref = isUser ? `/product/${p.slug}` : `/admin/products/${p.id}`;
                return (
                  <Link
                    key={p.id}
                    href={productHref}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground opacity-50" strokeWidth={1.75} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-1 leading-tight">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.category.name}</p>
                    </div>
                    {minPrice !== Infinity && (
                      <p className="text-sm font-semibold text-primary shrink-0">от {formatPrice(minPrice)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading state товаров */}
        {showLoading && (
          <div className="py-6 text-center">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              По запросу «{query}» ничего не найдено
            </p>
            <button
              onClick={() => setQuery("")}
              className="mt-2 text-primary hover:underline text-xs"
            >
              Сбросить
            </button>
          </div>
        )}

        {/* Быстрые действия staff / быстрый поиск user */}
        {showHints && quickActions.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-xs mb-2.5 text-muted-foreground uppercase tracking-wider">
              Быстрые действия
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40 border border-border hover:bg-accent hover:border-primary/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Быстрый поиск user (chips, когда нет query) */}
        {showHints && quickHints.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-xs mb-2.5 text-muted-foreground uppercase tracking-wider">
              Быстрый поиск
            </h3>
            <div className="flex flex-wrap gap-2">
              {quickHints.map((hint) => (
                <button
                  key={hint}
                  onClick={() => setQuery(hint)}
                  className="px-3 py-1.5 rounded-full bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors text-xs"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SidePanel>
  );
}
