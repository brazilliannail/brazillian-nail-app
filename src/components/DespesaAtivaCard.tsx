"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility, VALOR_OCULTO } from "@/components/FinancialVisibilityProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { centavosParaDolares, type Despesa } from "@/lib/despesas-mock";
import { cancelarDespesaAction, atualizarValorDespesaRecorrenteAction } from "@/lib/despesas-actions";
import { isoToMMDDYYYY } from "@/lib/date";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type DespesaAtivaCardProps = {
  despesa: Despesa;
  onAtualizado: () => void;
};

export function DespesaAtivaCard({ despesa, onAtualizado }: DespesaAtivaCardProps) {
  const { t } = useLanguage();
  const { visible } = useFinancialVisibility();
  const d = t.despesas;

  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [alterandoValor, setAlterandoValor] = useState(false);
  const [novoValorSemanal, setNovoValorSemanal] = useState(() => String(centavosParaDolares(despesa.valorTotalCentavos)));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const valorTexto = visible ? formatCurrency(centavosParaDolares(despesa.valorTotalCentavos)) : VALOR_OCULTO;

  async function handleCancelar() {
    setSalvando(true);
    setErro(null);
    try {
      await cancelarDespesaAction(despesa.id);
      setConfirmandoCancelar(false);
      onAtualizado();
    } catch (error) {
      setErro(error instanceof Error ? error.message : d.erroGenerico);
    } finally {
      setSalvando(false);
    }
  }

  async function handleAlterarValor() {
    setSalvando(true);
    setErro(null);
    try {
      await atualizarValorDespesaRecorrenteAction(despesa.id, Number(novoValorSemanal));
      setAlterandoValor(false);
      onAtualizado();
    } catch (error) {
      setErro(error instanceof Error ? error.message : d.erroGenerico);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <p className="font-semibold text-foreground">{despesa.descricao}</p>
      <p className="text-xs text-foreground/50">
        {d.tipoLabel[despesa.tipo]} · {d.categoriaLabel[despesa.categoria]}
      </p>
      <p className="text-foreground/70">
        {valorTexto}
        {despesa.tipo === "recorrente" ? ` ${d.porSemana}` : ""}
      </p>
      <p className="text-xs text-foreground/50">{isoToMMDDYYYY(despesa.data)}</p>

      {erro && <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">{erro}</p>}

      {alterandoValor ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground/70">{d.form.valorSemanal}</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={novoValorSemanal}
              onChange={(event) => setNovoValorSemanal(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAlterandoValor(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted"
            >
              {d.form.cancelar}
            </button>
            <button
              type="button"
              onClick={handleAlterarValor}
              disabled={salvando}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? d.form.salvando : d.form.salvar}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {despesa.tipo === "recorrente" && (
            <button
              type="button"
              onClick={() => setAlterandoValor(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted"
            >
              {d.acoes.alterarValorSemanal}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmandoCancelar(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            {d.acoes.cancelarDespesa}
          </button>
        </div>
      )}

      {confirmandoCancelar && (
        <ConfirmModal
          titulo={d.confirmarCancelarDespesa.titulo}
          descricao={d.confirmarCancelarDespesa.descricao}
          textoConfirmar={d.confirmarCancelarDespesa.confirmar}
          textoCancelar={d.confirmarCancelarDespesa.cancelar}
          onConfirmar={handleCancelar}
          onFechar={() => setConfirmandoCancelar(false)}
        />
      )}
    </div>
  );
}
