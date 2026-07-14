"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { DAY_START_MIN, DAY_END_MIN, SLOT_MIN, buildTimeBoundaries, type AgendaAppointment } from "@/lib/agenda-mock";
import { formatMinutesAsTime } from "@/lib/date";

const SLOT_HEIGHT = 56;
const TIME_COLUMN_WIDTH = 60;

const STATUS_ACCENT: Record<AgendaAppointment["status"], string> = {
  aguardando: "border-status-aguardando bg-status-aguardando/10",
  confirmado: "border-status-confirmado bg-status-confirmado/10",
  emAtendimento: "border-status-em-atendimento bg-status-em-atendimento/10",
  finalizado: "border-status-finalizado bg-status-finalizado/10",
};

type AgendaDayGridProps = {
  appointments: AgendaAppointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AgendaDayGrid({ appointments, selectedId, onSelect }: AgendaDayGridProps) {
  const { locale } = useLanguage();
  const boundaries = buildTimeBoundaries();
  const totalHeight = ((DAY_END_MIN - DAY_START_MIN) / SLOT_MIN) * SLOT_HEIGHT;

  return (
    <div className="relative" style={{ height: totalHeight + 1 }}>
      {boundaries.map((min, index) => (
        <div
          key={min}
          className="absolute inset-x-0 flex items-start"
          style={{ top: index * SLOT_HEIGHT }}
        >
          <span
            className="-translate-y-1/2 pr-2 text-right text-[11px] text-foreground/40"
            style={{ width: TIME_COLUMN_WIDTH }}
          >
            {formatMinutesAsTime(min)}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      ))}

      <div className="absolute inset-y-0 right-0" style={{ left: TIME_COLUMN_WIDTH }}>
        {appointments.map((apt) => {
          const top = ((apt.inicioMin - DAY_START_MIN) / SLOT_MIN) * SLOT_HEIGHT;
          const height = ((apt.fimMin - apt.inicioMin) / SLOT_MIN) * SLOT_HEIGHT;
          const servico = locale === "pt" ? apt.servicoPt : apt.servicoEn;
          const selected = apt.id === selectedId;

          return (
            <button
              key={apt.id}
              type="button"
              onClick={() => onSelect(apt.id)}
              className={`absolute left-1 right-1 flex flex-col items-start gap-0.5 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left shadow-sm transition-transform active:scale-[0.99] ${
                STATUS_ACCENT[apt.status]
              } ${selected ? "ring-2 ring-brand" : ""}`}
              style={{ top: top + 2, height: Math.max(height - 4, 40) }}
            >
              <span className="text-[11px] font-medium text-foreground/60">
                {formatMinutesAsTime(apt.inicioMin)} – {formatMinutesAsTime(apt.fimMin)}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{apt.cliente}</span>
              {height >= SLOT_HEIGHT * 1.5 && (
                <span className="truncate text-xs text-foreground/60">{servico}</span>
              )}
              {height >= SLOT_HEIGHT * 2 && (
                <span className="mt-0.5">
                  <StatusBadge status={apt.status} size="sm" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
