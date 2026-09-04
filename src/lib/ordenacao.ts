/**
 * Compara dois textos ignorando acentos e maiúsculas/minúsculas (ex.: "álvaro" e "Alvaro" são
 * equivalentes). `sensitivity: "base"` do Intl ignora tanto caixa quanto diacríticos.
 */
export function compararIgnorandoAcentosEMaiusculas(a: string, b: string): number {
  return a.localeCompare(b, "pt", { sensitivity: "base" });
}

/**
 * Retorna uma NOVA lista ordenada alfabeticamente pelo texto extraído de cada item, ignorando
 * acentos/maiúsculas. Não muta a lista original nem reflete de volta na ordem de armazenamento —
 * uso exclusivo de apresentação (ex.: seletores de cliente/serviço na Agenda).
 */
export function ordenarPorTexto<T>(itens: T[], extrairTexto: (item: T) => string): T[] {
  return [...itens].sort((a, b) => compararIgnorandoAcentosEMaiusculas(extrairTexto(a), extrairTexto(b)));
}
