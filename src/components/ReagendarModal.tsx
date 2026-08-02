"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useConfiguracoes } from "@/components/ConfiguracoesProvider";
import { CloseIcon } from "@/components/icons";
import { buildTimeBoundaries, type AgendaAppointment } from "@/lib/agenda-mock";
import { expedienteDeConfiguracoes } from "@/lib/configuracoes-mock";
import { formatDateISO, parseDateISO, formatDateMMDDYYYY, formatMinutesAsTime } from "@/lib/date";

type ReagendarModalProps = {
  appointment: AgendaAppointment;
  verificarConflito: (data: string, inicioMin: number, fimMin: number) => boolean;
  onSave: (data: string, inicioMin: number, fimMin: number) => void;
  onClose: () => void;
};

export function ReagendarModal({ appointment, verificarConflito, onSave, onClose }: ReagendarModalProps) {
  const { t } = useLanguage();
  const { configuracoes } = useConfiguracoes();
  const m = t.agenda.reagendarModal;

  const expediente = useMemo(() => expedienteDeConfiguracoes(configuracoes.agenda), [configuracoes.agenda]);

  const duracaoMin = appointment.fimMin - appointment.inicioMin;
  const [dataIso, setDataIso] = useState(() => {
    const [mm, dd, yyyy] = appointment.data.split("/").map(Number);
    return formatDateISO(new Date(yyyy, mm - 1, dd));
  });
  const [inicioMin, setInicioMin] = useState(appointment.inicioMin);
  const [conflito, setConflito] = useState(false);

  const horariosDisponiveis = buildTimeBoundaries(expediente.inicioMin, expediente.fimMin).filter(
    (min) => min >= expediente.inicioMin && min + duracaoMin <= expediente.fimMin,
  );

  function handleConfirmar() {
    const novaData = formatDateMMDDYYYY(parseDateISO(dataIso));
    const novoFimMin = inicioMin + duracaoMin;
    if (verificarConflito(novaData, inicioMin, novoFimMin)) {
      setConflito(true);
      return;
    }
    onSave(novaData, inicioMin, novoFimMin);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{m.campoData}</span>
          <input
            type="date"
            value={dataIso}
            onChange={(event) => {
              setDataIso(event.target.value);
              setConflito(false);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{m.campoHorario}</span>
          <select
            value={inicioMin}
            onChange={(event) => {
              setInicioMin(Number(event.target.value));
              setConflito(false);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            {horariosDisponiveis.map((min) => (
              <option key={min} value={min}>
                {formatMinutesAsTime(min)}
              </option>
            ))}
          </select>
        </label>

        {conflito && (
          <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">
            {m.conflito}
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
            type="button"
            onClick={handleConfirmar}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {m.salvar}
          </button>
        </div>
      </div>
    </div>
  );
}
