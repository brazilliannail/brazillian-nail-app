"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility, VALOR_OCULTO } from "@/components/FinancialVisibilityProvider";
import { useDespesas, useLancamentosDespesa } from "@/components/DespesasProvider";
import { StatCard } from "@/components/StatCard";
import { DespesaFormModal } from "@/components/DespesaFormModal";
import { LancamentoDespesaCard } from "@/components/LancamentoDespesaCard";
import { DespesaAtivaCard } from "@/components/DespesaAtivaCard";
import { PlusIcon, CashIcon, ClockIcon, WalletIcon } from "@/components/icons";
import { CATEGORIAS_DESPESA, type CategoriaDespesa, type StatusLancamentoDespesa, type TipoDespesa } from "@/lib/despesas-mock";
import { calcularAgregadoDespesas } from "@/lib/financeiro-service";
import { getMainRange, type Periodo } from "@/lib/financeiro-comparacao";
import { formatDateISO } from "@/lib/date";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type FiltroStatus = "todos" | StatusLancamentoDespesa;
type FiltroTipo = "todos" | TipoDespesa;
type FiltroCategoria = "todas" | CategoriaDespesa;

export default function DespesasPage() {
  const { t } = useLanguage();
  const d = t.despesas;
  const router = useRouter();
  const { visible } = useFinancialVisibility();
  const despesas = useDespesas();
  const lancamentosDespesa = useLancamentosDespesa();

  const [modalAberto, setModalAberto] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todas");

  const today = useMemo(() => new Date(), []);
  const mainRange = useMemo(() => getMainRange(periodo, today), [periodo, today]);

  const despesasPorId = useMemo(() => new Map(despesas.map((desp) => [desp.id, desp])), [despesas]);

  const agregado = useMemo(() => calcularAgregadoDespesas(lancamentosDespesa, mainRange), [lancamentosDespesa, mainRange]);

  const lancamentosFiltrados = useMemo(() => {
    return lancamentosDespesa
      .filter((l) => filtroStatus === "todos" || l.status === filtroStatus)
      .filter((l) => {
        if (filtroTipo === "todos") return true;
        return despesasPorId.get(l.despesaId)?.tipo === filtroTipo;
      })
      .filter((l) => {
        if (filtroCategoria === "todas") return true;
        return despesasPorId.get(l.despesaId)?.categoria === filtroCategoria;
      })
      .filter((l) => l.vencimento >= formatDateISO(mainRange.start) && l.vencimento <= formatDateISO(mainRange.end))
      .sort((a, b) => (a.vencimento < b.vencimento ? 1 : -1));
  }, [lancamentosDespesa, filtroStatus, filtroTipo, filtroCategoria, despesasPorId, mainRange]);

  const despesasAtivas = despesas.filter((desp) => desp.status === "ativa");

  function refresh() {
    router.refresh();
  }

  function formatCurrencyVisivel(value: number) {
    return visible ? formatCurrency(value) : VALOR_OCULTO;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{d.titulo}</h1>
          <p className="text-sm text-foreground/60">{d.subtitulo}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          {d.novaDespesa}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={WalletIcon} label={d.cartoes.pago} value={formatCurrencyVisivel(agregado.totalPago)} />
        <StatCard icon={ClockIcon} label={d.cartoes.previsto} value={formatCurrencyVisivel(agregado.totalPrevisto)} tone="warning" />
        <StatCard icon={CashIcon} label={d.cartoes.quantidadePaga} value={agregado.quantidadePaga} />
        <StatCard icon={CashIcon} label={d.cartoes.quantidadePrevista} value={agregado.quantidadePrevista} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={periodo} onChange={(event) => setPeriodo(event.target.value as Periodo)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="hoje">{d.periodo.hoje}</option>
          <option value="semana">{d.periodo.semana}</option>
          <option value="mes">{d.periodo.mes}</option>
          <option value="ano">{d.periodo.ano}</option>
        </select>
        <select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="todos">{d.filtros.todosStatus}</option>
          <option value="pendente">{d.statusLabel.pendente}</option>
          <option value="pago">{d.statusLabel.pago}</option>
          <option value="cancelado">{d.statusLabel.cancelado}</option>
        </select>
        <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value as FiltroTipo)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="todos">{d.filtros.todosTipos}</option>
          <option value="avulsa">{d.tipoLabel.avulsa}</option>
          <option value="parcelada">{d.tipoLabel.parcelada}</option>
          <option value="recorrente">{d.tipoLabel.recorrente}</option>
        </select>
        <select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value as FiltroCategoria)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="todas">{d.filtros.todasCategorias}</option>
          {CATEGORIAS_DESPESA.map((cat) => (
            <option key={cat} value={cat}>
              {d.categoriaLabel[cat]}
            </option>
          ))}
        </select>
      </div>

      {despesasAtivas.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">{d.despesasCadastradas}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {despesasAtivas.map((desp) => (
              <DespesaAtivaCard key={desp.id} despesa={desp} onAtualizado={refresh} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">{d.lancamentos}</p>
        {lancamentosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-foreground/60">{d.vazio}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lancamentosFiltrados.map((lancamento) => (
              <LancamentoDespesaCard
                key={lancamento.id}
                lancamento={lancamento}
                despesa={despesasPorId.get(lancamento.despesaId)}
                onAtualizado={refresh}
              />
            ))}
          </div>
        )}
      </div>

      {modalAberto && (
        <DespesaFormModal
          onClose={() => setModalAberto(false)}
          onSalvo={() => {
            setModalAberto(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
