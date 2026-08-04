/**
 * Domínio puro do módulo Despesas (EXPENSES_DESIGN.md) — tipos e funções sem I/O, mesmo padrão de
 * `pagamentos-mock.ts`/`atendimentos-mock.ts`. Valores em **centavos inteiros** (nunca `Float`)
 * porque é aqui que a matemática de parcelamento acontece — soma de `dividirEmParcelas` sempre
 * bate exatamente com o total, mesmo quando não é múltiplo do número de parcelas.
 */

export type TipoDespesa = "avulsa" | "recorrente" | "parcelada";
export type StatusDespesa = "ativa" | "encerrada" | "cancelada";
export type StatusLancamentoDespesa = "pendente" | "pago" | "cancelado";
export type CategoriaDespesa =
  | "aluguel"
  | "contasFixas"
  | "comprasEquipamentos"
  | "servicosProfissionais"
  | "marketing"
  | "outros";

export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  "aluguel",
  "contasFixas",
  "comprasEquipamentos",
  "servicosProfissionais",
  "marketing",
  "outros",
];

export type Despesa = {
  id: string;
  numeroSequencial: number;
  descricao: string;
  categoria: CategoriaDespesa;
  tipo: TipoDespesa;
  valorTotalCentavos: number;
  data: string;
  parcelas: number | null;
  diaSemana: number | null;
  dataEncerramento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  status: StatusDespesa;
};

export type LancamentoDespesa = {
  id: string;
  numeroSequencial: number;
  despesaId: string;
  competencia: string;
  vencimento: string;
  numeroParcela: number | null;
  totalParcelas: number | null;
  valorCentavos: number;
  status: StatusLancamentoDespesa;
  dataPagamento: string | null;
  formaPagamento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  ajustaLancamentoId: string | null;
};

export function formatDespesaId(numero: number) {
  return `DESP-${String(numero).padStart(6, "0")}`;
}

export function formatLancamentoDespesaId(numero: number) {
  return `LDESP-${String(numero).padStart(6, "0")}`;
}

export function centavosParaDolares(centavos: number) {
  return Math.round(centavos) / 100;
}

export function dolaresParaCentavos(valor: number) {
  return Math.round(valor * 100);
}

/**
 * Divide um valor total (centavos) em N parcelas preservando a soma exata. As primeiras N-1
 * parcelas recebem `floor(total / N)`; a diferença de arredondamento (quando o total não é
 * múltiplo de N) vai inteira na última parcela — nunca distribuída silenciosamente nem perdida.
 * Ex.: 120000 centavos (US$1.200) em 10x → dez parcelas de 12000 (US$120), diferença zero.
 * Ex.: 10000 centavos (US$100) em 3x → 3333, 3333, 3334 — soma 10000 exatos.
 */
export function dividirEmParcelas(totalCentavos: number, parcelas: number): number[] {
  const base = Math.floor(totalCentavos / parcelas);
  const resultado = Array.from({ length: parcelas }, () => base);
  resultado[parcelas - 1] = totalCentavos - base * (parcelas - 1);
  return resultado;
}

function competenciaDe(vencimentoISO: string) {
  return vencimentoISO.slice(0, 7);
}

function formatISO(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDiasISO(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dias);
  return formatISO(date);
}

/** Soma `meses` à data, preservando o dia quando o mês de destino o comporta; quando não (ex.:
 * 31/01 + 1 mês), cai no último dia do mês de destino em vez de "vazar" para o mês seguinte. */
export function addMesesISO(dataISO: string, meses: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const primeiroDiaDestino = new Date(y, m - 1 + meses, 1);
  const ultimoDiaDoMes = new Date(primeiroDiaDestino.getFullYear(), primeiroDiaDestino.getMonth() + 1, 0).getDate();
  primeiroDiaDestino.setDate(Math.min(d, ultimoDiaDoMes));
  return formatISO(primeiroDiaDestino);
}

/** Verdadeiro só quando a string está no formato YYYY-MM-DD e representa uma data de calendário
 * real (rejeita, por exemplo, "2026-02-30" ou "2026-13-01") — o regex sozinho aceita esses casos,
 * já que `Date` "normaliza" datas inválidas em vez de rejeitá-las. */
