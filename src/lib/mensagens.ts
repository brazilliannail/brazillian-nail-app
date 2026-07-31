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

export type PlaceholdersTemplateLembrete = {
  nome: string;
  data: string;
  horario: string;
  servico: string;
  negocio: string;
  endereco: string;
};

/** Substitui os placeholders `{nome}`, `{data}`, etc. de um template salvo em `configuracoes`
 * (`lembretes_texto_padrao_pt/en`, ver DATABASE_DESIGN.md §4.9 e §11.1). */
export function renderTemplateLembrete(template: string, placeholders: PlaceholdersTemplateLembrete) {
  return template.replace(/\{(nome|data|horario|servico|negocio|endereco)\}/g, (_, chave: keyof PlaceholdersTemplateLembrete) => placeholders[chave]);
}

/**
 * Monta a mensagem de lembrete a partir dos templates configuráveis (Configurações → Lembretes),
 * no idioma do contato — "bilingue" concatena os dois textos, um abaixo do outro.
 */
export function buildMensagemLembreteConfiguravel(
  idioma: IdiomaContato,
  templatePt: string,
  templateEn: string,
  placeholders: PlaceholdersTemplateLembrete,
) {
  if (idioma === "pt") return renderTemplateLembrete(templatePt, placeholders);
  if (idioma === "en") return renderTemplateLembrete(templateEn, placeholders);
  return `${renderTemplateLembrete(templatePt, placeholders)}\n\n${renderTemplateLembrete(templateEn, placeholders)}`;
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
