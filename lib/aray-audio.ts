/**
 * Глобальный singleton для управления озвучкой Арая.
 *
 * Решает баг: при reopen чата создавалось несколько Audio() instance,
 * каждый продолжал играть → 2-3 голоса говорили одновременно.
 *
 * Гарантия: одновременно играет только ОДНА озвучка Арая.
 * Любой новый speak() автоматически останавливает предыдущий.
 * stopAraySpeech() вызывается при close чата, voice mode, page unload, unmount.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/**
 * Останавливает текущую озвучку (если играет).
 * Безопасно вызывать когда audio нет.
 */
export function stopAraySpeech(): void {
  // 1. HTMLAudioElement (ElevenLabs / Cloudflare proxy)
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio.load(); // окончательно сбрасывает буфер
    } catch {}
    currentAudio = null;
  }

  // 2. Освобождаем blob URL
  if (currentUrl) {
    try { URL.revokeObjectURL(currentUrl); } catch {}
    currentUrl = null;
  }

  // 3. Browser SpeechSynthesis (fallback)
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}

/**
 * Играет ElevenLabs / Cloudflare аудио (Blob → URL → Audio).
 * Перед этим автоматически останавливает любую текущую озвучку.
 *
 * @returns Promise который резолвится когда audio закончил играть (или прервался)
 */
export async function playAraySpeech(buf: ArrayBuffer): Promise<void> {
  // Стоп всё что играет сейчас
  stopAraySpeech();

  if (typeof window === "undefined") return;

  const blob = new Blob([buf], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  currentAudio = audio;
  currentUrl = url;

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      // Освобождаем URL только если это ВСЁ ЕЩЁ наш audio
      // (иначе stopAraySpeech уже почистил)
      if (currentAudio === audio) {
        try { URL.revokeObjectURL(url); } catch {}
        currentAudio = null;
        currentUrl = null;
      }
      resolve();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.play().catch(() => cleanup());
  });
}

/**
 * Browser SpeechSynthesis fallback.
 * Перед этим останавливает любую текущую озвучку.
 */
export function speakAraySpeechBrowser(text: string, lang = "ru-RU"): void {
  stopAraySpeech();

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 1.0;
  utter.pitch = 1.0;

  try { window.speechSynthesis.speak(utter); } catch {}
}

/**
 * Проверка играет ли что-то прямо сейчас.
 */
export function isAraySpeaking(): boolean {
  if (currentAudio && !currentAudio.paused) return true;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { return window.speechSynthesis.speaking; } catch { return false; }
  }
  return false;
}
