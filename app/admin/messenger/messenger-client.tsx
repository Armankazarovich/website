"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckSquare,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { buildArayBusinessMessengerText } from "@/lib/aray-business-messenger";
import { cn } from "@/lib/utils";

type MessengerActivity = {
  id: string;
  type: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
};

type MessengerThread = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string;
  stage: string;
  value: string | null;
  currency: string;
  comment: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string | null; email: string | null } | null;
  activities: MessengerActivity[];
  activityCount: number;
  lastActivityText: string;
  lastActivityAt: string;
};

type MessengerResponse = {
  threads: MessengerThread[];
  stats?: { threads: number; open: number };
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONTACTED: "На связи",
  QUALIFIED: "Проверен",
  MEETING: "Встреча",
  PROPOSAL: "КП",
  NEGOTIATION: "Обсуждение",
  WON: "Выигран",
  LOST: "Потерян",
  DEFERRED: "Отложен",
  RECURRING: "Повторный",
};

const QUICK_DRAFTS = [
  "Здравствуйте. Подскажите, пожалуйста, удобное время для связи.",
  "Здравствуйте. Пришлите, пожалуйста, адрес и нужный объем.",
  "Здравствуйте. Я проверю наличие и вернусь с точным расчетом.",
];

const actionButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary disabled:pointer-events-none disabled:opacity-45";

const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary/60 hover:text-primary disabled:pointer-events-none disabled:opacity-45";

function stripPrefix(text: string) {
  return text.replace(/^(Менеджер|Клиент|ARAY Story Chat|ARAY|Система)\s*:\s*/i, "").trim();
}

