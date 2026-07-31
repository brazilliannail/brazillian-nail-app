import { createClienteAction } from "@/lib/clientes-actions";
import { createAgendamentoAction } from "@/lib/agenda-actions";
import type { Cliente, Contato } from "@/lib/clientes-mock";
import type { AgendaAppointment } from "@/lib/agenda-mock";
import { addDays, formatDateMMDDYYYY } from "@/lib/date";

let contador = 0;

/** Sufixo curto e único por chamada, para nomes/telefones não colidirem entre `it()`s que
 * compartilham o mesmo banco de teste (ver tests/setup/global-setup.ts). */
function proximoSufixo() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

const contatoPadrao: Contato = {
  nomeContato: "Contato Teste",
  telefone: "5085551234",
  relacao: "propria",
  idioma: "pt",
  canalPreferido: "whatsapp",
  receberLembretes: true,
};

/** Cria uma cliente com contato principal (e opcionalmente secundário) para testar o fluxo de
 * lembretes/mensagens. Sem contato principal = caso "sem telefone" (`indisponivel`). */
export async function criarClienteComContatoTeste(params?: {
  comContatoPrincipal?: boolean;
  contatoPrincipal?: Partial<Contato>;
  contatoSecundario?: Partial<Contato>;
}): Promise<Cliente> {
  const sufixo = proximoSufixo();
  const comContatoPrincipal = params?.comContatoPrincipal ?? true;
  return createClienteAction({
    nome: `Cliente Lembrete ${sufixo}`,
    nomePreferencia: null,
    contatoPrincipal: comContatoPrincipal ? { ...contatoPadrao, ...params?.contatoPrincipal } : null,
    contatoSecundario: params?.contatoSecundario ? { ...contatoPadrao, ...params.contatoSecundario } : null,
    status: "ativa",
    ultimoAtendimento: "",
    proximoAgendamento: null,
    observacoesPt: "",
    observacoesEn: "",
    avisosImportantesPt: [],
    avisosImportantesEn: [],
    valorPendente: 0,
    historico: [],
  });
}

/** Data de amanhã no formato MM/DD/YYYY usado pelas Server Actions de agenda. */
export function dataAmanhaMMDDYYYY(): string {
  return formatDateMMDDYYYY(addDays(new Date(), 1));
}

let proximoSlot = 0;

/** Horário de início único por chamada (passos de 30min a partir das 9:00), para agendamentos de
 * amanhã criados em `it()`s diferentes não colidirem no validador de conflito de horário. */
function proximoInicioMin() {
  const inicio = 9 * 60 + proximoSlot * 30;
  proximoSlot += 1;
  return inicio;
}

/** Cria um agendamento para amanhã (status `aguardando` por padrão), sem serviço do catálogo
 * vinculado — testa o fallback "Serviço a definir" usado por `getLembretesAmanha`. */
export async function criarAgendamentoAmanhaTeste(params: {
  clienteId: string;
  status?: AgendaAppointment["status"];
  inicioMin?: number;
  fimMin?: number;
}): Promise<AgendaAppointment> {
  const inicioMin = params.inicioMin ?? proximoInicioMin();
  return createAgendamentoAction({
    clienteId: params.clienteId,
    servicoId: null,
    status: params.status ?? "aguardando",
    data: dataAmanhaMMDDYYYY(),
    inicioMin,
    fimMin: params.fimMin ?? inicioMin + 30,
    valorEstimado: null,
    observacoesPt: "",
    observacoesEn: "",
  });
}
