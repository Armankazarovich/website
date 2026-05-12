"use client";
import { useState, useEffect } from "react";
import {
  Truck,
  Pencil,
  Check,
  X,
  Loader2,
  Calculator,
  Plus,
  Trash2,
  Star,
  AlertTriangle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
type Rate = {
  id: string;
  vehicleName: string;
  payload: string;
  maxVolume: number;
  basePrice: number;
};
const emptyNew = { vehicleName: "", payload: "", maxVolume: "", basePrice: "" };
export default function DeliveryRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Rate>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null); // Add new rate state
  const [showAdd, setShowAdd] = useState(false);
  const [newRate, setNewRate] = useState(emptyNew);
  const [addSaving, setAddSaving] = useState(false); // Calculator state
  const [calcVolume, setCalcVolume] = useState("");
  const [calcResult, setCalcResult] = useState<Rate[]>([]);
  const [calcDone, setCalcDone] = useState(false);
  const loadRates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/delivery-rates");
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data?.error || "Не удалось загрузить тарифы");
      if (!Array.isArray(data))
        throw new Error("API тарифов вернул неожиданный ответ");
      setRates(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить тарифы",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadRates();
  }, []);
  const startEdit = (rate: Rate) => {
    setEditingId(rate.id);
    setEditValues({
      vehicleName: rate.vehicleName,
      payload: rate.payload,
      maxVolume: rate.maxVolume,
      basePrice: rate.basePrice,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };
  const saveEdit = async (id: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/delivery-rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      const updated = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(updated?.error || "Не удалось сохранить тариф");
      setRates((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить тариф",
      );
    } finally {
      setSaving(false);
    }
  };
  const deleteRate = async () => {
    if (!confirmDeleteId) return;
    const targetId = confirmDeleteId;
    setDeleting(confirmDeleteId);
    setError("");
    try {
      const res = await fetch(`/api/admin/delivery-rates?id=${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Не удалось удалить тариф");
      setRates((prev) => prev.filter((r) => r.id !== targetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить тариф");
    } finally {
      setDeleting(null);
      setConfirmDeleteId(null);
    }
  };
  const saveNew = async () => {
    if (
      !newRate.vehicleName ||
      !newRate.payload ||
      !newRate.maxVolume ||
      !newRate.basePrice
    )
      return;
    setAddSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/delivery-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleName: newRate.vehicleName,
          payload: newRate.payload,
          maxVolume: Number(newRate.maxVolume),
          basePrice: Number(newRate.basePrice),
        }),
      });
      const created = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(created?.error || "Не удалось добавить тариф");
      setRates((prev) => [...prev, created]);
      setNewRate(emptyNew);
      setShowAdd(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось добавить тариф",
      );
    } finally {
      setAddSaving(false);
    }
  };
  const calculate = () => {
    const vol = parseFloat(calcVolume);
    if (!vol || vol <= 0) {
      setCalcResult([]);
      setCalcDone(false);
      return;
    }
    const suitable = rates
      .filter((r) => r.maxVolume >= vol)
      .sort((a, b) => a.basePrice - b.basePrice);
    setCalcResult(suitable);
    setCalcDone(true);
  };
  return (
    <div className="admin-page-frame admin-page-frame-readable">

      <div className="flex items-center gap-2 min-w-0">

        <Truck className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl break-words">
          Тарифы доставки
        </h1>
      </div>
      {error && (
        <div className="flex flex-col gap-3 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-2xl sm:flex-row sm:items-center">

          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium break-words">
            {error}
          </p>
          <button
            onClick={loadRates}
            className="text-xs text-primary hover:underline shrink-0 sm:ml-auto"
          >
            Повторить
          </button>
        </div>
      )}
      {/* Calculator */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">

        <div className="flex items-center gap-2">

          <Calculator className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Калькулятор доставки</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Введите объём заказа чтобы подобрать подходящий транспорт
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">

          <div className="relative w-full sm:w-auto">

            <input
              type="number"
              min={0.1}
              step={0.1}
              placeholder="Объём"
              value={calcVolume}
              onChange={(e) => {
                setCalcVolume(e.target.value);
                setCalcDone(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && calculate()}
              className="w-full px-3 py-2 pr-9 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              м³
            </span>
          </div>
          <button
            onClick={calculate}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors sm:w-auto"
          >

            <Calculator className="w-3.5 h-3.5" /> Рассчитать
          </button>
        </div>
        {calcDone && calcResult.length > 0 && (
          <div className="space-y-2">

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">

              Подходящие варианты для {calcVolume} м³:
            </p>
            {calcResult.map((r, i) => (
              <div
                key={r.id}
                className={`flex flex-col gap-2 px-4 py-3 rounded-xl border transition-colors sm:flex-row sm:items-center sm:justify-between ${i === 0 ? "bg-primary/15 border-primary/30" : "bg-muted/30 border-border"}`}
              >

                <div className="min-w-0">

                  <p
                    className={`font-semibold text-sm ${i === 0 ? "text-primary" : ""}`}
                  >

                    {i === 0 && (
                      <Star className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
                    )}
                    {r.vehicleName}
                    {i === 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        — оптимальный
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.payload} · до {r.maxVolume} м³
                  </p>
                </div>
                <p className="font-bold text-base shrink-0">
                  {r.basePrice.toLocaleString("ru-RU")} ₽
                </p>
              </div>
            ))}
          </div>
        )}
        {calcDone && calcResult.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 rounded-xl flex items-start gap-2 break-words">

            <AlertTriangle className="w-4 h-4 shrink-0" /> Объём {calcVolume} м³
            превышает вместимость любого транспорта. Потребуется несколько
            рейсов или уточните у логиста.
          </p>
        )}
      </div>
      {/* Rates table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">

        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">

          <h2 className="font-semibold">Прайс-лист транспорта</h2>
          <button
            onClick={() => {
              setShowAdd(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >

            <Plus className="w-3.5 h-3.5" /> Добавить
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">

            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm min-w-[640px]">

              <thead className="bg-muted/50">

                <tr>

                  <th className="text-left px-4 py-3 font-semibold">
                    Автотранспорт
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Грузоподъёмность
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Вместимость
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Цена (от)
                  </th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">

                {rates.map((rate) => {
                  const isEditing = editingId === rate.id;
                  return (
                    <tr
                      key={rate.id}
                      className={
                        isEditing
                          ? "bg-primary/15"
                          : "hover:bg-primary/[0.04] transition-colors"
                      }
                    >

                      <td className="px-4 py-3">

                        {isEditing ? (
                          <input
                            value={editValues.vehicleName ?? ""}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                vehicleName: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        ) : (
                          <span className="font-medium">
                            {rate.vehicleName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">

                        {isEditing ? (
                          <input
                            value={editValues.payload ?? ""}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                payload: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                          />
                        ) : (
                          rate.payload
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">

                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-center">

                            <span className="text-xs text-muted-foreground">
                              до
                            </span>
                            <input
                              type="number"
                              value={editValues.maxVolume ?? ""}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  maxVolume: Number(e.target.value),
                                }))
                              }
                              className="w-16 px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                            />
                            <span className="text-xs text-muted-foreground">
                              м³
                            </span>
                          </div>
                        ) : (
                          `до ${rate.maxVolume} м³`
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">

                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">

                            <input
                              type="number"
                              value={editValues.basePrice ?? ""}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  basePrice: Number(e.target.value),
                                }))
                              }
                              className="w-24 px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                            />
                            <span className="text-xs text-muted-foreground">
                              ₽
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-primary">
                            {rate.basePrice.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">

                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">

                            <button
                              onClick={() => saveEdit(rate.id)}
                              disabled={saving}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50"
                            >

                              {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="p-1.5 text-muted-foreground hover:bg-primary/[0.07] rounded-xl transition-colors"
                            >

                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">

                            <button
                              onClick={() => startEdit(rate)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-primary/[0.07] rounded-xl transition-colors"
                            >

                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(rate.id)}
                              disabled={deleting === rate.id}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                            >

                              {deleting === rate.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Add new row */}
                {showAdd && (
                  <tr className="bg-primary/5 border-t-2 border-primary/20">

                    <td className="px-4 py-3">

                      <input
                        placeholder="Газель 3т"
                        value={newRate.vehicleName}
                        onChange={(e) =>
                          setNewRate((v) => ({
                            ...v,
                            vehicleName: e.target.value,
                          }))
                        }
                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-4 py-3">

                      <input
                        placeholder="до 3т"
                        value={newRate.payload}
                        onChange={(e) =>
                          setNewRate((v) => ({ ...v, payload: e.target.value }))
                        }
                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">

                      <div className="flex items-center gap-1 justify-center">

                        <span className="text-xs text-muted-foreground">
                          до
                        </span>
                        <input
                          type="number"
                          placeholder="10"
                          value={newRate.maxVolume}
                          onChange={(e) =>
                            setNewRate((v) => ({
                              ...v,
                              maxVolume: e.target.value,
                            }))
                          }
                          className="w-16 px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                        />
                        <span className="text-xs text-muted-foreground">
                          м³
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">

                      <div className="flex items-center gap-1 justify-end">

                        <input
                          type="number"
                          placeholder="5000"
                          value={newRate.basePrice}
                          onChange={(e) =>
                            setNewRate((v) => ({
                              ...v,
                              basePrice: e.target.value,
                            }))
                          }
                          className="w-24 px-2 py-1 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                        />
                        <span className="text-xs text-muted-foreground">
                          ₽
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">

                      <div className="flex items-center gap-1 justify-end">

                        <button
                          onClick={saveNew}
                          disabled={
                            addSaving ||
                            !newRate.vehicleName ||
                            !newRate.payload ||
                            !newRate.maxVolume ||
                            !newRate.basePrice
                          }
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-40"
                        >

                          {addSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowAdd(false);
                            setNewRate(emptyNew);
                          }}
                          className="p-1.5 text-muted-foreground hover:bg-primary/[0.07] rounded-xl transition-colors"
                        >

                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {rates.length === 0 && !showAdd && (
                  <tr>

                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground text-sm"
                    >

                      Тарифы не добавлены. Нажмите «Добавить» чтобы создать
                      первый тариф.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground px-1">

        * Цены указаны «от» — финальная стоимость зависит от дальности и условий
        доставки.
      </p>
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={deleteRate}
        title="Удалить этот тариф?"
        description="Тариф будет удалён безвозвратно."
        confirmLabel="Удалить"
        variant="danger"
        loading={!!deleting}
      />
    </div>
  );
}
