"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { LembreteStatusBadge } from "@/components/LembreteStatusBadge";
import { ChatIcon, MessageIcon, InfoIcon, PhoneIcon, GlobeIcon } from "@/components/icons";
import { buildMensagemLembrete, type Lembrete } from "@/lib/lembretes-mock";

type LembreteCardProps = {
  lembrete: Lembrete;
  selected: boolean;
  dataAmanha: string;
  onSelect: (id: string) => void;
};

const actionButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export function LembreteCard({ lembrete, selected, dataAmanha, onSelect }: LembreteCardProps) {
  const { locale, t } = useLanguage();
  const l = t.lembretes;
  const c = t.clientes;
  const servico = locale === "pt" ? lembrete.servicoPt : lembrete.servicoEn;
  const semTelefone = !lembrete.telefone;
  const mensagem = lembrete.mensagemPersonalizada ?? buildMensagemLembrete(lembrete, dataAmanha);

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-sm sm:p-5 ${
        selected ? "border-brand ring-2 ring-brand" : "border-border"
      }`}
    >
      <button type="button" onClick={() => onSelect(lembrete.id)} className="flex flex-col gap-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{lembrete.cliente}</p>
          <StatusBadge status={lembrete.statusAgendamento} size="sm" />
        </div>

        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{l.campos.horario}</dt>
            <dd className="font-medium text-foreground">{lembrete.horario}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground/50">{l.campos.servico}</dt>
            <dd className="font-medium text-foreground">{servico}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-foreground/50">
              <PhoneIcon className="h-3.5 w-3.5" />
              {l.campos.telefone}
            </dt>
            <dd className={semTelefone ? "italic text-foreground/40" : "font-medium text-foreground"}>
              {lembrete.telefone ?? l.campos.semTelefone}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-foreground/50">
              <GlobeIcon className="h-3.5 w-3.5" />
              {l.campos.idioma}
            </dt>
            <dd className="font-medium text-foreground">{c.idiomaLabel[lembrete.idioma]}</dd>
          </div>
        </dl>

        <LembreteStatusBadge status={lembrete.statusLembrete} />
      </button>

      {semTelefone && (
        <p className="rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">
          {c.campos.semTelefoneExplicacao}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {semTelefone ? (
          <button
            type="button"
            disabled
            className="col-span-2 flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white opacity-40"
          >
            <ChatIcon className="h-4 w-4" />
            {l.acoes.abrirWhatsapp}
          </button>
        ) : (
          <a
            href={`https://wa.me/1${lembrete.telefone!.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <ChatIcon className="h-4 w-4" />
            {l.acoes.abrirWhatsapp}
          </a>
        )}

        {semTelefone ? (
          <button type="button" disabled className={actionButtonClasses}>
            <MessageIcon className="h-4 w-4" />
            {l.acoes.prepararSms}
          </button>
        ) : (
          <a href={`sms:${lembrete.telefone}?&body=${encodeURIComponent(mensagem)}`} className={actionButtonClasses}>
            <MessageIcon className="h-4 w-4" />
            {l.acoes.prepararSms}
          </a>
        )}

        <button type="button" onClick={() => onSelect(lembrete.id)} className={actionButtonClasses}>
          <InfoIcon className="h-4 w-4" />
          {l.acoes.verDetalhes}
        </button>
      </div>
    </div>
  );
}
