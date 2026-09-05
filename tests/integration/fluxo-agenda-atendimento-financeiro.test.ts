import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/db";
import { createAgendamentoAction, updateStatusAgendamentoAction } from "@/lib/agenda-actions";
import { iniciarAtendimentoDoAgendamentoAction, concluirAtendimentoAction, registrarPagamentoAdicionalAction } from "@/lib/atendimentos-actions";
import { getAgendamentos } from "@/lib/agenda-repo";
import { getAtendimentos } from "@/lib/atendimentos-repo";
import { getClientes } from "@/lib/clientes-repo";
import { listarPendencias, buscarAtendimentoFinanceiro } from "@/lib/financeiro-service";
import { saldoPendente } from "@/lib/atendimentos-mock";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";

/**
 * Teste de contrato do fluxo completo:
 *   Agenda → Iniciar atendimento → Atendimento → Concluir → Pagamento → Financeiro
 * usando SEMPRE dados de verdade persistidos e relidos do banco (não fixtures em memória) — para
 * provar que as telas ficam coerentes entre si, não só que cada função isolada está correta.
 */
describe("fluxo completo Agenda → Atendimento → Conclusão → Pagamento → Financeiro (contrato)", () => {
  it("cliente/serviço/data/horário/valor são transportados corretamente em cada etapa, sem duplicar nada", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();
    const agendamentoCriado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 10 * 60,
      fimMin: 11 * 60,
      valorEstimado: 100,
      observacoesPt: "Observação da agenda",
      observacoesEn: "Agenda note",
    });
    await updateStatusAgendamentoAction(agendamentoCriado.id, "confirmado");

    // 1) Iniciar atendimento — Agenda mostra estado coerente logo em seguida.
    const { atendimento, agendamento, criado } = await iniciarAtendimentoDoAgendamentoAction(agendamentoCriado.id);
    expect(criado).toBe(true);
    expect(agendamento.status).toBe("emAtendimento");
    expect(atendimento.agendamentoId).toBe(agendamentoCriado.id);
    expect(atendimento.clienteId).toBe(cliente.id);
    expect(atendimento.data).toBe(data);
    expect(atendimento.horarioInicio).toBe("10:00 AM");
    expect(atendimento.servicos).toHaveLength(1);
    expect(atendimento.servicos[0].valor).toBe(100); // valorEstimado do agendamento, transportado
    expect(atendimento.observacoesPt).toBe("Observação da agenda");

    const agendaAposIniciar = await getAgendamentos();
    expect(agendaAposIniciar.find((a) => a.id === agendamentoCriado.id)?.status).toBe("emAtendimento");

    // Clique repetido em "Iniciar" não duplica nem recria — Atendimento continua mostrando o mesmo vínculo.
    const reiniciado = await iniciarAtendimentoDoAgendamentoAction(agendamentoCriado.id);
    expect(reiniciado.criado).toBe(false);
    expect(reiniciado.atendimento.id).toBe(atendimento.id);

    // 2) Concluir com pagamento parcial (60 de 100) — Agenda e Atendimento refletem o novo estado.
    const concluido = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 60,
      gorjeta: 5,
      formaPagamento: "dinheiro",
      status: "finalizadoParcial",
    });
    expect(concluido.atendimento.status).toBe("finalizadoParcial");
    expect(concluido.agendamento?.status).toBe("concluido");

    const agendaAposConcluir = await getAgendamentos();
    expect(agendaAposConcluir.find((a) => a.id === agendamentoCriado.id)?.status).toBe("concluido");

    // 3) Financeiro (dados relidos do banco, não fixtures) — a pendência aponta para o MESMO atendimento.
    const atendimentosDb = await getAtendimentos();
    const clientesDb = await getClientes();
    const clientesPorId = new Map(clientesDb.map((c) => [c.id, c]));

    const pendencias = listarPendencias(atendimentosDb, clientesPorId, new Date());
    const pendenciaDesteAtendimento = pendencias.find((p) => p.atendimentoId === atendimento.id);
    expect(pendenciaDesteAtendimento).toBeDefined();
    expect(pendenciaDesteAtendimento?.saldoPendente).toBe(40);
    expect(pendenciaDesteAtendimento?.clienteId).toBe(cliente.id);

    // Contrato do clique no ValorPendenteCard: abre exatamente este atendimento.
    const selecionado = buscarAtendimentoFinanceiro(pendenciaDesteAtendimento!.atendimentoId, atendimentosDb, clientesPorId, []);
    expect(selecionado?.atendimentoId).toBe(atendimento.id);
    expect(selecionado?.saldoPendente).toBe(40);

    // Cliente/ficha: exatamente 1 entrada no histórico para este atendimento, sem duplicação.
    const clienteAtualizado = clientesDb.find((c) => c.id === cliente.id)!;
    expect(clienteAtualizado.historico.filter((h) => h.id === atendimento.id)).toHaveLength(1);

    // 4) Quita o saldo restante — Financeiro deixa de listar como pendente.
    const quitado = await registrarPagamentoAdicionalAction(atendimento.id, {
      valor: 40,
      gorjeta: 0,
      formaPagamento: "cartaoCredito",
      dataPagamento: concluido.atendimento.data,
    });
    expect(quitado.status).toBe("finalizadoPago");
    expect(saldoPendente(quitado)).toBe(0);

    const atendimentosFinal = await getAtendimentos();
    const clientesFinal = await getClientes();
    const clientesPorIdFinal = new Map(clientesFinal.map((c) => [c.id, c]));
    const pendenciasFinal = listarPendencias(atendimentosFinal, clientesPorIdFinal, new Date());
    expect(pendenciasFinal.some((p) => p.atendimentoId === atendimento.id)).toBe(false);

    // Nenhum lançamento duplicado: serviço (parcial) + gorjeta + serviço complementar = 3 entradas.
    const entradas = await prisma.pagamento.findMany({ where: { atendimentoId: atendimento.id, tipo: "entrada" } });
    expect(entradas).toHaveLength(3);
    expect(entradas.reduce((soma, p) => soma + (p.natureza === "servico" ? p.valor : 0), 0)).toBe(100);
  });

  it("agendamento cancelado nunca inicia atendimento; agendamento sem comparecimento também não", async () => {
    const cliente = await criarClienteTeste();
    const dataCancelado = proximaDataAgendaTeste();
    const agCancelado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: dataCancelado,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: 50,
      observacoesPt: "",
      observacoesEn: "",
    });
    await updateStatusAgendamentoAction(agCancelado.id, "cancelado");
    await expect(iniciarAtendimentoDoAgendamentoAction(agCancelado.id)).rejects.toThrow(
      "Não é possível iniciar o atendimento de um agendamento cancelado ou sem comparecimento.",
    );

    const dataNaoCompareceu = proximaDataAgendaTeste();
    const agNaoCompareceu = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: dataNaoCompareceu,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: 50,
      observacoesPt: "",
      observacoesEn: "",
    });
    await updateStatusAgendamentoAction(agNaoCompareceu.id, "naoCompareceu");
    await expect(iniciarAtendimentoDoAgendamentoAction(agNaoCompareceu.id)).rejects.toThrow(
      "Não é possível iniciar o atendimento de um agendamento cancelado ou sem comparecimento.",
    );

    expect(await getAtendimentos().then((lista) => lista.filter((a) => a.clienteId === cliente.id))).toHaveLength(0);
  });

  it("agendamento inexistente é rejeitado de forma segura (estado inválido)", async () => {
    await expect(iniciarAtendimentoDoAgendamentoAction("AGD-000000")).rejects.toThrow("Agendamento não encontrado.");
  });

  it("atendimento em andamento (não concluído) não vira receita no Financeiro", async () => {
    const cliente = await criarClienteTeste();
    const agendamentoCriado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: proximaDataAgendaTeste(),
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: 70,
      observacoesPt: "",
      observacoesEn: "",
    });
    await updateStatusAgendamentoAction(agendamentoCriado.id, "confirmado");
    const { atendimento } = await iniciarAtendimentoDoAgendamentoAction(agendamentoCriado.id);
    expect(atendimento.status).toBe("emAndamento");

    const atendimentosDb = await getAtendimentos();
    const clientesDb = await getClientes();
    const clientesPorId = new Map(clientesDb.map((c) => [c.id, c]));

    expect(buscarAtendimentoFinanceiro(atendimento.id, atendimentosDb, clientesPorId, [])).toBeNull();
    expect(listarPendencias(atendimentosDb, clientesPorId, new Date()).some((p) => p.atendimentoId === atendimento.id)).toBe(false);
  });
});
