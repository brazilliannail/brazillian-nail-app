"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lembrete, LembreteStatus } from "@/lib/lembretes-mock";
import {
  updateStatusLembreteAction,
  updateMensagemPersonalizadaAction,
  updateMensagemPersonalizadaSecundarioAction,
  registrarMensagemPreparadaAction,
} from "@/lib/lembretes-actions";

type LembretesContextValue = {
  lembretes: Lembrete[];
  updateStatus: (id: string, status: LembreteStatus) => Promise<void>;
  updateMensagem: (id: string, mensagem: string) => Promise<void>;
  updateMensagemSecundario: (id: string, mensagem: string) => Promise<void>;
  registrarMensagemPreparada: (dados: {
    lembreteId: string;
    papel: "principal" | "secundario";
    canal: "whatsapp" | "sms";
    idioma: "pt" | "en" | "bilingue";
    texto: string;
  }) => void;
};

const LembretesContext = createContext<LembretesContextValue | null>(null);

/**
 * lembretesIniciais vem do banco (via Server Component em layout.tsx), já com a geração
 * automática do dia aplicada (ver `getLembretesAmanha`) — sem fallback para mock aqui. Toda
 * escrita persiste de fato no SQLite via Server Action antes de atualizar o estado local, mesmo
 * padrão de AgendaProvider/ConfiguracoesProvider.
 */
export function LembretesProvider({
  children,
  lembretesIniciais,
}: {
  children: React.ReactNode;
  lembretesIniciais: Lembrete[];
}) {
  const [lembretes, setLembretes] = useState<Lembrete[]>(lembretesIniciais);
  const router = useRouter();

  const [prevLembretesIniciais, setPrevLembretesIniciais] = useState(lembretesIniciais);
  if (lembretesIniciais !== prevLembretesIniciais) {
    setPrevLembretesIniciais(lembretesIniciais);
    setLembretes(lembretesIniciais);
  }

  async function updateStatus(id: string, status: LembreteStatus) {
    await updateStatusLembreteAction(id, status);
    setLembretes((prev) => prev.map((item) => (item.id === id ? { ...item, statusLembrete: status } : item)));
    router.refresh();
  }

  async function updateMensagem(id: string, mensagem: string) {
    await updateMensagemPersonalizadaAction(id, mensagem);
    setLembretes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, mensagemPersonalizada: mensagem } : item)),
    );
  }

  async function updateMensagemSecundario(id: string, mensagem: string) {
    await updateMensagemPersonalizadaSecundarioAction(id, mensagem);
    setLembretes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, mensagemPersonalizadaSecundario: mensagem } : item)),
    );
  }

  // Fire-and-forget: só audita o que foi preparado (ver mensagens_log), não deve bloquear o clique
  // no link de WhatsApp/SMS nem exigir que a usuária espere uma resposta do servidor.
  function registrarMensagemPreparada(dados: {
    lembreteId: string;
    papel: "principal" | "secundario";
    canal: "whatsapp" | "sms";
    idioma: "pt" | "en" | "bilingue";
    texto: string;
  }) {
    void registrarMensagemPreparadaAction(dados);
  }

  return (
    <LembretesContext.Provider
      value={{ lembretes, updateStatus, updateMensagem, updateMensagemSecundario, registrarMensagemPreparada }}
    >
      {children}
    </LembretesContext.Provider>
  );
}

export function useLembretes() {
  const context = useContext(LembretesContext);
  if (!context) {
    throw new Error("useLembretes deve ser usado dentro de um LembretesProvider.");
  }
  return context;
}
