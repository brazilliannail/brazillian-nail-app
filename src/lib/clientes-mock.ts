import type { FormaPagamento } from "@/lib/atendimentos-mock";

export type ClienteStatus = "ativa" | "inativa";
export type ClienteIdioma = "pt" | "en";
export type PreferenciaContato = "whatsapp" | "sms" | "ligacao";
export type StatusPagamentoHistorico = "pago" | "pendente" | "parcial" | "cancelado";

export type HistoricoAtendimento = {
  id: string;
  data: string;
  horario: string;
  servicoPt: string;
  servicoEn: string;
  valorServicos: number;
  desconto: number;
  gorjeta: number;
  valorRecebido: number;
  formaPagamento: FormaPagamento | null;
  status: StatusPagamentoHistorico;
  observacoesPt: string;
  observacoesEn: string;
  proximoRetorno: string | null;
};

export function valorTotalDevidoHistorico(item: HistoricoAtendimento) {
  return item.valorServicos - item.desconto;
}

export function saldoPendenteHistorico(item: HistoricoAtendimento) {
  if (item.status === "cancelado") return 0;
  return Math.max(valorTotalDevidoHistorico(item) - item.valorRecebido, 0);
}

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  idioma: ClienteIdioma;
  status: ClienteStatus;
  preferenciaContato: PreferenciaContato;
  ultimoAtendimento: string;
  proximoAgendamento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  avisosImportantesPt: string[];
  avisosImportantesEn: string[];
  valorPendente: number;
  historico: HistoricoAtendimento[];
};

