"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { AtendimentoStatusBadge } from "@/components/AtendimentoStatusBadge";
import {
  CloseIcon,
  PlayIcon,
  PlusIcon,
  EditIcon,
  TagIcon,
  WalletIcon,
  CashIcon,
  DoubleCheckIcon,
  UsersIcon,
  HistoryIcon,
} from "@/components/icons";
import { valorTotalDevido, saldoPendente, type Atendimento } from "@/lib/atendimentos-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type AtendimentoDetailsPanelProps = {
  atendimento: Atendimento;
  onClose: () => void;
};

export function AtendimentoDetailsPanel({ atendimento, onClose }: AtendimentoDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const a = t.atendimentos;
  const d = a.detalhes;

  const devido = valorTotalDevido(atendimento);
  const pendente = saldoPendente(atendimento);
  const valorServicos = atendimento.servicos.reduce((total, item) => total + item.valor, 0);
  const observacoes = locale === "pt" ? atendimento.observacoesPt : atendimento.observacoesEn;

  const isEmAndamento = atendimento.status === "emAndamento";
  const isEncerrado = atendimento.status === "cancelado" || atendimento.status === "estornado";
  const temSaldoPendente = pendente > 0;

  const primaryAction = isEmAndamento
    ? { label: d.acoes.continuar, icon: PlayIcon }
    : temSaldoPendente
      ? { label: d.acoes.registrarPagamento, icon: CashIcon }
      : { label: d.acoes.abrirFicha, icon: UsersIcon };

  const showRegistrarPagamentoSecundario = isEmAndamento && temSaldoPendente;
  const showAbrirFichaSecundario = isEmAndamento || temSaldoPendente;
  const showEdicoes = !isEncerrado;
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
          <h3 className="truncate text-lg font-semibold text-foreground">{atendimento.cliente}</h3>
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
        <AtendimentoStatusBadge status={atendimento.status} />

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.profissional}</dt>
            <dd className="font-medium text-foreground">{atendimento.profissional}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.data}</dt>
            <dd className="font-medium text-foreground">{atendimento.data}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.horarioInicio}</dt>
            <dd className="font-medium text-foreground">{atendimento.horarioInicio}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.horarioFim}</dt>
            <dd className="font-medium text-foreground">{atendimento.horarioFim ?? d.emAndamentoLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.duracao}</dt>
            <dd className="font-medium text-foreground">
              {atendimento.duracaoMin === null ? d.emAndamentoLabel : `${atendimento.duracaoMin} ${d.minutos}`}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">{d.servicosRealizados}</p>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {atendimento.servicos.map((servico) => (
              <li
                key={servico.nomePt}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="text-foreground">{locale === "pt" ? servico.nomePt : servico.nomeEn}</span>
                <span className="font-medium text-foreground">{formatCurrency(servico.valor)}</span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.valorServicos}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(valorServicos)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.desconto}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(atendimento.desconto)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.gorjeta}</dt>
            <dd className="font-medium text-foreground">{formatCurrency(atendimento.gorjeta)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <dt className="font-medium text-foreground/70">{d.valorTotalDevido}</dt>
            <dd className="font-semibold text-foreground">{formatCurrency(devido)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-medium text-foreground/70">{d.valorRecebido}</dt>
            <dd className="font-semibold text-foreground">{formatCurrency(atendimento.valorRecebido)}</dd>
          </div>
        </dl>

        {temSaldoPendente ? (
          <div className="flex items-center justify-between rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 px-3 py-2">
            <span className="text-sm font-medium text-status-aguardando">{d.saldoPendente}</span>
            <span className="text-base font-semibold text-status-aguardando">{formatCurrency(pendente)}</span>
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
            {atendimento.formaPagamento ? a.formaPagamentoLabel[atendimento.formaPagamento] : d.formaPagamentoNaoDefinida}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{d.observacoes}</p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80">
            {observacoes || d.semObservacoes}
          </p>
        </div>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.retornoSugerido}</dt>
            <dd className="font-medium text-foreground">
              {atendimento.retornoSugeridoDias === null
                ? d.semRetorno
                : `${atendimento.retornoSugeridoDias} ${d.dias}`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{d.proximoAgendamento}</dt>
            <dd className="font-medium text-foreground">
              {atendimento.proximoAgendamento ?? d.semProximoAgendamento}
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <PrimaryIcon className="h-4 w-4" />
            {primaryAction.label}
          </button>

          {showEdicoes && (
            <>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                {d.acoes.adicionarServico}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                <EditIcon className="h-4 w-4" />
                {d.acoes.alterarValor}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                <TagIcon className="h-4 w-4" />
                {d.acoes.aplicarDesconto}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                <WalletIcon className="h-4 w-4" />
                {d.acoes.adicionarGorjeta}
              </button>
            </>
          )}

          {showRegistrarPagamentoSecundario && (
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
            >
              <CashIcon className="h-4 w-4" />
              {d.acoes.registrarPagamento}
            </button>
          )}

          {isEmAndamento && (
            <button
              type="button"
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
            >
              <DoubleCheckIcon className="h-4 w-4" />
              {d.acoes.finalizar}
            </button>
          )}

          {showAbrirFichaSecundario && (
            <button
              type="button"
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
            >
              <UsersIcon className="h-4 w-4" />
              {d.acoes.abrirFicha}
            </button>
          )}

          {isEmAndamento && (
            <button
              type="button"
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <CloseIcon className="h-4 w-4" />
              {d.acoes.cancelar}
            </button>
          )}
          {!isEmAndamento && !isEncerrado && (
            <button
              type="button"
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <HistoryIcon className="h-4 w-4" />
              {d.acoes.estornar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
