"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Classic mode hook (читает localStorage, реагирует на событие) ────────────
function useClassicMode() {
  const [classic, setClassic] = useState(false);
  useEffect(() => {
    setClassic(localStorage.getItem("aray-classic-mode") === "1");
    const h = () => setClassic(localStorage.getItem("aray-classic-mode") === "1");
    window.addEventListener("aray-classic-change", h);
    return () => window.removeEventListener("aray-classic-change", h);
  }, []);
  return classic;
}
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search, X, ShoppingBag, Package, Users, LayoutDashboard,
  Tag, Star, Settings, Truck, Warehouse, Mail, BarChart2,
  Wallet, Globe, Bell, Palette, HeartPulse, FileDown, Images,
  Megaphone, UserCircle, CheckSquare, Target, HelpCircle,
  ArrowRight, Hash, Plus, Phone, Zap, Command,
} from "lucide-react";

// ─── Quick actions (быстрые действия без поиска) ────────────────────────────
const QUICK_ACTIONS = [
  { label: "Новый заказ",  icon: Plus,       href: "/admin/orders",      desc: "Оформить по телефону" },
  { label: "Добавить товар",icon: Package,   href: "/admin/products/new",desc: "Создать карточку" },
  { label: "Новый лид",    icon: Target,     href: "/admin/crm",         desc: "Добавить в CRM" },
  { label: "Загрузить фото",icon: Images,    href: "/admin/media",       desc: "Медиабиблиотека" },
];
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";

const PAGES: Extract<SearchResult, { type: "page" }>[] = [
  { type: "page", href: "/admin",               label: "Дашборд",          icon: LayoutDashboard, group: "Страницы" },
  { type: "page", href: "/admin/orders",        label: "Заказы",            icon: ShoppingBag,     group: "Страницы" },
  { type: "page", href: "/admin/crm",           label: "CRM — Лиды",       icon: Target,          group: "Страницы" },
  { type: "page", href: "/admin/tasks",         label: "Задачи",            icon: CheckSquare,     group: "Страницы" },
  { type: "page", href: "/admin/delivery",      label: "Доставка",          icon: Truck,           group: "Страницы" },
  { type: "page", href: "/admin/products",      label: "Каталог товаров",   icon: Package,         group: "Страницы" },
  { type: "page", href: "/admin/categories",    label: "Категории",         icon: Tag,             group: "Страницы" },
  { type: "page", href: "/admin/inventory",     label: "Склад / Остатки",   icon: Warehouse,       group: "Страницы" },
  { type: "page", href: "/admin/import",        label: "Импорт / Экспорт",  icon: FileDown,        group: "Страницы" },
  { type: "page", href: "/admin/media",         label: "Медиабиблиотека",   icon: Images,          group: "Страницы" },
  { type: "page", href: "/admin/promotions",    label: "Акции",             icon: Megaphone,       group: "Страницы" },
  { type: "page", href: "/admin/reviews",       label: "Отзывы",            icon: Star,            group: "Страницы" },
  { type: "page", href: "/admin/email",         label: "Email рассылка",    icon: Mail,            group: "Страницы" },
  { type: "page", href: "/admin/finance",       label: "Финансы",           icon: Wallet,          group: "Страницы" },
  { type: "page", href: "/admin/clients",       label: "Клиенты",           icon: UserCircle,      group: "Страницы" },
  { type: "page", href: "/admin/analytics",     label: "Аналитика",         icon: BarChart2,       group: "Страницы" },
  { type: "page", href: "/admin/health",        label: "Здоровье системы",  icon: HeartPulse,      group: "Страницы" },
  { type: "page", href: "/admin/site",          label: "Настройки сайта",   icon: Globe,           group: "Страницы" },
  { type: "page", href: "/admin/settings",      label: "Настройки",         icon: Settings,        group: "Страницы" },
  { type: "page", href: "/admin/appearance",    label: "Оформление",        icon: Palette,         group: "Страницы" },
  { type: "page", href: "/admin/staff",         label: "Команда",           icon: Users,           group: "Страницы" },
  { type: "page", href: "/admin/notifications", label: "Уведомления",       icon: Bell,            group: "Страницы" },
  { type: "page", href: "/admin/help",          label: "Помощь",            icon: HelpCircle,      group: "Страницы" },
];

