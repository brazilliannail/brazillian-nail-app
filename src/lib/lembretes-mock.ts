import type { Cliente, Contato } from "@/lib/clientes-mock";
import type { ConfiguracoesState } from "@/lib/configuracoes-mock";
import { buildMensagemLembreteConfiguravel } from "@/lib/mensagens";

export type LembreteStatusAgendamento = "aguardando" | "confirmado";
export type LembreteStatus =
  | "pendente"
  | "preparado"
  | "enviado"
  | "tratadoPessoalmente"
  | "ignorado"
  | "indisponivel";

export type Lembrete = {
  id: string;
  clienteId: string;
  horario: string;
  servicoPt: string;
  servicoEn: string;
  statusAgendamento: LembreteStatusAgendamento;
  statusLembrete: LembreteStatus;
  consentimentoRegistrado: boolean;
  mensagemPersonalizada: string | null;
  mensagemPersonalizadaSecundario: string | null;
};

/** Monta o endereço do negócio a partir de Configurações — fonte única para exibição e mensagens. */
export function enderecoDoNegocio(configuracoes: ConfiguracoesState) {
  const { endereco, cidade, estado, zip } = configuracoes.negocio;
  return `${endereco}, ${cidade}, ${estado} ${zip}`;
}

/** Monta a mensagem do lembrete a partir do template configurável (Configurações → Lembretes),
 * no idioma do contato informado (PT, EN ou bilíngue). */
export function buildMensagemLembrete(
  lembrete: Lembrete,
  cliente: Cliente | undefined,
  contato: Contato | null,
  dataAmanha: string,
  configuracoes: ConfiguracoesState,
) {
  const nome = cliente?.nomePreferencia ?? cliente?.nome ?? "";
  const idioma = contato?.idioma ?? "pt";
  return buildMensagemLembreteConfiguravel(idioma, configuracoes.lembretes.textoPadraoPt, configuracoes.lembretes.textoPadraoEn, {
    nome,
    data: dataAmanha,
    horario: lembrete.horario,
    servico: idioma === "en" ? lembrete.servicoEn : lembrete.servicoPt,
    negocio: configuracoes.negocio.nomeCurto,
    endereco: enderecoDoNegocio(configuracoes),
  });
}
