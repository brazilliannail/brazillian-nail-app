"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useConfiguracoes } from "@/components/ConfiguracoesProvider";
import { CloseIcon } from "@/components/icons";
import type { FormaPagamento } from "@/lib/atendimentos-mock";
import type { RegistrarPagamentoAdicionalDados } from "@/lib/atendimentos-actions";
import type { AtendimentoFinanceiro } from "@/lib/financeiro-service";
import { formatDateISO, isoToMMDDYYYY, mmddyyyyToISO } from "@/lib/date";
import { FORMAS_PAGAMENTO } from "@/lib/configuracoes-mock";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type Step = "form" | "confirmar";

type AdicionarPagamentoModalProps = {
  pagamento: AtendimentoFinanceiro;
  onClose: () => void;
  onConfirmar: (dados: RegistrarPagamentoAdicionalDados) => Promise<void>;
  erroSalvar?: string | null;
};

export function AdicionarPagamentoModal({ pagamento, onClose, onConfirmar, erroSalvar }: AdicionarPagamentoModalProps) {
  const { locale, t } = useLanguage();
  const f = t.financeiro;
  const m = f.registrarPagamentoModal;
  const { configuracoes } = useConfiguracoes();

  const formasAtivas = configuracoes.financeiro.formasPagamentoAtivas;
  const formasDisponiveis = FORMAS_PAGAMENTO.filter((forma) => formasAtivas[forma]);

  const servico = locale === "pt" ? pagamento.servicoPt : pagamento.servicoEn;
  const dataAtendimentoIso = mmddyyyyToISO(pagamento.dataAtendimento);

  const [step, setStep] = useState<Step>("form");
  const [valor, setValor] = useState(String(pagamento.saldoPendente));
  const [gorjeta, setGorjeta] = useState("0");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | "">("");
  const [dataIso, setDataIso] = useState(() => {
    const hoje = formatDateISO(new Date());
    return hoje < dataAtendimentoIso ? dataAtendimentoIso : hoje;
  });
  const [observacoesPt, setObservacoesPt] = useState("");
  const [observacoesEn, setObservacoesEn] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const valorNum = Number(valor);
  const gorjetaNum = Number(gorjeta);
  const valorRestante = Math.max(pagamento.saldoPendente - (Number.isNaN(valorNum) ? 0 : valorNum), 0);

  function validarFormulario(): string | null {
    if (Number.isNaN(valorNum) || valorNum < 0 || Number.isNaN(gorjetaNum) || gorjetaNum < 0) {
      return m.erros.valorNegativo;
    }
    if (valorNum === 0 && gorjetaNum === 0) {
      return m.erros.valorEGorjetaZero;
    }
    if (valorNum > pagamento.saldoPendente) {
      return m.erros.valorMaiorQueSaldo;
    }
    if (formaPagamento === "") {
      return m.erros.formaPagamentoObrigatoria;
    }
    if (dataIso < dataAtendimentoIso) {
      return m.erros.dataAnteriorAoAtendimento;
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
    setSalvando(true);
    try {
      await onConfirmar({
        valor: valorNum,
        gorjeta: gorjetaNum,
        formaPagamento: formaPagamento as FormaPagamento,
        dataPagamento: isoToMMDDYYYY(dataIso),
        observacoesPt: observacoesPt.trim() || undefined,
        observacoesEn: observacoesEn.trim() || undefined,
      });
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
          <h3 className="text-lg font-semibold text-foreground">
            {step === "form" ? m.titulo : m.confirmar.titulo}
          </h3>
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
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.valorRecebidoAteAgora}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(pagamento.valorRecebido)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.saldoPendenteAtual}</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(pagamento.saldoPendente)}</dd>
              </div>
            </dl>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.valor}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.gorjeta}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={gorjeta}
                onChange={(event) => setGorjeta(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.formaPagamento}</span>
              <select
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value as FormaPagamento)}
                className={inputClass}
              >
                <option value="">{m.formaPagamentoPlaceholder}</option>
                {formasDisponiveis.map((forma) => (
                  <option key={forma} value={forma}>
                    {f.formaPagamentoLabel[forma]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{m.dataPagamento}</span>
              <input
                type="date"
                value={dataIso}
                min={dataAtendimentoIso}
                onChange={(event) => setDataIso(event.target.value)}
                className={inputClass}
              />
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

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
              <span className="text-foreground/60">{m.valorRestante}</span>
              <span className="font-semibold text-foreground">{formatCurrency(valorRestante)}</span>
            </div>

            {erro && (
              <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">
                {erro}
              </p>
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
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.valor}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(valorNum)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.gorjeta}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(gorjetaNum)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.formaPagamento}</dt>
                <dd className="font-medium text-foreground">
                  {formaPagamento !== "" ? f.formaPagamentoLabel[formaPagamento] : ""}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.dataPagamento}</dt>
                <dd className="font-medium text-foreground">{isoToMMDDYYYY(dataIso)}</dd>
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

            <dl className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{m.saldoPendenteAtual}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(pagamento.saldoPendente)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-foreground/70">{m.valorRestante}</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(valorRestante)}</dd>
              </div>
            </dl>

            {erroSalvar && (
              <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">
                {erroSalvar}
              </p>
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
