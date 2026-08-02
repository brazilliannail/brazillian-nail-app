import { describe, it, expect } from "vitest";

import {
  calcularAgregadoFinanceiro,
  calcularRelatorioAtendimentos,
  detalharPorCliente,
  detalharPorServico,
  listarPendencias,
  calcularSaldoAbertoGlobal,
} from "@/lib/financeiro-service";
import type { Atendimento, AtendimentoStatus, ServicoRealizado } from "@/lib/atendimentos-mock";
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
