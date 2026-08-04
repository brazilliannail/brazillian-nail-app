import { describe, expect, it } from "vitest";
import { createConfiguracoesIniciais } from "@/lib/configuracoes-mock";
import { validarConfiguracoes } from "@/lib/configuracoes-validation";

describe("validação de Configurações", () => {
  it("aceita a configuração padrão completa", () => {
    expect(() => validarConfiguracoes(createConfiguracoesIniciais())).not.toThrow();
  });

  it("rejeita campo obrigatório vazio", () => {
    const dados = createConfiguracoesIniciais();
    dados.negocio.nome = "   ";
    expect(() => validarConfiguracoes(dados)).toThrow("Nome do negócio é obrigatório.");
  });

  it("rejeita horários inválidos ou invertidos", () => {
    const formatoInvalido = createConfiguracoesIniciais();
    formatoInvalido.agenda.horarioAbertura = "amanhã cedo";
    expect(() => validarConfiguracoes(formatoInvalido)).toThrow("Horário de abertura inválido");

    const invertido = createConfiguracoesIniciais();
    invertido.agenda.horarioAbertura = "7:00 PM";
    invertido.agenda.horarioFechamento = "9:00 AM";
    expect(() => validarConfiguracoes(invertido)).toThrow("Horário de abertura deve ser antes");
  });

  it("exige dia de funcionamento, duração e forma de pagamento", () => {
    const semDia = createConfiguracoesIniciais();
    semDia.agenda.diasFuncionamento = [];
    expect(() => validarConfiguracoes(semDia)).toThrow("Selecione ao menos um dia");

    const semDuracao = createConfiguracoesIniciais();
    semDuracao.agenda.duracaoPadraoMinutos = 0;
    expect(() => validarConfiguracoes(semDuracao)).toThrow("Duração padrão");

    const semPagamento = createConfiguracoesIniciais();
    for (const forma of Object.keys(semPagamento.financeiro.formasPagamentoAtivas)) {
      semPagamento.financeiro.formasPagamentoAtivas[forma as keyof typeof semPagamento.financeiro.formasPagamentoAtivas] = false;
    }
    expect(() => validarConfiguracoes(semPagamento)).toThrow("Ative ao menos uma forma de pagamento");
  });
});
