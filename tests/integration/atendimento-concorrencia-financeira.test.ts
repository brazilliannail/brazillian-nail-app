import { describe, it, expect } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
import { vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/db";
import {
  concluirAtendimentoAction,
  cancelarAtendimentoAction,
  registrarPagamentoAdicionalAction,
} from "@/lib/atendimentos-actions";
import { criarClienteTeste, criarAtendimentoTeste } from "../helpers/ledger-fixtures";

/**
 * Auditoria do fluxo Conclusão → Pagamento: clique duplo / chamadas repetidas não podem duplicar
 * efeitos financeiros (pagamentos gravados em duplicidade, saldo ultrapassado). Mesma limitação
 * conhecida documentada em `atendimento-concorrencia.test.ts` para `iniciarAtendimentoDoAgendamentoAction`:
 * o banco de teste (PGlite) é uma única conexão em memória, então `Promise.all` aqui nunca produz a
 * corrida real de duas conexões Postgres distintas — serve para confirmar que a aplicação não
 * introduz duplicidade por si só quando as chamadas são serializadas, não para provar ausência de
 * corrida em produção (ver riscos remanescentes no relatório da sessão).
 */

describe("concluir atendimento: idempotência sob clique duplo/repetido", () => {
  it("concluir duas vezes seguidas: a segunda chamada é rejeitada, sem duplicar pagamentos nem mudar o status já gravado", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const primeira = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 10,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });
    expect(primeira.atendimento.status).toBe("finalizadoPago");

    await expect(
      concluirAtendimentoAction(atendimento.id, {
        horarioFim: "11:30 AM",
        duracaoMin: 90,
        valorRecebido: 100,
        gorjeta: 10,
        formaPagamento: "dinheiro",
        status: "finalizadoPago",
      }),
    ).rejects.toThrow("Apenas atendimentos em andamento podem ser concluídos.");

    const pagamentos = await prisma.pagamento.findMany({ where: { atendimentoId: atendimento.id } });
    expect(pagamentos).toHaveLength(2); // 1 serviço + 1 gorjeta — nunca duplicado pela 2ª chamada.
    const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimento.id } });
    expect(row.horarioFim).toBe("11:00 AM"); // dados da 2ª chamada (rejeitada) não vazaram para o registro.
  });

  it("concluir concorrente (Promise.all): no máximo uma chamada tem sucesso, nunca gera pagamento duplicado", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 60 });

    const dados = {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 60,
      gorjeta: 0,
      formaPagamento: "dinheiro" as const,
      status: "finalizadoPago" as const,
    };

    const resultados = await Promise.allSettled([
      concluirAtendimentoAction(atendimento.id, dados),
      concluirAtendimentoAction(atendimento.id, dados),
      concluirAtendimentoAction(atendimento.id, dados),
    ]);

    const sucessos = resultados.filter((r) => r.status === "fulfilled");
    expect(sucessos.length).toBe(1);

    const pagamentos = await prisma.pagamento.findMany({ where: { atendimentoId: atendimento.id, natureza: "servico" } });
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0].valor).toBe(60);

    const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimento.id } });
    expect(row.status).toBe("finalizadoPago");
  });
});

describe("cancelar atendimento: idempotência sob clique duplo", () => {
  it("cancelar duas vezes seguidas: a segunda chamada é rejeitada, status permanece cancelado (não regride)", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 40 });

    const primeira = await cancelarAtendimentoAction(atendimento.id);
    expect(primeira.atendimento.status).toBe("cancelado");

    await expect(cancelarAtendimentoAction(atendimento.id)).rejects.toThrow(
      "Apenas atendimentos em andamento podem ser cancelados.",
    );

    const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimento.id } });
    expect(row.status).toBe("cancelado");
    expect(await prisma.pagamento.count({ where: { atendimentoId: atendimento.id } })).toBe(0);
  });
});

describe("registrar pagamento adicional: nunca ultrapassa o saldo devido", () => {
  it("valor informado maior que o saldo pendente é rejeitado, sem gravar nada", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });
    const { atendimento: parcial } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 40,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoParcial",
    });
    expect(parcial.status).toBe("finalizadoParcial");
    const pagamentosAntes = await prisma.pagamento.count({ where: { atendimentoId: atendimento.id } });

    await expect(
      registrarPagamentoAdicionalAction(atendimento.id, {
        valor: 61, // saldo pendente real é 60
        gorjeta: 0,
        formaPagamento: "dinheiro",
        dataPagamento: parcial.data,
      }),
    ).rejects.toThrow(/maior que o saldo pendente/);

    expect(await prisma.pagamento.count({ where: { atendimentoId: atendimento.id } })).toBe(pagamentosAntes);
    const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimento.id } });
    expect(row.status).toBe("finalizadoParcial");
  });

  it("duas tentativas concorrentes de quitar o mesmo saldo (Promise.all): valor recebido nunca ultrapassa o devido", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });
    const { atendimento: parcial } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 0,
      gorjeta: 0,
      formaPagamento: null,
      status: "finalizadoPendente",
    });
    expect(parcial.status).toBe("finalizadoPendente");

    // Duas "abas" tentam registrar o pagamento total (100) do mesmo saldo pendente ao mesmo tempo.
    const resultados = await Promise.allSettled([
      registrarPagamentoAdicionalAction(atendimento.id, { valor: 100, gorjeta: 0, formaPagamento: "dinheiro", dataPagamento: parcial.data }),
      registrarPagamentoAdicionalAction(atendimento.id, { valor: 100, gorjeta: 0, formaPagamento: "cartaoCredito", dataPagamento: parcial.data }),
    ]);

    const sucessos = resultados.filter((r) => r.status === "fulfilled");
    // Sob serialização real (PGlite) ou sob proteção adequada, só uma pode ter sucesso — a soma
    // recebida nunca pode superar o valor devido (100), em nenhum cenário.
    expect(sucessos.length).toBeLessThanOrEqual(1);

    const entradas = await prisma.pagamento.findMany({ where: { atendimentoId: atendimento.id, tipo: "entrada" } });
    const totalRecebido = entradas.reduce((soma, p) => soma + p.valor, 0);
    expect(totalRecebido).toBeLessThanOrEqual(100);
  });
});
