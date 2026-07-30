"use server";

import { prisma } from "@/lib/db";
import { mapAtendimentoRow } from "@/lib/atendimentos-repo";
import { mapAgendamentoRow } from "@/lib/agenda-repo";
import type { Atendimento, AtendimentoStatus, FormaPagamento, ServicoRealizado } from "@/lib/atendimentos-mock";
import type { AgendaAppointment } from "@/lib/agenda-mock";
import type { StatusKey } from "@/lib/mock-data";
import { formatMinutesAsTime, mmddyyyyToISO } from "@/lib/date";
import { formatPagamentoId } from "@/lib/pagamentos-mock";
import { calcularValorRecebidoServico } from "@/lib/pagamentos-repo";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

async function nextAtendimentoId(): Promise<string> {
  const rows = await prisma.atendimento.findMany({ select: { id: true } });
  let max = 0;
  for (const row of rows) {
    const match = /^ATD-(\d+)$/.exec(row.id);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `ATD-${String(max + 1).padStart(6, "0")}`;
}

/** Reserva `quantidade` IDs sequenciais novos no padrão PAG-000001, dentro da transação. */
async function proximosPagamentoIds(tx: Tx, quantidade: number): Promise<string[]> {
  if (quantidade === 0) return [];
  const rows = await tx.pagamento.findMany({ select: { id: true } });
  let max = 0;
  for (const row of rows) {
    const match = /^PAG-(\d+)$/.exec(row.id);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return Array.from({ length: quantidade }, (_, index) => formatPagamentoId(max + index + 1));
}

/** Quanto de uma entrada específica ainda não foi estornado — usado tanto pelo estorno total do
 * atendimento (`estornarAtendimentoAction`) quanto pela correção de um único lançamento
 * (`corrigirLancamentoAction`). Filtra sempre por `estornaPagamentoId`, então nunca soma o
 * estorno de outra entrada por engano. */
function valorRestanteDeEntrada(
  pagamentos: { tipo: string; estornaPagamentoId: string | null; valor: number }[],
  entradaId: string,
  valorEntrada: number,
): number {
  const jaEstornado = pagamentos
    .filter((p) => p.tipo === "estorno" && p.estornaPagamentoId === entradaId)
    .reduce((total, p) => total + p.valor, 0);
  return valorEntrada - jaEstornado;
}

/** Status financeiro após qualquer alteração no ledger que ocorre depois da conclusão original
 * (pagamento adicional ou correção de lançamento de natureza "servico"). Nunca decide cortesia
 * nem retorna a "finalizadoPendente" sozinho — essas duas decisões só acontecem em
 * `concluirAtendimentoAction`; a partir do primeiro real recebido, só existe parcial ou pago. */
function calcularStatusAposRecebimento(
  devido: number,
  recebidoTotal: number,
): Extract<AtendimentoStatus, "finalizadoPago" | "finalizadoParcial"> {
  return recebidoTotal >= devido ? "finalizadoPago" : "finalizadoParcial";
}

function validarAtendimento(dados: Omit<Atendimento, "id">) {
  if (dados.clienteId.trim() === "") {
    throw new Error("Selecione uma cliente.");
  }
  if (dados.profissional.trim() === "") {
    throw new Error("Informe a profissional responsável.");
  }
  if (dados.servicos.length === 0) {
    throw new Error("Adicione ao menos um serviço realizado.");
  }
  for (const servico of dados.servicos) {
    if (servico.nomePt.trim() === "") {
      throw new Error("Informe o nome de todos os serviços realizados.");
    }
    if (servico.valor < 0) {
      throw new Error("O valor de um serviço não pode ser negativo.");
    }
  }
  if (dados.desconto < 0) {
    throw new Error("Desconto não pode ser negativo.");
  }
}

/** Assinatura estável de um conjunto de serviços realizados, para detectar mudança de valores. */
function assinaturaServicos(servicos: ServicoRealizado[]): string {
  return servicos.map((s) => `${s.servicoId ?? ""}|${s.nomePt}|${s.nomeEn}|${s.valor}`).join(";");
}

async function sincronizarServicos(tx: Tx, atendimentoId: string, servicos: ServicoRealizado[]) {
  await tx.atendimentoServico.deleteMany({ where: { atendimentoId } });
  await tx.atendimentoServico.createMany({
    data: servicos.map((servico) => ({
      atendimentoId,
      servicoId: servico.servicoId,
      nomePt: servico.nomePt.trim(),
      nomeEn: servico.nomeEn.trim(),
      valor: servico.valor,
    })),
  });
}

async function buscarAtendimentoCompleto(tx: Tx, id: string): Promise<Atendimento> {
  const row = await tx.atendimento.findUniqueOrThrow({
    where: { id },
    include: { servicos: true, pagamentos: true },
  });
  return mapAtendimentoRow(row);
}

/** Cria um novo atendimento (sempre com status "emAndamento"), com seus serviços em snapshot. */
export async function createAtendimentoAction(dados: Omit<Atendimento, "id">): Promise<Atendimento> {
  validarAtendimento(dados);

  return prisma.$transaction(async (tx) => {
    const id = await nextAtendimentoId();
    const dataIso = mmddyyyyToISO(dados.data);

    await tx.atendimento.create({
      data: {
        id,
        clienteId: dados.clienteId,
        agendamentoId: dados.agendamentoId,
        profissional: dados.profissional.trim(),
        data: dataIso,
        horarioInicio: dados.horarioInicio,
        horarioFim: null,
        duracaoMin: null,
        desconto: dados.desconto,
        status: "emAndamento",
        observacoesPt: dados.observacoesPt.trim(),
        observacoesEn: dados.observacoesEn.trim(),
        retornoSugeridoDias: dados.retornoSugeridoDias,
      },
    });

    await sincronizarServicos(tx, id, dados.servicos);

    return buscarAtendimentoCompleto(tx, id);
  });
}

/** Nome usado no snapshot quando o agendamento de origem não tem serviço definido no catálogo. */
const SERVICO_A_DEFINIR = { pt: "Serviço a definir", en: "Service to be defined" };

/** Profissional padrão para atendimentos abertos a partir da Agenda — mesmo default já usado
 * pelo formulário de Atendimento (`AtendimentoFormModal`). Continua editável no atendimento.
 * TODO: passar a vir de Configurações quando aquele módulo tiver persistência real. */
const PROFISSIONAL_PADRAO = "Rosângela";

export type IniciarAtendimentoResultado = {
  atendimento: Atendimento;
  /** Agendamento de origem já com o status sincronizado. */
  agendamento: AgendaAppointment;
  /** `false` = já existia um atendimento ativo para este agendamento e ele foi apenas devolvido. */
  criado: boolean;
};

/**
 * Abre o atendimento de um agendamento da Agenda, reaproveitando os dados já persistidos
 * (cliente, data, horário, serviço, observações) — a profissional não redigita nada.
 *
 * Proteção contra duplicidade: dentro da mesma transação, procura um atendimento já vinculado a
 * este `agendamentoId`; se existir, devolve-o com `criado: false` em vez de criar outro.
 * Atendimentos `cancelado` são ignorados nessa busca de propósito — um atendimento aberto por
 * engano e cancelado não pode bloquear para sempre o agendamento, que precisa poder ser reaberto.
 *
 * Sincronização de status: o agendamento passa a "emAtendimento" na mesma transação.
 * Nenhuma regra financeira é envolvida aqui — nasce sem pagamento, como todo atendimento novo.
 */
export async function iniciarAtendimentoDoAgendamentoAction(
  agendamentoId: string,
): Promise<IniciarAtendimentoResultado> {
  return prisma.$transaction(async (tx) => {
    const agendamento = await tx.agendamento.findUnique({ where: { id: agendamentoId } });
    if (!agendamento) {
      throw new Error("Agendamento não encontrado.");
    }
    if (agendamento.status === "cancelado" || agendamento.status === "naoCompareceu") {
      throw new Error("Não é possível iniciar o atendimento de um agendamento cancelado ou sem comparecimento.");
    }

    const existente = await tx.atendimento.findFirst({
      where: { agendamentoId, status: { not: "cancelado" } },
      include: { servicos: true, pagamentos: true },
      orderBy: { id: "asc" },
    });
    if (existente) {
      return {
        atendimento: mapAtendimentoRow(existente),
        agendamento: mapAgendamentoRow(agendamento),
        criado: false,
      };
    }

    const servicoCatalogo = agendamento.servicoId
      ? await tx.servico.findUnique({ where: { id: agendamento.servicoId } })
      : null;

    // Um atendimento exige ao menos um serviço; sem serviço no catálogo grava-se uma linha avulsa
    // (`servicoId: null`), que a profissional ajusta depois ao concluir.
    const servicoSnapshot = {
      servicoId: servicoCatalogo?.id ?? null,
      nomePt: servicoCatalogo?.nomePt ?? SERVICO_A_DEFINIR.pt,
      nomeEn: servicoCatalogo?.nomeEn ?? (servicoCatalogo ? "" : SERVICO_A_DEFINIR.en),
      valor: agendamento.valorEstimado ?? servicoCatalogo?.precoPadrao ?? 0,
    };

    const id = await nextAtendimentoId();

    await tx.atendimento.create({
      data: {
        id,
        clienteId: agendamento.clienteId,
        agendamentoId: agendamento.id,
        profissional: PROFISSIONAL_PADRAO,
        // `agendamento.data` já está em ISO no banco — não passa por `mmddyyyyToISO`.
        data: agendamento.data,
        horarioInicio: formatMinutesAsTime(agendamento.inicioMin),
        horarioFim: null,
        duracaoMin: null,
        desconto: 0,
        status: "emAndamento",
        observacoesPt: agendamento.observacoesPt,
        observacoesEn: agendamento.observacoesEn,
        retornoSugeridoDias: servicoCatalogo?.retornoSugeridoDias ?? null,
      },
    });

    await sincronizarServicos(tx, id, [servicoSnapshot]);

    const agendamentoAtualizado =
      agendamento.status === "emAtendimento"
        ? agendamento
        : await tx.agendamento.update({ where: { id: agendamento.id }, data: { status: "emAtendimento" } });

    return {
      atendimento: await buscarAtendimentoCompleto(tx, id),
      agendamento: mapAgendamentoRow(agendamentoAtualizado),
      criado: true,
    };
  });
}

/**
 * Atualiza um atendimento existente (não permitido para status encerrado: cancelado/estornado).
 * Assim que existir qualquer pagamento registrado para o atendimento, `desconto` e `servicos`
 * (que definem o valor devido) ficam travados — só campos não financeiros seguem editáveis.
 */
export async function updateAtendimentoAction(atendimento: Atendimento): Promise<Atendimento> {
  validarAtendimento(atendimento);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.atendimento.findUnique({
      where: { id: atendimento.id },
      include: { servicos: true, pagamentos: { select: { id: true } } },
    });
    if (!existente) {
      throw new Error("Atendimento não encontrado.");
    }
    if (existente.status === "cancelado" || existente.status === "estornado") {
      throw new Error("Não é possível editar um atendimento cancelado ou estornado.");
    }

    if (existente.pagamentos.length > 0) {
      if (existente.desconto !== atendimento.desconto) {
        throw new Error("Não é possível alterar o desconto de um atendimento com pagamento registrado.");
      }
      const servicosAtuais: ServicoRealizado[] = existente.servicos.map((s) => ({
        servicoId: s.servicoId,
        nomePt: s.nomePt,
        nomeEn: s.nomeEn,
        valor: s.valor,
      }));
      if (assinaturaServicos(servicosAtuais) !== assinaturaServicos(atendimento.servicos)) {
        throw new Error("Não é possível alterar os serviços/valores de um atendimento com pagamento registrado.");
      }
    }

    const dataIso = mmddyyyyToISO(atendimento.data);

    await tx.atendimento.update({
      where: { id: atendimento.id },
      data: {
        clienteId: atendimento.clienteId,
        agendamentoId: atendimento.agendamentoId,
        profissional: atendimento.profissional.trim(),
        data: dataIso,
        horarioInicio: atendimento.horarioInicio,
        desconto: atendimento.desconto,
        observacoesPt: atendimento.observacoesPt.trim(),
        observacoesEn: atendimento.observacoesEn.trim(),
        retornoSugeridoDias: atendimento.retornoSugeridoDias,
      },
    });

    await sincronizarServicos(tx, atendimento.id, atendimento.servicos);

    return buscarAtendimentoCompleto(tx, atendimento.id);
  });
}

