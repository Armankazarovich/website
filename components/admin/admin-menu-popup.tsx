"use client";

/**
 * AdminMenuPopup — попап-меню админки в стиле магазинного search-modal.
 *
 * Сессия 39 (28.04.2026): после переезда на дизайн-систему магазина админка
 * больше не имеет постоянного sidebar. Навигация открывается из хедера по
 * клику на кнопку «Меню» или ⌘K / Ctrl+K.
 *
 * Стиль 1-в-1 как components/store/search-modal.tsx:
 *  - bg-black/40 backdrop-blur-sm бэкдроп
 *  - bg-card rounded-2xl border border-border shadow-2xl контейнер
 *  - Секции с заголовками text-muted-foreground uppercase tracking-wider
 *  - Карточки: bg-muted/50 border border-border rounded-xl
 *  - Chip-кнопки: bg-accent rounded-full hover:bg-primary/10
 *  - List rows: hover:bg-accent transition-colors
 *
 * Структура:
 *  1. Search input (фильтрует все пункты меню)
 *  2. «Главное» — 4 карточки primary разделов (Дашборд, ARAY AI, Заказы, Аналитика)
 *  3. Все группы навигации списком (Продажи, Товары, Контент, ...)
 *  4. «Быстрые действия» — chip-кнопки
 */

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search, X, LayoutDashboard, Sparkles, ShoppingBag, Package,
  BookOpen, Megaphone, Settings, HelpCircle, BarChart2, UserCircle,
  Plus, Truck, Users, Mail, Receipt,
} from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import { allNavItems, GROUP_LABELS, type NavItem } from "@/components/admin/admin-nav";

// ── Иконки для каждой группы ──
const GROUP_ICONS: Record<string, React.ElementType> = {
  main: LayoutDashboard,
  personal: UserCircle,
  sales: ShoppingBag,
  aray: Sparkles,
  products: Package,
  content: BookOpen,
  marketing: Megaphone,
  settings: Settings,
  help: HelpCircle,
};

