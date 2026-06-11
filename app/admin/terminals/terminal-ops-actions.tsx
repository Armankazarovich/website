"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Monitor, Play, Printer, RefreshCw, Square } from "lucide-react";
import { useAdminConfirm } from "@/components/admin/admin-confirm-provider";

type Workstation = {
  id: string;
  name: string;
  type: string;
  profile: string;
};

type Shift = {
  id: string;
  workstationId: string | null;
  openingCash: string | number;
  openedAt: string;
  workstation?: Workstation | null;
};

export function TerminalOpsActions() {
  const confirmAction = useAdminConfirm();
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [selectedWorkstation, setSelectedWorkstation] = useState("");
  const [profileKey, setProfileKey] = useState("lumber");
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("0");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [workstationsRes, shiftsRes, profileRes] = await Promise.all([
        fetch("/api/admin/terminal/workstations"),
        fetch("/api/admin/terminal/shifts"),
        fetch("/api/admin/terminal/profile"),
      ]);
      if (workstationsRes.ok) {
        const data = await workstationsRes.json();
        setWorkstations(data.workstations || []);
        setSelectedWorkstation((current) => current || data.workstations?.[0]?.id || "");
      }
      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setOpenShifts(data.openShifts || []);
      }
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.profile?.key) setProfileKey(data.profile.key);
      }
    } catch {
      setMessage("Ошибка сети при загрузке пульта");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const run = async (label: string, fn: () => Promise<Response>) => {
    if (busy) return;
    setBusy(label);
    setMessage("");
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Не получилось выполнить действие");
        return;
      }
      setMessage("Готово");
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") return;
      setMessage("Ошибка сети при выполнении действия");
    } finally {
      setBusy("");
    }
  };

  const createWorkstation = async () => {
    if (!(await confirmAction("Создать рабочее место терминала?"))) return;
    await run("workstation", () =>
      fetch("/api/admin/terminal/workstations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Мобильный терминал",
          type: "MOBILE",
          profile: profileKey,
          paymentMode: "manual_qr",
          printerMode: "electronic",
          scannerMode: "usb_hid",
          confirm: true,
        }),
      }),
    );
  };

  const openShift = async () => {
    if (!(await confirmAction("Открыть кассовую смену?"))) return;
    await run("open", () =>
      fetch("/api/admin/terminal/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          workstationId: selectedWorkstation || null,
          openingCash,
          confirm: true,
        }),
      }),
    );
  };

  const closeShift = async () => {
    const shift = openShifts[0];
    if (!shift) {
      setMessage("Нет открытой смены");
      return;
    }
    if (!(await confirmAction("Закрыть кассовую смену?"))) return;
    run("close", () =>
      fetch("/api/admin/terminal/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          shiftId: shift.id,
          actualCash,
          confirm: true,
        }),
      })
    );
  };

  const testPrint = async () => {
    if (!(await confirmAction("Создать тестовое задание печати?"))) return;
    await run("print", () =>
      fetch("/api/admin/terminal/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Тест печати терминала",
          type: "TEST",
          route: "receipt",
          workstationId: selectedWorkstation || null,
          payload: { text: "ARAY terminal print test" },
          confirm: true,
        }),
      }),
    );
  };

  /*
    fetch("/api/admin/terminal/workstations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Мобильный терминал",
        type: "MOBILE",
        profile: profileKey,
        paymentMode: "manual_qr",
        printerMode: "electronic",
        scannerMode: "usb_hid",
      }),
    })
  );

  const openShift = () => run("open", () =>
    fetch("/api/admin/terminal/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "open",
        workstationId: selectedWorkstation || null,
        openingCash,
      }),
    })
  );

  const closeShift = () => {
    const shift = openShifts[0];
    if (!shift) {
      setMessage("Нет открытой смены");
      return;
    }
    run("close", () =>
      fetch("/api/admin/terminal/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          shiftId: shift.id,
          actualCash,
        }),
      })
    );
  };

  const testPrint = () => run("print", () =>
    fetch("/api/admin/terminal/print-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Тест печати терминала",
        type: "TEST",
        route: "receipt",
        workstationId: selectedWorkstation || null,
        payload: { text: "ARAY terminal print test" },
      }),
    })
  );

  */

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Рабочий пульт терминала</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Быстрые действия для старта: рабочее место, смена и тест печати. Дальше сюда добавим реальные провайдеры и устройства.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading || Boolean(busy)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Обновить
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">Рабочее место</p>
          <select
            value={selectedWorkstation}
            onChange={(e) => setSelectedWorkstation(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
            style={{ fontSize: 16 }}
          >
            <option value="">Не выбрано</option>
            {workstations.map((station) => (
              <option key={station.id} value={station.id}>{station.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={createWorkstation}
            disabled={busy === "workstation"}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            {busy === "workstation" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Создать мобильную точку
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">Смена</p>
          <input
            type="number"
            min={0}
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
            style={{ fontSize: 16 }}
            placeholder="Стартовые наличные"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openShift}
              disabled={busy === "open"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy === "open" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Открыть
            </button>
            <button
              type="button"
              onClick={closeShift}
              disabled={busy === "close"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
            >
              {busy === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Закрыть
            </button>
          </div>
          <input
            type="number"
            min={0}
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
            style={{ fontSize: 16 }}
            placeholder="Фактические наличные при закрытии"
          />
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">Печать и тесты</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Сейчас тест создаёт `PrintJob`. Реальная тихая печать включится после сетевого принтера или локального коннектора.
          </p>
          <button
            type="button"
            onClick={testPrint}
            disabled={busy === "print"}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Создать тест печати
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Открытые смены: {loading ? "..." : openShifts.length}
          </p>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      )}
    </section>
  );
}
