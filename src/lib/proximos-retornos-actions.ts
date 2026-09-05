"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRosangela } from "@/lib/auth/authorization";
import { getConfiguracoes } from "@/lib/configuracoes-repo";
import { expedienteDeConfiguracoes, type Expediente } from "@/lib/configuracoes-mock";
import { parseTimeToMinutes } from "@/lib/date";
import { STATUS_ATENDIMENTO_FATURAMENTO } from "@/lib/atendimentos-mock";
import { sincronizarProximoAgendamento } from "@/lib/proximos-retornos-sync";
import {
  avaliarPropostaRetorno,
  calcularDataRetorno,
  detectarColisoesRetorno,
  encontrarPrimeiroHorarioLivre,
  sobrepoe,
  type GrupoColisaoRetorno,
  type IntervaloOcupado,
  type PropostaRetorno,
} from "@/lib/proximos-retornos";

export type ResultadoCalculoRetornos = {
  propostas: PropostaRetorno[];
  colisoes: GrupoColisaoRetorno[];
};

type Tx = Prisma.TransactionClient;

/** Tipo mínimo do serviço de catálogo usado pelas duas actions. */
type ServicoRetornavel = {
  id: string;
  nomePt: string;
  nomeEn: string | null;
  retornoSugeridoDias: number | null;
  duracaoPadraoMin: number;
  precoPadrao: number;
};

/** Agendamentos que OCUPAM horário na data (mesma semântica de `existeConflito` em
 * agenda-actions.ts): não cancelados, no dia. A sobreposição em si é decidida por `sobrepoe`
 * (proximos-retornos.ts) — a mesma função, nunca uma segunda regra. */
async function buscarOcupados(client: Tx | typeof prisma, dataIso: string): Promise<IntervaloOcupado[]> {
  return client.agendamento.findMany({
    where: { data: dataIso, status: { not: "cancelado" } },
    select: { inicioMin: true, fimMin: true },
  });
}

/** Próximo id de agendamento no padrão do projeto (`AGD-000001` a partir de `numero_sequencial`,
 * indexado e único) — mesmíssimo mecanismo de `nextAgendamentoId` em agenda-actions.ts e de
 * `nextAtendimentoId` em atendimentos-actions.ts, aqui consultado dentro da transação. */
async function nextAgendamentoId(tx: Tx): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await tx.agendamento.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: `AGD-${String(numeroSequencial).padStart(6, "0")}`, numeroSequencial };
}

/** Próximo id de retorno agendado — mesmo padrão `numero_sequencial + 1`. */
async function nextRetornoId(tx: Tx): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await tx.retornoAgendado.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: `RET-${String(numeroSequencial).padStart(6, "0")}`, numeroSequencial };
}

function ehViolacaoUnica(erro: unknown, alvo?: string): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== "P2002") return false;
  if (!alvo) return true;
  const target = erro.meta?.target;
  return Array.isArray(target) ? target.join(",").includes(alvo) : String(target ?? "").includes(alvo);
}

/**
 * Fases 5A/5B — CALCULA as propostas de retorno para os serviços de um atendimento já concluído e
 * anota quais já geraram retorno antes (deduplicação por origem rastreável). É só leitura: seguro
 * chamar quantas vezes quiser (duplo clique, reabrir a prévia) — não cria estado nenhum.
 *
 * Reaproveita as fontes de verdade existentes, sem recriar regra:
 * - `Servico.retornoSugeridoDias`/`duracaoPadraoMin` (catálogo), lidos no momento do cálculo.
 * - `expedienteDeConfiguracoes`/dias de funcionamento (configuracoes-mock.ts).
 * - a mesma noção de "ocupado" de `existeConflito` (agenda-actions.ts).
 */
