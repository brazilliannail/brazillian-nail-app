import type { Atendimento, FormaPagamento } from "@/lib/atendimentos-mock";
import {
  STATUS_ATENDIMENTO_REALIZADO,
  STATUS_ATENDIMENTO_FATURAMENTO,
  saldoPendente,
  somaServicos,
  valorTotalDevido,
} from "@/lib/atendimentos-mock";
import type { AgendaAppointment } from "@/lib/agenda-mock";
import type { Cliente } from "@/lib/clientes-mock";
import {
  STATUS_ATENDIMENTO_COM_SALDO_ABERTO,
  calcularValorRecebidoGorjeta,
  calcularValorRecebidoServico,
} from "@/lib/pagamentos-repo";
import type { LancamentoCaixa } from "@/lib/financeiro-repo";
import type { DateRange } from "@/lib/financeiro-comparacao";
import { formatDateMMDDYYYY, parseDateMMDDYYYY } from "@/lib/date";

/**
 * Camada de composição de indicadores do Dashboard Financeiro — funções puras (sem I/O), único
 * lugar onde as regras de negócio do Dashboard vivem (ver DASHBOARD_DESIGN.md). Nenhuma dessas
 * funções reimplementa a matemática do livro-razão: todas reaproveitam `calcularValorRecebidoServico`/
 * `calcularValorRecebidoGorjeta`/`STATUS_ATENDIMENTO_COM_SALDO_ABERTO` (pagamentos-repo.ts) e
 * `valorTotalDevido`/`saldoPendente` (atendimentos-mock.ts) já validados na revisão do ledger.
 */

export type StatusPagamento = "recebido" | "pendente" | "parcial" | "cortesia";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function dentroDoIntervalo(data: Date, range: DateRange) {
  return data >= range.start && data <= range.end;
}

/** Mapeia o status final de um atendimento para o rótulo financeiro de 4 valores usado pelos
 * cards de pagamento — `emAndamento`/`cancelado`/`estornado` não têm "status de pagamento"
 * (não aparecem na lista "Pagamentos" nem no detalhamento por status). */
export function statusPagamentoDeAtendimento(status: Atendimento["status"]): StatusPagamento | null {
  switch (status) {
    case "finalizadoPago":
      return "recebido";
    case "finalizadoPendente":
      return "pendente";
    case "finalizadoParcial":
      return "parcial";
    case "finalizadoCortesia":
      return "cortesia";
    default:
      return null;
  }
}

/** Atendimentos "realizados" (ver STATUS_ATENDIMENTO_REALIZADO) cuja `data` cai dentro do range,
 * já convertida de MM/DD/YYYY para Date. Base dos indicadores operacionais/produção (inclui
 * `estornado` — o atendimento aconteceu, mesmo que o dinheiro tenha sido devolvido depois). */
function atendimentosRealizadosNoPeriodo(atendimentos: Atendimento[], range: DateRange): Atendimento[] {
  return atendimentos.filter(
    (a) => STATUS_ATENDIMENTO_REALIZADO.has(a.status) && dentroDoIntervalo(parseDateMMDDYYYY(a.data), range),
  );
}

/** Atendimentos que compõem faturamento de competência (ver STATUS_ATENDIMENTO_FATURAMENTO)
 * cuja `data` cai dentro do range — base de Valor de Serviços, Descontos, Quantidade de
 * Atendimentos, Ticket Médio e dos detalhamentos por cliente/serviço. Exclui `estornado`. */
function atendimentosFaturamentoNoPeriodo(atendimentos: Atendimento[], range: DateRange): Atendimento[] {
  return atendimentos.filter(
    (a) => STATUS_ATENDIMENTO_FATURAMENTO.has(a.status) && dentroDoIntervalo(parseDateMMDDYYYY(a.data), range),
  );
}

/** Atendimentos `estornado` cuja `data` cai dentro do range — base do indicador "Estornos do
 * período" (quantidade + valor bruto revertido). */
