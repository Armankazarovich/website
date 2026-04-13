"use client";

import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { LazyNeuralBg, LazyCursorGlow, LazyAdminVideoBg, LazyAdminAray, LazyAdminPageHelp, LazyAdminTour } from "@/components/admin/lazy-components";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, LogOut, Sun, Moon, Bell, Settings, ShoppingBag,
  ArrowRight, ALargeSmall, Monitor, Zap, Palette, Film,
} from "lucide-react";

// ── Ключи localStorage ────────────────────────────────────────────────────────
const LS_CLASSIC = "aray-classic-mode";
const LS_BG_MODE = "aray-bg-mode"; // "classic" | "video"
const LS_FONT    = "aray-font-size";

type BgMode = "classic" | "video";

function useClassicMode() {
  const [bgMode, setBgMode] = useState<BgMode>("classic");
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    // Миграция: если старый LS_CLASSIC = "1" → bgMode = "classic"
    const legacyClassic = localStorage.getItem(LS_CLASSIC) === "1";
    const stored = localStorage.getItem(LS_BG_MODE) as BgMode | null;
    if (stored && ["classic", "video"].includes(stored)) {
      setBgMode(stored);
    } else if (legacyClassic) {
      setBgMode("classic");
      localStorage.setItem(LS_BG_MODE, "classic");
    } else {
      setBgMode("classic");
    }
    // Detect light theme — force classic styles when light so dark rgba() never shows
    const checkLight = () => {
      const html = document.documentElement;
      setIsLight(html.classList.contains("light") || html.getAttribute("data-theme") === "light" || (!html.classList.contains("dark") && window.matchMedia("(prefers-color-scheme: light)").matches));
    };
    checkLight();
    const obs = new MutationObserver(checkLight);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    const handler = () => {
      const m = localStorage.getItem(LS_BG_MODE) as BgMode | null;
      if (m) setBgMode(m);
    };
    window.addEventListener("aray-classic-change", handler);
    return () => { window.removeEventListener("aray-classic-change", handler); obs.disconnect(); };
  }, []);
  const setBg = (mode: BgMode) => {
    localStorage.setItem(LS_BG_MODE, mode);
    // Совместимость со старым ключом
    localStorage.setItem(LS_CLASSIC, mode === "classic" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  };
  const toggle = () => setBg(bgMode === "classic" ? "video" : "classic");
  const classic = isLight || bgMode === "classic";
  return { classic, rawClassic: bgMode === "classic", bgMode: isLight ? "classic" as BgMode : bgMode, setBg, toggle };
}

// ── Звук нового заказа (Web Audio API, без файлов) ───────────────────────────
function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.type = "sine"; o1.frequency.value = 1046;
    g1.gain.setValueAtTime(0.25, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.4);
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = "sine"; o2.frequency.value = 784;
    g2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    g2.gain.setValueAtTime(0.20, ctx.currentTime + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o2.start(ctx.currentTime + 0.15); o2.stop(ctx.currentTime + 0.6);
  } catch {}
}

