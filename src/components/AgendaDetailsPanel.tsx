"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useServicos } from "@/components/ServicosProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { CloseIcon, PhoneIcon, EditIcon, PlayIcon, CheckIcon, AlertIcon, DoubleCheckIcon, UserXIcon } from "@/components/icons";
import { formatMinutesAsTime, isHorarioAgendamentoPassado } from "@/lib/date";
import type { AgendaAppointment } from "@/lib/agenda-mock";
import type { StatusKey } from "@/lib/mock-data";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

const acaoBotaoClasses =
  "flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
const acaoBotaoDestaqueClasses =
  "flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

type AgendaDetailsPanelProps = {
  appointment: AgendaAppointment;
  selectedDate: Date;
  onClose: () => void;
  onUpdateStatus: (id: string, status: StatusKey) => void;
  onReagendar: () => void;
  onEdit: () => void;
  /** Abre o atendimento deste agendamento — cria se ainda não existir, senão só direciona. */
  onIniciarAtendimento: () => void;
  /** `true` enquanto a abertura do atendimento está em voo, para não criar em duplicidade no duplo clique. */
  iniciandoAtendimento: boolean;
};

export function AgendaDetailsPanel({
  appointment,
  selectedDate,
  onClose,
  onUpdateStatus,
  onReagendar,
  onEdit,
  onIniciarAtendimento,
  iniciandoAtendimento,
}: AgendaDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const { getCliente } = useClientes();
  const { getServico } = useServicos();
  const d = t.agenda.detalhes;
  const c = t.clientes;

  const cliente = getCliente(appointment.clienteId);
  const nomeExibicao = cliente?.nomePreferencia ?? cliente?.nome ?? "—";
  const telefone = cliente?.contatoPrincipal?.telefone ?? c.campos.semTelefone;
  const servico = appointment.servicoId ? getServico(appointment.servicoId)?.nome ?? d.aDefinir : d.aDefinir;
  const observacoes = locale === "pt" ? appointment.observacoesPt : appointment.observacoesEn;

  const status = appointment.status;
  const pendente = status === "aguardando" || status === "confirmado";
  const pastDue = pendente && isHorarioAgendamentoPassado(selectedDate, appointment.inicioMin);

  function mudarStatus(novoStatus: StatusKey) {
    onUpdateStatus(appointment.id, novoStatus);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">{nomeExibicao}</h3>
          {cliente?.nomePreferencia && (
            <p className="truncate text-xs text-foreground/50">{cliente.nome}</p>
          )}
          {cliente?.status === "inativa" && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/50">
              {c.statusLabel.inativa}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="h-3.5 w-3.5" />
          {d.fechar}
        </button>
      </div>

      <StatusBadge status={appointment.status} />

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-foreground/50">
            <PhoneIcon className="h-4 w-4" />
            {d.telefone}
          </dt>
          <dd className="font-medium text-foreground">{telefone}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{d.horario}</dt>
          <dd className="font-medium text-foreground">
            {formatMinutesAsTime(appointment.inicioMin)} – {formatMinutesAsTime(appointment.fimMin)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{d.servico}</dt>
          <dd className="font-medium text-foreground">{servico}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{d.valorEstimado}</dt>
          <dd className="font-medium text-foreground">
            {appointment.valorEstimado === null ? d.aDefinir : formatCurrency(appointment.valorEstimado)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-foreground/50">{d.observacoes}</dt>
          <dd className="rounded-xl bg-muted px-3 py-2 text-foreground/80">
            {observacoes || d.semObservacoes}
          </dd>
        </div>
      </dl>

      {pastDue && (
        <div className="flex flex-col gap-1 rounded-xl border border-status-cancelado/30 bg-status-cancelado/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-status-cancelado">
            <AlertIcon className="h-4 w-4" />
            {d.horarioPassado.titulo}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {pastDue ? (
          <>
            <button
              type="button"
              onClick={onIniciarAtendimento}
              disabled={iniciandoAtendimento}
              className={`col-span-2 ${acaoBotaoDestaqueClasses}`}
            >
              <PlayIcon className="h-4 w-4" />
              {d.acoes.iniciarAtendimento}
            </button>
            <button type="button" onClick={() => mudarStatus("naoCompareceu")} className={acaoBotaoClasses}>
              <UserXIcon className="h-4 w-4" />
              {d.acoes.marcarNaoCompareceu}
            </button>
            <button type="button" onClick={() => mudarStatus("cancelado")} className={acaoBotaoClasses}>
              <CloseIcon className="h-4 w-4" />
              {d.acoes.cancelar}
            </button>
            <button type="button" onClick={onReagendar} className={`col-span-2 ${acaoBotaoClasses}`}>
              {d.acoes.reagendar}
            </button>
          </>
        ) : status === "aguardando" ? (
          <>
            <button type="button" onClick={() => mudarStatus("confirmado")} className={`col-span-2 ${acaoBotaoDestaqueClasses}`}>
              <CheckIcon className="h-4 w-4" />
              {d.acoes.confirmar}
            </button>
            <button type="button" onClick={() => mudarStatus("cancelado")} className={`col-span-2 ${acaoBotaoClasses}`}>
              <CloseIcon className="h-4 w-4" />
              {d.acoes.cancelar}
            </button>
          </>
        ) : status === "confirmado" ? (
          <>
            <button
              type="button"
              onClick={onIniciarAtendimento}
              disabled={iniciandoAtendimento}
              className={`col-span-2 ${acaoBotaoDestaqueClasses}`}
            >
              <PlayIcon className="h-4 w-4" />
              {d.acoes.iniciarAtendimento}
            </button>
            <button type="button" onClick={() => mudarStatus("cancelado")} className={`col-span-2 ${acaoBotaoClasses}`}>
              <CloseIcon className="h-4 w-4" />
              {d.acoes.cancelar}
            </button>
          </>
        ) : status === "emAtendimento" ? (
          /* Concluir passa a ser feito no próprio Atendimento, que é onde o pagamento é registrado
             no livro-razão; concluir só o agendamento aqui deixaria os dois lados incoerentes. */
          <button
            type="button"
            onClick={onIniciarAtendimento}
            disabled={iniciandoAtendimento}
            className={`col-span-2 ${acaoBotaoDestaqueClasses}`}
          >
            <DoubleCheckIcon className="h-4 w-4" />
            {d.acoes.abrirAtendimento}
          </button>
        ) : (
          <button type="button" onClick={onReagendar} className={`col-span-2 ${acaoBotaoClasses}`}>
            {d.acoes.reagendar}
          </button>
        )}

        <button type="button" onClick={onEdit} className={`col-span-2 ${acaoBotaoClasses}`}>
          <EditIcon className="h-4 w-4" />
          {d.acoes.editar}
        </button>
        <button type="button" title={t.misc.emConstrucao} disabled className={`col-span-2 ${acaoBotaoClasses}`}>
          {d.acoes.abrirWhatsapp}
        </button>
      </div>
    </div>
  );
}