type SearchResult =
  | { type: "page";    href: string; label: string; icon: React.ElementType; group: string }
  | { type: "order";   href: string; label: string; sub: string; status: string }
  | { type: "product"; href: string; label: string; sub: string }
  | { type: "client";  href: string; label: string; sub: string };

// ─── Shared search logic hook ───────────────────────────────────────────────
function useSearchLogic(active: boolean) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setQuery(""); setResults([]); return; }
  }, [active]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    // Пустой запрос → показываем 8 страниц для быстрого перехода
    if (!q) { setResults(PAGES.slice(0, 8)); setSelected(0); setLoading(false); return; }

    // Мгновенный поиск по страницам — работает с 1 буквы
    const pageMatches: SearchResult[] = PAGES.filter(p =>
      p.label.toLowerCase().includes(q.toLowerCase())
    );
    setResults(pageMatches.slice(0, 6));
    setSelected(0);
    setLoading(true);

    // API поиск: 80ms debounce (быстро с 1 буквы)
    const delay = q.length === 1 ? 120 : 80;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const dynamic: SearchResult[] = [
          ...(data.orders || []).map((o: any) => ({
            type: "order" as const, href: `/admin/orders/${o.id}`,
            label: `Заказ #${o.orderNumber}`,
            sub: `${o.clientName || "Клиент"} · ${formatPrice(Number(o.totalAmount))}`,
            status: ORDER_STATUS_LABELS[o.status] || o.status,
          })),
          ...(data.products || []).map((p: any) => ({
            type: "product" as const, href: `/admin/products/${p.id}`,
            label: p.name, sub: p.category || "Товар",
          })),
          ...(data.clients || []).map((c: any) => ({
            type: "client" as const, href: `/admin/clients/${c.id}`,
            label: c.name || c.email || "Клиент", sub: c.email || c.phone || "",
          })),
        ];
        // Страницы + живые данные, всего до 10 результатов
        setResults([...pageMatches.slice(0, 3), ...dynamic.slice(0, 8)] as SearchResult[]);
      } catch { /* показываем страницы */ } finally { setLoading(false); }
    }, delay);
  }, [query]);

  return { query, setQuery, results, loading, selected, setSelected };
}

// ─── Type badge colors ──────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  order:   { label: "Заказ",   bg: "hsl(var(--primary)/0.18)", color: "hsl(var(--primary))" },
  product: { label: "Товар",   bg: "rgba(251,146,60,0.18)",    color: "rgb(251,146,60)" },
  client:  { label: "Клиент",  bg: "rgba(52,211,153,0.18)",    color: "rgb(52,211,153)" },
  page:    { label: "Страница",bg: "rgba(255,255,255,0.08)",    color: "rgba(255,255,255,0.40)" },
};

