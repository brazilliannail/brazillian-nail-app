import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { updateAtendimentoAction, concluirAtendimentoAction, cancelarAtendimentoAction } from "@/lib/atendimentos-actions";
import { valorTotalDevido } from "@/lib/atendimentos-mock";
import { criarClienteTeste, criarAtendimentoTeste } from "../helpers/ledger-fixtures";

describe("edição de atendimentos após concluído (updateAtendimentoAction)", () => {
  it("emAndamento: serviço, desconto e campos não financeiros continuam livremente editáveis", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const editado = await updateAtendimentoAction({
      ...atendimento,
      profissional: "Nova Profissional",
      desconto: 10,
      servicos: [{ servicoId: null, nomePt: "Serviço renomeado", nomeEn: "Renamed service", valor: 150 }],
      observacoesPt: "Nova observação",
    });

    expect(editado.profissional).toBe("Nova Profissional");
    expect(editado.desconto).toBe(10);
    expect(editado.servicos).toHaveLength(1);
    expect(editado.servicos[0].nomePt).toBe("Serviço renomeado");
    expect(editado.servicos[0].valor).toBe(150);
    expect(editado.observacoesPt).toBe("Nova observação");
  });

  it("finalizadoPendente sem nenhum pagamento real: serviço/desconto já ficam travados a partir da conclusão", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: pendente } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 0,
      gorjeta: 0,
      formaPagamento: null,
      status: "finalizadoPendente",
    });
    expect(pendente.status).toBe("finalizadoPendente");
    expect(valorTotalDevido(pendente)).toBe(100);

    await expect(
      updateAtendimentoAction({ ...pendente, desconto: 20 }),
    ).rejects.toThrow(/valor devido/);

    await expect(
      updateAtendimentoAction({
        ...pendente,
        servicos: [{ servicoId: null, nomePt: pendente.servicos[0].nomePt, nomeEn: pendente.servicos[0].nomeEn, valor: 999 }],
      }),
    ).rejects.toThrow(/valor devido/);

    // Campo não financeiro continua editável mesmo travado.
    const editado = await updateAtendimentoAction({ ...pendente, observacoesPt: "Aguardando pagamento na próxima visita" });
    expect(editado.observacoesPt).toBe("Aguardando pagamento na próxima visita");
    expect(valorTotalDevido(editado)).toBe(100);
  });

  it("finalizadoCortesia sem pagamento real: mesma trava financeira, mesmo sem nenhuma linha no ledger", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 80 });

    const { atendimento: cortesia } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 45,
      valorRecebido: 0,
      gorjeta: 0,
      formaPagamento: null,
      status: "finalizadoCortesia",
    });
    expect(cortesia.status).toBe("finalizadoCortesia");

    await expect(updateAtendimentoAction({ ...cortesia, desconto: 5 })).rejects.toThrow(/valor devido/);
  });

  it("finalizadoPago (com pagamento real): total travado, mas recompor a lista de serviços é permitido se a soma final não mudar", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100 });

    const { atendimento: pago } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 100,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });
    expect(pago.status).toBe("finalizadoPago");

    // Muda o total → rejeitado.
    await expect(
      updateAtendimentoAction({
        ...pago,
        servicos: [{ servicoId: null, nomePt: pago.servicos[0].nomePt, nomeEn: pago.servicos[0].nomeEn, valor: 150 }],
      }),
    ).rejects.toThrow(/valor devido/);

    // Recompõe em duas linhas cuja soma continua 100 → permitido (só o total é protegido).
    const recomposto = await updateAtendimentoAction({
      ...pago,
      servicos: [
        { servicoId: null, nomePt: "Parte 1", nomeEn: "Part 1", valor: 60 },
        { servicoId: null, nomePt: "Parte 2", nomeEn: "Part 2", valor: 40 },
      ],
    });
    expect(valorTotalDevido(recomposto)).toBe(100);
    expect(recomposto.servicos).toHaveLength(2);
  });

  it("desconto: qualquer mudança que altere o total devido é rejeitada uma vez travado", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 100, desconto: 10 });

    const { atendimento: pago } = await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM",
      duracaoMin: 60,
      valorRecebido: 90,
      gorjeta: 0,
      formaPagamento: "dinheiro",
      status: "finalizadoPago",
    });

    await expect(updateAtendimentoAction({ ...pago, desconto: 0 })).rejects.toThrow(/valor devido/);

    // Desconto igual ao original continua aceito (não altera o total).
    const inalterado = await updateAtendimentoAction({ ...pago, desconto: 10, observacoesEn: "no changes to totals" });
    expect(inalterado.desconto).toBe(10);
  });

  it("cancelado/estornado continuam totalmente bloqueados, inclusive para campos não financeiros", async () => {
    const cliente = await criarClienteTeste();
    const atendimento = await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 50 });

    const { atendimento: cancelado } = await cancelarAtendimentoAction(atendimento.id);
    expect(cancelado.status).toBe("cancelado");

    await expect(
      updateAtendimentoAction({ ...cancelado, observacoesPt: "Tentando editar atendimento cancelado" }),
    ).rejects.toThrow("Não é possível editar um atendimento cancelado ou estornado.");
  });
});
