"use client";

import { useState, useEffect, useRef } from "react";
import {
  Quote, Clock4, CalendarDays, RefreshCw, StickyNote,
  CheckCircle2, Circle, Copy, Share2, Check, ListTodo, ChevronLeft, ChevronRight,
} from "lucide-react";

// Хранилища с историей по датам
const NOTES_KEY = "aray_notes_v2";       // { "YYYY-MM-DD": string }
const TASKS_KEY = "aray_tasks_v2";        // { "YYYY-MM-DD": DayTask[] }
const LEGACY_TASKS_KEY = "aray_day_plan_v1"; // обратная совместимость

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-slate-400",
};

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

type DayTask = { id: string; text: string; time: string; done: boolean; priority: string };

function dateKey(d: Date) {
  // Используем локальную дату, не UTC (важно для часовых поясов UTC+3 и выше)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Утилиты хранилища ──────────────────────────────────────────────────────────
function loadNotes(key: string): string {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return "";
    const store = JSON.parse(raw);
    return store[key] ?? "";
  } catch { return ""; }
}
function saveNotes(key: string, text: string) {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[key] = text;
    localStorage.setItem(NOTES_KEY, JSON.stringify(store));
  } catch {}
}
function loadTasks(key: string): DayTask[] {
  try {
    // Сначала новое хранилище
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      const store = JSON.parse(raw);
      if (store[key]) return store[key];
    }
    // Если запрашиваем сегодня — проверяем старый формат
    const today = dateKey(new Date());
    if (key === today) {
      const legacy = localStorage.getItem(LEGACY_TASKS_KEY);
      if (legacy) {
        const { date, tasks } = JSON.parse(legacy);
        if (date === today) return tasks as DayTask[];
      }
    }
    return [];
  } catch { return []; }
}
function saveTasks(key: string, tasks: DayTask[]) {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[key] = tasks;
    localStorage.setItem(TASKS_KEY, JSON.stringify(store));
    // Обновляем и старый ключ для совместимости с планировщиком
    const today = dateKey(new Date());
    if (key === today) {
      const legacy = localStorage.getItem(LEGACY_TASKS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(LEGACY_TASKS_KEY, JSON.stringify({ ...parsed, tasks }));
      }
    }
  } catch {}
}

// ── Мини-календарь с выбором даты ─────────────────────────────────────────────
function MiniCalendar({
  selectedDate, onSelect, today,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  today: Date;
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const selDate = selectedDate.getDate();
  const selMonth = selectedDate.getMonth();
  const selYear = selectedDate.getFullYear();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const monthName   = viewMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const weekDays    = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() { setViewMonth(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewMonth(new Date(year, month + 1, 1)); }

  return (
    <div>
      {/* Шапка месяца с навигацией */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors aray-icon-spin">
          <ChevronLeft className="w-3 h-3 text-white/40" />
        </button>
        <p className="text-[11px] font-semibold text-white/50 capitalize tracking-wide">{monthName}</p>
        <button onClick={nextMonth} className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors aray-icon-spin">
          <ChevronRight className="w-3 h-3 text-white/40" />
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-[9px] text-center font-bold text-white/30 uppercase">{d}</div>
        ))}
      </div>

      {/* Числа — кликабельные */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === todayDate && month === todayMonth && year === todayYear;
          const isSelected = day === selDate && month === selMonth && year === selYear;
          const isFuture = new Date(year, month, day) > today;
          return (
            <button
              key={i}
              onClick={() => !isFuture && onSelect(new Date(year, month, day))}
              disabled={isFuture}
              className={`
                h-6 w-full flex items-center justify-center text-[11px] rounded-lg font-medium transition-all
                ${isToday && isSelected
                  ? "bg-primary text-white font-bold shadow-sm shadow-primary/40"
                  : isSelected
                    ? "bg-white/20 text-white ring-1 ring-white/40"
                    : isToday
                      ? "ring-1 ring-primary/60 text-primary"
                      : isFuture
                        ? "text-white/15 cursor-not-allowed"
                        : "text-white/60 hover:bg-white/10 cursor-pointer"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Задачи выбранного дня ──────────────────────────────────────────────────────
function DayTasks({ dateStr, isToday }: { dateStr: string; isToday: boolean }) {
  const [tasks, setTasks] = useState<DayTask[]>([]);

  useEffect(() => { setTasks(loadTasks(dateStr)); }, [dateStr]);

  function toggle(id: string) {
    if (!isToday) return; // прошлые дни — только чтение
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    saveTasks(dateStr, updated);
  }

  const done = tasks.filter(t => t.done).length;
  const visible = tasks.slice(0, 5);
  const remaining = tasks.length - visible.length;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.07]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-white/40">
          <ListTodo className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {isToday ? "Задачи дня" : "Задачи"}
          </span>
        </div>
        {tasks.length > 0 && (
          <span className="text-[10px] text-white/30">{done}/{tasks.length}</span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="h-0.5 rounded-full bg-white/10 mb-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: tasks.length ? `${(done / tasks.length) * 100}%` : "0%" }}
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-[10px] text-white/25">
          {isToday ? "Добавьте задачи через планировщик ↗" : "Нет записей за этот день"}
        </p>
      ) : (
        <div className="space-y-1">
          {visible.map(task => (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              disabled={!isToday}
              className="w-full flex items-center gap-2 group text-left"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-slate-400"}`} />
              {task.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                : <Circle className={`w-3.5 h-3.5 shrink-0 transition-colors ${isToday ? "text-white/25 group-hover:text-white/50" : "text-white/20"}`} />
              }
              <span className={`text-[11px] leading-tight flex-1 truncate ${
                task.done ? "line-through text-white/30" : "text-white/70"
              }`}>
                {task.time && <span className="text-white/35 mr-1">{task.time}</span>}
                {task.text}
              </span>
            </button>
          ))}
          {remaining > 0 && <p className="text-[10px] text-white/25 pl-6">+{remaining} ещё</p>}
        </div>
      )}
    </div>
  );
}

