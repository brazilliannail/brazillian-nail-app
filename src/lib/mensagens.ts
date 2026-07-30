import type { IdiomaContato } from "@/lib/clientes-mock";

export const enderecoBrazillianNail = "456 Nail Ave, Fall River, MA 02720";

export type DadosMensagem = {
  nome: string;
  data: string | null;
  horario: string | null;
  servicoPt: string | null;
  servicoEn: string | null;
};

function textoPt({ nome, data, horario, servicoPt }: DadosMensagem) {
  if (data && horario) {
    const trechoServico = servicoPt ? `, para ${servicoPt}` : "";
    return `Olá ${nome}! Este é um lembrete do seu horário em ${data} às ${horario}${trechoServico} no Brazillian Nail. Endereço: ${enderecoBrazillianNail}. Qualquer dúvida ou necessidade de reagendar, é só responder por aqui.`;
  }
  return `Olá ${nome}! Aqui é do Brazillian Nail. Qualquer dúvida ou necessidade de contato, é só responder por aqui.`;
}

function textoEn({ nome, data, horario, servicoEn }: DadosMensagem) {
  if (data && horario) {
    const servicePhrase = servicoEn ? `, for ${servicoEn}` : "";
    return `Hi ${nome}! This is a reminder about your appointment on ${data} at ${horario}${servicePhrase} at Brazillian Nail. Address: ${enderecoBrazillianNail}. Reply here if you have any questions or need to reschedule.`;
  }
  return `Hi ${nome}! This is Brazillian Nail. Reply here if you have any questions or need to reach us.`;
}

/**
 * Monta a mensagem para um contato no idioma dele:
 * - "pt": somente em português.
 * - "en": somente em inglês.
 * - "bilingue": português e inglês, um abaixo do outro.
 */
export function buildMensagemContato(idioma: IdiomaContato, dados: DadosMensagem) {
  if (idioma === "pt") return textoPt(dados);
  if (idioma === "en") return textoEn(dados);
  return `${textoPt(dados)}\n\n${textoEn(dados)}`;
}

function apenasDigitos(telefone: string) {
  return telefone.replace(/\D/g, "");
}

export function whatsappHref(telefone: string, mensagem: string) {
  return `https://wa.me/1${apenasDigitos(telefone)}?text=${encodeURIComponent(mensagem)}`;
}

export function smsHref(telefone: string, mensagem: string) {
  return `sms:${telefone}?&body=${encodeURIComponent(mensagem)}`;
}
