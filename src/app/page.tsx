"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility } from "@/components/FinancialVisibilityProvider";
import { useAgenda } from "@/components/AgendaProvider";
import { useAtendimentos } from "@/components/AtendimentosProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useLancamentosCaixa } from "@/components/FinanceiroProvider";
import { useLembretes } from "@/components/LembretesProvider";
import { useServicos } from "@/components/ServicosProvider";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { AgendaFormModal } from "@/components/AgendaFormModal";
import { ClienteFormModal } from "@/components/ClienteFormModal";
import { AtendimentoFormModal } from "@/components/AtendimentoFormModal";
import { ClockIcon, CalendarIcon, WalletIcon, BellIcon, PlusIcon, UserPlusIcon, ZapIcon } from "@/components/icons";
import { formatDateMMDDYYYY, formatMinutesAsTime, isHorarioAgendamentoPassado } from "@/lib/date";
import { computeResumoDia, type AgendaAppointment } from "@/lib/agenda-mock";
import type { Cliente } from "@/lib/clientes-mock";
import type { Atendimento } from "@/lib/atendimentos-mock";
import { calcularAgregadoFinanceiro, calcularSaldoAbertoGlobal } from "@/lib/financeiro-service";
import { getMainRange } from "@/lib/financeiro-comparacao";

const VALOR_OCULTO = "••••••";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type FormAberto = "agendamento" | "cliente" | "atendimento" | null;

