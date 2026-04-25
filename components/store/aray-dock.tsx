"use client";

/**
 * ArayDock — Telegram-style чат-бар с Араем.
 * Единый на мобилке и десктопе: слева лицо Арая, центр — textarea, справа — микрофон/отправить.
 *
 * События:
 * - tap орб       → "aray:open"   (открывает фулскрин чат-панель из aray-widget.tsx)
 * - long-press орб → "aray:voice"  (push-to-talk)
 * - send text     → "aray:prompt" (detail.text → widget.sendMessage)
 * - mic button    → локальная диктовка через webkitSpeechRecognition → заполняет input
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Send } from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";

interface ArayDockProps {
  enabled?: boolean;
}

function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export function ArayDock({ enabled = true }: ArayDockProps) {
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => setMounted(true), []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const h = Math.min(120, Math.max(40, ta.scrollHeight));
    ta.style.height = h + "px";
  }, [input]);

  // ── Отправка текста в Арая ─────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    haptic(10);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: { text } }));
  }, [input]);

  // ── Голосовой режим — открываем VoiceModeOverlay (fullscreen) ───────────────
  // Раньше mic-кнопка делала локальный Web Speech Recognition в textarea — это было
  // криво (mic не освобождался, конфликт с VoiceModeOverlay). Теперь mic = открыть Voice Mode.
  const openVoiceMode = useCallback(() => {
    haptic(8);
    window.dispatchEvent(new CustomEvent("aray:voice"));
  }, []);

  // ── Тап и long-press по орбу ──────────────────────────────────────────────
  const onOrbPointerDown = () => {
    longPressTriggered.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      haptic([12, 40, 12]);
      window.dispatchEvent(new CustomEvent("aray:voice"));
    }, 400);
  };
  const onOrbPointerUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const onOrbClick = () => {
    if (longPressTriggered.current) return;
    haptic(8);
    window.dispatchEvent(new CustomEvent("aray:open"));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup
  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  if (!enabled || !mounted) return null;

  const hasText = input.trim().length > 0;
  const showSend = hasText;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] pointer-events-none hidden lg:block"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Арай — чат-бар"
    >
      <div className="pointer-events-auto mx-auto px-3 pb-3 pt-2 max-w-3xl">
        <div
          className="flex items-end gap-2 p-2 rounded-[22px]"
          style={{
            // Liquid Glass — единый стиль с Header магазина
            background: "hsl(var(--background) / 0.85)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid hsl(var(--primary) / 0.15)",
            boxShadow:
              "0 8px 32px hsl(var(--foreground) / 0.08), 0 1px 0 hsl(var(--primary) / 0.1) inset",
          }}
        >
          {/* ── Левая часть: лицо Арая (без idle свечения — минимализм) ── */}
          <button
            type="button"
            onClick={onOrbClick}
            onPointerDown={onOrbPointerDown}
            onPointerUp={onOrbPointerUp}
            onPointerCancel={onOrbPointerUp}
            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-transform duration-150 hover:scale-[1.05] active:scale-[0.95]"
            aria-label="Арай — коснись чтобы открыть, удерживай для голоса"
            title="Коснись — открыть чат. Удерживай — голос."
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ArayOrb size={36} pulse="idle" />
          </button>

          {/* ── Центр: textarea ── */}
          <div className="flex-1 min-w-0 flex items-center">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Напишите Араю..."
              className="w-full resize-none bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 leading-5 py-2.5 px-1"
              style={{
                fontSize: "16px", // anti-iOS-zoom
                maxHeight: "120px",
                minHeight: "40px",
              }}
              aria-label="Сообщение Араю"
            />
          </div>

          {/* ── Правая часть: mic / send ── */}
          {showSend ? (
            <button
              type="button"
              onClick={handleSend}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              aria-label="Отправить"
              title="Отправить"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                boxShadow: "0 0 14px hsl(var(--primary) / 0.45)",
              }}
            >
              <Send className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={openVoiceMode}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-foreground/70 hover:text-primary transition-colors active:scale-95"
              aria-label="Голосовой режим Арая"
              title="Голосовой режим (fullscreen)"
            >
              <Mic className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes arayDockPulse {
          0%, 100% { box-shadow: 0 0 12px hsl(var(--destructive) / 0.35); }
          50%      { box-shadow: 0 0 24px hsl(var(--destructive) / 0.7); }
        }
      `}</style>
    </div>
  );
}
