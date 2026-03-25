"use client";

import { useState, useEffect } from "react";
import { Truck, Pencil, Check, X, Loader2, Calculator } from "lucide-react";

type Rate = {
  id: string;
  vehicleName: string;
  payload: string;
  maxVolume: number;
  basePrice: number;
};

export default function DeliveryRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Rate>>({});
  const [saving, setSaving] = useState(false);

  // Calculator state
  const [calcVolume, setCalcVolume] = useState("");
  const [calcResult, setCalcResult] = useState<Rate[]>([]);

  useEffect(() => {
    fetch("/api/admin/delivery-rates")
      .then((r) => r.json())
      .then((data) => { setRates(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startEdit = (rate: Rate) => {
    setEditingId(rate.id);
    setEditValues({ vehicleName: rate.vehicleName, payload: rate.payload, maxVolume: rate.maxVolume, basePrice: rate.basePrice });
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/delivery-rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      if (res.ok) {
        const updated = await res.json();
        setRates((prev) => prev.map((r) => r.id === id ? updated : r));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const calculate = () => {
    const vol = parseFloat(calcVolume);
    if (!vol || vol <= 0) { setCalcResult([]); return; }
    // Find vehicles that fit the volume (maxVolume >= requested volume)
    const suitable = rates.filter((r) => r.maxVolume >= vol).sort((a, b) => a.basePrice - b.basePrice);
    setCalcResult(suitable);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Тарифы доставки</h1>
      </div>

      {/* Calculator */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Калькулятор доставки</h2>
        </div>
        <p className="text-sm text-muted-foreground">Введите объём заказа чтобы подобрать подходящий транспорт</p>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              min={0.1}
              step={0.1}
              placeholder="Объём (м³)"
              value={calcVolume}
              onChange={(e) => setCalcVolume(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && calculate()}
              className="w-44 px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">м³</span>
          </div>
          <button
            onClick={calculate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            Рассчитать
          </button>
        </div>

        {calcResult.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Подходящие варианты для {calcVolume} м³:
            </p>
            {calcResult.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  i === 0
                    ? "bg-primary/5 border-primary/30"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div>
                  <p className={`font-semibold text-sm ${i === 0 ? "text-primary" : ""}`}>
                    {i === 0 && "⭐ "}{r.vehicleName}
                    {i === 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">— оптимальный</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.payload} · до {r.maxVolume} м³</p>
                </div>
                <p className="font-bold text-base">{r.basePrice.toLocaleString("ru-RU")} ₽</p>
              </div>
            ))}
            {calcResult.length === 0 && (
              <p className="text-sm text-destructive">Нет подходящего транспорта для {calcVolume} м³. Требуется несколько рейсов.</p>
            )}
          </div>
        )}

        {calcVolume && parseFloat(calcVolume) > 0 && calcResult.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 rounded-xl">
            ⚠️ Объём {calcVolume} м³ превышает вместимость любого транспорта. Потребуется несколько рейсов или уточните у логиста.
          </p>
        )}
      </div>

      {/* Rates table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Прайс-лист транспорта</h2>
          <p className="text-xs text-muted-foreground">Нажмите ✏️ чтобы изменить цену</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Автотранспорт</th>
                <th className="text-center px-4 py-3 font-semibold">Грузоподъёмность</th>
                <th className="text-center px-4 py-3 font-semibold">Вместимость</th>
                <th className="text-right px-4 py-3 font-semibold">Цена (от)</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map((rate) => {
                const isEditing = editingId === rate.id;
                return (
                  <tr key={rate.id} className={isEditing ? "bg-primary/3" : "hover:bg-muted/20 transition-colors"}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={editValues.vehicleName ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, vehicleName: e.target.value }))}
                          className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <span className="font-medium">{rate.vehicleName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {isEditing ? (
                        <input
                          value={editValues.payload ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, payload: e.target.value }))}
                          className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                        />
                      ) : rate.payload}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-xs text-muted-foreground">до</span>
                          <input
                            type="number"
                            value={editValues.maxVolume ?? ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, maxVolume: Number(e.target.value) }))}
                            className="w-16 px-2 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                          />
                          <span className="text-xs text-muted-foreground">м³</span>
                        </div>
                      ) : `до ${rate.maxVolume} м³`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            value={editValues.basePrice ?? ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, basePrice: Number(e.target.value) }))}
                            className="w-24 px-2 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                          />
                          <span className="text-xs text-muted-foreground">₽</span>
                        </div>
                      ) : (
                        <span className="font-bold text-primary">{rate.basePrice.toLocaleString("ru-RU")} ₽</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => saveEdit(rate.id)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="p-1.5 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rate)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        * Цены указаны «от» — финальная стоимость зависит от дальности и условий доставки.
        Для изменения нажмите ✏️ напротив нужной строки.
      </p>
    </div>
  );
}
