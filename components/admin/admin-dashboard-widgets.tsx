"use client";

import { useState, useEffect, useRef } from "react";
import { Quote, Clock4, CalendarDays, RefreshCw, StickyNote } from "lucide-react";

const NOTES_KEY = "aray_dashboard_notes_v1";

// ── Бизнес-афоризмы и советы ──────────────────────────────────────────────────
const QUOTES = [
  { text: "Успех — это не финальная точка, поражение — не фатально. Важно лишь мужество продолжать.", author: "Уинстон Черчилль" },
  { text: "Единственный способ делать великую работу — любить то, что ты делаешь.", author: "Стив Джобс" },
  { text: "Не бойся медленно идти вперёд, бойся стоять на месте.", author: "Китайская мудрость" },
  { text: "Ваши клиенты — лучший источник вдохновения для новых идей.", author: "Джефф Безос" },
  { text: "Качество никогда не бывает случайностью. Это всегда результат умных усилий.", author: "Джон Рёскин" },
  { text: "Лучшая реклама — довольный клиент, который рассказывает о вас другу.", author: "Билл Гейтс" },
  { text: "Скорость — это не стратегия. Направление важнее скорости.", author: "Ричард Румелт" },
  { text: "Делай сегодня то, что другие не хотят — и завтра живи так, как другие не могут.", author: "Джаред Лето" },
  { text: "Трудности — это возможности в рабочей одежде.", author: "Генри Кайзер" },
  { text: "Успешные люди делают то, что неуспешные делать не хотят.", author: "Джон Максвелл" },
  { text: "Каждый покупатель — это партнёр. Помогай ему, и он вернётся.", author: "Сэм Уолтон" },
  { text: "Если у тебя есть сомнения — инвестируй в себя. Это самый надёжный вклад.", author: "Уоррен Баффет" },
  { text: "Продавай решение, а не продукт. Клиенту нужна дырка, а не дрель.", author: "Теодор Левитт" },
  { text: "Хорошее начало дня — это уже 50% успеха.", author: "Робин Шарма" },
  { text: "Маленькие ежедневные шаги ведут к большим переменам.", author: "Дарren Харди" },
  { text: "Репутация строится годами, разрушается за секунды. Береги её.", author: "Уоррен Баффет" },
  { text: "Обслуживай клиентов так, как хочешь, чтобы обслуживали тебя.", author: "Ричард Брэнсон" },
  { text: "Не продавай — помогай покупать. Это принципиально разные вещи.", author: "Зиг Зиглар" },
  { text: "Система важнее мотивации. Создай систему — и она создаст результат.", author: "Скотт Адамс" },
  { text: "Первый клиент важен. Но сотый важнее — это уже репутация.", author: "Неизвестный предприниматель" },
];

// ── Мини-календарь ─────────────────────────────────────────────────────────────
function MiniCalendar({ now }: { now: Date }) {
  const year  = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDay   = new Date(year, month, 1).getDay(); // 0=вс
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // сдвиг: пн=0

  const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const weekDays  = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Месяц */}
      <p className="text-[11px] font-semibold text-white/50 capitalize mb-2 tracking-wide">
        {monthName}
      </p>
      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-[9px] text-center font-bold text-white/30 uppercase">{d}</div>
        ))}
      </div>
      {/* Числа */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => (
          <div key={i} className={`
            h-6 w-full flex items-center justify-center text-[11px] rounded-lg font-medium transition-all
            ${day === null ? "" :
              day === today
                ? "bg-primary text-white font-bold shadow-sm shadow-primary/40"
                : "text-white/60 hover:bg-white/10 cursor-default"
            }
          `}>
            {day ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────
export function AdminDashboardWidgets() {
  const [now, setNow]           = useState<Date | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [notes, setNotes]       = useState("");
  const saveRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Часы — обновляем каждую секунду
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Случайная цитата при загрузке + кнопка обновить
  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
    setNotes(localStorage.getItem(NOTES_KEY) ?? "");
  }, []);

  // Автосохранение заметок (debounce 800ms)
  const handleNotes = (val: string) => {
    setNotes(val);
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => localStorage.setItem(NOTES_KEY, val), 800);
  };

  if (!now) return null;

  const timeStr    = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const secsStr    = now.toLocaleTimeString("ru-RU", { second: "2-digit" });
  const dateStr    = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const quote      = QUOTES[quoteIdx];

  const glassCard  = "rounded-2xl border border-white/10 p-4 flex flex-col gap-2";
  const glassDark  = "bg-[rgba(5,8,20,0.45)] backdrop-blur-xl";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

      {/* ── Часы ── */}
      <div className={`${glassCard} ${glassDark}`}>
        <div className="flex items-center gap-1.5 text-white/40 mb-1">
          <Clock4 className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Время</span>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="font-display font-bold text-4xl text-white leading-none tracking-tight">
            {timeStr}
          </span>
          <span className="font-mono text-xl text-white/30 leading-none mb-0.5">
            {secsStr}
          </span>
        </div>
        <p className="text-[11px] text-white/45 capitalize mt-1">{dateStr}</p>
      </div>

      {/* ── Календарь ── */}
      <div className={`${glassCard} ${glassDark}`}>
        <div className="flex items-center gap-1.5 text-white/40 mb-1">
          <CalendarDays className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Календарь</span>
        </div>
        <MiniCalendar now={now} />
      </div>

      {/* ── Афоризм + Заметки ── */}
      <div className={`${glassCard} ${glassDark} relative`}>
        {/* Цитата */}
        <div className="flex items-center justify-between text-white/40 mb-1">
          <div className="flex items-center gap-1.5">
            <Quote className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Совет дня</span>
          </div>
          <button
            onClick={() => setQuoteIdx(i => (i + 1) % QUOTES.length)}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors aray-icon-spin"
            title="Следующий совет"
          >
            <RefreshCw className="w-3 h-3 text-white/40" />
          </button>
        </div>

        <span className="absolute top-3 right-4 text-5xl font-serif text-white/[0.06] select-none leading-none">"</span>

        <p className="text-[11px] text-white/70 leading-relaxed italic">
          {quote.text}
        </p>
        <p className="text-[10px] text-primary/70 font-semibold mt-0.5 mb-3">
          — {quote.author}
        </p>

        {/* Разделитель */}
        <div className="border-t border-white/[0.07] mb-3" />

        {/* Заметки */}
        <div className="flex items-center gap-1.5 text-white/35 mb-1.5">
          <StickyNote className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Заметки</span>
        </div>
        <textarea
          value={notes}
          onChange={e => handleNotes(e.target.value)}
          placeholder="Быстрые заметки на сегодня..."
          rows={3}
          className="w-full resize-none text-[12px] rounded-xl px-3 py-2 outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.75)",
          }}
        />
        <p className="text-[9px] text-white/20 mt-1">Сохраняется автоматически</p>
      </div>

    </div>
  );
}
