import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { reagendarAgendamentoAction, updateStatusAgendamentoAction } from "@/lib/agenda-actions";
import { dataAmanhaMMDDYYYY, criarClienteComContatoTeste } from "../helpers/lembretes-fixtures";
import { getLembretesAmanha } from "@/lib/lembretes-repo";
import { calcularPropostasRetornoAction, confirmarRetornosAction } from "@/lib/proximos-retornos-actions";
import { criarAtendimentoConcluido, criarServicoComRetorno } from "../helpers/retornos-fixtures";
import { concluirAtendimentoAction, iniciarAtendimentoDoAgendamentoAction } from "@/lib/atendimentos-actions";
import type { Cliente } from "@/lib/clientes-mock";
import { prisma } from "@/lib/db";

async function criarRetorno(cliente: Cliente, horarioMin: number) {
  const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14, duracaoPadrao: 60 });
  const { atendimentoId } = await criarAtendimentoConcluido({
    cliente,
    servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn }],
  });
  const proposta = (await calcularPropostasRetornoAction(atendimentoId)).propostas[0];
  const confirmado = await confirmarRetornosAction({
    atendimentoId,
    selecionados: [{ servicoId: proposta.origem.servicoId, dataIso: proposta.dataIso, horarioMin: proposta.horarioPropostoMin! }],
    colisoes: [],
  });
  const retorno = confirmado.itens.find((item) => item.tipo === "gravado");
  if (retorno?.tipo !== "gravado") throw new Error("esperava retorno gravado");
  await reagendarAgendamentoAction(retorno.agendamentoId, dataAmanhaMMDDYYYY(), horarioMin, horarioMin + 60);
  return { retorno, servico };
}

describe("fluxo Atendimento concluído → Retorno → Lembrete → Reagendamento", () => {
  it("o retorno reagendado para amanhã entra nos lembretes com os dados atuais da Agenda", async () => {
    const cliente = await criarClienteComContatoTeste();
    const { retorno, servico } = await criarRetorno(cliente, 16 * 60);

    const lembrete = (await getLembretesAmanha(true)).find((item) => item.clienteId === cliente.id);
    expect(lembrete).toMatchObject({
      horario: "4:00 PM",
      servicoPt: servico.nome,
      statusAgendamento: "aguardando",
      statusLembrete: "pendente",
      consentimentoRegistrado: true,
    });

    await updateStatusAgendamentoAction(retorno.agendamentoId, "cancelado");
    expect((await getLembretesAmanha(true)).some((item) => item.clienteId === cliente.id)).toBe(false);
    expect(await prisma.lembrete.count({ where: { agendamentoId: retorno.agendamentoId } })).toBe(1);
  });

  it("um retorno marcado como não compareceu deixa a lista operacional de lembretes", async () => {
    const cliente = await criarClienteComContatoTeste();
    const { retorno } = await criarRetorno(cliente, 14 * 60);
    expect((await getLembretesAmanha(true)).some((item) => item.clienteId === cliente.id)).toBe(true);

    await updateStatusAgendamentoAction(retorno.agendamentoId, "naoCompareceu");

    expect((await getLembretesAmanha(true)).some((item) => item.clienteId === cliente.id)).toBe(false);
  });

  it("um retorno concluído deixa a lista operacional de lembretes", async () => {
    const cliente = await criarClienteComContatoTeste();
    const { retorno } = await criarRetorno(cliente, 13 * 60);
    await getLembretesAmanha(true);

    const iniciado = await iniciarAtendimentoDoAgendamentoAction(retorno.agendamentoId);
    await concluirAtendimentoAction(iniciado.atendimento.id, {
      horarioFim: "2:00 PM",
      duracaoMin: 60,
      valorRecebido: 50,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    expect((await getLembretesAmanha(true)).some((item) => item.clienteId === cliente.id)).toBe(false);
  });

  it("uma cliente pode ter vários retornos amanhã sem perder ou fundir lembretes", async () => {
    const cliente = await criarClienteComContatoTeste();
    const primeiro = await criarRetorno(cliente, 10 * 60);
    const segundo = await criarRetorno(cliente, 11 * 60 + 30);

    const lembretes = (await getLembretesAmanha(true)).filter((item) => item.clienteId === cliente.id);
    expect(lembretes).toHaveLength(2);
    expect(lembretes.map((item) => item.horario).sort()).toEqual(["10:00 AM", "11:30 AM"]);
    expect(new Set(lembretes.map((item) => item.servicoPt))).toEqual(new Set([primeiro.servico.nome, segundo.servico.nome]));
  });
});
