"use client";

/**
 * VoiceModeOverlay — fullscreen voice conversation mode (как ChatGPT Voice).
 *
 * Открывается по событию `aray:voice`. Использует Web Speech Recognition (STT)
 * для распознавания речи и /api/ai/tts (ElevenLabs) для голосового ответа.
 *
 * UX:
 *  - Большой пульсирующий орб в центре
 *  - Wave-анимация во время говорения пользователя
 *  - Subtitle с тем что Арай слышит (interim transcript)
 *  - 3 кнопки внизу: ⏸ Пауза / ✓ Отправить / ⌨ В чат
 *  - Escape или X → закрыть
 *  - Арай отвечает голосом + субтитрами
 *  - История сохраняется через события `aray:prompt` и `aray:reply`
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Keyboard, X, Loader2, RotateCw, AlertCircle, Zap, ZapOff } from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";
import { useAccountDrawer } from "@/store/account-drawer";
import { stopAraySpeech } from "@/lib/aray-audio";

type VoiceState =
  | "idle"        // только что открылся
  | "listening"   // пользователь говорит, идёт распознавание
  | "thinking"    // отправили в Арая, ждём ответ
  | "speaking"    // Арай отвечает голосом
  | "paused";     // микрофон на паузе

function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export function VoiceModeOverlay() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [final, setFinal] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const { open: drawerOpen } = useAccountDrawer();

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const finalAccumRef = useRef("");
  // VAD: автоотправка после 1.5 сек тишины
  const vadTimerRef = useRef<number | null>(null);
  const lastSpeechAtRef = useRef<number>(0);
  const sendToArayRef = useRef<(() => void) | null>(null);
  const [autoSend, setAutoSend] = useState(true);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [toast, setToast] = useState<string | null>(null);

  // ── Permission API: проверяем статус микрофона ──
  useEffect(() => {
    if (!open) return;
    if (typeof navigator === "undefined" || !navigator.permissions) {
      setMicPermission("unknown");
      return;
    }
    let cancelled = false;
    navigator.permissions.query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        setMicPermission(status.state as any);
        status.onchange = () => setMicPermission(status.state as any);
      })
      .catch(() => setMicPermission("unknown"));
    return () => { cancelled = true; };
  }, [open]);

  // ── Auto-dismiss тост через 3 сек ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Открытие overlay по event `aray:voice` ──
  useEffect(() => {
    const onVoice = () => {
      if (drawerOpen) return; // не открываемся если drawer открыт
      haptic([12, 40, 12]);
      setOpen(true);
      setState("idle");
      setInterim("");
      setFinal("");
      setReply("");
      setError("");
      finalAccumRef.current = "";
    };
    window.addEventListener("aray:voice", onVoice);
    return () => window.removeEventListener("aray:voice", onVoice);
  }, [drawerOpen]);

  // ── Закрытие на Escape ──
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeOverlay(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Аудио визуализация (wave анимация) ──
  const startAudioLevelMonitor = useCallback(async () => {
    try {
      if (!audioStreamRef.current) {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      if (!analyserRef.current) {
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const source = audioCtxRef.current.createMediaStreamSource(audioStreamRef.current);
        source.connect(analyserRef.current);
      }
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length / 255;
        setAudioLevel(avg);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      // mic permission denied или нет поддержки
    }
  }, []);

  const stopAudioLevelMonitor = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setAudioLevel(0);
  }, []);

  // ── Speech Recognition ──
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Голосовой ввод не поддерживается браузером");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "ru-RU";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (e: any) => {
        let finalText = finalAccumRef.current;
        let interimText = "";
        let hasNewSpeech = false;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            finalText += r[0].transcript;
            hasNewSpeech = true;
          } else {
            interimText += r[0].transcript;
            hasNewSpeech = true;
          }
        }
        finalAccumRef.current = finalText;
        setFinal(finalText);
        setInterim(interimText);

        // VAD: пользователь говорит → сбрасываем таймер тишины
        if (hasNewSpeech) {
          lastSpeechAtRef.current = Date.now();
          if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
          // Если есть готовый final текст — ждём 1500мс тишины и автоотправляем
          if (autoSend && finalText.trim().length > 2) {
            vadTimerRef.current = window.setTimeout(() => {
              const now = Date.now();
              if (now - lastSpeechAtRef.current >= 1400) {
                sendToArayRef.current?.();
              }
            }, 1500);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn("[VoiceMode] SR error:", e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("Дай доступ к микрофону");
          setState("paused");
        }
      };

      rec.onend = () => {
        // если мы ещё в listening — перезапустимся (continuous иногда обрывается)
        if (state === "listening") {
          try { rec.start(); } catch {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setState("listening");
      startAudioLevelMonitor();
      haptic(8);
    } catch (e) {
      setError("Не удалось включить микрофон");
    }
  }, [state, startAudioLevelMonitor]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    stopAudioLevelMonitor();
  }, [stopAudioLevelMonitor]);

  // ── Запуск listening при открытии ──
  useEffect(() => {
    if (open && state === "idle") {
      startListening();
    }
  }, [open, state, startListening]);

  // ── Отправка в Арая + воспроизведение ответа голосом ──
  const sendToAray = useCallback(async () => {
    const text = (finalAccumRef.current + " " + interim).trim();
    if (!text) return;

    // Сбрасываем VAD таймер (если был)
    if (vadTimerRef.current) {
      clearTimeout(vadTimerRef.current);
      vadTimerRef.current = null;
    }

    stopListening();
    setState("thinking");
    setReply("");

    // Эмитим как сообщение пользователя в чат (для истории)
    try {
      window.dispatchEvent(new CustomEvent("aray:prompt", { detail: { text, mode: "voice" } }));
    } catch {}

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          context: { source: "voice-mode" },
        }),
      });

      if (!res.ok) throw new Error("Chat error " + res.status);
      if (!res.body) throw new Error("No response stream");

      // /api/ai/chat возвращает streaming raw text (не JSON).
      // Читаем stream через reader/decoder как в ArayWidget.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        // Live-update subtitle: показываем то что Арай говорит сейчас
        const live = rawText
          .replace(/\n__ARAY_META__[\s\S]*$/, "")
          .replace(/__ARAY_ERR__[\s\S]*$/, "")
          .replace(/__ARAY_ADD_CART:.+?__/g, "")
          .replace(/__ARAY_NAVIGATE:.+?__/g, "")
          .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
          .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "")
          .replace(/__ARAY_REFRESH__/g, "")
          .split("ARAY_ACTIONS:")[0]
          .trim();
        if (live) setReply(live);
      }

      // Финальная очистка
      const isError = rawText.includes("__ARAY_ERR__");
      const errMatch = rawText.match(/__ARAY_ERR__(.+)$/);
      const cleanReply: string = isError
        ? (errMatch?.[1] || "Не получилось. Попробуй ещё раз")
        : rawText
            .replace(/\n__ARAY_META__[\s\S]*$/, "")
            .replace(/__ARAY_ADD_CART:.+?__/g, "")
            .replace(/__ARAY_NAVIGATE:.+?__/g, "")
            .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
            .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "")
            .replace(/__ARAY_REFRESH__/g, "")
            .split("ARAY_ACTIONS:")[0]
            .trim();

      if (!cleanReply) throw new Error("Пустой ответ");
      setReply(cleanReply);

      // Эмитим ответ для истории
      try {
        window.dispatchEvent(new CustomEvent("aray:reply", { detail: { text: cleanReply, mode: "voice" } }));
      } catch {}

      // Озвучиваем
      setState("speaking");
      const ttsRes = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanReply }),
      });

      if (ttsRes.ok && ttsRes.headers.get("content-type")?.includes("audio")) {
        const buf = await ttsRes.arrayBuffer();
        // ⚠️ Через singleton — гарантия что играет только ОДИН Арай
        // (раньше при reopen overlay создавалось несколько Audio параллельно)
        stopAraySpeech();
        const blob = new Blob([buf], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          // После ответа Арая — снова слушаем
          if (open) {
            finalAccumRef.current = "";
            setFinal("");
            setInterim("");
            startListening();
          }
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (open) {
            finalAccumRef.current = "";
            setFinal("");
            setInterim("");
            startListening();
          }
        };
        await audio.play();
      } else {
        // Fallback на browser SpeechSynthesis
        const u = new SpeechSynthesisUtterance(cleanReply);
        u.lang = "ru-RU";
        u.onend = () => {
          if (open) {
            finalAccumRef.current = "";
            setFinal("");
            setInterim("");
            startListening();
          }
        };
        speechSynthesis.speak(u);
      }
    } catch (e: any) {
      // Мягкий тост вместо красного блока в UI
      setToast(e?.message?.includes("Network") ? "Связь пропала, повтори?" : "Минутку, попробую ещё раз");
      setState("paused");
      // Через 2 сек снова слушаем — пользователь не должен нажимать ничего
      setTimeout(() => {
        if (open) startListening();
      }, 2000);
    }
  }, [interim, open, startListening, stopListening]);

  // Связываем sendToArayRef с актуальной sendToAray (для VAD onresult)
  useEffect(() => {
    sendToArayRef.current = sendToAray;
  }, [sendToAray]);

  // ── Перебить Арая (если он говорит) ──
  const interruptAray = useCallback(() => {
    haptic(10);
    // ⚠️ Глобальный singleton — останавливает АБСОЛЮТНО все Audio + speechSynthesis
    stopAraySpeech();
    audioRef.current = null;
    if (open) {
      finalAccumRef.current = "";
      setFinal("");
      setInterim("");
      setReply("");
      startListening();
    }
  }, [open, startListening]);

  // ── Управление ──
  const closeOverlay = useCallback(() => {
    stopListening();
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
    // ⚠️ Глобальный singleton — гарантия что после закрытия НИЧЕГО не говорит
    stopAraySpeech();
    audioRef.current = null;
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setOpen(false);
    setState("idle");
  }, [stopListening]);

  // ── Сброс микрофона: останавливаем stream и заново запрашиваем ──
  const resetMicrophone = useCallback(async () => {
    haptic(10);
    stopListening();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    analyserRef.current = null;
    setToast("Перезапускаю микрофон...");
    setTimeout(() => startListening(), 500);
  }, [stopListening, startListening]);

  const togglePause = useCallback(() => {
    haptic(6);
    if (state === "listening") {
      stopListening();
      setState("paused");
    } else if (state === "paused") {
      startListening();
    }
  }, [state, startListening, stopListening]);

  const switchToChat = useCallback(() => {
    haptic(6);
    closeOverlay();
    // Открываем обычный чат
    try { window.dispatchEvent(new CustomEvent("aray:open")); } catch {}
  }, [closeOverlay]);

  // Cleanup на unmount — критично, иначе Арай продолжает говорить после ухода со страницы
  useEffect(() => () => {
    stopListening();
    stopAraySpeech();
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch {}
  }, [stopListening]);

  if (!open) return null;

  // Wave bar высоты (5-7 баров вокруг audioLevel)
  const waveHeights = Array.from({ length: 7 }, (_, i) => {
    const base = audioLevel * 100;
    const variance = Math.sin((Date.now() / 200) + i) * 15;
    return Math.max(8, Math.min(80, base + variance));
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[300] flex flex-col items-center justify-between p-6"
        style={{
          background: "linear-gradient(135deg, hsl(var(--background) / 0.97) 0%, hsl(var(--background) / 0.99) 100%)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Голосовой режим Арая"
      >
        {/* Top: статус микрофона + auto-send + close */}
        <div className="w-full flex items-center justify-between max-w-md">
          <div className="flex items-center gap-2">
            {/* Индикатор микрофона */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border text-[11px]"
              title={micPermission === "granted" ? "Микрофон активен" : micPermission === "denied" ? "Доступ к микрофону закрыт" : "Жду разрешения"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                state === "listening"
                  ? "bg-emerald-500 animate-pulse"
                  : state === "speaking"
                  ? "bg-primary animate-pulse"
                  : micPermission === "denied"
                  ? "bg-destructive"
                  : "bg-muted-foreground/40"
              }`} />
              <span className="text-muted-foreground font-medium">
                {state === "listening" ? "Слушаю" :
                 state === "speaking" ? "Говорю" :
                 state === "thinking" ? "Думаю" :
                 micPermission === "denied" ? "Нет доступа" :
                 "Готов"}
              </span>
            </div>
            {/* Авто-отправка toggle */}
            <button
              onClick={() => { setAutoSend(v => !v); haptic(6); setToast(autoSend ? "Авто-отправка выключена" : "Авто-отправка включена"); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] transition-colors ${
                autoSend
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
              title={autoSend ? "Арай отправит сам после 1.5с тишины" : "Отправлять только по нажатию"}
            >
              {autoSend ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
              <span className="font-medium">Авто</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={resetMicrophone}
              className="w-10 h-10 rounded-full border border-border hover:bg-muted/40 flex items-center justify-center transition-colors"
              aria-label="Сбросить микрофон"
              title="Перезапустить микрофон"
            >
              <RotateCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={closeOverlay}
              className="w-10 h-10 rounded-full border border-border hover:bg-muted/40 flex items-center justify-center transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Тост сверху — мягкое уведомление */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg z-10"
              style={{ boxShadow: "0 4px 24px hsl(var(--foreground) / 0.08)" }}
            >
              <AlertCircle className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[13px] font-medium text-foreground">{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: orb + state */}
        <div className="flex flex-col items-center gap-6 flex-1 justify-center">
          {/* Орб */}
          <motion.div
            animate={{
              scale: state === "listening"
                ? [1, 1 + audioLevel * 0.15, 1]
                : state === "speaking"
                ? [1, 1.05, 1]
                : 1,
            }}
            transition={{
              duration: state === "listening" ? 0.3 : 1.5,
              repeat: state === "speaking" ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <ArayOrb
              size={120}
              pulse={
                state === "listening" ? "listening"
                : state === "speaking" ? "speaking"
                : state === "thinking" ? "listening"
                : "idle"
              }
            />
          </motion.div>

          {/* Status text */}
          <div className="text-center">
            {state === "idle" && (
              <p className="text-sm text-muted-foreground">Готов слушать</p>
            )}
            {state === "listening" && (
              <p className="text-sm text-primary font-medium">Слушаю...</p>
            )}
            {state === "thinking" && (
              <p className="text-sm text-primary font-medium flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Думаю...
              </p>
            )}
            {state === "speaking" && (
              <p className="text-sm text-primary font-medium">Отвечаю</p>
            )}
            {state === "paused" && (
              <p className="text-sm text-muted-foreground">Микрофон на паузе</p>
            )}
          </div>

          {/* Wave анимация (только при listening) */}
          {state === "listening" && (
            <div className="flex items-center gap-1 h-12">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-primary transition-all duration-150"
                  style={{ height: `${h}%`, opacity: 0.4 + audioLevel * 0.6 }}
                />
              ))}
            </div>
          )}

          {/* Subtitle: что слышит */}
          <div className="min-h-[60px] max-w-md text-center px-4">
            {(final || interim) && state === "listening" && (
              <p className="text-base text-foreground leading-relaxed">
                {final}
                <span className="text-muted-foreground">{interim}</span>
              </p>
            )}
            {reply && (state === "speaking" || state === "thinking") && (
              <p className="text-base text-foreground leading-relaxed">{reply}</p>
            )}
            {error && micPermission === "denied" && (
              <p className="text-sm text-muted-foreground">
                Дай доступ к микрофону в настройках браузера, потом нажми{" "}
                <RotateCw className="w-3 h-3 inline mx-0.5" />.
              </p>
            )}
          </div>
        </div>

        {/* Bottom: 3 кнопки. Если Арай говорит — крупная кнопка "Перебить". */}
        {state === "speaking" ? (
          <div className="w-full max-w-md flex flex-col items-center gap-3">
            <p className="text-[12px] text-muted-foreground">Тапни чтобы перебить</p>
            <button
              onClick={interruptAray}
              className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground hover:brightness-110 flex items-center justify-center transition-all active:scale-95"
              style={{ boxShadow: "0 0 24px hsl(var(--destructive) / 0.5)" }}
              aria-label="Перебить Арая"
            >
              <Mic className="w-6 h-6" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md flex items-center justify-around gap-4">
            {/* Пауза/возобновить */}
            <button
              onClick={togglePause}
              disabled={state === "thinking"}
              className="w-12 h-12 rounded-full border border-border hover:bg-muted/40 flex items-center justify-center transition-colors disabled:opacity-40"
              aria-label={state === "paused" ? "Возобновить" : "Пауза"}
            >
              {state === "paused" ? (
                <Mic className="w-5 h-5 text-muted-foreground" />
              ) : (
                <MicOff className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Отправить (центральная primary) */}
            <button
              onClick={sendToAray}
              disabled={(!final && !interim) || state === "thinking"}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground hover:brightness-110 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.4)" }}
              aria-label="Отправить Араю"
            >
              <Send className="w-6 h-6" strokeWidth={2.2} />
            </button>

            {/* В чат */}
            <button
              onClick={switchToChat}
              className="w-12 h-12 rounded-full border border-border hover:bg-muted/40 flex items-center justify-center transition-colors"
              aria-label="Переключиться в чат"
            >
              <Keyboard className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
