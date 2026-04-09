"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck, X, Plus, Trash2, Bell, BellOff,
  Check, Clock, ChevronDown, ChevronUp, Sunrise, Sun, Moon,
} from "lucide-react";

// ─── Типы ────────────────────────────────────────────────────────────────────
type Priority = "low" | "medium" | "high";
type DayTask = {
  id: string;
  text: string;
  time: string;          // "09:30"
  done: boolean;
  reminder: boolean;     // push-уведомление
  priority: Priority;
  reminderFired?: boolean;
};

const STORAGE_KEY = "aray_day_plan_v1";
const PRIORITY_META: Record<Priority, { label: string; color: string; dot: string }> = {
  low:    { label: "Низкий",  color: "text-slate-400",  dot: "bg-slate-400"  },
  medium: { label: "Средний", color: "text-amber-400",  dot: "bg-amber-400"  },
  high:   { label: "Высокий", color: "text-red-400",    dot: "bg-red-400"    },
};

const SECTIONS = [
  { label: "Утро",    icon: Sunrise, range: [0, 12]  },
  { label: "День",    icon: Sun,     range: [12, 18] },
  { label: "Вечер",   icon: Moon,    range: [18, 24] },
];

// ─── Push-напоминание ─────────────────────────────────────────────────────────
async function scheduleReminder(task: DayTask) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    // попробуем запросить
    await Notification.requestPermission();
    if (Notification.permission !== "granted") return;
  }
  const [h, m] = task.time.split(":").map(Number);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return; // уже прошло

  setTimeout(() => {
    new Notification(`⏰ ${task.text}`, {
      body: `Запланировано на ${task.time}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
    });
  }, diff);
}

// ─── Хранилище ────────────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function loadTasks(): DayTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { date, tasks } = JSON.parse(raw);
    if (date !== todayKey()) return []; // новый день — чистый лист
    return tasks as DayTask[];
  } catch { return []; }
}
function saveTasks(tasks: DayTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), tasks }));
}

// ─── Компонент задачи ─────────────────────────────────────────────────────────
function TaskRow({
  task, onToggle, onDelete, onToggleReminder,
}: {
  task: DayTask;
  onToggle: () => void;
  onDelete: () => void;
  onToggleReminder: () => void;
}) {
  const pm = PRIORITY_META[task.priority];
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group
      ${task.done ? "opacity-50" : "hover:bg-white/[0.05]"}`}>
      {/* Приоритет */}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pm.dot}`} />

      {/* Чекбокс */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all
          ${task.done
            ? "bg-primary border-primary"
            : "border-white/20 hover:border-primary/60"
          }`}
      >
        {task.done && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Текст */}
      <span className={`flex-1 text-sm leading-snug min-w-0 truncate
        ${task.done ? "line-through text-white/35" : "text-white/80"}`}>
        {task.text}
      </span>

      {/* Время */}
      {task.time && (
        <span className="text-[10px] font-mono text-white/35 shrink-0">{task.time}</span>
      )}

      {/* Напоминание */}
      <button
        onClick={onToggleReminder}
        title={task.reminder ? "Отключить напоминание" : "Включить напоминание"}
        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 aray-icon-spin
          ${task.reminder ? "text-primary bg-primary/15" : "text-white/25 opacity-0 group-hover:opacity-100"}`}
      >
        {task.reminder ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
      </button>

      {/* Удалить */}
      <button
        onClick={onDelete}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 aray-icon-spin"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export function AdminDayPlanner() {
  const [open, setOpen]       = useState(false);
  const [tasks, setTasks]     = useState<DayTask[]>([]);
  const [text, setText]       = useState("");
  const [time, setTime]       = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [reminder, setReminder] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Загрузка задач из localStorage
  useEffect(() => { setTasks(loadTasks()); }, [open]);

  // Планировщик напоминаний при открытии
  useEffect(() => {
    if (!open) return;
    tasks.forEach(t => {
      if (t.reminder && !t.done && !t.reminderFired) scheduleReminder(t);
    });
  }, [open, tasks]);

  const save = useCallback((updated: DayTask[]) => {
    setTasks(updated);
    saveTasks(updated);
  }, []);

  const addTask = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const task: DayTask = {
      id: Date.now().toString(),
      text: trimmed, time, done: false,
      reminder, priority,
    };
    const updated = [...tasks, task].sort((a, b) => a.time.localeCompare(b.time));
    save(updated);
    if (reminder && time) scheduleReminder(task);
    setText(""); setTime(""); setReminder(false);
  };

  const toggleDone   = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask   = (id: string) => save(tasks.filter(t => t.id !== id));
  const toggleRemind = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      if (!t.reminder) scheduleReminder(t);
      return { ...t, reminder: !t.reminder };
    });
    save(updated);
  };

  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const now = new Date();
  const todayLabel = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  // Группировка по времени суток
  function sectionTasks(range: number[]) {
    return tasks.filter(t => {
      if (!t.time) return false;
      const h = parseInt(t.time.split(":")[0]);
      return h >= range[0] && h < range[1];
    });
  }
  const noTimeTasks = tasks.filter(t => !t.time);

  return (
    <>
      {/* ── Кнопка в топбаре ── */}
      <button
        onClick={() => setOpen(true)}
        title="Мой день"
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-primary/[0.10] transition-colors relative aray-icon-spin"
      >
        <CalendarCheck className="w-4 h-4 text-muted-foreground" />
        {total > 0 && done < total && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
            {total - done}
          </span>
        )}
      </button>

      {/* ── Боковая панель ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed top-0 right-0 h-full z-[71] w-full max-w-sm flex flex-col"
            style={{
              background: "rgba(8, 12, 28, 0.90)",
              backdropFilter: "blur(32px) saturate(200%)",
              WebkitBackdropFilter: "blur(32px) saturate(200%)",
              borderLeft: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "-24px 0 64px rgba(0,0,0,0.40)",
            }}
          >
            {/* Шапка */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Мой день</p>
                <p className="text-sm font-medium text-white/80 capitalize mt-0.5">{todayLabel}</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Прогресс */}
            {total > 0 && (
              <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between text-[11px] text-white/40 mb-1.5">
                  <span>Выполнено {done} из {total}</span>
                  <span className="text-primary font-semibold">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.6))" }}
                  />
                </div>
              </div>
            )}

            {/* Список задач */}
            <div className="flex-1 overflow-y-auto py-2">
              {total === 0 && (
                <p className="text-center text-white/25 text-sm py-10">
                  Добавь первую задачу на сегодня 👇
                </p>
              )}

              {SECTIONS.map(sec => {
                const secTasks = sectionTasks(sec.range);
                if (secTasks.length === 0) return null;
                const isCollapsed = collapsed[sec.label];
                return (
                  <div key={sec.label} className="mb-1">
                    <button
                      onClick={() => setCollapsed(c => ({ ...c, [sec.label]: !c[sec.label] }))}
                      className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <sec.icon className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30 flex-1">
                        {sec.label}
                      </span>
                      <span className="text-[10px] text-white/20">{secTasks.length}</span>
                      {isCollapsed ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronUp className="w-3 h-3 text-white/20" />}
                    </button>
                    {!isCollapsed && secTasks.map(t => (
                      <TaskRow key={t.id} task={t}
                        onToggle={() => toggleDone(t.id)}
                        onDelete={() => deleteTask(t.id)}
                        onToggleReminder={() => toggleRemind(t.id)}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Без времени */}
              {noTimeTasks.length > 0 && (
                <div className="mb-1">
                  <div className="flex items-center gap-2 px-4 py-1.5">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Без времени</span>
                  </div>
                  {noTimeTasks.map(t => (
                    <TaskRow key={t.id} task={t}
                      onToggle={() => toggleDone(t.id)}
                      onDelete={() => deleteTask(t.id)}
                      onToggleReminder={() => toggleRemind(t.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Форма добавления */}
            <div className="shrink-0 p-4 space-y-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Текст задачи */}
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
                placeholder="Новая задача на сегодня..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none text-white placeholder:text-white/25"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              />

              {/* Время + Приоритет + Напоминание */}
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none text-white/70"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    colorScheme: "dark",
                  }}
                />

                {/* Приоритет */}
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none text-white/70"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    colorScheme: "dark",
                  }}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>

                {/* Напоминание */}
                <button
                  onClick={() => setReminder(r => !r)}
                  title="Push-напоминание"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all
                    ${reminder ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white/60"}`}
                  style={{ border: `1px solid ${reminder ? "hsl(var(--primary)/0.3)" : "rgba(255,255,255,0.08)"}` }}
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>

              {/* Добавить */}
              <button
                onClick={addTask}
                disabled={!text.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-30"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))",
                  boxShadow: "0 4px 16px hsl(var(--primary)/0.30)",
                }}
              >
                <Plus className="w-4 h-4" />
                Добавить задачу
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