// ── Уведомления нового поколения ─────────────────────────────────────────────
function AdminNotificationBell({ mobile = false }: { mobile?: boolean }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const prevOrderCount = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { classic } = useClassicMode();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) {
          const data = await res.json();
          const newOrders = data.newOrders ?? 0;
          const total = data.total ?? 0;
          if (prevOrderCount.current !== null && newOrders > prevOrderCount.current) playOrderChime();
          prevOrderCount.current = newOrders;
          setCount(total);
        }
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    if (mobile) { router.push("/admin/orders?status=NEW"); return; }
    const next = !open;
    setOpen(next);
    if (next) {
      setLoadingOrders(true);
      try {
        const res = await fetch("/api/admin/orders?status=NEW&limit=5&page=1");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || (Array.isArray(data) ? data : []));
        }
      } catch {} finally { setLoadingOrders(false); }
    }
  }

  const badge = count > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
      {count > 99 ? "99+" : count}
    </span>
  );

  if (mobile) {
    return (
      <button onClick={handleOpen}
        className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 relative">
        <Bell className={`w-[18px] h-[18px] text-amber-400 ${count > 0 ? "animate-[bell-ring_2s_ease_infinite]" : ""}`} />
        {badge}
      </button>
    );
  }

  return (
    <div ref={panelRef} className="relative">
      <button onClick={handleOpen}
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-500/15 transition-all group relative">
        <Bell className={`w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform ${count > 0 ? "animate-[bell-ring_2.5s_ease_infinite]" : ""}`} />
        <span className="absolute inset-0 rounded-xl group-hover:ring-2 ring-amber-400/20 transition-all" />
        {badge}
      </button>

      {open && (
        <div className="glass-popup absolute top-full right-0 mt-2 z-[70] w-80 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">

          {/* Panel header */}
          <div className="px-4 py-3 flex items-center justify-between border-b glass-popup-divider">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b33, #f59e0b11)" }}>
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">Уведомления</p>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
                  {count} новых
                </span>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-primary/[0.04] transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Orders list */}
          <div className="max-h-[280px] overflow-y-auto">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "hsl(var(--muted))" }}>
                  <Bell className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Нет новых уведомлений</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Все заказы обработаны</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {orders.slice(0, 5).map((order: any) => (
                  <button key={order.id}
                    onClick={() => { router.push(`/admin/orders/${order.id}`); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/[0.04] transition-colors group">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.08))" }}>
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Заказ #{order.orderNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {order.clientName || "Клиент"}
                        {order.totalAmount ? ` · ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽` : ""}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t glass-popup-divider">
            <button
              onClick={() => { router.push("/admin/orders?status=NEW"); setOpen(false); }}
              className="w-full text-center text-xs font-semibold py-1.5 rounded-xl transition-colors hover:bg-primary/[0.04]"
              style={{ color: "hsl(var(--primary))" }}>
              Все новые заказы →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { AdminLangPicker, AdminLangPickerInline } from "@/components/admin/admin-lang-picker";
import { useAdminLang } from "@/lib/admin-lang-context";
import { useTheme } from "next-themes";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPwaInstall } from "@/components/admin/admin-pwa-install";
import { AdminPushPrompt } from "@/components/admin/admin-push-prompt";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { AdminLangProvider } from "@/lib/admin-lang-context";
import { AdminSidebarWeather } from "@/components/admin/admin-dashboard-widgets";
import { TourTriggerButton } from "@/components/admin/admin-tour";

// ── ARAY Translation Check — проверка грамматики перевода ────────────────────
function ArayTranslationCheck() {
  const { lang } = useAdminLang();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; issues: string[] } | null>(null);

  if (lang === "ru") return null; // Русский — проверка не нужна

  async function checkGrammar() {
    setChecking(true);
    setResult(null);
    try {
      // Собираем видимый текст страницы (main контент, не сайдбар)
      const main = document.querySelector("main");
      if (!main) { setResult({ ok: true, issues: [] }); return; }
      const text = main.innerText.substring(0, 2000); // Первые 2000 символов
      const langName = lang === "en" ? "English" : lang === "de" ? "German" : lang === "fr" ? "French" : lang === "es" ? "Spanish" : lang;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `You are a professional translator and grammar checker. Check this ${langName} translation for grammar errors, awkward phrasing, or untranslated words. The original language is Russian. Reply in JSON format: {"ok": true/false, "issues": ["issue1", "issue2"]}. Max 5 issues. If translation is good, return {"ok": true, "issues": []}. Be concise.\n\nText to check:\n${text}`
          }],
          context: "translation_check"
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.message || "";
        try {
          const jsonMatch = reply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            setResult(JSON.parse(jsonMatch[0]));
          } else {
            setResult({ ok: true, issues: [reply.substring(0, 200)] });
          }
        } catch {
          setResult({ ok: true, issues: [] });
        }
      }
    } catch {
      setResult({ ok: false, issues: ["Не удалось проверить — попробуйте позже"] });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <button
        onClick={checkGrammar}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
        style={{
          background: result?.ok === true ? "rgba(34,197,94,0.15)" : result?.ok === false ? "rgba(239,68,68,0.15)" : "hsl(var(--primary)/0.12)",
          color: result?.ok === true ? "#22c55e" : result?.ok === false ? "#ef4444" : "hsl(var(--primary))",
          border: "1px solid " + (result?.ok === true ? "rgba(34,197,94,0.25)" : result?.ok === false ? "rgba(239,68,68,0.25)" : "hsl(var(--primary)/0.2)"),
        }}
      >
        {checking ? (
          <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Проверяю...</>
        ) : result?.ok === true ? (
          "✓ Перевод OK"
        ) : result?.ok === false ? (
          "⚠ Найдены замечания"
        ) : (
          "🔍 ARAY: Проверить перевод"
        )}
      </button>
      {result && result.issues.length > 0 && (
        <div className="mt-2 p-2 rounded-xl text-[10px] space-y-1" style={{ background: "rgba(239,68,68,0.08)" }}>
          {result.issues.map((issue, i) => (
            <p key={i} className="text-white/70">• {issue}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Мобильный pill: уведомления + настройки (как кнопка фильтров в магазине) ─
function AdminMobileActionPill({ onSettingsOpen }: { onSettingsOpen: () => void }) {
  const [count, setCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const router = useRouter();
  const classic = useClassicMode();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) { const d = await res.json(); setCount(d.total ?? 0); }
      } catch {}
    };
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  const openBell = async () => {
    setBellOpen(true);
    if (!orders.length) {
      setLoadingOrders(true);
      try {
        const res = await fetch("/api/admin/orders?status=NEW&limit=5");
        if (res.ok) { const d = await res.json(); setOrders(d.orders ?? []); }
      } catch {} finally { setLoadingOrders(false); }
    }
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Уведомления — pill кнопка */}
      <div className="relative">
        <button
          onClick={openBell}
          style={{ WebkitTapHighlightColor: "transparent",
            ...(count > 0 ? { background: "hsl(var(--primary)/0.20)", border: "1px solid hsl(var(--primary)/0.40)" } : {}),
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all active:scale-95 ${count > 0 ? "" : "glass-pill"}`}
        >
          <Bell className="w-4 h-4" style={{ color: count > 0 ? "hsl(var(--primary))" : "rgba(255,255,255,0.55)" }} />
          {count > 0 && (
            <span className="text-[11px] font-bold leading-none" style={{ color: "hsl(var(--primary))" }}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>

        {/* Dropdown уведомлений */}
        {bellOpen && (
          <>
            <div className="fixed inset-0 z-[80]" onClick={() => setBellOpen(false)} />
            <div className="glass-popup absolute right-0 top-full mt-2 z-[81] w-72 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b glass-popup-divider">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Новые заказы</p>
              </div>
              {loadingOrders ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">Нет новых заказов</p>
              ) : (
                <div className="py-1.5 max-h-64 overflow-y-auto">
                  {orders.map((o: any) => (
                    <button key={o.id} onClick={() => { router.push(`/admin/orders/${o.id}`); setBellOpen(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/[0.04] transition-colors text-left">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">#{o.orderNumber} {o.guestName || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{o.guestPhone || ""}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary shrink-0">
                        {o.totalAmount ? `${Number(o.totalAmount).toLocaleString()} ₽` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t glass-popup-divider">
                <button onClick={() => { router.push("/admin/orders"); setBellOpen(false); }}
                  className="w-full py-3 text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                  Все заказы →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Настройки — gear pill */}
      <button
        onClick={onSettingsOpen}
        style={{ WebkitTapHighlightColor: "transparent" }}
        className="glass-pill flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all active:scale-95"
      >
        <Settings className="w-4 h-4 glass-text-secondary" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ✦ ARAY Control Center — единая панель уведомлений + оформления
// ══════════════════════════════════════════════════════════════════════════════
function ArayControlCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notif" | "style">("notif");
  const [count, setCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, bgMode, setBg, toggle: toggleClassic } = useClassicMode();
  const { t } = useAdminLang();
  const ref = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ bottom: number; left: number } | null>(null);
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

  // Polling счётчика новых заказов
  useEffect(() => {
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
  }, []);

  const calcPos = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPanelPos({ bottom: window.innerHeight - r.top + 6, left: r.left });
    }
  };

  const openNotif = async () => {
    calcPos(); setTab("notif"); setOpen(true);
    if (!orders.length) {
      setLoadingOrders(true);
      try {
        const res = await fetch("/api/admin/orders?status=NEW&limit=5");
        if (res.ok) { const d = await res.json(); setOrders(d.orders ?? []); }
      } catch {} finally { setLoadingOrders(false); }
    }
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

  return (
    <div ref={ref} className="relative flex-1 flex items-center">

      {/* ── Trigger: Bell + ARAY ─────────────────────────────── */}
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

      <button onClick={() => { calcPos(); setTab("style"); setOpen(o => !o); }} title="Оформление — палитра, тема, шрифт"
        className="flex-1 flex items-center justify-center gap-1 py-2.5 transition-all hover:bg-white/[0.06]"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
        <Zap className="w-3.5 h-3.5" style={{ color: open && tab === "style" ? "hsl(var(--primary))" : "rgba(255,255,255,0.38)" }} />
        <span className="text-[10px] font-bold tracking-wider" style={{ color: open && tab === "style" ? "hsl(var(--primary))" : "rgba(255,255,255,0.28)" }}>ARAY</span>
      </button>

      {/* ══ ARAY Control Center Panel ════════════════════════════ */}
      {open && panelPos && (
        <div className="aray-dark-panel fixed w-[260px] z-[200] rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200"
          style={{ bottom: panelPos.bottom, left: panelPos.left, background: "linear-gradient(180deg, hsl(var(--brand-sidebar)), hsl(var(--brand-sidebar) / 0.95))", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}>

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

          {/* Tab switcher */}
          <div className="flex gap-1 p-2 border-b glass-popup-divider">
            <button onClick={() => setTab("notif")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all border ${tab === "notif" ? "glass-control-active text-primary" : "glass-control glass-text-muted"}`}>
              <Bell className="w-3 h-3" />
              Уведомления
              {count > 0 && (
                <span className="px-1 py-0.5 rounded-full text-[8px] font-bold leading-none"
                  style={{ background: "hsl(var(--primary))", color: "#fff" }}>{count}</span>
              )}
            </button>
            <button onClick={() => setTab("style")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all border ${tab === "style" ? "glass-control-active text-primary" : "glass-control glass-text-muted"}`}>
              <Palette className="w-3 h-3" />
              Оформление
            </button>
          </div>

          {/* Tab content */}
          <div className="overflow-y-auto" style={{ maxHeight: "68vh" }}>

            {/* ── NOTIFICATIONS ── */}
            {tab === "notif" && (
              <div>
                {loadingOrders ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-muted-foreground text-xs">Нет новых заказов</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {orders.map((o: any) => (
                      <button key={o.id}
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

            {/* ── STYLE ── */}
            {tab === "style" && (
              <div className="p-4 space-y-4">

                {/* Палитра */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 glass-text-label">Цвет интерфейса</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PALETTES.map((p) => (
                      <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                        className="w-7 h-7 rounded-full shrink-0 transition-all active:scale-90"
                        style={{
                          background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)`,
                          ...(palette === p.id
                            ? { outline: classic ? "2px solid hsl(var(--primary))" : "2px solid rgba(255,255,255,0.85)", outlineOffset: "2px" }
                            : { opacity: 0.55 })
                        }} />
                    ))}
                  </div>
                </div>

                {/* Тема */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 glass-text-label">Тема</p>
                  <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="glass-control w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.08))" }}>
                      {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-violet-400" /> : <Moon className="w-3.5 h-3.5 text-violet-400" />}
                    </div>
                    <span className="flex-1 text-left text-[12px] font-medium glass-text-primary">
                      {theme === "dark" ? "Тёмная тема" : "Светлая тема"}
                    </span>
                    <div className="relative w-9 h-5 rounded-full shrink-0 glass-pill"
                      style={{ background: theme === "dark" ? "hsl(var(--primary)/0.45)" : undefined }}>
                      <div className="absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all duration-200"
                        style={{ background: theme === "dark" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", left: theme === "dark" ? "calc(100% - 17px)" : "3px" }} />
                    </div>
                  </button>
                </div>

                {/* Фон */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 glass-text-label">{t("bg_panel")}</p>
                  <div className="flex gap-1">
                    {([
                      { id: "classic" as BgMode, icon: Monitor, label: t("bg_classic") },
                      { id: "video" as BgMode, icon: Film, label: t("bg_video") },
                    ]).map(opt => (
                      <button key={opt.id} onClick={() => setBg(opt.id)}
                        className={`flex flex-col items-center gap-1 flex-1 py-2.5 rounded-xl transition-all border ${bgMode === opt.id ? "glass-control-active" : "glass-control"}`}>
                        <opt.icon className={`w-4 h-4 ${bgMode === opt.id ? "text-primary" : "glass-text-muted"}`} />
                        <span className={`text-[9px] leading-none ${bgMode === opt.id ? "text-primary font-semibold" : "glass-text-muted"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Шрифт */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 glass-text-label">{t("font_size")}</p>
                  <div className="flex items-end gap-1">
                    {FONT_SIZES_CC.map(s => (
                      <button key={s.id} onClick={() => pickFont(s.id)}
                        className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all border ${fontActive === s.id ? "glass-control-active" : "glass-control"}`}>
                        <span className={fontActive === s.id ? "text-primary" : "glass-text-muted"} style={{ fontSize: s.px, lineHeight: 1, fontWeight: 800 }}>A</span>
                        <span className="text-[8px] leading-none glass-text-muted">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Язык */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 glass-text-label">Язык</p>
                  <AdminLangPickerInline />
                </div>

                {/* ARAY грамматика — проверка качества перевода */}
                <ArayTranslationCheck />

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  userName?: string | null;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  "/admin": "",
  "/admin/orders": "Заказы",
  "/admin/crm": "CRM — Лиды",
  "/admin/tasks": "Задачи",
  "/admin/workflows": "Автоворкфлоу",
  "/admin/delivery": "Доставка",
  "/admin/products": "Каталог товаров",
  "/admin/categories": "Категории",
  "/admin/inventory": "Склад / Остатки",
  "/admin/import": "Импорт / Экспорт",
  "/admin/media": "Медиабиблиотека",
  "/admin/promotions": "Акции",
  "/admin/reviews": "Отзывы",
  "/admin/email": "Email рассылка",
  "/admin/promotion": "Продвижение",
  "/admin/finance": "Финансы",
  "/admin/clients": "Клиенты",
  "/admin/health": "Здоровье системы",
  "/admin/site": "Настройки сайта",
  "/admin/settings": "Настройки",
  "/admin/appearance": "Оформление",
  "/admin/analytics": "Аналитика",
  "/admin/watermark": "Водяной знак",
  "/admin/staff": "Команда",
  "/admin/notifications": "Уведомления",
  "/admin/help": "Помощь",
};

function usePageTitle() {
  const pathname = usePathname();
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);
  for (const [path, title] of sorted) {
    if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) return title;
  }
  return "Панель управления";
}

// ── Mobile font size inline control ──────────────────────────────────────────
const FONT_SIZES = [
  { id: "xs", label: "Мини",    px: "12px",   scale: "0.857" },
  { id: "sm", label: "Компакт", px: "13px",   scale: "0.929" },
  { id: "md", label: "Обычный", px: "14px",   scale: "1" },
  { id: "lg", label: "Крупнее", px: "15.5px", scale: "1.107" },
  { id: "xl", label: "Макс",    px: "17px",   scale: "1.214" },
];

function MobileFontControl() {
  const [active, setActive] = useState("md");
  useEffect(() => {
    const saved = localStorage.getItem(LS_FONT);
    if (saved) setActive(saved);
  }, []);

  function pick(id: string) {
    const s = FONT_SIZES.find(f => f.id === id)!;
    setActive(id);
    localStorage.setItem(LS_FONT, id);
    document.documentElement.style.setProperty("font-size", s.px);
    document.documentElement.style.setProperty("--aray-font-scale", s.scale);
  }

  return (
    <div className="flex items-end justify-between gap-1.5">
      {FONT_SIZES.map(s => (
        <button key={s.id} onClick={() => pick(s.id)}
          className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all border ${active === s.id ? "glass-control-active" : "glass-control"}`}>
          <span style={{ fontSize: s.px, lineHeight: 1, fontWeight: 800 }}
            className={active === s.id ? "text-primary" : "text-white/50"}>A</span>
          <span className="text-[9px] font-medium text-white/40 leading-none">{s.label.slice(0, 4)}</span>
        </button>
      ))}
    </div>
  );
}

function AdminShellInner({ role, email, userName, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, bgMode, setBg, toggle: toggleClassic } = useClassicMode();
  const { t } = useAdminLang();
  const pageTitle = usePageTitle();

  // Синхронизируем aray-classic-mode на <body> для порталов (Sheet, Dialog)
  useEffect(() => {
    document.body.classList.toggle("aray-classic-mode", classic);
    document.body.classList.toggle("aray-nature-mode", !classic);
    return () => {
      document.body.classList.remove("aray-classic-mode", "aray-nature-mode");
    };
  }, [classic]);

  // Свайп от левого края → открыть меню
  const touchStartX = useRef(0);
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (!open && touchStartX.current < 32 && dx > 60) setOpen(true);
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [open]);

  return (
    <div className={`flex min-h-screen relative ${classic ? "aray-classic-mode" : "aray-admin-bg aray-nature-mode"}`}
      style={classic ? undefined : { backgroundColor: "rgb(6, 8, 18)" }}>
      {/* Google Translate скрытый контейнер — переводит страницу целиком */}
      <div id="google_translate_element" style={{ position: "absolute", top: -9999, left: -9999, opacity: 0, pointerEvents: "none" }} />
      {bgMode === "video" && <LazyAdminVideoBg enabled />}
      {bgMode === "classic" && <LazyNeuralBg enabled />}
      <LazyCursorGlow />

      {/* ─── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 aray-sidebar text-white flex-col fixed top-0 left-0 h-screen z-30">
        <div className="px-5 py-5 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))", boxShadow: "0 0 12px hsl(var(--primary)/0.5)" }}>
              <span className="text-white font-bold text-xs">П</span>
            </div>
            <div>
              <p className="font-display font-bold text-base text-white leading-none">ПилоРус</p>
              <p className="text-[10px] text-white/45 mt-0.5 leading-none">Панель управления</p>
            </div>
          </Link>
        </div>

        {/* Nav + weather scrollable, footer always pinned at bottom */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <AdminNav role={role} />
          <AdminPushPrompt />
          <AdminSidebarWeather />
        </div>

        {/* ── Подвал сайдбара: палитра + пользователь + контролы ── */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
          <AdminPwaInstall />

          {/* ── User Card — профессиональная карточка пользователя ── */}
          <div className="glass-card rounded-2xl overflow-hidden">

            {/* Верх карточки — аватар + имя + роль */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.55))", boxShadow: "0 4px 12px hsl(var(--primary)/0.35)" }}>
                {email ? email[0].toUpperCase() : "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/90 truncate leading-tight">
                  {email ? email.split("@")[0].split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Admin"}
                </p>
                <p className="text-[10px] text-white/38 truncate leading-tight mt-0.5">{email}</p>
              </div>
              {role && (
                <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: "hsl(var(--primary)/0.18)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.28)" }}>
                  {role === "SUPER_ADMIN" ? "Владелец" : role === "ADMIN" ? "Адм" : role === "MANAGER" ? "Менеджер" : role === "COURIER" ? "Курьер" : role === "ACCOUNTANT" ? "Бухгалтер" : role === "WAREHOUSE" ? "Склад" : role === "SELLER" ? "Продавец" : role}
                </span>
              )}
            </div>

            {/* Нижние кнопки — ARAY Control Center + На сайт */}
            <div className="flex items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <ArayControlCenter />
              <Link href="/"
                className="flex items-center justify-center gap-1 px-3 py-2.5 text-[10px] text-white/35 hover:text-white/75 hover:bg-white/[0.06] transition-colors shrink-0"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
                title="Перейти на сайт">
                <ShoppingBag className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile header убран — заменён compact sticky search bar внутри main ── */}

      {/* ─── Mobile sidebar drawer (левый) ───────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="lg:hidden w-72 aray-sidebar text-white flex flex-col"
          style={{ boxShadow: "4px 0 32px rgba(0,0,0,0.4)", background: `linear-gradient(180deg, hsl(var(--brand-sidebar)), hsl(var(--brand-sidebar) / 0.92))` }}
          aria-describedby={undefined}>
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <p className="font-display font-bold text-xl text-white">ПилоРус</p>
              <p className="text-[11px] text-white/45 mt-0.5">Панель управления</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <AdminNav role={role} onNavigate={() => setOpen(false)} />
          </div>
          <AdminPushPrompt />
          <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
            <AdminPwaInstall />
            <div className="px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55 mb-2">Тема</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PALETTES.map((p) => (
                  <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                    className={`w-7 h-7 rounded-full shrink-0 transition-all ${palette === p.id ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-50 hover:opacity-90 hover:scale-105"}`}
                    style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                ))}
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-7 h-7 rounded-full shrink-0 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="px-3 py-1 text-[11px] text-white/58 truncate">{email}</div>
            <Link href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors"
              onClick={() => setOpen(false)}>
              <LogOut className="w-4 h-4" />
              На сайт
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile settings panel (правый) ──────────────────── */}
      <Sheet open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
        <SheetContent side="right" className="lg:hidden w-80 aray-sidebar text-white flex flex-col"
          style={{ boxShadow: "-4px 0 32px rgba(0,0,0,0.4)", background: `linear-gradient(180deg, hsl(var(--brand-sidebar)), hsl(var(--brand-sidebar) / 0.92))` }}
          aria-describedby={undefined}>
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />

          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))" }}>
                <Settings className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="font-display font-bold text-lg text-white">Настройки</p>
            </div>
            <button onClick={() => setMobileSettingsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6">

            {/* Язык */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">
                Язык / Language
              </p>
              <AdminLangPickerInline />
            </div>

            {/* Размер шрифта */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ALargeSmall className="w-3.5 h-3.5 text-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Размер шрифта
                </p>
              </div>
              <MobileFontControl />
            </div>

            {/* Тема */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">
                Тема
              </p>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="glass-control w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.08))" }}>
                  {theme === "dark"
                    ? <Sun className="w-4 h-4 text-violet-400" />
                    : <Moon className="w-4 h-4 text-violet-400" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white/85">
                    {theme === "dark" ? "Тёмная тема" : "Светлая тема"}
                  </p>
                  <p className="text-[11px] text-white/35">
                    Нажми чтобы переключить
                  </p>
                </div>
                <div className="w-10 h-5.5 rounded-full relative"
                  style={{
                    background: theme === "dark"
                      ? "hsl(var(--primary)/0.4)"
                      : "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                    style={{
                      background: theme === "dark" ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)",
                      left: theme === "dark" ? "calc(100% - 18px)" : "2px",
                    }} />
                </div>
              </button>
            </div>

            {/* Режим фона */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">{t("bg_panel")}</p>
              <div className="flex gap-2">
                {([
                  { id: "classic" as BgMode, icon: Monitor, label: t("bg_classic"), desc: "—" },
                  { id: "video" as BgMode, icon: Film, label: t("bg_video"), desc: "—" },
                ]).map(opt => (
                  <button key={opt.id} onClick={() => setBg(opt.id)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all border ${bgMode === opt.id ? "glass-control-active" : "glass-control"}`}>
                    <opt.icon className={`w-5 h-5 ${bgMode === opt.id ? "text-primary" : "glass-text-muted"}`} />
                    <span className={`text-[11px] font-semibold ${bgMode === opt.id ? "text-primary" : "text-white/60"}`}>{opt.label}</span>
                    <span className="text-[9px] glass-text-muted">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Палитра */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">
                Цветовая палитра
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {PALETTES.map((p) => (
                  <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                    className="w-9 h-9 rounded-full shrink-0 transition-all active:scale-90"
                    style={{
                      background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)`,
                      ...(palette === p.id
                        ? { outline: "2.5px solid rgba(255,255,255,0.9)", outlineOffset: "3px" }
                        : { opacity: 0.5 })
                    }} />
                ))}
              </div>
            </div>

            {/* На сайт */}
            <Link href="/"
              className="glass-control flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors"
              onClick={() => setMobileSettingsOpen(false)}>
              <LogOut className="w-4 h-4 text-white/45" />
              <span className="text-sm text-white/60">Перейти на сайт</span>
            </Link>

            <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />

          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile bottom nav ───────────────────────────────── */}
      <AdminMobileBottomNav role={role} onMenuOpen={() => setOpen(true)} menuOpen={open} />

      {/* ─── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto lg:ml-60 relative z-[5]">

        {/* Mobile header убран — навигация через нижний dock + Арай */}

        {/* Desktop: хедер убран полностью — поиск через Арая снизу */}

        <div className="pt-0" style={{ paddingBottom: "calc(72px + max(16px, env(safe-area-inset-bottom, 16px)))" }}>
          <div className="px-2.5 py-2 lg:p-6">{children}</div>
        </div>
      </main>

      {/* ── Арай — фиксированная панель снизу на всех страницах ── */}
      {/* AdminPageHelp и AdminTour убраны — ARAY обучает и помогает вместо них */}
      <LazyAdminAray staffName={userName || (email && !email.startsWith("info") ? email.split("@")[0] : null) || "Коллега"} userRole={role} />
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <AdminLangProvider>
      <AdminShellInner {...props} />
    </AdminLangProvider>
  );
}
