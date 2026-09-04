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

/**
 * Normaliza um telefone (armazenado com qualquer formatação — parênteses, espaços, traços, "+")
 * para os dígitos que o link `wa.me` espera, SEM alterar/retornar o telefone armazenado (esta
 * função só lê `telefone`, nunca o reescreve em lugar nenhum): 10 dígitos (número local dos EUA)
 * ganham o prefixo `1`; 11 dígitos já começando com `1` (com ou sem "+" na formatação original,
 * que já cai fora ao tirar os não-dígitos) NÃO ganham um `1` extra — bug anterior desta função, que
 * sempre prefixava `1` cegamente e gerava `wa.me/115085550100` (11 dígitos + 1 extra) para números
 * já completos. Outros comprimentos (ex.: DDI de outro país) são repassados como estão, sem inventar
 * prefixo dos EUA.
 */
function normalizarDigitosWhatsapp(telefone: string): string {
  const digitos = apenasDigitos(telefone);
  if (digitos.length === 10) return `1${digitos}`;
  if (digitos.length === 11 && digitos.startsWith("1")) return digitos;
  return digitos;
}

/** Entrada vazia/sem dígitos não produz um link "funcional" (não abre um chat aleatório no
 * WhatsApp) — retorna string vazia, que como `href` de um link apenas não navega a lugar nenhum. */
export function whatsappHref(telefone: string, mensagem: string) {
  const digitos = normalizarDigitosWhatsapp(telefone);
  if (digitos === "") return "";
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

export function smsHref(telefone: string, mensagem: string) {
  return `sms:${telefone}?&body=${encodeURIComponent(mensagem)}`;
}
