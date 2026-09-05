import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { calcularPropostasRetornoAction, confirmarRetornosAction } from "@/lib/proximos-retornos-actions";
import { concluirAtendimentoAction, createAtendimentoAction, iniciarAtendimentoDoAgendamentoAction } from "@/lib/atendimentos-actions";
import { createAgendamentoAction, reagendarAgendamentoAction, updateStatusAgendamentoAction } from "@/lib/agenda-actions";
import { prisma } from "@/lib/db";
import { parseDateISO, formatDateISO, formatDateMMDDYYYY, addDays } from "@/lib/date";
import { diaSemanaDeData } from "@/lib/configuracoes-mock";
import { getConfiguracoes } from "@/lib/configuracoes-repo";
import { criarClienteTeste } from "../helpers/ledger-fixtures";
import { proximaDataAgendaTeste } from "../helpers/agenda-fixtures";
import {
  criarServicoComRetorno,
  criarAtendimentoConcluido,
  ocuparHorario,
  excluirDiaDeFuncionamento,
} from "../helpers/retornos-fixtures";

const servicoParaAtendimento = (s: { id: string; nome: string; nomeEn: string | null }) => ({ id: s.id, nomePt: s.nome, nomeEn: s.nomeEn });

/** Uma proposta da prévia -> item de seleção para confirmar. */
function selecaoDe(proposta: { origem: { servicoId: string }; dataIso: string; horarioPropostoMin: number | null }) {
  return { servicoId: proposta.origem.servicoId, dataIso: proposta.dataIso, horarioMin: proposta.horarioPropostoMin ?? -1 };
}

