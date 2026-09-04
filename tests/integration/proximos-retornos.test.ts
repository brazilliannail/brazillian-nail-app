import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache) — sem request scope do Next fora do servidor.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { createServicoAction } from "@/lib/servicos-actions";
import { createAtendimentoAction, concluirAtendimentoAction } from "@/lib/atendimentos-actions";
import { createAgendamentoAction } from "@/lib/agenda-actions";
import { calcularPropostasRetornoAction } from "@/lib/proximos-retornos-actions";
import { chaveOrigemRetorno } from "@/lib/proximos-retornos";
import { prisma } from "@/lib/db";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";

let contador = 0;
function sufixo() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

async function criarServicoComRetorno(params: { retornoSugeridoDias: number | null; duracaoPadrao?: number }) {
  const s = sufixo();
  return createServicoAction({
    nome: `Serviço ${s}`,
    nomeEn: `Service ${s}`,
    categoria: "Manicure",
    descricaoPt: "",
    descricaoEn: "",
    precoPadrao: 50,
    precoVariavel: false,
    precoMinimo: null,
    precoMaximo: null,
    duracaoPadrao: params.duracaoPadrao ?? 60,
    duracaoMinima: null,
    duracaoMaxima: null,
    retornoSugeridoDias: params.retornoSugeridoDias,
    status: "ativo",
    observacoesPt: "",
    observacoesEn: "",
  });
}

/** Atendimento concluído (finalizadoPago) com os serviços de catálogo informados. */
async function criarAtendimentoConcluido(params: {
  servicos: { id: string; nomePt: string; nomeEn: string }[];
  data?: string;
  horarioInicio?: string;
}) {
  const cliente = await criarClienteTeste();
  const atendimento = await createAtendimentoAction({
    clienteId: cliente.id,
    agendamentoId: null,
    profissional: "Rosângela",
    data: params.data ?? proximaDataAgendaTeste(),
    horarioInicio: params.horarioInicio ?? "10:00 AM",
    horarioFim: null,
    duracaoMin: null,
    servicos: params.servicos.map((s) => ({ servicoId: s.id, nomePt: s.nomePt, nomeEn: s.nomeEn, valor: 50 })),
    desconto: 0,
    gorjeta: 0,
    valorRecebido: 0,
    formaPagamento: null,
    status: "emAndamento",
    observacoesPt: "",
    observacoesEn: "",
    retornoSugeridoDias: null,
    proximoAgendamentoId: null,
  });

  await concluirAtendimentoAction(atendimento.id, {
    horarioFim: "11:00 AM",
    duracaoMin: 60,
    valorRecebido: params.servicos.length * 50,
    gorjeta: 0,
    formaPagamento: "dinheiro",
    status: "finalizadoPago",
  });

  return { cliente, atendimentoId: atendimento.id };
}

