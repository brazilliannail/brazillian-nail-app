"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useServicos } from "@/components/ServicosProvider";
import { useAgenda } from "@/components/AgendaProvider";
import { CloseIcon, PlusIcon, AlertIcon } from "@/components/icons";
import { financasTravadas, type Atendimento, type ServicoRealizado } from "@/lib/atendimentos-mock";
import { formatDateISO, parseDateISO, formatDateMMDDYYYY, parseDateMMDDYYYY, formatMinutesAsTime } from "@/lib/date";
import { buildTimeBoundaries } from "@/lib/agenda-mock";

type AtendimentoFormModalProps = {
  modo: "criar" | "editar";
  atendimento: Atendimento | null;
  onClose: () => void;
  onSave: (atendimento: Atendimento) => void;
  erroSalvar?: string | null;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

type ServicoLinha = {
  key: string;
  servicoId: string;
  nomePt: string;
  nomeEn: string;
  valor: string;
};

let proximaKey = 0;
function novaLinha(partial?: Partial<ServicoLinha>): ServicoLinha {
  proximaKey += 1;
  return { key: `linha-${proximaKey}`, servicoId: "", nomePt: "", nomeEn: "", valor: "", ...partial };
}

function linhasIniciais(servicos: ServicoRealizado[]): ServicoLinha[] {
  if (servicos.length === 0) return [novaLinha()];
  return servicos.map((servico) =>
    novaLinha({
      servicoId: servico.servicoId ?? "",
      nomePt: servico.nomePt,
      nomeEn: servico.nomeEn,
      valor: String(servico.valor),
    }),
  );
}

export function AtendimentoFormModal({ modo, atendimento, onClose, onSave, erroSalvar }: AtendimentoFormModalProps) {
  const { t } = useLanguage();
  const { clientes } = useClientes();
  const { servicos } = useServicos();
  const { agendamentos } = useAgenda();
  const f = t.atendimentos.formulario;

  const [clienteId, setClienteId] = useState(atendimento?.clienteId ?? "");
  const [agendamentoId, setAgendamentoId] = useState(atendimento?.agendamentoId ?? "");
  const [profissional, setProfissional] = useState(atendimento?.profissional ?? "Rosângela");
  const [dataIso, setDataIso] = useState(() =>
    atendimento ? formatDateISO(parseDateMMDDYYYY(atendimento.data)) : formatDateISO(new Date()),
  );
  const [inicioMin, setInicioMin] = useState(() => {
    if (!atendimento) return buildTimeBoundaries()[0];
    const encontrado = buildTimeBoundaries().find((min) => formatMinutesAsTime(min) === atendimento.horarioInicio);
    return encontrado ?? buildTimeBoundaries()[0];
  });
  const [linhas, setLinhas] = useState<ServicoLinha[]>(() => linhasIniciais(atendimento?.servicos ?? []));
  const [desconto, setDesconto] = useState(String(atendimento?.desconto ?? 0));
  const [observacoesPt, setObservacoesPt] = useState(atendimento?.observacoesPt ?? "");
  const [observacoesEn, setObservacoesEn] = useState(atendimento?.observacoesEn ?? "");
  const [retornoSugeridoDias, setRetornoSugeridoDias] = useState(
    atendimento?.retornoSugeridoDias !== null && atendimento?.retornoSugeridoDias !== undefined
      ? String(atendimento.retornoSugeridoDias)
      : "",
  );

  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  // Assim que o atendimento sai de "emAndamento" — mesmo sem nenhum pagamento real registrado —,
  // serviço/valor/desconto ficam travados (mesma regra de financasTravadas usada no servidor,
  // em updateAtendimentoAction). Em modo "criar" nunca há trava. O servidor continua sendo a
  // fonte da verdade (permite recompor a lista de serviços desde que o total não mude); esta
  // trava na UI é deliberadamente mais conservadora — desabilita a seção inteira de
  // serviço/valor/desconto — para deixar o bloqueio óbvio antes do clique em salvar, em vez de
  // deixar a profissional descobrir a regra só depois de um erro do servidor.
  const travado = atendimento != null && financasTravadas(atendimento.status);

  const servicosAtivos = servicos.filter((servico) => servico.status === "ativo");
  const agendamentosDaCliente = agendamentos.filter((ag) => ag.clienteId === clienteId);
  const horarios = buildTimeBoundaries();

  function atualizarLinha(key: string, patch: Partial<ServicoLinha>) {
    setLinhas((prev) => prev.map((linha) => (linha.key === key ? { ...linha, ...patch } : linha)));
  }

  function handleServicoCatalogoChange(key: string, servicoId: string) {
    if (travado) return;
    if (servicoId === "") {
      atualizarLinha(key, { servicoId: "", nomePt: "", nomeEn: "" });
      return;
    }
    const servico = servicos.find((item) => item.id === servicoId);
    atualizarLinha(key, {
      servicoId,
      nomePt: servico?.nome ?? "",
      nomeEn: "",
      valor: servico ? String(servico.precoPadrao) : "",
    });
  }

  function adicionarLinha() {
    if (travado) return;
    setLinhas((prev) => [...prev, novaLinha()]);
  }

  function removerLinha(key: string) {
    if (travado) return;
    setLinhas((prev) => (prev.length > 1 ? prev.filter((linha) => linha.key !== key) : prev));
  }

  function validarESalvar(): boolean {
    if (clienteId.trim() === "") {
      setErro(f.erros.clienteObrigatoria);
      return false;
    }
    if (profissional.trim() === "") {
      setErro(f.erros.profissionalObrigatoria);
      return false;
    }
    if (linhas.length === 0) {
      setErro(f.erros.servicoObrigatorio);
      return false;
    }
    for (const linha of linhas) {
      if (linha.nomePt.trim() === "") {
        setErro(f.erros.nomeServicoObrigatorio);
        return false;
      }
      const valorNum = Number(linha.valor);
      if (Number.isNaN(valorNum) || valorNum < 0) {
        setErro(f.erros.valorInvalido);
        return false;
      }
    }
    const descontoNum = Number(desconto) || 0;
    if (descontoNum < 0) {
      setErro(f.erros.valoresNegativos);
      return false;
    }

    setErro(null);

    const servicosRealizados: ServicoRealizado[] = linhas.map((linha) => ({
      servicoId: linha.servicoId === "" ? null : linha.servicoId,
      nomePt: linha.nomePt.trim(),
      nomeEn: linha.nomeEn.trim(),
      valor: Number(linha.valor),
    }));
    // Reforço defensivo: os campos de valor/desconto ficam desabilitados na UI quando `travado`,
    // mas o total enviado ao servidor é sempre recomputado a partir do atendimento original nesse
    // caso — nunca confia só no atributo `disabled` do input.
    const descontoFinal = travado ? (atendimento?.desconto ?? 0) : Number(desconto) || 0;
    const servicosFinais = travado ? (atendimento?.servicos ?? []) : servicosRealizados;

    const atendimentoBase: Atendimento = atendimento ?? {
      // Identificador definitivo (padrão ATD-000001) é gerado pelo AtendimentosProvider ao cadastrar.
      id: "",
      clienteId: "",
      agendamentoId: null,
      profissional: "",
      data: "",
      horarioInicio: "",
      horarioFim: null,
      duracaoMin: null,
      servicos: [],
      desconto: 0,
      gorjeta: 0,
      valorRecebido: 0,
      formaPagamento: null,
      status: "emAndamento",
      observacoesPt: "",
      observacoesEn: "",
      retornoSugeridoDias: null,
      proximoAgendamentoId: null,
    };

    onSave({
      ...atendimentoBase,
      clienteId,
      agendamentoId: agendamentoId === "" ? null : agendamentoId,
      profissional: profissional.trim(),
      data: formatDateMMDDYYYY(parseDateISO(dataIso)),
      horarioInicio: formatMinutesAsTime(inicioMin),
      servicos: servicosFinais,
      desconto: descontoFinal,
      observacoesPt: observacoesPt.trim(),
      observacoesEn: observacoesEn.trim(),
      retornoSugeridoDias: retornoSugeridoDias.trim() === "" ? null : Number(retornoSugeridoDias),
    });

    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    validarESalvar();
  }

  function tentarFechar() {
    setConfirmandoFechar(true);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={tentarFechar}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:mx-4 sm:max-w-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {modo === "criar" ? f.tituloCriar : f.tituloEditar}
          </h3>
          <button
            type="button"
            onClick={tentarFechar}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            {f.fechar}
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.cliente}</span>
            <select
              value={clienteId}
              onChange={(event) => {
                setClienteId(event.target.value);
                setAgendamentoId("");
              }}
              className={inputClass}
            >
              <option value="">{f.clientePlaceholder}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nomePreferencia ?? cliente.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.agendamento}</span>
            <select value={agendamentoId} onChange={(event) => setAgendamentoId(event.target.value)} className={inputClass}>
              <option value="">{f.agendamentoNenhum}</option>
              {agendamentosDaCliente.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.data} · {formatMinutesAsTime(ag.inicioMin)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.profissional}</span>
              <input
                type="text"
                value={profissional}
                onChange={(event) => setProfissional(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.data}</span>
              <input type="date" value={dataIso} onChange={(event) => setDataIso(event.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.horarioInicio}</span>
            <select value={inicioMin} onChange={(event) => setInicioMin(Number(event.target.value))} className={inputClass}>
              {horarios.map((min) => (
                <option key={min} value={min}>
                  {formatMinutesAsTime(min)}
                </option>
              ))}
            </select>
          </label>

          {travado && (
            <div className="flex items-start gap-2 rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 px-3 py-2.5 text-sm text-foreground/80">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-aguardando" />
              <span>{f.financasTravadas}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">{f.servicosRealizados}</p>
            {linhas.map((linha) => (
              <div key={linha.key} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={linha.servicoId}
                    onChange={(event) => handleServicoCatalogoChange(linha.key, event.target.value)}
                    disabled={travado}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="">{f.servicoAvulso}</option>
                    {servicosAtivos.map((servico) => (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome}
                      </option>
                    ))}
                  </select>
                  {linhas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerLinha(linha.key)}
                      disabled={travado}
                      className="flex shrink-0 items-center justify-center rounded-full border border-border p-2 text-foreground/60 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                      aria-label={f.removerServico}
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {linha.servicoId === "" && (
                  <input
                    type="text"
                    value={linha.nomePt}
                    onChange={(event) => atualizarLinha(linha.key, { nomePt: event.target.value })}
                    placeholder={f.nomeServicoAvulso}
                    disabled={travado}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  />
                )}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linha.valor}
                  onChange={(event) => atualizarLinha(linha.key, { valor: event.target.value })}
                  placeholder={f.valorServico}
                  disabled={travado}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={adicionarLinha}
              disabled={travado}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              <PlusIcon className="h-4 w-4" />
              {f.adicionarServico}
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.desconto}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={desconto}
              onChange={(event) => setDesconto(event.target.value)}
              disabled={travado}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.retornoSugeridoDias}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={retornoSugeridoDias}
              onChange={(event) => setRetornoSugeridoDias(event.target.value)}
              placeholder={f.retornoSugeridoPlaceholder}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.observacoesPt}</span>
            <textarea
              rows={2}
              value={observacoesPt}
              onChange={(event) => setObservacoesPt(event.target.value)}
              placeholder={f.observacoesPlaceholder}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.observacoesEn}</span>
            <textarea
              rows={2}
              value={observacoesEn}
              onChange={(event) => setObservacoesEn(event.target.value)}
              placeholder={f.observacoesPlaceholder}
              className={inputClass}
            />
          </label>
        </div>

        {(erro || erroSalvar) && (
          <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erro ?? erroSalvar}
          </div>
        )}

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-surface p-5">
          <button
            type="button"
            onClick={tentarFechar}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            {f.botoes.cancelar}
          </button>
          <button
            type="submit"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {f.botoes.salvar}
          </button>
        </div>
      </form>

      {confirmandoFechar && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-aguardando/10 text-status-aguardando">
                <AlertIcon className="h-5 w-5" />
              </span>
              <p className="pt-1.5 text-sm font-semibold text-foreground">{f.alteracoesNaoSalvas.titulo}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmandoFechar(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                {f.alteracoesNaoSalvas.cancelar}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmandoFechar(false);
                  onClose();
                }}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {f.alteracoesNaoSalvas.descartar}
              </button>
              <button
                type="button"
                onClick={() => {
                  const salvou = validarESalvar();
                  if (salvou) setConfirmandoFechar(false);
                }}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {f.alteracoesNaoSalvas.salvar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
