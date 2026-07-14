"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { dictionary, type Dictionary, type Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  toggleLocale: () => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt");

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      toggleLocale: () => setLocale((current) => (current === "pt" ? "en" : "pt")),
      t: dictionary[locale] as Dictionary,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de um LanguageProvider.");
  }
  return context;
}