describe("calcularPropostasRetornoAction (prévia — Fase 5B, sem gravação)", () => {
  it("prévia normal: um serviço com retorno sugerido gera uma proposta disponível e selecionável", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome }],
    });

    const { propostas, colisoes } = await calcularPropostasRetornoAction(atendimentoId);

    expect(propostas).toHaveLength(1);
    expect(propostas[0].disponivel).toBe(true);
    expect(propostas[0].jaAgendado).toBe(false);
    expect(propostas[0].duracaoMin).toBe(60);
    expect(colisoes).toHaveLength(0);
  });

  it("serviço sem retorno sugerido continua sem proposta", async () => {
    const comRetorno = await criarServicoComRetorno({ retornoSugeridoDias: 7 });
    const semRetorno = await criarServicoComRetorno({ retornoSugeridoDias: null });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [
        { id: comRetorno.id, nomePt: comRetorno.nome, nomeEn: comRetorno.nomeEn ?? comRetorno.nome },
        { id: semRetorno.id, nomePt: semRetorno.nome, nomeEn: semRetorno.nomeEn ?? semRetorno.nome },
      ],
    });

    const { propostas } = await calcularPropostasRetornoAction(atendimentoId);

    expect(propostas).toHaveLength(1);
    expect(propostas[0].origem.servicoId).toBe(comRetorno.id);
  });

  it("dois serviços com mesma data e horário propostos: a colisão é identificada explicitamente", async () => {
    const a = await criarServicoComRetorno({ retornoSugeridoDias: 21 });
    const b = await criarServicoComRetorno({ retornoSugeridoDias: 21 });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [
        { id: a.id, nomePt: a.nome, nomeEn: a.nomeEn ?? a.nome },
        { id: b.id, nomePt: b.nome, nomeEn: b.nomeEn ?? b.nome },
      ],
    });

    const { propostas, colisoes } = await calcularPropostasRetornoAction(atendimentoId);

    expect(propostas).toHaveLength(2);
    expect(colisoes).toHaveLength(1);
    expect(colisoes[0].propostas).toHaveLength(2);
    expect(colisoes[0].propostas.map((p) => p.origem.servicoId).sort()).toEqual([a.id, b.id].sort());
  });

  it("horário alterado: um agendamento no horário original empurra a proposta para o próximo livre", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 30, duracaoPadrao: 60 });
    const data = proximaDataAgendaTeste();
    const { cliente, atendimentoId } = await criarAtendimentoConcluido({
      servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome }],
      data,
      horarioInicio: "10:00 AM",
    });

    // 1ª prévia: descobre a data ISO exata que o motor calculou para o retorno.
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const dataRetornoIso = previa.propostas[0].dataIso;

    // Ocupa 10:00–11:00 exatamente nesse dia e regenera a prévia.
    await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: `${dataRetornoIso.slice(5, 7)}/${dataRetornoIso.slice(8, 10)}/${dataRetornoIso.slice(0, 4)}`,
      inicioMin: 10 * 60,
      fimMin: 11 * 60,
      valorEstimado: 50,
      observacoesPt: "",
      observacoesEn: "",
    });

    const { propostas } = await calcularPropostasRetornoAction(atendimentoId);

    expect(propostas[0].horarioAlterado).toBe(true);
    expect(propostas[0].horarioPropostoMin).toBe(11 * 60);
    expect(propostas[0].disponivel).toBe(true);
  });

  it("identifica retorno já existente pela ORIGEM (atendimento + serviço), não por nome/data/hora", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { cliente, atendimentoId } = await criarAtendimentoConcluido({
      servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome }],
    });

    // Simula que essa origem JÁ produziu um retorno antes (o que a etapa de gravação fará).
    const agendamento = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: servico.id,
      status: "aguardando",
      data: proximaDataAgendaTeste(),
      inicioMin: 15 * 60,
      fimMin: 16 * 60,
      valorEstimado: 50,
      observacoesPt: "",
      observacoesEn: "",
    });
    const maxSeq = (await prisma.retornoAgendado.aggregate({ _max: { numeroSequencial: true } }))._max.numeroSequencial ?? 0;
    await prisma.retornoAgendado.create({
      data: {
        id: `RET-${sufixo()}`,
        numeroSequencial: maxSeq + 1,
        atendimentoOrigemId: atendimentoId,
        servicoOrigemId: servico.id,
        agendamentoId: agendamento.id,
      },
    });

    const { propostas } = await calcularPropostasRetornoAction(atendimentoId);

    expect(propostas).toHaveLength(1);
    expect(propostas[0].jaAgendado).toBe(true);
    expect(chaveOrigemRetorno(propostas[0].origem)).toBe(`${atendimentoId}::${servico.id}`);
  });

  it("índice único de origem impede duas linhas de retorno para a mesma (atendimento, serviço)", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { cliente, atendimentoId } = await criarAtendimentoConcluido({
      servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome }],
    });
    async function criarRetorno() {
      const ag = await createAgendamentoAction({
        clienteId: cliente.id,
        servicoId: servico.id,
        status: "aguardando",
        data: proximaDataAgendaTeste(),
        inicioMin: 12 * 60,
        fimMin: 13 * 60,
        valorEstimado: 50,
        observacoesPt: "",
        observacoesEn: "",
      });
      const maxSeq = (await prisma.retornoAgendado.aggregate({ _max: { numeroSequencial: true } }))._max.numeroSequencial ?? 0;
      return prisma.retornoAgendado.create({
        data: {
          id: `RET-${sufixo()}`,
          numeroSequencial: maxSeq + 1,
          atendimentoOrigemId: atendimentoId,
          servicoOrigemId: servico.id,
          agendamentoId: ag.id,
        },
      });
    }

    await criarRetorno();
    await expect(criarRetorno()).rejects.toThrow();
  });

  it("regerar a prévia várias vezes não cria estado nenhum (sem agendamentos, sem retornos)", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome }],
    });

    const agendamentosAntes = await prisma.agendamento.count();
    const retornosAntes = await prisma.retornoAgendado.count();

    const r1 = await calcularPropostasRetornoAction(atendimentoId);
    const r2 = await calcularPropostasRetornoAction(atendimentoId);
    const r3 = await calcularPropostasRetornoAction(atendimentoId);

    expect(r2).toEqual(r1);
    expect(r3).toEqual(r1);
    expect(await prisma.agendamento.count()).toBe(agendamentosAntes);
    expect(await prisma.retornoAgendado.count()).toBe(retornosAntes);
  });

  it("preserva os fluxos anteriores: concluir um atendimento não cria agendamento nem retorno", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const agendamentosAntes = await prisma.agendamento.count();
    const retornosAntes = await prisma.retornoAgendado.count();

    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [{ id: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome }],
    });
    await calcularPropostasRetornoAction(atendimentoId);

    expect(await prisma.agendamento.count()).toBe(agendamentosAntes);
    expect(await prisma.retornoAgendado.count()).toBe(retornosAntes);

    const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
    expect(row.status).toBe("finalizadoPago");
    expect(row.proximoAgendamentoId).toBeNull();
  });

  it("rejeita cálculo para atendimento ainda em andamento", async () => {
    const cliente = await criarClienteTeste();
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const atendimento = await createAtendimentoAction({
      clienteId: cliente.id,
      agendamentoId: null,
      profissional: "Rosângela",
      data: proximaDataAgendaTeste(),
      horarioInicio: "10:00 AM",
      horarioFim: null,
      duracaoMin: null,
      servicos: [{ servicoId: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome, valor: 50 }],
      desconto: 0,
      gorjeta: 0,
      valorRecebido: 0,
      formaPagamento: null,
      status: "emAndamento",
      observacoesPt: "",
      observacoesEn: "",
      retornoSugeridoDias: null,
      proximoAgendamentoId: null,
    });

    await expect(calcularPropostasRetornoAction(atendimento.id)).rejects.toThrow(
      "Só é possível calcular retornos de um atendimento concluído.",
    );
  });
});
