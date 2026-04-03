"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, ShoppingBag, Package, Users, LayoutDashboard,
  Tag, Star, Settings, Truck, Warehouse, Mail, BarChart2,
  Wallet, Globe, Bell, Palette, HeartPulse, FileDown, Images,
  Megaphone, UserCircle, CheckSquare, Target, HelpCircle,
  ArrowRight, Hash, Calendar,
} from "lucide-react";
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";

// ─── Статические страницы ───────────────────────────────────────────────────
const PAGES: Extract<SearchResult, { type: "page" }>[] = [
  { type: "page", href: "/admin",              label: "Дашборд",         icon: LayoutDashboard, group: "Страницы" },
  { type: "page", href: "/admin/orders",       label: "Заказы",           icon: ShoppingBag,     group: "Страницы" },
  { type: "page", href: "/admin/crm",          label: "CRM — Лиды",      icon: Target,          group: "Страницы" },
  { type: "page", href: "/admin/tasks",        label: "Задачи",           icon: CheckSquare,     group: "Страницы" },
  { type: "page", href: "/admin/delivery",     label: "Доставка",         icon: Truck,           group: "Страницы" },
  { type: "page", href: "/admin/products",     label: "Каталог товаров",  icon: Package,         group: "Страницы" },
  { type: "page", href: "/admin/categories",   label: "Категории",        icon: Tag,             group: "Страницы" },
  { type: "page", href: "/admin/inventory",    label: "Склад / Остатки",  icon: Warehouse,       group: "Страницы" },
  { type: "page", href: "/admin/import",       label: "Импорт / Экспорт", icon: FileDown,        group: "Страницы" },
  { type: "page", href: "/admin/media",        label: "Медиабиблиотека",  icon: Images,          group: "Страницы" },
  { type: "page", href: "/admin/promotions",   label: "Акции",            icon: Megaphone,       group: "Страницы" },
  { type: "page", href: "/admin/reviews",      label: "Отзывы",           icon: Star,            group: "Страницы" },
  { type: "page", href: "/admin/email",        label: "Email рассылка",   icon: Mail,            group: "Страницы" },
  { type: "page", href: "/admin/finance",      label: "Финансы",          icon: Wallet,          group: "Страницы" },
  { type: "page", href: "/admin/clients",      label: "Клиенты",          icon: UserCircle,      group: "Страницы" },
  { type: "page", href: "/admin/analytics",    label: "Аналитика",        icon: BarChart2,       group: "Страницы" },
  { type: "page", href: "/admin/health",       label: "Здоровье системы", icon: HeartPulse,      group: "Страницы" },
  { type: "page", href: "/admin/site",         label: "Настройки сайта",  icon: Globe,           group: "Страницы" },
  { type: "page", href: "/admin/settings",     label: "Настройки",        icon: Settings,        group: "Страницы" },
  { type: "page", href: "/admin/appearance",   label: "Оформление",       icon: Palette,         group: "Страницы" },
  { type: "page", href: "/admin/staff",        label: "Команда",          icon: Users,           group: "Страницы" },
  { type: "page", href: "/admin/notifications",label: "Уведомления",      icon: Bell,            group: "Страницы" },
  { type: "page", href: "/admin/help",         label: "Помощь",           icon: HelpCircle,      group: "Страницы" },
];

type SearchResult =
  | { type: "page";    href: string; label: string; icon: React.ElementType; group: string }
  | { type: "order";   href: string; label: string; sub: string; status: string }
  | { type: "product"; href: string; label: string; sub: string }
  | { type: "client";  href: string; label: string; sub: string };

export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Поиск
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    if (!q) {
      // Показать страницы по умолчанию
      setResults(PAGES.slice(0, 8));
      setSelected(0);
      return;
    }

    // Локальный поиск по страницам
    const pageMatches: SearchResult[] = PAGES.filter(p =>
      p.label.toLowerCase().includes(q.toLowerCase())
    );

    setResults(pageMatches.slice(0, 5));
    setSelected(0);
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const dynamic: SearchResult[] = [
          ...((data.orders || []).map((o: any) => ({
            type: "order" as const,
            href: `/admin/orders/${o.id}`,
            label: `Заказ #${o.orderNumber}`,
            sub: `${o.clientName || "Клиент"} · ${formatPrice(Number(o.totalAmount))}`,
            status: ORDER_STATUS_LABELS[o.status] || o.status,
          }))),
          ...((data.products || []).map((p: any) => ({
            type: "product" as const,
            href: `/admin/products/${p.id}`,
            label: p.name,
            sub: p.category || "Товар",
          }))),
          ...((data.clients || []).map((c: any) => ({
            type: "client" as const,
            href: `/admin/clients/${c.id}`,
            label: c.name || c.email || "Клиент",
            sub: c.email || c.phone || "",
          }))),
        ];
        setResults([...pageMatches.slice(0, 3), ...dynamic.slice(0, 7)] as SearchResult[]);
      } catch {
        // Просто показываем страницы
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  // Клавиатурная навигация
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) {
      const r = results[selected];
      router.push(r.href);
      setOpen(false);
    }
  }, [results, selected, router]);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground aray-icon-spin"
      style={{ background: "hsl(var(--muted) / 0.6)", border: "1px solid hsl(var(--border) / 0.5)" }}
    >
      <Search className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs hidden xl:block">Поиск...</span>
      <kbd className="hidden xl:block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">⌘K</kbd>
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        className="fixed left-1/2 top-[12%] -translate-x-1/2 z-50 w-full max-w-xl mx-auto px-4"
        style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.35))" }}
      >
        <div className="bg-card rounded-2xl border border-border overflow-hidden">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search className="w-4.5 h-4.5 w-[18px] h-[18px] text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Поиск заказов, товаров, клиентов, страниц..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {loading && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
            )}
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {results.length === 0 && !loading && query.trim() && (
              <p className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</p>
            )}

            {results.map((r, i) => {
              const isActive = i === selected;
              return (
                <button
                  key={i}
                  onClick={() => { router.push(r.href); setOpen(false); }}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive ? "bg-primary/8" : "hover:bg-muted/40"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary/15" : "bg-muted/60"
                  }`}>
                    {r.type === "page" && <r.icon className="w-3.5 h-3.5 text-muted-foreground" />}
                    {r.type === "order" && <Hash className="w-3.5 h-3.5 text-blue-500" />}
                    {r.type === "product" && <Package className="w-3.5 h-3.5 text-orange-500" />}
                    {r.type === "client" && <UserCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {"sub" in r && r.sub && (
                      <p className="text-[11px] text-muted-foreground truncate">{r.sub}</p>
                    )}
                    {r.type === "page" && (
                      <p className="text-[10px] text-muted-foreground/60">{r.group}</p>
                    )}
                  </div>

                  {/* Status / arrow */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {r.type === "order" && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{r.status}</span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? "opacity-50 text-primary" : "opacity-0"}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/60">
            <span><kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd> навигация</span>
            <span><kbd className="font-mono bg-muted px-1 rounded">↵</kbd> открыть</span>
            <span><kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> закрыть</span>
          </div>
        </div>
      </div>
    </>
  );
}
