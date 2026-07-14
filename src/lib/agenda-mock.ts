import type { StatusKey } from "@/lib/mock-data";

export const DAY_START_MIN = 8 * 60; // 8:00 AM
export const DAY_END_MIN = 18 * 60; // 6:00 PM
export const SLOT_MIN = 30;

export type AgendaAppointment = {
  id: string;
  cliente: string;
  telefone: string;
  servicoPt: string;
  servicoEn: string;
  status: StatusKey;
  inicioMin: number;
  fimMin: number;
  valor: number | null;
  observacoesPt: string;
  observacoesEn: string;
};

export const mockAgendaDoDia: AgendaAppointment[] = [
  {
    id: "apt-1",
    cliente: "Ana Silva",
    telefone: "(508) 555-0148",
    servicoPt: "Manutenção",
    servicoEn: "Maintenance",
    status: "aguardando",
    inicioMin: 9 * 60,
    fimMin: 10 * 60 + 30,
    valor: 45,
    observacoesPt: "Prefere esmalte vermelho.",
    observacoesEn: "Prefers red polish.",
  },
  {
    id: "apt-2",
    cliente: "Maria Costa",
    telefone: "(508) 555-0172",
    servicoPt: "Esmaltação em gel",
    servicoEn: "Gel polish",
    status: "confirmado",
    inicioMin: 11 * 60,
    fimMin: 12 * 60,
    valor: 55,
    observacoesPt: "",
    observacoesEn: "",
  },
  {
    id: "apt-3",
    cliente: "Juliana Santos",
    telefone: "(508) 555-0193",
    servicoPt: "Alongamento",
    servicoEn: "Nail extension",
    status: "emAtendimento",
    inicioMin: 14 * 60,
    fimMin: 16 * 60,
    valor: 95,
    observacoesPt: "Alergia a acetona.",
    observacoesEn: "Allergic to acetone.",
  },
  {
    id: "apt-4",
    cliente: "Cliente de teste",
    telefone: "(508) 555-0100",
    servicoPt: "Serviço a definir",
    servicoEn: "Service to be defined",
    status: "finalizado",
    inicioMin: 16 * 60 + 30,
    fimMin: 17 * 60 + 30,
    valor: null,
    observacoesPt: "Encaixe de última hora.",
    observacoesEn: "Last-minute walk-in.",
  },
];

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

  const totalEstimado = appointments.reduce((sum, apt) => sum + (apt.valor ?? 0), 0);

  return {
    agendamentos: appointments.length,
    confirmados: appointments.filter((apt) => apt.status === "confirmado").length,
    aguardando: appointments.filter((apt) => apt.status === "aguardando").length,
    disponiveis: totalSlots - occupiedSlots,
    totalEstimado,
  };
}
