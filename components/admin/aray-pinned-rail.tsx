"use client";

/**
 * ArayPinnedRail — закреплённая панель Арая справа от контента.
 *
 * Сессия 40 (28.04.2026 вечер): по фидбеку Армана — убран toggle левша/правша
 * и кнопка свернуть. Арай всегда справа, всегда видим. Минимализм.
 *
 * Архитектура:
 * - На ≥1024px (lg) панель всегда развёрнута, fixed справа.
 * - На <1024px не показывается (мобильный режим = orb в bottom-nav).
 * - Quick Actions контекстные per-page (передаются через props).
 * - Чат-зона: реальный inline-инпут + voice-кнопка push-to-talk + переключатель клавиатуры.
 * - Кнопка-микрофон диспатчит aray:voice (откроется VoiceModeOverlay).
 * - Кнопка-клавиатура переключает режим input ↔ voice-only.
 * - Send-кнопка диспатчит aray:prompt с текстом → откроется ChatHost.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Mic, Send, Keyboard, MessageSquare,
} from "lucide-react";

const LS_INPUT_MODE = "aray.pinned.inputMode";

export type ArayQuickAction = {
  href?: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  external?: boolean;
};

type Props = {
  /** Идентификатор текущего раздела (для подписи Quick Actions). */
  page: string;
  /** Человекочитаемое имя контекста — например "Дашборд", "Заказы". */
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
  const [text, setText] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Init: подгрузить режим из localStorage (для ТВ/кассы — может быть только voice)
  useEffect(() => {
    setMounted(true);
    try {
      const m = localStorage.getItem(LS_INPUT_MODE);
      if (m === "voice") setShowKeyboard(false);
    } catch {/* ignore */}
  }, []);

  function persistMode(next: boolean) {
    try { localStorage.setItem(LS_INPUT_MODE, next ? "keyboard" : "voice"); } catch {/* ignore */}
  }

  function toggleKeyboard() {
    setShowKeyboard((p) => {
      const n = !p;
      persistMode(n);
      return n;
    });
  }

  function openChat() {
    window.dispatchEvent(new CustomEvent("aray:open"));
  }

  function openVoice() {
    window.dispatchEvent(new CustomEvent("aray:voice"));
  }

  function sendText() {
    const t = text.trim();
    if (!t) return;
    // Открываем глобальный ChatHost и сразу шлём промпт
    window.dispatchEvent(new CustomEvent("aray:open"));
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("aray:prompt", {
          detail: { text: t, source: "pinned-rail", page, context: contextLabel },
        })
      );
    }, 50);
    setText("");
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  return (
    <aside
      className="hidden lg:flex flex-col w-72 xl:w-[24rem] 2xl:w-[28rem] h-full rounded-l-3xl border-l border-y border-border bg-card text-foreground overflow-hidden shadow-[0_8px_40px_hsl(var(--foreground)/0.06)]"
      aria-label="Арай"
    >
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0 bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="relative shrink-0">
          <img
            src="/images/aray/face-mob.png"
            alt="Арай"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"
            aria-label="Онлайн"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-sm text-foreground leading-tight truncate">
            Арай
          </p>
          {contextLabel && (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
              {contextLabel}
            </p>
          )}
        </div>
      </div>

      {/* ── Quick Actions (контекстные per-page) ────── */}
      {quickActions.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1 font-semibold">
            Быстрые действия
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.slice(0, 4).map((qa, i) => {
              const Icon = qa.icon;
              const cls =
                "group flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-border bg-muted/30 hover:bg-primary/[0.06] hover:border-primary/30 active:scale-[0.97] transition-all text-left";
              const inner = (
                <>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight text-foreground">
                    {qa.label}
                  </span>
                </>
              );
              if (qa.href) {
                if (qa.external) {
                  return (
                    <a key={i} href={qa.href} target="_blank" rel="noopener noreferrer" className={cls}>
                      {inner}
                    </a>
                  );
                }
                return (
                  <Link key={i} href={qa.href} className={cls}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button key={i} onClick={qa.onClick} className={cls} type="button">
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Чат-зона: открыть полный чат ──────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <button
          onClick={openChat}
          type="button"
          className="w-full flex items-start gap-3 p-4 rounded-2xl bg-muted/40 border border-border hover:bg-primary/[0.04] hover:border-primary/25 transition-all text-left active:scale-[0.99]"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground leading-tight">
              Привет, брат. Я тут.
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-1">
              Тыкни сюда — открою полный чат с историей.
            </p>
          </div>
        </button>
      </div>

      {/* ── Инпут-зона: либо клавиатура, либо только голос ── */}
      <div className="border-t border-border shrink-0 bg-gradient-to-t from-primary/[0.03] to-transparent">
        {showKeyboard ? (
          // ── РЕЖИМ КЛАВИАТУРЫ ──
          <div className="p-3">
            <div
              className={`flex items-end gap-2 p-2 rounded-2xl border bg-background transition-colors ${
                text ? "border-primary/40" : "border-border"
              }`}
            >
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={inputHint}
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm placeholder:text-muted-foreground py-1.5 px-2 leading-snug max-h-32"
                style={{ fontSize: 14 }}
                aria-label="Сообщение Араю"
              />
              {text.trim() ? (
                <button
                  onClick={sendText}
                  type="button"
                  aria-label="Отправить"
                  title="Отправить (Enter)"
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-[0.95] transition-all shrink-0"
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                </button>
              ) : (
                <button
                  onClick={openVoice}
                  type="button"
                  aria-label="Голосовой режим"
                  title="Голосовой режим"
                  className="w-9 h-9 rounded-xl bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors shrink-0"
                >
                  <Mic className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2 px-1">
              <button
                onClick={toggleKeyboard}
                type="button"
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Скрыть клавиатуру"
                title="Голосовой режим (без клавиатуры)"
              >
                <Mic className="w-3 h-3" strokeWidth={2} />
                <span>Голосом</span>
              </button>
              <p className="text-[10px] text-muted-foreground/70">
                Enter — отправить
              </p>
            </div>
          </div>
        ) : (
          // ── РЕЖИМ ТОЛЬКО ГОЛОС (для ТВ / кассы / планшета) ──
          <div className="p-4">
            <button
              onClick={openVoice}
              type="button"
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all font-medium text-sm shadow-[0_4px_20px_hsl(var(--primary)/0.25)]"
              aria-label="Говори с Араем"
              title="Говори с Араем"
            >
              <Mic className="w-5 h-5" strokeWidth={2} />
              <span>Говори с Араем</span>
            </button>
            <button
              onClick={toggleKeyboard}
              type="button"
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Показать клавиатуру"
            >
              <Keyboard className="w-3 h-3" strokeWidth={2} />
              <span>Печатать</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
