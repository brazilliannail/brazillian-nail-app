"use server";

import { prisma } from "@/lib/db";
import { mapClienteRow, includeRelacionamentosCliente } from "@/lib/clientes-repo";
import { formatClienteId, type Cliente, type Contato } from "@/lib/clientes-mock";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

async function nextContatoId(tx: Tx): Promise<string> {
  const rows = await tx.contato.findMany({ select: { id: true } });
  let max = 0;
  for (const row of rows) {
    const match = /^CTT-(\d+)$/.exec(row.id);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `CTT-${String(max + 1).padStart(6, "0")}`;
}

function validarContato(contato: Contato | null) {
  if (!contato) return;
  if (contato.telefone.trim() === "") {
    throw new Error("Telefone do contato é obrigatório.");
  }
}

/** Cria/atualiza/remove o contato de um determinado papel ("principal"/"secundario") dentro da transação. */
async function sincronizarContato(tx: Tx, clienteId: string, papel: "principal" | "secundario", contato: Contato | null) {
  const existente = await tx.contato.findFirst({ where: { clienteId, papel } });

  if (!contato) {
    if (existente) {
      await tx.contato.delete({ where: { id: existente.id } });
    }
    return;
  }

  if (existente) {
    await tx.contato.update({
      where: { id: existente.id },
      data: {
        nomeContato: contato.nomeContato,
        telefone: contato.telefone,
        relacao: contato.relacao,
        idioma: contato.idioma,
        canalPreferido: contato.canalPreferido,
        receberLembretes: contato.receberLembretes,
      },
    });
  } else {
    const novoId = await nextContatoId(tx);
    await tx.contato.create({
      data: {
        id: novoId,
        clienteId,
        papel,
        nomeContato: contato.nomeContato,
        telefone: contato.telefone,
        relacao: contato.relacao,
        idioma: contato.idioma,
        canalPreferido: contato.canalPreferido,
        receberLembretes: contato.receberLembretes,
      },
    });
  }
}

async function buscarClienteCompleto(tx: Tx, id: string): Promise<Cliente> {
  const row = await tx.cliente.findUniqueOrThrow({ where: { id }, include: includeRelacionamentosCliente });
  return mapClienteRow(row);
}

/** Cria uma cliente nova (com contatos, se informados) dentro de uma transação. */
export async function createClienteAction(dados: Omit<Cliente, "id">): Promise<Cliente> {
  const nome = dados.nome.trim();
  if (nome === "") {
    throw new Error("Nome é obrigatório.");
  }
  validarContato(dados.contatoPrincipal);
  validarContato(dados.contatoSecundario);

  return prisma.$transaction(async (tx) => {
    const agregado = await tx.cliente.aggregate({ _max: { numeroSequencial: true } });
    const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
    const id = formatClienteId(numeroSequencial);

    await tx.cliente.create({
      data: {
        id,
        numeroSequencial,
        nome,
        nomePreferencia: dados.nomePreferencia,
        status: dados.status,
        observacoesPt: dados.observacoesPt,
        observacoesEn: dados.observacoesEn,
        avisosImportantesPt: JSON.stringify(dados.avisosImportantesPt),
        avisosImportantesEn: JSON.stringify(dados.avisosImportantesEn),
      },
    });

    if (dados.contatoPrincipal) {
      await sincronizarContato(tx, id, "principal", dados.contatoPrincipal);
    }
    if (dados.contatoSecundario) {
      await sincronizarContato(tx, id, "secundario", dados.contatoSecundario);
    }

    return buscarClienteCompleto(tx, id);
  });
}

/** Atualiza dados de uma cliente existente e sincroniza seus contatos, dentro de uma transação. */
export async function updateClienteAction(cliente: Cliente): Promise<Cliente> {
  const nome = cliente.nome.trim();
  if (nome === "") {
    throw new Error("Nome é obrigatório.");
  }
  validarContato(cliente.contatoPrincipal);
  validarContato(cliente.contatoSecundario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.cliente.findUnique({ where: { id: cliente.id } });
    if (!existente) {
      throw new Error("Cliente não encontrada.");
    }

    await tx.cliente.update({
      where: { id: cliente.id },
      data: {
        nome,
        nomePreferencia: cliente.nomePreferencia,
        observacoesPt: cliente.observacoesPt,
        observacoesEn: cliente.observacoesEn,
        avisosImportantesPt: JSON.stringify(cliente.avisosImportantesPt),
        avisosImportantesEn: JSON.stringify(cliente.avisosImportantesEn),
      },
    });

    await sincronizarContato(tx, cliente.id, "principal", cliente.contatoPrincipal);
    await sincronizarContato(tx, cliente.id, "secundario", cliente.contatoSecundario);

    return buscarClienteCompleto(tx, cliente.id);
  });
}

/** Alterna o status (ativa/inativa) de uma cliente, dentro de uma transação. */
export async function toggleStatusClienteAction(id: string): Promise<Cliente> {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.cliente.findUnique({ where: { id } });
    if (!existente) {
      throw new Error("Cliente não encontrada.");
    }

    const novoStatus = existente.status === "ativa" ? "inativa" : "ativa";
    await tx.cliente.update({ where: { id }, data: { status: novoStatus } });

    return buscarClienteCompleto(tx, id);
  });
}
