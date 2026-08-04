"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRosangela } from "@/lib/auth/authorization";
import {
  garantirLancamentosRecorrentesPendentes,
  mapDespesaRow,
  mapLancamentoDespesaRow,
  nextDespesaId,
  proximosLancamentoDespesaIds,
} from "@/lib/despesas-repo";
import {
  CATEGORIAS_DESPESA,
  dataISOValida,
  dolaresParaCentavos,
  gerarParcelas,
  podeCancelarLancamento,
  podeRegistrarPagamento,
  valorLiquidoCentavos,
  type CategoriaDespesa,
  type Despesa,
  type LancamentoDespesa,
} from "@/lib/despesas-mock";
import { formatDateISO } from "@/lib/date";

const FORMAS_PAGAMENTO_VALIDAS = ["dinheiro", "cartaoCredito", "cartaoDebito", "zelle", "venmo", "cashApp", "cheque", "outra"];
const MAX_PARCELAS = 60;

function hojeISO() {
  return formatDateISO(new Date());
}

function competenciaDe(vencimentoISO: string) {
  return vencimentoISO.slice(0, 7);
}

function validarCamposComuns(dados: { descricao: string; categoria: CategoriaDespesa; data: string }) {
  if (dados.descricao.trim().length === 0) throw new Error("Descrição é obrigatória.");
  if (!CATEGORIAS_DESPESA.includes(dados.categoria)) throw new Error("Categoria inválida.");
  if (!dataISOValida(dados.data)) throw new Error("Data inválida.");
}

function validarValorDolares(valor: number, campo = "Valor") {
  if (!Number.isFinite(valor) || valor <= 0) throw new Error(`${campo} deve ser maior que zero.`);
}

export type NovaDespesaAvulsa = {
  descricao: string;
  categoria: CategoriaDespesa;
  valorTotal: number;
  data: string;
  observacoesPt?: string;
  observacoesEn?: string;
};

/** Compra avulsa: um único lançamento, vencendo na própria data da despesa. */
export async function criarDespesaAvulsaAction(dados: NovaDespesaAvulsa): Promise<Despesa> {
  await requireRosangela();
  validarCamposComuns(dados);
  validarValorDolares(dados.valorTotal);

  const valorTotalCentavos = dolaresParaCentavos(dados.valorTotal);

  const row = await prisma.$transaction(async (tx) => {
    const { id, numeroSequencial } = await nextDespesaId(tx);
    const despesa = await tx.despesa.create({
      data: {
        id,
        numeroSequencial,
        descricao: dados.descricao.trim(),
        categoria: dados.categoria,
        tipo: "avulsa",
        valorTotalCentavos,
        data: dados.data,
        observacoesPt: dados.observacoesPt ?? "",
        observacoesEn: dados.observacoesEn ?? "",
      },
    });

    const [lancamentoId] = await proximosLancamentoDespesaIds(tx, 1);
    await tx.lancamentoDespesa.create({
      data: {
        id: lancamentoId.id,
        numeroSequencial: lancamentoId.numeroSequencial,
        despesaId: id,
        competencia: competenciaDe(dados.data),
        vencimento: dados.data,
        valorCentavos: valorTotalCentavos,
      },
    });

    return despesa;
  });

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapDespesaRow(row);
}

export type NovaDespesaParcelada = {
  descricao: string;
  categoria: CategoriaDespesa;
  valorTotal: number;
  parcelas: number;
  data: string;
  observacoesPt?: string;
  observacoesEn?: string;
};

/** Compra parcelada: gera todas as parcelas mensais de uma vez, 1ª parcela na data da compra
 * (decisão aprovada), soma exata garantida por `gerarParcelas`/`dividirEmParcelas`. */
export async function criarDespesaParceladaAction(dados: NovaDespesaParcelada): Promise<Despesa> {
  await requireRosangela();
  validarCamposComuns(dados);
  validarValorDolares(dados.valorTotal);
  if (!Number.isInteger(dados.parcelas) || dados.parcelas < 1 || dados.parcelas > MAX_PARCELAS) {
    throw new Error(`Número de parcelas deve ser um inteiro entre 1 e ${MAX_PARCELAS}.`);
  }

  const valorTotalCentavos = dolaresParaCentavos(dados.valorTotal);
  const parcelas = gerarParcelas({ dataCompra: dados.data, valorTotalCentavos, parcelas: dados.parcelas });

  const row = await prisma.$transaction(async (tx) => {
    const { id, numeroSequencial } = await nextDespesaId(tx);
    const despesa = await tx.despesa.create({
      data: {
        id,
        numeroSequencial,
        descricao: dados.descricao.trim(),
        categoria: dados.categoria,
        tipo: "parcelada",
        valorTotalCentavos,
        data: dados.data,
        parcelas: dados.parcelas,
        observacoesPt: dados.observacoesPt ?? "",
        observacoesEn: dados.observacoesEn ?? "",
      },
    });

    const ids = await proximosLancamentoDespesaIds(tx, parcelas.length);
    await tx.lancamentoDespesa.createMany({
      data: parcelas.map((parcela, index) => ({
        id: ids[index].id,
        numeroSequencial: ids[index].numeroSequencial,
        despesaId: id,
        competencia: parcela.competencia,
        vencimento: parcela.vencimento,
        numeroParcela: parcela.numeroParcela,
        totalParcelas: parcela.totalParcelas,
        valorCentavos: parcela.valorCentavos,
      })),
    });

    return despesa;
  });

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapDespesaRow(row);
}

