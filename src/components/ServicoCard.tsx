"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { ScissorsIcon } from "@/components/icons";
import type { Servico } from "@/lib/servicos-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type ServicoCardProps = {
  servico: Servico;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function ServicoCard({ servico, selected, onSelect }: ServicoCardProps) {
  const { t } = useLanguage();
  const s = t.servicos;

  return (
    <button
      type="button"
      onClick={() => onSelect(servico.id)}
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-muted/50 sm:p-5 ${
        selected ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <ScissorsIcon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{servico.nome}</p>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/60">
              {servico.categoria}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            servico.status === "ativo"
              ? "bg-status-finalizado/10 text-status-finalizado"
              : "bg-foreground/10 text-foreground/50"
          }`}
        >
          {s.statusLabel[servico.status]}
        </span>
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{s.campos.precoPadrao}</dt>
          <dd className="flex items-center gap-1.5 font-medium text-foreground">
            {formatCurrency(servico.precoPadrao)}
            {servico.precoVariavel && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                {s.campos.precoVariavel}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{s.campos.duracao}</dt>
          <dd className="font-medium text-foreground">
            {servico.duracaoPadrao} {s.campos.minutos}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{s.campos.retornoSugerido}</dt>
          <dd className="font-medium text-foreground">
            {servico.retornoSugeridoDias === null
              ? s.campos.semRetorno
              : `${servico.retornoSugeridoDias} ${s.campos.dias}`}
          </dd>
        </div>
      </dl>
    </button>
  );
}
