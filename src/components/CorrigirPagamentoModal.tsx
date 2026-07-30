"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CloseIcon } from "@/components/icons";
import type { FormaPagamento } from "@/lib/atendimentos-mock";
import type { CorrigirLancamentoDados } from "@/lib/atendimentos-actions";
import type { AtendimentoFinanceiro, LancamentosCorrigiveis } from "@/lib/financeiro-service";

const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "dinheiro",
  "cartaoCredito",
  "cartaoDebito",
  "zelle",
  "venmo",
  "cashApp",
  "cheque",
  "outra",
];

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type Step = "form" | "confirmar";

export type CorrecaoLancamento = CorrigirLancamentoDados & { pagamentoId: string };

export type CorrecoesPagamento = {
  servico?: CorrecaoLancamento;
  gorjeta?: CorrecaoLancamento;
};

type CorrigirPagamentoModalProps = {
  pagamento: AtendimentoFinanceiro;
  lancamentos: LancamentosCorrigiveis;
  onClose: () => void;
  onConfirmar: (correcoes: CorrecoesPagamento) => Promise<void>;
  erroSalvar?: string | null;
};

export function CorrigirPagamentoModal({ pagamento, lancamentos, onClose, onConfirmar, erroSalvar }: CorrigirPagamentoModalProps) {
  const { locale, t } = useLanguage();
  const f = t.financeiro;
  const m = f.corrigirPagamentoModal;

  const servico = locale === "pt" ? pagamento.servicoPt : pagamento.servicoEn;

  const formaAtual = lancamentos.servico?.formaPagamento ?? lancamentos.gorjeta?.formaPagamento ?? "";
  const observacoesPtAtual = lancamentos.servico?.observacoesPt ?? lancamentos.gorjeta?.observacoesPt ?? "";
  const observacoesEnAtual = lancamentos.servico?.observacoesEn ?? lancamentos.gorjeta?.observacoesEn ?? "";

  const [step, setStep] = useState<Step>("form");
  const [valorServico, setValorServico] = useState(String(lancamentos.servico?.valor ?? 0));
  const [valorGorjeta, setValorGorjeta] = useState(String(lancamentos.gorjeta?.valor ?? 0));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | "">(formaAtual);
  const [observacoesPt, setObservacoesPt] = useState(observacoesPtAtual);
  const [observacoesEn, setObservacoesEn] = useState(observacoesEnAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function construirCorrecoes(): CorrecoesPagamento | null {
    if (formaPagamento === "") return null;

    const observacoesMudaram = observacoesPt.trim() !== observacoesPtAtual || observacoesEn.trim() !== observacoesEnAtual;

    const correcoes: CorrecoesPagamento = {};

    if (lancamentos.servico) {
      const valorNum = Number(valorServico);
      const servicoMudou =
        valorNum !== lancamentos.servico.valor || formaPagamento !== lancamentos.servico.formaPagamento || observacoesMudaram;
      if (servicoMudou) {
        correcoes.servico = {
          pagamentoId: lancamentos.servico.pagamentoId,
          valor: valorNum,
          formaPagamento,
          observacoesPt: observacoesPt.trim() || undefined,
          observacoesEn: observacoesEn.trim() || undefined,
        };
      }
    }

    if (lancamentos.gorjeta) {
      const gorjetaNum = Number(valorGorjeta);
      const gorjetaMudou =
        gorjetaNum !== lancamentos.gorjeta.valor || formaPagamento !== lancamentos.gorjeta.formaPagamento || observacoesMudaram;
      if (gorjetaMudou) {
        correcoes.gorjeta = {
          pagamentoId: lancamentos.gorjeta.pagamentoId,
          valor: gorjetaNum,
          formaPagamento,
          observacoesPt: observacoesPt.trim() || undefined,
          observacoesEn: observacoesEn.trim() || undefined,
        };
      }
    }

    return correcoes;
  }

  function validarFormulario(): string | null {
    if (formaPagamento === "") {
      return m.erros.formaPagamentoObrigatoria;
    }
    const valorNum = Number(valorServico);
    if (lancamentos.servico && (Number.isNaN(valorNum) || valorNum <= 0)) {
      return m.erros.valorInvalido;
    }
    const gorjetaNum = Number(valorGorjeta);
    if (lancamentos.gorjeta && (Number.isNaN(gorjetaNum) || gorjetaNum <= 0)) {
      return m.erros.gorjetaInvalida;
    }
    const correcoes = construirCorrecoes();
    if (!correcoes || (!correcoes.servico && !correcoes.gorjeta)) {
      return m.erros.nadaParaCorrigir;
    }
    return null;
  }

  function handleAvancar(event: React.FormEvent) {
    event.preventDefault();
    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    setErro(null);
    setStep("confirmar");
  }

  async function handleConfirmar() {
    const correcoes = construirCorrecoes();
    if (!correcoes) return;
    setSalvando(true);
    try {
      await onConfirmar(correcoes);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:mx-4 sm:max-w-sm sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <h3 className="text-lg font-semibold text-foreground">{step === "form" ? m.titulo : m.confirmar.titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            {m.fechar}
          </button>
        </div>

        {step === "form" ? (
          <form onSubmit={handleAvancar} className="flex flex-col gap-4 overflow-y-auto p-5">
            <dl className="flex flex-col gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.resumoAtendimento}</dt>
                <dd className="text-right font-medium text-foreground">
                  {servico} · {pagamento.dataAtendimento}
                </dd>
              </div>
            </dl>

            <p className="rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">{m.aviso}</p>

            {lancamentos.servico ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/70">{m.valorServico}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorServico}
                  onChange={(event) => setValorServico(event.target.value)}
                  className={inputClass}
                />
              </label>
            ) : (
              <p className="rounded-xl bg-muted px-3 py-2 text-xs text-foreground/60">{m.semLancamentoServico}</p>
            )}

            {lancamentos.gorjeta ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/70">{m.gorjeta}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorGorjeta}
                  onChange={(event) => setValorGorjeta(event.target.value)}
                  className={inputClass}
                />
              </label>
            ) : (
              <p className="rounded-xl bg-muted px-3 py-2 text-xs text-foreground/60">{m.semLancamentoGorjeta}</p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.formaPagamento}</span>
              <select
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value as FormaPagamento)}
                className={inputClass}
              >
                <option value="">{m.formaPagamentoPlaceholder}</option>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma} value={forma}>
                    {f.formaPagamentoLabel[forma]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.observacoesPt}</span>
              <textarea
                value={observacoesPt}
                onChange={(event) => setObservacoesPt(event.target.value)}
                placeholder={m.observacoesPlaceholder}
                rows={2}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.observacoesEn}</span>
              <textarea
                value={observacoesEn}
                onChange={(event) => setObservacoesEn(event.target.value)}
                placeholder={m.observacoesPlaceholder}
                rows={2}
                className={inputClass}
              />
            </label>

            {erro && (
              <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">{erro}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                {m.cancelar}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {m.avancar}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto p-5">
            <p className="text-sm text-foreground/60">{m.confirmar.descricao}</p>

            <dl className="flex flex-col gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.resumoAtendimento}</dt>
                <dd className="text-right font-medium text-foreground">
                  {servico} · {pagamento.dataAtendimento}
                </dd>
              </div>
              {lancamentos.servico && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-foreground/50">{m.valorServico}</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(Number(valorServico))}</dd>
                </div>
              )}
              {lancamentos.gorjeta && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-foreground/50">{m.gorjeta}</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(Number(valorGorjeta))}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.formaPagamento}</dt>
                <dd className="font-medium text-foreground">
                  {formaPagamento !== "" ? f.formaPagamentoLabel[formaPagamento] : ""}
                </dd>
              </div>
              {(observacoesPt.trim() || observacoesEn.trim()) && (
                <div className="flex flex-col gap-1 border-t border-border pt-2">
                  {observacoesPt.trim() && (
                    <p className="text-foreground/80">
                      <span className="text-foreground/50">{m.observacoesPt}: </span>
                      {observacoesPt.trim()}
                    </p>
                  )}
                  {observacoesEn.trim() && (
                    <p className="text-foreground/80">
                      <span className="text-foreground/50">{m.observacoesEn}: </span>
                      {observacoesEn.trim()}
                    </p>
                  )}
                </div>
              )}
            </dl>

            {erroSalvar && (
              <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">{erroSalvar}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={salvando}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {m.confirmar.voltar}
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={salvando}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando ? m.confirmar.salvando : m.confirmar.salvar}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
