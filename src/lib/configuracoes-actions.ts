"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { mapConfiguracaoRow, stateToRow } from "@/lib/configuracoes-repo";
import type { ConfiguracoesState } from "@/lib/configuracoes-mock";
import { parseTimeToMinutes } from "@/lib/date";

/** Formato aceito para `horarioAbertura`/`horarioFechamento`: "H:MM AM/PM" (ex.: "9:00 AM").
 * `horarioAbertura`/`horarioFechamento` são campos de texto livre na tela de Configurações — sem
 * essa validação na gravação, um valor malformado quebraria a leitura de expediente em toda a
 * Agenda (`agenda-actions.ts`), não só na própria tela. */
const HORARIO_REGEX = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;

function validarConfiguracoes(dados: ConfiguracoesState) {
  const camposObrigatorios: [string, string][] = [
    [dados.negocio.nome, "Nome do negócio é obrigatório."],
    [dados.negocio.telefone, "Telefone do negócio é obrigatório."],
    [dados.negocio.email, "E-mail do negócio é obrigatório."],
    [dados.negocio.endereco, "Endereço é obrigatório."],
    [dados.negocio.cidade, "Cidade é obrigatória."],
    [dados.negocio.estado, "Estado é obrigatório."],
    [dados.negocio.zip, "ZIP code é obrigatório."],
    [dados.agenda.horarioAbertura, "Horário de abertura é obrigatório."],
    [dados.agenda.horarioFechamento, "Horário de fechamento é obrigatório."],
    [dados.lembretes.textoPadraoPt, "Texto padrão de lembrete em português é obrigatório."],
    [dados.lembretes.textoPadraoEn, "Texto padrão de lembrete em inglês é obrigatório."],
    [dados.seguranca.emailPrincipal, "E-mail do usuário principal é obrigatório."],
  ];
  for (const [valor, mensagem] of camposObrigatorios) {
    if (valor.trim() === "") throw new Error(mensagem);
  }

  if (!HORARIO_REGEX.test(dados.agenda.horarioAbertura.trim())) {
    throw new Error('Horário de abertura inválido — use o formato H:MM AM/PM (ex.: "9:00 AM").');
  }
  if (!HORARIO_REGEX.test(dados.agenda.horarioFechamento.trim())) {
    throw new Error('Horário de fechamento inválido — use o formato H:MM AM/PM (ex.: "7:00 PM").');
  }
  if (parseTimeToMinutes(dados.agenda.horarioAbertura) >= parseTimeToMinutes(dados.agenda.horarioFechamento)) {
    throw new Error("Horário de abertura deve ser antes do horário de fechamento.");
  }
  if (dados.agenda.diasFuncionamento.length === 0) {
    throw new Error("Selecione ao menos um dia de funcionamento.");
  }
  if (dados.agenda.duracaoPadraoMinutos <= 0) {
    throw new Error("Duração padrão de agendamento deve ser maior que zero.");
  }
  if (!Object.values(dados.financeiro.formasPagamentoAtivas).some(Boolean)) {
    throw new Error("Ative ao menos uma forma de pagamento.");
  }
}

/** Salva as Configurações no registro singleton (id 1) da tabela `configuracoes`. */
export async function updateConfiguracoesAction(dados: ConfiguracoesState): Promise<ConfiguracoesState> {
  validarConfiguracoes(dados);

  const row = await prisma.configuracao.update({ where: { id: 1 }, data: stateToRow(dados) });

  revalidatePath("/", "layout");
  return mapConfiguracaoRow(row);
}