/**
 * Reflete na Agenda o desfecho do atendimento, na mesma transação. Só age quando o agendamento
 * está em "emAtendimento": se a profissional já mexeu no status pela Agenda (cancelou, reagendou,
 * marcou não compareceu), essa decisão manual não é sobrescrita. Devolve `null` quando não havia
 * agendamento de origem (encaixe) ou quando nada precisou mudar.
 */
async function sincronizarAgendamentoDoAtendimento(
  tx: Tx,
  agendamentoId: string | null,
  novoStatus: Extract<StatusKey, "concluido" | "confirmado">,
): Promise<AgendaAppointment | null> {
  if (!agendamentoId) return null;
  const agendamento = await tx.agendamento.findUnique({ where: { id: agendamentoId } });
  if (!agendamento || agendamento.status !== "emAtendimento") return null;
  const atualizado = await tx.agendamento.update({ where: { id: agendamentoId }, data: { status: novoStatus } });
  return mapAgendamentoRow(atualizado);
}

/** Resultado das ações que podem repercutir na Agenda; `agendamento` é `null` quando nada mudou lá. */
export type AtendimentoComAgenda = {
  atendimento: Atendimento;
  agendamento: AgendaAppointment | null;
};

type StatusFinal = Extract<
  AtendimentoStatus,
  "finalizadoPago" | "finalizadoPendente" | "finalizadoParcial" | "finalizadoCortesia"