// ─── Result item renderer ───────────────────────────────────────────────────
function ResultItem({
  r, i, selected, onSelect, onGo, classic,
}: {
  r: SearchResult; i: number; selected: number;
  onSelect: (i: number) => void; onGo: (r: SearchResult) => void;
  classic?: boolean;
}) {
  const isActive = i === selected;
  const meta = TYPE_META[r.type] || TYPE_META.page;
  // В классической теме тексты адаптируем к CSS переменным
  const textMain  = classic ? (isActive ? "hsl(var(--foreground))" : "hsl(var(--foreground)/.80)") : (isActive ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.80)");
  const textSub   = classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.38)";
  const iconInact = classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.45)";
  const iconBg    = classic ? "hsl(var(--muted)/0.5)" : "rgba(255,255,255,0.06)";
  const rowBg     = classic ? (isActive ? "hsl(var(--accent))" : "transparent") : (isActive ? "rgba(255,255,255,0.08)" : "transparent");
  return (
    <button
      onClick={() => onGo(r)}
      onMouseEnter={() => onSelect(i)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100 group"
      style={{
        background: rowBg,
        borderLeft: isActive ? `3px solid hsl(var(--primary))` : "3px solid transparent",
      }}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
        style={{ background: isActive ? meta.bg : iconBg }}>
        {r.type === "page"    && <r.icon className="w-4 h-4" style={{ color: isActive ? meta.color : iconInact }} />}
        {r.type === "order"   && <Hash className="w-4 h-4" style={{ color: isActive ? meta.color : iconInact }} />}
        {r.type === "product" && <Package className="w-4 h-4" style={{ color: isActive ? meta.color : iconInact }} />}
        {r.type === "client"  && <UserCircle className="w-4 h-4" style={{ color: isActive ? meta.color : iconInact }} />}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-tight truncate" style={{ color: textMain }}>
          {r.label}
        </p>
        {"sub" in r && r.sub && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: textSub }}>{r.sub}</p>
        )}
        {r.type === "order" && r.status && (
          <p className="text-[10px] mt-0.5" style={{ color: textSub }}>{r.status}</p>
        )}
      </div>
      {/* Type badge + arrow */}
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
        <ArrowRight className="w-3.5 h-3.5 transition-all duration-150"
          style={{ color: isActive ? "hsl(var(--primary))" : "transparent" }} />
      </div>
    </button>
  );
}

// ─── Desktop inline search (expands in topbar) ──────────────────────────────
export function AdminDesktopSearch() {
  const [expanded, setExpanded] = useState(false);
  const classic = useClassicMode();
  const { query, setQuery, results, loading, selected, setSelected } = useSearchLogic(expanded);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside → close
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setExpanded(true); }
      if (e.key === "Escape" && expanded) setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 60);
  }, [expanded]);

  const go = useCallback((r: SearchResult) => {
    router.push(r.href); setExpanded(false);
  }, [router]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) go(results[selected]);
    if (e.key === "Escape") setExpanded(false);
  }, [results, selected, go, setSelected]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Поиск (⌘K)"
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-primary/15 transition-all group relative"
      >
        <Search className="w-4 h-4 text-primary/70 group-hover:scale-110 transition-transform" />
        <span className="absolute inset-0 rounded-xl group-hover:ring-2 ring-primary/25 transition-all" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex items-center relative mx-1 animate-in slide-in-from-right-3 fade-in duration-200">
      {/* Input bar */}
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl"
        style={{
          background: classic ? "hsl(var(--background))" : "rgba(10,15,35,0.75)",
          border: classic ? "1.5px solid hsl(var(--border))" : "1.5px solid rgba(255,255,255,0.18)",
        }}>
        <Search className="w-4 h-4 text-primary/70 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Поиск заказов, товаров, клиентов..."
          className="aray-search-input flex-1 bg-transparent outline-none min-w-0"
          style={{ fontSize: "16px", color: classic ? "hsl(var(--foreground))" : "white" }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {loading
          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          : query
            ? <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
            : <kbd className="text-[10px] font-mono shrink-0 text-muted-foreground opacity-60">Esc</kbd>
        }
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[80] rounded-2xl overflow-hidden"
          style={{
            background: classic ? "hsl(var(--card))" : "rgba(10,14,30,0.96)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.10)",
            boxShadow: classic ? "0 12px 40px rgba(0,0,0,0.12)" : "0 24px 64px rgba(0,0,0,0.55)",
          }}>
          {!query.trim() && (
            <p className="px-5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground opacity-60">
              Быстрый переход
            </p>
          )}
          <div className="py-1.5 max-h-[360px] overflow-y-auto">
            {results.map((r, i) => (
              <ResultItem key={i} r={r} i={i} selected={selected} onSelect={setSelected} onGo={go} classic={classic} />
            ))}
          </div>
          <div className="px-5 py-2 flex items-center gap-4 text-[10px]"
            style={{
              borderTop: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.06)",
              color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.20)",
            }}>
            <span><kbd className="font-mono px-1.5 py-0.5 rounded">↑↓</kbd> навигация</span>
            <span><kbd className="font-mono px-1.5 py-0.5 rounded">↵</kbd> открыть</span>
            <span className="ml-auto opacity-40">⌘K</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Command Palette (⌘K) — главная фича ARAY Admin ─────────────────────────
