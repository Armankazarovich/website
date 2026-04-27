"use client";

/**
 * ArayPinnedRail — закреплённая панель Арая справа от контента.
 *
 * Архитектура (видение Армана из visions/aray-pinned-rail.md):
 * - На ≥1280px (xl) развёрнут, занимает ~треть ширины main-области (контент резиновый слева).
 * - На 1024-1279px (lg) — свёрнут в полоску 56px, разворачивается по клику.
 * - На <1024px не показывается (мобильный режим = orb в bottom-nav).
 * - localStorage `aray.pinned.expanded` запоминает свёрнут/развёрнут.
 * - CSS-variables `--aray-side` (right|left) и `--popup-side` (left|right) — заглушка под переключатель левша/правша.
 *
 * День 2 (27.04.2026): прототип, заглушка чата + слот Quick Actions сверху + кнопка "Напиши Араю..." снизу
 * которая диспатчит aray:open для существующего ChatHost. Полная интеграция чата в pinned-rail —
 * на следующей сессии после визуальной проверки.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Sparkles, Mic, MessageSquare } from "lucide-react";

const LS_EXPANDED = "aray.pinned.expanded";
const LS_HANDEDNESS = "aray.handedness";

export type ArayQuickAction = {
  href?: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  external?: boolean;
};

type Props = {
  /** Идентификатор текущего раздела (передаётся в подпись Quick Actions). */
  page: string;
  /** Человекочитаемое имя контекста — например "Дом Арая", "Заказы". */
  contextLabel?: string;
  /** До 4 контекстных кнопок для текущего раздела. */
  quickActions?: ArayQuickAction[];
  /** Подсказка снизу под чат-инпутом. */
  inputHint?: string;
};

export function ArayPinnedRail({
  page,
  contextLabel,
  quickActions = [],
  inputHint = "Спроси Арая или дай команду",
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [hand, setHand] = useState<"right" | "left">("right");
  const [mounted, setMounted] = useState(false);

  // Init from localStorage
  useEffect(() => {
    setMounted(true);
    const e = localStorage.getItem(LS_EXPANDED);
    if (e !== null) setExpanded(e === "1");
    const h = localStorage.getItem(LS_HANDEDNESS) as "right" | "left" | null;
    if (h === "left") setHand("left");
  }, []);

  // Sync CSS vars (заглушка под переключатель левша/правша)
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty("--aray-side", hand);
    document.documentElement.style.setProperty(
      "--popup-side",
      hand === "right" ? "left" : "right"
    );
  }, [hand, mounted]);

  // Listen to external toggle (header кнопка может попросить свернуть)
  useEffect(() => {
    const handler = () => {
      setExpanded((prev) => {
        const next = !prev;
        localStorage.setItem(LS_EXPANDED, next ? "1" : "0");
        return next;
      });
    };
    window.addEventListener("aray:rail:toggle", handler);
    return () => window.removeEventListener("aray:rail:toggle", handler);
  }, []);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(LS_EXPANDED, next ? "1" : "0");
      return next;
    });
  };

  const openChat = () => {
    window.dispatchEvent(new CustomEvent("aray:open"));
  };

  // Свёрнутая полоска
  if (!expanded) {
    return (
      <aside
        className="hidden lg:flex flex-col items-center gap-2 sticky top-4 self-start w-14 py-3 rounded-2xl border border-border bg-card text-foreground"
        aria-label="Арай (свёрнут)"
      >
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-primary transition-colors"
          aria-label="Развернуть Арая"
          title="Развернуть Арая"
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button
          onClick={openChat}
          className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Открыть чат"
          title="Открыть чат"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("aray:voice"))}
          className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Голосовой режим"
          title="Голосовой режим"
        >
          <Mic className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // Развёрнутая панель
  return (
    <aside
      className="hidden lg:flex flex-col sticky top-4 self-start h-[calc(100vh-2rem)] w-72 xl:w-[24rem] 2xl:w-[28rem] rounded-2xl border border-border bg-card text-foreground overflow-hidden"
      aria-label="Арай"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Арай</p>
            {contextLabel && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                {contextLabel}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Свернуть Арая"
          title="Свернуть"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="p-3 border-b border-border shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Быстрые действия
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((qa, i) => {
              const Icon = qa.icon;
              const cls =
                "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/30 transition-colors text-left active:bg-primary/10";
              if (qa.href) {
                if (qa.external) {
                  return (
                    <a
                      key={i}
                      href={qa.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-[11px] font-medium text-center leading-tight text-foreground">
                        {qa.label}
                      </span>
                    </a>
                  );
                }
                return (
                  <Link key={i} href={qa.href} className={cls}>
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-medium text-center leading-tight text-foreground">
                      {qa.label}
                    </span>
                  </Link>
                );
              }
              return (
                <button key={i} onClick={qa.onClick} className={cls} type="button">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-medium text-center leading-tight text-foreground">
                    {qa.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Чат-зона (заглушка) */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <div className="bg-muted/40 border border-border rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">
              Привет, брат. Я Арай — твой технический партнёр.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Сейчас живу в чат-доке внизу справа (короткий tap по кнопке снизу
              откроет его). На ближайших сессиях переедем сюда —
              разговор, голос, контекст раздела, всё в одном месте.
            </p>
          </div>

          <div className="text-[11px] text-muted-foreground/80 leading-relaxed px-1">
            Контекст: <span className="text-foreground font-medium">{page}</span>
            {contextLabel && <> · {contextLabel}</>}
          </div>
        </div>
      </div>

      {/* Чат-инпут (заглушка — открывает существующий ChatHost) */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          onClick={openChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border hover:border-primary/40 hover:bg-muted/60 transition-colors text-left"
          type="button"
        >
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm text-muted-foreground flex-1 truncate">
            {inputHint}
          </span>
          <Mic className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    </aside>
  );
}
