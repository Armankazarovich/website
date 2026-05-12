export type ArayVoicePreferences = {
  voiceRepliesEnabled: boolean;
  scheduledListeningEnabled: boolean;
  workStart: string;
  workEnd: string;
  weekendsEnabled: boolean;
  updatedAt: string | null;
};

export const ARAY_VOICE_PREFERENCES_KEY = "aray.voice.preferences.v1";
export const ARAY_LEGACY_VOICE_ENABLED_KEY = "aray.voice.enabled.v1";
export const ARAY_VOICE_PREFERENCES_EVENT = "aray:voice-preferences-updated";

export const DEFAULT_ARAY_VOICE_PREFERENCES: ArayVoicePreferences = {
  voiceRepliesEnabled: false,
  scheduledListeningEnabled: false,
  workStart: "09:00",
  workEnd: "21:00",
  weekendsEnabled: false,
  updatedAt: null,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeTime(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function minutesOfDay(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function normalizeArayVoicePreferences(value: unknown): ArayVoicePreferences {
  const raw = value && typeof value === "object" ? (value as Partial<ArayVoicePreferences>) : {};
  return {
    voiceRepliesEnabled: Boolean(raw.voiceRepliesEnabled),
    scheduledListeningEnabled: Boolean(raw.scheduledListeningEnabled),
    workStart: normalizeTime(raw.workStart, DEFAULT_ARAY_VOICE_PREFERENCES.workStart),
    workEnd: normalizeTime(raw.workEnd, DEFAULT_ARAY_VOICE_PREFERENCES.workEnd),
    weekendsEnabled: Boolean(raw.weekendsEnabled),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

export function getArayVoicePreferences(): ArayVoicePreferences {
  if (!isBrowser()) return { ...DEFAULT_ARAY_VOICE_PREFERENCES };

  try {
    const raw = window.localStorage.getItem(ARAY_VOICE_PREFERENCES_KEY);
    if (raw) return normalizeArayVoicePreferences(JSON.parse(raw));

    const legacyVoiceEnabled = window.localStorage.getItem(ARAY_LEGACY_VOICE_ENABLED_KEY) === "true";
    return {
      ...DEFAULT_ARAY_VOICE_PREFERENCES,
      voiceRepliesEnabled: legacyVoiceEnabled,
    };
  } catch {
    return { ...DEFAULT_ARAY_VOICE_PREFERENCES };
  }
}

export function saveArayVoicePreferences(next: ArayVoicePreferences) {
  if (!isBrowser()) return;
  const normalized = normalizeArayVoicePreferences({
    ...next,
    updatedAt: next.updatedAt || new Date().toISOString(),
  });

  try {
    window.localStorage.setItem(ARAY_VOICE_PREFERENCES_KEY, JSON.stringify(normalized));
    window.localStorage.setItem(ARAY_LEGACY_VOICE_ENABLED_KEY, String(normalized.voiceRepliesEnabled));
    window.dispatchEvent(
      new CustomEvent(ARAY_VOICE_PREFERENCES_EVENT, {
        detail: normalized,
      }),
    );
  } catch {}
}

export function subscribeArayVoicePreferences(
  handler: (preferences: ArayVoicePreferences) => void,
) {
  if (typeof window === "undefined") return () => {};

  const onCustom = (event: Event) => {
    const custom = event as CustomEvent<ArayVoicePreferences>;
    handler(normalizeArayVoicePreferences(custom.detail));
  };
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === ARAY_VOICE_PREFERENCES_KEY ||
      event.key === ARAY_LEGACY_VOICE_ENABLED_KEY
    ) {
      handler(getArayVoicePreferences());
    }
  };

  window.addEventListener(ARAY_VOICE_PREFERENCES_EVENT, onCustom as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ARAY_VOICE_PREFERENCES_EVENT, onCustom as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

export function isArayVoiceWithinWorkWindow(
  preferences: Pick<ArayVoicePreferences, "workStart" | "workEnd" | "weekendsEnabled">,
  date = new Date(),
) {
  const day = date.getDay();
  if (!preferences.weekendsEnabled && (day === 0 || day === 6)) return false;

  const start = minutesOfDay(normalizeTime(preferences.workStart, DEFAULT_ARAY_VOICE_PREFERENCES.workStart));
  const end = minutesOfDay(normalizeTime(preferences.workEnd, DEFAULT_ARAY_VOICE_PREFERENCES.workEnd));
  const current = date.getHours() * 60 + date.getMinutes();

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function isArayVoiceReplyAllowed(preferences: ArayVoicePreferences, date = new Date()) {
  if (!preferences.voiceRepliesEnabled) return false;
  if (!preferences.scheduledListeningEnabled) return true;
  return isArayVoiceWithinWorkWindow(preferences, date);
}

export function isArayScheduledListeningActive(preferences: ArayVoicePreferences, date = new Date()) {
  if (!preferences.scheduledListeningEnabled) return false;
  return isArayVoiceWithinWorkWindow(preferences, date);
}
