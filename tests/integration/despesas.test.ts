import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  criarDespesaAvulsaAction,
  criarDespesaParceladaAction,
  criarDespesaRecorrenteAction,
  gerarLancamentosRecorrentesPendentesAction,
  registrarPagamentoLancamentoAction,
  cancelarLancamentoAction,
  corrigirLancamentoDespesaAction,
  cancelarDespesaAction,
} from "@/lib/despesas-actions";
import { getDespesas, getLancamentosDespesa } from "@/lib/despesas-repo";
import { dividirEmParcelas, centavosParaDolares } from "@/lib/despesas-mock";
import { calcularAgregadoDespesas, calcularSaldoOperacional } from "@/lib/financeiro-service";
import { obterBackupCompleto, obterCsv } from "@/lib/exportacao";
import { validarBackupCompleto } from "@/lib/backup-validation";
import { formatDateISO } from "@/lib/date";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

function addDias(iso: string, dias: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dias);
  return formatDateISO(date);
}

describe("despesas — matemática de parcelamento (pura)", () => {
  it("US$1.200 em 10 parcelas produz dez parcelas de US$120 exatas", () => {
    const parcelas = dividirEmParcelas(120000, 10);
    expect(parcelas).toEqual(Array(10).fill(12000));
    expect(parcelas.reduce((a, b) => a + b, 0)).toBe(120000);
  });

  it("US$100 em 3 parcelas preserva a soma exata, diferença na última parcela", () => {
    const parcelas = dividirEmParcelas(10000, 3);
    expect(parcelas).toEqual([3333, 3333, 3334]);
    expect(parcelas.reduce((a, b) => a + b, 0)).toBe(10000);
  });
});

describe("despesas — avulsa", () => {
  it("gera um único lançamento pendente vencendo na data da despesa", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Compra de esmaltes",
      categoria: "comprasEquipamentos",
      valorTotal: 89.9,
      data: "2026-03-10",
    });

    const lancamentos = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0].vencimento).toBe("2026-03-10");
    expect(lancamentos[0].status).toBe("pendente");
    expect(centavosParaDolares(lancamentos[0].valorCentavos)).toBeCloseTo(89.9, 2);
  });
});

describe("despesas — parcelada", () => {
  it("US$1.200 em 10x gera 10 lançamentos de US$120, 1ª parcela na data da compra", async () => {
    const despesa = await criarDespesaParceladaAction({
      descricao: "Equipamento de manicure",
      categoria: "comprasEquipamentos",
      valorTotal: 1200,
      parcelas: 10,
      data: "2026-01-15",
    });

    const lancamentos = (await getLancamentosDespesa())
      .filter((l) => l.despesaId === despesa.id)
      .sort((a, b) => (a.numeroParcela ?? 0) - (b.numeroParcela ?? 0));

    expect(lancamentos).toHaveLength(10);
    expect(lancamentos[0].vencimento).toBe("2026-01-15");
    expect(lancamentos[9].vencimento).toBe("2026-10-15");
    for (const l of lancamentos) expect(centavosParaDolares(l.valorCentavos)).toBeCloseTo(120, 2);

    const somaCentavos = lancamentos.reduce((total, l) => total + l.valorCentavos, 0);
    expect(somaCentavos).toBe(120000);
  });

  it("preserva a soma exata quando o total não é múltiplo do número de parcelas", async () => {
    const despesa = await criarDespesaParceladaAction({
      descricao: "Reforma da recepção",
      categoria: "outros",
      valorTotal: 100,
      parcelas: 3,
      data: "2026-02-01",
    });

    const lancamentos = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    const somaCentavos = lancamentos.reduce((total, l) => total + l.valorCentavos, 0);
    expect(somaCentavos).toBe(10000);
  });
});

