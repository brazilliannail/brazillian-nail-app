import { describe, expect, it } from "vitest";
import type { Expediente } from "@/lib/configuracoes-mock";
import {
  alternarSelecaoRetorno,
  anotarRetornosJaAgendados,
  avaliarPropostaRetorno,
  calcularDataRetorno,
  chaveGrupoColisao,
  chaveOrigemRetorno,
  decisoesIniciaisColisao,
  detectarColisoesRetorno,
  encontrarPrimeiroHorarioLivre,
  propostaSelecionavel,
  selecaoInicialRetornos,
  type PropostaRetorno,
} from "@/lib/proximos-retornos";

const expedientePadrao: Expediente = {
  inicioMin: 9 * 60, // 9:00 AM
  fimMin: 19 * 60, // 7:00 PM
  diasFuncionamento: ["seg", "ter", "qua", "qui", "sex", "sab"], // domingo fechado
};

function servico(overrides: Partial<Parameters<typeof avaliarPropostaRetorno>[0]["servico"]> = {}) {
  return {
    servicoId: "SRV-000001",
    nomePt: "Manicure",
    nomeEn: "Manicure",
    retornoSugeridoDias: 14,
    duracaoMin: 60,
    ...overrides,
  };
}

describe("calcularDataRetorno", () => {
  it("soma os dias sugeridos à data do ATENDIMENTO concluído, não à data de hoje", () => {
    expect(calcularDataRetorno("2027-06-01", 14)).toBe("2027-06-15");
  });

  it("atravessa virada de mês/ano corretamente", () => {
    expect(calcularDataRetorno("2027-12-25", 10)).toBe("2028-01-04");
  });

  it("retornoSugeridoDias = 0 mantém a mesma data", () => {
    expect(calcularDataRetorno("2027-06-01", 0)).toBe("2027-06-01");
  });
});

describe("encontrarPrimeiroHorarioLivre", () => {
  it("preserva o horário original quando não há conflito", () => {
    const horario = encontrarPrimeiroHorarioLivre(10 * 60, 60, expedientePadrao, []);
    expect(horario).toBe(10 * 60);
  });

  it("em conflito, avança para o primeiro horário livre seguinte (considerando a duração do serviço)", () => {
    // 10:00–11:00 ocupado; serviço de 60min a partir de 10:00 precisa ir para 11:00.
    const ocupados = [{ inicioMin: 10 * 60, fimMin: 11 * 60 }];
    const horario = encontrarPrimeiroHorarioLivre(10 * 60, 60, expedientePadrao, ocupados);
    expect(horario).toBe(11 * 60);
  });

  it("pula múltiplos agendamentos ocupados até achar o primeiro horário realmente livre", () => {
    const ocupados = [
      { inicioMin: 10 * 60, fimMin: 11 * 60 },
      { inicioMin: 11 * 60, fimMin: 11 * 60 + 30 },
    ];
    const horario = encontrarPrimeiroHorarioLivre(10 * 60, 60, expedientePadrao, ocupados);
    expect(horario).toBe(11 * 60 + 30);
  });

  it("considera a duração do serviço, não só o instante de início, para decidir sobreposição", () => {
    // Um serviço de 90min a partir de 9:00 esbarraria num compromisso às 10:00–10:30.
    const ocupados = [{ inicioMin: 10 * 60, fimMin: 10 * 60 + 30 }];
    const horario = encontrarPrimeiroHorarioLivre(9 * 60, 90, expedientePadrao, ocupados);
    expect(horario).toBe(10 * 60 + 30);
  });

  it("nunca propõe um horário antes do desejado", () => {
    const ocupados = [{ inicioMin: 9 * 60, fimMin: 9 * 60 + 30 }];
    const horario = encontrarPrimeiroHorarioLivre(10 * 60, 60, expedientePadrao, ocupados);
    expect(horario).toBeGreaterThanOrEqual(10 * 60);
  });

  it("respeita o limite do expediente: não propõe horário cujo fim ultrapasse o fechamento", () => {
    // Expediente fecha às 19:00; um serviço de 90min não cabe começando às 18:00.
    const horario = encontrarPrimeiroHorarioLivre(18 * 60, 90, expedientePadrao, []);
    expect(horario).toBeNull();
  });

  it("sem nenhum horário livre no dia a partir do desejado, retorna null (sem tentar outro dia)", () => {
    // Dia inteiro ocupado do desejado até o fechamento.
    const ocupados = [{ inicioMin: 10 * 60, fimMin: expedientePadrao.fimMin }];
    const horario = encontrarPrimeiroHorarioLivre(10 * 60, 60, expedientePadrao, ocupados);
    expect(horario).toBeNull();
  });
});