export async function calcularPropostasRetornoAction(atendimentoId: string): Promise<ResultadoCalculoRetornos> {
  await requireRosangela();

  const atendimento = await prisma.atendimento.findUnique({
    where: { id: atendimentoId },
    include: { servicos: true },
  });
  if (!atendimento) {
    throw new Error("Atendimento não encontrado.");
  }
  if (!STATUS_ATENDIMENTO_FATURAMENTO.has(atendimento.status)) {
    throw new Error("Só é possível calcular retornos de um atendimento concluído.");
  }

  const configuracoes = await getConfiguracoes();
  const expediente = expedienteDeConfiguracoes(configuracoes.agenda);
  const horarioOriginalMin = parseTimeToMinutes(atendimento.horarioInicio);

  // Deduplicação por ORIGEM rastreável: quais serviços deste atendimento JÁ geraram um retorno
  // (tabela `retornos_agendados`). Nunca por nome/data/horário.
  const retornosExistentes = await prisma.retornoAgendado.findMany({
    where: { atendimentoOrigemId: atendimento.id },
    select: { servicoOrigemId: true },
  });
  const servicosJaComRetorno = new Set(retornosExistentes.map((r) => r.servicoOrigemId));

  const propostas: PropostaRetorno[] = [];
  const ocupadosPorData = new Map<string, IntervaloOcupado[]>();

  for (const servicoRealizado of atendimento.servicos) {
    if (!servicoRealizado.servicoId) continue;

    const servicoCatalogo = await prisma.servico.findUnique({ where: { id: servicoRealizado.servicoId } });
    if (!servicoCatalogo || servicoCatalogo.retornoSugeridoDias === null) continue;

    const dataIso = calcularDataRetorno(atendimento.data, servicoCatalogo.retornoSugeridoDias);

    let ocupados = ocupadosPorData.get(dataIso);
    if (!ocupados) {
      ocupados = await buscarOcupados(prisma, dataIso);
      ocupadosPorData.set(dataIso, ocupados);
    }

    propostas.push(
      avaliarPropostaRetorno({
        origem: {
          atendimentoId: atendimento.id,
          agendamentoId: atendimento.agendamentoId,
          servicoId: servicoCatalogo.id,
        },
        clienteId: atendimento.clienteId,
        servico: {
          servicoId: servicoCatalogo.id,
          nomePt: servicoCatalogo.nomePt,
          nomeEn: servicoCatalogo.nomeEn ?? servicoCatalogo.nomePt,
          retornoSugeridoDias: servicoCatalogo.retornoSugeridoDias,
          duracaoMin: servicoCatalogo.duracaoPadraoMin,
        },
        dataAtendimentoIso: atendimento.data,
        horarioOriginalMin,
        expediente,
        ocupados,
        jaAgendado: servicosJaComRetorno.has(servicoCatalogo.id),
      }),
    );
  }

  return { propostas, colisoes: detectarColisoesRetorno(propostas) };
}

// ---------------------------------------------------------------------------------------------
// Fase 5C — gravação definitiva
// ---------------------------------------------------------------------------------------------

/** O que a Rosangela confirmou para UM serviço: a origem + o horário QUE ELA VIU na prévia.
 * O servidor revalida tudo do zero — a prévia nunca é garantia de que o horário segue livre. */
export type SelecaoRetornoConfirmada = {
  servicoId: string;
  /** data ISO exibida na prévia (recalculada e reconferida no servidor). */
  dataIso: string;
  /** horário (min) exibido na prévia; se o servidor recalcular outro, devolve para reconfirmar. */
  horarioMin: number;
};

/** Um grupo de colisão da prévia + a escolha da Rosangela para ele. */
export type DecisaoColisaoConfirmada = {
  servicoIds: string[];
  decisao: "combinado" | "separado";
  /** horário (min) que a prévia mostrou para o grupo (para detectar mudança até a confirmação). */
  horarioMin: number;
};

export type EntradaConfirmacaoRetornos = {
  atendimentoId: string;
  selecionados: SelecaoRetornoConfirmada[];
  colisoes: DecisaoColisaoConfirmada[];
};

