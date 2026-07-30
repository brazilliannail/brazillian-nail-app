import { prisma } from "@/lib/db";
import type {
  Cliente,
  ClienteStatus,
  Contato,
  IdiomaContato,
  RelacaoContato,
  CanalPreferidoContato,
  ReengajamentoStatus,
  HistoricoAtendimento,
} from "@/lib/clientes-mock";
import { statusHistoricoDeAtendimento } from "@/lib/clientes-mock";
import type { AtendimentoStatus } from "@/lib/atendimentos-mock";
import { STATUS_ATENDIMENTO_REALIZADO } from "@/lib/atendimentos-mock";
import { isoToMMDDYYYY, formatMinutesAsTime, formatDateISO } from "@/lib/date";
import type { PagamentoRow } from "@/lib/pagamentos-repo";
import {
  STATUS_ATENDIMENTO_COM_SALDO_ABERTO,
  calcularFormaPagamentoPrincipal,
  calcularValorRecebidoGorjeta,
  calcularValorRecebidoServico,
} from "@/lib/pagamentos-repo";

type ContatoRow = {
  nomeContato: string;
  telefone: string;
  relacao: string;
  idioma: string;
  canalPreferido: string;
  receberLembretes: boolean;
};

type AtendimentoServicoRow = {
  nomePt: string;
  nomeEn: string;
  valor: number;
};

type AtendimentoHistoricoRow = {
  id: string;
  data: string;
  horarioInicio: string;
  status: string;
  desconto: number;
  observacoesPt: string;
  observacoesEn: string;
  servicos: AtendimentoServicoRow[];
  pagamentos: PagamentoRow[];
  proximoAgendamento: { data: string } | null;
};

type AgendamentoProximoRow = {
  data: string;
  inicioMin: number;
  status: string;
};

type ClienteRow = {
  id: string;
  nome: string;
  nomePreferencia: string | null;
  status: string;
  observacoesPt: string;
  observacoesEn: string;
  avisosImportantesPt: string;
  avisosImportantesEn: string;
  reengajamentoStatus: string;
  reengajamentoAtualizadoEm: Date | null;
  reengajamentoAdiadoAte: string | null;
  reengajamentoObservacao: string | null;
  contatos: ({ papel: string } & ContatoRow)[];
  atendimentos: AtendimentoHistoricoRow[];
  agendamentos: AgendamentoProximoRow[];
};

const STATUS_AGENDAMENTO_FUTURO = new Set(["aguardando", "confirmado"]);
function mapContato(row: ContatoRow): Contato {
  return {
    nomeContato: row.nomeContato,
    telefone: row.telefone,
    relacao: row.relacao as RelacaoContato,
    idioma: row.idioma as IdiomaContato,
    canalPreferido: row.canalPreferido as CanalPreferidoContato,
    receberLembretes: row.receberLembretes,
  };
}

function mapHistorico(row: AtendimentoHistoricoRow): HistoricoAtendimento | null {
  const status = statusHistoricoDeAtendimento(row.status as AtendimentoStatus);
  if (!status) return null;

  return {
    id: row.id,
    data: isoToMMDDYYYY(row.data),
    horario: row.horarioInicio,
    servicoPt: row.servicos.map((s) => s.nomePt).join(", "),
    servicoEn: row.servicos.map((s) => s.nomeEn).join(", "),
    valorServicos: row.servicos.reduce((total, s) => total + s.valor, 0),
    desconto: row.desconto,
    gorjeta: calcularValorRecebidoGorjeta(row.pagamentos),
    valorRecebido: calcularValorRecebidoServico(row.pagamentos),
    formaPagamento: calcularFormaPagamentoPrincipal(row.pagamentos),
    status,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
    proximoRetorno: row.proximoAgendamento ? isoToMMDDYYYY(row.proximoAgendamento.data) : null,
  };
}

function calcularUltimoAtendimento(atendimentos: AtendimentoHistoricoRow[]): string {
  const realizados = atendimentos.filter((a) => STATUS_ATENDIMENTO_REALIZADO.has(a.status));
  if (realizados.length === 0) return "";
  const maisRecente = [...realizados].sort((a, b) => b.data.localeCompare(a.data))[0];
  return isoToMMDDYYYY(maisRecente.data);
}

