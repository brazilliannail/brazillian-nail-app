"use client";

import { createContext, useContext, useState } from "react";
import type { Atendimento, FormaPagamento, AtendimentoStatus } from "@/lib/atendimentos-mock";
import { useAgenda } from "@/components/AgendaProvider";
import {
  createAtendimentoAction,
  updateAtendimentoAction,
  concluirAtendimentoAction,
  cancelarAtendimentoAction,
  estornarAtendimentoAction,
  iniciarAtendimentoDoAgendamentoAction,
  registrarPagamentoAdicionalAction,
  corrigirLancamentoAction,
  type RegistrarPagamentoAdicionalDados,
  type CorrigirLancamentoDados,
  type CorrigirLancamentoResultado,
} from "@/lib/atendimentos-actions";

type ConcluirDados = {
  horarioFim: string;
  duracaoMin: number;
  valorRecebido: number;
  gorjeta: number;
  formaPagamento: FormaPagamento | null;
  status: Extract<AtendimentoStatus, "finalizadoPago" | "finalizadoPendente" | "finalizadoParcial" | "finalizadoCortesia">;
};

type AtendimentosContextValue = {
  atendimentos: Atendimento[];
  getAtendimento: (id: string) => Atendimento | undefined;
  addAtendimento: (dados: Omit<Atendimento, "id">) => Promise<string>;
  updateAtendimento: (atendimento: Atendimento) => Promise<void>;
  concluirAtendimento: (id: string, dados: ConcluirDados) => Promise<void>;
  cancelarAtendimento: (id: string) => Promise<void>;
  estornarAtendimento: (id: string) => Promise<void>;
  registrarPagamentoAdicional: (id: string, dados: RegistrarPagamentoAdicionalDados) => Promise<void>;
  /** Corrige um lançamento específico do ledger (valor/forma/observação). Devolve os lançamentos
   * recém-criados (estorno do original + entrada corrigida) para quem chamou poder atualizar o
   * cache local do Dashboard Financeiro (`FinanceiroProvider`) sem recarregar a página. */
  corrigirLancamento: (pagamentoId: string, dados: CorrigirLancamentoDados) => Promise<CorrigirLancamentoResultado>;
  /** Abre o atendimento de um agendamento da Agenda. `criado: false` = já existia um atendimento
   * ativo para aquele agendamento e ele foi apenas devolvido (proteção contra duplicidade). */
  iniciarAtendimentoDoAgendamento: (agendamentoId: string) => Promise<{ id: string; criado: boolean }>;
};

const AtendimentosContext = createContext<AtendimentosContextValue | null>(null);

/**
 * atendimentosIniciais vem do banco (via Server Component em layout.tsx) — sem fallback para mock aqui.
 * Toda escrita persiste de fato no SQLite via Server Actions antes de atualizar o estado local.
 */
export function AtendimentosProvider({
  children,
  atendimentosIniciais,
}: {
  children: React.ReactNode;
  atendimentosIniciais: Atendimento[];
}) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>(atendimentosIniciais);
  // AtendimentosProvider fica aninhado dentro de AgendaProvider (ver layout.tsx), então pode
  // refletir localmente o agendamento que as Server Actions já sincronizaram no banco.
  const { aplicarAgendamentoPersistido } = useAgenda();

  function getAtendimento(id: string) {
    return atendimentos.find((item) => item.id === id);
  }

  async function addAtendimento(dados: Omit<Atendimento, "id">) {
    const criado = await createAtendimentoAction(dados);
    setAtendimentos((prev) => [criado, ...prev]);
    return criado.id;
  }

  async function updateAtendimento(atendimento: Atendimento) {
    const atualizado = await updateAtendimentoAction(atendimento);
    setAtendimentos((prev) => prev.map((item) => (item.id === atualizado.id ? atualizado : item)));
  }

  async function concluirAtendimento(id: string, dados: ConcluirDados) {
    const { atendimento, agendamento } = await concluirAtendimentoAction(id, dados);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atendimento : item)));
    if (agendamento) aplicarAgendamentoPersistido(agendamento);
  }

  async function cancelarAtendimento(id: string) {
    const { atendimento, agendamento } = await cancelarAtendimentoAction(id);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atendimento : item)));
    if (agendamento) aplicarAgendamentoPersistido(agendamento);
  }

  async function iniciarAtendimentoDoAgendamento(agendamentoId: string) {
    const { atendimento, agendamento, criado } = await iniciarAtendimentoDoAgendamentoAction(agendamentoId);
    setAtendimentos((prev) =>
      prev.some((item) => item.id === atendimento.id)
        ? prev.map((item) => (item.id === atendimento.id ? atendimento : item))
        : [atendimento, ...prev],
    );
    aplicarAgendamentoPersistido(agendamento);
    return { id: atendimento.id, criado };
  }

  async function estornarAtendimento(id: string) {
    const atualizado = await estornarAtendimentoAction(id);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atualizado : item)));
  }

  async function registrarPagamentoAdicional(id: string, dados: RegistrarPagamentoAdicionalDados) {
    const atualizado = await registrarPagamentoAdicionalAction(id, dados);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atualizado : item)));
  }

  async function corrigirLancamento(pagamentoId: string, dados: CorrigirLancamentoDados) {
    const resultado = await corrigirLancamentoAction(pagamentoId, dados);
    setAtendimentos((prev) => prev.map((item) => (item.id === resultado.atendimento.id ? resultado.atendimento : item)));
    return resultado;
  }

  return (
    <AtendimentosContext.Provider
      value={{
        atendimentos,
        getAtendimento,
        addAtendimento,
        updateAtendimento,
        concluirAtendimento,
        cancelarAtendimento,
        estornarAtendimento,
        registrarPagamentoAdicional,
        corrigirLancamento,
        iniciarAtendimentoDoAgendamento,
      }}
    >
      {children}
    </AtendimentosContext.Provider>
  );
}

export function useAtendimentos() {
  const context = useContext(AtendimentosContext);
  if (!context) {
    throw new Error("useAtendimentos deve ser usado dentro de um AtendimentosProvider.");
  }
  return context;
}
