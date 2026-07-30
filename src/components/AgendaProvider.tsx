"use client";

import { createContext, useContext, useState } from "react";
import type { AgendaAppointment } from "@/lib/agenda-mock";
import type { StatusKey } from "@/lib/mock-data";
import {
  createAgendamentoAction,
  updateAgendamentoAction,
  updateStatusAgendamentoAction,
  reagendarAgendamentoAction,
} from "@/lib/agenda-actions";

type AgendaContextValue = {
  agendamentos: AgendaAppointment[];
  getAgendamento: (id: string) => AgendaAppointment | undefined;
  addAgendamento: (dados: Omit<AgendaAppointment, "id">) => Promise<string>;
  updateAgendamento: (agendamento: AgendaAppointment) => Promise<void>;
  updateStatus: (id: string, status: StatusKey) => Promise<void>;
  reagendar: (id: string, novaData: string, novoInicioMin: number, novoFimMin: number) => Promise<void>;
  /** Aplica no estado local um agendamento já persistido por outra ação (ex.: iniciar/concluir/
   * cancelar atendimento, que sincronizam a Agenda na mesma transação). Não escreve no banco —
   * evita uma segunda gravação só para refletir o que o servidor já devolveu. */
  aplicarAgendamentoPersistido: (agendamento: AgendaAppointment) => void;
};

const AgendaContext = createContext<AgendaContextValue | null>(null);

/**
 * agendamentosIniciais vem do banco (via Server Component em layout.tsx) — sem fallback para mock aqui.
 * Toda escrita (criar/editar/reagendar/mudar status) persiste de fato no SQLite via Server Actions
 * antes de atualizar o estado local — nunca simula sucesso apenas em memória.
 */
export function AgendaProvider({
  children,
  agendamentosIniciais,
}: {
  children: React.ReactNode;
  agendamentosIniciais: AgendaAppointment[];
}) {
  const [agendamentos, setAgendamentos] = useState<AgendaAppointment[]>(agendamentosIniciais);

  function getAgendamento(id: string) {
    return agendamentos.find((item) => item.id === id);
  }

  async function addAgendamento(dados: Omit<AgendaAppointment, "id">) {
    const criado = await createAgendamentoAction(dados);
    setAgendamentos((prev) => [...prev, criado]);
    return criado.id;
  }

  async function updateAgendamento(agendamento: AgendaAppointment) {
    const atualizado = await updateAgendamentoAction(agendamento);
    setAgendamentos((prev) => prev.map((item) => (item.id === atualizado.id ? atualizado : item)));
  }

  async function updateStatus(id: string, status: StatusKey) {
    const atualizado = await updateStatusAgendamentoAction(id, status);
    setAgendamentos((prev) => prev.map((item) => (item.id === id ? atualizado : item)));
  }

  async function reagendar(id: string, novaData: string, novoInicioMin: number, novoFimMin: number) {
    const atualizado = await reagendarAgendamentoAction(id, novaData, novoInicioMin, novoFimMin);
    setAgendamentos((prev) => prev.map((item) => (item.id === id ? atualizado : item)));
  }

  function aplicarAgendamentoPersistido(agendamento: AgendaAppointment) {
    setAgendamentos((prev) => prev.map((item) => (item.id === agendamento.id ? agendamento : item)));
  }

  return (
    <AgendaContext.Provider
      value={{
        agendamentos,
        getAgendamento,
        addAgendamento,
        updateAgendamento,
        updateStatus,
        reagendar,
        aplicarAgendamentoPersistido,
      }}
    >
      {children}
    </AgendaContext.Provider>
  );
}

export function useAgenda() {
  const context = useContext(AgendaContext);
  if (!context) {
    throw new Error("useAgenda deve ser usado dentro de um AgendaProvider.");
  }
  return context;
}
