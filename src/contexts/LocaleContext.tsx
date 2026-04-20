"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AR, EN, type MessageKey } from "@/i18n/messages";
import { interpolate } from "@/i18n/translate";

export type Locale = "ar" | "en";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDomLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "ar" ? "ar" : "en";
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sw_locale");
      if (stored === "en" || stored === "ar") {
        setLocaleState(stored);
        applyDomLocale(stored);
      } else {
        applyDomLocale("ar");
      }
    } catch {
      applyDomLocale("ar");
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem("sw_locale", next);
    } catch {
      /* ignore */
    }
    applyDomLocale(next);
  }, []);

  const bundle = locale === "ar" ? AR : EN;
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => interpolate(bundle[key], vars),
    [bundle]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function dateLocaleTag(locale: Locale): string {
  return locale === "ar" ? "ar-SA" : "en-US";
}
