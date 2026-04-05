"use client";

import { useState, useEffect, useRef } from "react";
import {
  Quote, CalendarDays, RefreshCw, StickyNote,
  CheckCircle2, Circle, Copy, Share2, Check, ListTodo, ChevronLeft, ChevronRight,
  Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer,
} from "lucide-react";

// ── Погода: WMO коды → описание + иконка ──────────────────────────────────────
function getWeatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0)                    return { label: "Ясно",             emoji: "☀️" };
  if (code <= 2)                     return { label: "Малооблачно",      emoji: "🌤" };
  if (code === 3)                    return { label: "Пасмурно",         emoji: "☁️" };
  if (code <= 49)                    return { label: "Туман",            emoji: "🌫" };
  if (code <= 59)                    return { label: "Морось",           emoji: "🌦" };
  if (code <= 69)                    return { label: "Дождь",            emoji: "🌧" };
  if (code <= 79)                    return { label: "Снег",             emoji: "❄️" };
  if (code <= 82)                    return { label: "Ливень",           emoji: "⛈" };
  if (code <= 86)                    return { label: "Снегопад",         emoji: "🌨" };
  if (code >= 95)                    return { label: "Гроза",            emoji: "⛈" };
  return { label: "Переменно",       emoji: "🌥" };
}

type WeatherData = {
  temp: number;
  code: number;
  city: string;
  date: string;
  weekday: string;
};

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather(la: number, lo: number, cityName: string) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weathercode&timezone=Europe%2FMoscow`
        );
        const data = await res.json();
        const now = new Date();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weathercode,
          city: cityName,
          date: now.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
          weekday: now.toLocaleDateString("ru-RU", { weekday: "long" }),
        });
      } catch { /* тихо */ }
      finally { setLoading(false); }
    }

    // Шаг 1: сразу грузим Химки (быстро, без ожидания геолокации)
    fetchWeather(55.8945, 37.3877, "Химки");

    // Шаг 2: параллельно пробуем геолокацию — если разрешат, обновим
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: la, longitude: lo } = pos.coords;
          let city = "Ваш город";
          try {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=ru`,
              { headers: { "User-Agent": "PiloRus-Admin/1.0" } }
            );
            const gd = await geo.json();
            city = gd.address?.city || gd.address?.town || gd.address?.village || gd.address?.suburb || city;
          } catch { /* оставим координаты */ }
          // Обновляем с реальной локацией
          fetchWeather(la, lo, city);
        },
        () => { /* отказал — Химки уже показаны */ },
        { timeout: 6000, maximumAge: 300_000 }
      );
    }
  }, []);

  return { weather, loading };
}

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
        <button onClick={prevMonth} className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-3 h-3 text-foreground/40" />
        </button>
        <p className="text-[11px] font-semibold text-foreground/55 capitalize tracking-wide">{monthName}</p>
        <button onClick={nextMonth} className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
          <ChevronRight className="w-3 h-3 text-foreground/40" />
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-[9px] text-center font-bold text-foreground/35 uppercase">{d}</div>
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
                    ? "bg-foreground/15 text-foreground ring-1 ring-foreground/30"
                    : isToday
                      ? "ring-1 ring-primary/60 text-primary"
                      : isFuture
                        ? "text-foreground/20 cursor-not-allowed"
                        : "text-foreground/65 hover:bg-foreground/10 cursor-pointer"
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
          <span className="text-[10px] text-foreground/35">{done}/{tasks.length}</span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="h-0.5 rounded-full bg-foreground/10 mb-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: tasks.length ? `${(done / tasks.length) * 100}%` : "0%" }}
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-[10px] text-foreground/30">
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
                : <Circle className={`w-3.5 h-3.5 shrink-0 transition-colors ${isToday ? "text-foreground/30 group-hover:text-foreground/55" : "text-foreground/25"}`} />
              }
              <span className={`text-[11px] leading-tight flex-1 truncate ${
                task.done ? "line-through text-foreground/35" : "text-foreground/70"
              }`}>
                {task.time && <span className="text-foreground/40 mr-1">{task.time}</span>}
                {task.text}
              </span>
            </button>
          ))}
          {remaining > 0 && <p className="text-[10px] text-foreground/30 pl-6">+{remaining} ещё</p>}
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
        <div className="flex items-center gap-1.5 text-foreground/40">
          <StickyNote className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Заметки</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={copy} title="Копировать" className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-foreground/10 transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-foreground/30" />}
          </button>
          <button onClick={share} title="Поделиться" className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-foreground/10 transition-colors">
            <Share2 className="w-3 h-3 text-foreground/30" />
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder={isToday ? "Быстрые заметки на сегодня..." : "Нет заметок за этот день"}
        readOnly={!isToday}
        rows={4}
        className="w-full resize-none text-[12px] rounded-xl px-3 py-2.5 outline-none transition-all leading-relaxed bg-foreground/[0.04] border border-foreground/10 text-foreground/80 placeholder:text-foreground/30"
        style={{ cursor: isToday ? "text" : "default" }}
      />

      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-foreground/25">
          {!isToday ? "Только чтение" : savedAt ? `Сохранено в ${savedAt}` : "Автосохранение"}
        </span>
        {notes.length > 0 && (
          <span className={`text-[9px] tabular-nums ${notes.length > 400 ? "text-amber-400/60" : "text-foreground/25"}`}>
            {notes.length} симв.
          </span>
        )}
      </div>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────