export default function Home() {
  const { locale, t } = useLanguage();
  const { visible } = useFinancialVisibility();
  const { agendamentos, addAgendamento } = useAgenda();
  const { atendimentos, addAtendimento } = useAtendimentos();
  const { getCliente, addCliente } = useClientes();
  const lancamentosCaixa = useLancamentosCaixa();
  const { lembretes } = useLembretes();
  const { getServico } = useServicos();

  const [formAberto, setFormAberto] = useState<FormAberto>(null);
  const [erroAgendamento, setErroAgendamento] = useState<string | null>(null);
  const [erroCliente, setErroCliente] = useState<string | null>(null);
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null);

  const hoje = useMemo(() => new Date(), []);
  const dataHoje = formatDateMMDDYYYY(hoje);

  const agendaHoje = useMemo(
    () => agendamentos.filter((apt) => apt.data === dataHoje).sort((a, b) => a.inicioMin - b.inicioMin),
    [agendamentos, dataHoje],
  );

  const proximoAtendimento = agendaHoje.find(
    (apt) =>
      apt.status !== "cancelado" &&
      apt.status !== "naoCompareceu" &&
      !isHorarioAgendamentoPassado(hoje, apt.inicioMin),
  );

  const proximoAtendimentoLabel = proximoAtendimento
    ? `${formatMinutesAsTime(proximoAtendimento.inicioMin)} — ${
        getCliente(proximoAtendimento.clienteId)?.nomePreferencia ?? getCliente(proximoAtendimento.clienteId)?.nome ?? "—"
      }`
    : "—";

  const resumoAgendaHoje = computeResumoDia(agendaHoje);

  const rangeHoje = getMainRange("hoje", hoje);
  const agregadoHoje = calcularAgregadoFinanceiro(atendimentos, lancamentosCaixa, rangeHoje);
  const valoresPendentes = calcularSaldoAbertoGlobal(atendimentos);

  function nomeServico(apt: AgendaAppointment) {
    if (!apt.servicoId) return t.agenda.detalhes.aDefinir;
    const servico = getServico(apt.servicoId);
    if (!servico) return t.agenda.detalhes.aDefinir;
    return locale === "en" && servico.nomeEn ? servico.nomeEn : servico.nome;
  }

  async function handleSaveAgendamento(agendamento: AgendaAppointment) {
    try {
      setErroAgendamento(null);
      const { id: _idPlaceholder, ...dados } = agendamento;
      await addAgendamento(dados);
      setFormAberto(null);
    } catch (error) {
      setErroAgendamento(error instanceof Error ? error.message : "Não foi possível salvar o agendamento.");
    }
  }

  async function handleSaveCliente(cliente: Cliente) {
    try {
      setErroCliente(null);
      const { id: _idPlaceholder, ...dados } = cliente;
      await addCliente(dados);
      setFormAberto(null);
    } catch (error) {
      setErroCliente(error instanceof Error ? error.message : "Não foi possível salvar a cliente.");
    }
  }

  async function handleSaveAtendimento(atendimento: Atendimento) {
    try {
      setErroAtendimento(null);
      const { id: _idPlaceholder, ...dados } = atendimento;
      await addAtendimento(dados);
      setFormAberto(null);
    } catch (error) {
      setErroAtendimento(error instanceof Error ? error.message : "Não foi possível salvar o atendimento.");
    }
  }

  function fecharForm() {
    setErroAgendamento(null);
    setErroCliente(null);
    setErroAtendimento(null);
    setFormAberto(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={ClockIcon} label={t.cards.proximoAtendimento} value={proximoAtendimentoLabel} tone="brand" />
        <StatCard icon={CalendarIcon} label={t.cards.agendamentosHoje} value={agendaHoje.length} />
        <StatCard
          icon={WalletIcon}
          label={t.cards.totalRecebidoHoje}
          value={visible ? formatCurrency(agregadoHoje.totalRecebido) : VALOR_OCULTO}
          tone="brand"
        />
        <StatCard
          icon={WalletIcon}
          label={t.cards.totalEstimadoDia}
          value={visible ? formatCurrency(resumoAgendaHoje.totalEstimado) : VALOR_OCULTO}
        />
        <StatCard
          icon={WalletIcon}
          label={t.cards.valoresPendentes}
          value={visible ? formatCurrency(valoresPendentes) : VALOR_OCULTO}
        />
        <StatCard icon={BellIcon} label={t.cards.lembretesAmanha} value={lembretes.length} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">{t.agendaHoje.titulo}</h2>
          <Link href="/agenda" className="text-sm font-medium text-brand hover:underline">
            {t.agendaHoje.verCompleta}
          </Link>
        </div>

        {agendaHoje.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/60">{t.agenda.grade.semAgendamento}</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {agendaHoje.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="w-20 shrink-0 text-sm font-medium text-foreground/70">
                    {formatMinutesAsTime(item.inicioMin)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {getCliente(item.clienteId)?.nomePreferencia ?? getCliente(item.clienteId)?.nome ?? "—"}
                    </p>
                    <p className="truncate text-sm text-foreground/60">{nomeServico(item)}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t.atalhos.titulo}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setFormAberto("agendamento")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <PlusIcon className="h-6 w-6 text-brand" />
            {t.atalhos.novoAgendamento}
          </button>
          <button
            type="button"
            onClick={() => setFormAberto("cliente")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <UserPlusIcon className="h-6 w-6 text-brand" />
            {t.atalhos.novaCliente}
          </button>
          <button
            type="button"
            onClick={() => setFormAberto("atendimento")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <ZapIcon className="h-6 w-6 text-brand" />
            {t.atalhos.encaixe}
          </button>
          <Link
            href="/agenda"
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <CalendarIcon className="h-6 w-6 text-brand" />
            {t.atalhos.verAgenda}
          </Link>
        </div>
      </section>

      {formAberto === "agendamento" && (
        <AgendaFormModal
          modo="criar"
          agendamento={null}
          dataPadrao={hoje}
          onClose={fecharForm}
          onSave={handleSaveAgendamento}
          erroSalvar={erroAgendamento}
        />
      )}

      {formAberto === "cliente" && (
        <ClienteFormModal modo="criar" cliente={null} onClose={fecharForm} onSave={handleSaveCliente} erroSalvar={erroCliente} />
      )}

      {formAberto === "atendimento" && (
        <AtendimentoFormModal
          modo="criar"
          atendimento={null}
          onClose={fecharForm}
          onSave={handleSaveAtendimento}
          erroSalvar={erroAtendimento}
        />
      )}
    </div>
  );
}
