"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ArrowLeft, RotateCcw, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// ─── Aray Sphere ──────────────────────────────────────────────────────────────

function AraySphere({ size = 36, pulse = false }: { size?: number; pulse?: boolean }) {
  const id = `asp-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={`${id}-base`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="30%" stopColor="#fbbf24">
            <animate attributeName="stopColor" values="#fbbf24;#f97316;#fde047;#fbbf24" dur="5s" repeatCount="indefinite" />
          </stop>
          <stop offset="70%" stopColor="#f97316">
            <animate attributeName="stopColor" values="#f97316;#ea580c;#fb923c;#f97316" dur="5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
        <radialGradient id={`${id}-hot`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="60%" stopColor="rgba(251,191,36,0.45)" />
          <stop offset="100%" stopColor="rgba(249,115,22,0)" />
        </radialGradient>
        <radialGradient id={`${id}-hl`} cx="35%" cy="28%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`} filter={pulse ? `url(#${id}-glow)` : undefined} />
      <g clipPath={`url(#${id}-clip)`}>
        <ellipse cx="50" cy="28" rx="36" ry="22" fill={`url(#${id}-hot)`}>
          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="6s" repeatCount="indefinite" />
        </ellipse>
      </g>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`} />
    </svg>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const CHIPS = [
  "Строю дом 6×8 — рассчитай материалы",
  "Строю баню 4×5 каркасную",
  "Нужен забор 30 метров",
  "Как выбрать доску для пола?",
  "Чем имитация бруса отличается от вагонки?",
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ArayPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolHint, setToolHint] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userName = (session?.user as any)?.name as string | undefined;
  const userInitial = userName ? userName[0].toUpperCase() : "У";

  // Initial greeting
  useEffect(() => {
    const hour = new Date().getHours();
    const greet =
      hour < 6 ? "Не спится?" :
      hour < 12 ? "Доброе утро" :
      hour < 17 ? "Добрый день" :
      hour < 22 ? "Добрый вечер" : "Поздно уже";

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `${greet}! 👋 Я **Арай** — строительный советник и прораб в кармане.\n\nРасскажи что планируешь строить — рассчитаю весь список материалов, помогу выбрать и посчитаю стоимость. 🏗️`,
    }]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolHint]);

  // Auto-resize textarea
  const resizeTextarea = () => {
    const t = inputRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 160) + "px";
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Cancel previous if any
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const assistantId = `a-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setLoading(true);
    setToolHint(null);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const allMsgs = [...messages, userMsg]
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: allMsgs,
          context: { page: "aray-chat" },
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: errData.error || "Что-то пошло не так 😔", streaming: false }
              : m
          )
        );
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);

            if (parsed.type === "text" && parsed.text) {
              fullText += parsed.text;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText } : m
                )
              );
              setToolHint(null);
            }

            if (parsed.type === "tool_start") {
              const toolLabels: Record<string, string> = {
                search_products: "🔍 Ищу товары в каталоге...",
                calculate_project_materials: "🏗️ Считаю список материалов...",
                calculate_volume: "📐 Считаю кубатуру...",
                get_order_status: "📦 Проверяю статус заказа...",
              };
              setToolHint(toolLabels[parsed.name] || "⚙️ Обрабатываю...");
            }

            if (parsed.type === "error") {
              fullText = parsed.error;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: fullText, streaming: false }
                    : m
                )
              );
            }
          } catch {}
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
      setToolHint(null);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "Ошибка соединения. Попробуй ещё раз 🙏", streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
    setToolHint(null);
    setInput("");
    // Re-trigger welcome
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Доброе утро" : hour < 17 ? "Добрый день" : "Добрый вечер";
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: `${greet}! 👋 Начнём заново — расскажи что строишь. 🏗️`,
    }]);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border/40 bg-card/60 backdrop-blur-md z-10">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <AraySphere size={30} pulse={loading} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Арай</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {loading ? (toolHint || "Думает...") : "Строительный советник · ARAY"}
            </p>
          </div>
        </div>

        <button
          onClick={resetChat}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Новый чат"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              userInitial={userInitial}
            />
          ))}

          {/* Tool hint */}
          {toolHint && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 text-sm text-muted-foreground border border-border/30 animate-pulse w-fit">
              <span>{toolHint}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Chips (shown when chat is fresh) ── */}
      {messages.length <= 1 && !loading && (
        <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="shrink-0 flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-full border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all whitespace-nowrap"
              >
                {chip}
                <ChevronRight className="w-3 h-3 opacity-40" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="shrink-0 px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">
        <div className={cn(
          "flex items-end gap-2 bg-card border rounded-2xl px-4 py-3 transition-all duration-200",
          loading
            ? "border-primary/30 bg-primary/5"
            : "border-border/50 focus-within:border-primary/50"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "Арай думает..." : "Что строишь? Расскажи — рассчитаю..."}
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/40 disabled:opacity-50 leading-relaxed"
            style={{ minHeight: "24px", maxHeight: "160px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              "disabled:opacity-30 active:scale-90",
              input.trim() && !loading
                ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/30 mt-2">
          Powered by ARAY PRODUCTIONS · ИИ может ошибаться, проверяй важные расчёты
        </p>
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, userInitial }: { msg: Message; userInitial: string }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      {isUser ? (
        <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[11px] font-bold mt-0.5">
          {userInitial}
        </div>
      ) : (
        <div className="mt-0.5">
          <AraySphere size={28} />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border/40 text-foreground rounded-tl-sm"
        )}
      >
        <FormattedContent content={msg.content} />

        {/* Streaming cursors */}
        {msg.streaming && msg.content === "" && (
          <span className="inline-flex items-center gap-1 h-4">
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms] opacity-60" />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms] opacity-60" />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms] opacity-60" />
          </span>
        )}
        {msg.streaming && msg.content !== "" && (
          <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 animate-[blink_1s_ease_infinite] align-middle opacity-70" />
        )}
      </div>
    </div>
  );
}

// ─── Content formatter (bold + lists) ─────────────────────────────────────────

function FormattedContent({ content }: { content: string }) {
  if (!content) return null;

  // Split into lines and render
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Bullet list
        if (line.match(/^[-•·]\s/)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="opacity-40 mt-0.5">·</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        if (line.match(/^\d+\.\s/)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex gap-2">
                <span className="opacity-40 font-mono text-[11px] mt-0.5 shrink-0">{match[1]}.</span>
                <span>{renderInline(match[2])}</span>
              </div>
            );
          }
        }

        // Section header (━━━ ... ━━━)
        if (line.includes("━━━")) {
          return (
            <p key={i} className="text-xs font-semibold uppercase tracking-wider opacity-50 mt-2">
              {line.replace(/━/g, "").trim()}
            </p>
          );
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