export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const classic = useClassicMode();
  const { query, setQuery, results, loading, selected, setSelected } = useSearchLogic(open);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const go = useCallback((r: SearchResult) => {
    router.push(r.href); setOpen(false); setQuery("");
  }, [router, setQuery]);

  const goHref = useCallback((href: string) => {
    router.push(href); setOpen(false); setQuery("");
  }, [router, setQuery]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) go(results[selected]);
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }, [results, selected, go, setSelected, setQuery]);

  // Группировка результатов по типу
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const groupOrder: SearchResult["type"][] = ["order", "product", "client", "page"];
  const groupLabels: Record<string, string> = { order: "Заказы", product: "Товары", client: "Клиенты", page: "Страницы" };

  // Плоский список для keyboard navigation
  const flatResults = groupOrder.flatMap(g => grouped[g] || []);
  // Перестроить selected index относительно flatResults
  const flatSelected = flatResults.findIndex((_, i) => i === selected);

  const hasQuery = query.trim().length > 0;

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      title="Поиск (⌘K)"
      className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
    >
      <Search className="w-[18px] h-[18px] text-primary/70" />
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={() => { setOpen(false); setQuery(""); }}
      />

      {/* Command Palette — центр экрана десктоп, снизу мобил */}
      <div className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-[12vh] lg:left-1/2 lg:-translate-x-1/2 z-[71] flex lg:block justify-center">
        <div
          className="w-full lg:w-[620px] rounded-t-[28px] lg:rounded-[24px] overflow-hidden flex flex-col"
          style={{
            maxHeight: "88dvh",
            background: classic ? "hsl(var(--card))" : "rgba(7,11,28,0.88)",
            backdropFilter: "blur(56px) saturate(240%) brightness(0.80)",
            WebkitBackdropFilter: "blur(56px) saturate(240%) brightness(0.80)",
            border: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.13)",
            boxShadow: classic ? "0 24px 64px rgba(0,0,0,0.15)" : "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Drag handle (mobile) */}
          <div className="lg:hidden flex justify-center pt-3 pb-0 shrink-0">
            <div className="w-10 h-1 rounded-full bg-foreground/10" />
          </div>

          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 shrink-0"
            style={{ borderBottom: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.08)" }}>
            {loading
              ? <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              : <Search className="w-5 h-5 text-primary/70 shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Найти заказ, товар, клиента, страницу..."
              className="flex-1 bg-transparent outline-none text-[15px] font-medium"
              style={{
                fontSize: "16px",
                color: classic ? "hsl(var(--foreground))" : "rgba(255,255,255,0.95)",
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button onClick={() => { setOpen(false); setQuery(""); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
              style={{
                background: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.06)",
                border: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.09)",
                color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.40)",
              }}>
              <span className="text-[10px] font-mono">Esc</span>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto overscroll-contain flex-1">

            {/* ── Пустой запрос → Быстрые действия + Навигация ── */}
            {!hasQuery && (
              <>
                {/* Быстрые действия */}
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.25)" }}>
                    Быстрые действия
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.href}
                        onClick={() => goHref(a.href)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98] hover:brightness-110 group"
                        style={{
                          background: classic ? "hsl(var(--muted)/0.6)" : "rgba(255,255,255,0.06)",
                          border: classic ? "1px solid hsl(var(--border))" : "none",
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "hsl(var(--primary)/0.18)" }}>
                          <a.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: classic ? "hsl(var(--foreground))" : "rgba(255,255,255,0.85)" }}>{a.label}</p>
                          <p className="text-[10px] truncate" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.35)" }}>{a.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Навигация по страницам */}
                <div className="px-5 pt-3 pb-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.25)" }}>
                    Навигация
                  </p>
                </div>
                <div className="pb-3">
                  {results.map((r, i) => (
                    <ResultItem key={i} r={r} i={i} selected={selected} onSelect={setSelected} onGo={go} classic={classic} />
                  ))}
                </div>
              </>
            )}

            {/* ── С запросом → Сгруппированные результаты ── */}
            {hasQuery && results.length === 0 && !loading && (
              <div className="py-14 flex flex-col items-center gap-3">
                <Search className="w-8 h-8 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground opacity-50">Ничего не найдено по «{query}»</p>
              </div>
            )}

            {hasQuery && groupOrder.map(type => {
              const items = grouped[type];
              if (!items?.length) return null;
              const baseIdx = flatResults.findIndex(r => r === items[0]);
              return (
                <div key={type}>
                  <p className="px-5 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.25)" }}>
                    {groupLabels[type]}
                  </p>
                  {items.map((r, i) => (
                    <ResultItem key={i} r={r} i={baseIdx + i} selected={selected} onSelect={setSelected} onGo={go} classic={classic} />
                  ))}
                </div>
              );
            })}

            <div style={{ height: "max(12px, env(safe-area-inset-bottom, 12px))" }} />
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 flex items-center gap-4 shrink-0"
            style={{ borderTop: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.06)" }}>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.20)" }}>
              <kbd className="font-mono px-1.5 py-0.5 rounded" style={{ background: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.10)", color: classic ? "hsl(var(--foreground))" : "rgba(255,255,255,0.30)" }}>↑↓</kbd> навигация
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.20)" }}>
              <kbd className="font-mono px-1.5 py-0.5 rounded" style={{ background: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.10)", color: classic ? "hsl(var(--foreground))" : "rgba(255,255,255,0.30)" }}>↵</kbd> открыть
            </span>
            <span className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.15)" }}>
              <Command className="w-3 h-3" />K
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Контекстные фильтр-чипсы по страницам (Smart Command Bar) ──────────────
type FilterChip = { label: string; param: string; value: string; color?: string };

