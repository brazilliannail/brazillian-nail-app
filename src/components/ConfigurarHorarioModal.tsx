"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CloseIcon } from "@/components/icons";

type ConfigurarHorarioModalProps = {
  horarioAtual: string;
  onSave: (horario: string) => void;
  onClose: () => void;
};

export function ConfigurarHorarioModal({ horarioAtual, onSave, onClose }: ConfigurarHorarioModalProps) {
  const { t } = useLanguage();
  const m = t.lembretes.configurarHorarioModal;
  const [horario, setHorario] = useState(horarioAtual);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
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

        <p className="text-sm text-foreground/60">{m.descricao}</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="horario-aviso" className="text-sm font-medium text-foreground/70">
            {m.campoHorario}
          </label>
          <input
            id="horario-aviso"
            type="text"
            value={horario}
            onChange={(event) => setHorario(event.target.value)}
            placeholder="8:00 AM"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            {m.cancelar}
          </button>
          <button
            type="button"
            onClick={() => onSave(horario)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {m.salvar}
          </button>
        </div>
      </div>
    </div>
  );
}
