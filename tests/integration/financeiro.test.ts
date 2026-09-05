import { describe, it, expect } from "vitest";

import {
  calcularAgregadoFinanceiro,
  calcularRelatorioAtendimentos,
  detalharPorCliente,
  detalharPorServico,
  listarPendencias,
  listarAtendimentosFinanceiros,
  buscarAtendimentoFinanceiro,
  calcularSaldoAbertoGlobal,
  detalharPorFormaPagamento,
  detalharPorStatusPagamento,
  statusPagamentoDeAtendimento,
} from "@/lib/financeiro-service";
import type { Atendimento, AtendimentoStatus, ServicoRealizado } from "@/lib/atendimentos-mock";
import type { Cliente } from "@/lib/clientes-mock";
import type { LancamentoCaixa } from "@/lib/financeiro-repo";
import type { DateRange } from "@/lib/financeiro-comparacao";

// financeiro-service.ts é uma camada de funções puras (sem I/O) — as fixtures abaixo são objetos
// em memória, sem depender do banco de teste (ao contrário das demais suítes de integração).

const RANGE_HOJE: DateRange = { start: new Date(2026, 7, 2, 0, 0, 0, 0), end: new Date(2026, 7, 2, 23, 59, 59, 999) };
const DATA_NO_RANGE = "08/02/2026";

let proximoId = 1;

function criarServico(valor: number, nome = "Manicure"): ServicoRealizado {
  return { servicoId: "SRV-000001", nomePt: nome, nomeEn: nome, valor };
}

function criarAtendimento(overrides: {
  status: AtendimentoStatus;
  servicos: ServicoRealizado[];
  clienteId?: string;
  data?: string;
  desconto?: number;
  valorRecebido?: number;
}): Atendimento {
  const id = `ATD-${String(proximoId++).padStart(6, "0")}`;
  return {
    id,
    clienteId: overrides.clienteId ?? "CLI-000001",
    agendamentoId: null,
    profissional: "Rosangela",
    data: overrides.data ?? DATA_NO_RANGE,
    horarioInicio: "09:00",
    horarioFim: "10:00",
    duracaoMin: 60,
    servicos: overrides.servicos,
    desconto: overrides.desconto ?? 0,
    gorjeta: 0,
    valorRecebido: overrides.valorRecebido ?? 0,
    formaPagamento: null,
    status: overrides.status,
    observacoesPt: "",
    observacoesEn: "",
    retornoSugeridoDias: null,
    proximoAgendamentoId: null,
  };
}