describe("despesas — recorrente semanal", () => {
  it("gera ocorrências passadas e futuras dentro de um horizonte seguro, nunca infinito", async () => {
    const hojeIso = formatDateISO(new Date());
    const diaSemana = new Date().getDay();
    const dataInicio = addDias(hojeIso, -21); // 3 semanas atrás, mesmo dia da semana

    const despesa = await criarDespesaRecorrenteAction({
      descricao: "Aluguel do salão",
      categoria: "aluguel",
      valorSemanal: 150,
      diaSemana,
      dataInicio,
    });

    const lancamentos = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);

    expect(lancamentos.length).toBeGreaterThan(0);
    expect(lancamentos.length).toBeLessThan(20); // nunca gera lançamentos ilimitados
    for (const l of lancamentos) {
      expect(l.vencimento >= dataInicio).toBe(true);
      expect(l.vencimento <= addDias(hojeIso, 56)).toBe(true);
      expect(centavosParaDolares(l.valorCentavos)).toBeCloseTo(150, 2);
    }
  });

  it("é idempotente: gerar de novo não duplica lançamentos já existentes", async () => {
    const hojeIso = formatDateISO(new Date());
    const diaSemana = new Date().getDay();
    const dataInicio = addDias(hojeIso, -14);

    const despesa = await criarDespesaRecorrenteAction({
      descricao: "Assinatura de sistema",
      categoria: "contasFixas",
      valorSemanal: 20,
      diaSemana,
      dataInicio,
    });

    const antes = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    await gerarLancamentosRecorrentesPendentesAction();
    const depois = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);

    expect(depois).toHaveLength(antes.length);
  });

  it("respeita a data de encerramento, mesmo dentro do horizonte", async () => {
    const hojeIso = formatDateISO(new Date());
    const diaSemana = new Date().getDay();
    const dataInicio = addDias(hojeIso, -7);
    const dataEncerramento = addDias(dataInicio, 7); // só permite a 1ª e a 2ª ocorrência

    const despesa = await criarDespesaRecorrenteAction({
      descricao: "Serviço temporário",
      categoria: "servicosProfissionais",
      valorSemanal: 40,
      diaSemana,
      dataInicio,
      dataEncerramento,
    });

    const lancamentos = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    for (const l of lancamentos) expect(l.vencimento <= dataEncerramento).toBe(true);
  });
});

describe("despesas — pagamento, cancelamento e imutabilidade", () => {
  it("registra pagamento de um lançamento pendente", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Material de limpeza",
      categoria: "contasFixas",
      valorTotal: 45,
      data: "2026-04-01",
    });
    const [lancamento] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);

    const pago = await registrarPagamentoLancamentoAction({
      lancamentoId: lancamento.id,
      dataPagamento: "2026-04-02",
      formaPagamento: "dinheiro",
    });

    expect(pago.status).toBe("pago");
    expect(pago.dataPagamento).toBe("2026-04-02");
  });

  it("não permite cancelar um lançamento já pago", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Toalhas",
      categoria: "comprasEquipamentos",
      valorTotal: 60,
      data: "2026-04-05",
    });
    const [lancamento] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    await registrarPagamentoLancamentoAction({ lancamentoId: lancamento.id, dataPagamento: "2026-04-05" });

    await expect(cancelarLancamentoAction(lancamento.id)).rejects.toThrow(/pagos são definitivos/);
  });

  it("cancela um lançamento pendente sem excluir a linha (histórico preservado)", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Compra cancelada",
      categoria: "outros",
      valorTotal: 30,
      data: "2026-04-10",
    });
    const [lancamento] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);

    const cancelado = await cancelarLancamentoAction(lancamento.id);
    expect(cancelado.status).toBe("cancelado");

    const aindaExiste = await prisma.lancamentoDespesa.findUnique({ where: { id: lancamento.id } });
    expect(aindaExiste).not.toBeNull();
  });

  it("não permite registrar pagamento de um lançamento já cancelado", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Outra compra cancelada",
      categoria: "outros",
      valorTotal: 15,
      data: "2026-04-11",
    });
    const [lancamento] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    await cancelarLancamentoAction(lancamento.id);

    await expect(
      registrarPagamentoLancamentoAction({ lancamentoId: lancamento.id, dataPagamento: "2026-04-12" }),
    ).rejects.toThrow(/pendentes podem ser marcados/);
  });

  it("corrige um lançamento pago criando um novo lançamento de ajuste, sem editar o original", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Conserto de equipamento",
      categoria: "comprasEquipamentos",
      valorTotal: 100,
      data: "2026-04-15",
    });
    const [original] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    await registrarPagamentoLancamentoAction({ lancamentoId: original.id, dataPagamento: "2026-04-15" });

    const ajuste = await corrigirLancamentoDespesaAction({ lancamentoId: original.id, novoValorTotal: 120 });

    expect(ajuste.ajustaLancamentoId).toBe(original.id);
    expect(centavosParaDolares(ajuste.valorCentavos)).toBeCloseTo(20, 2);

    const originalDepois = await prisma.lancamentoDespesa.findUnique({ where: { id: original.id } });
    expect(originalDepois?.valorCentavos).toBe(10000); // valor original nunca muda

    const grupo = (await getLancamentosDespesa()).filter((l) => l.id === original.id || l.ajustaLancamentoId === original.id);
    const somaLiquida = grupo.reduce((total, l) => total + l.valorCentavos, 0);
    expect(centavosParaDolares(somaLiquida)).toBeCloseTo(120, 2);
  });

  it("cancela a despesa: encerra lançamentos pendentes mas preserva os já pagos", async () => {
    const despesa = await criarDespesaParceladaAction({
      descricao: "Móveis novos",
      categoria: "comprasEquipamentos",
      valorTotal: 300,
      parcelas: 3,
      data: "2026-05-01",
    });
    const lancamentos = (await getLancamentosDespesa())
      .filter((l) => l.despesaId === despesa.id)
      .sort((a, b) => (a.numeroParcela ?? 0) - (b.numeroParcela ?? 0));

    await registrarPagamentoLancamentoAction({ lancamentoId: lancamentos[0].id, dataPagamento: "2026-05-01" });

    await cancelarDespesaAction(despesa.id);

    const depois = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    const porId = new Map(depois.map((l) => [l.id, l]));
    expect(porId.get(lancamentos[0].id)?.status).toBe("pago");
    expect(porId.get(lancamentos[1].id)?.status).toBe("cancelado");
    expect(porId.get(lancamentos[2].id)?.status).toBe("cancelado");

    const despesaAtualizada = (await getDespesas()).find((d) => d.id === despesa.id);
    expect(despesaAtualizada?.status).toBe("cancelada");
  });

  it("não permite cancelar uma despesa já cancelada", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Assinatura anual",
      categoria: "contasFixas",
      valorTotal: 200,
      data: "2026-06-01",
    });
    await cancelarDespesaAction(despesa.id);
    await expect(cancelarDespesaAction(despesa.id)).rejects.toThrow(/já está cancelada/);
  });
});

