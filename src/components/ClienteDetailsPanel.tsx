"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CloseIcon,
  PhoneIcon,
  EditIcon,
  PlayIcon,
  CalendarIcon,
  ChatIcon,
  MessageIcon,
  HistoryIcon,
  UserXIcon,
  AlertIcon,
  CashIcon,
} from "@/components/icons";
import { ClienteHistoricoModal } from "@/components/ClienteHistoricoModal";
import { ContatoAcoesMensagem } from "@/components/ContatoAcoesMensagem";
import { buildMensagemContato } from "@/lib/mensagens";
import type { Cliente, Contato } from "@/lib/clientes-mock";
import type { Dictionary } from "@/lib/i18n";

/** Extrai "MM/DD/YYYY" e "h:mm AM/PM" de "MM/DD/YYYY · h:mm AM". */
function separarDataHorario(proximoAgendamento: string | null) {
  if (!proximoAgendamento) return { data: null, horario: null };
  const [data, horario] = proximoAgendamento.split(" · ");
  return { data: data ?? null, horario: horario ?? null };
}

type ClienteDetailsPanelProps = {
  cliente: Cliente;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
};

const CANAL_ICON: Record<Contato["canalPreferido"], React.ComponentType<{ className?: string }>> = {
  whatsapp: ChatIcon,
  sms: MessageIcon,
  ambos: ChatIcon,
};

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type ContatoDetalheProps = {
  titulo: string;
  contato: Contato | null;
  semContatoTexto: string;
  t: Dictionary;
};