function calcularProximoAgendamento(agendamentos: AgendamentoProximoRow[]): string | null {
  const hojeIso = formatDateISO(new Date());
  const futuros = agendamentos
    .filter((a) => STATUS_AGENDAMENTO_FUTURO.has(a.status) && a.data >= hojeIso)
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicioMin - b.inicioMin);
  const proximo = futuros[0];
  if (!proximo) return null;
  return `${isoToMMDDYYYY(proximo.data)} · ${formatMinutesAsTime(proximo.inicioMin)}`;
}

/**
 * Saldo pendente (nunca negativo) de um atendimento, considerando só natureza `servico` do
 * ledger — gorjeta nunca é dívida. Atendimentos fora de `STATUS_ATENDIMENTO_COM_SALDO_ABERTO`
 * (cancelado/estornado/emAndamento/cortesia) não entram no valor pendente do cliente.
 */
function calcularValorPendenteCliente(atendimentos: AtendimentoHistoricoRow[]): number {
  return atendimentos
    .filter((a) => STATUS_ATENDIMENTO_COM_SALDO_ABERTO.has(a.status))
    .reduce((total, a) => {
      const valorServicos = a.servicos.reduce((soma, s) => soma + s.valor, 0);
      const valorDevido = valorServicos - a.desconto;
      const valorRecebido = calcularValorRecebidoServico(a.pagamentos);
      return total + Math.max(valorDevido - valorRecebido, 0);
    }, 0);
}

/**
 * Mapeia uma linha de `clientes` (com `contatos`, `atendimentos` e `agendamentos` incluídos)
 * para o tipo `Cliente` da UI. `valorPendente` é sempre calculado por consulta a partir do
 * livro-razão `pagamentos` — nunca uma coluna gravada.
 */
export function mapClienteRow(row: ClienteRow): Cliente {
  const principal = row.contatos.find((c) => c.papel === "principal") ?? null;
  const secundario = row.contatos.find((c) => c.papel === "secundario") ?? null;

  const historico = [...row.atendimentos]
    .sort((a, b) => b.data.localeCompare(a.data) || b.horarioInicio.localeCompare(a.horarioInicio))
    .map(mapHistorico)
    .filter((item): item is HistoricoAtendimento => item !== null);

  return {
    id: row.id,
    nome: row.nome,
    nomePreferencia: row.nomePreferencia,
    contatoPrincipal: principal ? mapContato(principal) : null,
    contatoSecundario: secundario ? mapContato(secundario) : null,
    status: row.status as ClienteStatus,
    ultimoAtendimento: calcularUltimoAtendimento(row.atendimentos),
    proximoAgendamento: calcularProximoAgendamento(row.agendamentos),
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
    avisosImportantesPt: JSON.parse(row.avisosImportantesPt) as string[],
    avisosImportantesEn: JSON.parse(row.avisosImportantesEn) as string[],
    valorPendente: calcularValorPendenteCliente(row.atendimentos),
    historico,
    reengajamentoStatus: row.reengajamentoStatus as ReengajamentoStatus,
    reengajamentoAtualizadoEm: row.reengajamentoAtualizadoEm ? row.reengajamentoAtualizadoEm.toISOString() : null,
    reengajamentoAdiadoAte: row.reengajamentoAdiadoAte,
    reengajamentoObservacao: row.reengajamentoObservacao,
  };
}

export const includeRelacionamentosCliente = {
  contatos: true,
  atendimentos: {
    include: {
      servicos: true,
      pagamentos: true,
      proximoAgendamento: { select: { data: true } },
    },
  },
  agendamentos: true,
} as const;

/** Lê todos os clientes e contatos do banco SQLite via Prisma. */
export async function getClientes(): Promise<Cliente[]> {
  const rows = await prisma.cliente.findMany({
    include: includeRelacionamentosCliente,
    orderBy: { numeroSequencial: "asc" },
  });

  return rows.map(mapClienteRow);
}

/** Busca uma única cliente (com contatos) por id no banco SQLite via Prisma. Retorna null se não existir. */
export async function getClienteById(id: string): Promise<Cliente | null> {
  const row = await prisma.cliente.findUnique({
    where: { id },
    include: includeRelacionamentosCliente,
  });

  return row ? mapClienteRow(row) : null;
}
