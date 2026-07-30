"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useServicos } from "@/components/ServicosProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertIcon } from "@/components/icons";
import { DAY_START_MIN, DAY_END_MIN, SLOT_MIN, buildTimeBoundaries, type AgendaAppointment } from "@/lib/agenda-mock";
import { formatMinutesAsTime, isHorarioAgendamentoPassado } from "@/lib/date";

const SLOT_HEIGHT = 56;
const TIME_COLUMN_WIDTH = 60;

const STATUS_ACCENT: Record<AgendaAppointment["status"], string> = {
  aguardando: "border-status-aguardando bg-status-aguardando/10",
  confirmado: "border-status-confirmado bg-status-confirmado/10",
  emAtendimento: "border-status-em-atendimento bg-status-em-atendimento/10",
  concluido: "border-status-concluido bg-status-concluido/10",
  cancelado: "border-status-cancelado bg-status-cancelado/10",
  naoCompareceu: "border-status-nao-compareceu bg-status-nao-compareceu/10",
};

type AgendaDayGridProps = {
  appointments: AgendaAppointment[];
  selectedDate: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AgendaDayGrid({ appointments, selectedDate, selectedId, onSelect }: AgendaDayGridProps) {
  const { t } = useLanguage();
  const { getCliente } = useClientes();
  const { getServico } = useServicos();
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
          const servico = apt.servicoId ? getServico(apt.servicoId)?.nome ?? t.agenda.detalhes.aDefinir : t.agenda.detalhes.aDefinir;
          const selected = apt.id === selectedId;
          const cliente = getCliente(apt.clienteId);
          const nomeExibicao = cliente?.nomePreferencia ?? cliente?.nome ?? "—";
          const pendente = apt.status === "aguardando" || apt.status === "confirmado";
          const pastDue = pendente && isHorarioAgendamentoPassado(selectedDate, apt.inicioMin);

          return (
            <button
              key={apt.id}
              type="button"
              onClick={() => onSelect(apt.id)}
              className={`absolute left-1 right-1 flex flex-col items-start gap-0.5 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left shadow-sm transition-transform active:scale-[0.99] ${
                STATUS_ACCENT[apt.status]
              } ${selected ? "ring-2 ring-brand" : ""} ${pastDue ? "ring-2 ring-status-cancelado" : ""}`}
              style={{ top: top + 2, height: Math.max(height - 4, 40) }}
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-foreground/60">
                  {formatMinutesAsTime(apt.inicioMin)} – {formatMinutesAsTime(apt.fimMin)}
                </span>
                {pastDue && <AlertIcon className="h-3.5 w-3.5 shrink-0 text-status-cancelado" />}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{nomeExibicao}</span>
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
