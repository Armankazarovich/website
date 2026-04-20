"use client";

/**
 * /admin/products/import-prices
 *
 * Импорт прайса от поставщика (Пилорус и т.д.).
 * CSV формат: секции с заголовком-категорией + подзаголовок колонок + строки данных.
 *
 * Flow:
 *   1. Вставить CSV → "Посмотреть изменения" → POST { csv, apply: false }
 *   2. Просмотреть diff: matched / unmatched / changed
 *   3. "Применить" → POST { csv, apply: true } → обновление БД
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileCheck, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface MatchedRow {
  section: string;
  sizeRaw: string;
  lengthRaw: string;
  fullSize: string;
  productName: string;
  variantSize: string;
  oldPricePerCube: number | null;
  oldPricePerPiece: number | null;
  newPricePerCube: number | null;
  newPricePerPiece: number | null;
  changed: boolean;
}

interface UnmatchedRow {
  section: string;
  sizeRaw: string;
  lengthRaw: string;
  fullSize: string;
  reason: string;
}

interface Report {
  ok: boolean;
  total: number;
  matched: number;
  changed: number;
  unmatched: number;
  sections: number;
  details: { matched: MatchedRow[]; unmatched: UnmatchedRow[] };
  applied?: boolean;
  updated?: number;
  errors?: string[];
  error?: string;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("ru-RU");
}

export default function ImportPricesPage() {
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [filter, setFilter] = useState<"all" | "changed" | "unchanged">("changed");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setReport(null);
    setConfirm(false);
  }

  async function preview() {
    if (!csv.trim()) return;
    setLoading(true);
    setReport(null);
    setConfirm(false);
    try {
      const res = await fetch("/api/admin/products/import-supplier-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, apply: false }),
      });
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setReport({ ok: false, error: String(e) } as Report);
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!csv.trim() || !report?.ok) return;
    setApplying(true);
    try {
      const res = await fetch("/api/admin/products/import-supplier-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, apply: true }),
      });
      const data = await res.json();
      setReport(data);
      setConfirm(false);
    } catch (e) {
      setReport({ ok: false, error: String(e) } as Report);
    } finally {
      setApplying(false);
    }
  }

  const matched = report?.details?.matched ?? [];
  const unmatched = report?.details?.unmatched ?? [];
  const visibleMatched =
    filter === "all" ? matched :
    filter === "changed" ? matched.filter((m) => m.changed) :
    matched.filter((m) => !m.changed);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Хедер */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Товары
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-semibold">Импорт цен от поставщика</h1>
        </div>
      </div>

      {/* Инструкция */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold mb-3 text-primary">Как пользоваться</h2>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Скачай прайс из Google Таблицы как CSV (Файл → Скачать → CSV) или скопируй содержимое</li>
          <li>Вставь CSV в поле ниже или загрузи файл</li>
          <li>Нажми <span className="text-foreground font-medium">«Посмотреть изменения»</span> — увидишь что обновится, что не найдено</li>
          <li>Если всё ок — нажми <span className="text-foreground font-medium">«Применить»</span> (обновит цены в БД)</li>
        </ol>
        <div className="mt-4 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/40">
          <b>Формат CSV:</b> заголовок секции (например «Обрезная доска 1 сорт ГОСТ»),
          затем строка с колонками (Сечение | Длина | Кол-во шт. в м³ | Цена за м3 | Цена за шт),
          затем строки с данными. Может быть много секций подряд.
        </div>
      </div>

      {/* Ввод CSV */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">CSV данные</h2>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-border hover:bg-primary/5 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>Загрузить файл</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setReport(null);
            setConfirm(false);
          }}
          placeholder={`Обрезная доска 1 сорт ГОСТ (Сосна/Ель),,,,
"Сечение, мм",Длина,"Кол-во, шт. в м³",Цена за м3,Цена за шт
25х100,6 метров,66,17000,258
25х150,6 метров,44,17000,386
...`}
          rows={14}
          className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border font-mono text-xs focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none"
        />
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            {csv.length > 0 ? `${csv.length.toLocaleString("ru-RU")} символов · ${csv.split("\n").length} строк` : "Пусто"}
          </div>
          <button
            onClick={preview}
            disabled={!csv.trim() || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            {loading ? "Анализирую..." : "Посмотреть изменения"}
          </button>
        </div>
      </div>

      {/* Ошибка */}
      {report && !report.ok && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-500">Ошибка</div>
            <div className="text-sm text-red-500/80">{report.error}</div>
          </div>
        </div>
      )}

      {/* Применено */}
      {report?.ok && report.applied && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-emerald-500">Готово</div>
            <div className="text-sm text-foreground mt-1">
              Обновлено <b>{report.updated}</b> вариантов.
              {report.errors && report.errors.length > 0 && (
                <> Ошибок: {report.errors.length}.</>
              )}
            </div>
            {report.errors && report.errors.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">Подробности ошибок</summary>
                <ul className="mt-2 space-y-1 text-red-500/80">
                  {report.errors.map((e, i) => <li key={i}>— {e}</li>)}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Отчёт */}
      {report?.ok && !report.applied && (
        <>
          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard label="Строк всего" value={report.total} />
            <StatCard label="Секций" value={report.sections} />
            <StatCard label="Сопоставлено" value={report.matched} color="primary" />
            <StatCard label="С изменениями" value={report.changed} color="emerald" />
            <StatCard label="Не найдено" value={report.unmatched} color={report.unmatched > 0 ? "amber" : undefined} />
          </div>

          {/* Unmatched */}
          {unmatched.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-amber-500">Не сопоставлено ({unmatched.length})</h3>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                Эти строки из CSV не удалось связать с товарами в базе. Цены для них НЕ будут обновлены.
              </div>
              <div className="max-h-60 overflow-auto border border-amber-500/20 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-amber-500/10 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Секция</th>
                      <th className="text-left px-3 py-2">Размер</th>
                      <th className="text-left px-3 py-2">Длина</th>
                      <th className="text-left px-3 py-2">Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatched.map((u, i) => (
                      <tr key={i} className="border-t border-amber-500/10">
                        <td className="px-3 py-2 max-w-[280px] truncate" title={u.section}>{u.section}</td>
                        <td className="px-3 py-2 font-mono">{u.sizeRaw}</td>
                        <td className="px-3 py-2">{u.lengthRaw || "—"}</td>
                        <td className="px-3 py-2 text-amber-500/80">{u.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matched с фильтром */}
          {matched.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Сопоставленные товары ({matched.length})</h3>
                <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
                  {(["changed", "unchanged", "all"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary/10"
                      }`}
                    >
                      {f === "changed" ? `Изменится (${matched.filter(m => m.changed).length})` :
                       f === "unchanged" ? `Без изменений (${matched.filter(m => !m.changed).length})` :
                       `Все (${matched.length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-3 py-2">Товар</th>
                      <th className="text-left px-3 py-2">Размер</th>
                      <th className="text-right px-3 py-2">Старая ₽/м³</th>
                      <th className="text-right px-3 py-2">Новая ₽/м³</th>
                      <th className="text-right px-3 py-2">Старая ₽/шт</th>
                      <th className="text-right px-3 py-2">Новая ₽/шт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMatched.map((m, i) => {
                      const cubeChanged = m.newPricePerCube !== null && m.newPricePerCube !== m.oldPricePerCube;
                      const pieceChanged = m.newPricePerPiece !== null && m.newPricePerPiece !== m.oldPricePerPiece;
                      return (
                        <tr
                          key={i}
                          className={`border-t border-border ${m.changed ? "bg-emerald-500/5" : ""}`}
                        >
                          <td className="px-3 py-2 max-w-[280px] truncate" title={m.productName}>{m.productName}</td>
                          <td className="px-3 py-2 font-mono">{m.variantSize}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{fmt(m.oldPricePerCube)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${cubeChanged ? "text-emerald-500" : ""}`}>{fmt(m.newPricePerCube)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{fmt(m.oldPricePerPiece)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${pieceChanged ? "text-emerald-500" : ""}`}>{fmt(m.newPricePerPiece)}</td>
                        </tr>
                      );
                    })}
                    {visibleMatched.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted-foreground py-6">
                          Пусто (попробуй другой фильтр)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Кнопка Применить */}
          {report.changed > 0 && (
            <div className="sticky bottom-4 z-20 bg-card border border-primary/30 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-foreground">
                  Готов применить {report.changed} изменений
                </div>
                <div className="text-xs text-muted-foreground">
                  Цены будут обновлены в базе. Действие нельзя откатить (только повторным импортом старых цен).
                </div>
              </div>
              {!confirm ? (
                <button
                  onClick={() => setConfirm(true)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
                >
                  Применить изменения
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirm(false)}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={apply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium disabled:opacity-50 hover:brightness-110 transition-all"
                  >
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {applying ? "Применяю..." : "Да, применить"}
                  </button>
                </div>
              )}
            </div>
          )}

          {report.changed === 0 && report.matched > 0 && (
            <div className="bg-muted/40 border border-border rounded-2xl p-4 text-center text-sm text-muted-foreground">
              Товары сопоставлены, но цены в CSV совпадают с базой — применять нечего.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "primary" | "emerald" | "amber";
}) {
  const colorClass =
    color === "primary" ? "text-primary" :
    color === "emerald" ? "text-emerald-500" :
    color === "amber" ? "text-amber-500" :
    "text-foreground";
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${colorClass}`}>{value.toLocaleString("ru-RU")}</div>
    </div>
  );
}
