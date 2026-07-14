"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { ServicoCard } from "@/components/ServicoCard";
import { ServicoDetailsPanel } from "@/components/ServicoDetailsPanel";
import { SearchIcon, PlusIcon } from "@/components/icons";
import { mockServicos, type ServicoStatus } from "@/lib/servicos-mock";

type Filtro = "todos" | "ativos" | "inativos";

export default function ServicosPage() {
  const { t } = useLanguage();
  const s = t.servicos;
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categorias = useMemo(
    () => Array.from(new Set(mockServicos.map((servico) => servico.categoria))),
    [],
  );

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return mockServicos.filter((servico) => {
      const statusOk =
        filtro === "todos" ||
        (filtro === "ativos" && servico.status === ("ativo" satisfies ServicoStatus)) ||
        (filtro === "inativos" && servico.status === ("inativo" satisfies ServicoStatus));
      if (!statusOk) return false;
      if (categoria !== "todas" && servico.categoria !== categoria) return false;
      if (!termo) return true;
      return servico.nome.toLowerCase().includes(termo);
    });
  }, [busca, categoria, filtro]);

  const servicoSelecionado = mockServicos.find((servico) => servico.id === selectedId) ?? null;
  const totalLabel = `${mockServicos.length} ${mockServicos.length === 1 ? s.contagemSingular : s.contagemPlural}`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{s.titulo}</h1>
            <p className="text-sm text-foreground/60">{totalLabel}</p>
          </div>
          <button
            type="button"
            title={t.misc.emConstrucao}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {s.novoServico}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder={s.buscarPlaceholder}
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 sm:w-56"
          >
            <option value="todas">{s.todasCategorias}</option>
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
          {(["todos", "ativos", "inativos"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setFiltro(opcao)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                filtro === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {s.filtros[opcao]}
            </button>
          ))}
        </div>

        {servicosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-foreground/60">{s.vazio}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {servicosFiltrados.map((servico) => (
              <ServicoCard
                key={servico.id}
                servico={servico}
                selected={servico.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </div>

      {servicoSelecionado && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <ServicoDetailsPanel servico={servicoSelecionado} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {servicoSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <ServicoDetailsPanel servico={servicoSelecionado} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
