"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  type LangCode, type TranslationKey,
  getTranslations, detectBrowserLang, LANG_LS_KEY, ADMIN_LANGUAGES,
} from "@/lib/admin-i18n";

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
  }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem(LANG_LS_KEY, l);
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
