"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { ClienteCard } from "@/components/ClienteCard";
import { ClienteDetailsPanel } from "@/components/ClienteDetailsPanel";
import { ClienteFormModal } from "@/components/ClienteFormModal";
import { SearchIcon, UserPlusIcon } from "@/components/icons";
import type { Cliente, ClienteStatus } from "@/lib/clientes-mock";

type Filtro = "todas" | "ativas" | "inativas";
type FormState = { modo: "criar" } | { modo: "editar"; cliente: Cliente } | null;

export default function ClientesPage() {
  const { t } = useLanguage();
  const c = t.clientes;
  const { clientes, addCliente, updateCliente, toggleStatus } = useClientes();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  // Deep-link vindo do Financeiro ("Abrir cliente" → /clientes?id=CLI-000001): pré-seleciona a
  // cliente na primeira renderização, sem alterar o fluxo de seleção normal.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("id"));
  const [formState, setFormState] = useState<FormState>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);

  const clientesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const statusOk =
        filtro === "todas" ||
        (filtro === "ativas" && cliente.status === ("ativa" satisfies ClienteStatus)) ||
        (filtro === "inativas" && cliente.status === ("inativa" satisfies ClienteStatus));
      if (!statusOk) return false;
      if (!termo) return true;
      const nomeOk =
        cliente.nome.toLowerCase().includes(termo) ||
        (cliente.nomePreferencia?.toLowerCase().includes(termo) ?? false);
      const telefoneOk =
        (cliente.contatoPrincipal?.telefone.toLowerCase().includes(termo) ?? false) ||
        (cliente.contatoSecundario?.telefone.toLowerCase().includes(termo) ?? false);
      return nomeOk || telefoneOk;
    });
  }, [busca, filtro, clientes]);

  const clienteSelecionada = clientes.find((cliente) => cliente.id === selectedId) ?? null;
  const totalLabel = `${clientes.length} ${clientes.length === 1 ? c.contagemSingular : c.contagemPlural}`;

  async function handleSaveCliente(cliente: Cliente) {
    try {
      setErroFormulario(null);
      if (formState?.modo === "editar") {
        await updateCliente(cliente);
        setSelectedId(cliente.id);
      } else {
        const { id: _idPlaceholder, ...dados } = cliente;
        const novoId = await addCliente(dados);
        setSelectedId(novoId);
      }
      setFormState(null);
    } catch (error) {
      setErroFormulario(error instanceof Error ? error.message : "Não foi possível salvar a cliente.");
    }
  }

  async function handleToggleStatus(id: string) {
    try {
      setErroOperacao(null);
      await toggleStatus(id);
    } catch (error) {
      setErroOperacao(error instanceof Error ? error.message : "Não foi possível atualizar o status da cliente.");
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t.nav.clientes}</h1>
            <p className="text-sm text-foreground/60">{totalLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormState({ modo: "criar" })}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <UserPlusIcon className="h-4 w-4" />
            {c.novaCliente}
          </button>
        </div>

        {erroOperacao && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erroOperacao}
          </div>
        )}

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder={c.buscarPlaceholder}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
          {(["todas", "ativas", "inativas"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setFiltro(opcao)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                filtro === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {c.filtros[opcao]}
            </button>
          ))}
        </div>

        {clientesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-foreground/60">{c.vazio}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {clientesFiltradas.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                selected={cliente.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </div>

      {clienteSelecionada && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <ClienteDetailsPanel
            cliente={clienteSelecionada}
            onClose={() => setSelectedId(null)}
            onEdit={() => setFormState({ modo: "editar", cliente: clienteSelecionada })}
            onToggleStatus={() => handleToggleStatus(clienteSelecionada.id)}
          />
        </div>
      )}

      {clienteSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <ClienteDetailsPanel
              cliente={clienteSelecionada}
              onClose={() => setSelectedId(null)}
              onEdit={() => setFormState({ modo: "editar", cliente: clienteSelecionada })}
              onToggleStatus={() => handleToggleStatus(clienteSelecionada.id)}
            />
          </div>
        </div>
      )}

      {formState && (
        <ClienteFormModal
          modo={formState.modo}
          cliente={formState.modo === "editar" ? formState.cliente : null}
          onClose={() => {
            setErroFormulario(null);
            setFormState(null);
          }}
          onSave={handleSaveCliente}
          erroSalvar={erroFormulario}
        />
      )}
    </div>
  );
}