export type NovaDespesaRecorrente = {
  descricao: string;
  categoria: CategoriaDespesa;
  valorSemanal: number;
  diaSemana: number;
  dataInicio: string;
  dataEncerramento?: string | null;
  observacoesPt?: string;
  observacoesEn?: string;
};

/** Cria a despesa recorrente semanal (ex.: aluguel) e já gera as primeiras ocorrências dentro do
 * horizonte seguro (ver `proximosVencimentosRecorrentes`) — nunca gera lançamentos infinitos. */
export async function criarDespesaRecorrenteAction(dados: NovaDespesaRecorrente): Promise<Despesa> {
  await requireRosangela();
  validarCamposComuns({ descricao: dados.descricao, categoria: dados.categoria, data: dados.dataInicio });
  validarValorDolares(dados.valorSemanal, "Valor semanal");
  if (!Number.isInteger(dados.diaSemana) || dados.diaSemana < 0 || dados.diaSemana > 6) {
    throw new Error("Dia da semana inválido.");
  }
  if (dados.dataEncerramento) {
    if (!dataISOValida(dados.dataEncerramento)) throw new Error("Data de encerramento inválida.");
    if (dados.dataEncerramento < dados.dataInicio) {
      throw new Error("Data de encerramento não pode ser anterior à data de início.");
    }
  }

  const valorSemanalCentavos = dolaresParaCentavos(dados.valorSemanal);

  const row = await prisma.$transaction(async (tx) => {
    const { id, numeroSequencial } = await nextDespesaId(tx);
    const despesa = await tx.despesa.create({
      data: {
        id,
        numeroSequencial,
        descricao: dados.descricao.trim(),
        categoria: dados.categoria,
        tipo: "recorrente",
        valorTotalCentavos: valorSemanalCentavos,
        data: dados.dataInicio,
        diaSemana: dados.diaSemana,
        dataEncerramento: dados.dataEncerramento ?? null,
        observacoesPt: dados.observacoesPt ?? "",
        observacoesEn: dados.observacoesEn ?? "",
      },
    });

    return despesa;
  });

  // Gera as primeiras ocorrências fora da transação de criação (mesma função usada por leituras,
  // já idempotente — ver despesas-repo.ts) para não duplicar a lógica de geração aqui.
  await garantirLancamentosRecorrentesPendentes();

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapDespesaRow(row);
}

/** Gatilho manual autenticado para o mesmo efeito que já roda automaticamente a cada leitura de
 * `getLancamentosDespesa` (despesas-repo.ts) — útil para um botão "Atualizar" na UI. */
export async function gerarLancamentosRecorrentesPendentesAction(): Promise<void> {
  await requireRosangela();
  await garantirLancamentosRecorrentesPendentes();
  revalidatePath("/despesas");
  revalidatePath("/financeiro");
}

export type RegistrarPagamentoLancamentoDados = {
  lancamentoId: string;
  dataPagamento: string;
  formaPagamento?: string | null;
};

/** Marca um lançamento `pendente` como `pago`. Uma vez pago, o lançamento é imutável — nenhuma
 * outra action edita ou reverte esse status; correções de valor passam por `corrigirLancamentoDespesaAction`. */
export async function registrarPagamentoLancamentoAction(dados: RegistrarPagamentoLancamentoDados): Promise<LancamentoDespesa> {
  await requireRosangela();
  if (!dataISOValida(dados.dataPagamento)) throw new Error("Data de pagamento inválida.");
  if (dados.formaPagamento && !FORMAS_PAGAMENTO_VALIDAS.includes(dados.formaPagamento)) {
    throw new Error("Forma de pagamento inválida.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const existente = await tx.lancamentoDespesa.findUnique({ where: { id: dados.lancamentoId } });
    if (!existente) throw new Error("Lançamento não encontrado.");
    if (!podeRegistrarPagamento(existente.status as "pendente" | "pago" | "cancelado")) {
      throw new Error("Apenas lançamentos pendentes podem ser marcados como pagos.");
    }

    return tx.lancamentoDespesa.update({
      where: { id: dados.lancamentoId },
      data: { status: "pago", dataPagamento: dados.dataPagamento, formaPagamento: dados.formaPagamento ?? null },
    });
  });

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapLancamentoDespesaRow(row);
}

/** Cancela um lançamento ainda `pendente` — nunca exclui a linha (histórico preservado) e nunca
 * cancela um lançamento já `pago` (imutável; ver `podeCancelarLancamento`). */