export function AdminDashboardWidgets() {
  const [mounted, setMounted]        = useState(false);
  const [selectedDate, setSelected]  = useState<Date>(new Date());
  const [quoteIdx, setQuoteIdx]      = useState(0);
  const { weather, loading: wLoad }  = useWeather();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
  }, []);

  if (!mounted) return null;

  const now     = new Date();
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selKey  = dateKey(selectedDate);
  const todayKey2 = dateKey(today);
  const isToday = selKey === todayKey2;

  // Метка выбранной даты (если не сегодня)
  const selLabel = isToday ? null : selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const quote   = QUOTES[quoteIdx];
  const glass   = "rounded-2xl border border-border p-4 bg-card backdrop-blur-xl";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

      {/* ── Погода + дата ── */}
      <div className={glass + " flex flex-col gap-2 justify-between"}>
        {wLoad ? (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-3 w-16 rounded bg-foreground/10" />
            <div className="h-10 w-24 rounded bg-foreground/10" />
            <div className="h-3 w-28 rounded bg-foreground/10" />
          </div>
        ) : weather ? (
          <>
            {/* Город */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">{weather.city}</span>
            </div>

            {/* Температура + иконка */}
            <div className="flex items-center gap-3">
              <span className="text-5xl leading-none">{getWeatherInfo(weather.code).emoji}</span>
              <div>
                <div className="font-display font-bold text-4xl text-foreground leading-none tracking-tight">
                  {weather.temp > 0 ? "+" : ""}{weather.temp}°
                </div>
                <p className="text-[11px] text-foreground/50 mt-0.5">{getWeatherInfo(weather.code).label}</p>
              </div>
            </div>

            {/* Дата */}
            <div className="border-t border-foreground/[0.07] pt-2">
              <p className="text-[12px] font-semibold text-foreground/70 capitalize">{weather.weekday}</p>
              <p className="text-[11px] text-foreground/40">{weather.date}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-3xl">🌤</span>
            <p className="text-[11px] text-foreground/40">Погода недоступна</p>
            <p className="text-[11px] text-foreground/60 capitalize">
              {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        )}
      </div>

      {/* ── Календарь + Задачи ── */}
      <div className={glass + " flex flex-col gap-2"}>
        <div className="flex items-center justify-between text-foreground/40 mb-1">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Календарь</span>
          </div>
          {selLabel && (
            <button
              onClick={() => setSelected(today)}
              className="text-[9px] text-primary/70 hover:text-primary px-2 py-0.5 rounded-lg hover:bg-foreground/10 transition-colors"
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
        <div className="flex items-center justify-between text-foreground/40 mb-1">
          <div className="flex items-center gap-1.5">
            <Quote className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Совет дня</span>
          </div>
          <button
            onClick={() => setQuoteIdx(i => (i + 1) % QUOTES.length)}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-foreground/10 transition-colors"
            title="Следующий"
          >
            <RefreshCw className="w-3 h-3 text-foreground/40" />
          </button>
        </div>
        <span className="absolute top-3 right-4 text-5xl font-serif text-foreground/[0.06] select-none leading-none">"</span>
        <p className="text-[11px] text-foreground/70 leading-relaxed italic">{quote.text}</p>
        <p className="text-[10px] text-primary/70 font-semibold mb-2">— {quote.author}</p>

        <div className="border-t border-foreground/[0.07] mb-1" />

        <SmartNotes dateStr={selKey} isToday={isToday} />
      </div>

    </div>
  );
}