const PAGE_FILTERS: Record<string, FilterChip[]> = {
  "/admin/orders": [
    { label: "Новые",       param: "status", value: "NEW",         color: "blue" },
    { label: "Подтверждён", param: "status", value: "CONFIRMED",   color: "purple" },
    { label: "В обработке", param: "status", value: "PROCESSING",  color: "yellow" },
    { label: "В пути",      param: "status", value: "IN_DELIVERY", color: "orange" },
    { label: "Самовывоз",   param: "status", value: "READY_PICKUP",color: "green" },
    { label: "Доставлен",   param: "status", value: "DELIVERED",   color: "teal" },
    { label: "Отменён",     param: "status", value: "CANCELLED",   color: "red" },
  ],
  "/admin/products": [
    { label: "Активные",      param: "active",   value: "1" },
    { label: "Скрытые",       param: "active",   value: "0" },
    { label: "Без фото",      param: "nophoto",  value: "1" },
    { label: "Рекомендуемые", param: "featured", value: "1" },
  ],
  "/admin/inventory": [
    { label: "В наличии",    param: "status", value: "in" },
    { label: "Нет",          param: "status", value: "out" },
    { label: "Отслеживается",param: "status", value: "tracked" },
  ],
  "/admin/clients": [
    { label: "С заказами", param: "hasorders", value: "1" },
    { label: "Новые",      param: "period",    value: "new" },
  ],
  "/admin/staff": [
    { label: "Ожидают",    param: "status", value: "PENDING" },
    { label: "Активные",   param: "status", value: "ACTIVE" },
    { label: "Заблок.",    param: "status", value: "SUSPENDED" },
  ],
  "/admin/reviews": [
    { label: "На модерации", param: "status", value: "pending" },
    { label: "Одобренные",   param: "status", value: "approved" },
  ],
  "/admin/delivery": [
    { label: "Подтверждён",  param: "status", value: "CONFIRMED" },
    { label: "В пути",       param: "status", value: "IN_DELIVERY" },
    { label: "Самовывоз",    param: "status", value: "READY_PICKUP" },
  ],
};

