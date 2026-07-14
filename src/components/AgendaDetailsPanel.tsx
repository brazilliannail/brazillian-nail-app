"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { CloseIcon, PhoneIcon, EditIcon, PlayIcon, CheckIcon } from "@/components/icons";
import { formatMinutesAsTime } from "@/lib/date";
import type { AgendaAppointment } from "@/lib/agenda-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type AgendaDetailsPanelProps = {
  appointment: AgendaAppointment;
  onClose: () => void;
};

export function AgendaDetailsPanel({ appointment, onClose }: AgendaDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const d = t.agenda.detalhes;

  const servico = locale === "pt" ? appointment.servicoPt : appointment.servicoEn;
  const observacoes = locale === "pt" ? appointment.observacoesPt : appointment.observacoesEn;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">{appointment.cliente}</h3>
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

      <StatusBadge status={appointment.status} />

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-foreground/50">
            <PhoneIcon className="h-4 w-4" />
            {d.telefone}
          </dt>
          <dd className="font-medium text-foreground">{appointment.telefone}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{d.horario}</dt>
          <dd className="font-medium text-foreground">
            {formatMinutesAsTime(appointment.inicioMin)} – {formatMinutesAsTime(appointment.fimMin)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{d.servico}</dt>
          <dd className="font-medium text-foreground">{servico}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{d.valorEstimado}</dt>
          <dd className="font-medium text-foreground">
            {appointment.valor === null ? d.aDefinir : formatCurrency(appointment.valor)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-foreground/50">{d.observacoes}</dt>
          <dd className="rounded-xl bg-muted px-3 py-2 text-foreground/80">
            {observacoes || d.semObservacoes}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <CheckIcon className="h-4 w-4" />
          {d.acoes.confirmar}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          <EditIcon className="h-4 w-4" />
          {d.acoes.editar}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          <PlayIcon className="h-4 w-4" />
          {d.acoes.iniciarAtendimento}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          {d.acoes.abrirWhatsapp}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
        >
          {d.acoes.reagendar}
        </button>
        <button
          type="button"
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {d.acoes.cancelar}
        </button>
      </div>
    </div>
  );
}
