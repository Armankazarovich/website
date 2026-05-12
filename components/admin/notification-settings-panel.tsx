"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  CalendarDays,
  Clock,
  Headphones,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  Mic2,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  UserCog,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { ARAY_FOCUS_RING, ARAY_ICON_TONE } from "@/lib/aray-design-tokens";
import {
  DEFAULT_ARAY_VOICE_PREFERENCES,
  getArayVoicePreferences,
  isArayScheduledListeningActive,
  saveArayVoicePreferences,
  subscribeArayVoicePreferences,
  type ArayVoicePreferences,
} from "@/lib/aray-voice-preferences";
import { cn } from "@/lib/utils";

type RoleMeta = {
  key: string;
  label: string;
};

type EventMeta = {
  key: string;
  label: string;
  description: string;
  defaultChannels: string[];
};

type Policy = {
  role: string;
  eventKey: string;
  enabled: boolean;
  channels: string[];
  quietHoursEnabled: boolean;
  isDefault: boolean;
};

type Schedule = {
  role: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  weekendsMuted: boolean;
  quietActive: boolean;
};

type RoleBlueprint = {
  key: string;
  label: string;
  description: string;
  baseRole: string;
  scope: string;
  roleKind: "system" | "business-template" | "client-segment";
  notificationEvents: string[];
  channels: string[];
};

type BusinessRoleAudience = {
  id: string;
  key: string;
  label: string;
  baseRole: string | null;
  scope: string;
  roleKind: string;
  members: number;
  preferences: number;
};

type SettingsResponse = {
  roles: RoleMeta[];
  roleBlueprints?: RoleBlueprint[];
  businessRoleAudiences?: BusinessRoleAudience[];
  events: EventMeta[];
  policies: Policy[];
  schedules: Schedule[];
  canEdit: boolean;
};

const CHANNELS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: "SYSTEM", label: "Внутри ARAY", icon: BellRing },
  { key: "PUSH", label: "Push", icon: Smartphone },
  { key: "TELEGRAM", label: "Telegram", icon: Send },
  { key: "ARAY", label: "ARAY", icon: Bot },
  { key: "EMAIL", label: "Email", icon: Mail },
  { key: "SMS", label: "SMS", icon: MessageSquare },
];

const CHANNEL_SETUP: Array<{
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: string;
}> = [
  {
    key: "push",
    label: "Push / PWA",
    description: "Подписка устройства и системные push-сигналы.",
    href: "/admin/notifications",
    icon: Smartphone,
    status: "включается здесь",
  },
  {
    key: "telegram",
    label: "Telegram",
    description: "Бот, webhook и тестовые сообщения команде.",
    href: "/admin/notifications",
    icon: Send,
    status: "бот и webhook",
  },
  {
    key: "email",
    label: "Email",
    description: "SMTP, письма клиентам и служебные отправки.",
    href: "/admin/email",
    icon: Mail,
    status: "SMTP",
  },
  {
    key: "sms",
    label: "SMS",
    description: "Провайдер, ключ API и будущие шаблоны SMS.",
    href: "/admin/aray/connectors",
    icon: MessageSquare,
    status: "требует провайдера",
  },
  {
    key: "aray",
    label: "Внутри ARAY",
    description: "Внутренние сигналы, задачи и связь с помощником.",
    href: "/admin/notifications",
    icon: Bot,
    status: "ядро готово",
  },
];

function policyKey(role: string, eventKey: string) {
  return `${role}:${eventKey}`;
}

function ToggleButton({
  checked,
  disabled,
  label,
  size = "md",
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  size?: "md" | "lg";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-state={checked ? "on" : "off"}
      disabled={disabled}
      aria-label={`${label}: ${checked ? "включено" : "выключено"}`}
      aria-pressed={checked}
      onClick={onClick}
      className={cn(
        "aray-toggle shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "aray-toggle-lg" : "aray-toggle-md",
        checked ? "bg-primary" : "bg-muted-foreground/30",
        ARAY_FOCUS_RING,
      )}
    >
      <span className="aray-toggle-thumb" />
    </button>
  );
}

