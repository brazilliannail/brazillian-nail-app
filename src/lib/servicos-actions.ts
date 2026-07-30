"use server";

import { prisma } from "@/lib/db";
import { mapServicoRow } from "@/lib/servicos-repo";
import type { Servico } from "@/lib/servicos-mock";

async function nextServicoId(): Promise<string> {
  const rows = await prisma.servico.findMany({ select: { id: true } });
  let max = 0;
  for (const row of rows) {
    const match = /^SRV-(\d+)$/.exec(row.id);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `SRV-${String(max + 1).padStart(6, "0")}`;
}

function validarServico(dados: Omit<Servico, "id">) {
  if (dados.nome.trim() === "") {
    throw new Error("Nome do serviço é obrigatório.");
  }
  if (dados.categoria.trim() === "") {
    throw new Error("Categoria é obrigatória.");
  }
  if (dados.precoPadrao < 0) {
    throw new Error("Preço padrão não pode ser negativo.");
  }
  if (dados.precoVariavel) {
    if (dados.precoMinimo === null || dados.precoMaximo === null) {
      throw new Error("Informe a faixa de preço mínima e máxima.");
    }
    if (dados.precoMinimo > dados.precoMaximo) {
      throw new Error("O preço mínimo não pode ser maior que o máximo.");
    }
  }
  if (dados.duracaoPadrao <= 0) {
    throw new Error("Duração padrão deve ser maior que zero.");
  }
  if (dados.duracaoMinima !== null && dados.duracaoMaxima !== null && dados.duracaoMinima > dados.duracaoMaxima) {
    throw new Error("A duração mínima não pode ser maior que a máxima.");
  }
}

/** Cria um serviço novo no banco SQLite via Prisma. */
export async function createServicoAction(dados: Omit<Servico, "id">): Promise<Servico> {
  validarServico(dados);

  const id = await nextServicoId();

  const row = await prisma.servico.create({
    data: {
      id,
      nomePt: dados.nome.trim(),
      nomeEn: dados.nomeEn && dados.nomeEn.trim() !== "" ? dados.nomeEn.trim() : null,
      categoria: dados.categoria.trim(),
      descricaoPt: dados.descricaoPt.trim(),
      descricaoEn: dados.descricaoEn.trim(),
      precoPadrao: dados.precoPadrao,
      precoVariavel: dados.precoVariavel,
      precoMinimo: dados.precoVariavel ? dados.precoMinimo : null,
      precoMaximo: dados.precoVariavel ? dados.precoMaximo : null,
      duracaoPadraoMin: dados.duracaoPadrao,
      duracaoMinimaMin: dados.duracaoMinima,
      duracaoMaximaMin: dados.duracaoMaxima,
      retornoSugeridoDias: dados.retornoSugeridoDias,
      status: dados.status,
      observacoesPt: dados.observacoesPt.trim(),
      observacoesEn: dados.observacoesEn.trim(),
    },
  });

  return mapServicoRow(row);
}

/** Atualiza um serviço existente no banco SQLite via Prisma. */
export async function updateServicoAction(servico: Servico): Promise<Servico> {
  validarServico(servico);

  const existente = await prisma.servico.findUnique({ where: { id: servico.id } });
  if (!existente) {
    throw new Error("Serviço não encontrado.");
  }

  const row = await prisma.servico.update({
    where: { id: servico.id },
    data: {
      nomePt: servico.nome.trim(),
      nomeEn: servico.nomeEn && servico.nomeEn.trim() !== "" ? servico.nomeEn.trim() : null,
      categoria: servico.categoria.trim(),
      descricaoPt: servico.descricaoPt.trim(),
      descricaoEn: servico.descricaoEn.trim(),
      precoPadrao: servico.precoPadrao,
      precoVariavel: servico.precoVariavel,
      precoMinimo: servico.precoVariavel ? servico.precoMinimo : null,
      precoMaximo: servico.precoVariavel ? servico.precoMaximo : null,
      duracaoPadraoMin: servico.duracaoPadrao,
      duracaoMinimaMin: servico.duracaoMinima,
      duracaoMaximaMin: servico.duracaoMaxima,
      retornoSugeridoDias: servico.retornoSugeridoDias,
      observacoesPt: servico.observacoesPt.trim(),
      observacoesEn: servico.observacoesEn.trim(),
    },
  });

  return mapServicoRow(row);
}

/** Alterna o status (ativo/inativo) de um serviço. */
export async function toggleStatusServicoAction(id: string): Promise<Servico> {
  const existente = await prisma.servico.findUnique({ where: { id } });
  if (!existente) {
    throw new Error("Serviço não encontrado.");
  }

  const novoStatus = existente.status === "ativo" ? "inativo" : "ativo";
  const row = await prisma.servico.update({ where: { id }, data: { status: novoStatus } });

  return mapServicoRow(row);
}