// ── Главное: 4 primary раздела (быстрый доступ) ──
type Highlight = {
  href: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  roles: string[];
};
const HIGHLIGHTS_STAFF: Highlight[] = [
  { href: "/admin", label: "Дашборд", hint: "Сводка дня, графики", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { href: "/admin/aray", label: "ARAY AI", hint: "Чат, голос, помощь", icon: Sparkles, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { href: "/admin/orders", label: "Заказы", hint: "Активные, история", icon: ShoppingBag, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"] },
  { href: "/admin/analytics", label: "Аналитика", hint: "Выручка, отчёты", icon: BarChart2, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
];
const HIGHLIGHTS_USER: Highlight[] = [
  { href: "/cabinet", label: "Главная", hint: "Сводка кабинета", icon: LayoutDashboard, roles: ["USER"] },
  { href: "/cabinet/orders", label: "Мои заказы", hint: "Активные, история", icon: ShoppingBag, roles: ["USER"] },
  { href: "/catalog", label: "Каталог", hint: "Товары магазина", icon: Package, roles: ["USER"] },
  { href: "/cabinet/profile", label: "Профиль", hint: "Имя, аватар, тема", icon: UserCircle, roles: ["USER"] },
];

// ── Быстрые действия ──
type Quick = { href: string; label: string; icon: React.ElementType; roles: string[] };
const QUICK_ACTIONS: Quick[] = [
  { href: "/admin/orders/new", label: "Новый заказ", icon: Plus, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"] },
  { href: "/admin/delivery", label: "Доставка", icon: Truck, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER"] },
  { href: "/admin/staff", label: "Команда", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/email", label: "Рассылка", icon: Mail, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/aray/costs", label: "Расходы Арая", icon: Receipt, roles: ["SUPER_ADMIN", "ADMIN"] },
];

// Порядок групп в списке
const GROUP_ORDER = [
  "main", "personal", "sales", "aray", "products",
  "content", "marketing", "settings", "help",
];

interface Props {
  open: boolean;
  onClose: () => void;
  role: string;
}

export function AdminMenuPopup({ open, onClose, role }: Props) {
  const pathname = usePathname();
  const { t } = useAdminLang();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auto-focus + Escape ──
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Закрыть при смене пути ──
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Фильтрация ──
  const visible = useMemo(
    () => allNavItems.filter((i) => i.roles.includes(role)),
    [role]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((i) => {
      const label = (i.labelKey ? t(i.labelKey) : i.label).toLowerCase();
      const groupLabel = (GROUP_LABELS[i.group] || "").toLowerCase();
      return label.includes(q) || groupLabel.includes(q) || i.href.toLowerCase().includes(q);
    });
  }, [visible, query, t]);

  // ── Группировка ──
  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    }
    const result: { key: string; label: string; icon: React.ElementType; items: NavItem[] }[] = [];
    for (const key of GROUP_ORDER) {
      const items = map.get(key);
      if (!items || items.length === 0) continue;
      // Скрываем main и personal из общего списка — они уже в Highlights
      if (!query && (key === "main" || (key === "personal" && role === "USER"))) continue;
      result.push({
        key,
        label: GROUP_LABELS[key] || key,
        icon: GROUP_ICONS[key] || LayoutDashboard,
        items,
      });
    }
    return result;
  }, [filtered, query, role]);

  const highlights = useMemo(() => {
    const list = role === "USER" ? HIGHLIGHTS_USER : HIGHLIGHTS_STAFF;
    return list.filter((h) => h.roles.includes(role));
  }, [role]);

  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((q) => q.roles.includes(role)),
    [role]
  );

  if (!open) return null;

  const showHighlights = !query && highlights.length > 0;
  const showQuick = !query && quickActions.length > 0;
  const isEmpty = filtered.length === 0;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Меню админки"
    >
      <div
        className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Поиск ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти раздел или быстрое действие…"
            aria-label="Поиск по меню админки"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={onClose}
            aria-label="Закрыть меню"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Скролл контент ── */}
        <div className="overflow-y-auto flex-1">
          {/* Highlights — главное */}
          {showHighlights && (
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
                Главное
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {highlights.map((h) => {
                  const isActive = h.href === pathname || (h.href !== "/admin" && h.href !== "/cabinet" && pathname.startsWith(h.href));
                  const Icon = h.icon;
                  return (
                    <Link
                      key={h.href}
                      href={h.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/50 border-border hover:bg-accent"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? "bg-primary/20 text-primary" : "bg-background text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-tight truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                          {h.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{h.hint}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Группы */}
          {groups.length > 0 && (
            <div className="px-4 py-2">
              {groups.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.key} className="mb-3">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1.5">
                      <Icon className="w-3 h-3 opacity-60" strokeWidth={2} />
                      {g.label}
                    </h3>
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      {g.items.map((item, idx) => {
                        const isActive = item.exact
                          ? pathname === item.href
                          : pathname.startsWith(item.href);
                        const ItemIcon = item.icon;
                        const label = item.labelKey ? t(item.labelKey) : item.label;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                              idx > 0 ? "border-t border-border" : ""
                            } ${isActive ? "bg-primary/8" : "hover:bg-accent"}`}
                          >
                            <ItemIcon
                              className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                              strokeWidth={1.75}
                            />
                            <span
                              className={`text-sm flex-1 truncate ${isActive ? "text-foreground font-medium" : "text-foreground/85"}`}
                            >
                              {label}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Быстрые действия */}
          {showQuick && (
            <div className="px-4 pt-1 pb-4">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Быстрые действия
              </h3>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((q) => {
                  const Icon = q.icon;
                  return (
                    <Link
                      key={q.href}
                      href={q.href}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors text-xs"
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                      {q.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && query && (
            <div className="px-4 py-10 text-center">
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
        </div>

        {/* Подсказка ⌘K */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between shrink-0">
          <span>Esc — закрыть</span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">⌘</kbd>
            <span className="mx-1">+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">K</kbd>
            <span className="ml-1.5">— открыть из любого места</span>
          </span>
        </div>
      </div>
    </div>
  );
}
