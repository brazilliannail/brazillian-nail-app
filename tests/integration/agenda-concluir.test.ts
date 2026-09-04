import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { createAgendamentoAction, updateStatusAgendamentoAction } from "@/lib/agenda-actions";
import { iniciarAtendimentoDoAgendamentoAction, concluirAtendimentoAction } from "@/lib/atendimentos-actions";
import { getAgendamentos } from "@/lib/agenda-repo";
import { prisma } from "@/lib/db";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";

/** Agendamento "confirmado" mínimo, pronto para iniciar/concluir atendimento. */
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

describe("Concluir atendimento pela Agenda (reaproveita integralmente o fluxo de Atendimentos)", () => {
  it("agendamento sem atendimento: iniciar cria um atendimento novo, emAndamento, e sincroniza o agendamento para emAtendimento", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const resultado = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);

    expect(resultado.criado).toBe(true);
    expect(resultado.atendimento.status).toBe("emAndamento");
    expect(resultado.atendimento.agendamentoId).toBe(agendamento.id);
    expect(resultado.agendamento.status).toBe("emAtendimento");

    const agendamentos = await getAgendamentos();
    expect(agendamentos.find((a) => a.id === agendamento.id)?.status).toBe("emAtendimento");
  });

  it("agendamento com atendimento já existente: reutiliza (não cria duplicado)", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const primeira = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);
    expect(primeira.criado).toBe(true);

    const segunda = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);
    expect(segunda.criado).toBe(false);
    expect(segunda.atendimento.id).toBe(primeira.atendimento.id);

    const total = await prisma.atendimento.count({ where: { agendamentoId: agendamento.id } });
    expect(total).toBe(1);
  });

  it("idempotência sob duplo clique: chamadas sequenciais repetidas continuam devolvendo o mesmo atendimento, nunca duplicando", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const chamadas = [];
    for (let i = 0; i < 4; i += 1) {
      chamadas.push(await iniciarAtendimentoDoAgendamentoAction(agendamento.id));
    }

    const idsUnicos = new Set(chamadas.map((c) => c.atendimento.id));
    expect(idsUnicos.size).toBe(1);
    expect(chamadas.filter((c) => c.criado).length).toBe(1);

    const total = await prisma.atendimento.count({ where: { agendamentoId: agendamento.id } });
    expect(total).toBe(1);
  });

  it("chamadas concorrentes (duplo clique real, Promise.all) não deixam mais de um atendimento ativo para o mesmo agendamento", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();

    const resultados = await Promise.all([
      iniciarAtendimentoDoAgendamentoAction(agendamento.id),
      iniciarAtendimentoDoAgendamentoAction(agendamento.id),
      iniciarAtendimentoDoAgendamentoAction(agendamento.id),
    ]);

    const idsUnicos = new Set(resultados.map((r) => r.atendimento.id));
    expect(idsUnicos.size).toBe(1);

    const total = await prisma.atendimento.count({
      where: { agendamentoId: agendamento.id, status: { not: "cancelado" } },
    });
    expect(total).toBe(1);
  });

  it("o agendamento NUNCA pode ser marcado concluido diretamente (só via concluirAtendimentoAction, pelo Atendimento correspondente)", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste();
    await iniciarAtendimentoDoAgendamentoAction(agendamento.id);

    await expect(updateStatusAgendamentoAction(agendamento.id, "concluido")).rejects.toThrow(
      'Não é possível mudar o status de "emAtendimento" para "concluido".',
    );

    const agendamentos = await getAgendamentos();
    expect(agendamentos.find((a) => a.id === agendamento.id)?.status).toBe("emAtendimento");
  });

  it("concluir de fato passa pelo Atendimento (concluirAtendimentoAction) e só então sincroniza o agendamento para concluido", async () => {
    const { agendamento } = await criarAgendamentoConfirmadoTeste(100);
    const { atendimento } = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);

    const resultado = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 10,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    expect(resultado.atendimento.status).toBe("finalizadoPago");
    expect(resultado.agendamento?.status).toBe("concluido");

    const agendamentos = await getAgendamentos();
    expect(agendamentos.find((a) => a.id === agendamento.id)?.status).toBe("concluido");

    // Concluir não deixa o agendamento voltar a aceitar novo atendimento em duplicidade.
    const reInicio = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);
    expect(reInicio.criado).toBe(false);
    expect(reInicio.atendimento.id).toBe(atendimento.id);
  });

  it("concluir pelo fluxo reaproveitado não cria nenhum lançamento de Despesas (preserva o módulo intacto)", async () => {
    const despesasAntes = await prisma.despesa.count();
    const lancamentosAntes = await prisma.lancamentoDespesa.count();

    const { agendamento } = await criarAgendamentoConfirmadoTeste(50);
    const { atendimento } = await iniciarAtendimentoDoAgendamentoAction(agendamento.id);
    await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "10:00 AM",
      duracaoMin: 60,
      valorRecebido: 50,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    expect(await prisma.despesa.count()).toBe(despesasAntes);
    expect(await prisma.lancamentoDespesa.count()).toBe(lancamentosAntes);
  });
});
