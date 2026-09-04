import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { createAgendamentoAction, updateStatusAgendamentoAction } from "@/lib/agenda-actions";
import { iniciarAtendimentoDoAgendamentoAction, cancelarAtendimentoAction } from "@/lib/atendimentos-actions";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";

/**
 * IMPORTANTE — limitação conhecida destes testes: o banco de teste (PGlite, ver
 * tests/setup/test-db-env.ts) é uma única conexão em memória, então transações concorrentes nele
 * acabam sempre serializadas de fato — dois `Promise.all([...])` nunca produzem a corrida real de
 * duas conexões Postgres distintas gravando ao mesmo tempo (isso já foi confirmado na Fase 3: um
 * teste com `Promise.all` passou mesmo sem o índice único abaixo, o que NÃO prova ausência de
 * corrida em produção). Por isso, aqui:
 *   1. A restrição estrutural (índice único parcial) é testada gravando linhas diretamente via
 *      Prisma, fora da Server Action — isso SIM prova o comportamento real do Postgres/PGlite
 *      diante de uma violação de unicidade, independente de concorrência.
 *   2. O tratamento idempotente da colisão (o bloco try/catch em
 *      `iniciarAtendimentoDoAgendamentoAction`) é testado com `prisma.$transaction` mockado para
 *      rejeitar com o erro P2002 que o Postgres realmente devolveria — simulando o resultado de
 *      uma corrida perdida, já que não é possível provocar essa corrida de verdade neste banco.
 */

async function criarAgendamentoConfirmadoTeste(valorEstimado = 80) {
  const cliente = await criarClienteTeste();
  const criado = await createAgendamentoAction({
    clienteId: cliente.id,
    servicoId: null,
    status: "aguardando",
    data: proximaDataAgendaTeste(),
    inicioMin: 9 * 60,
    fimMin: 10 * 60,
    valorEstimado,
    observacoesPt: "",
    observacoesEn: "",
  });
  const confirmado = await updateStatusAgendamentoAction(criado.id, "confirmado");
  return { cliente, agendamento: confirmado };
}

/** Insere uma linha de atendimento mínima diretamente via Prisma, sem passar pela Server Action —
 * usado só para testar a constraint do banco isoladamente da lógica de aplicação. */
async function inserirAtendimentoBruto(params: {
  id: string;
  clienteId: string;
  agendamentoId: string | null;
  status: string;
}) {
  return prisma.atendimento.create({
    data: {
      id: params.id,
      numeroSequencial: (await prisma.atendimento.aggregate({ _max: { numeroSequencial: true } }))._max
        .numeroSequencial! + 1,
      clienteId: params.clienteId,
      agendamentoId: params.agendamentoId,
      profissional: "Rosângela",
      data: "2027-06-01",
      horarioInicio: "09:00 AM",
      status: params.status,
    },
  });
}