describe("despesas — filtros por categoria/tipo/status", () => {
  it("cada lançamento carrega a categoria/tipo da sua despesa para filtragem", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Marketing de lançamento",
      categoria: "marketing",
      valorTotal: 75,
      data: "2026-07-01",
    });

    const despesas = await getDespesas();
    const encontrada = despesas.find((d) => d.id === despesa.id);
    expect(encontrada?.categoria).toBe("marketing");
    expect(encontrada?.tipo).toBe("avulsa");

    const lancamentos = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    expect(lancamentos[0].status).toBe("pendente");
  });
});

describe("despesas — saldo operacional", () => {
  it("saldo = receitas recebidas - despesas pagas; previsto fica separado", () => {
    const range = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31) };
    const lancamentos = [
      { valorCentavos: 10000, status: "pago" as const, dataPagamento: "2026-01-10", vencimento: "2026-01-10" },
      { valorCentavos: 5000, status: "pendente" as const, dataPagamento: null, vencimento: "2026-01-20" },
    ];

    const agregado = calcularAgregadoDespesas(lancamentos as never, range);
    expect(agregado.totalPago).toBeCloseTo(100, 2);
    expect(agregado.totalPrevisto).toBeCloseTo(50, 2);

    const saldo = calcularSaldoOperacional(400, agregado.totalPago);
    expect(saldo.receitasRecebidas).toBe(400);
    expect(saldo.despesasPagas).toBe(100);
    expect(saldo.saldo).toBe(300);
  });
});

describe("despesas — exportação", () => {
  it("inclui despesas e lançamentos no backup completo (versao 2), validado pela inspeção preventiva", async () => {
    await criarDespesaAvulsaAction({
      descricao: "Despesa para exportação",
      categoria: "outros",
      valorTotal: 10,
      data: "2026-08-01",
    });

    const backup = await obterBackupCompleto();
    expect(backup.versao).toBe(2);
    expect(backup.dados.despesas.length).toBeGreaterThan(0);
    expect(backup.dados.lancamentosDespesa.length).toBeGreaterThan(0);

    const resultado = validarBackupCompleto(JSON.parse(JSON.stringify(backup)));
    expect(resultado).toMatchObject({ valido: true });
  });

  it("gera o CSV de despesas com cabeçalho e sem vazar dados de autenticação", async () => {
    const csv = await obterCsv("despesas");
    expect(csv.split("\r\n")[0]).toContain("descricao");
    expect(csv).not.toMatch(/password|secret|token/i);
  });
});

