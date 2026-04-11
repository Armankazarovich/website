"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  type LangCode, type TranslationKey,
  getTranslations, detectBrowserLang, LANG_LS_KEY, ADMIN_LANGUAGES,
} from "@/lib/admin-i18n";

// ── Маппинг наших кодов → Google Translate коды ──────────────────────────────
const GTRANSLATE_MAP: Record<LangCode, string> = {
  ru: "ru", en: "en", kk: "kk", uk: "uk", uz: "uz", az: "az", hy: "hy",
  tr: "tr", de: "de", fr: "fr", es: "es", ar: "ar", zh: "zh-CN", hi: "hi",
  pt: "pt", ja: "ja", ko: "ko", pl: "pl", it: "it", nl: "nl",
};

/**
 * Активирует Google Translate для перевода страницы.
 * Google Translate Element API загружается один раз, затем переключается программно.
 */
function triggerGoogleTranslate(langCode: LangCode) {
  const gtCode = GTRANSLATE_MAP[langCode] || langCode;

  if (langCode === "ru") {
    // Сброс на русский — убираем перевод
    const frame = document.querySelector<HTMLIFrameElement>(".goog-te-banner-frame");
    if (frame) {
      const btn = frame.contentDocument?.querySelector<HTMLButtonElement>(".goog-close-link");
      btn?.click();
    }
    // Fallback: чистим cookie
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "googtrans=; path=/; domain=." + location.hostname + "; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    // Перезагрузка только если был перевод
    if (document.documentElement.classList.contains("translated-ltr") ||
        document.documentElement.classList.contains("translated-rtl")) {
      location.reload();
    }
    return;
  }

  // Устанавливаем cookie для Google Translate
  document.cookie = `googtrans=/ru/${gtCode}; path=/`;
  document.cookie = `googtrans=/ru/${gtCode}; path=/; domain=.${location.hostname}`;

  // Если Google Translate уже инициализирован — переключаем
  const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (sel) {
    sel.value = gtCode;
    sel.dispatchEvent(new Event("change"));
    return;
  }

  // Иначе — инициализируем Google Translate Element
  if (!(window as any).googleTranslateElementInit) {
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: "ru", autoDisplay: false, layout: 0 },
        "google_translate_element"
      );
      // После инициализации — выбираем нужный язык
      setTimeout(() => {
        const s = document.querySelector<HTMLSelectElement>(".goog-te-combo");
        if (s) { s.value = gtCode; s.dispatchEvent(new Event("change")); }
      }, 500);
    };
    // Загружаем скрипт
    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  } else {
    // Скрипт уже загружен — перезапускаем
    (window as any).googleTranslateElementInit();
  }
}

interface LangCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<LangCtx>({
  lang: "ru",
  setLang: () => {},
  t: (k) => k,
  dir: "ltr",
});

export function AdminLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("ru");

  useEffect(() => {
    const saved = localStorage.getItem(LANG_LS_KEY) as LangCode | null;
    const initial = saved ?? detectBrowserLang();
    setLangState(initial);

    // Если язык не русский — активируем Google Translate при загрузке
    if (initial && initial !== "ru") {
      // Небольшая задержка чтобы DOM загрузился
      setTimeout(() => triggerGoogleTranslate(initial), 1000);
    }
  }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem(LANG_LS_KEY, l);
    // Активируем Google Translate для всей страницы
    triggerGoogleTranslate(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => getTranslations(lang)[key] ?? key,
    [lang],
  );

  const meta = ADMIN_LANGUAGES.find(m => m.code === lang);
  const dir = meta?.dir ?? "ltr";

  return <Ctx.Provider value={{ lang, setLang, t, dir }}>{children}</Ctx.Provider>;
}

export function useAdminLang() {
  return useContext(Ctx);
}
