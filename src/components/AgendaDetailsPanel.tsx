"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useServicos } from "@/components/ServicosProvider";
import { useAgenda } from "@/components/AgendaProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { CloseIcon, PhoneIcon, EditIcon, PlayIcon, CheckIcon, AlertIcon, DoubleCheckIcon, UserXIcon, ChatIcon } from "@/components/icons";
import { formatMinutesAsTime, isHorarioAgendamentoPassado } from "@/lib/date";
import { telefoneValido } from "@/lib/clientes-mock";
import { buildMensagemContato, whatsappHref } from "@/lib/mensagens";
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
  /** Abre o formulário de "Novo agendamento" em branco — usado por `naoCompareceu`, que não pode
   * reaproveitar o registro atual (preserva o histórico da falta). */
  onNovoAgendamento: () => void;
  onEdit: () => void;
  /** Abre o atendimento deste agendamento — cria se ainda não existir, senão só direciona. */
  onIniciarAtendimento: () => void;
  /** Inicia o atendimento (ou reutiliza o existente, nunca duplica — mesmo mecanismo de
   * `onIniciarAtendimento`) e leva a profissional direto ao fluxo normal de conclusão em
   * Atendimentos. O agendamento nunca é marcado como concluído por aqui: só o Atendimento
   * correspondente pode concluir (`concluirAtendimentoAction`), que depois sincroniza o
   * agendamento de volta. */
  onConcluirAtendimento: () => void;
  /** `true` enquanto a abertura do atendimento está em voo, para não criar em duplicidade no duplo clique. */
  iniciandoAtendimento: boolean;
};

export function AgendaDetailsPanel({
  appointment,
  selectedDate,
  onClose,
  onUpdateStatus,
  onReagendar,
  onNovoAgendamento,
  onEdit,
  onIniciarAtendimento,
  onConcluirAtendimento,
  iniciandoAtendimento,
}: AgendaDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const { getCliente } = useClientes();
  const { getServico } = useServicos();
  const { registrarMensagemPreparada } = useAgenda();
  const d = t.agenda.detalhes;
  const c = t.clientes;

  const cliente = getCliente(appointment.clienteId);
  const nomeExibicao = cliente?.nomePreferencia ?? cliente?.nome ?? "—";
  const contatoPrincipal = cliente?.contatoPrincipal ?? null;
  const telefone = contatoPrincipal?.telefone ?? c.campos.semTelefone;
  const servico = appointment.servicoId ? getServico(appointment.servicoId)?.nome ?? d.aDefinir : d.aDefinir;
  const observacoes = locale === "pt" ? appointment.observacoesPt : appointment.observacoesEn;

  // "Abrir WhatsApp" só existe quando o contato principal tem telefone válido (mesma regra de
  // `ClienteFormModal`/`createClienteAction`) — sem telefone válido, o botão nem é renderizado, em
  // vez de aparecer desabilitado (não deve parecer uma ação disponível que não é).
  const podeAbrirWhatsapp = Boolean(contatoPrincipal && telefoneValido(contatoPrincipal.telefone));
  const mensagemWhatsapp = contatoPrincipal
    ? buildMensagemContato(contatoPrincipal.idioma, {
        nome: nomeExibicao,
        data: appointment.data,
        horario: formatMinutesAsTime(appointment.inicioMin),
        servicoPt: null,
        servicoEn: null,
      })
    : "";

  function handleAbrirWhatsapp() {
    if (!contatoPrincipal) return;
    registrarMensagemPreparada({
      clienteId: appointment.clienteId,
      papel: "principal",
      canal: "whatsapp",
      idioma: contatoPrincipal.idioma,
      texto: mensagemWhatsapp,
    });
  }

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
            <button
              type="button"
              onClick={onConcluirAtendimento}
              disabled={iniciandoAtendimento}
              className={`col-span-2 ${acaoBotaoClasses}`}
            >
              <CheckIcon className="h-4 w-4" />
              {d.acoes.concluirAtendimento}
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
            <button
              type="button"
              onClick={onConcluirAtendimento}
              disabled={iniciandoAtendimento}
              className={`col-span-2 ${acaoBotaoClasses}`}
            >
              <CheckIcon className="h-4 w-4" />
              {d.acoes.concluirAtendimento}
            </button>
            <button type="button" onClick={() => mudarStatus("cancelado")} className={`col-span-2 ${acaoBotaoClasses}`}>
              <CloseIcon className="h-4 w-4" />
              {d.acoes.cancelar}
            </button>
          </>
        ) : status === "emAtendimento" ? (
          /* Concluir passa a ser feito no próprio Atendimento, que é onde o pagamento é registrado
             no livro-razão; concluir só o agendamento aqui deixaria os dois lados incoerentes.
             Este botão reutiliza o atendimento já aberto (nunca duplica) e leva direto ao fluxo
             normal de conclusão em Atendimentos. */
          <button
            type="button"
            onClick={onConcluirAtendimento}
            disabled={iniciandoAtendimento}
            className={`col-span-2 ${acaoBotaoDestaqueClasses}`}
          >
            <DoubleCheckIcon className="h-4 w-4" />
            {d.acoes.concluirAtendimento}
          </button>
        ) : status === "cancelado" ? (
          <button type="button" onClick={onReagendar} className={`col-span-2 ${acaoBotaoClasses}`}>
            {d.acoes.reativarEReagendar}
          </button>
        ) : status === "naoCompareceu" ? (
          <button type="button" onClick={onNovoAgendamento} className={`col-span-2 ${acaoBotaoClasses}`}>
            {d.acoes.criarNovoAgendamento}
          </button>
        ) : null}

        <button type="button" onClick={onEdit} className={`col-span-2 ${acaoBotaoClasses}`}>
          <EditIcon className="h-4 w-4" />
          {d.acoes.editar}
        </button>
        {podeAbrirWhatsapp && (
          <a
            href={whatsappHref(contatoPrincipal!.telefone, mensagemWhatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleAbrirWhatsapp}
            className={`col-span-2 ${acaoBotaoClasses}`}
          >
            <ChatIcon className="h-4 w-4" />
            {d.acoes.abrirWhatsapp}
          </a>
        )}
      </div>
    </div>
  );
}
