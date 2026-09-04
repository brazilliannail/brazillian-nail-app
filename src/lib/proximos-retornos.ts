import { diaSemanaDeData, type Expediente } from "@/lib/configuracoes-mock";
import { addDays, formatDateISO, parseDateISO } from "@/lib/date";
import { SLOT_MIN } from "@/lib/agenda-mock";

/**
 * Motor de cálculo de "Próximos Retornos" (Fase 5A) — só CALCULA propostas, nunca grava nada.
 * Módulo puro (sem `@/lib/db`), igual a `agenda-mock.ts`/`configuracoes-mock.ts`: reaproveita as
 * MESMAS regras de disponibilidade já usadas por `agenda-actions.ts` (expediente, dia de
 * funcionamento, sobreposição de horário) em vez de recriar uma segunda noção de "disponível".
 * `SLOT_MIN` é o mesmo intervalo de grade usado pelos seletores de horário da Agenda.
 */

export type IntervaloOcupado = { inicioMin: number; fimMin: number };

/** Um serviço do catálogo elegível para retorno (já filtrado: tem `servicoId` e
 * `retornoSugeridoDias` — quem chama ignora os que não têm, antes de montar isto). */
export type ServicoElegivelRetorno = {
  servicoId: string;
  nomePt: string;
  nomeEn: string;
  retornoSugeridoDias: number;
  duracaoMin: number;
};

/** De onde veio esta proposta — para rastreabilidade (o atendimento/agendamento/serviço de
 * origem), sem decidir ainda nada sobre gravação/duplicidade (fica para fase posterior). */
export type OrigemPropostaRetorno = {
  atendimentoId: string;
  agendamentoId: string | null;
  servicoId: string;
};

export type PropostaRetorno = {
  origem: OrigemPropostaRetorno;
  clienteId: string;
  servicoNomePt: string;
  servicoNomeEn: string;
  /** Data pretendida do retorno, em ISO (yyyy-mm-dd) — sempre calculada a partir da data do
   * atendimento concluído, nunca da data de hoje. */
  dataIso: string;
  /** Horário do atendimento de origem (em minutos), que a proposta tenta preservar. */
  horarioOriginalMin: number;
  /** Horário efetivamente proposto; `null` quando não há disponibilidade naquele dia. */
  horarioPropostoMin: number | null;
  duracaoMin: number;
  /** `true` quando o horário proposto precisou ser diferente do original (conflito resolvido). */
  horarioAlterado: boolean;
  /** `false` quando a data calculada cai num dia fora do expediente configurado — nesse caso
   * `disponivel` também é sempre `false`, sem tentar outro dia. */
  diaDeFuncionamento: boolean;
  /** `true` só quando existe um `horarioPropostoMin` válido dentro do expediente, no mesmo dia. */
  disponivel: boolean;
  /**
   * `true` quando ESTA origem (atendimento + serviço) já gerou um retorno antes — a prévia mostra
   * a proposta, mas nunca a traz selecionada e a próxima etapa nunca a grava de novo. Baseado em
   * `chaveOrigemRetorno` (origem rastreável), nunca em comparação de nome/data/horário.
   */
  jaAgendado: boolean;
};

/** Chave rastreável e estável de uma proposta: liga a proposta ao ATENDIMENTO e ao SERVIÇO de
 * origem — nunca a nome/data/horário (que mudam de valor e se repetem entre clientes e dias). É a
 * mesma chave usada para (a) marcar a seleção na prévia e (b), na etapa de gravação, deduplicar o
 * retorno (uma origem só pode gerar um retorno, garantido também por índice único no banco). */
export function chaveOrigemRetorno(origem: OrigemPropostaRetorno): string {
  return `${origem.atendimentoId}::${origem.servicoId}`;
}

/** Agrupa 2+ propostas (deste mesmo lote, já disponíveis) que caíram exatamente na mesma data e
 * horário — só identifica a colisão; decidir "combinar num único agendamento" ou "empurrar a
 * segunda para o próximo horário livre" fica para uma fase posterior (ver requisito). */
export type GrupoColisaoRetorno = {
  dataIso: string;
  horarioMin: number;
  propostas: PropostaRetorno[];
};

