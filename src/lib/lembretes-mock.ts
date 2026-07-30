import type { Cliente, Contato } from "@/lib/clientes-mock";
import { buildMensagemContato, enderecoBrazillianNail } from "@/lib/mensagens";

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
  clienteId: string;
  horario: string;
  servicoPt: string;
  servicoEn: string;
  statusAgendamento: LembreteStatusAgendamento;
  statusLembrete: LembreteStatus;
  consentimentoRegistrado: boolean;
  mensagemPersonalizada: string | null;
  mensagemPersonalizadaSecundario: string | null;
};

export { enderecoBrazillianNail };

export const mockLembretes: Lembrete[] = [
  {
    id: "lem-1",
    clienteId: "CLI-000001",
    horario: "9:00 AM",
    servicoPt: "Manutenção",
    servicoEn: "Maintenance",
    statusAgendamento: "aguardando",
    statusLembrete: "pendente",
    consentimentoRegistrado: true,
    mensagemPersonalizada: null,
    mensagemPersonalizadaSecundario: null,
  },
  {
    id: "lem-2",
    clienteId: "CLI-000002",
    horario: "11:00 AM",
    servicoPt: "Esmaltação em gel",
    servicoEn: "Gel polish",
    statusAgendamento: "confirmado",
    statusLembrete: "preparado",
    consentimentoRegistrado: true,
    mensagemPersonalizada: null,
    mensagemPersonalizadaSecundario: null,
  },
  {
    id: "lem-3",
    clienteId: "CLI-000003",
    horario: "2:00 PM",
    servicoPt: "Alongamento",
    servicoEn: "Nail extension",
    statusAgendamento: "aguardando",
    statusLembrete: "pendente",
    consentimentoRegistrado: false,
    mensagemPersonalizada: null,
    mensagemPersonalizadaSecundario: null,
  },
  {
    id: "lem-4",
    clienteId: "CLI-000004",
    horario: "4:30 PM",
    servicoPt: "Serviço a definir",
    servicoEn: "Service to be defined",
    statusAgendamento: "aguardando",
    statusLembrete: "indisponivel",
    consentimentoRegistrado: true,
    mensagemPersonalizada: null,
    mensagemPersonalizadaSecundario: null,
  },
];

/** Monta a mensagem padrão do lembrete no idioma do contato informado (PT, EN ou bilíngue). */
export function buildMensagemLembrete(
  lembrete: Lembrete,
  cliente: Cliente | undefined,
  contato: Contato | null,
  dataAmanha: string,
) {
  const nome = cliente?.nomePreferencia ?? cliente?.nome ?? "";
  const idioma = contato?.idioma ?? "pt";
  return buildMensagemContato(idioma, {
    nome,
    data: dataAmanha,
    horario: lembrete.horario,
    servicoPt: lembrete.servicoPt,
    servicoEn: lembrete.servicoEn,
  });
}
