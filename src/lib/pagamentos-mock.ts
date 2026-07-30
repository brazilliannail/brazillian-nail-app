import type { FormaPagamento } from "@/lib/atendimentos-mock";

export type NaturezaPagamento = "servico" | "gorjeta";
export type TipoPagamento = "entrada" | "estorno";

/**
 * Um lançamento no livro-razão financeiro de um atendimento. Cada linha é uma transação real —
 * "um pagamento" no sentido literal (quanto, quando, como, e se é entrada ou estorno). Nunca
 * editado nem apagado depois de criado: toda correção é um novo lançamento de estorno.
 */
export type Pagamento = {
  id: string;
  atendimentoId: string;
  natureza: NaturezaPagamento;
  tipo: TipoPagamento;
  dataPagamento: string;
  valor: number;
  formaPagamento: FormaPagamento | null;
  observacoesPt: string;
  observacoesEn: string;
  estornaPagamentoId: string | null;
};

/** Soma líquida (entradas − estornos) de uma natureza específica dentro de uma lista de lançamentos. */
export function valorLiquido(pagamentos: Pick<Pagamento, "natureza" | "tipo" | "valor">[], natureza: NaturezaPagamento) {
  return pagamentos
    .filter((p) => p.natureza === natureza)
    .reduce((total, p) => total + (p.tipo === "entrada" ? p.valor : -p.valor), 0);
}

/** Formata o número sequencial do pagamento no padrão PAG-000001. */
export function formatPagamentoId(numero: number) {
  return `PAG-${String(numero).padStart(6, "0")}`;
}
