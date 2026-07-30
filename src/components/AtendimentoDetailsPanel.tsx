"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { AtendimentoStatusBadge } from "@/components/AtendimentoStatusBadge";
import { CloseIcon, EditIcon, DoubleCheckIcon, HistoryIcon, AlertIcon, PlusIcon } from "@/components/icons";
import { valorTotalDevido, saldoPendente, type Atendimento } from "@/lib/atendimentos-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type AtendimentoDetailsPanelProps = {
  atendimento: Atendimento;
  onClose: () => void;
  onEdit: () => void;
  onConcluir: () => void;
  onCancelar: () => void;
  onEstornar: () => void;
  onRegistrarPagamento: () => void;
};

/** Espelha a restrição real de `registrarPagamentoAdicionalAction` (atendimentos-actions.ts) —
 * só um atendimento finalizado com saldo em aberto aceita novo lançamento; "emAndamento" ainda
 * não tem pagamento nenhum (nasce ao concluir) e "cancelado"/"estornado"/"finalizadoCortesia"
 * nunca voltam a ter saldo pendente. */
const STATUS_ACEITA_NOVO_PAGAMENTO = new Set<Atendimento["status"]>(["finalizadoPendente", "finalizadoParcial"]);

export function AtendimentoDetailsPanel({
  atendimento,
  onClose,
  onEdit,
  onConcluir,
  onCancelar,
  onEstornar,
  onRegistrarPagamento,
}: AtendimentoDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const { getCliente } = useClientes();
  const a = t.atendimentos;
  const c = t.clientes;
  const d = a.detalhes;

  const [confirmando, setConfirmando] = useState<"cancelar" | "estornar" | null>(null);

  const cliente = getCliente(atendimento.clienteId);
  const nomeExibicao = cliente?.nomePreferencia ?? cliente?.nome ?? "—";

  const devido = valorTotalDevido(atendimento);
  const pendente = saldoPendente(atendimento);
  const valorServicos = atendimento.servicos.reduce((total, item) => total + item.valor, 0);
  const observacoes = locale === "pt" ? atendimento.observacoesPt : atendimento.observacoesEn;

  const isEmAndamento = atendimento.status === "emAndamento";
  const isEncerrado = atendimento.status === "cancelado" || atendimento.status === "estornado";
  const temSaldoPendente = pendente > 0;
  const podeRegistrarPagamento = temSaldoPendente && STATUS_ACEITA_NOVO_PAGAMENTO.has(atendimento.status);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
          <h3 className="truncate text-lg font-semibold text-foreground">{nomeExibicao}</h3>
          {cliente?.nomePreferencia && (
            <p className="truncate text-xs text-foreground/50">{cliente.nome}</p>
          )}
          {cliente?.status === "inativa" && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/50">
              {c.statusLabel.inativa}
            </span>
          )}
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
            {atendimento.servicos.map((servico, index) => (
              <li
                key={`${servico.nomePt}-${index}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="text-foreground">{(locale === "pt" ? servico.nomePt : servico.nomeEn) || servico.nomePt}</span>
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
        </dl>

        <div className="grid grid-cols-2 gap-2">
          {isEmAndamento && (
            <button
              type="button"
              onClick={onConcluir}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <DoubleCheckIcon className="h-4 w-4" />
              {d.acoes.finalizar}
            </button>
          )}

          {podeRegistrarPagamento && (
            <button
              type="button"
              onClick={onRegistrarPagamento}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <PlusIcon className="h-4 w-4" />
              {d.acoes.registrarPagamento}
            </button>
          )}

          {!isEncerrado && (
            <button
              type="button"
              onClick={onEdit}
              className={`flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] ${
                isEmAndamento ? "" : "col-span-2"
              }`}
            >
              <EditIcon className="h-4 w-4" />
              {d.acoes.editar}
            </button>
          )}

          {isEmAndamento && (
            <button
              type="button"
              onClick={() => setConfirmando("cancelar")}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <CloseIcon className="h-4 w-4" />
              {d.acoes.cancelar}
            </button>
          )}
          {!isEmAndamento && !isEncerrado && (
            <button
              type="button"
              onClick={() => setConfirmando("estornar")}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <HistoryIcon className="h-4 w-4" />
              {d.acoes.estornar}
            </button>
          )}
        </div>
      </div>

      {confirmando && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmando(null)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-aguardando/10 text-status-aguardando">
                <AlertIcon className="h-5 w-5" />
              </span>
              <p className="pt-1.5 text-sm font-semibold text-foreground">
                {confirmando === "cancelar" ? a.confirmarCancelar.titulo : a.confirmarEstornar.titulo}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                {confirmando === "cancelar" ? a.confirmarCancelar.voltar : a.confirmarEstornar.voltar}
              </button>
              <button
                type="button"
                onClick={() => {
                  const acao = confirmando;
                  setConfirmando(null);
                  if (acao === "cancelar") onCancelar();
                  else onEstornar();
                }}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {confirmando === "cancelar" ? a.confirmarCancelar.confirmar : a.confirmarEstornar.confirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
