import type { FormaPagamento } from "@/lib/atendimentos-mock";

export type CanalLembrete = "whatsapp" | "sms";
export type SessaoExpiracao = "15" | "30" | "60" | "240";
export type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

export type ConfiguracoesState = {
  negocio: {
    nome: string;
    nomeCurto: string;
    telefone: string;
    email: string;
    endereco: string;
    cidade: string;
    estado: string;
    zip: string;
    fusoHorario: string;
    moeda: string;
    formatoData: string;
    formatoHora: string;
  };
  idioma: {
    idiomaPadraoMensagens: "pt" | "en";
    permitirAlterarPorCliente: boolean;
  };
  agenda: {
    horarioAbertura: string;
    horarioFechamento: string;
    duracaoPadraoMinutos: number;
    diasFuncionamento: DiaSemana[];
    bloqueioConflitoHorario: boolean;
    permitirEncaixeComConfirmacao: boolean;
  };
  lembretes: {
    ativarLembretesDiaAnterior: boolean;
    horarioPadraoAviso: string;
    canalPreferido: CanalLembrete;
    exigirConfirmacaoManual: boolean;
    textoPadraoPt: string;
    textoPadraoEn: string;
  };
  financeiro: {
    formasPagamentoAtivas: Record<FormaPagamento, boolean>;
    mostrarGorjetaSeparadamente: boolean;
    permitirPagamentoParcial: boolean;
    mostrarValoresPendentes: boolean;
  };
  seguranca: {
    emailPrincipal: string;
    sessaoExpiracaoMinutos: SessaoExpiracao;
  };
};

export const FUSOS_HORARIOS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

export const MOEDAS = ["USD ($)", "BRL (R$)", "EUR (€)"];

export const FORMATOS_DATA = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

export const FORMATOS_HORA = ["12h (AM/PM)", "24h"];

export const DIAS_SEMANA: DiaSemana[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export const DURACOES_PADRAO = [30, 45, 60, 90, 120];

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "dinheiro",
  "cartaoCredito",
  "cartaoDebito",
  "zelle",
  "venmo",
  "cashApp",
  "cheque",
  "outra",
];

export function createConfiguracoesIniciais(): ConfiguracoesState {
  return {
    negocio: {
      nome: "Brazillian Nail",
      nomeCurto: "Brazillian Nail",
      telefone: "(508) 555-0100",
      email: "contact@brazilliannail.example",
      endereco: "123 Main Street",
      cidade: "Hyannis",
      estado: "MA",
      zip: "02601",
      fusoHorario: "America/New_York",
      moeda: "USD ($)",
      formatoData: "MM/DD/YYYY",
      formatoHora: "12h (AM/PM)",
    },
    idioma: {
      idiomaPadraoMensagens: "pt",
      permitirAlterarPorCliente: true,
    },
    agenda: {
      horarioAbertura: "9:00 AM",
      horarioFechamento: "7:00 PM",
      duracaoPadraoMinutos: 60,
      diasFuncionamento: ["seg", "ter", "qua", "qui", "sex", "sab"],
      bloqueioConflitoHorario: true,
      permitirEncaixeComConfirmacao: true,
    },
    lembretes: {
      ativarLembretesDiaAnterior: true,
      horarioPadraoAviso: "6:00 PM",
      canalPreferido: "whatsapp",
      exigirConfirmacaoManual: true,
      textoPadraoPt:
        "Olá {nome}! Passando para lembrar do seu horário em {data} às {horario} para {servico} na {negocio}, no endereço {endereco}. Até lá!",
      textoPadraoEn:
        "Hi {nome}! Just a reminder of your appointment on {data} at {horario} for {servico} at {negocio}, located at {endereco}. See you soon!",
    },
    financeiro: {
      formasPagamentoAtivas: {
        dinheiro: true,
        cartaoCredito: true,
        cartaoDebito: true,
        zelle: true,
        venmo: true,
        cashApp: false,
        cheque: false,
        outra: false,
      },
      mostrarGorjetaSeparadamente: true,
      permitirPagamentoParcial: true,
      mostrarValoresPendentes: true,
    },
    seguranca: {
      emailPrincipal: "usuaria@guinhonails.com",
      sessaoExpiracaoMinutos: "30",
    },
  };
}

export const ULTIMO_BACKUP_FICTICIO = {
  pt: "Nenhum backup realizado",
  en: "No backup performed yet",
};