export async function cancelarLancamentoAction(lancamentoId: string): Promise<LancamentoDespesa> {
  await requireRosangela();

  const row = await prisma.$transaction(async (tx) => {
    const existente = await tx.lancamentoDespesa.findUnique({ where: { id: lancamentoId } });
    if (!existente) throw new Error("Lançamento não encontrado.");
    if (!podeCancelarLancamento(existente.status as "pendente" | "pago" | "cancelado")) {
      throw new Error("Apenas lançamentos pendentes podem ser cancelados; lançamentos pagos são definitivos.");
    }

    return tx.lancamentoDespesa.update({ where: { id: lancamentoId }, data: { status: "cancelado" } });
  });

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapLancamentoDespesaRow(row);
}

/** Corrige o valor de um lançamento já `pago` sem editar ou apagar a linha original: cria um novo
 * lançamento de ajuste (positivo ou negativo) referenciando o original via `ajustaLancamentoId` —
 * mesmo padrão de `corrigirLancamentoAction` no livro-razão de pagamentos. A soma de original +
 * ajustes passa a refletir o valor correto; o lançamento original nunca muda. */
export async function corrigirLancamentoDespesaAction(dados: {
  lancamentoId: string;
  novoValorTotal: number;
  observacoesPt?: string;
  observacoesEn?: string;
}): Promise<LancamentoDespesa> {
  await requireRosangela();
  validarValorDolares(dados.novoValorTotal, "Novo valor");
  const novoValorTotalCentavos = dolaresParaCentavos(dados.novoValorTotal);

  const row = await prisma.$transaction(async (tx) => {
    const original = await tx.lancamentoDespesa.findUnique({ where: { id: dados.lancamentoId } });
    if (!original) throw new Error("Lançamento não encontrado.");
    if (original.status !== "pago") {
      throw new Error("Apenas lançamentos já pagos usam este fluxo de correção; edite o lançamento pendente diretamente.");
    }
    if (original.ajustaLancamentoId) {
      throw new Error("Não é possível corrigir um lançamento que já é, ele próprio, um ajuste.");
    }

    const grupo = await tx.lancamentoDespesa.findMany({
      where: { OR: [{ id: original.id }, { ajustaLancamentoId: original.id }] },
    });
    const valorAtual = valorLiquidoCentavos(grupo);
    const delta = novoValorTotalCentavos - valorAtual;
    if (delta === 0) throw new Error("O novo valor é igual ao valor já registrado; nenhuma correção necessária.");

    const [ajusteId] = await proximosLancamentoDespesaIds(tx, 1);
    return tx.lancamentoDespesa.create({
      data: {
        id: ajusteId.id,
        numeroSequencial: ajusteId.numeroSequencial,
        despesaId: original.despesaId,
        competencia: original.competencia,
        vencimento: original.vencimento,
        numeroParcela: original.numeroParcela,
        totalParcelas: original.totalParcelas,
        valorCentavos: delta,
        status: "pago",
        dataPagamento: hojeISO(),
        formaPagamento: original.formaPagamento,
        observacoesPt: dados.observacoesPt ?? "",
        observacoesEn: dados.observacoesEn ?? "",
        ajustaLancamentoId: original.id,
      },
    });
  });

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapLancamentoDespesaRow(row);
}

/** Cancela a despesa (encerra recorrência futura e cancela lançamentos ainda `pendente`s) — nunca
 * toca em lançamentos já `pago`s e nunca exclui nenhuma linha. */
export async function cancelarDespesaAction(despesaId: string): Promise<Despesa> {
  await requireRosangela();

  const row = await prisma.$transaction(async (tx) => {
    const existente = await tx.despesa.findUnique({ where: { id: despesaId } });
    if (!existente) throw new Error("Despesa não encontrada.");
    if (existente.status === "cancelada") throw new Error("Despesa já está cancelada.");

    await tx.lancamentoDespesa.updateMany({
      where: { despesaId, status: "pendente" },
      data: { status: "cancelado" },
    });

    return tx.despesa.update({ where: { id: despesaId }, data: { status: "cancelada" } });
  });

  revalidatePath("/despesas");
  revalidatePath("/financeiro");
  return mapDespesaRow(row);
}

/** Altera o valor semanal de uma despesa recorrente — só afeta ocorrências futuras ainda não
 * geradas (decisão aprovada); lançamentos já gerados preservam o valor com que nasceram. */
export async function atualizarValorDespesaRecorrenteAction(despesaId: string, novoValorSemanal: number): Promise<Despesa> {
  await requireRosangela();
  validarValorDolares(novoValorSemanal, "Valor semanal");

  const row = await prisma.$transaction(async (tx) => {
    const existente = await tx.despesa.findUnique({ where: { id: despesaId } });
    if (!existente) throw new Error("Despesa não encontrada.");
    if (existente.tipo !== "recorrente") throw new Error("Apenas despesas recorrentes têm valor semanal ajustável.");
    if (existente.status !== "ativa") throw new Error("Apenas despesas recorrentes ativas podem ter o valor alterado.");

    return tx.despesa.update({
      where: { id: despesaId },
      data: { valorTotalCentavos: dolaresParaCentavos(novoValorSemanal) },
    });
  });

  revalidatePath("/despesas");
  return mapDespesaRow(row);
}
