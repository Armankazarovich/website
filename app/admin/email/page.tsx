"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  Settings,
  Users,
  CheckCircle,
  Loader2,
  AlertCircle,
  TestTube2,
  ChevronDown,
  ChevronUp,
  Upload,
} from "lucide-react";

type Subscriber = {
  email: string;
  name: string;
  source: string;
  date: string;
};

type SmtpConfig = {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_from_name: string;
};

type Tab = "send" | "smtp" | "subscribers";
type Segment = "all" | "registered" | "order";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "send", label: "Рассылка", icon: Send },
  { key: "smtp", label: "SMTP настройки", icon: Settings },
  { key: "subscribers", label: "Подписчики", icon: Users },
];

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "registered", label: "Зарегистрированные" },
  { key: "order", label: "Покупатели" },
];

const fmt = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("send");

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsLoaded, setSubsLoaded] = useState(false);

  // Send tab state
  const [segment, setSegment] = useState<Segment>("all");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; errors: string[] } | null>(null);
  const [sendError, setSendError] = useState("");

  // SMTP tab state
  const [smtp, setSmtp] = useState<SmtpConfig>({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    smtp_from_name: "ПилоРус",
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);

  // Import state
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Load subscribers
  const loadSubscribers = async () => {
    setSubsLoading(true);
    try {
      const res = await fetch("/api/admin/email");
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
        setSubsLoaded(true);
      }
    } finally {
      setSubsLoading(false);
    }
  };

  // Load SMTP settings
  const loadSmtp = async () => {
    setSmtpLoading(true);
    try {
      const res = await fetch("/api/admin/email?action=smtp_settings");
      const data = await res.json();
      setSmtp((prev) => ({ ...prev, ...data }));
      setSmtpLoaded(true);
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    if (!subsLoaded) loadSubscribers();
  }, []);

  useEffect(() => {
    if (tab === "smtp" && !smtpLoaded) loadSmtp();
  }, [tab]);

  // Filtered recipients
  const filteredSubscribers =
    segment === "all"
      ? subscribers
      : subscribers.filter((s) => s.source === segment);

  const recipients = filteredSubscribers.map((s) => s.email);

  // Send handler
  const handleSend = async () => {
    setSendError("");
    setSendResult(null);
    if (!subject.trim()) { setSendError("Укажите тему письма"); return; }
    if (!html.trim()) { setSendError("Напишите текст письма"); return; }
    if (recipients.length === 0) { setSendError("Нет получателей в выбранном сегменте"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", subject, html, recipients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");
      setSendResult(data);
      setSubject("");
      setHtml("");
      setShowPreview(false);
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  // Save SMTP
  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpSaved(false);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_smtp", ...smtp }),
      });
      const data = await res.json();
      if (data.ok) setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 3000);
    } finally {
      setSmtpSaving(false);
    }
  };

  // Test SMTP
  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_smtp" }),
      });
      const data = await res.json();
      setSmtpTestResult(data);
    } finally {
      setSmtpTesting(false);
    }
  };

  // Import emails
  const handleImport = async () => {
    const emails = importText
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (!emails.length) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_emails", emails }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult(`Добавлено адресов: ${data.count}`);
        setImportText("");
        await loadSubscribers();
      }
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Email рассылка</h1>
          <p className="text-sm text-muted-foreground">
            Рассылка по клиентам, SMTP настройки и база подписчиков
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === "subscribers" && subscribers.length > 0 && (
              <span className="ml-0.5 text-xs text-primary">({subscribers.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Рассылка ── */}
      {tab === "send" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-base">Новая рассылка</h2>

          {/* Segment filter */}
          <div>
            <Label className="mb-2 block">Получатели</Label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => {
                const count =
                  s.key === "all"
                    ? subscribers.length
                    : subscribers.filter((sub) => sub.source === s.key).length;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSegment(s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      segment === s.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {s.label}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        segment === s.key
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {subsLoading && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Загрузка подписчиков...
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <Label className="mb-1 block">Тема письма *</Label>
            <Input
              placeholder="Например: Акция на обрезную доску — скидка 15%!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          {/* HTML Body */}
          <div>
            <Label className="mb-1 block">Текст письма (HTML) *</Label>
            <textarea
              className="w-full min-h-[200px] rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y font-mono"
              placeholder="<p>Добрый день!</p><p>Хотим сообщить вам о нашей новой акции...</p>"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              disabled={sending}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Поддерживается HTML-форматирование: теги &lt;p&gt;, &lt;b&gt;, &lt;a&gt;, &lt;ul&gt; и др.
            </p>
          </div>

          {/* Preview toggle */}
          {html && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPreview ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {showPreview ? "Скрыть предпросмотр" : "Показать предпросмотр"}
              </button>
              {showPreview && (
                <div className="mt-2 border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2 text-xs text-muted-foreground border-b border-border">
                    Предпросмотр: <span className="font-medium text-foreground">{subject || "(без темы)"}</span>
                  </div>
                  <div
                    className="p-4 bg-white text-gray-900 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error / Result */}
          {sendError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {sendError}
            </div>
          )}
          {sendResult && (
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" />
                Рассылка завершена: отправлено {sendResult.sent} писем
              </div>
              {sendResult.errors.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-destructive">Ошибки ({sendResult.errors.length}):</p>
                  {sendResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                  {sendResult.errors.length > 5 && (
                    <p>... и ещё {sendResult.errors.length - 5}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || recipients.length === 0}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Отправить {recipients.length} получателям
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── Tab: SMTP настройки ── */}
      {tab === "smtp" && (
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Для Яндекс Почты:</strong> smtp.yandex.ru, порт 587, включите доступ по паролю приложения в настройках почты.
            </p>
            <p>Пароль приложения генерируется в разделе «Безопасность» аккаунта Яндекс — используйте его вместо обычного пароля.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold">Параметры SMTP</h2>

            {smtpLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка настроек...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">SMTP сервер</Label>
                  <Input
                    placeholder="smtp.yandex.ru"
                    value={smtp.smtp_host}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Порт</Label>
                  <Input
                    placeholder="587"
                    value={smtp.smtp_port}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Логин (email)</Label>
                  <Input
                    placeholder="email@yandex.ru"
                    value={smtp.smtp_user}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Пароль приложения</Label>
                  <Input
                    type="password"
                    placeholder="Пароль приложения"
                    value={smtp.smtp_pass}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_pass: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Email отправителя</Label>
                  <Input
                    placeholder="email@yandex.ru"
                    value={smtp.smtp_from}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_from: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Обычно совпадает с логином</p>
                </div>
                <div>
                  <Label className="mb-1 block">Имя отправителя</Label>
                  <Input
                    placeholder="ПилоРус"
                    value={smtp.smtp_from_name}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_from_name: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Test result */}
            {smtpTestResult && (
              <div
                className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
                  smtpTestResult.ok
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {smtpTestResult.ok ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {smtpTestResult.message || smtpTestResult.error}
              </div>
            )}

            {smtpSaved && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" /> Настройки сохранены
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button onClick={handleSaveSmtp} disabled={smtpSaving || smtpLoading}>
                {smtpSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" /> Сохранить
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestSmtp}
                disabled={smtpTesting || smtpLoading}
              >
                {smtpTesting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Проверка...</>
                ) : (
                  <>
                    <TestTube2 className="w-4 h-4 mr-2" /> Проверить подключение
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Подписчики ── */}
      {tab === "subscribers" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
                <span className="text-muted-foreground">Всего: </span>
                <span className="font-bold text-primary">{subscribers.length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
                <span className="text-muted-foreground">Зарег.: </span>
                <span className="font-bold">{subscribers.filter((s) => s.source === "registered").length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
                <span className="text-muted-foreground">Покупатели: </span>
                <span className="font-bold">{subscribers.filter((s) => s.source === "order").length}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadSubscribers} disabled={subsLoading}>
              {subsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Обновить"}
            </Button>
          </div>

          {/* Subscribers table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {subsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Email</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Имя</th>
                      <th className="text-center px-4 py-3 font-semibold">Источник</th>
                      <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscribers.map((s) => (
                      <tr key={s.email} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{s.email}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {s.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.source === "registered" ? (
                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-medium">
                              Зарегистрирован
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 rounded-full text-xs font-medium">
                              Покупатель
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                          {fmt(s.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subscribers.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Нет подписчиков</p>
                )}
              </div>
            )}
          </div>

          {/* Import */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              Добавить emails вручную
            </h3>
            <p className="text-xs text-muted-foreground">
              Вставьте список email-адресов, по одному на строку
            </p>
            <textarea
              className="w-full h-28 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-mono"
              placeholder={"example@mail.ru\nclient@yandex.ru\nanother@gmail.com"}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            {importResult && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" /> {importResult}
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={importLoading || !importText.trim()}
            >
              {importLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Добавление...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Добавить</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
