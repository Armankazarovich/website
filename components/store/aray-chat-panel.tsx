"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Mic, MicOff, Volume2, VolumeX, ArrowDown,
  ShoppingCart, Calculator, Truck, Package, Search,
  Star, MessageSquare, Phone, Sparkles, ChevronRight,
} from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  typing?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  color?: string;
}

interface ArayChatPanelProps {
  open: boolean;
  onClose: () => void;
  productName?: string | null;
  productContext?: string | null;
  userName?: string | null;
}

// ─── Quick actions — context-aware ──────────────────────────────────────────
function getQuickActions(productName?: string | null): QuickAction[] {
  const base: QuickAction[] = [
    { id: "find", label: "Найти товар", icon: <Search className="w-4 h-4" />, prompt: "Помоги найти подходящий пиломатериал", color: "from-blue-500/20 to-blue-600/10" },
    { id: "calc", label: "Рассчитать", icon: <Calculator className="w-4 h-4" />, prompt: "Рассчитай сколько мне нужно материала", color: "from-emerald-500/20 to-emerald-600/10" },
    { id: "delivery", label: "Доставка", icon: <Truck className="w-4 h-4" />, prompt: "Расскажи про доставку и условия", color: "from-amber-500/20 to-amber-600/10" },
    { id: "compare", label: "Сравнить", icon: <Package className="w-4 h-4" />, prompt: "Сравни виды пиломатериалов для моего проекта", color: "from-purple-500/20 to-purple-600/10" },
  ];

  if (productName) {
    base.unshift({
      id: "about",
      label: `Про ${productName.length > 20 ? productName.slice(0, 20) + "..." : productName}`,
      icon: <Sparkles className="w-4 h-4" />,
      prompt: `Расскажи подробно про ${productName} — для каких задач подходит, какое качество, плюсы и минусы`,
      color: "from-primary/20 to-primary/10",
    });
  }

  return base;
}

// ─── Typing indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/60"
            style={{
              animation: `typing-dot 1.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-1">Арай печатает...</span>
    </div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {/* Aray avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full shrink-0 mr-2 mt-1 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))" }}>
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted border border-border rounded-bl-md"
        }`}
      >
        {message.typing ? (
          <TypingIndicator />
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
        <p className={`text-[10px] mt-1 ${isUser ? "text-primary-foreground/50" : "text-muted-foreground/50"}`}>
          {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Voice Visualizer ───────────────────────────────────────────────────────
function VoiceWave({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-0.5 h-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-primary"
          style={{
            animation: `voice-wave 0.8s ease-in-out ${i * 0.06}s infinite alternate`,
            height: `${8 + Math.random() * 16}px`,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN PANEL ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function ArayChatPanel({ open, onClose, productName, productContext, userName }: ArayChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickActions = getQuickActions(productName);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open && !micActive) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, micActive]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowActions(false);
    setLoading(true);

    // Typing indicator
    const typingId = `t-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: "assistant", content: "", timestamp: new Date(), typing: true },
    ]);

    try {
      const contextMsg = productContext
        ? `[Контекст: пользователь смотрит товар "${productName}". ${productContext}]\n\n${text.trim()}`
        : text.trim();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.filter((m) => !m.typing).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: contextMsg },
          ],
          zone: "store",
        }),
      });

      // Remove typing indicator
      setMessages((prev) => prev.filter((m) => m.id !== typingId));

      if (!res.ok) throw new Error("API error");

      // Streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      let fullText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: `e-${Date.now()}`,
            role: "assistant",
            content: "Извините, произошла ошибка. Попробуйте ещё раз.",
            timestamp: new Date(),
          })
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (micActive) {
      setMicActive(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      return;
    }

    setMicActive(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMicActive(false);
      if (transcript) sendMessage(transcript);
    };

    recognition.onerror = () => setMicActive(false);
    recognition.onend = () => setMicActive(false);
    recognition.start();
  };

  // ── Keyboard submit ───────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex flex-col"
        style={{
          background: "hsl(var(--background))",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}>
          <div className="flex items-center gap-3">
            <ArayOrb size="sm" id="chat" pulse="idle" />
            <div>
              <h2 className="font-display font-bold text-base">Арай</h2>
              <p className="text-[11px] text-muted-foreground">
                {loading ? "печатает..." : "онлайн"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
              title={voiceEnabled ? "Выключить озвучку" : "Включить озвучку"}>
              {voiceEnabled ? <Volume2 className="w-5 h-5 text-muted-foreground" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
            </button>
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Messages area ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Welcome state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center pt-8 pb-6"
            >
              <ArayOrb size="lg" id="welcome" pulse="idle" />
              <h3 className="font-display font-bold text-xl mt-4">
                Привет{userName ? `, ${userName}` : ""}!
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Я Арай — помогу выбрать материал, рассчитать количество и оформить заказ
              </p>
            </motion.div>
          )}

          {/* Quick actions */}
          {showActions && messages.length === 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4 mb-6">
              {quickActions.map((action) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage(action.prompt)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border border-border text-left hover:border-primary/30 transition-all group bg-gradient-to-br ${action.color || "from-muted to-muted/50"}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{action.label}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto shrink-0" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {messages.filter((m) => !m.typing).map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {loading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Voice wave overlay ──────────────────────────────────────── */}
        {micActive && (
          <div className="px-4 py-6 flex flex-col items-center gap-4 border-t border-border bg-background">
            <VoiceWave active={micActive} />
            <p className="text-sm text-muted-foreground">Говорите...</p>
            <button onClick={() => setMicActive(false)}
              className="px-6 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium">
              Отмена
            </button>
          </div>
        )}

        {/* ── Input area ─────────────────────────────────────────────── */}
        {!micActive && (
          <div className="shrink-0 border-t border-border px-3 py-2.5"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
            <div className="flex items-end gap-2">
              <button onClick={toggleMic}
                className="p-2.5 rounded-xl hover:bg-muted transition-colors shrink-0 mb-0.5"
                title="Голосовой ввод">
                <Mic className="w-5 h-5 text-muted-foreground" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                rows={1}
                className="flex-1 px-4 py-2.5 text-sm rounded-2xl border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none max-h-32"
                style={{ minHeight: "42px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-all shrink-0 mb-0.5"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── CSS Animations ─────────────────────────────────────────── */}
        <style jsx global>{`
          @keyframes typing-dot {
            0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
            30% { opacity: 1; transform: scale(1); }
          }
          @keyframes voice-wave {
            from { height: 4px; }
            to { height: 24px; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
