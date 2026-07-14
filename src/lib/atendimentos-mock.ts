export type AtendimentoStatus =
  | "emAndamento"
  | "finalizadoPago"
  | "finalizadoPendente"
  | "finalizadoParcial"
  | "finalizadoCortesia"
  | "cancelado"
  | "estornado";

export type FormaPagamento =
  | "dinheiro"
  | "cartaoCredito"
  | "cartaoDebito"
  | "zelle"
  | "venmo"
  | "cashApp"
  | "cheque"
  | "outra";

export type ServicoRealizado = {
  nomePt: string;
  nomeEn: string;
  valor: number;
};

export type Atendimento = {
  id: string;
  cliente: string;
  profissional: string;
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  duracaoMin: number | null;
  servicos: ServicoRealizado[];
  desconto: number;
  gorjeta: number;
  valorRecebido: number;
  formaPagamento: FormaPagamento | null;
  status: AtendimentoStatus;
  observacoesPt: string;
  observacoesEn: string;
  retornoSugeridoDias: number | null;
  proximoAgendamento: string | null;
};

function somaServicos(servicos: ServicoRealizado[]) {
  return servicos.reduce((total, item) => total + item.valor, 0);
}

export function valorTotalDevido(atendimento: Atendimento) {
  return somaServicos(atendimento.servicos) - atendimento.desconto;
}

export function saldoPendente(atendimento: Atendimento) {
  return Math.max(valorTotalDevido(atendimento) - atendimento.valorRecebido, 0);
}

export const mockAtendimentos: Atendimento[] = [
  {
    id: "at-1",
    cliente: "Ana Silva",
    profissional: "Rosângela",
    data: "07/14/2026",
    horarioInicio: "9:00 AM",
    horarioFim: null,
    duracaoMin: null,
    servicos: [{ nomePt: "Manutenção", nomeEn: "Maintenance", valor: 45 }],
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 0,
    formaPagamento: null,
    status: "emAndamento",
    observacoesPt: "Prefere esmalte vermelho.",
    observacoesEn: "Prefers red polish.",
    retornoSugeridoDias: 21,
    proximoAgendamento: null,
  },
  {
    id: "at-2",
    cliente: "Maria Costa",
    profissional: "Rosângela",
    data: "07/14/2026",
    horarioInicio: "11:00 AM",
    horarioFim: "12:00 PM",
    duracaoMin: 60,
    servicos: [{ nomePt: "Esmaltação em gel", nomeEn: "Gel polish", valor: 40 }],
    desconto: 0,
    gorjeta: 10,
    valorRecebido: 40,
    formaPagamento: "cartaoCredito",
    status: "finalizadoPago",
    observacoesPt: "",
    observacoesEn: "",
    retornoSugeridoDias: 14,
    proximoAgendamento: "07/28/2026 · 11:00 AM",
  },
  {
    id: "at-3",
    cliente: "Juliana Santos",
    profissional: "Rosângela",
    data: "07/13/2026",
    horarioInicio: "2:00 PM",
    horarioFim: "4:00 PM",
    duracaoMin: 120,
    servicos: [{ nomePt: "Alongamento", nomeEn: "Nail extension", valor: 110 }],
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 65,
    formaPagamento: "dinheiro",
    status: "finalizadoParcial",
    observacoesPt: "Pagamento restante combinado para o próximo atendimento.",
    observacoesEn: "Remaining payment arranged for the next appointment.",
    retornoSugeridoDias: 21,
    proximoAgendamento: null,
  },
  {
    id: "at-4",
    cliente: "Cliente de teste",
    profissional: "Rosângela",
    data: "07/13/2026",
    horarioInicio: "4:30 PM",
    horarioFim: "5:30 PM",
    duracaoMin: 60,
    servicos: [{ nomePt: "Serviço a definir", nomeEn: "Service to be defined", valor: 0 }],
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 0,
    formaPagamento: null,
    status: "finalizadoCortesia",
    observacoesPt: "Cortesia por atraso no atendimento anterior.",
    observacoesEn: "Complimentary due to a delay in a previous appointment.",
    retornoSugeridoDias: null,
    proximoAgendamento: null,
  },
];