>;

type ConcluirDados = {
  horarioFim: string;
  duracaoMin: number;
  valorRecebido: number;
  gorjeta: number;
  formaPagamento: FormaPagamento | null;
  status: StatusFinal;
};

/**
 * Deriva o status final a partir do valor devido e do valor efetivamente recebido — a mesma
 * regra usada para sugerir o status na UI (`ConcluirAtendimentoModal`), mas aqui como fonte da
 * verdade no servidor: o status enviado pelo cliente nunca é gravado por si só (ver
 * `concluirAtendimentoAction`), evitando um estado financeiro inconsistente (ex.: status "pago"
 * com valor recebido zero) caso a Server Action seja chamada diretamente com um payload adulterado.
 * A única exceção é a cortesia explícita: a profissional pode dispensar a dívida (valor recebido
 * zero) mesmo quando o valor devido é maior que zero.
 */
function calcularStatusFinal(devido: number, valorRecebido: number, statusEnviado: StatusFinal): StatusFinal {
  if (statusEnviado === "finalizadoCortesia" && valorRecebido === 0) return "finalizadoCortesia";
  if (devido === 0) return "finalizadoCortesia";
  if (valorRecebido <= 0) return "finalizadoPendente";
  if (valorRecebido >= devido) return "finalizadoPago";
  return "finalizadoParcial";
}

