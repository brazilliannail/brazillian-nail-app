export const BACKUP_COLLECTIONS = [
  "clientes",
  "contatos",
  "servicos",
  "agendamentos",
  "atendimentos",
  "atendimentoServicos",
  "pagamentos",
  "lembretes",
  "mensagensLog",
  "configuracoes",
] as const;

export type BackupCollection = (typeof BACKUP_COLLECTIONS)[number];

export type ResultadoValidacaoBackup =
  | { valido: true; totais: Record<BackupCollection, number> }
  | { valido: false; erros: string[] };

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Faz uma inspeção segura antes de qualquer tentativa de restauração. Esta função não grava,
 * altera nem exclui dados; ela apenas confirma o formato e as relações essenciais do arquivo.
 */
export function validarBackupCompleto(valor: unknown): ResultadoValidacaoBackup {
  const erros: string[] = [];

  if (!objeto(valor)) return { valido: false, erros: ["O arquivo não contém um objeto JSON válido."] };
  if (valor.formato !== "brazillian-nail-backup") erros.push("Formato de backup não reconhecido.");
  if (valor.versao !== 1) erros.push("Versão de backup incompatível.");
  if (typeof valor.exportadoEm !== "string" || Number.isNaN(Date.parse(valor.exportadoEm))) {
    erros.push("Data de exportação ausente ou inválida.");
  }

  if (!objeto(valor.dados)) {
    erros.push("A seção de dados está ausente ou inválida.");
    return { valido: false, erros };
  }

  const totais = {} as Record<BackupCollection, number>;
  for (const colecao of BACKUP_COLLECTIONS) {
    const itens = valor.dados[colecao];
    if (!Array.isArray(itens)) erros.push(`A coleção ${colecao} está ausente ou inválida.`);
    else totais[colecao] = itens.length;
  }

  if (erros.length > 0) return { valido: false, erros };

  const idsPorColecao = new Map<BackupCollection, Set<unknown>>();
  for (const colecao of BACKUP_COLLECTIONS) {
    const itens = valor.dados[colecao] as unknown[];
    const ids = new Set<unknown>();
    for (const item of itens) {
      if (!objeto(item) || !("id" in item)) {
        erros.push(`Há um registro sem identificador em ${colecao}.`);
        continue;
      }
      if (ids.has(item.id)) erros.push(`Há identificadores repetidos em ${colecao}.`);
      ids.add(item.id);
    }
    idsPorColecao.set(colecao, ids);
  }

  const relacoes: Array<[BackupCollection, string, BackupCollection]> = [
    ["contatos", "clienteId", "clientes"],
    ["agendamentos", "clienteId", "clientes"],
    ["agendamentos", "servicoId", "servicos"],
    ["atendimentos", "clienteId", "clientes"],
    ["atendimentos", "agendamentoId", "agendamentos"],
    ["atendimentos", "proximoAgendamentoId", "agendamentos"],
    ["atendimentoServicos", "atendimentoId", "atendimentos"],
    ["atendimentoServicos", "servicoId", "servicos"],
    ["pagamentos", "atendimentoId", "atendimentos"],
    ["pagamentos", "estornaPagamentoId", "pagamentos"],
    ["lembretes", "agendamentoId", "agendamentos"],
    ["mensagensLog", "clienteId", "clientes"],
    ["mensagensLog", "contatoId", "contatos"],
    ["mensagensLog", "lembreteId", "lembretes"],
  ];

  for (const [origem, campo, destino] of relacoes) {
    for (const item of valor.dados[origem] as Record<string, unknown>[]) {
      const idRelacionado = item[campo];
      if (idRelacionado !== null && idRelacionado !== undefined && !idsPorColecao.get(destino)?.has(idRelacionado)) {
        erros.push(`Relação inválida: ${origem}.${campo} não existe em ${destino}.`);
      }
    }
  }

  return erros.length > 0 ? { valido: false, erros } : { valido: true, totais };
}
