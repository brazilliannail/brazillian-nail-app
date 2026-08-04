"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { LembreteStatus } from "@/lib/lembretes-mock";
import type { IdiomaContato } from "@/lib/clientes-mock";
import { requireRosangela } from "@/lib/auth/authorization";

type Tx = Prisma.TransactionClient;

/** Próximo id de mensagem, a partir de `numero_sequencial` (mesmo padrão de `lembretes`/`atendimentos`). */
async function nextMensagemLogId(tx: Tx): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await tx.mensagemLog.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: `MSG-${String(numeroSequencial).padStart(6, "0")}`, numeroSequencial };
}

/** Altera o status de um lembrete (preparado/enviado/tratado pessoalmente/ignorado/reativado).
 * Ao marcar como "enviado", registra `enviadoEm` e confirma qualquer mensagem ainda "preparada"
 * ligada a este lembrete em `mensagens_log` (ver DATABASE_DESIGN.md §4.10). */
export async function updateStatusLembreteAction(id: string, status: LembreteStatus): Promise<void> {
  await requireRosangela();
  const existente = await prisma.lembrete.findUnique({ where: { id } });
  if (!existente) {
    throw new Error("Lembrete não encontrado.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lembrete.update({
      where: { id },
      data: {
        statusLembrete: status,
        enviadoEm: status === "enviado" ? new Date() : existente.enviadoEm,
      },
    });

    if (status === "enviado") {
      await tx.mensagemLog.updateMany({
        where: { lembreteId: id, statusMensagem: "preparada" },
        data: { statusMensagem: "enviada", confirmadoEm: new Date() },
      });
    }
  });

  revalidatePath("/lembretes");
}

/** Atualiza o texto personalizado do lembrete para o contato principal (sobrepõe o template padrão). */
export async function updateMensagemPersonalizadaAction(id: string, mensagem: string): Promise<void> {
  await requireRosangela();
  await prisma.lembrete.update({ where: { id }, data: { mensagemPersonalizada: mensagem } });
  revalidatePath("/lembretes");
}

/** Atualiza o texto personalizado do lembrete para o contato secundário. */
export async function updateMensagemPersonalizadaSecundarioAction(id: string, mensagem: string): Promise<void> {
  await requireRosangela();
  await prisma.lembrete.update({ where: { id }, data: { mensagemPersonalizadaSecundario: mensagem } });
  revalidatePath("/lembretes");
}

/**
 * Registra em `mensagens_log` que um texto de lembrete foi preparado (o link de WhatsApp/SMS foi
 * aberto) — não confirma envio, só audita o que foi montado e para qual contato (ver §4.10).
 * `papel` resolve o `contato_id` real a partir de `(clienteId, papel)`, sem precisar expor o id
 * interno do contato no tipo `Contato` usado pela UI.
 */
export async function registrarMensagemPreparadaAction(dados: {
  lembreteId: string;
  papel: "principal" | "secundario";
  canal: "whatsapp" | "sms";
  idioma: IdiomaContato;
  texto: string;
}): Promise<void> {
  await requireRosangela();
  const lembrete = await prisma.lembrete.findUnique({
    where: { id: dados.lembreteId },
    include: { agendamento: { select: { clienteId: true } } },
  });
  if (!lembrete) return;

  const contato = await prisma.contato.findFirst({
    where: { clienteId: lembrete.agendamento.clienteId, papel: dados.papel },
  });
  if (!contato) return;

  await prisma.$transaction(async (tx) => {
    const { id, numeroSequencial } = await nextMensagemLogId(tx);
    await tx.mensagemLog.create({
      data: {
        id,
        numeroSequencial,
        clienteId: lembrete.agendamento.clienteId,
        contatoId: contato.id,
        lembreteId: lembrete.id,
        canal: dados.canal,
        idioma: dados.idioma,
        textoPreparado: dados.texto,
        statusMensagem: "preparada",
      },
    });
  });

  revalidatePath("/lembretes");
}