// ── Умные заметки ──────────────────────────────────────────────────────────────
function SmartNotes({ dateStr, isToday }: { dateStr: string; isToday: boolean }) {
  const [notes, setNotes]   = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(loadNotes(dateStr));
    setSavedAt(null);
  }, [dateStr]);

  function handleChange(val: string) {
    if (!isToday) return;
    setNotes(val);
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveNotes(dateStr, val);
      setSavedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
    }, 700);
  }

  function copy() {
    if (!notes.trim()) return;
    navigator.clipboard.writeText(notes).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function share() {
    if (!notes.trim()) return;
    if (navigator.share) navigator.share({ title: `Заметки ${dateStr}`, text: notes });
    else copy();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-white/35">
          <StickyNote className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Заметки</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={copy} title="Копировать" className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors aray-icon-spin">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/30" />}
          </button>
          <button onClick={share} title="Поделиться" className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors aray-icon-spin">
            <Share2 className="w-3 h-3 text-white/30" />
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder={isToday ? "Быстрые заметки на сегодня..." : "Нет заметок за этот день"}
        readOnly={!isToday}
        rows={4}
        className="w-full resize-none text-[12px] rounded-xl px-3 py-2.5 outline-none transition-all leading-relaxed"
        style={{
          background: isToday ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.75)",
          cursor: isToday ? "text" : "default",
        }}
      />

      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-white/20">
          {!isToday ? "Только чтение" : savedAt ? `Сохранено в ${savedAt}` : "Автосохранение"}
        </span>
        {notes.length > 0 && (
          <span className={`text-[9px] tabular-nums ${notes.length > 400 ? "text-amber-400/60" : "text-white/20"}`}>
            {notes.length} симв.
          </span>
        )}
      </div>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────
export function AdminDashboardWidgets() {
  const [now, setNow]               = useState<Date | null>(null);
  const [selectedDate, setSelected] = useState<Date>(new Date());
  const [quoteIdx, setQuoteIdx]     = useState(0);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
  }, []);

  if (!now) return null;

  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selKey  = dateKey(selectedDate);
  const todayKey2 = dateKey(today);
  const isToday = selKey === todayKey2;

  const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const secsStr = now.toLocaleTimeString("ru-RU", { second: "2-digit" });
  const dateStr = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  // Метка выбранной даты (если не сегодня)
  const selLabel = isToday ? null : selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const quote   = QUOTES[quoteIdx];
  const glass   = "rounded-2xl border border-border p-4 bg-card backdrop-blur-xl";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

      {/* ── Часы ── */}
      <div className={glass + " flex flex-col gap-2"}>
        <div className="flex items-center gap-1.5 text-white/40 mb-1">
          <Clock4 className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Время</span>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="font-display font-bold text-4xl text-white leading-none tracking-tight">{timeStr}</span>
          <span className="font-mono text-xl text-white/30 leading-none mb-0.5">{secsStr}</span>
        </div>
        <p className="text-[11px] text-white/45 capitalize mt-1">{dateStr}</p>
      </div>

      {/* ── Календарь + Задачи ── */}
      <div className={glass + " flex flex-col gap-2"}>
        <div className="flex items-center justify-between text-white/40 mb-1">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Календарь</span>
          </div>
          {selLabel && (
            <button
              onClick={() => setSelected(today)}
              className="text-[9px] text-primary/70 hover:text-primary px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Сегодня
            </button>
          )}
        </div>

        <MiniCalendar selectedDate={selectedDate} onSelect={setSelected} today={today} />

        {/* Заметка о выбранном дне */}
        {selLabel && (
          <div className="text-[10px] text-primary/60 text-center py-0.5">
            {selLabel}
          </div>
        )}

        <DayTasks dateStr={selKey} isToday={isToday} />
      </div>

      {/* ── Совет дня + Заметки ── */}
      <div className={glass + " relative flex flex-col gap-2"}>
        {/* Цитата */}
        <div className="flex items-center justify-between text-white/40 mb-1">
          <div className="flex items-center gap-1.5">
            <Quote className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Совет дня</span>
          </div>
          <button
            onClick={() => setQuoteIdx(i => (i + 1) % QUOTES.length)}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors aray-icon-spin"
            title="Следующий"
          >
            <RefreshCw className="w-3 h-3 text-white/40" />
          </button>
        </div>
        <span className="absolute top-3 right-4 text-5xl font-serif text-white/[0.06] select-none leading-none">"</span>
        <p className="text-[11px] text-white/70 leading-relaxed italic">{quote.text}</p>
        <p className="text-[10px] text-primary/70 font-semibold mb-2">— {quote.author}</p>

        <div className="border-t border-white/[0.07] mb-1" />

        <SmartNotes dateStr={selKey} isToday={isToday} />
      </div>

    </div>
  );
}
