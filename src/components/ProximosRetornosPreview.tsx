"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { CloseIcon, AlertIcon } from "@/components/icons";
import { formatMinutesAsTime, isoToMMDDYYYY } from "@/lib/date";
import {
  calcularPropostasRetornoAction,
  confirmarRetornosAction,
  type ResultadoCalculoRetornos,
  type ResultadoItemRetorno,
} from "@/lib/proximos-retornos-actions";
import {
  alternarSelecaoRetorno,
  chaveGrupoColisao,
  chaveOrigemRetorno,
  decisoesIniciaisColisao,
  propostaSelecionavel,
  selecaoInicialRetornos,
  type DecisaoColisao,
  type PropostaRetorno,
} from "@/lib/proximos-retornos";

type ProximosRetornosPreviewProps = {
  atendimentoId: string;
  onClose: () => void;
};

// Referências estáveis para os fallbacks (evita recriar array a cada render e "sujar" deps).
const SEM_PROPOSTAS: PropostaRetorno[] = [];
const SEM_COLISOES: ResultadoCalculoRetornos["colisoes"] = [];

type Feedback = {
  gravados: number;
  jaExistentes: number;
  reconfirmar: boolean;
  semHorario: { servicoId: string; motivo: "diaFechado" | "diaSemHorarioLivre" | "semRetornoSugerido" }[];
};

/**
 * Prévia + confirmação de "Próximos Retornos".
 *
 * A prévia (`calcularPropostasRetornoAction`) é só leitura. Ao confirmar, `confirmarRetornosAction`
 * revalida tudo no servidor e grava apenas o que segue selecionado — a prévia nunca é garantia de
 * que o horário continua livre. Se algum horário mudou desde a prévia, o servidor devolve
 * `precisaReconfirmar` e esta tela recarrega a prévia para a Rosangela revisar de novo.
 */
