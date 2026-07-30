"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "@/lib/clientes-mock";
import { createClienteAction, updateClienteAction, toggleStatusClienteAction } from "@/lib/clientes-actions";

type ClientesContextValue = {
  clientes: Cliente[];
  getCliente: (id: string) => Cliente | undefined;
  addCliente: (dados: Omit<Cliente, "id">) => Promise<string>;
  updateCliente: (cliente: Cliente) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
};

const ClientesContext = createContext<ClientesContextValue | null>(null);

/**
 * clientesIniciais vem do banco (via Server Component em layout.tsx) — sem fallback para mock aqui.
 * Toda escrita (criar/editar/inativar) persiste de fato no SQLite via Server Actions antes de
 * atualizar o estado local — nunca simula sucesso apenas em memória.
 */
export function ClientesProvider({
  children,
  clientesIniciais,
}: {
  children: React.ReactNode;
  clientesIniciais: Cliente[];
}) {
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciais);
  const router = useRouter();

  // clientesIniciais muda quando o layout raiz refaz a consulta ao banco (ver router.refresh()
  // abaixo, chamado após cada mutação) — sem isto, dados atualizados por outra aba/sessão nunca
  // apareceriam aqui. Ajuste feito durante a própria renderização (não em `useEffect`) — padrão
  // recomendado pelo React para sincronizar estado com uma prop que mudou.
  const [prevClientesIniciais, setPrevClientesIniciais] = useState(clientesIniciais);
  if (clientesIniciais !== prevClientesIniciais) {
    setPrevClientesIniciais(clientesIniciais);
    setClientes(clientesIniciais);
  }

  function getCliente(id: string) {
    return clientes.find((cliente) => cliente.id === id);
  }

  async function addCliente(dados: Omit<Cliente, "id">) {
    const clienteCriado = await createClienteAction(dados);
    setClientes((prev) => [clienteCriado, ...prev]);
    router.refresh();
    return clienteCriado.id;
  }

  async function updateCliente(cliente: Cliente) {
    const clienteAtualizado = await updateClienteAction(cliente);
    setClientes((prev) => prev.map((item) => (item.id === clienteAtualizado.id ? clienteAtualizado : item)));
    router.refresh();
  }

  async function toggleStatus(id: string) {
    const clienteAtualizado = await toggleStatusClienteAction(id);
    setClientes((prev) => prev.map((item) => (item.id === id ? clienteAtualizado : item)));
    router.refresh();
  }

  return (
    <ClientesContext.Provider value={{ clientes, getCliente, addCliente, updateCliente, toggleStatus }}>
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const context = useContext(ClientesContext);
  if (!context) {
    throw new Error("useClientes deve ser usado dentro de um ClientesProvider.");
  }
  return context;
}