export const mockClientes: Cliente[] = [
  {
    id: "cli-1",
    nome: "Ana Silva",
    telefone: "(508) 555-0148",
    idioma: "pt",
    status: "ativa",
    preferenciaContato: "whatsapp",
    ultimoAtendimento: "07/06/2026",
    proximoAgendamento: "07/13/2026 · 9:00 AM",
    observacoesPt: "",
    observacoesEn: "",
    avisosImportantesPt: ["Sensibilidade a acetona.", "Prefere esmalte vermelho."],
    avisosImportantesEn: ["Sensitive to acetone.", "Prefers red polish."],
    valorPendente: 0,
    historico: [
      {
        id: "hist-1-1",
        data: "07/06/2026",
        horario: "9:00 AM",
        servicoPt: "Manutenção",
        servicoEn: "Maintenance",
        valorServicos: 45,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 45,
        formaPagamento: "dinheiro",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "07/13/2026",
      },
      {
        id: "hist-1-2",
        data: "06/22/2026",
        horario: "11:00 AM",
        servicoPt: "Esmaltação em gel",
        servicoEn: "Gel polish",
        valorServicos: 40,
        desconto: 0,
        gorjeta: 5,
        valorRecebido: 40,
        formaPagamento: "zelle",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "07/06/2026",
      },
      {
        id: "hist-1-3",
        data: "06/01/2026",
        horario: "9:30 AM",
        servicoPt: "Manutenção",
        servicoEn: "Maintenance",
        valorServicos: 45,
        desconto: 5,
        gorjeta: 0,
        valorRecebido: 40,
        formaPagamento: "dinheiro",
        status: "pago",
        observacoesPt: "Desconto por indicação de amiga.",
        observacoesEn: "Discount for referring a friend.",
        proximoRetorno: "06/22/2026",
      },
      {
        id: "hist-1-4",
        data: "05/15/2026",
        horario: "10:00 AM",
        servicoPt: "Manutenção",
        servicoEn: "Maintenance",
        valorServicos: 45,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 0,
        formaPagamento: null,
        status: "cancelado",
        observacoesPt: "Cliente cancelou por imprevisto.",
        observacoesEn: "Client canceled due to an emergency.",
        proximoRetorno: null,
      },
    ],
  },
  {
    id: "cli-2",
    nome: "Maria Costa",
    telefone: "(508) 555-0172",
    idioma: "pt",
    status: "ativa",
    preferenciaContato: "sms",
    ultimoAtendimento: "06/29/2026",
    proximoAgendamento: "07/13/2026 · 11:00 AM",
    observacoesPt: "",
    observacoesEn: "",
    avisosImportantesPt: [],
    avisosImportantesEn: [],
    valorPendente: 0,
    historico: [
      {
        id: "hist-2-1",
        data: "06/29/2026",
        horario: "11:00 AM",
        servicoPt: "Esmaltação em gel",
        servicoEn: "Gel polish",
        valorServicos: 55,
        desconto: 0,
        gorjeta: 10,
        valorRecebido: 55,
        formaPagamento: "cartaoCredito",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "07/13/2026",
      },
      {
        id: "hist-2-2",
        data: "06/08/2026",
        horario: "2:00 PM",
        servicoPt: "Esmaltação em gel",
        servicoEn: "Gel polish",
        valorServicos: 50,
        desconto: 0,
        gorjeta: 5,
        valorRecebido: 50,
        formaPagamento: "venmo",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "06/29/2026",
      },
      {
        id: "hist-2-3",
        data: "05/18/2026",
        horario: "1:00 PM",
        servicoPt: "Manutenção",
        servicoEn: "Maintenance",
        valorServicos: 40,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 40,
        formaPagamento: "dinheiro",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "06/08/2026",
      },
    ],
  },
  {
    id: "cli-3",
    nome: "Juliana Santos",
    telefone: "(508) 555-0193",
    idioma: "en",
    status: "ativa",
    preferenciaContato: "whatsapp",
    ultimoAtendimento: "07/01/2026",
    proximoAgendamento: "07/13/2026 · 2:00 PM",
    observacoesPt: "",
    observacoesEn: "",
    avisosImportantesPt: ["Alergia a acetona."],
    avisosImportantesEn: ["Allergic to acetone."],
    valorPendente: 35,
    historico: [
      {
        id: "hist-3-1",
        data: "07/01/2026",
        horario: "2:00 PM",
        servicoPt: "Alongamento",
        servicoEn: "Nail extension",
        valorServicos: 95,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 60,
        formaPagamento: "dinheiro",
        status: "parcial",
        observacoesPt: "Pagamento parcial, restante combinado para o próximo atendimento.",
        observacoesEn: "Partial payment, remainder arranged for the next appointment.",
        proximoRetorno: "07/13/2026",
      },
      {
        id: "hist-3-2",
        data: "06/10/2026",
        horario: "2:00 PM",
        servicoPt: "Alongamento",
        servicoEn: "Nail extension",
        valorServicos: 90,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 90,
        formaPagamento: "cartaoCredito",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "07/01/2026",
      },
      {
        id: "hist-3-3",
        data: "05/20/2026",
        horario: "3:00 PM",
        servicoPt: "Manutenção",
        servicoEn: "Maintenance",
        valorServicos: 45,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 45,
        formaPagamento: "dinheiro",
        status: "pago",
        observacoesPt: "",
        observacoesEn: "",
        proximoRetorno: "06/10/2026",
      },
    ],
  },
  {
    id: "cli-4",
    nome: "Camila Oliveira",
    telefone: null,
    idioma: "pt",
    status: "inativa",
    preferenciaContato: "ligacao",
    ultimoAtendimento: "07/13/2026",
    proximoAgendamento: null,
    observacoesPt: "Encaixe de última hora.",
    observacoesEn: "Last-minute walk-in.",
    avisosImportantesPt: [],
    avisosImportantesEn: [],
    valorPendente: 0,
    historico: [
      {
        id: "hist-4-1",
        data: "07/13/2026",
        horario: "4:30 PM",
        servicoPt: "Serviço a definir",
        servicoEn: "Service to be defined",
        valorServicos: 0,
        desconto: 0,
        gorjeta: 0,
        valorRecebido: 0,
        formaPagamento: null,
        status: "pago",
        observacoesPt: "Encaixe de última hora, cortesia por atraso no atendimento anterior.",
        observacoesEn: "Last-minute walk-in, complimentary due to a delay in a previous appointment.",
        proximoRetorno: null,
      },
    ],
  },
];