/**
 * Data do retorno = data do atendimento CONCLUÍDO + dias sugeridos pelo serviço. Nunca calculada
 * a partir de "hoje" — um atendimento concluído há 3 dias com retorno sugerido de 14 continua
 * propondo a mesma data (dia do atendimento + 14), não "daqui a 14 dias a partir de agora".
 */
export function calcularDataRetorno(dataAtendimentoIso: string, retornoSugeridoDias: number): string {
  return formatDateISO(addDays(parseDateISO(dataAtendimentoIso), retornoSugeridoDias));
}

/** Mesmo teste de sobreposição de `existeConflito` (agenda-actions.ts) — aplicado aqui sobre uma
 * lista de intervalos já carregada, em vez de uma query booleana. As duas checagens precisam
 * continuar equivalentes; qualquer mudança numa exige revisar a outra. */
export function sobrepoe(inicioMin: number, fimMin: number, ocupados: IntervaloOcupado[]): boolean {
  return ocupados.some((ocupado) => inicioMin < ocupado.fimMin && fimMin > ocupado.inicioMin);
}

/**
 * Primeiro horário livre, de `duracaoMin`, a partir de `horarioDesejadoMin` (o próprio horário
 * desejado é o primeiro candidato testado — "preservar o mesmo horário" é sempre a primeira
 * tentativa), avançando de `SLOT_MIN` em `SLOT_MIN` só dentro do MESMO DIA, nunca antes do horário
 * desejado e nunca em outro dia. `null` = nenhum horário livre naquele dia a partir dali; quem
 * chama não deve tentar outro dia sozinho (ver requisito: decisão fica com a Rosangela).
 */
export function encontrarPrimeiroHorarioLivre(
  horarioDesejadoMin: number,
  duracaoMin: number,
  expediente: Expediente,
  ocupados: IntervaloOcupado[],
): number | null {
  const inicioBusca = Math.max(horarioDesejadoMin, expediente.inicioMin);
  for (let candidato = inicioBusca; candidato + duracaoMin <= expediente.fimMin; candidato += SLOT_MIN) {
    if (!sobrepoe(candidato, candidato + duracaoMin, ocupados)) return candidato;
  }
  return null;
}

/**
 * Avalia a proposta de retorno de UM serviço: calcula a data, checa o dia de funcionamento e
 * busca o primeiro horário livre a partir do horário original. Não grava nada — só monta o
 * resultado estruturado que uma fase posterior vai exibir para confirmação.
 */
export function avaliarPropostaRetorno(params: {
  origem: OrigemPropostaRetorno;
  clienteId: string;
  servico: ServicoElegivelRetorno;
  dataAtendimentoIso: string;
  horarioOriginalMin: number;
  expediente: Expediente;
  /** Agendamentos não cancelados já ocupando a data calculada (`dataIso`) — mesma semântica de
   * `existeConflito`. Quem chama busca isto no banco; esta função não acessa `@/lib/db`. */
  ocupados: IntervaloOcupado[];
  /** `true` se esta origem (atendimento + serviço) já produziu um retorno antes. Default `false`
   * — quem chama passa o resultado da consulta de deduplicação. */
  jaAgendado?: boolean;
}): PropostaRetorno {
  const { origem, clienteId, servico, dataAtendimentoIso, horarioOriginalMin, expediente, ocupados } = params;
  const dataIso = calcularDataRetorno(dataAtendimentoIso, servico.retornoSugeridoDias);
  const diaDeFuncionamento = expediente.diasFuncionamento.includes(diaSemanaDeData(parseDateISO(dataIso)));

  const base = {
    origem,
    clienteId,
    servicoNomePt: servico.nomePt,
    servicoNomeEn: servico.nomeEn,
    dataIso,
    horarioOriginalMin,
    duracaoMin: servico.duracaoMin,
  };

  const jaAgendado = params.jaAgendado ?? false;

  if (!diaDeFuncionamento) {
    return { ...base, horarioPropostoMin: null, horarioAlterado: false, diaDeFuncionamento: false, disponivel: false, jaAgendado };
  }

  const horarioPropostoMin = encontrarPrimeiroHorarioLivre(horarioOriginalMin, servico.duracaoMin, expediente, ocupados);

  return {
    ...base,
    horarioPropostoMin,
    horarioAlterado: horarioPropostoMin !== null && horarioPropostoMin !== horarioOriginalMin,
    diaDeFuncionamento: true,
    disponivel: horarioPropostoMin !== null,
    jaAgendado,
  };
}

