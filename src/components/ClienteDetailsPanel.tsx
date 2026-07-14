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
import type { Cliente, PreferenciaContato } from "@/lib/clientes-mock";

type ClienteDetailsPanelProps = {
  cliente: Cliente;
  onClose: () => void;
};

const PREFERENCIA_ICON: Record<PreferenciaContato, React.ComponentType<{ className?: string }>> = {
  whatsapp: ChatIcon,
  sms: MessageIcon,
  ligacao: PhoneIcon,
};

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function ClienteDetailsPanel({ cliente, onClose }: ClienteDetailsPanelProps) {
  const { locale, t } = useLanguage();
  const c = t.clientes;
  const d = c.detalhes;
  const inicial = cliente.nome.trim().charAt(0).toUpperCase();
  const observacoes = locale === "pt" ? cliente.observacoesPt : cliente.observacoesEn;
  const avisos = locale === "pt" ? cliente.avisosImportantesPt : cliente.avisosImportantesEn;
  const semTelefone = !cliente.telefone;
  const temPendencia = cliente.valorPendente > 0;
  const PreferenciaIcon = PREFERENCIA_ICON[cliente.preferenciaContato];
  const [historicoAberto, setHistoricoAberto] = useState(false);

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
            <dt className="flex items-center gap-1.5 text-foreground/50">
              <PhoneIcon className="h-4 w-4" />
              {c.campos.telefone}
            </dt>
            <dd className={semTelefone ? "italic text-foreground/40" : "font-medium text-foreground"}>
              {cliente.telefone ?? c.campos.semTelefone}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{c.campos.idioma}</dt>
            <dd className="font-medium text-foreground">{c.idiomaLabel[cliente.idioma]}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-foreground/50">
              <PreferenciaIcon className="h-4 w-4" />
              {c.campos.preferenciaContato}
            </dt>
            <dd className="font-medium text-foreground">{c.preferenciaLabel[cliente.preferenciaContato]}</dd>
          </div>
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
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            <EditIcon className="h-4 w-4" />
            {d.acoes.editar}
          </button>
          <button
            type="button"
            disabled={semTelefone}
            title={semTelefone ? c.campos.semTelefoneExplicacao : undefined}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChatIcon className="h-4 w-4" />
            {d.acoes.whatsapp}
          </button>
          <button
            type="button"
            disabled={semTelefone}
            title={semTelefone ? c.campos.semTelefoneExplicacao : undefined}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <MessageIcon className="h-4 w-4" />
            {d.acoes.sms}
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
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-3 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <UserXIcon className="h-4 w-4" />
            {cliente.status === "ativa" ? d.acoes.inativar : d.acoes.ativar}
          </button>
        </div>
      </div>
    </div>
  );
}
