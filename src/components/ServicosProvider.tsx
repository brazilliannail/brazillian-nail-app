"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { Servico } from "@/lib/servicos-mock";
import { createServicoAction, updateServicoAction, toggleStatusServicoAction } from "@/lib/servicos-actions";

type ServicosContextValue = {
  servicos: Servico[];
  getServico: (id: string) => Servico | undefined;
  addServico: (dados: Omit<Servico, "id">) => Promise<string>;
  updateServico: (servico: Servico) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
};

const ServicosContext = createContext<ServicosContextValue | null>(null);

/**
 * servicosIniciais vem do banco (via Server Component em layout.tsx) — sem fallback para mock aqui.
 * Toda escrita (criar/editar/inativar) persiste de fato no SQLite via Server Actions antes de
 * atualizar o estado local — nunca simula sucesso apenas em memória.
 */
export function ServicosProvider({
  children,
  servicosIniciais,
}: {
  children: React.ReactNode;
  servicosIniciais: Servico[];
}) {
  const [servicos, setServicos] = useState<Servico[]>(servicosIniciais);
  const router = useRouter();

  // servicosIniciais muda quando o layout raiz refaz a consulta ao banco (ver router.refresh()
  // abaixo, chamado após cada mutação) — sem isto, dados atualizados por outra aba/sessão nunca
  // apareceriam aqui. Ajuste feito durante a própria renderização (não em `useEffect`) — padrão
  // recomendado pelo React para sincronizar estado com uma prop que mudou.
  const [prevServicosIniciais, setPrevServicosIniciais] = useState(servicosIniciais);
  if (servicosIniciais !== prevServicosIniciais) {
    setPrevServicosIniciais(servicosIniciais);
    setServicos(servicosIniciais);
  }

  function getServico(id: string) {
    return servicos.find((servico) => servico.id === id);
  }

  async function addServico(dados: Omit<Servico, "id">) {
    const servicoCriado = await createServicoAction(dados);
    setServicos((prev) => [...prev, servicoCriado]);
    router.refresh();
    return servicoCriado.id;
  }

  async function updateServico(servico: Servico) {
    const servicoAtualizado = await updateServicoAction(servico);
    setServicos((prev) => prev.map((item) => (item.id === servicoAtualizado.id ? servicoAtualizado : item)));
    router.refresh();
  }

  async function toggleStatus(id: string) {
    const servicoAtualizado = await toggleStatusServicoAction(id);
    setServicos((prev) => prev.map((item) => (item.id === id ? servicoAtualizado : item)));
    router.refresh();
  }

  return (
    <ServicosContext.Provider value={{ servicos, getServico, addServico, updateServico, toggleStatus }}>
      {children}
    </ServicosContext.Provider>
  );
}

export function useServicos() {
  const context = useContext(ServicosContext);
  if (!context) {
    throw new Error("useServicos deve ser usado dentro de um ServicosProvider.");
  }
  return context;
}
