import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import {
  createAgendamentoAction,
  updateAgendamentoAction,
  updateStatusAgendamentoAction,
  reagendarAgendamentoAction,
} from "@/lib/agenda-actions";
import { getAgendamentos } from "@/lib/agenda-repo";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";

describe("agenda (agenda-actions + agenda-repo)", () => {
  it("cria agendamento válido e ele aparece em getAgendamentos()", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    const criado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: 80,
      observacoesPt: "",
      observacoesEn: "",
    });

    expect(criado.status).toBe("aguardando");

    const agendamentos = await getAgendamentos();
    expect(agendamentos.some((a) => a.id === criado.id)).toBe(true);
  });

  it("rejeita cliente vazio", async () => {
    const data = proximaDataAgendaTeste();
    await expect(
      createAgendamentoAction({
        clienteId: "",
        servicoId: null,
        status: "aguardando",
        data,
        inicioMin: 9 * 60,
        fimMin: 10 * 60,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Selecione uma cliente.");
  });

  it("rejeita horário com início depois (ou igual) do fim", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    await expect(
      createAgendamentoAction({
        clienteId: cliente.id,
        servicoId: null,
        status: "aguardando",
        data,
        inicioMin: 10 * 60,
        fimMin: 10 * 60,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("O horário de início deve ser anterior ao horário de término.");
  });

  it("rejeita horário fora do expediente (antes das 8h ou depois das 18h)", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    await expect(
      createAgendamentoAction({
        clienteId: cliente.id,
        servicoId: null,
        status: "aguardando",
        data,
        inicioMin: 7 * 60,
        fimMin: 8 * 60,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("O horário deve estar dentro do expediente.");

    await expect(
      createAgendamentoAction({
        clienteId: cliente.id,
        servicoId: null,
        status: "aguardando",
        data,
        inicioMin: 17 * 60 + 30,
        fimMin: 18 * 60 + 30,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("O horário deve estar dentro do expediente.");
  });

  it("rejeita conflito de horário no mesmo dia (janelas sobrepostas)", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
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
        inicioMin: 9 * 60 + 30,
        fimMin: 10 * 60 + 30,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Já existe um agendamento nesse horário.");
  });

  it("agendamento cancelado não conta como conflito para um novo agendamento no mesmo horário", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    const cancelado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });
    await updateStatusAgendamentoAction(cancelado.id, "cancelado");

    const novo = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    expect(novo.status).toBe("aguardando");
  });

  it("atualiza um agendamento existente (updateAgendamentoAction)", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    const criado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: 80,
      observacoesPt: "",
      observacoesEn: "",
    });

    const atualizado = await updateAgendamentoAction({
      ...criado,
      valorEstimado: 120,
      observacoesPt: "Cliente pediu para trocar a cor.",
    });

    expect(atualizado.valorEstimado).toBe(120);
    expect(atualizado.observacoesPt).toBe("Cliente pediu para trocar a cor.");
  });

  it("updateAgendamentoAction rejeita agendamento inexistente", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    await expect(
      updateAgendamentoAction({
        id: "AGD-999999",
        clienteId: cliente.id,
        servicoId: null,
        status: "aguardando",
        data,
        inicioMin: 9 * 60,
        fimMin: 10 * 60,
        valorEstimado: null,
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Agendamento não encontrado.");
  });

  it("muda o status de um agendamento (updateStatusAgendamentoAction)", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();

    const criado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    const confirmado = await updateStatusAgendamentoAction(criado.id, "confirmado");
    expect(confirmado.status).toBe("confirmado");
  });

  it("reagenda para nova data/horário, validando expediente e conflito", async () => {
    const cliente = await criarClienteTeste();
    const dataOriginal = proximaDataAgendaTeste();
    const novaData = proximaDataAgendaTeste();

    const criado = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: dataOriginal,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    const reagendado = await reagendarAgendamentoAction(criado.id, novaData, 14 * 60, 15 * 60);

    expect(reagendado.data).toBe(novaData);
    expect(reagendado.inicioMin).toBe(14 * 60);
    expect(reagendado.fimMin).toBe(15 * 60);
  });

  it("reagendarAgendamentoAction rejeita conflito na nova data", async () => {
    const cliente = await criarClienteTeste();
    const data = proximaDataAgendaTeste();
    const outraData = proximaDataAgendaTeste();

    await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: outraData,
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    const paraReagendar = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data,
      inicioMin: 11 * 60,
      fimMin: 12 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    await expect(
      reagendarAgendamentoAction(paraReagendar.id, outraData, 9 * 60, 10 * 60),
    ).rejects.toThrow("Já existe um agendamento nesse horário.");
  });
});
