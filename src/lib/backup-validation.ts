export const BACKUP_COLLECTIONS_V1 = [
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

/** Coleções novas do módulo Despesas (EXPENSES_DESIGN.md) — só exigidas em backups `versao: 2`. */
export const BACKUP_COLLECTIONS_DESPESAS = ["despesas", "lancamentosDespesa"] as const;

export const BACKUP_COLLECTIONS = [...BACKUP_COLLECTIONS_V1, ...BACKUP_COLLECTIONS_DESPESAS] as const;

export type BackupCollection = (typeof BACKUP_COLLECTIONS)[number];

export type ResultadoValidacaoBackup =
  | { valido: true; totais: Partial<Record<BackupCollection, number>> }
  | { valido: false; erros: string[] };

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Faz uma inspeção segura antes de qualquer tentativa de restauração. Esta função não grava,
 * altera nem exclui dados; ela apenas confirma o formato e as relações essenciais do arquivo.
 *
 * Aceita duas versões: `versao: 1` (backups anteriores ao módulo Despesas, 10 coleções) e
 * `versao: 2` (a partir de `despesas`/`lancamentosDespesa` — ver `obterBackupCompleto`). Backups
 * antigos continuam válidos sem precisar conter as coleções novas — tratamento explícito da
 * versão anterior, não uma quebra de compatibilidade.
 */
export function validarBackupCompleto(valor: unknown): ResultadoValidacaoBackup {
  const erros: string[] = [];

  if (!objeto(valor)) return { valido: false, erros: ["O arquivo não contém um objeto JSON válido."] };
  if (valor.formato !== "brazillian-nail-backup") erros.push("Formato de backup não reconhecido.");
  if (valor.versao !== 1 && valor.versao !== 2) erros.push("Versão de backup incompatível.");
  if (typeof valor.exportadoEm !== "string" || Number.isNaN(Date.parse(valor.exportadoEm))) {
    erros.push("Data de exportação ausente ou inválida.");
  }

  if (!objeto(valor.dados)) {
    erros.push("A seção de dados está ausente ou inválida.");
    return { valido: false, erros };
  }

  const colecoesExigidas: readonly BackupCollection[] = valor.versao === 2 ? BACKUP_COLLECTIONS : BACKUP_COLLECTIONS_V1;

  const totais: Partial<Record<BackupCollection, number>> = {};
  for (const colecao of colecoesExigidas) {
    const itens = valor.dados[colecao];
    if (!Array.isArray(itens)) erros.push(`A coleção ${colecao} está ausente ou inválida.`);
    else totais[colecao] = itens.length;
  }

  if (erros.length > 0) return { valido: false, erros };

  const idsPorColecao = new Map<BackupCollection, Set<unknown>>();
  for (const colecao of colecoesExigidas) {
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

  const relacoesV1: Array<[BackupCollection, string, BackupCollection]> = [
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
  const relacoesDespesas: Array<[BackupCollection, string, BackupCollection]> = [
    ["lancamentosDespesa", "despesaId", "despesas"],
    ["lancamentosDespesa", "ajustaLancamentoId", "lancamentosDespesa"],
  ];
  const relacoes = valor.versao === 2 ? [...relacoesV1, ...relacoesDespesas] : relacoesV1;

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