/**
 * Conclui um atendimento em andamento: grava horário de término/duração e registra no
 * livro-razão (`pagamentos`) o que foi efetivamente recebido — um lançamento `servico` (se
 * houver valor recebido) e um lançamento `gorjeta` (se houver gorjeta), cada um `natureza`
 * separada, nunca gravados como coluna em `atendimentos`.
 */
export async function concluirAtendimentoAction(id: string, dados: ConcluirDados): Promise<AtendimentoComAgenda> {
  if (dados.valorRecebido < 0) {
    throw new Error("O valor recebido não pode ser negativo.");
  }
  if (dados.gorjeta < 0) {
    throw new Error("A gorjeta não pode ser negativa.");
  }

  return prisma.$transaction(async (tx) => {
    const existente = await tx.atendimento.findUnique({
      where: { id },
      include: { servicos: true, pagamentos: { select: { id: true } } },
    });
    if (!existente) {
      throw new Error("Atendimento não encontrado.");
    }
    if (existente.status !== "emAndamento") {
      throw new Error("Apenas atendimentos em andamento podem ser concluídos.");
    }
    if (existente.pagamentos.length > 0) {
      throw new Error("Este atendimento já possui pagamento registrado.");
    }

    const devido = existente.servicos.reduce((total, servico) => total + servico.valor, 0) - existente.desconto;
    const status = calcularStatusFinal(devido, dados.valorRecebido, dados.status);

    const lancamentos: { natureza: "servico" | "gorjeta"; valor: number }[] = [];
    if (dados.valorRecebido > 0) lancamentos.push({ natureza: "servico", valor: dados.valorRecebido });
    if (dados.gorjeta > 0) lancamentos.push({ natureza: "gorjeta", valor: dados.gorjeta });

    const ids = await proximosPagamentoIds(tx, lancamentos.length);
    if (lancamentos.length > 0) {
      await tx.pagamento.createMany({
        data: lancamentos.map((lancamento, index) => ({
          id: ids[index],
          atendimentoId: id,
          natureza: lancamento.natureza,
          tipo: "entrada",
          dataPagamento: existente.data,
          valor: lancamento.valor,
          formaPagamento: dados.formaPagamento,
        })),
      });
    }

    const row = await tx.atendimento.update({
      where: { id },
      data: {
        horarioFim: dados.horarioFim,
        duracaoMin: dados.duracaoMin,
        status,
      },
      include: { servicos: true, pagamentos: true },
    });

    // Atendimento concluído → agendamento de origem passa a "concluido" na mesma transação.
    const agendamento = await sincronizarAgendamentoDoAtendimento(tx, existente.agendamentoId, "concluido");

    return { atendimento: mapAtendimentoRow(row), agendamento };
  });
}

