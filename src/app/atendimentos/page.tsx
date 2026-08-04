"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useAtendimentos } from "@/components/AtendimentosProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useLancamentosCaixa } from "@/components/FinanceiroProvider";
import { AtendimentoCard } from "@/components/AtendimentoCard";
import { AtendimentoDetailsPanel } from "@/components/AtendimentoDetailsPanel";
import { AtendimentoFormModal } from "@/components/AtendimentoFormModal";
import { ConcluirAtendimentoModal } from "@/components/ConcluirAtendimentoModal";
import { AdicionarPagamentoModal } from "@/components/AdicionarPagamentoModal";
import { PlusIcon } from "@/components/icons";
import { saldoPendente, type Atendimento } from "@/lib/atendimentos-mock";
import type { RegistrarPagamentoAdicionalDados } from "@/lib/atendimentos-actions";
import { buscarAtendimentoFinanceiro } from "@/lib/financeiro-service";

type Filtro = "todos" | "emAndamento" | "finalizados" | "pagamentoPendente" | "cancelados";
type FormState = { modo: "criar" } | { modo: "editar"; atendimento: Atendimento } | null;

export default function AtendimentosPage() {
  const { t } = useLanguage();
  const a = t.atendimentos;
  const {
    atendimentos,
    addAtendimento,
    updateAtendimento,
    concluirAtendimento,
    cancelarAtendimento,
    estornarAtendimento,
    registrarPagamentoAdicional,
  } = useAtendimentos();
  const { clientes } = useClientes();
  const lancamentosCaixa = useLancamentosCaixa();
  const searchParams = useSearchParams();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // Deep-link vindo do Financeiro ("Abrir atendimento" → /atendimentos?id=ATD-000001):
  // pré-seleciona o atendimento na primeira renderização, sem alterar o fluxo de seleção normal.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("id"));
  const [formState, setFormState] = useState<FormState>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [registrandoPagamento, setRegistrandoPagamento] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroConcluir, setErroConcluir] = useState<string | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);
  const [erroRegistrarPagamento, setErroRegistrarPagamento] = useState<string | null>(null);

  const clientesPorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter((atendimento) => {
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
  }, [filtro, atendimentos]);

  const atendimentoSelecionado = atendimentos.find((item) => item.id === selectedId) ?? null;
  const totalLabel = `${atendimentos.length} ${atendimentos.length === 1 ? a.contagemSingular : a.contagemPlural}`;

  // Mesma composição usada pelo Financeiro (`financeiro-service.ts`) para o modal de registrar
  // pagamento — reaproveitada aqui, não reimplementada, para nunca divergir do saldo/status
  // calculados a partir do ledger.
  const pagamentoFinanceiroSelecionado = atendimentoSelecionado
    ? buscarAtendimentoFinanceiro(atendimentoSelecionado.id, atendimentos, clientesPorId, lancamentosCaixa)
    : null;

  async function handleSaveAtendimento(atendimento: Atendimento) {
    try {
      setErroFormulario(null);
      if (formState?.modo === "editar") {
        await updateAtendimento(atendimento);
        setSelectedId(atendimento.id);
      } else {
        const { id: _idPlaceholder, ...dados } = atendimento;
        void _idPlaceholder;
        const novoId = await addAtendimento(dados);
        setSelectedId(novoId);
      }
      setFormState(null);
    } catch (error) {
      setErroFormulario(error instanceof Error ? error.message : "Não foi possível salvar o atendimento.");
    }
  }

  async function handleConcluir(dados: Parameters<typeof concluirAtendimento>[1]) {
    if (!atendimentoSelecionado) return;
    try {
      setErroConcluir(null);
      await concluirAtendimento(atendimentoSelecionado.id, dados);
      setConcluindo(false);
    } catch (error) {
      setErroConcluir(error instanceof Error ? error.message : "Não foi possível concluir o atendimento.");
    }
  }

  async function handleCancelar() {
    if (!atendimentoSelecionado) return;
    try {
      setErroOperacao(null);
      await cancelarAtendimento(atendimentoSelecionado.id);
    } catch (error) {
      setErroOperacao(error instanceof Error ? error.message : "Não foi possível cancelar o atendimento.");
    }
  }

  async function handleEstornar() {
    if (!atendimentoSelecionado) return;
    try {
      setErroOperacao(null);
      await estornarAtendimento(atendimentoSelecionado.id);
    } catch (error) {
      setErroOperacao(error instanceof Error ? error.message : "Não foi possível estornar o atendimento.");
    }
  }

  async function handleConfirmarPagamento(dados: RegistrarPagamentoAdicionalDados) {
    if (!atendimentoSelecionado) return;
    try {
      setErroRegistrarPagamento(null);
      await registrarPagamentoAdicional(atendimentoSelecionado.id, dados);
      setRegistrandoPagamento(false);
    } catch (error) {
      setErroRegistrarPagamento(
        error instanceof Error ? error.message : "Não foi possível registrar o pagamento.",
      );
    }
  }

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
            onClick={() => setFormState({ modo: "criar" })}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {a.novoAtendimento}
          </button>
        </div>

        {erroOperacao && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erroOperacao}
          </div>
        )}

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
          <AtendimentoDetailsPanel
            atendimento={atendimentoSelecionado}
            onClose={() => setSelectedId(null)}
            onEdit={() => setFormState({ modo: "editar", atendimento: atendimentoSelecionado })}
            onConcluir={() => setConcluindo(true)}
            onCancelar={handleCancelar}
            onEstornar={handleEstornar}
            onRegistrarPagamento={() => {
              setErroRegistrarPagamento(null);
              setRegistrandoPagamento(true);
            }}
          />
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
            <AtendimentoDetailsPanel
              atendimento={atendimentoSelecionado}
              onClose={() => setSelectedId(null)}
              onEdit={() => setFormState({ modo: "editar", atendimento: atendimentoSelecionado })}
              onConcluir={() => setConcluindo(true)}
              onCancelar={handleCancelar}
              onEstornar={handleEstornar}
              onRegistrarPagamento={() => {
                setErroRegistrarPagamento(null);
                setRegistrandoPagamento(true);
              }}
            />
          </div>
        </div>
      )}

      {formState && (
        <AtendimentoFormModal
          modo={formState.modo}
          atendimento={formState.modo === "editar" ? formState.atendimento : null}
          onClose={() => {
            setErroFormulario(null);
            setFormState(null);
          }}
          onSave={handleSaveAtendimento}
          erroSalvar={erroFormulario}
        />
      )}

      {concluindo && atendimentoSelecionado && (
        <ConcluirAtendimentoModal
          atendimento={atendimentoSelecionado}
          onClose={() => {
            setErroConcluir(null);
            setConcluindo(false);
          }}
          onConcluir={handleConcluir}
          erroSalvar={erroConcluir}
        />
      )}

      {registrandoPagamento && pagamentoFinanceiroSelecionado && (
        <AdicionarPagamentoModal
          pagamento={pagamentoFinanceiroSelecionado}
          onClose={() => {
            setErroRegistrarPagamento(null);
            setRegistrandoPagamento(false);
          }}
          onConfirmar={handleConfirmarPagamento}
          erroSalvar={erroRegistrarPagamento}
        />
      )}
    </div>
  );
}
