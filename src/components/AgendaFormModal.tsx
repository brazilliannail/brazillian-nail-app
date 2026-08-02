"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useServicos } from "@/components/ServicosProvider";
import { useConfiguracoes } from "@/components/ConfiguracoesProvider";
import { CloseIcon, AlertIcon } from "@/components/icons";
import { SLOT_MIN, buildTimeBoundaries, type AgendaAppointment } from "@/lib/agenda-mock";
import { expedienteDeConfiguracoes, diaSemanaDeData } from "@/lib/configuracoes-mock";
import { formatDateISO, parseDateISO, formatDateMMDDYYYY, parseDateMMDDYYYY, formatMinutesAsTime } from "@/lib/date";

type AgendaFormModalProps = {
  modo: "criar" | "editar";
  agendamento: AgendaAppointment | null;
  dataPadrao: Date;
  onClose: () => void;
  onSave: (agendamento: AgendaAppointment) => void;
  erroSalvar?: string | null;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

export function AgendaFormModal({ modo, agendamento, dataPadrao, onClose, onSave, erroSalvar }: AgendaFormModalProps) {
  const { t } = useLanguage();
  const { clientes } = useClientes();
  const { servicos } = useServicos();
  const { configuracoes } = useConfiguracoes();
  const f = t.agenda.formulario;

  const expediente = useMemo(() => expedienteDeConfiguracoes(configuracoes.agenda), [configuracoes.agenda]);

  const [clienteId, setClienteId] = useState(agendamento?.clienteId ?? "");
  const [servicoId, setServicoId] = useState(agendamento?.servicoId ?? "");
  const [dataIso, setDataIso] = useState(() =>
    agendamento ? formatDateISO(parseDateMMDDYYYY(agendamento.data)) : formatDateISO(dataPadrao),
  );
  const [inicioMin, setInicioMin] = useState(agendamento?.inicioMin ?? expediente.inicioMin);
  const [fimMin, setFimMin] = useState(agendamento?.fimMin ?? expediente.inicioMin + SLOT_MIN);
  const [valorEstimado, setValorEstimado] = useState(
    agendamento?.valorEstimado !== null && agendamento?.valorEstimado !== undefined ? String(agendamento.valorEstimado) : "",
  );
  const [observacoesPt, setObservacoesPt] = useState(agendamento?.observacoesPt ?? "");
  const [observacoesEn, setObservacoesEn] = useState(agendamento?.observacoesEn ?? "");

  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  const opcoesServico = servicos.filter((servico) => servico.status === "ativo" || servico.id === agendamento?.servicoId);
  const horariosInicio = buildTimeBoundaries(expediente.inicioMin, expediente.fimMin).filter((min) => min < expediente.fimMin);
  const horariosFim = buildTimeBoundaries(expediente.inicioMin, expediente.fimMin).filter(
    (min) => min > inicioMin && min <= expediente.fimMin,
  );

  const houveAlteracoes =
    clienteId !== (agendamento?.clienteId ?? "") ||
    servicoId !== (agendamento?.servicoId ?? "") ||
    dataIso !== (agendamento ? formatDateISO(parseDateMMDDYYYY(agendamento.data)) : formatDateISO(dataPadrao)) ||
    inicioMin !== (agendamento?.inicioMin ?? expediente.inicioMin) ||
    fimMin !== (agendamento?.fimMin ?? expediente.inicioMin + SLOT_MIN) ||
    valorEstimado !==
      (agendamento?.valorEstimado !== null && agendamento?.valorEstimado !== undefined ? String(agendamento.valorEstimado) : "") ||
    observacoesPt !== (agendamento?.observacoesPt ?? "") ||
    observacoesEn !== (agendamento?.observacoesEn ?? "");

  function handleServicoChange(novoServicoId: string) {
    setServicoId(novoServicoId);
    if (valorEstimado.trim() === "" && novoServicoId !== "") {
      const servico = servicos.find((item) => item.id === novoServicoId);
      if (servico) setValorEstimado(String(servico.precoPadrao));
    }
  }

  function handleInicioChange(novoInicioMin: number) {
    const duracao = fimMin - inicioMin;
    setInicioMin(novoInicioMin);
    const novoFim = novoInicioMin + duracao;
    setFimMin(novoFim <= expediente.fimMin ? novoFim : Math.min(novoInicioMin + SLOT_MIN, expediente.fimMin));
  }

  function validarESalvar(): boolean {
    if (clienteId.trim() === "") {
      setErro(f.erros.clienteObrigatoria);
      return false;
    }
    if (inicioMin >= fimMin) {
      setErro(f.erros.horarioInvalido);
      return false;
    }
    if (inicioMin < expediente.inicioMin || fimMin > expediente.fimMin) {
      setErro(f.erros.horarioForaExpediente);
      return false;
    }
    if (!expediente.diasFuncionamento.includes(diaSemanaDeData(parseDateISO(dataIso)))) {
      setErro(f.erros.diaForaExpediente);
      return false;
    }

    setErro(null);

    const agendamentoBase: AgendaAppointment = agendamento ?? {
      // Identificador definitivo (padrão AGD-000001) é gerado pelo AgendaProvider ao cadastrar.
      id: "",
      clienteId: "",
      servicoId: null,
      status: "aguardando",
      data: "",
      inicioMin: expediente.inicioMin,
      fimMin: expediente.inicioMin + SLOT_MIN,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    };

    onSave({
      ...agendamentoBase,
      clienteId,
      servicoId: servicoId === "" ? null : servicoId,
      data: formatDateMMDDYYYY(parseDateISO(dataIso)),
      inicioMin,
      fimMin,
      valorEstimado: valorEstimado.trim() === "" ? null : Number(valorEstimado),
      observacoesPt: observacoesPt.trim(),
      observacoesEn: observacoesEn.trim(),
    });

    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const salvou = validarESalvar();
    if (!salvou) return;
  }

  function tentarFechar() {
    if (houveAlteracoes) {
      setConfirmandoFechar(true);
      return;
    }
    onClose();
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
            <select value={clienteId} onChange={(event) => setClienteId(event.target.value)} className={inputClass}>
              <option value="">{f.clientePlaceholder}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nomePreferencia ?? cliente.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.servico}</span>
            <select value={servicoId} onChange={(event) => handleServicoChange(event.target.value)} className={inputClass}>
              <option value="">{f.servicoADefinir}</option>
              {opcoesServico.map((servico) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.data}</span>
            <input
              type="date"
              value={dataIso}
              onChange={(event) => setDataIso(event.target.value)}
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.horarioInicio}</span>
              <select value={inicioMin} onChange={(event) => handleInicioChange(Number(event.target.value))} className={inputClass}>
                {horariosInicio.map((min) => (
                  <option key={min} value={min}>
                    {formatMinutesAsTime(min)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.horarioFim}</span>
              <select value={fimMin} onChange={(event) => setFimMin(Number(event.target.value))} className={inputClass}>
                {horariosFim.map((min) => (
                  <option key={min} value={min}>
                    {formatMinutesAsTime(min)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.valorEstimado}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valorEstimado}
              onChange={(event) => setValorEstimado(event.target.value)}
              placeholder={f.valorEstimadoPlaceholder}
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
