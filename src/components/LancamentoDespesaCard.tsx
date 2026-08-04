"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility, VALOR_OCULTO } from "@/components/FinancialVisibilityProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CalendarIcon } from "@/components/icons";
import type { Despesa, LancamentoDespesa } from "@/lib/despesas-mock";
import { centavosParaDolares } from "@/lib/despesas-mock";
import {
  registrarPagamentoLancamentoAction,
  cancelarLancamentoAction,
  corrigirLancamentoDespesaAction,
} from "@/lib/despesas-actions";
import { formatDateISO, isoToMMDDYYYY } from "@/lib/date";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

const STATUS_TONE: Record<LancamentoDespesa["status"], string> = {
  pendente: "bg-status-aguardando/10 text-status-aguardando",
  pago: "bg-status-finalizado/10 text-status-finalizado",
  cancelado: "bg-muted text-foreground/50",
};

type LancamentoDespesaCardProps = {
  lancamento: LancamentoDespesa;
  despesa: Despesa | undefined;
  onAtualizado: () => void;
};

export function LancamentoDespesaCard({ lancamento, despesa, onAtualizado }: LancamentoDespesaCardProps) {
  const { t } = useLanguage();
  const { visible } = useFinancialVisibility();
  const d = t.despesas;

  const [pagando, setPagando] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(() => formatDateISO(new Date()));
  const [novoValor, setNovoValor] = useState(() => String(centavosParaDolares(lancamento.valorCentavos)));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const valor = centavosParaDolares(lancamento.valorCentavos);
  const valorTexto = visible ? formatCurrency(valor) : VALOR_OCULTO;
  const descricao = despesa?.descricao ?? lancamento.despesaId;
  const categoriaLabel = despesa ? d.categoriaLabel[despesa.categoria] : "";
  const isAjuste = lancamento.ajustaLancamentoId !== null;

  async function handleRegistrarPagamento() {
    setSalvando(true);
    setErro(null);
    try {
      await registrarPagamentoLancamentoAction({ lancamentoId: lancamento.id, dataPagamento });
      setPagando(false);
      onAtualizado();
    } catch (error) {
      setErro(error instanceof Error ? error.message : d.erroGenerico);
    } finally {
      setSalvando(false);
    }
  }

  async function handleCancelar() {
    setSalvando(true);
    setErro(null);
    try {
      await cancelarLancamentoAction(lancamento.id);
      setConfirmandoCancelar(false);
      onAtualizado();
    } catch (error) {
      setErro(error instanceof Error ? error.message : d.erroGenerico);
    } finally {
      setSalvando(false);
    }
  }

  async function handleCorrigir() {
    setSalvando(true);
    setErro(null);
    try {
      await corrigirLancamentoDespesaAction({ lancamentoId: lancamento.id, novoValorTotal: Number(novoValor) });
      setCorrigindo(false);
      onAtualizado();
    } catch (error) {
      setErro(error instanceof Error ? error.message : d.erroGenerico);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {descricao}
            {lancamento.numeroParcela && lancamento.totalParcelas
              ? ` (${lancamento.numeroParcela}/${lancamento.totalParcelas})`
              : ""}
            {isAjuste ? ` · ${d.ajuste}` : ""}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-foreground/50">
            <CalendarIcon className="h-3.5 w-3.5" />
            {d.campos.vencimento}: {isoToMMDDYYYY(lancamento.vencimento)}
            {categoriaLabel ? ` · ${categoriaLabel}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[lancamento.status]}`}>
          {d.statusLabel[lancamento.status]}
        </span>
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{d.campos.valor}</dt>
          <dd className="font-semibold text-foreground">{valorTexto}</dd>
        </div>
        {lancamento.status === "pago" && lancamento.dataPagamento && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{d.campos.dataPagamento}</dt>
            <dd className="font-medium text-foreground">{isoToMMDDYYYY(lancamento.dataPagamento)}</dd>
          </div>
        )}
      </dl>

      {erro && <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">{erro}</p>}

      {lancamento.status === "pendente" && !pagando && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPagando(true)}
            className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {d.acoes.registrarPagamento}
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoCancelar(true)}
            disabled={salvando}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {d.acoes.cancelar}
          </button>
        </div>
      )}

      {lancamento.status === "pago" && !isAjuste && !corrigindo && (
        <button
          type="button"
          onClick={() => setCorrigindo(true)}
          className="self-start rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted"
        >
          {d.acoes.corrigir}
        </button>
      )}

      {pagando && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground/70">{d.campos.dataPagamento}</span>
            <input
              type="date"
              value={dataPagamento}
              onChange={(event) => setDataPagamento(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPagando(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted"
            >
              {d.form.cancelar}
            </button>
            <button
              type="button"
              onClick={handleRegistrarPagamento}
              disabled={salvando}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? d.form.salvando : d.form.salvar}
            </button>
          </div>
        </div>
      )}

      {corrigindo && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground/70">{d.campos.novoValor}</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={novoValor}
              onChange={(event) => setNovoValor(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCorrigindo(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted"
            >
              {d.form.cancelar}
            </button>
            <button
              type="button"
              onClick={handleCorrigir}
              disabled={salvando}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? d.form.salvando : d.form.salvar}
            </button>
          </div>
        </div>
      )}

      {confirmandoCancelar && (
        <ConfirmModal
          titulo={d.confirmarCancelarLancamento.titulo}
          descricao={d.confirmarCancelarLancamento.descricao}
          textoConfirmar={d.confirmarCancelarLancamento.confirmar}
          textoCancelar={d.confirmarCancelarLancamento.cancelar}
          onConfirmar={handleCancelar}
          onFechar={() => setConfirmandoCancelar(false)}
        />
      )}
    </div>
  );
}
