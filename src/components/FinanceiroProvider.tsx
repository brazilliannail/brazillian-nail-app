"use client";

import { createContext, useContext, useState } from "react";
import type { LancamentoCaixa } from "@/lib/financeiro-repo";

type FinanceiroContextValue = {
  lancamentosCaixa: LancamentoCaixa[];
  adicionarLancamentosCaixa: (novos: LancamentoCaixa[]) => void;
};

const FinanceiroContext = createContext<FinanceiroContextValue | null>(null);

/**
 * lancamentosCaixaIniciais vem do banco (via Server Component em layout.tsx), igual aos demais
 * providers. O Dashboard Financeiro em si não registra pagamentos/estornos diretamente (isso
 * acontece em atendimentos-actions.ts, via `AtendimentosProvider`) — mas quando uma dessas ações
 * cria novos lançamentos (ex.: correção de pagamento), `adicionarLancamentosCaixa` deixa o cache
 * local em memória refletir isso sem precisar recarregar a página nem reconsultar o banco inteiro.
 */
export function FinanceiroProvider({
  children,
  lancamentosCaixaIniciais,
}: {
  children: React.ReactNode;
  lancamentosCaixaIniciais: LancamentoCaixa[];
}) {
  const [lancamentosCaixa, setLancamentosCaixa] = useState<LancamentoCaixa[]>(lancamentosCaixaIniciais);

  function adicionarLancamentosCaixa(novos: LancamentoCaixa[]) {
    setLancamentosCaixa((prev) => [...prev, ...novos]);
  }

  return (
    <FinanceiroContext.Provider value={{ lancamentosCaixa, adicionarLancamentosCaixa }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

export function useLancamentosCaixa() {
  const context = useContext(FinanceiroContext);
  if (!context) {
    throw new Error("useLancamentosCaixa deve ser usado dentro de um FinanceiroProvider.");
  }
  return context.lancamentosCaixa;
}

export function useAdicionarLancamentosCaixa() {
  const context = useContext(FinanceiroContext);
  if (!context) {
    throw new Error("useAdicionarLancamentosCaixa deve ser usado dentro de um FinanceiroProvider.");
  }
  return context.adicionarLancamentosCaixa;
}