function atendimentosEstornadosNoPeriodo(atendimentos: Atendimento[], range: DateRange): Atendimento[] {
  return atendimentos.filter((a) => a.status === "estornado" && dentroDoIntervalo(parseDateMMDDYYYY(a.data), range));
}

/** Lançamentos de caixa (`pagamentos`) cuja `dataPagamento` cai dentro do range — base dos
 * indicadores de caixa (Total Recebido, Gorjetas, Forma de Pagamento — ver D3). */
function lancamentosCaixaNoPeriodo(lancamentos: LancamentoCaixa[], range: DateRange): LancamentoCaixa[] {
  return lancamentos.filter((l) => dentroDoIntervalo(l.dataPagamento, range));
}

export type AgregadoFinanceiro = {
  totalRecebido: number;
  valorServicos: number;
  gorjetas: number;
  descontos: number;
  totalPendente: number;
  quantidadeAtendimentos: number;
  ticketMedio: number;
  estornosQuantidade: number;
  estornosValor: number;
};

/**
 * Agregado financeiro de um período — fonte única para os StatCards de topo e para os campos
 * equivalentes do relatório de atendimentos (nunca recalculado duas vezes com bases diferentes).
 * Valor de Serviços/Descontos/Quantidade de Atendimentos/Ticket Médio usam a base de faturamento
 * (exclui `estornado`, ver STATUS_ATENDIMENTO_FATURAMENTO); `totalPendente` já excluía `estornado`
 * por outro caminho (STATUS_ATENDIMENTO_COM_SALDO_ABERTO); `totalRecebido`/`gorjetas` (caixa) já
 * são líquidos de estorno via o próprio livro-razão, sem mudança aqui.
 */
export function calcularAgregadoFinanceiro(
  atendimentos: Atendimento[],
  lancamentosCaixa: LancamentoCaixa[],
  range: DateRange,
): AgregadoFinanceiro {
  const atendimentosFaturamento = atendimentosFaturamentoNoPeriodo(atendimentos, range);
  const atendimentosEstornados = atendimentosEstornadosNoPeriodo(atendimentos, range);
  const caixaPeriodo = lancamentosCaixaNoPeriodo(lancamentosCaixa, range);

  const valorServicos = round2(atendimentosFaturamento.reduce((total, a) => total + somaServicos(a.servicos), 0));
  const descontos = round2(atendimentosFaturamento.reduce((total, a) => total + a.desconto, 0));
  const quantidadeAtendimentos = atendimentosFaturamento.length;
  const ticketMedio = quantidadeAtendimentos > 0 ? round2(valorServicos / quantidadeAtendimentos) : 0;

  const totalPendente = round2(
    atendimentosFaturamento
      .filter((a) => STATUS_ATENDIMENTO_COM_SALDO_ABERTO.has(a.status))
      .reduce((total, a) => total + saldoPendente(a), 0),
  );

  const totalRecebido = round2(calcularValorRecebidoServico(caixaPeriodo));
  const gorjetas = round2(calcularValorRecebidoGorjeta(caixaPeriodo));

  const estornosQuantidade = atendimentosEstornados.length;
  const estornosValor = round2(atendimentosEstornados.reduce((total, a) => total + somaServicos(a.servicos), 0));

  return {
    totalRecebido,
    valorServicos,
    gorjetas,
    descontos,
    totalPendente,
    quantidadeAtendimentos,
    ticketMedio,
    estornosQuantidade,
    estornosValor,
  };
}

export type RelatorioAtendimentosData = AgregadoFinanceiro & {
  quantidadeClientesAtendidas: number;
  clientesNovas: number;
  clientesRecorrentes: number;
  servicosRealizados: number;
  cancelamentos: number;
  ausencias: number;
};

/** Primeira data (Date) de atendimento "realizado" de cada cliente, considerando TODO o
 * histórico (não só o período) — necessário para distinguir cliente nova de recorrente. */