function ToggleVisual({
  checked,
  size = "md",
}: {
  checked: boolean;
  size?: "md" | "lg";
}) {
  return (
    <span
      data-state={checked ? "on" : "off"}
      className={cn(
        "aray-toggle shrink-0 transition-colors",
        size === "lg" ? "aray-toggle-lg" : "aray-toggle-md",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span className="aray-toggle-thumb" />
    </span>
  );
}

function SettingShell({
  icon,
  title,
  desc,
  right,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/35 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-foreground">{title}</span>
            {desc && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{desc}</span>}
          </span>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ScheduleField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
      {label}
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-border bg-background/65 px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
      />
    </label>
  );
}

export function NotificationSettingsPanel({ onNavigate }: { onNavigate?: () => void } = {}) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voicePrefs, setVoicePrefs] = useState<ArayVoicePreferences>(DEFAULT_ARAY_VOICE_PREFERENCES);
  const [voiceScheduleActive, setVoiceScheduleActive] = useState(false);

  const loadSettings = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/settings", { cache: "no-store" });
      const nextData = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(nextData?.policies)) {
        throw new Error(nextData?.error || "Не удалось загрузить настройки уведомлений.");
      }
      setData(nextData);
      setSelectedRoleKey((current) => current || nextData.roles?.[0]?.key || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить настройки уведомлений.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const syncVoicePrefs = (nextPreferences = getArayVoicePreferences()) => {
      setVoicePrefs(nextPreferences);
      setVoiceScheduleActive(isArayScheduledListeningActive(nextPreferences));
    };

    syncVoicePrefs();
    const unsubscribe = subscribeArayVoicePreferences(syncVoicePrefs);
    const timer = window.setInterval(() => syncVoicePrefs(), 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const policyMap = useMemo(() => {
    const map = new Map<string, Policy>();
    for (const policy of data?.policies ?? []) {
      map.set(policyKey(policy.role, policy.eventKey), policy);
    }
    return map;
  }, [data?.policies]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>();
    for (const schedule of data?.schedules ?? []) {
      map.set(schedule.role, schedule);
    }
    return map;
  }, [data?.schedules]);

  const selectedRole = data?.roles.find((item) => item.key === selectedRoleKey) ?? data?.roles[0] ?? null;
  const selectedSchedule = selectedRole ? scheduleMap.get(selectedRole.key) : null;
  const roleBlueprints = data?.roleBlueprints ?? [];
  const businessRoleAudiences = data?.businessRoleAudiences ?? [];
  const canEdit = Boolean(data?.canEdit);
  const anySaving = Boolean(savingKey);

  const patchPolicy = async (policy: Policy, patch: Partial<Policy>) => {
    if (!canEdit || savingKey) return;
    const key = policyKey(policy.role, policy.eventKey);
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "policy",
          role: policy.role,
          eventKey: policy.eventKey,
          enabled: patch.enabled ?? policy.enabled,
          channels: patch.channels ?? policy.channels,
          quietHoursEnabled: patch.quietHoursEnabled ?? policy.quietHoursEnabled,
        }),
      });
      const nextData = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(nextData?.policies)) {
        throw new Error(nextData?.error || "Не удалось сохранить настройку.");
      }
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить настройку.");
    } finally {
      setSavingKey(null);
    }
  };

  const patchSchedule = async (schedule: Schedule, patch: Partial<Schedule>) => {
    if (!canEdit || savingKey) return;
    const key = `schedule:${schedule.role}`;
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "schedule",
          role: schedule.role,
          quietHoursEnabled: patch.quietHoursEnabled ?? schedule.quietHoursEnabled,
          quietStart: patch.quietStart ?? schedule.quietStart,
          quietEnd: patch.quietEnd ?? schedule.quietEnd,
          weekendsMuted: patch.weekendsMuted ?? schedule.weekendsMuted,
        }),
      });
      const nextData = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(nextData?.schedules)) {
        throw new Error(nextData?.error || "Не удалось сохранить расписание.");
      }
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить расписание.");
    } finally {
      setSavingKey(null);
    }
  };

  const patchVoicePrefs = (patch: Partial<ArayVoicePreferences>) => {
    const nextPreferences = {
      ...voicePrefs,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setVoicePrefs(nextPreferences);
    setVoiceScheduleActive(isArayScheduledListeningActive(nextPreferences));
    saveArayVoicePreferences(nextPreferences);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`${ARAY_ICON_TONE} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-foreground">Настройки уведомлений</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Роли, каналы, тихие часы и клиентские сообщения в одном месте.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadSettings(true)}
          disabled={refreshing}
          aria-label="Обновить настройки"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-danger flex items-start gap-2 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Загружаю настройки
        </div>
      ) : !data || !selectedRole ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/35 px-4 py-10 text-center text-sm text-muted-foreground">
          Настройки пока недоступны.
        </div>
      ) : (
        <div className="space-y-4">
          {!data.canEdit && (
            <div className="rounded-2xl border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
              Режим просмотра. Изменять настройки могут администраторы.
            </div>
          )}

          <SettingShell
            icon={<KeyRound className="h-4 w-4" />}
            title="Подключения каналов"
            desc="Здесь включаем маршруты уведомлений, а провайдеры открываются из одного места."
          >
            <div className="mt-3 grid gap-2">
              {CHANNEL_SETUP.map((channel) => {
                const Icon = channel.icon;
                return (
                  <Link
                    key={channel.key}
                    href={channel.href}
                    onClick={onNavigate}
                    className="group flex min-h-[5rem] items-center gap-3 rounded-xl border border-border bg-background/45 px-3 py-3 text-left transition-colors hover:border-primary/25 hover:bg-primary/[0.06]"
                  >
                    <span className={`${ARAY_ICON_TONE} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight text-foreground">{channel.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {channel.description}
                      </span>
                    </span>
                    <span className="flex max-w-[9.5rem] shrink-0 items-center justify-end gap-1.5 text-right text-[11px] font-semibold leading-snug text-muted-foreground transition-colors group-hover:text-primary">
                      <span className="line-clamp-2">{channel.status}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </SettingShell>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {data.roles.map((role) => {
                const active = role.key === selectedRole.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRoleKey(role.key)}
                    className={cn(
                      "min-h-10 rounded-full border px-3 text-sm font-semibold transition-colors",
                      active
                        ? "border-primary/35 bg-primary/[0.12] text-primary"
                        : "border-border bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                    )}
                  >
                    {role.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSchedule && (
            <SettingShell
              icon={<Moon className="h-4 w-4" />}
              title={`${selectedRole.label}: тихий режим`}
              desc={selectedSchedule.quietActive ? "Сейчас уведомления приглушены." : "Сейчас обычный режим."}
              right={
                <ToggleButton
                  checked={selectedSchedule.quietHoursEnabled}
                  disabled={!canEdit || anySaving}
                  label="Тихий режим"
                  size="lg"
                  onClick={() => patchSchedule(selectedSchedule, { quietHoursEnabled: !selectedSchedule.quietHoursEnabled })}
                />
              }
            >
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ScheduleField
                  label="с"
                  value={selectedSchedule.quietStart}
                  disabled={!canEdit || anySaving}
                  onChange={(value) => patchSchedule(selectedSchedule, { quietStart: value })}
                />
                <ScheduleField
                  label="до"
                  value={selectedSchedule.quietEnd}
                  disabled={!canEdit || anySaving}
                  onChange={(value) => patchSchedule(selectedSchedule, { quietEnd: value })}
                />
              </div>
              <button
                type="button"
                disabled={!canEdit || anySaving}
                onClick={() => patchSchedule(selectedSchedule, { weekendsMuted: !selectedSchedule.weekendsMuted })}
                className={cn(
                  "mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:opacity-50",
                  selectedSchedule.weekendsMuted
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background/45 text-muted-foreground hover:bg-muted/45",
                )}
              >
                <WifiOff className="h-3.5 w-3.5" />
                Выходные тише
              </button>
            </SettingShell>
          )}

          <SettingShell
            icon={<Mic2 className="h-4 w-4" />}
            title="Голос ARAY на этом устройстве"
            desc={
              voicePrefs.voiceRepliesEnabled
                ? voicePrefs.scheduledListeningEnabled
                  ? voiceScheduleActive
                    ? "Сейчас голосовое окно активно: ARAY может озвучивать ответы и готов к ручному голосовому режиму."
                    : "Голос включён, но сейчас вне рабочего окна."
                  : "Озвучка ответов включена без расписания."
                : "Озвучка выключена. Микрофон включается только по явному действию человека."
            }
            right={
              <ToggleButton
                checked={voicePrefs.voiceRepliesEnabled}
                label="Голосовые ответы ARAY"
                size="lg"
                onClick={() => patchVoicePrefs({ voiceRepliesEnabled: !voicePrefs.voiceRepliesEnabled })}
              />
            }
          >
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    patchVoicePrefs({
                      scheduledListeningEnabled: !voicePrefs.scheduledListeningEnabled,
                    })
                  }
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-left transition-colors",
                    voicePrefs.scheduledListeningEnabled
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-border bg-background/45 text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Headphones className={cn("h-4 w-4 shrink-0", voicePrefs.scheduledListeningEnabled ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">Рабочее окно голоса</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {voiceScheduleActive ? "сейчас активно" : "сейчас не активно"}
                      </span>
                    </span>
                  </span>
                  <ToggleVisual checked={voicePrefs.scheduledListeningEnabled} />
                </button>

                <button
                  type="button"
                  onClick={() => patchVoicePrefs({ weekendsEnabled: !voicePrefs.weekendsEnabled })}
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-left transition-colors",
                    voicePrefs.weekendsEnabled
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-border bg-background/45 text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CalendarDays className={cn("h-4 w-4 shrink-0", voicePrefs.weekendsEnabled ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">Выходные</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {voicePrefs.weekendsEnabled ? "голос работает" : "без авто-голоса"}
                      </span>
                    </span>
                  </span>
                  <ToggleVisual checked={voicePrefs.weekendsEnabled} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ScheduleField
                  label="слушать с"
                  value={voicePrefs.workStart}
                  disabled={!voicePrefs.scheduledListeningEnabled}
                  onChange={(value) => patchVoicePrefs({ workStart: value })}
                />
                <ScheduleField
                  label="до"
                  value={voicePrefs.workEnd}
                  disabled={!voicePrefs.scheduledListeningEnabled}
                  onChange={(value) => patchVoicePrefs({ workEnd: value })}
                />
              </div>

              <div className="rounded-xl border border-border bg-background/45 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                ARAY не включает микрофон в фоне без разрешения браузера. Расписание уже управляет озвучкой ответов и готовит безопасный контур для будущего режима постоянной связи.
              </div>
            </div>
          </SettingShell>

          <SettingShell
            icon={<UserCog className="h-4 w-4" />}
            title="Умные роли под бизнес"
            desc="Шаблоны и подключенные роли сохраняют audience-настройки отдельно от старой enum-матрицы."
          >
            {businessRoleAudiences.length > 0 && (
              <div className="mt-3 space-y-2">
                {businessRoleAudiences.slice(0, 5).map((role) => (
                  <div
                    key={role.id}
                    className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-background/55 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-foreground">{role.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {role.key} · {role.members} участ. · {role.preferences} уведомл.
                      </span>
                    </span>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      audience
                    </span>
                  </div>
                ))}
              </div>
            )}
            {roleBlueprints.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {roleBlueprints.slice(0, 8).map((role) => (
                  <span
                    key={role.key}
                    title={role.description}
                    className="rounded-full border border-border bg-background/55 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                  >
                    {role.label}
                  </span>
                ))}
              </div>
            )}
          </SettingShell>

          <div className="space-y-3">
            {data.events.map((event) => {
              const policy = policyMap.get(policyKey(selectedRole.key, event.key));
              if (!policy) return null;
              const disabled = !canEdit || anySaving;
              return (
                <article key={event.key} className="rounded-2xl border border-border bg-background/35 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                        <BellRing className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight text-foreground">{event.label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{event.description}</span>
                      </span>
                    </div>
                    <ToggleButton
                      checked={policy.enabled}
                      disabled={disabled}
                      label={event.label}
                      size="lg"
                      onClick={() => patchPolicy(policy, { enabled: !policy.enabled })}
                    />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {CHANNELS.map((channel) => {
                      const Icon = channel.icon;
                      const active = policy.channels.includes(channel.key);
                      return (
                        <button
                          key={channel.key}
                          type="button"
                          disabled={disabled || !policy.enabled}
                          onClick={() => {
                            const channels = active
                              ? policy.channels.filter((item) => item !== channel.key)
                              : [...policy.channels, channel.key];
                            patchPolicy(policy, { channels });
                          }}
                          className={cn(
                            "flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                            active
                              ? "border-primary/30 bg-primary/10 text-foreground"
                              : "border-border bg-background/45 text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                            <span className="truncate text-sm font-medium">{channel.label}</span>
                          </span>
                          <ToggleVisual checked={active} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/45 px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      Учитывать тихие часы
                    </span>
                    <ToggleButton
                      checked={policy.quietHoursEnabled}
                      disabled={disabled || !policy.enabled}
                      label={`${event.label}: тихие часы`}
                      onClick={() => patchPolicy(policy, { quietHoursEnabled: !policy.quietHoursEnabled })}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
