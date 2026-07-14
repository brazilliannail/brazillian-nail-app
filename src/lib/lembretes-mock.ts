export type LembreteIdioma = "pt" | "en";
export type LembreteStatusAgendamento = "aguardando" | "confirmado";
export type LembreteStatus =
  | "pendente"
  | "preparado"
  | "enviado"
  | "tratadoPessoalmente"
  | "ignorado"
  | "indisponivel";

export type Lembrete = {
  id: string;
  cliente: string;
  horario: string;
  servicoPt: string;
  servicoEn: string;
  telefone: string | null;
  idioma: LembreteIdioma;
  statusAgendamento: LembreteStatusAgendamento;
  statusLembrete: LembreteStatus;
  consentimentoRegistrado: boolean;
  mensagemPersonalizada: string | null;
};

/** Endereço fictício, apenas para o protótipo visual. */
export const enderecoBrazillianNail = "456 Nail Ave, Fall River, MA 02720";

export const mockLembretes: Lembrete[] = [
  {
    id: "lem-1",
    cliente: "Ana Silva",
    horario: "9:00 AM",
    servicoPt: "Manutenção",
    servicoEn: "Maintenance",
    telefone: "(508) 555-0148",
    idioma: "pt",
    statusAgendamento: "aguardando",
    statusLembrete: "pendente",
    consentimentoRegistrado: true,
    mensagemPersonalizada: null,
  },
  {
    id: "lem-2",
    cliente: "Maria Costa",
    horario: "11:00 AM",
    servicoPt: "Esmaltação em gel",
    servicoEn: "Gel polish",
    telefone: "(508) 555-0172",
    idioma: "pt",
    statusAgendamento: "confirmado",
    statusLembrete: "preparado",
    consentimentoRegistrado: true,
    mensagemPersonalizada: null,
  },
  {
    id: "lem-3",
    cliente: "Juliana Santos",
    horario: "2:00 PM",
    servicoPt: "Alongamento",
    servicoEn: "Nail extension",
    telefone: "(508) 555-0193",
    idioma: "en",
    statusAgendamento: "aguardando",
    statusLembrete: "pendente",
    consentimentoRegistrado: false,
    mensagemPersonalizada: null,
  },
  {
    id: "lem-4",
    cliente: "Camila Oliveira",
    horario: "4:30 PM",
    servicoPt: "Serviço a definir",
    servicoEn: "Service to be defined",
    telefone: null,
    idioma: "pt",
    statusAgendamento: "aguardando",
    statusLembrete: "indisponivel",
    consentimentoRegistrado: true,
    mensagemPersonalizada: null,
  },
];

function templatePt(cliente: string, data: string, horario: string, servico: string) {
  return `Olá ${cliente}! Este é um lembrete do seu horário amanhã, ${data} às ${horario}, para ${servico} no Brazillian Nail. Endereço: ${enderecoBrazillianNail}. Qualquer dúvida ou necessidade de reagendar, é só responder por aqui.`;
}

function templateEn(cliente: string, data: string, horario: string, servico: string) {
  return `Hi ${cliente}! This is a reminder about your appointment tomorrow, ${data} at ${horario}, for ${servico} at Brazillian Nail. Address: ${enderecoBrazillianNail}. Reply here if you have any questions or need to reschedule.`;
}

/** Monta a mensagem padrão do lembrete no idioma preferido da cliente. */
export function buildMensagemLembrete(lembrete: Lembrete, dataAmanha: string) {
  const servico = lembrete.idioma === "pt" ? lembrete.servicoPt : lembrete.servicoEn;
  return lembrete.idioma === "pt"
    ? templatePt(lembrete.cliente, dataAmanha, lembrete.horario, servico)
    : templateEn(lembrete.cliente, dataAmanha, lembrete.horario, servico);
}