function primeiroAtendimentoPorCliente(atendimentos: Atendimento[]): Map<string, Date> {
  const primeiro = new Map<string, Date>();
  for (const a of atendimentos) {
    if (!STATUS_ATENDIMENTO_REALIZADO.has(a.status)) continue;
    const data = parseDateMMDDYYYY(a.data);
    const atual = primeiro.get(a.clienteId);
    if (!atual || data < atual) primeiro.set(a.clienteId, data);
  }
  return primeiro;
}

/**
 * Relatório de atendimentos por período (13 indicadores do card `RelatorioAtendimentos`).
 * Cancelamentos/Ausências vêm de `agendamentos` (D2) — nunca de `atendimentos`. Serviços
 * realizados conta itens de `atendimento_servicos`, não sessões (D4).
 */
export function calcularRelatorioAtendimentos(
  atendimentos: Atendimento[],
  agendamentos: AgendaAppointment[],
  lancamentosCaixa: LancamentoCaixa[],
  range: DateRange,
): RelatorioAtendimentosData {
  const agregado = calcularAgregadoFinanceiro(atendimentos, lancamentosCaixa, range);
  const atendimentosPeriodo = atendimentosRealizadosNoPeriodo(atendimentos, range);

  const clienteIdsNoPeriodo = new Set(atendimentosPeriodo.map((a) => a.clienteId));
  const primeiroAtendimento = primeiroAtendimentoPorCliente(atendimentos);
  let clientesNovas = 0;
  for (const clienteId of clienteIdsNoPeriodo) {
    const primeira = primeiroAtendimento.get(clienteId);
    if (primeira && dentroDoIntervalo(primeira, range)) clientesNovas += 1;
  }

  const servicosRealizados = atendimentosPeriodo.reduce((total, a) => total + a.servicos.length, 0);

  const agendamentosPeriodo = agendamentos.filter((ag) => dentroDoIntervalo(parseDateMMDDYYYY(ag.data), range));
  const cancelamentos = agendamentosPeriodo.filter((ag) => ag.status === "cancelado").length;
  const ausencias = agendamentosPeriodo.filter((ag) => ag.status === "naoCompareceu").length;

  return {
    ...agregado,
    quantidadeClientesAtendidas: clienteIdsNoPeriodo.size,
    clientesNovas,
    clientesRecorrentes: clienteIdsNoPeriodo.size - clientesNovas,
    servicosRealizados,
    cancelamentos,
    ausencias,
  };
}

export type PorClienteItem = { clienteId: string; valor: number };
export type PorServicoItem = { nomePt: string; nomeEn: string; valor: number };
export type PorFormaPagamentoItem = { forma: FormaPagamento | null; valor: number };
export type PorStatusPagamentoItem = { status: StatusPagamento; valor: number };

/** Detalhamento por cliente: valor de serviços (competência) gerado no período, por clienteId —
 * mesma base de faturamento de `calcularAgregadoFinanceiro` (exclui `estornado`), para a soma
 * do detalhamento sempre bater com o StatCard "Valor de Serviços". */
export function detalharPorCliente(atendimentos: Atendimento[], range: DateRange): PorClienteItem[] {
  const totais = new Map<string, number>();
  for (const a of atendimentosFaturamentoNoPeriodo(atendimentos, range)) {
    totais.set(a.clienteId, (totais.get(a.clienteId) ?? 0) + somaServicos(a.servicos));
  }
  return Array.from(totais, ([clienteId, valor]) => ({ clienteId, valor: round2(valor) }));
}

/** Detalhamento por serviço (competência, mesma base de faturamento de `detalharPorCliente`):
 * um atendimento com vários serviços contribui uma vez para cada item. */
