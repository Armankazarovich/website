"use client";

import { useState, useMemo } from "react";
import {
  FlaskConical,
  Palette,
  Sparkles,
  LayoutGrid,
  Square,
  MousePointer2,
  Component,
  Monitor,
  Tablet,
  Smartphone,
  User,
  ShoppingBag,
  Heart,
  Bell,
  Gift,
  Image as ImageIcon,
  Clock,
  MapPin,
  LogOut,
  ArrowRight,
} from "lucide-react";

// ── Palette overrides (timber / ocean / crimson, dark + light) ────────────────
// Values mirror app/globals.css :root and .dark[data-palette="..."] blocks.
type PaletteKey = "timber" | "ocean" | "crimson";
type ThemeKey = "dark" | "light";

type CssVars = Record<string, string>;

const PALETTE_VARS: Record<PaletteKey, Record<ThemeKey, CssVars>> = {
  timber: {
    light: {
      "--background": "27 30% 97%",
      "--foreground": "27 30% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "27 30% 10%",
      "--muted": "27 15% 94%",
      "--muted-foreground": "27 15% 40%",
      "--primary": "27 91% 45%",
      "--primary-foreground": "0 0% 100%",
      "--border": "27 20% 86%",
      "--brand-sidebar": "20 64% 20%",
      "--brand-primary": "27 91% 45%",
    },
    dark: {
      "--background": "20 10% 7%",
      "--foreground": "27 30% 95%",
      "--card": "20 8% 10%",
      "--card-foreground": "27 30% 95%",
      "--muted": "20 4% 14%",
      "--muted-foreground": "27 20% 60%",
      "--primary": "27 91% 55%",
      "--primary-foreground": "0 0% 100%",
      "--border": "20 14% 20%",
      "--brand-sidebar": "20 64% 20%",
      "--brand-primary": "27 91% 55%",
    },
  },
  ocean: {
    light: {
      "--background": "214 30% 97%",
      "--foreground": "214 30% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "214 30% 10%",
      "--muted": "214 20% 96%",
      "--muted-foreground": "214 15% 45%",
      "--primary": "217 91% 55%",
      "--primary-foreground": "0 0% 100%",
      "--border": "214 20% 88%",
      "--brand-sidebar": "214 54% 23%",
      "--brand-primary": "217 91% 55%",
    },
    dark: {
      "--background": "210 20% 8%",
      "--foreground": "214 20% 95%",
      "--card": "210 16% 10%",
      "--card-foreground": "214 20% 95%",
      "--muted": "214 4% 14%",
      "--muted-foreground": "214 15% 55%",
      "--primary": "217 91% 65%",
      "--primary-foreground": "0 0% 100%",
      "--border": "214 20% 20%",
      "--brand-sidebar": "214 54% 20%",
      "--brand-primary": "217 91% 65%",
    },
  },
  crimson: {
    light: {
      "--background": "355 30% 97%",
      "--foreground": "355 30% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "355 30% 10%",
      "--muted": "355 15% 96%",
      "--muted-foreground": "355 15% 45%",
      "--primary": "10 80% 50%",
      "--primary-foreground": "0 0% 100%",
      "--border": "355 20% 88%",
      "--brand-sidebar": "355 62% 14%",
      "--brand-primary": "10 80% 50%",
    },
    dark: {
      "--background": "0 10% 8%",
      "--foreground": "355 20% 95%",
      "--card": "0 8% 10%",
      "--card-foreground": "355 20% 95%",
      "--muted": "355 4% 14%",
      "--muted-foreground": "355 15% 55%",
      "--primary": "10 80% 60%",
      "--primary-foreground": "0 0% 100%",
      "--border": "355 20% 20%",
      "--brand-sidebar": "355 62% 14%",
      "--brand-primary": "10 80% 60%",
    },
  },
};

const PALETTE_LABELS: Record<PaletteKey, string> = {
  timber: "Timber",
  ocean: "Ocean",
  crimson: "Crimson",
};

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = "popups" | "buttons" | "icons" | "cards" | "effects" | "palettes";

const TABS: { id: TabId; label: string; icon: typeof FlaskConical; ready: boolean }[] = [
  { id: "popups", label: "Попапы", icon: Component, ready: true },
  { id: "buttons", label: "Кнопки", icon: MousePointer2, ready: true },
  { id: "cards", label: "Карточки", icon: Square, ready: true },
  { id: "icons", label: "Инпуты+меню", icon: Sparkles, ready: true },
  { id: "effects", label: "Эффекты", icon: LayoutGrid, ready: true },
  { id: "palettes", label: "Палитры", icon: Palette, ready: false },
];

