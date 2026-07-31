import { createClienteAction } from "@/lib/clientes-actions";
import { createAtendimentoAction } from "@/lib/atendimentos-actions";
import type { Cliente } from "@/lib/clientes-mock";
import type { Atendimento } from "@/lib/atendimentos-mock";

let contador = 0;

/** Sufixo curto e único por chamada, para nomes/observações não colidirem entre `it()`s que
 * compartilham o mesmo banco de teste (ver tests/setup/global-setup.ts). */
function proximoSufixo() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

/** Cria uma cliente mínima válida, só com o que `createClienteAction` de fato usa. */
export async function criarClienteTeste(nome = "Cliente Teste"): Promise<Cliente> {
  return createClienteAction({
    nome: `${nome} ${proximoSufixo()}`,
    nomePreferencia: null,
    contatoPrincipal: null,
    contatoSecundario: null,
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

/**
 * Cria um atendimento "emAndamento" com um único serviço de valor `valorServico`, pronto para
 * ser concluído pelo teste (`concluirAtendimentoAction`). `data`/`horarioInicio` só importam para
 * os testes que exercitam ordenação por data (ex.: saldo pendente).
 */
export async function criarAtendimentoTeste(params: {
  clienteId: string;
  valorServico: number;
  desconto?: number;
  data?: string;
  horarioInicio?: string;
}): Promise<Atendimento> {
  const sufixo = proximoSufixo();
  return createAtendimentoAction({
    clienteId: params.clienteId,
    agendamentoId: null,
    profissional: "Rosângela",
    data: params.data ?? "01/15/2026",
    horarioInicio: params.horarioInicio ?? "10:00 AM",
    horarioFim: null,
    duracaoMin: null,
    servicos: [{ servicoId: null, nomePt: `Serviço teste ${sufixo}`, nomeEn: `Test service ${sufixo}`, valor: params.valorServico }],
    desconto: params.desconto ?? 0,
    gorjeta: 0,
    valorRecebido: 0,
    formaPagamento: null,
    status: "emAndamento",
    observacoesPt: "",
    observacoesEn: "",
    retornoSugeridoDias: null,
    proximoAgendamentoId: null,
  });
}