export function detalharPorServico(atendimentos: Atendimento[], range: DateRange): PorServicoItem[] {
  const totais = new Map<string, { nomePt: string; nomeEn: string; valor: number }>();
  for (const a of atendimentosFaturamentoNoPeriodo(atendimentos, range)) {
    for (const servico of a.servicos) {
      const chave = servico.servicoId ?? `${servico.nomePt}|${servico.nomeEn}`;
      const atual = totais.get(chave);
      if (atual) {
        atual.valor += servico.valor;
      } else {
        totais.set(chave, { nomePt: servico.nomePt, nomeEn: servico.nomeEn, valor: servico.valor });
      }
    }
  }
  return Array.from(totais.values()).map((item) => ({ ...item, valor: round2(item.valor) }));
}

/** Detalhamento por forma de pagamento: recebido líquido de natureza `servico` no período, por
 * `data_pagamento` (caixa, D3) — mesma base usada pelo card `FormaPagamentoBars` do topo. */
export function detalharPorFormaPagamento(lancamentosCaixa: LancamentoCaixa[], range: DateRange): PorFormaPagamentoItem[] {
  const entradasServico = lancamentosCaixaNoPeriodo(lancamentosCaixa, range).filter((l) => l.natureza === "servico");
  const totais = new Map<string | null, number>();
  for (const l of entradasServico) {
    const delta = l.tipo === "entrada" ? l.valor : -l.valor;
    totais.set(l.formaPagamento, (totais.get(l.formaPagamento) ?? 0) + delta);
  }
  return Array.from(totais, ([forma, valor]) => ({ forma: forma as FormaPagamento | null, valor: round2(valor) })).filter(
    (item) => item.valor > 0,
  );
}

/** Detalhamento por status de pagamento: valor de serviços (competência) de cada status
 * finalizado no período — `emAndamento`/`cancelado`/`estornado` não têm status de pagamento. */
export function detalharPorStatusPagamento(atendimentos: Atendimento[], range: DateRange): PorStatusPagamentoItem[] {
  const totais = new Map<StatusPagamento, number>();
  for (const a of atendimentosRealizadosNoPeriodo(atendimentos, range)) {
    const status = statusPagamentoDeAtendimento(a.status);
    if (!status) continue;
    totais.set(status, (totais.get(status) ?? 0) + somaServicos(a.servicos));
  }
  return Array.from(totais, ([status, valor]) => ({ status, valor: round2(valor) }));
}

export type AtendimentoFinanceiro = {
  atendimentoId: string;
  clienteId: string;
  cliente: string;
  dataAtendimento: string;
  dataPagamento: string | null;
  servicoPt: string;
  servicoEn: string;
  valorServicos: number;
  desconto: number;
  gorjeta: number;
  valorRecebido: number;
  saldoPendente: number;
  formaPagamento: FormaPagamento | null;
  status: StatusPagamento;
  observacoesPt: string;
  observacoesEn: string;
};

/** Data (MM/DD/YYYY) do lançamento de entrada de serviço mais recente deste atendimento, ou
 * `null` se nada foi recebido ainda — mesmo critério de "principal" usado para forma de pagamento. */
function dataPagamentoMaisRecente(atendimentoId: string, lancamentosCaixa: LancamentoCaixa[]): string | null {
  const entradas = lancamentosCaixa.filter(
    (l) => l.atendimentoId === atendimentoId && l.natureza === "servico" && l.tipo === "entrada",
  );
  if (entradas.length === 0) return null;
  const maisRecente = entradas.reduce((a, b) => (b.dataPagamento > a.dataPagamento ? b : a));
  return formatDateMMDDYYYY(maisRecente.dataPagamento);
}

/** Mapeia um atendimento para o formato `AtendimentoFinanceiro` (visão financeira de um
 * atendimento), ou `null` se ele não tiver um status de pagamento definido (em andamento,
 * cancelado ou estornado — ver `statusPagamentoDeAtendimento`). */
