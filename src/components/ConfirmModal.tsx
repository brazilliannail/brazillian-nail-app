"use client";

import { AlertIcon } from "@/components/icons";

type ConfirmModalProps = {
  titulo: string;
  descricao?: string;
  textoConfirmar: string;
  textoCancelar: string;
  onConfirmar: () => void;
  onFechar: () => void;
};

/** Modal de confirmação genérico para ações que afetam mais de um registro de uma vez ou que não
 * têm volta simples — mesmo padrão visual de `confirmarInativacao` em ClienteDetailsPanel.tsx. */
export function ConfirmModal({ titulo, descricao, textoConfirmar, textoCancelar, onConfirmar, onFechar }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-aguardando/10 text-status-aguardando">
            <AlertIcon className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1 pt-1">
            <p className="text-sm font-semibold text-foreground">{titulo}</p>
            {descricao && <p className="text-xs text-foreground/60">{descricao}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
