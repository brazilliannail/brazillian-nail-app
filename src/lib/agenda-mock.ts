import type { StatusKey } from "@/lib/mock-data";

export const DAY_START_MIN = 8 * 60; // 8:00 AM
export const DAY_END_MIN = 18 * 60; // 6:00 PM
export const SLOT_MIN = 30;

export type AgendaAppointment = {
  id: string;
  clienteId: string;
  /** Referência ao catálogo de serviços; `null` = "serviço a definir" (sem correspondência no catálogo). */
  servicoId: string | null;
  status: StatusKey;
  data: string;
  inicioMin: number;
  fimMin: number;
  valorEstimado: number | null;
  observacoesPt: string;
  observacoesEn: string;
};

/** Formata o número sequencial do agendamento no padrão AGD-000001. */
export function formatAgendamentoId(numero: number) {
  return `AGD-${String(numero).padStart(6, "0")}`;
}

/** Marcações de horário de 30 em 30 minutos, das 8:00 AM às 6:00 PM. */
export function buildTimeBoundaries() {
  const boundaries: number[] = [];
  for (let min = DAY_START_MIN; min <= DAY_END_MIN; min += SLOT_MIN) {
    boundaries.push(min);
  }
  return boundaries;
}

export function computeResumoDia(appointments: AgendaAppointment[]) {
  const totalSlots = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN;
  let occupiedSlots = 0;

  for (let slotStart = DAY_START_MIN; slotStart < DAY_END_MIN; slotStart += SLOT_MIN) {
    const slotEnd = slotStart + SLOT_MIN;
    const occupied = appointments.some((apt) => apt.inicioMin < slotEnd && apt.fimMin > slotStart);
    if (occupied) occupiedSlots += 1;
  }

  const totalEstimado = appointments.reduce((sum, apt) => sum + (apt.valorEstimado ?? 0), 0);

  return {
    agendamentos: appointments.length,
    confirmados: appointments.filter((apt) => apt.status === "confirmado").length,
    aguardando: appointments.filter((apt) => apt.status === "aguardando").length,
    disponiveis: totalSlots - occupiedSlots,
    totalEstimado,
  };
}
