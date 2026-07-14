import type { FormaPagamento } from "@/lib/atendimentos-mock";

export type StatusPagamento = "recebido" | "pendente" | "parcial" | "cortesia";

export type Pagamento = {
  id: string;
  cliente: string;
  atendimentoRelacionado: string;
  dataAtendimento: string;
  dataPagamento: string | null;
  servicoPt: string;
  servicoEn: string;
  valorServicos: number;
  desconto: number;
  gorjeta: number;
  valorRecebido: number;
  saldoPendente: number;
  formaPagamento: FormaPagamento | null;
  status: StatusPagamento;
  observacoesPt: string;
  observacoesEn: string;
};

export const mockResumoFinanceiro = {
  totalRecebido: 220,
  valorServicosRealizados: 260,
  gorjetas: 20,
  descontos: 10,
  totalPendente: 45,
  quantidadeAtendimentos: 4,
  ticketMedioServicos: 65,
};

export const mockFormasPagamento: { forma: FormaPagamento; valor: number }[] = [
  { forma: "dinheiro", valor: 80 },
  { forma: "cartaoCredito", valor: 75 },
  { forma: "zelle", valor: 55 },
  { forma: "venmo", valor: 10 },
];

export const mockPagamentos: Pagamento[] = [
  {
    id: "pag-1",
    cliente: "Maria Costa",
    atendimentoRelacionado: "Esmaltação em gel · 07/14/2026",
    dataAtendimento: "07/14/2026",
    dataPagamento: "07/14/2026",
    servicoPt: "Esmaltação em gel",
    servicoEn: "Gel polish",
    valorServicos: 40,
    desconto: 0,
    gorjeta: 10,
    valorRecebido: 40,
    saldoPendente: 0,
    formaPagamento: "zelle",
    status: "recebido",
    observacoesPt: "",
    observacoesEn: "",
  },
  {
    id: "pag-2",
    cliente: "Juliana Santos",
    atendimentoRelacionado: "Alongamento · 07/13/2026",
    dataAtendimento: "07/13/2026",
    dataPagamento: "07/14/2026",
    servicoPt: "Alongamento",
    servicoEn: "Nail extension",
    valorServicos: 110,
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 65,
    saldoPendente: 45,
    formaPagamento: "cartaoCredito",
    status: "parcial",
    observacoesPt: "Pagamento restante combinado para o próximo atendimento.",
    observacoesEn: "Remaining payment arranged for the next appointment.",
  },
  {
    id: "pag-3",
    cliente: "Cliente de teste",
    atendimentoRelacionado: "Cortesia · 07/14/2026",
    dataAtendimento: "07/14/2026",
    dataPagamento: null,
    servicoPt: "Cortesia",
    servicoEn: "Complimentary",
    valorServicos: 0,
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 0,
    saldoPendente: 0,
    formaPagamento: null,
    status: "cortesia",
    observacoesPt: "Correção gratuita.",
    observacoesEn: "Complimentary fix.",
  },
  {
    id: "pag-4",
    cliente: "Ana Silva",
    atendimentoRelacionado: "Manutenção · 07/14/2026",
    dataAtendimento: "07/14/2026",
    dataPagamento: "07/14/2026",
    servicoPt: "Manutenção",
    servicoEn: "Maintenance",
    valorServicos: 45,
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 45,
    saldoPendente: 0,
    formaPagamento: "dinheiro",
    status: "recebido",
    observacoesPt: "",
    observacoesEn: "",
  },
];

export const mockValorPendente = {
  pagamentoId: "pag-2",
  cliente: "Juliana Santos",
  dataAtendimento: "07/13/2026",
  valorDevido: 110,
  valorRecebido: 65,
  saldoPendente: 45,
  diasEmAberto: 1,
};

export const mockRelatorioAtendimentos = {
  quantidadeAtendimentos: 4,
  quantidadeClientesAtendidas: 4,
  clientesNovas: 1,
  clientesRecorrentes: 3,
  servicosRealizados: 4,
  valorServicos: 260,
  totalRecebido: 220,
  totalPendente: 45,
  gorjetas: 20,
  descontos: 10,
  ticketMedio: 65,
  cancelamentos: 1,
  ausencias: 0,
};

export type ItemDetalhamento = { labelPt: string; labelEn: string; valor: number };

export type DimensaoDetalhamento = "cliente" | "servico" | "formaPagamento" | "statusPagamento";

export const mockDetalhamento: Record<DimensaoDetalhamento, ItemDetalhamento[]> = {
  cliente: [
    { labelPt: "Ana Silva", labelEn: "Ana Silva", valor: 45 },
    { labelPt: "Maria Costa", labelEn: "Maria Costa", valor: 50 },
    { labelPt: "Juliana Santos", labelEn: "Juliana Santos", valor: 65 },
    { labelPt: "Cliente de teste", labelEn: "Test client", valor: 0 },
  ],
  servico: [
    { labelPt: "Manutenção", labelEn: "Maintenance", valor: 45 },
    { labelPt: "Esmaltação em gel", labelEn: "Gel polish", valor: 40 },
    { labelPt: "Alongamento", labelEn: "Nail extension", valor: 110 },
    { labelPt: "Cortesia", labelEn: "Complimentary", valor: 0 },
  ],
  formaPagamento: [
    { labelPt: "Dinheiro", labelEn: "Cash", valor: 80 },
    { labelPt: "Cartão de crédito", labelEn: "Credit card", valor: 75 },
    { labelPt: "Zelle", labelEn: "Zelle", valor: 55 },
    { labelPt: "Venmo", labelEn: "Venmo", valor: 10 },
  ],
  statusPagamento: [
    { labelPt: "Recebido", labelEn: "Received", valor: 85 },
    { labelPt: "Parcial", labelEn: "Partial", valor: 65 },
    { labelPt: "Cortesia", labelEn: "Complimentary", valor: 0 },
  ],
};
