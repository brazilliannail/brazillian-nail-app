"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CloseIcon } from "@/components/icons";
import type { Atendimento, AtendimentoStatus, FormaPagamento } from "@/lib/atendimentos-mock";
import { valorTotalDevido } from "@/lib/atendimentos-mock";
import { buildTimeBoundaries } from "@/lib/agenda-mock";
import { formatMinutesAsTime, parseTimeToMinutes } from "@/lib/date";

type StatusFinal = Extract<
  AtendimentoStatus,
  "finalizadoPago" | "finalizadoPendente" | "finalizadoParcial" | "finalizadoCortesia"
>;

const STATUS_FINAIS: StatusFinal[] = ["finalizadoPago", "finalizadoParcial", "finalizadoPendente", "finalizadoCortesia"];

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

function sugerirStatus(devido: number, valorRecebido: number): StatusFinal {
  if (devido === 0) return "finalizadoCortesia";
  if (valorRecebido <= 0) return "finalizadoPendente";
  if (valorRecebido >= devido) return "finalizadoPago";
  return "finalizadoParcial";
}

type ConcluirAtendimentoModalProps = {
  atendimento: Atendimento;
  onClose: () => void;
  onConcluir: (dados: {
    horarioFim: string;
    duracaoMin: number;
    valorRecebido: number;
    gorjeta: number;
    formaPagamento: FormaPagamento | null;
    status: StatusFinal;
  }) => void;
  erroSalvar?: string | null;
};

export function ConcluirAtendimentoModal({ atendimento, onClose, onConcluir, erroSalvar }: ConcluirAtendimentoModalProps) {
  const { t } = useLanguage();
  const m = t.atendimentos.concluirModal;

  const horarios = buildTimeBoundaries();
  const inicioMin = parseTimeToMinutes(atendimento.horarioInicio);
  const devido = valorTotalDevido(atendimento);

  const [fimMin, setFimMin] = useState(() => {
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const candidato = horarios.find((min) => min >= minutosAgora && min > inicioMin);
    return candidato ?? horarios[horarios.length - 1];
  });
  const [valorRecebido, setValorRecebido] = useState(String(atendimento.valorRecebido || devido));
  const [gorjeta, setGorjeta] = useState(String(atendimento.gorjeta || 0));
  const [formaPagamento, setFormaPagamento] = useState(atendimento.formaPagamento ?? "");
  const [status, setStatus] = useState<StatusFinal>(() => sugerirStatus(devido, atendimento.valorRecebido || devido));
  const [erro, setErro] = useState<string | null>(null);

  const horariosValidos = horarios.filter((min) => min > inicioMin);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const valorNum = Number(valorRecebido);
    const gorjetaNum = Number(gorjeta);
    if (Number.isNaN(valorNum) || valorNum < 0 || Number.isNaN(gorjetaNum) || gorjetaNum < 0) {
      setErro(t.atendimentos.formulario.erros.valoresNegativos);
      return;
    }
    setErro(null);
    onConcluir({
      horarioFim: formatMinutesAsTime(fimMin),
      duracaoMin: fimMin - inicioMin,
      valorRecebido: valorNum,
      gorjeta: gorjetaNum,
      formaPagamento: formaPagamento === "" ? null : (formaPagamento as FormaPagamento),
      status,
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-4 rounded-t-2xl bg-surface p-5 shadow-lg sm:mx-4 sm:max-w-sm sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{m.titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{m.horarioFim}</span>
          <select value={fimMin} onChange={(event) => setFimMin(Number(event.target.value))} className={inputClass}>
            {horariosValidos.map((min) => (
              <option key={min} value={min}>
                {formatMinutesAsTime(min)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{m.valorRecebido}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={valorRecebido}
            onChange={(event) => setValorRecebido(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{t.atendimentos.formulario.gorjeta}</span>
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
          <select value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value)} className={inputClass}>
            <option value="">{m.formaPagamentoNenhuma}</option>
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma} value={forma}>
                {t.atendimentos.formaPagamentoLabel[forma]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{m.status}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFinal)} className={inputClass}>
            {STATUS_FINAIS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {t.atendimentos.status[opcao]}
              </option>
            ))}
          </select>
        </label>

        {(erro || erroSalvar) && (
          <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">
            {erro ?? erroSalvar}
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
            {m.salvar}
          </button>
        </div>
      </form>
    </div>
  );
}
