import { createServicoAction } from "@/lib/servicos-actions";
import { createAtendimentoAction, concluirAtendimentoAction } from "@/lib/atendimentos-actions";
import { prisma } from "@/lib/db";
import { addDays, formatDateMMDDYYYY } from "@/lib/date";
import { criarClienteTeste } from "./ledger-fixtures";

let contador = 0;
export function sufixoRetorno() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

// Âncora PRÓPRIA, bem longe da usada por agenda-fixtures (2027-06-01): as datas de retorno
// (data do atendimento + 7..50 dias) nunca colidem com as datas cruas de `proximaDataAgendaTeste`
// usadas em setups diretos de agendamento neste mesmo arquivo de teste.
const ANCORA_RETORNO = new Date(2028, 2, 1);
let diasRetorno = 0;

/** Data única (MM/DD/YYYY) para o ATENDIMENTO de origem, no espaço de datas próprio dos retornos.
 * Espaçamento de 90 dias entre atendimentos — maior que qualquer `retornoSugeridoDias` usado nos
 * testes — para que as datas de retorno de atendimentos diferentes nunca se sobreponham. */
export function proximaDataAtendimentoRetorno(): string {
  const data = addDays(ANCORA_RETORNO, diasRetorno);
  diasRetorno += 90;
  return formatDateMMDDYYYY(data);
}

export async function criarServicoComRetorno(params: {
  retornoSugeridoDias: number | null;
  duracaoPadrao?: number;
  precoPadrao?: number;
}) {
  const s = sufixoRetorno();
  return createServicoAction({
    nome: `Serviço ${s}`,
    nomeEn: `Service ${s}`,
    categoria: "Manicure",
    descricaoPt: "",
    descricaoEn: "",
    precoPadrao: params.precoPadrao ?? 50,
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
export async function criarAtendimentoConcluido(params: {
  servicos: { id: string; nomePt: string; nomeEn: string | null }[];
  data?: string;
  horarioInicio?: string;
}) {
  const cliente = await criarClienteTeste();
  const criado = await createAtendimentoAction({
    clienteId: cliente.id,
    agendamentoId: null,
    profissional: "Rosângela",
    data: params.data ?? proximaDataAtendimentoRetorno(),
    horarioInicio: params.horarioInicio ?? "10:00 AM",
    horarioFim: null,
    duracaoMin: null,
    servicos: params.servicos.map((s) => ({
      servicoId: s.id,
      nomePt: s.nomePt,
      nomeEn: s.nomeEn ?? s.nomePt,
      valor: 50,
    })),
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

  await concluirAtendimentoAction(criado.id, {
    horarioFim: "11:00 AM",
    duracaoMin: 60,
    valorRecebido: params.servicos.length * 50,
    gorjeta: 0,
    formaPagamento: "dinheiro",
    status: "finalizadoPago",
  });

  const atendimento = await prisma.atendimento.findUniqueOrThrow({ where: { id: criado.id }, include: { servicos: true } });
  return { cliente, atendimentoId: criado.id, atendimento };
}

/** Cria um agendamento "cru" direto no banco, ocupando `[inicioMin, fimMin)` numa data ISO —
 * usado para simular horário que passou a estar ocupado entre a prévia e a confirmação. */
export async function ocuparHorario(params: {
  clienteId: string;
  dataIso: string;
  inicioMin: number;
  fimMin: number;
}) {
  const agregado = await prisma.agendamento.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return prisma.agendamento.create({
    data: {
      id: `AGD-${String(numeroSequencial).padStart(6, "0")}`,
      numeroSequencial,
      clienteId: params.clienteId,
      servicoId: null,
      data: params.dataIso,
      inicioMin: params.inicioMin,
      fimMin: params.fimMin,
      status: "aguardando",
      valorEstimado: 0,
      observacoesPt: "bloqueio de teste",
      observacoesEn: "test block",
    },
  });
}

/** Restringe temporariamente os dias de funcionamento a tudo MENOS `diaExcluido` (ex.: "qua").
 * Devolve uma função para restaurar os 7 dias (padrão do banco de teste). */
export async function excluirDiaDeFuncionamento(diaExcluido: string): Promise<() => Promise<void>> {
  const todos = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  await prisma.configuracao.update({
    where: { id: 1 },
    data: { agendaDiasFuncionamento: JSON.stringify(todos.filter((d) => d !== diaExcluido)) },
  });
  return async () => {
    await prisma.configuracao.update({
      where: { id: 1 },
      data: { agendaDiasFuncionamento: JSON.stringify(todos) },
    });
  };
}