function mapAtendimentoFinanceiro(
  a: Atendimento,
  clientesPorId: Map<string, Cliente>,
  lancamentosCaixa: LancamentoCaixa[],
): AtendimentoFinanceiro | null {
  const status = statusPagamentoDeAtendimento(a.status);
  if (!status) return null;
  return {
    atendimentoId: a.id,
    clienteId: a.clienteId,
    cliente: clientesPorId.get(a.clienteId)?.nome ?? a.clienteId,
    dataAtendimento: a.data,
    dataPagamento: dataPagamentoMaisRecente(a.id, lancamentosCaixa),
    servicoPt: a.servicos.map((s) => s.nomePt).join(", "),
    servicoEn: a.servicos.map((s) => s.nomeEn).join(", "),
    valorServicos: round2(somaServicos(a.servicos)),
    desconto: a.desconto,
    gorjeta: a.gorjeta,
    valorRecebido: a.valorRecebido,
    saldoPendente: saldoPendente(a),
    formaPagamento: a.formaPagamento,
    status,
    observacoesPt: a.observacoesPt,
    observacoesEn: a.observacoesEn,
  };
}

/**
 * Lista "Pagamentos" (`PagamentoCard`): um item por atendimento com status de pagamento definido
 * (as 4 variantes finalizadas), cuja `data` (competência) cai no período selecionado.
 */
export function listarAtendimentosFinanceiros(
  atendimentos: Atendimento[],
  clientesPorId: Map<string, Cliente>,
  lancamentosCaixa: LancamentoCaixa[],
  range: DateRange,
): AtendimentoFinanceiro[] {
  return atendimentosRealizadosNoPeriodo(atendimentos, range)
    .map((a) => mapAtendimentoFinanceiro(a, clientesPorId, lancamentosCaixa))
    .filter((item): item is AtendimentoFinanceiro => item !== null)
    .sort((a, b) => parseDateMMDDYYYY(b.dataAtendimento).getTime() - parseDateMMDDYYYY(a.dataAtendimento).getTime());
}

/**
 * Busca um único atendimento pelo id e devolve sua visão financeira, **sem** filtro de período —
 * usado para abrir o painel de detalhes a partir da lista "Valores Pendentes" (global, ver D1),
 * que pode referenciar um atendimento de fora do período selecionado no Dashboard. Retorna `null`
 * se o atendimento não existir ou não tiver status de pagamento definido (nunca inventa dados).
 */
export function buscarAtendimentoFinanceiro(
  atendimentoId: string,
  atendimentos: Atendimento[],
  clientesPorId: Map<string, Cliente>,
  lancamentosCaixa: LancamentoCaixa[],
): AtendimentoFinanceiro | null {
  const atendimento = atendimentos.find((a) => a.id === atendimentoId);
  if (!atendimento) return null;
  return mapAtendimentoFinanceiro(atendimento, clientesPorId, lancamentosCaixa);
}