/**
 * Reanota um lote de propostas já calculadas com `jaAgendado`, a partir do conjunto de chaves de
 * origem (`chaveOrigemRetorno`) que já produziram retorno. Idempotente: chamar de novo com o mesmo
 * conjunto devolve exatamente o mesmo resultado — a prévia pode ser regerada quantas vezes quiser
 * sem "acumular" estado.
 */
export function anotarRetornosJaAgendados(
  propostas: PropostaRetorno[],
  chavesJaAgendadas: ReadonlySet<string>,
): PropostaRetorno[] {
  return propostas.map((proposta) => ({
    ...proposta,
    jaAgendado: chavesJaAgendadas.has(chaveOrigemRetorno(proposta.origem)),
  }));
}

/** Só é possível marcar (confirmar) uma proposta que tem horário disponível E ainda não virou
 * retorno. Indisponível ou já agendada nunca entra na seleção — não há o que confirmar. */
export function propostaSelecionavel(proposta: PropostaRetorno): boolean {
  return proposta.disponivel && !proposta.jaAgendado;
}

/** Seleção inicial da prévia: toda proposta selecionável vem marcada; a Rosangela desmarca
 * individualmente antes de confirmar. Retorna o conjunto de `chaveOrigemRetorno`. */
export function selecaoInicialRetornos(propostas: PropostaRetorno[]): Set<string> {
  return new Set(propostas.filter(propostaSelecionavel).map((p) => chaveOrigemRetorno(p.origem)));
}

/** Alterna a seleção de UMA proposta e devolve um novo Set (nunca muta o recebido). Desmarcar é
 * sempre permitido; marcar só se a proposta for selecionável. */
export function alternarSelecaoRetorno(
  selecionadas: ReadonlySet<string>,
  proposta: PropostaRetorno,
): Set<string> {
  const chave = chaveOrigemRetorno(proposta.origem);
  const proxima = new Set(selecionadas);
  if (proxima.has(chave)) {
    proxima.delete(chave);
  } else if (propostaSelecionavel(proposta)) {
    proxima.add(chave);
  }
  return proxima;
}

/** Ao mesmo tempo e no mesmo dia, dois retornos podem virar um único agendamento combinado ou
 * ficar separados. "separado" é o padrão (nada é fundido automaticamente). */
export type DecisaoColisao = "combinado" | "separado";

/** Chave estável de um grupo de colisão (mesma composição de `detectarColisoesRetorno`). */
export function chaveGrupoColisao(grupo: GrupoColisaoRetorno): string {
  return `${grupo.dataIso}|${grupo.horarioMin}`;
}

/** Decisão inicial de cada colisão: sempre "separado" — combinar num único agendamento é uma
 * escolha explícita da Rosangela na prévia, nunca o comportamento automático. */
export function decisoesIniciaisColisao(colisoes: GrupoColisaoRetorno[]): Map<string, DecisaoColisao> {
  return new Map(colisoes.map((grupo) => [chaveGrupoColisao(grupo), "separado" as DecisaoColisao]));
}

/**
 * Identifica grupos de 2+ propostas DISPONÍVEIS que caíram exatamente na mesma data+horário —
 * só sinaliza a colisão (com os dados de cada proposta envolvida), não decide nada sobre
 * combinar num único agendamento nem empurra nenhuma delas para outro horário.
 */
export function detectarColisoesRetorno(propostas: PropostaRetorno[]): GrupoColisaoRetorno[] {
  const grupos = new Map<string, PropostaRetorno[]>();

  for (const proposta of propostas) {
    if (!proposta.disponivel || proposta.horarioPropostoMin === null) continue;
    const chave = `${proposta.dataIso}|${proposta.horarioPropostoMin}`;
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.push(proposta);
    } else {
      grupos.set(chave, [proposta]);
    }
  }

  return [...grupos.values()]
    .filter((grupo) => grupo.length >= 2)
    .map((grupo) => ({ dataIso: grupo[0].dataIso, horarioMin: grupo[0].horarioPropostoMin as number, propostas: grupo }));
}
