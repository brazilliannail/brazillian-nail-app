import { prisma } from "@/lib/db";
import type { FormaPagamento } from "@/lib/atendimentos-mock";
import type { NaturezaPagamento, TipoPagamento } from "@/lib/pagamentos-mock";
import { parseDateISO } from "@/lib/date";

/**
 * Um lançamento do livro-razão (`pagamentos`) já com a data convertida para `Date`, usado
 * exclusivamente pelos indicadores de **caixa** do Dashboard Financeiro (Total Recebido,
 * Gorjetas, Forma de Pagamento) — ver DASHBOARD_DESIGN.md, decisão D3: esses indicadores
 * filtram pelo período usando `data_pagamento`, nunca a data do atendimento.
 */
export type LancamentoCaixa = {
  id: string;
  atendimentoId: string;
  natureza: NaturezaPagamento;
  tipo: TipoPagamento;
  dataPagamento: Date;
  valor: number;
  formaPagamento: FormaPagamento | null;
  observacoesPt: string;
  observacoesEn: string;
};

/**
 * Lê todo o livro-razão financeiro (todas as linhas de `pagamentos`, entradas e estornos).
 * Não recebe filtro de período aqui — o Dashboard filtra em memória (volume baixo, single-user
 * local; ver DASHBOARD_DESIGN.md §6) para poder reaproveitar o mesmo dataset em vários cards
 * sem repetir consultas.
 */
export async function getLancamentosCaixa(): Promise<LancamentoCaixa[]> {
  const rows = await prisma.pagamento.findMany({
    select: {
      id: true,
      atendimentoId: true,
      natureza: true,
      tipo: true,
      dataPagamento: true,
      valor: true,
      formaPagamento: true,
      observacoesPt: true,
      observacoesEn: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    atendimentoId: row.atendimentoId,
    natureza: row.natureza as NaturezaPagamento,
    tipo: row.tipo as TipoPagamento,
    dataPagamento: parseDateISO(row.dataPagamento),
    valor: row.valor,
    formaPagamento: row.formaPagamento as FormaPagamento | null,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
  }));
}
