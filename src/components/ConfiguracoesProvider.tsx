"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConfiguracoesState } from "@/lib/configuracoes-mock";
import { updateConfiguracoesAction } from "@/lib/configuracoes-actions";

type ConfiguracoesContextValue = {
  configuracoes: ConfiguracoesState;
  salvarConfiguracoes: (dados: ConfiguracoesState) => Promise<void>;
};

const ConfiguracoesContext = createContext<ConfiguracoesContextValue | null>(null);

/**
 * configuracoesIniciais vem do banco (via Server Component em layout.tsx) — sem fallback para
 * mock aqui. Toda escrita persiste de fato no SQLite via Server Action antes de atualizar o
 * estado local, seguindo o mesmo padrão de ServicosProvider/ClientesProvider.
 */
export function ConfiguracoesProvider({
  children,
  configuracoesIniciais,
}: {
  children: React.ReactNode;
  configuracoesIniciais: ConfiguracoesState;
}) {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesState>(configuracoesIniciais);
  const router = useRouter();

  const [prevConfiguracoesIniciais, setPrevConfiguracoesIniciais] = useState(configuracoesIniciais);
  if (configuracoesIniciais !== prevConfiguracoesIniciais) {
    setPrevConfiguracoesIniciais(configuracoesIniciais);
    setConfiguracoes(configuracoesIniciais);
  }

  async function salvarConfiguracoes(dados: ConfiguracoesState) {
    const salvo = await updateConfiguracoesAction(dados);
    setConfiguracoes(salvo);
    router.refresh();
  }

  return (
    <ConfiguracoesContext.Provider value={{ configuracoes, salvarConfiguracoes }}>
      {children}
    </ConfiguracoesContext.Provider>
  );
}

export function useConfiguracoes() {
  const context = useContext(ConfiguracoesContext);
  if (!context) {
    throw new Error("useConfiguracoes deve ser usado dentro de um ConfiguracoesProvider.");
  }
  return context;
}