describe("índice único parcial: no máximo um atendimento ATIVO por agendamento (migration 20260901120000)", () => {
  it("rejeita uma segunda linha ATIVA (status <> cancelado) para o mesmo agendamento", async () => {
    const { cliente, agendamento } = await criarAgendamentoConfirmadoTeste();

    await inserirAtendimentoBruto({
      id: `ATD-BRUTO-${Date.now()}-1`,
      clienteId: cliente.id,
      agendamentoId: agendamento.id,
      status: "emAndamento",
    });

    await expect(
      inserirAtendimentoBruto({
        id: `ATD-BRUTO-${Date.now()}-2`,
        clienteId: cliente.id,
        agendamentoId: agendamento.id,
        status: "emAndamento",
      }),
    ).rejects.toThrow();
  });

  it("NÃO é um UNIQUE simples: permite um atendimento cancelado + um ativo para o mesmo agendamento (reabrir após cancelar)", async () => {
    const { cliente, agendamento } = await criarAgendamentoConfirmadoTeste();

    await inserirAtendimentoBruto({
      id: `ATD-BRUTO-${Date.now()}-3`,
      clienteId: cliente.id,
      agendamentoId: agendamento.id,
      status: "cancelado",
    });

    await expect(
      inserirAtendimentoBruto({
        id: `ATD-BRUTO-${Date.now()}-4`,
        clienteId: cliente.id,
        agendamentoId: agendamento.id,
        status: "emAndamento",
      }),
    ).resolves.toBeDefined();
  });

  it("permite múltiplos atendimentos cancelados para o mesmo agendamento (histórico legítimo)", async () => {
    const { cliente, agendamento } = await criarAgendamentoConfirmadoTeste();

    await inserirAtendimentoBruto({
      id: `ATD-BRUTO-${Date.now()}-5`,
      clienteId: cliente.id,
      agendamentoId: agendamento.id,
      status: "cancelado",
    });
    await expect(
      inserirAtendimentoBruto({
        id: `ATD-BRUTO-${Date.now()}-6`,
        clienteId: cliente.id,
        agendamentoId: agendamento.id,
        status: "cancelado",
      }),
    ).resolves.toBeDefined();
  });

  it("confirma o fluxo real de reiniciar após cancelar (cancelarAtendimentoAction + iniciar de novo) continua funcionando com o índice novo", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const primeiro = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);
    await cancelarAtendimentoAction(primeiro.atendimento.id);

    const segundo = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);
    expect(segundo.criado).toBe(true);
    expect(segundo.atendimento.id).not.toBe(primeiro.atendimento.id);

    const ativos = await prisma.atendimento.count({
      where: { agendamentoId: agendamento.id, status: { not: "cancelado" } },
    });
    expect(ativos).toBe(1);
  });

  it("não afeta atendimentos avulsos sem agendamento (agendamentoId nulo) — vários são permitidos", async () => {
    const cliente = await criarClienteTeste();
    await inserirAtendimentoBruto({
      id: `ATD-BRUTO-${Date.now()}-7`,
      clienteId: cliente.id,
      agendamentoId: null,
      status: "emAndamento",
    });
    await expect(
      inserirAtendimentoBruto({
        id: `ATD-BRUTO-${Date.now()}-8`,
        clienteId: cliente.id,
        agendamentoId: null,
        status: "emAndamento",
      }),
    ).resolves.toBeDefined();
  });
});

describe("tratamento idempotente da colisão (P2002) em iniciarAtendimentoDoAgendamentoAction", () => {
  it("perder a corrida (P2002 simulado) recupera o atendimento da vencedora, sem erro e sem duplicidade", async () => {
    const { cliente, agendamento } = await criarAgendamentoConfirmadoTeste();

    // Simula "a vencedora já commitou": insere o atendimento que uma transação concorrente teria
    // criado, ANTES de chamar a action — a própria action, ao perder a corrida (via mock abaixo),
    // deve encontrar e devolver exatamente esta linha.
    const vencedora = await inserirAtendimentoBruto({
      id: `ATD-VENCEDORA-${Date.now()}`,
      clienteId: cliente.id,
      agendamentoId: agendamento.id,
      status: "emAndamento",
    });

    const erroP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`agendamento_id`)", {
      code: "P2002",
      clientVersion: "test",
    });

    const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(() => Promise.reject(erroP2002));
    try {
      const resultado = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);

      expect(resultado.criado).toBe(false);
      expect(resultado.atendimento.id).toBe(vencedora.id);

      const total = await prisma.atendimento.count({
        where: { agendamentoId: agendamento.id, status: { not: "cancelado" } },
      });
      expect(total).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("um P2002 sem nenhum atendimento ativo para recuperar continua propagando o erro (não engole falhas de unicidade não relacionadas)", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const erroP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });

    const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(() => Promise.reject(erroP2002));
    try {
      await expect(iniciarAtendimentoDoAgendamentoAction(agendamento.id)).rejects.toBe(erroP2002);
    } finally {
      spy.mockRestore();
    }
  });

  it("erros que não são P2002 continuam propagando normalmente (nenhuma recuperação indevida)", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const outroErro = new Error("Falha de conexão qualquer.");
    const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(() => Promise.reject(outroErro));
    try {
      await expect(iniciarAtendimentoDoAgendamentoAction(agendamento.id)).rejects.toBe(outroErro);
    } finally {
      spy.mockRestore();
    }
  });
});