export function ProximosRetornosPreview({ atendimentoId, onClose }: ProximosRetornosPreviewProps) {
  const { locale, t } = useLanguage();
  const { getCliente } = useClientes();
  const router = useRouter();
  const r = t.atendimentos.proximosRetornos;

  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
  const [resultado, setResultado] = useState<ResultadoCalculoRetornos | null>(null);
  const [selecionadas, setSelecionadas] = useState<ReadonlySet<string>>(new Set());
  const [decisoes, setDecisoes] = useState<Map<string, DecisaoColisao>>(new Map());
  const [enviando, setEnviando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const carregar = useCallback(async () => {
    setEstado("carregando");
    try {
      const res = await calcularPropostasRetornoAction(atendimentoId);
      setResultado(res);
      setSelecionadas(selecaoInicialRetornos(res.propostas));
      setDecisoes(decisoesIniciaisColisao(res.colisoes));
      setEstado("pronto");
      return res;
    } catch {
      setEstado("erro");
      return null;
    }
  }, [atendimentoId]);

  useEffect(() => {
    let ativo = true;
    calcularPropostasRetornoAction(atendimentoId)
      .then((res) => {
        if (!ativo) return;
        setResultado(res);
        setSelecionadas(selecaoInicialRetornos(res.propostas));
        setDecisoes(decisoesIniciaisColisao(res.colisoes));
        setEstado("pronto");
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, [atendimentoId]);

  const propostas = resultado?.propostas ?? SEM_PROPOSTAS;
  const colisoes = resultado?.colisoes ?? SEM_COLISOES;

  const nomeCliente = useMemo(() => {
    const clienteId = propostas[0]?.clienteId;
    if (!clienteId) return "—";
    const cliente = getCliente(clienteId);
    return cliente?.nomePreferencia ?? cliente?.nome ?? "—";
  }, [propostas, getCliente]);

  const nomePorServico = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of propostas) mapa.set(p.origem.servicoId, locale === "pt" ? p.servicoNomePt : p.servicoNomeEn);
    return mapa;
  }, [propostas, locale]);

  const totalSelecionaveis = propostas.filter(propostaSelecionavel).length;
  const podeConfirmar = estado === "pronto" && selecionadas.size > 0 && !enviando;

  function nomeServico(proposta: PropostaRetorno) {
    return locale === "pt" ? proposta.servicoNomePt : proposta.servicoNomeEn;
  }

  function toggle(proposta: PropostaRetorno) {
    setFeedback(null);
    setSelecionadas((atual) => alternarSelecaoRetorno(atual, proposta));
  }

  function definirDecisao(chave: string, decisao: DecisaoColisao) {
    setFeedback(null);
    setDecisoes((atual) => new Map(atual).set(chave, decisao));
  }

  function resumirItens(itens: ResultadoItemRetorno[]): Feedback {
    return {
      gravados: itens.filter((i) => i.tipo === "gravado").length,
      jaExistentes: itens.filter((i) => i.tipo === "jaExistente").length,
      reconfirmar: itens.some((i) => i.tipo === "reconfirmar"),
      semHorario: itens
        .filter((i): i is Extract<ResultadoItemRetorno, { tipo: "semHorario" }> => i.tipo === "semHorario")
        .map((i) => ({ servicoId: i.servicoId, motivo: i.motivo })),
    };
  }

  async function handleConfirmar() {
    if (!podeConfirmar) return;
    setEnviando(true);
    setErroConfirmar(null);
    setFeedback(null);
    try {
      const selecionados = propostas
        .filter((p) => selecionadas.has(chaveOrigemRetorno(p.origem)) && p.horarioPropostoMin !== null)
        .map((p) => ({ servicoId: p.origem.servicoId, dataIso: p.dataIso, horarioMin: p.horarioPropostoMin as number }));

      const colisoesPayload = colisoes.map((grupo) => ({
        servicoIds: grupo.propostas.map((p) => p.origem.servicoId),
        decisao: decisoes.get(chaveGrupoColisao(grupo)) ?? "separado",
        horarioMin: grupo.horarioMin,
      }));

      const res = await confirmarRetornosAction({ atendimentoId, selecionados, colisoes: colisoesPayload });
      const resumo = resumirItens(res.itens);
      setFeedback(resumo);

      if (res.gravados > 0) router.refresh();

      if (res.precisaReconfirmar) {
        // Algum horário mudou entre a prévia e a confirmação — recarrega a prévia (já refletindo
        // o que acabou de ser gravado) para a Rosangela revisar e confirmar de novo.
        await carregar();
        setFeedback(resumo);
      }
    } catch (error) {
      setErroConfirmar(error instanceof Error ? error.message : r.erroConfirmar);
    } finally {
      setEnviando(false);
    }
  }

  const motivoLabel: Record<Feedback["semHorario"][number]["motivo"], string> = {
    diaFechado: r.diaFechado,
    diaSemHorarioLivre: r.semHorario,
    semRetornoSugerido: r.semPropostas,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{r.titulo}</h3>
            <p className="mt-0.5 text-xs text-foreground/60">{r.subtitulo}</p>
            <p className="mt-1 truncate text-sm font-medium text-foreground">{nomeCliente}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            {r.fechar}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {estado === "carregando" && <p className="text-sm text-foreground/60">{r.carregando}</p>}
          {estado === "erro" && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {r.erro}
            </p>
          )}

          {estado === "pronto" && propostas.length === 0 && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/70">{r.semPropostas}</p>
          )}

          {estado === "pronto" && propostas.length > 0 && (
            <ul className="flex flex-col gap-3">
              {propostas.map((proposta) => {
                const chave = chaveOrigemRetorno(proposta.origem);
                const marcada = selecionadas.has(chave);
                const selecionavel = propostaSelecionavel(proposta);
                return (
                  <li
                    key={chave}
                    className={`flex gap-3 rounded-xl border p-3 ${
                      selecionavel ? "border-border" : "border-dashed border-border bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                      checked={marcada}
                      disabled={!selecionavel || enviando}
                      onChange={() => toggle(proposta)}
                      aria-label={nomeServico(proposta)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{nomeServico(proposta)}</p>
                      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-foreground/70">
                        <dt>{r.colunaData}</dt>
                        <dd className="font-medium text-foreground/90">{isoToMMDDYYYY(proposta.dataIso)}</dd>
                        <dt>{r.colunaHorario}</dt>
                        <dd className="font-medium text-foreground/90">
                          {proposta.horarioPropostoMin === null
                            ? "—"
                            : formatMinutesAsTime(proposta.horarioPropostoMin)}
                        </dd>
                        <dt>{r.colunaDuracao}</dt>
                        <dd className="font-medium text-foreground/90">
                          {proposta.duracaoMin} {r.minutos}
                        </dd>
                      </dl>

                      {proposta.horarioAlterado && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-status-aguardando">
                          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
                          {r.horarioAlterado} · {r.horarioOriginalEra}{" "}
                          {formatMinutesAsTime(proposta.horarioOriginalMin)}
                        </p>
                      )}
                      {!proposta.diaDeFuncionamento && (
                        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{r.diaFechado}</p>
                      )}
                      {proposta.diaDeFuncionamento && !proposta.disponivel && (
                        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{r.semHorario}</p>
                      )}
                      {proposta.jaAgendado && (
                        <p className="mt-1.5 text-xs font-medium text-foreground/60">{r.jaAgendado}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {estado === "pronto" &&
            colisoes.map((grupo) => {
              const chave = chaveGrupoColisao(grupo);
              const decisao = decisoes.get(chave) ?? "separado";
              const descricao = r.colisaoDescricao
                .replace("{data}", isoToMMDDYYYY(grupo.dataIso))
                .replace("{horario}", formatMinutesAsTime(grupo.horarioMin))
                .replace("{servicos}", grupo.propostas.map(nomeServico).join(" + "));
              return (
                <div
                  key={chave}
                  className="mt-4 rounded-xl border border-status-aguardando/40 bg-status-aguardando/10 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">{r.colisaoTitulo}</p>
                  <p className="mt-0.5 text-xs text-foreground/70">{descricao}</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {(["combinado", "separado"] as const).map((opcao) => (
                      <label key={opcao} className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="radio"
                          className="h-4 w-4 accent-brand"
                          name={`colisao-${chave}`}
                          checked={decisao === opcao}
                          disabled={enviando}
                          onChange={() => definirDecisao(chave, opcao)}
                        />
                        {opcao === "combinado" ? r.colisaoCombinado : r.colisaoSeparado}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

          {erroConfirmar && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {erroConfirmar}
            </p>
          )}

          {feedback && (
            <div className="mt-4 flex flex-col gap-2">
              {feedback.gravados > 0 && (
                <p className="rounded-xl border border-status-concluido/30 bg-status-concluido/10 px-3 py-2 text-sm font-medium text-status-concluido">
                  {r.sucesso.replace("{n}", String(feedback.gravados))}
                </p>
              )}
              {feedback.jaExistentes > 0 && (
                <p className="rounded-xl bg-muted px-3 py-2 text-xs text-foreground/70">
                  {r.jaExistentesAviso.replace("{n}", String(feedback.jaExistentes))}
                </p>
              )}
              {feedback.reconfirmar && (
                <p className="rounded-xl border border-status-aguardando/40 bg-status-aguardando/10 px-3 py-2 text-sm font-medium text-status-aguardando">
                  {r.reconfirmarAviso}
                </p>
              )}
              {feedback.semHorario.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <p className="font-medium">{r.semHorarioLista}</p>
                  <ul className="mt-1 list-disc pl-4">
                    {feedback.semHorario.map((s) => (
                      <li key={s.servicoId}>
                        {nomePorServico.get(s.servicoId) ?? s.servicoId} — {motivoLabel[s.motivo]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-5">
          <span className="text-xs text-foreground/60">
            {r.selecionadosResumo
              .replace("{n}", String(selecionadas.size))
              .replace("{total}", String(totalSelecionaveis))}
          </span>
          <button
            type="button"
            disabled={!podeConfirmar}
            onClick={handleConfirmar}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] ${
              podeConfirmar ? "bg-brand" : "cursor-not-allowed bg-brand/40"
            }`}
          >
            {enviando ? r.enviando : r.confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
