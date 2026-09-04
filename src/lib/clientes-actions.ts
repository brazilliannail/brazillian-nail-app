"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { mapClienteRow, includeRelacionamentosCliente } from "@/lib/clientes-repo";
import {
  aniversarioDiaMesValido,
  formatClienteId,
  telefoneValido,
  type Cliente,
  type Contato,
  type ReengajamentoStatus,
} from "@/lib/clientes-mock";
import { formatDateISO, parseDateISO } from "@/lib/date";
import type { Prisma } from "@/generated/prisma/client";
import { requireRosangela } from "@/lib/auth/authorization";

type Tx = Prisma.TransactionClient;

/** Próximo id de contato, a partir de `numero_sequencial` (coluna indexada e única — mesmo
 * padrão usado por `clientes`). Substitui a varredura completa da tabela + regex usada antes. */
async function nextContatoId(tx: Tx): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await tx.contato.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: `CTT-${String(numeroSequencial).padStart(6, "0")}`, numeroSequencial };
}

function validarContato(contato: Contato | null) {
  if (!contato) return;
  if (contato.telefone.trim() === "") {
    throw new Error("Telefone do contato é obrigatório.");
  }
  if (!telefoneValido(contato.telefone)) {
    throw new Error("Telefone do contato é inválido.");
  }
}

/** Mesma regra usada em `ClienteFormModal.tsx`: dia e mês são sempre exigidos juntos; ano é
 * independente e opcional. Lança se a combinação for inválida (dia sem mês, mês fora de 1-12 etc). */
function validarAniversario(dados: Pick<Cliente, "aniversarioDia" | "aniversarioMes">) {
  const dia = dados.aniversarioDia ?? null;
  const mes = dados.aniversarioMes ?? null;
  if (!aniversarioDiaMesValido(dia, mes)) {
    throw new Error("Dia e mês do aniversário devem ser informados juntos e ser uma data válida.");
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
    const { id: novoId, numeroSequencial } = await nextContatoId(tx);
    await tx.contato.create({
      data: {
        id: novoId,
        numeroSequencial,
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
  await requireRosangela();
  const nome = dados.nome.trim();
  if (nome === "") {
    throw new Error("Nome é obrigatório.");
  }
  validarContato(dados.contatoPrincipal);
  validarContato(dados.contatoSecundario);
  validarAniversario(dados);

  const resultado = await prisma.$transaction(async (tx) => {
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
        aniversarioDia: dados.aniversarioDia ?? null,
        aniversarioMes: dados.aniversarioMes ?? null,
        aniversarioAno: dados.aniversarioAno ?? null,
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

  revalidatePath("/", "layout");
  return resultado;
}

/** Atualiza dados de uma cliente existente e sincroniza seus contatos, dentro de uma transação. */
export async function updateClienteAction(cliente: Cliente): Promise<Cliente> {
  await requireRosangela();
  const nome = cliente.nome.trim();
  if (nome === "") {
    throw new Error("Nome é obrigatório.");
  }
  validarContato(cliente.contatoPrincipal);
  validarContato(cliente.contatoSecundario);
  validarAniversario(cliente);

  const resultado = await prisma.$transaction(async (tx) => {
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
        aniversarioDia: cliente.aniversarioDia ?? null,
        aniversarioMes: cliente.aniversarioMes ?? null,
        aniversarioAno: cliente.aniversarioAno ?? null,
      },
    });

    await sincronizarContato(tx, cliente.id, "principal", cliente.contatoPrincipal);
    await sincronizarContato(tx, cliente.id, "secundario", cliente.contatoSecundario);

    return buscarClienteCompleto(tx, cliente.id);
  });

  revalidatePath("/", "layout");
  return resultado;
}

/** Alterna o status (ativa/inativa) de uma cliente, dentro de uma transação. */
export async function toggleStatusClienteAction(id: string): Promise<Cliente> {
  await requireRosangela();
  const resultado = await prisma.$transaction(async (tx) => {
    const existente = await tx.cliente.findUnique({ where: { id } });
    if (!existente) {
      throw new Error("Cliente não encontrada.");
    }

    const novoStatus = existente.status === "ativa" ? "inativa" : "ativa";
    await tx.cliente.update({ where: { id }, data: { status: novoStatus } });

    return buscarClienteCompleto(tx, id);
  });

  revalidatePath("/", "layout");
  return resultado;
}

/** Persiste a decisão humana sobre um alerta de reengajamento. */
export async function updateReengajamentoClienteAction(
  id: string,
  dados: { status: Exclude<ReengajamentoStatus, "nenhum">; adiadoAte?: string | null; observacao?: string | null },
): Promise<Cliente> {
  await requireRosangela();
  const hojeIso = formatDateISO(new Date());
  const adiadoAte = dados.adiadoAte?.trim() || null;

  if (dados.status === "adiado") {
    if (!adiadoAte || !/^\d{4}-\d{2}-\d{2}$/.test(adiadoAte) || formatDateISO(parseDateISO(adiadoAte)) !== adiadoAte) {
      throw new Error("Informe uma data válida para adiar o contato.");
    }
    if (adiadoAte <= hojeIso) {
      throw new Error("A nova data de contato deve ser posterior a hoje.");
    }
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const existente = await tx.cliente.findUnique({ where: { id } });
    if (!existente) throw new Error("Cliente não encontrada.");
    if (existente.status !== "ativa") throw new Error("Apenas clientes ativas podem receber ações de reengajamento.");
    const clienteCompleto = await buscarClienteCompleto(tx, id);
    if (!clienteCompleto.elegivelReengajamento) {
      throw new Error("Esta cliente não está mais elegível para reengajamento.");
    }

    await tx.cliente.update({
      where: { id },
      data: {
        reengajamentoStatus: dados.status,
        reengajamentoAtualizadoEm: new Date(),
        reengajamentoAdiadoAte: dados.status === "adiado" ? adiadoAte : null,
        reengajamentoObservacao: dados.observacao?.trim() || null,
      },
    });
    return buscarClienteCompleto(tx, id);
  });

  revalidatePath("/", "layout");
  return resultado;
}