// ── Viewport presets ──────────────────────────────────────────────────────────
type ViewportKey = "desktop" | "tablet" | "mobile";
const VIEWPORTS: Record<ViewportKey, { label: string; width: number; icon: typeof Monitor }> = {
  desktop: { label: "Десктоп", width: 420, icon: Monitor },
  tablet: { label: "Планшет", width: 380, icon: Tablet },
  mobile: { label: "Мобилка", width: 340, icon: Smartphone },
};

// ── Static visual preview of Account Drawer ───────────────────────────────────
// Not a functional mount — pure presentational mirror of account-drawer.tsx
// for side-by-side palette/theme comparison.
function AccountDrawerPreview({ width }: { width: number }) {
  const menuItems = [
    { icon: ShoppingBag, label: "Мои заказы", hint: "3 активных" },
    { icon: MapPin, label: "Отслеживание", soon: true },
    { icon: Heart, label: "Избранное", hint: "7" },
    { icon: Bell, label: "Уведомления" },
    { icon: Gift, label: "Бонусная программа", soon: true },
    { icon: User, label: "Профиль" },
    { icon: ImageIcon, label: "Медиабиблиотека" },
    { icon: Clock, label: "История" },
  ];

  return (
    <div
      className="mx-auto rounded-2xl overflow-hidden"
      style={{
        width,
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center gap-2">
          <FlaskConical
            className="w-4 h-4"
            style={{ color: "hsl(var(--primary))" }}
          />
          <span className="text-sm font-semibold">Личный кабинет</span>
        </div>
        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          превью
        </span>
      </div>

      {/* Profile card */}
      <div className="p-5">
        <div
          className="arayglass arayglass-glow rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "hsl(var(--card) / 0.6)",
            border: "1px solid hsl(var(--primary) / 0.18)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(var(--primary) / 0.18)",
              boxShadow: "0 0 18px hsl(var(--primary) / 0.35)",
            }}
          >
            <User
              className="w-5 h-5"
              style={{ color: "hsl(var(--primary))" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">Арман Казарович</div>
            <div
              className="text-xs truncate"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              armankazarovich@gmail.com
            </div>
          </div>
          <span
            className="arayglass-badge text-[10px]"
            style={{
              color: "hsl(var(--primary))",
              borderColor: "hsl(var(--primary))",
            }}
          >
            Админ
          </span>
        </div>

        {/* ARAY banner */}
        <div
          className="mt-4 rounded-2xl p-4 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.16), hsl(var(--primary) / 0.04))",
            border: "1px solid hsl(var(--primary) / 0.3)",
            boxShadow: "0 0 24px hsl(var(--primary) / 0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <Sparkles
              className="w-5 h-5 shrink-0"
              style={{ color: "hsl(var(--primary))" }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Лаборатория ARAY</div>
              <div
                className="text-xs"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Открыть админ-панель
              </div>
            </div>
            <ArrowRight
              className="w-4 h-4"
              style={{ color: "hsl(var(--primary))" }}
            />
          </div>
        </div>

        {/* Menu */}
        <div className="mt-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                style={{
                  background: "hsl(var(--card) / 0.4)",
                  border: "1px solid hsl(var(--border) / 0.6)",
                  opacity: item.soon ? 0.6 : 1,
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: "hsl(var(--primary))" }}
                />
                <span className="text-sm flex-1">{item.label}</span>
                {item.soon ? (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: "hsl(var(--muted))",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    скоро
                  </span>
                ) : item.hint ? (
                  <span
                    className="text-[10px]"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {item.hint}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <button
          type="button"
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: "hsl(var(--card) / 0.5)",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}

// ── Single preview cell (palette × theme) ─────────────────────────────────────
function PreviewCell({
  palette,
  theme,
  viewport,
}: {
  palette: PaletteKey;
  theme: ThemeKey;
  viewport: ViewportKey;
}) {
  const vars = PALETTE_VARS[palette][theme];
  const width = VIEWPORTS[viewport].width;

  return (
    <div className="flex flex-col gap-2">
      {/* Cell label */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: `hsl(${vars["--primary"]})` }}
          />
          <span className="text-sm font-medium text-foreground">
            {PALETTE_LABELS[palette]}
          </span>
          <span className="text-xs text-muted-foreground">
            · {theme === "dark" ? "тёмная" : "светлая"}
          </span>
        </div>
      </div>

      {/* Scoped palette+theme container */}
      <div
        className={theme === "dark" ? "dark" : ""}
        data-palette={palette}
        style={vars as React.CSSProperties}
      >
        <div
          className="rounded-2xl p-4 overflow-hidden"
          style={{
            background: `hsl(${vars["--background"]})`,
            border: `1px solid hsl(${vars["--border"]})`,
          }}
        >
          <AccountDrawerPreview width={width} />
        </div>
      </div>
    </div>
  );
}

// ── Soon placeholder ──────────────────────────────────────────────────────────
function SoonPanel({ label }: { label: string }) {
  return (
    <div className="arayglass rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center min-h-[320px]">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: "hsl(var(--primary) / 0.1)",
          border: "1px solid hsl(var(--primary) / 0.2)",
        }}
      >
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="text-lg font-semibold text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground max-w-sm">
        Этот раздел лаборатории будет добавлен в следующей итерации — после
        того как ты одобришь превью попапов.
      </div>
      <span className="arayglass-badge text-[11px] text-primary border-primary mt-2">
        скоро
      </span>
    </div>
  );
}

// ── AG2 Showcase cell — kitchen-sink of new ARAYGLASS 2.0 components ─────────
function Ag2Cell({
  palette,
  theme,
  kind,
}: {
  palette: PaletteKey;
  theme: ThemeKey;
  kind: "buttons" | "cards" | "icons" | "effects";
}) {
  const vars = PALETTE_VARS[palette][theme];
  const cssVars = vars as React.CSSProperties;
  const themeClass = theme === "dark" ? "dark" : "";

  const Inner = () => {
    if (kind === "buttons") {
      return (
        <div className="space-y-3">
          <div className="ag2-eyebrow mb-2">Primary · бренд-подпись</div>
          <div className="flex flex-wrap gap-2">
            <button className="ag2-btn-primary">
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              В корзину
            </button>
            <button className="ag2-btn-primary" disabled>
              Неактивна
            </button>
          </div>
          <div className="ag2-eyebrow mt-4 mb-2">Ghost · secondary</div>
          <div className="flex flex-wrap gap-2">
            <button className="ag2-btn-ghost">Отмена</button>
            <button className="ag2-btn-ghost">
              <Heart className="w-4 h-4" strokeWidth={1.5} />
              В избранное
            </button>
          </div>
          <div className="ag2-eyebrow mt-4 mb-2">Destructive</div>
          <div className="flex flex-wrap gap-2">
            <button className="ag2-btn-destructive">Удалить</button>
          </div>
        </div>
      );
    }
    if (kind === "cards") {
      return (
        <div className="space-y-3">
          <div className="ag2-card p-4">
            <div className="ag2-eyebrow mb-2">Карточка базовая</div>
            <div className="text-sm">Стеклянная поверхность, тонкая граница primary/8, без always-on glow.</div>
          </div>
          <div className="ag2-card ag2-card-interactive p-4">
            <div className="ag2-eyebrow mb-2">Interactive (hover → lift)</div>
            <div className="text-sm">При наведении — мягкий shadow + translateY(-1px).</div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="ag2-badge">Primary</span>
            <span className="ag2-badge" data-tone="success">Success</span>
            <span className="ag2-badge" data-tone="warning">Warning</span>
            <span className="ag2-badge" data-tone="danger">Danger</span>
            <span className="ag2-badge" data-tone="muted">Muted</span>
          </div>
        </div>
      );
    }
    if (kind === "icons") {
      return (
        <div className="space-y-3">
          <div className="ag2-eyebrow mb-2">Inputs</div>
          <input className="ag2-input" placeholder="Напиши что-нибудь…" />
          <input className="ag2-input" defaultValue="С фокусом" />
          <input className="ag2-input" disabled placeholder="Disabled" />
          <div className="ag2-eyebrow mt-4 mb-2">Menu items</div>
          <div className="space-y-1">
            <div className="ag2-menu-item">
              <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
              <span>Заказы</span>
              <span className="ag2-badge ml-auto" data-tone="success">3</span>
            </div>
            <div className="ag2-menu-item" data-active="true">
              <Bell className="w-4 h-4" strokeWidth={1.5} />
              <span>Уведомления · активно</span>
            </div>
            <div className="ag2-menu-item">
              <Heart className="w-4 h-4" strokeWidth={1.5} />
              <span>Избранное</span>
            </div>
          </div>
        </div>
      );
    }
    // effects
    return (
      <div className="space-y-4">
        <div className="ag2-eyebrow mb-2">Divider + eyebrow typography</div>
        <div className="ag2-eyebrow">Раздел</div>
        <div className="ag2-divider" />
        <div className="text-sm text-muted-foreground">Тонкая линия, primary/8 opacity — шёпот, не стена.</div>
        <div className="ag2-eyebrow mt-4 mb-2">Focus ring (Tab в инпуте)</div>
        <input className="ag2-input" placeholder="Tab сюда → увидишь ring" />
        <div className="ag2-eyebrow mt-4 mb-2">Shadow hierarchy</div>
        <div className="ag2-card p-3 text-xs text-muted-foreground" style={{ boxShadow: "var(--ag2-shadow-sm)" }}>
          Shadow SM — карточка overlay
        </div>
        <div className="ag2-card p-3 text-xs text-muted-foreground" style={{ boxShadow: "var(--ag2-shadow-md)" }}>
          Shadow MD — секция attention
        </div>
        <div className="ag2-card p-3 text-xs text-muted-foreground" style={{ boxShadow: "var(--ag2-shadow-lg)" }}>
          Shadow LG — модалка
        </div>
      </div>
    );
  };

  return (
    <div
      className={`${themeClass} rounded-2xl overflow-hidden border`}
      style={{
        ...cssVars,
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between text-xs"
        style={{ borderBottom: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "hsl(var(--primary))" }}
          />
          <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
            {PALETTE_LABELS[palette]}
          </span>
          <span>·</span>
          <span>{theme === "dark" ? "тёмная" : "светлая"}</span>
        </div>
      </div>
      <div className="p-5">
        <Inner />
      </div>
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────
export function ArayLabClient() {
  const [activeTab, setActiveTab] = useState<TabId>("popups");
  const [viewport, setViewport] = useState<ViewportKey>("desktop");

  const palettes: PaletteKey[] = useMemo(() => ["timber", "ocean", "crimson"], []);
  const themes: ThemeKey[] = useMemo(() => ["dark", "light"], []);

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                border: "1px solid hsl(var(--primary) / 0.25)",
              }}
            >
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold">ARAY Design Lab</h1>
            <span className="arayglass-badge text-[10px] text-primary border-primary">
              POC
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            Предпросмотр всех элементов ARAYGLASS во всех палитрах и темах до
            деплоя. Одобряешь здесь — пушим на прод.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isActive
                  ? "hsl(var(--primary) / 0.15)"
                  : "hsl(var(--card) / 0.5)",
                border: isActive
                  ? "1px solid hsl(var(--primary) / 0.5)"
                  : "1px solid hsl(var(--border))",
                color: isActive
                  ? "hsl(var(--primary))"
                  : "hsl(var(--foreground))",
                boxShadow: isActive
                  ? "0 0 16px hsl(var(--primary) / 0.2)"
                  : "none",
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {!tab.ready && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  скоро
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Viewport toggle (only on ready tabs) */}
      {currentTab.ready && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Вьюпорт:
          </span>
          <div className="flex items-center gap-1.5">
            {(Object.keys(VIEWPORTS) as ViewportKey[]).map((key) => {
              const vp = VIEWPORTS[key];
              const Icon = vp.icon;
              const isActive = viewport === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewport(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: isActive
                      ? "hsl(var(--primary) / 0.15)"
                      : "transparent",
                    border: isActive
                      ? "1px solid hsl(var(--primary) / 0.4)"
                      : "1px solid hsl(var(--border))",
                    color: isActive
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {vp.label}
                  <span className="opacity-60">{vp.width}px</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "popups" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Component className="w-4 h-4" />
            <span>
              Account Drawer · {palettes.length} палитры × {themes.length} темы
              = {palettes.length * themes.length} превью
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {palettes.map((palette) =>
              themes.map((theme) => (
                <PreviewCell
                  key={`${palette}-${theme}`}
                  palette={palette}
                  theme={theme}
                  viewport={viewport}
                />
              ))
            )}
          </div>
        </div>
      )}

      {(activeTab === "buttons" ||
        activeTab === "cards" ||
        activeTab === "icons" ||
        activeTab === "effects") && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>
              ARAYGLASS 2.0 · {currentTab.label} · {palettes.length} палитры ×{" "}
              {themes.length} темы
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {palettes.map((palette) =>
              themes.map((theme) => (
                <Ag2Cell
                  key={`${palette}-${theme}-${activeTab}`}
                  palette={palette}
                  theme={theme}
                  kind={activeTab as "buttons" | "cards" | "icons" | "effects"}
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "palettes" && <SoonPanel label={currentTab.label} />}
    </>
  );
}