const CHIP_COLORS: Record<string, string> = {
  blue:   "hsl(217 91% 60% / 0.22)",
  purple: "hsl(270 70% 65% / 0.22)",
  yellow: "hsl(43 96% 56% / 0.22)",
  orange: "hsl(25 95% 55% / 0.22)",
  green:  "hsl(142 70% 45% / 0.22)",
  teal:   "hsl(174 60% 50% / 0.22)",
  red:    "hsl(0 72% 55% / 0.22)",
};
const CHIP_COLORS_TEXT: Record<string, string> = {
  blue:   "hsl(217 91% 75%)",
  purple: "hsl(270 70% 80%)",
  yellow: "hsl(43 96% 70%)",
  orange: "hsl(25 95% 70%)",
  green:  "hsl(142 70% 65%)",
  teal:   "hsl(174 60% 65%)",
  red:    "hsl(0 72% 72%)",
};

// ─── Контекстные плейсхолдеры по страницам ─────────────────────────────────
const PAGE_PLACEHOLDERS: Record<string, string> = {
  "/admin":               "Поиск заказов, товаров, клиентов, страниц...",
  "/admin/orders":        "Искать в Заказах — имя клиента, номер, телефон...",
  "/admin/crm":           "Искать в CRM — лиды, клиенты, сделки...",
  "/admin/tasks":         "Искать в Задачах — описание, исполнитель...",
  "/admin/delivery":      "Искать в Доставке — адрес, заказ, клиент...",
  "/admin/products":      "Искать в Каталоге — название товара, slug...",
  "/admin/categories":    "Искать Категории — название, slug...",
  "/admin/inventory":     "Искать на Складе — товар, размер...",
  "/admin/import":        "Импорт / Экспорт — поиск товаров...",
  "/admin/media":         "Поиск файлов в Медиабиблиотеке...",
  "/admin/promotions":    "Искать в Акциях — название, промокод...",
  "/admin/reviews":       "Искать в Отзывах — текст, автор...",
  "/admin/email":         "Искать Email рассылки — тема, текст...",
  "/admin/finance":       "Искать в Финансах — заказы, суммы...",
  "/admin/clients":       "Искать в Клиентах — имя, телефон, email...",
  "/admin/analytics":     "Поиск аналитики — страница, период...",
  "/admin/staff":         "Искать в Команде — имя, роль, статус...",
  "/admin/notifications": "Поиск в Уведомлениях...",
  "/admin/settings":      "Поиск Настроек...",
  "/admin/site":          "Поиск настроек Сайта...",
  "/admin/appearance":    "Поиск настроек Оформления...",
  "/admin/help":          "Поиск заказов, товаров, клиентов...",
};

