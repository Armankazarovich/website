"use client";

/**
 * ArayHomeActions — три кнопки в Hero «Дома Арая»: главная CTA «Спроси Арая»
 * + История + Голос. Client component потому что dispatch CustomEvent.
 *
 * Иконки lucide-react (правило DESIGN_SYSTEM п.10 — никаких эмодзи в UI).
 */
import { Sparkles, History, Mic } from "lucide-react";

export function ArayHomeActions() {
  const open = () => window.dispatchEvent(new CustomEvent("aray:open"));
  const voice = () => window.dispatchEvent(new CustomEvent("aray:voice"));

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        onClick={open}
        type="button"
        className="w-full sm:w-auto sm:min-w-[280px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] transition-all text-sm font-medium shadow-sm"
        aria-label="Спроси Арая текстом или голосом"
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        <span>Спроси Арая · текстом или голосом</span>
      </button>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={open}
          type="button"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99] transition-colors text-xs font-medium text-foreground"
          aria-label="История диалогов"
        >
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          История
        </button>
        <button
          onClick={voice}
          type="button"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99] transition-colors text-xs font-medium text-foreground"
          aria-label="Голосовой режим"
        >
          <Mic className="w-3.5 h-3.5 text-muted-foreground" />
          Голос
        </button>
      </div>
    </div>
  );
}