describe("confirmarRetornosAction — gravação definitiva (Fase 5C)", () => {
  it("gravação normal: cria 1 agendamento aguardando + 1 retorno rastreável, com data/hora/duração da prévia", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14, duracaoPadrao: 60, precoPadrao: 80 });
    const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)], horarioInicio: "10:00 AM" });

    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const p = previa.propostas[0];

    const res = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(p)], colisoes: [] });

    expect(res.gravados).toBe(1);
    expect(res.precisaReconfirmar).toBe(false);
    const item = res.itens[0];
    expect(item.tipo).toBe("gravado");
    if (item.tipo !== "gravado") throw new Error("esperava gravado");

    const agendamento = await prisma.agendamento.findUniqueOrThrow({ where: { id: item.agendamentoId } });
    expect(agendamento.status).toBe("aguardando");
    expect(agendamento.data).toBe(p.dataIso);
    expect(agendamento.inicioMin).toBe(p.horarioPropostoMin);
    expect(agendamento.fimMin).toBe((p.horarioPropostoMin as number) + 60);
    expect(agendamento.servicoId).toBe(servico.id);
    expect(agendamento.valorEstimado).toBe(80);

    // Rastreabilidade da origem (atendimento + serviço), não nome/data/hora.
    const retorno = await prisma.retornoAgendado.findUniqueOrThrow({
      where: { atendimentoOrigemId_servicoOrigemId: { atendimentoOrigemId: atendimentoId, servicoOrigemId: servico.id } },
    });
    expect(retorno.agendamentoId).toBe(item.agendamentoId);
  });

  it("proposta desmarcada não é gravada", async () => {
    const a = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const b = await criarServicoComRetorno({ retornoSugeridoDias: 21 });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [servicoParaAtendimento(a), servicoParaAtendimento(b)],
    });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const soA = previa.propostas.find((p) => p.origem.servicoId === a.id)!;

    const res = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(soA)], colisoes: [] });

    expect(res.gravados).toBe(1);
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(1);
    const retorno = await prisma.retornoAgendado.findFirst({ where: { atendimentoOrigemId: atendimentoId } });
    expect(retorno?.servicoOrigemId).toBe(a.id);
  });

  it("combinado: um único agendamento com duração = soma dos serviços, rastreado por 2 linhas de origem", async () => {
    const a = await criarServicoComRetorno({ retornoSugeridoDias: 30, duracaoPadrao: 60, precoPadrao: 70 });
    const b = await criarServicoComRetorno({ retornoSugeridoDias: 30, duracaoPadrao: 45, precoPadrao: 40 });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [servicoParaAtendimento(a), servicoParaAtendimento(b)],
      horarioInicio: "10:00 AM",
    });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    expect(previa.colisoes).toHaveLength(1);
    const grupo = previa.colisoes[0];

    const res = await confirmarRetornosAction({
      atendimentoId,
      selecionados: previa.propostas.map(selecaoDe),
      colisoes: [{ servicoIds: grupo.propostas.map((p) => p.origem.servicoId), decisao: "combinado", horarioMin: grupo.horarioMin }],
    });

    expect(res.gravados).toBe(2);
    const agendamentoIds = new Set(res.itens.flatMap((i) => (i.tipo === "gravado" ? [i.agendamentoId] : [])));
    expect(agendamentoIds.size).toBe(1); // UM único agendamento
    const [agId] = [...agendamentoIds];
    const ag = await prisma.agendamento.findUniqueOrThrow({ where: { id: agId } });
    expect(ag.fimMin - ag.inicioMin).toBe(105); // 60 + 45
    expect(ag.valorEstimado).toBe(110);
    expect(ag.servicoId).toBeNull();

    const retornos = await prisma.retornoAgendado.findMany({ where: { atendimentoOrigemId: atendimentoId } });
    expect(retornos).toHaveLength(2);
    expect(new Set(retornos.map((r) => r.agendamentoId))).toEqual(new Set([agId]));
    expect(new Set(retornos.map((r) => r.servicoOrigemId))).toEqual(new Set([a.id, b.id]));

    // Nunca cria dois agendamentos sobrepostos.
    const doDia = await prisma.agendamento.findMany({ where: { data: ag.data } });
    expect(doDia).toHaveLength(1);
  });

  it("separados: 1º preserva o horário, 2º é recalculado com o 1º ocupado e volta para nova confirmação", async () => {
    const a = await criarServicoComRetorno({ retornoSugeridoDias: 40, duracaoPadrao: 60 });
    const b = await criarServicoComRetorno({ retornoSugeridoDias: 40, duracaoPadrao: 60 });
    const { atendimentoId } = await criarAtendimentoConcluido({
      servicos: [servicoParaAtendimento(a), servicoParaAtendimento(b)],
      horarioInicio: "10:00 AM",
    });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const grupo = previa.colisoes[0];

    const res1 = await confirmarRetornosAction({
      atendimentoId,
      selecionados: previa.propostas.map(selecaoDe),
      colisoes: [{ servicoIds: grupo.propostas.map((p) => p.origem.servicoId), decisao: "separado", horarioMin: grupo.horarioMin }],
    });

    // 1º gravado no horário original; 2º exige nova confirmação (horário mudou vs prévia).
    expect(res1.gravados).toBe(1);
    expect(res1.precisaReconfirmar).toBe(true);
    const reconf = res1.itens.find((i) => i.tipo === "reconfirmar");
    expect(reconf).toBeTruthy();
    if (reconf && reconf.tipo === "reconfirmar") {
      expect(reconf.horarioNovoMin).toBe(11 * 60); // empurrado 60min à frente
      expect(reconf.horarioNovoMin).not.toBe(reconf.horarioAnteriorMin);
    }

    // Nunca gravou os dois no mesmo slot.
    const agsDoDia = await prisma.agendamento.findMany({ where: { data: previa.propostas[0].dataIso }, orderBy: { inicioMin: "asc" } });
    expect(agsDoDia).toHaveLength(1);
    expect(agsDoDia[0].inicioMin).toBe(10 * 60);

    // 2º turno: a prévia agora mostra o 2º serviço no horário novo; confirma e grava.
    const previa2 = await calcularPropostasRetornoAction(atendimentoId);
    const pendente = previa2.propostas.find((p) => !p.jaAgendado)!;
    expect(pendente.horarioPropostoMin).toBe(11 * 60);
    const res2 = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(pendente)], colisoes: [] });
    expect(res2.gravados).toBe(1);

    const agsFinal = await prisma.agendamento.findMany({ where: { data: previa.propostas[0].dataIso }, orderBy: { inicioMin: "asc" } });
    expect(agsFinal.map((x) => x.inicioMin)).toEqual([10 * 60, 11 * 60]);
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(2);
  });

  it("separados: se não houver horário para o 2º no mesmo dia, informa e não grava — nunca escolhe outro dia", async () => {
    const a = await criarServicoComRetorno({ retornoSugeridoDias: 50, duracaoPadrao: 60 });
    const b = await criarServicoComRetorno({ retornoSugeridoDias: 50, duracaoPadrao: 60 });
    const { cliente, atendimentoId } = await criarAtendimentoConcluido({
      servicos: [servicoParaAtendimento(a), servicoParaAtendimento(b)],
      horarioInicio: "10:00 AM",
    });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const dataIso = previa.propostas[0].dataIso;
    // 11:00 até o fim do expediente ocupado — depois do 1º (10:00-11:00) não sobra nada.
    await ocuparHorario({ clienteId: cliente.id, dataIso, inicioMin: 11 * 60, fimMin: 19 * 60 });

    const previaComBloqueio = await calcularPropostasRetornoAction(atendimentoId);
    const grupo = previaComBloqueio.colisoes[0];
    const res = await confirmarRetornosAction({
      atendimentoId,
      selecionados: previaComBloqueio.propostas.map(selecaoDe),
      colisoes: [{ servicoIds: grupo.propostas.map((p) => p.origem.servicoId), decisao: "separado", horarioMin: grupo.horarioMin }],
    });

    expect(res.gravados).toBe(1);
    const semHorario = res.itens.find((i) => i.tipo === "semHorario");
    expect(semHorario?.tipo).toBe("semHorario");
    if (semHorario?.tipo === "semHorario") expect(semHorario.motivo).toBe("diaSemHorarioLivre");

    // Nenhum agendamento em NENHUMA outra data para esta cliente.
    const todosDaCliente = await prisma.agendamento.findMany({ where: { clienteId: cliente.id } });
    expect(new Set(todosDaCliente.map((x) => x.data))).toEqual(new Set([dataIso]));
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(1);
  });

  it("conflito surgido entre a prévia e a confirmação: devolve para nova confirmação, não grava silenciosamente", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14, duracaoPadrao: 60 });
    const { cliente, atendimentoId } = await criarAtendimentoConcluido({
      servicos: [servicoParaAtendimento(servico)],
      horarioInicio: "10:00 AM",
    });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const p = previa.propostas[0];

    // Alguém ocupa exatamente o horário mostrado na prévia, antes da confirmação.
    await ocuparHorario({ clienteId: cliente.id, dataIso: p.dataIso, inicioMin: p.horarioPropostoMin as number, fimMin: (p.horarioPropostoMin as number) + 60 });

    const res = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(p)], colisoes: [] });

    expect(res.gravados).toBe(0);
    expect(res.precisaReconfirmar).toBe(true);
    const item = res.itens[0];
    expect(item.tipo).toBe("reconfirmar");
    if (item.tipo === "reconfirmar") {
      expect(item.horarioNovoMin).toBe((p.horarioPropostoMin as number) + 60);
      expect(item.horarioNovoMin).not.toBe(item.horarioAnteriorMin);
    }
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(0);
    // só o bloqueio existe — nada foi gravado.
    expect(await prisma.agendamento.count({ where: { clienteId: cliente.id } })).toBe(1);
  });

  it("duplicidade por clique repetido: confirmar de novo o mesmo payload não cria retorno novo", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const payload = { atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] as never[] };

    const primeira = await confirmarRetornosAction(payload);
    const segunda = await confirmarRetornosAction(payload);
    const terceira = await confirmarRetornosAction(payload);

    expect(primeira.gravados).toBe(1);
    expect(segunda.gravados).toBe(0);
    expect(terceira.gravados).toBe(0);
    expect(segunda.itens[0].tipo).toBe("jaExistente");
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(1);
    expect(await prisma.agendamento.count({ where: { servicoId: servico.id } })).toBe(1);
  });

  it("repetição da conclusão do atendimento não gera retorno duplicado (idempotência por origem)", async () => {
    // atendimento a partir de um agendamento, para poder reabrir/reconcluir
    const cliente = await criarClienteTeste();
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const ag = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: servico.id,
      status: "aguardando",
      data: proximaDataAgendaTeste(),
      inicioMin: 10 * 60,
      fimMin: 11 * 60,
      valorEstimado: 50,
      observacoesPt: "",
      observacoesEn: "",
    });
    await updateStatusAgendamentoAction(ag.id, "confirmado");
    const { atendimento } = await iniciarAtendimentoDoAgendamentoAction(ag.id);
    // adiciona um serviço de catálogo ao atendimento em andamento
    await prisma.atendimentoServico.create({
      data: { atendimentoId: atendimento.id, servicoId: servico.id, nomePt: servico.nome, nomeEn: servico.nomeEn ?? servico.nome, valor: 50 },
    });
    await concluirAtendimentoAction(atendimento.id, {
      horarioFim: "11:00 AM", duracaoMin: 60, valorRecebido: 50, gorjeta: 0, formaPagamento: "dinheiro", status: "finalizadoPago",
    });

    const previa = await calcularPropostasRetornoAction(atendimento.id);
    await confirmarRetornosAction({ atendimentoId: atendimento.id, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });

    // "reconcluir": chamar confirmar de novo (a conclusão em si não repete pois status já é final,
    // mas a origem rastreável é o que garante não-duplicidade de qualquer caminho).
    const dednovo = await confirmarRetornosAction({ atendimentoId: atendimento.id, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });
    expect(dednovo.gravados).toBe(0);
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimento.id } })).toBe(1);
  });

  it("colisão concorrente na UNIQUE de origem é tratada de forma idempotente (sem erro genérico, sem duplicidade)", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const payload = { atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] as never[] };

    const resultados = await Promise.all([
      confirmarRetornosAction(payload),
      confirmarRetornosAction(payload),
      confirmarRetornosAction(payload),
    ]);

    // nenhuma lançou; no total exatamente 1 retorno e 1 agendamento.
    const tipos = resultados.flatMap((r) => r.itens.map((i) => i.tipo));
    expect(tipos.every((t) => t === "gravado" || t === "jaExistente")).toBe(true);
    expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(1);
    expect(await prisma.agendamento.count({ where: { servicoId: servico.id } })).toBe(1);
  });

  it("numeroSequencial: usa o padrão existente do projeto (_max + 1, id AGD-/RET- zero-padded)", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
    const previa = await calcularPropostasRetornoAction(atendimentoId);

    const maxAgAntes = (await prisma.agendamento.aggregate({ _max: { numeroSequencial: true } }))._max.numeroSequencial ?? 0;
    const maxRetAntes = (await prisma.retornoAgendado.aggregate({ _max: { numeroSequencial: true } }))._max.numeroSequencial ?? 0;

    const res = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });
    const item = res.itens[0];
    if (item.tipo !== "gravado") throw new Error("esperava gravado");

    const ag = await prisma.agendamento.findUniqueOrThrow({ where: { id: item.agendamentoId } });
    expect(ag.numeroSequencial).toBe(maxAgAntes + 1);
    expect(ag.id).toBe(`AGD-${String(maxAgAntes + 1).padStart(6, "0")}`);

    const ret = await prisma.retornoAgendado.findFirstOrThrow({ where: { atendimentoOrigemId: atendimentoId } });
    expect(ret.numeroSequencial).toBe(maxRetAntes + 1);
    expect(ret.id).toBe(`RET-${String(maxRetAntes + 1).padStart(6, "0")}`);
  });

  it("dia calculado fora do expediente: não grava e não escolhe outro dia", async () => {
    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 7, duracaoPadrao: 60 });
    const { cliente, atendimentoId } = await criarAtendimentoConcluido({
      servicos: [servicoParaAtendimento(servico)],
    });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    const diaRetorno = diaSemanaDeData(parseDateISO(previa.propostas[0].dataIso));
    const restaurar = await excluirDiaDeFuncionamento(diaRetorno);
    try {
      const previaFechado = await calcularPropostasRetornoAction(atendimentoId);
      const p = previaFechado.propostas[0];
      expect(p.diaDeFuncionamento).toBe(false);

      const res = await confirmarRetornosAction({
        atendimentoId,
        selecionados: [{ servicoId: servico.id, dataIso: p.dataIso, horarioMin: 10 * 60 }],
        colisoes: [],
      });
      expect(res.gravados).toBe(0);
      const item = res.itens[0];
      expect(item.tipo).toBe("semHorario");
      if (item.tipo === "semHorario") expect(item.motivo).toBe("diaFechado");
      expect(await prisma.retornoAgendado.count({ where: { atendimentoOrigemId: atendimentoId } })).toBe(0);
      expect(await prisma.agendamento.count({ where: { clienteId: cliente.id } })).toBe(0);
    } finally {
      await restaurar();
    }
  });

  it("preserva os fluxos anteriores: não altera nem exclui agendamentos existentes", async () => {
    const cliente = await criarClienteTeste();
    const outro = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "aguardando",
      data: proximaDataAgendaTeste(),
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: 40,
      observacoesPt: "intacto",
      observacoesEn: "untouched",
    });
    const antes = await prisma.agendamento.findUniqueOrThrow({ where: { id: outro.id } });

    const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
    const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
    const previa = await calcularPropostasRetornoAction(atendimentoId);
    await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });

    const depois = await prisma.agendamento.findUniqueOrThrow({ where: { id: outro.id } });
    expect(depois).toEqual(antes);
  });

  it("rejeita confirmação para atendimento não concluído", async () => {
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

    await expect(
      confirmarRetornosAction({ atendimentoId: atendimento.id, selecionados: [{ servicoId: servico.id, dataIso: "2027-06-15", horarioMin: 600 }], colisoes: [] }),
    ).rejects.toThrow("Só é possível gerar retornos de um atendimento concluído.");
  });

  describe("fecha o loop: Atendimento.proximoAgendamentoId", () => {
    it("aponta para o agendamento do retorno após a confirmação", async () => {
      const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
      const previa = await calcularPropostasRetornoAction(atendimentoId);

      const res = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });
      const gravado = res.itens.find((i) => i.tipo === "gravado");
      if (gravado?.tipo !== "gravado") throw new Error("esperava gravado");

      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBe(gravado.agendamentoId);
    });

    it("com vários retornos separados, aponta para o de data/horário mais próximo", async () => {
      const cedo = await criarServicoComRetorno({ retornoSugeridoDias: 10, duracaoPadrao: 60 });
      const tarde = await criarServicoComRetorno({ retornoSugeridoDias: 40, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({
        servicos: [servicoParaAtendimento(cedo), servicoParaAtendimento(tarde)],
      });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const res = await confirmarRetornosAction({ atendimentoId, selecionados: previa.propostas.map(selecaoDe), colisoes: [] });

      const gravados = res.itens.filter((i): i is Extract<typeof i, { tipo: "gravado" }> => i.tipo === "gravado");
      expect(gravados).toHaveLength(2);
      const maisCedo = gravados
        .slice()
        .sort((a, b) => a.dataIso.localeCompare(b.dataIso) || a.inicioMin - b.inicioMin)[0];

      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBe(maisCedo.agendamentoId);
    });

    it("no modo combinado, aponta para o único agendamento", async () => {
      const a = await criarServicoComRetorno({ retornoSugeridoDias: 30, duracaoPadrao: 60 });
      const b = await criarServicoComRetorno({ retornoSugeridoDias: 30, duracaoPadrao: 45 });
      const { atendimentoId } = await criarAtendimentoConcluido({
        servicos: [servicoParaAtendimento(a), servicoParaAtendimento(b)],
        horarioInicio: "10:00 AM",
      });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const grupo = previa.colisoes[0];
      const res = await confirmarRetornosAction({
        atendimentoId,
        selecionados: previa.propostas.map(selecaoDe),
        colisoes: [{ servicoIds: grupo.propostas.map((p) => p.origem.servicoId), decisao: "combinado", horarioMin: grupo.horarioMin }],
      });

      const agendamentoIds = new Set(res.itens.flatMap((i) => (i.tipo === "gravado" ? [i.agendamentoId] : [])));
      expect(agendamentoIds.size).toBe(1);
      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBe([...agendamentoIds][0]);
    });

    it("permanece nulo quando nenhum retorno é gravado", async () => {
      const servico = await criarServicoComRetorno({ retornoSugeridoDias: 7, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const diaRetorno = diaSemanaDeData(parseDateISO(previa.propostas[0].dataIso));
      const restaurar = await excluirDiaDeFuncionamento(diaRetorno);
      try {
        const res = await confirmarRetornosAction({
          atendimentoId,
          selecionados: [{ servicoId: servico.id, dataIso: previa.propostas[0].dataIso, horarioMin: 10 * 60 }],
          colisoes: [],
        });
        expect(res.gravados).toBe(0);
        const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
        expect(row.proximoAgendamentoId).toBeNull();
      } finally {
        await restaurar();
      }
    });

    it("clique repetido não muda o ponteiro (idempotente)", async () => {
      const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14 });
      const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const payload = { atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] as never[] };

      await confirmarRetornosAction(payload);
      const primeiro = (await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } })).proximoAgendamentoId;
      await confirmarRetornosAction(payload);
      const segundo = (await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } })).proximoAgendamentoId;

      expect(primeiro).not.toBeNull();
      expect(segundo).toBe(primeiro);
    });

    it("ignora um retorno mais cedo que já deixou de ser 'próximo' (concluído/em atendimento/não compareceu)", async () => {
      const cedo = await criarServicoComRetorno({ retornoSugeridoDias: 10, duracaoPadrao: 60 });
      const tarde = await criarServicoComRetorno({ retornoSugeridoDias: 40, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({
        servicos: [servicoParaAtendimento(cedo), servicoParaAtendimento(tarde)],
      });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const primeiraConfirmacao = await confirmarRetornosAction({
        atendimentoId,
        selecionados: previa.propostas.map(selecaoDe),
        colisoes: [],
      });
      const gravados = primeiraConfirmacao.itens.filter((i): i is Extract<typeof i, { tipo: "gravado" }> => i.tipo === "gravado");
      const maisCedo = gravados.slice().sort((a, b) => a.dataIso.localeCompare(b.dataIso) || a.inicioMin - b.inicioMin)[0];
      const maisTarde = gravados.find((g) => g.agendamentoId !== maisCedo.agendamentoId)!;

      // confirma o cenário-base: o ponteiro está no mais cedo.
      expect((await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } })).proximoAgendamentoId).toBe(
        maisCedo.agendamentoId,
      );

      // o retorno mais cedo "aconteceu" (virou emAtendimento) — já não é mais um agendamento futuro.
      await prisma.agendamento.update({ where: { id: maisCedo.agendamentoId }, data: { status: "emAtendimento" } });

      // reconfirmar (idempotente: ambos já existem) precisa recalcular o ponteiro para o único que
      // ainda é um agendamento futuro de verdade — nunca para o que já está em atendimento.
      await confirmarRetornosAction({ atendimentoId, selecionados: previa.propostas.map(selecaoDe), colisoes: [] });
      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBe(maisTarde.agendamentoId);
    });

    it("ignora um retorno cuja data já passou, mesmo com status 'aguardando'", async () => {
      const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const res = await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });
      const gravado = res.itens.find((i) => i.tipo === "gravado");
      if (gravado?.tipo !== "gravado") throw new Error("esperava gravado");

      // o tempo passou e ninguém confirmou/cancelou esse agendamento — data no passado, status intocado.
      const ontemIso = formatDateISO(addDays(new Date(), -1));
      await prisma.agendamento.update({ where: { id: gravado.agendamentoId }, data: { data: ontemIso } });

      await confirmarRetornosAction({ atendimentoId, selecionados: [selecaoDe(previa.propostas[0])], colisoes: [] });
      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBeNull();
    });

    it("ao cancelar o retorno mais próximo pela Agenda, avança o ponteiro para o seguinte", async () => {
      const cedo = await criarServicoComRetorno({ retornoSugeridoDias: 10, duracaoPadrao: 60 });
      const tarde = await criarServicoComRetorno({ retornoSugeridoDias: 40, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({
        servicos: [servicoParaAtendimento(cedo), servicoParaAtendimento(tarde)],
      });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const res = await confirmarRetornosAction({
        atendimentoId,
        selecionados: previa.propostas.map(selecaoDe),
        colisoes: [],
      });
      const gravados = res.itens.filter((i): i is Extract<typeof i, { tipo: "gravado" }> => i.tipo === "gravado");
      const ordenados = gravados.slice().sort((a, b) => a.dataIso.localeCompare(b.dataIso) || a.inicioMin - b.inicioMin);

      await updateStatusAgendamentoAction(ordenados[0].agendamentoId, "cancelado");

      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBe(ordenados[1].agendamentoId);
    });

    it("ao reagendar um retorno, recalcula qual dos retornos é o mais próximo", async () => {
      const cedo = await criarServicoComRetorno({ retornoSugeridoDias: 10, duracaoPadrao: 60 });
      const tarde = await criarServicoComRetorno({ retornoSugeridoDias: 40, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({
        servicos: [servicoParaAtendimento(cedo), servicoParaAtendimento(tarde)],
      });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const res = await confirmarRetornosAction({
        atendimentoId,
        selecionados: previa.propostas.map(selecaoDe),
        colisoes: [],
      });
      const gravados = res.itens.filter((i): i is Extract<typeof i, { tipo: "gravado" }> => i.tipo === "gravado");
      const ordenados = gravados.slice().sort((a, b) => a.dataIso.localeCompare(b.dataIso) || a.inicioMin - b.inicioMin);
      let dataDepoisDeTodosDate = addDays(parseDateISO(ordenados[1].dataIso), 30);
      const configuracoes = await getConfiguracoes();
      while (!configuracoes.agenda.diasFuncionamento.includes(diaSemanaDeData(dataDepoisDeTodosDate))) {
        dataDepoisDeTodosDate = addDays(dataDepoisDeTodosDate, 1);
      }
      const dataDepoisDeTodos = formatDateMMDDYYYY(dataDepoisDeTodosDate);

      await reagendarAgendamentoAction(ordenados[0].agendamentoId, dataDepoisDeTodos, 10 * 60, 11 * 60);

      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBe(ordenados[1].agendamentoId);
    });

    it("ao iniciar o atendimento do retorno, ele deixa de ser o próximo agendamento", async () => {
      const servico = await criarServicoComRetorno({ retornoSugeridoDias: 14, duracaoPadrao: 60 });
      const { atendimentoId } = await criarAtendimentoConcluido({ servicos: [servicoParaAtendimento(servico)] });
      const previa = await calcularPropostasRetornoAction(atendimentoId);
      const res = await confirmarRetornosAction({
        atendimentoId,
        selecionados: [selecaoDe(previa.propostas[0])],
        colisoes: [],
      });
      const gravado = res.itens.find((i) => i.tipo === "gravado");
      if (gravado?.tipo !== "gravado") throw new Error("esperava gravado");

      await iniciarAtendimentoDoAgendamentoAction(gravado.agendamentoId);

      const row = await prisma.atendimento.findUniqueOrThrow({ where: { id: atendimentoId } });
      expect(row.proximoAgendamentoId).toBeNull();
    });
  });
});
