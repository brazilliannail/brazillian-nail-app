import { prisma } from "@/lib/db";
import type { AgendaAppointment } from "@/lib/agenda-mock";
import type { StatusKey } from "@/lib/mock-data";
import { isoToMMDDYYYY } from "@/lib/date";

type AgendamentoRow = {
  id: string;
  clienteId: string;
  servicoId: string | null;
  data: string;
  inicioMin: number;
  fimMin: number;
  status: string;
  valorEstimado: number | null;
  observacoesPt: string;
  observacoesEn: string;
};

/** Mapeia uma linha de `agendamentos` (data ISO no banco) para o tipo `AgendaAppointment` da UI (data MM/DD/YYYY). */
export function mapAgendamentoRow(row: AgendamentoRow): AgendaAppointment {
  return {
    id: row.id,
    clienteId: row.clienteId,
    servicoId: row.servicoId,
    status: row.status as StatusKey,
    data: isoToMMDDYYYY(row.data),
    inicioMin: row.inicioMin,
    fimMin: row.fimMin,
    valorEstimado: row.valorEstimado,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
  };
}

/** Lê todos os agendamentos do banco SQLite via Prisma, ordenados por data e horário de início. */
export async function getAgendamentos(): Promise<AgendaAppointment[]> {
  const rows = await prisma.agendamento.findMany({
    orderBy: [{ data: "asc" }, { inicioMin: "asc" }],
  });
  return rows.map(mapAgendamentoRow);
}
