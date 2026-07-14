"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { AtendimentoCard } from "@/components/AtendimentoCard";
import { AtendimentoDetailsPanel } from "@/components/AtendimentoDetailsPanel";
import { PlusIcon } from "@/components/icons";
import { mockAtendimentos, saldoPendente } from "@/lib/atendimentos-mock";

type Filtro = "todos" | "emAndamento" | "finalizados" | "pagamentoPendente" | "cancelados";

export default function AtendimentosPage() {
  const { t } = useLanguage();
  const a = t.atendimentos;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const atendimentosFiltrados = useMemo(() => {
    return mockAtendimentos.filter((atendimento) => {
      switch (filtro) {
        case "todos":
          return true;
        case "emAndamento":
          return atendimento.status === "emAndamento";
        case "finalizados":
          return atendimento.status.startsWith("finalizado");
        case "pagamentoPendente":
          return saldoPendente(atendimento) > 0;
        case "cancelados":
          return atendimento.status === "cancelado" || atendimento.status === "estornado";
        default:
          return true;
      }
    });
  }, [filtro]);

  const atendimentoSelecionado = mockAtendimentos.find((item) => item.id === selectedId) ?? null;
  const totalLabel = `${mockAtendimentos.length} ${mockAtendimentos.length === 1 ? a.contagemSingular : a.contagemPlural}`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{a.titulo}</h1>
            <p className="text-sm text-foreground/60">{totalLabel}</p>
          </div>
          <button
            type="button"
            title={t.misc.emConstrucao}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {a.novoAtendimento}
          </button>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          {(["todos", "emAndamento", "finalizados", "pagamentoPendente", "cancelados"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setFiltro(opcao)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filtro === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {a.filtros[opcao]}
            </button>
          ))}
        </div>

        {atendimentosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-foreground/60">{a.vazio}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {atendimentosFiltrados.map((atendimento) => (
              <AtendimentoCard
                key={atendimento.id}
                atendimento={atendimento}
                selected={atendimento.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </div>

      {atendimentoSelecionado && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <AtendimentoDetailsPanel atendimento={atendimentoSelecionado} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {atendimentoSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <AtendimentoDetailsPanel atendimento={atendimentoSelecionado} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