function getDirection(activity: MessengerActivity) {
  const text = activity.text.trim();
  if (/^Клиент\s*:/i.test(text)) return "client";
  if (/^ARAY Story Chat\s*:/i.test(text)) return "client";
  if (/^ARAY\s*:/i.test(text)) return "aray";
  if (/^Система\s*:/i.test(text) || activity.type === "SYSTEM") return "system";
  return "manager";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function threadSubtitle(thread: MessengerThread) {
  return [thread.phone, thread.email, thread.company].filter(Boolean).join(" · ") || "CRM-диалог";
}

function createArayContext(thread: MessengerThread) {
  const recent = thread.activities
    .slice(-8)
    .map((activity) => {
      const direction = getDirection(activity);
      const speaker =
        direction === "client" ? "Клиент" :
        direction === "manager" ? "Менеджер" :
        direction === "aray" ? "ARAY" :
        "Система";
      return `${speaker}: ${stripPrefix(activity.text)}`;
    })
    .join("\n");

  return [
    "Раздел: ARAY Messenger.",
    `Клиент: ${thread.name}.`,
    thread.phone ? `Телефон: ${thread.phone}.` : null,
    thread.email ? `Почта: ${thread.email}.` : null,
    thread.company ? `Компания: ${thread.company}.` : null,
    `Статус CRM: ${STAGE_LABELS[thread.stage] || thread.stage}.`,
    recent ? `Последние сообщения:\n${recent}` : null,
    "Задача: помогай в переписке, формулируй сообщения по-человечески, без воды и без агрессии.",
    "Ничего не отправляй наружу без подтверждения человека.",
  ].filter(Boolean).join("\n");
}

export function AdminMessengerClient({ staffName }: { staffName: string }) {
  const searchParams = useSearchParams();
  const selectedLeadId = searchParams.get("leadId") || "";
  const [threads, setThreads] = useState<MessengerThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(selectedLeadId || null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newThread, setNewThread] = useState({ name: "", phone: "", message: "" });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedId) || threads[0] || null,
    [selectedId, threads],
  );

  const fetchThreads = useCallback(async (query = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (selectedLeadId) params.set("leadId", selectedLeadId);
      const res = await fetch(`/api/admin/messenger/threads?${params.toString()}`, { cache: "no-store" });
      const data: MessengerResponse = await res.json();
      if (!res.ok) throw new Error((data as any).error || "Не удалось открыть мессенджер");
      setThreads(data.threads || []);
      setSelectedId((current) => {
        if (current && data.threads?.some((thread) => thread.id === current)) return current;
        return data.threads?.[0]?.id || null;
      });
    } catch (error: any) {
      setStatus(error?.message || "Не удалось загрузить диалоги");
    } finally {
      setLoading(false);
    }
  }, [search, selectedLeadId]);

  useEffect(() => {
    if (selectedLeadId) setSelectedId(selectedLeadId);
  }, [selectedLeadId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchThreads(search);
    }, search ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchThreads, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selected?.activities.length, selectedId]);

  const replaceThread = useCallback((thread: MessengerThread) => {
    setThreads((current) => {
      const without = current.filter((item) => item.id !== thread.id);
      return [thread, ...without];
    });
    setSelectedId(thread.id);
  }, []);

  const postMessage = useCallback(async (direction: "manager" | "client" | "aray" | "system", text: string) => {
    if (!selected) return null;
    const clean = text.trim();
    if (!clean) return null;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/messenger/threads/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, text: clean }),
      });
      const data: { thread?: MessengerThread; delivery?: { message?: string }; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Сообщение не сохранено");
      if (!data.thread) throw new Error("Сообщение не сохранено");
      replaceThread(data.thread);
      return { thread: data.thread, delivery: data.delivery };
    } catch (error: any) {
      setStatus(error?.message || "Сообщение не сохранено");
      return null;
    } finally {
      setSending(false);
    }
  }, [replaceThread, selected]);

  const sendManagerMessage = useCallback(async () => {
    const saved = await postMessage("manager", draft);
    if (saved) {
      setDraft("");
      setStatus(saved.delivery?.message || "Ответ сохранён в CRM. Внешний канал подключим через провайдера связи.");
    }
  }, [draft, postMessage]);

  const saveClientMessage = useCallback(async () => {
    const saved = await postMessage("client", draft);
    if (saved) {
      setDraft("");
      setStatus(saved.delivery?.message || "Входящее сообщение добавлено");
    }
  }, [draft, postMessage]);

  const createThread = useCallback(async () => {
    const name = newThread.name.trim();
    if (!name) {
      setStatus("Укажи имя клиента или название диалога");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/messenger/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newThread),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Диалог не создан");
      replaceThread(data.thread);
      setNewThread({ name: "", phone: "", message: "" });
      setNewOpen(false);
      setStatus("Новый диалог создан");
    } catch (error: any) {
      setStatus(error?.message || "Диалог не создан");
    } finally {
      setSending(false);
    }
  }, [newThread, replaceThread]);

  const polishDraft = useCallback(() => {
    if (!selected) return;
    const next = buildArayBusinessMessengerText({
      text: draft || "Напиши короткий деловой ответ клиенту.",
      kind: "offer",
    });
    setDraft(next);
    setStatus("Арай оформил текст. Проверь и отправь сам.");
  }, [draft, selected]);

  const askAray = useCallback(() => {
    if (!selected) return;
    const prompt = draft.trim()
      ? `Помоги с этим сообщением клиенту ${selected.name}: ${draft.trim()}`
      : `Открой режим мессенджера и помоги по диалогу с клиентом ${selected.name}`;
    window.dispatchEvent(new CustomEvent("aray:prompt", {
      detail: {
        text: prompt,
        displayText: draft.trim() ? "Арай, помоги с ответом" : "Арай, помоги с диалогом",
        context: createArayContext(selected),
        actions: [
          { type: "navigate", url: `/admin/messenger?leadId=${selected.id}`, label: "Мессенджер", icon: "prompt" },
          { type: "navigate", url: `/admin/crm?leadId=${selected.id}`, label: "CRM", icon: "target" },
          { type: "navigate", url: "/admin/tasks", label: "Задачи", icon: "settings" },
        ],
      },
    }));
    setStatus("Арай открыт рядом с этим диалогом");
  }, [draft, selected]);

  const createTask = useCallback(async () => {
    if (!selected) return;
    const title = `Связаться: ${selected.name}`;
    const description = draft.trim() || stripPrefix(selected.lastActivityText) || `Проверить диалог ${selected.name}`;
    setSending(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority: "MEDIUM",
          relations: [
            {
              entityType: "LEAD",
              entityId: selected.id,
              label: selected.name,
              href: `/admin/messenger?leadId=${selected.id}`,
            },
          ],
          tags: ["messenger", "aray"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Задача не создана");
      await postMessage("system", `Создана задача: ${title}`);
      setStatus("Задача создана и связана с диалогом");
    } catch (error: any) {
      setStatus(error?.message || "Задача не создана");
    } finally {
      setSending(false);
    }
  }, [draft, postMessage, selected]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            ARAY Messenger
          </div>
          <h1 className="text-2xl font-bold tracking-normal text-foreground">Бизнес-чат</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Переписка, CRM, задачи и Арай рядом. Люди пишут сами, Арай помогает оформить смысл и не делает важные действия без подтверждения.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={actionButton} type="button" onClick={() => setNewOpen((value) => !value)}>
            <Plus className="h-4 w-4" />
            Диалог
          </button>
          <button className={iconButton} type="button" onClick={() => void fetchThreads()} disabled={loading} aria-label="Обновить">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {newOpen && (
        <section className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-[1fr_180px_1.2fr_auto] md:items-end">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Клиент</span>
            <input
              value={newThread.name}
              onChange={(event) => setNewThread((current) => ({ ...current, name: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              placeholder="Имя или компания"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Телефон</span>
            <input
              value={newThread.phone}
              onChange={(event) => setNewThread((current) => ({ ...current, phone: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              placeholder="+7..."
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Первое сообщение</span>
            <input
              value={newThread.message}
              onChange={(event) => setNewThread((current) => ({ ...current, message: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              placeholder="Что написал клиент"
            />
          </label>
          <button className={actionButton} type="button" onClick={createThread} disabled={sending}>
            Создать
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_310px]">
        <aside className="flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary"
                placeholder="Клиент, телефон, текст..."
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading && threads.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Открываю диалоги
              </div>
            ) : threads.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="h-9 w-9 text-primary" />
                Диалогов пока нет. Создай первый чат или дождись заявки со сторис.
              </div>
            ) : (
              threads.map((thread) => {
                const active = selected?.id === thread.id;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn(
                      "mb-2 w-full rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-transparent bg-background hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-foreground">{thread.name}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortTime(thread.lastActivityAt)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{threadSubtitle(thread)}</span>
                        <span className="mt-2 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                          {stripPrefix(thread.lastActivityText) || "История пока пустая"}
                        </span>
                        <span className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {STAGE_LABELS[thread.stage] || thread.stage}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-border bg-card">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-foreground">{selected.name}</h2>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {STAGE_LABELS[selected.stage] || selected.stage}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{threadSubtitle(selected)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className={actionButton} type="button" onClick={askAray}>
                    <Bot className="h-4 w-4" />
                    Арай рядом
                  </button>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className={iconButton} aria-label="Позвонить клиенту">
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className={iconButton} aria-label="Написать на почту">
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  <Link href={`/admin/crm?leadId=${selected.id}`} className={actionButton}>
                    CRM
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                {selected.activities.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    История пока пустая. Напиши первый ответ или зафиксируй входящее.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selected.activities.map((activity) => {
                      const direction = getDirection(activity);
                      const assistant = direction === "aray" || direction === "system";
                      const fromClient = direction === "client";
                      return (
                        <div
                          key={activity.id}
                          className={cn(
                            "flex",
                            fromClient ? "justify-start" : assistant ? "justify-center" : "justify-end",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[82%] rounded-3xl border px-4 py-3 text-sm leading-6",
                              fromClient && "border-border bg-background text-foreground",
                              direction === "manager" && "border-primary/35 bg-primary/10 text-foreground",
                              assistant && "border-border bg-muted/30 text-muted-foreground",
                            )}
                          >
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              {direction === "client" ? "Клиент" : direction === "manager" ? staffName : direction === "aray" ? "ARAY" : "Система"}
                              <span className="normal-case tracking-normal">{formatTime(activity.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words">{stripPrefix(activity.text)}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {QUICK_DRAFTS.map((text) => (
                    <button
                      key={text}
                      type="button"
                      className="shrink-0 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                      onClick={() => setDraft(text)}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <button className={iconButton} type="button" onClick={polishDraft} disabled={sending} aria-label="Оформить текст">
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendManagerMessage();
                      }
                    }}
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                    placeholder="Написать клиенту или попросить Арая оформить смысл..."
                    rows={1}
                  />
                  <button className={iconButton} type="button" onClick={askAray} disabled={sending} aria-label="Позвать Арая">
                    <Bot className="h-4 w-4" />
                  </button>
                  <button className={iconButton} type="button" onClick={sendManagerMessage} disabled={sending || !draft.trim()} aria-label="Сохранить ответ в CRM">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button className={actionButton} type="button" onClick={saveClientMessage} disabled={sending || !draft.trim()}>
                    <MessageSquare className="h-4 w-4" />
                    Записать входящее
                  </button>
                  <button className={actionButton} type="button" onClick={createTask} disabled={sending}>
                    <CheckSquare className="h-4 w-4" />
                    Задача
                  </button>
                  {status && <span className="text-sm text-muted-foreground">{status}</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 text-primary" />
              <p className="text-sm">Выбери диалог или создай новый.</p>
            </div>
          )}
        </main>

        <aside className="hidden min-h-[520px] flex-col overflow-hidden rounded-3xl border border-border bg-card xl:flex">
          <div className="border-b border-border p-4">
            <h3 className="text-base font-bold text-foreground">Контекст</h3>
            <p className="mt-1 text-sm text-muted-foreground">То, что Арай учитывает в переписке.</p>
          </div>
          {selected ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <UserCircle className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{selected.name}</span>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {selected.phone}
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {selected.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {selected.activityCount} событий
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  Как работает
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Менеджер может писать сам. Арай помогает оформить, смягчить, перевести смысл, создать задачу и открыть CRM, но не отправляет важное без человека.
                </p>
              </div>

              <div className="grid gap-2">
                <button className={actionButton} type="button" onClick={askAray}>
                  <Bot className="h-4 w-4" />
                  Открыть с Араем
                </button>
                <button className={actionButton} type="button" onClick={createTask} disabled={sending}>
                  <CheckSquare className="h-4 w-4" />
                  Создать задачу
                </button>
                <Link href={`/admin/crm?leadId=${selected.id}`} className={actionButton}>
                  CRM-карточка
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Выбери диалог.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