describe("avaliarPropostaRetorno", () => {
  const origem = { atendimentoId: "ATD-000001", agendamentoId: "AGD-000001", servicoId: "SRV-000001" };

  it("monta a proposta preservando o horário quando não há conflito", () => {
    const proposta = avaliarPropostaRetorno({
      origem,
      clienteId: "CLI-000001",
      servico: servico(),
      dataAtendimentoIso: "2027-06-01", // terça-feira
      horarioOriginalMin: 10 * 60,
      expediente: expedientePadrao,
      ocupados: [],
    });

    expect(proposta.dataIso).toBe("2027-06-15");
    expect(proposta.horarioOriginalMin).toBe(10 * 60);
    expect(proposta.horarioPropostoMin).toBe(10 * 60);
    expect(proposta.horarioAlterado).toBe(false);
    expect(proposta.disponivel).toBe(true);
    expect(proposta.diaDeFuncionamento).toBe(true);
    expect(proposta.duracaoMin).toBe(60);
    expect(proposta.origem).toEqual(origem);
  });

  it("indica explicitamente horarioAlterado=true quando precisou mudar de horário por conflito", () => {
    const ocupados = [{ inicioMin: 10 * 60, fimMin: 11 * 60 }];
    const proposta = avaliarPropostaRetorno({
      origem,
      clienteId: "CLI-000001",
      servico: servico(),
      dataAtendimentoIso: "2027-06-01",
      horarioOriginalMin: 10 * 60,
      expediente: expedientePadrao,
      ocupados,
    });

    expect(proposta.horarioPropostoMin).toBe(11 * 60);
    expect(proposta.horarioAlterado).toBe(true);
    expect(proposta.disponivel).toBe(true);
  });

  it("dia calculado fora do expediente (fechado): disponivel=false, sem tentar outro dia", () => {
    // 2027-06-01 é terça; +4 dias = 2027-06-05, sábado — ainda aberto neste expediente de teste.
    // Usamos um expediente sem sábado para simular o dia fechado.
    const expedienteSemSabado: Expediente = { ...expedientePadrao, diasFuncionamento: ["seg", "ter", "qua", "qui", "sex"] };
    const proposta = avaliarPropostaRetorno({
      origem,
      clienteId: "CLI-000001",
      servico: servico({ retornoSugeridoDias: 4 }),
      dataAtendimentoIso: "2027-06-01",
      horarioOriginalMin: 10 * 60,
      expediente: expedienteSemSabado,
      ocupados: [],
    });

    expect(proposta.dataIso).toBe("2027-06-05");
    expect(proposta.diaDeFuncionamento).toBe(false);
    expect(proposta.disponivel).toBe(false);
    expect(proposta.horarioPropostoMin).toBeNull();
    expect(proposta.horarioAlterado).toBe(false);
  });

  it("sem nenhum horário disponível naquele dia: disponivel=false, horarioPropostoMin=null", () => {
    const ocupados = [{ inicioMin: 10 * 60, fimMin: expedientePadrao.fimMin }];
    const proposta = avaliarPropostaRetorno({
      origem,
      clienteId: "CLI-000001",
      servico: servico(),
      dataAtendimentoIso: "2027-06-01",
      horarioOriginalMin: 10 * 60,
      expediente: expedientePadrao,
      ocupados,
    });

    expect(proposta.disponivel).toBe(false);
    expect(proposta.horarioPropostoMin).toBeNull();
  });
});