describe("despesas — proteções no banco (FK e CHECK)", () => {
  it("impede apagar uma despesa que ainda tem lançamentos (RESTRICT, não CASCADE)", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Despesa protegida",
      categoria: "outros",
      valorTotal: 20,
      data: "2026-09-01",
    });

    await expect(prisma.despesa.delete({ where: { id: despesa.id } })).rejects.toThrow();

    const aindaExiste = await prisma.lancamentoDespesa.findMany({ where: { despesaId: despesa.id } });
    expect(aindaExiste).toHaveLength(1);
  });

  it("impede apagar um lançamento original que já tem um ajuste vinculado (RESTRICT, não SET NULL)", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Despesa com ajuste",
      categoria: "outros",
      valorTotal: 50,
      data: "2026-09-02",
    });
    const [original] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    await registrarPagamentoLancamentoAction({ lancamentoId: original.id, dataPagamento: "2026-09-02" });
    await corrigirLancamentoDespesaAction({ lancamentoId: original.id, novoValorTotal: 60 });

    await expect(prisma.lancamentoDespesa.delete({ where: { id: original.id } })).rejects.toThrow();
  });

  it("rejeita, no banco, um lançamento comum (sem ajusta_lancamento_id) com valor não positivo", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Base para CHECK",
      categoria: "outros",
      valorTotal: 10,
      data: "2026-09-03",
    });

    await expect(
      prisma.lancamentoDespesa.create({
        data: {
          id: "LDESP-999001",
          numeroSequencial: 999001,
          despesaId: despesa.id,
          competencia: "2026-09",
          vencimento: "2026-09-03",
          valorCentavos: -100,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejeita, no banco, um lançamento de ajuste que não nasça com status pago", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Base para ajuste inválido",
      categoria: "outros",
      valorTotal: 10,
      data: "2026-09-04",
    });
    const [original] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);
    await registrarPagamentoLancamentoAction({ lancamentoId: original.id, dataPagamento: "2026-09-04" });

    await expect(
      prisma.lancamentoDespesa.create({
        data: {
          id: "LDESP-999002",
          numeroSequencial: 999002,
          despesaId: despesa.id,
          competencia: "2026-09",
          vencimento: "2026-09-04",
          valorCentavos: -50,
          status: "pendente",
          ajustaLancamentoId: original.id,
        },
      }),
    ).rejects.toThrow();
  });
});

describe("despesas — validação de datas no servidor", () => {
  it("rejeita uma data de calendário inexistente (30 de fevereiro)", async () => {
    await expect(
      criarDespesaAvulsaAction({ descricao: "Data impossível", categoria: "outros", valorTotal: 10, data: "2026-02-30" }),
    ).rejects.toThrow(/[Dd]ata inválida/);
  });

  it("rejeita mês fora do intervalo (mês 13)", async () => {
    await expect(
      criarDespesaAvulsaAction({ descricao: "Mês impossível", categoria: "outros", valorTotal: 10, data: "2026-13-01" }),
    ).rejects.toThrow(/[Dd]ata inválida/);
  });

  it("rejeita data de pagamento com calendário inválido", async () => {
    const despesa = await criarDespesaAvulsaAction({
      descricao: "Para pagamento inválido",
      categoria: "outros",
      valorTotal: 10,
      data: "2026-09-05",
    });
    const [lancamento] = (await getLancamentosDespesa()).filter((l) => l.despesaId === despesa.id);

    await expect(
      registrarPagamentoLancamentoAction({ lancamentoId: lancamento.id, dataPagamento: "2026-04-31" }),
    ).rejects.toThrow(/[Dd]ata de pagamento inválida/);
  });

  it("rejeita data de encerramento anterior à data de início da recorrência", async () => {
    await expect(
      criarDespesaRecorrenteAction({
        descricao: "Recorrência com encerramento inválido",
        categoria: "aluguel",
        valorSemanal: 100,
        diaSemana: 1,
        dataInicio: "2026-09-10",
        dataEncerramento: "2026-09-01",
      }),
    ).rejects.toThrow(/anterior à data de início/);
  });

  it("rejeita data de encerramento com calendário inválido", async () => {
    await expect(
      criarDespesaRecorrenteAction({
        descricao: "Recorrência com encerramento impossível",
        categoria: "aluguel",
        valorSemanal: 100,
        diaSemana: 1,
        dataInicio: "2026-09-01",
        dataEncerramento: "2026-11-31",
      }),
    ).rejects.toThrow(/[Dd]ata de encerramento inválida/);
  });

  it("aceita uma data de encerramento igual à data de início (janela de uma ocorrência)", async () => {
    const despesa = await criarDespesaRecorrenteAction({
      descricao: "Recorrência de uma ocorrência",
      categoria: "aluguel",
      valorSemanal: 100,
      diaSemana: new Date("2026-09-07T00:00:00").getDay(),
      dataInicio: "2026-09-07",
      dataEncerramento: "2026-09-07",
    });
    expect(despesa.dataEncerramento).toBe("2026-09-07");
  });
});
