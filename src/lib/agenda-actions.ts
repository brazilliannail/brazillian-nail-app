"use server";

import { prisma } from "@/lib/db";
import { mapAgendamentoRow } from "@/lib/agenda-repo";
import { DAY_START_MIN, DAY_END_MIN, type AgendaAppointment } from "@/lib/agenda-mock";
import type { StatusKey } from "@/lib/mock-data";
import { mmddyyyyToISO } from "@/lib/date";

async function nextAgendamentoId(): Promise<string> {
  const rows = await prisma.agendamento.findMany({ select: { id: true } });
  let max = 0;
  for (const row of rows) {
    const match = /^AGD-(\d+)$/.exec(row.id);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `AGD-${String(max + 1).padStart(6, "0")}`;
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

  const id = await nextAgendamentoId();

  const row = await prisma.agendamento.create({
    data: {
      id,
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

  return mapAgendamentoRow(row);
}

/** Altera apenas o status de um agendamento (confirmar, iniciar, concluir, cancelar, etc.). */
export async function updateStatusAgendamentoAction(id: string, status: StatusKey): Promise<AgendaAppointment> {
  const existente = await prisma.agendamento.findUnique({ where: { id } });
  if (!existente) {
    throw new Error("Agendamento não encontrado.");
  }

  const row = await prisma.agendamento.update({ where: { id }, data: { status } });
  return mapAgendamentoRow(row);
}

/** Reagenda um agendamento existente para nova data/horário, validando expediente e conflito. */
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

  const dataIso = mmddyyyyToISO(novaData);

  if (await existeConflito(dataIso, novoInicioMin, novoFimMin, id)) {
    throw new Error("Já existe um agendamento nesse horário.");
  }

  const row = await prisma.agendamento.update({
    where: { id },
    data: { data: dataIso, inicioMin: novoInicioMin, fimMin: novoFimMin },
  });

  return mapAgendamentoRow(row);
}