export type ResultadoItemRetorno =
  | { servicoId: string; tipo: "gravado"; agendamentoId: string; combinado: boolean; inicioMin: number; fimMin: number; dataIso: string }
  | { servicoId: string; tipo: "jaExistente"; agendamentoId: string }
  | { servicoId: string; tipo: "reconfirmar"; dataIso: string; horarioAnteriorMin: number; horarioNovoMin: number | null; duracaoMin: number; combinado: boolean }
  | { servicoId: string; tipo: "semHorario"; motivo: "diaFechado" | "diaSemHorarioLivre" | "semRetornoSugerido" };

export type ResultadoConfirmacaoRetornos = {
  itens: ResultadoItemRetorno[];
  gravados: number;
  precisaReconfirmar: boolean;
};

async function carregarServicoRetornavel(servicoId: string): Promise<ServicoRetornavel | null> {
  const s = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!s) return null;
  return {
    id: s.id,
    nomePt: s.nomePt,
    nomeEn: s.nomeEn,
    retornoSugeridoDias: s.retornoSugeridoDias,
    duracaoPadraoMin: s.duracaoPadraoMin,
    precoPadrao: s.precoPadrao,
  };
}

type ContextoConfirmacao = {
  atendimento: Prisma.AtendimentoGetPayload<{ include: { servicos: true } }>;
  expediente: Expediente;
  horarioOriginalMin: number;
  /** Intervalos criados NESTA confirmação, por data — para o "2º serviço enxerga o 1º como
   * ocupado" (colisão mantida separada) sem depender de o 1º já ter sido relido do banco. */
  ocupadosExtra: Map<string, IntervaloOcupado[]>;
};

function registrarOcupadoExtra(ctx: ContextoConfirmacao, dataIso: string, inicioMin: number, fimMin: number) {
  const lista = ctx.ocupadosExtra.get(dataIso) ?? [];
  lista.push({ inicioMin, fimMin });
  ctx.ocupadosExtra.set(dataIso, lista);
}

async function retornoJaExistente(atendimentoOrigemId: string, servicoOrigemId: string) {
  return prisma.retornoAgendado.findUnique({
    where: { atendimentoOrigemId_servicoOrigemId: { atendimentoOrigemId, servicoOrigemId } },
  });
}

/**
 * Grava (ou não) o retorno de UM serviço isolado. Revalida do zero: expediente, dia de
 * funcionamento, duração (relida do catálogo) e conflito com TODOS os agendamentos que ocupam
 * horário no dia — mais os intervalos criados nesta mesma confirmação. Nunca escolhe outro dia.
 */