/**
 * Cancela um atendimento em andamento. Só é possível antes de existir qualquer pagamento —
 * o que, por construção, é sempre verdadeiro em "emAndamento" (pagamentos só nascem em
 * `concluirAtendimentoAction`). A checagem abaixo é uma trava defensiva explícita, não apenas
 * implícita no status.
 */
export async function cancelarAtendimentoAction(id: string): Promise<AtendimentoComAgenda> {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.atendimento.findUnique({
      where: { id },
      include: { pagamentos: { select: { id: true } } },
    });
    if (!existente) {
      throw new Error("Atendimento não encontrado.");
    }
    if (existente.status !== "emAndamento") {
      throw new Error("Apenas atendimentos em andamento podem ser cancelados.");
    }
    if (existente.pagamentos.length > 0) {
      throw new Error("Não é possível cancelar um atendimento com pagamento registrado — use estorno.");
    }

    const row = await tx.atendimento.update({
      where: { id },
      data: { status: "cancelado" },
      include: { servicos: true, pagamentos: true },
    });

    // Atendimento cancelado (nunca teve pagamento) → o agendamento volta a "confirmado", o estado
    // em que estava antes de ser iniciado. Cancelar o compromisso da cliente na Agenda continua
    // sendo uma decisão explícita da profissional, feita pela própria Agenda.
    const agendamento = await sincronizarAgendamentoDoAtendimento(tx, existente.agendamentoId, "confirmado");

    return { atendimento: mapAtendimentoRow(row), agendamento };
  });
}

/**
 * Estorna um atendimento já finalizado: para cada lançamento de entrada (serviço e/ou gorjeta)
 * ainda não totalmente revertido, cria um lançamento `tipo = 'estorno'` de mesma natureza,
 * referenciando o original via `estornaPagamentoId`, no valor ainda não estornado. Nunca edita
 * ou apaga os lançamentos originais.
 */
