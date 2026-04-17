"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, X, Bell, ShoppingBag, Star, ArrowRight, UserPlus, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { useClassicMode, playOrderChime, LS_FONT } from "@/components/admin/admin-shell";

export function ArayControlCenter({ userRole, position = "bottom" }: { userRole?: string; position?: "bottom" | "right" }) {
  const isClient = userRole === "USER";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notif" | "style">("notif");
  const [count, setCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, bgMode, setBg, toggle: toggleClassic } = useClassicMode();
  const ccSidebarHex = PALETTES.find(p => p.id === palette)?.sidebar ?? "#5C3317";
  const ref = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ bottom: number; left: number } | null>(null);
  // Mounted guard for hydration safety (useTheme returns undefined on server)
  const [ccMounted, setCcMounted] = useState(false);
  useEffect(() => setCcMounted(true), []);
  const safeTheme = ccMounted ? theme : "dark";
  const router = useRouter();
  const prevCountRef = useRef<number | null>(null);

  // Закрытие по клику снаружи
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Polling счётчика новых заказов (staff only)
  useEffect(() => {
    if (isClient) return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) {
          const d = await res.json();
          const newOrders = d.newOrders ?? 0;
          if (prevCountRef.current !== null && newOrders > prevCountRef.current) playOrderChime();
          prevCountRef.current = newOrders;
          setCount(d.total ?? 0);
        }
      } catch {}
    };
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, [isClient]);

  const calcPos = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPanelPos({ bottom: window.innerHeight - r.top + 6, left: r.left });
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotif(true);
    try {
      const [ordersRes, reviewsRes, staffRes] = await Promise.all([
        fetch("/api/admin/orders?status=NEW&limit=5").then(r => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
        fetch("/api/admin/reviews?pending=true&limit=5").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/admin/staff?status=PENDING&limit=5").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOrders(ordersRes.orders ?? []);
      setReviews(Array.isArray(reviewsRes) ? reviewsRes : reviewsRes.reviews ?? []);
      setPendingStaff(Array.isArray(staffRes) ? staffRes : staffRes.staff ?? []);
    } catch {} finally { setLoadingNotif(false); }
  };

  const openNotif = async () => {
    calcPos(); setTab("notif"); setOpen(true);
    setLoadingNotif(true);
    try {
      const [ordersRes, reviewsRes, staffRes] = await Promise.all([
        fetch("/api/admin/orders?status=NEW&limit=5").then(r => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
        fetch("/api/admin/reviews?pending=true&limit=5").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/admin/staff?status=PENDING&limit=5").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOrders(ordersRes.orders ?? []);
      setReviews(Array.isArray(reviewsRes) ? reviewsRes : reviewsRes.reviews ?? []);
      setPendingStaff(Array.isArray(staffRes) ? staffRes : staffRes.staff ?? []);
    } catch {} finally { setLoadingNotif(false); }
  };

  // Единые размеры шрифтов — 5 ступеней как в MobileFontControl
  const FONT_SIZES_CC = [
    { id: "xs", label: "Мини",    px: "12px",   scale: "0.857" },
    { id: "sm", label: "Компакт", px: "13px",   scale: "0.929" },
    { id: "md", label: "Норм",    px: "14px",   scale: "1"     },
    { id: "lg", label: "Крупн",   px: "15.5px", scale: "1.107" },
    { id: "xl", label: "Макс",    px: "17px",   scale: "1.214" },
  ];
  const [fontActive, setFontActive] = useState("md");

  // ── Инициализация шрифта при загрузке (применяет к DOM, не только к state) ──
  useEffect(() => {
    const saved = localStorage.getItem(LS_FONT);
    const id = saved || (window.innerWidth < 768 ? "sm" : "md");
    setFontActive(id);
    const size = FONT_SIZES_CC.find(f => f.id === id) || FONT_SIZES_CC[1];
    document.documentElement.style.setProperty("font-size", size.px);
    document.documentElement.style.setProperty("--aray-font-scale", size.scale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFont = (id: string) => {
    const s = FONT_SIZES_CC.find(f => f.id === id)!;
    setFontActive(id);
    localStorage.setItem(LS_FONT, id);
    document.documentElement.style.setProperty("font-size", s.px);
    document.documentElement.style.setProperty("--aray-font-scale", s.scale);
  };

  // ── Liquid Glass palette ─────────────────────────────────────────────────
  const isDark = safeTheme === "dark";
  const glass = {
    bg: isDark
      ? `linear-gradient(180deg, rgba(10,10,18,0.72), rgba(10,10,18,0.65))`
      : `linear-gradient(180deg, rgba(240,242,248,0.78), rgba(240,242,248,0.72))`,
    refraction: isDark
      ? `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)`
      : `linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 40%)`,
    border: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.35)",
    borderInner: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    blur: "blur(50px) saturate(200%) brightness(1.05)",
    textPrimary: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)",
    textSecondary: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    activeBg: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
    shadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.1)"
      : "0 8px 32px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.05)",
  };

  // ═══ RIGHT SIDE sticky layout (desktop + mobile) ═══════════════════════
  if (position === "right") {
    return (
      <div ref={ref} className="flex flex-col items-center gap-1">
        {/* Collapsed: vertical pill with glass effect */}
        {!open ? (
          <div className="flex flex-col items-center gap-1 px-1.5 py-3 rounded-l-2xl relative overflow-hidden"
            style={{
              background: glass.bg,
              backdropFilter: glass.blur,
              WebkitBackdropFilter: glass.blur,
              border: `1px solid ${glass.border}`,
              borderRight: "none",
              boxShadow: glass.shadow,
            }}>
            {/* Refraction highlight */}
            <div className="absolute inset-0 pointer-events-none rounded-l-2xl" style={{ background: glass.refraction }} />
            {!isClient && (
              <button onClick={() => { setTab("notif"); setOpen(true); fetchNotifications(); }} title="Уведомления" aria-label={`Уведомления: ${count}`}
                className="relative p-2.5 rounded-xl transition-colors"
                style={{ color: glass.textSecondary }}
                onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <Bell className="w-4 h-4" style={{ color: count > 0 ? "hsl(var(--primary))" : glass.textSecondary }} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "hsl(var(--primary))" }}>{count > 9 ? "9+" : count}</span>
                )}
              </button>
            )}
            <button onClick={() => { setTab("style"); setOpen(true); }} title="Оформление" aria-label="Оформление"
              className="relative p-2.5 rounded-xl transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Palette className="w-4 h-4" style={{ color: glass.textSecondary }} />
            </button>
          </div>
        ) : (
          /* Expanded: full panel with Liquid Glass */
          <div className="w-[280px] rounded-l-2xl overflow-hidden animate-in slide-in-from-right-2 fade-in duration-200 relative"
            style={{
              background: glass.bg,
              backdropFilter: glass.blur,
              WebkitBackdropFilter: glass.blur,
              border: `1px solid ${glass.border}`,
              borderRight: "none",
              boxShadow: glass.shadow,
              maxHeight: "80vh",
            }}>
            {/* Refraction highlight */}
            <div className="absolute inset-0 pointer-events-none rounded-l-2xl" style={{ background: glass.refraction }} />
            {/* Header */}
            <div className="relative flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${glass.borderInner}` }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold" style={{ color: glass.textPrimary }}>ARAY Control</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg transition-colors" aria-label="Закрыть"
                onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <X className="w-4 h-4" style={{ color: glass.textSecondary }} />
              </button>
            </div>
            {/* Tabs — only Notifications + Style */}
            <div className="relative flex" style={{ borderBottom: `1px solid ${glass.borderInner}` }}>
              {!isClient && (
                <button onClick={() => { setTab("notif"); fetchNotifications(); }}
                  className="flex-1 text-center text-[11px] font-semibold py-2.5 transition-colors"
                  style={{
                    color: tab === "notif" ? "hsl(var(--primary))" : glass.textSecondary,
                    borderBottom: tab === "notif" ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                  }}>
                  Уведомления {count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] text-white" style={{ background: "hsl(var(--primary))" }}>{count}</span>}
                </button>
              )}
              <button onClick={() => setTab("style")}
                className="flex-1 text-center text-[11px] font-semibold py-2.5 transition-colors"
                style={{
                  color: tab === "style" ? "hsl(var(--primary))" : glass.textSecondary,
                  borderBottom: tab === "style" ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                }}>
                Оформление
              </button>
            </div>
            {/* Content */}
            <div className="relative overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {tab === "notif" && !isClient && (
                <div>
                  {loadingNotif ? (
                    <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                  ) : orders.length === 0 && reviews.length === 0 && pendingStaff.length === 0 ? (
                    <div className="text-center py-8"><Bell className="w-6 h-6 mx-auto mb-2" style={{ color: glass.textSecondary, opacity: 0.4 }} /><p className="text-xs" style={{ color: glass.textSecondary }}>Нет новых уведомлений</p></div>
                  ) : (
                    <div className="py-1">
                      {orders.map((o: any) => (
                        <button key={o.id} onClick={() => { router.push("/admin/orders"); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                          onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold truncate" style={{ color: glass.textPrimary }}>#{o.orderNumber} · {o.customerName || o.customerPhone || "Клиент"}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: glass.textSecondary }}>{Number(o.totalAmount || 0).toLocaleString("ru-RU")} ₽</p>
                          </div>
                        </button>
                      ))}
                      {reviews.map((r: any) => (
                        <button key={r.id} onClick={() => { router.push("/admin/reviews"); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                          onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold truncate" style={{ color: glass.textPrimary }}>{r.name} · {"⭐".repeat(r.rating)}</p>
                            <p className="text-[10px] mt-0.5 truncate" style={{ color: glass.textSecondary }}>{r.text?.substring(0, 40)}</p>
                          </div>
                        </button>
                      ))}
                      {pendingStaff.map((s: any) => (
                        <button key={`ps-${s.id}`} onClick={() => { router.push("/admin/staff"); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                          onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <UserPlus className="w-4 h-4 shrink-0" style={{ color: "hsl(200 80% 50%)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold truncate" style={{ color: glass.textPrimary }}>{s.name || s.email || "Заявка"}</p>
                            <p className="text-[10px]" style={{ color: glass.textSecondary }}>Ожидает одобрения</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="px-3 py-2" style={{ borderTop: `1px solid ${glass.borderInner}` }}>
                    <button onClick={() => { router.push("/admin/orders?status=NEW"); setOpen(false); }}
                      className="w-full text-center text-[12px] font-semibold py-2.5 rounded-xl transition-colors"
                      style={{ color: "hsl(var(--primary))" }}
                      onMouseEnter={e => (e.currentTarget.style.background = glass.hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      Все новые заказы →
                    </button>
                  </div>
                </div>
              )}
              {tab === "style" && (
                <div className="p-4 space-y-4">
                  {/* Палитры */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Палитра</p>
                    <div className="flex flex-wrap gap-2">
                      {PALETTES.map((p) => (
                        <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                          className={`w-8 h-8 rounded-full shrink-0 transition-all ${palette === p.id ? "ring-2 ring-offset-1 ring-offset-transparent scale-110" : "opacity-60 hover:opacity-100 hover:scale-105"}`}
                          style={{
                            background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)`,
                            ringColor: glass.textPrimary,
                          }} />
                      ))}
                    </div>
                  </div>
                  {/* Тема */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Тема</p>
                    <div className="flex gap-2">
                      {["light", "dark"].map((t) => (
                        <button key={t} onClick={() => setTheme(t)}
                          className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                          style={{
                            background: safeTheme === t ? "hsl(var(--primary))" : glass.hoverBg,
                            color: safeTheme === t ? "#fff" : glass.textSecondary,
                          }}>
                          {t === "light" ? "Светлая" : "Тёмная"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Шрифт — только на десктопе */}
                  <div className="hidden lg:block">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: glass.textSecondary }}>Размер шрифта</p>
                    <div className="flex gap-1.5">
                      {FONT_SIZES_CC.map((f) => (
                        <button key={f.id} onClick={() => pickFont(f.id)}
                          className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
                          style={{
                            background: fontActive === f.id ? "hsl(var(--primary))" : glass.hoverBg,
                            color: fontActive === f.id ? "#fff" : glass.textSecondary,
                          }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══ BOTTOM layout (original, for mobile sidebar) ═════════════════════
  return (
    <div ref={ref} className="relative flex-1 flex items-center">

      {/* ── Trigger: Bell (staff only) + ARAY ─────────────────── */}
      {!isClient && (
        <button onClick={openNotif} title="Уведомления"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all hover:bg-white/[0.06]">
          <div className="relative">
            <Bell className="w-4 h-4" style={{ color: count > 0 ? "hsl(var(--primary))" : "rgba(255,255,255,0.38)" }} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none"
                style={{ background: "hsl(var(--primary))" }}>
                {count > 9 ? "9+" : count}
              </span>
            )}
          </div>
        </button>
      )}

      <button onClick={() => { calcPos(); setTab("style"); setOpen(o => !o); }} title="Оформление — палитра, тема, шрифт"
        className="flex-1 flex items-center justify-center gap-1 py-2.5 transition-all hover:bg-white/[0.06]"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
        <Zap className="w-3.5 h-3.5" style={{ color: open && tab === "style" ? "hsl(var(--primary))" : "rgba(255,255,255,0.38)" }} />
        <span className="text-[10px] font-bold tracking-wider" style={{ color: open && tab === "style" ? "hsl(var(--primary))" : "rgba(255,255,255,0.28)" }}>ARAY</span>
      </button>

      {/* ══ ARAY Control Center Panel ════════════════════════════ */}
      {open && panelPos && (
        <div className="aray-dark-panel fixed w-[260px] z-[200] rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200"
          style={{ bottom: panelPos.bottom, left: panelPos.left, background: `linear-gradient(180deg, ${ccSidebarHex}, ${ccSidebarHex}ee)`, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b glass-popup-divider">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.45), hsl(var(--primary)/0.12))", boxShadow: "0 0 10px hsl(var(--primary)/0.3)" }}>
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <span className="text-[12px] font-bold tracking-[0.12em] uppercase text-muted-foreground">ARAY Control</span>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-primary/[0.04] transition-colors">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Header bar */}
          {!isClient ? (
            <div className="flex gap-1 p-2 border-b glass-popup-divider">
              <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-semibold glass-text-muted">
                <Bell className="w-3 h-3" />
                Уведомления
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                    style={{ background: "hsl(var(--primary))", color: "#fff" }}>{count}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 border-b glass-popup-divider">
              <p className="text-[10px] font-semibold glass-text-muted text-center">ARAY Control</p>
            </div>
          )}

          {/* Tab content */}
          <div className="overflow-y-auto" style={{ maxHeight: "68vh" }}>

            {/* ── NOTIFICATIONS ── */}
            {tab === "notif" && (
              <div>
                {loadingNotif ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : (orders.length === 0 && reviews.length === 0 && pendingStaff.length === 0) ? (
                  <div className="text-center py-8">
                    <Bell className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-muted-foreground text-xs">Нет новых уведомлений</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {/* Новые заказы */}
                    {orders.map((o: any) => (
                      <button key={`order-${o.id}`}
                        onClick={() => { router.push(`/admin/orders`); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/[0.06] transition-colors text-left">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "hsl(var(--primary)/0.14)", border: "1px solid hsl(var(--primary)/0.22)" }}>
                          <ShoppingBag className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">
                            #{o.orderNumber} · {o.customerName || o.customerPhone || "Клиент"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{Number(o.totalAmount || 0).toLocaleString("ru-RU")} ₽</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                      </button>
                    ))}
                    {/* Новые отзывы */}
                    {reviews.map((r: any) => (
                      <button key={`review-${r.id}`}
                        onClick={() => { router.push(`/admin/reviews`); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/[0.06] transition-colors text-left">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "hsl(45 93% 47% / 0.14)", border: "1px solid hsl(45 93% 47% / 0.22)" }}>
                          <Star className="w-3 h-3" style={{ color: "hsl(45 93% 47%)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">
                            {r.name || "Отзыв"} · {"★".repeat(r.rating || 5)}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.text?.slice(0, 60) || "Новый отзыв"}</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                      </button>
                    ))}
                    {/* Заявки сотрудников */}
                    {pendingStaff.map((s: any) => (
                      <button key={`staff-${s.id}`}
                        onClick={() => { router.push(`/admin/staff`); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/[0.06] transition-colors text-left">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "hsl(200 80% 50% / 0.14)", border: "1px solid hsl(200 80% 50% / 0.22)" }}>
                          <UserPlus className="w-3 h-3" style={{ color: "hsl(200 80% 50%)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">
                            {s.name || s.email || "Заявка"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Ожидает одобрения</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="px-3 py-2 border-t glass-popup-divider">
                  <button onClick={() => { router.push("/admin/orders?status=NEW"); setOpen(false); }}
                    className="w-full text-center text-[12px] font-semibold py-2.5 rounded-xl hover:bg-primary/[0.06] transition-colors"
                    style={{ color: "hsl(var(--primary))" }}>
                    Все новые заказы →
                  </button>
                </div>
              </div>
            )}

            {/* ── SETTINGS SHORTCUT ── */}
            {(isClient || tab === "style") && (
              <div className="p-4">
                <button onClick={() => { router.push("/cabinet/profile#appearance"); setOpen(false); }}
                  className="glass-control w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-primary/[0.06]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.08))" }}>
                    <Palette className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[12px] font-semibold" style={{ color: "var(--admin-popup-text)" }}>Настроить оформление</p>
                    <p className="text-[10px]" style={{ color: "var(--admin-popup-text-muted)" }}>Тема, цвет, фон, шрифт</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
