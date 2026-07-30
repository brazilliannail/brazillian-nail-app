import type { FormaPagamento } from "@/lib/atendimentos-mock";
import type { NaturezaPagamento, Pagamento, TipoPagamento } from "@/lib/pagamentos-mock";
import { isoToMMDDYYYY } from "@/lib/date";

export type PagamentoRow = {
  id: string;
  atendimentoId: string;
  natureza: string;
  tipo: string;
  dataPagamento: string;
  valor: number;
  formaPagamento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  estornaPagamentoId: string | null;
};

/** Mapeia uma linha de `pagamentos` (data ISO no banco) para o tipo `Pagamento` da UI (data MM/DD/YYYY). */
export function mapPagamentoRow(row: PagamentoRow): Pagamento {
  return {
    id: row.id,
    atendimentoId: row.atendimentoId,
    natureza: row.natureza as NaturezaPagamento,
    tipo: row.tipo as TipoPagamento,
    dataPagamento: isoToMMDDYYYY(row.dataPagamento),
    valor: row.valor,
    formaPagamento: row.formaPagamento as FormaPagamento,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
    estornaPagamentoId: row.estornaPagamentoId,
  };
}

/**
 * Status de atendimento que podem representar saldo financeiro em aberto. `cancelado` (nada
 * aconteceu), `estornado` (revertido) e `finalizadoCortesia` (dívida dispensada) nunca entram
 * no valor pendente do cliente nem no saldo de um atendimento individual.
 */
export const STATUS_ATENDIMENTO_COM_SALDO_ABERTO = new Set(["finalizadoPago", "finalizadoPendente", "finalizadoParcial"]);

type LancamentoLiquido = Pick<PagamentoRow, "natureza" | "tipo" | "valor">;

/** Valor líquido recebido (entradas − estornos) de natureza `servico`. Nunca inclui gorjeta.
 * Aceita qualquer lançamento com natureza/tipo/valor — reaproveitado também pelos lançamentos
 * de caixa do Dashboard Financeiro (financeiro-repo.ts), que têm mais campos que `PagamentoRow`. */
export function calcularValorRecebidoServico(pagamentos: LancamentoLiquido[]): number {
  return pagamentos
    .filter((p) => p.natureza === "servico")
    .reduce((total, p) => total + (p.tipo === "entrada" ? p.valor : -p.valor), 0);
}

/** Valor líquido recebido (entradas − estornos) de natureza `gorjeta`. Nunca afeta saldo pendente/status. */
export function calcularValorRecebidoGorjeta(pagamentos: LancamentoLiquido[]): number {
  return pagamentos
    .filter((p) => p.natureza === "gorjeta")
    .reduce((total, p) => total + (p.tipo === "entrada" ? p.valor : -p.valor), 0);
}

/** Forma de pagamento "principal" para exibição: a do lançamento de entrada de serviço mais recente. */
export function calcularFormaPagamentoPrincipal(pagamentos: PagamentoRow[]): FormaPagamento | null {
  const entradasServico = pagamentos.filter((p) => p.natureza === "servico" && p.tipo === "entrada");
  if (entradasServico.length === 0) return null;
  const maisRecente = [...entradasServico].sort(
    (a, b) => b.dataPagamento.localeCompare(a.dataPagamento) || b.id.localeCompare(a.id),
  )[0];
  return maisRecente.formaPagamento as FormaPagamento;
}
