"use client";

/**
 * ArayDock — restored calm glass bottom chat bar.
 *
 * This is the old PiloRus ARAY entry surface: orb on the left, one textarea,
 * mic/send on the right. Store/cabinet/admin keep it desktop-only; mobile admin
 * opens ARAY through the existing bottom-nav orb.
 */

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Mic, Send, Square } from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";
import { requestArayOpen, requestArayPrompt } from "@/components/store/aray-events";

interface ArayDockProps {
  enabled?: boolean;
}

type SpeechWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export function ArayDock({ enabled = true }: ArayDockProps) {
  const pathname = usePathname();
  const isAdminWorkspace = pathname?.startsWith("/admin");
  const isTerminalWorkspace = pathname?.startsWith("/admin/orders/new");
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => {
      setCookieVisible(document.body.dataset.storeCookieVisible === "true");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-store-cookie-visible"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(120, Math.max(40, ta.scrollHeight))}px`;
  }, [input]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    haptic(10);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    requestArayPrompt(text);
  }, [input]);

  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      requestArayOpen("voice");
      haptic([10, 30, 10]);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      let finalText = "";
      recognitionRef.current = recognition;
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0]?.transcript || "";
          else interimText += result[0]?.transcript || "";
        }
        setInput(`${finalText} ${interimText}`.replace(/\s+/g, " ").trim());
      };
      recognition.onerror = () => {
        recognitionRef.current = null;
        setRecording(false);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setRecording(false);
      };
      recognition.start();
      setRecording(true);
      haptic(8);
    } catch {
      recognitionRef.current = null;
      setRecording(false);
      requestArayOpen("voice");
    }
  }, []);

  const onOrbPointerDown = () => {
    longPressTriggered.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      haptic([12, 40, 12]);
      requestArayOpen("voice");
    }, 400);
  };

  const onOrbPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onOrbClick = () => {
    if (longPressTriggered.current) return;
    haptic(8);
    requestArayOpen("open");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    try { recognitionRef.current?.stop?.(); } catch {}
  }, []);

  if (!enabled || !mounted) return null;
  if (!isAdminWorkspace && cookieVisible) return null;

  const hasText = input.trim().length > 0;

  if (isTerminalWorkspace) {
    return (
      <div
        className="fixed z-[55] hidden pointer-events-none lg:block"
        style={{
          left: "calc(0.75rem + 3.75rem + 0.75rem)",
          bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        }}
        aria-label="ARAY"
      >
        <button
          type="button"
          onClick={onOrbClick}
          onPointerDown={onOrbPointerDown}
          onPointerUp={onOrbPointerUp}
          onPointerCancel={onOrbPointerUp}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96]"
          aria-label="ARAY - открыть чат"
          title="ARAY"
          style={{
            background: "hsl(var(--background) / 0.86)",
            borderColor: "hsl(var(--primary) / 0.20)",
            boxShadow: "0 10px 28px hsl(var(--foreground) / 0.08), 0 0 0 1px hsl(var(--primary) / 0.06) inset",
            backdropFilter: "blur(18px) saturate(150%)",
            WebkitBackdropFilter: "blur(18px) saturate(150%)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <ArayOrb size={34} pulse={recording ? "listening" : "idle"} />
        </button>
      </div>
    );
  }

  const rootStyle = {
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    "--aray-dock-bottom": "0px",
  } as CSSProperties;

  return (
    <div
      className="aray-dock-root fixed left-0 right-0 z-[55] hidden pointer-events-none lg:block"
      style={rootStyle}
      aria-label="ARAY — единый чат"
    >
      <div
        className="pointer-events-auto mx-auto w-full px-3 pb-2 pt-2 lg:pb-4"
        style={{ maxWidth: isAdminWorkspace ? "min(820px, calc(100vw - 24px))" : "min(980px, calc(100vw - 32px))" }}
      >
        <div
          className={`aray-dock-glass relative flex items-end gap-2 overflow-hidden rounded-[22px] border p-2 ${
            isAdminWorkspace ? "admin-liquid-interactive" : ""
          }`}
          style={{
            background: "hsl(var(--background) / 0.94)",
            borderColor: "hsl(var(--primary) / 0.15)",
            boxShadow:
              "0 -6px 22px hsl(var(--foreground) / 0.055), 0 0 0 1px hsl(var(--primary) / 0.045) inset",
            backdropFilter: "blur(22px) saturate(165%)",
            WebkitBackdropFilter: "blur(22px) saturate(165%)",
          }}
        >
          <div className="aray-dock-line pointer-events-none absolute inset-x-5 top-0 h-px" />
          <button
            type="button"
            onClick={onOrbClick}
            onPointerDown={onOrbPointerDown}
            onPointerUp={onOrbPointerUp}
            onPointerCancel={onOrbPointerUp}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.05] active:scale-[0.95]"
            aria-label="ARAY — открыть чат"
            title="Коснись — открыть чат. Удерживай — голос."
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ArayOrb size={36} pulse={recording ? "listening" : "idle"} />
          </button>

          <div className="flex min-w-0 flex-1 items-center">
            <textarea
              ref={taRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={recording ? "Слушаю..." : "Напишите Араю..."}
              className="w-full resize-none bg-transparent px-1 py-2.5 text-[16px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/60"
              style={{
                fontSize: "16px",
                maxHeight: "120px",
                minHeight: "40px",
              }}
              aria-label="Сообщение Араю"
            />
          </div>

          {hasText && !recording ? (
            <button
              type="button"
              onClick={handleSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95"
              aria-label="Отправить"
              title="Отправить"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                boxShadow: "0 0 10px hsl(var(--primary) / 0.22)",
              }}
            >
              <Send className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          ) : recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95"
              aria-label="Остановить запись"
              title="Остановить"
              style={{
                background: "hsl(var(--destructive) / 0.12)",
                border: "1px solid hsl(var(--destructive) / 0.35)",
                color: "hsl(var(--destructive))",
                animation: "arayDockPulse 1.4s ease-in-out infinite",
              }}
            >
              <Square className="h-[14px] w-[14px] fill-current" strokeWidth={0} />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:text-primary active:scale-95"
              aria-label={speechSupported ? "Голосовой ввод" : "Голосовой режим ARAY"}
              title="Голос"
            >
              <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .aray-dock-root {
          bottom: var(--aray-dock-bottom);
        }

        @media (min-width: 1024px) {
          .aray-dock-root {
            bottom: 0;
          }
        }

        @keyframes arayDockPulse {
          0%, 100% { box-shadow: 0 0 12px hsl(var(--destructive) / 0.35); }
          50% { box-shadow: 0 0 24px hsl(var(--destructive) / 0.7); }
        }

        .aray-dock-line {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.2) 26%,
            hsl(var(--primary) / 0.45) 50%,
            hsl(var(--primary) / 0.2) 74%,
            transparent 100%
          );
        }
      `}</style>
    </div>
  );
}
