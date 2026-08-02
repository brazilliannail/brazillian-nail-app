import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor. Mockado como no-op: os testes validam o
// livro-razão gravado no banco, não o cache de rota.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/db";
import {
  concluirAtendimentoAction,
  registrarPagamentoAdicionalAction,
  estornarAtendimentoAction,
  corrigirLancamentoAction,
  corrigirLancamentosAction,
} from "@/lib/atendimentos-actions";
import { saldoPendente, valorTotalDevido } from "@/lib/atendimentos-mock";
import { getAtendimentos } from "@/lib/atendimentos-repo";
import { listarPendencias } from "@/lib/financeiro-service";
import { addDays, formatDateMMDDYYYY } from "@/lib/date";
import { criarClienteTeste, criarAtendimentoTeste } from "../helpers/ledger-fixtures";

describe("ledger de pagamentos (atendimentos-actions + pagamentos-repo)", () => {
  it("pagamento total: valor recebido cobre o devido → finalizadoPago, saldo pendente zero", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: concluido } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    expect(concluido.status).toBe("finalizadoPago");
    expect(concluido.valorRecebido).toBe(100);
    expect(saldoPendente(concluido)).toBe(0);
  });

  it("pagamento parcial: valor recebido menor que o devido → finalizadoParcial com saldo pendente, zera ao completar", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 200 });

    const { atendimento: parcial } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 80,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoParcial",
    });

    expect(parcial.status).toBe("finalizadoParcial");
    expect(parcial.valorRecebido).toBe(80);
    expect(saldoPendente(parcial)).toBe(120);

    const completo = await registrarPagamentoAdicionalAction(atendimento.id, {
      valor: 120,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      dataPagamento: parcial.data,
    });

    expect(completo.status).toBe("finalizadoPago");
    expect(completo.valorRecebido).toBe(200);
    expect(saldoPendente(completo)).toBe(0);
  });

  it("múltiplas formas de pagamento: parcelas com formas diferentes somam corretamente no saldo", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: primeiraParcela } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 50,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoParcial",
    });
    expect(primeiraParcela.formaPagamento).toBe("dinheiro");

    const segundaParcela = await registrarPagamentoAdicionalAction(atendimento.id, {
      valor: 50,
      gorjeta: 0,
      formaPagamento: "cartaoCredito",
      dataPagamento: primeiraParcela.data,
    });

    expect(segundaParcela.status).toBe("finalizadoPago");
    expect(segundaParcela.valorRecebido).toBe(100);
    // "Forma principal" é a do lançamento de entrada mais recente (ver calcularFormaPagamentoPrincipal).
    expect(segundaParcela.formaPagamento).toBe("cartaoCredito");

    const pagamentos = await prisma.pagamento.findMany({ where: { atendimentoId: atendimento.id, tipo: "entrada" } });
    expect(pagamentos.map((p) => p.formaPagamento).sort()).toEqual(["cartaoCredito", "dinheiro"]);
  });

  it("gorjeta: entra separada do valor do serviço, nunca afeta saldo pendente nem status", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 150 });

    const { atendimento: concluido } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 150,
      gorjeta: 30,
      formaPagamento: "cartaoDebito",
      status: "finalizadoPago",
    });

    expect(concluido.status).toBe("finalizadoPago");
    expect(concluido.valorRecebido).toBe(150);
    expect(concluido.gorjeta).toBe(30);
    expect(saldoPendente(concluido)).toBe(0);

    const gorjetaLancamentos = await prisma.pagamento.findMany({
      where: { atendimentoId: atendimento.id, natureza: "gorjeta" },
    });
    expect(gorjetaLancamentos).toHaveLength(1);
    expect(gorjetaLancamentos[0].valor).toBe(30);
    expect(gorjetaLancamentos[0].tipo).toBe("entrada");
  });

  it("estorno: reverte o recebido via lançamento de estorno (nunca edita/apaga o original) e marca estornado", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 90 });

    const { atendimento: pago } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 90,
      gorjeta: 0,
      formaPagamento: "zelle",
      status: "finalizadoPago",
    });
    expect(pago.status).toBe("finalizadoPago");

    const estornado = await estornarAtendimentoAction(atendimento.id);

    expect(estornado.status).toBe("estornado");
    // Líquido (entrada − estorno) volta a zero — o lançamento original continua intacto no ledger.
    expect(estornado.valorRecebido).toBe(0);

    const lancamentos = await prisma.pagamento.findMany({
      where: { atendimentoId: atendimento.id },
      orderBy: { numeroSequencial: "asc" },
    });
    expect(lancamentos).toHaveLength(2);
    expect(lancamentos[0].tipo).toBe("entrada");
    expect(lancamentos[0].valor).toBe(90);
    expect(lancamentos[1].tipo).toBe("estorno");
    expect(lancamentos[1].valor).toBe(90);
    expect(lancamentos[1].estornaPagamentoId).toBe(lancamentos[0].id);

    // Já estornado não pode ser estornado de novo.
    await expect(estornarAtendimentoAction(atendimento.id)).rejects.toThrow();
  });

  it("saldo pendente: listarPendencias só traz atendimentos com saldo em aberto, da dívida mais antiga para a mais recente", async () => {
    const cliente = await criarClienteTeste();
    const hoje = new Date();
    const dataAntiga = formatDateMMDDYYYY(addDays(hoje, -10));
    const dataRecente = formatDateMMDDYYYY(addDays(hoje, -2));

    const pagoTotal = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100, data: dataRecente });
    await concluirAtendimentoAction(pagoTotal.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    const pendenciaAntiga = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 60, data: dataAntiga });
    await concluirAtendimentoAction(pendenciaAntiga.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 0,
      gorjeta: 0,
      formaPagamento: null,
      status: "finalizadoPendente",
    });

    const pendenciaRecente = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 80, data: dataRecente });
    await concluirAtendimentoAction(pendenciaRecente.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 30,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoParcial",
    });

    const atendimentos = await getAtendimentos();
    const clientesPorId = new Map([[cliente.id, cliente]]);
    const pendencias = listarPendencias(
      atendimentos.filter((a) => a.clienteId === cliente.id),
      clientesPorId,
      hoje,
    );

    expect(pendencias.map((p) => p.atendimentoId)).toEqual([pendenciaAntiga.id, pendenciaRecente.id]);
    expect(pendencias.find((p) => p.atendimentoId === pendenciaAntiga.id)?.saldoPendente).toBe(60);
    expect(pendencias.find((p) => p.atendimentoId === pendenciaRecente.id)?.saldoPendente).toBe(50);
    expect(pendencias.some((p) => p.atendimentoId === pagoTotal.id)).toBe(false);

    // valorTotalDevido/saldoPendente batem também a partir da leitura direta do banco (mapAtendimentoRow).
    const pendenciaRecenteAtendimento = atendimentos.find((a) => a.id === pendenciaRecente.id)!;
    expect(valorTotalDevido(pendenciaRecenteAtendimento)).toBe(80);
  });

  it("corrigirLancamentosAction: corrige serviço e gorjeta juntos, atomicamente, numa única transação", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: concluido } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 30,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    const pagamentoServico = await prisma.pagamento.findFirstOrThrow({
      where: { atendimentoId: concluido.id, natureza: "servico", tipo: "entrada" },
    });
    const pagamentoGorjeta = await prisma.pagamento.findFirstOrThrow({
      where: { atendimentoId: concluido.id, natureza: "gorjeta", tipo: "entrada" },
    });

    const [resultadoServico, resultadoGorjeta] = await corrigirLancamentosAction([
      { pagamentoId: pagamentoServico.id, dados: { valor: 90, formaPagamento: "cartaoCredito" } },
      { pagamentoId: pagamentoGorjeta.id, dados: { valor: 20, formaPagamento: "cartaoCredito" } },
    ]);

    expect(resultadoServico.novosLancamentos).toHaveLength(2);
    expect(resultadoGorjeta.novosLancamentos).toHaveLength(2);

    const corrigido = (await getAtendimentos()).find((a) => a.id === concluido.id)!;
    expect(corrigido.valorRecebido).toBe(90);
    expect(corrigido.gorjeta).toBe(20);
    expect(corrigido.status).toBe("finalizadoParcial");

    const todosPagamentos = await prisma.pagamento.findMany({ where: { atendimentoId: concluido.id } });
    // 2 originais + 2 estornos + 2 entradas corrigidas.
    expect(todosPagamentos).toHaveLength(6);
  });

  it("corrigirLancamentosAction: se uma das correções falhar, nenhuma é gravada (nada fica parcialmente corrigido)", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: concluido } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 30,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    const pagamentoServico = await prisma.pagamento.findFirstOrThrow({
      where: { atendimentoId: concluido.id, natureza: "servico", tipo: "entrada" },
    });
    const pagamentoGorjeta = await prisma.pagamento.findFirstOrThrow({
      where: { atendimentoId: concluido.id, natureza: "gorjeta", tipo: "entrada" },
    });

    const antes = await prisma.pagamento.findMany({ where: { atendimentoId: concluido.id } });

    // Correção da gorjeta é válida isoladamente, mas a do serviço excede o valor devido do
    // atendimento (100) — deve reverter as duas, mesmo a gorjeta tendo sido processada antes.
    await expect(
      corrigirLancamentosAction([
        { pagamentoId: pagamentoGorjeta.id, dados: { valor: 20, formaPagamento: "cartaoCredito" } },
        { pagamentoId: pagamentoServico.id, dados: { valor: 500, formaPagamento: "cartaoCredito" } },
      ]),
    ).rejects.toThrow(/excede o saldo devido/);

    const depois = await prisma.pagamento.findMany({ where: { atendimentoId: concluido.id } });
    expect(depois).toHaveLength(antes.length);

    const atendimentoInalterado = (await getAtendimentos()).find((a) => a.id === concluido.id)!;
    expect(atendimentoInalterado.valorRecebido).toBe(100);
    expect(atendimentoInalterado.gorjeta).toBe(30);
  });

  it("corrigirLancamentoAction (correção única) continua funcionando isoladamente", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: concluido } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    const pagamentoServico = await prisma.pagamento.findFirstOrThrow({
      where: { atendimentoId: concluido.id, natureza: "servico", tipo: "entrada" },
    });

    const resultado = await corrigirLancamentoAction(pagamentoServico.id, {
      valor: 80,
      formaPagamento: "zelle",
    });

    expect(resultado.atendimento.valorRecebido).toBe(80);
    expect(resultado.atendimento.status).toBe("finalizadoParcial");
  });
});