describe("financeiro-service — estornos não compõem faturamento (PROJECT_STATUS.md §13 item 2)", () => {
  it("Valor de Serviços, Descontos, Quantidade de Atendimentos e Ticket Médio excluem atendimento estornado do período", () => {
    const pago = criarAtendimento({ status: "finalizadoPago", servicos: [criarServico(100)], desconto: 10, valorRecebido: 90 });
    const estornado = criarAtendimento({ status: "estornado", servicos: [criarServico(50)] });

    const agregado = calcularAgregadoFinanceiro([pago, estornado], [], RANGE_HOJE);

    expect(agregado.valorServicos).toBe(100);
    expect(agregado.descontos).toBe(10);
    expect(agregado.quantidadeAtendimentos).toBe(1);
    expect(agregado.ticketMedio).toBe(100);
  });

  it("expõe estornosQuantidade/estornosValor do período, sem misturar com os demais indicadores", () => {
    const pago = criarAtendimento({ status: "finalizadoPago", servicos: [criarServico(100)], valorRecebido: 100 });
    const estornado1 = criarAtendimento({ status: "estornado", servicos: [criarServico(50)] });
    const estornado2 = criarAtendimento({ status: "estornado", servicos: [criarServico(30)] });

    const agregado = calcularAgregadoFinanceiro([pago, estornado1, estornado2], [], RANGE_HOJE);

    expect(agregado.estornosQuantidade).toBe(2);
    expect(agregado.estornosValor).toBe(80);
    expect(agregado.valorServicos).toBe(100);
  });

  it("totalRecebido/gorjetas continuam líquidos de estorno via o livro-razão (pagamentos), sem depender do status do atendimento", () => {
    const pago = criarAtendimento({ status: "finalizadoPago", servicos: [criarServico(100)], valorRecebido: 100 });
    const lancamentos: LancamentoCaixa[] = [
      {
        id: "PGT-000001",
        atendimentoId: pago.id,
        natureza: "servico",
        tipo: "entrada",
        dataPagamento: new Date(2026, 7, 2),
        valor: 100,
        formaPagamento: "dinheiro",
        observacoesPt: "",
        observacoesEn: "",
      },
      {
        id: "PGT-000002",
        atendimentoId: pago.id,
        natureza: "servico",
        tipo: "estorno",
        dataPagamento: new Date(2026, 7, 2),
        valor: 100,
        formaPagamento: "dinheiro",
        observacoesPt: "",
        observacoesEn: "",
      },
    ];

    const agregado = calcularAgregadoFinanceiro([pago], lancamentos, RANGE_HOJE);

    expect(agregado.totalRecebido).toBe(0);
  });

  it("detalharPorCliente e detalharPorServico excluem atendimento estornado, batendo com Valor de Serviços", () => {
    const pago = criarAtendimento({
      status: "finalizadoPago",
      servicos: [criarServico(100, "Manicure")],
      clienteId: "CLI-000001",
      valorRecebido: 100,
    });
    const estornado = criarAtendimento({
      status: "estornado",
      servicos: [criarServico(50, "Pedicure")],
      clienteId: "CLI-000001",
    });

    const porCliente = detalharPorCliente([pago, estornado], RANGE_HOJE);
    const porServico = detalharPorServico([pago, estornado], RANGE_HOJE);

    expect(porCliente).toEqual([{ clienteId: "CLI-000001", valor: 100 }]);
    expect(porServico).toHaveLength(1);
    expect(porServico[0]).toMatchObject({ nomePt: "Manicure", valor: 100 });
  });

  it("totalPendente, listarPendencias e calcularSaldoAbertoGlobal continuam sem considerar atendimento estornado (comportamento já existente, sem mudança)", () => {
    const estornado = criarAtendimento({ status: "estornado", servicos: [criarServico(50)], valorRecebido: 0 });

    const agregado = calcularAgregadoFinanceiro([estornado], [], RANGE_HOJE);
    const pendencias = listarPendencias([estornado], new Map(), new Date(2026, 7, 2));
    const saldoGlobal = calcularSaldoAbertoGlobal([estornado]);

    expect(agregado.totalPendente).toBe(0);
    expect(pendencias).toHaveLength(0);
    expect(saldoGlobal).toBe(0);
  });

  it("calcularRelatorioAtendimentos mantém o atendimento estornado no histórico operacional (produção), mesmo excluído do faturamento", () => {
    const estornado = criarAtendimento({ status: "estornado", servicos: [criarServico(50)], clienteId: "CLI-000001" });

    const relatorio = calcularRelatorioAtendimentos([estornado], [], [], RANGE_HOJE);

    expect(relatorio.quantidadeClientesAtendidas).toBe(1);
    expect(relatorio.servicosRealizados).toBe(1);
    expect(relatorio.valorServicos).toBe(0);
    expect(relatorio.quantidadeAtendimentos).toBe(0);
  });
});