export function dataISOValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [y, m, d] = valor.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function diaSemanaISO(dataISO: string): number {
  const [y, m, d] = dataISO.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Próxima data (>= referência, inclusive) cujo dia da semana é `diaSemana` (0=domingo..6=sábado). */
export function proximaOcorrenciaSemanal(referenciaISO: string, diaSemana: number): string {
  const diferenca = (diaSemana - diaSemanaISO(referenciaISO) + 7) % 7;
  return addDiasISO(referenciaISO, diferenca);
}

/**
 * Gera os lançamentos de uma compra parcelada (1ª parcela na data da compra — decisão aprovada —,
 * demais no mesmo dia dos meses seguintes). Não grava nada; só calcula.
 */
export function gerarParcelas(params: {
  dataCompra: string;
  valorTotalCentavos: number;
  parcelas: number;
}): { numeroParcela: number; totalParcelas: number; vencimento: string; competencia: string; valorCentavos: number }[] {
  const valores = dividirEmParcelas(params.valorTotalCentavos, params.parcelas);
  return valores.map((valorCentavos, index) => {
    const vencimento = addMesesISO(params.dataCompra, index);
    return {
      numeroParcela: index + 1,
      totalParcelas: params.parcelas,
      vencimento,
      competencia: competenciaDe(vencimento),
      valorCentavos,
    };
  });
}

/** Horizonte máximo (dias, a partir de hoje) de geração de ocorrências semanais numa única
 * chamada — a recorrência nunca gera lançamentos além disso de uma vez, e cada chamada seguinte
 * (ex.: ao abrir a tela, mesmo padrão de `getLembretesAmanha`) só completa o que falta. */
const HORIZONTE_DIAS_RECORRENTE = 56;

/** Segunda camada de proteção contra geração descontrolada, independente do cálculo de horizonte. */
const MAX_LANCAMENTOS_POR_GERACAO = 60;

/**
 * Datas de vencimento (ISO) de ocorrências semanais ainda não geradas para uma despesa
 * recorrente, limitadas a um horizonte seguro a partir de hoje — nunca gera infinitamente.
 * Idempotente: chamar de novo antes do horizonte avançar não repete nenhuma data já em
 * `ultimoVencimentoGerado`.
 */
export function proximosVencimentosRecorrentes(params: {
  dataBase: string;
  diaSemana: number;
  dataEncerramento: string | null;
  ultimoVencimentoGerado: string | null;
  hojeISO: string;
}): string[] {
  const primeiraOcorrencia = proximaOcorrenciaSemanal(params.dataBase, params.diaSemana);
  let candidato = params.ultimoVencimentoGerado ? addDiasISO(params.ultimoVencimentoGerado, 7) : primeiraOcorrencia;

  const limiteHorizonte = addDiasISO(params.hojeISO, HORIZONTE_DIAS_RECORRENTE);
  const limite =
    params.dataEncerramento && params.dataEncerramento < limiteHorizonte ? params.dataEncerramento : limiteHorizonte;

  const vencimentos: string[] = [];
  while (candidato <= limite && vencimentos.length < MAX_LANCAMENTOS_POR_GERACAO) {
    vencimentos.push(candidato);
    candidato = addDiasISO(candidato, 7);
  }
  return vencimentos;
}

/** Um lançamento `pendente` pode ser cancelado ou ter seu pagamento registrado; `pago`/`cancelado`
 * são estados finais — nunca revertidos por edição, só por um novo lançamento de ajuste. */
export function podeCancelarLancamento(status: StatusLancamentoDespesa) {
  return status === "pendente";
}

export function podeRegistrarPagamento(status: StatusLancamentoDespesa) {
  return status === "pendente";
}

/** Soma líquida (original + ajustes) de um grupo de lançamentos que representam a mesma
 * obrigação — usado para exibir/conferir o valor efetivo depois de uma correção rastreada. */
export function valorLiquidoCentavos(lancamentos: Pick<LancamentoDespesa, "valorCentavos">[]) {
  return lancamentos.reduce((total, l) => total + l.valorCentavos, 0);
}
