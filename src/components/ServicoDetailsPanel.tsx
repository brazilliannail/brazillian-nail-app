"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { CloseIcon, EditIcon, PowerIcon, CopyIcon, ScissorsIcon } from "@/components/icons";
import type { Servico } from "@/lib/servicos-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type ServicoDetailsPanelProps = {
  servico: Servico;
  onClose: () => void;
};

export function ServicoDetailsPanel({ servico, onClose }: ServicoDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const s = t.servicos;
  const d = s.detalhes;
  const descricao = locale === "pt" ? servico.descricaoPt : servico.descricaoEn;
  const observacoes = locale === "pt" ? servico.observacoesPt : servico.observacoesEn;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <ScissorsIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
            <h3 className="truncate text-lg font-semibold text-foreground">{servico.nome}</h3>
          </div>
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
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
              servico.status === "ativo"
                ? "bg-status-finalizado/10 text-status-finalizado"
                : "bg-foreground/10 text-foreground/50"
            }`}
          >
            {s.statusLabel[servico.status]}
          </span>
          <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/60">
            {servico.categoria}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{d.descricao}</p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80">
            {descricao || d.semDescricao}
          </p>
        </div>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.precoPadrao}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(servico.precoPadrao)}</dd>
          </div>
          {servico.precoVariavel && servico.precoMinimo !== null && servico.precoMaximo !== null && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/50">{d.faixaPreco}</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(servico.precoMinimo)} – {formatCurrency(servico.precoMaximo)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.duracaoPadrao}</dt>
            <dd className="font-medium text-foreground">
              {servico.duracaoPadrao} {s.campos.minutos}
            </dd>
          </div>
          {servico.duracaoMinima !== null && servico.duracaoMaxima !== null && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/50">{d.faixaDuracao}</dt>
              <dd className="font-medium text-foreground">
                {servico.duracaoMinima} – {servico.duracaoMaxima} {s.campos.minutos}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.retornoSugerido}</dt>
            <dd className="font-medium text-foreground">
              {servico.retornoSugeridoDias === null
                ? s.campos.semRetorno
                : `${servico.retornoSugeridoDias} ${s.campos.dias}`}
            </dd>
          </div>
        </dl>

        <p className="rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">
          {d.precoPadraoAviso}
        </p>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{d.observacoes}</p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80">
            {observacoes || d.semObservacoes}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <EditIcon className="h-4 w-4" />
            {d.acoes.editar}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <PowerIcon className="h-4 w-4" />
            {servico.status === "ativo" ? d.acoes.desativar : d.acoes.ativar}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <CopyIcon className="h-4 w-4" />
            {d.acoes.duplicar}
          </button>
          <button
            type="button"
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <ScissorsIcon className="h-4 w-4" />
            {d.acoes.verAtendimentos}
          </button>
        </div>
      </div>
    </div>
  );
}
