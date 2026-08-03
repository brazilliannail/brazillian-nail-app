"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility, VALOR_OCULTO } from "@/components/FinancialVisibilityProvider";
import { FinanceiroStatusBadge } from "@/components/FinanceiroStatusBadge";
import { CalendarIcon } from "@/components/icons";
import type { AtendimentoFinanceiro } from "@/lib/financeiro-service";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type PagamentoCardProps = {
  pagamento: AtendimentoFinanceiro;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function PagamentoCard({ pagamento, selected, onSelect }: PagamentoCardProps) {
  const { locale, t } = useLanguage();
  const { visible } = useFinancialVisibility();
  const f = t.financeiro;
  const servico = locale === "pt" ? pagamento.servicoPt : pagamento.servicoEn;
  const valor = (v: number) => (visible ? formatCurrency(v) : VALOR_OCULTO);

  return (
    <button
      type="button"
      onClick={() => onSelect(pagamento.atendimentoId)}
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-muted/50 sm:p-5 ${
        selected ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{pagamento.cliente}</p>
          <p className="flex items-center gap-1.5 text-xs text-foreground/50">
            <CalendarIcon className="h-3.5 w-3.5" />
            {pagamento.dataPagamento ?? f.detalhes.semDataPagamento}
          </p>
        </div>
        <FinanceiroStatusBadge status={pagamento.status} />
      </div>

      <p className="text-sm text-foreground/70">{servico}</p>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{f.campos.valorServicos}</dt>
          <dd className="font-medium text-foreground">{valor(pagamento.valorServicos)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{f.campos.valorRecebido}</dt>
          <dd className="font-medium text-foreground">{valor(pagamento.valorRecebido)}</dd>
        </div>
        {pagamento.gorjeta > 0 && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{f.campos.gorjeta}</dt>
            <dd className="font-medium text-foreground">{valor(pagamento.gorjeta)}</dd>
          </div>
        )}
        {pagamento.saldoPendente > 0 && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{f.campos.saldoPendente}</dt>
            <dd className="font-semibold text-status-aguardando">{valor(pagamento.saldoPendente)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{f.campos.forma}</dt>
          <dd className="font-medium text-foreground">
            {pagamento.formaPagamento ? f.formaPagamentoLabel[pagamento.formaPagamento] : "—"}
          </dd>
        </div>
      </dl>
    </button>
  );
}
