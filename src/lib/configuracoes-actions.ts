"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { mapConfiguracaoRow, stateToRow } from "@/lib/configuracoes-repo";
import type { ConfiguracoesState } from "@/lib/configuracoes-mock";
import { requireRosangela } from "@/lib/auth/authorization";
import { validarConfiguracoes } from "@/lib/configuracoes-validation";

/** Salva as Configurações no registro singleton (id 1) da tabela `configuracoes`. */
export async function updateConfiguracoesAction(dados: ConfiguracoesState): Promise<ConfiguracoesState> {
  await requireRosangela();
  validarConfiguracoes(dados);

  const row = await prisma.configuracao.update({ where: { id: 1 }, data: stateToRow(dados) });

  revalidatePath("/", "layout");
  return mapConfiguracaoRow(row);
}
