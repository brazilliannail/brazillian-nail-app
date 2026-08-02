export type AtendimentoStatus =
  | "emAndamento"
  | "finalizadoPago"
  | "finalizadoPendente"
  | "finalizadoParcial"
  | "finalizadoCortesia"
  | "cancelado"
  | "estornado";

export type FormaPagamento =
  | "dinheiro"
  | "cartaoCredito"
  | "cartaoDebito"
  | "zelle"
  | "venmo"
  | "cashApp"
  | "cheque"
  | "outra";

export type ServicoRealizado = {
  /** Referência ao catálogo no momento do atendimento; `null` = serviço avulso/legado sem correspondência. */
  servicoId: string | null;
  /** Snapshot do nome — não é lookup ao vivo em `servicos`, preserva o histórico mesmo se o catálogo mudar depois. */
  nomePt: string;
  nomeEn: string;
  /** Snapshot do valor efetivamente cobrado neste atendimento. */
  valor: number;
};

export type Atendimento = {
  id: string;
  clienteId: string;
  /** Agendamento de origem, quando existir; `null` = encaixe sem agendamento prévio. */
  agendamentoId: string | null;
  profissional: string;
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  duracaoMin: number | null;
  servicos: ServicoRealizado[];
  desconto: number;
  gorjeta: number;
  valorRecebido: number;
  formaPagamento: FormaPagamento | null;
  status: AtendimentoStatus;
  observacoesPt: string;
  observacoesEn: string;
  retornoSugeridoDias: number | null;
  /** Próximo agendamento gerado a partir deste atendimento; `null` = nenhum ainda. */
  proximoAgendamentoId: string | null;
};

/** Quais status de atendimento contam como "a cliente foi de fato atendida" (histórico/produção)
 * — reaproveitado por clientes-repo.ts (histórico/último atendimento) e financeiro-service.ts
 * (indicadores por competência). Fica aqui (módulo puro, sem import de `@/lib/db`) para poder
 * ser importado também por código client-side, ao contrário de clientes-repo.ts. */
export const STATUS_ATENDIMENTO_REALIZADO = new Set<string>([
  "finalizadoPago",
  "finalizadoPendente",
  "finalizadoParcial",
  "finalizadoCortesia",
  "estornado",
]);

export function somaServicos(servicos: ServicoRealizado[]) {
  return servicos.reduce((total, item) => total + item.valor, 0);
}

/**
 * A partir do momento em que o atendimento sai de "emAndamento" — mesmo sem nenhum pagamento
 * real registrado (ex.: finalizadoPendente, finalizadoCortesia) —, os campos financeiros
 * (serviços, valor, desconto, gorjeta) ficam travados: o valor devido não pode mais mudar
 * retroativamente. Qualquer correção financeira depois disso passa a exigir um novo lançamento
 * no ledger (`corrigirLancamentoAction`), nunca a edição direta do atendimento. Usada tanto no
 * servidor (`updateAtendimentoAction`) quanto na UI (`AtendimentoFormModal`), para a mesma regra
 * não divergir entre as duas camadas.
 */
export function financasTravadas(status: AtendimentoStatus): boolean {
  return status !== "emAndamento";
}

export function valorTotalDevido(atendimento: Atendimento) {
  return somaServicos(atendimento.servicos) - atendimento.desconto;
}

export function saldoPendente(atendimento: Atendimento) {
  return Math.max(valorTotalDevido(atendimento) - atendimento.valorRecebido, 0);
}

/** Formata o número sequencial do atendimento no padrão ATD-000001. */
export function formatAtendimentoId(numero: number) {
  return `ATD-${String(numero).padStart(6, "0")}`;
}
