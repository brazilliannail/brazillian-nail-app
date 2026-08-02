import type { StatusKey } from "@/lib/mock-data";

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

/** Marcações de horário de `SLOT_MIN` em `SLOT_MIN` minutos, dentro do expediente informado
 * (`inicioMin`/`fimMin` — ver `expedienteDeConfiguracoes` em `configuracoes-mock.ts`, única fonte
 * do expediente real, gravado em Configurações). */
export function buildTimeBoundaries(inicioMin: number, fimMin: number): number[] {
  const boundaries: number[] = [];
  for (let min = inicioMin; min <= fimMin; min += SLOT_MIN) {
    boundaries.push(min);
  }
  return boundaries;
}

export function computeResumoDia(appointments: AgendaAppointment[], inicioMin: number, fimMin: number) {
  const totalSlots = (fimMin - inicioMin) / SLOT_MIN;
  let occupiedSlots = 0;

  for (let slotStart = inicioMin; slotStart < fimMin; slotStart += SLOT_MIN) {
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
