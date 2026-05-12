const ARAY_HISTORY_EVENT = "aray:history-updated";
const ARAY_HISTORY_CHANNEL = "aray-history-sync";
const ARAY_STOP_EVENT = "aray:stop";
const ARAY_STOP_CHANNEL = "aray-stop-sync";

type AraySyncPayload = {
  type: string;
  source: string;
  at: number;
};

export function createAraySyncSource(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function broadcast(channelName: string, payload: AraySyncPayload) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(payload);
    channel.close();
  } catch {}
}

export function notifyArayHistoryUpdated(source: string) {
  if (typeof window === "undefined") return;
  const detail: AraySyncPayload = { type: ARAY_HISTORY_EVENT, source, at: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent(ARAY_HISTORY_EVENT, { detail }));
  } catch {}
  broadcast(ARAY_HISTORY_CHANNEL, detail);
}

export function subscribeArayHistoryUpdated(source: string, handler: () => void) {
  if (typeof window === "undefined") return () => {};

  const onWindow = (event: Event) => {
    const detail = (event as CustomEvent<AraySyncPayload>).detail;
    if (detail?.source === source) return;
    handler();
  };

  window.addEventListener(ARAY_HISTORY_EVENT, onWindow);

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(ARAY_HISTORY_CHANNEL);
      channel.onmessage = (event: MessageEvent<AraySyncPayload>) => {
        if (event.data?.type !== ARAY_HISTORY_EVENT || event.data.source === source) return;
        handler();
      };
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener(ARAY_HISTORY_EVENT, onWindow);
    channel?.close();
  };
}

export function notifyArayStop(source: string) {
  if (typeof window === "undefined") return;
  const detail: AraySyncPayload = { type: ARAY_STOP_EVENT, source, at: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent(ARAY_STOP_EVENT, { detail }));
  } catch {}
  broadcast(ARAY_STOP_CHANNEL, detail);
}

export function subscribeArayStop(source: string, handler: () => void) {
  if (typeof window === "undefined") return () => {};

  const onWindow = (event: Event) => {
    const detail = (event as CustomEvent<AraySyncPayload>).detail;
    if (detail?.source === source) return;
    handler();
  };

  window.addEventListener(ARAY_STOP_EVENT, onWindow);

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(ARAY_STOP_CHANNEL);
      channel.onmessage = (event: MessageEvent<AraySyncPayload>) => {
        if (event.data?.type !== ARAY_STOP_EVENT || event.data.source === source) return;
        handler();
      };
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener(ARAY_STOP_EVENT, onWindow);
    channel?.close();
  };
}
