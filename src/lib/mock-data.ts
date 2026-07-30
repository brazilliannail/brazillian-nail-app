export type StatusKey =
  | "aguardando"
  | "confirmado"
  | "emAtendimento"
  | "concluido"
  | "cancelado"
  | "naoCompareceu";

export type AgendaItem = {
  horario: string;
  cliente: string;
  servicoPt: string;
  servicoEn: string;
  status: StatusKey;
};

export const mockAgendaHoje: AgendaItem[] = [
  {
    horario: "9:00 AM",
    cliente: "Ana Silva",
    servicoPt: "Manutenção",
    servicoEn: "Maintenance",
    status: "aguardando",
  },
  {
    horario: "11:00 AM",
    cliente: "Maria Costa",
    servicoPt: "Esmaltação em gel",
    servicoEn: "Gel polish",
    status: "confirmado",
  },
  {
    horario: "2:00 PM",
    cliente: "Juliana Santos",
    servicoPt: "Alongamento",
    servicoEn: "Nail extension",
    status: "emAtendimento",
  },
  {
    horario: "4:30 PM",
    cliente: "Cliente de teste",
    servicoPt: "Serviço a definir",
    servicoEn: "Service to be defined",
    status: "concluido",
  },
];

export const mockResumoHoje = {
  proximoAtendimento: "9:00 AM — Ana Silva",
  agendamentosHoje: mockAgendaHoje.length,
  totalRecebidoHoje: "$180.00",
  totalEstimadoDia: "$340.00",
  valoresPendentes: "$65.00",
  lembretesAmanha: 3,
};
