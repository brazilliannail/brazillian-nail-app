"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CloseIcon, CheckIcon, ClockIcon } from "@/components/icons";
import {
  valorTotalDevidoHistorico,
  saldoPendenteHistorico,
  type Cliente,
  type StatusPagamentoHistorico,
} from "@/lib/clientes-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

const STATUS_STYLES: Record<StatusPagamentoHistorico, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  pago: { badge: "bg-status-finalizado/10 text-status-finalizado ring-status-finalizado/30", icon: CheckIcon },
  parcial: { badge: "bg-status-confirmado/10 text-status-confirmado ring-status-confirmado/30", icon: CheckIcon },
  pendente: { badge: "bg-status-aguardando/10 text-status-aguardando ring-status-aguardando/30", icon: ClockIcon },
  cancelado: {
    badge: "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/40",
    icon: CloseIcon,
  },
};

type Filtro = "todos" | "pagos" | "pendentes" | "cancelados" | "personalizado";

type ClienteHistoricoModalProps = {
  cliente: Cliente;
  onClose: () => void;
};

export function ClienteHistoricoModal({ cliente, onClose }: ClienteHistoricoModalProps) {
  const { locale, t } = useLanguage();
  const h = t.clientes.historicoCompleto;
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const itensFiltrados = useMemo(() => {
    if (filtro === "todos" || filtro === "personalizado") return cliente.historico;
    if (filtro === "pagos") return cliente.historico.filter((item) => item.status === "pago" || item.status === "parcial");
    if (filtro === "pendentes")
      return cliente.historico.filter(
        (item) =>
          item.status !== "cancelado" &&
          (item.status === "parcial" || item.status === "pendente" || saldoPendenteHistorico(item) > 0)
      );
    if (filtro === "cancelados") return cliente.historico.filter((item) => item.status === "cancelado");
    return cliente.historico;
  }, [cliente.historico, filtro]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:mx-4 sm:max-w-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{h.titulo}</p>
            <h3 className="truncate text-lg font-semibold text-foreground">{cliente.nome}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            {h.fechar}
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-background p-1">
            {(["todos", "pagos", "pendentes", "cancelados", "personalizado"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setFiltro(opcao)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtro === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {h.filtros[opcao]}
              </button>
            ))}
          </div>

          {itensFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <p className="text-sm text-foreground/60">{h.vazio}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {itensFiltrados.map((item) => {
                const devido = valorTotalDevidoHistorico(item);
                const pendente = saldoPendenteHistorico(item);
                const { badge, icon: Icon } = STATUS_STYLES[item.status];
                const observacoes = locale === "pt" ? item.observacoesPt : item.observacoesEn;

                return (
                  <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.data} · {item.horario}
                        </p>
                        <p className="text-sm text-foreground/70">
                          {locale === "pt" ? item.servicoPt : item.servicoEn}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${badge}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {h.statusLabel[item.status]}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-foreground/50">{h.campos.valorServicos}</dt>
                        <dd className="font-medium text-foreground">{formatCurrency(item.valorServicos)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-foreground/50">{h.campos.desconto}</dt>
                        <dd className="font-medium text-foreground">{formatCurrency(item.desconto)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-foreground/50">{h.campos.gorjeta}</dt>
                        <dd className="font-medium text-foreground">{formatCurrency(item.gorjeta)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-foreground/50">{h.campos.valorTotalDevido}</dt>
                        <dd className="font-medium text-foreground">{formatCurrency(devido)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-foreground/50">{h.campos.valorRecebido}</dt>
                        <dd className="font-medium text-foreground">{formatCurrency(item.valorRecebido)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-foreground/50">{h.campos.formaPagamento}</dt>
                        <dd className="font-medium text-foreground">
                          {item.formaPagamento ? t.financeiro.formaPagamentoLabel[item.formaPagamento] : h.campos.formaPagamentoNaoDefinida}
                        </dd>
                      </div>
                    </dl>

                    {item.status === "cancelado" ? (
                      <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-2">
                        <span className="text-sm font-medium text-foreground/60">{h.campos.saldoPendente}</span>
                        <span className="text-sm font-semibold text-foreground/60">{h.campos.formaPagamentoNaoDefinida}</span>
                      </div>
                    ) : (
                      pendente > 0 && (
                        <div className="flex items-center justify-between rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 px-3 py-2">
                          <span className="text-sm font-medium text-status-aguardando">{h.campos.saldoPendente}</span>
                          <span className="text-sm font-semibold text-status-aguardando">{formatCurrency(pendente)}</span>
                        </div>
                      )
                    )}

                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-foreground/50">
                        {item.status === "cancelado" ? h.campos.motivoCancelamento : h.campos.observacoes}
                      </span>
                      <p className="rounded-xl bg-muted px-3 py-2 text-foreground/80">
                        {observacoes || h.campos.semObservacoes}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-foreground/50">{h.campos.proximoRetorno}</span>
                      <span className="font-medium text-foreground">
                        {item.proximoRetorno ?? h.campos.semProximoRetorno}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
