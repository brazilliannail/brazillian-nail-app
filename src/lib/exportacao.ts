import { prisma } from "@/lib/db";
import { centavosParaDolares } from "@/lib/despesas-mock";

export const EXPORT_DATASETS = ["clientes", "servicos", "agenda", "atendimentos", "financeiro", "despesas"] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

export function isExportDataset(valor: string | null): valor is ExportDataset {
  return valor !== null && EXPORT_DATASETS.includes(valor as ExportDataset);
}

export function csvSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = valor instanceof Date ? valor.toISOString() : String(valor);
  const protegido = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${protegido.replaceAll('"', '""')}"`;
}

export function montarCsv(colunas: string[], linhas: Record<string, unknown>[]) {
  return [
    colunas.map(csvSeguro).join(","),
    ...linhas.map((linha) => colunas.map((coluna) => csvSeguro(linha[coluna])).join(",")),
  ].join("\r\n");
}

export async function obterBackupCompleto() {
  const [
    clientes,
    contatos,
    servicos,
    agendamentos,
    atendimentos,
    atendimentoServicos,
    pagamentos,
    lembretes,
    mensagensLog,
    configuracoes,
    despesas,
    lancamentosDespesa,
  ] = await prisma.$transaction([
    prisma.cliente.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.contato.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.servico.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.agendamento.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.atendimento.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.atendimentoServico.findMany({ orderBy: { id: "asc" } }),
    prisma.pagamento.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.lembrete.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.mensagemLog.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.configuracao.findMany({ orderBy: { id: "asc" } }),
    prisma.despesa.findMany({ orderBy: { numeroSequencial: "asc" } }),
    prisma.lancamentoDespesa.findMany({ orderBy: { numeroSequencial: "asc" } }),
  ]);

  return {
    formato: "brazillian-nail-backup",
    // versao 2: adiciona despesas/lancamentosDespesa (módulo Despesas). Backups versao 1
    // continuam válidos para leitura/validação — ver backup-validation.ts.
    versao: 2,
    exportadoEm: new Date().toISOString(),
    aviso: "Este arquivo contém dados pessoais. Guarde-o em local privado.",
    dados: {
      clientes,
      contatos,
      servicos,
      agendamentos,
      atendimentos,
      atendimentoServicos,
      pagamentos,
      lembretes,
      mensagensLog,
      configuracoes,
      despesas,
      lancamentosDespesa,
    },
  };
}

export async function obterCsv(dataset: ExportDataset) {
  if (dataset === "clientes") {
    const linhas = await prisma.cliente.findMany({ include: { contatos: true }, orderBy: { numeroSequencial: "asc" } });
    const colunas = ["id", "nome", "nomePreferencia", "status", "telefone", "idioma", "canalPreferido", "receberLembretes", "observacoesPt", "observacoesEn"];
    return montarCsv(colunas, linhas.map(({ contatos, ...cliente }) => ({ ...cliente, telefone: contatos[0]?.telefone ?? "", idioma: contatos[0]?.idioma ?? "", canalPreferido: contatos[0]?.canalPreferido ?? "", receberLembretes: contatos[0]?.receberLembretes ?? "" })));
  }
  if (dataset === "servicos") {
    const linhas = await prisma.servico.findMany({ orderBy: { numeroSequencial: "asc" } });
    const colunas = ["id", "nomePt", "nomeEn", "categoria", "precoPadrao", "precoVariavel", "duracaoPadraoMin", "retornoSugeridoDias", "status"];
    return montarCsv(colunas, linhas);
  }
  if (dataset === "agenda") {
    const linhas = await prisma.agendamento.findMany({ include: { cliente: true, servico: true }, orderBy: [{ data: "asc" }, { inicioMin: "asc" }] });
    const colunas = ["id", "data", "inicioMin", "fimMin", "status", "cliente", "servico", "valorEstimado", "observacoesPt", "observacoesEn"];
    return montarCsv(colunas, linhas.map(({ cliente, servico, ...item }) => ({ ...item, cliente: cliente.nome, servico: servico?.nomePt ?? "" })));
  }
  if (dataset === "atendimentos") {
    const linhas = await prisma.atendimento.findMany({ include: { cliente: true, servicos: true }, orderBy: [{ data: "asc" }, { numeroSequencial: "asc" }] });
    const colunas = ["id", "data", "horarioInicio", "horarioFim", "status", "cliente", "servicos", "valorServicos", "desconto", "observacoesPt", "observacoesEn"];
    return montarCsv(colunas, linhas.map(({ cliente, servicos, ...item }) => ({ ...item, cliente: cliente.nome, servicos: servicos.map((s) => s.nomePt).join(" | "), valorServicos: servicos.reduce((total, s) => total + s.valor, 0) })));
  }

  if (dataset === "financeiro") {
    const linhas = await prisma.pagamento.findMany({ include: { atendimento: { include: { cliente: true } } }, orderBy: [{ dataPagamento: "asc" }, { numeroSequencial: "asc" }] });
    const colunas = ["id", "dataPagamento", "cliente", "atendimentoId", "natureza", "tipo", "valor", "formaPagamento", "estornaPagamentoId", "observacoesPt", "observacoesEn"];
    return montarCsv(colunas, linhas.map(({ atendimento, ...item }) => ({ ...item, cliente: atendimento.cliente.nome })));
  }

  const linhas = await prisma.lancamentoDespesa.findMany({ include: { despesa: true }, orderBy: [{ vencimento: "asc" }, { numeroSequencial: "asc" }] });
  const colunas = [
    "id",
    "despesaId",
    "descricao",
    "categoria",
    "tipo",
    "competencia",
    "vencimento",
    "numeroParcela",
    "totalParcelas",
    "valor",
    "status",
    "dataPagamento",
    "formaPagamento",
    "ajustaLancamentoId",
    "observacoesPt",
    "observacoesEn",
  ];
  return montarCsv(
    colunas,
    linhas.map(({ despesa, valorCentavos, ...item }) => ({
      ...item,
      descricao: despesa.descricao,
      categoria: despesa.categoria,
      tipo: despesa.tipo,
      valor: centavosParaDolares(valorCentavos),
    })),
  );
}