export type PendenciaFinanceira = {
  atendimentoId: string;
  clienteId: string;
  cliente: string;
  dataAtendimento: string;
  valorDevido: number;
  valorRecebido: number;
  saldoPendente: number;
  diasEmAberto: number;
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Lista "Valores Pendentes" (`ValorPendenteCard`): saldo em aberto **agora**, de qualquer
 * atendimento, independentemente do período selecionado no Dashboard (ver D1) — não confundir
 * com o card "Total Pendente" (por período). Ordenada da dívida mais antiga para a mais recente.
 */
export function listarPendencias(atendimentos: Atendimento[], clientesPorId: Map<string, Cliente>, hoje: Date): PendenciaFinanceira[] {
  return atendimentos
    .filter((a) => STATUS_ATENDIMENTO_COM_SALDO_ABERTO.has(a.status) && saldoPendente(a) > 0)
    .map((a) => {
      const data = parseDateMMDDYYYY(a.data);
      const diasEmAberto = Math.max(Math.round((hoje.getTime() - data.getTime()) / MS_POR_DIA), 0);
      return {
        atendimentoId: a.id,
        clienteId: a.clienteId,
        cliente: clientesPorId.get(a.clienteId)?.nome ?? a.clienteId,
        dataAtendimento: a.data,
        valorDevido: round2(valorTotalDevido(a)),
        valorRecebido: a.valorRecebido,
        saldoPendente: saldoPendente(a),
        diasEmAberto,
      };
    })
    .sort((a, b) => b.diasEmAberto - a.diasEmAberto);
}

/**
 * Saldo em aberto global (qualquer atendimento, qualquer data) — mesma regra usada por
 * `listarPendencias`/`Cliente.valorPendente` (clientes-repo.ts). Alimenta o card "Valores
 * pendentes" da Home (`src/app/page.tsx`); o Dashboard Financeiro em si ainda não tem um card
 * equivalente (ver backlog "Saldo em Aberto (Global)" em DASHBOARD_DESIGN.md §9).
 */
export function calcularSaldoAbertoGlobal(atendimentos: Atendimento[]): number {
  return round2(
    atendimentos
      .filter((a) => STATUS_ATENDIMENTO_COM_SALDO_ABERTO.has(a.status))
      .reduce((total, a) => total + saldoPendente(a), 0),
  );
}

export type LancamentoCorrigivel = {
  pagamentoId: string;
  valor: number;
  formaPagamento: FormaPagamento | null;
  observacoesPt: string;
  observacoesEn: string;
};

export type LancamentosCorrigiveis = {
  servico: LancamentoCorrigivel | null;
  gorjeta: LancamentoCorrigivel | null;
};

/** Entrada mais recente de uma natureza para um atendimento — mesmo critério de "atual" usado por
 * `calcularFormaPagamentoPrincipal`/`dataPagamentoMaisRecente` (pagamentos-repo.ts). O servidor
 * (`corrigirLancamentoAction`) ainda valida se esse lançamento não foi totalmente estornado antes
 * de aceitar a correção — esta função só decide qual lançamento oferecer para editar na UI. */
function entradaMaisRecente(
  atendimentoId: string,
  lancamentosCaixa: LancamentoCaixa[],
  natureza: "servico" | "gorjeta",
): LancamentoCorrigivel | null {
  const entradas = lancamentosCaixa.filter(
    (l) => l.atendimentoId === atendimentoId && l.natureza === natureza && l.tipo === "entrada",
  );
  if (entradas.length === 0) return null;
  // Em uma correção, o novo lançamento normalmente repete a `dataPagamento` do original (ver
  // `corrigirLancamentoAction`) — por isso o desempate por `id` (sequencial, ordem de criação) é
  // necessário; comparar só a data deixaria empates decidirem pelo lançamento errado (o original).
  const maisRecente = entradas.reduce((a, b) => {
    if (b.dataPagamento.getTime() !== a.dataPagamento.getTime()) {
      return b.dataPagamento > a.dataPagamento ? b : a;
    }
    return b.id > a.id ? b : a;
  });
  return {
    pagamentoId: maisRecente.id,
    valor: maisRecente.valor,
    formaPagamento: maisRecente.formaPagamento,
    observacoesPt: maisRecente.observacoesPt,
    observacoesEn: maisRecente.observacoesEn,
  };
}

/**
 * Lançamentos de entrada (serviço e/ou gorjeta) de um atendimento candidatos à correção pelo
 * painel "Corrigir pagamento" — `gorjeta` vem `null` quando o atendimento não tem lançamento de
 * gorjeta (a UI só mostra o campo de gorjeta "quando aplicável").
 */
export function buscarLancamentosCorrigiveis(atendimentoId: string, lancamentosCaixa: LancamentoCaixa[]): LancamentosCorrigiveis {
  return {
    servico: entradaMaisRecente(atendimentoId, lancamentosCaixa, "servico"),
    gorjeta: entradaMaisRecente(atendimentoId, lancamentosCaixa, "gorjeta"),
  };
}