async function gravarRetornoIndividual(
  ctx: ContextoConfirmacao,
  selecao: SelecaoRetornoConfirmada,
): Promise<{ itens: ResultadoItemRetorno[]; intervalo?: { dataIso: string; inicioMin: number; fimMin: number } }> {
  const { atendimento } = ctx;

  const existente = await retornoJaExistente(atendimento.id, selecao.servicoId);
  if (existente) {
    return { itens: [{ servicoId: selecao.servicoId, tipo: "jaExistente", agendamentoId: existente.agendamentoId }] };
  }

  const servico = await carregarServicoRetornavel(selecao.servicoId);
  if (!servico || servico.retornoSugeridoDias === null) {
    return { itens: [{ servicoId: selecao.servicoId, tipo: "semHorario", motivo: "semRetornoSugerido" }] };
  }

  const dataIso = calcularDataRetorno(atendimento.data, servico.retornoSugeridoDias);
  const ocupados = [...(await buscarOcupados(prisma, dataIso)), ...(ctx.ocupadosExtra.get(dataIso) ?? [])];
  const proposta = avaliarPropostaRetorno({
    origem: { atendimentoId: atendimento.id, agendamentoId: atendimento.agendamentoId, servicoId: servico.id },
    clienteId: atendimento.clienteId,
    servico: {
      servicoId: servico.id,
      nomePt: servico.nomePt,
      nomeEn: servico.nomeEn ?? servico.nomePt,
      retornoSugeridoDias: servico.retornoSugeridoDias,
      duracaoMin: servico.duracaoPadraoMin,
    },
    dataAtendimentoIso: atendimento.data,
    horarioOriginalMin: ctx.horarioOriginalMin,
    expediente: ctx.expediente,
    ocupados,
  });

  if (!proposta.diaDeFuncionamento) {
    return { itens: [{ servicoId: servico.id, tipo: "semHorario", motivo: "diaFechado" }] };
  }
  if (proposta.horarioPropostoMin === null) {
    return { itens: [{ servicoId: servico.id, tipo: "semHorario", motivo: "diaSemHorarioLivre" }] };
  }
  // Prévia ≠ realidade atual → devolve para nova confirmação, nunca grava silenciosamente.
  if (proposta.dataIso !== selecao.dataIso || proposta.horarioPropostoMin !== selecao.horarioMin) {
    return {
      itens: [
        {
          servicoId: servico.id,
          tipo: "reconfirmar",
          dataIso: proposta.dataIso,
          horarioAnteriorMin: selecao.horarioMin,
          horarioNovoMin: proposta.horarioPropostoMin,
          duracaoMin: servico.duracaoPadraoMin,
          combinado: false,
        },
      ],
    };
  }

  const inicioMin = proposta.horarioPropostoMin;
  const fimMin = inicioMin + servico.duracaoPadraoMin;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const dup = await tx.retornoAgendado.findUnique({
        where: { atendimentoOrigemId_servicoOrigemId: { atendimentoOrigemId: atendimento.id, servicoOrigemId: servico.id } },
      });
      if (dup) return { tipo: "jaExistente" as const, agendamentoId: dup.agendamentoId };

      const ocupadosTx = [...(await buscarOcupados(tx, dataIso)), ...(ctx.ocupadosExtra.get(dataIso) ?? [])];
      if (sobrepoe(inicioMin, fimMin, ocupadosTx)) {
        const livre = encontrarPrimeiroHorarioLivre(ctx.horarioOriginalMin, servico.duracaoPadraoMin, ctx.expediente, ocupadosTx);
        return { tipo: "conflito" as const, horarioNovoMin: livre };
      }

      const ag = await nextAgendamentoId(tx);
      await tx.agendamento.create({
        data: {
          id: ag.id,
          numeroSequencial: ag.numeroSequencial,
          clienteId: atendimento.clienteId,
          servicoId: servico.id,
          data: dataIso,
          inicioMin,
          fimMin,
          status: "aguardando",
          valorEstimado: servico.precoPadrao,
          observacoesPt: `Retorno do atendimento ${atendimento.numeroSequencial}`,
          observacoesEn: `Return from appointment ${atendimento.numeroSequencial}`,
        },
      });
      const ret = await nextRetornoId(tx);
      await tx.retornoAgendado.create({
        data: {
          id: ret.id,
          numeroSequencial: ret.numeroSequencial,
          atendimentoOrigemId: atendimento.id,
          servicoOrigemId: servico.id,
          agendamentoId: ag.id,
        },
      });
      return { tipo: "gravado" as const, agendamentoId: ag.id };
    });

    if (resultado.tipo === "jaExistente") {
      return { itens: [{ servicoId: servico.id, tipo: "jaExistente", agendamentoId: resultado.agendamentoId }] };
    }
    if (resultado.tipo === "conflito") {
      return {
        itens: [
          {
            servicoId: servico.id,
            tipo: resultado.horarioNovoMin === null ? "semHorario" : "reconfirmar",
            ...(resultado.horarioNovoMin === null
              ? { motivo: "diaSemHorarioLivre" as const }
              : {
                  dataIso,
                  horarioAnteriorMin: selecao.horarioMin,
                  horarioNovoMin: resultado.horarioNovoMin,
                  duracaoMin: servico.duracaoPadraoMin,
                  combinado: false,
                }),
          } as ResultadoItemRetorno,
        ],
      };
    }
    return {
      itens: [{ servicoId: servico.id, tipo: "gravado", agendamentoId: resultado.agendamentoId, combinado: false, inicioMin, fimMin, dataIso }],
      intervalo: { dataIso, inicioMin, fimMin },
    };
  } catch (erro) {
    // Corrida na restrição UNIQUE de origem: a requisição vencedora já criou este retorno.
    // Idempotente — devolve o retorno já existente, nunca um erro genérico nem uma duplicidade.
    if (ehViolacaoUnica(erro, "atendimento_origem_id")) {
      const win = await retornoJaExistente(atendimento.id, servico.id);
      if (win) return { itens: [{ servicoId: servico.id, tipo: "jaExistente", agendamentoId: win.agendamentoId }] };
    }
    throw erro;
  }
}

