import { prisma } from "@/lib/db";
import type { Atendimento, AtendimentoStatus, ServicoRealizado } from "@/lib/atendimentos-mock";
import { isoToMMDDYYYY } from "@/lib/date";
import type { PagamentoRow } from "@/lib/pagamentos-repo";
import {
  calcularFormaPagamentoPrincipal,
  calcularValorRecebidoGorjeta,
  calcularValorRecebidoServico,
} from "@/lib/pagamentos-repo";

type AtendimentoServicoRow = {
  servicoId: string | null;
  nomePt: string;
  nomeEn: string;
  valor: number;
};

type AtendimentoRow = {
  id: string;
  clienteId: string;
  agendamentoId: string | null;
  profissional: string;
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  duracaoMin: number | null;
  desconto: number;
  status: string;
  observacoesPt: string;
  observacoesEn: string;
  retornoSugeridoDias: number | null;
  proximoAgendamentoId: string | null;
  servicos: AtendimentoServicoRow[];
  pagamentos: PagamentoRow[];
};

function mapServicoRealizado(row: AtendimentoServicoRow): ServicoRealizado {
  return {
    servicoId: row.servicoId,
    nomePt: row.nomePt,
    nomeEn: row.nomeEn,
    valor: row.valor,
  };
}

/**
 * Mapeia uma linha de `atendimentos` (com `servicos` e `pagamentos` incluídos) para o tipo
 * `Atendimento` da UI. `gorjeta`, `valorRecebido` e `formaPagamento` não são colunas do banco —
 * são sempre derivados do livro-razão `pagamentos` (ver `pagamentos-repo.ts`).
 */
export function mapAtendimentoRow(row: AtendimentoRow): Atendimento {
  return {
    id: row.id,
    clienteId: row.clienteId,
    agendamentoId: row.agendamentoId,
    profissional: row.profissional,
    data: isoToMMDDYYYY(row.data),
    horarioInicio: row.horarioInicio,
    horarioFim: row.horarioFim,
    duracaoMin: row.duracaoMin,
    servicos: row.servicos.map(mapServicoRealizado),
    desconto: row.desconto,
    gorjeta: calcularValorRecebidoGorjeta(row.pagamentos),
    valorRecebido: calcularValorRecebidoServico(row.pagamentos),
    formaPagamento: calcularFormaPagamentoPrincipal(row.pagamentos),
    status: row.status as AtendimentoStatus,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
    retornoSugeridoDias: row.retornoSugeridoDias,
    proximoAgendamentoId: row.proximoAgendamentoId,
  };
}

/** Lê todos os atendimentos do banco SQLite via Prisma, com seus serviços e pagamentos, ordenados por data. */
export async function getAtendimentos(): Promise<Atendimento[]> {
  const rows = await prisma.atendimento.findMany({
    include: { servicos: true, pagamentos: true },
    orderBy: [{ data: "desc" }, { horarioInicio: "asc" }],
  });
  return rows.map(mapAtendimentoRow);
}
