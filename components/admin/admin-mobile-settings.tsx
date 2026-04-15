"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import { LS_FONT, useClassicMode } from "@/components/admin/admin-shell";

// ── Mobile font size inline control ──────────────────────────────────────────
const FONT_SIZES = [
  { id: "xs", label: "Мини",    px: "12px",   scale: "0.857" },
  { id: "sm", label: "Компакт", px: "13px",   scale: "0.929" },
  { id: "md", label: "Обычный", px: "14px",   scale: "1" },
  { id: "lg", label: "Крупнее", px: "15.5px", scale: "1.107" },
  { id: "xl", label: "Макс",    px: "17px",   scale: "1.214" },
];

export function MobileFontControl() {
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

// ── Мобильный pill: уведомления + настройки (как кнопка фильтров в магазине) ─
export function AdminMobileActionPill({ onSettingsOpen }: { onSettingsOpen: () => void }) {
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

// ── ARAY Translation Check — проверка грамматики перевода ────────────────────
export function ArayTranslationCheck() {
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
