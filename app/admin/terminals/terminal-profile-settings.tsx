"use client";

import { useAdminConfirm } from "@/components/admin/admin-confirm-provider";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Save, Settings2, SlidersHorizontal, WandSparkles } from "lucide-react";
import {
  ALWAYS_ON_TERMINAL_CAPABILITIES,
  PROFILE_RECOMMENDED_CAPABILITIES,
  TERMINAL_CAPABILITIES,
  type TerminalCapabilityKey,
} from "@/lib/terminal-capabilities";
import { TERMINAL_PROFILES, type TerminalProfileKey } from "@/lib/terminal-profiles";

export function TerminalProfileSettings() {
  const confirmAction = useAdminConfirm();
  const profiles = useMemo(() => Object.values(TERMINAL_PROFILES), []);
  const [selected, setSelected] = useState<TerminalProfileKey>("lumber");
  const [enabledModules, setEnabledModules] = useState<TerminalCapabilityKey[]>(PROFILE_RECOMMENDED_CAPABILITIES.lumber);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoConfiguring, setAutoConfiguring] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => {
        const key = settings?.terminal_profile || settings?.business_type || "lumber";
        if (key in TERMINAL_PROFILES) {
          const profileKey = key as TerminalProfileKey;
          setSelected(profileKey);
          try {
            const stored = settings?.terminal_enabled_modules ? JSON.parse(settings.terminal_enabled_modules) : null;
            if (Array.isArray(stored)) {
              setEnabledModules(stored.filter((module) => module in TERMINAL_CAPABILITIES));
            } else {
              setEnabledModules(PROFILE_RECOMMENDED_CAPABILITIES[profileKey]);
            }
          } catch {
            setEnabledModules(PROFILE_RECOMMENDED_CAPABILITIES[profileKey]);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activeProfile = TERMINAL_PROFILES[selected];
  const groupedCapabilities = useMemo(() => {
    return Object.values(TERMINAL_CAPABILITIES).reduce<Record<string, typeof TERMINAL_CAPABILITIES[TerminalCapabilityKey][]>>((acc, capability) => {
      acc[capability.section] = acc[capability.section] || [];
      acc[capability.section].push(capability);
      return acc;
    }, {});
  }, []);

  const chooseProfile = (profileKey: TerminalProfileKey) => {
    setSelected(profileKey);
    setEnabledModules(PROFILE_RECOMMENDED_CAPABILITIES[profileKey]);
  };

  const toggleModule = (key: TerminalCapabilityKey) => {
    if (ALWAYS_ON_TERMINAL_CAPABILITIES.includes(key)) return;
    setEnabledModules((current) =>
      current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]
    );
  };

  const trustLabel: Record<string, string> = {
    CORE: "ядро",
    BETA: "бета",
    NEEDS_PROVIDER: "провайдер",
    NEEDS_CONNECTOR: "коннектор",
  };
  const sectionLabel: Record<string, string> = {
    work: "Работа",
    payments: "Оплата",
    receipts: "Чеки",
    customers: "Клиенты",
    fulfillment: "Получение",
    devices: "Устройства",
    automation: "Автоматизация",
  };

  const autoconfigure = async () => {
    if (!(await confirmAction("Применить автонастройку терминала?"))) return;
    setAutoConfiguring(true);
    setSaved(false);
    const res = await fetch("/api/admin/terminal/autoconfig", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.config) {
      if (data.config.profile?.key && data.config.profile.key in TERMINAL_PROFILES) {
        setSelected(data.config.profile.key);
      }
      if (Array.isArray(data.config.enabledModules)) {
        setEnabledModules(data.config.enabledModules.filter((module: string) => module in TERMINAL_CAPABILITIES));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    }
    setAutoConfiguring(false);
  };

  const save = async () => {
    if (!(await confirmAction("Сохранить профиль и модули терминала?"))) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        terminal_profile: selected,
        business_type: selected,
        terminal_enabled_modules: JSON.stringify(Array.from(new Set([...ALWAYS_ON_TERMINAL_CAPABILITIES, ...enabledModules]))),
        confirm: true,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Настройка профиля терминала</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Этот профиль выбирает конструктор сайта или Арай. Терминал меняет слова, поля, статусы, сценарии получения и CRM-логику.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Сохранено" : "Сохранить"}
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Автонастройка от сайта</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Берёт сферу, товары, доставку, самовывоз, реквизиты и сразу готовит кассу, CRM, поиск, смену и базовые способы оплаты.
            </p>
          </div>
          <button
            type="button"
            onClick={autoconfigure}
            disabled={autoConfiguring}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            {autoConfiguring ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            Настроить автоматически
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {profiles.map((profile) => {
          const selectedProfile = selected === profile.key;
          return (
            <button
              key={profile.key}
              type="button"
              onClick={() => chooseProfile(profile.key)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selectedProfile
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{profile.label}</p>
                  <p className="mt-1 text-xs">{profile.productionTarget}</p>
                </div>
                {selectedProfile && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {profile.fulfillment.slice(0, 3).map((option) => (
                  <span key={option.value} className="rounded-xl border border-border bg-card px-2 py-1 text-[11px]">
                    {option.label}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
        <p className="text-sm font-semibold">{activeProfile.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Поиск: {activeProfile.searchPlaceholder} · сценарий по умолчанию: {activeProfile.defaultFulfillment} · CRM: {activeProfile.pipeline.orderStatuses.slice(0, 4).join(" → ")}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Что показывать в терминале</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Сайт и Арай включают рекомендуемые модули автоматически. Неподключённые вещи не шумят в кассе: включили модуль — он появился в терминале.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {Object.entries(groupedCapabilities).map(([section, capabilities]) => (
            <div key={section} className="rounded-2xl border border-border bg-muted/20 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{sectionLabel[section] || section}</p>
              <div className="space-y-2">
                {capabilities.map((capability) => {
                  const locked = ALWAYS_ON_TERMINAL_CAPABILITIES.includes(capability.key);
                  const active = locked || enabledModules.includes(capability.key);
                  return (
                    <button
                      key={capability.key}
                      type="button"
                      onClick={() => toggleModule(capability.key)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{capability.title}</p>
                          <p className="mt-1 text-[11px]">{capability.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                          {locked ? "ядро" : active ? trustLabel[capability.trustLevel] : "выкл"}
                        </span>
                      </div>
                      {capability.requiresSetup && (
                        <p className="mt-2 text-[11px] text-muted-foreground">{capability.setupHint}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
