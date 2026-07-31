import { prisma } from "@/lib/db";
import { createConfiguracoesIniciais, type ConfiguracoesState, type DiaSemana } from "@/lib/configuracoes-mock";
import type { FormaPagamento } from "@/lib/atendimentos-mock";

type ConfiguracaoRow = {
  negocioNome: string;
  negocioNomeCurto: string;
  negocioTelefone: string;
  negocioEmail: string;
  negocioEndereco: string;
  negocioCidade: string;
  negocioEstado: string;
  negocioZip: string;
  fusoHorario: string;
  moeda: string;
  formatoData: string;
  formatoHora: string;
  idiomaPadraoMensagens: string;
  permitirAlterarIdiomaPorCliente: boolean;
  agendaHorarioAbertura: string;
  agendaHorarioFechamento: string;
  agendaDuracaoPadraoMin: number;
  agendaDiasFuncionamento: string;
  agendaBloqueioConflito: boolean;
  agendaPermitirEncaixe: boolean;
  lembretesAtivarDiaAnterior: boolean;
  lembretesHorarioPadraoAviso: string;
  lembretesCanalPreferido: string;
  lembretesExigirConfirmacaoManual: boolean;
  lembretesTextoPadraoPt: string;
  lembretesTextoPadraoEn: string;
  financeiroFormasPagamentoAtivas: string;
  financeiroMostrarGorjetaSeparada: boolean;
  financeiroPermitirPagamentoParcial: boolean;
  financeiroMostrarValoresPendentes: boolean;
  segurancaEmailPrincipal: string;
  segurancaSessaoExpiracaoMin: number;
};

/** Mapeia a linha singleton de `configuracoes` para o tipo `ConfiguracoesState` da UI. */
export function mapConfiguracaoRow(row: ConfiguracaoRow): ConfiguracoesState {
  return {
    negocio: {
      nome: row.negocioNome,
      nomeCurto: row.negocioNomeCurto,
      telefone: row.negocioTelefone,
      email: row.negocioEmail,
      endereco: row.negocioEndereco,
      cidade: row.negocioCidade,
      estado: row.negocioEstado,
      zip: row.negocioZip,
      fusoHorario: row.fusoHorario,
      moeda: row.moeda,
      formatoData: row.formatoData,
      formatoHora: row.formatoHora,
    },
    idioma: {
      idiomaPadraoMensagens: row.idiomaPadraoMensagens as "pt" | "en",
      permitirAlterarPorCliente: row.permitirAlterarIdiomaPorCliente,
    },
    agenda: {
      horarioAbertura: row.agendaHorarioAbertura,
      horarioFechamento: row.agendaHorarioFechamento,
      duracaoPadraoMinutos: row.agendaDuracaoPadraoMin,
      diasFuncionamento: JSON.parse(row.agendaDiasFuncionamento) as DiaSemana[],
      bloqueioConflitoHorario: row.agendaBloqueioConflito,
      permitirEncaixeComConfirmacao: row.agendaPermitirEncaixe,
    },
    lembretes: {
      ativarLembretesDiaAnterior: row.lembretesAtivarDiaAnterior,
      horarioPadraoAviso: row.lembretesHorarioPadraoAviso,
      canalPreferido: row.lembretesCanalPreferido as "whatsapp" | "sms",
      exigirConfirmacaoManual: row.lembretesExigirConfirmacaoManual,
      textoPadraoPt: row.lembretesTextoPadraoPt,
      textoPadraoEn: row.lembretesTextoPadraoEn,
    },
    financeiro: {
      formasPagamentoAtivas: JSON.parse(row.financeiroFormasPagamentoAtivas) as Record<FormaPagamento, boolean>,
      mostrarGorjetaSeparadamente: row.financeiroMostrarGorjetaSeparada,
      permitirPagamentoParcial: row.financeiroPermitirPagamentoParcial,
      mostrarValoresPendentes: row.financeiroMostrarValoresPendentes,
    },
    seguranca: {
      emailPrincipal: row.segurancaEmailPrincipal,
      sessaoExpiracaoMinutos: String(row.segurancaSessaoExpiracaoMin) as ConfiguracoesState["seguranca"]["sessaoExpiracaoMinutos"],
    },
  };
}

/** Converte o estado da UI nos campos de coluna da tabela `configuracoes` (sem o `id`). */
export function stateToRow(state: ConfiguracoesState) {
  return {
    negocioNome: state.negocio.nome,
    negocioNomeCurto: state.negocio.nomeCurto,
    negocioTelefone: state.negocio.telefone,
    negocioEmail: state.negocio.email,
    negocioEndereco: state.negocio.endereco,
    negocioCidade: state.negocio.cidade,
    negocioEstado: state.negocio.estado,
    negocioZip: state.negocio.zip,
    fusoHorario: state.negocio.fusoHorario,
    moeda: state.negocio.moeda,
    formatoData: state.negocio.formatoData,
    formatoHora: state.negocio.formatoHora,
    idiomaPadraoMensagens: state.idioma.idiomaPadraoMensagens,
    permitirAlterarIdiomaPorCliente: state.idioma.permitirAlterarPorCliente,
    agendaHorarioAbertura: state.agenda.horarioAbertura,
    agendaHorarioFechamento: state.agenda.horarioFechamento,
    agendaDuracaoPadraoMin: state.agenda.duracaoPadraoMinutos,
    agendaDiasFuncionamento: JSON.stringify(state.agenda.diasFuncionamento),
    agendaBloqueioConflito: state.agenda.bloqueioConflitoHorario,
    agendaPermitirEncaixe: state.agenda.permitirEncaixeComConfirmacao,
    lembretesAtivarDiaAnterior: state.lembretes.ativarLembretesDiaAnterior,
    lembretesHorarioPadraoAviso: state.lembretes.horarioPadraoAviso,
    lembretesCanalPreferido: state.lembretes.canalPreferido,
    lembretesExigirConfirmacaoManual: state.lembretes.exigirConfirmacaoManual,
    lembretesTextoPadraoPt: state.lembretes.textoPadraoPt,
    lembretesTextoPadraoEn: state.lembretes.textoPadraoEn,
    financeiroFormasPagamentoAtivas: JSON.stringify(state.financeiro.formasPagamentoAtivas),
    financeiroMostrarGorjetaSeparada: state.financeiro.mostrarGorjetaSeparadamente,
    financeiroPermitirPagamentoParcial: state.financeiro.permitirPagamentoParcial,
    financeiroMostrarValoresPendentes: state.financeiro.mostrarValoresPendentes,
    segurancaEmailPrincipal: state.seguranca.emailPrincipal,
    segurancaSessaoExpiracaoMin: Number(state.seguranca.sessaoExpiracaoMinutos),
  };
}

/**
 * Lê o registro singleton (id fixo 1) de `configuracoes`. Na primeira execução em um banco novo
 * a linha ainda não existe — cria com os valores padrão (os mesmos já usados no protótipo mock)
 * em vez de depender de backfill em migration, para não repetir o problema já visto em
 * `20260728120000_pagamentos_ledger` (dados fixos numa migration corrompendo bancos recriados).
 */
export async function getConfiguracoes(): Promise<ConfiguracoesState> {
  const existente = await prisma.configuracao.findUnique({ where: { id: 1 } });
  if (existente) return mapConfiguracaoRow(existente);

  const padrao = createConfiguracoesIniciais();
  const criado = await prisma.configuracao.create({ data: { id: 1, ...stateToRow(padrao) } });
  return mapConfiguracaoRow(criado);
}
