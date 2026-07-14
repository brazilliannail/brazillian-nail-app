"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { PhoneIcon } from "@/components/icons";
import type { Cliente } from "@/lib/clientes-mock";

type ClienteCardProps = {
  cliente: Cliente;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function ClienteCard({ cliente, selected, onSelect }: ClienteCardProps) {
  const { t } = useLanguage();
  const c = t.clientes;
  const inicial = cliente.nome.trim().charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(cliente.id)}
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-muted/50 sm:p-5 ${
        selected ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
            {inicial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{cliente.nome}</p>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/60">
              {t.clientes.idiomaLabel[cliente.idioma]}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            cliente.status === "ativa"
              ? "bg-status-finalizado/10 text-status-finalizado"
              : "bg-foreground/10 text-foreground/50"
          }`}
        >
          {c.statusLabel[cliente.status]}
        </span>
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="flex items-center gap-1.5 text-foreground/50">
            <PhoneIcon className="h-3.5 w-3.5" />
            {c.campos.telefone}
          </dt>
          <dd
            className={
              cliente.telefone ? "font-medium text-foreground" : "italic text-foreground/40"
            }
          >
            {cliente.telefone ?? c.campos.semTelefone}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{c.campos.ultimoAtendimento}</dt>
          <dd className="font-medium text-foreground">{cliente.ultimoAtendimento}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground/50">{c.campos.proximoAgendamento}</dt>
          <dd className="font-medium text-foreground">
            {cliente.proximoAgendamento ?? c.campos.semAgendamento}
          </dd>
        </div>
      </dl>
    </button>
  );
}
