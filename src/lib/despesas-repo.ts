import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { formatDateISO } from "@/lib/date";
import {
  formatDespesaId,
  formatLancamentoDespesaId,
  proximosVencimentosRecorrentes,
  type CategoriaDespesa,
  type Despesa,
  type LancamentoDespesa,
  type StatusDespesa,
  type StatusLancamentoDespesa,
  type TipoDespesa,
} from "@/lib/despesas-mock";

type Tx = Prisma.TransactionClient;

type DespesaRow = {
  id: string;
  numeroSequencial: number;
  descricao: string;
  categoria: string;
  tipo: string;
  valorTotalCentavos: number;
  data: string;
  parcelas: number | null;
  diaSemana: number | null;
  dataEncerramento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  status: string;
};

type LancamentoDespesaRow = {
  id: string;
  numeroSequencial: number;
  despesaId: string;
  competencia: string;
  vencimento: string;
  numeroParcela: number | null;
  totalParcelas: number | null;
  valorCentavos: number;
  status: string;
  dataPagamento: string | null;
  formaPagamento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  ajustaLancamentoId: string | null;
};

export function mapDespesaRow(row: DespesaRow): Despesa {
  return {
    id: row.id,
    numeroSequencial: row.numeroSequencial,
    descricao: row.descricao,
    categoria: row.categoria as CategoriaDespesa,
    tipo: row.tipo as TipoDespesa,
    valorTotalCentavos: row.valorTotalCentavos,
    data: row.data,
    parcelas: row.parcelas,
    diaSemana: row.diaSemana,
    dataEncerramento: row.dataEncerramento,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
    status: row.status as StatusDespesa,
  };
}

export function mapLancamentoDespesaRow(row: LancamentoDespesaRow): LancamentoDespesa {
  return {
    id: row.id,
    numeroSequencial: row.numeroSequencial,
    despesaId: row.despesaId,
    competencia: row.competencia,
    vencimento: row.vencimento,
    numeroParcela: row.numeroParcela,
    totalParcelas: row.totalParcelas,
    valorCentavos: row.valorCentavos,
    status: row.status as StatusLancamentoDespesa,
    dataPagamento: row.dataPagamento,
    formaPagamento: row.formaPagamento,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
    ajustaLancamentoId: row.ajustaLancamentoId,
  };
}

/** Todas as despesas cadastradas (qualquer status) — filtros de UI (categoria/status/tipo/período)
 * são aplicados em memória, mesmo padrão de `financeiro-repo.ts`/`getLancamentosCaixa`. */
export async function getDespesas(): Promise<Despesa[]> {
  const rows = await prisma.despesa.findMany({ orderBy: { numeroSequencial: "asc" } });
  return rows.map(mapDespesaRow);
}

/** Próximo id de despesa, a partir de `numero_sequencial` — mesmo padrão de `nextAtendimentoId`
 * em atendimentos-actions.ts. Exportado para uso em `despesas-actions.ts`. */
export async function nextDespesaId(tx: Tx): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await tx.despesa.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: formatDespesaId(numeroSequencial), numeroSequencial };
}

/** Reserva `quantidade` IDs sequenciais novos de lançamento de despesa, dentro da transação. */
export async function proximosLancamentoDespesaIds(tx: Tx, quantidade: number): Promise<{ id: string; numeroSequencial: number }[]> {
  if (quantidade === 0) return [];
  const agregado = await tx.lancamentoDespesa.aggregate({ _max: { numeroSequencial: true } });
  const base = agregado._max.numeroSequencial ?? 0;
  return Array.from({ length: quantidade }, (_, index) => {
    const numeroSequencial = base + index + 1;
    return { id: formatLancamentoDespesaId(numeroSequencial), numeroSequencial };
  });
}

function competenciaDe(vencimentoISO: string) {
  return vencimentoISO.slice(0, 7);
}

async function gerarLancamentosRecorrentesDaDespesa(
  tx: Tx,
  despesa: { id: string; data: string; diaSemana: number | null; dataEncerramento: string | null; valorTotalCentavos: number; status: string },
) {
  if (despesa.status !== "ativa" || despesa.diaSemana === null) return;

  const ultimo = await tx.lancamentoDespesa.aggregate({ where: { despesaId: despesa.id }, _max: { vencimento: true } });

  const vencimentos = proximosVencimentosRecorrentes({
    dataBase: despesa.data,
    diaSemana: despesa.diaSemana,
    dataEncerramento: despesa.dataEncerramento,
    ultimoVencimentoGerado: ultimo._max.vencimento ?? null,
    hojeISO: formatDateISO(new Date()),
  });
  if (vencimentos.length === 0) return;

  const ids = await proximosLancamentoDespesaIds(tx, vencimentos.length);
  await tx.lancamentoDespesa.createMany({
    data: vencimentos.map((vencimento, index) => ({
      id: ids[index].id,
      numeroSequencial: ids[index].numeroSequencial,
      despesaId: despesa.id,
      competencia: competenciaDe(vencimento),
      vencimento,
      valorCentavos: despesa.valorTotalCentavos,
    })),
  });
}

/**
 * Gera, para todas as despesas recorrentes `ativa`s, as ocorrências semanais que ainda faltam
 * dentro de um horizonte seguro (nunca infinito — ver `proximosVencimentosRecorrentes`).
 * Idempotente e sem autorização própria: mesmo padrão de `garantirLembretesDoDia`, chamada como
 * efeito colateral de uma leitura confiável (`getLancamentosDespesa`, já dentro do layout
 * autenticado) — `gerarLancamentosRecorrentesPendentesAction` (despesas-actions.ts) expõe o mesmo
 * efeito para um gatilho manual autenticado explícito.
 */
export async function garantirLancamentosRecorrentesPendentes(): Promise<void> {
  const recorrentesAtivas = await prisma.despesa.findMany({ where: { tipo: "recorrente", status: "ativa" } });
  if (recorrentesAtivas.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const despesa of recorrentesAtivas) {
      await gerarLancamentosRecorrentesDaDespesa(tx, despesa);
    }
  });
}

/** Todos os lançamentos de despesa (qualquer status, inclusive ajustes) — base dos indicadores de
 * "despesas pagas"/"despesas previstas" do Financeiro e da lista da tela de Despesas. Garante
 * primeiro que as ocorrências semanais pendentes existem (mesmo padrão de `getLembretesAmanha`). */
export async function getLancamentosDespesa(): Promise<LancamentoDespesa[]> {
  await garantirLancamentosRecorrentesPendentes();
  const rows = await prisma.lancamentoDespesa.findMany({ orderBy: { numeroSequencial: "asc" } });
  return rows.map(mapLancamentoDespesaRow);
}
