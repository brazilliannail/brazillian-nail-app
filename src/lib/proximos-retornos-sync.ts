import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatDateISO } from "@/lib/date";
import { STATUS_AGENDAMENTO_FUTURO } from "@/lib/clientes-repo";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Recalcula o atalho exibido no Atendimento sem alterar os agendamentos ou o histórico completo
 * em `retornos_agendados`. Aponta para o retorno mais próximo em `aguardando`/`confirmado`, com
 * data não passada — a mesma definição usada na ficha da cliente. A rotina é usada tanto ao criar
 * um retorno quanto quando ele muda de data/status pela Agenda ou por um Atendimento.
 */
export async function sincronizarProximoAgendamento(
  db: Db,
  atendimentoOrigemId: string,
): Promise<void> {
  const retornos = await db.retornoAgendado.findMany({
    where: { atendimentoOrigemId },
    select: { agendamento: { select: { id: true, data: true, inicioMin: true, status: true } } },
  });
  const hojeIso = formatDateISO(new Date());
  const proximo = retornos
    .map((r) => r.agendamento)
    .filter((a) => STATUS_AGENDAMENTO_FUTURO.has(a.status) && a.data >= hojeIso)
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicioMin - b.inicioMin)[0];

  await db.atendimento.update({
    where: { id: atendimentoOrigemId },
    data: { proximoAgendamentoId: proximo?.id ?? null },
  });
}

/** Recalcula todas as origens que apontam para um agendamento de retorno alterado. */
export async function sincronizarOrigensDoAgendamento(db: Db, agendamentoId: string): Promise<void> {
  const origens = await db.retornoAgendado.findMany({
    where: { agendamentoId },
    select: { atendimentoOrigemId: true },
    distinct: ["atendimentoOrigemId"],
  });

  for (const origem of origens) {
    await sincronizarProximoAgendamento(db, origem.atendimentoOrigemId);
  }
}
