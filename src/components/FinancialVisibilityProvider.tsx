"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** Texto usado no lugar de qualquer valor financeiro quando `visible === false` — fonte única,
 * reaproveitada por toda tela que consome `useFinancialVisibility()` (Home e Dashboard
 * Financeiro), para nunca haver dois placeholders divergentes. */
export const VALOR_OCULTO = "••••••";

type FinancialVisibilityContextValue = {
  visible: boolean;
  toggleVisible: () => void;
};

const FinancialVisibilityContext = createContext<FinancialVisibilityContextValue | null>(null);

export function FinancialVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const value = useMemo<FinancialVisibilityContextValue>(
    () => ({
      visible,
      toggleVisible: () => setVisible((current) => !current),
    }),
    [visible],
  );

  return <FinancialVisibilityContext.Provider value={value}>{children}</FinancialVisibilityContext.Provider>;
}

export function useFinancialVisibility() {
  const context = useContext(FinancialVisibilityContext);
  if (!context) {
    throw new Error("useFinancialVisibility deve ser usado dentro de um FinancialVisibilityProvider.");
  }
  return context;
}
