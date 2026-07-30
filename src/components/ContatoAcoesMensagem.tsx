"use client";

import { ChatIcon, MessageIcon } from "@/components/icons";
import { whatsappHref, smsHref } from "@/lib/mensagens";
import type { Contato } from "@/lib/clientes-mock";

type ContatoAcoesMensagemProps = {
  contato: Contato;
  mensagem: string;
  labelWhatsapp: string;
  labelSms: string;
  avisoLembretesDesativados: string;
};

const botaoBase =
  "flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
const botaoWhatsapp =
  "flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Botões de WhatsApp/SMS para um único contato, respeitando o canal
 * preferido e a opção "receber lembretes". Usado em Lembretes e no
 * cadastro/detalhes da cliente para não duplicar a lógica de montagem
 * e abertura das mensagens.
 */
export function ContatoAcoesMensagem({
  contato,
  mensagem,
  labelWhatsapp,
  labelSms,
  avisoLembretesDesativados,
}: ContatoAcoesMensagemProps) {
  const mostrarWhatsapp = contato.canalPreferido === "whatsapp" || contato.canalPreferido === "ambos";
  const mostrarSms = contato.canalPreferido === "sms" || contato.canalPreferido === "ambos";
  const bloqueado = !contato.receberLembretes;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {mostrarWhatsapp &&
          (bloqueado ? (
            <button type="button" disabled className={`${mostrarSms ? "" : "col-span-2 "}${botaoWhatsapp}`}>
              <ChatIcon className="h-4 w-4" />
              {labelWhatsapp}
            </button>
          ) : (
            <a
              href={whatsappHref(contato.telefone, mensagem)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${mostrarSms ? "" : "col-span-2 "}${botaoWhatsapp}`}
            >
              <ChatIcon className="h-4 w-4" />
              {labelWhatsapp}
            </a>
          ))}

        {mostrarSms &&
          (bloqueado ? (
            <button type="button" disabled className={botaoBase}>
              <MessageIcon className="h-4 w-4" />
              {labelSms}
            </button>
          ) : (
            <a href={smsHref(contato.telefone, mensagem)} className={botaoBase}>
              <MessageIcon className="h-4 w-4" />
              {labelSms}
            </a>
          ))}
      </div>

      {bloqueado && (
        <p className="rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">
          {avisoLembretesDesativados}
        </p>
      )}
    </div>
  );
}
