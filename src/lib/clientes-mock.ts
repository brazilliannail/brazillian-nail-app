import type { AtendimentoStatus, FormaPagamento } from "@/lib/atendimentos-mock";

export type ClienteStatus = "ativa" | "inativa";
export type ReengajamentoStatus = "nenhum" | "contatado" | "adiado" | "ignorado";
export type StatusPagamentoHistorico = "pago" | "pendente" | "parcial" | "cancelado";

export type IdiomaContato = "pt" | "en" | "bilingue";
export type RelacaoContato = "propria" | "mae" | "pai" | "conjuge" | "responsavel" | "outro";
export type CanalPreferidoContato = "whatsapp" | "sms" | "ambos";

export type Contato = {
  nomeContato: string;
  telefone: string;
  relacao: RelacaoContato;
  idioma: IdiomaContato;
  canalPreferido: CanalPreferidoContato;
  receberLembretes: boolean;
};

export type HistoricoAtendimento = {
  id: string;
  data: string;
  horario: string;
  servicoPt: string;
  servicoEn: string;
  valorServicos: number;
  desconto: number;
  gorjeta: number;
  valorRecebido: number;
  formaPagamento: FormaPagamento | null;
  status: StatusPagamentoHistorico;
  observacoesPt: string;
  observacoesEn: string;
  proximoRetorno: string | null;
};

export function valorTotalDevidoHistorico(item: HistoricoAtendimento) {
  return item.valorServicos - item.desconto;
}

export function saldoPendenteHistorico(item: HistoricoAtendimento) {
  if (item.status === "cancelado") return 0;
  return Math.max(valorTotalDevidoHistorico(item) - item.valorRecebido, 0);
}

/**
 * Mapeia o status de um Atendimento para o status de pagamento usado no histórico da Cliente.
 * Retorna `null` para "emAndamento", que não deve aparecer no histórico (ainda não finalizado).
 */
export function statusHistoricoDeAtendimento(status: AtendimentoStatus): StatusPagamentoHistorico | null {
  switch (status) {
    case "finalizadoPago":
    case "finalizadoCortesia":
      return "pago";
    case "finalizadoPendente":
      return "pendente";
    case "finalizadoParcial":
      return "parcial";
    case "cancelado":
    case "estornado":
      return "cancelado";
    case "emAndamento":
      return null;
  }
}

/** Formata o número sequencial da cliente no padrão CLI-000001. */
export function formatClienteId(numero: number) {
  return `CLI-${String(numero).padStart(6, "0")}`;
}

/** Extrai o número sequencial de um identificador CLI-000001. Retorna 0 se não reconhecer o padrão. */
export function numeroClienteId(id: string) {
  const match = /^CLI-(\d+)$/.exec(id);
  return match ? parseInt(match[1], 10) : 0;
}

export type Cliente = {
  id: string;
  nome: string;
  nomePreferencia: string | null;
  contatoPrincipal: Contato | null;
  contatoSecundario: Contato | null;
  status: ClienteStatus;
  ultimoAtendimento: string;
  proximoAgendamento: string | null;
  observacoesPt: string;
  observacoesEn: string;
  avisosImportantesPt: string[];
  avisosImportantesEn: string[];
  valorPendente: number;
  historico: HistoricoAtendimento[];
  /** Requisito futuro (DATABASE_DESIGN.md §4.1.1): estado da ação da profissional sobre o alerta
   * de "cliente inativa há +30 dias". Opcional porque ainda não há tela que edite estes campos —
   * quando ausente, equivale a "nenhum"/sem decisão registrada. */
  reengajamentoStatus?: ReengajamentoStatus;
  reengajamentoAtualizadoEm?: string | null;
  reengajamentoAdiadoAte?: string | null;
  reengajamentoObservacao?: string | null;
};
