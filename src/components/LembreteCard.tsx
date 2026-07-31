"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useConfiguracoes } from "@/components/ConfiguracoesProvider";
import { useLembretes } from "@/components/LembretesProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { LembreteStatusBadge } from "@/components/LembreteStatusBadge";
import { ContatoAcoesMensagem } from "@/components/ContatoAcoesMensagem";
import { InfoIcon, PhoneIcon, GlobeIcon } from "@/components/icons";
import { buildMensagemLembrete, type Lembrete } from "@/lib/lembretes-mock";
import type { Contato } from "@/lib/clientes-mock";

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
  const { getCliente } = useClientes();
  const { configuracoes } = useConfiguracoes();
  const { registrarMensagemPreparada } = useLembretes();
  const l = t.lembretes;
  const c = t.clientes;

  const cliente = getCliente(lembrete.clienteId);
  const nomeExibicao = cliente?.nomePreferencia ?? cliente?.nome ?? "—";
  const contatoPrincipal = cliente?.contatoPrincipal ?? null;
  const contatoSecundario = cliente?.contatoSecundario ?? null;
  const idioma = contatoPrincipal?.idioma ?? "pt";

  const servico = locale === "pt" ? lembrete.servicoPt : lembrete.servicoEn;
  const semTelefone = !contatoPrincipal;

  function mensagemPara(contato: Contato) {
    if (contato === contatoPrincipal && lembrete.mensagemPersonalizada) {
      return lembrete.mensagemPersonalizada;
    }
    if (contato === contatoSecundario && lembrete.mensagemPersonalizadaSecundario) {
      return lembrete.mensagemPersonalizadaSecundario;
    }
    return buildMensagemLembrete(lembrete, cliente, contato, dataAmanha, configuracoes);
  }

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-sm sm:p-5 ${
        selected ? "border-brand ring-2 ring-brand" : "border-border"
      }`}
    >
      <button type="button" onClick={() => onSelect(lembrete.id)} className="flex flex-col gap-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{nomeExibicao}</p>
            {cliente?.nomePreferencia && (
              <p className="truncate text-xs text-foreground/50">{cliente.nome}</p>
            )}
          </div>
          <StatusBadge status={lembrete.statusAgendamento} size="sm" />
        </div>

        {cliente?.status === "inativa" && (
          <span className="w-fit rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/50">
            {c.statusLabel.inativa}
          </span>
        )}

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
              {contatoPrincipal?.telefone ?? l.campos.semTelefone}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-foreground/50">
              <GlobeIcon className="h-3.5 w-3.5" />
              {l.campos.idioma}
            </dt>
            <dd className="font-medium text-foreground">{c.idiomaLabel[idioma]}</dd>
          </div>
        </dl>

        <LembreteStatusBadge status={lembrete.statusLembrete} />
      </button>

      {semTelefone && (
        <p className="rounded-xl bg-status-aguardando/10 px-3 py-2 text-xs text-status-aguardando">
          {c.campos.semTelefoneExplicacao}
        </p>
      )}

      {contatoPrincipal && (
        <div className="flex flex-col gap-1.5">
          {contatoSecundario && (
            <p className="text-xs font-semibold text-foreground/60">{c.detalhes.contatoPrincipal}</p>
          )}
          <ContatoAcoesMensagem
            contato={contatoPrincipal}
            mensagem={mensagemPara(contatoPrincipal)}
            labelWhatsapp={l.acoes.abrirWhatsapp}
            labelSms={l.acoes.prepararSms}
            avisoLembretesDesativados={l.painel.avisoNaoReceber}
            onAbrirCanal={(canal) =>
              registrarMensagemPreparada({
                lembreteId: lembrete.id,
                papel: "principal",
                canal,
                idioma: contatoPrincipal.idioma,
                texto: mensagemPara(contatoPrincipal),
              })
            }
          />
        </div>
      )}

      {contatoSecundario && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-foreground/60">{c.detalhes.contatoSecundario}</p>
          <ContatoAcoesMensagem
            contato={contatoSecundario}
            mensagem={mensagemPara(contatoSecundario)}
            labelWhatsapp={l.acoes.abrirWhatsapp}
            labelSms={l.acoes.prepararSms}
            avisoLembretesDesativados={l.painel.avisoNaoReceber}
            onAbrirCanal={(canal) =>
              registrarMensagemPreparada({
                lembreteId: lembrete.id,
                papel: "secundario",
                canal,
                idioma: contatoSecundario.idioma,
                texto: mensagemPara(contatoSecundario),
              })
            }
          />
        </div>
      )}

      <button type="button" onClick={() => onSelect(lembrete.id)} className={actionButtonClasses}>
        <InfoIcon className="h-4 w-4" />
        {l.acoes.verDetalhes}
      </button>
    </div>
  );
}
