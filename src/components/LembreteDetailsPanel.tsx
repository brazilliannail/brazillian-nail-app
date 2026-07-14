"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CloseIcon,
  AlertIcon,
  CopyIcon,
  MapPinIcon,
  EditIcon,
  CheckIcon,
  DoubleCheckIcon,
  CalendarIcon,
  UsersIcon,
} from "@/components/icons";
import { buildMensagemLembrete, enderecoBrazillianNail, type Lembrete, type LembreteStatus } from "@/lib/lembretes-mock";

type LembreteDetailsPanelProps = {
  lembrete: Lembrete;
  dataAmanha: string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: LembreteStatus) => void;
  onUpdateMensagem: (id: string, mensagem: string) => void;
};

const actionButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]";

export function LembreteDetailsPanel({
  lembrete,
  dataAmanha,
  onClose,
  onUpdateStatus,
  onUpdateMensagem,
}: LembreteDetailsPanelProps) {
  const { t } = useLanguage();
  const c = t.clientes;
  const l = t.lembretes;
  const p = l.painel;
  const servico = lembrete.idioma === "pt" ? lembrete.servicoPt : lembrete.servicoEn;
  const mensagem = lembrete.mensagemPersonalizada ?? buildMensagemLembrete(lembrete, dataAmanha);
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);

  const semTelefone = !lembrete.telefone;
  const status = lembrete.statusLembrete;

  const podeMarcarPreparada = !semTelefone && status === "pendente";
  const podeMarcarEnviada = !semTelefone && (status === "pendente" || status === "preparado");
  const enviadaDestacada = status === "preparado";
  const podeMarcarTratada = semTelefone && status === "indisponivel";
  const podeIgnorarOuReativar = status !== "enviado" && status !== "tratadoPessoalmente";
  const estaIgnorado = status === "ignorado";

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Ambiente sem permissão de área de transferência; ação apenas visual.
    }
  }

  function reativarOuIgnorar() {
    if (estaIgnorado) {
      onUpdateStatus(lembrete.id, semTelefone ? "indisponivel" : "pendente");
    } else {
      onUpdateStatus(lembrete.id, "ignorado");
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{p.titulo}</p>
          <h3 className="truncate text-lg font-semibold text-foreground">{lembrete.cliente}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="h-3.5 w-3.5" />
          {p.fechar}
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{l.campos.idioma}</dt>
            <dd className="font-medium text-foreground">{c.idiomaLabel[lembrete.idioma]}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{p.data}</dt>
            <dd className="font-medium text-foreground">{dataAmanha}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{p.horario}</dt>
            <dd className="font-medium text-foreground">{lembrete.horario}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground/50">{p.servico}</dt>
            <dd className="font-medium text-foreground">{servico}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-foreground/50">
              <MapPinIcon className="h-4 w-4" />
              {p.endereco}
            </dt>
            <dd className="text-right font-medium text-foreground">{enderecoBrazillianNail}</dd>
          </div>
        </dl>

        {semTelefone && (
          <div className="flex flex-col gap-1 rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">
            <p className="font-semibold">{c.campos.semTelefone}</p>
            <p>{c.campos.semTelefoneExplicacao}</p>
          </div>
        )}

        {!semTelefone && !lembrete.consentimentoRegistrado && (
          <div className="flex flex-col gap-1 rounded-xl border border-status-aguardando/30 bg-status-aguardando/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-status-aguardando">
              <AlertIcon className="h-4 w-4" />
              {p.avisoConsentimentoTitulo}
            </p>
            <p className="text-sm text-status-aguardando">{p.avisoConsentimento}</p>
          </div>
        )}

        {!semTelefone && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{p.mensagemPreparada}</p>
              <button
                type="button"
                onClick={() => setEditando((current) => !current)}
                className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <EditIcon className="h-3.5 w-3.5" />
                {editando ? l.acoes.concluirEdicao : l.acoes.editarMensagem}
              </button>
            </div>
            {editando ? (
              <textarea
                autoFocus
                value={mensagem}
                onChange={(event) => onUpdateMensagem(lembrete.id, event.target.value)}
                rows={6}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            ) : (
              <p className="whitespace-pre-wrap rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80">
                {mensagem}
              </p>
            )}
            <button
              type="button"
              onClick={copiarMensagem}
              className={actionButtonClasses}
            >
              <CopyIcon className="h-4 w-4" />
              {copiado ? l.acoes.mensagemCopiada : l.acoes.copiarMensagem}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {podeMarcarPreparada && (
            <button
              type="button"
              onClick={() => onUpdateStatus(lembrete.id, "preparado")}
              className={`col-span-2 ${actionButtonClasses}`}
            >
              <CheckIcon className="h-4 w-4" />
              {l.acoes.marcarPreparada}
            </button>
          )}

          {podeMarcarEnviada && (
            <button
              type="button"
              onClick={() => onUpdateStatus(lembrete.id, "enviado")}
              className={
                enviadaDestacada
                  ? "col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  : `col-span-2 ${actionButtonClasses}`
              }
            >
              <DoubleCheckIcon className="h-4 w-4" />
              {l.acoes.marcarEnviadaManualmente}
            </button>
          )}

          {podeMarcarTratada && (
            <button
              type="button"
              onClick={() => onUpdateStatus(lembrete.id, "tratadoPessoalmente")}
              className={`col-span-2 ${actionButtonClasses}`}
            >
              <CheckIcon className="h-4 w-4" />
              {l.acoes.marcarTratadaPessoalmente}
            </button>
          )}

          {podeIgnorarOuReativar && (
            <button type="button" onClick={reativarOuIgnorar} className={`col-span-2 ${actionButtonClasses}`}>
              <CloseIcon className="h-4 w-4" />
              {estaIgnorado ? l.acoes.reativarLembrete : l.acoes.ignorarLembrete}
            </button>
          )}

          <Link href="/agenda" className={actionButtonClasses}>
            <CalendarIcon className="h-4 w-4" />
            {l.acoes.abrirAgendamento}
          </Link>

          <Link href="/clientes" className={actionButtonClasses}>
            <UsersIcon className="h-4 w-4" />
            {l.acoes.abrirCliente}
          </Link>
        </div>
      </div>
    </div>
  );
}
