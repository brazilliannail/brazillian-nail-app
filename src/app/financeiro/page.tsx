"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useAtendimentos } from "@/components/AtendimentosProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useLancamentosCaixa, useAdicionarLancamentosCaixa } from "@/components/FinanceiroProvider";
import { StatCard } from "@/components/StatCard";
import { FormaPagamentoBars } from "@/components/FormaPagamentoBars";
import { PagamentoCard } from "@/components/PagamentoCard";
import { ValorPendenteCard } from "@/components/ValorPendenteCard";
import { FinanceiroDetailsPanel } from "@/components/FinanceiroDetailsPanel";
import { AdicionarPagamentoModal } from "@/components/AdicionarPagamentoModal";
import { CorrigirPagamentoModal, type CorrecoesPagamento } from "@/components/CorrigirPagamentoModal";
import { RelatorioAtendimentos } from "@/components/RelatorioAtendimentos";
import type { RegistrarPagamentoAdicionalDados, NovoLancamentoCaixa } from "@/lib/atendimentos-actions";
import type { LancamentoCaixa } from "@/lib/financeiro-repo";
import { CashIcon, ScissorsIcon, WalletIcon, TagIcon, ClockIcon, CalendarIcon } from "@/components/icons";
import { formatDateMMDDYYYY, isSameDay, parseDateISO } from "@/lib/date";
import {
  calcularAgregadoFinanceiro,
  detalharPorFormaPagamento,
  listarAtendimentosFinanceiros,
  listarPendencias,
  buscarAtendimentoFinanceiro,
  buscarLancamentosCorrigiveis,
} from "@/lib/financeiro-service";
import {
  OPCOES_COMPARACAO_POR_PERIODO,
  COMPARACAO_PADRAO_POR_PERIODO,
  getMainRange,
  getCompareRange,
  calcularVariacao,
  toISODate,
  fromISODate,
  type Periodo,
  type ComparacaoOpcao,
} from "@/lib/financeiro-comparacao";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCount(value: number) {
  return String(value);
}