describe("financeiro-service — detalhamentos e limites do período", () => {
  it("mapeia somente estados financeiros finalizados", () => {
    expect(statusPagamentoDeAtendimento("finalizadoPago")).toBe("recebido");
    expect(statusPagamentoDeAtendimento("finalizadoPendente")).toBe("pendente");
    expect(statusPagamentoDeAtendimento("finalizadoParcial")).toBe("parcial");
    expect(statusPagamentoDeAtendimento("finalizadoCortesia")).toBe("cortesia");
    expect(statusPagamentoDeAtendimento("emAndamento")).toBeNull();
    expect(statusPagamentoDeAtendimento("cancelado")).toBeNull();
    expect(statusPagamentoDeAtendimento("estornado")).toBeNull();
  });

  it("detalha recebimentos líquidos por forma sem misturar gorjetas", () => {
    const dataPagamento = new Date(2026, 7, 2, 12);
    const base = {
      atendimentoId: "ATD-000001",
      dataPagamento,
      observacoesPt: "",
      observacoesEn: "",
    };
    const lancamentos: LancamentoCaixa[] = [
      { ...base, id: "PGT-000001", natureza: "servico", tipo: "entrada", valor: 100, formaPagamento: "cartaoCredito" },
      { ...base, id: "PGT-000002", natureza: "servico", tipo: "estorno", valor: 25, formaPagamento: "cartaoCredito" },
      { ...base, id: "PGT-000003", natureza: "gorjeta", tipo: "entrada", valor: 20, formaPagamento: "cartaoCredito" },
      { ...base, id: "PGT-000004", natureza: "servico", tipo: "entrada", valor: 40, formaPagamento: "dinheiro" },
    ] as LancamentoCaixa[];

    expect(detalharPorFormaPagamento(lancamentos, RANGE_HOJE)).toEqual([
      { forma: "cartaoCredito", valor: 75 },
      { forma: "dinheiro", valor: 40 },
    ]);
  });

  it("detalha o valor bruto por status de pagamento e ignora estados não financeiros", () => {
    const pago = criarAtendimento({ status: "finalizadoPago", servicos: [criarServico(100)] });
    const parcial = criarAtendimento({ status: "finalizadoParcial", servicos: [criarServico(60)] });
    const cancelado = criarAtendimento({ status: "cancelado", servicos: [criarServico(500)] });

    expect(detalharPorStatusPagamento([pago, parcial, cancelado], RANGE_HOJE)).toEqual([
      { status: "recebido", valor: 100 },
      { status: "parcial", valor: 60 },
    ]);
  });

  // Contrato usado pelo clique no `ValorPendenteCard` (Financeiro): selecionar uma pendência
  // precisa abrir o painel de detalhes do MESMO atendimento — nunca de outro, nunca vazio quando
  // a pendência existe. `buscarAtendimentoFinanceiro` é a função que resolve isso (ver seu próprio
  // docstring); estes testes travam esse contrato sem depender de React/DOM.
  describe("seleção de 'Valores pendentes' → painel de detalhes (buscarAtendimentoFinanceiro)", () => {
    it("cada pendência listada é resolvida para o MESMO atendimento pelo id (seleção correta)", () => {
      const clientesPorId = new Map<string, Cliente>();
      const a = criarAtendimento({ status: "finalizadoPendente", servicos: [criarServico(80)], clienteId: "CLI-000001", valorRecebido: 0 });
      const b = criarAtendimento({ status: "finalizadoParcial", servicos: [criarServico(50)], clienteId: "CLI-000002", valorRecebido: 20 });
      const atendimentos = [a, b];

      const pendencias = listarPendencias(atendimentos, clientesPorId, new Date(2026, 7, 2));
      expect(pendencias).toHaveLength(2);

      for (const pendente of pendencias) {
        const resolvido = buscarAtendimentoFinanceiro(pendente.atendimentoId, atendimentos, clientesPorId, []);
        expect(resolvido).not.toBeNull();
        expect(resolvido?.atendimentoId).toBe(pendente.atendimentoId);
        expect(resolvido?.clienteId).toBe(pendente.clienteId);
        expect(resolvido?.saldoPendente).toBe(pendente.saldoPendente);
      }
    });

    it("atendimento inexistente não resolve nada — o clique não deve abrir painel algum", () => {
      expect(buscarAtendimentoFinanceiro("ATD-999999", [], new Map(), [])).toBeNull();

      const existente = criarAtendimento({ status: "finalizadoPendente", servicos: [criarServico(30)] });
      expect(buscarAtendimentoFinanceiro("ATD-999999", [existente], new Map(), [])).toBeNull();
    });

    it("encontra a pendência mesmo fora do período do Dashboard (diferente da lista filtrada por período)", () => {
      const foraDoPeriodo = criarAtendimento({
        status: "finalizadoPendente",
        servicos: [criarServico(90)],
        data: "01/05/2026", // bem antes de RANGE_HOJE (08/02/2026)
        valorRecebido: 0,
      });

      // A lista financeira "por período" (Dashboard) não inclui este atendimento.
      expect(listarAtendimentosFinanceiros([foraDoPeriodo], new Map(), [], RANGE_HOJE)).toHaveLength(0);
      // Mas ele continua pendente globalmente e é o que "Valores pendentes" lista/abre.
      const pendencias = listarPendencias([foraDoPeriodo], new Map(), new Date(2026, 7, 2));
      expect(pendencias).toHaveLength(1);
      const resolvido = buscarAtendimentoFinanceiro(pendencias[0].atendimentoId, [foraDoPeriodo], new Map(), []);
      expect(resolvido?.atendimentoId).toBe(foraDoPeriodo.id);
      expect(resolvido?.saldoPendente).toBe(pendencias[0].saldoPendente);
    });
  });
});
