"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileDown, Upload, FileSpreadsheet, CheckCircle2,
  AlertCircle, Loader2, Info, Download, Table2, CloudUpload,
  ChevronDown, ChevronUp, Copy, ExternalLink, Settings,
} from "lucide-react";

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors shrink-0"
    >
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}

type GSResult = { ok?: boolean; rows?: number; updated?: number; created?: number; errors?: string[]; error?: string; url?: string; email?: string };

// ─── Main component ───────────────────────────────────────────────────────────
export function ImportClient() {

  // ── Google Sheets state ──────────────────────────────────────────────────
  const [credsText, setCredsText] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsOk, setCredsOk] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetEmail, setSheetEmail] = useState("");
  const [lastSynced, setLastSynced] = useState("");
  const [gsLoading, setGsLoading] = useState<string | null>(null);
  const [gsResult, setGsResult] = useState<GSResult | null>(null);
  const [gsError, setGsError] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [scriptCode, setScriptCode] = useState("");

  // ── Excel state ──────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ updated: number; created: number; errors: string[] } | null>(null);
  const [xlError, setXlError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load config on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/google-sheets")
      .then((r) => r.json())
      .then((data) => {
        if (data.google_sheet_url) setSheetUrl(data.google_sheet_url);
        if (data.google_service_account_email) setSheetEmail(data.google_service_account_email);
        if (data.google_service_account_set) setCredsOk(true);
        if (data.google_sheet_synced_at)
          setLastSynced(new Date(data.google_sheet_synced_at).toLocaleString("ru"));
      })
      .catch(() => {});
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function extractId(urlOrId: string): string {
    const m = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : urlOrId.trim();
  }

  async function saveCreds() {
    try { JSON.parse(credsText); } catch { setGsError("Неверный JSON — скачайте JSON-ключ из Google Cloud Console"); return; }
    setSavingCreds(true); setGsError("");
    const res = await fetch("/api/admin/google-sheets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_credentials", credentials: credsText }),
    });
    const data = await res.json();
    setSavingCreds(false);
    if (data.ok) { setCredsOk(true); setCredsText(""); setShowCreds(false); }
    else setGsError(data.error ?? "Ошибка");
  }

  async function saveSheetId() {
    const id = extractId(sheetUrl);
    if (!id) { setGsError("Введите URL или ID таблицы"); return; }
    setGsError("");
    const res = await fetch("/api/admin/google-sheets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_sheet_id", sheetId: id, sheetUrl }),
    });
    const data = await res.json();
    if (!data.ok) setGsError(data.error ?? "Ошибка");
  }

  async function gsAction(action: string) {
    setGsLoading(action); setGsResult(null); setGsError("");
    try {
      const res = await fetch("/api/admin/google-sheets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.error) setGsError(data.error);
      else {
        setGsResult(data);
        if (data.url) setSheetUrl(data.url);
        if (data.email) setSheetEmail(data.email);
        setLastSynced(new Date().toLocaleString("ru"));
      }
    } catch (e: any) { setGsError(e.message); }
    setGsLoading(null);
  }

  async function loadScript() {
    setShowScript(true);
    if (scriptCode) return;
    const res = await fetch("/api/admin/google-sheets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_apps_script" }),
    });
    const data = await res.json();
    if (data.code) setScriptCode(data.code);
  }

  // ── Excel handlers ────────────────────────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".csv"))) { setFile(f); setResult(null); setXlError(null); }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setXlError(null); }
  };
  const handleImport = async () => {
    if (!file) return;
    setImporting(true); setResult(null); setXlError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/products/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) setXlError(data.error || `Ошибка ${res.status}`);
      else setResult(data);
    } catch { setXlError("Не удалось подключиться к серверу"); }
    finally { setImporting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Импорт / Экспорт товаров</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Синхронизация с Google Таблицами или загрузка Excel-файла
        </p>
      </div>

      {/* ══ Google Sheets ════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-emerald-500/5">
          <Table2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-semibold">Google Таблицы</h3>
            <p className="text-xs text-muted-foreground">Двусторонняя синхронизация — редактируйте прайс прямо в браузере</p>
          </div>
        </div>

        <div className="p-5 space-y-6">

          {/* Step 1 — Credentials */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">1</span>
                <span className="font-medium text-sm">Сервисный аккаунт Google</span>
                {credsOk && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Настроен
                    {sheetEmail && <span className="text-muted-foreground ml-1">({sheetEmail})</span>}
                  </span>
                )}
              </div>
              <button onClick={() => setShowCreds(!showCreds)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
                {showCreds ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {credsOk ? "Изменить" : "Настроить"}
              </button>
            </div>

            {showCreds && (
              <div className="space-y-3 bg-muted/40 rounded-xl p-4">
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Откройте <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-primary underline">Google Cloud Console</a></li>
                  <li>Включите <strong>Google Sheets API</strong> и <strong>Google Drive API</strong></li>
                  <li>Создайте <strong>Сервисный аккаунт</strong> → скачайте <strong>JSON-ключ</strong></li>
                  <li>Вставьте содержимое JSON-файла ниже:</li>
                </ol>
                <textarea
                  value={credsText}
                  onChange={(e) => setCredsText(e.target.value)}
                  placeholder={'{ "type": "service_account", "project_id": "...", "client_email": "...", ... }'}
                  rows={6}
                  className="w-full text-xs font-mono bg-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={saveCreds}
                  disabled={savingCreds || !credsText}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  Сохранить ключ
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — Sheet URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">2</span>
              <span className="font-medium text-sm">Таблица</span>
            </div>
            <div className="flex gap-2">
              <input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... или ID"
                className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
              />
              <button onClick={saveSheetId} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors shrink-0">
                Сохранить
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Нет таблицы? Создайте готовый шаблон одним кликом:</p>
            <button
              onClick={() => gsAction("create_template")}
              disabled={gsLoading === "create_template" || !credsOk}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              {gsLoading === "create_template" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              Создать шаблон в Google Таблицах
            </button>
            {gsResult?.url && (
              <a href={gsResult.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-primary underline">
                <ExternalLink className="w-3 h-3" /> Открыть таблицу
              </a>
            )}
          </div>

          {/* Step 3 — Sync buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">3</span>
              <span className="font-medium text-sm">Синхронизация</span>
              {lastSynced && <span className="text-xs text-muted-foreground ml-1">• последняя: {lastSynced}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => gsAction("sync_to_sheet")}
                disabled={!!gsLoading || !credsOk || !sheetUrl}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gsLoading === "sync_to_sheet"
                  ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  : <CloudUpload className="w-6 h-6 text-primary" />}
                <span className="text-sm font-medium">Сайт → Таблица</span>
                <span className="text-xs text-muted-foreground text-center">Выгрузить все товары</span>
              </button>
              <button
                onClick={() => gsAction("sync_from_sheet")}
                disabled={!!gsLoading || !credsOk || !sheetUrl}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gsLoading === "sync_from_sheet"
                  ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  : <Download className="w-6 h-6 text-primary" />}
                <span className="text-sm font-medium">Таблица → Сайт</span>
                <span className="text-xs text-muted-foreground text-center">Применить изменения</span>
              </button>
            </div>
          </div>

          {/* Result */}
          {gsError && (
            <div className="flex items-start gap-2 bg-red-500/10 text-red-600 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{gsError}</span>
            </div>
          )}
          {gsResult && !gsError && (
            <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm space-y-0.5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Успешно
              </div>
              {gsResult.rows !== undefined && <p>{gsResult.rows} строк обновлено в таблице</p>}
              {gsResult.created !== undefined && <p>Создано товаров: {gsResult.created}</p>}
              {gsResult.updated !== undefined && <p>Обновлено товаров: {gsResult.updated}</p>}
              {gsResult.errors?.length ? (
                <details className="mt-1 text-xs text-red-600 cursor-pointer">
                  <summary>Ошибки ({gsResult.errors.length})</summary>
                  <ul className="mt-1 space-y-0.5">{gsResult.errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
                </details>
              ) : null}
            </div>
          )}

          {/* Step 4 — Apps Script realtime */}
          <div className="border-t border-border pt-4">
            <button
              onClick={loadScript}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              {showScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Авто-синхронизация в реальном времени (Apps Script)
            </button>

            {showScript && (
              <div className="mt-3 space-y-2">
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>В вашей таблице: <strong>Расширения → Apps Script</strong></li>
                  <li>Вставьте код ниже и сохраните</li>
                  <li><strong>Триггеры → + Добавить → Функция onEdit → При редактировании</strong></li>
                  <li>Теперь при изменении цены в таблице — сайт обновится автоматически</li>
                </ol>
                {scriptCode ? (
                  <div className="relative">
                    <pre className="text-xs bg-muted rounded-xl p-4 overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed">{scriptCode}</pre>
                    <div className="absolute top-2 right-2"><CopyBtn text={scriptCode} /></div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground animate-pulse py-4 text-center">Загрузка...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Excel / CSV ═══════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileDown className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Excel / CSV</h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/products/export"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать Excel (.xlsx)
          </a>
          <a
            href="/api/admin/products/export?format=csv"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Скачать CSV
          </a>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · Нажмите чтобы заменить</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">Перетащите .xlsx или .csv</p>
              <p className="text-xs">или нажмите для выбора файла</p>
            </div>
          )}
        </div>

        {result && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Импорт завершён
            </div>
            <p className="text-sm text-muted-foreground">
              Обновлено: <strong>{result.updated}</strong> &nbsp;·&nbsp; Создано: <strong>{result.created}</strong>
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                {result.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}

        {xlError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {xlError}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? "Импортируем..." : "Применить импорт"}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Безопасно:</strong> Импорт только обновляет и добавляет товары — не удаляет существующие.</p>
          <p><strong className="text-foreground">Slug:</strong> Автоматически генерируется из названия на латинице. Используется как ключ для upsert.</p>
          <p><strong className="text-foreground">Apps Script:</strong> При изменении цены в Google Таблице — сайт обновляется в течение секунд.</p>
        </div>
      </div>
    </div>
  );
}
