"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { StatCard } from "@/components/StatCard";
import { AgendaDayGrid } from "@/components/AgendaDayGrid";
import { AgendaDetailsPanel } from "@/components/AgendaDetailsPanel";
import { CalendarIcon, CheckIcon, ClockIcon, WalletIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { formatDateMMDDYYYY, addDays } from "@/lib/date";
import { mockAgendaDoDia, computeResumoDia } from "@/lib/agenda-mock";

type ViewMode = "dia" | "semana" | "mes";

export default function AgendaPage() {
  const { t } = useLanguage();
  const [view, setView] = useState<ViewMode>("dia");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resumo = computeResumoDia(mockAgendaDoDia);
  const selectedAppointment = mockAgendaDoDia.find((apt) => apt.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t.nav.agenda}</h1>
            <p className="text-sm text-foreground/60">{formatDateMMDDYYYY(selectedDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              {t.agenda.hoje}
            </button>
            <button
              type="button"
              title={t.misc.emConstrucao}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <PlusIcon className="h-4 w-4" />
              {t.agenda.novoAgendamento}
            </button>
          </div>
        </div>

        <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
          {(["dia", "semana", "mes"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                view === mode ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.agenda.visualizacao[mode]}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedDate((current) => addDays(current, -1))}
            aria-label="anterior"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-muted"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-foreground">
            {formatDateMMDDYYYY(selectedDate)}
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate((current) => addDays(current, 1))}
            aria-label="próximo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-muted"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={CalendarIcon} label={t.agenda.resumo.agendamentos} value={resumo.agendamentos} />
          <StatCard icon={CheckIcon} label={t.agenda.resumo.confirmados} value={resumo.confirmados} tone="brand" />
          <StatCard icon={ClockIcon} label={t.agenda.resumo.aguardando} value={resumo.aguardando} />
          <StatCard icon={CalendarIcon} label={t.agenda.resumo.disponiveis} value={resumo.disponiveis} />
          <StatCard
            icon={WalletIcon}
            label={t.agenda.resumo.totalEstimado}
            value={`$${resumo.totalEstimado.toFixed(2)}`}
            tone="brand"
          />
        </div>

        {view === "dia" ? (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <AgendaDayGrid appointments={mockAgendaDoDia} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm font-semibold text-foreground">{t.agenda.visualizacao[view]}</p>
            <p className="text-sm text-foreground/60">{t.agenda.visualizacaoEmBreve}</p>
          </div>
        )}
      </div>

      {selectedAppointment && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <AgendaDetailsPanel appointment={selectedAppointment} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <AgendaDetailsPanel appointment={selectedAppointment} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