describe("detectarColisoesRetorno", () => {
  const origemA = { atendimentoId: "ATD-000001", agendamentoId: null, servicoId: "SRV-A" };
  const origemB = { atendimentoId: "ATD-000001", agendamentoId: null, servicoId: "SRV-B" };

  function propostaDisponivel(overrides: Partial<PropostaRetorno>): PropostaRetorno {
    return {
      origem: origemA,
      clienteId: "CLI-000001",
      servicoNomePt: "Serviço",
      servicoNomeEn: "Service",
      dataIso: "2027-06-15",
      horarioOriginalMin: 10 * 60,
      horarioPropostoMin: 10 * 60,
      duracaoMin: 60,
      horarioAlterado: false,
      diaDeFuncionamento: true,
      disponivel: true,
      jaAgendado: false,
      ...overrides,
    };
  }

  it("dois serviços com exatamente a mesma data e horário propostos: identifica a colisão", () => {
    const a = propostaDisponivel({ origem: origemA });
    const b = propostaDisponivel({ origem: origemB });

    const colisoes = detectarColisoesRetorno([a, b]);

    expect(colisoes).toHaveLength(1);
    expect(colisoes[0].dataIso).toBe("2027-06-15");
    expect(colisoes[0].horarioMin).toBe(10 * 60);
    expect(colisoes[0].propostas).toHaveLength(2);
    expect(colisoes[0].propostas.map((p) => p.origem.servicoId).sort()).toEqual(["SRV-A", "SRV-B"]);
  });

  it("não identifica colisão quando datas/horários propostos são diferentes", () => {
    const a = propostaDisponivel({ origem: origemA, horarioPropostoMin: 10 * 60 });
    const b = propostaDisponivel({ origem: origemB, horarioPropostoMin: 11 * 60 });

    expect(detectarColisoesRetorno([a, b])).toHaveLength(0);
  });

  it("ignora propostas indisponíveis ao agrupar (não há colisão real a resolver)", () => {
    const a = propostaDisponivel({ origem: origemA, disponivel: true, horarioPropostoMin: 10 * 60 });
    const b = propostaDisponivel({ origem: origemB, disponivel: false, horarioPropostoMin: null });

    expect(detectarColisoesRetorno([a, b])).toHaveLength(0);
  });

  it("não decide nada sobre a colisão (não altera nenhuma das propostas envolvidas)", () => {
    const a = propostaDisponivel({ origem: origemA });
    const b = propostaDisponivel({ origem: origemB });
    const [colisao] = detectarColisoesRetorno([a, b]);
    expect(colisao.propostas).toContainEqual(a);
    expect(colisao.propostas).toContainEqual(b);
  });

  describe("decisão combinado × separado", () => {
    it("toda colisão começa como 'separado' — combinar é escolha explícita, nunca automática", () => {
      const grupos = detectarColisoesRetorno([
        propostaDisponivel({ origem: origemA }),
        propostaDisponivel({ origem: origemB }),
      ]);
      const decisoes = decisoesIniciaisColisao(grupos);

      expect(decisoes.size).toBe(1);
      expect(decisoes.get(chaveGrupoColisao(grupos[0]))).toBe("separado");
    });

    it("a chave do grupo é data+horário (estável), não depende da ordem das propostas", () => {
      const grupo = { dataIso: "2027-06-15", horarioMin: 600, propostas: [] };
      expect(chaveGrupoColisao(grupo)).toBe("2027-06-15|600");
    });
  });
});

describe("chaveOrigemRetorno — origem rastreável (atendimento + serviço, nunca nome/data/hora)", () => {
  it("mesma origem → mesma chave, independente de data/horário/nome da proposta", () => {
    const origem = { atendimentoId: "ATD-1", agendamentoId: "AGD-1", servicoId: "SRV-1" };
    expect(chaveOrigemRetorno(origem)).toBe("ATD-1::SRV-1");
  });

  it("serviços diferentes do mesmo atendimento têm chaves diferentes", () => {
    const base = { atendimentoId: "ATD-1", agendamentoId: null };
    expect(chaveOrigemRetorno({ ...base, servicoId: "SRV-1" })).not.toBe(
      chaveOrigemRetorno({ ...base, servicoId: "SRV-2" }),
    );
  });

  it("o mesmo serviço em atendimentos diferentes tem chaves diferentes", () => {
    expect(chaveOrigemRetorno({ atendimentoId: "ATD-1", agendamentoId: null, servicoId: "SRV-1" })).not.toBe(
      chaveOrigemRetorno({ atendimentoId: "ATD-2", agendamentoId: null, servicoId: "SRV-1" }),
    );
  });
});

