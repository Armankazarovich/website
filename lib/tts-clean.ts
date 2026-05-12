import { prepareAraySpeechText } from "./aray-speech";

const MAX_LENGTH = 1500;

/**
 * Backward-compatible TTS cleaner.
 *
 * The full speech dictionary lives in aray-speech.ts so ElevenLabs, browser
 * fallback, store widget and admin assistant all pronounce text the same way.
 */
export function cleanForTTS(text: string): string {
  return prepareAraySpeechText(text, { maxLength: MAX_LENGTH });
}
