import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/db";
import { createAgendamentoAction } from "@/lib/agenda-actions";
import { createAtendimentoAction } from "@/lib/atendimentos-actions";
import { getClientes } from "@/lib/clientes-repo";
import { formatDateISO } from "@/lib/date";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";

/**
 * Cobre os fluxos disparados pelos botões "Agendar" e "Iniciar atendimento" da ficha da cliente.
 * A ficha não tem lógica própria: apenas pré-seleciona a cliente e delega para os MESMOS modais
 * (`AgendaFormModal` / `AtendimentoFormModal`) e Server Actions já usados por Home/Agenda/
 * Atendimentos. Estes testes exercitam essas actions com o payload que a ficha prepara.
 */

const servicoAvulso = { servicoId: null, nomePt: "Manicure", nomeEn: "Manicure", valor: 60 };

function atendimentoAvulso(clienteId: string, over: Partial<Parameters<typeof createAtendimentoAction>[0]> = {}) {
  return {
    clienteId,
    agendamentoId: null,
    profissional: "Rosângela",
    data: proximaDataAgendaTeste(),
    horarioInicio: "10:00 AM",
    horarioFim: null,
    duracaoMin: null,
    servicos: [servicoAvulso],
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 0,
    formaPagamento: null,
    status: "emAndamento" as const,
    observacoesPt: "",
    observacoesEn: "",
    retornoSugeridoDias: null,
    proximoAgendamentoId: null,
    ...over,
  };
}

describe("ficha da cliente — Agendar / Iniciar atendimento", () => {
  it("Agendar: cria o agendamento para a cliente e ele passa a ser o 'próximo agendamento' dela", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    const criado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 10 * 60,
      fimMin: 11 * 60,
      valorEstimado: 50,
      observacoesPt: "",
      observacoesEn: "",
    });
    expect(criado.clienteId).toBe(cliente.id);

    const clienteAtualizado = (await getClientes()).find((x) => x.id === cliente.id)!;
    expect(clienteAtualizado.proximoAgendamento).toBe(`${data} · 10:00 AM`);
  });

  it("Iniciar atendimento: cria atendimento 'emAndamento' — não conclui nem registra pagamento só pelo clique", async () => {
    const cliente = await criarClienteTeste();

    const criado = await createAtendimentoAction(atendimentoAvulso(cliente.id));

    expect(criado.clienteId).toBe(cliente.id);
    expect(criado.status).toBe("emAndamento");
    expect(criado.agendamentoId).toBeNull();
    expect(await prisma.pagamento.count({ where: { atendimentoId: criado.id } })).toBe(0);
    const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: criado.id } });
    expect(row.horarioFim).toBeNull();
    expect(row.status).toBe("emAndamento");
  });

  it("Iniciar atendimento avulso não exige agendamento vinculado", async () => {
    const cliente = await criarClienteTeste();
    const criado = await createAtendimentoAction(atendimentoAvulso(cliente.id, { agendamentoId: null }));
    expect(criado.id).toMatch(/^ATD-\d{6}$/);
  });

  it("Iniciar atendimento reseta a decisão de reengajamento da cliente", async () => {
    const cliente = await criarClienteTeste();
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { reengajamentoStatus: "contatado", reengajamentoObservacao: "ligar semana que vem" },
    });

    await createAtendimentoAction(atendimentoAvulso(cliente.id));

    const row = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(row.reengajamentoStatus).toBe("nenhum");
    expect(row.reengajamentoObservacao).toBeNull();
  });

  describe("validações existentes preservadas", () => {
    it("Agendar sem cliente é rejeitado", async () => {
      await expect(
        createAgendamentoAction({
          clienteId: "",
          servicoId: null,
          status: "aguardando",
          data: proximaDataAgendaTeste(),
          inicioMin: 10 * 60,
          fimMin: 11 * 60,
          valorEstimado: null,
          observacoesPt: "",
          observacoesEn: "",
        }),
      ).rejects.toThrow("Selecione uma cliente.");
    });

    it("Iniciar atendimento sem cliente é rejeitado", async () => {
      await expect(createAtendimentoAction(atendimentoAvulso(""))).rejects.toThrow("Selecione uma cliente.");
    });

    it("Iniciar atendimento sem serviço é rejeitado", async () => {
      const cliente = await criarClienteTeste();
      await expect(createAtendimentoAction(atendimentoAvulso(cliente.id, { servicos: [] }))).rejects.toThrow(
        "Adicione ao menos um serviço realizado.",
      );
    });

    it("Iniciar atendimento com valor de serviço negativo é rejeitado", async () => {
      const cliente = await criarClienteTeste();
      await expect(
        createAtendimentoAction(atendimentoAvulso(cliente.id, { servicos: [{ ...servicoAvulso, valor: -1 }] })),
      ).rejects.toThrow("O valor de um serviço não pode ser negativo.");
    });

    it("Agendar fora do expediente é rejeitado", async () => {
      const cliente = await criarClienteTeste();
      await expect(
        createAgendamentoAction({
          clienteId: cliente.id,
          servicoId: null,
          status: "aguardando",
          data: proximaDataAgendaTeste(),
          inicioMin: 6 * 60, // antes da abertura (9:00)
          fimMin: 7 * 60,
          valorEstimado: null,
          observacoesPt: "",
          observacoesEn: "",
        }),
      ).rejects.toThrow("O horário deve estar dentro do expediente.");
    });

    it("Agendar em horário já ocupado é rejeitado (conflito)", async () => {
      const cliente = await criarClienteTeste();
      const data = proximaDataAgendaTeste();
      await createAgendamentoAction({
        clienteId: cliente.id,
        servicoId: null,
        status: "aguardando",
        data,
        inicioMin: 10 * 60,
        fimMin: 11 * 60,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      });
      await expect(
        createAgendamentoAction({
          clienteId: cliente.id,
          servicoId: null,
          status: "aguardando",
          data,
          inicioMin: 10 * 60 + 30,
          fimMin: 11 * 60 + 30,
          valorEstimado: null,
          observacoesPt: "",
          observacoesEn: "",
        }),
      ).rejects.toThrow("Já existe um agendamento nesse horário.");
    });
  });

  it("o agendamento criado pela ficha fica persistido na mesma tabela lida pela Agenda", async () => {
    const cliente = await criarClienteTeste();
    const criado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: proximaDataAgendaTeste(),
      inicioMin: 12 * 60,
      fimMin: 13 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: criado.id } });
    expect(linha.clienteId).toBe(cliente.id);
    expect(linha.data >= formatDateISO(new Date())).toBe(true);
  });
});