function ContatoDetalhe({ titulo, contato, semContatoTexto, t }: ContatoDetalheProps) {
  const c = t.clientes;
  if (!contato) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        <p className="rounded-xl bg-muted px-3 py-2 text-sm italic text-foreground/40">{semContatoTexto}</p>
      </div>
    );
  }

  const CanalIcon = CANAL_ICON[contato.canalPreferido];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">{titulo}</p>
      <dl className="flex flex-col gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{c.campos.nomeContato}</dt>
          <dd className="font-medium text-foreground">{contato.nomeContato}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-foreground/50">
            <PhoneIcon className="h-3.5 w-3.5" />
            {c.campos.telefone}
          </dt>
          <dd className="font-medium text-foreground">{contato.telefone}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{c.campos.relacao}</dt>
          <dd className="font-medium text-foreground">{c.relacaoLabel[contato.relacao]}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{c.campos.idioma}</dt>
          <dd className="font-medium text-foreground">{c.idiomaLabel[contato.idioma]}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-foreground/50">
            <CanalIcon className="h-3.5 w-3.5" />
            {c.campos.canalPreferido}
          </dt>
          <dd className="font-medium text-foreground">{c.canalLabel[contato.canalPreferido]}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/50">{c.campos.receberLembretes}</dt>
          <dd className="font-medium text-foreground">
            {contato.receberLembretes ? c.simNao.sim : c.simNao.nao}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ClienteDetailsPanel({ cliente, onClose, onEdit, onToggleStatus }: ClienteDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const c = t.clientes;
  const d = c.detalhes;
  const inicial = cliente.nome.trim().charAt(0).toUpperCase();
  const observacoes = locale === "pt" ? cliente.observacoesPt : cliente.observacoesEn;
  const avisos = locale === "pt" ? cliente.avisosImportantesPt : cliente.avisosImportantesEn;
  const semTelefone = !cliente.contatoPrincipal;
  const temPendencia = cliente.valorPendente > 0;
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [confirmandoInativar, setConfirmandoInativar] = useState(false);

  const { data: dataProximoAgendamento, horario: horarioProximoAgendamento } = separarDataHorario(
    cliente.proximoAgendamento,
  );
  const nomeParaMensagem = cliente.nomePreferencia ?? cliente.nome;

  function mensagemPara(contato: Contato) {
    return buildMensagemContato(contato.idioma, {
      nome: nomeParaMensagem,
      data: dataProximoAgendamento,
      horario: horarioProximoAgendamento,
      servicoPt: null,
      servicoEn: null,
    });
  }

  function handleToggleStatus() {
    if (cliente.status === "ativa") {
      setConfirmandoInativar(true);
      return;
    }
    onToggleStatus();
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base font-semibold text-brand">
            {inicial}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{d.titulo}</p>
            <h3 className="truncate text-lg font-semibold text-foreground">{cliente.nome}</h3>
            <p className="truncate text-xs text-foreground/50">
              {d.identificador}: <span className="font-mono">{cliente.id}</span>
            </p>
            {cliente.nomePreferencia && (
              <p className="truncate text-xs text-foreground/50">
                {d.prefereSerChamada} {cliente.nomePreferencia}
              </p>
            )}
          </div>
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

      <div className="flex flex-col gap-5 p-5">
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
            cliente.status === "ativa"
              ? "bg-status-finalizado/10 text-status-finalizado"
              : "bg-foreground/10 text-foreground/50"
          }`}
        >
          {c.statusLabel[cliente.status]}
        </span>

        {avisos.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-status-aguardando">
              <AlertIcon className="h-4 w-4" />
              {d.avisosImportantes}
            </p>
            <ul className="flex flex-col gap-1 text-sm text-status-aguardando">
              {avisos.map((aviso) => (
                <li key={aviso} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-status-aguardando" />
                  {aviso}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{c.campos.ultimoAtendimento}</dt>
            <dd className="font-medium text-foreground">{cliente.ultimoAtendimento}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{c.campos.proximoAgendamento}</dt>
            <dd className="font-medium text-foreground">
              {cliente.proximoAgendamento ?? c.campos.semAgendamento}
            </dd>
          </div>
        </dl>

        {semTelefone && (
          <div className="flex flex-col gap-1 rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">
            <p className="font-semibold">{c.campos.semTelefone}</p>
            <p>{c.campos.semTelefoneExplicacao}</p>
          </div>
        )}

        <ContatoDetalhe
          titulo={d.contatoPrincipal}
          contato={cliente.contatoPrincipal}
          semContatoTexto={d.semContato}
          t={t}
        />

        <ContatoDetalhe
          titulo={d.contatoSecundario}
          contato={cliente.contatoSecundario}
          semContatoTexto={d.semContatoSecundario}
          t={t}
        />

        {(cliente.contatoPrincipal || cliente.contatoSecundario) && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ChatIcon className="h-4 w-4 text-foreground/50" />
              {d.mensagens}
            </p>
            {cliente.contatoPrincipal && (
              <div className="flex flex-col gap-1.5">
                {cliente.contatoSecundario && (
                  <p className="text-xs font-semibold text-foreground/60">{d.contatoPrincipal}</p>
                )}
                <ContatoAcoesMensagem
                  contato={cliente.contatoPrincipal}
                  mensagem={mensagemPara(cliente.contatoPrincipal)}
                  labelWhatsapp={d.acoes.whatsapp}
                  labelSms={d.acoes.sms}
                  avisoLembretesDesativados={d.lembretesDesativadosParaContato}
                />
              </div>
            )}
            {cliente.contatoSecundario && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-foreground/60">{d.contatoSecundario}</p>
                <ContatoAcoesMensagem
                  contato={cliente.contatoSecundario}
                  mensagem={mensagemPara(cliente.contatoSecundario)}
                  labelWhatsapp={d.acoes.whatsapp}
                  labelSms={d.acoes.sms}
                  avisoLembretesDesativados={d.lembretesDesativadosParaContato}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CashIcon className="h-4 w-4 text-foreground/50" />
            {d.financeiro}
          </p>
          {temPendencia ? (
            <div className="flex items-center justify-between rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 px-3 py-2">
              <span className="text-sm font-medium text-status-aguardando">{d.valorPendente}</span>
              <span className="text-base font-semibold text-status-aguardando">
                {formatCurrency(cliente.valorPendente)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
              <span className="text-sm text-foreground/60">{d.valorPendente}</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(0)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{d.observacoes}</p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80">
            {observacoes || d.semObservacoes}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">{d.historico}</p>
          {cliente.historico.length === 0 ? (
            <p className="text-sm text-foreground/50">{d.semHistorico}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {cliente.historico.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{locale === "pt" ? item.servicoPt : item.servicoEn}</p>
                    <p className="text-xs text-foreground/50">{item.data}</p>
                  </div>
                  <span className="shrink-0 font-medium text-foreground">{formatCurrency(item.valorServicos)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {historicoAberto && (
          <ClienteHistoricoModal cliente={cliente} onClose={() => setHistoricoAberto(false)} />
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <CalendarIcon className="h-4 w-4" />
            {d.acoes.agendar}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <PlayIcon className="h-4 w-4" />
            {d.acoes.iniciarAtendimento}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <EditIcon className="h-4 w-4" />
            {d.acoes.editar}
          </button>
          <button
            type="button"
            onClick={() => setHistoricoAberto(true)}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <HistoryIcon className="h-4 w-4" />
            {d.acoes.historico}
          </button>
          <button
            type="button"
            onClick={handleToggleStatus}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <UserXIcon className="h-4 w-4" />
            {cliente.status === "ativa" ? d.acoes.inativar : d.acoes.ativar}
          </button>
        </div>
      </div>

      {confirmandoInativar && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmandoInativar(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-aguardando/10 text-status-aguardando">
                <AlertIcon className="h-5 w-5" />
              </span>
              <p className="pt-1.5 text-sm font-semibold text-foreground">{d.confirmarInativacao.titulo}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmandoInativar(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                {d.confirmarInativacao.cancelar}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmandoInativar(false);
                  onToggleStatus();
                }}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {d.confirmarInativacao.inativar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