export default function FinanceiroPage() {
  const { t } = useLanguage();
  const f = t.financeiro;
  const router = useRouter();
  const { atendimentos, estornarAtendimento, registrarPagamentoAdicional, corrigirLancamento } = useAtendimentos();
  const { clientes } = useClientes();
  const lancamentosCaixa = useLancamentosCaixa();
  const adicionarLancamentosCaixa = useAdicionarLancamentosCaixa();
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [comparacao, setComparacao] = useState<ComparacaoOpcao>(COMPARACAO_PADRAO_POR_PERIODO.hoje);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [erroEstornar, setErroEstornar] = useState<string | null>(null);
  const [registrandoPagamentoId, setRegistrandoPagamentoId] = useState<string | null>(null);
  const [erroRegistrarPagamento, setErroRegistrarPagamento] = useState<string | null>(null);
  const [corrigindoPagamentoId, setCorrigindoPagamentoId] = useState<string | null>(null);
  const [erroCorrigirPagamento, setErroCorrigirPagamento] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = useState(() => toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)));
  const [customEnd, setCustomEnd] = useState(() => toISODate(today));
  const [compareCustomStart, setCompareCustomStart] = useState(() =>
    toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13)),
  );
  const [compareCustomEnd, setCompareCustomEnd] = useState(() =>
    toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
  );

  function handlePeriodoChange(next: Periodo) {
    setPeriodo(next);
    setComparacao(COMPARACAO_PADRAO_POR_PERIODO[next]);
  }

  const opcoesComparacao = OPCOES_COMPARACAO_POR_PERIODO[periodo];

  const mainRange = getMainRange(
    periodo,
    today,
    periodo === "personalizado" ? fromISODate(customStart) : undefined,
    periodo === "personalizado" ? fromISODate(customEnd) : undefined,
  );

  const compareCustomRange =
    comparacao === "escolherOutroPeriodo"
      ? { start: fromISODate(compareCustomStart), end: fromISODate(compareCustomEnd) }
      : undefined;

  const compareRange = getCompareRange(periodo, comparacao, mainRange, compareCustomRange);

  const clientesPorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const mainAgg = useMemo(
    () => calcularAgregadoFinanceiro(atendimentos, lancamentosCaixa, mainRange),
    [atendimentos, lancamentosCaixa, mainRange],
  );
  const compareAgg = useMemo(
    () => (compareRange ? calcularAgregadoFinanceiro(atendimentos, lancamentosCaixa, compareRange) : null),
    [atendimentos, lancamentosCaixa, compareRange],
  );

  const formasPagamento = useMemo(
    () => detalharPorFormaPagamento(lancamentosCaixa, mainRange),
    [lancamentosCaixa, mainRange],
  );

  const atendimentosFinanceiros = useMemo(
    () => listarAtendimentosFinanceiros(atendimentos, clientesPorId, lancamentosCaixa, mainRange),
    [atendimentos, clientesPorId, lancamentosCaixa, mainRange],
  );

  const pendencias = useMemo(() => listarPendencias(atendimentos, clientesPorId, today), [atendimentos, clientesPorId, today]);

  function buildComparacao(atual: number, anterior: number | undefined, formatar: (value: number) => string) {
    if (!compareAgg || anterior === undefined || !compareRange) return undefined;
    const { percentual, direcao } = calcularVariacao(atual, anterior);

    const periodoComparado =
      comparacao === "escolherOutroPeriodo"
        ? `${formatDateMMDDYYYY(compareRange.start)} – ${formatDateMMDDYYYY(compareRange.end)}`
        : f.comparar.opcoes[comparacao];

    const percentualTexto = percentual === null ? f.comparar.semDadosAnteriores : `${Math.abs(percentual).toFixed(1)}%`;

    return {
      periodoAtual: f.periodo[periodo],
      periodoComparado,
      valorComparado: formatar(anterior),
      percentualTexto,
      direcao,
    };
  }

  const pagamentoSelecionado = selectedId
    ? buscarAtendimentoFinanceiro(selectedId, atendimentos, clientesPorId, lancamentosCaixa)
    : null;

  const lancamentosCorrigiveis = useMemo(
    () => (pagamentoSelecionado ? buscarLancamentosCorrigiveis(pagamentoSelecionado.atendimentoId, lancamentosCaixa) : null),
    [pagamentoSelecionado, lancamentosCaixa],
  );

  function converterNovoLancamento(novo: NovoLancamentoCaixa): LancamentoCaixa {
    return {
      id: novo.id,
      atendimentoId: novo.atendimentoId,
      natureza: novo.natureza,
      tipo: novo.tipo,
      dataPagamento: parseDateISO(novo.dataPagamento),
      valor: novo.valor,
      formaPagamento: novo.formaPagamento,
      observacoesPt: novo.observacoesPt,
      observacoesEn: novo.observacoesEn,
    };
  }

  async function handleEstornar(atendimentoId: string) {
    try {
      setErroEstornar(null);
      await estornarAtendimento(atendimentoId);
    } catch (error) {
      setErroEstornar(error instanceof Error ? error.message : "Não foi possível estornar o atendimento.");
    }
  }

  function handleAbrirRegistrarPagamento(atendimentoId: string) {
    setErroRegistrarPagamento(null);
    setRegistrandoPagamentoId(atendimentoId);
  }

  async function handleConfirmarPagamento(atendimentoId: string, dados: RegistrarPagamentoAdicionalDados) {
    try {
      setErroRegistrarPagamento(null);
      await registrarPagamentoAdicional(atendimentoId, dados);
      setRegistrandoPagamentoId(null);
    } catch (error) {
      setErroRegistrarPagamento(
        error instanceof Error ? error.message : "Não foi possível registrar o pagamento.",
      );
    }
  }

  function handleAbrirCorrigirPagamento(atendimentoId: string) {
    setErroCorrigirPagamento(null);
    setCorrigindoPagamentoId(atendimentoId);
  }

  async function handleConfirmarCorrecao(correcoes: CorrecoesPagamento) {
    try {
      setErroCorrigirPagamento(null);
      if (correcoes.servico) {
        const { pagamentoId, ...dados } = correcoes.servico;
        const resultado = await corrigirLancamento(pagamentoId, dados);
        adicionarLancamentosCaixa(resultado.novosLancamentos.map(converterNovoLancamento));
      }
      if (correcoes.gorjeta) {
        const { pagamentoId, ...dados } = correcoes.gorjeta;
        const resultado = await corrigirLancamento(pagamentoId, dados);
        adicionarLancamentosCaixa(resultado.novosLancamentos.map(converterNovoLancamento));
      }
      setCorrigindoPagamentoId(null);
    } catch (error) {
      setErroCorrigirPagamento(error instanceof Error ? error.message : "Não foi possível corrigir o pagamento.");
    }
  }

  function handleAbrirAtendimento(atendimentoId: string) {
    router.push(`/atendimentos?id=${atendimentoId}`);
  }

  function handleAbrirCliente(clienteId: string) {
    router.push(`/clientes?id=${clienteId}`);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{f.titulo}</h1>
            <p className="text-sm text-foreground/60">
              {f.periodoSelecionado}: {f.periodo[periodo]} · {formatDateMMDDYYYY(mainRange.start)}
              {!isSameDay(mainRange.start, mainRange.end) ? ` – ${formatDateMMDDYYYY(mainRange.end)}` : ""}
            </p>
          </div>
        </div>

        {erroEstornar && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erroEstornar}
          </div>
        )}

        <div>
          <div className="inline-flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
            {(["hoje", "semana", "mes", "ano", "personalizado"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => handlePeriodoChange(opcao)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  periodo === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {f.periodo[opcao]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground/70">{f.comparar.titulo}</p>
          <div className="inline-flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
            {opcoesComparacao.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setComparacao(opcao)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  comparacao === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {f.comparar.opcoes[opcao]}
              </button>
            ))}
          </div>
        </div>

        {periodo === "personalizado" && (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:gap-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground/60">{f.comparar.periodoPrincipal}</span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex flex-col gap-1 text-xs text-foreground/60">
                  {f.comparar.dataInicial}
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-foreground/60">
                  {f.comparar.dataFinal}
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    max={toISODate(today)}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </label>
              </div>
            </div>

            {comparacao === "escolherOutroPeriodo" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground/60">{f.comparar.periodoComparacao}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex flex-col gap-1 text-xs text-foreground/60">
                    {f.comparar.dataInicial}
                    <input
                      type="date"
                      value={compareCustomStart}
                      max={compareCustomEnd}
                      onChange={(event) => setCompareCustomStart(event.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-foreground/60">
                    {f.comparar.dataFinal}
                    <input
                      type="date"
                      value={compareCustomEnd}
                      min={compareCustomStart}
                      onChange={(event) => setCompareCustomEnd(event.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            icon={CashIcon}
            label={f.cartoes.totalRecebido}
            value={formatCurrency(mainAgg.totalRecebido)}
            tone="brand"
            comparacao={buildComparacao(mainAgg.totalRecebido, compareAgg?.totalRecebido, formatCurrency)}
          />
          <StatCard
            icon={ScissorsIcon}
            label={f.cartoes.valorServicos}
            value={formatCurrency(mainAgg.valorServicos)}
            comparacao={buildComparacao(mainAgg.valorServicos, compareAgg?.valorServicos, formatCurrency)}
          />
          <StatCard
            icon={WalletIcon}
            label={f.cartoes.gorjetas}
            value={formatCurrency(mainAgg.gorjetas)}
            comparacao={buildComparacao(mainAgg.gorjetas, compareAgg?.gorjetas, formatCurrency)}
          />
          <StatCard
            icon={TagIcon}
            label={f.cartoes.descontos}
            value={formatCurrency(mainAgg.descontos)}
            comparacao={buildComparacao(mainAgg.descontos, compareAgg?.descontos, formatCurrency)}
          />
          <StatCard
            icon={ClockIcon}
            label={f.cartoes.totalPendente}
            value={formatCurrency(mainAgg.totalPendente)}
            tone="warning"
            comparacao={buildComparacao(mainAgg.totalPendente, compareAgg?.totalPendente, formatCurrency)}
          />
          <StatCard
            icon={CalendarIcon}
            label={f.cartoes.quantidadeAtendimentos}
            value={mainAgg.quantidadeAtendimentos}
            comparacao={buildComparacao(mainAgg.quantidadeAtendimentos, compareAgg?.quantidadeAtendimentos, formatCount)}
          />
          <StatCard
            icon={CashIcon}
            label={f.cartoes.ticketMedio}
            value={formatCurrency(mainAgg.ticketMedio)}
            tone="brand"
            comparacao={buildComparacao(mainAgg.ticketMedio, compareAgg?.ticketMedio, formatCurrency)}
          />
        </div>

        <FormaPagamentoBars dados={formasPagamento} />

        <RelatorioAtendimentos range={mainRange} />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">{f.listaPagamentos.titulo}</p>
          {atendimentosFinanceiros.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-foreground/60">{f.vazio}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {atendimentosFinanceiros.map((pagamento) => (
                <PagamentoCard
                  key={pagamento.atendimentoId}
                  pagamento={pagamento}
                  selected={pagamento.atendimentoId === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">{f.valoresPendentes.titulo}</p>
          {pendencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-foreground/60">{f.vazio}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {pendencias.map((pendente) => (
                <ValorPendenteCard
                  key={pendente.atendimentoId}
                  pendente={pendente}
                  selected={selectedId === pendente.atendimentoId}
                  onSelect={() => setSelectedId(pendente.atendimentoId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {pagamentoSelecionado && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <FinanceiroDetailsPanel
            pagamento={pagamentoSelecionado}
            onClose={() => setSelectedId(null)}
            onEstornar={() => handleEstornar(pagamentoSelecionado.atendimentoId)}
            onRegistrarPagamento={() => handleAbrirRegistrarPagamento(pagamentoSelecionado.atendimentoId)}
            onCorrigirPagamento={() => handleAbrirCorrigirPagamento(pagamentoSelecionado.atendimentoId)}
            corrigirPagamentoDesabilitado={!lancamentosCorrigiveis || (!lancamentosCorrigiveis.servico && !lancamentosCorrigiveis.gorjeta)}
            onAbrirAtendimento={() => handleAbrirAtendimento(pagamentoSelecionado.atendimentoId)}
            onAbrirCliente={() => handleAbrirCliente(pagamentoSelecionado.clienteId)}
          />
        </div>
      )}

      {pagamentoSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <FinanceiroDetailsPanel
            pagamento={pagamentoSelecionado}
            onClose={() => setSelectedId(null)}
            onEstornar={() => handleEstornar(pagamentoSelecionado.atendimentoId)}
            onRegistrarPagamento={() => handleAbrirRegistrarPagamento(pagamentoSelecionado.atendimentoId)}
            onCorrigirPagamento={() => handleAbrirCorrigirPagamento(pagamentoSelecionado.atendimentoId)}
            corrigirPagamentoDesabilitado={!lancamentosCorrigiveis || (!lancamentosCorrigiveis.servico && !lancamentosCorrigiveis.gorjeta)}
            onAbrirAtendimento={() => handleAbrirAtendimento(pagamentoSelecionado.atendimentoId)}
            onAbrirCliente={() => handleAbrirCliente(pagamentoSelecionado.clienteId)}
          />
          </div>
        </div>
      )}

      {pagamentoSelecionado && registrandoPagamentoId === pagamentoSelecionado.atendimentoId && (
        <AdicionarPagamentoModal
          pagamento={pagamentoSelecionado}
          onClose={() => setRegistrandoPagamentoId(null)}
          onConfirmar={(dados) => handleConfirmarPagamento(pagamentoSelecionado.atendimentoId, dados)}
          erroSalvar={erroRegistrarPagamento}
        />
      )}

      {pagamentoSelecionado && lancamentosCorrigiveis && corrigindoPagamentoId === pagamentoSelecionado.atendimentoId && (
        <CorrigirPagamentoModal
          pagamento={pagamentoSelecionado}
          lancamentos={lancamentosCorrigiveis}
          onClose={() => setCorrigindoPagamentoId(null)}
          onConfirmar={handleConfirmarCorrecao}
          erroSalvar={erroCorrigirPagamento}
        />
      )}
    </div>
  );
}