export async function estornarAtendimentoAction(id: string): Promise<Atendimento> {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.atendimento.findUnique({
      where: { id },
      include: { pagamentos: true },
    });
    if (!existente) {
      throw new Error("Atendimento não encontrado.");
    }
    if (existente.status === "emAndamento" || existente.status === "cancelado" || existente.status === "estornado") {
      throw new Error("Apenas atendimentos finalizados podem ser estornados.");
    }

    const entradas = existente.pagamentos.filter((p) => p.tipo === "entrada");
    const pendentesDeEstorno = entradas
      .map((entrada) => ({
        entrada,
        restante: valorRestanteDeEntrada(existente.pagamentos, entrada.id, entrada.valor),
      }))
      .filter((item) => item.restante > 0);

    const ids = await proximosPagamentoIds(tx, pendentesDeEstorno.length);
    if (pendentesDeEstorno.length > 0) {
      await tx.pagamento.createMany({
        data: pendentesDeEstorno.map((item, index) => ({
          id: ids[index],
          atendimentoId: id,
          natureza: item.entrada.natureza,
          tipo: "estorno",
          dataPagamento: existente.data,
          valor: item.restante,
          formaPagamento: item.entrada.formaPagamento,
          estornaPagamentoId: item.entrada.id,
        })),
      });
    }

    const row = await tx.atendimento.update({
      where: { id },
      data: { status: "estornado" },
      include: { servicos: true, pagamentos: true },
    });

    return mapAtendimentoRow(row);
  });
}

const STATUS_COM_SALDO_ABERTO = new Set<AtendimentoStatus>(["finalizadoPendente", "finalizadoParcial"]);

export type RegistrarPagamentoAdicionalDados = {
  /** Recebimento de natureza "servico" — pode ser 0 se este lançamento for só de gorjeta. */
  valor: number;
  /** Recebimento de natureza "gorjeta" — nunca conta para saldo devido/status. */
  gorjeta: number;
  formaPagamento: FormaPagamento;
  /** MM/DD/YYYY — pode (e normalmente vai) ser diferente da data do atendimento original. */
  dataPagamento: string;
  observacoesPt?: string;
  observacoesEn?: string;
};

/**
 * Registra mais um recebimento para um atendimento já finalizado com saldo em aberto — cobre
 * pagamento parcial em múltiplas parcelas, cada uma podendo usar uma forma de pagamento
 * diferente, e/ou gorjeta recebida depois do fechamento original. Nunca edita lançamentos
 * existentes: só acrescenta linha(s) novas de `entrada` ao ledger. `valorRecebido`, saldo
 * pendente e `status` são sempre recalculados a partir do ledger dentro da mesma transação —
 * nenhum valor é gravado em duplicidade fora de `pagamentos`.
 */
