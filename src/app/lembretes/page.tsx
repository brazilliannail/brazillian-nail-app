"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LembreteCard } from "@/components/LembreteCard";
import { LembreteDetailsPanel } from "@/components/LembreteDetailsPanel";
import { ConfigurarHorarioModal } from "@/components/ConfigurarHorarioModal";
import { StatCard } from "@/components/StatCard";
import { ClockIcon, CheckIcon, DoubleCheckIcon, UsersIcon, AlertIcon, PhoneIcon } from "@/components/icons";
import { addDays, formatDateMMDDYYYY } from "@/lib/date";
import { mockLembretes, type Lembrete, type LembreteStatus } from "@/lib/lembretes-mock";

export default function LembretesPage() {
  const { t } = useLanguage();
  const l = t.lembretes;
  const [lembretes, setLembretes] = useState<Lembrete[]>(mockLembretes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [horarioAviso, setHorarioAviso] = useState("8:00 AM");
  const [configurarAberto, setConfigurarAberto] = useState(false);

  const dataAmanha = useMemo(() => formatDateMMDDYYYY(addDays(new Date(), 1)), []);

  const resumo = useMemo(
    () => ({
      total: lembretes.length,
      confirmados: lembretes.filter((item) => item.statusAgendamento === "confirmado").length,
      aguardando: lembretes.filter((item) => item.statusAgendamento === "aguardando").length,
      pendentes: lembretes.filter((item) => item.statusLembrete === "pendente").length,
      preparados: lembretes.filter((item) => item.statusLembrete === "preparado").length,
      semTelefone: lembretes.filter((item) => item.telefone === null).length,
    }),
    [lembretes],
  );

  function updateStatus(id: string, status: LembreteStatus) {
    setLembretes((current) => current.map((item) => (item.id === id ? { ...item, statusLembrete: status } : item)));
  }

  function updateMensagem(id: string, mensagem: string) {
    setLembretes((current) =>
      current.map((item) => (item.id === id ? { ...item, mensagemPersonalizada: mensagem } : item)),
    );
  }

  const lembreteSelecionado = lembretes.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{l.titulo}</h1>
            <p className="text-sm text-foreground/60">
              {l.compromissosDe} {dataAmanha}
            </p>
            <p className="text-sm text-foreground/60">
              {l.horarioAviso}: <span className="font-medium text-foreground">{horarioAviso}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfigurarAberto(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <ClockIcon className="h-4 w-4" />
            {l.configurarHorario}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label={l.resumo.agendamentos} value={resumo.total} icon={UsersIcon} />
          <StatCard label={l.resumo.confirmados} value={resumo.confirmados} icon={CheckIcon} />
          <StatCard label={l.resumo.aguardando} value={resumo.aguardando} icon={ClockIcon} tone="warning" />
          <StatCard label={l.resumo.lembretesPendentes} value={resumo.pendentes} icon={AlertIcon} tone="warning" />
          <StatCard label={l.resumo.lembretesPreparados} value={resumo.preparados} icon={DoubleCheckIcon} />
          <StatCard label={l.resumo.semTelefone} value={resumo.semTelefone} icon={PhoneIcon} />
        </div>

        {lembretes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-foreground/60">{l.vazio}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {lembretes.map((lembrete) => (
              <LembreteCard
                key={lembrete.id}
                lembrete={lembrete}
                selected={lembrete.id === selectedId}
                dataAmanha={dataAmanha}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </div>

      {lembreteSelecionado && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <LembreteDetailsPanel
            key={lembreteSelecionado.id}
            lembrete={lembreteSelecionado}
            dataAmanha={dataAmanha}
            onClose={() => setSelectedId(null)}
            onUpdateStatus={updateStatus}
            onUpdateMensagem={updateMensagem}
          />
        </div>
      )}

      {lembreteSelecionado && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex h-full flex-col overflow-y-auto p-4 pb-8">
            <LembreteDetailsPanel
              key={lembreteSelecionado.id}
              lembrete={lembreteSelecionado}
              dataAmanha={dataAmanha}
              onClose={() => setSelectedId(null)}
              onUpdateStatus={updateStatus}
              onUpdateMensagem={updateMensagem}
            />
          </div>
        </div>
      )}

      {configurarAberto && (
        <ConfigurarHorarioModal
          horarioAtual={horarioAviso}
          onSave={(novoHorario) => {
            setHorarioAviso(novoHorario);
            setConfigurarAberto(false);
          }}
          onClose={() => setConfigurarAberto(false)}
        />
      )}
    </div>
  );
}
