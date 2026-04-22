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
import { Mic, Send, Square } from "lucide-react";
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
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [mounted, setMounted] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => setMounted(true), []);

  // Detect Web Speech support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

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

  // ── Голосовой ввод в инпут (локальный, без отправки) ──────────────────────
  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // Fallback: открыть Арая в voice-режиме (он сам управляет mic)
      window.dispatchEvent(new CustomEvent("aray:voice"));
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "ru-RU";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let finalText = "";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        setInput(finalText + interim);
      };
      rec.onerror = () => { setRecording(false); recognitionRef.current = null; };
      rec.onend = () => { setRecording(false); recognitionRef.current = null; };

      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
      haptic(8);
    } catch {
      // Fallback на виджет
      window.dispatchEvent(new CustomEvent("aray:voice"));
    }
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
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  if (!enabled || !mounted) return null;

  const hasText = input.trim().length > 0;
  const showSend = hasText && !recording;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Арай — чат-бар"
    >
      <div className="pointer-events-auto mx-auto px-3 pb-2 pt-2 max-w-3xl">
        <div
          className="arayglass arayglass-nopad flex items-end gap-2 p-2 border rounded-[22px]"
          style={{
            borderColor: "hsl(var(--border))",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
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
              placeholder={recording ? "Слушаю..." : "Напишите Араю..."}
              className="w-full resize-none bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 leading-5 py-2.5 px-1"
              style={{
                fontSize: "16px", // anti-iOS-zoom
                maxHeight: "120px",
                minHeight: "40px",
              }}
              aria-label="Сообщение Араю"
            />
          </div>

          {/* ── Правая часть: mic / send (свечение только при send и recording — смысловые акценты) ── */}
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
          ) : recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              aria-label="Остановить запись"
              title="Остановить"
              style={{
                background: "hsl(var(--destructive) / 0.12)",
                color: "hsl(var(--destructive))",
                border: "1px solid hsl(var(--destructive) / 0.35)",
                animation: "arayDockPulse 1.4s ease-in-out infinite",
              }}
            >
              <Square className="w-[14px] h-[14px] fill-current" strokeWidth={0} />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-foreground/70 hover:text-primary transition-colors"
              aria-label={speechSupported ? "Голосовой ввод" : "Голосовой режим Арая"}
              title="Голос"
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