export async function registrarPagamentoAdicionalAction(
  atendimentoId: string,
  dados: RegistrarPagamentoAdicionalDados,
): Promise<Atendimento> {
  if (dados.valor < 0) {
    throw new Error("O valor não pode ser negativo.");
  }
  if (dados.gorjeta < 0) {
    throw new Error("A gorjeta não pode ser negativa.");
  }
  if (dados.valor === 0 && dados.gorjeta === 0) {
    throw new Error("Informe ao menos um valor de pagamento ou gorjeta.");
  }

  return prisma.$transaction(async (tx) => {
    const existente = await tx.atendimento.findUnique({
      where: { id: atendimentoId },
      include: { servicos: true, pagamentos: true },
    });
    if (!existente) {
      throw new Error("Atendimento não encontrado.");
    }
    if (!STATUS_COM_SALDO_ABERTO.has(existente.status as AtendimentoStatus)) {
      throw new Error("Este atendimento não possui saldo pendente.");
    }

    const dataPagamentoIso = mmddyyyyToISO(dados.dataPagamento);
    if (dataPagamentoIso < existente.data) {
      throw new Error("A data do pagamento não pode ser anterior à data do atendimento.");
    }

    const devido = existente.servicos.reduce((total, servico) => total + servico.valor, 0) - existente.desconto;
    const recebidoAtual = calcularValorRecebidoServico(existente.pagamentos);
    const saldoPendenteAtual = Math.max(devido - recebidoAtual, 0);
    if (dados.valor > saldoPendenteAtual) {
      throw new Error(
        `O valor informado ($${dados.valor.toFixed(2)}) é maior que o saldo pendente ($${saldoPendenteAtual.toFixed(2)}).`,
      );
    }

    const lancamentos: { natureza: "servico" | "gorjeta"; valor: number }[] = [];
    if (dados.valor > 0) lancamentos.push({ natureza: "servico", valor: dados.valor });
    if (dados.gorjeta > 0) lancamentos.push({ natureza: "gorjeta", valor: dados.gorjeta });

    const ids = await proximosPagamentoIds(tx, lancamentos.length);
    await tx.pagamento.createMany({
      data: lancamentos.map((lancamento, index) => ({
        id: ids[index],
        atendimentoId,
        natureza: lancamento.natureza,
        tipo: "entrada",
        dataPagamento: dataPagamentoIso,
        valor: lancamento.valor,
        formaPagamento: dados.formaPagamento,
        observacoesPt: dados.observacoesPt?.trim() ?? "",
        observacoesEn: dados.observacoesEn?.trim() ?? "",
      })),
    });

    const status = calcularStatusAposRecebimento(devido, recebidoAtual + dados.valor);

    const row = await tx.atendimento.update({
      where: { id: atendimentoId },
      data: { status },
      include: { servicos: true, pagamentos: true },
    });

    return mapAtendimentoRow(row);
  });
}

export type CorrigirLancamentoDados = {
  valor: number;
  formaPagamento: FormaPagamento;
  /** MM/DD/YYYY; se omitida, repete a data do lançamento original. */
  dataPagamento?: string;
  observacoesPt?: string;
  observacoesEn?: string;
};

/** Lançamento recém-criado pela correção (estorno do original ou entrada corrigida), no mesmo
 * formato usado pelo cache local do Dashboard Financeiro (`LancamentoCaixa`), mas com a data ainda
 * em ISO (conversão para `Date` é responsabilidade de quem consome, fora deste módulo de servidor). */
export type NovoLancamentoCaixa = {
  id: string;
  atendimentoId: string;
  natureza: "servico" | "gorjeta";
  tipo: "entrada" | "estorno";
  dataPagamento: string;
  valor: number;
  formaPagamento: FormaPagamento | null;
  observacoesPt: string;
  observacoesEn: string;
};

export type CorrigirLancamentoResultado = {
  atendimento: Atendimento;
  /** Sempre os 2 lançamentos criados por esta correção (estorno do original + entrada corrigida),
   * na ordem em que foram gravados — para o cliente acrescentar ao livro-razão em memória sem
   * precisar recarregar a página nem refazer a consulta completa. */
  novosLancamentos: NovoLancamentoCaixa[];
};

/**
 * Corrige um lançamento específico do ledger (valor e/ou forma de pagamento errados) sem jamais
 * editar a linha original: estorna exatamente aquele lançamento — no valor ainda não estornado —
 * e cria um novo lançamento, correto, na mesma natureza. O novo lançamento também referencia o
 * original via `estornaPagamentoId` (mesmo campo usado pelo estorno, reaproveitado de propósito):
 * não é "um estorno do original", mas gravar essa referência aqui deixa a cadeia inteira de
 * correção (original → estorno → lançamento correto) rastreável com uma única consulta
 * (`WHERE estorna_pagamento_id = <id do original>`), sem precisar de coluna nova no schema.
 * `valorRecebido`, saldo pendente e `status` são sempre recalculados a partir do ledger dentro da
 * mesma transação.
 */
