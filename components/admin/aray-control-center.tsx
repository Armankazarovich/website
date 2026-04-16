"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, X, Bell, ShoppingBag, Star, ArrowRight, UserPlus, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { useAdminLang } from "@/lib/admin-lang-context";
import { ADMIN_LANGUAGES, getFlagUrl } from "@/lib/admin-i18n";
import { useClassicMode, playOrderChime, LS_FONT } from "@/components/admin/admin-shell";

export function ArayControlCenter({ userRole, position = "bottom" }: { userRole?: string; position?: "bottom" | "right" }) {
  const isClient = userRole === "USER";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notif" | "style" | "lang">("notif");
  const [count, setCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, bgMode, setBg, toggle: toggleClassic } = useClassicMode();
  const { t, lang, setLang } = useAdminLang();
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

  // Единые размеры шрифтов — те же значения что в AdminFontPicker
  const FONT_SIZES_CC = [
    { id: "sm", label: "Компакт", px: "13px",   scale: "0.929" },
    { id: "md", label: "Норм",    px: "14px",   scale: "1"     },
    { id: "lg", label: "Крупн",   px: "15.5px", scale: "1.107" },
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

  // ═══ RIGHT SIDE sticky layout ═══════════════════════════════════════════
  if (position === "right") {
    return (
      <div ref={ref} className="flex flex-col items-center gap-1">
        {/* Collapsed: vertical pill with icons */}
        {!open ? (
          <div className="flex flex-col items-center gap-1 px-1.5 py-3 rounded-l-2xl"
            style={{ background: `linear-gradient(180deg, ${ccSidebarHex}, ${ccSidebarHex}dd)`, backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRight: "none" }}>
            {!isClient && (
              <button onClick={() => { setTab("notif"); setOpen(true); }} title="Уведомления"
                className="p-2 rounded-xl hover:bg-white/10 transition-colors relative">
                <Bell className="w-4 h-4" style={{ color: count > 0 ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)" }} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: "hsl(var(--primary))" }}>{count > 9 ? "9+" : count}</span>
                )}
              </button>
            )}
            <button onClick={() => { setTab("style"); setOpen(true); }} title="Оформление"
              className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Palette className="w-4 h-4 text-white/50" />
            </button>
            <button onClick={() => { setTab("lang"); setOpen(true); }} title="Язык"
              className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[11px] font-bold text-white/50">{lang.toUpperCase()}</span>
            </button>
          </div>
        ) : (
          /* Expanded: full panel */
          <div className="w-[280px] rounded-l-2xl overflow-hidden animate-in slide-in-from-right-2 fade-in duration-200"
            style={{ background: `linear-gradient(180deg, ${ccSidebarHex}, ${ccSidebarHex}ee)`, border: "1px solid rgba(255,255,255,0.08)", borderRight: "none", backdropFilter: "blur(24px)", maxHeight: "80vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-white">ARAY Control</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {!isClient && (
                <button onClick={() => setTab("notif")}
                  className={`flex-1 text-center text-[11px] font-semibold py-2.5 transition-colors ${tab === "notif" ? "text-primary" : "text-white/40 hover:text-white/70"}`}
                  style={tab === "notif" ? { borderBottom: "2px solid hsl(var(--primary))" } : {}}>
                  Уведомления {count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] text-white" style={{ background: "hsl(var(--primary))" }}>{count}</span>}
                </button>
              )}
              <button onClick={() => setTab("style")}
                className={`flex-1 text-center text-[11px] font-semibold py-2.5 transition-colors ${tab === "style" ? "text-primary" : "text-white/40 hover:text-white/70"}`}
                style={tab === "style" ? { borderBottom: "2px solid hsl(var(--primary))" } : {}}>
                Оформление
              </button>
              <button onClick={() => setTab("lang")}
                className={`flex-1 text-center text-[11px] font-semibold py-2.5 transition-colors ${tab === "lang" ? "text-primary" : "text-white/40 hover:text-white/70"}`}
                style={tab === "lang" ? { borderBottom: "2px solid hsl(var(--primary))" } : {}}>
                Язык
              </button>
            </div>
            {/* Content — same as bottom panel */}
            <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {tab === "notif" && !isClient && (
                <div>
                  {loadingNotif ? (
                    <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                  ) : orders.length === 0 && reviews.length === 0 && pendingStaff.length === 0 ? (
                    <div className="text-center py-8"><Bell className="w-6 h-6 text-white/20 mx-auto mb-2" /><p className="text-white/40 text-xs">Нет новых уведомлений</p></div>
                  ) : (
                    <div className="py-1">
                      {orders.map((o: any) => (
                        <button key={o.id} onClick={() => { router.push("/admin/orders"); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left">
                          <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-white/90 truncate">#{o.orderNumber} · {o.customerName || o.customerPhone || "Клиент"}</p>
                            <p className="text-[10px] text-white/40">{Number(o.totalAmount || 0).toLocaleString("ru-RU")} ₽</p>
                          </div>
                        </button>
                      ))}
                      {reviews.map((r: any) => (
                        <button key={r.id} onClick={() => { router.push("/admin/reviews"); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left">
                          <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-white/90 truncate">{r.name} · {"⭐".repeat(r.rating)}</p>
                            <p className="text-[10px] text-white/40 truncate">{r.text?.substring(0, 40)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "style" && (
                <div className="p-4 space-y-4">
                  {/* Палитры */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Палитра</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PALETTES.map((p) => (
                        <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                          className={`w-7 h-7 rounded-full shrink-0 transition-all ${palette === p.id ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-60 hover:opacity-100 hover:scale-105"}`}
                          style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                      ))}
                    </div>
                  </div>
                  {/* Тема */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Тема</p>
                    <div className="flex gap-2">
                      {["light", "dark"].map((t) => (
                        <button key={t} onClick={() => setTheme(t)}
                          className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${safeTheme === t ? "bg-primary text-white" : "bg-white/10 text-white/50 hover:bg-white/15"}`}>
                          {t === "light" ? "Светлая" : "Тёмная"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Шрифт */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Размер шрифта</p>
                    <div className="flex gap-1.5">
                      {FONT_SIZES_CC.map((f) => (
                        <button key={f.id} onClick={() => pickFont(f.id)}
                          className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${fontActive === f.id ? "bg-primary text-white" : "bg-white/10 text-white/50 hover:bg-white/15"}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* ── Language tab ── */}
              {tab === "lang" && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Выберите язык</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ADMIN_LANGUAGES.map((l) => (
                      <button key={l.code} onClick={() => { setLang(l.code); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] transition-all text-left ${lang === l.code ? "bg-primary text-white font-semibold" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>
                        <img src={getFlagUrl(l.flag)} alt="" className="w-6 h-4 rounded-sm object-cover shrink-0" />
                        {l.label}
                      </button>
                    ))}
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
              <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white leading-none"
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
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">ARAY Control</span>
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
                  <span className="px-1 py-0.5 rounded-full text-[8px] font-bold leading-none"
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/[0.04] transition-colors text-left">
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/[0.04] transition-colors text-left">
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/[0.04] transition-colors text-left">
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
                    className="w-full text-center text-[11px] font-semibold py-2 rounded-xl hover:bg-primary/[0.04] transition-colors"
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
