"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { CashIcon, CalendarIcon, UsersIcon, ChatIcon } from "@/components/icons";
import type { PendenciaFinanceira } from "@/lib/financeiro-service";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type ValorPendenteCardProps = {
  pendente: PendenciaFinanceira;
  selected: boolean;
  onSelect: () => void;
};

export function ValorPendenteCard({ pendente, selected, onSelect }: ValorPendenteCardProps) {
  const { t } = useLanguage();
  const v = t.financeiro.valoresPendentes;
  const dias = pendente.diasEmAberto === 1 ? v.dia : v.dias;

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border bg-status-aguardando/5 p-4 shadow-sm sm:p-5 ${
        selected ? "border-brand ring-2 ring-brand" : "border-status-aguardando/30"
      }`}
    >
      <button type="button" onClick={onSelect} className="flex flex-col gap-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{pendente.cliente}</p>
          <span className="shrink-0 rounded-full bg-status-aguardando/10 px-2.5 py-1 text-[11px] font-medium text-status-aguardando">
            {pendente.diasEmAberto} {dias}
          </span>
        </div>
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{t.financeiro.detalhes.dataAtendimento}</dt>
            <dd className="font-medium text-foreground">{pendente.dataAtendimento}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{t.financeiro.detalhes.valorServicos}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pendente.valorDevido)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{t.financeiro.campos.valorRecebido}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pendente.valorRecebido)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-medium text-status-aguardando">{t.financeiro.campos.saldoPendente}</dt>
            <dd className="text-base font-semibold text-status-aguardando">{formatCurrency(pendente.saldoPendente)}</dd>
          </div>
        </dl>
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <CashIcon className="h-4 w-4" />
          {v.acoes.registrarPagamento}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          <CalendarIcon className="h-4 w-4" />
          {v.acoes.abrirAtendimento}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          <UsersIcon className="h-4 w-4" />
          {v.acoes.abrirFicha}
        </button>
        <button
          type="button"
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          <ChatIcon className="h-4 w-4" />
          {v.acoes.abrirWhatsapp}
        </button>
      </div>
    </div>
  );
}