describe("anotarRetornosJaAgendados / selecaoInicialRetornos / alternarSelecaoRetorno", () => {
  const origem = (servicoId: string) => ({ atendimentoId: "ATD-1", agendamentoId: null, servicoId });

  function proposta(overrides: Partial<PropostaRetorno>): PropostaRetorno {
    return {
      origem: origem("SRV-1"),
      clienteId: "CLI-1",
      servicoNomePt: "Serviço",
      servicoNomeEn: "Service",
      dataIso: "2027-06-15",
      horarioOriginalMin: 600,
      horarioPropostoMin: 600,
      duracaoMin: 60,
      horarioAlterado: false,
      diaDeFuncionamento: true,
      disponivel: true,
      jaAgendado: false,
      ...overrides,
    };
  }

  it("marca jaAgendado só para as origens presentes no conjunto de chaves já agendadas", () => {
    const propostas = [proposta({ origem: origem("SRV-1") }), proposta({ origem: origem("SRV-2") })];
    const anotadas = anotarRetornosJaAgendados(propostas, new Set(["ATD-1::SRV-1"]));

    expect(anotadas[0].jaAgendado).toBe(true);
    expect(anotadas[1].jaAgendado).toBe(false);
  });

  it("é idempotente: reanotar com o mesmo conjunto não muda o resultado (prévia pode ser regerada)", () => {
    const propostas = [proposta({ origem: origem("SRV-1") })];
    const chaves = new Set(["ATD-1::SRV-1"]);
    const uma = anotarRetornosJaAgendados(propostas, chaves);
    const duas = anotarRetornosJaAgendados(uma, chaves);
    expect(duas).toEqual(uma);
  });

  it("seleção inicial: disponível e não-agendada vem marcada; indisponível ou já agendada não", () => {
    const disponivel = proposta({ origem: origem("SRV-1"), disponivel: true, jaAgendado: false });
    const indisponivel = proposta({ origem: origem("SRV-2"), disponivel: false, horarioPropostoMin: null });
    const jaAgendada = proposta({ origem: origem("SRV-3"), disponivel: true, jaAgendado: true });

    const selecao = selecaoInicialRetornos([disponivel, indisponivel, jaAgendada]);

    expect(selecao.has("ATD-1::SRV-1")).toBe(true);
    expect(selecao.has("ATD-1::SRV-2")).toBe(false);
    expect(selecao.has("ATD-1::SRV-3")).toBe(false);
    expect(propostaSelecionavel(jaAgendada)).toBe(false);
  });

  it("desmarcar é sempre permitido e não muta o Set original", () => {
    const p = proposta({ origem: origem("SRV-1") });
    const inicial = selecaoInicialRetornos([p]);
    const depois = alternarSelecaoRetorno(inicial, p);

    expect(depois.has("ATD-1::SRV-1")).toBe(false);
    expect(inicial.has("ATD-1::SRV-1")).toBe(true); // original intacto
  });

  it("remarcar uma proposta disponível volta a selecioná-la", () => {
    const p = proposta({ origem: origem("SRV-1") });
    const semSelecao = alternarSelecaoRetorno(new Set(), p);
    expect(semSelecao.has("ATD-1::SRV-1")).toBe(true);
  });

  it("nunca marca uma proposta indisponível, mesmo se a Rosangela clicar", () => {
    const indisponivel = proposta({ origem: origem("SRV-9"), disponivel: false, horarioPropostoMin: null });
    const resultado = alternarSelecaoRetorno(new Set(), indisponivel);
    expect(resultado.has("ATD-1::SRV-9")).toBe(false);
  });
});

describe("avaliarPropostaRetorno — propagação de jaAgendado", () => {
  it("repassa jaAgendado=true para a proposta (sem afetar data/horário/disponibilidade)", () => {
    const proposta = avaliarPropostaRetorno({
      origem: { atendimentoId: "ATD-1", agendamentoId: null, servicoId: "SRV-1" },
      clienteId: "CLI-1",
      servico: { servicoId: "SRV-1", nomePt: "Manicure", nomeEn: "Manicure", retornoSugeridoDias: 14, duracaoMin: 60 },
      dataAtendimentoIso: "2027-06-01",
      horarioOriginalMin: 10 * 60,
      expediente: expedientePadrao,
      ocupados: [],
      jaAgendado: true,
    });

    expect(proposta.jaAgendado).toBe(true);
    expect(proposta.disponivel).toBe(true);
    expect(proposta.horarioPropostoMin).toBe(10 * 60);
  });

  it("jaAgendado default é false quando o parâmetro é omitido", () => {
    const proposta = avaliarPropostaRetorno({
      origem: { atendimentoId: "ATD-1", agendamentoId: null, servicoId: "SRV-1" },
      clienteId: "CLI-1",
      servico: { servicoId: "SRV-1", nomePt: "Manicure", nomeEn: "Manicure", retornoSugeridoDias: 14, duracaoMin: 60 },
      dataAtendimentoIso: "2027-06-01",
      horarioOriginalMin: 10 * 60,
      expediente: expedientePadrao,
      ocupados: [],
    });

    expect(proposta.jaAgendado).toBe(false);
  });
});
