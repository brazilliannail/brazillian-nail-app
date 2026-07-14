"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { AtendimentoStatusBadge } from "@/components/AtendimentoStatusBadge";
import { CalendarIcon } from "@/components/icons";
import { valorTotalDevido, saldoPendente, type Atendimento } from "@/lib/atendimentos-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type AtendimentoCardProps = {
  atendimento: Atendimento;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function AtendimentoCard({ atendimento, selected, onSelect }: AtendimentoCardProps) {
  const { locale, t } = useLanguage();
  const a = t.atendimentos;
  const devido = valorTotalDevido(atendimento);
  const pendente = saldoPendente(atendimento);
  const servicoNome = atendimento.servicos
    .map((item) => (locale === "pt" ? item.nomePt : item.nomeEn))
    .join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(atendimento.id)}
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-muted/50 sm:p-5 ${
        selected ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{atendimento.cliente}</p>
          <p className="flex items-center gap-1.5 text-xs text-foreground/50">
            <CalendarIcon className="h-3.5 w-3.5" />
            {atendimento.data} · {atendimento.horarioInicio}
          </p>
        </div>
        <AtendimentoStatusBadge status={atendimento.status} />
      </div>

      <p className="text-sm text-foreground/70">{servicoNome}</p>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{a.campos.valorDevido}</dt>
          <dd className="font-medium text-foreground">{formatCurrency(devido)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{a.campos.valorRecebido}</dt>
          <dd className="font-medium text-foreground">{formatCurrency(atendimento.valorRecebido)}</dd>
        </div>
        {atendimento.gorjeta > 0 && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{a.campos.gorjeta}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(atendimento.gorjeta)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{a.campos.saldoPendente}</dt>
          <dd className={`font-semibold ${pendente > 0 ? "text-status-aguardando" : "text-foreground"}`}>
            {formatCurrency(pendente)}
          </dd>
        </div>
      </dl>
    </button>
  );
}
