"use client";

import { createContext, useContext, useState } from "react";
import type { Despesa, LancamentoDespesa } from "@/lib/despesas-mock";

type DespesasContextValue = {
  despesas: Despesa[];
  lancamentosDespesa: LancamentoDespesa[];
};

const DespesasContext = createContext<DespesasContextValue | null>(null);

/** Mesmo padrão de `FinanceiroProvider`: dados iniciais vêm do banco via Server Component em
 * layout.tsx; `router.refresh()` (disparado pelas despesas-actions) atualiza as props e o estado
 * local se resincroniza durante a renderização. */
export function DespesasProvider({
  children,
  despesasIniciais,
  lancamentosDespesaIniciais,
}: {
  children: React.ReactNode;
  despesasIniciais: Despesa[];
  lancamentosDespesaIniciais: LancamentoDespesa[];
}) {
  const [despesas, setDespesas] = useState(despesasIniciais);
  const [lancamentosDespesa, setLancamentosDespesa] = useState(lancamentosDespesaIniciais);

  const [prevDespesasIniciais, setPrevDespesasIniciais] = useState(despesasIniciais);
  if (despesasIniciais !== prevDespesasIniciais) {
    setPrevDespesasIniciais(despesasIniciais);
    setDespesas(despesasIniciais);
  }

  const [prevLancamentosDespesaIniciais, setPrevLancamentosDespesaIniciais] = useState(lancamentosDespesaIniciais);
  if (lancamentosDespesaIniciais !== prevLancamentosDespesaIniciais) {
    setPrevLancamentosDespesaIniciais(lancamentosDespesaIniciais);
    setLancamentosDespesa(lancamentosDespesaIniciais);
  }

  return (
    <DespesasContext.Provider value={{ despesas, lancamentosDespesa }}>{children}</DespesasContext.Provider>
  );
}

function useDespesasContext() {
  const context = useContext(DespesasContext);
  if (!context) throw new Error("useDespesas deve ser usado dentro de um DespesasProvider.");
  return context;
}

export function useDespesas() {
  return useDespesasContext().despesas;
}

export function useLancamentosDespesa() {
  return useDespesasContext().lancamentosDespesa;
}