export async function corrigirLancamentoAction(
  pagamentoId: string,
  dadosCorretos: CorrigirLancamentoDados,
): Promise<CorrigirLancamentoResultado> {
  if (dadosCorretos.valor <= 0) {
    throw new Error("O valor corrigido não pode ser negativo.");
  }

  return prisma.$transaction(async (tx) => {
    const original = await tx.pagamento.findUnique({ where: { id: pagamentoId } });
    if (!original) {
      throw new Error("Lançamento não encontrado.");
    }
    if (original.tipo !== "entrada") {
      throw new Error("Não é possível corrigir um estorno.");
    }

    const existente = await tx.atendimento.findUniqueOrThrow({
      where: { id: original.atendimentoId },
      include: { servicos: true, pagamentos: true },
    });
    if (existente.status === "cancelado") {
      throw new Error("Não é possível corrigir lançamento de atendimento cancelado.");
    }

    const restante = valorRestanteDeEntrada(existente.pagamentos, original.id, original.valor);
    if (restante <= 0) {
      throw new Error("Este lançamento já foi totalmente estornado.");
    }

    const devido = existente.servicos.reduce((total, servico) => total + servico.valor, 0) - existente.desconto;
    if (original.natureza === "servico") {
      const recebidoSemEsteLancamento = calcularValorRecebidoServico(existente.pagamentos) - restante;
      if (recebidoSemEsteLancamento + dadosCorretos.valor > devido) {
        throw new Error(
          `O valor corrigido excede o saldo devido do atendimento ($${(devido - recebidoSemEsteLancamento).toFixed(2)} disponível).`,
        );
      }
    }

    // O estorno mantém a data do próprio lançamento sendo corrigido (não a data do atendimento
    // nem "hoje") — é o lançamento específico que está sendo revertido, e ele pode ter sido
    // registrado bem depois do atendimento (ver registrarPagamentoAdicionalAction).
    const dataCorrecao = dadosCorretos.dataPagamento ? mmddyyyyToISO(dadosCorretos.dataPagamento) : original.dataPagamento;

    const ids = await proximosPagamentoIds(tx, 2);
    const lancamentos = [
      {
        id: ids[0],
        atendimentoId: original.atendimentoId,
        natureza: original.natureza,
        tipo: "estorno" as const,
        dataPagamento: original.dataPagamento,
        valor: restante,
        formaPagamento: original.formaPagamento,
        observacoesPt: "",
        observacoesEn: "",
        estornaPagamentoId: original.id,
      },
      {
        id: ids[1],
        atendimentoId: original.atendimentoId,
        natureza: original.natureza,
        tipo: "entrada" as const,
        dataPagamento: dataCorrecao,
        valor: dadosCorretos.valor,
        formaPagamento: dadosCorretos.formaPagamento,
        observacoesPt: dadosCorretos.observacoesPt?.trim() ?? "",
        observacoesEn: dadosCorretos.observacoesEn?.trim() ?? "",
        estornaPagamentoId: original.id,
      },
    ];
    await tx.pagamento.createMany({ data: lancamentos });

    const status: AtendimentoStatus =
      original.natureza === "servico"
        ? calcularStatusAposRecebimento(
            devido,
            calcularValorRecebidoServico(existente.pagamentos) - restante + dadosCorretos.valor,
          )
        : (existente.status as AtendimentoStatus);

    const row = await tx.atendimento.update({
      where: { id: original.atendimentoId },
      data: { status },
      include: { servicos: true, pagamentos: true },
    });

    const novosLancamentos: NovoLancamentoCaixa[] = lancamentos.map((l) => ({
      id: l.id,
      atendimentoId: l.atendimentoId,
      natureza: l.natureza as "servico" | "gorjeta",
      tipo: l.tipo,
      dataPagamento: l.dataPagamento,
      valor: l.valor,
      formaPagamento: l.formaPagamento as FormaPagamento | null,
      observacoesPt: l.observacoesPt,
      observacoesEn: l.observacoesEn,
    }));

    return { atendimento: mapAtendimentoRow(row), novosLancamentos };
  });
}