/**
 * "Criar um único agendamento combinado": UM agendamento cobrindo os dois serviços (duração =
 * soma das durações, no modelo início/fim já existente da Agenda), rastreado por DUAS linhas em
 * `retornos_agendados` (uma por serviço de origem) apontando para o mesmo agendamento. Nunca cria
 * dois agendamentos sobrepostos.
 */
async function gravarRetornoCombinado(
  ctx: ContextoConfirmacao,
  grupo: DecisaoColisaoConfirmada,
): Promise<{ itens: ResultadoItemRetorno[]; intervalo?: { dataIso: string; inicioMin: number; fimMin: number } }> {
  const { atendimento } = ctx;
  const [servicoIdA, servicoIdB] = grupo.servicoIds;

  const servicoA = await carregarServicoRetornavel(servicoIdA);
  const servicoB = await carregarServicoRetornavel(servicoIdB);
  if (!servicoA || servicoA.retornoSugeridoDias === null || !servicoB || servicoB.retornoSugeridoDias === null) {
    return {
      itens: [servicoIdA, servicoIdB].map((id) => ({ servicoId: id, tipo: "semHorario", motivo: "semRetornoSugerido" as const })),
    };
  }

  const dataIsoA = calcularDataRetorno(atendimento.data, servicoA.retornoSugeridoDias);
  const dataIsoB = calcularDataRetorno(atendimento.data, servicoB.retornoSugeridoDias);
  const duracaoTotal = servicoA.duracaoPadraoMin + servicoB.duracaoPadraoMin;

  const jaA = await retornoJaExistente(atendimento.id, servicoIdA);
  const jaB = await retornoJaExistente(atendimento.id, servicoIdB);
  if (jaA && jaB) {
    return {
      itens: [
        { servicoId: servicoIdA, tipo: "jaExistente", agendamentoId: jaA.agendamentoId },
        { servicoId: servicoIdB, tipo: "jaExistente", agendamentoId: jaB.agendamentoId },
      ],
    };
  }
  // Estado parcial (só um lado já gravado) — não força um combinado inconsistente; devolve para
  // reavaliação. Só acontece se uma confirmação anterior gravou um dos dois isoladamente.
  if (jaA || jaB) {
    return {
      itens: ([[servicoIdA, jaA], [servicoIdB, jaB]] as const).map(([id, ja]) =>
        ja
          ? { servicoId: id, tipo: "jaExistente" as const, agendamentoId: ja.agendamentoId }
          : { servicoId: id, tipo: "reconfirmar" as const, dataIso: dataIsoA, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: null, duracaoMin: duracaoTotal, combinado: true },
      ),
    };
  }

  // Datas diferentes não podem ser um único agendamento — devolve para reavaliação.
  if (dataIsoA !== dataIsoB) {
    return {
      itens: [servicoIdA, servicoIdB].map((id) => ({
        servicoId: id, tipo: "reconfirmar", dataIso: dataIsoA, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: null, duracaoMin: duracaoTotal, combinado: true,
      })),
    };
  }
  const dataIso = dataIsoA;

  const diaDeFuncionamento = avaliarPropostaRetorno({
    origem: { atendimentoId: atendimento.id, agendamentoId: atendimento.agendamentoId, servicoId: servicoA.id },
    clienteId: atendimento.clienteId,
    servico: { servicoId: servicoA.id, nomePt: servicoA.nomePt, nomeEn: servicoA.nomeEn ?? servicoA.nomePt, retornoSugeridoDias: servicoA.retornoSugeridoDias, duracaoMin: duracaoTotal },
    dataAtendimentoIso: atendimento.data,
    horarioOriginalMin: ctx.horarioOriginalMin,
    expediente: ctx.expediente,
    ocupados: [],
  }).diaDeFuncionamento;
  if (!diaDeFuncionamento) {
    return { itens: [servicoIdA, servicoIdB].map((id) => ({ servicoId: id, tipo: "semHorario", motivo: "diaFechado" as const })) };
  }

  const ocupados = [...(await buscarOcupados(prisma, dataIso)), ...(ctx.ocupadosExtra.get(dataIso) ?? [])];
  const slot = encontrarPrimeiroHorarioLivre(ctx.horarioOriginalMin, duracaoTotal, ctx.expediente, ocupados);
  if (slot === null) {
    return { itens: [servicoIdA, servicoIdB].map((id) => ({ servicoId: id, tipo: "semHorario", motivo: "diaSemHorarioLivre" as const })) };
  }
  if (slot !== grupo.horarioMin) {
    return {
      itens: [servicoIdA, servicoIdB].map((id) => ({
        servicoId: id, tipo: "reconfirmar", dataIso, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: slot, duracaoMin: duracaoTotal, combinado: true,
      })),
    };
  }

  const fimMin = slot + duracaoTotal;
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const dupA = await tx.retornoAgendado.findUnique({ where: { atendimentoOrigemId_servicoOrigemId: { atendimentoOrigemId: atendimento.id, servicoOrigemId: servicoIdA } } });
      const dupB = await tx.retornoAgendado.findUnique({ where: { atendimentoOrigemId_servicoOrigemId: { atendimentoOrigemId: atendimento.id, servicoOrigemId: servicoIdB } } });
      if (dupA && dupB) return { tipo: "jaExistente" as const, agendamentoIdA: dupA.agendamentoId, agendamentoIdB: dupB.agendamentoId };
      if (dupA || dupB) return { tipo: "parcial" as const, agendamentoIdA: dupA?.agendamentoId ?? null, agendamentoIdB: dupB?.agendamentoId ?? null };

      const ocupadosTx = [...(await buscarOcupados(tx, dataIso)), ...(ctx.ocupadosExtra.get(dataIso) ?? [])];
      if (sobrepoe(slot, fimMin, ocupadosTx)) {
        const livre = encontrarPrimeiroHorarioLivre(ctx.horarioOriginalMin, duracaoTotal, ctx.expediente, ocupadosTx);
        return { tipo: "conflito" as const, horarioNovoMin: livre };
      }

      const ag = await nextAgendamentoId(tx);
      await tx.agendamento.create({
        data: {
          id: ag.id,
          numeroSequencial: ag.numeroSequencial,
          clienteId: atendimento.clienteId,
          servicoId: null, // representa DOIS serviços — a verdade fica em `retornos_agendados`
          data: dataIso,
          inicioMin: slot,
          fimMin,
          status: "aguardando",
          valorEstimado: servicoA.precoPadrao + servicoB.precoPadrao,
          observacoesPt: `Retorno combinado do atendimento ${atendimento.numeroSequencial}: ${servicoA.nomePt} + ${servicoB.nomePt}`,
          observacoesEn: `Combined return from appointment ${atendimento.numeroSequencial}: ${servicoA.nomeEn ?? servicoA.nomePt} + ${servicoB.nomeEn ?? servicoB.nomePt}`,
        },
      });
      const retA = await nextRetornoId(tx);
      await tx.retornoAgendado.create({ data: { id: retA.id, numeroSequencial: retA.numeroSequencial, atendimentoOrigemId: atendimento.id, servicoOrigemId: servicoIdA, agendamentoId: ag.id } });
      const retB = await nextRetornoId(tx);
      await tx.retornoAgendado.create({ data: { id: retB.id, numeroSequencial: retB.numeroSequencial, atendimentoOrigemId: atendimento.id, servicoOrigemId: servicoIdB, agendamentoId: ag.id } });
      return { tipo: "gravado" as const, agendamentoId: ag.id };
    });

    if (resultado.tipo === "gravado") {
      return {
        itens: [servicoIdA, servicoIdB].map((id) => ({
          servicoId: id, tipo: "gravado" as const, agendamentoId: resultado.agendamentoId, combinado: true, inicioMin: slot, fimMin, dataIso,
        })),
        intervalo: { dataIso, inicioMin: slot, fimMin },
      };
    }
    if (resultado.tipo === "jaExistente") {
      return {
        itens: [
          { servicoId: servicoIdA, tipo: "jaExistente", agendamentoId: resultado.agendamentoIdA },
          { servicoId: servicoIdB, tipo: "jaExistente", agendamentoId: resultado.agendamentoIdB },
        ],
      };
    }
    if (resultado.tipo === "parcial") {
      return {
        itens: [
          resultado.agendamentoIdA
            ? { servicoId: servicoIdA, tipo: "jaExistente", agendamentoId: resultado.agendamentoIdA }
            : { servicoId: servicoIdA, tipo: "reconfirmar", dataIso, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: null, duracaoMin: duracaoTotal, combinado: true },
          resultado.agendamentoIdB
            ? { servicoId: servicoIdB, tipo: "jaExistente", agendamentoId: resultado.agendamentoIdB }
            : { servicoId: servicoIdB, tipo: "reconfirmar", dataIso, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: null, duracaoMin: duracaoTotal, combinado: true },
        ],
      };
    }
    // conflito
    return {
      itens: [servicoIdA, servicoIdB].map((id) => ({
        servicoId: id,
        tipo: resultado.horarioNovoMin === null ? ("semHorario" as const) : ("reconfirmar" as const),
        ...(resultado.horarioNovoMin === null
          ? { motivo: "diaSemHorarioLivre" as const }
          : { dataIso, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: resultado.horarioNovoMin, duracaoMin: duracaoTotal, combinado: true }),
      })) as ResultadoItemRetorno[],
    };
  } catch (erro) {
    if (ehViolacaoUnica(erro, "atendimento_origem_id")) {
      const winA = await retornoJaExistente(atendimento.id, servicoIdA);
      const winB = await retornoJaExistente(atendimento.id, servicoIdB);
      return {
        itens: [
          winA ? { servicoId: servicoIdA, tipo: "jaExistente", agendamentoId: winA.agendamentoId } : { servicoId: servicoIdA, tipo: "reconfirmar", dataIso, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: null, duracaoMin: duracaoTotal, combinado: true },
          winB ? { servicoId: servicoIdB, tipo: "jaExistente", agendamentoId: winB.agendamentoId } : { servicoId: servicoIdB, tipo: "reconfirmar", dataIso, horarioAnteriorMin: grupo.horarioMin, horarioNovoMin: null, duracaoMin: duracaoTotal, combinado: true },
        ],
      };
    }
    throw erro;
  }
}

