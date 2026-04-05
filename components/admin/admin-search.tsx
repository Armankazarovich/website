"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, X, ShoppingBag, Package, Users, LayoutDashboard,
  Tag, Star, Settings, Truck, Warehouse, Mail, BarChart2,
  Wallet, Globe, Bell, Palette, HeartPulse, FileDown, Images,
  Megaphone, UserCircle, CheckSquare, Target, HelpCircle,
  ArrowRight, Hash,
} from "lucide-react";
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
    if (!q) { setResults(PAGES.slice(0, 8)); setSelected(0); return; }

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
        setResults([...pageMatches.slice(0, 3), ...dynamic.slice(0, 7)] as SearchResult[]);
      } catch { /* показываем страницы */ } finally { setLoading(false); }
    }, 250);
  }, [query]);

  return { query, setQuery, results, loading, selected, setSelected };
}

// ─── Result item renderer ───────────────────────────────────────────────────
function ResultItem({
  r, i, selected, onSelect, onGo, dark,
}: {
  r: SearchResult; i: number; selected: number;
  onSelect: (i: number) => void; onGo: (r: SearchResult) => void;
  dark?: boolean;
}) {
  const isActive = i === selected;
  return (
    <button
      key={i}
      onClick={() => onGo(r)}
      onMouseEnter={() => onSelect(i)}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{
        background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
        borderLeft: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
      }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: isActive ? "hsl(var(--primary)/0.2)" : "rgba(255,255,255,0.07)" }}>
        {r.type === "page"    && <r.icon className="w-3.5 h-3.5 text-white/60" />}
        {r.type === "order"   && <Hash className="w-3.5 h-3.5 text-primary/70" />}
        {r.type === "product" && <Package className="w-3.5 h-3.5 text-orange-400" />}
        {r.type === "client"  && <UserCircle className="w-3.5 h-3.5 text-emerald-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{r.label}</p>
        {"sub" in r && r.sub && (
          <p className="text-[11px] text-white/40 truncate">{r.sub}</p>
        )}
        {r.type === "page" && (
          <p className="text-[10px] text-white/25">{r.group}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {r.type === "order" && (
          <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}>{r.status}</span>
        )}
        <ArrowRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? "opacity-50 text-primary" : "opacity-0"}`} />
      </div>
    </button>
  );
}

// ─── Desktop inline search (expands in topbar) ──────────────────────────────
export function AdminDesktopSearch() {
  const [expanded, setExpanded] = useState(false);
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
        style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <Search className="w-4 h-4 text-primary/70 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Поиск заказов, товаров, клиентов..."
          className="flex-1 bg-transparent outline-none min-w-0 text-white placeholder:text-white/35"
          style={{ fontSize: "16px" }}
        />
        {loading
          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          : query
            ? <button onClick={() => setQuery("")} className="text-white/30 hover:text-white/60 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
            : <kbd className="text-[10px] font-mono shrink-0 text-white/25">Esc</kbd>
        }
      </div>

      {/* Results dropdown — всегда тёмный (фон всегда тёмное фото) */}
      {results.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[80] rounded-2xl overflow-hidden"
          style={{
            background: "rgba(10,14,30,0.96)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          }}>
          {!query.trim() && (
            <p className="px-5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
              Быстрый переход
            </p>
          )}
          <div className="py-1.5 max-h-[360px] overflow-y-auto">
            {results.map((r, i) => (
              <ResultItem key={i} r={r} i={i} selected={selected} onSelect={setSelected} onGo={go} />
            ))}
          </div>
          <div className="px-5 py-2 flex items-center gap-4 text-[10px] text-white/20"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span><kbd className="font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/30">↑↓</kbd> навигация</span>
            <span><kbd className="font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/30">↵</kbd> открыть</span>
            <span className="ml-auto opacity-40">⌘K</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile / Cmd+K modal search ─────────────────────────────────────────────
export function AdminSearch() {
  const [open, setOpen] = useState(false);
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
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const go = useCallback((r: SearchResult) => {
    router.push(r.href); setOpen(false);
  }, [router]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) go(results[selected]);
  }, [results, selected, go, setSelected]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Поиск"
        className="p-2 rounded-xl hover:bg-white/10 transition-colors relative shrink-0"
      >
        <Search className="w-[18px] h-[18px] text-primary/70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Прижат к верху экрана — клавиатура не перекрывает */}
          <div className="fixed inset-x-0 top-0 z-[61] flex justify-center px-3 pt-3 pointer-events-none">
            <div className="w-full max-w-2xl pointer-events-auto rounded-2xl overflow-hidden"
              style={{
                background: "rgba(10,14,30,0.97)",
                backdropFilter: "blur(32px) saturate(200%)",
                WebkitBackdropFilter: "blur(32px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
              }}>
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <Search className="w-5 h-5 text-primary/70/70 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Поиск заказов, товаров, клиентов..."
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30"
                  style={{ fontSize: "16px" /* предотвращает зум на iOS */ }}
                />
                {loading && (
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                )}
                <button onClick={() => setOpen(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-white/30 hover:text-white/60"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[10px] font-mono">Esc</span>
                </button>
              </div>
              <div className="max-h-[420px] overflow-y-auto py-2">
                {results.length === 0 && !loading && query.trim() && (
                  <p className="text-center text-sm text-white/30 py-10">Ничего не найдено</p>
                )}
                {!query.trim() && (
                  <p className="px-5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                    Быстрый переход
                  </p>
                )}
                {results.map((r, i) => (
                  <ResultItem key={i} r={r} i={i} selected={selected} onSelect={setSelected} onGo={go} />
                ))}
              </div>
              <div className="px-5 py-2.5 flex items-center gap-4 text-[10px] text-white/20"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/35">↑↓</kbd> навигация</span>
                <span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/35">↵</kbd> открыть</span>
                <span className="ml-auto opacity-40">⌘K</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

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
  "/admin/help":          "Поиск в Помощи — вопросы, ответы...",
};

// ─── Sticky Search Bar — всегда виден, контекстный плейсхолдер ─────────────
export function AdminStickySearchBar() {
  const [focused, setFocused] = useState(false);
  const { query, setQuery, results, loading, selected, setSelected } = useSearchLogic(focused);
  const router = useRouter();
  const pathname = usePathname();
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
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-200 w-full"
        style={{
          background: focused
            ? "rgba(255,255,255,0.11)"
            : "rgba(255,255,255,0.07)",
          border: focused
            ? "1.5px solid hsl(var(--primary)/0.45)"
            : "1.5px solid rgba(255,255,255,0.10)",
          boxShadow: focused ? "0 0 0 3px hsl(var(--primary)/0.10)" : "none",
        }}
      >
        <Search className="w-4 h-4 text-primary/60 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none min-w-0 text-white/90 placeholder:text-white/30 text-[13px]"
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

      {/* Dropdown results */}
      {focused && results.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-[80] rounded-2xl overflow-hidden"
          style={{
            background: "rgba(8,12,28,0.97)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
          }}>
          {!query.trim() && (
            <p className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
              Быстрый переход
            </p>
          )}
          <div className="py-1.5 max-h-[380px] overflow-y-auto">
            {results.map((r, i) => (
              <ResultItem key={i} r={r} i={i} selected={selected} onSelect={setSelected} onGo={go} />
            ))}
          </div>
          <div className="px-5 py-2 flex items-center gap-4 text-[10px] text-white/20"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/35">↑↓</kbd> навигация</span>
            <span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/35">↵</kbd> открыть</span>
            <span className="ml-auto opacity-40">⌘K</span>
          </div>
        </div>
      )}
    </div>
  );
}
