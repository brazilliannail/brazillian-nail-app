"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { FinanceiroStatusBadge } from "@/components/FinanceiroStatusBadge";
import { CloseIcon, PlusIcon, EditIcon, CalendarIcon, UsersIcon, HistoryIcon } from "@/components/icons";
import type { AtendimentoFinanceiro } from "@/lib/financeiro-service";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type FinanceiroDetailsPanelProps = {
  pagamento: AtendimentoFinanceiro;
  onClose: () => void;
  onEstornar: () => void;
  onRegistrarPagamento: () => void;
  onCorrigirPagamento: () => void;
  corrigirPagamentoDesabilitado: boolean;
  onAbrirAtendimento: () => void;
  onAbrirCliente: () => void;
};

export function FinanceiroDetailsPanel({
  pagamento,
  onClose,
  onEstornar,
  onRegistrarPagamento,
  onCorrigirPagamento,
  corrigirPagamentoDesabilitado,
  onAbrirAtendimento,
  onAbrirCliente,
}: FinanceiroDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const f = t.financeiro;
  const d = f.detalhes;

  function handleEstornarClick() {
    if (window.confirm(t.atendimentos.confirmarEstornar.titulo)) onEstornar();
  }
  const servico = locale === "pt" ? pagamento.servicoPt : pagamento.servicoEn;
  const observacoes = locale === "pt" ? pagamento.observacoesPt : pagamento.observacoesEn;
  const totalDevido = pagamento.valorServicos - pagamento.desconto;
  const atendimentoRelacionado = `${servico} · ${pagamento.dataAtendimento}`;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
          <h3 className="truncate text-lg font-semibold text-foreground">{pagamento.cliente}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="h-3.5 w-3.5" />
          {d.fechar}
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <FinanceiroStatusBadge status={pagamento.status} />

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.atendimentoRelacionado}</dt>
            <dd className="text-right font-medium text-foreground">{atendimentoRelacionado}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.dataAtendimento}</dt>
            <dd className="font-medium text-foreground">{pagamento.dataAtendimento}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.dataPagamento}</dt>
            <dd className="font-medium text-foreground">{pagamento.dataPagamento ?? d.semDataPagamento}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{f.campos.servico}</dt>
            <dd className="font-medium text-foreground">{servico}</dd>
          </div>
        </dl>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.valorServicos}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pagamento.valorServicos)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.desconto}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pagamento.desconto)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.gorjeta}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pagamento.gorjeta)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <dt className="font-medium text-foreground/70">{d.totalDevido}</dt>
            <dd className="font-semibold text-foreground">{formatCurrency(totalDevido)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-medium text-foreground/70">{d.valorRecebido}</dt>
            <dd className="font-semibold text-foreground">{formatCurrency(pagamento.valorRecebido)}</dd>
          </div>
        </dl>

        {pagamento.saldoPendente > 0 ? (
          <div className="flex items-center justify-between rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 px-3 py-2">
            <span className="text-sm font-medium text-status-aguardando">{d.saldoPendente}</span>
            <span className="text-base font-semibold text-status-aguardando">
              {formatCurrency(pagamento.saldoPendente)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <span className="text-sm text-foreground/60">{d.saldoPendente}</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(0)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-foreground/50">{d.formaPagamento}</dt>
          <dd className="font-medium text-foreground">
            {pagamento.formaPagamento ? f.formaPagamentoLabel[pagamento.formaPagamento] : d.formaPagamentoNaoDefinida}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-foreground/50">{d.statusPagamento}</dt>
          <dd>
            <FinanceiroStatusBadge status={pagamento.status} size="sm" />
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{d.observacoes}</p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80">
            {observacoes || d.semObservacoes}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pagamento.saldoPendente <= 0}
            onClick={onRegistrarPagamento}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {d.acoes.registrarNovoPagamento}
          </button>
          <button
            type="button"
            disabled={corrigirPagamentoDesabilitado}
            onClick={onCorrigirPagamento}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted active:scale-[0.98]"
          >
            <EditIcon className="h-4 w-4" />
            {d.acoes.corrigirPagamento}
          </button>
          <button
            type="button"
            onClick={onAbrirAtendimento}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <CalendarIcon className="h-4 w-4" />
            {d.acoes.abrirAtendimento}
          </button>
          <button
            type="button"
            onClick={onAbrirCliente}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <UsersIcon className="h-4 w-4" />
            {d.acoes.abrirCliente}
          </button>
          <button
            type="button"
            onClick={handleEstornarClick}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <HistoryIcon className="h-4 w-4" />
            {d.acoes.estornarPagamento}
          </button>
        </div>
      </div>
    </div>
  );
}