/**
 * Fase 5C — grava definitivamente os retornos que a Rosangela confirmou.
 *
 * Reaproveita integralmente o motor (`avaliarPropostaRetorno`/`encontrarPrimeiroHorarioLivre`/
 * `sobrepoe`) e a prévia já validados: nenhuma segunda lógica de disponibilidade. A prévia NÃO é
 * garantia — cada gravação revalida do servidor (expediente, dia, duração relida do catálogo,
 * conflito com todos os agendamentos que ocupam horário) e:
 *   - se o horário da prévia mudou → devolve a proposta atualizada para nova confirmação;
 *   - se não há horário no mesmo dia → informa, sem escolher outro dia;
 *   - idempotente por origem rastreável (`retornos_agendados`): repetir clique/confirmação/
 *     conclusão nunca duplica; corrida na UNIQUE devolve o retorno já criado, não erro.
 *
 * Nunca altera nem exclui agendamentos existentes — só cria.
 */
export async function confirmarRetornosAction(entrada: EntradaConfirmacaoRetornos): Promise<ResultadoConfirmacaoRetornos> {
  await requireRosangela();

  const atendimento = await prisma.atendimento.findUnique({
    where: { id: entrada.atendimentoId },
    include: { servicos: true },
  });
  if (!atendimento) throw new Error("Atendimento não encontrado.");
  if (!STATUS_ATENDIMENTO_FATURAMENTO.has(atendimento.status)) {
    throw new Error("Só é possível gerar retornos de um atendimento concluído.");
  }

  const configuracoes = await getConfiguracoes();
  const ctx: ContextoConfirmacao = {
    atendimento,
    expediente: expedienteDeConfiguracoes(configuracoes.agenda),
    horarioOriginalMin: parseTimeToMinutes(atendimento.horarioInicio),
    ocupadosExtra: new Map(),
  };

  // Só serviços que de fato estiveram no atendimento podem gerar retorno.
  const servicosDoAtendimento = new Set(atendimento.servicos.map((s) => s.servicoId).filter((v): v is string => Boolean(v)));
  const selecionadosValidos = entrada.selecionados.filter((s) => servicosDoAtendimento.has(s.servicoId));
  const selecionadosPorId = new Set(selecionadosValidos.map((s) => s.servicoId));

  // Combinados: grupo cuja decisão é "combinado" E cujos dois serviços seguem selecionados.
  const combinados = entrada.colisoes.filter(
    (c) => c.decisao === "combinado" && c.servicoIds.length === 2 && c.servicoIds.every((id) => selecionadosPorId.has(id)),
  );
  const servicosEmCombinado = new Set(combinados.flatMap((c) => c.servicoIds));

  const itens: ResultadoItemRetorno[] = [];

  // 1) Combinados primeiro — o intervalo criado passa a "ocupar" para os individuais seguintes.
  for (const grupo of combinados) {
    const res = await gravarRetornoCombinado(ctx, grupo);
    itens.push(...res.itens);
    if (res.intervalo) registrarOcupadoExtra(ctx, res.intervalo.dataIso, res.intervalo.inicioMin, res.intervalo.fimMin);
  }

  // 2) Individuais (inclui os lados de colisão "separado"), em ordem determinística: o 1º preserva
  //    o horário; o 2º é recalculado com o 1º já ocupado. Se o 2º mudar em relação à prévia →
  //    reconfirmar, nunca gravar silenciosamente.
  const individuais = selecionadosValidos
    .filter((s) => !servicosEmCombinado.has(s.servicoId))
    .sort((a, b) => a.dataIso.localeCompare(b.dataIso) || a.horarioMin - b.horarioMin || a.servicoId.localeCompare(b.servicoId));

  for (const selecao of individuais) {
    const res = await gravarRetornoIndividual(ctx, selecao);
    itens.push(...res.itens);
    if (res.intervalo) registrarOcupadoExtra(ctx, res.intervalo.dataIso, res.intervalo.inicioMin, res.intervalo.fimMin);
  }

  const gravados = itens.filter((i) => i.tipo === "gravado").length;
  const precisaReconfirmar = itens.some((i) => i.tipo === "reconfirmar");
  // Recalcula o ponteiro "próximo agendamento" sempre que este atendimento tem algum retorno
  // (recém-gravado ou já existente) — self-healing mesmo em reconfirmações repetidas.
  if (itens.some((i) => i.tipo === "gravado" || i.tipo === "jaExistente")) {
    await sincronizarProximoAgendamento(prisma, atendimento.id);
  }
  if (gravados > 0) revalidatePath("/", "layout");

  return { itens, gravados, precisaReconfirmar };
}
