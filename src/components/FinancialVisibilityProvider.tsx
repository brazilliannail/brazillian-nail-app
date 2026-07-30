"use client";

import { createContext, useContext, useMemo, useState } from "react";

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
