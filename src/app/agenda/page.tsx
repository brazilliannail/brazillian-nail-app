"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useAgenda } from "@/components/AgendaProvider";
import { useAtendimentos } from "@/components/AtendimentosProvider";
import { useConfiguracoes } from "@/components/ConfiguracoesProvider";
import { StatCard } from "@/components/StatCard";
import { AgendaDayGrid } from "@/components/AgendaDayGrid";
import { AgendaDetailsPanel } from "@/components/AgendaDetailsPanel";
import { AgendaFormModal } from "@/components/AgendaFormModal";
import { ReagendarModal } from "@/components/ReagendarModal";
import { CalendarIcon, CheckIcon, ClockIcon, WalletIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { formatDateMMDDYYYY, addDays } from "@/lib/date";
import { computeResumoDia, type AgendaAppointment } from "@/lib/agenda-mock";
import { expedienteDeConfiguracoes } from "@/lib/configuracoes-mock";
import type { StatusKey } from "@/lib/mock-data";

type ViewMode = "dia" | "semana" | "mes";
type FormState = { modo: "criar" } | { modo: "editar"; agendamento: AgendaAppointment } | null;

export default function AgendaPage() {
  const { t } = useLanguage();
  const { agendamentos, addAgendamento, updateAgendamento, updateStatus, reagendar } = useAgenda();
  const { iniciarAtendimentoDoAgendamento } = useAtendimentos();
  const { configuracoes } = useConfiguracoes();
  const expediente = useMemo(() => expedienteDeConfiguracoes(configuracoes.agenda), [configuracoes.agenda]);
  const [view, setView] = useState<ViewMode>("dia");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reagendarAberto, setReagendarAberto] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);
  const [iniciandoAtendimento, setIniciandoAtendimento] = useState(false);
  const [avisoAtendimento, setAvisoAtendimento] = useState<{ id: string; criado: boolean } | null>(null);

  async function updateAppointmentStatus(id: string, status: StatusKey) {
    try {
      setErroOperacao(null);
      await updateStatus(id, status);
    } catch (error) {
      setErroOperacao(error instanceof Error ? error.message : "Não foi possível atualizar o status.");
    }
  }

  async function handleIniciarAtendimento(agendamentoId: string) {
    if (iniciandoAtendimento) return;
    try {
      setErroOperacao(null);
      setAvisoAtendimento(null);
      setIniciandoAtendimento(true);
      const { id, criado } = await iniciarAtendimentoDoAgendamento(agendamentoId);
      setAvisoAtendimento({ id, criado });
    } catch (error) {
      setErroOperacao(error instanceof Error ? error.message : "Não foi possível iniciar o atendimento.");
    } finally {
      setIniciandoAtendimento(false);
    }
  }

  const dataSelecionada = formatDateMMDDYYYY(selectedDate);
  const agendaDoDia = useMemo(
    () => agendamentos.filter((apt) => apt.data === dataSelecionada),
    [agendamentos, dataSelecionada],
  );

  const resumo = computeResumoDia(agendaDoDia, expediente.inicioMin, expediente.fimMin);
  const selectedAppointment = agendaDoDia.find((apt) => apt.id === selectedId) ?? null;

  function existeConflito(data: string, inicioMin: number, fimMin: number) {
    if (!selectedAppointment || !configuracoes.agenda.bloqueioConflitoHorario) return false;
    return agendamentos.some(
      (apt) =>
        apt.id !== selectedAppointment.id &&
        apt.data === data &&
        apt.status !== "cancelado" &&
        inicioMin < apt.fimMin &&
        fimMin > apt.inicioMin,
    );
  }

  async function handleReagendar(novaData: string, novoInicioMin: number, novoFimMin: number) {
    if (!selectedAppointment) return;
    try {
      setErroOperacao(null);
      await reagendar(selectedAppointment.id, novaData, novoInicioMin, novoFimMin);
      if (novaData !== dataSelecionada) {
        const [mm, dd, yyyy] = novaData.split("/").map(Number);
        setSelectedDate(new Date(yyyy, mm - 1, dd));
      }
      setReagendarAberto(false);
    } catch (error) {
      setErroOperacao(error instanceof Error ? error.message : "Não foi possível reagendar.");
    }
  }

  async function handleSaveAgendamento(agendamento: AgendaAppointment) {
    try {
      setErroFormulario(null);
      if (formState?.modo === "editar") {
        await updateAgendamento(agendamento);
        setSelectedId(agendamento.id);
      } else {
        const { id: _idPlaceholder, ...dados } = agendamento;
        void _idPlaceholder;
        const novoId = await addAgendamento(dados);
        setSelectedId(novoId);
        if (agendamento.data !== dataSelecionada) {
          const [mm, dd, yyyy] = agendamento.data.split("/").map(Number);
          setSelectedDate(new Date(yyyy, mm - 1, dd));
        }
      }
      setFormState(null);
    } catch (error) {
      setErroFormulario(error instanceof Error ? error.message : "Não foi possível salvar o agendamento.");
    }
  }

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
              onClick={() => setFormState({ modo: "criar" })}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <PlusIcon className="h-4 w-4" />
              {t.agenda.novoAgendamento}
            </button>
          </div>
        </div>

        {erroOperacao && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erroOperacao}
          </div>
        )}

        {avisoAtendimento && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <p className="text-sm font-medium text-foreground/80">
              {avisoAtendimento.criado
                ? t.agenda.detalhes.atendimentoIniciado.criado
                : t.agenda.detalhes.atendimentoIniciado.jaExistia}{" "}
              <span className="font-semibold text-foreground">{avisoAtendimento.id}</span>
            </p>
            <Link
              href="/atendimentos"
              className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-transform active:scale-[0.98]"
            >
              {t.agenda.detalhes.atendimentoIniciado.verAtendimento}
            </Link>
          </div>
        )}

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
          agendaDoDia.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-foreground/60">{t.agenda.grade.semAgendamento}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <AgendaDayGrid
                appointments={agendaDoDia}
                selectedDate={selectedDate}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm font-semibold text-foreground">{t.agenda.visualizacao[view]}</p>
            <p className="text-sm text-foreground/60">{t.agenda.visualizacaoEmBreve}</p>
          </div>
        )}
      </div>

      {selectedAppointment && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <AgendaDetailsPanel
            appointment={selectedAppointment}
            selectedDate={selectedDate}
            onClose={() => setSelectedId(null)}
            onUpdateStatus={updateAppointmentStatus}
            onReagendar={() => setReagendarAberto(true)}
            onNovoAgendamento={() => setFormState({ modo: "criar" })}
            onEdit={() => setFormState({ modo: "editar", agendamento: selectedAppointment })}
            onIniciarAtendimento={() => handleIniciarAtendimento(selectedAppointment.id)}
            iniciandoAtendimento={iniciandoAtendimento}
          />
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
            <AgendaDetailsPanel
              appointment={selectedAppointment}
              selectedDate={selectedDate}
              onClose={() => setSelectedId(null)}
              onUpdateStatus={updateAppointmentStatus}
              onReagendar={() => setReagendarAberto(true)}
              onNovoAgendamento={() => setFormState({ modo: "criar" })}
              onEdit={() => setFormState({ modo: "editar", agendamento: selectedAppointment })}
              onIniciarAtendimento={() => handleIniciarAtendimento(selectedAppointment.id)}
              iniciandoAtendimento={iniciandoAtendimento}
            />
          </div>
        </div>
      )}

      {reagendarAberto && selectedAppointment && (
        <ReagendarModal
          appointment={selectedAppointment}
          verificarConflito={existeConflito}
          onSave={handleReagendar}
          onClose={() => setReagendarAberto(false)}
        />
      )}

      {formState && (
        <AgendaFormModal
          modo={formState.modo}
          agendamento={formState.modo === "editar" ? formState.agendamento : null}
          dataPadrao={selectedDate}
          onClose={() => {
            setErroFormulario(null);
            setFormState(null);
          }}
          onSave={handleSaveAgendamento}
          erroSalvar={erroFormulario}
        />
      )}
    </div>
  );
}
