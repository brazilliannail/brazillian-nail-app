"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
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
  corrigirLancamentosAction,
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
  /** Mesma correção acima, mas para 2+ lançamentos do mesmo atendimento (ex.: serviço + gorjeta)
   * aplicados atomicamente em uma única transação — evita corrigir só um dos dois se o outro falhar. */
  corrigirLancamentos: (
    correcoes: { pagamentoId: string; dados: CorrigirLancamentoDados }[],
  ) => Promise<CorrigirLancamentoResultado[]>;
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
  const router = useRouter();

  // atendimentosIniciais muda quando o layout raiz refaz a consulta ao banco (ver router.refresh()
  // abaixo, chamado após cada mutação). Sem isto, o `useState` acima só usaria o valor inicial do
  // primeiro mount — qualquer dado atualizado por outra aba/sessão nunca apareceria aqui. Ajuste
  // feito durante a própria renderização (não em `useEffect`) — padrão recomendado pelo React para
  // sincronizar estado com uma prop que mudou, sem disparar uma renderização em cascata.
  const [prevAtendimentosIniciais, setPrevAtendimentosIniciais] = useState(atendimentosIniciais);
  if (atendimentosIniciais !== prevAtendimentosIniciais) {
    setPrevAtendimentosIniciais(atendimentosIniciais);
    setAtendimentos(atendimentosIniciais);
  }

  // AtendimentosProvider fica aninhado dentro de AgendaProvider (ver layout.tsx), então pode
  // refletir localmente o agendamento que as Server Actions já sincronizaram no banco.
  const { aplicarAgendamentoPersistido } = useAgenda();

  function getAtendimento(id: string) {
    return atendimentos.find((item) => item.id === id);
  }

  async function addAtendimento(dados: Omit<Atendimento, "id">) {
    const criado = await createAtendimentoAction(dados);
    setAtendimentos((prev) => [criado, ...prev]);
    router.refresh();
    return criado.id;
  }

  async function updateAtendimento(atendimento: Atendimento) {
    const atualizado = await updateAtendimentoAction(atendimento);
    setAtendimentos((prev) => prev.map((item) => (item.id === atualizado.id ? atualizado : item)));
    router.refresh();
  }

  async function concluirAtendimento(id: string, dados: ConcluirDados) {
    const { atendimento, agendamento } = await concluirAtendimentoAction(id, dados);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atendimento : item)));
    if (agendamento) aplicarAgendamentoPersistido(agendamento);
    router.refresh();
  }

  async function cancelarAtendimento(id: string) {
    const { atendimento, agendamento } = await cancelarAtendimentoAction(id);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atendimento : item)));
    if (agendamento) aplicarAgendamentoPersistido(agendamento);
    router.refresh();
  }

  async function iniciarAtendimentoDoAgendamento(agendamentoId: string) {
    const { atendimento, agendamento, criado } = await iniciarAtendimentoDoAgendamentoAction(agendamentoId);
    setAtendimentos((prev) =>
      prev.some((item) => item.id === atendimento.id)
        ? prev.map((item) => (item.id === atendimento.id ? atendimento : item))
        : [atendimento, ...prev],
    );
    aplicarAgendamentoPersistido(agendamento);
    router.refresh();
    return { id: atendimento.id, criado };
  }

  async function estornarAtendimento(id: string) {
    const atualizado = await estornarAtendimentoAction(id);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atualizado : item)));
    router.refresh();
  }

  async function registrarPagamentoAdicional(id: string, dados: RegistrarPagamentoAdicionalDados) {
    const atualizado = await registrarPagamentoAdicionalAction(id, dados);
    setAtendimentos((prev) => prev.map((item) => (item.id === id ? atualizado : item)));
    router.refresh();
  }

  async function corrigirLancamento(pagamentoId: string, dados: CorrigirLancamentoDados) {
    const resultado = await corrigirLancamentoAction(pagamentoId, dados);
    setAtendimentos((prev) => prev.map((item) => (item.id === resultado.atendimento.id ? resultado.atendimento : item)));
    router.refresh();
    return resultado;
  }

  async function corrigirLancamentos(correcoes: { pagamentoId: string; dados: CorrigirLancamentoDados }[]) {
    const resultados = await corrigirLancamentosAction(correcoes);
    setAtendimentos((prev) =>
      prev.map((item) => resultados.find((r) => r.atendimento.id === item.id)?.atendimento ?? item),
    );
    router.refresh();
    return resultados;
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
        corrigirLancamentos,
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