// ─── Sticky Search Bar + Smart Filter Chips ────────────────────────────────
export function AdminStickySearchBar() {
  const [focused, setFocused] = useState(false);
  const { query, setQuery, results, loading, selected, setSelected } = useSearchLogic(focused);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Найти самый подходящий плейсхолдер по текущему URL
  const placeholder = (() => {
    const sorted = Object.entries(PAGE_PLACEHOLDERS).sort((a, b) => b[0].length - a[0].length);
    for (const [path, ph] of sorted) {
      if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) return ph;
    }
    return "Поиск заказов, товаров, клиентов...";
  })();

  // Контекстные фильтр-чипсы для текущей страницы
  const pageFilters: FilterChip[] = (() => {
    const sorted = Object.entries(PAGE_FILTERS).sort((a, b) => b[0].length - a[0].length);
    for (const [path, filters] of sorted) {
      if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) return filters;
    }
    return [];
  })();

  // Переключить фильтр-чипс — добавить/убрать URL param
  const toggleChip = useCallback((chip: FilterChip) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(chip.param);
    if (current === chip.value) {
      params.delete(chip.param);
    } else {
      params.set(chip.param, chip.value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, searchParams, router]);

  // Click outside → unfocus
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setFocused(true);
        setTimeout(() => inputRef.current?.focus(), 60);
      }
      if (e.key === "Escape" && focused) { setFocused(false); setQuery(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focused, setQuery]);

  const go = useCallback((r: SearchResult) => {
    router.push(r.href); setFocused(false); setQuery("");
  }, [router, setQuery]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) go(results[selected]);
    if (e.key === "Escape") { setFocused(false); setQuery(""); }
  }, [results, selected, go, setSelected, setQuery]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all duration-200 w-full"
        style={{
          background: "transparent",
          border: focused
            ? "1.5px solid rgba(255,255,255,0.30)"
            : "1.5px solid rgba(255,255,255,0.13)",
        }}
      >
        <Search className="w-4 h-4 text-primary/70 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="aray-search-input flex-1 bg-transparent outline-none min-w-0 text-white/90 placeholder:text-white/38 text-[13px] tracking-[0.01em]"
          autoComplete="off"
          spellCheck={false}
        />
        {loading
          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          : query
            ? <button onClick={() => { setQuery(""); setFocused(false); }} className="shrink-0 text-white/25 hover:text-white/60 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            : <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-white/20 shrink-0">
                <span className="px-1 py-0.5 rounded bg-white/10">⌘K</span>
              </kbd>
        }
      </div>

      {/* ── Smart Filter Chips — контекстные фильтры страницы ── */}
      {pageFilters.length > 0 && !focused && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {pageFilters.map((chip) => {
            const isActive = searchParams.get(chip.param) === chip.value;
            const bg = isActive
              ? (chip.color ? CHIP_COLORS[chip.color] : "hsl(var(--primary)/0.25)")
              : "rgba(255,255,255,0.10)";
            const textColor = isActive
              ? (chip.color ? CHIP_COLORS_TEXT[chip.color] : "hsl(var(--primary))")
              : "rgba(255,255,255,0.60)";
            const border = isActive
              ? (chip.color ? `1.5px solid ${CHIP_COLORS_TEXT[chip.color]}55` : "1.5px solid hsl(var(--primary)/0.45)")
              : "1px solid rgba(255,255,255,0.15)";
            return (
              <button
                key={`${chip.param}-${chip.value}`}
                onClick={() => toggleChip(chip)}
                className="px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-150 active:scale-95 hover:brightness-125"
                style={{ background: bg, color: textColor, border }}
              >
                {chip.label}
              </button>
            );
          })}
          {/* Сброс всех фильтров */}
          {pageFilters.some(c => searchParams.get(c.param) === c.value) && (
            <button
              onClick={() => router.push(pathname)}
              className="px-2.5 py-1 rounded-full text-[10px] transition-all duration-150 flex items-center gap-1 hover:brightness-125"
              style={{ color: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <X className="w-2.5 h-2.5" /> сброс
            </button>
          )}
        </div>
      )}

      {/* Dropdown results — стекло */}
      {focused && results.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[80] rounded-2xl overflow-hidden"
          style={{
            background: "rgba(7,11,28,0.88)",
            backdropFilter: "blur(48px) saturate(220%) brightness(0.80)",
            WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.80)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}>
          {!query.trim() && (
            <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
              Навигация
            </p>
          )}
          <div className="py-1 max-h-[320px] overflow-y-auto">
            {results.map((r, i) => (
              <ResultItem key={i} r={r} i={i} selected={selected} onSelect={setSelected} onGo={go} />
            ))}
          </div>
          <div className="px-4 py-2 flex items-center gap-3 text-[9px] text-white/18"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span><kbd className="font-mono bg-white/08 px-1 py-0.5 rounded text-white/25">↑↓</kbd></span>
            <span><kbd className="font-mono bg-white/08 px-1 py-0.5 rounded text-white/25">↵</kbd> открыть</span>
            <span className="ml-auto text-white/15 flex items-center gap-0.5"><Command className="w-3 h-3" />K полный поиск</span>
          </div>
        </div>
      )}
    </div>
  );
}
