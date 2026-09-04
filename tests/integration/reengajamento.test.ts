import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { createAgendamentoAction } from "@/lib/agenda-actions";
import { updateReengajamentoClienteAction } from "@/lib/clientes-actions";
import { getClienteById } from "@/lib/clientes-repo";
import { addDays, formatDateISO, formatDateMMDDYYYY } from "@/lib/date";
import { criarAtendimentoTeste, criarClienteTeste } from "../helpers/ledger-fixtures";

describe("reengajamento de clientes", () => {
  it("inclui cliente ativa nunca atendida e sem agendamento futuro", async () => {
    const cliente = await criarClienteTeste("Elegível");
    expect((await getClienteById(cliente.id))?.elegivelReengajamento).toBe(true);
  });

  it("exclui cliente com atendimento recente ou agendamento futuro", async () => {
    const comAtendimento = await criarClienteTeste("Atendimento recente");
    await criarAtendimentoTeste({
      clienteId: comAtendimento.id,
      valorServico: 50,
      data: formatDateMMDDYYYY(new Date()),
    });
    expect((await getClienteById(comAtendimento.id))?.elegivelReengajamento).toBe(false);

    const comAgenda = await criarClienteTeste("Agenda futura");
    await createAgendamentoAction({
      clienteId: comAgenda.id,
      servicoId: null,
      status: "aguardando",
      data: formatDateMMDDYYYY(addDays(new Date(), 10)),
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });
    expect((await getClienteById(comAgenda.id))?.elegivelReengajamento).toBe(false);
  });

  it("persiste contatada, adiada e ignorada e valida a data do adiamento", async () => {
    const contatada = await criarClienteTeste("Contatada");
    const resultado = await updateReengajamentoClienteAction(contatada.id, {
      status: "contatado",
      observacao: "Mensagem enviada.",
    });
    expect(resultado.reengajamentoStatus).toBe("contatado");
    expect(resultado.reengajamentoObservacao).toBe("Mensagem enviada.");
    expect(resultado.elegivelReengajamento).toBe(false);

    const adiada = await criarClienteTeste("Adiada");
    await expect(
      updateReengajamentoClienteAction(adiada.id, { status: "adiado", adiadoAte: formatDateISO(new Date()) }),
    ).rejects.toThrow("posterior a hoje");
    const dataFutura = formatDateISO(addDays(new Date(), 7));
    const resultadoAdiado = await updateReengajamentoClienteAction(adiada.id, {
      status: "adiado",
      adiadoAte: dataFutura,
    });
    expect(resultadoAdiado.reengajamentoAdiadoAte).toBe(dataFutura);

    const ignorada = await criarClienteTeste("Ignorada");
    expect((await updateReengajamentoClienteAction(ignorada.id, { status: "ignorado" })).reengajamentoStatus).toBe(
      "ignorado",
    );
  });

  it("novo atendimento limpa a decisão anterior de reengajamento", async () => {
    const cliente = await criarClienteTeste("Retornou");
    await updateReengajamentoClienteAction(cliente.id, { status: "ignorado", observacao: "Não contatar." });

    await criarAtendimentoTeste({ clienteId: cliente.id, valorServico: 50 });
    const atualizado = await getClienteById(cliente.id);

    expect(atualizado?.reengajamentoStatus).toBe("nenhum");
    expect(atualizado?.reengajamentoAtualizadoEm).toBeNull();
    expect(atualizado?.reengajamentoAdiadoAte).toBeNull();
    expect(atualizado?.reengajamentoObservacao).toBeNull();
  });
});
