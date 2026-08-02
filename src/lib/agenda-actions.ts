"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { mapAgendamentoRow } from "@/lib/agenda-repo";
import { DAY_START_MIN, DAY_END_MIN, type AgendaAppointment } from "@/lib/agenda-mock";
import type { StatusKey } from "@/lib/mock-data";
import { mmddyyyyToISO } from "@/lib/date";

/** Próximo id de agendamento, a partir de `numero_sequencial` (coluna indexada e única — mesmo
 * padrão usado por `clientes`). Substitui a varredura completa da tabela + regex usada antes. */
async function nextAgendamentoId(): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await prisma.agendamento.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: `AGD-${String(numeroSequencial).padStart(6, "0")}`, numeroSequencial };
}

function validarHorario(inicioMin: number, fimMin: number) {
  if (inicioMin >= fimMin) {
    throw new Error("O horário de início deve ser anterior ao horário de término.");
  }
  if (inicioMin < DAY_START_MIN || fimMin > DAY_END_MIN) {
    throw new Error("O horário deve estar dentro do expediente.");
  }
}

async function existeConflito(
  dataIso: string,
  inicioMin: number,
  fimMin: number,
  excluirId?: string,
): Promise<boolean> {
  const conflitos = await prisma.agendamento.findMany({
    where: {
      data: dataIso,
      status: { not: "cancelado" },
      id: excluirId ? { not: excluirId } : undefined,
      inicioMin: { lt: fimMin },
      fimMin: { gt: inicioMin },
    },
    select: { id: true },
  });
  return conflitos.length > 0;
}

/** Cria um agendamento novo no banco SQLite via Prisma, validando expediente e conflito de horário. */
export async function createAgendamentoAction(dados: Omit<AgendaAppointment, "id">): Promise<AgendaAppointment> {
  if (dados.clienteId.trim() === "") {
    throw new Error("Selecione uma cliente.");
  }
  validarHorario(dados.inicioMin, dados.fimMin);

  const dataIso = mmddyyyyToISO(dados.data);

  if (await existeConflito(dataIso, dados.inicioMin, dados.fimMin)) {
    throw new Error("Já existe um agendamento nesse horário.");
  }

  const { id, numeroSequencial } = await nextAgendamentoId();

  const row = await prisma.agendamento.create({
    data: {
      id,
      numeroSequencial,
      clienteId: dados.clienteId,
      servicoId: dados.servicoId,
      data: dataIso,
      inicioMin: dados.inicioMin,
      fimMin: dados.fimMin,
      status: dados.status,
      valorEstimado: dados.valorEstimado,
      observacoesPt: dados.observacoesPt.trim(),
      observacoesEn: dados.observacoesEn.trim(),
    },
  });

  revalidatePath("/", "layout");
  return mapAgendamentoRow(row);
}

/** Atualiza os dados de um agendamento existente, validando expediente e conflito de horário. */
export async function updateAgendamentoAction(agendamento: AgendaAppointment): Promise<AgendaAppointment> {
  if (agendamento.clienteId.trim() === "") {
    throw new Error("Selecione uma cliente.");
  }
  validarHorario(agendamento.inicioMin, agendamento.fimMin);

  const existente = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
  if (!existente) {
    throw new Error("Agendamento não encontrado.");
  }

  const dataIso = mmddyyyyToISO(agendamento.data);

  if (await existeConflito(dataIso, agendamento.inicioMin, agendamento.fimMin, agendamento.id)) {
    throw new Error("Já existe um agendamento nesse horário.");
  }

  const row = await prisma.agendamento.update({
    where: { id: agendamento.id },
    data: {
      clienteId: agendamento.clienteId,
      servicoId: agendamento.servicoId,
      data: dataIso,
      inicioMin: agendamento.inicioMin,
      fimMin: agendamento.fimMin,
      valorEstimado: agendamento.valorEstimado,
      observacoesPt: agendamento.observacoesPt.trim(),
      observacoesEn: agendamento.observacoesEn.trim(),
    },
  });

  revalidatePath("/", "layout");
  return mapAgendamentoRow(row);
}

/**
 * Transições de status permitidas por esta action, refletindo exatamente o que a UI da Agenda
 * expõe (`AgendaDetailsPanel`): aguardando → confirmado/cancelado/naoCompareceu, confirmado →
 * cancelado/naoCompareceu. "emAtendimento" e "concluido" nunca são setados por aqui — nascem da
 * sincronização feita por `atendimentos-actions.ts` ao iniciar/concluir/cancelar um atendimento.
 * Estados terminais (concluido, cancelado, naoCompareceu) não têm transição de saída aqui.
 */
const TRANSICOES_STATUS_AGENDAMENTO: Partial<Record<StatusKey, StatusKey[]>> = {
  aguardando: ["confirmado", "cancelado", "naoCompareceu"],
  confirmado: ["cancelado", "naoCompareceu"],
};

/** Altera apenas o status de um agendamento (confirmar, cancelar, marcar não compareceu). */
export async function updateStatusAgendamentoAction(id: string, status: StatusKey): Promise<AgendaAppointment> {
  const existente = await prisma.agendamento.findUnique({ where: { id } });
  if (!existente) {
    throw new Error("Agendamento não encontrado.");
  }

  const permitido = TRANSICOES_STATUS_AGENDAMENTO[existente.status as StatusKey]?.includes(status) ?? false;
  if (!permitido) {
    throw new Error(`Não é possível mudar o status de "${existente.status}" para "${status}".`);
  }

  const row = await prisma.agendamento.update({ where: { id }, data: { status } });
  revalidatePath("/", "layout");
  return mapAgendamentoRow(row);
}

/**
 * Status de origem a partir dos quais reagendar é permitido (PROJECT_STATUS.md §13 item 1):
 * `aguardando`/`confirmado` mantêm o status; `cancelado` é reativado para `aguardando` ao
 * reagendar ("reativar e reagendar"). `emAtendimento`/`concluido` nunca reagendam por aqui —
 * já têm um Atendimento formal vinculado. `naoCompareceu` também fica de fora: reaproveitar o
 * mesmo registro apagaria o histórico da falta; a UI deve levar à criação de um novo agendamento.
 */
const STATUS_REAGENDAVEIS = new Set<StatusKey>(["aguardando", "confirmado", "cancelado"]);

/** Reagenda um agendamento existente para nova data/horário, validando expediente, conflito e
 * status de origem. Reativa `cancelado` para `aguardando` ao reagendar. */
export async function reagendarAgendamentoAction(
  id: string,
  novaData: string,
  novoInicioMin: number,
  novoFimMin: number,
): Promise<AgendaAppointment> {
  validarHorario(novoInicioMin, novoFimMin);

  const existente = await prisma.agendamento.findUnique({ where: { id } });
  if (!existente) {
    throw new Error("Agendamento não encontrado.");
  }

  if (!STATUS_REAGENDAVEIS.has(existente.status as StatusKey)) {
    throw new Error(`Não é possível reagendar um agendamento com status "${existente.status}".`);
  }

  const dataIso = mmddyyyyToISO(novaData);

  if (await existeConflito(dataIso, novoInicioMin, novoFimMin, id)) {
    throw new Error("Já existe um agendamento nesse horário.");
  }

  const row = await prisma.agendamento.update({
    where: { id },
    data: {
      data: dataIso,
      inicioMin: novoInicioMin,
      fimMin: novoFimMin,
      status: existente.status === "cancelado" ? "aguardando" : existente.status,
    },
  });

  revalidatePath("/", "layout");
  return mapAgendamentoRow(row);
}
